import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

const ALLM_URL = process.env.NEXT_PUBLIC_ANYTHINGLLM_URL;
const ALLM_KEY = process.env.NEXT_PUBLIC_ANYTHINGLLM_KEY;
const ALLM_WORKSPACE = process.env.NEXT_PUBLIC_ANYTHINGLLM_WORKSPACE;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

const openai = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const { message, history } = await req.json();
        console.log(`[Chat API] Message incoming...`);

        // Attempt 1: AnythingLLM (Document Context)
        if (ALLM_URL && ALLM_KEY) {
            try {
                const allmResponse = await fetch(`${ALLM_URL}/workspace/${ALLM_WORKSPACE}/stream-chat`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${ALLM_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message, mode: 'query', history }),
                    signal: AbortSignal.timeout(30000),
                });

                if (allmResponse.ok && allmResponse.body) {
                    return new Response(allmResponse.body, {
                        headers: {
                            'Content-Type': 'text/event-stream',
                            'Cache-Control': 'no-cache',
                            'Connection': 'keep-alive',
                        },
                    });
                }
            } catch (err: any) {
                console.warn(`[Chat API] AnythingLLM failed, trying fallbacks: ${err.message}`);
            }
        }

        const fallbackPrompt = `Actúa como un preparador de oposiciones servicial. Responde basándote en tus conocimientos generales.\n\nPregunta: "${message}"\n\nRespuesta técnica:`;

        // Attempt 2: OpenAI (Primary Fallback)
        if (openai) {
            try {
                const stream = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: fallbackPrompt }],
                    stream: true,
                });

                const readableStream = new ReadableStream({
                    async start(controller) {
                        try {
                            for await (const chunk of stream) {
                                const chunkText = chunk.choices[0]?.delta?.content || "";
                                if (chunkText) {
                                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ textResponse: chunkText })}\n\n`));
                                }
                            }
                            controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
                        } catch (e) {
                            console.error('[Chat API] OpenAI stream error', e);
                        } finally {
                            controller.close();
                        }
                    }
                });

                return new Response(readableStream, {
                    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
                });
            } catch (openaiErr: any) {
                console.error('[Chat API] OpenAI fallback failed:', openaiErr.message);
            }
        }

        // Attempt 3: Gemini (Legacy Fallback)
        if (GEMINI_KEY) {
            try {
                const genAI = new GoogleGenerativeAI(GEMINI_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
                const result = await model.generateContentStream(fallbackPrompt);

                const stream = new ReadableStream({
                    async start(controller) {
                        try {
                            for await (const chunk of result.stream) {
                                const chunkText = chunk.text();
                                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ textResponse: chunkText })}\n\n`));
                            }
                            controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
                        } catch (e) {
                            console.error('[Chat API] Gemini stream error', e);
                        } finally {
                            controller.close();
                        }
                    }
                });

                return new Response(stream, {
                    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
                });
            } catch (geminiErr: any) {
                console.error('[Chat API] Gemini fallback failed:', geminiErr.message);
            }
        }

        return NextResponse.json({ error: "No se pudo conectar con ninguna IA" }, { status: 503 });
    } catch (error: any) {
        console.error('[Chat API] Global error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
