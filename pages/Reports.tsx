
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Download, FileSpreadsheet, Trash2, Filter, Search, Printer, FileText, Loader2, XCircle, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import { fetchFilteredTransactions, getTerminals, voidTransaction } from '../data/supabaseService';
import { Transaction, User, Machine, AppSettings } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ThermalReport from '../components/ThermalReport';

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
        @page {
          size: letter;
          margin: 0.5cm;
        }
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        .no-print {
          display: none !important;
        }
        /* Asegurar que la tabla se vea bien */
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          font-size: 10px;
        }
        th {
          background-color: #f3f4f6 !important;
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
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction | 'calculatedNumbers', direction: 'asc' | 'desc' } | null>({ key: 'numbers', direction: 'asc' });

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

  const activeTransactions = transactions.filter(t => t.status !== 'voided');

  const sortedTransactions = useMemo(() => {
    let sortableItems = [...transactions];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof Transaction] || '';
        const bValue = b[sortConfig.key as keyof Transaction] || '';

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [transactions, sortConfig]);

  const totalBet = activeTransactions.filter(t => t.type === 'BET').reduce((sum, t) => sum + t.amount, 0);
  const totalPayout = activeTransactions.filter(t => t.type === 'PAYOUT').reduce((sum, t) => sum + t.amount, 0);
  const profit = totalBet - totalPayout;

  const handleVoidTicket = async (id: string, ticketNumber: string) => {
    if (!window.confirm(`¿Está seguro de que desea ANULAR el ticket #${ticketNumber}? Esta acción no se puede deshacer y ajustará los totales.`)) {
      return;
    }

    try {
      const targetTx = transactions.find(t => t.id === id);
      const isCollector = targetTx?.isCollector || false;

      await voidTransaction(id, isCollector);
      await loadData(); // Recargar datos para ver el cambio
      alert("Ticket anulado con éxito.");
    } catch (err) {
      console.error(err);
      alert("Error al anular el ticket.");
    }
  };

  const requestSort = (key: keyof Transaction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Transaction) => {
    if (!sortConfig || sortConfig.key !== key) return <div className="w-4 h-4 opacity-20"><ChevronUp size={14} /></div>;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-emerald-500" /> : <ChevronDown size={14} className="text-emerald-500" />;
  };

  const handleThermalPrint = () => {
    window.print();
  };

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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reportes y Jugadas</h1>
          <p className="text-slate-500 mt-1">Sincronizado con base de datos centralizada.</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={handleExportPDF} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center space-x-2">
            <FileText size={16} /> <span>PDF</span>
          </button>
          <button onClick={() => setShowPrintModal(true)} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center space-x-2 transition-all hover:bg-slate-800 active:scale-95 shadow-lg shadow-slate-900/20">
            <Printer size={16} /> <span>Imprimir 80mm</span>
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
                <th
                  className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest cursor-pointer hover:text-slate-600 transition-colors"
                  onClick={() => requestSort('ticketId')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Ticket</span>
                    {getSortIcon('ticketId')}
                  </div>
                </th>
                <th
                  className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest cursor-pointer hover:text-slate-600 transition-colors"
                  onClick={() => requestSort('machineName')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Terminal</span>
                    {getSortIcon('machineName')}
                  </div>
                </th>
                <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Tipo</th>
                <th
                  className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest cursor-pointer hover:text-slate-600 transition-colors"
                  onClick={() => requestSort('numbers')}
                >
                  <div className="flex items-center space-x-1">
                    <span>NUMERO</span>
                    {getSortIcon('numbers')}
                  </div>
                </th>
                <th
                  className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest text-right cursor-pointer hover:text-slate-600 transition-colors"
                  onClick={() => requestSort('amount')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Monto</span>
                    {getSortIcon('amount')}
                  </div>
                </th>
                <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedTransactions.map(t => (
                <tr key={t.id} className={`hover:bg-slate-50/50 ${t.status === 'voided' ? 'opacity-40 grayscale' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className={`text-xs font-mono font-bold ${t.status === 'voided' ? 'line-through' : ''}`}>{t.ticketId}</span>
                      {t.status === 'voided' && (
                        <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter">ANULADO</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-700">{t.machineName}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${t.type === 'BET' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                      {t.playType || t.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-black text-slate-600">
                    {t.numbers || <span className="text-slate-300">-</span>}
                  </td>
                  <td className={`px-6 py-4 text-right font-black ${t.status === 'voided' ? 'text-slate-400' : t.type === 'BET' ? 'text-emerald-600' : 'text-slate-900'}`}>
                    RD${t.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {t.status !== 'voided' && (
                      <button
                        onClick={() => handleVoidTicket(t.id, t.ticketId)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        title="Anular Ticket"
                      >
                        <XCircle size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Vista Previa de Impresión */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 no-print overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 my-8">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-black text-slate-900">Vista Previa</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Formato Térmico 80mm</p>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <Trash2 size={24} className="rotate-45" />
              </button>
            </div>

            <div className="p-6 bg-slate-200/50 flex justify-center max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="bg-white shadow-lg border border-slate-200 p-2">
                <ThermalReport
                  transactions={transactions}
                  dateStart={dateStart}
                  dateEnd={dateEnd}
                  selectedMachine={selectedMachine}
                  machineName={selectedMachine === 'ALL' ? 'Todas' : userMachines.find(m => m.id === selectedMachine)?.name || 'N/A'}
                  totalBet={totalBet}
                  totalPayout={totalPayout}
                  profit={profit}
                  headerName={appSettings?.ticketName}
                  logoUrl={appSettings?.ticketLogo}
                />
              </div>
            </div>

            <div className="p-8 bg-white space-y-3">
              <button
                onClick={() => {
                  window.print();
                  setShowPrintModal(false);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 active:scale-[0.98]"
              >
                <Printer size={18} />
                <span>Confirmar Impresión</span>
              </button>
              <button
                onClick={() => setShowPrintModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDERIZADO PARA IMPRESORA (HIDDEN ON SCREEN) */}
      <div className="hidden print:block absolute inset-0 bg-white z-[9999]">
        <ThermalReport
          transactions={transactions}
          dateStart={dateStart}
          dateEnd={dateEnd}
          selectedMachine={selectedMachine}
          machineName={selectedMachine === 'ALL' ? 'Todas' : userMachines.find(m => m.id === selectedMachine)?.name || 'N/A'}
          totalBet={totalBet}
          totalPayout={totalPayout}
          profit={profit}
          headerName={appSettings?.ticketName}
          logoUrl={appSettings?.ticketLogo}
        />
      </div>

      {/* Antiguo PrintView (Hidden or safe to remove if not used elsewhere) */}
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
