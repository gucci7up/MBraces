import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, Loader2, Calendar, Dog } from 'lucide-react';

const AuthScreen: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [dob, setDob] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            dob: dob,
                        }
                    }
                });
                if (error) throw error;

                // Si el autoconfirm está activado o ya se creó el usuario en auth.users
                if (data.user) {
                    // Intentamos crear el perfil manualmente por si no hay trigger en Supabase
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .insert([
                            {
                                id: data.user.id,
                                name: fullName,
                                role: 'Moderador',
                                is_approved: false,
                                // Podríamos añadir dob aquí también si actualizamos la tabla profiles
                            }
                        ]);

                    // Si falla el insert manual (probablemente por PK duplicated si ya hay un trigger), lo ignoramos
                    if (profileError && !profileError.message.includes('duplicate key')) {
                        console.error("Error creating profile:", profileError);
                    }
                }

                setMessage('Registro exitoso. Espera la aprobación del administrador.');
                setIsLogin(true);
            }
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error inesperado');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600/10 rounded-full blur-[120px]"></div>

            <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden relative z-10">
                {/* Left Side: Illustration / Text */}
                <div className="p-12 flex flex-col justify-center text-white hidden md:flex bg-gradient-to-br from-orange-900/20 to-transparent">
                    <div className="flex items-center space-x-2 mb-8">
                        <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center font-bold text-xl italic">
                            <Dog size={24} className="text-white" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">MBRACES</span>
                    </div>

                    <h1 className="text-5xl font-bold mb-4 leading-tight">
                        {isLogin ? '¿Listo para la Carrera?' : 'Crear\nNueva Cuenta'}
                    </h1>
                    <p className="text-slate-400 text-lg mb-8 leading-relaxed max-w-sm">
                        {isLogin
                            ? 'Bienvenido al panel administrativo de MBRACES. Ingrese sus credenciales para gestionar sus terminales.'
                            : '¿Ya estás registrado? Inicia sesión para acceder a tu panel y gestionar tus máquinas.'}
                    </p>

                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-orange-500 font-semibold flex items-center hover:text-orange-400 transition-colors"
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
                <div className="p-8 md:p-12 flex flex-col justify-center bg-white/5">
                    <div className="md:hidden text-center mb-8">
                        <h1 className="text-3xl font-bold text-white">{isLogin ? 'Entrar' : 'Registrarse'}</h1>
                    </div>

                    <div className="mb-8 hidden md:block">
                        <h2 className="text-3xl font-bold text-white text-center">{isLogin ? 'Iniciar Sesión' : 'Registro de Usuario'}</h2>
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
                                            className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all placeholder:text-slate-600"
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
                                    className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all placeholder:text-slate-600"
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
                                    className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all placeholder:text-slate-600"
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
                                        className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all appearance-none cursor-pointer [color-scheme:dark]"
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

                        {message && (
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all shadow-lg shadow-orange-900/20 flex items-center justify-center space-x-2 text-lg active:scale-[0.98]"
                        >
                            {loading ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : (
                                <span>{isLogin ? 'Entrar al Sistema' : 'Crear Cuenta'}</span>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 flex md:hidden items-center justify-center space-x-2">
                        <span className="text-slate-400">{isLogin ? '¿No tienes cuenta?' : '¿Ya estás registrado?'}</span>
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-orange-500 font-bold"
                        >
                            {isLogin ? 'Regístrate' : 'Entrar'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom dots/patterns */}
            <div className="absolute bottom-10 right-10 flex space-x-2 opacity-20">
                <div className="grid grid-cols-4 gap-2">
                    {[...Array(16)].map((_, i) => (
                        <div key={i} className="w-1 h-1 bg-white rounded-full"></div>
                    ))}
                </div>
            </div>

            <div className="absolute top-10 left-[20%] flex space-x-2 opacity-10">
                <div className="grid grid-cols-8 gap-4">
                    {[...Array(32)].map((_, i) => (
                        <div key={i} className="w-1 h-1 bg-white rounded-full"></div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;
