import express from 'express';
import cors from 'cors';
import db, { initDb } from './db.js';
import axios from 'axios';
import ical from 'node-ical';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Ensure database and schema are initialized before processing requests
app.use(async (req, res, next) => {
  try {
    await initDb();
    next();
  } catch (err) {
    console.error('[Database Error]', err);
    res.status(500).json({ error: 'Error de conexión a la base de datos: ' + err.message });
  }
});

// Helper to calculate nights between 2 YYYY-MM-DD dates
function calculateNights(start, end) {
  const d1 = new Date(start + 'T00:00:00');
  const d2 = new Date(end + 'T00:00:00');
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

// -------------------------------------------------------------
// SYSTEM & HEALTH ENDPOINT
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: db.getMode(),
    isPostgres: db.isPostgres(),
    timestamp: new Date().toISOString()
  });
});

// -------------------------------------------------------------
// GUESTS CRM ENDPOINTS
// -------------------------------------------------------------
app.get('/api/guests', async (req, res) => {
  try {
    const guests = await db.getAll(`
      SELECT g.*, 
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(b.total_price), 0) as total_spent
      FROM guests g
      LEFT JOIN bookings b ON g.id = b.guest_id
      GROUP BY g.id
      ORDER BY g.name ASC
    `);

    const formatted = guests.map((g) => ({
      ...g,
      tags: g.tags ? JSON.parse(g.tags) : []
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/guests/:id', async (req, res) => {
  try {
    const guest = await db.getOne('SELECT * FROM guests WHERE id = ?', [req.params.id]);
    if (!guest) return res.status(404).json({ error: 'Huésped no encontrado' });

    const bookings = await db.getAll(
      `
      SELECT b.*, 
        COALESCE(SUM(p.amount), 0) as total_paid
      FROM bookings b
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.guest_id = ?
      GROUP BY b.id
      ORDER BY b.start_date DESC
    `,
      [req.params.id]
    );

    guest.tags = guest.tags ? JSON.parse(guest.tags) : [];
    res.json({ ...guest, bookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/guests', async (req, res) => {
  try {
    const { name, phone, email, document_id, city, rating, notes, tags } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const result = await db.run(
      `
      INSERT INTO guests (name, phone, email, document_id, city, rating, notes, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        name,
        phone || '',
        email || '',
        document_id || '',
        city || '',
        rating || 5,
        notes || '',
        JSON.stringify(tags || [])
      ]
    );

    const newGuest = await db.getOne('SELECT * FROM guests WHERE id = ?', [result.lastInsertRowid]);
    if (newGuest) {
      newGuest.tags = JSON.parse(newGuest.tags || '[]');
    }
    res.status(201).json(newGuest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/guests/:id', async (req, res) => {
  try {
    const { name, phone, email, document_id, city, rating, notes, tags } = req.body;
    await db.run(
      `
      UPDATE guests 
      SET name = ?, phone = ?, email = ?, document_id = ?, city = ?, rating = ?, notes = ?, tags = ?
      WHERE id = ?
    `,
      [
        name,
        phone,
        email,
        document_id,
        city,
        rating,
        notes,
        JSON.stringify(tags || []),
        req.params.id
      ]
    );

    const updated = await db.getOne('SELECT * FROM guests WHERE id = ?', [req.params.id]);
    if (updated) {
      updated.tags = JSON.parse(updated.tags || '[]');
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/guests/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM guests WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// BOOKINGS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/bookings', async (req, res) => {
  try {
    const { status, origin, search } = req.query;

    let query = `
      SELECT b.*,
        COALESCE(SUM(p.amount), 0) as total_paid,
        (b.total_price - COALESCE(SUM(p.amount), 0)) as balance_due,
        CASE 
          WHEN b.total_price <= 0 THEN 100
          ELSE ROUND(CAST((COALESCE(SUM(p.amount), 0) / b.total_price) * 100 AS NUMERIC), 1)
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

    query += ` GROUP BY b.id, g.id, g.rating, g.phone ORDER BY b.start_date DESC`;

    const bookings = await db.getAll(query, params);

    const formatted = bookings.map((b) => ({
      ...b,
      total_price: Number(b.total_price),
      total_paid: Number(b.total_paid),
      balance_due: Number(b.balance_due),
      payment_percentage: Number(b.payment_percentage),
      has_deposit: Boolean(b.has_deposit),
      is_fully_paid: Number(b.balance_due) <= 0,
      post_checkout_tags: b.post_checkout_tags ? JSON.parse(b.post_checkout_tags) : []
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bookings/:id', async (req, res) => {
  try {
    const booking = await db.getOne(
      `
      SELECT b.*,
        COALESCE(SUM(p.amount), 0) as total_paid,
        (b.total_price - COALESCE(SUM(p.amount), 0)) as balance_due,
        CASE 
          WHEN b.total_price <= 0 THEN 100
          ELSE ROUND(CAST((COALESCE(SUM(p.amount), 0) / b.total_price) * 100 AS NUMERIC), 1)
        END as payment_percentage
      FROM bookings b
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.id = ?
      GROUP BY b.id
    `,
      [req.params.id]
    );

    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });

    const payments = await db.getAll(
      `
      SELECT * FROM payments WHERE booking_id = ? ORDER BY payment_date DESC, id DESC
    `,
      [req.params.id]
    );

    let guest = null;
    if (booking.guest_id) {
      guest = await db.getOne('SELECT * FROM guests WHERE id = ?', [booking.guest_id]);
      if (guest && guest.tags) guest.tags = JSON.parse(guest.tags);
    }

    booking.total_price = Number(booking.total_price);
    booking.total_paid = Number(booking.total_paid);
    booking.balance_due = Number(booking.balance_due);
    booking.payment_percentage = Number(booking.payment_percentage);
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

app.post('/api/bookings', async (req, res) => {
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

    // If guest doesn't exist in CRM, create them or link if found (case-insensitive)
    if (!guest_id && origin !== 'bloqueo') {
      const existingGuest = await db.getOne('SELECT id FROM guests WHERE LOWER(name) = LOWER(?) LIMIT 1', [guest_name.trim()]);
      if (existingGuest) {
        guest_id = existingGuest.id;
      } else {
        const gRes = await db.run(
          `
          INSERT INTO guests (name, phone, email, notes, tags)
          VALUES (?, ?, ?, ?, ?)
        `,
          [
            guest_name.trim(),
            guest_phone || '',
            guest_email || '',
            'Creado automáticamente desde reserva',
            JSON.stringify(['nuevo'])
          ]
        );
        guest_id = gRes.lastInsertRowid;
      }
    }

    const result = await db.run(
      `
      INSERT INTO bookings (
        guest_id, guest_name, guest_phone, origin, start_date, end_date,
        check_in_time, check_out_time, nights, total_price, has_deposit,
        deposit_amount, deposit_status, status, cleaning_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
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
      ]
    );

    const bookingId = result.lastInsertRowid;

    // Optional initial payment if provided
    if (req.body.initial_payment && Number(req.body.initial_payment) > 0) {
      await db.run(
        `
        INSERT INTO payments (booking_id, amount, payment_date, payment_method, reference)
        VALUES (?, ?, ?, ?, ?)
      `,
        [
          bookingId,
          Number(req.body.initial_payment),
          req.body.initial_payment_date || start_date,
          req.body.initial_payment_method || 'transfer',
          'Pago inicial / Seña'
        ]
      );
    }

    const created = await db.getOne('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/bookings/:id', async (req, res) => {
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

    await db.run(
      `
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
    `,
      [
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
      ]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Checkout and Feedback Endpoint:
// Marks booking as 'completed', archives from active payments,
// and saves comments and tags to both the booking and the guest CRM record!
app.put('/api/bookings/:id/checkout', async (req, res) => {
  try {
    const { comment, tags, rating } = req.body;
    const booking = await db.getOne('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });

    // Update booking
    await db.run(
      `
      UPDATE bookings 
      SET status = 'completed', 
          cleaning_status = 'pending',
          post_checkout_notes = ?,
          post_checkout_tags = ?
      WHERE id = ?
    `,
      [comment || '', JSON.stringify(tags || []), req.params.id]
    );

    // If guest exists, update guest tags, rating and notes
    if (booking.guest_id) {
      const guest = await db.getOne('SELECT * FROM guests WHERE id = ?', [booking.guest_id]);
      if (guest) {
        let existingTags = [];
        try {
          existingTags = JSON.parse(guest.tags || '[]');
        } catch (e) {}
        const mergedTags = Array.from(new Set([...existingTags, ...(tags || [])]));

        let newNotes = guest.notes || '';
        if (comment) {
          const timestamp = new Date().toLocaleDateString('es-ES');
          newNotes += `\n[${timestamp}]: ${comment}`;
        }

        await db.run(
          `
          UPDATE guests 
          SET tags = ?, notes = ?, rating = COALESCE(?, rating)
          WHERE id = ?
        `,
          [JSON.stringify(mergedTags), newNotes.trim(), rating || guest.rating, booking.guest_id]
        );
      }
    }

    res.json({ success: true, message: 'Check-out completado y archivado exitosamente.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/bookings/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM bookings WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// PAYMENTS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/payments', async (req, res) => {
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

    const payments = await db.getAll(query, params);
    const formatted = payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
      total_price: Number(p.total_price)
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payments', async (req, res) => {
  try {
    const { booking_id, amount, payment_date, payment_method, reference } = req.body;
    if (!booking_id) return res.status(400).json({ error: 'El ID de reserva es requerido' });
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Monto inválido' });

    const result = await db.run(
      `
      INSERT INTO payments (booking_id, amount, payment_date, payment_method, reference)
      VALUES (?, ?, ?, ?, ?)
    `,
      [
        booking_id,
        Number(amount),
        payment_date || new Date().toISOString().split('T')[0],
        payment_method || 'cash_usd',
        reference || ''
      ]
    );

    // Fetch updated totals for this booking
    const updatedTotals = await db.getOne(
      `
      SELECT b.total_price,
        COALESCE(SUM(p.amount), 0) as total_paid,
        (b.total_price - COALESCE(SUM(p.amount), 0)) as balance_due
      FROM bookings b
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.id = ?
      GROUP BY b.id
    `,
      [booking_id]
    );

    const balanceDue = Number(updatedTotals?.balance_due || 0);

    res.status(201).json({
      payment_id: result.lastInsertRowid,
      total_price: Number(updatedTotals?.total_price || 0),
      total_paid: Number(updatedTotals?.total_paid || 0),
      balance_due: balanceDue,
      is_fully_paid: balanceDue <= 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/payments/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM payments WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// EXPENSES ENDPOINTS
// -------------------------------------------------------------
app.get('/api/expenses', async (req, res) => {
  try {
    const { category, year, month } = req.query;
    let query = `SELECT * FROM expenses WHERE 1=1`;
    const params = [];

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }
    if (year) {
      query += ` AND substr(expense_date, 1, 4) = ?`;
      params.push(String(year));
    }
    if (month) {
      const formattedMonth = String(month).padStart(2, '0');
      query += ` AND substr(expense_date, 6, 2) = ?`;
      params.push(formattedMonth);
    }

    query += ` ORDER BY expense_date DESC, id DESC`;
    const expenses = await db.getAll(query, params);
    const formatted = expenses.map((e) => ({
      ...e,
      amount: Number(e.amount)
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const { category, description, amount, expense_date, notes } = req.body;
    if (!description || !amount) return res.status(400).json({ error: 'Descripción y monto requeridos' });

    const result = await db.run(
      `
      INSERT INTO expenses (category, description, amount, expense_date, notes)
      VALUES (?, ?, ?, ?, ?)
    `,
      [
        category || 'other',
        description,
        Number(amount),
        expense_date || new Date().toISOString().split('T')[0],
        notes || ''
      ]
    );

    const created = await db.getOne('SELECT * FROM expenses WHERE id = ?', [result.lastInsertRowid]);
    if (created) {
      created.amount = Number(created.amount);
    }
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { category, description, amount, expense_date, notes } = req.body;
    await db.run(
      `
      UPDATE expenses SET category = ?, description = ?, amount = ?, expense_date = ?, notes = ?
      WHERE id = ?
    `,
      [category, description, Number(amount), expense_date, notes || '', req.params.id]
    );

    const updated = await db.getOne('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
    if (updated) {
      updated.amount = Number(updated.amount);
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// STATS & DASHBOARD METRICS
// -------------------------------------------------------------
app.get('/api/stats', async (req, res) => {
  try {
    const currentYear = req.query.year || new Date().getFullYear().toString();
    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');

    // 1. Total income actually collected (payments received in current year)
    const incomeYearRow = await db.getOne(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE substr(payment_date, 1, 4) = ?
    `,
      [currentYear]
    );
    const incomeYear = Number(incomeYearRow?.total || 0);

    // 2. Total expenses in current year
    const expensesYearRow = await db.getOne(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE substr(expense_date, 1, 4) = ?
    `,
      [currentYear]
    );
    const expensesYear = Number(expensesYearRow?.total || 0);

    // 3. Current month income & expenses
    const incomeMonthRow = await db.getOne(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE substr(payment_date, 1, 4) = ? AND substr(payment_date, 6, 2) = ?
    `,
      [currentYear, currentMonth]
    );
    const incomeMonth = Number(incomeMonthRow?.total || 0);

    const expensesMonthRow = await db.getOne(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE substr(expense_date, 1, 4) = ? AND substr(expense_date, 6, 2) = ?
    `,
      [currentYear, currentMonth]
    );
    const expensesMonth = Number(expensesMonthRow?.total || 0);

    // 4. Annual Average Daily Rate (ADR)
    const adrStatsRow = await db.getOne(
      `
      SELECT 
        COALESCE(SUM(total_price), 0) as total_revenue,
        COALESCE(SUM(nights), 0) as total_nights,
        COUNT(id) as total_bookings
      FROM bookings
      WHERE substr(start_date, 1, 4) = ? 
        AND status IN ('confirmed', 'in_progress', 'completed')
        AND origin != 'bloqueo'
    `,
      [currentYear]
    );

    const totalRevenue = Number(adrStatsRow?.total_revenue || 0);
    const totalNights = Number(adrStatsRow?.total_nights || 0);
    const totalBookings = Number(adrStatsRow?.total_bookings || 0);

    const averageDailyRate = totalNights > 0 ? Number((totalRevenue / totalNights).toFixed(2)) : 0;

    // 5. Active Payment Dashboard statistics:
    const activeBookings = await db.getAll(`
      SELECT b.id, b.total_price,
        COALESCE(SUM(p.amount), 0) as total_paid
      FROM bookings b
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.status IN ('confirmed', 'in_progress')
      GROUP BY b.id
    `);

    let fullyPaidCount = 0;
    let pendingCount = 0;
    let totalPendingAmount = 0;

    activeBookings.forEach((b) => {
      const balance = Number(b.total_price) - Number(b.total_paid);
      if (balance <= 0) {
        fullyPaidCount++;
      } else {
        pendingCount++;
        totalPendingAmount += balance;
      }
    });

    // 6. Upcoming check-ins and check-outs (Next 14 days)
    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingCheckins = await db.getAll(
      `
      SELECT id, guest_name, origin, start_date, end_date, check_in_time, total_price, status
      FROM bookings
      WHERE start_date >= ? AND status != 'cancelled'
      ORDER BY start_date ASC
      LIMIT 5
    `,
      [todayStr]
    );

    const upcomingCheckouts = await db.getAll(
      `
      SELECT id, guest_name, origin, start_date, end_date, check_out_time, cleaning_status, status
      FROM bookings
      WHERE end_date >= ? AND status IN ('confirmed', 'in_progress')
      ORDER BY end_date ASC
      LIMIT 5
    `,
      [todayStr]
    );

    const occupancyPercentage = Number(Math.min(100, (totalNights / 365) * 100).toFixed(1));

    res.json({
      currentYear,
      incomeYear,
      expensesYear,
      netProfitYear: incomeYear - expensesYear,
      incomeMonth,
      expensesMonth,
      netProfitMonth: incomeMonth - expensesMonth,
      adr: averageDailyRate,
      totalNightsYear: totalNights,
      totalBookingsYear: totalBookings,
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
app.get('/api/ical/url', async (req, res) => {
  try {
    const row = await db.getOne("SELECT value FROM settings WHERE key = 'airbnb_ical_url'");
    res.json({ url: row ? row.value : '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ical/sync', async (req, res) => {
  try {
    let { icalUrl } = req.body;
    if (!icalUrl) {
      const row = await db.getOne("SELECT value FROM settings WHERE key = 'airbnb_ical_url'");
      if (row) icalUrl = row.value;
    }

    if (!icalUrl) {
      return res.status(400).json({ error: 'Debes proporcionar la URL de iCal de Airbnb' });
    }

    // Save URL to settings
    await db.run(
      `
      INSERT INTO settings (key, value) VALUES ('airbnb_ical_url', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
      [icalUrl]
    );

    // Download .ics
    const response = await axios.get(icalUrl, { timeout: 10000 });
    const events = ical.parseICS(response.data);

    let syncedCount = 0;

    for (const key in events) {
      const ev = events[key];
      if (ev.type === 'VEVENT') {
        const start = ev.start.toISOString().split('T')[0];
        const end = ev.end.toISOString().split('T')[0];
        const nights = calculateNights(start, end);
        const summary = ev.summary || 'Reserva Airbnb';

        // Check if already registered
        const existing = await db.getOne(
          `
          SELECT id FROM bookings 
          WHERE origin = 'airbnb' AND start_date = ? AND end_date = ?
        `,
          [start, end]
        );

        if (!existing) {
          await db.run(
            `
            INSERT INTO bookings (
              guest_name, origin, start_date, end_date, nights, total_price, status, notes
            ) VALUES (?, 'airbnb', ?, ?, ?, 0, 'confirmed', ?)
          `,
            [
              summary.includes('Reserved') ? 'Huésped Airbnb' : summary,
              start,
              end,
              nights,
              `Importado automáticamente desde iCal Airbnb (${ev.uid || ''})`
            ]
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
app.get('/api/export/backup', async (req, res) => {
  try {
    const guests = await db.getAll('SELECT * FROM guests');
    const bookings = await db.getAll('SELECT * FROM bookings');
    const payments = await db.getAll('SELECT * FROM payments');
    const expenses = await db.getAll('SELECT * FROM expenses');

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
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

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

export default app;
