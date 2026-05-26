import React from 'react';
import { LayoutDashboard, Server, FileBarChart, Printer, Settings, LogOut, X, Coins, Shield, User as UserIcon, Users, Trash2 } from 'lucide-react';
import { User, UserRole, AppSettings } from '../types';
import { setToken } from '../lib/api';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
  user: User;
  appSettings: AppSettings;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, onClose, user, appSettings }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
    { id: 'machines', label: 'Máquinas', icon: Server },
    { id: 'reports', label: 'Reportes y Jugadas', icon: FileBarChart },
    { id: 'delete-tickets', label: 'Eliminar Tickets', icon: Trash2 },
    { id: 'jackpot', label: 'Control Jackpot', icon: Coins },
    { id: 'print', label: 'Impresión 80mm', icon: Printer },
    { id: 'config', label: 'Configuración', icon: Settings },
  ];

  if (user.role === UserRole.SUPER_ADMIN) {
    menuItems.splice(menuItems.length - 1, 0, { id: 'approvals', label: 'Usuarios', icon: Users });
  }

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-[70] w-72 bg-[#0f172a] text-slate-100 transform transition-transform duration-300 ease-in-out shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0`}
      >
        <div className="h-full flex flex-col">
          {/* BRANDING HEADER - Logo en círculo grande */}
          <div className="p-6 pt-8 flex items-center justify-between border-b border-slate-800/30 mb-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden bg-[#059669] shadow-xl shadow-emerald-900/40 border-2 border-slate-700/50">
                {appSettings.appLogo ? (
                  <img src={appSettings.appLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-white text-xl">G</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-white leading-tight">{appSettings.appName}</span>
                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em] mt-0.5">Management</span>
              </div>
            </div>
            {/* Botón cerrar para móvil */}
            <button
              onClick={onClose}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* USER PROFILE CARD */}
          <div className="px-4 mb-6">
            <div className="bg-[#1e293b]/50 rounded-2xl p-4 border border-slate-700/50 flex items-center space-x-3 shadow-inner">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shadow-md ${user.role === UserRole.SUPER_ADMIN ? 'bg-indigo-600' : 'bg-orange-500'
                }`}>
                {user.role === UserRole.SUPER_ADMIN ? <Shield size={20} /> : <UserIcon size={20} />}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate leading-tight">{user.name}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-semibold">
                  {user.role === UserRole.SUPER_ADMIN ? 'SUPER ADMIN' : user.consortiumName}
                </p>
              </div>
            </div>
          </div>

          {/* NAVEGACIÓN */}
          <nav className="flex-1 py-2 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onChangeView(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
                    ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/20 font-bold'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-100 font-medium'
                    }`}
                >
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    className={`transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-emerald-400'}`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* FOOTER DEL SIDEBAR */}
          <div className="p-4 border-t border-slate-800/50">
            <button
              onClick={() => {
                setToken(null);
                window.dispatchEvent(new Event('auth-changed'));
              }}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors text-sm font-bold"
            >
              <LogOut size={18} />
              <span>Cerrar Sesión</span>
            </button>
            <div className="mt-3 text-center">
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">
                V1.3.0 MBRACES
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
