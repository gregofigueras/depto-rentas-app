import React, { useState } from 'react';
import { X, DollarSign, Calendar, CreditCard, FileText, CheckCircle2 } from 'lucide-react';
import { formatUSD } from '../utils/formatters';

const PAYMENT_METHODS = [
  { id: 'cash_usd', label: 'Efectivo USD 💵' },
  { id: 'transfer', label: 'Transferencia Bancaria 🏦' },
  { id: 'zelle', label: 'Zelle ⚡' },
  { id: 'usdt_crypto', label: 'Cripto / USDT 🪙' },
  { id: 'paypal', label: 'PayPal 🅿️' },
  { id: 'other', label: 'Otro Medio 📄' }
];

export default function AddPaymentModal({ booking, isOpen, onClose, onPaymentAdded }) {
  if (!isOpen || !booking) return null;

  const currentBalance = booking.balance_due || 0;
  const [amount, setAmount] = useState(currentBalance > 0 ? String(currentBalance) : '100');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('cash_usd');
  const [reference, setReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const numAmount = parseFloat(amount) || 0;
  const remainingAfter = Math.max(0, currentBalance - numAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (numAmount <= 0) {
      setError('Por favor ingresa un monto válido mayor a 0');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onPaymentAdded({
        booking_id: booking.id,
        amount: numAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference: reference.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error al registrar el pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Nuevo Cobro / Abono
            </span>
            <h3 className="font-bold text-lg text-white mt-0.5">{booking.guest_name}</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status banner */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500">Total Reserva:</span>{' '}
            <strong className="text-slate-800">{formatUSD(booking.total_price)}</strong>
          </div>
          <div>
            <span className="text-slate-500">Saldo pendiente:</span>{' '}
            <strong className="text-amber-600 font-bold">{formatUSD(currentBalance)}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Quick Pay Buttons */}
          {currentBalance > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Atajos:</span>
              <button
                type="button"
                onClick={() => setAmount(String(currentBalance))}
                className="px-2.5 py-1 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold border border-emerald-200 transition"
              >
                Pagar Total ({formatUSD(currentBalance)})
              </button>
              <button
                type="button"
                onClick={() => setAmount(String(Math.round(currentBalance / 2)))}
                className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold border border-blue-200 transition"
              >
                50% ({formatUSD(Math.round(currentBalance / 2))})
              </button>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              Monto a Abonar (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">
                $
              </span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-16 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-semibold text-slate-400 text-xs">
                USD
              </span>
            </div>
            {numAmount > 0 && currentBalance > 0 && (
              <p className="text-[11px] text-slate-500 mt-1">
                Saldo que quedará pendiente:{' '}
                <strong className={remainingAfter === 0 ? 'text-emerald-600' : 'text-slate-700'}>
                  {formatUSD(remainingAfter)}
                </strong>
                {remainingAfter === 0 && ' (¡Quedará 100% Pagada! 🎉)'}
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Fecha de Cobro
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Method */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              Medio de Pago
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Nota / Referencia de comprobante
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej: Seña 30% en mano / Comprobante #98234"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg font-medium">{error}</p>
          )}

          {/* Actions */}
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
              className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Registrando...' : 'Confirmar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
