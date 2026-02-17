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
import { User, AppSettings, AppNotification, UserRole } from './types';
import { Users, Loader2, ShieldAlert, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';
import { getAppSettings } from './data/supabaseService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [session, setSession] = useState<any>(null);
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

  // ESCUCHA DE SESIÓN SUPABASE
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    console.log("Iniciando fetchProfile para:", userId);
    try {
      // 1. Intentar obtener el perfil
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn("Error inicial buscando perfil:", error.message);

        // 2. Si hay error (no solo 406), intentamos crear/obtener de nuevo
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const newProfile = {
            id: userId,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
            role: 'Moderador',
            is_approved: false
          };

          console.log("Intentando crear perfil para el usuario logueado...");
          const { error: insertError } = await supabase
            .from('profiles')
            .upsert([newProfile], { onConflict: 'id' });

          if (insertError) {
            console.error("Error en upsert de perfil:", insertError.message);
          }

          // Intentamos leerlo una última vez después del upsert
          const { data: finalData, error: finalError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (finalData) {
            data = finalData;
          } else if (finalError) {
            console.error("Error final leyendo perfil:", finalError.message);
          }
        }
      }

      if (data) {
        setProfile({
          id: data.id,
          name: data.name,
          role: data.role as UserRole,
          consortiumName: data.consortium_name,
          isApproved: data.is_approved
        });
      } else {
        console.error("No se pudo obtener ni crear el perfil para el usuario. Aplicando bypass local...");
        // BYPASS: Si llegamos aquí y hay sesión, creamos un perfil local temporal para no bloquear la pantalla
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setProfile({
            id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
            role: UserRole.MODERATOR, // Por defecto moderador hasta que se sincronice
            isApproved: false
          });
        }
      }
    } catch (err) {
      console.error("Error crítico en fetchProfile:", err);
    } finally {
      setLoading(false);
    }
  };

  // CARGA INICIAL DE SETTINGS
  useEffect(() => {
    const initSettings = async () => {
      try {
        const settings = await getAppSettings();
        if (settings) setAppSettings(settings);
      } catch (err) {
        console.error("Error cargando settings de Supabase:", err);
      }
    };
    initSettings();
  }, []);

  // SUSCRIPCIÓN REALTIME A ALERTAS
  useEffect(() => {
    if (!profile?.isApproved) return;

    const channel = supabase
      .channel('system-alerts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        const newNotif: AppNotification = {
          id: payload.new.id,
          title: payload.new.title,
          message: payload.new.message,
          type: payload.new.type as any,
          timestamp: new Date().toLocaleTimeString(),
          read: false
        };
        setNotifications(prev => [newNotif, ...prev].slice(0, 10));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.isApproved]);

  // SUSCRIPCIÓN REALTIME A TERMINALES PARA STATUS GLOBAL
  useEffect(() => {
    if (!profile?.isApproved) return;

    const checkStatus = async () => {
      const { data } = await supabase
        .from('terminals')
        .select('status, last_sync');

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

    const channel = supabase
      .channel('terminal-status')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'terminals'
      }, () => {
        checkStatus();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.isApproved]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center text-white">
        <Loader2 size={48} className="text-orange-500 animate-spin mb-4" />
        <h1 className="text-xl font-black tracking-widest uppercase">Cargando {appSettings.appName}</h1>
      </div>
    );
  }

  if (!session) {
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
          onClick={() => supabase.auth.signOut()}
          className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all flex items-center gap-2"
        >
          <LogOut size={18} /> Salir
        </button>
      </div>
    );
  }

  if (session && !profile) {
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
          onClick={() => supabase.auth.signOut()}
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