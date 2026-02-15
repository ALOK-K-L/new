
const { Pool } = require('pg');
require('dotenv').config({ path: 'c:/E_folder/PROJECTS/NEWCIVIC_mod/server/.env' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function debugData() {
    try {
        console.log("Fetching last 10 blocks...");
        const res = await pool.query('SELECT * FROM blocks ORDER BY index DESC LIMIT 10');
        console.log("Blocks found:", res.rows.length);

        res.rows.forEach(b => {
            console.log(`--- Block #${b.index} ---`);
            console.log("Department (col):", b.department);
            console.log("Data Type:", typeof b.data);
            console.log("Data Value:", b.data); // Inspect if it's string or object or null

            // Simulate the filter logic
            try {
                const data = typeof b.data === 'string' ? JSON.parse(b.data) : b.data;
                console.log("Parsed Data:", data);
                console.log("Data.department:", data ? data.department : 'UNDEFINED DATA');
            } catch (e) {
                console.error("Parsing/Access Error:", e.message);
            }
        });
    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        pool.end();
    }
}

debugData();
