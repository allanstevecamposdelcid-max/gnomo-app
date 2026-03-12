"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  User, Phone, Package, Save, Truck,
  FileText, CreditCard, Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Product = {
  id: string; name: string; sku: string | null;
  stock: number; price: number; cost: number;
};

type CartItem = {
  product: Product;
  qty: number;
  unit_price: number; // editable
};

export default function NuevaVentaPage() {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [openProducts, setOpenProducts] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [paymentType, setPaymentType] = useState<"pagado" | "contra_entrega">("pagado");
  const [concept, setConcept] = useState("");
  const [shippingCost, setShippingCost] = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  async function loadProducts(q = "") {
    let query = supabase
      .from("products")
      .select("id,name,sku,stock,price,cost")
      .eq("active", true)
      .order("name");
    if (q.trim()) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
    const { data } = await query;
    setProducts((data as Product[]) || []);
  }

  useEffect(() => { loadProducts(); }, []);
  useEffect(() => {
    const t = setTimeout(() => loadProducts(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setOpenProducts(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addToCart(product: Product) {
    setCart((prev) => {
      const found = prev.find((i) => i.product.id === product.id);
      if (found) {
        if (found.qty + 1 > product.stock) { alert("Stock insuficiente"); return prev; }
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { product, qty: 1, unit_price: product.price }];
    });
    setSearch("");
    setOpenProducts(false);
  }

  function updateQty(productId: string, qty: number) {
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? { ...i, qty: qty > i.product.stock ? i.product.stock : Math.max(1, qty) }
          : i
      )
    );
  }

  function updatePrice(productId: string, price: number) {
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? { ...i, unit_price: price >= 0 ? price : 0 }
          : i
      )
    );
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  const total = cart.reduce((sum, i) => sum + i.qty * i.unit_price, 0);

  async function saveSale() {
    if (!customerName.trim()) { alert("El nombre del cliente es obligatorio"); return; }
    if (!trackingNumber.trim()) { alert("El número de guía es obligatorio"); return; }
    if (cart.length === 0) { alert("Agrega al menos un producto"); return; }

    setLoading(true);

    const items = cart.map((i) => ({
      product_id:   i.product.id,
      product_name: i.product.name,
      qty:          i.qty,
      unit_price:   i.unit_price,
      unit_cost:    i.product.cost,
    }));

    const { error } = await supabase.rpc("create_sale_multi", {
      p_customer_name:   customerName,
      p_customer_phone:  customerPhone || null,
      p_tracking_number: trackingNumber,
      p_payment_type:    paymentType,
      p_concept:         concept || null,
      p_items:           items,
      p_dtf_cost:        0,
      p_shipping_cost:   Number(shippingCost) || 0,
    });

    setLoading(false);
    if (error) { alert(error.message); return; }
    router.push("/ventas");
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-24">
      <h1 className="text-2xl font-semibold">Nueva venta</h1>

      <div className="card p-6 space-y-6">

        {/* CLIENTE */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Cliente</h2>
          <div className="flex gap-2 items-center">
            <User size={16} className="shrink-0 text-muted" />
            <input className="input w-full" value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nombre del cliente *" />
          </div>
          <div className="flex gap-2 items-center">
            <Phone size={16} className="shrink-0 text-muted" />
            <input className="input w-full" value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Teléfono (opcional)" />
          </div>
        </section>

        {/* PEDIDO */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Pedido</h2>
          <div className="flex gap-2 items-center">
            <Truck size={16} className="shrink-0 text-muted" />
            <input className="input w-full" value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Número de guía *" />
          </div>
          <div className="flex gap-2 items-center">
            <CreditCard size={16} className="shrink-0 text-muted" />
            <select className="input w-full" value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as "pagado" | "contra_entrega")}>
              <option value="pagado">Pagado</option>
              <option value="contra_entrega">Contra entrega</option>
            </select>
          </div>
          <div className="flex gap-2 items-center">
            <FileText size={16} className="shrink-0 text-muted" />
            <input className="input w-full" value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Concepto / nota del pedido (opcional)" />
          </div>
        </section>

        {/* PRODUCTOS */}
        <section className="space-y-3" ref={dropdownRef}>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Productos</h2>

          <div className="flex gap-2 items-center">
            <Package size={16} className="shrink-0 text-muted" />
            <input className="input w-full"
              placeholder="Buscar producto por nombre o SKU"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpenProducts(true); }}
              onFocus={() => setOpenProducts(true)} />
          </div>

          {openProducts && products.length > 0 && (
            <div className="border border-[rgb(var(--border))] rounded-xl bg-[rgb(var(--card))] shadow-lg max-h-56 overflow-auto">
              {products.map((p) => (
                <button key={p.id} type="button" disabled={p.stock <= 0}
                  onClick={() => addToCart(p)}
                  className="w-full text-left px-4 py-3 border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--card-soft))] disabled:opacity-40">
                  <div className="font-medium">{p.name}{p.sku ? ` · ${p.sku}` : ""}</div>
                  <div className="text-xs text-muted">Stock: {p.stock} · Q{p.price}</div>
                </button>
              ))}
            </div>
          )}

          {cart.length > 0 && (
            <div className="space-y-2 pt-1">
              {/* CABECERA columnas */}
              <div className="grid grid-cols-[1fr_72px_100px_72px_28px] gap-2 px-3 text-[10px] font-semibold text-muted uppercase tracking-wider">
                <span>Producto</span>
                <span className="text-center">Cant.</span>
                <span className="text-center">Precio c/u</span>
                <span className="text-right">Subtotal</span>
                <span />
              </div>

              {cart.map((i) => (
                <div key={i.product.id}
                  className="grid grid-cols-[1fr_72px_100px_72px_28px] gap-2 items-center border border-[rgb(var(--border))] rounded-xl p-3">

                  {/* Nombre */}
                  <div className="min-w-0">
                    <div className="font-medium truncate text-sm">{i.product.name}</div>
                    <div className="text-xs text-muted">Precio base: Q{i.product.price}</div>
                  </div>

                  {/* Cantidad */}
                  <input type="number" min={1} className="input text-center text-sm px-1"
                    value={i.qty}
                    onChange={(e) => updateQty(i.product.id, Number(e.target.value))} />

                  {/* Precio editable */}
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-xs">Q</span>
                    <input type="number" min={0} step="0.01"
                      className="input text-right text-sm pl-6 w-full"
                      value={i.unit_price}
                      onChange={(e) => updatePrice(i.product.id, Number(e.target.value))} />
                  </div>

                  {/* Subtotal */}
                  <span className="text-sm font-semibold text-right">
                    Q{(i.qty * i.unit_price).toFixed(2)}
                  </span>

                  {/* Eliminar */}
                  <button onClick={() => removeItem(i.product.id)}
                    className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ENVÍO */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Envío</h2>
          <div>
            <label className="text-xs text-muted">Costo de envío (Q) — opcional</label>
            <input type="number" min={0} step="0.01" className="input w-full mt-1"
              placeholder="Ej: 28, 35, 50…"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
        </section>

        {/* TOTAL */}
        <div className="flex justify-between items-center py-3 border-t border-[rgb(var(--border))]">
          <span className="font-semibold">Total</span>
          <span className="text-2xl font-bold text-green-400">Q{total.toFixed(2)}</span>
        </div>

        <button onClick={saveSale} disabled={loading}
          className="btn btn-primary w-full flex justify-center gap-2">
          <Save size={16} />
          {loading ? "Guardando…" : "Guardar venta"}
        </button>
      </div>
    </div>
  );
}
