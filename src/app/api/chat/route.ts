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

        // Intento 1: AnythingLLM (para contexto de documentos)
        try {
            const allmResponse = await fetch(`${ALLM_URL}/workspace/${ALLM_WORKSPACE}/stream-chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ALLM_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message, mode: 'chat', history }),
            });

            if (allmResponse.ok && allmResponse.body) {
                // Return a stream response directly using Next.js route streaming
                return new Response(allmResponse.body, {
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                    },
                });
            }
        } catch (err) {
            console.warn("Fallo el chat con AnythingLLM, pasando a Gemini", err);
        }

        // Intento 2: Gemini Directo (Fallback)
        try {
            if (!GEMINI_KEY) throw new Error('No Gemini Key');
            const genAI = new GoogleGenerativeAI(GEMINI_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const prompt = `Responde a esto basándote en lo que sepas si no tienes documentos, eres un asistente útil y estás hablando con un usuario. Si la pregunta requiere un documento, avisa que la conexión con los temarios falló y responde según tu información general.\n\nMensaje:\n"${message}"`;

            // Non-streamed fallback for now, though we could stream gemini too
            const result = await model.generateContentStream(prompt);

            // To bridge Google GenAI stream to a SSE stream manually:
            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        for await (const chunk of result.stream) {
                            const chunkText = chunk.text();
                            // Package it as AnythingLLM SSE format sort of to keep frontend unified
                            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ textResponse: chunkText })}\n\n`));
                        }
                    } catch (e) {
                        console.error('Gemini stream error', e);
                    } finally {
                        controller.close();
                    }
                }
            });

            return new Response(stream, {
                headers: { 'Content-Type': 'text/event-stream' }
            });
        } catch (geminiErr: any) {
            console.error('Gemini fallback chat failed:', geminiErr.message);
            throw new Error('Todas las IAs fallaron');
        }
    } catch (error: any) {
        console.error('API Chat error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
