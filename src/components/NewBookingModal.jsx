import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Calendar, DollarSign, User, ShieldCheck, Home, 
  Check, Search, Phone, Mail, Star, UserPlus, ChevronDown
} from 'lucide-react';
import { formatUSD } from '../utils/formatters';

export default function NewBookingModal({
  isOpen,
  onClose,
  guests = [],
  onBookingCreated,
  initialData = null,
  initialDateRange = null
}) {
  if (!isOpen) return null;

  // Origin
  const [origin, setOrigin] = useState(initialData?.origin || 'particular');

  // Guest search and selection
  const [selectedGuest, setSelectedGuest] = useState(() => {
    if (initialData?.guest_id) {
      return guests.find((g) => g.id === initialData.guest_id) || null;
    }
    return null;
  });
  const [guestSearchQuery, setGuestSearchQuery] = useState(
    initialData?.guest_name || ''
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [guestPhone, setGuestPhone] = useState(initialData?.guest_phone || '');
  const [guestEmail, setGuestEmail] = useState('');
  const [showNewGuestFields, setShowNewGuestFields] = useState(false);

  const searchContainerRef = useRef(null);

  // Dates
  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeekStr = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(initialDateRange?.start || initialData?.start_date || todayStr);
  const [endDate, setEndDate] = useState(initialDateRange?.end || initialData?.end_date || nextWeekStr);
  const [checkInTime, setCheckInTime] = useState(initialData?.check_in_time || '15:00');
  const [checkOutTime, setCheckOutTime] = useState(initialData?.check_out_time || '11:00');

  // Pricing (USD)
  const [totalPrice, setTotalPrice] = useState(initialData?.total_price ? String(initialData.total_price) : '450');

  // Collapsible extras to save space
  const [hasDeposit, setHasDeposit] = useState(Boolean(initialData?.has_deposit));
  const [depositAmount, setDepositAmount] = useState(initialData?.deposit_amount ? String(initialData.deposit_amount) : '100');
  const [depositStatus, setDepositStatus] = useState(initialData?.deposit_status || 'pending');

  const [hasInitialPayment, setHasInitialPayment] = useState(false);
  const [initialPaymentAmount, setInitialPaymentAmount] = useState('150');
  const [initialPaymentMethod, setInitialPaymentMethod] = useState('transfer');

  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Filter existing registered guests based on search query
  const filteredGuests = guests.filter((g) => {
    if (!guestSearchQuery.trim()) return true;
    const q = guestSearchQuery.toLowerCase();
    const matchName = g.name?.toLowerCase().includes(q);
    const matchPhone = g.phone && g.phone.includes(q);
    const matchEmail = g.email && g.email.toLowerCase().includes(q);
    const matchDoc = g.document_id && g.document_id.includes(q);
    return matchName || matchPhone || matchEmail || matchDoc;
  });

  const handleSelectExistingGuest = (guest) => {
    setSelectedGuest(guest);
    setGuestSearchQuery(guest.name);
    setGuestPhone(guest.phone || '');
    setGuestEmail(guest.email || '');
    setIsSearchOpen(false);
    setShowNewGuestFields(false);
  };

  const handleClearSelectedGuest = () => {
    setSelectedGuest(null);
    setGuestSearchQuery('');
    setGuestPhone('');
    setGuestEmail('');
    setShowNewGuestFields(false);
  };

  const applySuggestedRate = (rate) => {
    setTotalPrice(String(Number(rate) * nights));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalGuestName = selectedGuest ? selectedGuest.name : guestSearchQuery.trim();

    if (!finalGuestName && origin !== 'bloqueo') {
      setError('Por favor indica o busca el nombre del huésped');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError('El check-out debe ser posterior al check-in');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        guest_id: origin === 'bloqueo' ? null : (selectedGuest ? selectedGuest.id : null),
        guest_name: origin === 'bloqueo' ? 'Bloqueo / Mantenimiento' : finalGuestName,
        guest_phone: selectedGuest ? (selectedGuest.phone || guestPhone) : guestPhone,
        guest_email: selectedGuest ? (selectedGuest.email || guestEmail) : guestEmail,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[92vh] my-auto overflow-hidden flex flex-col">
        {/* Compact Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                {initialData ? 'Editar Reserva' : 'Nueva Reserva'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Alquiler temporario en USD
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
          {/* Origin selector - Compact pills */}
          <div>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setOrigin('particular')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  origin === 'particular'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${origin === 'particular' ? 'bg-white' : 'bg-blue-600'}`}></span>
                Particular
              </button>
              <button
                type="button"
                onClick={() => setOrigin('airbnb')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  origin === 'airbnb'
                    ? 'bg-[#FF385C] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${origin === 'airbnb' ? 'bg-white' : 'bg-[#FF385C]'}`}></span>
                Airbnb
              </button>
              <button
                type="button"
                onClick={() => setOrigin('bloqueo')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  origin === 'bloqueo'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${origin === 'bloqueo' ? 'bg-white' : 'bg-amber-500'}`}></span>
                Bloqueo
              </button>
            </div>
          </div>

          {/* Guest Search / Selection (CRM Lookup) */}
          {origin !== 'bloqueo' && (
            <div ref={searchContainerRef} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Huésped
                </label>
                {guests.length > 0 && !selectedGuest && (
                  <span className="text-[11px] text-slate-400">
                    {guests.length} {guests.length === 1 ? 'cliente guardado' : 'clientes en BD'}
                  </span>
                )}
              </div>

              {/* Case 1: An existing registered guest is selected */}
              {selectedGuest ? (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-2 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {selectedGuest.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <strong className="text-xs sm:text-sm text-slate-900 truncate">
                          {selectedGuest.name}
                        </strong>
                        <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-bold text-[10px]">
                          Registrado
                        </span>
                        <span className="text-[11px] text-amber-500 font-bold flex items-center">
                          <Star className="w-3 h-3 fill-amber-400 inline mr-0.5" />
                          {selectedGuest.rating || 5}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {selectedGuest.phone || 'Sin teléfono'} • {selectedGuest.total_bookings || 0} visitas
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSelectedGuest}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-lg hover:bg-blue-100/60 transition shrink-0"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                /* Case 2: Search input with real-time autocomplete suggestions */
                <div className="relative">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required={origin !== 'bloqueo'}
                      value={guestSearchQuery}
                      onChange={(e) => {
                        setGuestSearchQuery(e.target.value);
                        setIsSearchOpen(true);
                      }}
                      onFocus={() => setIsSearchOpen(true)}
                      placeholder="Buscar cliente existente o escribir nuevo..."
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium"
                    />
                    {guestSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setGuestSearchQuery('');
                          setIsSearchOpen(true);
                        }}
                        className="text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Autocomplete Dropdown */}
                  {isSearchOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl z-30 max-h-52 overflow-y-auto divide-y divide-slate-100">
                      {filteredGuests.length > 0 ? (
                        <>
                          <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Clientes registrados encontrados ({filteredGuests.length})
                          </div>
                          {filteredGuests.map((g) => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => handleSelectExistingGuest(g)}
                              className="w-full px-3 py-2 text-left hover:bg-blue-50/80 transition flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-slate-800 truncate">
                                    {g.name}
                                  </span>
                                  <span className="text-[10px] text-amber-500 font-bold">
                                    ⭐ {g.rating || 5}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate flex items-center gap-2">
                                  {g.phone && <span>{g.phone}</span>}
                                  <span>• {g.total_bookings || 0} visitas</span>
                                </div>
                              </div>
                              <span className="text-[10px] text-blue-600 font-bold shrink-0 bg-blue-50 px-1.5 py-0.5 rounded">
                                Seleccionar
                              </span>
                            </button>
                          ))}
                        </>
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-500">
                          No hay clientes con ese nombre en la base de datos.
                        </div>
                      )}

                      {/* Option to create as new */}
                      {guestSearchQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsSearchOpen(false);
                            setShowNewGuestFields(true);
                          }}
                          className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 text-left text-xs font-bold text-blue-700 flex items-center gap-2 transition"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                          <span>Usar como nuevo huésped: "<strong>{guestSearchQuery}</strong>"</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Optional phone & email fields if it's a new guest */}
                  {(!selectedGuest || showNewGuestFields) && guestSearchQuery.trim() && (
                    <div className="grid grid-cols-2 gap-2 pt-1.5 animate-in fade-in duration-150">
                      <div>
                        <input
                          type="text"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          placeholder="WhatsApp (ej: +54 9 11...)"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="Email (opcional)"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dates & Times - Compact 2 Columns */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-blue-600" />
                  Check-in
                </span>
                <input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="px-1.5 py-0.5 border border-slate-300 rounded bg-white text-[11px]"
                />
              </div>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
              />
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-rose-600" />
                  Check-out
                </span>
                <input
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="px-1.5 py-0.5 border border-slate-300 rounded bg-white text-[11px]"
                />
              </div>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Pricing - Free Total in USD with chips */}
          {origin !== 'bloqueo' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Total Acordado (USD)
                </label>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  {nights} {nights === 1 ? 'noche' : 'noches'}
                  {Number(totalPrice) > 0 && ` • $${(Number(totalPrice) / nights).toFixed(0)}/noche`}
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-base">
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
                  className="w-full pl-7 pr-14 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
                  USD
                </span>
              </div>

              {/* Quick rate suggestions chips */}
              <div className="flex items-center gap-1 pt-1 overflow-x-auto">
                <span className="text-[10px] text-slate-400">Sugerir:</span>
                {[60, 75, 85, 100, 120].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => applySuggestedRate(rate)}
                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] rounded font-medium transition"
                  >
                    ${rate} (${rate * nights})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Compact Optional Toggles: Depósito & Seña */}
          {origin !== 'bloqueo' && (
            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                {/* Deposit Toggle */}
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={hasDeposit}
                    onChange={(e) => setHasDeposit(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0"
                  />
                  <span>🛡️ Depósito de Garantía</span>
                </label>

                {/* Initial Payment Toggle (only on new) */}
                {!initialData && (
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={hasInitialPayment}
                      onChange={(e) => setHasInitialPayment(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-0"
                    />
                    <span>💵 Seña / Pago Inicial</span>
                  </label>
                )}
              </div>

              {/* Unfolded Deposit fields */}
              {hasDeposit && (
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 animate-in fade-in duration-100">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="Monto depósito"
                      className="w-full pl-6 pr-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                    />
                  </div>
                  <select
                    value={depositStatus}
                    onChange={(e) => setDepositStatus(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                  >
                    <option value="pending">Pendiente de cobro</option>
                    <option value="paid">Cobrado / Retenido</option>
                    <option value="refunded">Devuelto al check-out</option>
                  </select>
                </div>
              )}

              {/* Unfolded Initial Payment fields */}
              {hasInitialPayment && !initialData && (
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 animate-in fade-in duration-100">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={initialPaymentAmount}
                      onChange={(e) => setInitialPaymentAmount(e.target.value)}
                      placeholder="Monto de seña"
                      className="w-full pl-6 pr-2 py-1 bg-white border border-blue-300 rounded-lg text-xs font-bold text-slate-800"
                    />
                  </div>
                  <select
                    value={initialPaymentMethod}
                    onChange={(e) => setInitialPaymentMethod(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-blue-300 rounded-lg text-xs font-medium text-slate-800"
                  >
                    <option value="transfer">Transferencia</option>
                    <option value="cash_usd">Efectivo USD</option>
                    <option value="zelle">Zelle</option>
                    <option value="usdt_crypto">USDT / Cripto</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Notes - Compact single line */}
          <div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas opcionales (ej: cuna para bebé, llega tarde...)"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg font-medium">{error}</p>
          )}

          {/* Compact Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              {isSubmitting ? 'Guardando...' : initialData ? 'Actualizar' : 'Crear Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
