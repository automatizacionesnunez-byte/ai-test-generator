"use client";

import React from 'react';
import { FileText, Eye, Trash2, Download, Plus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getWorkspaceDocuments } from '@/lib/anything-llm';

export default function FilesView() {
    const [files, setFiles] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        async function fetchFiles() {
            try {
                const allmWorkspace = process.env.NEXT_PUBLIC_ANYTHINGLLM_WORKSPACE || 'test-joaqui';
                const wsRes = await fetch(`/api/vps/workspace/${allmWorkspace}`);
                if (wsRes.ok) {
                    const wsData = await wsRes.json();
                    const docsArray = Array.isArray(wsData?.workspace)
                        ? wsData.workspace[0]?.documents
                        : wsData?.workspace?.documents;

                    const workspaceDocs = (docsArray || []).map((doc: any) => ({
                        id: doc.id || doc.docId,
                        docpath: doc.docpath,
                        name: doc.title || (doc.docpath ? doc.docpath.split('/').pop() : doc.docId || "Documento"),
                        size: 'Documento',
                        date: new Date(doc.createdAt || Date.now()).toLocaleDateString()
                    }));

                    // Filter duplicates by docpath (AnythingLLM sometimes returns duplicated IDs for embedded chunks vs files)
                    const uniqueDocs = Array.from(new Map(workspaceDocs.map((item: any) => [item.docpath || item.id, item])).values());

                    setFiles(uniqueDocs as any);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchFiles();
    }, []);

    const deleteFile = async (docpath: string, id: string) => {
        if (!docpath) {
            alert("No se puede eliminar el archivo porque no tiene una ruta válida.");
            return;
        }

        if (!confirm("¿Seguro que deseas eliminar este documento del workspace?")) return;

        try {
            const ALLM_WORKSPACE = process.env.NEXT_PUBLIC_ANYTHINGLLM_WORKSPACE || 'test-joaqui';
            const response = await fetch(`/api/vps/workspace/${ALLM_WORKSPACE}/update-embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ removes: [docpath] }),
            });

            if (response.ok) {
                setFiles(prev => prev.filter(f => f.id !== id));
            } else {
                alert("Hubo un problema al eliminar el archivo.");
            }
        } catch (e) {
            console.error("Error al eliminar", e);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <h2 className="text-4xl font-black tracking-tight text-white">Mis <span className="text-brand-cyan italic">Archivos</span></h2>
                    <p className="text-slate-400">Gestiona y consulta todos tus materiales de estudio subidos.</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-cyan text-brand-dark font-bold hover:scale-105 transition-transform glow-cyan shadow-lg active:scale-95">
                    <Plus size={20} />
                    <span>Subir Nuevo</span>
                </button>
            </div>

            <div className="relative group max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-cyan transition-colors" />
                <input
                    type="text"
                    placeholder="Filtrar archivos..."
                    className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-cyan/50 transition-all text-white placeholder-slate-600 focus:ring-1 focus:ring-brand-cyan/20"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                    {files.map((file, idx) => (
                        <motion.div
                            key={file.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="group relative p-5 rounded-2xl glass glass-hover border border-white/5 flex items-center justify-between overflow-hidden"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-brand-cyan/10 text-brand-cyan group-hover:scale-110 transition-transform duration-300">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white truncate max-w-[200px]">{file.name}</h3>
                                    <div className="flex gap-3 mt-1">
                                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{file.size}</span>
                                        <span className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">•</span>
                                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{file.date}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all" title="Ver archivo">
                                    <Eye size={18} />
                                </button>
                                <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all" title="Descargar">
                                    <Download size={18} />
                                </button>
                                <button
                                    onClick={() => deleteFile(file.docpath, file.id)}
                                    className="p-2 rounded-lg bg-red-500/10 text-slate-400 hover:text-red-400 hover:bg-red-500/20 transition-all"
                                    title="Eliminar"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            {/* Decorative accent */}
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand-cyan scale-y-0 group-hover:scale-y-100 transition-transform duration-500 origin-top" />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10">
                {[
                    { label: 'Total Archivos', value: files.length.toString(), color: 'text-brand-cyan' },
                    { label: 'Espacio Usado', value: '24.5 MB', color: 'text-indigo-400' },
                    { label: 'Formato más común', value: 'PDF', color: 'text-amber-400' },
                ].map((stat, i) => (
                    <div key={i} className="p-6 rounded-2xl glass border border-white/5 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
                        <p className={cn("text-3xl font-black", stat.color)}>{stat.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Utility copied here because it's simpler for this sandbox-like view logic
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
