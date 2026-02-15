const { analyzeComplaint } = require('./utils/aiService');

const description = "There is a large pothole on Main Street causing traffic jams.";

console.log("Testing AI Service with description:", description);

analyzeComplaint(description).then(result => {
    console.log("AI Result:", JSON.stringify(result, null, 2));
}).catch(err => {
    console.error("AI Service Error:", err);
});
