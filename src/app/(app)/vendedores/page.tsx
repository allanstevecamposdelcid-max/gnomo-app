"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Search, Pencil, Trash2, Phone, Store, X, Save, StickyNote, Boxes } from "lucide-react";

type Vendor = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
};

type VendorProduct = {
  id: string;
  name: string;
  stock: number;
  price: number;
};

type Form = { name: string; phone: string; notes: string };
const EMPTY: Form = { name: "", phone: "", notes: "" };

export default function VendedoresPage() {
  const [vendors,  setVendors]  = useState<Vendor[]>([]);
  const [search,   setSearch]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);
  const [editing,  setEditing]  = useState<Vendor | null>(null);
  const [form,     setForm]     = useState<Form>(EMPTY);
  const [saving,   setSaving]   = useState(false);

  // Panel de productos del vendedor
  const [viewVendor,    setViewVendor]    = useState<Vendor | null>(null);
  const [vendorProducts, setVendorProducts] = useState<VendorProduct[]>([]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("suppliers").select("id, name, phone, notes, created_at").order("name");
    setVendors((data as Vendor[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function loadVendorProducts(vendorId: string) {
    const { data } = await supabase
      .from("products")
      .select("id, name, stock, price")
      .eq("supplier_id", vendorId)
      .eq("active", true)
      .order("name");
    setVendorProducts((data as VendorProduct[]) ?? []);
  }

  const filtered = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.phone ?? "").includes(search)
  );

  function openCreate() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(v: Vendor) { setEditing(v); setForm({ name: v.name, phone: v.phone ?? "", notes: v.notes ?? "" }); setOpen(true); }

  async function save() {
    if (!form.name.trim()) { alert("El nombre es obligatorio"); return; }
    setSaving(true);
    const payload = { name: form.name.trim(), phone: form.phone.trim() || null, notes: form.notes.trim() || null };
    const { error } = editing
      ? await supabase.from("suppliers").update(payload).eq("id", editing.id)
      : await supabase.from("suppliers").insert(payload);
    setSaving(false);
    if (error) { alert(error.message); return; }
    setOpen(false);
    load();
  }

  async function del(id: string) {
    if (!confirm("¿Eliminar vendedor? Los productos quedarán sin vendedor asignado.")) return;
    await supabase.from("suppliers").delete().eq("id", id);
    load();
  }

  function f(k: keyof Form, v: string) { setForm(prev => ({ ...prev, [k]: v })); }

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* HEADER */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Vendedores terceros</h1>
          <p className="text-sm text-muted">Proveedores externos cuyos productos vendés en consignación</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary">
          <Plus size={15}/> Nuevo vendedor
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"/>
        <input className="input w-full pl-9" placeholder="Buscar por nombre o teléfono…"
          value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      {/* LISTA */}
      {loading
        ? <p className="text-sm text-muted">Cargando…</p>
        : filtered.length === 0
          ? <div className="card p-8 text-center text-muted">No hay vendedores registrados</div>
          : (
            <div className="space-y-3">
              {filtered.map(v => (
                <div key={v.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Store size={15} className="text-orange-500 shrink-0"/>
                        <p className="font-semibold">{v.name}</p>
                      </div>
                      {v.phone && (
                        <p className="text-sm text-muted mt-1 flex items-center gap-1.5">
                          <Phone size={12}/>{v.phone}
                        </p>
                      )}
                      {v.notes && (
                        <p className="text-xs text-muted mt-1 flex items-start gap-1.5">
                          <StickyNote size={11} className="shrink-0 mt-0.5"/>{v.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={async () => { setViewVendor(v); await loadVendorProducts(v.id); }}
                        className="btn btn-ghost p-2 text-muted" title="Ver productos">
                        <Boxes size={15}/>
                      </button>
                      <button onClick={() => openEdit(v)} className="btn btn-ghost p-2"><Pencil size={14}/></button>
                      <button onClick={() => del(v.id)} className="btn btn-ghost p-2 text-red-500"><Trash2 size={14}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
      }

      {/* MODAL FORMULARIO */}
      {open && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal-box">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base">{editing ? "Editar vendedor" : "Nuevo vendedor"}</h2>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-[rgb(var(--text))]"><X size={18}/></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Nombre *</label>
                <input className="input w-full" placeholder="Nombre del vendedor o tienda"
                  value={form.name} onChange={e => f("name", e.target.value)}/>
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Teléfono</label>
                <input className="input w-full" placeholder="Ej: 5555-0000"
                  value={form.phone} onChange={e => f("phone", e.target.value)}/>
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Notas</label>
                <textarea className="input w-full resize-none" rows={2} placeholder="Condiciones, porcentaje, etc."
                  value={form.notes} onChange={e => f("notes", e.target.value)}/>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setOpen(false)} className="btn btn-ghost flex-1">Cancelar</button>
              <button onClick={save} disabled={saving} className="btn btn-primary flex-1">
                <Save size={14}/>{saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRODUCTOS DEL VENDEDOR */}
      {viewVendor && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewVendor(null)}>
          <div className="modal-box">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <Store size={15} className="text-orange-500"/>
                {viewVendor.name}
              </h2>
              <button onClick={() => setViewVendor(null)} className="text-muted hover:text-[rgb(var(--text))]"><X size={18}/></button>
            </div>
            <p className="text-xs text-muted mb-3">Productos asignados a este vendedor en tu inventario</p>
            {vendorProducts.length === 0
              ? <p className="text-sm text-muted text-center py-6">Sin productos asignados. Ve a Inventario para asignarlos.</p>
              : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {vendorProducts.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[rgb(var(--card-soft))]">
                      <span className="text-sm font-medium">{p.name}</span>
                      <div className="flex items-center gap-3 text-xs text-muted">
                        <span className={`badge ${p.stock <= 0 ? "badge-red" : p.stock <= 5 ? "badge-orange" : "badge-green"}`}>
                          {p.stock} uds
                        </span>
                        <span>Q{p.price.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
            <button onClick={() => setViewVendor(null)} className="btn btn-ghost w-full mt-4">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
