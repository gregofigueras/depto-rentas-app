import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'rentas.db');
const db = new Database(dbPath);

// Enable Foreign Keys and WAL mode for reliability
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    document_id TEXT,
    city TEXT,
    rating INTEGER DEFAULT 5,
    notes TEXT,
    tags TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_id INTEGER,
    guest_name TEXT NOT NULL,
    guest_phone TEXT,
    origin TEXT NOT NULL CHECK(origin IN ('airbnb', 'particular', 'bloqueo')),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    check_in_time TEXT DEFAULT '15:00',
    check_out_time TEXT DEFAULT '11:00',
    nights INTEGER NOT NULL,
    total_price REAL NOT NULL DEFAULT 0,
    has_deposit INTEGER DEFAULT 0,
    deposit_amount REAL DEFAULT 0,
    deposit_status TEXT DEFAULT 'none' CHECK(deposit_status IN ('none', 'pending', 'paid', 'refunded', 'retained')),
    status TEXT DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'in_progress', 'completed', 'cancelled')),
    cleaning_status TEXT DEFAULT 'pending' CHECK(cleaning_status IN ('pending', 'in_progress', 'cleaned')),
    post_checkout_notes TEXT,
    post_checkout_tags TEXT DEFAULT '[]',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_date TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    reference TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    expense_date TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed initial sample data if empty so the user can test right away
const countGuests = db.prepare('SELECT COUNT(*) as count FROM guests').get().count;
if (countGuests === 0) {
  // Insert sample guests
  const insertGuest = db.prepare(`
    INSERT INTO guests (name, phone, email, document_id, city, rating, notes, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const g1 = insertGuest.run(
    'Carlos Méndez',
    '+54 9 11 5544-3322',
    'carlos.mendez@example.com',
    '34.889.120',
    'Córdoba, Argentina',
    5,
    'Huésped habitual. Siempre deja el depto impecable.',
    JSON.stringify(['repetir', 'muy educados', 'clientes fieles'])
  ).lastInsertRowid;

  const g2 = insertGuest.run(
    'Sophie Dupont',
    '+33 6 12 34 56 78',
    'sophie.dupont@paris.fr',
    'FR-889123',
    'París, Francia',
    5,
    'Turista tranquila, sin quejas de vecinos.',
    JSON.stringify(['muy educados', 'cuidaron todo'])
  ).lastInsertRowid;

  const g3 = insertGuest.run(
    'Esteban Rossi',
    '+54 9 341 876-5432',
    'esteban.rossi@gmail.com',
    '38.221.904',
    'Rosario, Argentina',
    4,
    'Viaja por trabajo con su notebook.',
    JSON.stringify(['silencioso', 'repetir'])
  ).lastInsertRowid;

  // Insert sample bookings
  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      guest_id, guest_name, guest_phone, origin, start_date, end_date,
      check_in_time, check_out_time, nights, total_price, has_deposit,
      deposit_amount, deposit_status, status, cleaning_status, post_checkout_notes, post_checkout_tags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Active booking 1: Partial payment (owes money)
  const b1 = insertBooking.run(
    g1,
    'Carlos Méndez',
    '+54 9 11 5544-3322',
    'particular',
    '2026-10-05',
    '2026-10-12',
    '15:00',
    '11:00',
    7,
    650,
    1,
    100,
    'paid',
    'confirmed',
    'cleaned',
    '',
    '[]'
  ).lastInsertRowid;

  // Active booking 2: 100% Paid
  const b2 = insertBooking.run(
    g2,
    'Sophie Dupont',
    '+33 6 12 34 56 78',
    'airbnb',
    '2026-10-15',
    '2026-10-20',
    '14:00',
    '11:00',
    5,
    480,
    0,
    0,
    'none',
    'confirmed',
    'cleaned',
    '',
    '[]'
  ).lastInsertRowid;

  // Past completed booking (should not appear in active payments screen)
  const b3 = insertBooking.run(
    g3,
    'Esteban Rossi',
    '+54 9 341 876-5432',
    'particular',
    '2026-09-10',
    '2026-09-15',
    '15:00',
    '11:00',
    5,
    420,
    0,
    0,
    'none',
    'completed',
    'cleaned',
    'Excelente estadía, súper puntual para el check-out.',
    JSON.stringify(['muy educados', 'repetir'])
  ).lastInsertRowid;

  // Insert payments
  const insertPayment = db.prepare(`
    INSERT INTO payments (booking_id, amount, payment_date, payment_method, reference)
    VALUES (?, ?, ?, ?, ?)
  `);

  // b1 has total $650, has paid $300 (balance $350)
  insertPayment.run(b1, 200, '2026-09-20', 'transfer', 'Seña 30% banco');
  insertPayment.run(b1, 100, '2026-09-25', 'cash_usd', 'Abono en mano');

  // b2 has total $480, has paid $480 (100% paid)
  insertPayment.run(b2, 480, '2026-09-18', 'other', 'Liquidación Airbnb');

  // b3 was completed and fully paid
  insertPayment.run(b3, 420, '2026-09-08', 'transfer', 'Pago total adelantado');

  // Insert sample expenses
  const insertExpense = db.prepare(`
    INSERT INTO expenses (category, description, amount, expense_date, notes)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertExpense.run('cleaning', 'Limpieza profunda post-check-out', 45, '2026-09-15', 'Servicio María');
  insertExpense.run('maintenance', 'Reparación canilla baño y cambio de cuerito', 35, '2026-09-18', 'Plomero Juan');
  insertExpense.run('services', 'Internet Fibra 300 Megas + Cable', 28, '2026-09-05', 'Abono mensual');
  insertExpense.run('supplies', 'Pack sábanas blancas algodón + toallas nuevas', 75, '2026-09-02', 'Insumos recambio');
}

export default db;
