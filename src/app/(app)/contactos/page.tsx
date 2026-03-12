"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Search, Pencil, Trash2, Phone, User, X, Save, StickyNote } from "lucide-react";

type Contact = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
};

type Form = { name: string; phone: string; notes: string };
const EMPTY: Form = { name: "", phone: "", notes: "" };

export default function ContactosPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search,   setSearch]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);
  const [editing,  setEditing]  = useState<Contact | null>(null);
  const [form,     setForm]     = useState<Form>(EMPTY);
  const [saving,   setSaving]   = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("contacts")
      .select("id, name, phone, notes, created_at")
      .order("name");
    setContacts((data as Contact[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? "").includes(search)
  );

  function openCreate() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(c: Contact) {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone ?? "", notes: c.notes ?? "" });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) { alert("El nombre es obligatorio"); return; }
    setSaving(true);
    const payload = {
      name:  form.name.trim(),
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("contacts").update(payload).eq("id", editing.id)
      : await supabase.from("contacts").insert(payload);
    setSaving(false);
    if (error) { alert(error.message); return; }
    setOpen(false);
    load();
  }

  async function del(id: string) {
    if (!confirm("¿Eliminar este contacto?")) return;
    await supabase.from("contacts").delete().eq("id", id);
    load();
  }

  function f(k: keyof Form, v: string) { setForm(prev => ({ ...prev, [k]: v })); }

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* HEADER */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Contactos</h1>
          <p className="text-sm text-muted">{contacts.length} contacto{contacts.length !== 1 ? "s" : ""} registrados</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary">
          <Plus size={15}/> Nuevo contacto
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"/>
        <input className="input w-full pl-9" placeholder="Buscar por nombre o teléfono…"
          value={search} onChange={e => setSearch(e.target.value)}/>
        {search && (
          <button onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">✕</button>
        )}
      </div>

      {/* LISTA */}
      {loading
        ? <p className="text-sm text-muted">Cargando…</p>
        : filtered.length === 0
          ? <div className="card p-8 text-center text-muted">No hay contactos registrados</div>
          : (
            <div className="space-y-2">
              {filtered.map(c => (
                <div key={c.id} className="card p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-muted shrink-0"/>
                      <p className="font-semibold">{c.name}</p>
                    </div>
                    {c.phone && (
                      <p className="text-sm text-muted mt-1 flex items-center gap-1.5">
                        <Phone size={12}/>{c.phone}
                      </p>
                    )}
                    {c.notes && (
                      <p className="text-xs text-muted mt-1 flex items-start gap-1.5">
                        <StickyNote size={11} className="shrink-0 mt-0.5"/>{c.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(c)} className="btn btn-ghost p-2"><Pencil size={14}/></button>
                    <button onClick={() => del(c.id)} className="btn btn-ghost p-2 text-red-500"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          )
      }

      {/* MODAL */}
      {open && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal-box">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base">{editing ? "Editar contacto" : "Nuevo contacto"}</h2>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-[rgb(var(--text))]"><X size={18}/></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Nombre *</label>
                <input className="input w-full" placeholder="Nombre completo"
                  value={form.name} onChange={e => f("name", e.target.value)}/>
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Teléfono</label>
                <input className="input w-full" placeholder="Ej: 5555-0000"
                  value={form.phone} onChange={e => f("phone", e.target.value)}/>
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Notas</label>
                <textarea className="input w-full resize-none" rows={2} placeholder="Notas adicionales…"
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
    </div>
  );
}
