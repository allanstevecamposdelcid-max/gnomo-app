"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Pencil, Trash2, PackageCheck, PackageX, Tag, X, Save, Store } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Category = { id: string; name: string };
type Supplier = { id: string; name: string };

type Product = {
  id: string; name: string; sku: string | null;
  stock: number; cost: number; price: number;
  category_id: string | null;
  supplier_id: string | null;
  categories: { name: string } | null;
  suppliers:  { name: string } | null;
};

export default function InventarioPage() {
  const [q,          setQ]          = useState("");
  const [filterCat,  setFilterCat]  = useState("");
  const [filterSup,  setFilterSup]  = useState("");
  const [items,      setItems]      = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers,  setSuppliers]  = useState<Supplier[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [creating,   setCreating]   = useState(false);
  const [editing,    setEditing]    = useState<Product | null>(null);
  const [catModal,   setCatModal]   = useState(false);

  async function loadMeta() {
    const [catsRes, supsRes] = await Promise.all([
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("suppliers").select("id, name").order("name"),
    ]);
    setCategories((catsRes.data as Category[]) ?? []);
    setSuppliers((supsRes.data as Supplier[]) ?? []);
  }

  async function load() {
    setLoading(true);
    let query = supabase
      .from("products")
      .select("id, name, sku, stock, cost, price, category_id, supplier_id, categories(name), suppliers(name)")
      .eq("active", true)
      .order("name");
    if (q.trim())   query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
    if (filterCat)  query = query.eq("category_id", filterCat);
    if (filterSup)  query = query.eq("supplier_id", filterSup);
    const { data, error } = await query;
    setLoading(false);
    if (error) { alert(error.message); return; }
    setItems((data as unknown as Product[]) || []);
  }

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q, filterCat, filterSup]);

  async function deleteProduct(id: string) {
    if (!confirm("¿Eliminar este producto? El historial se conserva.")) return;
    const { error } = await supabase.from("products").update({ active: false }).eq("id", id);
    if (error) { alert(error.message); return; }
    load();
  }

  const margin = (p: Product) =>
    p.price > 0 ? Math.round(((p.price - p.cost) / p.price) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* HEADER */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Inventario</h1>
          <p className="text-sm text-muted">{items.length} producto{items.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCatModal(true)} className="btn btn-ghost text-sm">
            <Tag size={14} /> Categorías
          </button>
          <button onClick={() => setCreating(true)} className="btn btn-primary">
            <Plus size={16} />
            <span className="hidden sm:inline">Nuevo producto</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o SKU…" className="input pl-9 w-full" />
        </div>
        <select className="input w-auto" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input w-auto" value={filterSup} onChange={(e) => setFilterSup(e.target.value)}>
          <option value="">Todos los proveedores</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* TABLA DESKTOP */}
      <div className="card p-0 hidden sm:block">
        {loading ? <p className="p-6 text-sm text-muted">Cargando…</p> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgb(var(--border))] text-muted text-xs uppercase tracking-wider">
                <th className="p-3 text-left">Producto</th>
                <th className="p-3 text-left">Categoría / Proveedor</th>
                <th className="p-3 text-center">Stock</th>
                <th className="p-3 text-right">Costo · Precio</th>
                <th className="p-3 text-right">Margen</th>
                <th className="p-3 text-center w-20">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-[rgb(var(--border))] hover:bg-[rgb(var(--card-soft))] transition-colors">
                  <td className="p-3">
                    <p className="font-medium">{p.name}</p>
                    {p.sku && <p className="text-xs text-muted font-mono mt-0.5">{p.sku}</p>}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      {p.categories && <span className="badge badge-blue text-xs w-fit">{p.categories.name}</span>}
                      {p.suppliers   && <span className="badge badge-orange text-xs w-fit flex items-center gap-1"><Store size={9}/>{p.suppliers.name}</span>}
                      {!p.categories && !p.suppliers && <span className="text-muted text-xs">—</span>}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`badge ${p.stock <= 0 ? "badge-red" : p.stock <= 5 ? "badge-orange" : "badge-green"}`}>
                      {p.stock <= 0 ? "Sin stock" : p.stock}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <p className="font-medium">Q{p.price.toFixed(2)}</p>
                    <p className="text-xs text-muted">costo Q{p.cost.toFixed(2)}</p>
                  </td>
                  <td className="p-3 text-right">
                    <p className={`font-semibold ${margin(p) < 10 ? "text-red-500" : margin(p) < 30 ? "text-yellow-500" : ""}`}>
                      {margin(p)}%
                    </p>
                    <p className="text-xs text-muted">+Q{(p.price - p.cost).toFixed(2)}</p>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setEditing(p)} className="btn btn-ghost p-2"><Pencil size={14} /></button>
                      <button onClick={() => deleteProduct(p.id)} className="btn btn-ghost p-2 text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-muted">No hay productos</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* TARJETAS MÓVIL */}
      <div className="sm:hidden space-y-3">
        {loading && <p className="text-sm text-muted">Cargando…</p>}
        {items.map((p) => (
          <div key={p.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold truncate">{p.name}</p>
                <div className="flex items-center flex-wrap gap-1.5 mt-1">
                  {p.sku && <p className="text-xs text-muted font-mono">{p.sku}</p>}
                  {p.categories && (
                    <span className="badge badge-blue text-[10px]">{p.categories.name}</span>
                  )}
                  {p.suppliers && (
                    <span className="badge badge-orange text-[10px] flex items-center gap-1">
                      <Store size={9}/>{p.suppliers.name}
                    </span>
                  )}
                </div>
              </div>
              <span className={`badge shrink-0 ${p.stock <= 0 ? "badge-red" : p.stock <= 5 ? "badge-orange" : "badge-green"}`}>
                {p.stock <= 0
                  ? <><PackageX size={10} className="mr-1" />Sin stock</>
                  : <><PackageCheck size={10} className="mr-1" />{p.stock}</>}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-3 text-sm text-muted flex-wrap">
              <span>Costo: <b className="text-[rgb(var(--text))]">Q{p.cost.toFixed(2)}</b></span>
              <span>Precio: <b className="text-[rgb(var(--text))]">Q{p.price.toFixed(2)}</b></span>
              <span className="font-medium">+Q{(p.price - p.cost).toFixed(2)}</span>
              <span className={`ml-auto font-semibold ${margin(p) < 10 ? "text-red-500" : margin(p) < 30 ? "text-yellow-500" : ""}`}>
                {margin(p)}%
              </span>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-[rgb(var(--border))]">
              <button onClick={() => setEditing(p)} className="btn btn-ghost flex-1 text-sm"><Pencil size={13} /> Editar</button>
              <button onClick={() => deleteProduct(p.id)} className="btn btn-ghost flex-1 text-sm text-red-500"><Trash2 size={13} /> Eliminar</button>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && <div className="card p-8 text-center text-muted">No hay productos</div>}
      </div>

      {/* MODALES */}
      {creating && (
        <ProductModal title="Nuevo producto" categories={categories} suppliers={suppliers}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); load(); }} />
      )}
      {editing && (
        <ProductModal title="Editar producto" initial={editing} categories={categories} suppliers={suppliers}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }} />
      )}
      {catModal && (
        <CategoriesModal categories={categories} onClose={() => { setCatModal(false); loadMeta(); }} />
      )}
    </div>
  );
}

/* ── Modal Producto ── */
function ProductModal({ title, initial, categories, suppliers, onClose, onSaved }: {
  title: string; initial?: Product; categories: Category[]; suppliers: Supplier[];
  onClose: () => void; onSaved: () => void;
}) {
  const [name,    setName]    = useState(initial?.name        ?? "");
  const [sku,     setSku]     = useState(initial?.sku         ?? "");
  const [stock,   setStock]   = useState<number | "">(initial?.stock ?? "");
  const [cost,    setCost]    = useState<number | "">(initial?.cost  ?? "");
  const [price,   setPrice]   = useState<number | "">(initial?.price ?? "");
  const [catId,   setCatId]   = useState<string>(initial?.category_id ?? "");
  const [supId,   setSupId]   = useState<string>(initial?.supplier_id ?? "");
  const [saving,  setSaving]  = useState(false);

  async function save() {
    if (!name.trim()) { alert("El nombre es obligatorio"); return; }
    setSaving(true);
    const payload = {
      name:        name.trim(),
      sku:         sku.trim() || null,
      stock:       Number(stock  || 0),
      cost:        Number(cost   || 0),
      price:       Number(price  || 0),
      category_id: catId || null,
      supplier_id: supId || null,
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-[rgb(var(--text))]"><X size={18}/></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted block mb-1">Nombre *</label>
            <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del producto" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted block mb-1">Categoría</label>
              <select className="input w-full" value={catId} onChange={(e) => setCatId(e.target.value)}>
                <option value="">Sin categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted flex items-center gap-1 mb-1">
                <Store size={11}/> Proveedor / Tienda
              </label>
              <select className="input w-full" value={supId} onChange={(e) => setSupId(e.target.value)}>
                <option value="">Sin proveedor</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Código SKU (opcional)</label>
            <input className="input w-full" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ej: PROD-001" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted block mb-1">Stock</label>
              <input className="input w-full" type="number" min={0} value={stock}
                onChange={(e) => setStock(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Costo (Q)</label>
              <input className="input w-full" type="number" min={0} step="0.01" value={cost}
                onChange={(e) => setCost(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Precio (Q)</label>
              <input className="input w-full" type="number" min={0} step="0.01" value={price}
                onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
          </div>
          {Number(price) > 0 && (
            <p className="text-xs text-muted bg-[rgb(var(--card-soft))] rounded-lg px-3 py-2">
              Margen: <span className="font-semibold">{m}%</span>
              {" · "}Ganancia/u: <span className="font-semibold">Q{(Number(price) - Number(cost)).toFixed(2)}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancelar</button>
          <button onClick={save} disabled={saving} className="btn btn-primary flex-1">
            <Save size={14}/>{saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal Categorías ── */
function CategoriesModal({ categories, onClose }: {
  categories: Category[]; onClose: () => void;
}) {
  const [list,    setList]    = useState<Category[]>(categories);
  const [newName, setNewName] = useState("");
  const [saving,  setSaving]  = useState(false);

  async function addCat() {
    if (!newName.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("categories").insert({ name: newName.trim() }).select().single();
    setSaving(false);
    if (error) { alert(error.message); return; }
    setList(prev => [...prev, data as Category].sort((a,b) => a.name.localeCompare(b.name)));
    setNewName("");
  }

  async function deleteCat(id: string) {
    if (!confirm("¿Eliminar categoría? Los productos quedarán sin categoría.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { alert(error.message); return; }
    setList(prev => prev.filter(c => c.id !== id));
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base flex items-center gap-2"><Tag size={16}/>Categorías</h2>
          <button onClick={onClose} className="text-muted hover:text-[rgb(var(--text))]"><X size={18}/></button>
        </div>
        <div className="flex gap-2 mb-4">
          <input className="input flex-1" placeholder="Nueva categoría…"
            value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCat()} />
          <button onClick={addCat} disabled={saving || !newName.trim()} className="btn btn-primary px-3">
            <Save size={14}/>
          </button>
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {list.length === 0 && <p className="text-sm text-muted text-center py-4">Sin categorías aún</p>}
          {list.map(c => (
            <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[rgb(var(--card-soft))]">
              <div className="flex items-center gap-2">
                <Tag size={12} className="text-muted"/>
                <span className="text-sm font-medium">{c.name}</span>
              </div>
              <button onClick={() => deleteCat(c.id)} className="text-muted hover:text-red-500 p-1">
                <Trash2 size={13}/>
              </button>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="btn btn-ghost w-full mt-4">Cerrar</button>
      </div>
    </div>
  );
}
