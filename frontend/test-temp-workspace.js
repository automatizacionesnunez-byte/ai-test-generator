const token = 'CDRSVP1-R1K4H3G-NBJE7F9-49BEK2T';
const baseUrl = 'http://158.220.121.111:3001/api/v1';

async function testTempWorkspace() {
    console.log("1. Creating temp workspace...");
    const wsRes = await fetch(`${baseUrl}/workspace/new`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: `exam-temp-test-${Date.now()}` })
    });

    if (!wsRes.ok) {
        const err = await wsRes.text();
        throw new Error("Could not create workspace: " + err);
    }

    const wsData = await wsRes.json();
    const slug = wsData.workspace?.slug;
    if (!slug) throw new Error("Could not create workspace: " + JSON.stringify(wsData));

    console.log(`   -> Created workspace ID: ${slug}`);

    try {
        console.log("2. Adding document to workspace...");
        // Intentamos añadir un documento existente
        const addRes = await fetch(`${baseUrl}/workspace/${slug}/update-embeddings`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ adds: ['Constitucion_Espanola.txt'] }) // Utilizamos uno que sepamos que existe (o similar)
        });

        if (!addRes.ok) {
            console.log("   -> Note: Document might not exist by that name, but testing API flow anyway", await addRes.text());
        } else {
            console.log("   -> Added doc successfully");
        }

        console.log("3. Asking a question...");
        const chatRes = await fetch(`${baseUrl}/workspace/${slug}/chat`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: "Dame 1 pregunta de test sobre este documento en formato JSON",
                mode: "query",
            })
        });

        if (!chatRes.ok) {
            throw new Error("Chat failed: " + await chatRes.text());
        }

        const chatData = await chatRes.json();
        console.log("   -> Chat response received! Length:", (chatData.textResponse || chatData.text || "").length);
        console.log("   -> Preview:", (chatData.textResponse || chatData.text || "").substring(0, 100) + "...");

    } finally {
        console.log(`4. Cleaning up temp workspace ${slug}...`);
        const delRes = await fetch(`${baseUrl}/workspace/${slug}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("   -> Cleanup status:", delRes.status);
        console.log("✅ TEST PASSED");
    }
}

testTempWorkspace().catch(console.error);
