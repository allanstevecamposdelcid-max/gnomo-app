"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  AlertTriangle,
  Wallet,
  Plus,
  List,
  BarChart3,
  Boxes,
  ShoppingBag,
  Receipt,
  PackageX,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/* ======================
   TYPES
====================== */

type SaleItem = { qty: number; unit_cost: number };

type Sale = {
  total: number;
  shipping_cost: number;
  status: "pendiente" | "enviado" | "entregado" | "no_recibido";
  created_at: string;
  sale_items: SaleItem[];
};

type Expense = { amount: number; expense_date: string };

type LowStockProduct = {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
};

/* ======================
   PAGE
====================== */

export default function DashboardPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [netProfit, setNetProfit] = useState<{ ganancia_bruta: number; gastos_fijos: number; ganancia_neta: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear  = new Date().getFullYear();
  const monthStart   = today.slice(0, 7) + "-01";

  /* ======================
     LOAD DATA
  ====================== */

  async function loadData() {
    setLoading(true);

    const [salesRes, expensesRes, lowStockRes, netProfitRes] = await Promise.all([
      supabase
        .from("sales")
        .select(`total, shipping_cost, status, created_at, sale_items(qty, unit_cost)`),
      supabase
        .from("expenses")
        .select("amount, expense_date"),
      supabase
        .from("low_stock_products")
        .select("id, name, sku, stock"),
      supabase
        .rpc("get_net_profit", { p_month: currentMonth, p_year: currentYear })
        .single(),
    ]);

    setSales((salesRes.data ?? []) as Sale[]);
    setExpenses((expensesRes.data ?? []) as Expense[]);
    setLowStock((lowStockRes.data ?? []) as LowStockProduct[]);
    if (!netProfitRes.error && netProfitRes.data) {
      setNetProfit(netProfitRes.data as typeof netProfit);
    }

    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  /* ======================
     CÁLCULOS
  ====================== */

  // Ventas del día (entregadas)
  const ventasHoy = useMemo(() =>
    sales.filter((s) => s.status === "entregado" && s.created_at.slice(0, 10) === today)
         .reduce((sum, s) => sum + s.total, 0),
    [sales, today]
  );

  // Ventas del mes (entregadas)
  const ventasMes = useMemo(() =>
    sales.filter((s) => s.status === "entregado" && s.created_at.slice(0, 7) === today.slice(0, 7))
         .reduce((sum, s) => sum + s.total, 0),
    [sales, today]
  );

  // Ganancia bruta del mes (entregadas)
  const gananciaBruta = useMemo(() => {
    const entregadas = sales.filter(
      (s) => s.status === "entregado" && s.created_at.slice(0, 7) === today.slice(0, 7)
    );
    return entregadas.reduce((sum, s) => {
      const costos = s.sale_items.reduce((c, i) => c + i.unit_cost * i.qty, 0);
      return sum + (s.total - costos - s.shipping_cost);
    }, 0);
  }, [sales, today]);

  // No recibidos del mes
  const noRecibidosMes = useMemo(() =>
    sales.filter(
      (s) => s.status === "no_recibido" && s.created_at.slice(0, 7) === today.slice(0, 7)
    ).length,
    [sales, today]
  );

  const montoNoRecibido = useMemo(() =>
    sales.filter(
      (s) => s.status === "no_recibido" && s.created_at.slice(0, 7) === today.slice(0, 7)
    ).reduce((sum, s) => sum + s.total, 0),
    [sales, today]
  );

  /* ======================
     UI
  ====================== */

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted mt-1">
          {new Date().toLocaleDateString("es-GT", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* ALERTA BAJO INVENTARIO */}
      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-orange-500 text-sm">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Productos con bajo inventario ({lowStock.length})</p>
            <p className="text-xs mt-1 opacity-80">
              {lowStock.map((p) => `${p.name} (${p.stock})`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* MÉTRICAS PRINCIPALES */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Resumen del mes</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Metric
            label="Ventas del día"
            value={`Q${ventasHoy.toFixed(2)}`}
            icon={<ShoppingBag size={17} />}
            sub="Solo entregadas"
          />
          <Metric
            label="Ventas del mes"
            value={`Q${ventasMes.toFixed(2)}`}
            icon={<TrendingUp size={17} />}
            accent
            sub="Solo entregadas"
          />
          <Metric
            label="Ganancia bruta"
            value={`Q${gananciaBruta.toFixed(2)}`}
            icon={<Wallet size={17} />}
            positive={gananciaBruta >= 0}
            sub="Mes actual"
          />
          <Metric
            label="Ganancia neta"
            value={netProfit ? `Q${Number(netProfit.ganancia_neta).toFixed(2)}` : "—"}
            icon={<Wallet size={17} />}
            positive={netProfit ? Number(netProfit.ganancia_neta) >= 0 : undefined}
            sub="Menos gastos fijos"
          />
        </div>
      </section>

      {/* NO RECIBIDOS */}
      {(noRecibidosMes > 0 || montoNoRecibido > 0) && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Pedidos no recibidos — este mes</h2>
          <div className="grid grid-cols-2 gap-4">
            <Metric
              label="Pedidos no recibidos"
              value={`${noRecibidosMes}`}
              icon={<PackageX size={17} />}
              danger
              sub="Contra entrega"
            />
            <Metric
              label="Monto total perdido"
              value={`Q${montoNoRecibido.toFixed(2)}`}
              icon={<AlertTriangle size={17} />}
              danger
              sub="Ver control de pérdidas"
            />
          </div>
        </section>
      )}

      {/* GASTOS FIJOS */}
      {netProfit && (
        <section className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold">Resumen financiero del mes</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted">Ganancia bruta</p>
              <p className="text-lg font-bold text-green-400">Q{Number(netProfit.ganancia_bruta).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Gastos fijos</p>
              <p className="text-lg font-bold text-red-400">− Q{Number(netProfit.gastos_fijos).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Ganancia neta</p>
              <p className={`text-lg font-bold ${Number(netProfit.ganancia_neta) >= 0 ? "text-green-400" : "text-red-400"}`}>
                Q{Number(netProfit.ganancia_neta).toFixed(2)}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ACCIONES RÁPIDAS */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Acciones rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <Action href="/ventas/nueva" icon={<Plus size={18} />}   label="Nueva venta"   primary />
          <Action href="/ventas"       icon={<List size={18} />}    label="Ver ventas"            />
          <Action href="/inventario"   icon={<Boxes size={18} />}   label="Inventario"            />
          <Action href="/caja"         icon={<Wallet size={18} />}  label="Caja diaria"           />
          <Action href="/gastos-fijos" icon={<Receipt size={18} />} label="Gastos fijos"          />
          <Action href="/perdidas"     icon={<PackageX size={18} />} label="Pérdidas"             />
          <Action href="/graficas"     icon={<BarChart3 size={18} />} label="Gráficas"            />
        </div>
      </section>

      {/* BAJO STOCK DETALLE */}
      {lowStock.length > 0 && (
        <section className="space-y-3">
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
                      <span className={`font-bold ${p.stock === 0 ? "text-red-500" : "text-orange-500"}`}>
                        {p.stock}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {loading && <p className="text-sm text-muted">Cargando datos…</p>}
    </div>
  );
}

/* ======================
   COMPONENTES
====================== */

function Metric({
  icon, label, value, sub, accent, positive, danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  positive?: boolean;
  danger?: boolean;
}) {
  const valueColor = danger
    ? "text-red-400"
    : positive === true
    ? "text-green-400"
    : positive === false
    ? "text-red-400"
    : accent
    ? "text-green-400"
    : "";

  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

function Action({
  href, icon, label, primary,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`card p-4 flex items-center gap-3 hover:-translate-y-px hover:shadow-md transition text-sm font-medium ${
        primary ? "border-green-500/30" : ""
      }`}
    >
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
        primary ? "bg-green-500/20 text-green-400" : "bg-white/5 text-muted"
      }`}>
        {icon}
      </div>
      {label}
    </Link>
  );
}
