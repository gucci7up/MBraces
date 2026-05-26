import React, { useEffect, useState } from 'react';
import { User, UserRole } from '../types';
import { Check, X, Shield, User as UserIcon, Mail, Calendar, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';

const UserApproval: React.FC = () => {
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchPendingUsers = async () => {
        setLoading(true);
        try {
            const data = await apiFetch('/api/admin/pending-users');
            setPendingUsers((data || []).map((d: any) => ({
                id: d.id,
                name: d.name,
                role: d.role as UserRole,
                consortiumName: d.consortiumName,
                isApproved: d.isApproved
            })));
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingUsers();
    }, []);

    const handleApprove = async (userId: string) => {
        setProcessingId(userId);
        try {
            await apiFetch(`/api/admin/approve/${encodeURIComponent(userId)}`, { method: 'POST' });

            setPendingUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error('Error approving user:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (userId: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este registro?')) return;

        setProcessingId(userId);
        try {
            await apiFetch(`/api/admin/reject/${encodeURIComponent(userId)}`, { method: 'POST' });

            setPendingUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error('Error rejecting user:', error);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 uppercase">
                        <Shield className="text-emerald-500" />
                        Aprobación de Cuentas
                    </h1>
                    <p className="text-slate-400 text-sm">Gestiona las solicitudes de acceso de nuevos moderadores.</p>
                </div>
                <div className="bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700 text-xs font-bold text-slate-300">
                    {pendingUsers.length} PENDIENTES
                </div>
            </div>

            {pendingUsers.length === 0 ? (
                <div className="bg-slate-800/20 border border-slate-800 rounded-3xl p-12 text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
                        <Check className="text-slate-500" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Sin solicitudes pendientes</h3>
                    <p className="text-slate-500 text-sm">Todos los usuarios registrados han sido procesados.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {pendingUsers.map(user => (
                        <div key={user.id} className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-800/60 transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                    <UserIcon className="text-emerald-400" size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-lg">{user.name}</h4>
                                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                        <span className="flex items-center gap-1">
                                            <Mail size={12} /> {user.id.slice(0, 8)}...
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Shield size={12} /> {user.role}
                                        </span>
                                        {user.consortiumName && (
                                            <span className="bg-slate-700/50 px-2 py-0.5 rounded text-slate-300 uppercase font-black text-[9px]">
                                                {user.consortiumName}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleReject(user.id)}
                                    disabled={processingId === user.id}
                                    className="flex-1 md:flex-none px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-bold border border-red-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <X size={16} /> Rechazar
                                </button>
                                <button
                                    onClick={() => handleApprove(user.id)}
                                    disabled={processingId === user.id}
                                    className="flex-1 md:flex-none px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {processingId === user.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                    Aprobar Cuenta
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UserApproval;
