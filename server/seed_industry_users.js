const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const seedUsers = async () => {
    try {
        console.log('Seeding industry users...');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('123456', salt);

        const users = [
            { username: 'IndustryUser', email: 'industry@gmail.com', role: 'industry_user' },
            { username: 'CompanyAdmin', email: 'company@gmail.com', role: 'company' }
        ];

        for (const user of users) {
            const check = await pool.query('SELECT * FROM users WHERE email = $1', [user.email]);
            if (check.rows.length === 0) {
                await pool.query(
                    'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)',
                    [user.username, user.email, passwordHash, user.role]
                );
                console.log(`Created: ${user.email}`);
            } else {
                // Update password if exists to ensure it matches 123456
                await pool.query(
                    'UPDATE users SET password_hash = $1, role = $3 WHERE email = $2',
                    [passwordHash, user.email, user.role]
                );
                console.log(`Updated: ${user.email}`);
            }
        }
        console.log('Seeding complete.');
    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        pool.end();
    }
};

seedUsers();
