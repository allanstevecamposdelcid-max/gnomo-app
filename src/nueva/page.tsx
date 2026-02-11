"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";



export default function NuevaVentaPage() {
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    product_name: "",
    qty: 1,
    unit_price: 0,
    dtf_cost: 0,
    notes: "",
  });

  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function onSave() {
    setSaving(true);

    const { error } = await supabase.from("sales").insert({
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      product_name: form.product_name,
      qty: Number(form.qty),
      unit_price: Number(form.unit_price),
      dtf_cost: Number(form.dtf_cost),
      notes: form.notes || null,
    });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Venta guardada ✅");

    setForm({
      customer_name: "",
      customer_phone: "",
      product_name: "",
      qty: 1,
      unit_price: 0,
      dtf_cost: 0,
      notes: "",
    });
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Nueva Venta</h1>

      <input
        className="border rounded p-2 w-full"
        placeholder="Nombre del cliente"
        value={form.customer_name}
        onChange={(e) => set("customer_name", e.target.value)}
      />

      <input
        className="border rounded p-2 w-full"
        placeholder="Teléfono"
        value={form.customer_phone}
        onChange={(e) => set("customer_phone", e.target.value)}
      />

      <input
        className="border rounded p-2 w-full"
        placeholder="Producto"
        value={form.product_name}
        onChange={(e) => set("product_name", e.target.value)}
      />

      <div className="grid grid-cols-3 gap-2">
        <input
          type="number"
          min={1}
          className="border rounded p-2"
          placeholder="Cant."
          value={form.qty}
          onChange={(e) => set("qty", Number(e.target.value))}
        />
        <input
          type="number"
          className="border rounded p-2"
          placeholder="Precio"
          value={form.unit_price}
          onChange={(e) => set("unit_price", Number(e.target.value))}
        />
        <input
          type="number"
          className="border rounded p-2"
          placeholder="DTF"
          value={form.dtf_cost}
          onChange={(e) => set("dtf_cost", Number(e.target.value))}
        />
      </div>

      <textarea
        className="border rounded p-2 w-full"
        placeholder="Notas"
        value={form.notes}
        onChange={(e) => set("notes", e.target.value)}
      />

      <button
        onClick={onSave}
        disabled={saving}
        className="bg-black text-white rounded p-2 w-full disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar Venta"}
      </button>
    </div>
  );
}
