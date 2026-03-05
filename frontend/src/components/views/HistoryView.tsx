"use client";

import React from 'react';
import { History, Eye, Trash2, ArrowRightCircle, CheckCircle2, XCircle, Clock, BarChart3, Download, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HistoryViewProps {
    onRetake?: (failedQuestions: any[], title: string) => void;
}

export default function HistoryView({ onRetake }: HistoryViewProps) {
    const [history, setHistory] = React.useState<any[]>([]);
    const [previewTest, setPreviewTest] = React.useState<any>(null);

    React.useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('examHistory') || '[]');
            setHistory(stored);
        } catch (e) {
            console.error(e);
        }
    }, []);

    const deleteHistoryItem = (id: string) => {
        const newHistory = history.filter(h => h.id !== id);
        setHistory(newHistory);
        localStorage.setItem('examHistory', JSON.stringify(newHistory));
    };

    const averageScore = history.length > 0
        ? (history.reduce((acc, curr) => acc + (curr.score / curr.total) * 10, 0) / history.length)
        : 0;

    if (previewTest) {
        const data = previewTest.examData;
        const answers = previewTest.userAnswers;
        const score = previewTest.score;
        const ratio = score / data.questions.length;

        return (
            <div className="max-w-4xl mx-auto space-y-12 pb-20 print:space-y-6 print:pb-0 animate-in fade-in">
                <div className="text-center space-y-4">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={cn(
                            "w-32 h-32 rounded-full mx-auto flex items-center justify-center border-8",
                            ratio >= 0.8 ? "border-green-500/20 text-green-500" :
                                ratio >= 0.5 ? "border-yellow-500/20 text-yellow-500" :
                                    "border-red-500/20 text-red-500"
                        )}
                    >
                        <span className="text-4xl font-black">{score} / {data.questions.length}</span>
                    </motion.div>
                    <h2 className="text-4xl font-black text-white">Revisión de Examen</h2>
                    <p className="text-slate-400">Obtuviste un {Math.round(ratio * 100)}% de aciertos en "{data.examTitle}".</p>
                </div>

                <div className="space-y-6">
                    {data.questions.map((q: any, i: number) => (
                        <div key={q.id} className="p-8 rounded-3xl glass border border-white/5 space-y-6 relative overflow-hidden">
                            <div className="flex items-start gap-4">
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold",
                                    answers[i] === q.correctAnswer ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                                )}>
                                    {i + 1}
                                </div>
                                <h3 className="text-lg font-bold text-white leading-relaxed">{q.question}</h3>
                            </div>

                            <div className="grid grid-cols-1 gap-3 pl-12">
                                {q.options.map((opt: string, optIdx: number) => (
                                    <div
                                        key={optIdx}
                                        className={cn(
                                            "p-4 rounded-xl border transition-all text-sm",
                                            optIdx === q.correctAnswer ? "bg-green-500/10 border-green-500/30 text-green-400" :
                                                optIdx === answers[i] ? "bg-red-500/10 border-red-500/30 text-red-400" :
                                                    "bg-white/5 border-white/5 text-slate-500"
                                        )}
                                    >
                                        {opt}
                                    </div>
                                ))}
                            </div>

                            <div className="pl-12 pt-4 border-t border-white/5 mt-4">
                                <div className="flex gap-3 text-sm italic text-slate-400">
                                    <HelpCircle size={18} className="text-brand-cyan shrink-0 print:hidden" />
                                    <p className="print:text-black">{q.explanation}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 print:hidden">
                    <button
                        onClick={() => setPreviewTest(null)}
                        className="flex-1 py-4 lg:py-3 rounded-2xl bg-white/10 text-white font-black uppercase tracking-widest hover:bg-white/20 transition-all shadow-xl text-xs lg:text-sm"
                    >
                        Volver
                    </button>
                    {onRetake && data.questions.filter((q: any, i: number) => answers[i] !== q.correctAnswer).length > 0 && (
                        <button
                            onClick={() => {
                                const failed = data.questions.filter((q: any, i: number) => answers[i] !== q.correctAnswer);
                                onRetake(failed, data.examTitle);
                            }}
                            className="flex-1 py-4 lg:py-3 rounded-2xl bg-indigo-500/20 text-indigo-400 font-black uppercase tracking-widest hover:bg-indigo-500/30 transition-all shadow-xl border border-indigo-500/20 text-xs lg:text-sm"
                        >
                            Rehacer Falladas ({data.questions.filter((q: any, i: number) => answers[i] !== q.correctAnswer).length})
                        </button>
                    )}
                    <button
                        onClick={() => window.print()}
                        className="flex-1 py-4 lg:py-3 rounded-2xl bg-brand-cyan text-brand-dark font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-brand-cyan/20 text-xs lg:text-sm"
                    >
                        PDF
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-tight text-white">Tu <span className="text-brand-cyan italic">Historial</span></h2>
                <p className="text-slate-400">Revisa tus resultados anteriores y sigue tu progreso de estudio.</p>
            </div>

            {history.length === 0 ? (
                <div className="text-center p-12 glass rounded-3xl border border-white/5">
                    <p className="text-slate-400">Aún no has completado ningún examen. ¡Empieza a practicar!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    <AnimatePresence>
                        {history.map((test, idx) => {
                            const ratio = test.score / test.total;
                            const statusColor = ratio >= 0.8 ? 'text-green-400' : ratio >= 0.5 ? 'text-yellow-400' : 'text-red-400';
                            const statusBg = ratio >= 0.8 ? 'bg-green-500/10' : ratio >= 0.5 ? 'bg-yellow-500/10' : 'bg-red-500/10';

                            return (
                                <motion.div
                                    key={test.id}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={cn(
                                        "group relative p-6 rounded-2xl glass glass-hover border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6",
                                        test.examData && test.userAnswers ? "cursor-default" : "cursor-default"
                                    )}
                                >
                                    <div className="flex items-center gap-6 w-full sm:w-auto">
                                        <div className={`p-4 rounded-full ${statusBg} ${statusColor} group-hover:scale-110 transition-transform`}>
                                            {ratio >= 0.8 ? <CheckCircle2 size={24} /> : ratio >= 0.5 ? <Clock size={24} /> : <XCircle size={24} />}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-white mb-1">{test.title}</h3>
                                            <div className="flex flex-wrap gap-4">
                                                <div className="flex items-center gap-1 text-[10px] text-slate-500 uppercase font-black tracking-widest">
                                                    <BarChart3 size={12} />
                                                    <span>{test.difficulty}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-slate-500 uppercase font-black tracking-widest">
                                                    <Clock size={12} />
                                                    <span>{test.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                                        <div className="text-left sm:text-right flex-1 sm:flex-none">
                                            <p className={`text-2xl font-black ${statusColor} text-glow-cyan`}>
                                                {test.score} <span className="text-slate-600 font-bold text-sm">/ {test.total}</span>
                                            </p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Resultado</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {test.examData && test.userAnswers && (
                                                <>
                                                    {onRetake && test.examData.questions.filter((q: any, i: number) => test.userAnswers[i] !== q.correctAnswer).length > 0 && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const failed = test.examData.questions.filter((q: any, i: number) => test.userAnswers[i] !== q.correctAnswer);
                                                                onRetake(failed, test.examData.examTitle);
                                                            }}
                                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 font-bold hover:bg-indigo-500/20 transition-all text-sm border border-indigo-500/20"
                                                            title="Rehacer preguntas falladas"
                                                        >
                                                            <span>Rehacer Falladas</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setPreviewTest(test); }}
                                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-slate-300 font-bold hover:bg-white/10 hover:text-white transition-all text-sm"
                                                        title="Ver test completo y resultados"
                                                    >
                                                        <Eye size={16} />
                                                        <span>Revisar</span>
                                                    </button>
                                                </>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); deleteHistoryItem(test.id); }} className="p-2.5 rounded-xl bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all ml-2" title="Eliminar del historial">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className={`absolute left-0 top-0 bottom-0 w-[4px] ${ratio >= 0.8 ? 'bg-green-500' : ratio >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {history.length > 0 && (
                <div className="pt-10">
                    <div className="p-10 rounded-3xl bg-gradient-to-br from-indigo-900/40 via-brand-dark to-brand-cyan/10 border border-white/5 relative overflow-hidden">
                        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                            <div className="space-y-4">
                                <h3 className="text-3xl font-black text-white italic">Tu Rendimiento Total</h3>
                                <p className="text-slate-400 leading-relaxed">Has realizado un total de <span className="text-brand-cyan font-bold">{history.length}</span> exámenes de simulación para estudiar.</p>
                            </div>

                            <div className="flex justify-center md:justify-end">
                                <div className="w-48 h-48 rounded-full border-8 border-brand-cyan/20 border-t-brand-cyan flex items-center justify-center relative animate-pulse-slow">
                                    <div className="text-center">
                                        <span className="text-5xl font-black text-white block">{averageScore.toFixed(1)}</span>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[.2em]">Nota Media</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-brand-cyan/5 blur-3xl opacity-50" />
                    </div>
                </div>
            )}
        </div>
    );
}
