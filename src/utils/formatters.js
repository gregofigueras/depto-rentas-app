export const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const formatUSD = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

export const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Generates explicit text with Day and Month in Spanish (e.g., "5 de Octubre al 12 de Octubre de 2026")
export const formatDateSpanWithMonths = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return '';
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);

  const startMonth = MONTH_NAMES_ES[sm - 1];
  const endMonth = MONTH_NAMES_ES[em - 1];

  if (sy === ey) {
    if (sm === em) {
      return `${sd} al ${ed} de ${startMonth} de ${sy}`;
    }
    return `${sd} de ${startMonth} al ${ed} de ${endMonth} de ${sy}`;
  }
  return `${sd} de ${startMonth} de ${sy} al ${ed} de ${endMonth} de ${ey}`;
};

export const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const monthAbbr = MONTH_NAMES_ES[m - 1]?.slice(0, 3) || '';
  return `${d} ${monthAbbr} ${y}`;
};

// Generates the personalized WhatsApp confirmation / payment reminder message
export const generateWhatsAppMessage = (booking) => {
  const datesReadable = formatDateSpanWithMonths(booking.start_date, booking.end_date);
  const total = formatUSD(booking.total_price);
  const paid = formatUSD(booking.total_paid || 0);
  const balance = formatUSD(booking.balance_due || 0);
  const isPaid = (booking.balance_due || 0) <= 0;

  let depositInfo = '';
  if (booking.has_deposit && Number(booking.deposit_amount) > 0) {
    depositInfo = `\n🛡️ Depósito de garantía: ${formatUSD(booking.deposit_amount)} (${
      booking.deposit_status === 'paid' ? 'Ya recibido ✅' : 'Se abona al ingresar (reintegrable)'
    })`;
  }

  let text = `¡Hola ${booking.guest_name}! 👋\nTe comparto los detalles y estado de tu reserva en el departamento:\n\n`;
  text += `📅 *Fechas:* ${datesReadable} (${booking.nights} ${booking.nights === 1 ? 'noche' : 'noches'})\n`;
  text += `🕒 *Check-in:* ${booking.check_in_time || '15:00'} hs | *Check-out:* ${booking.check_out_time || '11:00'} hs\n`;
  text += `💰 *Importe Total:* ${total}\n`;
  text += `💳 *Total Abonado:* ${paid}\n`;

  if (isPaid) {
    text += `✅ *Estado:* ¡Totalmente liquidado al 100%! No tienes saldo pendiente.\n`;
  } else {
    text += `⏳ *Saldo Pendiente a liquidar:* ${balance} (al ingresar / previo a la llegada)\n`;
  }

  if (depositInfo) {
    text += `${depositInfo}\n`;
  }

  text += `\n¡Cualquier duda o consulta me avisas! Saludos cordiales. 🏠✨`;

  return text;
};
