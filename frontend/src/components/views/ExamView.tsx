"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowLeft, ChevronRight, ChevronLeft, HelpCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Question {
    id: number;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
}

interface ExamData {
    examTitle: string;
    questions: Question[];
    totalQuestions?: number;
}

export default function ExamView({ data, onBack, onRetake }: { data: ExamData, onBack: () => void, onRetake?: (failedQuestions: Question[]) => void }) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [showResults, setShowResults] = useState(false);

    const [timeLeft, setTimeLeft] = useState(() => (data.totalQuestions || data.questions.length) * 60);

    React.useEffect(() => {
        if (showResults || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setShowResults(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [showResults, timeLeft]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const currentQuestion = data.questions[currentIdx];
    const trueTotal = data.totalQuestions || data.questions.length;
    const isLastQuestion = currentIdx === trueTotal - 1;

    const handleSelect = (idx: number) => {
        if (showResults) return;
        setAnswers(prev => ({ ...prev, [currentIdx]: idx }));
    };

    const calculateScore = () => {
        let score = 0;
        data.questions.forEach((q, i) => {
            if (answers[i] === q.correctAnswer) score++;
        });
        return score;
    };

    React.useEffect(() => {
        if (showResults) {
            const score = calculateScore();
            const total = data.questions.length;
            const newHistoryItem = {
                id: Date.now().toString(),
                title: data.examTitle || "Test Generado",
                score,
                total,
                difficulty: "Generado por IA",
                date: new Date().toLocaleDateString('es-ES')
            };
            try {
                const existing = JSON.parse(localStorage.getItem('examHistory') || '[]');
                localStorage.setItem('examHistory', JSON.stringify([newHistoryItem, ...existing]));
            } catch (e) {
                console.error("Error saving history:", e);
            }
        }
    }, [showResults]);

    if (showResults) {
        const score = calculateScore();
        const ratio = score / data.questions.length;
        const failedQuestions = data.questions.filter((q, i) => answers[i] !== q.correctAnswer);

        return (
            <div className="max-w-4xl mx-auto space-y-12 pb-20 print:space-y-6 print:pb-0">
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
                    <h2 className="text-4xl font-black text-white">¡Examen Finalizado!</h2>
                    <p className="text-slate-400">Has obtenido un {Math.round(ratio * 100)}% de aciertos en "{data.examTitle}".</p>
                </div>

                <div className="space-y-6">
                    {data.questions.map((q, i) => (
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
                                {q.options.map((opt, optIdx) => (
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
                        onClick={onBack}
                        className="flex-1 py-4 rounded-2xl bg-white/10 text-white font-black uppercase tracking-widest hover:bg-white/20 transition-all shadow-xl"
                    >
                        Volver al Panel
                    </button>
                    {onRetake && failedQuestions.length > 0 && (
                        <button
                            onClick={() => onRetake(failedQuestions)}
                            className="flex-1 py-4 rounded-2xl bg-red-500/20 text-red-500 font-black uppercase tracking-widest hover:bg-red-500/30 transition-all shadow-xl border border-red-500/10"
                        >
                            Repasar Falladas ({failedQuestions.length})
                        </button>
                    )}
                    <button
                        onClick={() => window.print()}
                        className="flex-1 py-4 rounded-2xl bg-brand-cyan text-brand-dark font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-brand-cyan/20"
                    >
                        Descargar en PDF
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-12">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-widest">Abandonar</span>
                </button>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 font-mono text-sm">
                        <Clock size={16} className={timeLeft < 60 ? "text-red-400 animate-pulse" : "text-brand-cyan"} />
                        <span className={timeLeft < 60 ? "text-red-400 font-bold" : "text-white"}>{formatTime(timeLeft)}</span>
                    </div>
                    <div className="flex items-center gap-4 hidden sm:flex">
                        <div className="h-2 w-48 rounded-full bg-white/5 overflow-hidden">
                            <motion.div
                                className="h-full bg-brand-cyan"
                                initial={{ width: 0 }}
                                animate={{ width: `${((currentIdx + 1) / trueTotal) * 100}%` }}
                            />
                        </div>
                        <span className="text-xs font-black text-brand-cyan">{currentIdx + 1} / {trueTotal}</span>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                <motion.div
                    key={currentIdx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-10 rounded-[40px] glass border border-white/5 min-h-[400px] flex flex-col justify-between"
                >
                    <div className="space-y-10">
                        <h2 className="text-3xl font-black text-white leading-tight">{currentQuestion.question}</h2>

                        <div className="grid grid-cols-1 gap-4">
                            {currentQuestion.options.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSelect(idx)}
                                    className={cn(
                                        "group relative p-6 rounded-2xl text-left transition-all duration-300 border",
                                        answers[currentIdx] === idx
                                            ? "bg-brand-cyan/20 border-brand-cyan text-brand-cyan"
                                            : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/10"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center font-black transition-all",
                                            answers[currentIdx] === idx ? "bg-brand-cyan text-brand-dark" : "bg-white/10 text-slate-500"
                                        )}>
                                            {String.fromCharCode(65 + idx)}
                                        </div>
                                        <span className="font-medium">{option}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>

                <div className="flex justify-between items-center px-4">
                    <button
                        disabled={currentIdx === 0}
                        onClick={() => setCurrentIdx(prev => prev - 1)}
                        className="p-4 rounded-full glass hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    {isLastQuestion ? (
                        <button
                            disabled={answers[currentIdx] === undefined || data.questions.length < trueTotal}
                            onClick={() => setShowResults(true)}
                            className="px-10 py-4 rounded-full bg-brand-cyan text-brand-dark font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-brand-cyan/20 disabled:opacity-50"
                        >
                            Finalizar Test
                        </button>
                    ) : (
                        <button
                            disabled={answers[currentIdx] === undefined || currentIdx >= data.questions.length - 1} // Disabled if next question hasn't loaded yet
                            onClick={() => setCurrentIdx(prev => prev + 1)}
                            className="p-4 rounded-full bg-brand-cyan text-brand-dark hover:scale-110 transition-all shadow-lg shadow-brand-cyan/20 disabled:opacity-30 disabled:animate-pulse"
                        >
                            <ChevronRight size={24} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
