
import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { RefreshCw, DollarSign, Server, TrendingUp, TrendingDown, ArrowUpRight, Wifi, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchFilteredTransactions, getTerminals, fetchRecentRaces } from '../data/supabaseService';
import { DashboardStats, Transaction, User, UserRole } from '../types';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [recentRaces, setRecentRaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    // Solo mostrar el loading la primera vez para evitar parpadeos cada 10s
    if (recentTransactions.length === 0) setLoading(true);

    try {
      const txs = await fetchFilteredTransactions(user, { limit: 5 });
      const terminals = await getTerminals(user);
      const races = await fetchRecentRaces(user, 5);

      const totalSales = terminals.reduce((acc, curr) => acc + (parseFloat(curr.daily_sales) || 0), 0);
      const totalPayouts = terminals.reduce((acc, curr) => acc + (parseFloat(curr.daily_payouts) || 0), 0);
      const onlineCount = terminals.filter(m => m.status === 'En Línea').length;

      setStats({
        totalMachines: terminals.length,
        onlineMachines: onlineCount,
        totalSales,
        totalPayouts,
        netIncome: totalSales - totalPayouts,
        lastSync: new Date().toLocaleString('es-DO')
      });
      setRecentTransactions(txs);
      setRecentRaces(races);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Actualización cada 10 segundos (según petición del usuario para evitar saturación)
    const interval = setInterval(() => {
      fetchData();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [user]);

  if (loading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Database size={40} className="text-emerald-500 animate-pulse" />
        <p className="text-slate-400 font-medium animate-pulse text-sm">Sincronizando con Collector Supabase...</p>
      </div>
    );
  }

  const chartData = [
    { name: 'Ventas', value: stats.totalSales || 1 },
    { name: 'Pagos', value: stats.totalPayouts || 0 },
  ];
  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Dashboard</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
            {user.role === UserRole.SUPER_ADMIN ? 'Visión Global del Sistema' : user.consortiumName}
          </p>
        </div>
        <button onClick={fetchData} className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-all active:scale-95">
          <RefreshCw size={20} className={loading ? 'animate-spin text-emerald-500' : 'text-slate-400'} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ventas (Collector)</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-slate-900">RD${stats.totalSales.toLocaleString()}</h3>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp size={20} /></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Terminales Online</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-slate-900">{stats.onlineMachines}/{stats.totalMachines}</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Server size={20} /></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Total Pagos</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-slate-900">RD${stats.totalPayouts.toLocaleString()}</h3>
            <div className="p-2 bg-red-50 text-red-600 rounded-xl"><TrendingDown size={20} /></div>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-800 text-white">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Ganancia Neta</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-emerald-400">RD${stats.netIncome.toLocaleString()}</h3>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl"><DollarSign size={20} /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Izquierdo: Gráfico y Carreras */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest mb-6 w-full">Distribución Financiera</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={10} dataKey="value" cornerRadius={12}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-6 mt-4">
              <div className="flex items-center text-[10px] font-bold text-slate-500"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-2"></span> VENTAS</div>
              <div className="flex items-center text-[10px] font-bold text-slate-500"><span className="w-2.5 h-2.5 bg-red-500 rounded-full mr-2"></span> PAGOS</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.2em] mb-4">Últimas Carreras</h3>
            <div className="space-y-3">
              {recentRaces.length === 0 ? (
                <p className="text-center text-slate-400 text-[10px] italic py-4">Esperando resultados...</p>
              ) : (
                recentRaces.map(race => (
                  <div key={race.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-[10px] font-black text-slate-900">Carrera #{race.raceNumber}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{race.terminalName}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {race.winners.split('-').map((n, i) => (
                        <span key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-indigo-400' : 'bg-indigo-300'
                          }`}>
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Lado Derecho: Últimas Jugadas */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">Últimas Jugadas (Collector Sync)</h3>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center bg-emerald-50 px-3 py-1 rounded-full">
              <Wifi size={12} className="mr-1.5 animate-pulse" /> LIVE SYNC
            </span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-50">
                {recentTransactions.length === 0 ? (
                  <tr><td className="p-12 text-center text-slate-400 text-xs italic">Esperando datos del Collector...</td></tr>
                ) : (
                  recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">{tx.machineName}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.ticketId}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${tx.type === 'BET' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                          {tx.type === 'BET' ? 'VENTA' : 'PAGO'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-[11px] font-medium">{tx.date}</td>
                      <td className={`px-6 py-4 text-right font-black ${tx.type === 'BET' ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {tx.type === 'BET' ? '+' : '-'}RD${tx.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
