import React, { useState } from 'react';
import { 
  Home, Plus, Search, Calendar, Filter, DollarSign, 
  MessageCircle, Star, Edit, Trash2, CheckCircle2, 
  ShieldCheck, AlertCircle, ArrowRight, Eye, Tag
} from 'lucide-react';
import { formatUSD, formatShortDate, formatDateSpanWithMonths } from '../utils/formatters';

export default function BookingsView({
  bookings = [],
  onOpenNewBooking,
  onOpenEditBooking,
  onOpenAddPayment,
  onOpenWhatsApp,
  onOpenCheckout,
  onDeleteBooking
}) {
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'completed' | 'cancelled'
  const [originFilter, setOriginFilter] = useState('all'); // 'all' | 'particular' | 'airbnb'
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBookings = bookings.filter((b) => {
    // Status filter
    if (statusFilter === 'active' && !(b.status === 'confirmed' || b.status === 'in_progress')) return false;
    if (statusFilter === 'completed' && b.status !== 'completed') return false;
    if (statusFilter === 'cancelled' && b.status !== 'cancelled') return false;

    // Origin filter
    if (originFilter !== 'all' && b.origin !== originFilter) return false;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = b.guest_name?.toLowerCase().includes(term);
      const matchNotes = b.notes?.toLowerCase().includes(term);
      const matchPostNotes = b.post_checkout_notes?.toLowerCase().includes(term);
      if (!matchName && !matchNotes && !matchPostNotes) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <Home className="w-4 h-4" />
            Registro y Base de Datos de Reservas
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Historial de Reservas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Consulta todas las reservas activas y finalizadas con sus comentarios post-estadía.
          </p>
        </div>

        <button
          onClick={onOpenNewBooking}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          + Nueva Reserva
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por huésped o comentarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center bg-white border border-slate-200 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg transition ${
                statusFilter === 'all' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
              }`}
            >
              Todas ({bookings.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg transition ${
                statusFilter === 'active' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'
              }`}
            >
              Activas
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1 rounded-lg transition ${
                statusFilter === 'completed' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-100'
              }`}
            >
              Finalizadas / Archivo
            </button>
          </div>

          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">Origen: Todos</option>
            <option value="particular">Solo Particulares</option>
            <option value="airbnb">Solo Airbnb</option>
          </select>
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No hay reservas con los filtros aplicados</h3>
          <p className="text-xs text-slate-500 mt-1">
            Prueba cambiando el estado o el origen en los filtros superiores.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredBookings.map((b) => {
            const isCompleted = b.status === 'completed';
            const isAirbnb = b.origin === 'airbnb';
            const balance = b.balance_due || 0;

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isAirbnb
                          ? 'bg-rose-50 text-[#FF385C] border border-rose-200'
                          : b.origin === 'bloqueo'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {isAirbnb ? 'Airbnb' : b.origin === 'bloqueo' ? 'Bloqueo' : 'Particular'}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : b.status === 'cancelled'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {isCompleted ? '✓ Finalizada (Check-out)' : b.status === 'cancelled' ? 'Cancelada' : 'En Curso / Confirmada'}
                    </span>

                    {b.has_deposit && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Depósito: {formatUSD(b.deposit_amount)} ({b.deposit_status})
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                      {b.guest_name}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDateSpanWithMonths(b.start_date, b.end_date)} ({b.nights} noches)
                    </p>
                  </div>

                  {/* Post-checkout comments if completed */}
                  {isCompleted && (b.post_checkout_notes || (b.post_checkout_tags && b.post_checkout_tags.length > 0)) && (
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
                      {b.post_checkout_tags && b.post_checkout_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {b.post_checkout_tags.map((t) => (
                            <span key={t} className="px-2 py-0.5 rounded bg-white text-emerald-800 font-bold text-[10px] shadow-2xs border border-emerald-200">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      {b.post_checkout_notes && (
                        <p className="italic text-slate-700 text-[11px]">
                          "{b.post_checkout_notes}"
                        </p>
                      )}
                    </div>
                  )}

                  {b.notes && (
                    <p className="text-xs text-slate-500 italic">
                      Nota de reserva: {b.notes}
                    </p>
                  )}
                </div>

                {/* Right: Amounts & Actions */}
                <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left md:text-right">
                    <span className="text-lg font-black text-slate-900 block">
                      {formatUSD(b.total_price)}
                    </span>
                    <div className="text-xs text-slate-500">
                      Cobrado: <strong className="text-emerald-600">{formatUSD(b.total_paid || 0)}</strong>
                      {balance > 0 && (
                        <span className="text-amber-600 font-bold ml-1.5">
                          (Resta {formatUSD(balance)})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* If active, can add payment or checkout */}
                    {!isCompleted && b.status !== 'cancelled' && (
                      <>
                        <button
                          onClick={() => onOpenAddPayment(b)}
                          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                          title="Registrar pago"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Abonar
                        </button>
                        <button
                          onClick={() => onOpenWhatsApp(b)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                        <button
                          onClick={() => onOpenCheckout(b)}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                          title="Finalizar estadía y archivar con comentario"
                        >
                          Check-out
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => onOpenEditBooking(b)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      title="Editar reserva"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={async () => {
                        if (confirm(`¿Eliminar la reserva de ${b.guest_name}?`)) {
                          await onDeleteBooking(b.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Eliminar reserva"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
