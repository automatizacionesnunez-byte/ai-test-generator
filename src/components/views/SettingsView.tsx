"use client";

import React from 'react';
import { Settings, User, Bell, Shield, Sliders, Globe, Volume2, Save, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsView() {
    const sections = [
        { title: 'Mi Cuenta', subtitle: 'Gestiona tu perfil y credenciales.', icon: <User size={20} /> },
        { title: 'IA y Exámenes', subtitle: 'Ajustes del motor de generación.', icon: <Sliders size={20} /> },
        { title: 'Notificaciones', subtitle: 'Personaliza alertas y sonidos.', icon: <Bell size={20} /> },
        { title: 'Seguridad', subtitle: 'Protege tu cuenta con 2FA.', icon: <Shield size={20} /> },
        { title: 'Idioma', subtitle: 'Cambia el lenguaje de la interfaz.', icon: <Globe size={20} /> },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl">
            <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-tight text-white mb-2">Configura tus <span className="text-brand-cyan italic">Ajustes</span></h2>
                <p className="text-slate-400 leading-relaxed">Personaliza tu experiencia de estudio inteligente para que se adapte a tu ritmo.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Navigation Section */}
                <div className="md:col-span-1 space-y-4">
                    <div className="glass rounded-2xl p-4 overflow-hidden border border-white/5 space-y-1">
                        {sections.map((section, idx) => (
                            <button
                                key={idx}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 border border-transparent
                  ${idx === 0 ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                            >
                                {section.icon}
                                <span className="text-sm font-bold uppercase tracking-widest">{section.title}</span>
                            </button>
                        ))}
                    </div>

                    <button className="w-full flex items-center gap-3 px-8 py-4 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all font-black uppercase tracking-widest text-xs border border-red-500/10">
                        <LogOut size={16} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>

                {/* Content Section */}
                <div className="md:col-span-2 space-y-8">
                    <div className="glass rounded-3xl p-8 border border-white/5 space-y-10 relative overflow-hidden">
                        <div className="space-y-6">
                            <h3 className="text-lg font-black text-white italic">Perfil de Usuario</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Nombre Completo</label>
                                    <input type="text" className="w-full bg-white/5 border border-white/5 rounded-xl py-4 px-6 text-sm text-white focus:outline-none focus:border-brand-cyan/50" defaultValue="John Doe" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Correo Electrónico</label>
                                    <input type="email" className="w-full bg-white/5 border border-white/5 rounded-xl py-4 px-6 text-sm text-white focus:outline-none focus:border-brand-cyan/50" defaultValue="john@testgen.ai" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Plan de Suscripción</label>
                                <div className="p-4 rounded-xl bg-gradient-to-r from-brand-cyan/20 via-indigo-500/10 to-transparent border border-brand-cyan/20 flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-brand-cyan text-brand-dark font-black text-xs uppercase shadow-lg shadow-brand-cyan/20">Pro</div>
                                        <span className="text-sm font-bold text-white">Suscripción Anual</span>
                                    </div>
                                    <button className="text-xs font-black uppercase text-brand-cyan hover:underline decoration-brand-cyan/40 underline-offset-4">Cambiar Plan</button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/5 space-y-6">
                            <h3 className="text-lg font-black text-white italic">Preferencias de IA</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between group p-4 rounded-2xl glass-hover hover:border-white/5 border border-transparent">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-white uppercase tracking-widest">Modo Explicación Detallada</p>
                                        <p className="text-xs text-slate-500">Muestra por qué una respuesta es correcta tras fallar.</p>
                                    </div>
                                    <div className="w-12 h-6 bg-brand-cyan rounded-full p-1 cursor-pointer transition-colors relative">
                                        <div className="w-4 h-4 bg-white rounded-full absolute right-1 shadow-sm" />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between group p-4 rounded-2xl glass-hover hover:border-white/5 border border-transparent">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-white uppercase tracking-widest">Feedback por Voz (Beta)</p>
                                        <p className="text-xs text-slate-500">Narra las preguntas de los exámenes.</p>
                                    </div>
                                    <div className="w-12 h-6 bg-slate-800 rounded-full p-1 cursor-pointer transition-colors relative">
                                        <div className="w-4 h-4 bg-slate-500 rounded-full absolute left-1 shadow-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-10">
                            <button className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-brand-cyan text-brand-dark font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform glow-cyan">
                                <Save size={16} />
                                <span>Guardar Cambios</span>
                            </button>
                        </div>

                        {/* Decorative pattern bottom */}
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand-cyan/10 blur-[80px] rounded-full pointer-events-none" />
                    </div>
                </div>
            </div>
        </div>
    );
}
