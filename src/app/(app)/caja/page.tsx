"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Wallet, TrendingUp, TrendingDown, ShoppingBag,
  Plus, Trash2, PackageX, DollarSign,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/* =====================
   TYPES
===================== */

type SaleItem = { qty: number; unit_cost: number };

type Sale = {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  shipping_cost: number;
  status: "pendiente" | "enviado" | "entregado" | "no_recibido";
  payment_type: "pagado" | "contra_entrega";
  created_at: string;
  sale_items: SaleItem[];
};

type Expense = { id: string; description: string; amount: number };

/* =====================
   PAGE
===================== */

export default function CajaPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);

  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

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
        .select(`
          id, order_number, customer_name,
          total, shipping_cost, status, payment_type, created_at,
          sale_items ( qty, unit_cost )
        `)
        .gte("created_at", `${date}T00:00:00`)
        .lte("created_at", `${date}T23:59:59`)
        .order("created_at", { ascending: false }),
      supabase
        .from("expenses")
        .select("id, description, amount")
        .eq("expense_date", date)
        .order("created_at", { ascending: false }),
    ]);
    setSales((salesRes.data ?? []) as unknown as Sale[]);
    setExpenses((expRes.data ?? []) as Expense[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [date]);

  /* =====================
     CÁLCULOS REALES
  ===================== */

  // Solo ventas entregadas cuentan como ingreso real
  const entregadas = useMemo(
    () => sales.filter((s) => s.status === "entregado"),
    [sales]
  );

  // Ventas brutas (lo que cobró al cliente)
  const ventasBrutas = useMemo(
    () => entregadas.reduce((sum, s) => sum + Number(s.total), 0),
    [entregadas]
  );

  // Costo total de productos vendidos
  const costoProductos = useMemo(
    () => entregadas.reduce((sum, s) =>
      sum + s.sale_items.reduce((c, i) => c + Number(i.unit_cost) * Number(i.qty), 0), 0),
    [entregadas]
  );

  // Costo total de envíos de ventas entregadas
  const costoEnvios = useMemo(
    () => entregadas.reduce((sum, s) => sum + Number(s.shipping_cost || 0), 0),
    [entregadas]
  );

  // Ganancia bruta = ventas - costo productos - costo envíos
  const gananciaBruta = ventasBrutas - costoProductos - costoEnvios;

  // Gastos operacionales del día (caja)
  const gastosOp = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses]
  );

  // Ganancia neta = ganancia bruta - gastos operacionales
  const gananciaNeta = gananciaBruta - gastosOp;

  // Pedidos no recibidos del día (pérdida de envío)
  const noRecibidos = useMemo(
    () => sales.filter((s) => s.status === "no_recibido"),
    [sales]
  );
  const perdidaEnvios = useMemo(
    () => noRecibidos.reduce((sum, s) => sum + Number(s.shipping_cost || 0), 0),
    [noRecibidos]
  );

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
          <p className="text-sm text-muted">Resumen financiero del día</p>
        </div>
        <input
          type="date"
          className="input w-auto"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Ventas brutas"
          value={`Q${ventasBrutas.toFixed(2)}`}
          sub={`${entregadas.length} entregada${entregadas.length !== 1 ? "s" : ""}`}
          icon={<ShoppingBag size={15} />}
          color="neutral"
        />
        <MetricCard
          label="Costo productos"
          value={`Q${costoProductos.toFixed(2)}`}
          sub={`+ envíos Q${costoEnvios.toFixed(2)}`}
          icon={<TrendingDown size={15} />}
          color="red"
        />
        <MetricCard
          label="Ganancia bruta"
          value={`Q${gananciaBruta.toFixed(2)}`}
          sub="Ventas − costos"
          icon={<TrendingUp size={15} />}
          color={gananciaBruta >= 0 ? "green" : "red"}
        />
        <MetricCard
          label="Ganancia neta"
          value={`Q${gananciaNeta.toFixed(2)}`}
          sub="Bruta − gastos op."
          icon={<Wallet size={15} />}
          color={gananciaNeta >= 0 ? "green" : "red"}
        />
      </div>

      {/* DESGLOSE FINANCIERO */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold">Desglose del día</h2>
        <div className="space-y-2 text-sm">
          <Row label="Ventas brutas (cobrado al cliente)"   value={ventasBrutas}    sign="+" color="green" />
          <Row label="Costo de productos vendidos"          value={costoProductos}  sign="-" color="red" />
          <Row label="Costo de envíos (entregados)"         value={costoEnvios}     sign="-" color="red" />
          <div className="border-t border-[rgb(var(--border))] pt-2">
            <Row label="Ganancia bruta"                     value={gananciaBruta}   sign=""  color={gananciaBruta >= 0 ? "green" : "red"} bold />
          </div>
          <Row label="Gastos operacionales del día"         value={gastosOp}        sign="-" color="red" />
          <div className="border-t border-[rgb(var(--border))] pt-2">
            <Row label="Ganancia neta del día"              value={gananciaNeta}    sign=""  color={gananciaNeta >= 0 ? "green" : "red"} bold />
          </div>
          {perdidaEnvios > 0 && (
            <div className="border-t border-[rgb(var(--border))] pt-2">
              <Row label={`Pérdida por no recibidos (${noRecibidos.length})`} value={perdidaEnvios} sign="-" color="red" />
            </div>
          )}
        </div>
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
                  <th className="p-3 text-right">Costo</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => {
                  const costo = s.sale_items.reduce((c, i) => c + Number(i.unit_cost) * Number(i.qty), 0);
                  const ganancia = Number(s.total) - costo - Number(s.shipping_cost || 0);
                  const entregado = s.status === "entregado";
                  const noRec = s.status === "no_recibido";
                  return (
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
                          entregado ? "badge-green"  :
                          noRec     ? "badge-red"    :
                          s.status === "enviado" ? "badge-blue" : "badge-yellow"
                        }`}>
                          {s.status === "pendiente"   ? "Pendiente"   :
                           s.status === "enviado"     ? "Enviado"     :
                           entregado                  ? "Entregado"   : "No recibido"}
                        </span>
                      </td>
                      <td className="p-3 text-right text-muted text-xs">
                        Q{(costo + Number(s.shipping_cost || 0)).toFixed(2)}
                      </td>
                      <td className={`p-3 text-right font-medium ${noRec ? "text-muted line-through" : ""}`}>
                        Q{Number(s.total).toFixed(2)}
                      </td>
                      <td className={`p-3 text-right font-medium ${
                        noRec     ? "text-red-500 line-through" :
                        !entregado ? "text-muted" :
                        ganancia >= 0 ? "text-green-500" : "text-red-500"
                      }`}>
                        {entregado || noRec ? `Q${ganancia.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-[rgb(var(--border))] bg-[rgb(var(--card-soft))] font-semibold text-sm">
                  <td colSpan={5} className="p-3">Total entregado</td>
                  <td className="p-3 text-right text-green-500">Q{ventasBrutas.toFixed(2)}</td>
                  <td className={`p-3 text-right ${gananciaBruta >= 0 ? "text-green-500" : "text-red-500"}`}>
                    Q{gananciaBruta.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </section>

      {/* GASTOS OPERACIONALES */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
          <DollarSign size={14} /> Gastos operacionales
        </h2>

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
              type="number" min={0} step="0.01"
              className="input w-full"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <button onClick={addExpense} disabled={saving} className="btn btn-primary">
            <Plus size={15} /> Agregar
          </button>
        </div>

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
                  <td className="p-3 text-right text-red-500">Q{gastosOp.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </section>

      {/* ALERTA NO RECIBIDOS */}
      {noRecibidos.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-500 text-sm">
          <PackageX size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{noRecibidos.length} pedido{noRecibidos.length !== 1 ? "s" : ""} no recibido{noRecibidos.length !== 1 ? "s" : ""} hoy</p>
            <p className="text-xs mt-0.5 opacity-80">Pérdida por envíos: Q{perdidaEnvios.toFixed(2)}</p>
          </div>
        </div>
      )}

    </div>
  );
}

/* =====================
   COMPONENTES
===================== */

function MetricCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub: string;
  icon: React.ReactNode; color: "green" | "red" | "neutral";
}) {
  const valueColor = color === "green" ? "text-green-500" : color === "red" ? "text-red-500" : "";
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted text-xs">{icon}<span>{label}</span></div>
      <div className={`text-xl font-bold ${valueColor}`}>{value}</div>
      <p className="text-xs text-muted">{sub}</p>
    </div>
  );
}

function Row({ label, value, sign, color, bold }: {
  label: string; value: number; sign: string;
  color: "green" | "red"; bold?: boolean;
}) {
  const c = color === "green" ? "text-green-500" : "text-red-500";
  return (
    <div className={`flex justify-between items-center ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted"}>{label}</span>
      <span className={c}>{sign} Q{value.toFixed(2)}</span>
    </div>
  );
}
