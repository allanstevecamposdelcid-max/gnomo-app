"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ChevronDown, ChevronRight, Trash2,
  AlertTriangle, Filter, Search, Undo2, X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Hidden } from "@/components/ProfitLock";
import { RETURN_LOSS } from "@/lib/constants";

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

type Status = "pendiente" | "enviado" | "entregado" | "no_recibido" | "devuelto";
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
  shipping_discount: number;
  status: Status;
  return_reason: string | null;
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
  devuelto:     "Devolución",
};

const STATUS_COLORS: Record<Status, string> = {
  pendiente:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  enviado:     "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  entregado:   "bg-[rgb(var(--card-soft))] text-[rgb(var(--text))] dark:bg-[rgb(var(--card-soft))]",
  no_recibido: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  devuelto:    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const STATUS_FLOW: Status[] = ["pendiente", "enviado", "entregado", "no_recibido", "devuelto"];

// Ventas cerradas: el stock ya regresó y la pérdida ya se registró
const isClosed = (s: Sale) => s.status === "no_recibido" || s.status === "devuelto";

function isOverdue(sale: Sale): boolean {
  if (sale.status !== "enviado" || !sale.sent_at) return false;
  const days = (Date.now() - new Date(sale.sent_at).getTime()) / 86_400_000;
  return days > 15;
}

function getProfit(sale: Sale) {
  const costos = sale.sale_items.reduce((sum, i) => sum + i.unit_cost * i.qty, 0);
  return sale.total - costos - Number(sale.shipping_discount || 0);
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
  const [returning, setReturning] = useState<Sale | null>(null);

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
        total, shipping_cost, shipping_discount,
        status, return_reason, sent_at, created_at,
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
    // La devolución pide primero la razón (obligatoria) en un modal
    if (newStatus === "devuelto") { setReturning(sale); return; }

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

  async function registerReturn(sale: Sale, reason: string) {
    const { error } = await supabase.rpc("update_sale_status", {
      p_sale_id:    sale.id,
      p_new_status: "devuelto",
      p_reason:     reason,
    });
    if (error) { alert(error.message); return false; }
    setReturning(null);
    loadSales();
    return true;
  }

  /* =====================
     DELETE SALE
  ===================== */

  async function deleteSale(sale: Sale) {
    // no_recibido / devuelto: el stock ya fue devuelto por update_sale_status, no restaurar de nuevo
    const msg = !isClosed(sale)
      ? "¿Eliminar esta venta?\n\n• El stock de los productos volverá al inventario.\n\nEsta acción no se puede deshacer."
      : "¿Eliminar esta venta? Esta acción no se puede deshacer.";
    if (!confirm(msg)) return;

    // delete_sale devuelve el stock (a la prenda base si era un diseño) y borra la venta con sus pérdidas
    const { error } = await supabase.rpc("delete_sale", { p_sale_id: sale.id });
    if (error) { alert(error.message); return; }
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
                      <td className={`p-3 text-right font-medium ${s.status === "devuelto" ? "line-through text-muted" : ""}`}>
                        Q{s.total.toFixed(2)}
                      </td>

                      {/* GANANCIA — una devolución no es venta: solo muestra la pérdida de 2 envíos */}
                      <td className={`p-3 text-right font-medium ${
                        s.status === "devuelto"
                          ? "text-red-500"
                          : s.status === "no_recibido"
                          ? "text-red-500 line-through opacity-60"
                          : profit < 0 ? "text-red-500" : ""
                      }`}>
                        {s.status === "devuelto"
                          ? <span title="Devolución: no cuenta como venta, solo se pierden 2 envíos">−Q{RETURN_LOSS.toFixed(2)}</span>
                          : <Hidden>Q{profit.toFixed(2)}</Hidden>}
                      </td>

                      {/* ESTADO */}
                      <td className="p-3 text-center">
                        <select
                          value={s.status}
                          onChange={(e) => changeStatus(s, e.target.value as Status)}
                          disabled={isClosed(s)}
                          className={`text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer disabled:cursor-default ${STATUS_COLORS[s.status]}`}
                        >
                          {STATUS_FLOW.map((st) => (
                            <option key={st} value={st}>{STATUS_LABELS[st]}</option>
                          ))}
                        </select>
                      </td>

                      {/* ACCIONES */}
                      <td className="p-3 text-center whitespace-nowrap">
                        {!isClosed(s) && (
                          <button
                            onClick={() => changeStatus(s, "devuelto")}
                            title={`Registrar devolución (−Q${RETURN_LOSS})`}
                            className="text-purple-500 hover:text-purple-700 p-1"
                          >
                            <Undo2 size={15} />
                          </button>
                        )}
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
                              {s.shipping_discount > 0 && (
                                <p><span className="font-medium text-[rgb(var(--text))]">Envío gratis (oferta):</span> −Q{Number(s.shipping_discount).toFixed(2)}</p>
                              )}
                              {s.status === "devuelto" && (
                                <div className="text-purple-500">
                                  <p className="font-medium">Devolución — no cuenta como venta. Pérdida: Q{RETURN_LOSS} (2 envíos)</p>
                                  {s.return_reason && (
                                    <p><span className="font-medium">Razón:</span> {s.return_reason}</p>
                                  )}
                                </div>
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

      {returning && (
        <ReturnModal
          sale={returning}
          onClose={() => setReturning(null)}
          onConfirm={(reason) => registerReturn(returning, reason)}
        />
      )}
    </div>
  );
}

/* =====================
   MODAL DEVOLUCIÓN
===================== */

const RETURN_REASONS = [
  "Talla incorrecta",
  "Producto dañado o con defecto",
  "Diseño o color equivocado",
  "El cliente ya no lo quiso",
  "Otra razón",
];

function ReturnModal({ sale, onClose, onConfirm }: {
  sale: Sale;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<boolean>;
}) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);

  const isOther = reason === "Otra razón";
  const valid   = isOther ? detail.trim() !== "" : reason !== "";

  async function submit() {
    if (!valid) return;
    setSaving(true);
    const finalReason = isOther ? detail.trim() : [reason, detail.trim()].filter(Boolean).join(" — ");
    const ok = await onConfirm(finalReason);
    if (!ok) setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <Undo2 size={16} className="text-purple-500" /> Registrar devolución
          </h2>
          <button onClick={onClose} className="text-muted hover:text-[rgb(var(--text))]"><X size={18} /></button>
        </div>

        <p className="text-sm">
          Pedido <span className="font-mono font-medium">{sale.order_number}</span> · {sale.customer_name}
        </p>
        <ul className="text-xs text-muted mt-2 mb-4 space-y-1 list-disc pl-4">
          <li>No se cuenta como venta (los Q{Number(sale.total).toFixed(2)} no entran en ventas ni ganancias).</li>
          <li>El producto regresa al inventario.</li>
          <li>Solo se pierden 2 envíos: Q{RETURN_LOSS / 2} + Q{RETURN_LOSS / 2} = <b className="text-red-500">Q{RETURN_LOSS}</b>.</li>
        </ul>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted block mb-1">Razón de devolución *</label>
            <select className="input w-full" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus>
              <option value="">Selecciona una razón…</option>
              {RETURN_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">
              {isOther ? "Describe la razón *" : "Detalle (opcional)"}
            </label>
            <textarea className="input w-full resize-none" rows={2}
              placeholder={isOther ? "¿Por qué se devolvió?" : "Ej: pidió talla M en lugar de L"}
              value={detail} onChange={(e) => setDetail(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancelar</button>
          <button onClick={submit} disabled={!valid || saving} className="btn btn-primary flex-1">
            {saving ? "Guardando…" : `Registrar devolución (−Q${RETURN_LOSS})`}
          </button>
        </div>
      </div>
    </div>
  );
}
