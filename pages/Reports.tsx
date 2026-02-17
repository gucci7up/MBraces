
import React, { useState, useEffect } from 'react';
import { Calendar, Download, FileSpreadsheet, Trash2, Filter, Search, Printer, FileText, Loader2 } from 'lucide-react';
import { fetchFilteredTransactions, getTerminals } from '../data/supabaseService';
import { Transaction, User, Machine, AppSettings } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  user: User;
  appSettings?: AppSettings;
}

const Reports: React.FC<ReportsProps> = ({ user, appSettings }) => {
  // Agregar estilos de impresión
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        .no-print {
          display: none !important;
        }
        .print-area {
          display: block !important;
        }
        @page {
          size: letter;
          margin: 1cm;
        }
        table {
          page-break-inside: auto;
        }
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userMachines, setUserMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateStart, setDateStart] = useState(new Date().toLocaleDateString('en-CA'));
  const [dateEnd, setDateEnd] = useState(new Date().toLocaleDateString('en-CA'));
  const [selectedMachine, setSelectedMachine] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const [txs, machines] = await Promise.all([
        fetchFilteredTransactions(user, { terminalId: selectedMachine, start: dateStart, end: dateEnd }),
        getTerminals(user)
      ]);
      setTransactions(txs);
      setUserMachines(machines);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, selectedMachine, dateStart, dateEnd]);

  const totalBet = transactions.filter(t => t.type === 'BET').reduce((sum, t) => sum + t.amount, 0);
  const totalPayout = transactions.filter(t => t.type === 'PAYOUT').reduce((sum, t) => sum + t.amount, 0);
  const profit = totalBet - totalPayout;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(appSettings?.ticketName || 'MBRACES', 14, 22);
    autoTable(doc, {
      startY: 40,
      head: [['Ticket', 'Fecha', 'Terminal', 'Tipo', 'NUMERO', 'Monto']],
      body: transactions.map(t => [t.ticketId, t.date, t.machineName, t.playType || t.type, t.numbers || '-', `RD$${t.amount.toLocaleString()}`]),
    });
    doc.save('reporte.pdf');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end no-print">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reportes</h1>
          <p className="text-slate-500 mt-1">Sincronizado con base de datos centralizada.</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={handleExportPDF} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center space-x-2">
            <FileText size={16} /> <span>PDF</span>
          </button>
          <button onClick={() => window.print()} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center space-x-2">
            <Printer size={16} /> <span>Imprimir</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <select value={selectedMachine} onChange={e => setSelectedMachine(e.target.value)} className="bg-white border rounded-xl px-4 py-3 outline-none text-sm font-bold">
          <option value="ALL">Todas las terminales</option>
          {userMachines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="bg-white border rounded-xl px-4 py-3 outline-none text-sm font-bold" />
        <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="bg-white border rounded-xl px-4 py-3 outline-none text-sm font-bold" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Total Ventas</p>
          <p className="text-2xl font-black text-slate-900">RD${totalBet.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Total Pagos</p>
          <p className="text-2xl font-black text-slate-900">RD${totalPayout.toLocaleString()}</p>
        </div>
        <div className="bg-emerald-600 p-6 rounded-3xl shadow-lg shadow-emerald-600/20 text-white">
          <p className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.2em] mb-4">Ganancia Neta</p>
          <p className="text-2xl font-black">RD${profit.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden no-print">
        {loading ? (
          <div className="p-20 flex flex-col items-center">
            <Loader2 className="animate-spin text-emerald-500 mb-4" size={32} />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Filtrando datos...</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Ticket</th>
                <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Terminal</th>
                <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Tipo</th>
                <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">NUMERO</th>
                <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-xs font-mono">{t.ticketId}</td>
                  <td className="px-6 py-4 font-bold text-slate-700">{t.machineName}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${t.type === 'BET' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                      {t.playType || t.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-black text-slate-600">
                    {t.numbers || <span className="text-slate-300">-</span>}
                  </td>
                  <td className={`px-6 py-4 text-right font-black ${t.type === 'BET' ? 'text-emerald-600' : 'text-slate-900'}`}>
                    RD${t.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PRINT-ONLY SECTION */}
      <div className="print-area hidden md:block" style={{ visibility: 'hidden', height: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
            {appSettings?.ticketName || 'MBRACES'}
          </h1>
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Reporte de Transacciones</h2>
          <p style={{ marginBottom: '10px' }}>
            <strong>Período:</strong> {dateStart} - {dateEnd}
          </p>
          <p style={{ marginBottom: '10px' }}>
            <strong>Terminal:</strong> {selectedMachine === 'ALL' ? 'Todas' : userMachines.find(m => m.id === selectedMachine)?.name}
          </p>

          <div style={{ marginTop: '20px', marginBottom: '20px', display: 'flex', gap: '20px' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#666' }}>Total Ventas</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold' }}>RD${totalBet.toLocaleString()}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#666' }}>Total Pagos</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold' }}>RD${totalPayout.toLocaleString()}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#666' }}>Ganancia Neta</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold' }}>RD${profit.toLocaleString()}</p>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000' }}>
                <th style={{ padding: '8px', textAlign: 'left', fontSize: '10px' }}>Ticket</th>
                <th style={{ padding: '8px', textAlign: 'left', fontSize: '10px' }}>Fecha</th>
                <th style={{ padding: '8px', textAlign: 'left', fontSize: '10px' }}>Terminal</th>
                <th style={{ padding: '8px', textAlign: 'left', fontSize: '10px' }}>Tipo</th>
                <th style={{ padding: '8px', textAlign: 'left', fontSize: '10px' }}>Número</th>
                <th style={{ padding: '8px', textAlign: 'right', fontSize: '10px' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '6px', fontSize: '9px' }}>{t.ticketId}</td>
                  <td style={{ padding: '6px', fontSize: '9px' }}>{t.date}</td>
                  <td style={{ padding: '6px', fontSize: '9px' }}>{t.machineName}</td>
                  <td style={{ padding: '6px', fontSize: '9px' }}>{t.type}</td>
                  <td style={{ padding: '6px', fontSize: '9px' }}>{t.numbers || '-'}</td>
                  <td style={{ padding: '6px', textAlign: 'right', fontSize: '9px' }}>RD${t.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
