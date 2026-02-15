const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

const runDebug = async () => {
    try {
        console.log('--- DEBUG COMPANY UPDATE ---');

        // 1. Login as Company
        console.log('Logging in as company@gmail.com...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'company@gmail.com',
            password: '123456'
        });
        const token = loginRes.data.token;
        const user = loginRes.data.user;
        console.log('Login successful.');
        console.log('User Role:', user.role);

        // 2. Fetch Complaints
        console.log('Fetching complaints...');
        const complaintsRes = await axios.get(`${API_URL}/complaints`, {
            headers: { 'x-auth-token': token }
        });
        const complaints = complaintsRes.data;
        console.log(`Found ${complaints.length} complaints.`);

        if (complaints.length === 0) {
            console.log('No complaints to test update on. Please create one first.');
            return;
        }

        // 3. Try Update on First Complaint
        const target = complaints[0];
        console.log(`\nAttempting to update Complaint #${target.id}`);
        console.log(`Complaint Assigned Dept: '${target.assigned_dept}'`);
        console.log(`User Role: '${user.role}'`);
        console.log(`Match? ${target.assigned_dept === user.role}`);

        try {
            const updateRes = await axios.put(`${API_URL}/complaints/${target.id}/status`, {
                status: 'in_progress'
            }, {
                headers: { 'x-auth-token': token }
            });
            console.log('✅ Update SUCCESS:', updateRes.data.status);
        } catch (err) {
            console.error('❌ Update FAILED');
            console.error('Status:', err.response?.status);
            console.error('Data:', err.response?.data);
        }

    } catch (err) {
        console.error('Debug script error:', err.message);
        if (err.response) console.error('Response:', err.response.data);
    }
};

runDebug();
