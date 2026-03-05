import { NextResponse } from 'next/server';

export const maxDuration = 120; // Allow up to 2 minutes for generation
export const dynamic = 'force-dynamic';

// Config
const ALLM_URL = process.env.NEXT_PUBLIC_ANYTHINGLLM_URL;
const ALLM_KEY = process.env.NEXT_PUBLIC_ANYTHINGLLM_KEY;
const ALLM_WORKSPACE = process.env.NEXT_PUBLIC_ANYTHINGLLM_WORKSPACE;

export async function POST(req: Request) {
    try {
        const { numQuestions, difficulty, targetFile } = await req.json();

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    let remaining = numQuestions;
                    let currentId = 1;
                    let history: any[] = [];
                    let isFirst = true;
                    let examTitle = "Test Generado";
                    // Use smaller chunks when targeting a specific file (slower LLM response)
                    const isTargeted = targetFile && targetFile !== 'all';
                    let chunkSize = isTargeted ? 5 : 10;
                    if (numQuestions <= 5) chunkSize = isTargeted ? 3 : 5;
                    else if (numQuestions <= 10) chunkSize = isTargeted ? 5 : 10;

                    while (remaining > 0) {
                        const chunk = Math.min(chunkSize, remaining);
                        const isFirstText = isFirst ? "Incluye un examTitle basado en los documentos." : "No es necesario un examTitle.";

                        let basePrompt = targetFile && targetFile !== 'all'
                            ? `Basándote ESTRICTAMENTE y ÚNICAMENTE en la información proveniente del documento llamado "${targetFile}", genera exactamente ${chunk} preguntas de tipo test nivel ${difficulty}. IMPORTANTE: Las preguntas deben ser DISTINTAS a las generadas anteriormente. ${isFirstText}`
                            : `Basándote en el contenido de tus documentos, genera exactamente ${chunk} preguntas de tipo test nivel ${difficulty}. IMPORTANTE: Las preguntas deben ser DISTINTAS a las generadas anteriormente. ${isFirstText}`;

                        const prompt = `Devuelve ESTRICTAMENTE y ÚNICAMENTE un objeto JSON válido. No incluyas absolutamente nada de texto extra. ${basePrompt}
{
  ${isFirst ? '"examTitle": "Título basado en los documentos",\n' : ''}  "questions": [
    {
      "question": "Pregunta...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Explicación detallada y extensa de por qué esta es la respuesta correcta y por qué las demás son incorrectas. No te limites a decir 'el documento dice', explica el razonamiento y el contenido completo."
    }
  ]
}`;

                        const allmResponse = await fetch(`${ALLM_URL}/workspace/${ALLM_WORKSPACE}/chat`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${ALLM_KEY}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ message: prompt, mode: 'chat', history }),
                        });

                        if (!allmResponse.ok) {
                            const errTxt = await allmResponse.text();
                            console.error(`AnythingLLM HTTP error: ${allmResponse.status}`, errTxt);
                            throw new Error(`Status HTTP: ${allmResponse.status} ${errTxt}`);
                        }

                        const data = await allmResponse.json();
                        const textResponse = data.textResponse || data.text;
                        if (!textResponse) throw new Error("Repuesta vacia de AnythingLLM.");

                        history.push({ role: 'user', content: prompt });
                        history.push({ role: 'assistant', content: textResponse });

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
                        if (isFirst && parsed.examTitle) {
                            examTitle = parsed.examTitle;
                            isFirst = false;
                        }

                        const processedQuestions = (parsed.questions || []).map((q: any) => ({
                            ...q,
                            id: currentId++
                        }));

                        const chunkData = {
                            examTitle,
                            questions: processedQuestions
                        };

                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunkData)}\n\n`));
                        remaining -= chunk;
                    }

                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                    controller.close();
                } catch (allmErr: any) {
                    console.error('AnythingLLM generation failed:', allmErr);
                    controller.enqueue(encoder.encode(`data: {"error": "${allmErr.message}"}\n\n`));
                    controller.close();
                }
            }
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
