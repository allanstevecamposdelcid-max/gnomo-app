"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Search, Pencil, Trash2, Phone, User, X, Save, StickyNote } from "lucide-react";

type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
};

type Form = { name: string; phone: string; notes: string };
const EMPTY: Form = { name: "", phone: "", notes: "" };

export default function ContactosPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);

  /* ── LOAD ── */
  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("suppliers")
      .select("id, name, phone, notes, created_at")
      .order("name");
    setSuppliers((data as Supplier[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  /* ── FILTERED ── */
  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.phone ?? "").includes(q)
    );
  });

  /* ── OPEN MODAL ── */
  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone ?? "", notes: s.notes ?? "" });
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setForm(EMPTY);
  }

  /* ── SAVE ── */
  async function save() {
    if (!form.name.trim()) { alert("El nombre es obligatorio"); return; }
    setSaving(true);

    const payload = {
      name:  form.name.trim(),
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from("suppliers").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("suppliers").insert(payload));
    }

    setSaving(false);
    if (error) { alert(error.message); return; }
    closeModal();
    load();
  }

  /* ── DELETE ── */
  async function remove(id: string) {
    if (!confirm("¿Eliminar este proveedor?")) return;
    await supabase.from("suppliers").delete().eq("id", id);
    load();
  }

  /* ── UI ── */
  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Contactos</h1>
          <p className="text-sm text-muted">Proveedores y contactos de negocio</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> Nuevo proveedor
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="input w-full pl-9"
          placeholder="Buscar por nombre o teléfono…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* LISTA */}
      {loading ? (
        <p className="text-sm text-muted py-8 text-center">Cargando…</p>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          <User size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{search ? "Sin resultados" : "Sin proveedores"}</p>
          {!search && <p className="text-xs mt-1">Agrega tu primer proveedor con el botón de arriba.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div key={s.id} className="card p-4 flex items-start gap-4">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center shrink-0 font-bold text-sm">
                {s.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{s.name}</p>
                {s.phone && (
                  <a href={`tel:${s.phone}`}
                    className="text-sm text-muted flex items-center gap-1.5 mt-0.5 hover:text-green-500 transition-colors w-fit">
                    <Phone size={12} /> {s.phone}
                  </a>
                )}
                {s.notes && (
                  <p className="text-xs text-muted mt-1 flex items-start gap-1.5">
                    <StickyNote size={11} className="shrink-0 mt-0.5" /> {s.notes}
                  </p>
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(s)}
                  className="p-2 rounded-lg text-muted hover:text-[rgb(var(--text))] hover:bg-[rgb(var(--card-soft))]">
                  <Pencil size={15} />
                </button>
                <button onClick={() => remove(s.id)}
                  className="p-2 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[rgb(var(--card))] rounded-2xl w-full max-w-md shadow-xl">
            {/* Cabecera */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgb(var(--border))]">
              <h2 className="font-semibold">{editing ? "Editar proveedor" : "Nuevo proveedor"}</h2>
              <button onClick={closeModal} className="text-muted hover:text-[rgb(var(--text))]">
                <X size={18} />
              </button>
            </div>

            {/* Formulario */}
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted block mb-1">Nombre *</label>
                <div className="flex gap-2 items-center">
                  <User size={15} className="shrink-0 text-muted" />
                  <input className="input w-full" placeholder="Nombre del proveedor"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted block mb-1">Teléfono</label>
                <div className="flex gap-2 items-center">
                  <Phone size={15} className="shrink-0 text-muted" />
                  <input className="input w-full" placeholder="Número de teléfono"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted block mb-1">Notas</label>
                <div className="flex gap-2 items-start">
                  <StickyNote size={15} className="shrink-0 text-muted mt-2.5" />
                  <textarea className="input w-full min-h-[80px] resize-none"
                    placeholder="Notas, productos que vende, condiciones, etc."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={closeModal} className="btn btn-ghost flex-1">Cancelar</button>
              <button onClick={save} disabled={saving} className="btn btn-primary flex-1">
                <Save size={14} />
                {saving ? "Guardando…" : editing ? "Guardar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
