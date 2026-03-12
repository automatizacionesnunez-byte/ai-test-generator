import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
const ALLM_URL = process.env.NEXT_PUBLIC_ANYTHINGLLM_URL;
const ALLM_KEY = process.env.NEXT_PUBLIC_ANYTHINGLLM_KEY;
const ALLM_WORKSPACE = process.env.NEXT_PUBLIC_ANYTHINGLLM_WORKSPACE;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

export const runtime = 'nodejs';
// OR force-dynamic, let's keep it simple

export async function POST(req: Request) {
    try {
        if (!ALLM_URL || !ALLM_KEY) {
            throw new Error("Missing AnythingLLM credentials in environment variables.");
        }

        const { message, history } = await req.json();
        console.log(`[Chat API] Message: ${message.substring(0, 50)}...`);

        // Intento 1: AnythingLLM (para contexto de documentos)
        try {
            const allmResponse = await fetch(`${ALLM_URL}/workspace/${ALLM_WORKSPACE}/stream-chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ALLM_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message, mode: 'query', history }),
                signal: AbortSignal.timeout(30000), // 30s timeout
            });

            if (allmResponse.ok && allmResponse.body) {
                console.log("[Chat API] AnythingLLM stream started successfully.");
                return new Response(allmResponse.body, {
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                    },
                });
            } else {
                const errorText = await allmResponse.text();
                console.warn(`[Chat API] AnythingLLM failed: ${allmResponse.status} ${errorText}`);
            }
        } catch (err: any) {
            console.warn(`[Chat API] AnythingLLM fetch failed, falling back to Gemini: ${err.message}`);
        }

        // Intento 2: Gemini Directo (Fallback)
        if (GEMINI_KEY) {
            try {
                const genAI = new GoogleGenerativeAI(GEMINI_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

                const prompt = `Actúa como un preparador de oposiciones servicial. Responde a la siguiente duda basándote en tus conocimientos generales (ya que la conexión con el temario específico está experimentando problemas).\n\nPregunta: "${message}"\n\nRespuesta técnica y clara:`;

                const result = await model.generateContentStream(prompt);

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
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache'
                    }
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
