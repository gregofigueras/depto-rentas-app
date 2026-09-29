import { localStore } from './localStore';

const API_BASE = '/api';
let useLocalFallback = false;

// Helper to attempt backend request first; if 404 or network failure (e.g. Vercel static deployment),
// smoothly fallback to in-browser storage without crashing the UI.
async function requestWithFallback(url, options = {}, fallbackFn) {
  if (useLocalFallback) {
    return fallbackFn();
  }

  try {
    const res = await fetch(url, options);
    // If backend endpoint is missing (404) or server unavailable, switch to local storage
    if (!res.ok) {
      if (res.status === 404 || res.status === 502 || res.status === 503 || res.status === 504) {
        console.info(`[Depto App] Endpoint ${url} no disponible en este entorno (${res.status}). Usando almacenamiento local del navegador.`);
        useLocalFallback = true;
        return fallbackFn();
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error ${res.status}`);
    }
    return res.json();
  } catch (err) {
    console.info(`[Depto App] No se pudo conectar con backend (${url}). Activando almacenamiento local.`);
    useLocalFallback = true;
    return fallbackFn();
  }
}

export const api = {
  // Stats
  getStats: async (year) => {
    return requestWithFallback(
      `${API_BASE}/stats${year ? `?year=${year}` : ''}`,
      { method: 'GET' },
      () => localStore.getStats(year)
    );
  },

  // Bookings
  getBookings: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return requestWithFallback(
      `${API_BASE}/bookings${query ? `?${query}` : ''}`,
      { method: 'GET' },
      () => localStore.getBookings(params)
    );
  },

  getBooking: async (id) => {
    return requestWithFallback(
      `${API_BASE}/bookings/${id}`,
      { method: 'GET' },
      () => {
        const bookings = localStore.getBookings();
        return bookings.find((b) => b.id === Number(id)) || null;
      }
    );
  },

  createBooking: async (data) => {
    return requestWithFallback(
      `${API_BASE}/bookings`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localStore.createBooking(data)
    );
  },

  updateBooking: async (id, data) => {
    return requestWithFallback(
      `${API_BASE}/bookings/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localStore.updateBooking(id, data)
    );
  },

  completeCheckout: async (id, data) => {
    return requestWithFallback(
      `${API_BASE}/bookings/${id}/checkout`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localStore.completeCheckout(id, data)
    );
  },

  deleteBooking: async (id) => {
    return requestWithFallback(
      `${API_BASE}/bookings/${id}`,
      { method: 'DELETE' },
      () => localStore.deleteBooking(id)
    );
  },

  // Payments
  addPayment: async (data) => {
    return requestWithFallback(
      `${API_BASE}/payments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localStore.addPayment(data)
    );
  },

  deletePayment: async (id) => {
    return requestWithFallback(
      `${API_BASE}/payments/${id}`,
      { method: 'DELETE' },
      () => localStore.deletePayment(id)
    );
  },

  // Guests CRM
  getGuests: async () => {
    return requestWithFallback(
      `${API_BASE}/guests`,
      { method: 'GET' },
      () => localStore.getGuests()
    );
  },

  getGuest: async (id) => {
    return requestWithFallback(
      `${API_BASE}/guests/${id}`,
      { method: 'GET' },
      () => {
        const guests = localStore.getGuests();
        return guests.find((g) => g.id === Number(id)) || null;
      }
    );
  },

  createGuest: async (data) => {
    return requestWithFallback(
      `${API_BASE}/guests`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localStore.createGuest(data)
    );
  },

  updateGuest: async (id, data) => {
    return requestWithFallback(
      `${API_BASE}/guests/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localStore.updateGuest(id, data)
    );
  },

  deleteGuest: async (id) => {
    return requestWithFallback(
      `${API_BASE}/guests/${id}`,
      { method: 'DELETE' },
      () => localStore.deleteGuest(id)
    );
  },

  // Expenses
  getExpenses: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return requestWithFallback(
      `${API_BASE}/expenses${query ? `?${query}` : ''}`,
      { method: 'GET' },
      () => localStore.getExpenses(params)
    );
  },

  createExpense: async (data) => {
    return requestWithFallback(
      `${API_BASE}/expenses`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localStore.createExpense(data)
    );
  },

  deleteExpense: async (id) => {
    return requestWithFallback(
      `${API_BASE}/expenses/${id}`,
      { method: 'DELETE' },
      () => localStore.deleteExpense(id)
    );
  },

  // iCal
  getIcalUrl: async () => {
    return requestWithFallback(
      `${API_BASE}/ical/url`,
      { method: 'GET' },
      () => ({ url: localStorage.getItem('airbnb_ical_url') || '' })
    );
  },

  syncIcal: async (icalUrl) => {
    return requestWithFallback(
      `${API_BASE}/ical/sync`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icalUrl }),
      },
      () => {
        localStorage.setItem('airbnb_ical_url', icalUrl);
        return { success: true, syncedCount: 0, message: 'URL de iCal guardada localmente.' };
      }
    );
  },

  // Backup
  getBackup: async () => {
    return requestWithFallback(
      `${API_BASE}/export/backup`,
      { method: 'GET' },
      () => localStore.getBackup()
    );
  }
};
