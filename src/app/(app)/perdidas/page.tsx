"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, PackageX, TrendingDown, Percent } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/* =====================
   TYPES
===================== */

type LossSummary = {
  total_perdido:           number;
  total_envios:            number;
  pedidos_no_recibidos:    number;
  total_pedidos:           number;
  porcentaje_no_recibidos: number;
};

type LossDetail = {
  id: string;
  sale_id: string | null;
  reason: string;
  amount: number;
  description: string;
  loss_date: string;
  // Supabase returns the related row as an object (not array)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sales: any;
};

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

/* =====================
   PAGE
===================== */

export default function PerdidasPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const [summary, setSummary] = useState<LossSummary | null>(null);
  const [details, setDetails] = useState<LossDetail[]>([]);
  const [loading, setLoading] = useState(false);

  /* =====================
     LOAD
  ===================== */

  async function loadData() {
    setLoading(true);

    const [summaryRes, detailsRes] = await Promise.all([
      supabase
        .rpc("get_loss_summary", { p_month: month, p_year: year })
        .single(),
      supabase
        .from("losses")
        .select(`
          id, sale_id, reason, amount, description, loss_date,
          sales ( order_number, customer_name, total )
        `)
        .gte("loss_date", `${year}-${String(month).padStart(2, "0")}-01`)
        .lte("loss_date", `${year}-${String(month).padStart(2, "0")}-31`)
        .order("loss_date", { ascending: false }),
    ]);

    if (!summaryRes.error && summaryRes.data) {
      setSummary(summaryRes.data as LossSummary);
    } else {
      setSummary(null);
    }

    setDetails((detailsRes.data ?? []) as unknown as LossDetail[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [month, year]);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  /* =====================
     UI
  ===================== */

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold">Control de Pérdidas</h1>
        <p className="text-sm text-muted">Pedidos no recibidos y costos de envío perdidos</p>
      </div>

      {/* SELECTOR DE PERÍODO */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <AlertTriangle size={16} className="text-muted" />
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
      </div>

      {/* MÉTRICAS */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total perdido"
            value={`Q${Number(summary.total_perdido).toFixed(2)}`}
            icon={<TrendingDown size={17} />}
            danger
          />
          <StatCard
            label="Gasto en envíos"
            value={`Q${Number(summary.total_envios).toFixed(2)}`}
            icon={<PackageX size={17} />}
          />
          <StatCard
            label="No recibidos"
            value={`${summary.pedidos_no_recibidos} / ${summary.total_pedidos}`}
            icon={<AlertTriangle size={17} />}
            danger={Number(summary.pedidos_no_recibidos) > 0}
          />
          <StatCard
            label="% No recibidos"
            value={`${Number(summary.porcentaje_no_recibidos).toFixed(1)}%`}
            icon={<Percent size={17} />}
            danger={Number(summary.porcentaje_no_recibidos) > 10}
          />
        </div>
      )}

      {/* SIN DATOS */}
      {!loading && summary && Number(summary.total_perdido) === 0 && details.length === 0 && (
        <div className="card p-8 text-center text-muted">
          <PackageX size={32} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Sin pérdidas en {MONTHS[month - 1]} {year}</p>
          <p className="text-xs mt-1">Todos los pedidos fueron recibidos correctamente.</p>
        </div>
      )}

      {/* DETALLE */}
      {details.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Detalle de pérdidas — {MONTHS[month - 1]} {year}
          </h2>

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
                {details.map((l) => (
                  <tr key={l.id} className="border-t border-[rgb(var(--border))]">
                    <td className="p-3 text-muted">
                      {new Date(l.loss_date).toLocaleDateString("es-GT")}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {l.sales?.order_number ?? "—"}
                    </td>
                    <td className="p-3">
                      {l.sales?.customer_name ?? "—"}
                    </td>
                    <td className="p-3 text-muted text-xs">{l.description}</td>
                    <td className="p-3 text-right font-medium text-red-500">
                      Q{Number(l.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}

                {/* TOTAL */}
                <tr className="border-t border-[rgb(var(--border))] font-semibold bg-[rgb(var(--card-soft))]">
                  <td colSpan={4} className="p-3">Total pérdidas del período</td>
                  <td className="p-3 text-right text-red-500">
                    Q{details.reduce((sum, l) => sum + Number(l.amount), 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-muted">Cargando datos…</p>}
    </div>
  );
}

/* =====================
   COMPONENTES
===================== */

function StatCard({
  label, value, icon, danger,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${danger ? "text-red-400" : ""}`}>
        {value}
      </div>
    </div>
  );
}
