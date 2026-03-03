
require('dotenv').config();

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("No API KEY found in .env");
        return;
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!response.ok) {
            console.error(`Status: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();
        console.log("Available Models:");
        data.models.forEach(m => console.log(`- ${m.name} (${m.description})`));
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

listModels();
