"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  CalendarDays,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/* =====================
   TYPES
===================== */

type SaleItem = {
  qty: number;
  unit_cost: number;
};

type Sale = {
  total: number;
  dtf_cost: number;
  sale_items: SaleItem[];
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
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState<number | "">("");

  /* =====================
     LOAD DATA
  ===================== */

  async function loadData() {
    setLoading(true);

    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select(`
        total,
        dtf_cost,
        sale_items (
          qty,
          unit_cost
        )
      `)
      .gte("created_at", `${date}T00:00:00`)
      .lte("created_at", `${date}T23:59:59`);

    const { data: expensesData, error: expensesError } =
      await supabase
        .from("expenses")
        .select("id,description,amount")
        .eq("expense_date", date)
        .order("created_at", { ascending: false });

    if (salesError || expensesError) {
      alert(
        salesError?.message ||
          expensesError?.message ||
          "Error cargando datos"
      );
    } else {
      setSales(salesData || []);
      setExpenses(expensesData || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [date]);

  /* =====================
     CALCULOS (MISMA LÓGICA QUE DASHBOARD)
  ===================== */

  const ingresos = useMemo(
    () => sales.reduce((sum, s) => sum + s.total, 0),
    [sales]
  );

  const costoProductos = useMemo(
    () =>
      sales
        .flatMap((s) => s.sale_items)
        .reduce(
          (sum, i) => sum + i.unit_cost * i.qty,
          0
        ),
    [sales]
  );

  const dtfTotal = useMemo(
    () =>
      sales.reduce(
        (sum, s) => sum + (s.dtf_cost || 0),
        0
      ),
    [sales]
  );

  const gastos = useMemo(
    () =>
      expenses.reduce(
        (sum, r) => sum + Number(r.amount || 0),
        0
      ),
    [expenses]
  );

  const ganancia =
    ingresos - costoProductos - dtfTotal - gastos;

  /* =====================
     ACTIONS
  ===================== */

  async function addExpense() {
    if (!desc.trim() || !amount || amount <= 0) {
      alert("Ingresa descripción y monto válido");
      return;
    }

    const { error } = await supabase.from("expenses").insert({
      description: desc,
      amount,
      expense_date: date,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setDesc("");
    setAmount("");
    loadData();
  }

  async function deleteExpense(id: string) {
    const ok = confirm("¿Eliminar este gasto?");
    if (!ok) return;

    await supabase.from("expenses").delete().eq("id", id);
    loadData();
  }

  /* =====================
     UI
  ===================== */

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold">Caja diaria</h1>
        <p className="text-sm opacity-70">
          Ingresos, gastos y efectivo del día
        </p>
      </div>

      {/* FECHA */}
      <div className="card p-4 flex items-center gap-3 w-fit">
        <CalendarDays size={18} />
        <input
          type="date"
          className="input input-bordered"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* RESUMEN */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Resumen
          label="Ingresos"
          value={ingresos}
          icon={<TrendingUp size={16} />}
          color="text-green-500"
        />
        <Resumen
          label="Gastos"
          value={gastos}
          icon={<TrendingDown size={16} />}
          color="text-red-500"
        />
        <Resumen
          label="Caja neta"
          value={ganancia}
          icon={<Wallet size={16} />}
          color={
            ganancia >= 0
              ? "text-green-500"
              : "text-red-500"
          }
        />
      </div>

      {/* NUEVO GASTO */}
      <div className="card p-5 space-y-4">
        <h2 className="font-medium flex items-center gap-2">
          <Plus size={16} /> Registrar gasto
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="input input-bordered"
            placeholder="Descripción"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <input
            type="number"
            className="input input-bordered"
            placeholder="Monto"
            min={0}
            value={amount}
            onChange={(e) =>
              setAmount(
                e.target.value === ""
                  ? ""
                  : Number(e.target.value)
              )
            }
          />
          <button
            onClick={addExpense}
            className="btn btn-primary"
          >
            Agregar
          </button>
        </div>
      </div>

      {/* LISTA GASTOS */}
      <div className="card p-0 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="p-3 text-left">Descripción</th>
              <th className="p-3 text-right">Monto</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3">{e.description}</td>
                <td className="p-3 text-right text-red-500">
                  Q{e.amount.toFixed(2)}
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => deleteExpense(e.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}

            {expenses.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="p-6 text-center opacity-60"
                >
                  No hay gastos este día
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && (
        <p className="text-sm opacity-60">
          Cargando datos…
        </p>
      )}
    </div>
  );
}

/* =====================
   COMPONENTES
===================== */

function Resumen({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-1 text-sm opacity-70">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-2xl font-semibold ${color}`}>
        Q{value.toFixed(2)}
      </p>
    </div>
  );
}
