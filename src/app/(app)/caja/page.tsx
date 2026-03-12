"use client";

import { useEffect, useMemo, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, ShoppingBag, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/* =====================
   TYPES
===================== */

type Sale = {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  status: "pendiente" | "enviado" | "entregado" | "no_recibido";
  payment_type: "pagado" | "contra_entrega";
  created_at: string;
};

type Expense = {
  id: string;
  description: string;
  amount: number;
};

/* =====================
   PAGE
===================== */

export default function CajaPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);

  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  // Form gasto
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  /* =====================
     LOAD
  ===================== */

  async function loadData() {
    setLoading(true);
    const [salesRes, expRes] = await Promise.all([
      supabase
        .from("sales")
        .select("id, order_number, customer_name, total, status, payment_type, created_at")
        .gte("created_at", `${date}T00:00:00`)
        .lte("created_at", `${date}T23:59:59`)
        .order("created_at", { ascending: false }),
      supabase
        .from("expenses")
        .select("id, description, amount")
        .eq("expense_date", date)
        .order("created_at", { ascending: false }),
    ]);

    setSales((salesRes.data ?? []) as Sale[]);
    setExpenses((expRes.data ?? []) as Expense[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [date]);

  /* =====================
     CÁLCULOS
  ===================== */

  const entregadas = useMemo(() => sales.filter((s) => s.status === "entregado"), [sales]);
  const totalIngresos = useMemo(() => entregadas.reduce((sum, s) => sum + Number(s.total), 0), [entregadas]);
  const totalGastos = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount), 0), [expenses]);
  const saldoNeto = totalIngresos - totalGastos;

  /* =====================
     ACTIONS
  ===================== */

  async function addExpense() {
    if (!desc.trim() || !amount || Number(amount) <= 0) {
      alert("Completa la descripción y el monto");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("expenses").insert({
      description: desc.trim(),
      amount: Number(amount),
      expense_date: date,
    });
    setSaving(false);
    if (error) { alert(error.message); return; }
    setDesc("");
    setAmount("");
    loadData();
  }

  async function deleteExpense(id: string) {
    if (!confirm("¿Eliminar este gasto?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    loadData();
  }

  /* =====================
     UI
  ===================== */

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Caja diaria</h1>
          <p className="text-sm text-muted">Ingresos y gastos del día</p>
        </div>
        <input
          type="date"
          className="input w-auto"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Ingresos"
          value={`Q${totalIngresos.toFixed(2)}`}
          sub={`${entregadas.length} venta${entregadas.length !== 1 ? "s" : ""} entregada${entregadas.length !== 1 ? "s" : ""}`}
          icon={<TrendingUp size={17} />}
          color="green"
        />
        <MetricCard
          label="Gastos operacionales"
          value={`Q${totalGastos.toFixed(2)}`}
          sub={`${expenses.length} registro${expenses.length !== 1 ? "s" : ""}`}
          icon={<TrendingDown size={17} />}
          color="red"
        />
        <MetricCard
          label="Saldo neto"
          value={`Q${saldoNeto.toFixed(2)}`}
          sub="Ingresos − gastos"
          icon={<Wallet size={17} />}
          color={saldoNeto >= 0 ? "green" : "red"}
        />
      </div>

      {/* VENTAS DEL DÍA */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
          <ShoppingBag size={14} /> Ventas del día ({sales.length})
        </h2>
        <div className="card p-0 overflow-x-auto">
          {loading ? (
            <p className="p-5 text-sm text-muted">Cargando…</p>
          ) : sales.length === 0 ? (
            <p className="p-5 text-sm text-muted text-center">Sin ventas para esta fecha</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[rgb(var(--border))] text-muted text-xs uppercase tracking-wider">
                  <th className="p-3 text-left">Pedido</th>
                  <th className="p-3 text-left">Cliente</th>
                  <th className="p-3 text-center">Pago</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-t border-[rgb(var(--border))]">
                    <td className="p-3 font-mono text-xs">{s.order_number}</td>
                    <td className="p-3 font-medium">{s.customer_name}</td>
                    <td className="p-3 text-center">
                      <span className={`badge ${s.payment_type === "contra_entrega" ? "badge-orange" : "badge-green"}`}>
                        {s.payment_type === "contra_entrega" ? "C/E" : "Pagado"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`badge ${
                        s.status === "entregado"   ? "badge-green"  :
                        s.status === "no_recibido" ? "badge-red"    :
                        s.status === "enviado"     ? "badge-blue"   : "badge-yellow"
                      }`}>
                        {s.status === "pendiente"   ? "Pendiente"   :
                         s.status === "enviado"     ? "Enviado"     :
                         s.status === "entregado"   ? "Entregado"   : "No recibido"}
                      </span>
                    </td>
                    <td className={`p-3 text-right font-medium ${
                      s.status === "no_recibido" ? "text-muted line-through" :
                      s.status === "entregado"   ? "text-green-500" : ""
                    }`}>
                      Q{Number(s.total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[rgb(var(--border))] bg-[rgb(var(--card-soft))] font-semibold">
                  <td colSpan={4} className="p-3 text-sm">Total entregado</td>
                  <td className="p-3 text-right text-green-500">Q{totalIngresos.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </section>

      {/* GASTOS OPERACIONALES */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
          <TrendingDown size={14} /> Gastos operacionales
        </h2>

        {/* FORM */}
        <div className="card p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-40">
            <label className="text-xs text-muted block mb-1">Descripción</label>
            <input
              className="input w-full"
              placeholder="Ej: Combustible, mensajería…"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExpense()}
            />
          </div>
          <div className="w-28">
            <label className="text-xs text-muted block mb-1">Monto (Q)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input w-full"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <button onClick={addExpense} disabled={saving} className="btn btn-primary">
            <Plus size={15} />
            Agregar
          </button>
        </div>

        {/* LISTA */}
        <div className="card p-0 overflow-x-auto">
          {expenses.length === 0 ? (
            <p className="p-5 text-sm text-muted text-center">Sin gastos registrados para esta fecha</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[rgb(var(--border))] text-muted text-xs uppercase tracking-wider">
                  <th className="p-3 text-left">Descripción</th>
                  <th className="p-3 text-right">Monto</th>
                  <th className="p-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-t border-[rgb(var(--border))]">
                    <td className="p-3">{e.description}</td>
                    <td className="p-3 text-right font-medium text-red-500">
                      Q{Number(e.amount).toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => deleteExpense(e.id)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[rgb(var(--border))] bg-[rgb(var(--card-soft))] font-semibold">
                  <td className="p-3">Total gastos</td>
                  <td className="p-3 text-right text-red-500">Q{totalGastos.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </section>

    </div>
  );
}

/* =====================
   COMPONENTE
===================== */

function MetricCard({
  label, value, sub, icon, color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: "green" | "red" | "neutral";
}) {
  const valueColor =
    color === "green" ? "text-green-500" :
    color === "red"   ? "text-red-500"   : "";

  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
      <p className="text-xs text-muted">{sub}</p>
    </div>
  );
}
