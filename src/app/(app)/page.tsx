"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp, AlertTriangle, Wallet, ShoppingBag,
  PackageX, Download, BarChart3, CalendarRange, ChevronDown,
  Plus, Trash2, DollarSign,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import dynamic from "next/dynamic";

const VentasCharts = dynamic(() => import("@/components/VentasCharts"), { ssr: false });

type SaleItem = { qty: number; unit_cost: number };
type Sale = {
  order_number: string; customer_name: string;
  total: number; shipping_cost: number;
  status: "pendiente" | "enviado" | "entregado" | "no_recibido";
  payment_type: "pagado" | "contra_entrega";
  created_at: string;
  sale_items: SaleItem[];
};
type LowStockProduct = { id: string; name: string; sku: string | null; stock: number };
type Expense = { id: string; description: string; amount: number };

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

export default function DashboardPage() {
  const now      = new Date();
  const todayStr = toDateStr(now);

  /* ── rango de fechas (período) ── */
  const firstOfMonth = todayStr.slice(0, 7) + "-01";
  const [dateFrom,   setDateFrom]   = useState(firstOfMonth);
  const [dateTo,     setDateTo]     = useState(todayStr);
  const [rangeLabel, setRangeLabel] = useState("Este mes");

  function applyRange(from: string, to: string, label: string) {
    setDateFrom(from); setDateTo(to); setRangeLabel(label);
  }
  function quickToday() { applyRange(todayStr, todayStr, "Hoy"); }
  function quick7() {
    const d = new Date(now); d.setDate(d.getDate() - 6);
    applyRange(toDateStr(d), todayStr, "Últimos 7 días");
  }
  function quickMonth() { applyRange(firstOfMonth, todayStr, "Este mes"); }
  function quickPrev() {
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const m = now.getMonth() === 0 ? 12 : now.getMonth();
    const last = new Date(y, m, 0);
    applyRange(`${y}-${String(m).padStart(2, "0")}-01`, toDateStr(last), `${MONTHS[m - 1]} ${y}`);
  }

  /* ── estado período ── */
  const [sales,       setSales]       = useState<Sale[]>([]);
  const [lowStock,    setLowStock]    = useState<LowStockProduct[]>([]);
  const [gastosFijos, setGastosFijos] = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [showCharts,  setShowCharts]  = useState(false);

  const [openRange,    setOpenRange]    = useState(true);
  const [openMetrics,  setOpenMetrics]  = useState(true);
  const [openDesglose, setOpenDesglose] = useState(false);
  const [openTable,    setOpenTable]    = useState(true);
  const [openStock,    setOpenStock]    = useState(true);

  /* ── estado caja del día ── */
  const [cajaDate,    setCajaDate]    = useState(todayStr);
  const [cajaSales,   setCajaSales]   = useState<Sale[]>([]);
  const [cajaExp,     setCajaExp]     = useState<Expense[]>([]);
  const [cajaLoading, setCajaLoading] = useState(false);
  const [expDesc,     setExpDesc]     = useState("");
  const [expAmount,   setExpAmount]   = useState<number | "">("");
  const [expSaving,   setExpSaving]   = useState(false);
  const [openCaja,    setOpenCaja]    = useState(true);

  /* ── load período ── */
  async function loadData() {
    setLoading(true);
    const from = new Date(dateFrom + "T00:00:00");
    const to   = new Date(dateTo   + "T23:59:59");
    const monthPairs: { m: number; y: number }[] = [];
    const cur = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cur <= to) {
      monthPairs.push({ m: cur.getMonth() + 1, y: cur.getFullYear() });
      cur.setMonth(cur.getMonth() + 1);
    }
    const [salesRes, lowRes, ...fixedRes] = await Promise.all([
      supabase.from("sales")
        .select("order_number, customer_name, total, shipping_cost, status, payment_type, created_at, sale_items(qty, unit_cost)")
        .gte("created_at", `${dateFrom}T00:00:00`)
        .lte("created_at", `${dateTo}T23:59:59`)
        .order("created_at", { ascending: true }),
      supabase.from("low_stock_products").select("id, name, sku, stock"),
      ...monthPairs.map(({ m, y }) =>
        supabase.from("fixed_expenses").select("amount").eq("month", m).eq("year", y)
      ),
    ]);
    setSales((salesRes.data ?? []) as unknown as Sale[]);
    setLowStock((lowRes.data ?? []) as LowStockProduct[]);
    let totalFijos = 0;
    for (const res of fixedRes)
      for (const row of (res.data ?? []) as { amount: number }[])
        totalFijos += Number(row.amount);
    setGastosFijos(totalFijos);
    setLoading(false);
  }

  /* ── load caja del día ── */
  async function loadCaja() {
    setCajaLoading(true);
    const [sRes, eRes] = await Promise.all([
      supabase.from("sales")
        .select("order_number, customer_name, total, shipping_cost, status, payment_type, created_at, sale_items(qty, unit_cost)")
        .gte("created_at", `${cajaDate}T00:00:00`)
        .lte("created_at", `${cajaDate}T23:59:59`)
        .order("created_at", { ascending: false }),
      supabase.from("expenses")
        .select("id, description, amount")
        .eq("expense_date", cajaDate)
        .order("created_at", { ascending: false }),
    ]);
    setCajaSales((sRes.data ?? []) as unknown as Sale[]);
    setCajaExp((eRes.data ?? []) as Expense[]);
    setCajaLoading(false);
  }

  useEffect(() => { loadData(); }, [dateFrom, dateTo]);
  useEffect(() => { loadCaja(); }, [cajaDate]);

  /* ── cálculos período ── */
  const entregadas  = useMemo(() => sales.filter(s => s.status === "entregado"),   [sales]);
  const noRecibidos = useMemo(() => sales.filter(s => s.status === "no_recibido"), [sales]);

  const ventasMes = useMemo(() =>
    entregadas.reduce((sum, s) => sum + Number(s.total), 0), [entregadas]);

  const gananciaBruta = useMemo(() =>
    entregadas.reduce((sum, s) => {
      const c = s.sale_items.reduce((x, i) => x + Number(i.unit_cost) * Number(i.qty), 0);
      return sum + (Number(s.total) - c);
    }, 0), [entregadas]);

  const perdidaEnvios = useMemo(() =>
    noRecibidos.reduce((sum, s) => sum + Number(s.shipping_cost || 0), 0), [noRecibidos]);

  const gananciaNeta = gananciaBruta - gastosFijos - perdidaEnvios;

  /* ── cálculos caja ── */
  const cajaEntregadas = useMemo(() => cajaSales.filter(s => s.status === "entregado"),   [cajaSales]);
  const cajaNoRec      = useMemo(() => cajaSales.filter(s => s.status === "no_recibido"), [cajaSales]);

  const cajaVentas = useMemo(() =>
    cajaEntregadas.reduce((sum, s) => sum + Number(s.total), 0), [cajaEntregadas]);
  const cajaCostoP = useMemo(() =>
    cajaEntregadas.reduce((sum, s) =>
      sum + s.sale_items.reduce((c, i) => c + Number(i.unit_cost) * Number(i.qty), 0), 0), [cajaEntregadas]);
  const cajaGruta  = cajaVentas - cajaCostoP;
  const cajaGastos = useMemo(() =>
    cajaExp.reduce((sum, e) => sum + Number(e.amount), 0), [cajaExp]);
  const cajaNeta   = cajaGruta - cajaGastos;
  const cajaPerd   = useMemo(() =>
    cajaNoRec.reduce((sum, s) => sum + Number(s.shipping_cost || 0), 0), [cajaNoRec]);

  /* ── tabla por día ── */
  const dailyData = useMemo(() => {
    const map: Record<string, {
      fecha: string; pedidos: number; ventas: number; costo: number;
      ganancia: number; pendientes: number; enviados: number; noRec: number;
    }> = {};
    for (const s of sales) {
      const d = s.created_at.slice(0, 10);
      if (!map[d]) map[d] = { fecha: d, pedidos: 0, ventas: 0, costo: 0, ganancia: 0, pendientes: 0, enviados: 0, noRec: 0 };
      const row = map[d]; row.pedidos++;
      const c = s.sale_items.reduce((x, i) => x + Number(i.unit_cost) * Number(i.qty), 0);
      if (s.status === "entregado") {
        row.ventas   += Number(s.total);
        row.costo    += c;
        row.ganancia += Number(s.total) - c;
      }
      if (s.status === "pendiente")   row.pendientes++;
      if (s.status === "enviado")     row.enviados++;
      if (s.status === "no_recibido") row.noRec++;
    }
    return Object.values(map).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [sales]);

  const porDia = useMemo(() =>
    dailyData.map(r => ({
      date:  new Date(r.fecha + "T12:00:00").toLocaleDateString("es-GT", { day: "2-digit", month: "short" }),
      total: r.ventas,
    })), [dailyData]);

  const porMes = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of entregadas) { const k = s.created_at.slice(0, 7); map[k] = (map[k] || 0) + Number(s.total); }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([k, total]) => ({ month: k, total }));
  }, [entregadas]);

  /* ── gastos caja ── */
  async function addCajaExp() {
    if (!expDesc.trim() || !expAmount || Number(expAmount) <= 0) { alert("Completa descripción y monto"); return; }
    setExpSaving(true);
    const { error } = await supabase.from("expenses").insert({
      description: expDesc.trim(), amount: Number(expAmount), expense_date: cajaDate,
    });
    setExpSaving(false);
    if (error) { alert(error.message); return; }
    setExpDesc(""); setExpAmount("");
    loadCaja();
  }
  async function delCajaExp(id: string) {
    if (!confirm("¿Eliminar gasto?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    loadCaja();
  }

  /* ── PDF ── */
  async function downloadPDF() {
    const { default: jsPDF }     = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    const label = dateFrom === dateTo ? dateFrom : `${dateFrom} — ${dateTo}`;

    doc.setFontSize(18); doc.setTextColor(10, 10, 10);
    doc.text("El Gnomo", 14, 18);
    doc.setFontSize(12); doc.setTextColor(0, 0, 0);
    doc.text(`Resumen financiero: ${label}`, 14, 26);
    doc.setFontSize(9); doc.setTextColor(120, 120, 120);
    doc.text(`Generado: ${new Date().toLocaleDateString("es-GT")}`, 14, 32);

    doc.setTextColor(0, 0, 0);
    autoTable(doc, {
      startY: 38,
      head: [["Concepto", "Monto"]],
      body: [
        ["Ventas brutas",   `Q${ventasMes.toFixed(2)}`],
        ["Ganancia bruta",  `Q${gananciaBruta.toFixed(2)}`],
        ["Gastos fijos",    `- Q${gastosFijos.toFixed(2)}`],
        ["Pérdidas envíos", perdidaEnvios > 0 ? `- Q${perdidaEnvios.toFixed(2)}` : "Q0.00"],
        ["Ganancia neta",   `Q${gananciaNeta.toFixed(2)}`],
      ],
      theme: "grid",
      headStyles: { fillColor: [15, 15, 15], textColor: 255 },
      columnStyles: { 1: { halign: "right" } },
      margin: { left: 14 }, tableWidth: 90,
    });

    const y1 = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 80;
    doc.setFontSize(10); doc.text("Detalle por día", 14, y1 + 10);
    autoTable(doc, {
      startY: y1 + 14,
      head: [["Fecha", "Pedidos", "Ventas", "Costo", "Ganancia", "Pend.", "Env.", "No rec."]],
      body: dailyData.map(r => [
        new Date(r.fecha + "T12:00:00").toLocaleDateString("es-GT", { day: "2-digit", month: "short" }),
        r.pedidos,
        r.ventas > 0 ? `Q${r.ventas.toFixed(2)}` : "—",
        r.costo  > 0 ? `Q${r.costo.toFixed(2)}`  : "—",
        r.ventas > 0 ? `Q${r.ganancia.toFixed(2)}` : "—",
        r.pendientes || "—", r.enviados || "—", r.noRec || "—",
      ]),
      foot: [["TOTAL", sales.length,
        `Q${ventasMes.toFixed(2)}`, `Q${(ventasMes - gananciaBruta).toFixed(2)}`,
        `Q${gananciaBruta.toFixed(2)}`,
        dailyData.reduce((s, r) => s + r.pendientes, 0) || "—",
        dailyData.reduce((s, r) => s + r.enviados, 0)   || "—",
        noRecibidos.length || "—",
      ]],
      theme: "striped",
      headStyles: { fillColor: [15, 15, 15], textColor: 255 },
      footStyles: { fillColor: [240, 240, 240], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 22 }, 1: { halign: "center" }, 2: { halign: "right" },
        3: { halign: "right" }, 4: { halign: "right" },
        5: { halign: "center" }, 6: { halign: "center" }, 7: { halign: "center" },
      },
      margin: { left: 14 },
    });
    const slug = rangeLabel.replace(/\s+/g, "-");
    doc.save(`ElGnomo-${slug}.pdf`);
  }

  /* ── UI ── */
  const rangeDisplay = dateFrom === dateTo
    ? new Date(dateFrom + "T12:00:00").toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" })
    : `${new Date(dateFrom + "T12:00:00").toLocaleDateString("es-GT", { day: "numeric", month: "short" })} — ${new Date(dateTo + "T12:00:00").toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* HEADER */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted mt-0.5 flex items-center gap-1.5">
            <CalendarRange size={13} /> {rangeDisplay}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button onClick={downloadPDF}
            className="btn btn-ghost text-sm border border-[rgb(var(--border))]">
            <Download size={14} /> PDF
          </button>
          <button onClick={() => setShowCharts(v => !v)}
            className={`btn text-sm border border-[rgb(var(--border))] ${showCharts ? "btn-primary" : "btn-ghost"}`}>
            <BarChart3 size={14} /> Gráficas
          </button>
        </div>
      </div>

      {/* SELECTOR DE RANGO */}
      <Collapsible
        label={<span className="flex items-center gap-2"><CalendarRange size={14} /> Rango — {rangeLabel}</span>}
        open={openRange} onToggle={() => setOpenRange(v => !v)}
      >
        <div className="space-y-3 pt-3">
          <div className="flex flex-wrap gap-2">
            {([
              { label: "Hoy",            fn: quickToday },
              { label: "Últimos 7 días", fn: quick7     },
              { label: "Este mes",       fn: quickMonth },
              { label: "Mes anterior",   fn: quickPrev  },
            ] as const).map(({ label, fn }) => (
              <button key={label} onClick={fn}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-medium ${
                  rangeLabel === label
                    ? "bg-[rgb(var(--text))] text-[rgb(var(--bg))] border-[rgb(var(--text))]"
                    : "border-[rgb(var(--border))] text-muted hover:text-[rgb(var(--text))] hover:bg-[rgb(var(--card-soft))]"
                }`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-muted block mb-1">Desde</label>
              <input type="date" className="input" value={dateFrom} max={dateTo}
                onChange={e => { setDateFrom(e.target.value); setRangeLabel("Personalizado"); }} />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Hasta</label>
              <input type="date" className="input" value={dateTo} min={dateFrom} max={todayStr}
                onChange={e => { setDateTo(e.target.value); setRangeLabel("Personalizado"); }} />
            </div>
            <p className="text-xs text-muted self-center">{sales.length} pedido{sales.length !== 1 ? "s" : ""} en el rango</p>
          </div>
        </div>
      </Collapsible>

      {/* ALERTA BAJO INVENTARIO */}
      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-orange-500 text-sm">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Bajo inventario ({lowStock.length} productos)</p>
            <p className="text-xs mt-0.5 opacity-80">{lowStock.map(p => `${p.name} (${p.stock})`).join(" · ")}</p>
          </div>
        </div>
      )}

      {/* MÉTRICAS DEL PERÍODO */}
      <Collapsible label="Resumen del período" open={openMetrics} onToggle={() => setOpenMetrics(v => !v)}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
          <Metric label="Ventas del período" value={`Q${ventasMes.toFixed(2)}`}
            icon={<TrendingUp size={15} />}
            sub={`${entregadas.length} entregada${entregadas.length !== 1 ? "s" : ""}`} />
          <Metric label="Ganancia bruta" value={`Q${gananciaBruta.toFixed(2)}`}
            icon={<Wallet size={15} />} negative={gananciaBruta < 0} sub="Ventas − costo productos" />
          <Metric label="Gastos fijos" value={`Q${gastosFijos.toFixed(2)}`}
            icon={<ShoppingBag size={15} />} sub="Del período" />
          <Metric label="Ganancia neta" value={`Q${gananciaNeta.toFixed(2)}`}
            icon={<Wallet size={15} />} negative={gananciaNeta < 0} sub="Bruta − gastos − pérdidas" />
        </div>
        {noRecibidos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-3">
            <Metric label="No recibidos" value={`${noRecibidos.length}`} icon={<PackageX size={15} />} negative sub="Contra entrega" />
            <Metric label="Pérdida envíos" value={`Q${perdidaEnvios.toFixed(2)}`} icon={<AlertTriangle size={15} />} negative sub="Costo de envío perdido" />
          </div>
        )}
      </Collapsible>

      {/* DESGLOSE */}
      <Collapsible label="Desglose financiero" open={openDesglose} onToggle={() => setOpenDesglose(v => !v)}>
        <div className="space-y-2 text-sm pt-3">
          <DR label="Ventas brutas"       value={ventasMes}                 sign="+" pos />
          <DR label="Costo de productos" value={ventasMes - gananciaBruta} sign="-" />
          <div className="border-t border-[rgb(var(--border))] pt-2">
            <DR label="Ganancia bruta"         value={gananciaBruta}              sign=""  pos={gananciaBruta >= 0} bold />
          </div>
          <DR label="Gastos fijos"             value={gastosFijos}                sign="-" />
          {perdidaEnvios > 0 &&
            <DR label={`Pérdida envíos no recibidos (${noRecibidos.length})`} value={perdidaEnvios} sign="-" />
          }
          <div className="border-t border-[rgb(var(--border))] pt-2">
            <DR label="Ganancia neta"          value={gananciaNeta}               sign=""  pos={gananciaNeta >= 0} bold />
          </div>
        </div>
      </Collapsible>

      {/* TABLA POR DÍA */}
      {dailyData.length > 0 && (
        <Collapsible label={`Resumen por día (${dailyData.length})`} open={openTable} onToggle={() => setOpenTable(v => !v)}>
          <div className="card p-0 overflow-x-auto mt-3">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[rgb(var(--border))] text-muted text-xs uppercase tracking-wider bg-[rgb(var(--card-soft))]">
                  <th className="p-3 text-left">Fecha</th>
                  <th className="p-3 text-center">Pedidos</th>
                  <th className="p-3 text-right">Ventas</th>
                  <th className="p-3 text-right">Costo</th>
                  <th className="p-3 text-right">Ganancia</th>
                  <th className="p-3 text-center">Pend.</th>
                  <th className="p-3 text-center">Env.</th>
                  <th className="p-3 text-center">No rec.</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.map(row => (
                  <tr key={row.fecha} className={`border-t border-[rgb(var(--border))] ${row.fecha === todayStr ? "bg-[rgb(var(--card-soft))]" : ""}`}>
                    <td className="p-3 font-medium text-sm">
                      {new Date(row.fecha + "T12:00:00").toLocaleDateString("es-GT", { day: "2-digit", month: "short" })}
                      {row.fecha === todayStr && <span className="ml-2 text-[10px] badge badge-gray">hoy</span>}
                    </td>
                    <td className="p-3 text-center font-mono">{row.pedidos}</td>
                    <td className="p-3 text-right font-medium">{row.ventas > 0 ? `Q${row.ventas.toFixed(2)}` : "—"}</td>
                    <td className="p-3 text-right text-muted text-xs">{row.costo > 0 ? `Q${row.costo.toFixed(2)}` : "—"}</td>
                    <td className={`p-3 text-right font-semibold ${row.ganancia < 0 ? "text-red-500" : row.ganancia === 0 ? "text-muted" : ""}`}>
                      {row.ventas > 0 ? `Q${row.ganancia.toFixed(2)}` : "—"}
                    </td>
                    <td className="p-3 text-center">{row.pendientes > 0 ? <span className="badge badge-yellow">{row.pendientes}</span> : "—"}</td>
                    <td className="p-3 text-center">{row.enviados   > 0 ? <span className="badge badge-blue">{row.enviados}</span>     : "—"}</td>
                    <td className="p-3 text-center">{row.noRec      > 0 ? <span className="badge badge-red">{row.noRec}</span>         : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[rgb(var(--border))] bg-[rgb(var(--card-soft))] font-semibold text-sm">
                  <td className="p-3">Total</td>
                  <td className="p-3 text-center font-mono">{sales.length}</td>
                  <td className="p-3 text-right">Q{ventasMes.toFixed(2)}</td>
                  <td className="p-3 text-right text-muted text-xs">Q{(ventasMes - gananciaBruta).toFixed(2)}</td>
                  <td className={`p-3 text-right ${gananciaBruta < 0 ? "text-red-500" : ""}`}>Q{gananciaBruta.toFixed(2)}</td>
                  <td className="p-3 text-center">{dailyData.reduce((s, r) => s + r.pendientes, 0) || "—"}</td>
                  <td className="p-3 text-center">{dailyData.reduce((s, r) => s + r.enviados, 0)   || "—"}</td>
                  <td className="p-3 text-center text-red-500">{noRecibidos.length || "—"}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Collapsible>
      )}

      {/* GRÁFICAS */}
      {showCharts && (
        <div className="card p-4">
          <VentasCharts porDia={porDia} porMes={porMes} />
        </div>
      )}

      {/* BAJO STOCK */}
      {lowStock.length > 0 && (
        <Collapsible label={`Inventario bajo — ${lowStock.length} producto${lowStock.length !== 1 ? "s" : ""}`} open={openStock} onToggle={() => setOpenStock(v => !v)}>
          <div className="card p-0 overflow-x-auto mt-3">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[rgb(var(--border))] text-muted text-xs uppercase tracking-wider">
                  <th className="p-3 text-left">Producto</th>
                  <th className="p-3 text-left">SKU</th>
                  <th className="p-3 text-center">Stock</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map(p => (
                  <tr key={p.id} className="border-t border-[rgb(var(--border))]">
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3 text-muted font-mono text-xs">{p.sku ?? "—"}</td>
                    <td className="p-3 text-center">
                      <span className={`font-bold ${p.stock === 0 ? "text-red-500" : "text-orange-500"}`}>{p.stock}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Collapsible>
      )}

      {loading && <p className="text-sm text-muted py-4">Cargando datos…</p>}

      {/* ════════════════════════════════
          CAJA DEL DÍA
      ════════════════════════════════ */}
      <div className="border-t border-[rgb(var(--border))] pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-3">Caja del día</p>
      </div>

      <Collapsible
        label={<span className="flex items-center gap-2"><DollarSign size={14} /> Caja — {cajaDate === todayStr ? "Hoy" : cajaDate}</span>}
        open={openCaja} onToggle={() => setOpenCaja(v => !v)}
      >
        <div className="space-y-5 pt-4">

          {/* Selector de fecha */}
          <div className="flex items-center gap-3 flex-wrap">
            <input type="date" className="input w-auto" value={cajaDate} max={todayStr}
              onChange={e => setCajaDate(e.target.value)} />
            {cajaDate !== todayStr && (
              <button onClick={() => setCajaDate(todayStr)} className="btn btn-ghost text-xs border border-[rgb(var(--border))]">
                Ir a hoy
              </button>
            )}
          </div>

          {/* Métricas del día */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-3 flex flex-col gap-1">
              <p className="text-xs text-muted">Ventas brutas</p>
              <p className="text-lg font-bold">Q{cajaVentas.toFixed(2)}</p>
              <p className="text-[11px] text-muted">{cajaEntregadas.length} entregada{cajaEntregadas.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="card p-3 flex flex-col gap-1">
              <p className="text-xs text-muted">Costo productos</p>
              <p className="text-lg font-bold text-red-500">Q{cajaCostoP.toFixed(2)}</p>
              <p className="text-[11px] text-muted">Costo de lo vendido</p>
            </div>
            <div className="card p-3 flex flex-col gap-1">
              <p className="text-xs text-muted">Ganancia bruta</p>
              <p className={`text-lg font-bold ${cajaGruta < 0 ? "text-red-500" : ""}`}>Q{cajaGruta.toFixed(2)}</p>
              <p className="text-[11px] text-muted">Ventas − costos</p>
            </div>
            <div className="card p-3 flex flex-col gap-1">
              <p className="text-xs text-muted">Ganancia neta</p>
              <p className={`text-lg font-bold ${cajaNeta < 0 ? "text-red-500" : ""}`}>Q{cajaNeta.toFixed(2)}</p>
              <p className="text-[11px] text-muted">Bruta − gastos op.</p>
            </div>
          </div>

          {/* Desglose del día */}
          <div className="card p-4 space-y-2 text-sm">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Desglose</p>
            <DR label="Ventas brutas"           value={cajaVentas}  sign="+" pos />
            <DR label="Costo de productos"      value={cajaCostoP}  sign="-" />
            <div className="border-t border-[rgb(var(--border))] pt-2">
              <DR label="Ganancia bruta"        value={cajaGruta}   sign=""  pos={cajaGruta >= 0} bold />
            </div>
            <DR label="Gastos operacionales"    value={cajaGastos}  sign="-" />
            <div className="border-t border-[rgb(var(--border))] pt-2">
              <DR label="Ganancia neta del día" value={cajaNeta}    sign=""  pos={cajaNeta >= 0} bold />
            </div>
            {cajaPerd > 0 && (
              <div className="border-t border-[rgb(var(--border))] pt-2">
                <DR label={`Pérdida no recibidos (${cajaNoRec.length})`} value={cajaPerd} sign="-" />
              </div>
            )}
          </div>

          {/* Gastos operacionales CRUD */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
              <DollarSign size={13} /> Gastos operacionales
            </p>
            <div className="card p-4 flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-36">
                <label className="text-xs text-muted block mb-1">Descripción</label>
                <input className="input w-full" placeholder="Ej: Combustible, mensajería…"
                  value={expDesc} onChange={e => setExpDesc(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addCajaExp()} />
              </div>
              <div className="w-28">
                <label className="text-xs text-muted block mb-1">Monto (Q)</label>
                <input type="number" min={0} step="0.01" className="input w-full" placeholder="0.00"
                  value={expAmount}
                  onChange={e => setExpAmount(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <button onClick={addCajaExp} disabled={expSaving} className="btn btn-primary">
                <Plus size={15} /> Agregar
              </button>
            </div>
            {cajaLoading ? (
              <p className="text-sm text-muted">Cargando…</p>
            ) : cajaExp.length === 0 ? (
              <p className="text-sm text-muted text-center py-3">Sin gastos para esta fecha</p>
            ) : (
              <div className="card p-0 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgb(var(--border))] text-muted text-xs uppercase tracking-wider">
                      <th className="p-3 text-left">Descripción</th>
                      <th className="p-3 text-right">Monto</th>
                      <th className="p-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cajaExp.map(e => (
                      <tr key={e.id} className="border-t border-[rgb(var(--border))]">
                        <td className="p-3">{e.description}</td>
                        <td className="p-3 text-right font-medium text-red-500">Q{Number(e.amount).toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <button onClick={() => delCajaExp(e.id)} className="text-red-500 hover:text-red-700 p-1">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[rgb(var(--border))] bg-[rgb(var(--card-soft))] font-semibold">
                      <td className="p-3">Total gastos</td>
                      <td className="p-3 text-right text-red-500">Q{cajaGastos.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Alerta no recibidos */}
          {cajaNoRec.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-500 text-sm">
              <PackageX size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{cajaNoRec.length} pedido{cajaNoRec.length !== 1 ? "s" : ""} no recibido{cajaNoRec.length !== 1 ? "s" : ""}</p>
                <p className="text-xs mt-0.5 opacity-80">Pérdida por envíos: Q{cajaPerd.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>
      </Collapsible>

    </div>
  );
}

/* ─── Collapsible ─── */
function Collapsible({ label, open, onToggle, children }: {
  label: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-[rgb(var(--card-soft))] transition-colors">
        <span>{label}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 text-muted ${open ? "" : "rotate-180"}`} />
      </button>
      {open && <div className="px-4 pb-4 border-t border-[rgb(var(--border))]">{children}</div>}
    </div>
  );
}

/* ─── Metric card ─── */
function Metric({ icon, label, value, sub, negative }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; negative?: boolean;
}) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted text-xs">{icon}<span>{label}</span></div>
      <div className={`text-2xl font-bold ${negative ? "text-red-500" : ""}`}>{value}</div>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

/* ─── Desglose row ─── */
function DR({ label, value, sign, pos, bold }: {
  label: string; value: number; sign: string; pos?: boolean; bold?: boolean;
}) {
  const c = pos === false ? "text-red-500" : pos === true ? "" : "text-red-500";
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted"}>{label}</span>
      <span className={c}>{sign}{sign ? " " : ""}Q{Math.abs(value).toFixed(2)}</span>
    </div>
  );
}
