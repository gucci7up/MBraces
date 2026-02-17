
import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Power, Wifi, WifiOff, Shield, Database, Loader2, Key, Copy, Check } from 'lucide-react';
// Fix: Removed createTerminal as it is not exported from supabaseService and not used in this component
// Fix: Added createTerminal import
import { getTerminals, createTerminal } from '../data/supabaseService';
import { Machine, MachineStatus, User, UserRole } from '../types';
import { X } from 'lucide-react';

interface MachinesProps {
  user: User;
}

const Machines: React.FC<MachinesProps> = ({ user }) => {
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [newMachine, setNewMachine] = useState({
    name: '',
    address: '',
    phone: '',
    manager: '',
    type: 'Banca'
  });

  const loadMachines = async () => {
    setLoading(true);
    try {
      const data = await getTerminals(user);
      setMachines(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, [user]);

  const handleCopyToken = (token: string) => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachine.name) return;

    setIsSaving(true);
    try {
      await createTerminal(user, newMachine);
      setShowModal(false);
      setNewMachine({ name: '', address: '', phone: '', manager: '', type: 'Banca' });
      await loadMachines();
    } catch (err) {
      alert("Error al crear la máquina");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredMachines = machines.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Terminales</h1>
          <p className="text-slate-500 mt-1">
            {user.role === UserRole.SUPER_ADMIN
              ? 'Vista Global (Todos los Consorcios)'
              : `Terminales de ${user.consortiumName}`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
        >
          <Plus size={18} />
          <span className="font-bold uppercase text-xs tracking-widest">Nueva Máquina</span>
        </button>
      </div>

      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200/60 flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            className="w-full pl-11 pr-4 py-3 bg-transparent rounded-lg focus:outline-none text-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Loader2 size={32} className="text-emerald-500 animate-spin mb-4" />
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Consultando Supabase...</p>
          </div>
        ) : filteredMachines.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No hay máquinas registradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Terminal</th>
                  <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Auth Token</th>
                  <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest text-right">Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredMachines.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${m.status === 'En Línea' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          <Database size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{m.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{m.ip_address || 'Sin IP'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {m.auth_token ? (
                        <div className="flex items-center space-x-2">
                          <div className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-mono text-[10px] flex items-center">
                            <Key size={12} className="mr-2 text-indigo-500" />
                            {m.auth_token.substring(0, 13)}...
                          </div>
                          <button
                            onClick={() => handleCopyToken(m.auth_token)}
                            className={`p-1.5 rounded-lg transition-all ${copiedToken === m.auth_token ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                          >
                            {copiedToken === m.auth_token ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">No generado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-slate-400 text-xs">{m.last_sync ? new Date(m.last_sync).toLocaleTimeString() : 'Nunca'}</div>
                      <div className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${m.status === 'En Línea' ? 'text-emerald-500' : 'text-slate-300'}`}>
                        {m.status}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL NUEVA MÁQUINA */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl border border-white overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-8 py-6 border-b flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-900">Nueva Máquina</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Registrar terminal v1.0</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre de Terminal</label>
                <input
                  required
                  type="text"
                  value={newMachine.name}
                  onChange={e => setNewMachine({ ...newMachine, name: e.target.value })}
                  placeholder="Ej: Máquina Central"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 font-bold text-slate-700 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
                  <select
                    value={newMachine.type}
                    onChange={e => setNewMachine({ ...newMachine, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 font-bold text-slate-700"
                  >
                    <option value="Banca">Banca</option>
                    <option value="Colmado">Colmado</option>
                    <option value="Sport Bar">Sport Bar</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                  <input
                    type="text"
                    value={newMachine.phone}
                    onChange={e => setNewMachine({ ...newMachine, phone: e.target.value })}
                    placeholder="809-000-0000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección</label>
                <input
                  type="text"
                  value={newMachine.address}
                  onChange={e => setNewMachine({ ...newMachine, address: e.target.value })}
                  placeholder="Ubición física de la terminal"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 font-bold text-slate-700"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <span>REGISTRAR TERMINAL</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Machines;
