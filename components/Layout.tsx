import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, User as UserIcon, Wifi, WifiOff, Check, Trash2, X, Database } from 'lucide-react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { User, AppSettings, AppNotification } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onChangeView: (view: string) => void;
  user: User;
  appSettings: AppSettings;
  notifications: AppNotification[];
  onMarkAsRead: () => void;
  onClearNotifications: () => void;
  collectorStatus: 'online' | 'syncing' | 'offline' | 'error';
}

const Layout: React.FC<LayoutProps> = ({
  children,
  currentView,
  onChangeView,
  user,
  appSettings,
  notifications,
  onMarkAsRead,
  onClearNotifications,
  collectorStatus
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">

      <Sidebar
        currentView={currentView}
        onChangeView={onChangeView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        appSettings={appSettings}
      />

      <header className="fixed top-0 left-0 right-0 h-20 md:h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 z-50 px-4 md:px-8 flex items-center justify-between shadow-sm">

        <div className="flex items-center w-12 md:w-auto">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2.5 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-all active:scale-90"
          >
            <Menu size={26} />
          </button>
        </div>

        <div className="flex flex-col items-center md:hidden absolute left-1/2 -translate-x-1/2 pt-1">
          <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden bg-[#059669] shadow-xl shadow-emerald-500/40 border-4 border-white transform transition-transform active:scale-95">
            {appSettings.appLogo ? (
              <img src={appSettings.appLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="font-black text-white text-2xl italic">G</span>
            )}
          </div>
          <span className="font-black text-[14px] text-slate-900 tracking-tighter mt-0.5 uppercase">{appSettings.appName}</span>
        </div>

        <div className="hidden md:flex items-center space-x-6">
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all ${collectorStatus === 'online' ? 'bg-emerald-50 border-emerald-100' :
              collectorStatus === 'syncing' ? 'bg-blue-50 border-blue-100' : 'bg-slate-100 border-slate-200'
            }`}>
            <Database size={14} className={`
                ${collectorStatus === 'online' ? 'text-emerald-500' :
                collectorStatus === 'syncing' ? 'animate-spin text-blue-500' : 'text-slate-400'}
              `} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Collector: {
                collectorStatus === 'online' ? 'Online' :
                  collectorStatus === 'syncing' ? 'Sincronizando' : 'Offline'
              }
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1 md:space-x-3">
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => { setShowNotifications(!showNotifications); onMarkAsRead(); }}
              className={`p-2.5 transition-colors relative rounded-full ${showNotifications ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-50'}`}
            >
              <Bell size={24} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-4.5 h-4.5 bg-red-500 rounded-full border-2 border-white text-[9px] flex items-center justify-center text-white font-bold animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[70]">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm">Notificaciones</h4>
                  <button onClick={onClearNotifications} className="text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Check size={32} className="mx-auto mb-2 opacity-20" />
                      <p className="text-xs">Sin alertas pendientes</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {notifications.map(notification => (
                        <div key={notification.id} className={`p-4 hover:bg-slate-50 transition-colors flex space-x-3 ${!notification.read ? 'bg-emerald-50/30' : ''}`}>
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${notification.type === 'connection' ? 'bg-emerald-100 text-emerald-600' :
                              notification.type === 'disconnection' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                            {notification.type === 'connection' ? <Wifi size={16} /> : <WifiOff size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 leading-tight">{notification.title}</p>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{notification.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

          <div className="flex items-center space-x-3 pl-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-800 leading-none">{user.name}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1 tracking-wider">{user.role}</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 border border-slate-200 shadow-inner overflow-hidden">
              <UserIcon size={20} />
            </div>
          </div>
        </div>
      </header>

      <main
        className={`transition-all duration-300 ease-in-out min-h-screen
          pt-28 md:pt-24 px-4 pb-32
          md:ml-72 md:px-8 md:pb-8
        `}
      >
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <BottomNav currentView={currentView} onChangeView={onChangeView} />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-[60] md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;