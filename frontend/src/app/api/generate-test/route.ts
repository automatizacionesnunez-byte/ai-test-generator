import { NextResponse } from 'next/server';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

// Config
const ALLM_URL = process.env.NEXT_PUBLIC_ANYTHINGLLM_URL;
const ALLM_KEY = process.env.NEXT_PUBLIC_ANYTHINGLLM_KEY;
const ALLM_WORKSPACE = process.env.NEXT_PUBLIC_ANYTHINGLLM_WORKSPACE;

// Helper: call AnythingLLM once for a batch of questions
async function generateChunk(
    chunkSize: number,
    difficulty: string,
    targetFile: string | null,
    chunkIndex: number,
    totalChunks: number
): Promise<{ examTitle?: string; questions: any[] }> {

    const topicHint = totalChunks > 1
        ? `Este es el bloque ${chunkIndex + 1} de ${totalChunks}. Genera preguntas sobre DIFERENTES aspectos del temario que no se repitan con otros bloques. Enfócate en la parte ${chunkIndex + 1}/${totalChunks} del contenido.`
        : '';

    const fileHint = targetFile && targetFile !== 'all'
        ? `Basándote ESTRICTAMENTE y ÚNICAMENTE en la información proveniente del documento llamado "${targetFile}",`
        : `Basándote en el contenido de tus documentos,`;

    const wantTitle = chunkIndex === 0;

    const prompt = `Devuelve ESTRICTAMENTE y ÚNICAMENTE un objeto JSON válido. NO incluyas explicaciones fuera del JSON, NO incluyas bloques de código markdown, solo el objeto JSON puro. ${fileHint} genera exactamente ${chunkSize} preguntas de tipo test nivel ${difficulty}. ${topicHint}
ATENCIÓN: Si por algún motivo no encuentras el documento proporcionado o no tienes suficiente información, debes devolver obligatoriamente un JSON válido con la lista "questions" vacía. NO pidas disculpas ni des explicaciones en texto normal. Ejemplo: { "examTitle": "Sin información", "questions": [] }

{
  ${wantTitle ? '"examTitle": "Título del Examen",\n  ' : ''}"questions": [
    {
      "question": "Texto de la pregunta",
      "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "correctAnswer": 0,
      "explanation": "Explicación detallada..."
    }
  ]
}`;

    const response = await fetch(`${ALLM_URL}/workspace/${ALLM_WORKSPACE}/chat`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ALLM_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: prompt, mode: 'chat' }),
    });

    if (!response.ok) {
        const errTxt = await response.text();
        console.error(`AnythingLLM HTTP error: ${response.status}`, errTxt);
        throw new Error(`HTTP ${response.status}: ${errTxt}`);
    }

    const data = await response.json();
    const textResponse = data.textResponse || data.text || "";
    if (!textResponse) throw new Error("La IA no devolvió respuesta de texto.");

    // Parse JSON from response
    let rawOutput = textResponse.trim();

    // Clean potential markdown or prefix/suffix text
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        rawOutput = jsonMatch[0];
    }

    // Limpia caracteres de control invisibles que la IA pueda meter por error
    rawOutput = rawOutput.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

    try {
        const parsed = JSON.parse(rawOutput);
        return {
            examTitle: parsed.examTitle,
            questions: Array.isArray(parsed.questions) ? parsed.questions : [],
        };
    } catch (e) {
        console.error("Failed to parse AI response as JSON:", textResponse);
        if (textResponse.toLowerCase().includes("lo siento") || textResponse.toLowerCase().includes("no puedo") || textResponse.toLowerCase().includes("no encuentro")) {
            throw new Error("La IA no encontró suficiente información en el documento para generar las preguntas. Puedes probar con todo el temario (Aleatorio).");
        }
        throw new Error("La IA de AnythingLLM devolvió un formato inválido que no se pudo leer. Intenta de nuevo.");
    }
}

export async function POST(req: Request) {
    try {
        const { numQuestions, difficulty, targetFile } = await req.json();

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Split into parallel chunks of 5 questions max
                    const CHUNK_SIZE = 5;
                    const numChunks = Math.ceil(numQuestions / CHUNK_SIZE);
                    const chunks: number[] = [];
                    let remaining = numQuestions;
                    for (let i = 0; i < numChunks; i++) {
                        const size = Math.min(CHUNK_SIZE, remaining);
                        chunks.push(size);
                        remaining -= size;
                    }

                    console.log(`Generating ${numQuestions} questions in ${numChunks} parallel chunks: [${chunks.join(', ')}]`);

                    let examTitle = "Test Generado";
                    let currentId = 1;

                    let anySuccess = false;

                    // Process chunks sequentially instead of parallel to avoid overloading VPS
                    for (let i = 0; i < chunks.length; i++) {
                        const chunkSize = chunks[i];
                        try {
                            console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunkSize} questions)...`);
                            const result = await generateChunk(chunkSize, difficulty, targetFile, i, numChunks);

                            if (result.examTitle && i === 0) {
                                examTitle = result.examTitle;
                            }

                            const processedQuestions = result.questions.map((q: any) => ({
                                ...q,
                                id: currentId++,
                            }));

                            const chunkData = {
                                examTitle,
                                questions: processedQuestions,
                            };

                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunkData)}\n\n`));
                            anySuccess = true;
                        } catch (error: any) {
                            console.error(`Chunk ${i} failed:`, error?.message);
                            if (i === 0) throw error;
                        }
                    }

                    if (!anySuccess) {
                        controller.enqueue(encoder.encode(`data: {"error": "All chunks failed"}\n\n`));
                    }

                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                    controller.close();
                } catch (err: any) {
                    console.error('Generation failed:', err);
                    controller.enqueue(encoder.encode(`data: {"error": "${err.message}"}\n\n`));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error: any) {
        console.error('Generation flow error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
