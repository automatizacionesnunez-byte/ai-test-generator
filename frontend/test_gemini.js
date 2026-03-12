
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
    const key = 'AIzaSyARyV3I_zJTrvRfIM3PWcSyyz8JbMCtOXo';
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    try {
        console.log("Testing new Gemini API Key...");
        const result = await model.generateContent("Hola, responde con 'OK' si recibes esto.");
        console.log("Response:", result.response.text());
    } catch (e) {
        console.error("Gemini Test Failed:", e.message);
    }
}

testGemini();
