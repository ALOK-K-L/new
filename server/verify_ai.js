const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

// Test Data
const testUser = {
    email: 'test_ai_citizen@example.com',
    password: 'password123',
    username: 'test_ai_citizen',
    role: 'citizen'
};

const testComplaint = {
    type: 'Pothole', // Initial type
    description: 'There is a massive crater on the main highway near the bridge. It is causing severe traffic jams and is dangerous.', // AI should classify as PWD, High Priority
    latitude: 8.5241,
    longitude: 76.9366
};

async function runTest() {
    try {
        console.log('1. Registering/Logging in User...');
        let token;
        let userId;

        try {
            const regRes = await axios.post(`${API_URL}/auth/register`, testUser);
            token = regRes.data.token;
            userId = regRes.data.user.id;
            console.log('   Registered new user.');
        } catch (e) {
            if (e.response && e.response.status === 400 && e.response.data.error === 'User already exists') {
                console.log('   User exists, logging in...');
                const loginRes = await axios.post(`${API_URL}/auth/login`, { email: testUser.email, password: testUser.password });
                token = loginRes.data.token;
                userId = loginRes.data.user.id;
            } else {
                throw e;
            }
        }
        console.log('   Got Auth Token.');

        console.log('2. Submitting Complaint...');
        const start = Date.now();
        const complaintRes = await axios.post(`${API_URL}/complaints`, testComplaint, {
            headers: { 'x-auth-token': token }
        });
        const duration = Date.now() - start;
        console.log(`   Complaint submitted in ${duration}ms (Should be fast/immediate).`);

        const complaintId = complaintRes.data.id;
        const initialDept = complaintRes.data.assigned_dept;
        console.log(`   Initial Assignment: ${initialDept}`);
        console.log(`   Complaint ID: ${complaintId}`);

        console.log('3. Waiting for AI Analysis (5 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('4. Fetching Complaint to verify AI update...');
        // Admin token needed to see all details? Or user updates? User can see their own.
        // Actually the GET / endpoint returns complaints. We might need GET /:id which requires admin for full details?
        // Checking routes: GET /:id is admin only.
        // GET / returns list. We can find it there.

        const listRes = await axios.get(`${API_URL}/complaints`, {
            headers: { 'x-auth-token': token }
        });

        const updatedComplaint = listRes.data.find(c => c.id === complaintId);

        if (updatedComplaint) {
            console.log('   Updated Complaint Data:');
            console.log(`   - Dept: ${updatedComplaint.assigned_dept}`);
            console.log(`   - Priority: ${updatedComplaint.priority}`);
            console.log(`   - AI Tags: ${updatedComplaint.ai_tags}`);

            if (updatedComplaint.ai_tags && updatedComplaint.priority) {
                console.log('✅ SUCCESS: AI fields populated!');
            } else {
                console.log('❌ FAILURE: AI fields missing.');
            }
        } else {
            console.log('❌ FAILURE: Could not find complaint in list.');
        }

    } catch (error) {
        console.error('TEST FAILED:', error.message);
        if (error.response) console.error('Response:', error.response.data);
    }
}

runTest();
