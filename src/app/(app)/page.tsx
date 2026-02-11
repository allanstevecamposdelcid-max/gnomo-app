"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Clock,
  CheckCircle,
  Wallet,
  Plus,
  List,
  BarChart3,
  Boxes,
  Truck,
  Calendar,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/* ======================
   TYPES
====================== */

type SaleItem = {
  qty: number;
  unit_cost: number;
};

type Sale = {
  total: number;
  dtf_cost: number;
  status: "pendiente" | "enviado";
  created_at: string;
  sale_items: SaleItem[];
};

type Expense = {
  amount: number;
  expense_date: string;
};

/* ======================
   PAGE
====================== */

export default function DashboardPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 FILTRO FECHA
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  // 🔥 ATAJOS
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  /* ======================
     LOAD DATA
  ====================== */

  async function loadData() {
    setLoading(true);

    const { data: salesData } = await supabase
      .from("sales")
      .select(`
        total,
        dtf_cost,
        status,
        created_at,
        sale_items (
          qty,
          unit_cost
        )
      `);

    const { data: expensesData } = await supabase
      .from("expenses")
      .select("amount, expense_date");

    setSales(salesData || []);
    setExpenses(expensesData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  /* ======================
     FILTRO VENTAS
  ====================== */

  const salesFiltradas = useMemo(() => {
    return sales.filter((s) => {
      const d = s.created_at.slice(0, 10);

      if (from && d < from) return false;
      if (to && d > to) return false;

      return true;
    });
  }, [sales, from, to]);

  /* ======================
     CALCULOS
  ====================== */

  const totalVentas = useMemo(
    () => salesFiltradas.reduce((sum, s) => sum + s.total, 0),
    [salesFiltradas]
  );

  const pendiente = useMemo(
    () =>
      salesFiltradas
        .filter((s) => s.status === "pendiente")
        .reduce((sum, s) => sum + s.total, 0),
    [salesFiltradas]
  );

  const enviado = useMemo(
    () =>
      salesFiltradas
        .filter((s) => s.status === "enviado")
        .reduce((sum, s) => sum + s.total, 0),
    [salesFiltradas]
  );

  const costoProductos = useMemo(
    () =>
      salesFiltradas
        .flatMap((s) => s.sale_items)
        .reduce((sum, i) => sum + i.unit_cost * i.qty, 0),
    [salesFiltradas]
  );

  const dtfTotal = useMemo(
    () => salesFiltradas.reduce((sum, s) => sum + s.dtf_cost, 0),
    [salesFiltradas]
  );

  const gastos = useMemo(
    () =>
      expenses
        .filter((e) => {
          if (from && e.expense_date < from) return false;
          if (to && e.expense_date > to) return false;
          return true;
        })
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses, from, to]
  );

  const ganancia =
    totalVentas - costoProductos - dtfTotal - gastos;

  /* ======================
     UI
  ====================== */

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      {/* HEADER */}
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted">
          Resumen general del negocio
        </p>
      </header>

      {/* FILTROS */}
      <section className="card p-4 flex flex-wrap gap-4 items-end">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Calendar size={16} />
          <span>Filtrar por fecha</span>
        </div>

        <div>
          <label className="text-xs text-muted">Desde</label>
          <input
            type="date"
            className="input input-bordered"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-muted">Hasta</label>
          <input
            type="date"
            className="input input-bordered"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <button
          onClick={() => {
            setFrom(today);
            setTo(today);
          }}
          className="btn btn-ghost btn-sm"
        >
          Hoy
        </button>

        <button
          onClick={() => {
            setFrom(monthStart);
            setTo(today);
          }}
          className="btn btn-ghost btn-sm"
        >
          Este mes
        </button>

        <button
          onClick={() => {
            setFrom("");
            setTo("");
          }}
          className="btn btn-ghost btn-sm text-error"
        >
          Limpiar
        </button>
      </section>

      {/* MÉTRICAS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Metric
          label="Ventas"
          value={`Q${totalVentas.toFixed(2)}`}
          icon={<TrendingUp size={18} />}
          accent
        />
        <Metric
          label="Pendiente"
          value={`Q${pendiente.toFixed(2)}`}
          icon={<Clock size={18} />}
        />
        <Metric
          label="Enviado"
          value={`Q${enviado.toFixed(2)}`}
          icon={<CheckCircle size={18} />}
        />
        <Metric
          label="Ganancia"
          value={`Q${ganancia.toFixed(2)}`}
          icon={<Wallet size={18} />}
        />
      </section>

      {/* ACCIONES */}
      <section className="space-y-4">
        <h2 className="text-xs font-medium text-muted uppercase tracking-wider">
          Gestión
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Action href="/ventas/nueva" icon={<Plus size={18} />} label="Nueva venta" primary />
          <Action href="/inventario" icon={<Boxes size={18} />} label="Inventario" />
          <Action href="/ventas" icon={<List size={18} />} label="Libro diario" />
          <Action href="/caja" icon={<Wallet size={18} />} label="Caja diaria" />
          <Action href="/graficas" icon={<BarChart3 size={18} />} label="Gráficas" />
          <Action
            href="https://trackingt.github.io/order-tracking/admin.html"
            icon={<Truck size={18} />}
            label="Seguimiento pedidos"
          />
        </div>
      </section>

      {loading && <p className="text-sm opacity-60">Cargando datos…</p>}
    </main>
  );
}

/* ======================
   COMPONENTES
====================== */

function Metric({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-muted text-sm">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={`text-3xl font-semibold ${
          accent ? "text-green-400" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Action({
  href,
  icon,
  label,
  primary,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  const isExternal = href.startsWith("http");

  const base =
    "group card p-5 flex items-center gap-4 transition hover:-translate-y-px hover:shadow-md";

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={base}
      >
        <div className="h-9 w-9 rounded-md flex items-center justify-center bg-white/5 text-muted">
          {icon}
        </div>
        <span className="font-medium">{label}</span>
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={`${base} ${
        primary ? "border-green-500/30" : ""
      }`}
    >
      <div
        className={`h-9 w-9 rounded-md flex items-center justify-center ${
          primary
            ? "bg-green-500/20 text-green-400"
            : "bg-white/5 text-muted"
        }`}
      >
        {icon}
      </div>
      <span className="font-medium">{label}</span>
    </Link>
  );
}
