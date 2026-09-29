import React, { useState } from 'react';
import { X, Star, CheckCircle, Tag, MessageSquare, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

const PRESET_TAGS = [
  '⭐ Repetir',
  '👌 Muy educados',
  '💎 Clientes fieles',
  '🧹 Cuidaron todo',
  '🕒 Súper puntuales',
  '🔇 Silenciosos',
  '⚠️ Ruidos molestos',
  '🚭 Dejó olor a tabaco',
  '🔧 Daños menores'
];

export default function CheckoutModal({ booking, isOpen, onClose, onCheckoutSuccess }) {
  if (!isOpen || !booking) return null;

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState(['⭐ Repetir', '👌 Muy educados']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await onCheckoutSuccess({
        rating,
        comment,
        tags: selectedTags,
      });

      // Celebration effect
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {}

      onClose();
    } catch (err) {
      setError(err.message || 'Error al completar el check-out');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasDebt = (booking.balance_due || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-6 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Finalizar Estadía
              </span>
              <span className="text-xs text-slate-300">Check-out Huésped</span>
            </div>
            <h3 className="font-bold text-lg text-white mt-1">{booking.guest_name}</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {hasDebt && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                <span className="font-bold block">Aviso de saldo pendiente:</span>
                Esta reserva aún figura con un saldo a pagar de <strong>${booking.balance_due} USD</strong>. 
                Si completas el check-out, la reserva pasará al historial de la base de datos y saldrá del panel de cobros activos.
              </div>
            </div>
          )}

          {/* Rating */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Calificación general de la estadía
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform focus:outline-none"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300 hover:text-slate-400'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm font-semibold text-slate-700">
                {rating === 5 && '¡Excelente cliente! ⭐⭐⭐⭐⭐'}
                {rating === 4 && 'Muy buena experiencia ⭐⭐⭐⭐'}
                {rating === 3 && 'Aceptable con observaciones ⭐⭐⭐'}
                {rating <= 2 && 'Atención / Mala experiencia ⭐⭐'}
              </span>
            </div>
          </div>

          {/* Quick Tag Pills */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              Etiquetas del Huésped (se guardan en su historial CRM)
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs scale-102 ring-2 ring-blue-400/30'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Comentario sobre la estadía y el huésped
            </label>
            <textarea
              rows="3"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ej: Muy educados, dejaron todo limpio y en orden. Respondieron rápido los mensajes, súper recomendables..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:text-slate-400"
            ></textarea>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg font-medium">{error}</p>
          )}

          {/* Footer Actions */}
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
              className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : 'Finalizar y Archivar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
