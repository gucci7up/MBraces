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
        className={`fixed inset-y-0 left-0 z-[70] w-72 bg-white text-slate-900 transform transition-transform duration-300 ease-in-out shadow-sm border-r border-slate-200 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 pt-7 flex items-center justify-between border-b border-slate-200">
            <div className="flex items-center space-x-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden bg-[#059669] shadow-sm border border-slate-200">
                {appSettings.appLogo ? (
                  <img src={appSettings.appLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-white text-xl">G</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-slate-900 leading-tight">{appSettings.appName}</span>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">Dashboard</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="md:hidden p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-4 py-5">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center space-x-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shadow-sm ${user.role === UserRole.SUPER_ADMIN ? 'bg-indigo-600' : 'bg-amber-500'
                }`}>
                {user.role === UserRole.SUPER_ADMIN ? <Shield size={20} /> : <UserIcon size={20} />}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-black text-slate-900 truncate leading-tight">{user.name}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-bold">
                  {user.role === UserRole.SUPER_ADMIN ? 'SUPER ADMIN' : (user.consortiumName || 'MODERADOR')}
                </p>
              </div>
            </div>
          </div>

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
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-100 font-black'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-bold'
                    }`}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.25 : 1.75}
                    className={`transition-colors ${isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-600'}`}
                  />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200">
            <button
              onClick={() => {
                setToken(null);
                window.dispatchEvent(new Event('auth-changed'));
              }}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors text-sm font-black border border-slate-200"
            >
              <LogOut size={18} />
              <span>Cerrar Sesión</span>
            </button>
            <div className="mt-3 text-center">
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">
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
