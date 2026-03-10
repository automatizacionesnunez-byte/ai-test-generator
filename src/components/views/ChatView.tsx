"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, Eraser, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { sendChatMessage, type ChatMessage } from '@/lib/anything-llm';

export default function ChatView() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: input, history: messages })
            });
            if (!res.ok) throw new Error('Network response was not ok');

            // Agregamos un mensaje asistente vacío al que le iremos concatenando texto
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            if (!res.body) throw new Error('No stream body');
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let isDone = false;
            let currentContent = '';

            while (!isDone) {
                const { value, done } = await reader.read();
                isDone = done;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const dataStr = line.replace('data: ', '').trim();
                                if (dataStr === '[DONE]') continue;
                                const parsed = JSON.parse(dataStr);
                                if (parsed.textResponse) {
                                    currentContent += parsed.textResponse;
                                    setMessages(prev => {
                                        const newMsgs = [...prev];
                                        newMsgs[newMsgs.length - 1].content = currentContent;
                                        return newMsgs;
                                    });
                                }
                            } catch (e) {
                                // A veces los chunks se cortan a la mitad del JSON, Next.js / stream maneja eso parcialmente o puede fallar.
                                // Ignoramos fallos de parseo de un chunk incompleto para simplificar, idealmente se usa eventsource-parser.
                            }
                        }
                    }
                }
            }
        } catch (error: any) {
            setMessages(prev => {
                const newMsgs = [...prev];
                // Si el último mensaje es el del asistente que estaba cargando, lo actualizamos
                if (newMsgs[newMsgs.length - 1].role === 'assistant') {
                    newMsgs[newMsgs.length - 1].content = `Error: ${error.message}`;
                    return newMsgs;
                }
                return [...prev, {
                    role: 'assistant',
                    content: `Error: ${error.message}`
                }];
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-160px)] space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center px-2">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                        <MessageSquare size={28} className="text-brand-cyan" />
                        Chat con <span className="text-brand-cyan italic">IA</span>
                    </h2>
                    <p className="text-slate-400 text-sm">Consulta dudas sobre tu temario en tiempo real.</p>
                </div>
                <button
                    onClick={() => setMessages([])}
                    className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all border border-white/5"
                    title="Limpiar chat"
                >
                    <Eraser size={20} />
                </button>
            </div>

            <div className="flex-grow glass rounded-3xl border border-white/5 flex flex-col overflow-hidden relative">
                {/* Messages area */}
                <div
                    ref={scrollRef}
                    className="flex-grow p-8 overflow-y-auto space-y-6 scrollbar-hide"
                >
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                            <div className="p-4 rounded-full bg-brand-cyan/10 text-brand-cyan">
                                <Sparkles size={40} className="animate-pulse" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-white uppercase tracking-widest">Pregúntame algo</p>
                                <p className="text-sm text-slate-400 mt-2 max-w-xs">Estoy conectado a tu AnythingLLM en el VPS. Puedo responder sobre los documentos que hayas subido.</p>
                            </div>
                        </div>
                    )}

                    <AnimatePresence>
                        {messages.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={cn(
                                    "flex items-start gap-4",
                                    msg.role === 'user' ? "flex-row-reverse" : ""
                                )}
                            >
                                <div className={cn(
                                    "p-2 rounded-xl shrink-0",
                                    msg.role === 'user' ? "bg-indigo-500 text-white" : "bg-brand-cyan/20 text-brand-cyan"
                                )}>
                                    {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                                </div>

                                <div className={cn(
                                    "p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed",
                                    msg.role === 'user'
                                        ? "bg-indigo-500/10 text-slate-200 border border-indigo-500/20 rounded-tr-none"
                                        : "bg-white/5 text-slate-300 border border-white/5 rounded-tl-none"
                                )}>
                                    {msg.content}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {isLoading && (
                        <div className="flex items-center gap-4">
                            <div className="p-2 rounded-xl bg-brand-cyan/20 text-brand-cyan">
                                <Bot size={18} />
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 rounded-tl-none">
                                <Loader2 size={18} className="animate-spin text-brand-cyan" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Input area */}
                <div className="p-6 bg-brand-dark/50 border-t border-white/5 backdrop-blur-md">
                    <div className="relative flex items-center gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Escribe tu duda aquí..."
                            className="flex-grow bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-brand-cyan/50 focus:ring-1 focus:ring-brand-cyan/20 transition-all"
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="p-4 rounded-2xl bg-brand-cyan text-brand-dark hover:scale-105 active:scale-95 transition-all glow-cyan disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>

                {/* Background glow in chat */}
                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-brand-cyan/5 blur-[100px] pointer-events-none rounded-full" />
            </div>
        </div>
    );
}
