"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Receipt } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/* =====================
   TYPES
===================== */

type Category = "renta" | "sueldos" | "internet" | "publicidad" | "servicios" | "otros";

type FixedExpense = {
  id: string;
  category: Category;
  description: string;
  amount: number;
  month: number;
  year: number;
};

const CATEGORY_LABELS: Record<Category, string> = {
  renta:       "Renta",
  sueldos:     "Sueldos",
  internet:    "Internet",
  publicidad:  "Publicidad",
  servicios:   "Servicios",
  otros:       "Otros",
};

const CATEGORY_COLORS: Record<Category, string> = {
  renta:       "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  sueldos:     "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  internet:    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  publicidad:  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  servicios:   "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  otros:       "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

/* =====================
   PAGE
===================== */

export default function GastosFijosPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [loading,  setLoading]  = useState(false);

  // Form
  const [category,    setCategory]    = useState<Category>("renta");
  const [description, setDescription] = useState("");
  const [amount,      setAmount]      = useState<number | "">("");

  /* =====================
     LOAD
  ===================== */

  async function loadExpenses() {
    setLoading(true);
    const { data, error } = await supabase
      .from("fixed_expenses")
      .select("id, category, description, amount, month, year")
      .eq("month", month)
      .eq("year", year)
      .order("category");

    if (error) alert(error.message);
    else setExpenses((data ?? []) as FixedExpense[]);
    setLoading(false);
  }

  useEffect(() => { loadExpenses(); }, [month, year]);

  /* =====================
     TOTALS
  ===================== */

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses]
  );

  const byCategory = useMemo(() => {
    const map: Partial<Record<Category, number>> = {};
    for (const e of expenses) {
      map[e.category] = (map[e.category] ?? 0) + Number(e.amount);
    }
    return map;
  }, [expenses]);

  /* =====================
     ACTIONS
  ===================== */

  async function addExpense() {
    if (!description.trim() || !amount || Number(amount) <= 0) {
      alert("Completa la descripción y el monto");
      return;
    }

    const { error } = await supabase.from("fixed_expenses").insert({
      category,
      description,
      amount: Number(amount),
      month,
      year,
    });

    if (error) { alert(error.message); return; }

    setDescription("");
    setAmount("");
    loadExpenses();
  }

  async function deleteExpense(id: string) {
    const ok = confirm("¿Eliminar este gasto fijo?");
    if (!ok) return;
    await supabase.from("fixed_expenses").delete().eq("id", id);
    loadExpenses();
  }

  /* =====================
     UI
  ===================== */

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold">Gastos Fijos</h1>
        <p className="text-sm text-muted">Registro mensual de costos fijos del negocio</p>
      </div>

      {/* SELECTOR DE MES */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <Receipt size={16} className="text-muted" />
        <select
          className="input"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          className="input"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-sm font-semibold text-green-400">
          Total: Q{total.toFixed(2)}
        </span>
      </div>

      {/* RESUMEN POR CATEGORÍA */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(Object.keys(byCategory) as Category[]).map((cat) => (
            <div key={cat} className="card p-3">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat]}`}>
                {CATEGORY_LABELS[cat]}
              </span>
              <p className="text-lg font-bold mt-2">Q{byCategory[cat]!.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}

      {/* FORMULARIO */}
      <div className="card p-5 space-y-4">
        <h2 className="font-medium flex items-center gap-2">
          <Plus size={16} /> Agregar gasto fijo
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted block mb-1">Categoría</label>
            <select
              className="input w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">Monto (Q)</label>
            <input
              type="number"
              className="input w-full"
              placeholder="0.00"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs text-muted block mb-1">Descripción</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Ej: Renta local, sueldo mensajero..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addExpense()}
              />
              <button onClick={addExpense} className="btn btn-primary px-5">
                Agregar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* LISTA */}
      <div className="card p-0 overflow-x-auto">
        {loading ? (
          <p className="p-6 text-sm text-muted">Cargando…</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[rgb(var(--border))] text-muted text-xs uppercase tracking-wider">
                <th className="p-3 text-left">Categoría</th>
                <th className="p-3 text-left">Descripción</th>
                <th className="p-3 text-right">Monto</th>
                <th className="p-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-t border-[rgb(var(--border))]">
                  <td className="p-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[e.category]}`}>
                      {CATEGORY_LABELS[e.category]}
                    </span>
                  </td>
                  <td className="p-3">{e.description}</td>
                  <td className="p-3 text-right font-medium text-red-500">
                    Q{Number(e.amount).toFixed(2)}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => deleteExpense(e.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}

              {expenses.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted">
                    No hay gastos fijos registrados para {MONTHS[month - 1]} {year}
                  </td>
                </tr>
              )}

              {expenses.length > 0 && (
                <tr className="border-t border-[rgb(var(--border))] font-semibold bg-[rgb(var(--card-soft))]">
                  <td colSpan={2} className="p-3">Total</td>
                  <td className="p-3 text-right text-red-500">Q{total.toFixed(2)}</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
