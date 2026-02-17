
import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { RefreshCw, DollarSign, Server, TrendingUp, TrendingDown, ArrowUpRight, Wifi, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchFilteredTransactions, getTerminals } from '../data/supabaseService';
import { DashboardStats, Transaction, User, UserRole } from '../types';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Use the correct function names from supabaseService.ts
      const txs = await fetchFilteredTransactions(user);
      const terminals = await getTerminals(user);

      // La suma de ventas y pagos viene directamente del colector en tiempo real vía la tabla terminals
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
      setRecentTransactions(txs.slice(0, 10));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Suscripción Realtime para estadísticas y nuevos tickets
    const channel = supabase
      .channel('dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'terminals' }, () => fetchData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sync_tickets' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
          <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest mb-6 w-full">Distribución Financiera</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={10} dataKey="value" cornerRadius={12}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 mt-4">
            <div className="flex items-center text-[11px] font-bold text-slate-500"><span className="w-3 h-3 bg-emerald-500 rounded-full mr-2"></span> VENTAS</div>
            <div className="flex items-center text-[11px] font-bold text-slate-500"><span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span> PAGOS</div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">Últimas Jugadas (SQLite Sync)</h3>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center bg-emerald-50 px-3 py-1 rounded-full">
              <Wifi size={12} className="mr-1.5 animate-pulse" /> LIVE SYNC
            </span>
          </div>
          <div className="overflow-x-auto">
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
