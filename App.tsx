import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Machines from './pages/Machines';
import Reports from './pages/Reports';
import PrintView from './pages/PrintView';
import Configuration from './pages/Configuration';
import Jackpot from './pages/Jackpot';
import UserApproval from './pages/UserApproval';
import AuthScreen from './pages/AuthScreen';
import { DeleteTickets } from './pages/DeleteTickets';
import { User, AppSettings, AppNotification, UserRole } from './types';
import { Users, Loader2, ShieldAlert, LogOut } from 'lucide-react';
import { getAppSettings, getTerminals } from './data/supabaseService';
import { apiFetch, setToken as persistToken } from './lib/api';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    appName: 'MBRACES',
    appLogo: null,
    ticketName: 'CONSORCIO MBRACES',
    ticketLogo: null
  });
  const [collectorStatus, setCollectorStatus] = useState<'online' | 'syncing' | 'offline' | 'error'>('offline');

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('mbraces_token'));

  useEffect(() => {
    const refresh = () => {
      const t = localStorage.getItem('mbraces_token');
      setToken(t);
    };
    window.addEventListener('auth-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('auth-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/profile/me');
      if (data) {
        setProfile({
          id: data.id,
          name: data.name,
          role: data.role as UserRole,
          consortiumName: data.consortiumName,
          isApproved: data.isApproved
        });
      } else {
        setProfile(null);
      }
    } catch (err) {
      persistToken(null);
      setToken(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setProfile(null);
      setLoading(false);
      return;
    }
    void fetchProfile();
  }, [token]);

  // CARGA INICIAL DE SETTINGS
  useEffect(() => {
    const initSettings = async () => {
      try {
        const settings = await getAppSettings();
        if (settings) setAppSettings(settings);
      } catch (err) {
      }
    };
    initSettings();
  }, []);

  useEffect(() => {
    if (!profile?.isApproved) return;

    const checkStatus = async () => {
      const data = await getTerminals(profile);

      const oneMinuteAgo = new Date(Date.now() - 60000);

      const isAnyOnline = data && data.some(m => {
        if (m.status !== 'En Línea') return false;
        if (!m.last_sync) return false;
        return new Date(m.last_sync) > oneMinuteAgo;
      });

      if (isAnyOnline) {
        setCollectorStatus('online');
      } else {
        setCollectorStatus('offline');
      }
    };

    checkStatus();

    const interval = setInterval(checkStatus, 10000);
    return () => { clearInterval(interval); };
  }, [profile?.isApproved]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center text-white">
        <Loader2 size={48} className="text-orange-500 animate-spin mb-4" />
        <h1 className="text-xl font-black tracking-widest uppercase">Cargando {appSettings.appName}</h1>
      </div>
    );
  }

  if (!token) {
    return <AuthScreen />;
  }

  if (profile && !profile.isApproved) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center mb-6 border border-orange-500/20">
          <ShieldAlert size={48} className="text-orange-500" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Cuenta Pendiente</h1>
        <p className="text-slate-400 max-w-md mb-8">
          Tu cuenta ha sido creada exitosamente, pero requiere la aprobación de un administrador para acceder al sistema.
        </p>
        <button
          onClick={() => {
            persistToken(null);
            window.dispatchEvent(new Event('auth-changed'));
          }}
          className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all flex items-center gap-2"
        >
          <LogOut size={18} /> Salir
        </button>
      </div>
    );
  }

  if (token && !profile) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-xl shadow-red-900/10">
          <Loader2 size={48} className="text-red-500 animate-spin" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Cargando Perfil...</h1>
        <p className="text-slate-400 max-w-sm mb-8">
          Si esta pantalla persiste, es posible que tu perfil no se haya creado correctamente.
        </p>
        <button
          onClick={() => {
            persistToken(null);
            window.dispatchEvent(new Event('auth-changed'));
          }}
          className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all"
        >
          Cerrar Sesión
        </button>
      </div>
    );
  }

  const renderView = () => {
    if (!profile) return null;

    switch (currentView) {
      case 'dashboard':
        return <Dashboard user={profile} />;
      case 'machines':
        return <Machines user={profile} />;
      case 'reports':
        return <Reports user={profile} appSettings={appSettings} />;
      case 'delete-tickets':
        return <DeleteTickets user={profile} />;
      case 'jackpot':
        return <Jackpot user={profile} />;
      case 'print':
        return <PrintView appSettings={appSettings} user={profile} />;
      case 'config':
        return (
          <Configuration
            user={profile}
            appSettings={appSettings}
            onUpdateSettings={setAppSettings}
          />
        );
      case 'approvals':
        return profile.role === UserRole.SUPER_ADMIN ? <UserApproval /> : <Dashboard user={profile} />;
      default:
        return <Dashboard user={profile} />;
    }
  };

  return (
    <>
      <Layout
        currentView={currentView}
        onChangeView={setCurrentView}
        user={profile!}
        appSettings={appSettings}
        notifications={notifications}
        onMarkAsRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
        onClearNotifications={() => setNotifications([])}
        collectorStatus={collectorStatus}
      >
        {renderView()}
      </Layout>
    </>
  );
};

export default App;
