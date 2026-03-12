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

    const fileContext = targetFileName && targetFileName !== 'all'
        ? `Basándote EXCLUSIVAMENTE en el contenido del archivo "${targetFileName}".`
        : `Basándote en el temario disponible en el workspace.`;

    // Stage 1: Get raw knowledge from AnythingLLM
    let rawText = "";
    if (ALLM_URL && ALLM_KEY) {
        try {
            const workspaceToUse = tempWorkspaceSlug || ALLM_WORKSPACE;
            const retrievalPrompt = `Actúa como un experto en oposiciones. 
${fileContext}
Genera ${chunkSize} preguntas de examen tipo test con dificultad ${difficulty}.
Cada pregunta debe tener:
- Enunciado claro.
- 4 opciones (A, B, C, D).
- Indica cuál es la correcta.
- Una explicación detallada citando la normativa.

${totalChunks > 1 ? `Este es el bloque ${chunkIndex + 1} de ${totalChunks}. Varía los temas.` : ''}`;

            console.log(`[Generate API] Requesting content from AnythingLLM (Workspace: ${workspaceToUse})...`);
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
                rawText = data.textResponse || data.text || "";
                console.log(`[Generate API] AnythingLLM returned ${rawText.length} chars of content.`);
            }
        } catch (e: any) {
            console.error(`[Generate API] AnythingLLM stage failed:`, e.message);
        }
    }

    // Stage 2: Format with Gemini (or fallback if AnythingLLM failed)
    if (GEMINI_KEY) {
        try {
            const genAI = new GoogleGenerativeAI(GEMINI_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const formattingPrompt = rawText
                ? `Convierte el siguiente texto de un examen en un objeto JSON VÁLIDO. 
No resumas, mantén toda la información técnica y las explicaciones.

REGLAS:
- 'correctAnswer' debe ser el índice de la opción correcta (0 para A, 1 para B, 2 para C, 3 para D).
- 'explanation' debe ser detallada.
- Responde ÚNICAMENTE con el objeto JSON.

TEXTO A FORMATEAR:
${rawText}

FORMATO REQUERIDO:
{
  ${chunkIndex === 0 ? '"examTitle": "Test: ' + (targetFileName || 'Temario') + '",' : ''}
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": 0,
      "explanation": "..."
    }
  ]
}`
                : `Actúa como un preparador de oposiciones. No tengo información previa, así que genera tú mismo ${chunkSize} preguntas sobre ${targetFileName || 'temario general'}.
Dificultad: ${difficulty}.
Responde ÚNICAMENTE con el siguiente formato JSON:
{
  ${chunkIndex === 0 ? '"examTitle": "Test: ' + (targetFileName || 'Temario') + '",' : ''}
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": 0,
      "explanation": "..."
    }
  ]
}`;

            console.log(`[Generate API] Stage 2: Formatting with Gemini Flash...`);
            const result = await model.generateContent(formattingPrompt);
            const textResponse = result.response.text();
            const parsed = extractJSON(textResponse);

            if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                return {
                    examTitle: parsed.examTitle,
                    questions: parsed.questions
                };
            }
        } catch (e: any) {
            console.error(`[Generate API] Gemini stage failed:`, e.message);
            return { questions: [], error: e.message };
        }
    }

    return { questions: [], error: "No se pudieron obtener resultados de la IA." };
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
                            }
                        } catch (err) {
                            console.error(`[Generate API] Chunk ${i} failed:`, err);
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
