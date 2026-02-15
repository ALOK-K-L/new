const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const check = async () => {
    try {
        const res = await pool.query(`
            SELECT conname, pg_get_constraintdef(oid)
            FROM pg_constraint
            WHERE conrelid = 'users'::regclass;
        `);
        console.log('Constraints on users table:');
        res.rows.forEach(r => console.log(`- ${r.conname}: ${r.pg_get_constraintdef}`));
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
};

check();
