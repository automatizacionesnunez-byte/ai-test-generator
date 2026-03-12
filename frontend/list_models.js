
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    const key = 'AIzaSyARyV3I_zJTrvRfIM3PWcSyyz8JbMCtOXo';
    const genAI = new GoogleGenerativeAI(key);

    try {
        console.log("Listing available models...");
        // The SDK doesn't have a direct listModels, but we can try a fetch
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Failed to list models:", e.message);
    }
}

listModels();
