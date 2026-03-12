"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Pencil, Trash2, PackageCheck, PackageX } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  cost: number;
  price: number;
};

export default function InventarioPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  async function load() {
    setLoading(true);
    let query = supabase
      .from("products")
      .select("id,name,sku,stock,cost,price")
      .eq("active", true)
      .order("name");
    if (q.trim()) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
    const { data, error } = await query;
    setLoading(false);
    if (error) { alert(error.message); return; }
    setItems((data as Product[]) || []);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q]);

  async function deleteProduct(id: string) {
    if (!confirm("¿Eliminar este producto? El historial se conserva.")) return;
    const { error } = await supabase.from("products").update({ active: false }).eq("id", id);
    if (error) { alert(error.message); return; }
    load();
  }

  const margin = (p: Product) =>
    p.price > 0 ? Math.round(((p.price - p.cost) / p.price) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inventario</h1>
          <p className="text-sm text-muted">{items.length} producto{items.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn btn-primary">
          <Plus size={16} />
          <span className="hidden sm:inline">Nuevo producto</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o SKU…" className="pl-9" />
      </div>

      {/* Tabla desktop */}
      <div className="card p-0 overflow-x-auto hidden sm:block">
        {loading ? <p className="p-6 text-sm text-muted">Cargando…</p> : (
          <table>
            <thead>
              <tr className="border-b border-[rgb(var(--border))]">
                <th>Producto</th><th>SKU</th><th className="text-right">Stock</th>
                <th className="text-right">Costo</th><th className="text-right">Precio</th>
                <th className="text-right">Margen</th><th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-[rgb(var(--border))] hover:bg-[rgb(var(--card-soft))] transition-colors">
                  <td className="font-medium">{p.name}</td>
                  <td className="font-mono text-xs text-muted">{p.sku ?? "—"}</td>
                  <td className="text-right">
                    <span className={`badge ${p.stock <= 0 ? "badge-red" : p.stock <= 5 ? "badge-orange" : "badge-green"}`}>
                      {p.stock <= 0 ? "Sin stock" : p.stock}
                    </span>
                  </td>
                  <td className="text-right text-muted">Q{p.cost.toFixed(2)}</td>
                  <td className="text-right font-medium">Q{p.price.toFixed(2)}</td>
                  <td className="text-right">
                    <span className={`text-sm font-medium ${margin(p) >= 30 ? "text-green-500" : margin(p) >= 10 ? "text-yellow-500" : "text-red-500"}`}>
                      {margin(p)}%
                    </span>
                  </td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setEditing(p)} className="btn btn-ghost p-2" title="Editar"><Pencil size={14} /></button>
                      <button onClick={() => deleteProduct(p.id)} className="btn btn-ghost p-2 text-red-500" title="Eliminar"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-muted">No hay productos</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* Tarjetas móvil */}
      <div className="sm:hidden space-y-3">
        {loading && <p className="text-sm text-muted">Cargando…</p>}
        {items.map((p) => (
          <div key={p.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold truncate">{p.name}</p>
                {p.sku && <p className="text-xs text-muted font-mono">{p.sku}</p>}
              </div>
              <span className={`badge shrink-0 ${p.stock <= 0 ? "badge-red" : p.stock <= 5 ? "badge-orange" : "badge-green"}`}>
                {p.stock <= 0
                  ? <><PackageX size={10} className="mr-1" />Sin stock</>
                  : <><PackageCheck size={10} className="mr-1" />{p.stock}</>
                }
              </span>
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm text-muted">
              <span>Costo: <b className="text-[rgb(var(--text))]">Q{p.cost.toFixed(2)}</b></span>
              <span>Precio: <b className="text-[rgb(var(--text))]">Q{p.price.toFixed(2)}</b></span>
              <span className={`ml-auto font-semibold ${margin(p) >= 30 ? "text-green-500" : margin(p) >= 10 ? "text-yellow-500" : "text-red-500"}`}>{margin(p)}%</span>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-[rgb(var(--border))]">
              <button onClick={() => setEditing(p)} className="btn btn-ghost flex-1 text-sm"><Pencil size={13} /> Editar</button>
              <button onClick={() => deleteProduct(p.id)} className="btn btn-ghost flex-1 text-sm text-red-500"><Trash2 size={13} /> Eliminar</button>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && <div className="card p-8 text-center text-muted">No hay productos</div>}
      </div>

      {creating && <ProductModal title="Nuevo producto" onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
      {editing  && <ProductModal title="Editar producto" initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function ProductModal({ title, initial, onClose, onSaved }: {
  title: string; initial?: Product; onClose: () => void; onSaved: () => void;
}) {
  const [name,  setName]  = useState(initial?.name  ?? "");
  const [sku,   setSku]   = useState(initial?.sku   ?? "");
  const [stock, setStock] = useState<number | "">(initial?.stock ?? "");
  const [cost,  setCost]  = useState<number | "">(initial?.cost  ?? "");
  const [price, setPrice] = useState<number | "">(initial?.price ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) { alert("El nombre es obligatorio"); return; }
    setSaving(true);
    const payload = {
      name: name.trim(),
      sku: sku.trim() || null,
      stock: Number(stock || 0),
      cost: Number(cost || 0),
      price: Number(price || 0),
    };
    const { error } = initial
      ? await supabase.from("products").update(payload).eq("id", initial.id)
      : await supabase.from("products").insert({ ...payload, active: true });
    setSaving(false);
    if (error) { alert(error.message); return; }
    onSaved();
  }

  const m = Number(price) > 0
    ? Math.round(((Number(price) - Number(cost)) / Number(price)) * 100)
    : 0;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <h2 className="font-semibold text-base mb-4">{title}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted block mb-1">Nombre *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Camiseta talla M" />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Código SKU (opcional)</label>
            <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ej: CAM-M-001" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted block mb-1">Stock</label>
              <input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Costo (Q)</label>
              <input type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Precio (Q)</label>
              <input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
          </div>
          {Number(price) > 0 && (
            <p className="text-xs text-muted">
              Margen: <span className="font-semibold text-green-500">{m}%</span>
              {" · "}Ganancia/u: <span className="font-semibold">Q{(Number(price) - Number(cost)).toFixed(2)}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancelar</button>
          <button onClick={save} disabled={saving} className="btn btn-primary flex-1">
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
