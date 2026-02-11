"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  User,
  Phone,
  Package,
  Save,
  DollarSign,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

/* =====================
   TYPES
===================== */

type Product = {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  price: number;
  cost: number;
};

type CartItem = {
  product: Product;
  qty: number;
};

/* =====================
   PAGE
===================== */

export default function NuevaVentaPage() {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [openProducts, setOpenProducts] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [dtfCost, setDtfCost] = useState(0);
  const [loading, setLoading] = useState(false);

  /* ================= LOAD PRODUCTS ================= */

  async function loadProducts(q = "") {
    let query = supabase
      .from("products")
      .select("id,name,sku,stock,price,cost")
      .eq("active", true)
      .order("name");

    if (q.trim()) {
      query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
    }

    const { data } = await query;
    setProducts((data as Product[]) || []);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadProducts(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  /* ================= CLICK OUTSIDE ================= */

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpenProducts(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ================= CART ================= */

  function addToCart(product: Product) {
    setCart((prev) => {
      const found = prev.find((i) => i.product.id === product.id);
      if (found) {
        if (found.qty + 1 > product.stock) {
          alert("Stock insuficiente");
          return prev;
        }
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, qty: i.qty + 1 }
            : i
        );
      }
      return [...prev, { product, qty: 1 }];
    });
    setSearch("");
    setOpenProducts(false);
  }

  function updateQty(productId: string, qty: number) {
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? {
              ...i,
              qty:
                qty > i.product.stock
                  ? i.product.stock
                  : Math.max(1, qty),
            }
          : i
      )
    );
  }

  function removeItem(productId: string) {
    setCart((prev) =>
      prev.filter((i) => i.product.id !== productId)
    );
  }

  /* ================= TOTAL (solo UI) ================= */

  const total = cart.reduce(
    (sum, i) => sum + i.qty * i.product.price,
    0
  );

  /* ================= SAVE SALE ================= */

  async function saveSale() {
    if (!customerName || cart.length === 0) {
      alert("Agrega cliente y productos");
      return;
    }

    setLoading(true);

    const items = cart.map((i) => ({
      product_id: i.product.id,
      product_name: i.product.name, 
      qty: i.qty,
      unit_price: i.product.price,
      unit_cost: i.product.cost,
    }));

    const { error } = await supabase.rpc(
      "create_sale_multi",
      {
        p_customer_name: customerName,
        p_customer_phone: customerPhone || null,
        p_items: items,
        p_dtf_cost: dtfCost,
      }
    );

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/ventas");
  }

  /* ================= UI ================= */

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-24">
      <h1 className="text-2xl font-semibold">Nueva venta</h1>

      <div className="card p-6 space-y-6">
        {/* CLIENTE */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Cliente</label>

          <div className="flex gap-2 items-center">
            <User size={16} />
            <input
              className="input input-bordered w-full"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nombre del cliente"
            />
          </div>

          <div className="flex gap-2 items-center">
            <Phone size={16} />
            <input
              className="input input-bordered w-full"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Teléfono (opcional)"
            />
          </div>
        </div>

        {/* PRODUCTOS */}
        <div className="space-y-3" ref={dropdownRef}>
          <label className="text-sm font-medium">Productos</label>

          <div className="flex gap-2 items-center">
            <Package size={16} />
            <input
              className="input input-bordered w-full"
              placeholder="Buscar producto"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOpenProducts(true);
              }}
              onFocus={() => setOpenProducts(true)}
            />
          </div>

          {openProducts && (
            <div className="border rounded-xl bg-base-100 shadow max-h-56 overflow-auto">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={p.stock <= 0}
                  onClick={() => addToCart(p)}
                  className="w-full text-left px-4 py-3 border-b hover:bg-base-200"
                >
                  <div className="font-medium">
                    {p.name}
                    {p.sku ? ` · ${p.sku}` : ""}
                  </div>
                  <div className="text-xs opacity-60">
                    Stock: {p.stock} · Precio: Q{p.price}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CARRITO */}
        {cart.length > 0 && (
          <div className="space-y-2">
            {cart.map((i) => (
              <div
                key={i.product.id}
                className="flex items-center gap-2 border rounded-lg p-2"
              >
                <div className="flex-1">
                  <div className="font-medium">
                    {i.product.name}
                  </div>
                  <div className="text-xs opacity-60">
                    Q{i.product.price}
                  </div>
                </div>

                <input
                  type="number"
                  min={1}
                  className="input input-bordered w-20"
                  value={i.qty}
                  onChange={(e) =>
                    updateQty(
                      i.product.id,
                      Number(e.target.value)
                    )
                  }
                />

                <button
                  onClick={() => removeItem(i.product.id)}
                  className="btn btn-ghost btn-sm text-error"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* DTF */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Costo DTF (no afecta el total)
          </label>
          <div className="flex gap-2 items-center">
            <DollarSign size={16} />
            <input
              type="number"
              min={0}
              step="0.01"
              className="input input-bordered w-full"
              value={dtfCost}
              onChange={(e) => setDtfCost(Number(e.target.value))}
            />
          </div>
        </div>

        {/* TOTAL */}
        <div className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>Q{total.toFixed(2)}</span>
        </div>

        {/* SAVE */}
        <button
          onClick={saveSale}
          disabled={loading}
          className="btn btn-primary w-full flex justify-center gap-2"
        >
          <Save size={16} />
          {loading ? "Guardando..." : "Guardar venta"}
        </button>
      </div>
    </div>
  );
}
