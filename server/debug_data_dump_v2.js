
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
        console.log("Fetching last 5 blocks...");
        const res = await pool.query('SELECT index, department, data FROM blocks ORDER BY index DESC LIMIT 5');

        for (const b of res.rows) {
            console.log(`\n=== Block #${b.index} ===`);
            console.log("Department Col:", b.department);
            console.log("Data Type:", typeof b.data);

            let data = b.data;
            if (typeof b.data === 'string') {
                console.log("Data is STRING. Parsing...");
                try {
                    data = JSON.parse(b.data);
                } catch (e) {
                    console.error("JSON PARSE ERROR:", e.message);
                }
            } else {
                console.log("Data is OBJECT.");
            }

            console.log("Content:", JSON.stringify(data, null, 2));

            // Check for critical fields
            if (!data) console.error("!!! DATA IS NULL/UNDEFINED !!!");
            else {
                if (!data.department && !data.assigned_dept) console.warn("! Missing department in data");
                if (!data.type) console.warn("! Missing type in data");
            }
        }
    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        pool.end();
    }
}

debugData();
