// In-browser storage adapter for offline environments.

const STORAGE_KEYS = {
  GUESTS: 'depto_rentas_guests_v2',
  BOOKINGS: 'depto_rentas_bookings_v2',
  PAYMENTS: 'depto_rentas_payments_v2',
  EXPENSES: 'depto_rentas_expenses_v2',
  SETTINGS: 'depto_rentas_settings_v2',
};

const INITIAL_GUESTS = [];
const INITIAL_BOOKINGS = [];
const INITIAL_PAYMENTS = [];
const INITIAL_EXPENSES = [];

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
  // Clear any legacy demo data from localStorage and initialize clean empty arrays
  init: () => {
    // Purge old v1 demo keys if present
    const oldKeys = [
      'depto_rentas_guests_v1',
      'depto_rentas_bookings_v1',
      'depto_rentas_payments_v1',
      'depto_rentas_expenses_v1',
      'depto_rentas_settings_v1'
    ];
    oldKeys.forEach(k => localStorage.removeItem(k));

    if (!localStorage.getItem(STORAGE_KEYS.GUESTS)) setStored(STORAGE_KEYS.GUESTS, []);
    if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) setStored(STORAGE_KEYS.BOOKINGS, []);
    if (!localStorage.getItem(STORAGE_KEYS.PAYMENTS)) setStored(STORAGE_KEYS.PAYMENTS, []);
    if (!localStorage.getItem(STORAGE_KEYS.EXPENSES)) setStored(STORAGE_KEYS.EXPENSES, []);
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
    const guests = getStored(STORAGE_KEYS.GUESTS, INITIAL_GUESTS);
    const newId = Date.now();

    // Auto-create or link guest in CRM
    let guestId = data.guest_id || null;
    if (data.origin !== 'bloqueo' && data.guest_name && data.guest_name.trim()) {
      const cleanName = data.guest_name.trim();
      let existingGuest = guests.find((g) => g.id === guestId) || 
                          guests.find((g) => g.name.trim().toLowerCase() === cleanName.toLowerCase());

      if (existingGuest) {
        guestId = existingGuest.id;
        let modified = false;
        if (!existingGuest.phone && data.guest_phone) {
          existingGuest.phone = data.guest_phone;
          modified = true;
        }
        if (!existingGuest.email && data.guest_email) {
          existingGuest.email = data.guest_email;
          modified = true;
        }
        if (modified) {
          setStored(STORAGE_KEYS.GUESTS, guests);
        }
      } else {
        const newGuest = {
          id: Date.now() + 1,
          name: cleanName,
          phone: data.guest_phone || '',
          email: data.guest_email || '',
          document_id: '',
          city: '',
          rating: 5,
          notes: 'Registrado automáticamente desde reserva',
          tags: ['⭐ Cliente nuevo'],
          created_at: new Date().toISOString()
        };
        guests.push(newGuest);
        setStored(STORAGE_KEYS.GUESTS, guests);
        guestId = newGuest.id;
      }
    }

    // Calculate nights
    const d1 = new Date(data.start_date + 'T00:00:00');
    const d2 = new Date(data.end_date + 'T00:00:00');
    const diffDays = Math.max(1, Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)));

    const newBooking = {
      id: newId,
      guest_id: guestId,
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
    const guests = getStored(STORAGE_KEYS.GUESTS, INITIAL_GUESTS);
    const idx = bookings.findIndex((b) => b.id === Number(id));
    if (idx !== -1) {
      let guestId = data.guest_id || bookings[idx].guest_id || null;
      if (data.origin !== 'bloqueo' && data.guest_name && data.guest_name.trim()) {
        const cleanName = data.guest_name.trim();
        let existingGuest = guests.find((g) => g.id === guestId) || 
                            guests.find((g) => g.name.trim().toLowerCase() === cleanName.toLowerCase());
        if (existingGuest) {
          guestId = existingGuest.id;
          let modified = false;
          if (!existingGuest.phone && data.guest_phone) {
            existingGuest.phone = data.guest_phone;
            modified = true;
          }
          if (!existingGuest.email && data.guest_email) {
            existingGuest.email = data.guest_email;
            modified = true;
          }
          if (modified) {
            setStored(STORAGE_KEYS.GUESTS, guests);
          }
        } else {
          const newGuest = {
            id: Date.now() + 1,
            name: cleanName,
            phone: data.guest_phone || '',
            email: data.guest_email || '',
            document_id: '',
            city: '',
            rating: 5,
            notes: 'Registrado automáticamente desde reserva',
            tags: ['⭐ Cliente nuevo'],
            created_at: new Date().toISOString()
          };
          guests.push(newGuest);
          setStored(STORAGE_KEYS.GUESTS, guests);
          guestId = newGuest.id;
        }
      }

      bookings[idx] = { ...bookings[idx], ...data, guest_id: guestId };
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

    // Auto-backfill: If any booking has a guest_name not present in guests, add them!
    let guestAdded = false;
    bookings.forEach((b) => {
      if (b.origin !== 'bloqueo' && b.guest_name && b.guest_name.trim()) {
        const cleanName = b.guest_name.trim();
        const found = guests.find((g) => g.id === b.guest_id) ||
                      guests.find((g) => g.name.trim().toLowerCase() === cleanName.toLowerCase());
        if (!found) {
          const newG = {
            id: b.guest_id || (Date.now() + Math.floor(Math.random() * 1000)),
            name: cleanName,
            phone: b.guest_phone || '',
            email: '',
            document_id: '',
            city: '',
            rating: 5,
            notes: 'Registrado automáticamente desde reserva',
            tags: ['⭐ Cliente nuevo'],
            created_at: b.created_at || new Date().toISOString()
          };
          guests.push(newG);
          b.guest_id = newG.id;
          guestAdded = true;
        } else if (!b.guest_id) {
          b.guest_id = found.id;
          guestAdded = true;
        }
      }
    });

    if (guestAdded) {
      setStored(STORAGE_KEYS.GUESTS, guests);
      setStored(STORAGE_KEYS.BOOKINGS, bookings);
    }

    return guests.map((g) => {
      const gBookings = bookings.filter((b) => b.guest_id === g.id || b.guest_name?.trim().toLowerCase() === g.name.trim().toLowerCase());
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
