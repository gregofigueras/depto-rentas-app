import 'dotenv/config';
import pg from 'pg';

const { Pool, types } = pg;

// Parse PostgreSQL NUMERIC/DECIMAL to JS float, and INT8 (BIGINT / COUNT) to JS int
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));
types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING;
const isPg = Boolean(connectionString);

let pool = null;
let sqliteDb = null;

if (isPg) {
  const isLocalPg = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  pool = new Pool({
    connectionString,
    ssl: isLocalPg ? false : { rejectUnauthorized: false }
  });
  console.log('[Database] Modo: PostgreSQL (' + (isLocalPg ? 'local' : 'cloud / SSL') + ')');
} else {
  console.log('[Database] Modo: SQLite local (data/rentas.db)');
}

async function getSqliteDb() {
  if (!sqliteDb) {
    const { default: Database } = await import('better-sqlite3');
    const path = await import('path');
    const fs = await import('fs');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'rentas.db');
    sqliteDb = new Database(dbPath);
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');
  }
  return sqliteDb;
}

// Convert '?' placeholders to '$1, $2, $3...' for PostgreSQL
function formatPgQuery(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

export const db = {
  isPostgres: () => isPg,
  getMode: () => (isPg ? 'postgres' : 'sqlite'),

  // Execute query returning all rows
  getAll: async (sql, params = []) => {
    if (isPg) {
      const res = await pool.query(formatPgQuery(sql), params);
      return res.rows;
    } else {
      const sdb = await getSqliteDb();
      return sdb.prepare(sql).all(...params);
    }
  },

  // Execute query returning first row or null
  getOne: async (sql, params = []) => {
    if (isPg) {
      const res = await pool.query(formatPgQuery(sql), params);
      return res.rows[0] || null;
    } else {
      const sdb = await getSqliteDb();
      return sdb.prepare(sql).get(...params) || null;
    }
  },

  // Execute INSERT / UPDATE / DELETE returning lastInsertRowid and rowCount
  run: async (sql, params = []) => {
    if (isPg) {
      const isInsert = /^\s*insert\s+into\s+([a-zA-Z0-9_]+)/i.exec(sql);
      const tableName = isInsert ? isInsert[1].toLowerCase() : null;
      const hasReturning = /returning\s+/i.test(sql);

      let pgSql = sql;
      if (tableName && !hasReturning) {
        if (tableName === 'settings') {
          pgSql = `${sql} RETURNING key`;
        } else {
          pgSql = `${sql} RETURNING id`;
        }
      }

      const res = await pool.query(formatPgQuery(pgSql), params);
      const lastInsertRowid = res.rows?.[0]?.id || res.rows?.[0]?.key || null;
      return {
        lastInsertRowid,
        changes: res.rowCount,
        rowCount: res.rowCount
      };
    } else {
      const sdb = await getSqliteDb();
      const info = sdb.prepare(sql).run(...params);
      return {
        lastInsertRowid: info.lastInsertRowid,
        changes: info.changes,
        rowCount: info.changes
      };
    }
  },

  // Execute raw DDL statements
  exec: async (sql) => {
    if (isPg) {
      await pool.query(sql);
    } else {
      const sdb = await getSqliteDb();
      sdb.exec(sql);
    }
  }
};

let initPromise = null;

export async function initDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (isPg) {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS guests (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(100),
          email VARCHAR(255),
          document_id VARCHAR(100),
          city VARCHAR(100),
          rating INTEGER DEFAULT 5,
          notes TEXT,
          tags TEXT DEFAULT '[]',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS bookings (
          id SERIAL PRIMARY KEY,
          guest_id INTEGER REFERENCES guests(id) ON DELETE SET NULL,
          guest_name VARCHAR(255) NOT NULL,
          guest_phone VARCHAR(100),
          origin VARCHAR(50) NOT NULL,
          start_date VARCHAR(20) NOT NULL,
          end_date VARCHAR(20) NOT NULL,
          check_in_time VARCHAR(20) DEFAULT '15:00',
          check_out_time VARCHAR(20) DEFAULT '11:00',
          nights INTEGER NOT NULL,
          total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
          has_deposit INTEGER DEFAULT 0,
          deposit_amount NUMERIC(10,2) DEFAULT 0,
          deposit_status VARCHAR(50) DEFAULT 'none',
          status VARCHAR(50) DEFAULT 'confirmed',
          cleaning_status VARCHAR(50) DEFAULT 'pending',
          post_checkout_notes TEXT,
          post_checkout_tags TEXT DEFAULT '[]',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS payments (
          id SERIAL PRIMARY KEY,
          booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
          amount NUMERIC(10,2) NOT NULL,
          payment_date VARCHAR(20) NOT NULL,
          payment_method VARCHAR(50) NOT NULL,
          reference TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS expenses (
          id SERIAL PRIMARY KEY,
          category VARCHAR(100) NOT NULL,
          description VARCHAR(255) NOT NULL,
          amount NUMERIC(10,2) NOT NULL,
          expense_date VARCHAR(20) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS settings (
          key VARCHAR(100) PRIMARY KEY,
          value TEXT
        );
      `);
    } else {
      const sdb = await getSqliteDb();
      sdb.exec(`
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
          deposit_status TEXT DEFAULT 'none',
          status TEXT DEFAULT 'confirmed',
          cleaning_status TEXT DEFAULT 'pending',
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
    }
  })();

  return initPromise;
}

export default db;
