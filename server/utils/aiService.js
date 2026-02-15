const axios = require('axios');

const OLLAMA_URL = process.env.AI_SERVICE_URL || 'http://localhost:11434/api/generate';

/**
 * Analyzes a complaint description to determine department, priority, and tags.
 * 
 * @param {string} description - The complaint text
 * @returns {Promise<Object>} - { department, priority, ai_tags, confidence }
 */
const analyzeComplaint = async (description, userRole) => {
    try {
        let systemPrompt;
        let validDepts;

        systemPrompt = `You are an AI assistant for a civic complaint system.
            Analyze the following complaint and provide:
            1. Assigned Department (Choose ONE: "KSEB", "Water Authority", "PWD", "Corporation").
            2. Priority (High, Medium, Low).
            3. Tags (Comma-separated keywords, max 3).
            4. Confidence (0.0 to 1.0).
            
            Context:
            - KSEB: Electricity, poles, wires, power failure.
- Water Authority: Water supply, pipes, leakage, drainage (sewage).
- PWD: Roads, bridges, potholes, buildings.
- Corporation: Waste, garbage, animal nuisance, health, taxes.

Output purely in JSON format like:
{
  "department": "Name",
  "priority": "Level",
  "tags": "tag1, tag2",
  "confidence": 0.95
}`;
        validDepts = ["KSEB", "Water Authority", "PWD", "Corporation"];

        const response = await axios.post(OLLAMA_URL, {
            model: "mistral",
            prompt: `${systemPrompt}\n\nComplaint: "${description}"\n\nJSON Output:`,
            stream: false,
            format: "json"
        });

        // Helper to parse potential JSON if not strictly returned as JSON object by axios (though format: 'json' helps)
        let result = {};
        if (response.data && typeof response.data.response === 'string') {
            try {
                result = JSON.parse(response.data.response);
            } catch (e) {
                console.error("Failed to parse AI response text:", response.data.response);
                return null; // Return null on failure
            }
        } else if (response.data && response.data.response) {
            result = response.data.response;
        } else {
            // Fallback if structure is different
            result = response.data || {};
        }

        // Normalize department names
        let dept = result.department;

        // Simple fuzzy matching if exact match fails
        if (!validDepts.includes(dept)) {
            if (userRole === 'industry_user' || userRole === 'company') {
                dept = 'company';
            } else {
                if (dept && (dept.toLowerCase().includes('electricity') || dept.toLowerCase().includes('kseb'))) dept = 'KSEB';
                else if (dept && (dept.toLowerCase().includes('water'))) dept = 'Water Authority';
                else if (dept && (dept.toLowerCase().includes('road') || dept.toLowerCase().includes('pwd'))) dept = 'PWD';
                else if (dept && (dept.toLowerCase().includes('corp') || dept.toLowerCase().includes('waste'))) dept = 'Corporation';
                else dept = 'Corporation'; // Default fallback
            }
        }

        return {
            department: dept,
            priority: result.priority || 'Medium',
            ai_tags: result.tags || '',
            confidence: result.confidence || 0.5
        };

    } catch (error) {
        console.error("AI Analysis Failed:", error.message);
        return null;
    }
};

module.exports = { analyzeComplaint };
