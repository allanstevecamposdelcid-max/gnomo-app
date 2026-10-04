"use client";

import { useEffect, useMemo, useState } from "react";
import { Trophy, TrendingDown } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Row = { key: string; name: string; qty: number; revenue: number };
type SaleRow = {
  sale_items: { product_id: string | null; product_name: string; qty: number; unit_price: number }[];
};

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

/* Productos vendidos en un rango, de más vendido a menos vendido.
   Cuenta pendientes, enviados y entregados; excluye no recibidos y devoluciones. */
export default function TopProducts() {
  const now      = new Date();
  const todayStr = toDateStr(now);
  const firstOfMonth = todayStr.slice(0, 7) + "-01";

  const [from,    setFrom]    = useState(firstOfMonth);
  const [to,      setTo]      = useState(todayStr);
  const [rows,    setRows]    = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  function prevMonth() {
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const m = now.getMonth() === 0 ? 12 : now.getMonth();
    setFrom(`${y}-${String(m).padStart(2, "0")}-01`);
    setTo(toDateStr(new Date(y, m, 0)));
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase.from("sales")
        .select("sale_items(product_id, product_name, qty, unit_price)")
        .gte("created_at", `${from}T00:00:00`)
        .lte("created_at", `${to}T23:59:59`)
        .not("status", "in", "(no_recibido,devuelto)");
      const map: Record<string, Row> = {};
      for (const s of (data ?? []) as unknown as SaleRow[]) {
        for (const i of s.sale_items) {
          const key = i.product_id ?? i.product_name;
          if (!map[key]) map[key] = { key, name: i.product_name, qty: 0, revenue: 0 };
          map[key].qty     += Number(i.qty);
          map[key].revenue += Number(i.qty) * Number(i.unit_price);
        }
      }
      setRows(Object.values(map).sort((a, b) => b.qty - a.qty || b.revenue - a.revenue));
      setLoading(false);
    }
    load();
  }, [from, to]);

  const totalQty = useMemo(() => rows.reduce((s, r) => s + r.qty, 0), [rows]);
  const maxQty   = rows[0]?.qty ?? 0;

  const label = from.slice(8) === "01" && from.slice(0, 7) === to.slice(0, 7)
    ? `${MONTHS[Number(from.slice(5, 7)) - 1]} ${from.slice(0, 4)}`
    : `${from} — ${to}`;

  return (
    <div className="space-y-3 pt-3">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setFrom(firstOfMonth); setTo(todayStr); }}
          className="text-xs px-3 py-1.5 rounded-lg border border-[rgb(var(--border))] text-muted hover:text-[rgb(var(--text))] hover:bg-[rgb(var(--card-soft))] font-medium">
          Este mes
        </button>
        <button onClick={prevMonth}
          className="text-xs px-3 py-1.5 rounded-lg border border-[rgb(var(--border))] text-muted hover:text-[rgb(var(--text))] hover:bg-[rgb(var(--card-soft))] font-medium">
          Mes anterior
        </button>
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-muted block mb-1">Desde</label>
          <input type="date" className="input" value={from} max={to} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">Hasta</label>
          <input type="date" className="input" value={to} min={from} max={todayStr} onChange={e => setTo(e.target.value)} />
        </div>
        <p className="text-xs text-muted self-center">
          {label}: <b className="text-[rgb(var(--text))]">{totalQty}</b> unidades vendidas
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted py-3">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted text-center py-4">No hay productos vendidos en este rango</p>
      ) : (
        <div className="card p-0 overflow-hidden">
          {rows.map((r, idx) => {
            const isTop    = idx === 0;
            const isBottom = idx === rows.length - 1 && rows.length > 1;
            return (
              <div key={r.key} className="flex items-center gap-3 px-3 py-2.5 border-t first:border-t-0 border-[rgb(var(--border))]">
                <span className="w-6 text-center text-xs font-mono text-muted shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{r.name}</p>
                    {isTop    && <span className="badge badge-green text-[10px] shrink-0 flex items-center gap-1"><Trophy size={10} /> Más vendido</span>}
                    {isBottom && <span className="badge badge-red text-[10px] shrink-0 flex items-center gap-1"><TrendingDown size={10} /> Menos vendido</span>}
                  </div>
                  <div className="h-1.5 mt-1.5 rounded-full bg-[rgb(var(--card-soft))] overflow-hidden">
                    <div className="h-full rounded-full bg-[rgb(var(--text))] opacity-70"
                      style={{ width: `${maxQty ? (r.qty / maxQty) * 100 : 0}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm">{r.qty} <span className="text-xs font-normal text-muted">uds</span></p>
                  <p className="text-[11px] text-muted">Q{r.revenue.toFixed(2)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
