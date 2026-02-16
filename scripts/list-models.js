
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Hardcoded Key (Corrected)
const API_KEY = "AIzaSyAjWVuu25cJ6pqRZGVFayaAzo6UkJuJA_A";

const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
    try {
        // This fetch approach is a workaround because listModels might not be exposed on the main class in this version
        // verify if the key works at all
        console.log("Attempting to list models via direct fetch...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();
        console.log("Models:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
