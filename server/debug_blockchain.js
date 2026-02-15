
const { Pool } = require('pg');
require('dotenv').config({ path: 'c:/E_folder/PROJECTS/NEWCIVIC_mod/server/.env' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkHealth() {
    try {
        console.log("Checking blocks table...");
        const res = await pool.query("SELECT to_regclass('public.blocks');");
        if (!res.rows[0].to_regclass) {
            console.error("❌ Table 'blocks' DOES NOT EXIST.");
        } else {
            console.log("✅ Table 'blocks' exists.");

            const count = await pool.query('SELECT COUNT(*) FROM blocks');
            console.log(`Block count: ${count.rows[0].count}`);

            const maxIndex = await pool.query('SELECT MAX(index) FROM blocks');
            console.log(`Max Index: ${maxIndex.rows[0].max}`);

            // Try to select headers
            const sample = await pool.query('SELECT * FROM blocks LIMIT 1');
            console.log("Sample block keys:", Object.keys(sample.rows[0] || {}));
        }
    } catch (err) {
        console.error("❌ Database Error:", err);
    } finally {
        pool.end();
    }
}

checkHealth();
