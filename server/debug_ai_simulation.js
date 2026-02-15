
const { analyzeComplaint } = require('./utils/aiService');
const { addBlock } = require('./routes/blockchain');
const db = require('./db');

async function simulateFlow() {
    try {
        console.log("Starting simulation...");
        const description = "There is a huge pile of garbage near the market causing smell.";
        const type = "Others";

        console.log(`[SIM] Complaint Type: ${type}`);

        // mimic the logic in complaints.js
        const safeType = type ? type.toString().toLowerCase().trim() : '';
        const isOthers = ['others', 'other'].includes(safeType);
        console.log(`[SIM] isOthers: ${isOthers}`);

        // Call AI
        // We might not be able to reach Ollama from this script environment if it depends on external service availability
        // But let's try.
        try {
            const aiResult = await analyzeComplaint(description, 'citizen');
            console.log("[SIM] AI Result:", aiResult);

            if (aiResult) {
                const { department, priority, ai_tags } = aiResult;
                if (isOthers) {
                    console.log("[SIM] Attempting addBlock...");
                    await addBlock({
                        action: 'COMPLAINT_VERIFIED_AI',
                        complaint_id: 99999,
                        user_id: 1,
                        type: type,
                        description: description,
                        department: department,
                        ai_tags: ai_tags,
                        location: { lat: 8.5, lng: 76.9 },
                        timestamp: new Date()
                    });
                    console.log("[SIM] addBlock returned.");
                }
            } else {
                console.log("[SIM] AI returned null.");
            }
        } catch (e) {
            console.error("[SIM] AI Error:", e);
        }

    } catch (err) {
        console.error("Simulation Error:", err);
    } finally {
        setTimeout(() => process.exit(0), 2000);
    }
}

simulateFlow();
