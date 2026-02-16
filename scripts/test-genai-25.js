
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Hardcoded Key (Corrected)
const API_KEY = "AIzaSyAjWVuu25cJ6pqRZGVFayaAzo6UkJuJA_A";

const genAI = new GoogleGenerativeAI(API_KEY);

async function run() {
    try {
        console.log("Testing gemini-2.5-flash...");
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent("Hello, are you there?");
        console.log("Response:", result.response.text());
    } catch (error) {
        console.error("Error with gemini-2.5-flash:", error.message);
    }
}

run();
