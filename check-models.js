const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // Wait, the SDK doesn't expose listModels directly on the main class in older versions?
        // Let's rely on error message suggestion "Call ListModels to see the list"

        // Actually, newer SDKs expose it on GoogleGenerativeAI instance? No.
        // Let's try to infer from documentation or try `gemini-1.0-pro`.

        console.log('Trying gemini-1.0-pro...');
        const model2 = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
        const result = await model2.generateContent("Hello");
        console.log('Success with gemini-1.0-pro!');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

listModels();
