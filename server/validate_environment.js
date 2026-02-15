const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');
const { addBlock } = require('./routes/blockchain');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function validate() {
    console.log("=== START VALIDATION ===");

    try {
        // 1. Check DB Connection
        await pool.query('SELECT NOW()');
        console.log("✅ DB Connection: OK");

        // 2. Check Complaints Table Schema
        const resComplaints = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'complaints'
        `);
        console.log("✅ Complaints Table Schema:", resComplaints.rows.map(r => r.column_name).join(', '));

        // Verify 'tags' and 'ai_tags' exist
        const tagsExists = resComplaints.rows.some(r => r.column_name === 'tags');
        const aiTagsExists = resComplaints.rows.some(r => r.column_name === 'ai_tags');

        if (!tagsExists) console.error("❌ ERROR: 'tags' column missing!");
        if (!aiTagsExists) console.error("❌ ERROR: 'ai_tags' column missing!");

        // 3. Check Blocks Table Schema
        const resBlocks = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'blocks'
        `);
        console.log("✅ Blocks Table Schema:", resBlocks.rows.map(r => r.column_name).join(', '));

        // 4. Test addBlock function
        console.log("Testing addBlock()...");
        try {
            await addBlock({
                action: 'TEST_VALIDATION',
                complaint_id: 999999,
                user_id: 1,
                department: 'TEST',
                data: { check: true }
            });
            console.log("✅ addBlock() success");
        } catch (e) {
            console.error("❌ addBlock() failed:", e.message);
            console.error(e);
        }

    } catch (err) {
        console.error("❌ VALIDATION FAILED:", err);
    } finally {
        pool.end();
        console.log("=== END VALIDATION ===");
    }
}

validate();
