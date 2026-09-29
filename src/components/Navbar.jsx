import React from 'react';
import { 
  Building2, LayoutDashboard, CreditCard, Calendar, 
  Users, Receipt, Calculator, Download, Plus, BookOpen
} from 'lucide-react';
import { api } from '../utils/api';

export default function Navbar({
  activeTab,
  setActiveTab,
  pendingPaymentsCount = 0,
  onOpenCalculator,
  onOpenNewBooking
}) {
  const handleDownloadBackup = async () => {
    try {
      const data = await api.getBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_depto_rentas_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al descargar copia de seguridad');
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { 
      id: 'payments', 
      label: 'Cobros y Pagos', 
      icon: CreditCard,
      badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : null 
    },
    { id: 'calendar', label: 'Calendario', icon: Calendar },
    { id: 'bookings', label: 'Historial Reservas', icon: BookOpen },
    { id: 'guests', label: 'Huéspedes (CRM)', icon: Users },
    { id: 'expenses', label: 'Gastos', icon: Receipt },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Property Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-slate-900 text-base sm:text-lg leading-tight block">
                Depto Temporario
              </span>
              <span className="text-[11px] font-semibold text-slate-400 block -mt-0.5">
                Airbnb & Particulares • USD
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all relative ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCalculator}
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
              title="Abrir Calculadora Rápida"
            >
              <Calculator className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Calculadora</span>
            </button>

            <button
              onClick={handleDownloadBackup}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              title="Descargar copia de seguridad en JSON"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenNewBooking}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Reserva</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-500 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
