
const ALLM_URL = 'http://158.220.121.111:3001/api/v1';
const ALLM_KEY = 'CDRSVP1-R1K4H3G-NBJE7F9-49BEK2T';
const ALLM_WORKSPACE = 'test-joaqui';

async function testAnythingLLM() {
    try {
        console.log("Testing AnythingLLM connection...");
        const response = await fetch(`${ALLM_URL}/workspace/${ALLM_WORKSPACE}/chat`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ALLM_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: "Genera 1 pregunta de prueba sobre el temario.",
                mode: 'query',
            }),
        });

        if (!response.ok) {
            console.error("API error:", response.status, await response.text());
            return;
        }

        const data = await response.json();
        console.log("Keys:", Object.keys(data));
        console.log("TextResponse:", data.textResponse);
        console.log("Text:", data.text);
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}

testAnythingLLM();
