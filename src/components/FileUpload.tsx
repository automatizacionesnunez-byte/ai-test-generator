"use client";

import React, { useState, useRef } from 'react';
import { Upload, File, X, Eye, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { uploadDocumentToWorkspace, removeDocumentFromWorkspace } from '@/lib/anything-llm';

interface UploadedFile {
    id: string;
    name: string;
    size: string;
    status: 'uploading' | 'completed' | 'error';
    documentPath?: string;
}

export default function FileUpload() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        addFiles(droppedFiles);
    };

    React.useEffect(() => {
        async function fetchWorkspaceFiles() {
            try {
                const allmWorkspace = process.env.NEXT_PUBLIC_ANYTHINGLLM_WORKSPACE || 'test-joaqui';
                const wsRes = await fetch(`/api/vps/workspace/${allmWorkspace}`);
                if (wsRes.ok) {
                    const wsData = await wsRes.json();
                    const docsArray = Array.isArray(wsData?.workspace)
                        ? wsData.workspace[0]?.documents
                        : wsData?.workspace?.documents;

                    const activeDocs = (docsArray || []).map((doc: any) => ({
                        id: doc.id || doc.docId || Math.random().toString(),
                        name: doc.title || (doc.docpath ? doc.docpath.split('/').pop() : "Documento"),
                        size: 'En Workspace',
                        status: 'completed' as const,
                        documentPath: doc.docpath
                    }));
                    setFiles(activeDocs);
                }
            } catch (err) {
                console.error("Error fetching workspace files:", err);
            }
        }
        fetchWorkspaceFiles();
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            addFiles(Array.from(e.target.files));
        }
    };

    const addFiles = async (newFiles: globalThis.File[]) => {
        setIsGlobalLoading(true);

        for (const file of newFiles) {
            const tempId = Math.random().toString(36).substr(2, 9);
            const newFileEntry: UploadedFile = {
                id: tempId,
                name: file.name,
                size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
                status: 'uploading'
            };

            setFiles(prev => [...prev, newFileEntry]);

            try {
                const documentPath = await uploadDocumentToWorkspace(file);
                setFiles(prev => prev.map(f => f.id === tempId ? { ...f, status: 'completed', documentPath } : f));
            } catch (error) {
                console.error('Error uploading to VPS:', error);
                setFiles(prev => prev.map(f => f.id === tempId ? { ...f, status: 'error' } : f));
            }
        }

        setIsGlobalLoading(false);
    };

    const removeFile = async (id: string) => {
        const fileToRemove = files.find(f => f.id === id);

        setFiles(prev => prev.filter(f => f.id !== id));

        if (fileToRemove && fileToRemove.documentPath) {
            try {
                await removeDocumentFromWorkspace(fileToRemove.documentPath);
                console.log(`Document ${fileToRemove.name} removed from workspace.`);
            } catch (error) {
                console.error(`Error removing document from workspace:`, error);
            }
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-white">Subir Temario</h2>
                <p className="text-slate-400">Sube tus archivos PDF o DOCX para generar el examen.</p>
            </div>

            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                    "relative group cursor-pointer transition-all duration-500",
                    "h-64 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4",
                    "glass glass-hover",
                    isDragging ? "border-brand-cyan bg-brand-cyan/10 scale-[0.99]" : "border-white/10",
                )}
            >
                <div className={cn(
                    "p-4 rounded-full transition-transform duration-500",
                    isDragging ? "bg-brand-cyan text-brand-dark scale-110" : "bg-white/5 text-brand-cyan group-hover:scale-110"
                )}>
                    <Upload size={32} />
                </div>

                <div className="text-center">
                    <p className="text-lg font-medium text-white">
                        Arrastra y suelta o <span className="text-brand-cyan">selecciona un archivo</span>
                    </p>
                    <p className="text-sm text-slate-500 mt-1">PDF, DOCX hasta 25MB</p>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileInput}
                    multiple
                    accept=".pdf,.docx"
                />

                {/* Decorative corner glow */}
                <div className="absolute -top-10 -left-10 w-20 h-20 bg-brand-cyan/20 blur-[50px] rounded-full pointer-events-none" />
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Mis Temarios</h3>
                <div className="grid grid-cols-1 gap-3">
                    <AnimatePresence mode="popLayout">
                        {files.map((file) => (
                            <motion.div
                                key={file.id}
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, x: -20 }}
                                className="group relative flex items-center justify-between p-4 rounded-xl glass glass-hover overflow-hidden"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white truncate max-w-[200px] sm:max-w-md">{file.name}</p>
                                        <p className="text-xs text-slate-500">{file.size}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {file.status === 'uploading' && <Loader2 size={18} className="animate-spin text-brand-cyan" />}
                                    {file.status === 'completed' && <CheckCircle2 size={18} className="text-green-500" />}
                                    {file.status === 'error' && <X size={18} className="text-red-500" />}

                                    <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                                        <Eye size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                                        className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Left accent line */}
                                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-brand-cyan scale-y-0 group-hover:scale-y-100 transition-transform duration-300" />
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {files.length === 0 && (
                        <div className="py-12 border border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center text-slate-500 italic">
                            <p>No hay archivos subidos todavía</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
