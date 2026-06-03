import React from 'react';
import { LayoutDashboard, Server, FileBarChart, Settings, Coins } from 'lucide-react';

interface BottomNavProps {
  currentView: string;
  onChangeView: (view: string) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChangeView }) => {
  const navItems = [
    { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
    { id: 'machines', label: 'Máquinas', icon: Server },
    { id: 'jackpot', label: 'Jackpot', icon: Coins },
    { id: 'reports', label: 'Reportes', icon: FileBarChart },
    { id: 'config', label: 'Config', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-6 left-4 right-4 z-50">
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-lg flex justify-around items-center p-2 px-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex flex-col items-center justify-center transition-all duration-300 relative ${
                isActive ? 'text-[#465fff] -translate-y-1' : 'text-slate-500'
              }`}
            >
              <Icon size={isActive ? 24 : 20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 w-1 h-1 bg-[#465fff] rounded-full"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
