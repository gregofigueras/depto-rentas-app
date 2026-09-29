import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, User, ShieldCheck, Home, Check, Plus, Phone, Mail } from 'lucide-react';
import { formatUSD, parseLocalDate } from '../utils/formatters';

export default function NewBookingModal({
  isOpen,
  onClose,
  guests = [],
  onBookingCreated,
  initialData = null,
  initialDateRange = null
}) {
  if (!isOpen) return null;

  // Form states
  const [origin, setOrigin] = useState(initialData?.origin || 'particular');
  const [selectedGuestId, setSelectedGuestId] = useState(initialData?.guest_id ? String(initialData.guest_id) : '');
  const [isNewGuest, setIsNewGuest] = useState(!initialData?.guest_id);
  const [guestName, setGuestName] = useState(initialData?.guest_name || '');
  const [guestPhone, setGuestPhone] = useState(initialData?.guest_phone || '');
  const [guestEmail, setGuestEmail] = useState('');
  
  // Dates
  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeekStr = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(initialDateRange?.start || initialData?.start_date || todayStr);
  const [endDate, setEndDate] = useState(initialDateRange?.end || initialData?.end_date || nextWeekStr);
  const [checkInTime, setCheckInTime] = useState(initialData?.check_in_time || '15:00');
  const [checkOutTime, setCheckOutTime] = useState(initialData?.check_out_time || '11:00');

  // Pricing (USD) - Free total price as requested
  const [totalPrice, setTotalPrice] = useState(initialData?.total_price ? String(initialData.total_price) : '500');
  const [pricePerNightCalc, setPricePerNightCalc] = useState('');

  // Security Deposit (Optional as requested)
  const [hasDeposit, setHasDeposit] = useState(Boolean(initialData?.has_deposit));
  const [depositAmount, setDepositAmount] = useState(initialData?.deposit_amount ? String(initialData.deposit_amount) : '100');
  const [depositStatus, setDepositStatus] = useState(initialData?.deposit_status || 'pending');

  // Initial payment on creation (only for new bookings)
  const [hasInitialPayment, setHasInitialPayment] = useState(false);
  const [initialPaymentAmount, setInitialPaymentAmount] = useState('200');
  const [initialPaymentMethod, setInitialPaymentMethod] = useState('transfer');

  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Calculate nights
  const calculateNights = (start, end) => {
    try {
      const d1 = new Date(start + 'T00:00:00');
      const d2 = new Date(end + 'T00:00:00');
      const diff = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
      return Math.max(1, diff);
    } catch (e) {
      return 1;
    }
  };

  const nights = calculateNights(startDate, endDate);

  // When a guest is selected from dropdown
  const handleGuestSelect = (e) => {
    const id = e.target.value;
    setSelectedGuestId(id);
    if (id === 'new') {
      setIsNewGuest(true);
      setGuestName('');
      setGuestPhone('');
      setGuestEmail('');
    } else {
      setIsNewGuest(false);
      const found = guests.find((g) => String(g.id) === String(id));
      if (found) {
        setGuestName(found.name);
        setGuestPhone(found.phone || '');
        setGuestEmail(found.email || '');
      }
    }
  };

  const applySuggestedRate = (rate) => {
    setTotalPrice(String(Number(rate) * nights));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!guestName && origin !== 'bloqueo') {
      setError('Por favor indica el nombre del huésped');
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      setError('La fecha de salida (Check-out) debe ser posterior a la de entrada (Check-in)');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        guest_id: isNewGuest || origin === 'bloqueo' ? null : Number(selectedGuestId),
        guest_name: origin === 'bloqueo' ? 'Bloqueo / Mantenimiento' : guestName,
        guest_phone: guestPhone,
        guest_email: guestEmail,
        origin,
        start_date: startDate,
        end_date: endDate,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        total_price: origin === 'bloqueo' ? 0 : Number(totalPrice),
        has_deposit: hasDeposit ? 1 : 0,
        deposit_amount: hasDeposit ? Number(depositAmount) : 0,
        deposit_status: hasDeposit ? depositStatus : 'none',
        notes,
        ...(hasInitialPayment && !initialData ? {
          initial_payment: Number(initialPaymentAmount),
          initial_payment_method: initialPaymentMethod,
          initial_payment_date: startDate
        } : {})
      };

      await onBookingCreated(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar reserva');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                {initialData ? 'Editar Reserva' : 'Nueva Reserva'}
              </h3>
              <p className="text-xs text-slate-400">
                Tarifa flexible en USD, fechas y control de cobros
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Origin selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Tipo de Reserva / Origen
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setOrigin('particular')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  origin === 'particular'
                    ? 'bg-blue-50 border-blue-600 text-blue-700 ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                Reserva Particular
              </button>
              <button
                type="button"
                onClick={() => setOrigin('airbnb')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  origin === 'airbnb'
                    ? 'bg-rose-50 border-rose-600 text-rose-700 ring-2 ring-rose-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF385C]"></span>
                Airbnb
              </button>
              <button
                type="button"
                onClick={() => setOrigin('bloqueo')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  origin === 'bloqueo'
                    ? 'bg-amber-50 border-amber-600 text-amber-700 ring-2 ring-amber-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                Bloqueo / Personal
              </button>
            </div>
          </div>

          {/* Guest Selection (CRM) */}
          {origin !== 'bloqueo' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Datos del Huésped
                </span>
                {guests.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewGuest(!isNewGuest);
                      setSelectedGuestId('new');
                    }}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    {isNewGuest ? 'Elegir huésped existente' : '+ Crear nuevo huésped'}
                  </button>
                )}
              </div>

              {!isNewGuest && guests.length > 0 ? (
                <div>
                  <select
                    value={selectedGuestId}
                    onChange={handleGuestSelect}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="">-- Seleccionar de la base de datos --</option>
                    {guests.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} {g.phone ? `(${g.phone})` : ''} - {g.total_bookings || 0} visitas
                      </option>
                    ))}
                    <option value="new">+ Nuevo Huésped...</option>
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      required={origin !== 'bloqueo'}
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Ej: Laura González"
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+54 9 11 1234-5678"
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      Email (opcional)
                    </label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="laura@ejemplo.com"
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dates & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Fecha Check-in (Entrada)
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <span>Horario:</span>
                <input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="px-2 py-0.5 border border-slate-300 rounded bg-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-rose-600" />
                Fecha Check-out (Salida)
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <span>Horario:</span>
                <input
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="px-2 py-0.5 border border-slate-300 rounded bg-white text-xs"
                />
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-blue-50/70 border border-blue-200/70 rounded-xl text-xs text-blue-800 flex items-center justify-between">
            <span>
              Duración total: <strong>{nights} {nights === 1 ? 'noche' : 'noches'}</strong>
            </span>
            {Number(totalPrice) > 0 && nights > 0 && (
              <span>
                Promedio por noche: <strong>${(Number(totalPrice) / nights).toFixed(2)} USD</strong>
              </span>
            )}
          </div>

          {/* Pricing - Free Total in USD */}
          {origin !== 'bloqueo' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Monto Total Acordado (USD)
                </label>
                <span className="text-[11px] text-slate-500">
                  (Precio total libre, sin importar los días)
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">
                  $
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-16 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                  USD
                </span>
              </div>

              {/* Quick rate suggestions helper */}
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400">Sugerir total por noche:</span>
                {[50, 70, 85, 100, 120].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => applySuggestedRate(rate)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] rounded font-medium transition"
                  >
                    ${rate}/noche (${rate * nights})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Security Deposit (Opcional) */}
          {origin !== 'bloqueo' && (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Depósito en Garantía (Opcional)
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasDeposit}
                    onChange={(e) => setHasDeposit(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {hasDeposit && (
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Monto de Depósito (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Estado del Depósito
                    </label>
                    <select
                      value={depositStatus}
                      onChange={(e) => setDepositStatus(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                    >
                      <option value="pending">Pendiente de cobro</option>
                      <option value="paid">Cobrado / Retenido en mano</option>
                      <option value="refunded">Devuelto al check-out</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Initial Payment / Seña on creation */}
          {!initialData && origin !== 'bloqueo' && (
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">
                  ¿Registrar seña o pago inicial ahora mismo?
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasInitialPayment}
                    onChange={(e) => setHasInitialPayment(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {hasInitialPayment && (
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-blue-200/60">
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                      Monto de Seña (USD)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={initialPaymentAmount}
                      onChange={(e) => setInitialPaymentAmount(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                      Medio de Pago
                    </label>
                    <select
                      value={initialPaymentMethod}
                      onChange={(e) => setInitialPaymentMethod(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-medium text-slate-800"
                    >
                      <option value="transfer">Transferencia Bancaria</option>
                      <option value="cash_usd">Efectivo USD</option>
                      <option value="zelle">Zelle</option>
                      <option value="usdt_crypto">USDT / Cripto</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Notas adicionales / Solicitudes especiales
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Pide cuna para bebé, llega a las 22hs..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg font-medium">{error}</p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : initialData ? 'Actualizar Reserva' : 'Crear Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
