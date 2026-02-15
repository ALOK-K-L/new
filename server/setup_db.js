require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function setup() {
    const dbConfig = {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    };

    // Connect to default 'postgres' database to create the new DB
    const client = new Client({ ...dbConfig, database: 'postgres' });

    try {
        await client.connect();

        // Check if database exists
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${process.env.DB_NAME}'`);
        if (res.rowCount === 0) {
            console.log(`Database ${process.env.DB_NAME} not found. Creating...`);
            await client.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
            console.log(`Database ${process.env.DB_NAME} created.`);
        } else {
            console.log(`Database ${process.env.DB_NAME} already exists.`);
        }

        await client.end();

        // Now connect to the new database and create tables
        const pool = new Client({ ...dbConfig, database: process.env.DB_NAME });
        await pool.connect();

        const sql = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
        await pool.query(sql);
        console.log('Tables created successfully.');
        await pool.end();

    } catch (err) {
        console.error('Error setting up database:', err);
    }
}

setup();
