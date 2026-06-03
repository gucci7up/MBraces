import React, { useEffect, useState } from 'react';
import { User, UserRole } from '../types';
import { Check, X, Shield, User as UserIcon, Mail, Loader2, Power, Save } from 'lucide-react';
import { apiFetch } from '../lib/api';

type AdminUser = User & {
    email: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
};

const UserApproval: React.FC = () => {
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [tab, setTab] = useState<'pending' | 'users'>('pending');
    const [loading, setLoading] = useState(true);
    const [usersLoading, setUsersLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [processingUserId, setProcessingUserId] = useState<string | null>(null);

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

    const fetchUsers = async () => {
        setUsersLoading(true);
        try {
            const data = await apiFetch('/api/admin/users');
            setUsers((data || []).map((d: any) => ({
                id: d.id,
                name: d.name,
                email: d.email,
                role: d.role as UserRole,
                consortiumName: d.consortiumName,
                isApproved: Boolean(d.isApproved),
                isActive: Boolean(d.isActive),
                createdAt: d.createdAt,
                updatedAt: d.updatedAt
            })));
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setUsersLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingUsers();
    }, []);

    useEffect(() => {
        if (tab !== 'users') return;
        if (users.length > 0) return;
        fetchUsers();
    }, [tab]);

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

    const handleUpdateRole = async (userId: string, role: UserRole) => {
        setProcessingUserId(userId);
        try {
            await apiFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
                method: 'PUT',
                body: JSON.stringify({ role })
            });
            setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role } : u)));
        } catch (error) {
            console.error('Error updating role:', error);
        } finally {
            setProcessingUserId(null);
        }
    };

    const handleToggleActive = async (user: AdminUser) => {
        const next = user.isActive ? 'deactivate' : 'activate';
        const label = user.isActive ? 'desactivar' : 'activar';
        if (!confirm(`¿Seguro que deseas ${label} esta cuenta?`)) return;

        setProcessingUserId(user.id);
        try {
            await apiFetch(`/api/admin/users/${encodeURIComponent(user.id)}/${next}`, { method: 'POST' });
            setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, isActive: !u.isActive } : u)));
        } catch (error) {
            console.error('Error toggling active:', error);
        } finally {
            setProcessingUserId(null);
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
                        Usuarios
                    </h1>
                    <p className="text-slate-400 text-sm">Aprueba, edita roles y activa/desactiva cuentas.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setTab('pending')}
                        className={`px-4 py-2 rounded-full border text-xs font-black uppercase transition-all ${tab === 'pending' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-200' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800/70'}`}
                    >
                        Pendientes ({pendingUsers.length})
                    </button>
                    <button
                        onClick={() => setTab('users')}
                        className={`px-4 py-2 rounded-full border text-xs font-black uppercase transition-all ${tab === 'users' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-200' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800/70'}`}
                    >
                        Todos ({users.length || '—'})
                    </button>
                    <button
                        onClick={() => {
                            if (tab === 'pending') fetchPendingUsers();
                            else fetchUsers();
                        }}
                        className="px-4 py-2 rounded-full border bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800/70 text-xs font-black uppercase transition-all flex items-center gap-2"
                    >
                        <Save size={14} />
                        Actualizar
                    </button>
                </div>
            </div>

            {tab === 'pending' ? (
                pendingUsers.length === 0 ? (
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
                )
            ) : (
                usersLoading ? (
                    <div className="flex items-center justify-center p-20">
                        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="bg-slate-800/20 border border-slate-800 rounded-3xl p-12 text-center">
                        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
                            <UserIcon className="text-slate-500" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">Sin usuarios</h3>
                        <p className="text-slate-500 text-sm">Crea usuarios desde la pantalla de registro.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {users.map(u => (
                            <div key={u.id} className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-slate-800/60 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform ${u.isActive ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                        <UserIcon className={u.isActive ? 'text-emerald-400' : 'text-red-400'} size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-lg">{u.name}</h4>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Mail size={12} /> {u.email}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Shield size={12} /> {u.role}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${u.isApproved ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-200 border border-amber-500/20'}`}>
                                                {u.isApproved ? 'APROBADO' : 'PENDIENTE'}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${u.isActive ? 'bg-slate-700/50 text-slate-200 border border-slate-600/30' : 'bg-red-500/10 text-red-200 border border-red-500/20'}`}>
                                                {u.isActive ? 'ACTIVO' : 'DESACTIVADO'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                    <select
                                        value={u.role}
                                        onChange={(e) => handleUpdateRole(u.id, e.target.value as UserRole)}
                                        disabled={processingUserId === u.id}
                                        className="px-4 py-2 rounded-xl bg-slate-900/40 border border-slate-700 text-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    >
                                        <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                                        <option value={UserRole.MODERATOR}>Moderador</option>
                                    </select>
                                    <button
                                        onClick={() => handleToggleActive(u)}
                                        disabled={processingUserId === u.id}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${u.isActive ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/20' : 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600/30 shadow-lg shadow-emerald-900/20'}`}
                                    >
                                        {processingUserId === u.id ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
                                        {u.isActive ? 'Desactivar' : 'Activar'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
};

export default UserApproval;
