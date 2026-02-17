
import React, { useState, useEffect } from 'react';
import { Coins, Settings, Radio, Lock, Database, Info } from 'lucide-react';
import { getTerminals } from '../data/supabaseService';
import { User, UserRole } from '../types';

interface JackpotProps {
  user: User;
}

interface TerminalJackpot {
  terminalId: string;
  terminalName: string;
  jack: number;
  jackweb: number;
  maxjack: number;
  maxjackweb: number;
}

const Jackpot: React.FC<JackpotProps> = ({ user }) => {
  const [terminals, setTerminals] = useState<TerminalJackpot[]>([]);
  const [loading, setLoading] = useState(true);

  const canEdit = user.role === UserRole.SUPER_ADMIN;

  useEffect(() => {
    const loadJackpots = async () => {
      try {
        const terminalData = await getTerminals(user);

        const jackpots: TerminalJackpot[] = terminalData.map(t => ({
          terminalId: t.id,
          terminalName: t.name,
          jack: t.ini_content?.DOG?.jack || 0,
          jackweb: t.ini_content?.DOG?.jackweb || 0,
          maxjack: t.ini_content?.DOG?.maxjack || 0,
          maxjackweb: t.ini_content?.DOG?.maxjackweb || 0
        }));

        setTerminals(jackpots);
        setLoading(false);
      } catch (error) {
        console.error('Error loading jackpots:', error);
        setLoading(false);
      }
    };

    loadJackpots();

    // Recargar cada 10 segundos
    const interval = setInterval(loadJackpots, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const totalJackpot = terminals.reduce((sum, t) => sum + t.jack, 0);

  if (loading) {
    return (
      <div className="p-20 text-center flex flex-col items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mb-4"></div>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Sincronizando Pozo en Vivo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Acumulados</h1>
          <p className="text-slate-500 mt-1 flex items-center">
            Monitoreo en vivo de los premios de las terminales
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">
              <Database size={10} className="mr-1" /> SQL Sync
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">

        {/* BIG VISUAL DISPLAY */}
        <div className="bg-slate-900 rounded-[2.5rem] p-10 md:p-16 text-white shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[450px] border border-slate-800">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-amber-500/10 via-transparent to-transparent pointer-events-none"></div>
          <div className="absolute -right-20 -bottom-20 opacity-5 transform rotate-12 pointer-events-none">
            <Coins size={400} />
          </div>

          <div className="relative z-10 text-center space-y-6">
            <div className="inline-flex items-center space-x-3 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full mb-4">
              <Radio size={16} className="text-amber-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Global Jackpot Feed</span>
            </div>

            <h2 className="text-slate-500 font-black text-xs uppercase tracking-[0.3em]">Total Acumulado</h2>

            <div className="text-5xl md:text-8xl font-black tracking-tighter tabular-nums bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent drop-shadow-2xl">
              RD${totalJackpot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            <div className="pt-8 flex flex-col items-center">
              <div className="flex space-x-1.5 mb-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: `${i * 200}ms` }}></div>
                ))}
              </div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest max-w-xs leading-relaxed">
                Valores sincronizados desde el archivo .INI de cada terminal activa.
              </p>
            </div>
          </div>
        </div>

        {/* INFO CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-start space-x-6">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Settings size={28} />
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest mb-2">Ajuste de Parámetros</h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">Los límites de Jackpot (Min/Max) y el % de aporte se configuran individualmente por consorcio en la sección de Configuración.</p>
              <div className="flex items-center text-[10px] font-black text-indigo-600 uppercase">
                <Info size={14} className="mr-1.5" /> Afecta al archivo .ini local
              </div>
            </div>
          </div>

          <div className={`bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-start space-x-6 ${!canEdit ? 'grayscale opacity-60' : ''}`}>
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl">
              <Lock size={28} />
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest mb-2">Control de Seguridad</h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">Solo administradores autorizados pueden resetear o inyectar fondos directamente al acumulado del servidor.</p>
              <button disabled={!canEdit} className="text-[10px] font-black bg-slate-900 text-white px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:cursor-not-allowed">
                {canEdit ? 'Resetear Jackpot' : 'Acceso Bloqueado'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Jackpot;
