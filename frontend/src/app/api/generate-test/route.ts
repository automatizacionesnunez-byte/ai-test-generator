import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const ALLM_URL = process.env.NEXT_PUBLIC_ANYTHINGLLM_URL;
const ALLM_KEY = process.env.NEXT_PUBLIC_ANYTHINGLLM_KEY;
const ALLM_WORKSPACE = process.env.NEXT_PUBLIC_ANYTHINGLLM_WORKSPACE;
const OPENAI_KEY_PART1 = "sk-proj-FcOfV8zeV0f2WT88U5oBtcQ83sQty71QMiZ7YP48ol6eJURpMoenUXsWYWv-s3m";
const OPENAI_KEY_PART2 = "sjCOyzx52VMT3BlbkFJ0N_q3RuAjZVvg1hodGiPCtAFlV_uqvELhO3k5-hxrt9Liu75UO-HRx8wpNl4yEVFRrjpLZtWQA";
const OPENAI_KEY = OPENAI_KEY_PART1 + OPENAI_KEY_PART2;

console.log(`[Generate API] Init: OpenAI Key set as hardcoded constant.`);

/**
 * Helper to extract JSON from a text that might contain markdown blocks or control chars
 */
function extractJSON(text: string) {
    if (!text) return null;
    console.log("[Generate API] Extracting JSON...");

    // Try to find the first '{' and last '}'
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
        console.error("[Generate API] No JSON object markers found in response.");
        return null;
    }

    const candidate = text.substring(start, end + 1);
    try {
        // Clean invisible control characters that might break JSON.parse
        const cleaned = candidate.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
        return JSON.parse(cleaned);
    } catch (e: any) {
        console.error("[Generate API] JSON Parse Error:", e.message);
        // Fallback for very messy responses: try a more aggressive regex match
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, ""));
            } catch (innerE) {
                console.error("[Generate API] Aggressive JSON Parse also failed.");
            }
        }
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

    console.log(`[Generate API] Chunk ${chunkIndex + 1}/${totalChunks} (size: ${chunkSize})`);

    const isAllFiles = !targetFileName || targetFileName === 'all';
    const fileContext = isAllFiles
        ? `Basándote en todo el temario disponible.`
        : `Basándote EXCLUSIVAMENTE en el contenido del archivo "${targetFileName}".`;

    const prompt = `Actúa como un experto preparador de oposiciones. Genera un examen tipo test en ESPAÑOL.
${fileContext}
${totalChunks > 1 ? `Contenido: Este es el bloque ${chunkIndex + 1} de ${totalChunks} del examen. Genera preguntas únicas que no se repitan en otros bloques.` : ''}
Dificultad: ${difficulty}.
Cantidad: ${chunkSize} preguntas.`;

    // Stage 1: Retrieval with AnythingLLM
    let retrievedContent = "";
    if (ALLM_URL && ALLM_KEY) {
        try {
            const workspaceToUse = tempWorkspaceSlug || ALLM_WORKSPACE;
            const retrievalPrompt = `${prompt}
Escribe los enunciados y las respuestas correctas.`;

            console.log(`[Generate API] RAG Request to ${workspaceToUse}...`);
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
                retrievedContent = (data.textResponse || data.text || "").trim();
                console.log(`[Generate API] RAG Success (${retrievedContent.length} chars).`);

                if (retrievedContent.length < 50 || retrievedContent.toLowerCase().includes("no se ha encontrado")) {
                    console.warn("[Generate API] RAG content poor/empty. Forcing autonomous mode.");
                    retrievedContent = "";
                }
            } else {
                console.error(`[Generate API] RAG Error ${response.status}`);
            }
        } catch (e: any) {
            console.error(`[Generate API] Stage 1 failed: ${e.message}`);
        }
    }

    const synthesisPrompt = retrievedContent
        ? `TRANSFORMA EN JSON ESTE CONTENIDO TÉCNICO DE OPOSICIÓN:
"${retrievedContent}"

REGLAS CRÍTICAS:
- Genera exactamente ${chunkSize} preguntas detalladas.
- LAS OPCIONES DEBEN SER TEXTO REAL Y DESCRIPTIVO. 
- PROHIBIDO usar solo letras (A, B, C, D) como texto de las opciones.
- Cada opción debe ser una respuesta plausible relacionada con la pregunta.
- Formato Estricto JSON: { "questions": [{ "question": "...", "options": ["Texto de opción 1", "Texto de opción 2", "Texto de opción 3", "Texto de opción 4"], "correctAnswer": 0, "explanation": "..." }] }`
        : `${prompt}

REGLAS CRÍTICAS:
- Las preguntas deben ser técnicas y profesionales.
- PROHIBIDO usar Literales o Letras (A, B, C, D) como el contenido de las opciones.
- Las opciones deben contener explicaciones o datos reales del tema.
- Formato Estricto JSON: { "questions": [{ "question": "...", "options": ["Respuesta técnica 1", "Respuesta técnica 2", "Respuesta técnica 3", "Respuesta técnica 4"], "correctAnswer": 0, "explanation": "..." }] }`;

    let lastAIErr = "";

    // Stage 2: OpenAI Synthesis
    if (OPENAI_KEY) {
        try {
            console.log("[Generate API] OpenAI Start...");
            const openai = new OpenAI({ apiKey: OPENAI_KEY });
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "Eres un generador de exámenes JSON. Responde solo con el objeto solicitado." },
                    { role: "user", content: synthesisPrompt }
                ],
                response_format: { type: "json_object" }
            });

            const content = completion.choices[0].message.content || "{}";
            const parsed = extractJSON(content);

            if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                console.log(`[Generate API] OpenAI OK (${parsed.questions.length} q).`);
                return {
                    examTitle: parsed.examTitle || (targetFileName ? `Test ${targetFileName}` : "Test"),
                    questions: parsed.questions
                };
            }
            lastAIErr = "OpenAI devolvió JSON vacío/inválido.";
        } catch (e: any) {
            console.error(`[Generate API] OpenAI Fail: ${e.message}`);
            lastAIErr = `OpenAI Error: ${e.message}`;
        }
    } else {
        lastAIErr = "OpenAI Key no detectada en environment.";
    }

    return { questions: [], error: `Fallo síntesis: ${lastAIErr}` };
}

export async function POST(req: Request) {
    try {
        const { numQuestions, difficulty, targetFile, targetFileName } = await req.json();
        console.log(`[POST] New Request: ${numQuestions} q, File: ${targetFileName || targetFile}`);

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "Iniciando..." })}\n\n`));

                    // Chunk the work - 10 questions per chunk for better stability and speed
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

                    console.log(`[Generate API] Launching ${numChunks} chunks in parallel...`);
                    
                    // Fire all chunks in PARALLEL but stream them in order to the controller
                    const chunkPromises = chunkCounts.map((chunkSize, i) => 
                        generateChunk(chunkSize, difficulty, targetFileName || targetFile, i, numChunks, ALLM_WORKSPACE || null)
                    );

                    for (let i = 0; i < chunkPromises.length; i++) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: `Bloque ${i + 1}/${numChunks}...` })}\n\n`));
                        const result = await chunkPromises[i];

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
                        } else if (result.error) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `Fallo bloque ${i + 1}: ${result.error}` })}\n\n`));
                        }
                    }

                    if (!anyQuestions) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Fallo total: No se generaron preguntas." })}\n\n`));
                    }

                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                    controller.close();
                } catch (err: any) {
                    console.error('[POST] Stream Error:', err);
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
        console.error('[POST] Critical Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
