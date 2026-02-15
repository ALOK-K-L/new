const db = require('./db');

async function checkFullSchema() {
    try {
        console.log("Checking 'complaints' table full schema...");
        const res = await db.query(`
            SELECT column_name, data_type, ordinal_position
            FROM information_schema.columns 
            WHERE table_name = 'complaints'
            ORDER BY ordinal_position;
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkFullSchema();
