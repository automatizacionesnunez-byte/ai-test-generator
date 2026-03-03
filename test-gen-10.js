"use strict";

async function generateTest() {
    console.log("Solicitando test de 10 preguntas a la API local...");
    try {
        const response = await fetch("http://localhost:3000/api/generate-test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ numQuestions: 10, difficulty: "Media" })
        });

        console.log("Status Code:", response.status);

        const data = await response.json();
        if (data.error) {
            console.error("Error en la respuesta:", data.error);
        } else {
            console.log("===============================");
            console.log("Título:", data.examTitle);
            console.log("Total preguntas:", data.questions?.length || 0);
            console.log("===============================");
            const firstQ = data.questions?.[0];
            if (firstQ) {
                console.log("Muestra de pregunta 1:");
                console.log(`P: ${firstQ.question}`);
                console.log(`Opciones:\n - ${firstQ.options?.join('\\n - ')}`);
                console.log(`Respuesta Correcta Index: ${firstQ.correctAnswer}`);
                console.log(`Explicación: ${firstQ.explanation}`);
            }
        }
    } catch (e) {
        console.error("Excepción:", e.message);
    }
}

generateTest();
