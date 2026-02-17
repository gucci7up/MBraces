import React, { useState, useEffect } from 'react';
import { Printer } from 'lucide-react';
import ThermalTicket from '../components/ThermalTicket';
import { PrintData, AppSettings, User } from '../types';
import { fetchFilteredTransactions } from '../data/supabaseService';

interface PrintViewProps {
  appSettings: AppSettings;
  user: User;
}

const PrintView: React.FC<PrintViewProps> = ({ appSettings, user }) => {
  const [ticketData, setTicketData] = useState<PrintData>({
    bancaName: appSettings.ticketName || 'MBRACES',
    date: new Date().toLocaleString('es-DO'),
    totalBet: 0,
    totalPaid: 0,
    profit: 0
  });
  const [loading, setLoading] = useState(true);

  // Cargar datos reales del día actual
  useEffect(() => {
    const loadTodayData = async () => {
      setLoading(true);
      const today = new Date().toLocaleDateString('en-CA');

      try {
        const transactions = await fetchFilteredTransactions(user, {
          start: today,
          end: today
        });

        const totalBet = transactions
          .filter(t => t.type === 'BET')
          .reduce((sum, t) => sum + t.amount, 0);

        const totalPaid = transactions
          .filter(t => t.type === 'PAYOUT')
          .reduce((sum, t) => sum + t.amount, 0);

        setTicketData({
          bancaName: appSettings.ticketName || 'MBRACES',
          date: new Date().toLocaleString('es-DO'),
          totalBet,
          totalPaid,
          profit: totalBet - totalPaid
        });
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTodayData();
  }, [user, appSettings]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Impresión Térmica</h2>
          <p className="text-slate-500">Vista previa formato 80mm</p>
        </div>
        <button
          onClick={handlePrint}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl flex items-center space-x-2 font-semibold shadow-lg shadow-emerald-600/20 transition-all transform hover:scale-105"
        >
          <Printer size={20} />
          <span>IMPRIMIR TICKET</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 items-start">
        {/* Configuration Panel */}
        <div className="w-full lg:w-1/2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Datos del Cierre</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nombre Banca (Específica)</label>
              <input
                type="text"
                value={ticketData.bancaName}
                onChange={e => setTicketData({ ...ticketData, bancaName: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg text-sm"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                El encabezado principal usará la configuración global del consorcio: <span className="font-bold">{appSettings.ticketName}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Total Apuestas</label>
                <input
                  type="number"
                  value={ticketData.totalBet}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setTicketData(prev => ({ ...prev, totalBet: val, profit: val - prev.totalPaid }));
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Total Pagos</label>
                <input
                  type="number"
                  value={ticketData.totalPaid}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setTicketData(prev => ({ ...prev, totalPaid: val, profit: prev.totalBet - val }));
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Ganancia Calculada:</span>
                <span className={`font-bold ${ticketData.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  RD${ticketData.profit.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-400 pt-4">
              <p>* Esta vista simula la generación de reportes ESC/POS.</p>
              <p>* Al hacer clic en imprimir, solo saldrá el ticket.</p>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="w-full lg:w-1/2 flex justify-center bg-slate-200/50 p-8 rounded-xl border border-dashed border-slate-300 min-h-[500px] items-center">
          <ThermalTicket
            data={ticketData}
            logoUrl={appSettings.ticketLogo}
            headerName={appSettings.ticketName}
            systemName={appSettings.appName}
          />
        </div>
      </div>
    </div>
  );
};

export default PrintView;