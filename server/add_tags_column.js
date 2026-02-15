const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const migrate = async () => {
    try {
        console.log('Adding "tags" column to complaints table...');

        // check if column exists
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='complaints' AND column_name='tags';
        `);

        if (res.rows.length === 0) {
            await pool.query('ALTER TABLE complaints ADD COLUMN tags TEXT');
            console.log('✅ Column "tags" added successfully.');
        } else {
            console.log('ℹ️ Column "tags" already exists.');
        }

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        pool.end();
    }
};

migrate();
