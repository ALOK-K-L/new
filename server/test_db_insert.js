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

async function testInsert() {
    try {
        console.log("Testing DB Insert...");

        const query = `
            INSERT INTO complaints 
            (user_id, type, description, latitude, longitude, image_url, assigned_dept, tags) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *
        `;

        // Mock Data
        const values = [
            1, // user_id (assuming user 1 exists)
            'Test Type',
            'Test Description',
            10.123, // lat
            76.456, // lng
            null, // image_url
            'General', // dept
            null // tags
        ];

        console.log("Query:", query);
        console.log("Values:", values);

        const res = await pool.query(query, values);
        console.log("✅ Insert Success! ID:", res.rows[0].id);

        // Clean up
        await pool.query('DELETE FROM complaints WHERE id = $1', [res.rows[0].id]);
        console.log("Cleaned up test record.");

    } catch (err) {
        console.error("❌ Insert Failed:", err);
    } finally {
        pool.end();
    }
}

testInsert();
