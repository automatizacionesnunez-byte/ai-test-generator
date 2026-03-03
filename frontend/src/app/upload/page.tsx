'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDocuments, uploadDocument, deleteDocument } from '@/lib/api';
import Link from 'next/link';

type DocItem = { id: string; title: string; fileType: string; topics: string[] | null; createdAt: string };

export default function UploadPage() {
    const [docs, setDocs] = useState<DocItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState('');
    const [deleting, setDeleting] = useState<string | null>(null);

    const load = useCallback(async () => {
        try { setDocs(await getDocuments()); } catch { /* */ }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleFile = async (file: File) => {
        setUploading(true);
        setUploadMsg('');
        try {
            await uploadDocument(file, file.name.replace(/\.[^.]+$/, ''));
            setUploadMsg('✅ Temario subido y procesado correctamente');
            await load();
        } catch {
            setUploadMsg('❌ Error al subir el archivo');
        }
        setUploading(false);
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`¿Eliminar "${title}"? Se borrarán también los tests asociados.`)) return;
        setDeleting(id);
        try {
            await deleteDocument(id);
            await load();
            setUploadMsg('🗑️ Temario eliminado');
        } catch {
            setUploadMsg('❌ Error al eliminar');
        }
        setDeleting(null);
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            {/* Nav */}
            <div className="flex items-center justify-between mb-8">
                <Link href="/" className="text-sm text-indigo-600 font-medium hover:underline">← Volver al inicio</Link>
                <h1 className="text-lg font-bold text-slate-800">Mis Temarios</h1>
                <div className="w-20" />
            </div>

            {/* Upload Area */}
            <div
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer mb-8
          ${uploading ? 'border-indigo-400 bg-indigo-50 animate-pulse' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); }}
                onClick={() => document.getElementById('fileUp')?.click()}
            >
                <input id="fileUp" type="file" className="hidden" accept=".pdf,.txt" multiple
                    onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
                <div className="text-5xl mb-3">📄</div>
                <p className="font-semibold text-slate-700 text-lg">
                    {uploading ? 'Subiendo y procesando...' : 'Arrastra o haz clic para subir'}
                </p>
                <p className="text-sm text-slate-400 mt-1">PDF o TXT · máx 10 MB</p>
            </div>

            {uploadMsg && (
                <p className={`text-sm text-center mb-6 ${uploadMsg.startsWith('✅') || uploadMsg.startsWith('🗑') ? 'text-green-600' : 'text-red-600'}`}>{uploadMsg}</p>
            )}

            {/* List */}
            {docs.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No hay temarios subidos todavía</p>
            ) : (
                <div className="space-y-3">
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">{docs.length} temario{docs.length > 1 ? 's' : ''}</p>
                    {docs.map((d) => (
                        <div key={d.id} className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center justify-between hover:shadow-sm transition-shadow">
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-800 truncate">📄 {d.title}</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {d.fileType.includes('pdf') ? 'PDF' : 'TXT'}
                                    {' · '}{new Date(d.createdAt).toLocaleDateString('es-ES')}
                                    {d.topics && Array.isArray(d.topics) && d.topics.length > 0 && (
                                        <> · Temas: {(d.topics as string[]).join(', ')}</>
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 ml-3 shrink-0">
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Listo</span>
                                <button
                                    onClick={() => handleDelete(d.id, d.title)}
                                    disabled={deleting === d.id}
                                    className={`text-slate-300 hover:text-red-500 transition-colors text-lg ${deleting === d.id ? 'animate-spin' : ''}`}
                                    title="Eliminar temario"
                                >
                                    {deleting === d.id ? '⏳' : '×'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
