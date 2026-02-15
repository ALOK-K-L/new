const db = require('./db');

async function checkConstraints() {
    try {
        console.log("Checking for Foreign Keys on 'blocks' table...");
        const fkRes = await db.query(`
            SELECT
                tc.table_schema, 
                tc.constraint_name, 
                tc.table_name, 
                kcu.column_name, 
                ccu.table_schema AS foreign_table_schema,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                rc.delete_rule 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            JOIN information_schema.referential_constraints AS rc
              ON rc.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='blocks';
        `);

        if (fkRes.rows.length === 0) {
            console.log("✅ No Foreign Keys found key on 'blocks' table.");
        } else {
            console.log("⚠️ Foreign Keys found:", fkRes.rows);
        }

        console.log("\nChecking for Triggers on 'complaints' table...");
        const trigRes = await db.query(`
            SELECT event_object_table, trigger_name, event_manipulation, action_statement 
            FROM information_schema.triggers 
            WHERE event_object_table = 'complaints';
        `);

        if (trigRes.rows.length === 0) {
            console.log("✅ No Triggers found on 'complaints' table.");
        } else {
            console.log("⚠️ Triggers found:", trigRes.rows);
        }

        console.log("\nChecking 'blocks' table count...");
        const countRes = await db.query('SELECT COUNT(*) FROM blocks');
        const initialCount = parseInt(countRes.rows[0].count);
        console.log(`Initial Block Count: ${initialCount}`);

        // TEST: Create Complaint
        console.log("Creating Test Complaint...");
        const compRes = await db.query("INSERT INTO complaints (user_id, type, description, assigned_dept) VALUES (1, 'Test', 'Delete Me', 'KSEB') RETURNING id");
        const compId = compRes.rows[0].id;
        console.log(`Created Complaint #${compId}`);

        // TEST: Add Block (Simulate what happens in route)
        console.log("Adding Block for Test Complaint...");
        const crypto = require('crypto');
        const d = { complaint_id: compId, department: 'KSEB', action: 'TEST_BLOCK' };
        const ds = JSON.stringify(d);
        const h = crypto.createHash('sha256').update(ds).digest('hex');
        await db.query("INSERT INTO blocks (index, data, hash, previous_hash, department) VALUES ($1, $2, $3, '0', 'KSEB')", [initialCount + 999, ds, h]);

        const countAfterAdd = parseInt((await db.query('SELECT COUNT(*) FROM blocks')).rows[0].count);
        console.log(`Block Count after Add: ${countAfterAdd}`);

        // TEST: Delete Complaint
        console.log(`Deleting Complaint #${compId}...`);
        await db.query('DELETE FROM complaints WHERE id = $1', [compId]);
        console.log("Complaint Deleted.");

        // TEST: Check Block Count
        const countAfterDelete = parseInt((await db.query('SELECT COUNT(*) FROM blocks')).rows[0].count);
        console.log(`Block Count after Delete: ${countAfterDelete}`);

        if (countAfterDelete < countAfterAdd) {
            console.error("❌ FAILURE: Block was deleted!");
        } else {
            console.log("✅ SUCCESS: Block persisted after complaint deletion.");
        }

    } catch (err) {
        console.error("Error checking DB:", err);
    } finally {
        process.exit();
    }
}

checkConstraints();
