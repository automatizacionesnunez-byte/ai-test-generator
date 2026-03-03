const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
    try {
        const GEMINI_KEY = process.env.GEMINI_API_KEY || "AIzaSyDutrt3r6wA7-gWeckinw2m3-AnnpfCP_4";
        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const numQuestions = 10;
        const difficulty = "Dificultad Media";
        const context = "Información general o temario no accesible por fallo de conexión. Genera preguntas genéricas del nivel indicado sobre cultura general o conocimientos universales.";

        const prompt = `Actua como un experto pedagogico. Basandote en este contexto: "${context}", genera exactamente ${numQuestions} preguntas de tipo test con nivel ${difficulty}. 
    Formato JSON esperado:
    {
      "examTitle": "Titulo del Examen",
      "questions": [
        {
          "id": 1,
          "question": "Pregunta...",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": 0,
          "explanation": "Explicacion detallada..."
        }
      ]
    }
    IMPORTANTE: Solo devuelve el JSON, nada de markdown ni texto extra.`;

        console.log("Generando test con Gemini...");
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim().replace(/```json|```/g, '');
        console.log("Raw output:");
        console.log(text.substring(0, 100) + "...");
        const examData = JSON.parse(text);
        console.log("JSON parsed successfully. Title:", examData.examTitle);

    } catch (e) {
        console.error("Gemini failed:", e);
    }
}

test();
