
const ALLM_URL = "http://158.220.121.111:3001/api/v1";
const ALLM_KEY = "CDRSVP1-R1K4H3G-NBJE7F9-49BEK2T";
const ALLM_WORKSPACE = "test-joaqui";

async function testAnythingLLM() {
    try {
        console.log("Testing AnythingLLM retrieval...");
        const response = await fetch(`${ALLM_URL}/workspace/${ALLM_WORKSPACE}/chat`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ALLM_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: "Extrae información para 1 pregunta sobre temas variados del temario.",
                mode: 'query',
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Response Status: OK");
            console.log("Text Response:", data.textResponse || data.text);
        } else {
            console.error("Response Status:", response.status);
            const text = await response.text();
            console.error("Error Body:", text);
        }
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}

testAnythingLLM();
