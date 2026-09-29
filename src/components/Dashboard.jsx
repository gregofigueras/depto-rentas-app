import React from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Calendar, Clock, 
  Sparkles, Plus, Calculator, ArrowUpRight, CheckCircle2,
  AlertTriangle, Users, BedDouble, Shield, RefreshCw
} from 'lucide-react';
import { formatUSD, formatShortDate, formatDateSpanWithMonths } from '../utils/formatters';

const DEFAULT_STATS = {
  currentYear: new Date().getFullYear().toString(),
  incomeYear: 0,
  expensesYear: 0,
  netProfitYear: 0,
  adr: 0,
  totalNightsYear: 0,
  occupancyPercentage: 0,
  activeStats: {
    fullyPaidCount: 0,
    pendingCount: 0,
    totalPendingAmount: 0
  },
  upcomingCheckins: [],
  upcomingCheckouts: []
};

export default function Dashboard({
  stats,
  onOpenNewBooking,
  onOpenNewExpense,
  onOpenCalculator,
  onNavigateToTab,
  onRefresh
}) {
  const currentStats = stats || DEFAULT_STATS;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            Resumen General {currentStats.currentYear}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
            Panel de Control del Departamento
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestión integral de alquiler temporario (Airbnb & Particulares) en USD.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenCalculator}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
          >
            <Calculator className="w-4 h-4 text-blue-400" />
            Calculadora Rápida
          </button>
          <button
            onClick={onOpenNewBooking}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            Nueva Reserva
          </button>
          <button
            onClick={onOpenNewExpense}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition"
          >
            <DollarSign className="w-4 h-4 text-slate-500" />
            Cargar Gasto
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Ganancia Neta Anual */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Ganancia Neta {currentStats.currentYear}
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {formatUSD(currentStats.netProfitYear)}
            </span>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span>Cobrado: <strong>{formatUSD(currentStats.incomeYear)}</strong></span>
              <span>•</span>
              <span>Gastos: <strong>{formatUSD(currentStats.expensesYear)}</strong></span>
            </div>
          </div>
        </div>

        {/* 2. Valor Promedio Por Noche (ADR) - Requested */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
                ADR Promedio / Noche
              </span>
              <span className="text-[11px] text-slate-400">Año {currentStats.currentYear}</span>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <BedDouble className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-indigo-900">
              {formatUSD(currentStats.adr)} <span className="text-xs text-slate-400 font-normal">/ noche</span>
            </span>
            <div className="text-xs text-slate-500 mt-1">
              Sobre <strong>{currentStats.totalNightsYear || 0}</strong> noches reservadas este año
            </div>
          </div>
        </div>

        {/* 3. Saldo Pendiente de Cobro */}
        <div 
          onClick={() => onNavigateToTab('payments')}
          className="bg-white p-5 rounded-2xl border border-amber-200/90 shadow-2xs hover:border-amber-400 transition cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Por Cobrar (Activas)
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-amber-900">
              {formatUSD(currentStats.activeStats?.totalPendingAmount || 0)}
            </span>
            <div className="flex items-center justify-between text-xs text-amber-700/80 mt-1">
              <span>{currentStats.activeStats?.pendingCount || 0} clientes deben cuotas</span>
              <span className="font-bold underline flex items-center gap-0.5">Ver cobros →</span>
            </div>
          </div>
        </div>

        {/* 4. 100% Pagadas */}
        <div 
          onClick={() => onNavigateToTab('payments')}
          className="bg-white p-5 rounded-2xl border border-emerald-200/90 shadow-2xs hover:border-emerald-400 transition cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Pagadas al 100%
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-emerald-950">
              {currentStats.activeStats?.fullyPaidCount || 0}
            </span>
            <div className="text-xs text-emerald-700 mt-1 flex items-center justify-between">
              <span>Reservas activas liquidadas</span>
              <span className="font-bold underline flex items-center gap-0.5">Ver panel →</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Columns: Upcoming Check-ins and Check-outs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Check-ins */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
              <h3 className="font-bold text-slate-800 text-base">
                Próximas Llegadas (Check-ins)
              </h3>
            </div>
            <button
              onClick={() => onNavigateToTab('calendar')}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Ver Calendario
            </button>
          </div>

          {(!currentStats.upcomingCheckins || currentStats.upcomingCheckins.length === 0) ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No hay check-ins programados para los próximos días.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {currentStats.upcomingCheckins.map((b) => (
                <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{b.guest_name}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        b.origin === 'airbnb' ? 'bg-rose-50 text-[#FF385C]' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {b.origin === 'airbnb' ? 'Airbnb' : 'Particular'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>Llegada: <strong>{formatShortDate(b.start_date)}</strong></span>
                      <span>•</span>
                      <span>Horario: {b.check_in_time || '15:00'} hs</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800 block">
                      {formatUSD(b.total_price)}
                    </span>
                    <span className="text-[10px] text-slate-400">Total reserva</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next Check-outs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
              <h3 className="font-bold text-slate-800 text-base">
                Próximas Salidas (Check-outs)
              </h3>
            </div>
            <button
              onClick={() => onNavigateToTab('bookings')}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Ver Reservas
            </button>
          </div>

          {(!currentStats.upcomingCheckouts || currentStats.upcomingCheckouts.length === 0) ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No hay salidas inmediatas pendientes.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {currentStats.upcomingCheckouts.map((b) => (
                <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{b.guest_name}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                        {b.origin === 'airbnb' ? 'Airbnb' : 'Particular'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>Salida: <strong>{formatShortDate(b.end_date)}</strong></span>
                      <span>•</span>
                      <span>Hasta las {b.check_out_time || '11:00'} hs</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-block ${
                      b.cleaning_status === 'cleaned'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {b.cleaning_status === 'cleaned' ? 'Depto Limpio' : 'Limpieza Pendiente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
