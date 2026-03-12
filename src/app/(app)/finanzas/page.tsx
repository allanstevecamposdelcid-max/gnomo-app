"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Receipt, AlertTriangle, PackageX, Percent, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type FixedCategory = "renta" | "sueldos" | "internet" | "publicidad" | "servicios" | "otros";
type FixedExpense = { id: string; category: FixedCategory; description: string; amount: number; month: number; year: number };
type LossDetail = { id: string; sale_id: string | null; reason: string; amount: number; description: string; loss_date: string; sales: { order_number: string; customer_name: string; total: number } | null };
type LossSummary = { total_perdido: number; total_envios: number; pedidos_no_recibidos: number; total_pedidos: number; porcentaje_no_recibidos: number };

const CAT_LABELS: Record<FixedCategory, string> = { renta:"Renta", sueldos:"Sueldos", internet:"Internet", publicidad:"Publicidad", servicios:"Servicios", otros:"Otros" };
const CAT_COLORS: Record<FixedCategory, string> = {
  renta: "badge-blue", sueldos: "badge-green", internet: "badge-blue",
  publicidad: "badge-orange", servicios: "badge-yellow", otros: "badge-red",
};
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

type Tab = "gastos" | "perdidas";

export default function FinanzasPage() {
  const now = new Date();
  const [tab,   setTab]  = useState<Tab>("gastos");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  function prevMonth() { if (month === 1) { setMonth(12); setYear(y=>y-1); } else setMonth(m=>m-1); }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(y=>y+1); } else setMonth(m=>m+1); }

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* HEADER */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Finanzas</h1>
          <p className="text-sm text-muted">Gastos fijos y control de pérdidas</p>
        </div>
        {/* Selector mes */}
        <div className="flex items-center gap-1 bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-xl px-2 py-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[rgb(var(--card-soft))] text-muted"><ChevronLeft size={16}/></button>
          <span className="px-2 text-sm font-medium min-w-[120px] text-center">{MONTHS[month-1]} {year}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[rgb(var(--card-soft))] text-muted"><ChevronRight size={16}/></button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1 p-1 bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-xl w-fit">
        {(["gastos","perdidas"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "bg-green-500 text-white" : "text-muted hover:text-[rgb(var(--text))]"
            }`}>
            {t === "gastos" ? "Gastos fijos" : "Control pérdidas"}
          </button>
        ))}
      </div>

      {tab === "gastos"
        ? <GastosFijos month={month} year={year} />
        : <Perdidas    month={month} year={year} />
      }
    </div>
  );
}

/* ── GASTOS FIJOS ── */
function GastosFijos({ month, year }: { month: number; year: number }) {
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<FixedCategory>("renta");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | "">("");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("fixed_expenses")
      .select("id, category, description, amount, month, year")
      .eq("month", month).eq("year", year).order("category");
    setExpenses((data ?? []) as FixedExpense[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [month, year]);

  const total = useMemo(() => expenses.reduce((s,e) => s + Number(e.amount), 0), [expenses]);
  const byCategory = useMemo(() => {
    const m: Partial<Record<FixedCategory, number>> = {};
    expenses.forEach(e => { m[e.category] = (m[e.category] ?? 0) + Number(e.amount); });
    return m;
  }, [expenses]);

  async function add() {
    if (!description.trim() || !amount || Number(amount) <= 0) { alert("Completa descripción y monto"); return; }
    const { error } = await supabase.from("fixed_expenses").insert({ category, description, amount: Number(amount), month, year });
    if (error) { alert(error.message); return; }
    setDescription(""); setAmount(""); load();
  }
  async function del(id: string) {
    if (!confirm("¿Eliminar este gasto?")) return;
    await supabase.from("fixed_expenses").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-4">
      {/* Resumen por categoría */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(Object.keys(byCategory) as FixedCategory[]).map(cat => (
            <div key={cat} className="card p-3">
              <span className={`badge ${CAT_COLORS[cat]} text-xs`}>{CAT_LABELS[cat]}</span>
              <p className="text-lg font-bold mt-2">Q{byCategory[cat]!.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Formulario */}
      <div className="card p-4 space-y-3">
        <h2 className="text-sm font-medium flex items-center gap-2"><Plus size={14}/>Agregar gasto fijo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted block mb-1">Categoría</label>
            <select className="input w-full" value={category} onChange={e => setCategory(e.target.value as FixedCategory)}>
              {(Object.keys(CAT_LABELS) as FixedCategory[]).map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Monto (Q)</label>
            <input type="number" min={0} step="0.01" className="input w-full" placeholder="0.00" value={amount}
              onChange={e => setAmount(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted block mb-1">Descripción</label>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Ej: Renta local, sueldo mensajero…" value={description}
                onChange={e => setDescription(e.target.value)} onKeyDown={e => e.key==="Enter" && add()} />
              <button onClick={add} className="btn btn-primary">Agregar</button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="card p-0 overflow-x-auto">
        {loading ? <p className="p-5 text-sm text-muted">Cargando…</p> : (
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
              {expenses.map(e => (
                <tr key={e.id} className="border-t border-[rgb(var(--border))]">
                  <td className="p-3"><span className={`badge ${CAT_COLORS[e.category]} text-xs`}>{CAT_LABELS[e.category]}</span></td>
                  <td className="p-3">{e.description}</td>
                  <td className="p-3 text-right font-medium text-red-500">Q{Number(e.amount).toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => del(e.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={14}/></button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-muted">Sin gastos fijos en {MONTHS[month-1]} {year}</td></tr>
              )}
              {expenses.length > 0 && (
                <tr className="border-t border-[rgb(var(--border))] font-semibold bg-[rgb(var(--card-soft))]">
                  <td colSpan={2} className="p-3">Total</td>
                  <td className="p-3 text-right text-red-500">Q{total.toFixed(2)}</td>
                  <td/>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ── CONTROL PÉRDIDAS ── */
function Perdidas({ month, year }: { month: number; year: number }) {
  const [summary, setSummary] = useState<LossSummary | null>(null);
  const [details, setDetails] = useState<LossDetail[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const monthStr = String(month).padStart(2,"0");
    const [sumRes, detRes] = await Promise.all([
      supabase.rpc("get_loss_summary", { p_month: month, p_year: year }).single(),
      supabase.from("losses")
        .select("id, sale_id, reason, amount, description, loss_date, sales(order_number, customer_name, total)")
        .gte("loss_date", `${year}-${monthStr}-01`)
        .lte("loss_date", `${year}-${monthStr}-31`)
        .order("loss_date", { ascending: false }),
    ]);
    if (!sumRes.error && sumRes.data) setSummary(sumRes.data as LossSummary);
    else setSummary(null);
    setDetails((detRes.data ?? []) as unknown as LossDetail[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [month, year]);

  return (
    <div className="space-y-4">
      {/* Métricas */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total perdido"    value={`Q${Number(summary.total_perdido).toFixed(2)}`} icon={<TrendingDown size={15}/>} danger />
          <StatCard label="Gasto en envíos"  value={`Q${Number(summary.total_envios).toFixed(2)}`}  icon={<PackageX size={15}/>} />
          <StatCard label="No recibidos"     value={`${summary.pedidos_no_recibidos} / ${summary.total_pedidos}`} icon={<AlertTriangle size={15}/>} danger={Number(summary.pedidos_no_recibidos)>0} />
          <StatCard label="% No recibidos"   value={`${Number(summary.porcentaje_no_recibidos).toFixed(1)}%`} icon={<Percent size={15}/>} danger={Number(summary.porcentaje_no_recibidos)>10} />
        </div>
      )}

      {!loading && summary && Number(summary.total_perdido) === 0 && details.length === 0 && (
        <div className="card p-10 text-center text-muted">
          <PackageX size={32} className="mx-auto mb-3 opacity-40"/>
          <p className="font-medium">Sin pérdidas en {MONTHS[month-1]} {year}</p>
        </div>
      )}

      {details.length > 0 && (
        <div className="card p-0 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[rgb(var(--border))] text-muted text-xs uppercase tracking-wider">
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-left">Pedido</th>
                <th className="p-3 text-left">Cliente</th>
                <th className="p-3 text-left">Descripción</th>
                <th className="p-3 text-right">Pérdida</th>
              </tr>
            </thead>
            <tbody>
              {details.map(l => (
                <tr key={l.id} className="border-t border-[rgb(var(--border))]">
                  <td className="p-3 text-muted">{new Date(l.loss_date).toLocaleDateString("es-GT")}</td>
                  <td className="p-3 font-mono text-xs">{l.sales?.order_number ?? "—"}</td>
                  <td className="p-3">{l.sales?.customer_name ?? "—"}</td>
                  <td className="p-3 text-muted text-xs">{l.description}</td>
                  <td className="p-3 text-right font-medium text-red-500">Q{Number(l.amount).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-t border-[rgb(var(--border))] font-semibold bg-[rgb(var(--card-soft))]">
                <td colSpan={4} className="p-3">Total pérdidas</td>
                <td className="p-3 text-right text-red-500">Q{details.reduce((s,l)=>s+Number(l.amount),0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {loading && <p className="text-sm text-muted">Cargando datos…</p>}
    </div>
  );
}

function StatCard({ label, value, icon, danger }: { label: string; value: string; icon: React.ReactNode; danger?: boolean }) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted text-xs">{icon}<span>{label}</span></div>
      <div className={`text-xl font-bold ${danger ? "text-red-400" : ""}`}>{value}</div>
    </div>
  );
}
