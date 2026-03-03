'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getTest, saveScore } from '@/lib/api';
import Link from 'next/link';

type Question = {
    id: string;
    content: string;
    options: string[];
    correctAnswer: string;
    explanation: string | null;
};

type TestData = {
    id: string;
    title: string;
    mode: string;
    difficulty: string;
    timeLimit: number | null;
    score: number | null;
    totalQ: number;
    questions: Question[];
    document: { title: string } | null;
};

export default function TestPage() {
    const { id } = useParams();
    const router = useRouter();
    const [test, setTest] = useState<TestData | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        getTest(id as string).then((data) => {
            setTest(data);
            if (data.score !== null) {
                // Already completed — show results
                setSubmitted(true);
                setScore(data.score);
                // Pre-fill correct answers for review
            }
            if (data.timeLimit && data.score === null) {
                setTimeLeft(data.timeLimit * 60);
            }
        });
    }, [id]);

    // Timer countdown
    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0 || submitted) return;
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev === null || prev <= 1) {
                    clearInterval(timerRef.current!);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [timeLeft, submitted]);

    // Auto-submit when time runs out
    useEffect(() => {
        if (timeLeft === 0 && !submitted) handleSubmit();
    }, [timeLeft]);

    const handleSelect = (qId: string, option: string) => {
        if (submitted) return;
        setAnswers((prev) => ({ ...prev, [qId]: option }));
    };

    const handleSubmit = async () => {
        if (!test) return;
        const s = test.questions.reduce(
            (acc, q) => acc + (answers[q.id] === q.correctAnswer ? 1 : 0), 0
        );
        setScore(s);
        setSubmitted(true);
        if (timerRef.current) clearInterval(timerRef.current);
        try { await saveScore(test.id, s); } catch { /* ignore */ }
    };

    if (!test) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    const answered = Object.keys(answers).length;
    const total = test.questions.length;
    const pct = submitted ? Math.round((score / total) * 100) : 0;

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-6">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6 sticky top-0 z-10 bg-slate-50/95 backdrop-blur py-3 -mx-4 px-4 border-b border-slate-200">
                <Link href="/" className="text-sm text-indigo-600 font-medium hover:underline">← Volver</Link>
                <h1 className="text-sm font-semibold text-slate-800 truncate mx-4 flex-1 text-center">{test.title}</h1>
                <div className="flex items-center gap-3 shrink-0">
                    {timeLeft !== null && !submitted && (
                        <span className={`font-mono text-sm font-bold px-3 py-1 rounded-full 
              ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                            {formatTime(timeLeft)}
                        </span>
                    )}
                    {!submitted ? (
                        <button
                            onClick={handleSubmit}
                            disabled={answered === 0}
                            className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors
                ${answered > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                            Entregar ({answered}/{total})
                        </button>
                    ) : (
                        <span className={`text-sm font-bold px-4 py-1.5 rounded-lg 
              ${pct >= 70 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                            {score}/{total} ({pct}%)
                        </span>
                    )}
                </div>
            </div>

            {/* Score summary */}
            {submitted && (
                <div className={`rounded-2xl p-6 text-center mb-8 shadow-sm
          ${pct >= 70 ? 'bg-green-50 border border-green-200' : pct >= 50 ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className="text-5xl font-bold mb-1">
                        {pct >= 70 ? '🎉' : pct >= 50 ? '🤔' : '📚'}
                    </p>
                    <p className="text-2xl font-bold">
                        {score} de {total} correctas
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                        {pct >= 70 ? '¡Excelente trabajo!' : pct >= 50 ? 'Puedes mejorar, ¡sigue estudiando!' : 'Necesitas repasar el temario'}
                    </p>
                </div>
            )}

            {/* Questions */}
            <div className="space-y-6">
                {test.questions.map((q, idx) => {
                    const selected = answers[q.id];
                    const isCorrect = selected === q.correctAnswer;

                    return (
                        <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-5">
                            {/* Question header */}
                            <div className="flex items-start gap-3 mb-4">
                                <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${submitted
                                        ? (isCorrect ? 'bg-green-100 text-green-700' : selected ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-400')
                                        : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {idx + 1}
                                </span>
                                <p className="font-medium text-slate-800 leading-snug">{q.content}</p>
                            </div>

                            {/* Options */}
                            <div className="space-y-2 ml-10">
                                {q.options.map((opt) => {
                                    const isSelected = selected === opt;
                                    const isCorrectOpt = q.correctAnswer === opt;

                                    let cls = 'border-slate-200 hover:border-slate-300 hover:bg-slate-50';
                                    if (!submitted && isSelected) cls = 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500';
                                    if (submitted && isCorrectOpt) cls = 'border-green-400 bg-green-50';
                                    if (submitted && isSelected && !isCorrectOpt) cls = 'border-red-400 bg-red-50 opacity-80';
                                    if (submitted && !isSelected && !isCorrectOpt) cls = 'border-slate-100 opacity-50';

                                    return (
                                        <button
                                            key={opt}
                                            disabled={submitted}
                                            onClick={() => handleSelect(q.id, opt)}
                                            className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all flex items-center justify-between ${cls}`}
                                        >
                                            <span>{opt}</span>
                                            {submitted && isCorrectOpt && <span className="text-green-600 font-bold text-xs">✓ Correcta</span>}
                                            {submitted && isSelected && !isCorrectOpt && <span className="text-red-500 text-xs">✗</span>}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Explanation */}
                            {submitted && q.explanation && (
                                <div className="ml-10 mt-3 p-3 rounded-lg bg-indigo-50 border-l-3 border-indigo-300 text-sm text-slate-700">
                                    <strong className="text-indigo-600">Explicación:</strong> {q.explanation}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bottom action */}
            {!submitted && (
                <div className="sticky bottom-0 bg-slate-50/95 backdrop-blur py-4 mt-6 -mx-4 px-4 border-t border-slate-200">
                    <button
                        onClick={handleSubmit}
                        disabled={answered === 0}
                        className={`w-full py-3 rounded-xl font-semibold text-white transition-all
              ${answered > 0 ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md' : 'bg-slate-300 cursor-not-allowed'}`}
                    >
                        Entregar examen ({answered}/{total} respondidas)
                    </button>
                </div>
            )}

            {submitted && (
                <div className="mt-8 text-center pb-8">
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                    >
                        ← Generar otro examen
                    </Link>
                </div>
            )}
        </div>
    );
}
