require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function seedUsers() {
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // Hash the password
        const password = '123456';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Default users to create
        const users = [
            { username: 'admin', email: 'admin@gmail.com', role: 'admin' },
            { username: 'citizen', email: 'citizen@gmail.com', role: 'citizen' },
            { username: 'pwd_officer', email: 'pwd@gmail.com', role: 'PWD' },
            { username: 'kseb_officer', email: 'kseb@gmail.com', role: 'KSEB' },
            { username: 'water_officer', email: 'water@gmail.com', role: 'Water Authority' },
            { username: 'corporation_officer', email: 'corporation@gmail.com', role: 'Corporation' },
        ];

        for (const user of users) {
            // Check if user exists
            const existing = await client.query('SELECT id FROM users WHERE email = $1', [user.email]);
            if (existing.rows.length === 0) {
                await client.query(
                    'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)',
                    [user.username, user.email, passwordHash, user.role]
                );
                console.log(`Created user: ${user.email} (${user.role})`);
            } else {
                console.log(`User already exists: ${user.email}`);
            }
        }

        console.log('\\nSeed complete! All users password: 123456');

    } catch (err) {
        console.error('Error seeding users:', err);
    } finally {
        await client.end();
    }
}

seedUsers();
