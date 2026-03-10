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

    const fileContext = targetFile && targetFile !== 'all'
        ? `CONTENIDO: ${targetFile}`
        : `TEMARIO GENERAL`;

    const topicHint = totalChunks > 1
        ? `Bloque ${chunkIndex + 1}/${totalChunks}. Cubre temas de la sección ${chunkIndex + 1} del documento sin repetir preguntas anteriores.`
        : '';

    // Put the most important search terms at the VERY BEGINNING for better RAG
    const prompt = `INSTRUCCIÓN PARA EXAMEN:
${fileContext}
${topicHint}
Nivel: ${difficulty}
Cantidad: ${chunkSize} preguntas.

Genera un examen tipo test en ESPAÑOL. Cada pregunta debe tener 4 opciones y una sola respuesta correcta (indice 0-3). Incluye una explicación detallada.

Devuelve EXCLUSIVAMENTE un objeto JSON con este formato:
{
  ${chunkIndex === 0 ? '"examTitle": "Título del tema",' : ''}
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": 0,
      "explanation": "..."
    }
  ]
}

No añadas ningún texto antes ni después del JSON.`;

    const response = await fetch(`${ALLM_URL}/workspace/${ALLM_WORKSPACE}/chat`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ALLM_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: prompt,
            mode: targetFile && targetFile !== 'all' ? 'query' : 'chat',
        }),
    });

    if (!response.ok) {
        const errTxt = await response.text();
        console.error(`AnythingLLM HTTP error: ${response.status}`, errTxt);
        throw new Error(`Error en la IA (${response.status})`);
    }

    const data = await response.json();
    const textResponse = data.textResponse || data.text;
    if (!textResponse) throw new Error("La IA no devolvió contenido");

    // Parse JSON from response
    let rawOutput = textResponse.trim();
    // More robust JSON cleaning
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        rawOutput = jsonMatch[0];
    }

    try {
        const parsed = JSON.parse(rawOutput);
        return {
            examTitle: parsed.examTitle,
            questions: parsed.questions || [],
        };
    } catch (e) {
        console.error("Failed to parse JSON for chunk", chunkIndex, rawOutput);
        throw new Error("Formato de respuesta inválido");
    }
}

export async function POST(req: Request) {
    try {
        const { numQuestions, difficulty, targetFile } = await req.json();

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Split into chunks of 5 questions max
                    const CHUNK_SIZE = 5;
                    const numChunks = Math.ceil(numQuestions / CHUNK_SIZE);
                    const chunkSizes: number[] = [];
                    let remaining = numQuestions;
                    for (let i = 0; i < numChunks; i++) {
                        const size = Math.min(CHUNK_SIZE, remaining);
                        chunkSizes.push(size);
                        remaining -= size;
                    }

                    console.log(`Generating ${numQuestions} questions in ${numChunks} chunks: [${chunkSizes.join(', ')}]`);

                    let examTitle = "Test Generado";
                    let currentId = 1;

                    // Execute chunks in batches of 2 to not overload small VPS
                    const CONCURRENCY = 2;
                    for (let i = 0; i < chunkSizes.length; i += CONCURRENCY) {
                        const batch = chunkSizes.slice(i, i + CONCURRENCY);
                        const batchPromises = batch.map((size, bIdx) => {
                            const actualIdx = i + bIdx;
                            return generateChunk(size, difficulty, targetFile, actualIdx, numChunks)
                                .then(res => ({ ok: true, res }))
                                .catch(err => ({ ok: false, err }));
                        });

                        const results = await Promise.all(batchPromises);

                        for (const result of results) {
                            if (result.ok) {
                                const data = (result as any).res;
                                if (data.examTitle && i === 0) {
                                    examTitle = data.examTitle;
                                }

                                const processedQuestions = data.questions.map((q: any) => ({
                                    ...q,
                                    id: currentId++,
                                }));

                                if (processedQuestions.length > 0) {
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                        examTitle,
                                        questions: processedQuestions,
                                    })}\n\n`));
                                }
                            } else {
                                console.error(`Batch item failed:`, (result as any).err);
                            }
                        }
                    }

                    // Done
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
