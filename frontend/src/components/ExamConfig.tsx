"use client";

import React, { useState } from 'react';
import { Settings, Info, Play, CheckCircle2, ChevronRight, Clock, Box } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ExamConfig({ onExamGenerated }: { onExamGenerated?: (data: any) => void }) {
    const [numQuestions, setNumQuestions] = useState(10);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/generate-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ numQuestions, difficulty: 'Dificultad Media' }),
            });

            if (!response.body) throw new Error('No body in response');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let examData: any = { examTitle: "Test Generado", questions: [], totalQuestions: numQuestions };
            let firstChunkRevealed = false;
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');

                buffer = lines.pop() || ""; // keep the incomplete part in the buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const msg = line.substring(6).trim();
                        if (msg === '[DONE]') {
                            setIsLoading(false);
                            return;
                        }

                        try {
                            const parsed = JSON.parse(msg);
                            if (parsed.error) throw new Error(parsed.error);

                            examData.examTitle = parsed.examTitle || examData.examTitle;
                            examData.questions = [...examData.questions, ...(parsed.questions || [])];

                            // Let the user start immediately when 5 questions arrive
                            if (examData.questions.length >= 5 && !firstChunkRevealed) {
                                firstChunkRevealed = true;
                                setIsLoading(false);
                                if (onExamGenerated) onExamGenerated({ ...examData });
                            } else if (firstChunkRevealed && onExamGenerated) {
                                // Keep updating the active test in the background
                                onExamGenerated({ ...examData });
                            }
                        } catch (e: any) {
                            console.error("SSE parse error", e);
                        }
                    }
                }
            }

            // If the user requested less than 5 questions, dispatch when stream finishes
            if (!firstChunkRevealed && onExamGenerated && examData.questions.length > 0) {
                firstChunkRevealed = true;
                setIsLoading(false);
                onExamGenerated({ ...examData });
            }

        } catch (error) {
            console.error('Error generating exam:', error);
            alert('Error al generar el examen. Revisa la consola.');
            setIsLoading(false);
        }
    };

    return (
        <div className="sticky top-24 space-y-6">
            <div className="glass rounded-2xl overflow-hidden border-brand-cyan/20">
                <div className="p-6 border-b border-white/5 bg-brand-cyan/5">
                    <div className="flex items-center gap-2 text-brand-cyan">
                        <Settings size={20} className="animate-spin-slow" />
                        <h2 className="text-xl font-bold">Configuración del Examen</h2>
                    </div>
                </div>

                <div className="p-8 space-y-8 bg-brand-surface/50">
                    {/* Question Selector */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-slate-300">
                                ¿Cuántas preguntas quieres hacer el examen?
                            </label>
                            <span className="text-2xl font-black text-brand-cyan text-glow-cyan">
                                {numQuestions}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="5"
                            max="50"
                            step="5"
                            value={numQuestions}
                            onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                            className="w-full h-2 rounded-lg bg-white/5 accent-brand-cyan appearance-none cursor-pointer transition-all hover:brightness-110"
                        />
                        <div className="flex justify-between text-[10px] uppercase tracking-widest text-slate-600 font-bold">
                            <span>5</span>
                            <span>25</span>
                            <span>50</span>
                        </div>
                    </div>

                    {/* Stats/Badges */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="group flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 glass-hover">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan group-hover:scale-110 transition-transform">
                                    <Clock size={16} />
                                </div>
                                <span className="text-sm font-medium text-slate-300">Ratio de tiempo</span>
                            </div>
                            <span className="text-sm font-semibold text-white bg-brand-cyan/20 px-2 py-1 rounded">1 min / preg</span>
                        </div>

                        <div className="group flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 glass-hover">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan group-hover:scale-110 transition-transform">
                                    <Box size={16} />
                                </div>
                                <span className="text-sm font-medium text-slate-300">Tipo de examen</span>
                            </div>
                            <span className="text-sm font-semibold text-white bg-brand-cyan/20 px-2 py-1 rounded">4 opciones c/u</span>
                        </div>
                    </div>

                    {/* Guidelines */}
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex gap-4">
                        <Info className="text-amber-500 shrink-0" size={18} />
                        <p className="text-xs leading-relaxed text-slate-400">
                            El examen se generará basándose exclusivamente en los archivos subidos. Asegúrate de que el temario sea claro para obtener mejores resultados.
                        </p>
                    </div>

                    {/* CTA */}
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className={cn(
                            "relative w-full group overflow-hidden py-4 rounded-xl transition-all duration-500",
                            "bg-brand-cyan text-brand-dark font-black tracking-widest uppercase text-sm",
                            "hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-brand-cyan/50",
                            "disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed",
                            "glow-cyan"
                        )}
                    >
                        <div className="relative z-10 flex items-center justify-center gap-2">
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-brand-dark/30 border-t-brand-dark rounded-full animate-spin" />
                                    <span>Generando...</span>
                                </>
                            ) : (
                                <>
                                    <span>Generar Examen</span>
                                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </div>

                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-shimmer" />
                    </button>
                </div>
            </div>

            {/* Mini status indicator */}
            <div className="flex items-center gap-2 text-xs text-slate-500 px-4">
                <CheckCircle2 size={12} className="text-brand-cyan" />
                IA optimizada con GPT-4o
            </div>

            <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1s infinite;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
