
const { addBlock } = require('./routes/blockchain');
const db = require('./db');
require('dotenv').config();

async function testAdd() {
    try {
        console.log("Testing addBlock...");
        const result = await addBlock({
            action: 'TEST_BLOCK',
            department: 'TestDept',
            timestamp: new Date()
        });
        console.log("Result:", result);

        const count = await db.query('SELECT COUNT(*) FROM blocks');
        console.log("New block count:", count.rows[0].count);
    } catch (err) {
        console.error("Test failed:", err);
    } finally {
        // We'll let the process exit naturally, or force it if needed
        setTimeout(() => process.exit(0), 1000);
    }
}

testAdd();
