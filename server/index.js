import express from 'express';
import cors from 'cors';
import db from './db.js';
import axios from 'axios';
import ical from 'node-ical';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Helper to calculate nights between 2 YYYY-MM-DD dates
function calculateNights(start, end) {
  const d1 = new Date(start + 'T00:00:00');
  const d2 = new Date(end + 'T00:00:00');
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

// -------------------------------------------------------------
// GUESTS CRM ENDPOINTS
// -------------------------------------------------------------
app.get('/api/guests', (req, res) => {
  try {
    const guests = db.prepare(`
      SELECT g.*, 
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(b.total_price), 0) as total_spent
      FROM guests g
      LEFT JOIN bookings b ON g.id = b.guest_id
      GROUP BY g.id
      ORDER BY g.name ASC
    `).all();

    const formatted = guests.map(g => ({
      ...g,
      tags: g.tags ? JSON.parse(g.tags) : []
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/guests/:id', (req, res) => {
  try {
    const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(req.params.id);
    if (!guest) return res.status(404).json({ error: 'Huésped no encontrado' });

    const bookings = db.prepare(`
      SELECT b.*, 
        COALESCE(SUM(p.amount), 0) as total_paid
      FROM bookings b
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.guest_id = ?
      GROUP BY b.id
      ORDER BY b.start_date DESC
    `).all(req.params.id);

    guest.tags = guest.tags ? JSON.parse(guest.tags) : [];
    res.json({ ...guest, bookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/guests', (req, res) => {
  try {
    const { name, phone, email, document_id, city, rating, notes, tags } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const insert = db.prepare(`
      INSERT INTO guests (name, phone, email, document_id, city, rating, notes, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      name,
      phone || '',
      email || '',
      document_id || '',
      city || '',
      rating || 5,
      notes || '',
      JSON.stringify(tags || [])
    );

    const newGuest = db.prepare('SELECT * FROM guests WHERE id = ?').get(result.lastInsertRowid);
    newGuest.tags = JSON.parse(newGuest.tags || '[]');
    res.status(201).json(newGuest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/guests/:id', (req, res) => {
  try {
    const { name, phone, email, document_id, city, rating, notes, tags } = req.body;
    const update = db.prepare(`
      UPDATE guests 
      SET name = ?, phone = ?, email = ?, document_id = ?, city = ?, rating = ?, notes = ?, tags = ?
      WHERE id = ?
    `);

    update.run(
      name,
      phone,
      email,
      document_id,
      city,
      rating,
      notes,
      JSON.stringify(tags || []),
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM guests WHERE id = ?').get(req.params.id);
    updated.tags = JSON.parse(updated.tags || '[]');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/guests/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM guests WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// BOOKINGS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/bookings', (req, res) => {
  try {
    const { status, origin, search } = req.query;

    let query = `
      SELECT b.*,
        COALESCE(SUM(p.amount), 0) as total_paid,
        (b.total_price - COALESCE(SUM(p.amount), 0)) as balance_due,
        CASE 
          WHEN b.total_price <= 0 THEN 100
          ELSE ROUND((COALESCE(SUM(p.amount), 0) / b.total_price) * 100, 1)
        END as payment_percentage,
        g.rating as guest_rating,
        g.phone as guest_db_phone
      FROM bookings b
      LEFT JOIN payments p ON b.id = p.booking_id
      LEFT JOIN guests g ON b.guest_id = g.id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      if (status === 'active') {
        query += ` AND b.status IN ('confirmed', 'in_progress')`;
      } else {
        query += ` AND b.status = ?`;
        params.push(status);
      }
    }

    if (origin) {
      query += ` AND b.origin = ?`;
      params.push(origin);
    }

    if (search) {
      query += ` AND (b.guest_name LIKE ? OR b.notes LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` GROUP BY b.id ORDER BY b.start_date DESC`;

    const bookings = db.prepare(query).all(...params);

    const formatted = bookings.map(b => ({
      ...b,
      has_deposit: Boolean(b.has_deposit),
      is_fully_paid: b.balance_due <= 0,
      post_checkout_tags: b.post_checkout_tags ? JSON.parse(b.post_checkout_tags) : []
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bookings/:id', (req, res) => {
  try {
    const booking = db.prepare(`
      SELECT b.*,
        COALESCE(SUM(p.amount), 0) as total_paid,
        (b.total_price - COALESCE(SUM(p.amount), 0)) as balance_due,
        CASE 
          WHEN b.total_price <= 0 THEN 100
          ELSE ROUND((COALESCE(SUM(p.amount), 0) / b.total_price) * 100, 1)
        END as payment_percentage
      FROM bookings b
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.id = ?
      GROUP BY b.id
    `).get(req.params.id);

    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });

    const payments = db.prepare(`
      SELECT * FROM payments WHERE booking_id = ? ORDER BY payment_date DESC, id DESC
    `).all(req.params.id);

    let guest = null;
    if (booking.guest_id) {
      guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(booking.guest_id);
      if (guest && guest.tags) guest.tags = JSON.parse(guest.tags);
    }

    booking.has_deposit = Boolean(booking.has_deposit);
    booking.is_fully_paid = booking.balance_due <= 0;
    booking.post_checkout_tags = booking.post_checkout_tags ? JSON.parse(booking.post_checkout_tags) : [];

    res.json({
      ...booking,
      payments,
      guest
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bookings', (req, res) => {
  try {
    let {
      guest_id,
      guest_name,
      guest_phone,
      guest_email,
      origin,
      start_date,
      end_date,
      check_in_time,
      check_out_time,
      total_price,
      has_deposit,
      deposit_amount,
      deposit_status,
      status,
      cleaning_status,
      notes
    } = req.body;

    if (!guest_name) return res.status(400).json({ error: 'El nombre del huésped es requerido' });
    if (!start_date || !end_date) return res.status(400).json({ error: 'Las fechas son requeridas' });

    const nights = calculateNights(start_date, end_date);

    // If guest doesn't exist in CRM, create them or link if found
    if (!guest_id && origin !== 'bloqueo') {
      const existingGuest = db.prepare('SELECT id FROM guests WHERE name = ? COLLATE NOCASE').get(guest_name);
      if (existingGuest) {
        guest_id = existingGuest.id;
      } else {
        const createGuest = db.prepare(`
          INSERT INTO guests (name, phone, email, notes, tags)
          VALUES (?, ?, ?, ?, ?)
        `);
        const gRes = createGuest.run(
          guest_name,
          guest_phone || '',
          guest_email || '',
          'Creado automáticamente desde reserva',
          JSON.stringify(['nuevo'])
        );
        guest_id = gRes.lastInsertRowid;
      }
    }

    const insert = db.prepare(`
      INSERT INTO bookings (
        guest_id, guest_name, guest_phone, origin, start_date, end_date,
        check_in_time, check_out_time, nights, total_price, has_deposit,
        deposit_amount, deposit_status, status, cleaning_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      guest_id || null,
      guest_name,
      guest_phone || '',
      origin || 'particular',
      start_date,
      end_date,
      check_in_time || '15:00',
      check_out_time || '11:00',
      nights,
      Number(total_price) || 0,
      has_deposit ? 1 : 0,
      Number(deposit_amount) || 0,
      deposit_status || (has_deposit ? 'pending' : 'none'),
      status || 'confirmed',
      cleaning_status || 'pending',
      notes || ''
    );

    const bookingId = result.lastInsertRowid;

    // Optional initial payment if provided
    if (req.body.initial_payment && Number(req.body.initial_payment) > 0) {
      db.prepare(`
        INSERT INTO payments (booking_id, amount, payment_date, payment_method, reference)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        bookingId,
        Number(req.body.initial_payment),
        req.body.initial_payment_date || start_date,
        req.body.initial_payment_method || 'transfer',
        'Pago inicial / Seña'
      );
    }

    const created = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/bookings/:id', (req, res) => {
  try {
    const {
      guest_id,
      guest_name,
      guest_phone,
      origin,
      start_date,
      end_date,
      check_in_time,
      check_out_time,
      total_price,
      has_deposit,
      deposit_amount,
      deposit_status,
      status,
      cleaning_status,
      notes,
      post_checkout_notes,
      post_checkout_tags
    } = req.body;

    const nights = calculateNights(start_date, end_date);

    const update = db.prepare(`
      UPDATE bookings SET
        guest_id = ?,
        guest_name = ?,
        guest_phone = ?,
        origin = ?,
        start_date = ?,
        end_date = ?,
        check_in_time = ?,
        check_out_time = ?,
        nights = ?,
        total_price = ?,
        has_deposit = ?,
        deposit_amount = ?,
        deposit_status = ?,
        status = ?,
        cleaning_status = ?,
        notes = ?,
        post_checkout_notes = ?,
        post_checkout_tags = ?
      WHERE id = ?
    `);

    update.run(
      guest_id || null,
      guest_name,
      guest_phone || '',
      origin,
      start_date,
      end_date,
      check_in_time,
      check_out_time,
      nights,
      Number(total_price),
      has_deposit ? 1 : 0,
      Number(deposit_amount) || 0,
      deposit_status,
      status,
      cleaning_status,
      notes || '',
      post_checkout_notes || '',
      JSON.stringify(post_checkout_tags || []),
      req.params.id
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Checkout and Feedback Endpoint:
// Marks booking as 'completed', archives from active payments,
// and saves comments and tags to both the booking and the guest CRM record!
app.put('/api/bookings/:id/checkout', (req, res) => {
  try {
    const { comment, tags, rating } = req.body;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });

    // Update booking
    db.prepare(`
      UPDATE bookings 
      SET status = 'completed', 
          cleaning_status = 'pending',
          post_checkout_notes = ?,
          post_checkout_tags = ?
      WHERE id = ?
    `).run(
      comment || '',
      JSON.stringify(tags || []),
      req.params.id
    );

    // If guest exists, update guest tags, rating and notes
    if (booking.guest_id) {
      const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(booking.guest_id);
      if (guest) {
        let existingTags = [];
        try { existingTags = JSON.parse(guest.tags || '[]'); } catch (e) {}
        const mergedTags = Array.from(new Set([...existingTags, ...(tags || [])]));
        
        let newNotes = guest.notes || '';
        if (comment) {
          const timestamp = new Date().toLocaleDateString('es-ES');
          newNotes += `\n[${timestamp}]: ${comment}`;
        }

        db.prepare(`
          UPDATE guests 
          SET tags = ?, notes = ?, rating = COALESCE(?, rating)
          WHERE id = ?
        `).run(
          JSON.stringify(mergedTags),
          newNotes.trim(),
          rating || guest.rating,
          booking.guest_id
        );
      }
    }

    res.json({ success: true, message: 'Check-out completado y archivado exitosamente.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/bookings/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// PAYMENTS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/payments', (req, res) => {
  try {
    const { booking_id } = req.query;
    let query = `
      SELECT p.*, b.guest_name, b.start_date, b.end_date, b.total_price
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
    `;
    const params = [];
    if (booking_id) {
      query += ` WHERE p.booking_id = ?`;
      params.push(booking_id);
    }
    query += ` ORDER BY p.payment_date DESC, p.id DESC`;

    const payments = db.prepare(query).all(...params);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payments', (req, res) => {
  try {
    const { booking_id, amount, payment_date, payment_method, reference } = req.body;
    if (!booking_id) return res.status(400).json({ error: 'El ID de reserva es requerido' });
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Monto inválido' });

    const insert = db.prepare(`
      INSERT INTO payments (booking_id, amount, payment_date, payment_method, reference)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      booking_id,
      Number(amount),
      payment_date || new Date().toISOString().split('T')[0],
      payment_method || 'cash_usd',
      reference || ''
    );

    // Fetch updated totals for this booking
    const updatedTotals = db.prepare(`
      SELECT b.total_price,
        COALESCE(SUM(p.amount), 0) as total_paid,
        (b.total_price - COALESCE(SUM(p.amount), 0)) as balance_due
      FROM bookings b
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.id = ?
      GROUP BY b.id
    `).get(booking_id);

    res.status(201).json({
      payment_id: result.lastInsertRowid,
      ...updatedTotals,
      is_fully_paid: updatedTotals.balance_due <= 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/payments/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// EXPENSES ENDPOINTS
// -------------------------------------------------------------
app.get('/api/expenses', (req, res) => {
  try {
    const { category, year, month } = req.query;
    let query = `SELECT * FROM expenses WHERE 1=1`;
    const params = [];

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }
    if (year) {
      query += ` AND strftime('%Y', expense_date) = ?`;
      params.push(String(year));
    }
    if (month) {
      const formattedMonth = String(month).padStart(2, '0');
      query += ` AND strftime('%m', expense_date) = ?`;
      params.push(formattedMonth);
    }

    query += ` ORDER BY expense_date DESC, id DESC`;
    const expenses = db.prepare(query).all(...params);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expenses', (req, res) => {
  try {
    const { category, description, amount, expense_date, notes } = req.body;
    if (!description || !amount) return res.status(400).json({ error: 'Descripción y monto requeridos' });

    const insert = db.prepare(`
      INSERT INTO expenses (category, description, amount, expense_date, notes)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      category || 'other',
      description,
      Number(amount),
      expense_date || new Date().toISOString().split('T')[0],
      notes || ''
    );

    const created = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/expenses/:id', (req, res) => {
  try {
    const { category, description, amount, expense_date, notes } = req.body;
    db.prepare(`
      UPDATE expenses SET category = ?, description = ?, amount = ?, expense_date = ?, notes = ?
      WHERE id = ?
    `).run(category, description, Number(amount), expense_date, notes || '', req.params.id);

    const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/expenses/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// STATS & DASHBOARD METRICS
// -------------------------------------------------------------
app.get('/api/stats', (req, res) => {
  try {
    const currentYear = req.query.year || new Date().getFullYear().toString();
    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');

    // 1. Total income actually collected (payments received in current year)
    const incomeYear = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE strftime('%Y', payment_date) = ?
    `).get(currentYear).total;

    // 2. Total expenses in current year
    const expensesYear = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE strftime('%Y', expense_date) = ?
    `).get(currentYear).total;

    // 3. Current month income & expenses
    const incomeMonth = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE strftime('%Y', payment_date) = ? AND strftime('%m', payment_date) = ?
    `).get(currentYear, currentMonth).total;

    const expensesMonth = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE strftime('%Y', expense_date) = ? AND strftime('%m', expense_date) = ?
    `).get(currentYear, currentMonth).total;

    // 4. Annual Average Daily Rate (ADR - Valor promedio por noche según lo registrado en el año)
    // Formula: Sum(total_price of confirmed/completed bookings in the year) / Sum(nights of those bookings)
    const adrStats = db.prepare(`
      SELECT 
        COALESCE(SUM(total_price), 0) as total_revenue,
        COALESCE(SUM(nights), 0) as total_nights,
        COUNT(id) as total_bookings
      FROM bookings
      WHERE strftime('%Y', start_date) = ? 
        AND status IN ('confirmed', 'in_progress', 'completed')
        AND origin != 'bloqueo'
    `).get(currentYear);

    const averageDailyRate = adrStats.total_nights > 0 
      ? Number((adrStats.total_revenue / adrStats.total_nights).toFixed(2)) 
      : 0;

    // 5. Active Payment Dashboard statistics:
    // Only ACTIVE bookings (confirmed or in_progress, NOT completed/cancelled)
    const activeBookings = db.prepare(`
      SELECT b.id, b.total_price,
        COALESCE(SUM(p.amount), 0) as total_paid
      FROM bookings b
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.status IN ('confirmed', 'in_progress')
      GROUP BY b.id
    `).all();

    let fullyPaidCount = 0;
    let pendingCount = 0;
    let totalPendingAmount = 0;

    activeBookings.forEach(b => {
      const balance = b.total_price - b.total_paid;
      if (balance <= 0) {
        fullyPaidCount++;
      } else {
        pendingCount++;
        totalPendingAmount += balance;
      }
    });

    // 6. Upcoming check-ins and check-outs (Next 14 days)
    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingCheckins = db.prepare(`
      SELECT id, guest_name, origin, start_date, end_date, check_in_time, total_price, status
      FROM bookings
      WHERE start_date >= ? AND status != 'cancelled'
      ORDER BY start_date ASC
      LIMIT 5
    `).all(todayStr);

    const upcomingCheckouts = db.prepare(`
      SELECT id, guest_name, origin, start_date, end_date, check_out_time, cleaning_status, status
      FROM bookings
      WHERE end_date >= ? AND status IN ('confirmed', 'in_progress')
      ORDER BY end_date ASC
      LIMIT 5
    `).all(todayStr);

    // 7. Occupancy Rate of the year (nights booked / 365)
    const occupancyPercentage = Number(Math.min(100, (adrStats.total_nights / 365) * 100).toFixed(1));

    res.json({
      currentYear,
      incomeYear,
      expensesYear,
      netProfitYear: incomeYear - expensesYear,
      incomeMonth,
      expensesMonth,
      netProfitMonth: incomeMonth - expensesMonth,
      adr: averageDailyRate,
      totalNightsYear: adrStats.total_nights,
      totalBookingsYear: adrStats.total_bookings,
      occupancyPercentage,
      activeStats: {
        fullyPaidCount,
        pendingCount,
        totalPendingAmount: Number(totalPendingAmount.toFixed(2))
      },
      upcomingCheckins,
      upcomingCheckouts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// AIRBNB iCAL INTEGRATION
// -------------------------------------------------------------
app.get('/api/ical/url', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'airbnb_ical_url'").get();
  res.json({ url: row ? row.value : '' });
});

app.post('/api/ical/sync', async (req, res) => {
  try {
    let { icalUrl } = req.body;
    if (!icalUrl) {
      const row = db.prepare("SELECT value FROM settings WHERE key = 'airbnb_ical_url'").get();
      if (row) icalUrl = row.value;
    }

    if (!icalUrl) {
      return res.status(400).json({ error: 'Debes proporcionar la URL de iCal de Airbnb' });
    }

    // Save URL to settings
    db.prepare(`
      INSERT INTO settings (key, value) VALUES ('airbnb_ical_url', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(icalUrl);

    // Download .ics
    const response = await axios.get(icalUrl, { timeout: 10000 });
    const events = ical.parseICS(response.data);

    let syncedCount = 0;
    const insertBooking = db.prepare(`
      INSERT INTO bookings (
        guest_name, origin, start_date, end_date, nights, total_price, status, notes
      ) VALUES (?, 'airbnb', ?, ?, ?, 0, 'confirmed', ?)
    `);

    const checkExisting = db.prepare(`
      SELECT id FROM bookings 
      WHERE origin = 'airbnb' AND start_date = ? AND end_date = ?
    `);

    for (const key in events) {
      const ev = events[key];
      if (ev.type === 'VEVENT') {
        const start = ev.start.toISOString().split('T')[0];
        const end = ev.end.toISOString().split('T')[0];
        const nights = calculateNights(start, end);
        const summary = ev.summary || 'Reserva Airbnb';

        // Check if already registered
        const existing = checkExisting.get(start, end);
        if (!existing) {
          insertBooking.run(
            summary.includes('Reserved') ? 'Huésped Airbnb' : summary,
            start,
            end,
            nights,
            `Importado automáticamente desde iCal Airbnb (${ev.uid || ''})`
          );
          syncedCount++;
        }
      }
    }

    res.json({ success: true, syncedCount, message: `Sincronización exitosa: ${syncedCount} reservas nuevas añadidas.` });
  } catch (error) {
    res.status(500).json({ error: 'Error al sincronizar iCal: ' + error.message });
  }
});

// -------------------------------------------------------------
// BACKUP & EXPORT
// -------------------------------------------------------------
app.get('/api/export/backup', (req, res) => {
  try {
    const guests = db.prepare('SELECT * FROM guests').all();
    const bookings = db.prepare('SELECT * FROM bookings').all();
    const payments = db.prepare('SELECT * FROM payments').all();
    const expenses = db.prepare('SELECT * FROM expenses').all();

    res.json({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      guests,
      bookings,
      payments,
      expenses
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend build if in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Fallback for SPA routing in Express 5
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint de API no encontrado' });
  }
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).send('Servidor API activo. En desarrollo, abre la app desde Vite (puerto 5173).');
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
