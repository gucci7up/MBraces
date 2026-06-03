import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, Loader2, Calendar } from 'lucide-react';
import { getAppSettings } from '../data/supabaseService';
import { AppSettings } from '../types';
import { apiFetch, setToken } from '../lib/api';

const AuthScreen: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [dob, setDob] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
    const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
    const isApiConfigured = Boolean(apiUrl);
    const isDisabled = loading || !isApiConfigured;

    React.useEffect(() => {
        const fetchSettings = async () => {
            const settings = await getAppSettings();
            if (settings) {
                setAppSettings(settings);
            }
        };
        fetchSettings();
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        if (!isApiConfigured) {
            setError('API no configurada. Crea un archivo .env con VITE_API_URL (ver .env.example) y reinicia el servidor.');
            setLoading(false);
            return;
        }

        try {
            if (isLogin) {
                const data = await apiFetch('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });
                setToken(String(data?.token || ''));
                window.dispatchEvent(new Event('auth-changed'));
            } else {
                await apiFetch('/api/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ email, password, fullName, dob })
                });
                setMessage('Registro exitoso. Espera la aprobación del administrador.');
                setIsLogin(true);
            }
        } catch (err: any) {
            const raw = String(err?.message || '');
            const normalized = raw.toLowerCase();
            if (normalized.includes('credenciales')) {
                setError('Credenciales inválidas. Verifica email/contraseña.');
            } else if (normalized.includes('email')) {
                setError(raw);
            } else {
                setError(raw || 'Ocurrió un error inesperado');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center p-4 relative overflow-hidden font-sans">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]"></div>

            <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white border border-slate-200 rounded-[2rem] shadow-lg overflow-hidden relative z-10">
                {/* Left Side: Illustration / Text */}
                <div className="p-12 flex flex-col justify-center text-slate-900 hidden md:flex bg-gradient-to-br from-emerald-50 to-white">
                    <div className="flex items-center space-x-2 mb-8">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden bg-[#059669] shadow-sm border border-slate-200">
                            {appSettings?.appLogo ? (
                                <img src={appSettings.appLogo} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <span className="font-black text-white text-xl">G</span>
                            )}
                        </div>
                        <span className="text-2xl font-black tracking-tight">{appSettings?.appName || 'MBRACES'}</span>
                    </div>

                    <h1 className="text-5xl font-bold mb-4 leading-tight">
                        {isLogin ? '¿Listo para la Carrera?' : 'Crear\nNueva Cuenta'}
                    </h1>
                    <p className="text-slate-600 text-lg mb-8 leading-relaxed max-w-sm">
                        {isLogin
                            ? 'Bienvenido al panel administrativo de MBRACES. Ingrese sus credenciales para gestionar sus terminales.'
                            : '¿Ya estás registrado? Inicia sesión para acceder a tu panel y gestionar tus máquinas.'}
                    </p>

                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-emerald-700 font-black flex items-center hover:text-emerald-800 transition-colors"
                    >
                        {isLogin ? '¿No tienes una cuenta? Regístrate' : '¿Ya tienes una cuenta? Entrar'}
                    </button>

                    <div className="mt-auto pt-12">
                        <div className="w-12 h-1 bg-white/20 mb-6"></div>
                        <p className="text-xs text-slate-500 max-w-xs uppercase tracking-widest leading-loose">
                            Plataforma de gestión centralizada para terminales de carreras de galgos.
                        </p>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
                    <div className="md:hidden text-center mb-8">
                        <h1 className="text-3xl font-black text-slate-900">{isLogin ? 'Entrar' : 'Registrarse'}</h1>
                    </div>

                    <div className="mb-8 hidden md:block">
                        <h2 className="text-3xl font-black text-slate-900 text-center">{isLogin ? 'Iniciar Sesión' : 'Registro de Usuario'}</h2>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-6">
                        <AnimatePresence mode='wait'>
                            {!isLogin && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-1"
                                >
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Nombre Completo</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <UserIcon size={18} className="text-slate-500" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all placeholder:text-slate-400"
                                            placeholder="Nombre del Administrador"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Correo Electrónico</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail size={18} className="text-slate-500" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all placeholder:text-slate-400"
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Contraseña</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock size={18} className="text-slate-500" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all placeholder:text-slate-400"
                                    placeholder="••••••••••••"
                                />
                            </div>
                        </div>

                        {!isLogin && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Fecha de Nacimiento</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Calendar size={18} className="text-slate-500" />
                                    </div>
                                    <input
                                        type="date"
                                        required
                                        value={dob}
                                        onChange={(e) => setDob(e.target.value)}
                                        className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                        <LogIn size={14} className="text-slate-500 rotate-90" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {!isApiConfigured && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                API no configurada. Crea un archivo .env con VITE_API_URL (ver .env.example) y reinicia el servidor.
                            </div>
                        )}

                        {message && (
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isDisabled}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all shadow-sm flex items-center justify-center space-x-2 text-lg active:scale-[0.98]"
                        >
                            {loading ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : (
                                <span>{isLogin ? 'Entrar al Sistema' : 'Crear Cuenta'}</span>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 flex md:hidden items-center justify-center space-x-2">
                        <span className="text-slate-500">{isLogin ? '¿No tienes cuenta?' : '¿Ya estás registrado?'}</span>
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-emerald-700 font-black"
                        >
                            {isLogin ? 'Regístrate' : 'Entrar'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom dots/patterns */}
            <div className="absolute bottom-10 right-10 flex space-x-2 opacity-30">
                <div className="grid grid-cols-4 gap-2">
                    {[...Array(16)].map((_, i) => (
                        <div key={i} className="w-1 h-1 bg-slate-300 rounded-full"></div>
                    ))}
                </div>
            </div>

            <div className="absolute top-10 left-[20%] flex space-x-2 opacity-20">
                <div className="grid grid-cols-8 gap-4">
                    {[...Array(32)].map((_, i) => (
                        <div key={i} className="w-1 h-1 bg-slate-300 rounded-full"></div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;
