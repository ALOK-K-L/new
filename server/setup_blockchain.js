const db = require('./db');
const crypto = require('crypto');

async function createBlocksTable() {
    try {
        await db.query(`
            -- DROP TABLE IF EXISTS blocks;
            CREATE TABLE IF NOT EXISTS blocks (
                index SERIAL PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data JSONB NOT NULL,
                hash VARCHAR(64) NOT NULL,
                previous_hash VARCHAR(64) NOT NULL,
                department VARCHAR(50) DEFAULT 'General'
            );
        `);
        console.log("Blocks table created.");

        // Check if genesis block exists
        const count = await db.query('SELECT COUNT(*) FROM blocks');
        if (parseInt(count.rows[0].count) === 0) {
            const genesisData = JSON.stringify({ message: "Genesis Block" });
            const hash = crypto.createHash('sha256').update('0' + genesisData + '0').digest('hex');
            await db.query(`
                INSERT INTO blocks (index, data, hash, previous_hash, department)
                VALUES (0, $1, $2, '0', 'System')
            `, [genesisData, hash]);
            console.log("Genesis block created.");
        }
    } catch (err) {
        console.error("Error creating blocks table:", err);
    }
}

createBlocksTable();
