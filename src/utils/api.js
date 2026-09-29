const API_BASE = '/api';

export const api = {
  // Stats
  getStats: async (year) => {
    const res = await fetch(`${API_BASE}/stats${year ? `?year=${year}` : ''}`);
    if (!res.ok) throw new Error('Error al cargar métricas');
    return res.json();
  },

  // Bookings
  getBookings: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/bookings${query ? `?${query}` : ''}`);
    if (!res.ok) throw new Error('Error al cargar reservas');
    return res.json();
  },

  getBooking: async (id) => {
    const res = await fetch(`${API_BASE}/bookings/${id}`);
    if (!res.ok) throw new Error('Error al cargar reserva');
    return res.json();
  },

  createBooking: async (data) => {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al crear reserva');
    }
    return res.json();
  },

  updateBooking: async (id, data) => {
    const res = await fetch(`${API_BASE}/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al actualizar reserva');
    }
    return res.json();
  },

  completeCheckout: async (id, data) => {
    const res = await fetch(`${API_BASE}/bookings/${id}/checkout`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al completar check-out');
    }
    return res.json();
  },

  deleteBooking: async (id) => {
    const res = await fetch(`${API_BASE}/bookings/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar reserva');
    return res.json();
  },

  // Payments
  addPayment: async (data) => {
    const res = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al registrar pago');
    }
    return res.json();
  },

  deletePayment: async (id) => {
    const res = await fetch(`${API_BASE}/payments/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar pago');
    return res.json();
  },

  // Guests CRM
  getGuests: async () => {
    const res = await fetch(`${API_BASE}/guests`);
    if (!res.ok) throw new Error('Error al cargar huéspedes');
    return res.json();
  },

  getGuest: async (id) => {
    const res = await fetch(`${API_BASE}/guests/${id}`);
    if (!res.ok) throw new Error('Error al cargar huésped');
    return res.json();
  },

  createGuest: async (data) => {
    const res = await fetch(`${API_BASE}/guests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al crear huésped');
    }
    return res.json();
  },

  updateGuest: async (id, data) => {
    const res = await fetch(`${API_BASE}/guests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al actualizar huésped');
    }
    return res.json();
  },

  deleteGuest: async (id) => {
    const res = await fetch(`${API_BASE}/guests/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar huésped');
    return res.json();
  },

  // Expenses
  getExpenses: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/expenses${query ? `?${query}` : ''}`);
    if (!res.ok) throw new Error('Error al cargar gastos');
    return res.json();
  },

  createExpense: async (data) => {
    const res = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al crear gasto');
    }
    return res.json();
  },

  deleteExpense: async (id) => {
    const res = await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar gasto');
    return res.json();
  },

  // iCal
  getIcalUrl: async () => {
    const res = await fetch(`${API_BASE}/ical/url`);
    return res.json();
  },

  syncIcal: async (icalUrl) => {
    const res = await fetch(`${API_BASE}/ical/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ icalUrl }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al sincronizar iCal');
    }
    return res.json();
  },

  // Backup
  getBackup: async () => {
    const res = await fetch(`${API_BASE}/export/backup`);
    return res.json();
  }
};
