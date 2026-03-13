"use client";

import React, { useState } from 'react';
import { LayoutDashboard, FileText, History, Settings, Bot, Search, User, MessageSquare, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import FileUpload from './FileUpload';
import ExamConfig from './ExamConfig';

// Import newly created views
import FilesView from './views/FilesView';
import HistoryView from './views/HistoryView';
import SettingsView from './views/SettingsView';
import ChatView from './views/ChatView';
import ExamView from './views/ExamView';

export default function Dashboard() {
    const [currentView, setCurrentView] = useState<'dashboard' | 'files' | 'history' | 'settings' | 'chat' | 'exam'>('dashboard');
    const [activeExam, setActiveExam] = useState<any>(null);
    const [examId, setExamId] = useState<string>("");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const sidebarItems = [
        { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Panel de Control' },
        { id: 'chat', icon: <MessageSquare size={20} />, label: 'Chat con IA' },
        { id: 'files', icon: <FileText size={20} />, label: 'Mis Archivos' },
        { id: 'history', icon: <History size={20} />, label: 'Historial' },
        { id: 'settings', icon: <Settings size={20} />, label: 'Ajustes' },
    ];

    const renderContent = () => {
        switch (currentView) {
            case 'dashboard':
                return (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-10 items-start">
                        <div className="xl:col-span-8 space-y-8 md:space-y-12">
                            <div className="space-y-4">
                                <motion.h1
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-3xl md:text-5xl font-black tracking-tight text-white leading-[1.1]"
                                >
                                    Generador de <span className="text-brand-cyan italic">Exámenes</span> <br />
                                    Inteligente <span className="text-brand-cyan underline decoration-brand-cyan/30 underline-offset-8">v.02</span>
                                </motion.h1>
                                <motion.p
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-lg text-slate-400 max-w-2xl leading-relaxed"
                                >
                                    Crea pruebas personalizadas en segundos a partir de tus materiales de estudio. La IA analiza tu contenido y extrae las preguntas más relevantes.
                                </motion.p>
                            </div>
                            <FileUpload />
                        </div>
                        <div className="xl:col-span-4 mt-8 xl:mt-0">
                            <ExamConfig onExamGenerated={(data) => {
                                setActiveExam(data);
                                if (!examId) setExamId(Date.now().toString());
                                setCurrentView('exam');
                            }} />
                        </div>
                    </div>
                );
            case 'chat':
                return <ChatView />;
            case 'files':
                return <FilesView />;
            case 'history':
                return <HistoryView onRetake={(failedQuestions, originalTitle) => {
                    setActiveExam({
                        examTitle: `${originalTitle} (Repaso Falladas)`,
                        questions: failedQuestions,
                        totalQuestions: failedQuestions.length
                    });
                    setExamId(Date.now().toString());
                    setCurrentView('exam');
                }} />;
            case 'settings':
                return <SettingsView />;
            case 'exam':
                return activeExam ? (
                    <ExamView
                        key={examId}
                        data={activeExam}
                        onBack={() => {
                            setCurrentView('dashboard');
                            setExamId(""); // Reset ID for future exams
                        }}
                        onRetake={(failedQuestions) => {
                            setActiveExam({
                                examTitle: `${activeExam.examTitle} (Repaso)`,
                                questions: failedQuestions,
                                totalQuestions: failedQuestions.length
                            });
                        }}
                    />
                ) : null;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col md:flex-row relative">
            {/* Sidebar - Overlay for mobile */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar - Glassmorphic fixed */}
            <aside className={cn(
                "w-72 fixed left-0 top-0 bottom-0 z-50 glass border-r border-white/5 flex flex-col p-6 space-y-10 group transition-transform duration-300 md:translate-x-0",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-brand-cyan/20 text-brand-cyan glow-cyan group-hover:scale-110 transition-transform">
                            <Bot size={24} />
                        </div>
                        <span className="text-xl font-black tracking-tighter text-white">TEST<span className="text-brand-cyan">GEN</span>.AI</span>
                    </div>
                    <button
                        className="md:hidden text-slate-400 hover:text-white"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-grow space-y-2">
                    {sidebarItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setCurrentView(item.id as any);
                                setIsMobileMenuOpen(false);
                            }}
                            className={cn(
                                "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300",
                                "group relative overflow-hidden",
                                currentView === item.id
                                    ? "bg-brand-cyan/10 text-brand-cyan"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <div className={cn(
                                "transition-transform duration-300",
                                currentView === item.id ? "scale-110" : "group-hover:scale-110"
                            )}>
                                {item.icon}
                            </div>
                            <span className="text-sm font-semibold tracking-wide uppercase">{item.label}</span>

                            {currentView === item.id && (
                                <motion.div
                                    layoutId="active-indicator"
                                    className="absolute left-0 top-2 bottom-2 w-1 bg-brand-cyan rounded-r-full"
                                />
                            )}
                        </button>
                    ))}
                </nav>

                <div className="pt-6 border-t border-white/5">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white">JD</div>
                        <div className="text-xs">
                            <p className="font-bold text-white">John Doe</p>
                            <p className="text-slate-500">john@testgen.ai</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="md:ml-72 flex-grow min-h-screen relative overflow-hidden flex flex-col w-full">
                {/* Header - Transparent/Sticky */}
                <header className="sticky top-0 z-30 h-16 md:h-20 px-4 md:px-10 flex items-center justify-between border-b border-white/5 bg-brand-dark/80 backdrop-blur-md">
                    <div className="flex items-center gap-4 flex-1">
                        <button
                            className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu size={24} />
                        </button>

                        <div className="relative w-full max-w-sm group hidden sm:block">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-cyan transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar exámenes..."
                                className="w-full bg-white/5 border border-white/5 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-cyan/50 focus:ring-1 focus:ring-brand-cyan/20 transition-all text-white placeholder-slate-600"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-6">
                        <button className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all outline-none">
                            <User size={18} className="text-slate-400" />
                            <span className="hidden sm:inline text-sm font-medium text-white">Mi Cuenta</span>
                        </button>
                    </div>
                </header>

                {/* Dynamic Content Grid */}
                <div className="p-4 md:p-10 container mx-auto relative z-10 w-full overflow-x-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentView}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Global background glow effects */}
                <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse-slow" />
                <div className="fixed bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-brand-cyan/10 blur-[100px] rounded-full pointer-events-none -z-10 animate-pulse-slow" />
            </main>
        </div >
    );
}
