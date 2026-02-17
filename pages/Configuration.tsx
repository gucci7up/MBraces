import React, { useState, useEffect } from 'react';
import { Save, Upload, FileCode, Monitor, DollarSign, Clock, Hash, AlertTriangle, Printer, Store, Users, Image as ImageIcon, Trash2, CheckCircle2, Database } from 'lucide-react';
import { IniConfig, AppSettings, User, UserRole } from '../types';
import { getTerminals, updateIniConfig, updateAppSettings } from '../data/supabaseService';

interface ConfigurationProps {
  user: User;
  appSettings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

const Configuration: React.FC<ConfigurationProps> = ({ user, appSettings, onUpdateSettings }) => {
  const [terminals, setTerminals] = useState<any[]>([]);
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>('');
  const [currentIni, setCurrentIni] = useState<IniConfig | null>(null);
  const [loadingIni, setLoadingIni] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isAdmin = user.role === UserRole.SUPER_ADMIN;

  useEffect(() => {
    const loadTerminals = async () => {
      const data = await getTerminals(user);
      setTerminals(data);
      if (data.length > 0) {
        setSelectedTerminalId(data[0].id);
        setCurrentIni(data[0].ini_content);
      }
    };
    loadTerminals();
  }, [user]);

  const handleTerminalChange = (id: string) => {
    setSelectedTerminalId(id);
    const term = terminals.find(t => t.id === id);
    if (term) setCurrentIni(term.ini_content);
  };

  const handleSaveIdentity = async () => {
    setIsSaving(true);
    try {
      await updateAppSettings(appSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("Error guardando identidad");
    } finally {
      setIsSaving(false);
    }
  };

  const handleIniChange = (section: 'DOG' | 'PANTALLA', key: string, value: any) => {
    if (!currentIni) return;

    // Convertir la clave a mayúsculas para asegurar consistencia
    const uppercaseKey = key.toUpperCase();

    const newSection = { ...currentIni[section] } as any;

    // Si existe la versión en minúsculas, la eliminamos para evitar duplicados
    if (newSection[key.toLowerCase()] !== undefined && key.toLowerCase() !== uppercaseKey.toLowerCase()) {
      delete newSection[key.toLowerCase()];
    }

    newSection[uppercaseKey] = value;

    setCurrentIni({
      ...currentIni,
      [section]: newSection
    });
  };

  const handleSyncIni = async () => {
    if (!selectedTerminalId || !currentIni) return;
    setIsSaving(true);
    try {
      await updateIniConfig(selectedTerminalId, currentIni);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("Error sincronizando .INI");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'app' | 'ticket') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const newSettings = { ...appSettings };
        if (type === 'app') newSettings.appLogo = base64;
        else newSettings.ticketLogo = base64;
        onUpdateSettings(newSettings);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configuración de Sistema</h1>
          <p className="text-slate-500 mt-1">Gestión centralizada de identidad y motores de terminales.</p>
        </div>
        {saveSuccess && (
          <div className="flex items-center space-x-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full font-bold text-xs animate-bounce">
            <CheckCircle2 size={16} />
            <span>CAMBIOS GUARDADOS EN SUPABASE</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* IDENTIDAD DEL PANEL */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60">
          <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg mr-3"><Monitor size={20} /></div>
            Identidad {appSettings.appName}
          </h3>
          <div className="flex flex-col items-center space-y-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-[#059669] border-4 border-white shadow-xl">
                {appSettings.appLogo ? <img src={appSettings.appLogo} className="w-full h-full object-cover" /> : <span className="text-white text-5xl font-black italic flex items-center justify-center h-full">G</span>}
              </div>
              <label className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg border cursor-pointer text-indigo-600"><Upload size={16} /><input type="file" className="hidden" onChange={e => handleFileChange(e, 'app')} /></label>
            </div>
            <input type="text" value={appSettings.appName} onChange={e => onUpdateSettings({ ...appSettings, appName: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border rounded-2xl outline-none focus:border-indigo-500 font-bold" placeholder="Nombre App" />
            <button onClick={handleSaveIdentity} disabled={isSaving} className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">Guardar Cambios</button>
          </div>
        </div>

        {/* IDENTIDAD DE TICKET */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60">
          <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg mr-3"><Printer size={20} /></div>
            Cabecera de Impresión
          </h3>
          <div className="flex flex-col items-center space-y-6">
            <div className="w-full h-32 bg-slate-50 border border-dashed rounded-2xl flex items-center justify-center relative overflow-hidden">
              {appSettings.ticketLogo ? <img src={appSettings.ticketLogo} className="h-20 object-contain grayscale" /> : <ImageIcon className="text-slate-300" size={40} />}
              <label className="absolute bottom-2 right-2 bg-emerald-600 p-2 rounded-lg text-white cursor-pointer shadow-lg"><Upload size={16} /><input type="file" className="hidden" onChange={e => handleFileChange(e, 'ticket')} /></label>
            </div>
            <input type="text" value={appSettings.ticketName} onChange={e => onUpdateSettings({ ...appSettings, ticketName: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border rounded-2xl outline-none focus:border-emerald-500 font-mono text-sm" placeholder="Título Ticket" />
            <button onClick={handleSaveIdentity} disabled={isSaving} className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all">Actualizar Tickets</button>
          </div>
        </div>
      </div>

      {/* MOTOR INI */}
      <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-800">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center text-white font-black text-xl">
            <FileCode size={24} className="text-indigo-400 mr-3" />
            Sincronizador de Motores (.INI)
          </div>
          <select value={selectedTerminalId} onChange={e => handleTerminalChange(e.target.value)} className="bg-slate-800 text-white border-none rounded-xl px-4 py-2 font-bold text-sm outline-none">
            {terminals.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {currentIni ? (
          <div className="space-y-10">
            {/* SECCIÓN DOG */}
            <div>
              <h4 className="text-indigo-400 font-black text-xs uppercase tracking-[0.3em] mb-6 flex items-center">
                <Database size={14} className="mr-2" /> Motor de Juego [DOG]
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Campos específicos solicitados por el usuario */}
                {[
                  { key: 'JACK', label: 'JACKPOT ACTUAL', type: 'number' },
                  { key: 'JACK_LOCAL', label: 'JACKPOT LOCAL', type: 'number' },
                  { key: 'JACKPOT', label: 'HABILITAR JACKPOT', type: 'select', options: ['TRUE', 'FALSE'] },
                  { key: 'JACKWEB', label: 'JACKPOT WEB', type: 'number' },
                  { key: 'MAXJACK', label: 'MAXIMO JACKPOT', type: 'number' },
                  { key: 'MAXJACKWEB', label: 'MAXIMO JACKPOT WEB', type: 'number' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-[9px] font-black text-slate-500 uppercase mb-1.5 ml-1">{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        value={String(currentIni?.DOG?.[field.key as keyof IniConfig['DOG']] || 'FALSE')}
                        onChange={e => handleIniChange('DOG', field.key, e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700/50 text-white font-mono rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-slate-800"
                      >
                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        type="number"
                        step="any"
                        value={currentIni?.DOG?.[field.key as keyof IniConfig['DOG']] || 0}
                        onChange={e => handleIniChange('DOG', field.key, Number(e.target.value))}
                        className="w-full bg-slate-800/50 border border-slate-700/50 text-white font-mono rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-slate-800"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SECCIÓN PANTALLA */}
            <div>
              <h4 className="text-amber-400 font-black text-xs uppercase tracking-[0.3em] mb-6 flex items-center">
                <Monitor size={14} className="mr-2" /> Visualización [PANTALLA]
              </h4>
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase mb-1.5 ml-1">MENSAJE</label>
                <input
                  type="text"
                  value={currentIni?.PANTALLA?.MENSAJE || ''}
                  onChange={e => handleIniChange('PANTALLA', 'MENSAJE', e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 text-white font-mono rounded-xl px-4 py-3 outline-none focus:border-amber-500 focus:bg-slate-800"
                />
              </div>
            </div>

            <div className="pt-10 border-t border-slate-800 mt-4 flex justify-end">
              <button onClick={handleSyncIni} disabled={isSaving} className="bg-indigo-600 text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest flex items-center space-x-2 shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 transition-all active:scale-95">
                <Save size={18} />
                <span>Sincronizar con Terminal</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-800/20 rounded-3xl border border-dashed border-slate-800">
            <div className="animate-pulse flex flex-col items-center">
              <FileCode size={40} className="text-slate-700 mb-4" />
              <p className="text-slate-600 font-black text-xs uppercase tracking-widest">Selecciona una terminal para editar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Configuration;