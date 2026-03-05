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

    const prompt = `Devuelve ESTRICTAMENTE y ÚNICAMENTE un objeto JSON válido. No incluyas absolutamente nada de texto extra. ${fileHint} genera exactamente ${chunkSize} preguntas de tipo test nivel ${difficulty}. ${topicHint}
{
  ${wantTitle ? '"examTitle": "Título basado en los documentos",\n  ' : ''}"questions": [
    {
      "question": "Pregunta...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Explicación detallada y extensa de por qué esta es la respuesta correcta y por qué las demás son incorrectas."
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
    const textResponse = data.textResponse || data.text;
    if (!textResponse) throw new Error("Empty response from AnythingLLM");

    // Parse JSON from response
    let rawOutput = textResponse.trim();
    const jsonMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonMatch && jsonMatch[1]) {
        rawOutput = jsonMatch[1].trim();
    } else {
        const firstBrace = rawOutput.indexOf('{');
        const lastBrace = rawOutput.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            rawOutput = rawOutput.substring(firstBrace, lastBrace + 1);
        }
    }

    const parsed = JSON.parse(rawOutput);
    return {
        examTitle: parsed.examTitle,
        questions: parsed.questions || [],
    };
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

                    // Fire all chunks in parallel
                    const promises = chunks.map((chunkSize, idx) =>
                        generateChunk(chunkSize, difficulty, targetFile, idx, numChunks)
                            .then(result => ({ idx, result, error: null }))
                            .catch(error => ({ idx, result: null, error }))
                    );

                    // Stream results as each chunk completes (not waiting for all)
                    const settled = await Promise.allSettled(
                        promises.map(async (promise) => {
                            const { idx, result, error } = await promise;

                            if (error || !result) {
                                console.error(`Chunk ${idx} failed:`, error?.message);
                                return;
                            }

                            if (idx === 0 && result.examTitle) {
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
                        })
                    );

                    // Check if any chunks succeeded
                    const anySuccess = settled.some(s => s.status === 'fulfilled');
                    if (!anySuccess) {
                        controller.enqueue(encoder.encode(`data: {"error": "All parallel chunks failed"}\n\n`));
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
