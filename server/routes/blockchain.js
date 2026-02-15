const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const auth = require('../middleware/auth');

const fs = require('fs');
const path = require('path');

// Add Block Function
const addBlock = async (data) => {
    try {
        const logPath = path.join(__dirname, '..', 'debug_ai.log');
        fs.appendFileSync(logPath, `[BLOCKCHAIN] Adding block: ${data.action} for ID ${data.complaint_id}\n`);

        const lastBlockRes = await db.query('SELECT * FROM blocks ORDER BY index DESC LIMIT 1');
        const lastBlock = lastBlockRes.rows[0];
        const newIndex = lastBlock ? lastBlock.index + 1 : 0;
        const prevHash = lastBlock ? lastBlock.hash : '0';
        const timestamp = new Date().toISOString();
        const department = data.department || 'General';

        // Create hash
        const dataString = JSON.stringify(data);
        const input = newIndex + timestamp + dataString + prevHash + department;
        const hash = crypto.createHash('sha256').update(input).digest('hex');

        await db.query(`
            INSERT INTO blocks (index, timestamp, data, hash, previous_hash, department)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [newIndex, timestamp, dataString, hash, prevHash, department]);

        console.log(`Block #${newIndex} added to chain.`);
        fs.appendFileSync(logPath, `[BLOCKCHAIN] Success: Block #${newIndex} added.\n`);
        return { index: newIndex, hash };
    } catch (err) {
        const logPath = path.join(__dirname, '..', 'debug_ai.log');
        console.error("Blockchain Error:", err);
        fs.appendFileSync(logPath, `[BLOCKCHAIN] ERROR: ${err.message}\n`);
    }
};

// GET Blockchain (Admin only theoretically, but department might want to see too)
router.get('/', auth, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM blocks ORDER BY index DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Repair/Sync Blockchain (Backfill missing blocks)
router.post('/repair', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });

        const complaints = await db.query('SELECT * FROM complaints');
        let addedCount = 0;

        // Fetch all blocks first to avoid N+1 queries and SQL JSON issues
        const blocksRes = await db.query('SELECT * FROM blocks');
        const blocks = blocksRes.rows;

        // Parse block data once (handling potential stringified JSON inside JSONB column)
        const blockMap = new Set();
        blocks.forEach(b => {
            try {
                // If data is stored as a stringified JSON string (double encoded), parse it. 
                // If it's already an object (ideal JSONB usage), use it directly.
                const data = typeof b.data === 'string' ? JSON.parse(b.data) : b.data;
                if (data && data.complaint_id) {
                    blockMap.add(data.complaint_id.toString());
                }
            } catch (e) { console.error("Error parsing block data:", e); }
        });

        for (const c of complaints.rows) {
            // Check in-memory map
            if (!blockMap.has(c.id.toString())) {
                // Backfill block
                await addBlock({
                    action: 'LEGACY_SYNC',
                    complaint_id: c.id,
                    type: c.type,
                    description: c.description,
                    department: c.assigned_dept || 'Corporation', // Ensure department is passed
                    status: c.status,
                    location: { lat: c.latitude, lng: c.longitude },
                    timestamp: c.created_at // Use original creation time
                });
                addedCount++;
            }
        }

        res.json({ msg: `Blockchain sync complete. Added ${addedCount} missing blocks.` });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = { router, addBlock };
