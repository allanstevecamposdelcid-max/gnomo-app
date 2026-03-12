"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp, AlertTriangle, Wallet, ShoppingBag, PackageX, ChevronLeft, ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type SaleItem = { qty: number; unit_cost: number };
type Sale = {
  order_number: string;
  customer_name: string;
  total: number;
  shipping_cost: number;
  status: "pendiente" | "enviado" | "entregado" | "no_recibido";
  payment_type: "pagado" | "contra_entrega";
  created_at: string;
  sale_items: SaleItem[];
};
type LowStockProduct = { id: string; name: string; sku: string | null; stock: number };

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

export default function DashboardPage() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const [sales, setSales] = useState<Sale[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [netProfit, setNetProfit] = useState<{
    ganancia_bruta: number; gastos_fijos: number; ganancia_neta: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  /* ── navegación mes ── */
  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  /* ── load ── */
  async function loadData() {
    setLoading(true);
    const monthStr = String(month).padStart(2, "0");
    const start = `${year}-${monthStr}-01T00:00:00`;
    // último día del mes
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${monthStr}-${lastDay}T23:59:59`;

    const [salesRes, lowRes, netRes] = await Promise.all([
      supabase
        .from("sales")
        .select(`order_number, customer_name, total, shipping_cost, status, payment_type, created_at, sale_items(qty, unit_cost)`)
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: true }),
      supabase.from("low_stock_products").select("id, name, sku, stock"),
      supabase.rpc("get_net_profit", { p_month: month, p_year: year }).single(),
    ]);

    setSales((salesRes.data ?? []) as unknown as Sale[]);
    setLowStock((lowRes.data ?? []) as LowStockProduct[]);
    if (!netRes.error && netRes.data) setNetProfit(netRes.data as typeof netProfit);
    else setNetProfit(null);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [month, year]);

  /* ── cálculos ── */
  const entregadas = useMemo(() => sales.filter(s => s.status === "entregado"), [sales]);
  const noRecibidos = useMemo(() => sales.filter(s => s.status === "no_recibido"), [sales]);

  const ventasHoy = useMemo(() =>
    isCurrentMonth
      ? entregadas.filter(s => s.created_at.slice(0,10) === todayStr).reduce((sum, s) => sum + Number(s.total), 0)
      : null,
    [entregadas, isCurrentMonth, todayStr]
  );

  const ventasMes = useMemo(() =>
    entregadas.reduce((sum, s) => sum + Number(s.total), 0),
    [entregadas]
  );

  const gananciaBruta = useMemo(() =>
    entregadas.reduce((sum, s) => {
      const costos = s.sale_items.reduce((c, i) => c + Number(i.unit_cost) * Number(i.qty), 0);
      return sum + (Number(s.total) - costos - Number(s.shipping_cost));
    }, 0),
    [entregadas]
  );

  // Solo pérdida real = envíos de no recibidos (producto vuelve al inventario)
  const perdidaEnvios = useMemo(() =>
    noRecibidos.reduce((sum, s) => sum + Number(s.shipping_cost || 0), 0),
    [noRecibidos]
  );

  // Ganancia neta = bruta (SQL) - pérdida envíos no recibidos
  const gananciaNeta = netProfit
    ? Number(netProfit.ganancia_neta) - perdidaEnvios
    : null;

  /* ── tabla Excel por día ── */
  const dailyData = useMemo(() => {
    const map: Record<string, {
      fecha: string; pedidos: number; ventas: number; costo: number;
      ganancia: number; pendientes: number; enviados: number; noRec: number;
    }> = {};

    for (const s of sales) {
      const d = s.created_at.slice(0, 10);
      if (!map[d]) map[d] = { fecha: d, pedidos: 0, ventas: 0, costo: 0, ganancia: 0, pendientes: 0, enviados: 0, noRec: 0 };
      const row = map[d];
      row.pedidos++;
      const costo = s.sale_items.reduce((c, i) => c + Number(i.unit_cost) * Number(i.qty), 0);
      if (s.status === "entregado") {
        row.ventas   += Number(s.total);
        row.costo    += costo + Number(s.shipping_cost);
        row.ganancia += Number(s.total) - costo - Number(s.shipping_cost);
      }
      if (s.status === "pendiente")   row.pendientes++;
      if (s.status === "enviado")     row.enviados++;
      if (s.status === "no_recibido") row.noRec++;
    }
    return Object.values(map).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [sales]);

  /* ── UI ── */
  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* HEADER + SELECTOR MES */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted mt-0.5">
            {isCurrentMonth
              ? now.toLocaleDateString("es-GT", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
              : `${MONTHS[month-1]} ${year}`}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-xl px-2 py-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[rgb(var(--card-soft))] text-muted">
            <ChevronLeft size={16} />
          </button>
          <span className="px-2 text-sm font-medium min-w-[120px] text-center">
            {MONTHS[month-1]} {year}
          </span>
          <button onClick={nextMonth} disabled={isCurrentMonth}
            className="p-1.5 rounded-lg hover:bg-[rgb(var(--card-soft))] text-muted disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

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

      {/* MÉTRICAS */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Resumen — {MONTHS[month-1]} {year}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {ventasHoy !== null && (
            <Metric label="Ventas del día" value={`Q${ventasHoy.toFixed(2)}`}
              icon={<ShoppingBag size={15} />} sub="Solo entregadas" />
          )}
          <Metric label="Ventas del mes" value={`Q${ventasMes.toFixed(2)}`}
            icon={<TrendingUp size={15} />} accent sub={`${entregadas.length} pedido${entregadas.length !== 1 ? "s" : ""}`} />
          <Metric label="Ganancia bruta" value={`Q${gananciaBruta.toFixed(2)}`}
            icon={<Wallet size={15} />} positive={gananciaBruta >= 0} sub="Ventas − costos − envíos" />
          <Metric label="Ganancia neta" value={gananciaNeta !== null ? `Q${gananciaNeta.toFixed(2)}` : "—"}
            icon={<Wallet size={15} />} positive={gananciaNeta !== null ? gananciaNeta >= 0 : undefined}
            sub="Bruta − gastos fijos − pérdidas" />
        </div>
      </section>

      {/* DESGLOSE FINANCIERO */}
      {netProfit && (
        <section className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold">Desglose financiero — {MONTHS[month-1]} {year}</h2>
          <div className="space-y-2 text-sm">
            <DesgloseRow label="Ventas brutas (entregadas)"       value={ventasMes}                         sign="+" color="green" />
            <DesgloseRow label="Costo de productos + envíos"      value={ventasMes - gananciaBruta}         sign="-" color="red" />
            <div className="border-t border-[rgb(var(--border))] pt-2">
              <DesgloseRow label="Ganancia bruta"                  value={gananciaBruta}                     sign=""  color={gananciaBruta >= 0 ? "green" : "red"} bold />
            </div>
            <DesgloseRow label="Gastos fijos del mes"             value={Number(netProfit.gastos_fijos)}    sign="-" color="red" />
            {perdidaEnvios > 0 &&
              <DesgloseRow label={`Pérdida envíos no recibidos (${noRecibidos.length})`} value={perdidaEnvios} sign="-" color="red" />
            }
            <div className="border-t border-[rgb(var(--border))] pt-2">
              <DesgloseRow label="Ganancia neta"                   value={gananciaNeta ?? 0}                 sign=""  color={(gananciaNeta ?? 0) >= 0 ? "green" : "red"} bold />
            </div>
          </div>
        </section>
      )}

      {/* NO RECIBIDOS */}
      {noRecibidos.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Pedidos no recibidos — {MONTHS[month-1]}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="No recibidos" value={`${noRecibidos.length}`}
              icon={<PackageX size={15} />} danger sub="Contra entrega" />
            <Metric label="Pérdida por envíos" value={`Q${perdidaEnvios.toFixed(2)}`}
              icon={<AlertTriangle size={15} />} danger
              sub="Solo costo envío (producto vuelve)" />
          </div>
        </section>
      )}

      {/* TABLA EXCEL POR DÍA */}
      {dailyData.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Resumen por día — {MONTHS[month-1]} {year}
          </h2>
          <div className="card p-0 overflow-x-auto">
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
                {dailyData.map((row) => (
                  <tr key={row.fecha}
                    className={`border-t border-[rgb(var(--border))] ${row.fecha === todayStr ? "bg-green-500/5" : ""}`}>
                    <td className="p-3 font-medium text-sm">
                      {new Date(row.fecha + "T12:00:00").toLocaleDateString("es-GT", { day: "2-digit", month: "short" })}
                      {row.fecha === todayStr && <span className="ml-2 text-[10px] badge badge-green">hoy</span>}
                    </td>
                    <td className="p-3 text-center font-mono">{row.pedidos}</td>
                    <td className="p-3 text-right font-medium">{row.ventas > 0 ? `Q${row.ventas.toFixed(2)}` : "—"}</td>
                    <td className="p-3 text-right text-muted text-xs">{row.costo > 0 ? `Q${row.costo.toFixed(2)}` : "—"}</td>
                    <td className={`p-3 text-right font-semibold ${
                      row.ganancia > 0 ? "text-green-500" : row.ganancia < 0 ? "text-red-500" : "text-muted"
                    }`}>
                      {row.ventas > 0 ? `Q${row.ganancia.toFixed(2)}` : "—"}
                    </td>
                    <td className="p-3 text-center">{row.pendientes > 0 ? <span className="badge badge-yellow">{row.pendientes}</span> : "—"}</td>
                    <td className="p-3 text-center">{row.enviados  > 0 ? <span className="badge badge-blue">{row.enviados}</span>   : "—"}</td>
                    <td className="p-3 text-center">{row.noRec     > 0 ? <span className="badge badge-red">{row.noRec}</span>      : "—"}</td>
                  </tr>
                ))}
              </tbody>
              {/* TOTALES */}
              <tfoot>
                <tr className="border-t-2 border-[rgb(var(--border))] bg-[rgb(var(--card-soft))] font-semibold text-sm">
                  <td className="p-3">Total</td>
                  <td className="p-3 text-center font-mono">{sales.length}</td>
                  <td className="p-3 text-right text-green-500">Q{ventasMes.toFixed(2)}</td>
                  <td className="p-3 text-right text-muted text-xs">Q{(ventasMes - gananciaBruta).toFixed(2)}</td>
                  <td className={`p-3 text-right ${gananciaBruta >= 0 ? "text-green-500" : "text-red-500"}`}>
                    Q{gananciaBruta.toFixed(2)}
                  </td>
                  <td className="p-3 text-center">{dailyData.reduce((s,r)=>s+r.pendientes,0)||"—"}</td>
                  <td className="p-3 text-center">{dailyData.reduce((s,r)=>s+r.enviados,0)||"—"}</td>
                  <td className="p-3 text-center text-red-500">{noRecibidos.length||"—"}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* BAJO STOCK */}
      {lowStock.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Inventario bajo (≤ 5 unidades)</h2>
          <div className="card p-0 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[rgb(var(--border))] text-muted text-xs uppercase tracking-wider">
                  <th className="p-3 text-left">Producto</th>
                  <th className="p-3 text-left">SKU</th>
                  <th className="p-3 text-center">Stock</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
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
        </section>
      )}

      {loading && <p className="text-sm text-muted py-4">Cargando datos…</p>}
    </div>
  );
}

/* ── Componentes ── */
function Metric({ icon, label, value, sub, accent, positive, danger }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  accent?: boolean; positive?: boolean; danger?: boolean;
}) {
  const c = danger ? "text-red-400" : positive === true ? "text-green-400" : positive === false ? "text-red-400" : accent ? "text-green-400" : "";
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted text-xs">{icon}<span>{label}</span></div>
      <div className={`text-2xl font-bold ${c}`}>{value}</div>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

function DesgloseRow({ label, value, sign, color, bold }: {
  label: string; value: number; sign: string; color: "green" | "red"; bold?: boolean;
}) {
  const c = color === "green" ? "text-green-500" : "text-red-500";
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted"}>{label}</span>
      <span className={c}>{sign}{sign ? " " : ""}Q{Math.abs(value).toFixed(2)}</span>
    </div>
  );
}
