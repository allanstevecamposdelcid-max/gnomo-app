"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ChevronDown, ChevronRight, Trash2,
  AlertTriangle, Filter, Search,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Vendor = { id: string; name: string };

/* =====================
   TYPES
===================== */

type SaleItem = {
  id: string;
  product_id: string | null;
  qty: number;
  unit_price: number;
  unit_cost: number;
  product_name: string;
};

type Status = "pendiente" | "enviado" | "entregado" | "no_recibido";
type PaymentType = "pagado" | "contra_entrega";

type Sale = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string | null;
  tracking_number: string;
  payment_type: PaymentType;
  concept: string | null;
  total: number;
  shipping_cost: number;
  status: Status;
  sent_at: string | null;
  created_at: string;
  sale_items: SaleItem[];
};

/* =====================
   HELPERS
===================== */

const STATUS_LABELS: Record<Status, string> = {
  pendiente:    "Pendiente",
  enviado:      "Enviado",
  entregado:    "Entregado",
  no_recibido:  "No recibido",
};

const STATUS_COLORS: Record<Status, string> = {
  pendiente:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  enviado:     "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  entregado:   "bg-[rgb(var(--card-soft))] text-[rgb(var(--text))] dark:bg-[rgb(var(--card-soft))]",
  no_recibido: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_FLOW: Status[] = ["pendiente", "enviado", "entregado", "no_recibido"];

function isOverdue(sale: Sale): boolean {
  if (sale.status !== "enviado" || !sale.sent_at) return false;
  const days = (Date.now() - new Date(sale.sent_at).getTime()) / 86_400_000;
  return days > 15;
}

function getProfit(sale: Sale) {
  const costos = sale.sale_items.reduce((sum, i) => sum + i.unit_cost * i.qty, 0);
  return sale.total - costos;
}

/* =====================
   PAGE
===================== */

export default function VentasPage() {
  const [sales,   setSales]   = useState<Sale[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  // productId → supplierId map para filtrar por vendedor
  const [productVendorMap, setProductVendorMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [openRows, setOpenRows] = useState<string[]>([]);

  // Búsqueda y filtros
  const [search,         setSearch]         = useState("");
  const [filterStatus,   setFilterStatus]   = useState<Status | "">("");
  const [filterPayment,  setFilterPayment]  = useState<PaymentType | "">("");
  const [filterVendor,   setFilterVendor]   = useState("");
  const [filterFrom,     setFilterFrom]     = useState("");
  const [filterTo,       setFilterTo]       = useState("");
  const [showFilters,    setShowFilters]     = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  /* =====================
     LOAD SALES
  ===================== */

  async function loadSales() {
    setLoading(true);

    const { data, error } = await supabase
      .from("sales")
      .select(`
        id, order_number, customer_name, customer_phone,
        tracking_number, payment_type, concept,
        total, shipping_cost,
        status, sent_at, created_at,
        sale_items ( id, product_id, qty, unit_price, unit_cost, product_name )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
    } else {
      setSales((data ?? []) as Sale[]);
    }

    setLoading(false);
  }

  async function loadVendors() {
    const [vendorsRes, productsRes] = await Promise.all([
      supabase.from("suppliers").select("id, name").order("name"),
      supabase.from("products").select("id, supplier_id").not("supplier_id", "is", null),
    ]);
    setVendors((vendorsRes.data as Vendor[]) ?? []);
    const map: Record<string, string> = {};
    for (const p of (productsRes.data ?? []) as { id: string; supplier_id: string }[]) {
      map[p.id] = p.supplier_id;
    }
    setProductVendorMap(map);
  }

  useEffect(() => { loadSales(); loadVendors(); }, []);

  /* =====================
     FILTRADO
  ===================== */

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return sales.filter((s) => {
      const d = s.created_at.slice(0, 10);
      if (filterStatus  && s.status       !== filterStatus)  return false;
      if (filterPayment && s.payment_type !== filterPayment) return false;
      if (filterFrom    && d < filterFrom)                   return false;
      if (filterTo      && d > filterTo)                     return false;
      if (filterVendor) {
        const hasVendorProduct = s.sale_items.some(
          i => i.product_id && productVendorMap[i.product_id] === filterVendor
        );
        if (!hasVendorProduct) return false;
      }
      if (q) {
        const match =
          s.order_number.toLowerCase().includes(q)   ||
          s.customer_name.toLowerCase().includes(q)  ||
          (s.customer_phone ?? "").includes(q)        ||
          s.tracking_number.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [sales, search, filterStatus, filterPayment, filterFrom, filterTo, filterVendor, productVendorMap]);

  /* =====================
     CHANGE STATUS
  ===================== */

  async function changeStatus(sale: Sale, newStatus: Status) {
    if (newStatus === "no_recibido") {
      const ok = confirm(
        `¿Marcar como "No recibido"?\n\n• El producto vuelve al inventario.\n• Se registrará una pérdida de Q${sale.shipping_cost} por el costo de envío.\n\nEsta acción no se puede deshacer.`
      );
      if (!ok) return;
    }

    const { error } = await supabase.rpc("update_sale_status", {
      p_sale_id:    sale.id,
      p_new_status: newStatus,
    });

    if (error) alert(error.message);
    else loadSales();
  }

  /* =====================
     DELETE SALE
  ===================== */

  async function deleteSale(sale: Sale) {
    // no_recibido: el stock ya fue devuelto por el trigger SQL, no restaurar de nuevo
    const needsRestoreStock = sale.status !== "no_recibido";
    const msg = needsRestoreStock
      ? "¿Eliminar esta venta?\n\n• El stock de los productos volverá al inventario.\n\nEsta acción no se puede deshacer."
      : "¿Eliminar esta venta? Esta acción no se puede deshacer.";
    if (!confirm(msg)) return;

    // 1. Restaurar stock si el pedido no fue entregado ni ya devuelto
    if (needsRestoreStock) {
      const productIds = sale.sale_items
        .filter((i) => i.product_id)
        .map((i) => i.product_id as string);

      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from("products")
          .select("id, stock")
          .in("id", productIds);

        if (products) {
          for (const item of sale.sale_items) {
            if (!item.product_id) continue;
            const prod = products.find((p) => p.id === item.product_id);
            if (prod) {
              await supabase
                .from("products")
                .update({ stock: prod.stock + item.qty })
                .eq("id", item.product_id);
            }
          }
        }
      }
    }

    // 2. Eliminar pérdidas asociadas (evita FK constraint)
    await supabase.from("losses").delete().eq("sale_id", sale.id);

    // 3. Eliminar venta (sale_items se eliminan por CASCADE)
    await supabase.from("sales").delete().eq("id", sale.id);
    loadSales();
  }

  /* =====================
     UI
  ===================== */

  const overdueCount = sales.filter(isOverdue).length;

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Libro de ventas</h1>
          <p className="text-sm text-muted">{filtered.length} pedido{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`btn card-soft flex items-center gap-2 text-sm ${showFilters ? "text-[rgb(var(--text))]" : ""}`}
        >
          <Filter size={15} />
          Filtros
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          className="input w-full pl-9"
          placeholder="Buscar por pedido, cliente, teléfono o número de guía…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[rgb(var(--text))] text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* ALERTA VENCIDOS */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-500 text-sm">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            <strong>{overdueCount}</strong> pedido{overdueCount !== 1 ? "s" : ""} en estado
            &ldquo;Enviado&rdquo; llevan más de 15 días sin actualizarse.
          </span>
        </div>
      )}

      {/* FILTROS */}
      {showFilters && (
        <div className="card p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted block mb-1">Estado</label>
            <select
              className="input"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as Status | "")}
            >
              <option value="">Todos</option>
              {STATUS_FLOW.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">Tipo de pago</label>
            <select
              className="input"
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value as PaymentType | "")}
            >
              <option value="">Todos</option>
              <option value="pagado">Pagado</option>
              <option value="contra_entrega">Contra entrega</option>
            </select>
          </div>

          {vendors.length > 0 && (
            <div>
              <label className="text-xs text-muted block mb-1">Vendedor tercero</label>
              <select
                className="input"
                value={filterVendor}
                onChange={(e) => setFilterVendor(e.target.value)}
              >
                <option value="">Todos</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-muted block mb-1">Desde</label>
            <input
              type="date"
              className="input"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">Hasta</label>
            <input
              type="date"
              className="input"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button className="btn card-soft text-sm" onClick={() => { setFilterFrom(today); setFilterTo(today); }}>Hoy</button>
            <button className="btn card-soft text-sm" onClick={() => { setFilterFrom(monthStart); setFilterTo(today); }}>Este mes</button>
            <button className="btn card-soft text-sm text-red-500" onClick={() => { setFilterStatus(""); setFilterPayment(""); setFilterVendor(""); setFilterFrom(""); setFilterTo(""); }}>
              Limpiar
            </button>
          </div>
        </div>
      )}

      {/* TABLA */}
      <div className="card p-0 overflow-x-auto">
        {loading ? (
          <p className="p-6 text-sm text-muted">Cargando…</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[rgb(var(--border))] text-muted text-xs uppercase tracking-wider">
                <th className="p-3 w-8"></th>
                <th className="p-3 text-left">Pedido</th>
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-left">Cliente</th>
                <th className="p-3 text-left">Guía</th>
                <th className="p-3 text-center">Pago</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-right">Ganancia</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((s) => {
                const open    = openRows.includes(s.id);
                const profit  = getProfit(s);
                const overdue = isOverdue(s);

                return (
                  <Fragment key={s.id}>
                    <tr className={`border-t border-[rgb(var(--border))] ${overdue ? "bg-red-500/5" : ""}`}>

                      {/* EXPAND */}
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
                          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        </button>
                      </td>

                      {/* ORDER NUMBER */}
                      <td className="p-3 font-mono font-medium text-xs">
                        <div className="flex items-center gap-1">
                          {overdue && <AlertTriangle size={13} className="text-red-500 shrink-0" />}
                          {s.order_number}
                        </div>
                      </td>

                      {/* FECHA */}
                      <td className="p-3 text-muted">
                        {new Date(s.created_at).toLocaleDateString("es-GT")}
                      </td>

                      {/* CLIENTE */}
                      <td className="p-3">
                        <div className="font-medium">{s.customer_name}</div>
                        {s.customer_phone && (
                          <div className="text-xs text-muted">{s.customer_phone}</div>
                        )}
                      </td>

                      {/* GUÍA */}
                      <td className="p-3 font-mono text-xs text-muted">{s.tracking_number}</td>

                      {/* TIPO PAGO */}
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.payment_type === "contra_entrega"
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        }`}>
                          {s.payment_type === "contra_entrega" ? "C/E" : "Pagado"}
                        </span>
                      </td>

                      {/* TOTAL */}
                      <td className="p-3 text-right font-medium">Q{s.total.toFixed(2)}</td>

                      {/* GANANCIA */}
                      <td className={`p-3 text-right font-medium ${
                        s.status === "no_recibido"
                          ? "text-red-500 line-through opacity-60"
                          : profit < 0 ? "text-red-500" : ""
                      }`}>
                        Q{profit.toFixed(2)}
                      </td>

                      {/* ESTADO */}
                      <td className="p-3 text-center">
                        <select
                          value={s.status}
                          onChange={(e) => changeStatus(s, e.target.value as Status)}
                          className={`text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer ${STATUS_COLORS[s.status]}`}
                        >
                          {STATUS_FLOW.map((st) => (
                            <option key={st} value={st}>{STATUS_LABELS[st]}</option>
                          ))}
                        </select>
                      </td>

                      {/* ACCIONES */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => deleteSale(s)}
                          title="Eliminar venta"
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>

                    {/* DETALLE */}
                    {open && (
                      <tr className="border-t border-[rgb(var(--border))] bg-[rgb(var(--card-soft))]">
                        <td colSpan={10} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-semibold mb-2">Productos</p>
                              <ul className="space-y-1 text-muted">
                                {s.sale_items.map((i) => (
                                  <li key={i.id}>
                                    {i.qty} × <span className="text-[rgb(var(--text))] font-medium">{i.product_name}</span>
                                    {" "}— Q{(i.qty * i.unit_price).toFixed(2)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="space-y-1 text-muted">
                              {s.concept && (
                                <p><span className="font-medium text-[rgb(var(--text))]">Concepto:</span> {s.concept}</p>
                              )}
                              {s.shipping_cost > 0 && (
                                <p><span className="font-medium text-[rgb(var(--text))]">Envío:</span> Q{s.shipping_cost.toFixed(2)}</p>
                              )}
                              {overdue && (
                                <p className="text-red-500 font-medium">
                                  ⚠ Enviado hace más de 15 días sin actualizar
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted">
                    No hay ventas con los filtros actuales
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
