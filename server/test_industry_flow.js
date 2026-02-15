const axios = require('axios');

const API_URL = 'http://localhost:5002/api';
let industryToken, companyToken, complaintId;

const runTest = async () => {
    try {
        console.log('--- STARTING INDUSTRY FLOW VERIFICATION ---');

        // 1. Register Industry User
        const indUser = `ind_${Date.now()}`;
        console.log(`\n1. Registering Industry User: ${indUser}`);
        const regRes = await axios.post(`${API_URL}/auth/register`, {
            username: indUser,
            email: `${indUser}@test.com`,
            password: 'password123',
            role: 'industry_user'
        });
        industryToken = regRes.data.token;
        console.log('   ✅ Registered. Token received.');

        // 2. Submit Industry Complaint
        console.log('\n2. Submitting "Antivirus renewal failed" complaint...');
        const compRes = await axios.post(`${API_URL}/complaints`, {
            type: 'Antivirus',
            description: 'My antivirus subscription renewal failed and I was charged twice.',
            latitude: 10.1,
            longitude: 76.2
        }, {
            headers: { 'x-auth-token': industryToken }
        });
        complaintId = compRes.data.id;
        console.log(`   ✅ Complaint #${complaintId} submitted.`);
        console.log(`   👉 Initial Assignment: ${compRes.data.assigned_dept}`);

        if (compRes.data.assigned_dept !== 'company') {
            console.error('   ❌ ERROR: Should be assigned to "company"!');
        } else {
            console.log('   ✅ Correctly assigned to "company".');
        }

        // Wait for AI Analysis (mocked wait)
        console.log('\n   ⏳ Waiting 5s for AI analysis...');
        await new Promise(r => setTimeout(r, 5000));

        // 3. Login as Company (TechCorp is seeded, or create new)
        // We'll create a new company user to be sure
        const compUser = `comp_${Date.now()}`;
        console.log(`\n3. Registering Company User: ${compUser}`);
        const compRegRes = await axios.post(`${API_URL}/auth/register`, {
            username: compUser,
            email: `${compUser}@test.com`,
            password: 'password123',
            role: 'company'
        });
        companyToken = compRegRes.data.token;
        console.log('   ✅ Company Registered.');

        // 4. Fetch Company Complaints
        console.log('\n4. Fetching Company Complaints...');
        const listRes = await axios.get(`${API_URL}/complaints`, {
            headers: { 'x-auth-token': companyToken }
        });

        const found = listRes.data.find(c => c.id === complaintId);
        if (found) {
            console.log(`   ✅ Complaint #${complaintId} found in Company Dashboard.`);
            console.log(`   👉 AI Tags: ${found.ai_tags}`);
            console.log(`   👉 Priority: ${found.priority}`);
        } else {
            console.error('   ❌ ERROR: Complaint not visible to company!');
        }

        // 5. Update Status
        console.log('\n5. Updating Status to "in_progress"...');
        const updateRes = await axios.put(`${API_URL}/complaints/${complaintId}/status`, {
            status: 'in_progress'
        }, {
            headers: { 'x-auth-token': companyToken }
        });
        console.log(`   ✅ Status updated: ${updateRes.data.status}`);

        console.log('\n--- VERIFICATION COMPLETE ---');

    } catch (err) {
        console.error('\n❌ TEST FAILED:', err.response?.data?.msg || err.message);
    }
};

runTest();
