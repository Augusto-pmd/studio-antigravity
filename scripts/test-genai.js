
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Hardcoded Key (Corrected)
const API_KEY = "AIzaSyAjWVuu25cJ6pqRZGVFayaAzo6UkJuJA_A";

const genAI = new GoogleGenerativeAI(API_KEY);

async function run() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello, are you there?");
        console.log("Response:", result.response.text());
    } catch (error) {
        console.error("Error with gemini-1.5-flash:", error.message);

        // Fallback: List models to see what's available
        try {
            // Note: listModels might not be directly exposed on the instance in older SDKs or might need different call
            // But let's try a fallback model
            console.log("Trying gemini-pro...");
            const model2 = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result2 = await model2.generateContent("Hello?");
            console.log("Response with gemini-pro:", result2.response.text());
        } catch (e) {
            console.error("Error with gemini-pro:", e.message);
        }
    }
}

run();
