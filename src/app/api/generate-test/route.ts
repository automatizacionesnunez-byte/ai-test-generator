import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

// Config
const ALLM_URL = process.env.NEXT_PUBLIC_ANYTHINGLLM_URL;
const ALLM_KEY = process.env.NEXT_PUBLIC_ANYTHINGLLM_KEY;
const ALLM_WORKSPACE = process.env.NEXT_PUBLIC_ANYTHINGLLM_WORKSPACE;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

/**
 * Helper to extract JSON from a text that might contain markdown blocks
 */
function extractJSON(text: string) {
    console.log("[Generate API] Extracting JSON from text...");
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    try {
        // Clean invisible control characters
        const cleaned = jsonMatch[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("[Generate API] JSON Parse Error:", e);
        return null;
    }
}

async function generateChunk(
    chunkSize: number,
    difficulty: string,
    targetFile: string | null,
    chunkIndex: number,
    totalChunks: number
): Promise<{ examTitle?: string; questions: any[] }> {

    console.log(`[Generate API] Starting chunk ${chunkIndex + 1}/${totalChunks} (size: ${chunkSize})`);

    const fileContext = targetFile && targetFile !== 'all'
        ? `Basándote EXCLUSIVAMENTE en el archivo "${targetFile}". No uses información externa.`
        : `Basándote en todo el temario disponible en tus documentos.`;

    const prompt = `Actúa como un experto preparador de oposiciones. Genera un examen tipo test en ESPAÑOL.
${fileContext}
${totalChunks > 1 ? `Contenido: Este es el bloque ${chunkIndex + 1} de ${totalChunks} del examen. No repitas preguntas de bloques anteriores.` : ''}
Dificultad: ${difficulty}.
Cantidad: ${chunkSize} preguntas.

REGLAS OBLIGATORIAS:
- Responde ÚNICAMENTE con un objeto JSON válido.
- No añadas explicaciones fuera del JSON.
- Cada pregunta debe tener exactamente 4 opciones.
- 'correctAnswer' debe ser el índice (0, 1, 2 o 3).
- 'explanation' debe ser detallada y citar la normativa si es posible.

FORMATO JSON:
{
  ${chunkIndex === 0 ? '"examTitle": "Título Descriptivo del Examen",' : ''}
  "questions": [
    {
      "question": "Texto de la pregunta...",
      "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "correctAnswer": 0,
      "explanation": "Explicación detallada..."
    }
  ]
}`;

    // Intento 1: AnythingLLM
    if (ALLM_URL && ALLM_KEY && ALLM_WORKSPACE) {
        try {
            const isSpecificFile = targetFile && targetFile !== 'all';
            const mode = isSpecificFile ? 'query' : 'chat';

            console.log(`[Generate API] Calling AnythingLLM (mode: ${mode}) for chunk ${chunkIndex + 1}...`);

            // Adjust prompt for query mode
            const refinedPrompt = isSpecificFile
                ? `[BÚSQUEDA EXHAUSTIVA: ${targetFile}] ${prompt}`
                : prompt;

            const response = await fetch(`${ALLM_URL}/workspace/${ALLM_WORKSPACE}/chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ALLM_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: refinedPrompt,
                    mode: mode,
                }),
                signal: AbortSignal.timeout(60000), // 60s timeout per chunk
            });

            if (response.ok) {
                const data = await response.json();
                const text = data.textResponse || data.text;
                if (text) {
                    const parsed = extractJSON(text);
                    if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                        console.log(`[Generate API] AnythingLLM success for chunk ${chunkIndex + 1}. Got ${parsed.questions.length} questions.`);
                        return {
                            examTitle: parsed.examTitle,
                            questions: parsed.questions
                        };
                    } else {
                        console.warn(`[Generate API] AnythingLLM returned invalid JSON or 0 questions for chunk ${chunkIndex + 1}. Raw text: ${text.substring(0, 100)}...`);
                    }
                } else {
                    console.warn(`[Generate API] AnythingLLM returned empty response for chunk ${chunkIndex + 1}. Data:`, data);
                }
            } else {
                const errText = await response.text();
                console.warn(`[Generate API] AnythingLLM HTTP Error: ${response.status} - ${errText}`);
            }
        } catch (e: any) {
            console.error(`[Generate API] AnythingLLM failed for chunk ${chunkIndex + 1}:`, e.message);
        }
    }

    // Fallback: Gemini (Si AnythingLLM falla o no da resultados)
    if (GEMINI_KEY) {
        try {
            console.log(`[Generate API] Attempting Gemini fallback for chunk ${chunkIndex + 1}...`);
            const genAI = new GoogleGenerativeAI(GEMINI_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const geminiPrompt = `${prompt}\n\nNOTA: Si no puedes acceder al documento "${targetFile || 'general'}" debido a un error de conexión, genera preguntas realistas sobre temas típicos de oposiciones que encajen con ese título. DEVUELVE SOLO EL JSON.`;

            const result = await model.generateContent(geminiPrompt);
            const textResponse = result.response.text();
            const parsed = extractJSON(textResponse);

            if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                console.log(`[Generate API] Gemini fallback success for chunk ${chunkIndex + 1}.`);
                return {
                    examTitle: parsed.examTitle || (chunkIndex === 0 ? "Test (Generado por IA)" : undefined),
                    questions: parsed.questions
                };
            }
        } catch (e: any) {
            console.error(`[Generate API] Gemini fallback also failed for chunk ${chunkIndex + 1}:`, e.message);
        }
    }

    return { questions: [] };
}

export async function POST(req: Request) {
    try {
        const { numQuestions, difficulty, targetFile } = await req.json();
        console.log(`[Generate API] Request: ${numQuestions} q, diff: ${difficulty}, file: ${targetFile}`);

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Send an immediate heart-beat/init event to keep Vercel connection alive
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "Iniciando generación..." })}\n\n`));

                    // Chunk the work - Up to 10 questions per chunk for better performance
                    const CHUNK_SIZE = 10;
                    const numChunks = Math.ceil(numQuestions / CHUNK_SIZE);
                    const chunkCounts: number[] = [];
                    let remaining = numQuestions;
                    for (let i = 0; i < numChunks; i++) {
                        const size = Math.min(CHUNK_SIZE, remaining);
                        chunkCounts.push(size);
                        remaining -= size;
                    }

                    let currentId = 1;
                    let examTitle = "Test de Oposiciones";
                    let anyQuestions = false;

                    // Process chunks SEQUENTIALLY to stay within timeouts and limits
                    for (let i = 0; i < chunkCounts.length; i++) {
                        const chunkSize = chunkCounts[i];
                        const result = await generateChunk(chunkSize, difficulty, targetFile, i, numChunks);

                        if (result.examTitle && i === 0) {
                            examTitle = result.examTitle;
                        }

                        if (result.questions && result.questions.length > 0) {
                            anyQuestions = true;
                            const processed = result.questions.map(q => ({
                                ...q,
                                id: currentId++,
                            }));

                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                examTitle,
                                questions: processed,
                            })}\n\n`));
                        }
                    }

                    if (!anyQuestions) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "No se pudieron generar preguntas. Intenta con otro documento o reduce el número." })}\n\n`));
                    }

                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                    controller.close();
                } catch (err: any) {
                    console.error('[Generate API] Stream failure:', err);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
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
        console.error('[Generate API] POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
