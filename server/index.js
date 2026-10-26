import 'dotenv/config';
import app from './app.js';
import db from './db.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
  console.log(`📦 Base de datos activa: ${db.getMode().toUpperCase()} (${db.isPostgres() ? 'PostgreSQL' : 'SQLite'})`);
});
