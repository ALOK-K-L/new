const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const migrate = async () => {
    try {
        console.log('Fixing Database Schema...');

        // 1. Add 'tags' column
        const resTags = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='complaints' AND column_name='tags'");
        if (resTags.rows.length === 0) {
            await pool.query('ALTER TABLE complaints ADD COLUMN tags TEXT');
            console.log('✅ Column "tags" added.');
        } else {
            console.log('ℹ️ Column "tags" already exists.');
        }

        // 2. Add 'ai_tags' column
        const resAiTags = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='complaints' AND column_name='ai_tags'");
        if (resAiTags.rows.length === 0) {
            await pool.query('ALTER TABLE complaints ADD COLUMN ai_tags TEXT');
            console.log('✅ Column "ai_tags" added.');
        } else {
            console.log('ℹ️ Column "ai_tags" already exists.');
        }

        console.log('Schema update complete.');

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        pool.end();
    }
};

migrate();
