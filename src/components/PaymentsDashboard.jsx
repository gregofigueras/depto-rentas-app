import React, { useState } from 'react';
import { 
  CheckCircle2, Clock, DollarSign, MessageCircle, CreditCard, 
  ArrowRight, Search, Check, AlertCircle, Sparkles, Filter, 
  ChevronRight, Calendar, User, Eye
} from 'lucide-react';
import { formatUSD, formatDateSpanWithMonths } from '../utils/formatters';

export default function PaymentsDashboard({
  bookings = [],
  onOpenAddPayment,
  onOpenWhatsApp,
  onOpenCheckout,
  onViewBookingDetails,
  onRefresh
}) {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'fully_paid'
  const [searchTerm, setSearchTerm] = useState('');

  // FILTER LOGIC:
  // ONLY show bookings that are NOT completed/cancelled in this operational screen.
  // Bookings with status 'completed' have disappeared from this view and are archived in the database!
  const operationalBookings = bookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'in_progress'
  );

  // Pending collection (owes money)
  const pendingBookings = operationalBookings.filter((b) => (b.balance_due || 0) > 0);

  // Fully paid (100% paid)
  const fullyPaidBookings = operationalBookings.filter((b) => (b.balance_due || 0) <= 0);

  // Calculate totals
  const totalPendingDebt = pendingBookings.reduce((sum, b) => sum + (b.balance_due || 0), 0);
  const totalCollectedActive = operationalBookings.reduce((sum, b) => sum + (b.total_paid || 0), 0);

  // Filter current list based on active tab and search
  const currentList = (activeTab === 'pending' ? pendingBookings : fullyPaidBookings).filter(
    (b) =>
      b.guest_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header with summary stats */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-2">
              <CreditCard className="w-3.5 h-3.5" />
              Gestión de Cobranzas y Pagos Parciales
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Control de Pagos Activos
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              Monitorea clientes que completaron el 100% y aquellos que van pagando en cuotas.
              Al hacer el check-out, la reserva pasa a la base de datos y se archiva de este panel.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 text-right">
              <span className="block text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
                Total por Cobrar (USD)
              </span>
              <span className="text-2xl font-black text-white">
                {formatUSD(totalPendingDebt)}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 text-right">
              <span className="block text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                Ya Cobrado Activo
              </span>
              <span className="text-2xl font-black text-white">
                {formatUSD(totalCollectedActive)}
              </span>
            </div>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-3 mt-6 pt-5 border-t border-white/10">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 font-black'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Falta Pagar</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'pending' ? 'bg-slate-950 text-amber-400' : 'bg-white/20 text-white'
            }`}>
              {pendingBookings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('fully_paid')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'fully_paid'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 font-black'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>100% Pagados</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'fully_paid' ? 'bg-slate-950 text-emerald-400' : 'bg-white/20 text-white'
            }`}>
              {fullyPaidBookings.length}
            </span>
          </button>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre de huésped..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Mostrando <strong>{currentList.length}</strong> {activeTab === 'pending' ? 'con saldo pendiente' : 'al 100%'}
        </div>
      </div>

      {/* Booking Cards Grid */}
      {currentList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
            {activeTab === 'pending' ? <CheckCircle2 className="w-8 h-8 text-emerald-500" /> : <DollarSign className="w-8 h-8 text-blue-500" />}
          </div>
          <h3 className="font-bold text-slate-800 text-lg">
            {activeTab === 'pending'
              ? '¡Excelente! No hay clientes con saldo pendiente de pago'
              : 'Aún no hay reservas activas pagadas al 100%'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {activeTab === 'pending'
              ? 'Todas las reservas activas están al día con sus importes o ya fueron finalizadas.'
              : 'Cuando los clientes completen el total de sus pagos, aparecerán listados aquí.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentList.map((booking) => {
            const balance = booking.balance_due || 0;
            const total = booking.total_price || 0;
            const paid = booking.total_paid || 0;
            const pct = booking.payment_percentage || 0;
            const isAirbnb = booking.origin === 'airbnb';

            return (
              <div
                key={booking.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top line: tags & origin */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${
                          isAirbnb
                            ? 'bg-rose-50 text-[#FF385C] border border-rose-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {isAirbnb ? 'Airbnb' : 'Particular'}
                      </span>
                      {booking.has_deposit && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Depósito: {formatUSD(booking.deposit_amount)}
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      {balance > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                          Falta: {formatUSD(balance)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <Check className="w-3.5 h-3.5" /> 100% Pagado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Guest Name & Dates */}
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center justify-between">
                      <span>{booking.guest_name}</span>
                      <span className="text-xs font-semibold text-slate-400">
                        {booking.nights} {booking.nights === 1 ? 'noche' : 'noches'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600 font-medium mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDateSpanWithMonths(booking.start_date, booking.end_date)}
                    </p>
                  </div>

                  {/* Progress Bar of Payment */}
                  <div className="mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500 font-semibold">
                        Abonado: <strong className="text-emerald-700">{formatUSD(paid)}</strong>
                      </span>
                      <span className="text-slate-500 font-semibold">
                        Total: <strong className="text-slate-800">{formatUSD(total)}</strong>
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>{pct}% completado</span>
                      {balance > 0 ? (
                        <span className="text-amber-600 font-bold">Resta pagar {formatUSD(balance)}</span>
                      ) : (
                        <span className="text-emerald-600 font-bold">Sin deuda</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Add Payment Button */}
                    <button
                      onClick={() => onOpenAddPayment(booking)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      + Registrar Pago
                    </button>

                    {/* WhatsApp Button */}
                    <button
                      onClick={() => onOpenWhatsApp(booking)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                      title="Generar mensaje con día y mes explícito y saldo"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      WhatsApp
                    </button>
                  </div>

                  {/* Complete Stay & Checkout (Disappears from this screen) */}
                  <button
                    onClick={() => onOpenCheckout(booking)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                    title="Al finalizar estadía se califica al huésped y se archiva a la base de datos"
                  >
                    <span>Finalizar Estadía</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
