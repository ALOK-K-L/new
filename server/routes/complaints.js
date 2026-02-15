const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { addBlock } = require('./blockchain');
const { analyzeComplaint } = require('../utils/aiService');

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Auto-assign department based on issue type
const getAutoAssignedDept = (type, description) => {
    const text = `${type} ${description}`.toLowerCase();



    // KSEB - Electricity related
    if (text.includes('electricity') || text.includes('power') || text.includes('streetlight') ||
        text.includes('street light') || text.includes('light') || text.includes('pole') ||
        text.includes('transformer') || text.includes('wire') || text.includes('electric') ||
        text.includes('blackout') || text.includes('voltage') || type === 'Streetlight' || type === 'Electricity') {
        return 'KSEB';
    }

    // PWD - Roads related
    if (text.includes('road') || text.includes('pothole') || text.includes('highway') ||
        text.includes('bridge') || text.includes('footpath') || text.includes('pavement') ||
        text.includes('crack') || text.includes('damage') || type === 'Pothole' || type === 'Road Damage') {
        return 'PWD';
    }

    // Water Authority - Water related
    if (text.includes('water') || text.includes('leak') || text.includes('pipe') ||
        text.includes('drainage') || text.includes('flood') || text.includes('sewage') ||
        text.includes('tap') || text.includes('supply') || type === 'Water Leak' || type === 'Drainage') {
        return 'Water Authority';
    }

    // Corporation - Garbage/Waste related
    if (text.includes('garbage') || text.includes('waste') || text.includes('trash') ||
        text.includes('dustbin') || text.includes('litter') || text.includes('sanitation') ||
        text.includes('cleaning') || text.includes('dump') || type === 'Garbage') {
        return 'Corporation';
    }

    // Default to Corporation for general civic issues
    return 'Corporation';
};

// Create a Complaint with auto-assignment
router.post('/', [auth, upload.single('image')], async (req, res) => {
    try {
        const { type, description, latitude, longitude, tags } = req.body;

        // DEBUG LOGGING TO FILE
        try {
            const logMsg = `\n[${new Date().toISOString()}] POST /complaints\nBody: ${JSON.stringify(req.body)}\n`;
            require('fs').appendFileSync(path.join(__dirname, '..', 'submission_debug.log'), logMsg);
        } catch (e) { }

        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        // Auto-assign department
        const assignedDept = getAutoAssignedDept(type, description);

        // DEBUG LOGGING TO FILE
        try {
            const logMsg = `\n[${new Date().toISOString()}] POST /complaints\nBody: ${JSON.stringify(req.body)}\n`;
            require('fs').appendFileSync(path.join(__dirname, '..', 'submission_debug.log'), logMsg);

            console.log("INSERT DEBUG:", {
                user_id: req.user.id,
                type,
                description,
                latitude,
                longitude,
                imageUrl,
                assignedDept,
                tags
            });
        } catch (e) { }

        // Sanitize Lat/Lng (Ensure they are numbers or null)
        const lat = (latitude && !isNaN(parseFloat(latitude))) ? parseFloat(latitude) : null;
        const lng = (longitude && !isNaN(parseFloat(longitude))) ? parseFloat(longitude) : null;

        const newComplaint = await db.query(
            'INSERT INTO complaints (user_id, type, description, latitude, longitude, image_url, assigned_dept, tags) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [req.user.id, type, description, lat, lng, imageUrl, assignedDept, tags || null]
        );

        const complaint = newComplaint.rows[0];

        // Add to Blockchain (IMMEDIATE for known types, DELAYED for Others)
        // Modular Logic: Only record if we are SURE of the department.
        const isOthers = ['others', 'other'].includes(type.toLowerCase());

        if (!isOthers) {
            await addBlock({
                action: 'COMPLAINT_FILED',
                complaint_id: complaint.id,
                user_id: req.user.id,
                type: type,
                description: description,
                department: assignedDept,
                location: { lat: latitude, lng: longitude },
                timestamp: new Date()
            });
        }

        res.json(complaint);

        // TRIGGER ASYNC AI ANALYSIS (Non-blocking)
        analyzeComplaint(description, req.user.role).then(async (aiResult) => {
            console.log(`AI Analysis completed for #${complaint.id}`);

            // Re-evaluate 'isOthers' safely
            const safeType = type ? type.toString().toLowerCase().trim() : '';
            const isOthers = ['others', 'other'].includes(safeType);

            if (aiResult) {
                try {
                    console.log(`AI Result:`, aiResult);
                    const { department, priority, ai_tags } = aiResult;

                    // Update the complaint with AI insights
                    await db.query(
                        'UPDATE complaints SET assigned_dept = $1, priority = $2, ai_tags = $3 WHERE id = $4',
                        [department, priority, ai_tags, complaint.id]
                    );

                    // Blockchain Logic for AI Updates
                    const blockLocation = (latitude && longitude) ? { lat: latitude, lng: longitude } : null;
                    const blockTimestamp = new Date().toISOString();

                    if (isOthers) {
                        await addBlock({
                            action: 'COMPLAINT_VERIFIED_AI',
                            complaint_id: complaint.id,
                            user_id: req.user.id,
                            type: type,
                            description: description,
                            department: department, // The Verified Department
                            ai_tags: ai_tags,
                            location: blockLocation,
                            timestamp: blockTimestamp
                        });
                        console.log(`✅ Verified Blockchain Block created for #${complaint.id}`);
                    }
                    // If Dept changed
                    else if (department && department !== assignedDept) {
                        await addBlock({
                            action: 'DEPT_REASSIGNED_AI',
                            complaint_id: complaint.id,
                            user_id: 'SYSTEM_AI',
                            type: type,
                            description: `AI Reassigned from ${assignedDept} to ${department}`,
                            department: department,
                            previous_dept: assignedDept,
                            assigned_dept: department,
                            location: blockLocation,
                            timestamp: blockTimestamp
                        });
                        console.log(`✅ Blockchain updated for reassignment #${complaint.id}`);
                    }
                } catch (updateErr) {
                    console.error('Failed to update complaint with AI data:', updateErr.message);
                }
            } else {
                console.warn(`AI Analysis returned null for #${complaint.id}`);
                const logPath = require('path').join(__dirname, '..', 'debug_ai.log');
                require('fs').appendFileSync(logPath, `[COMPLAINT] AI Null/Failed for #${complaint.id}. isOthers=${isOthers}\n`);

                // FALLBACK: If AI failed but it was 'Others' (so no initial block), we MUST create one now to prevent data loss on chain
                if (isOthers) {
                    try {
                        await addBlock({
                            action: 'COMPLAINT_FILED_FALLBACK',
                            complaint_id: complaint.id,
                            user_id: req.user.id,
                            type: type,
                            description: description,
                            department: assignedDept || 'Corporation',
                            location: blockLocation,
                            timestamp: blockTimestamp
                        });
                        console.log(`⚠️ Fallback Blockchain Block created for #${complaint.id}`);
                        require('fs').appendFileSync(logPath, `[COMPLAINT] Fallback block created for #${complaint.id}\n`);
                    } catch (fbErr) {
                        console.error("Fallback Block Error:", fbErr);
                        require('fs').appendFileSync(logPath, `[COMPLAINT] Fallback Block Error: ${fbErr.message}\n`);
                    }
                }
            }
        }).catch(async (err) => {
            console.error('Background AI analysis failed:', err.message);
            const logPath = require('path').join(__dirname, '..', 'debug_ai.log');
            require('fs').appendFileSync(logPath, `[COMPLAINT] AI PROMISE REJECTED: ${err.message}\n`);

            // FINAL FALLBACK
            const safeType = type ? type.toString().toLowerCase().trim() : '';
            if (['others', 'other'].includes(safeType)) {
                // Blockchain Logic for AI Updates (re-declare for catch scope if needed, or define higher up)
                const blockLocation = (latitude && longitude) ? { lat: latitude, lng: longitude } : null;
                const blockTimestamp = new Date().toISOString();

                try {
                    await addBlock({
                        action: 'COMPLAINT_FILED_ERROR',
                        complaint_id: complaint.id,
                        user_id: req.user.id,
                        type: type,
                        description: description,
                        department: assignedDept || 'Corporation',
                        location: blockLocation,
                        timestamp: blockTimestamp
                    });
                    require('fs').appendFileSync(logPath, `[COMPLAINT] Error Fallback block created for #${complaint.id}\n`);
                } catch (fbErr) {
                    require('fs').appendFileSync(logPath, `[COMPLAINT] Error Fallback FAILED: ${fbErr.message}\n`);
                }
            }
        });

    } catch (err) {
        console.error(err.message);
        try {
            const errMsg = `[${new Date().toISOString()}] ERROR: ${err.stack}\n`;
            require('fs').appendFileSync(require('path').join(__dirname, '..', 'submission_debug.log'), errMsg);
        } catch (e) { console.error("Log failed:", e); }
        res.status(500).send('Server Error');
    }
});

// Get all complaints
router.get('/', auth, async (req, res) => {
    try {
        let query;
        let params = [];

        if (req.user.role === 'admin') {
            query = 'SELECT * FROM complaints ORDER BY created_at DESC';
        } else if (req.user.role === 'citizen' || req.user.role === 'industry_user') {
            query = 'SELECT * FROM complaints WHERE user_id = $1 ORDER BY created_at DESC';
            params = [req.user.id];
        } else {
            // Department users see complaints assigned to their department
            query = 'SELECT * FROM complaints WHERE assigned_dept = $1 ORDER BY created_at DESC';
            params = [req.user.role];
        }

        const complaints = await db.query(query, params);
        res.json(complaints.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get single complaint with all details (Admin)
router.get('/:id', [auth, authorize(['admin'])], async (req, res) => {
    try {
        const { id } = req.params;
        const complaint = await db.query(
            `SELECT c.*, u.username, u.email as user_email 
             FROM complaints c 
             LEFT JOIN users u ON c.user_id = u.id 
             WHERE c.id = $1`,
            [id]
        );

        if (complaint.rows.length === 0) {
            return res.status(404).json({ msg: 'Complaint not found' });
        }

        res.json(complaint.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Update Complaint Status
router.put('/:id/status', [auth, authorize(['admin', 'KSEB', 'Water Authority', 'PWD', 'Corporation', 'company'])], async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        const complaint = await db.query('SELECT * FROM complaints WHERE id = $1', [id]);
        if (complaint.rows.length === 0) {
            return res.status(404).json({ msg: 'Complaint not found' });
        }

        if (req.user.role !== 'admin' && complaint.rows[0].assigned_dept !== req.user.role) {
            return res.status(403).json({ msg: 'Not authorized to update this complaint' });
        }

        const update = await db.query(
            'UPDATE complaints SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [status, id]
        );

        res.json(update.rows[0]);

        // Add to Blockchain
        const updatedComplaint = update.rows[0];
        await addBlock({
            action: 'STATUS_UPDATE',
            complaint_id: id,
            user_id: req.user.id,
            previous_status: complaint.rows[0].status,
            new_status: status,
            department: updatedComplaint.assigned_dept,
            timestamp: new Date()
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Assign Department (Admin only)
router.put('/:id/assign', [auth, authorize(['admin'])], async (req, res) => {
    try {
        const { assigned_dept } = req.body;
        const { id } = req.params;

        const update = await db.query(
            'UPDATE complaints SET assigned_dept = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [assigned_dept, id]
        );

        if (update.rows.length === 0) {
            return res.status(404).json({ msg: 'Complaint not found' });
        }

        res.json(update.rows[0]);

        // Add to Blockchain
        await addBlock({
            action: 'DEPT_ASSIGNED',
            complaint_id: id,
            user_id: req.user.id,
            assigned_dept: assigned_dept,
            timestamp: new Date()
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE complaint (Admin only) - removes from PostgreSQL
router.delete('/:id', [auth, authorize(['admin'])], async (req, res) => {
    try {
        const { id } = req.params;

        // First get the complaint to delete associated image
        const complaint = await db.query('SELECT image_url FROM complaints WHERE id = $1', [id]);

        if (complaint.rows.length === 0) {
            return res.status(404).json({ msg: 'Complaint not found' });
        }

        // Delete the image file if exists
        if (complaint.rows[0].image_url) {
            try {
                const imagePath = path.join(__dirname, '..', complaint.rows[0].image_url);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            } catch (fsErr) {
                console.error("Failed to delete image file:", fsErr.message);
                // Continue to delete from DB
            }
        }

        // Delete from database
        await db.query('DELETE FROM complaints WHERE id = $1', [id]);

        // Record deletion on Blockchain
        await addBlock({
            action: 'COMPLAINT_DELETED',
            complaint_id: id,
            user_id: req.user.id,
            timestamp: new Date(),
            reason: 'Admin Delete'
        });

        res.json({ msg: 'Complaint deleted successfully', id: parseInt(id) });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Bulk delete complaints (Admin only)
router.post('/bulk-delete', [auth, authorize(['admin'])], async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ msg: 'No complaint IDs provided' });
        }

        // Get all complaints to delete images
        const complaints = await db.query(
            'SELECT id, image_url FROM complaints WHERE id = ANY($1)',
            [ids]
        );

        // Delete associated images
        for (const complaint of complaints.rows) {
            if (complaint.image_url) {
                try {
                    const imagePath = path.join(__dirname, '..', complaint.image_url);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                } catch (fsErr) {
                    console.error("Failed to delete image (bulk):", fsErr.message);
                }
            }
        }

        // Bulk delete from database
        await db.query('DELETE FROM complaints WHERE id = ANY($1)', [ids]);

        // Record deletions on Blockchain (One block per deletion for traceability)
        for (const id of ids) {
            await addBlock({
                action: 'COMPLAINT_DELETED',
                complaint_id: id,
                user_id: req.user.id,
                timestamp: new Date(),
                reason: 'Admin Bulk Delete'
            });
        }

        res.json({ msg: `${ids.length} complaints deleted successfully`, deletedCount: ids.length });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Simulate Data - Generate 20 test complaints for hackathon demo
router.post('/simulate', [auth, authorize(['admin'])], async (req, res) => {
    try {
        // Trivandrum, Kerala locations - spread across the city
        const trivandrumLocations = [
            { lat: 8.5241, lng: 76.9366, area: 'Technopark' },
            { lat: 8.5074, lng: 76.9730, area: 'Kovalam' },
            { lat: 8.4875, lng: 76.9525, area: 'Vizhinjam' },
            { lat: 8.5568, lng: 76.8816, area: 'Vattiyoorkavu' },
            { lat: 8.5241, lng: 76.9066, area: 'Kazhakkoottam' },
            { lat: 8.4855, lng: 76.9492, area: 'Kovalam Beach' },
            { lat: 8.5013, lng: 77.0129, area: 'East Fort' },
            { lat: 8.5074, lng: 76.9530, area: 'Nellimoodu' },
            { lat: 8.4697, lng: 76.9378, area: 'Poovar' },
            { lat: 8.5614, lng: 76.8908, area: 'Ulloor' },
            { lat: 8.5431, lng: 76.9373, area: 'Attipra' },
            { lat: 8.5891, lng: 76.8674, area: 'Kesavadasapuram' },
            { lat: 8.5124, lng: 76.9512, area: 'Chowara' },
            { lat: 8.5321, lng: 76.8792, area: 'Sreekaryam' },
            { lat: 8.5447, lng: 76.9056, area: 'Pallipuram' },
            { lat: 8.4952, lng: 76.9367, area: 'Venganoor' },
            { lat: 8.5629, lng: 76.9241, area: 'Mangalapuram' },
            { lat: 8.5781, lng: 76.8532, area: 'Kowdiar' },
            { lat: 8.5912, lng: 76.8891, area: 'Pattom' },
            { lat: 8.5256, lng: 76.9478, area: 'Thumba' },
            { lat: 8.4812, lng: 77.0012, area: 'Veli' },
            { lat: 8.5543, lng: 76.9123, area: 'Kaniyapuram' },
            { lat: 8.5678, lng: 76.8756, area: 'Nalanchira' },
            { lat: 8.5398, lng: 76.8654, area: 'Karyavattom' },
        ];

        const issueTypes = [
            {
                type: 'Pothole', dept: 'PWD', descriptions: [
                    'Large pothole causing traffic issues near the junction',
                    'Deep pothole on the main road causing accidents',
                    'Multiple potholes on the residential road',
                    'Dangerous pothole near school zone'
                ]
            },
            {
                type: 'Streetlight', dept: 'KSEB', descriptions: [
                    'Street light not working for past 2 weeks',
                    'Flickering street light creating disturbance',
                    'Broken street light pole after storm',
                    'Multiple street lights not working in the area'
                ]
            },
            {
                type: 'Water Leak', dept: 'Water Authority', descriptions: [
                    'Major water pipe leak causing wastage',
                    'Underground pipe burst flooding the road',
                    'Continuous water leakage from main pipeline',
                    'Water supply pipe damaged by construction'
                ]
            },
            {
                type: 'Garbage', dept: 'Corporation', descriptions: [
                    'Garbage not collected for 5 days',
                    'Overflowing dustbin near residential area',
                    'Illegal garbage dumping on empty plot',
                    'Waste pile attracting stray animals'
                ]
            },
            {
                type: 'Drainage', dept: 'Water Authority', descriptions: [
                    'Clogged drainage causing waterlogging',
                    'Open drainage emitting bad smell',
                    'Broken drainage cover dangerous for pedestrians',
                    'Sewage overflow during monsoon'
                ]
            },
            {
                type: 'Road Damage', dept: 'PWD', descriptions: [
                    'Road surface damaged after heavy rain',
                    'Cracked road near bus stop',
                    'Road caved in near the market',
                    'Speed breaker damaged causing accidents'
                ]
            },
            {
                type: 'Electricity', dept: 'KSEB', descriptions: [
                    'Frequent power cuts in the area',
                    'Sparking transformer near houses',
                    'Low voltage issue affecting appliances',
                    'Exposed electric wires on the pole'
                ]
            },
        ];

        const statuses = ['pending', 'pending', 'pending', 'in_progress', 'reviewed'];

        // Get existing images from uploads folder
        let existingImages = [];
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        if (fs.existsSync(uploadsDir)) {
            existingImages = fs.readdirSync(uploadsDir)
                .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
                .map(f => `/uploads/${f}`);
        }

        const createdComplaints = [];
        // Define clusters with specific department focus for better demo
        const clusterConfigs = [
            { location: trivandrumLocations[0], type: 'Electricity' },    // Technopark -> KSEB Cluster
            { location: trivandrumLocations[6], type: 'Water Leak' },     // East Fort -> Water Cluster
            { location: trivandrumLocations[10], type: 'Pothole' },       // Attipra -> PWD Cluster
            { location: trivandrumLocations[15], type: 'Garbage' }        // Venganoor -> Corp Cluster
        ];

        // Helper to get department based on issue type
        const getAutoAssignedDept = (issueType) => {
            const category = issueTypes.find(t => t.type === issueType);
            return category ? category.dept : null;
        };

        for (let i = 0; i < 20; i++) {
            let lat, lng, location, info;
            let issueType, description;

            // Create 4 clusters of 4 complaints each (Indices 0-15)
            if (i < 16) {
                const clusterIdx = Math.floor(i / 4); // 0,0,0,0, 1,1,1,1...
                const config = clusterConfigs[clusterIdx];
                location = config.location;

                // Tight clustering (2-3 meters)
                lat = location.lat + (Math.random() - 0.5) * 0.00004;
                lng = location.lng + (Math.random() - 0.5) * 0.00004;

                issueType = config.type;
                // Get description for this specific type
                const category = issueTypes.find(t => t.type === issueType);
                description = category ? category.descriptions[Math.floor(Math.random() * category.descriptions.length)] : 'Test issue';

            } else {
                // Remaining 4 are scattered random issues
                location = trivandrumLocations[Math.floor(Math.random() * trivandrumLocations.length)];
                lat = location.lat + (Math.random() - 0.5) * 0.002;
                lng = location.lng + (Math.random() - 0.5) * 0.002;

                const randomCategory = issueTypes[Math.floor(Math.random() * issueTypes.length)];
                issueType = randomCategory.type;
                description = randomCategory.descriptions[Math.floor(Math.random() * randomCategory.descriptions.length)];
            }

            // Auto-assign department
            const assignedDept = getAutoAssignedDept(issueType);

            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const imageUrl = existingImages.length > 0
                ? existingImages[Math.floor(Math.random() * existingImages.length)]
                : null;

            // Create complaint with the logged-in admin's user ID
            const daysAgo = Math.floor(Math.random() * 7);
            const result = await db.query(
                `INSERT INTO complaints (user_id, type, description, latitude, longitude, image_url, assigned_dept, status, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - INTERVAL '1 day' * $9)
                 RETURNING *`,
                [req.user.id, issueType, `${description} - ${location.area}`, lat, lng, imageUrl, assignedDept, status, daysAgo]
            );

            const complaint = result.rows[0];
            createdComplaints.push(complaint);

            // Add to Blockchain
            await addBlock({
                action: 'COMPLAINT_FILED',
                complaint_id: complaint.id,
                user_id: req.user.id,
                type: issueType,
                description: `${description} - ${location.area}`,
                department: assignedDept,
                location: { lat, lng },
                is_simulated: true,
                timestamp: new Date()
            });
        }

        res.json({
            msg: `Successfully created ${createdComplaints.length} test complaints in Trivandrum, Kerala!`,
            count: createdComplaints.length,
            complaints: createdComplaints
        });
    } catch (err) {
        console.error('Simulate Error:', err.message);
        res.status(500).json({ msg: 'Failed to simulate data', error: err.message });
    }
});

// Get nearby/grouped complaints (within 50 meters)
router.get('/grouped', auth, async (req, res) => {
    try {
        let query;
        let params = [];

        if (req.user.role === 'admin') {
            query = 'SELECT * FROM complaints WHERE latitude IS NOT NULL ORDER BY created_at DESC';
        } else if (req.user.role === 'citizen') {
            query = 'SELECT * FROM complaints WHERE user_id = $1 AND latitude IS NOT NULL ORDER BY created_at DESC';
            params = [req.user.id];
        } else {
            query = 'SELECT * FROM complaints WHERE assigned_dept = $1 AND latitude IS NOT NULL ORDER BY created_at DESC';
            params = [req.user.role];
        }

        const result = await db.query(query, params);
        const complaints = result.rows;

        // Group nearby complaints (within ~10 meters = 0.0001 degrees)
        const THRESHOLD = 0.0001; // approximately 10 meters
        const groups = [];
        const processed = new Set();

        for (let i = 0; i < complaints.length; i++) {
            if (processed.has(complaints[i].id)) continue;

            const group = [complaints[i]];
            processed.add(complaints[i].id);

            for (let j = i + 1; j < complaints.length; j++) {
                if (processed.has(complaints[j].id)) continue;

                const latDiff = Math.abs(complaints[i].latitude - complaints[j].latitude);
                const lngDiff = Math.abs(complaints[i].longitude - complaints[j].longitude);

                if (latDiff <= THRESHOLD && lngDiff <= THRESHOLD) {
                    group.push(complaints[j]);
                    processed.add(complaints[j].id);
                }
            }

            groups.push({
                id: `group_${i}`,
                center: {
                    lat: group.reduce((sum, c) => sum + parseFloat(c.latitude), 0) / group.length,
                    lng: group.reduce((sum, c) => sum + parseFloat(c.longitude), 0) / group.length
                },
                count: group.length,
                complaints: group,
                isGroup: group.length > 1
            });
        }

        res.json(groups);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// Delete a complaint (Admin & Citizen Owner)
router.delete('/:id', [auth, authorize(['admin', 'citizen'])], async (req, res) => {
    try {
        const { id } = req.params;

        // Check if complaint exists
        const complaintResult = await db.query('SELECT * FROM complaints WHERE id = $1', [id]);
        if (complaintResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Complaint not found' });
        }
        const complaint = complaintResult.rows[0];

        // Authorization Check: Admin can delete all, Citizen can only delete their own
        if (req.user.role !== 'admin' && complaint.user_id !== req.user.id) {
            return res.status(403).json({ msg: 'Not authorized to delete this complaint' });
        }

        // Add Deletion Block to Blockchain/Log (Audit Trail)
        // We log the deletion before actually deleting the data so we have a record of what WAS deleted.
        try {
            await addBlock({
                action: 'COMPLAINT_DELETED',
                complaint_id: id,
                user_id: req.user.id,
                type: complaint.type,
                description: req.user.role === 'admin' ? "Deleted by Admin" : "Deleted by Citizen",
                department: complaint.assigned_dept,
                location: { lat: complaint.latitude, lng: complaint.longitude },
                timestamp: new Date()
            });
        } catch (bcError) {
            console.error("Blockchain deletion log failed:", bcError);
            // We continue with deletion even if blockchain logging fails, primarily to ensure admin control.
        }

        // Delete from Database
        await db.query('DELETE FROM complaints WHERE id = $1', [id]);

        res.json({ msg: 'Complaint deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
