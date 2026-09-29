import React, { useState } from 'react';
import { X, Copy, Check, Send, MessageCircle, Phone } from 'lucide-react';
import { generateWhatsAppMessage } from '../utils/formatters';

export default function WhatsAppShareModal({ booking, isOpen, onClose }) {
  if (!isOpen || !booking) return null;

  const defaultMsg = generateWhatsAppMessage(booking);
  const [message, setMessage] = useState(defaultMsg);
  const [copied, setCopied] = useState(false);

  const cleanPhone = (booking.guest_phone || booking.guest_db_phone || '').replace(/[^0-9]/g, '');

  const copyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openWhatsApp = () => {
    const encoded = encodeURIComponent(message);
    let url = `https://wa.me/?text=${encoded}`;
    if (cleanPhone) {
      url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-emerald-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">Enviar Resumen por WhatsApp</h3>
              <p className="text-xs text-emerald-100">{booking.guest_name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-xs text-slate-500">
            Mensaje generado con el desglose exacto (fechas con día y mes explícitos, señas y saldo restante):
          </div>

          <div className="relative">
            <textarea
              rows="9"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-sans leading-relaxed text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all resize-none"
            ></textarea>
          </div>

          {booking.guest_phone ? (
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-3 py-2 rounded-xl">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>Teléfono detectado: <strong>{booking.guest_phone}</strong></span>
            </div>
          ) : (
            <div className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              ℹ️ No hay teléfono registrado para este huésped. Al hacer clic en "Abrir en WhatsApp" se abrirá tu WhatsApp para que elijas el contacto a quién enviárselo.
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={copyMessage}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-2 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? '¡Copiado!' : 'Copiar Texto'}
            </button>

            <button
              type="button"
              onClick={openWhatsApp}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all hover:scale-102"
            >
              <Send className="w-4 h-4" />
              Abrir en WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
