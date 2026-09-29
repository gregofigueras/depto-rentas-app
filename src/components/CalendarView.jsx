import React, { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Plus, RefreshCw, Link2, Check, ExternalLink, Info, DollarSign,
  MessageCircle, User
} from 'lucide-react';
import { formatUSD, MONTH_NAMES_ES, formatDateSpanWithMonths } from '../utils/formatters';

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function CalendarView({
  bookings = [],
  onOpenNewBookingWithDates,
  onOpenWhatsApp,
  onOpenAddPayment,
  onSyncIcal
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showIcalModal, setShowIcalModal] = useState(false);
  const [icalUrl, setIcalUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Prev / Next month
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Generate calendar days
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Helper to format date string as YYYY-MM-DD
  const formatYMD = (y, m, d) => {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  // Build grid items
  const calendarCells = [];

  // 1. Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const dateStr = formatYMD(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, d);
    calendarCells.push({
      day: d,
      dateStr,
      isCurrentMonth: false,
    });
  }

  // 2. Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = formatYMD(year, month, d);
    calendarCells.push({
      day: d,
      dateStr,
      isCurrentMonth: true,
    });
  }

  // 3. Next month leading days (fill to 35 or 42)
  const remaining = 35 - calendarCells.length > 0 ? 35 - calendarCells.length : 42 - calendarCells.length;
  for (let d = 1; d <= remaining; d++) {
    const dateStr = formatYMD(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, d);
    calendarCells.push({
      day: d,
      dateStr,
      isCurrentMonth: false,
    });
  }

  // Find bookings occupying a specific date
  // Standard hotel logic: night begins on start_date, checkout is on end_date (guest leaves before noon)
  const getBookingsForDate = (dateStr) => {
    return bookings.filter((b) => {
      if (b.status === 'cancelled') return false;
      return dateStr >= b.start_date && dateStr < b.end_date;
    });
  };

  const handleSyncSubmit = async (e) => {
    e.preventDefault();
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await onSyncIcal(icalUrl);
      setSyncFeedback({ success: true, message: res.message || 'Calendario sincronizado correctamente.' });
      setTimeout(() => setShowIcalModal(false), 2500);
    } catch (err) {
      setSyncFeedback({ success: false, message: err.message || 'Error al sincronizar' });
    } finally {
      setIsSyncing(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Calendar Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 capitalize">
              {MONTH_NAMES_ES[month]} {year}
            </h2>
            <p className="text-xs text-slate-500">
              Visualización de disponibilidad y reservas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 mr-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600">Libre</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#FF385C]"></span>
              <span className="text-slate-600">Airbnb</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600"></span>
              <span className="text-slate-600">Particular</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="text-slate-600">Bloqueado</span>
            </div>
          </div>

          <button
            onClick={() => setShowIcalModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            title="Importar reservas desde Airbnb iCal"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Sincronizar Airbnb
          </button>

          <button
            onClick={goToToday}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            Hoy
          </button>

          <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Days of week */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center">
          {DAYS_OF_WEEK.map((d, i) => (
            <div
              key={d}
              className={`py-3 text-xs font-bold uppercase tracking-wider ${
                i === 0 || i === 6 ? 'text-blue-600' : 'text-slate-600'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar days cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {calendarCells.map((cell, idx) => {
            const dayBookings = getBookingsForDate(cell.dateStr);
            const isOccupied = dayBookings.length > 0;
            const isToday = cell.dateStr === todayStr;
            const primaryBooking = dayBookings[0];

            let cellBg = cell.isCurrentMonth ? 'bg-white' : 'bg-slate-50/50';
            if (isOccupied && cell.isCurrentMonth) {
              if (primaryBooking.origin === 'airbnb') cellBg = 'bg-rose-50/70 hover:bg-rose-100/70';
              else if (primaryBooking.origin === 'particular') cellBg = 'bg-blue-50/70 hover:bg-blue-100/70';
              else cellBg = 'bg-amber-50/70 hover:bg-amber-100/70';
            } else if (cell.isCurrentMonth) {
              cellBg = 'bg-white hover:bg-emerald-50/40';
            }

            return (
              <div
                key={idx}
                onClick={() => {
                  if (isOccupied) {
                    setSelectedBooking(primaryBooking);
                  } else if (cell.isCurrentMonth) {
                    onOpenNewBookingWithDates({ start: cell.dateStr });
                  }
                }}
                className={`min-h-[95px] p-2 transition-all cursor-pointer relative flex flex-col justify-between group ${cellBg}`}
              >
                {/* Day number & indicators */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${
                      isToday
                        ? 'bg-blue-600 text-white shadow-xs'
                        : cell.isCurrentMonth
                        ? 'text-slate-800'
                        : 'text-slate-300'
                    }`}
                  >
                    {cell.day}
                  </span>

                  {cell.isCurrentMonth && !isOccupied && (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-emerald-600 font-bold bg-emerald-100/80 px-1.5 py-0.5 rounded">
                      + Reservar
                    </span>
                  )}
                </div>

                {/* Booking strip on that day */}
                {isOccupied && (
                  <div className="mt-1 space-y-1">
                    {dayBookings.map((b) => {
                      const isAir = b.origin === 'airbnb';
                      const isBloq = b.origin === 'bloqueo';

                      return (
                        <div
                          key={b.id}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold truncate transition shadow-2xs ${
                            isAir
                              ? 'bg-[#FF385C] text-white'
                              : isBloq
                              ? 'bg-amber-500 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          <span className="truncate block">
                            {isBloq ? 'Bloqueo' : b.guest_name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Availability status badge */}
                {!isOccupied && cell.isCurrentMonth && (
                  <div className="text-[10px] text-emerald-600/70 font-semibold self-end">
                    Libre
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Booking Detail Drawer / Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  selectedBooking.origin === 'airbnb'
                    ? 'bg-rose-50 text-[#FF385C] border border-rose-200'
                    : selectedBooking.origin === 'bloqueo'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                {selectedBooking.origin === 'airbnb' ? 'Reserva Airbnb' : selectedBooking.origin === 'bloqueo' ? 'Bloqueo' : 'Reserva Particular'}
              </span>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">{selectedBooking.guest_name}</h3>
            <p className="text-xs text-slate-500 mb-4">
              {formatDateSpanWithMonths(selectedBooking.start_date, selectedBooking.end_date)} ({selectedBooking.nights} noches)
            </p>

            <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 text-xs mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Total reserva:</span>
                <strong className="text-slate-900">{formatUSD(selectedBooking.total_price)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ya pagado:</span>
                <strong className="text-emerald-600">{formatUSD(selectedBooking.total_paid || 0)}</strong>
              </div>
              <div className="flex justify-between border-t border-slate-200/80 pt-1.5">
                <span className="text-slate-500">Saldo pendiente:</span>
                <strong className={(selectedBooking.balance_due || 0) > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600'}>
                  {formatUSD(selectedBooking.balance_due || 0)}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const b = selectedBooking;
                  setSelectedBooking(null);
                  onOpenAddPayment(b);
                }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <DollarSign className="w-3.5 h-3.5" />
                Registrar Cobro
              </button>
              <button
                onClick={() => {
                  const b = selectedBooking;
                  setSelectedBooking(null);
                  onOpenWhatsApp(b);
                }}
                className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iCal Synchronization Modal */}
      {showIcalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-[#FF385C] rounded-xl">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Sincronizar Calendario Airbnb</h3>
                  <p className="text-xs text-slate-500">Importación automática vía enlace iCal (.ics)</p>
                </div>
              </div>
              <button onClick={() => setShowIcalModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSyncSubmit} className="space-y-4">
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold block mb-1">¿Dónde obtengo este enlace?</span>
                En tu panel de Airbnb: Ve a tu anuncio &gt; <strong>Precios y disponibilidad</strong> &gt; <strong>Sincronización de calendarios</strong> &gt; <strong>Exportar calendario</strong>. Copia ese link y pégalo abajo.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  URL del Calendario iCal de Airbnb
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.airbnb.com/calendar/ical/..."
                  value={icalUrl}
                  onChange={(e) => setIcalUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                />
              </div>

              {syncFeedback && (
                <div className={`p-3 rounded-xl text-xs font-medium ${
                  syncFeedback.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {syncFeedback.message}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIcalModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="px-5 py-2.5 bg-[#FF385C] hover:bg-[#e0314f] text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
