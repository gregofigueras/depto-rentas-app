// In-browser storage adapter for Vercel and offline environments.
// Enables the entire application to work 100% client-side if a backend server is not available.

const STORAGE_KEYS = {
  GUESTS: 'depto_rentas_guests_v1',
  BOOKINGS: 'depto_rentas_bookings_v1',
  PAYMENTS: 'depto_rentas_payments_v1',
  EXPENSES: 'depto_rentas_expenses_v1',
  SETTINGS: 'depto_rentas_settings_v1',
};

const INITIAL_GUESTS = [
  {
    id: 1,
    name: 'Carlos Méndez',
    phone: '+54 9 11 5544-3322',
    email: 'carlos.mendez@example.com',
    document_id: '34.889.120',
    city: 'Córdoba, Argentina',
    rating: 5,
    notes: 'Huésped habitual. Siempre deja el depto impecable.',
    tags: ['⭐ Repetir', '👌 Muy educados', '💎 Clientes fieles'],
    total_bookings: 1,
    total_spent: 650,
    created_at: '2026-09-20'
  },
  {
    id: 2,
    name: 'Sophie Dupont',
    phone: '+33 6 12 34 56 78',
    email: 'sophie.dupont@paris.fr',
    document_id: 'FR-889123',
    city: 'París, Francia',
    rating: 5,
    notes: 'Turista tranquila, sin quejas de vecinos.',
    tags: ['👌 Muy educados', '🧹 Cuidaron todo'],
    total_bookings: 1,
    total_spent: 480,
    created_at: '2026-09-21'
  },
  {
    id: 3,
    name: 'Esteban Rossi',
    phone: '+54 9 341 876-5432',
    email: 'esteban.rossi@gmail.com',
    document_id: '38.221.904',
    city: 'Rosario, Argentina',
    rating: 4,
    notes: 'Viaja por trabajo con su notebook.',
    tags: ['🔇 Silenciosos', '⭐ Repetir'],
    total_bookings: 1,
    total_spent: 420,
    created_at: '2026-09-10'
  }
];

const INITIAL_BOOKINGS = [
  {
    id: 1,
    guest_id: 1,
    guest_name: 'Carlos Méndez',
    guest_phone: '+54 9 11 5544-3322',
    origin: 'particular',
    start_date: '2026-10-05',
    end_date: '2026-10-12',
    check_in_time: '15:00',
    check_out_time: '11:00',
    nights: 7,
    total_price: 650,
    has_deposit: true,
    deposit_amount: 100,
    deposit_status: 'paid',
    status: 'confirmed',
    cleaning_status: 'cleaned',
    notes: 'Solicitó check-in tarde',
    post_checkout_notes: '',
    post_checkout_tags: []
  },
  {
    id: 2,
    guest_id: 2,
    guest_name: 'Sophie Dupont',
    guest_phone: '+33 6 12 34 56 78',
    origin: 'airbnb',
    start_date: '2026-10-15',
    end_date: '2026-10-20',
    check_in_time: '14:00',
    check_out_time: '11:00',
    nights: 5,
    total_price: 480,
    has_deposit: false,
    deposit_amount: 0,
    deposit_status: 'none',
    status: 'confirmed',
    cleaning_status: 'cleaned',
    notes: 'Reserva Airbnb',
    post_checkout_notes: '',
    post_checkout_tags: []
  },
  {
    id: 3,
    guest_id: 3,
    guest_name: 'Esteban Rossi',
    guest_phone: '+54 9 341 876-5432',
    origin: 'particular',
    start_date: '2026-09-10',
    end_date: '2026-09-15',
    check_in_time: '15:00',
    check_out_time: '11:00',
    nights: 5,
    total_price: 420,
    has_deposit: false,
    deposit_amount: 0,
    deposit_status: 'none',
    status: 'completed',
    cleaning_status: 'cleaned',
    notes: '',
    post_checkout_notes: 'Excelente estadía, súper puntual para el check-out.',
    post_checkout_tags: ['👌 Muy educados', '⭐ Repetir']
  }
];

const INITIAL_PAYMENTS = [
  { id: 1, booking_id: 1, amount: 200, payment_date: '2026-09-20', payment_method: 'transfer', reference: 'Seña 30% banco' },
  { id: 2, booking_id: 1, amount: 100, payment_date: '2026-09-25', payment_method: 'cash_usd', reference: 'Abono en mano' },
  { id: 3, booking_id: 2, amount: 480, payment_date: '2026-09-18', payment_method: 'other', reference: 'Liquidación Airbnb' },
  { id: 4, booking_id: 3, amount: 420, payment_date: '2026-09-08', payment_method: 'transfer', reference: 'Pago total adelantado' }
];

const INITIAL_EXPENSES = [
  { id: 1, category: 'cleaning', description: 'Limpieza profunda post-check-out', amount: 45, expense_date: '2026-09-15', notes: 'Servicio María' },
  { id: 2, category: 'maintenance', description: 'Reparación canilla baño y cambio de cuerito', amount: 35, expense_date: '2026-09-18', notes: 'Plomero Juan' },
  { id: 3, category: 'services', description: 'Internet Fibra 300 Megas + Cable', amount: 28, expense_date: '2026-09-05', notes: 'Abono mensual' },
  { id: 4, category: 'supplies', description: 'Pack sábanas blancas algodón + toallas nuevas', amount: 75, expense_date: '2026-09-02', notes: 'Insumos recambio' }
];

function getStored(key, defaultVal) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function setStored(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
}

export const localStore = {
  // Initialize sample data if not present
  init: () => {
    if (!localStorage.getItem(STORAGE_KEYS.GUESTS)) setStored(STORAGE_KEYS.GUESTS, INITIAL_GUESTS);
    if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) setStored(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
    if (!localStorage.getItem(STORAGE_KEYS.PAYMENTS)) setStored(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    if (!localStorage.getItem(STORAGE_KEYS.EXPENSES)) setStored(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
  },

  getStats: (targetYear) => {
    localStore.init();
    const currentYear = targetYear || new Date().getFullYear().toString();
    const payments = getStored(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    const expenses = getStored(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    const bookings = localStore.getBookings();

    // 1. Total income
    const incomeYear = payments
      .filter((p) => p.payment_date && p.payment_date.startsWith(currentYear))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // 2. Total expenses
    const expensesYear = expenses
      .filter((e) => e.expense_date && e.expense_date.startsWith(currentYear))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // 3. ADR (Average Daily Rate)
    const validBookings = bookings.filter(
      (b) =>
        b.start_date &&
        b.start_date.startsWith(currentYear) &&
        b.origin !== 'bloqueo' &&
        b.status !== 'cancelled'
    );
    const totalRev = validBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
    const totalNights = validBookings.reduce((sum, b) => sum + (Number(b.nights) || 0), 0);
    const adr = totalNights > 0 ? Number((totalRev / totalNights).toFixed(2)) : 0;

    // 4. Active payment statistics
    const activeBookings = bookings.filter(
      (b) => b.status === 'confirmed' || b.status === 'in_progress'
    );

    let fullyPaidCount = 0;
    let pendingCount = 0;
    let totalPendingAmount = 0;

    activeBookings.forEach((b) => {
      const balance = (b.total_price || 0) - (b.total_paid || 0);
      if (balance <= 0) {
        fullyPaidCount++;
      } else {
        pendingCount++;
        totalPendingAmount += balance;
      }
    });

    // 5. Upcoming checkins and checkouts
    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingCheckins = bookings
      .filter((b) => b.start_date >= todayStr && b.status !== 'cancelled')
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .slice(0, 5);

    const upcomingCheckouts = bookings
      .filter((b) => b.end_date >= todayStr && (b.status === 'confirmed' || b.status === 'in_progress'))
      .sort((a, b) => a.end_date.localeCompare(b.end_date))
      .slice(0, 5);

    const occupancyPercentage = Number(Math.min(100, (totalNights / 365) * 100).toFixed(1));

    return {
      currentYear,
      incomeYear,
      expensesYear,
      netProfitYear: incomeYear - expensesYear,
      incomeMonth: incomeYear,
      expensesMonth: expensesYear,
      netProfitMonth: incomeYear - expensesYear,
      adr,
      totalNightsYear: totalNights,
      totalBookingsYear: validBookings.length,
      occupancyPercentage,
      activeStats: {
        fullyPaidCount,
        pendingCount,
        totalPendingAmount: Number(totalPendingAmount.toFixed(2)),
      },
      upcomingCheckins,
      upcomingCheckouts,
    };
  },

  getBookings: (params = {}) => {
    localStore.init();
    const bookings = getStored(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
    const payments = getStored(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    const guests = getStored(STORAGE_KEYS.GUESTS, INITIAL_GUESTS);

    const enriched = bookings.map((b) => {
      const bookingPayments = payments.filter((p) => p.booking_id === b.id);
      const totalPaid = bookingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const balanceDue = (Number(b.total_price) || 0) - totalPaid;
      const pct = b.total_price > 0 ? Number(((totalPaid / b.total_price) * 100).toFixed(1)) : 100;
      const guest = guests.find((g) => g.id === b.guest_id);

      return {
        ...b,
        total_paid: totalPaid,
        balance_due: balanceDue,
        payment_percentage: pct,
        is_fully_paid: balanceDue <= 0,
        guest_rating: guest?.rating || 5,
        guest_db_phone: guest?.phone || '',
      };
    });

    return enriched.sort((a, b) => b.start_date.localeCompare(a.start_date));
  },

  createBooking: (data) => {
    localStore.init();
    const bookings = getStored(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
    const newId = Date.now();

    // Calculate nights
    const d1 = new Date(data.start_date + 'T00:00:00');
    const d2 = new Date(data.end_date + 'T00:00:00');
    const diffDays = Math.max(1, Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)));

    const newBooking = {
      id: newId,
      guest_id: data.guest_id || null,
      guest_name: data.guest_name,
      guest_phone: data.guest_phone || '',
      origin: data.origin || 'particular',
      start_date: data.start_date,
      end_date: data.end_date,
      check_in_time: data.check_in_time || '15:00',
      check_out_time: data.check_out_time || '11:00',
      nights: diffDays,
      total_price: Number(data.total_price) || 0,
      has_deposit: Boolean(data.has_deposit),
      deposit_amount: Number(data.deposit_amount) || 0,
      deposit_status: data.deposit_status || (data.has_deposit ? 'pending' : 'none'),
      status: data.status || 'confirmed',
      cleaning_status: data.cleaning_status || 'pending',
      notes: data.notes || '',
      post_checkout_notes: '',
      post_checkout_tags: [],
      created_at: new Date().toISOString()
    };

    bookings.unshift(newBooking);
    setStored(STORAGE_KEYS.BOOKINGS, bookings);

    // Initial payment if any
    if (data.initial_payment && Number(data.initial_payment) > 0) {
      localStore.addPayment({
        booking_id: newId,
        amount: Number(data.initial_payment),
        payment_date: data.initial_payment_date || data.start_date,
        payment_method: data.initial_payment_method || 'transfer',
        reference: 'Pago inicial / Seña'
      });
    }

    return newBooking;
  },

  updateBooking: (id, data) => {
    localStore.init();
    const bookings = getStored(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
    const idx = bookings.findIndex((b) => b.id === Number(id));
    if (idx !== -1) {
      bookings[idx] = { ...bookings[idx], ...data };
      setStored(STORAGE_KEYS.BOOKINGS, bookings);
      return bookings[idx];
    }
    return null;
  },

  completeCheckout: (id, feedback) => {
    localStore.init();
    const bookings = getStored(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
    const idx = bookings.findIndex((b) => b.id === Number(id));
    if (idx !== -1) {
      const b = bookings[idx];
      b.status = 'completed';
      b.cleaning_status = 'pending';
      b.post_checkout_notes = feedback.comment || '';
      b.post_checkout_tags = feedback.tags || [];
      setStored(STORAGE_KEYS.BOOKINGS, bookings);

      // Update guest in CRM
      if (b.guest_id) {
        const guests = getStored(STORAGE_KEYS.GUESTS, INITIAL_GUESTS);
        const gIdx = guests.findIndex((g) => g.id === b.guest_id);
        if (gIdx !== -1) {
          const g = guests[gIdx];
          const existingTags = g.tags || [];
          g.tags = Array.from(new Set([...existingTags, ...(feedback.tags || [])]));
          if (feedback.rating) g.rating = feedback.rating;
          if (feedback.comment) {
            const dateStr = new Date().toLocaleDateString('es-ES');
            g.notes = (g.notes ? `${g.notes}\n` : '') + `[${dateStr}]: ${feedback.comment}`;
          }
          setStored(STORAGE_KEYS.GUESTS, guests);
        }
      }

      return { success: true };
    }
    throw new Error('Reserva no encontrada');
  },

  deleteBooking: (id) => {
    localStore.init();
    let bookings = getStored(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
    bookings = bookings.filter((b) => b.id !== Number(id));
    setStored(STORAGE_KEYS.BOOKINGS, bookings);
    return { success: true };
  },

  // Payments
  addPayment: (data) => {
    localStore.init();
    const payments = getStored(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    const newPayment = {
      id: Date.now(),
      booking_id: Number(data.booking_id),
      amount: Number(data.amount),
      payment_date: data.payment_date || new Date().toISOString().split('T')[0],
      payment_method: data.payment_method || 'cash_usd',
      reference: data.reference || '',
      created_at: new Date().toISOString()
    };
    payments.unshift(newPayment);
    setStored(STORAGE_KEYS.PAYMENTS, payments);
    return newPayment;
  },

  deletePayment: (id) => {
    localStore.init();
    let payments = getStored(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    payments = payments.filter((p) => p.id !== Number(id));
    setStored(STORAGE_KEYS.PAYMENTS, payments);
    return { success: true };
  },

  // Guests
  getGuests: () => {
    localStore.init();
    const guests = getStored(STORAGE_KEYS.GUESTS, INITIAL_GUESTS);
    const bookings = getStored(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);

    return guests.map((g) => {
      const gBookings = bookings.filter((b) => b.guest_id === g.id);
      const totalSpent = gBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
      return {
        ...g,
        total_bookings: gBookings.length,
        total_spent: totalSpent
      };
    });
  },

  createGuest: (data) => {
    localStore.init();
    const guests = getStored(STORAGE_KEYS.GUESTS, INITIAL_GUESTS);
    const newGuest = {
      id: Date.now(),
      name: data.name,
      phone: data.phone || '',
      email: data.email || '',
      document_id: data.document_id || '',
      city: data.city || '',
      rating: data.rating || 5,
      notes: data.notes || '',
      tags: data.tags || [],
      created_at: new Date().toISOString()
    };
    guests.push(newGuest);
    setStored(STORAGE_KEYS.GUESTS, guests);
    return newGuest;
  },

  updateGuest: (id, data) => {
    localStore.init();
    const guests = getStored(STORAGE_KEYS.GUESTS, INITIAL_GUESTS);
    const idx = guests.findIndex((g) => g.id === Number(id));
    if (idx !== -1) {
      guests[idx] = { ...guests[idx], ...data };
      setStored(STORAGE_KEYS.GUESTS, guests);
      return guests[idx];
    }
    return null;
  },

  deleteGuest: (id) => {
    localStore.init();
    let guests = getStored(STORAGE_KEYS.GUESTS, INITIAL_GUESTS);
    guests = guests.filter((g) => g.id !== Number(id));
    setStored(STORAGE_KEYS.GUESTS, guests);
    return { success: true };
  },

  // Expenses
  getExpenses: () => {
    localStore.init();
    return getStored(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
  },

  createExpense: (data) => {
    localStore.init();
    const expenses = getStored(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    const newExpense = {
      id: Date.now(),
      category: data.category || 'other',
      description: data.description,
      amount: Number(data.amount),
      expense_date: data.expense_date || new Date().toISOString().split('T')[0],
      notes: data.notes || '',
      created_at: new Date().toISOString()
    };
    expenses.unshift(newExpense);
    setStored(STORAGE_KEYS.EXPENSES, expenses);
    return newExpense;
  },

  deleteExpense: (id) => {
    localStore.init();
    let expenses = getStored(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    expenses = expenses.filter((e) => e.id !== Number(id));
    setStored(STORAGE_KEYS.EXPENSES, expenses);
    return { success: true };
  },

  getBackup: () => {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      guests: getStored(STORAGE_KEYS.GUESTS, INITIAL_GUESTS),
      bookings: getStored(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS),
      payments: getStored(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS),
      expenses: getStored(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES),
    };
  }
};
