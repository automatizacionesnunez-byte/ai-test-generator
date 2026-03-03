"use strict";

async function generateTest() {
    console.log("Solicitando test de 10 preguntas a la API...");
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
            console.log("Test Generado (Título):", data.examTitle);
            console.log("Cantidad de preguntas:", data.questions?.length || 0);
            console.log("===============================");
            console.log("Primeras 2 preguntas como muestra:");
            console.log(JSON.stringify(data.questions?.slice(0, 2), null, 2));
        }
    } catch (e) {
        console.error("Fallo de red o del parseo JSON:", e.message);
    }
}

generateTest();
