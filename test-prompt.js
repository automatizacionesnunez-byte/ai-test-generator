"use strict";
const prompt = `Devuelve ESTRICTAMENTE y ÚNICAMENTE un objeto JSON válido. No incluyas absolutamente nada de texto antes ni después del JSON. No uses bloques markdown separadores. Basándote en el contenido de tus documentos, genera exactamente 2 preguntas de tipo test nivel Media. 
{
  "examTitle": "Título basado en los documentos",
  "questions": [
    {
      "id": 1,
      "question": "Pregunta...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Explicación"
    }
  ]
}`;

async function test() {
    const fetch = globalThis.fetch;
    const res = await fetch('http://158.220.121.111:3001/api/v1/workspace/test-joaqui/chat', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer CDRSVP1-R1K4H3G-NBJE7F9-49BEK2T',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: prompt, mode: 'chat' })
    });

    const json = await res.json();
    console.log("TEXT START");
    console.log(json.text);
    console.log("TEXT END");
    console.log("ERROR:", json.error);
}
test();
