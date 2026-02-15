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

const migrate = async () => {
    try {
        console.log('Starting migration...');

        // 1. Drop existing check constraint on 'role'
        // Note: The constraint name is usually auto-generated. We might need to find it or just drop the constraint if we know the name or use a catch-all approach.
        // However, specifically for 'role', it's often named 'users_role_check'.
        // 1. Find and Drop existing check constraint on 'role'
        const res = await pool.query(`
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'users'::regclass AND contype = 'c'
        `);

        for (const row of res.rows) {
            // We can strictly filter if we know the definition or just drop all checks on users if we are sure
            // A safer bet is to look for one that affects the 'role' column, but that's complex to query.
            // Let's assume any check constraint on 'users' that isn't about other things is the role one.
            // Or better, just drop 'users_role_check' standard one, and prints others.
            console.log(`Found constraint: ${row.conname}`);
            if (row.conname.includes('role') || row.conname === 'users_role_check') {
                await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS "${row.conname}"`);
                console.log(`Dropped constraint: ${row.conname}`);
            }
        }

        // Also try dropping the standard one just in case it wasn't returned or filtered
        try {
            await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        } catch (e) { }

        // 2. Add new check constraint with industry roles
        const newConstraint = "CHECK (role IN ('citizen', 'admin', 'KSEB', 'Water Authority', 'PWD', 'Corporation', 'Other', 'industry_user', 'company'))";
        await pool.query(`ALTER TABLE users ADD CONSTRAINT users_role_check ${newConstraint}`);
        console.log('Added new role constraint.');

        // 3. Insert default 'Company' user (TechCorp)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password', salt); // Default password

        // Check if TechCorp exists
        const checkUser = await pool.query("SELECT * FROM users WHERE email = 'techcorp@gmail.com'");
        if (checkUser.rows.length === 0) {
            await pool.query(
                "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)",
                ['TechCorp', 'techcorp@gmail.com', hashedPassword, 'company']
            );
            console.log('Created default company user: TechCorp');
        } else {
            console.log('TechCorp user already exists.');
        }

        // 4. Update 'complaints' table check constraint for 'assigned_dept'?
        // Actually assigned_dept is just a VARCHAR(100), no CHECK constraint visible in database.sql for it.
        // BUT 'status' has a check. 'type' is varchar.
        // So we are good on complaints table structure, just logic needs change.

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
};

migrate();
