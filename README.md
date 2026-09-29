# 🏢 Depto Temporario - Administrador de Alquiler (Airbnb & Particulares)

Aplicación web completa para la administración y control financiero de alquileres temporarios en **USD**, pagos escalonados, sincronización de disponibilidad, control de gastos y CRM de huéspedes.

---

## 🚀 Inicio Rápido (1 Clic)

1. En Windows, simplemente haz doble clic en el archivo:
   👉 **`iniciar-app.bat`**
2. Se abrirá automáticamente tu navegador en:
   👉 **`http://localhost:3001`**

### Modo Desarrollo (Vite + Express):
```bash
npm run dev
```

---

## 🌟 Funcionalidades Implementadas

### 1. 💵 Precios Flexibles y Moneda en USD
- Todas las métricas, cobros y gastos se manejan en **USD ($)**.
- Puedes ingresar el **precio total que desees por estadía**, sin importar la cantidad de noches (con sugerencias automáticas opcionales por noche si deseas guiarte).

### 2. 💳 Control de Cobros y Pagos Escalonados
- **Pestaña "Falta Pagar"**: Muestra qué clientes tienen deuda pendiente, cuánto han abonado, cuánto resta pagar y una barra de progreso de pago en tiempo real.
- **Pestaña "100% Pagados"**: Clientes con reservas activas totalmente liquidadas.
- **Abonos Parciales**: Registra pagos con fecha, monto en USD y método (Efectivo USD, Transferencia, Zelle, USDT/Cripto, PayPal u otro).
- **Archivado al finalizar estadía**: Al hacer el check-out, la reserva pasa al historial de la base de datos y **desaparece de esta pantalla de cobranzas activas** para mantener limpia tu operativa diaria.

### 3. 💬 Mensajes de WhatsApp Claros (Día y Mes Explícito)
- Generador automático de resúmenes de reserva para WhatsApp con redacción precisa:
  - *"del 5 al 12 de Octubre de 2026"* (evita confusiones de fecha para el cliente).
  - Horarios de check-in / check-out.
  - Importe total, abonado y saldo pendiente a liquidar al ingresar.
  - Opciones para copiar texto con 1 clic o abrir directamente en WhatsApp Web / App.

### 4. 👥 CRM y Base de Datos de Clientes
- Registro permanente de huéspedes (Nombre, WhatsApp directo, Email, DNI/Pasaporte, Ciudad de origen).
- Historial completo de estadías acumuladas y total gastado por cada cliente.
- Calificación con estrellas (1 a 5).
- **Etiquetas y comentarios post-estadía**:
  - `⭐ Repetir`
  - `👌 Muy educados`
  - `💎 Clientes fieles`
  - `🧹 Cuidaron todo`
  - `🕒 Súper puntuales`
  - `⚠️ Ruidos molestos`, etc.
  - Campo de notas privadas para el anfitrión.

### 5. 📅 Calendario Visual de Ocupación & iCal Airbnb
- Calendario mensual con celdas de días libres (verde claro) y ocupados.
- Diferenciación visual por color:
  - 🟣 **Airbnb** (`#FF385C`)
  - 🔵 **Reserva Particular** (Azul)
  - 🟠 **Bloqueo / Mantenimiento** (Ámbar)
- Haz clic en cualquier día libre para crear una reserva para esa fecha.
- Haz clic en cualquier reserva para ver el detalle y registrar pagos rápidos.
- **Sincronización con Airbnb**: Pestaña para ingresar la URL `.ics` de tu calendario de Airbnb para importar y bloquear fechas automáticamente.

### 6. 🧮 Calculadora Rápida Integrada
- Accesible en cualquier momento desde el Dashboard o la barra superior.
- Operaciones matemáticas rápidas.
- Multiplicador de **Noches × Tarifa**.
- Botones de **Seña 30%** y **Seña 50%**.
- Botón "Usar en Reserva" para volcar el resultado directo al formulario.

### 7. 📈 Dashboard de Rentabilidad y ADR Anual
- **Ganancia Neta Real**: Total cobrado - Total gastos del año en curso.
- **ADR (Average Daily Rate)**: Valor promedio por noche según todas las reservas del año.
- **Por cobrar activo**: Suma total de lo que te deben las reservas vigentes.
- **Próximas Llegadas y Salidas**: Listado de check-ins y check-outs de los próximos 7 a 14 días con horarios y estado de limpieza.

### 8. 🛡️ Depósito de Garantía (Opcional)
- Toggle en el formulario de reserva para activarlo sólo cuando aplique.
- Monto en USD y estado: Pendiente, Cobrado en mano o Devuelto al check-out.

### 9. 🧾 Control de Gastos
- Carga de gastos por categoría (Limpieza, Mantenimiento/Reparaciones, Servicios/Expensas, Insumos/Amenities, Comisiones, etc.).
- Balances automáticos restados del ingreso bruto.

### 10. 💾 Copias de Seguridad (Backup)
- Botón en la barra superior para descargar un backup completo en formato `.json` con todas tus reservas, pagos, clientes y gastos.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 19, Tailwind CSS v4, Lucide Icons, Canvas Confetti.
- **Backend**: Node.js, Express 5, Better-SQLite3, Node-iCal, Axios.
- **Base de Datos**: SQLite local (`data/rentas.db`), rápida, confiable y portable sin configuraciones externas.
