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
        ? `IMPORTANTE: Basándote EXCLUSIVAMENTE en el archivo o temática "${targetFileName}". No uses información externa. Si no encuentras información suficiente, usa tus conocimientos sobre este tema específico.`
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
- 'explanation' debe ser detallada y citar la normativa mencionada en el texto.

FORMATO JSON:
{
  ${chunkIndex === 0 ? '"examTitle": "Test sobre ' + (targetFileName || 'Temario') + '",' : ''}
  "questions": [
    {
      "question": "Texto de la pregunta...",
      "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "correctAnswer": 0,
      "explanation": "Explicación detallada..."
    }
  ]
}`;

    // Intentaremos con AnythingLLM primero (RAG)
    if (ALLM_URL && ALLM_KEY) {
        try {
            const isSpecificFile = !!tempWorkspaceSlug;
            const mode = isSpecificFile ? 'query' : 'chat';
            const workspaceToUse = tempWorkspaceSlug || ALLM_WORKSPACE;

            const response = await fetch(`${ALLM_URL}/workspace/${workspaceToUse}/chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ALLM_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: prompt,
                    mode: mode,
                }),
                signal: AbortSignal.timeout(90000), // 90s timeout
            });

            if (response.ok) {
                const data = await response.json();
                const text = data.textResponse || data.text;
                if (text) {
                    const parsed = extractJSON(text);
                    if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                        return {
                            examTitle: parsed.examTitle,
                            questions: parsed.questions
                        };
                    }
                }
            }
        } catch (e: any) {
            console.error(`[Generate API] AnythingLLM failed:`, e.message);
        }
    }

    // Fallback: Gemini Flash (Muy rápido y fiable)
    if (GEMINI_KEY) {
        try {
            console.log(`[Generate API] Using Gemini fallback for chunk ${chunkIndex + 1}`);
            const genAI = new GoogleGenerativeAI(GEMINI_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const result = await model.generateContent(prompt);
            const textResponse = result.response.text();
            const parsed = extractJSON(textResponse);

            if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                return {
                    examTitle: parsed.examTitle,
                    questions: parsed.questions
                };
            }
        } catch (e: any) {
            console.error(`[Generate API] Gemini fallback failed:`, e.message);
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

                    let examTitle = "Test de Oposiciones";
                    let anyQuestions = false;

                    // Process chunks in PARALLEL for maximum speed
                    const chunkPromises = chunkCounts.map(async (chunkSize, i) => {
                        try {
                            const result = await generateChunk(chunkSize, difficulty, targetFileName || targetFile, i, numChunks, ALLM_WORKSPACE || null);

                            if (result.examTitle && i === 0) {
                                examTitle = result.examTitle;
                            }

                            if (result.questions && result.questions.length > 0) {
                                anyQuestions = true;
                                // Calculate IDs based on chunk index to maintain a clean sequence even if they arrive out of order
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
                    });

                    await Promise.all(chunkPromises);

                    if (!anyQuestions) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "No se pudieron generar preguntas. Intenta con otro documento o reduce el número." })}\n\n`));
                    }

                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                    controller.close();
                } catch (err: any) {
                    console.error('[Generate API] Stream failure:', err);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
                    controller.close();
                } finally {
                    if (tempWorkspaceSlug && ALLM_URL && ALLM_KEY) {
                        console.log(`[Generate API] Cleaning up temp workspace ${tempWorkspaceSlug}`);
                        await fetch(`${ALLM_URL}/workspace/${tempWorkspaceSlug}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${ALLM_KEY}` }
                        }).catch(e => console.error('[Generate API] Temp workspace cleanup failed', e));
                    }
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
