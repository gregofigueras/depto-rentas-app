import React, { useState } from 'react';
import { 
  Receipt, Plus, Search, Filter, Trash2, Calendar, 
  Tag, DollarSign, Sparkles, Wrench, Sparkle, Zap, Coffee, FileSpreadsheet
} from 'lucide-react';
import { formatUSD, formatShortDate, MONTH_NAMES_ES } from '../utils/formatters';

const CATEGORIES = [
  { id: 'cleaning', label: 'Limpieza', icon: Sparkle, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'maintenance', label: 'Mantenimiento / Reparaciones', icon: Wrench, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'services', label: 'Servicios / Expensas', icon: Zap, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'supplies', label: 'Insumos / Amenities / Sábanas', icon: Coffee, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'commission', label: 'Comisiones', icon: Receipt, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { id: 'other', label: 'Otros Gastos', icon: DollarSign, color: 'text-slate-600 bg-slate-50 border-slate-200' },
];

export default function ExpensesView({
  expenses = [],
  onCreateExpense,
  onDeleteExpense
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [category, setCategory] = useState('cleaning');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Total expenses calculation
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description || !amount) return;

    setIsSubmitting(true);
    try {
      await onCreateExpense({
        category,
        description: description.trim(),
        amount: Number(amount),
        expense_date: expenseDate,
        notes: notes.trim(),
      });
      setShowModal(false);
      setDescription('');
      setAmount('');
      setNotes('');
    } catch (err) {
      alert(err.message || 'Error al guardar gasto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesCategory = selectedCategory ? e.category === selectedCategory : true;
    const matchesSearch = 
      e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            Control de Gastos del Departamento
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Gastos y Mantenimiento
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Registra costos de limpieza, reparaciones, servicios y reposición en USD.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-right">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Registrado
            </span>
            <span className="text-xl font-extrabold text-slate-900">
              {formatUSD(totalExpenses)}
            </span>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-rose-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            + Cargar Gasto
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por concepto o detalle de gasto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
          />
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition ${
              selectedCategory === ''
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todos ({expenses.length})
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition ${
                selectedCategory === cat.id
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expense List */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No hay gastos registrados</h3>
          <p className="text-xs text-slate-500 mt-1">
            Usa el botón "+ Cargar Gasto" para registrar servicios, artículos o arreglos.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredExpenses.map((exp) => {
              const catInfo = CATEGORIES.find((c) => c.id === exp.category) || CATEGORIES[5];
              const IconComp = catInfo.icon;

              return (
                <div
                  key={exp.id}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`p-2.5 rounded-xl border ${catInfo.color}`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                          {exp.description}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          {catInfo.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{formatShortDate(exp.expense_date)}</span>
                        {exp.notes && (
                          <>
                            <span>•</span>
                            <span className="italic text-slate-400">{exp.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-base sm:text-lg font-black text-rose-600">
                      -{formatUSD(exp.amount)}
                    </span>
                    <button
                      onClick={async () => {
                        if (confirm(`¿Eliminar gasto "${exp.description}"?`)) {
                          await onDeleteExpense(exp.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Eliminar gasto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900">Cargar Nuevo Gasto</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Categoría de Gasto
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Concepto / Descripción *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Limpieza profunda post check-out"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Monto en USD *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-14 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:bg-white focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-semibold text-xs text-slate-400">USD</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Fecha del Gasto
                </label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Detalles / Proveedor / Notas
                </label>
                <input
                  type="text"
                  placeholder="Ej: Factura #2891 / Plomería Martínez"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
