"use client";
import { Fragment, useEffect, useState } from "react";

import {
  ChevronDown,
  ChevronRight,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/* =====================
   TYPES
===================== */
type SaleItem = {
  id: string;
  qty: number;
  unit_price: number;
  unit_cost: number;
  product_name: string;
  
};



type Sale = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  total: number;       // 🔒 ya no nullable
  dtf_cost: number;    // 🔒 ya no nullable
  status: "pendiente" | "enviado";
  created_at: string;
  sale_items: SaleItem[];
};

/* =====================
   PAGE
===================== */

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [openRows, setOpenRows] = useState<string[]>([]);

  /* =====================
     LOAD SALES
  ===================== */

  async function loadSales() {
    setLoading(true);

    const { data, error } = await supabase
      .from("sales")
      .select(`
        id,
        customer_name,
        customer_phone,
        total,
        dtf_cost,
        status,
        created_at,
        sale_items (
  id,
  qty,
  unit_price,
  unit_cost,
  product_name
)

      `)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
    } else {
      setSales((data ?? []) as Sale[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSales();
  }, []);

  /* =====================
     PROFIT (REAL & SAFE)
  ===================== */

  function getProfit(sale: Sale) {
    const costos = sale.sale_items.reduce(
      (sum, i) => sum + i.unit_cost * i.qty,
      0
    );

    return sale.total - costos - sale.dtf_cost;
  }

  /* =====================
     CHANGE STATUS
  ===================== */

  async function toggleStatus(sale: Sale) {
    const next =
      sale.status === "pendiente" ? "enviado" : "pendiente";

    const { error } = await supabase
      .from("sales")
      .update({ status: next })
      .eq("id", sale.id);

    if (error) {
      alert(error.message);
    } else {
      loadSales();
    }
  }

  /* =====================
     DELETE SALE
  ===================== */

  async function deleteSale(id: string) {
    const ok = confirm(
      "¿Eliminar esta venta? Esta acción no se puede deshacer."
    );
    if (!ok) return;

    await supabase.from("sale_items").delete().eq("sale_id", id);
    await supabase.from("sales").delete().eq("id", id);

    loadSales();
  }

  /* =====================
     UI
  ===================== */

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Ventas (Libro Diario)
      </h1>

      <div className="card p-0 overflow-x-auto">
        {loading ? (
          <p className="p-4">Cargando…</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3 w-8"></th>
                <th className="p-3">Fecha</th>
                <th className="p-3">Cliente</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-right">Ganancia</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {sales.map((s) => {
                const open = openRows.includes(s.id);
                const profit = getProfit(s);

             return (
  <Fragment key={s.id}>
    <tr className="border-t">
      <td className="p-3">
        <button
          onClick={() =>
            setOpenRows((prev) =>
              prev.includes(s.id)
                ? prev.filter((i) => i !== s.id)
                : [...prev, s.id]
            )
          }
        >
          {open ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
        </button>
      </td>

      <td className="p-3">
        {new Date(s.created_at).toLocaleDateString()}
      </td>

      <td className="p-3">{s.customer_name}</td>

      <td className="p-3 text-right">
        Q{s.total.toFixed(2)}
      </td>

      <td
        className={`p-3 text-right font-medium ${
          profit >= 0 ? "text-green-600" : "text-red-600"
        }`}
      >
        Q{profit.toFixed(2)}
      </td>

      <td className="p-3 text-center">
        <button
          onClick={() => toggleStatus(s)}
          className={`px-2 py-1 rounded text-xs ${
            s.status === "enviado"
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {s.status}
        </button>
      </td>

      <td className="p-3 text-center">
        <button
          onClick={() => toggleStatus(s)}
          title="Cambiar estado"
          className="text-blue-500 hover:text-blue-700 mr-3"
        >
          <RefreshCw size={16} />
        </button>

        <button
          onClick={() => deleteSale(s.id)}
          title="Eliminar venta"
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>

    {open && (
      <tr className="bg-base-200/40">
        <td colSpan={7} className="p-3">
          <ul className="space-y-1">
            {s.sale_items.map((i) => (
              <li key={i.id}>
                {i.qty} ×{" "}
                <span className="font-medium">
                  {i.product_name}
                </span>{" "}
                — Q{(i.qty * i.unit_price).toFixed(2)}
              </li>
            ))}

            {s.dtf_cost > 0 && (
              <li className="text-xs opacity-70">
                Costo DTF: − Q{s.dtf_cost.toFixed(2)}
              </li>
            )}
          </ul>
        </td>
      </tr>
    )}
  </Fragment>
);

              })}

              {sales.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-6 text-center opacity-60"
                  >
                    No hay ventas registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
