
const { Pool } = require('pg');
require('dotenv').config({ path: 'c:/E_folder/PROJECTS/NEWCIVIC_mod/server/.env' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkDB() {
    try {
        console.log("=== USER 2 EMAIL ===");
        const u2 = await pool.query('SELECT email FROM users WHERE id = 2');
        console.log(u2.rows[0].email);

        console.log("\n=== TOTAL COUNTS ===");
        const userCount = await pool.query('SELECT COUNT(*) FROM users');
        const complaintCount = await pool.query('SELECT COUNT(*) FROM complaints');
        console.log(`Users: ${userCount.rows[0].count}`);
        console.log(`Complaints: ${complaintCount.rows[0].count}`);

    } catch (err) {
        console.error("DB Check Error:", err);
    } finally {
        pool.end();
    }
}

checkDB();
