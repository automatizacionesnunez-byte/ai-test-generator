"use client";

import React from 'react';
import { History, Eye, Trash2, ArrowRightCircle, CheckCircle2, XCircle, Clock, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HistoryView() {
    const [history, setHistory] = React.useState<any[]>([]);

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
                                    className="group relative p-6 rounded-2xl glass glass-hover border border-white/5 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={`p-4 rounded-full ${statusBg} ${statusColor} group-hover:scale-110 transition-transform`}>
                                            {ratio >= 0.8 ? <CheckCircle2 size={24} /> : ratio >= 0.5 ? <Clock size={24} /> : <XCircle size={24} />}
                                        </div>
                                        <div>
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

                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <p className={`text-2xl font-black ${statusColor} text-glow-cyan`}>
                                                {test.score} <span className="text-slate-600 font-bold text-sm">/ {test.total}</span>
                                            </p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Resultado</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button onClick={() => deleteHistoryItem(test.id)} className="p-2 rounded-xl bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all">
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
