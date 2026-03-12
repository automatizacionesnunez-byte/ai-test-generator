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
    targetFileName: string | null,
    chunkIndex: number,
    totalChunks: number,
    tempWorkspaceSlug: string | null = null
): Promise<{ examTitle?: string; questions: any[]; error?: string }> {

    console.log(`[Generate API] Starting chunk ${chunkIndex + 1}/${totalChunks} (size: ${chunkSize})`);

    const isAllFiles = !targetFileName || targetFileName === 'all';
    const fileContext = isAllFiles
        ? `Basándote en todo el temario disponible en el workspace.`
        : `Basándote EXCLUSIVAMENTE en el contenido del archivo "${targetFileName}".`;

    // Stage 1: Retrieval with AnythingLLM
    let retrievedContent = "";
    if (ALLM_URL && ALLM_KEY) {
        try {
            const workspaceToUse = tempWorkspaceSlug || ALLM_WORKSPACE;
            // Simplified prompt for faster retrieval
            const retrievalPrompt = `Analiza el temario y extrae información detallada para generar ${chunkSize} preguntas de test sobre: ${isAllFiles ? 'temas variados' : targetFileName}.
${fileContext}
Escribe los enunciados, las opciones correctas y una breve explicación técnica para cada una. No te preocupes por el formato JSON todavía.`;

            console.log(`[Generate API] Retrieving content from AnythingLLM...`);
            const response = await fetch(`${ALLM_URL}/workspace/${workspaceToUse}/chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ALLM_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: retrievalPrompt,
                    mode: 'query',
                }),
                signal: AbortSignal.timeout(90000),
            });

            if (response.ok) {
                const data = await response.json();
                retrievedContent = data.textResponse || data.text || "";
                console.log(`[Generate API] Retrieval successful (${retrievedContent.length} chars).`);
            } else {
                console.error(`[Generate API] AnythingLLM Error: ${response.status}`);
            }
        } catch (e: any) {
            console.error(`[Generate API] Stage 1 failed:`, e.message);
        }
    }

    // Stage 2: JSON Synthesis with Gemini
    if (GEMINI_KEY) {
        try {
            const genAI = new GoogleGenerativeAI(GEMINI_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

            const formattingPrompt = retrievedContent
                ? `Actúa como un experto preparador de oposiciones. Transforma el siguiente contenido en un examen tipo test en formato JSON.

CONTENIDO:
${retrievedContent}

REGLAS DE FORMATO:
- Genera exactamente ${chunkSize} preguntas.
- Cada pregunta debe tener 4 opciones en un array.
- 'correctAnswer' debe ser un número entre 0 y 3.
- 'explanation' debe ser detallada y clara.
- Responde ÚNICAMENTE con el objeto JSON.

ESQUEMA JSON:
{
  ${chunkIndex === 0 ? '"examTitle": "Test ' + (isAllFiles ? 'General' : targetFileName) + '",' : ''}
  "questions": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "..."
    }
  ]
}`
                : `Genera de forma autónoma ${chunkSize} preguntas de oposición sobre ${isAllFiles ? 'Derecho y Temario General' : targetFileName} con dificultad ${difficulty}.
Responde ÚNICAMENTE con el formato JSON:
{
  ${chunkIndex === 0 ? '"examTitle": "Test ' + (isAllFiles ? 'General' : targetFileName) + '",' : ''}
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": 0,
      "explanation": "..."
    }
  ]
}`;

            console.log(`[Generate API] Synthesizing JSON with Gemini...`);
            const result = await model.generateContent(formattingPrompt);
            const textResponse = result.response.text();
            const parsed = extractJSON(textResponse);

            if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                console.log(`[Generate API] Chunk ${chunkIndex + 1} finalized with ${parsed.questions.length} questions.`);
                return {
                    examTitle: parsed.examTitle,
                    questions: parsed.questions
                };
            } else {
                console.error(`[Generate API] Gemini failed to produce valid JSON for chunk ${chunkIndex + 1}`);
            }
        } catch (e: any) {
            console.error(`[Generate API] Stage 2 failed:`, e.message);
            return { questions: [], error: e.message };
        }
    }

    return { questions: [], error: "Error en la síntesis de la IA." };
}

export async function POST(req: Request) {
    try {
        const { numQuestions, difficulty, targetFile, targetFileName } = await req.json();
        console.log(`[Generate API] Request: ${numQuestions} q, diff: ${difficulty}, file: ${targetFile}, name: ${targetFileName}`);

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Send an immediate heart-beat/init event to keep Vercel connection alive
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "Iniciando generación..." })}\n\n`));

                    // Chunk the work - Up to 5 questions per chunk for better stability and faster initial response
                    const CHUNK_SIZE = 5;
                    const numChunks = Math.ceil(numQuestions / CHUNK_SIZE);
                    const chunkCounts: number[] = [];
                    let remaining = numQuestions;
                    for (let i = 0; i < numChunks; i++) {
                        const size = Math.min(CHUNK_SIZE, remaining);
                        chunkCounts.push(size);
                        remaining -= size;
                    }

                    let examTitle = "Test de Oposiciones";
                    let anyQuestions = false;

                    // Process chunks SEQUENTIALLY for better stability on the VPS instance
                    for (let i = 0; i < numChunks; i++) {
                        try {
                            const chunkSize = chunkCounts[i];
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: `Generando bloque ${i + 1} de ${numChunks}...` })}\n\n`));

                            const result = await generateChunk(chunkSize, difficulty, targetFileName || targetFile, i, numChunks, ALLM_WORKSPACE || null);

                            if (result.examTitle && i === 0) {
                                examTitle = result.examTitle;
                            }

                            if (result.questions && result.questions.length > 0) {
                                anyQuestions = true;
                                const baseId = i * CHUNK_SIZE + 1;
                                const processed = result.questions.map((q, idx) => ({
                                    ...q,
                                    id: baseId + idx,
                                }));

                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                    examTitle,
                                    questions: processed,
                                })}\n\n`));
                            } else if (result.error) {
                                console.error(`[Generate API] Chunk ${i} returned error:`, result.error);
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `Error en bloque ${i + 1}: ${result.error}` })}\n\n`));
                            }
                        } catch (err: any) {
                            console.error(`[Generate API] Chunk ${i} failed:`, err);
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `Error crítico en bloque ${i + 1}: ${err.message}` })}\n\n`));
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
