"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* =====================
   TYPES
===================== */

type Product = {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  cost: number;
  price: number;
  active?: boolean;
};

/* =====================
   PAGE
===================== */

export default function InventarioPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  /* ===== LOAD ===== */

  async function load() {
    setLoading(true);

    let query = supabase
      .from("products")
      .select("id,name,sku,stock,cost,price,active")
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (q.trim()) {
      query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
    }

    const { data, error } = await query;
    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setItems((data as Product[]) || []);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q]);

  /* ===== DELETE (SOFT) ===== */

  async function deleteProduct(id: string) {
    const ok = confirm(
      "¿Eliminar este producto?\nNo se podrá vender, pero el historial se conserva."
    );
    if (!ok) return;

    const { error } = await supabase
      .from("products")
      .update({ active: false })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    load();
  }

  return (
    <div className="p-4 pb-24">
      {/* SEARCH */}
      <div className="mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o código..."
          className="input input-bordered w-full"
        />
      </div>

      {loading && <div className="text-sm opacity-70">Cargando...</div>}

      {/* LIST */}
      <div className="space-y-3">
        {items.map((p) => (
          <div key={p.id} className="card bg-base-100 shadow">
            <div className="card-body space-y-2">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  {p.sku && (
                    <div className="text-xs opacity-70">
                      Código: {p.sku}
                    </div>
                  )}
                </div>

                <span
                  className={`badge ${
                    p.stock <= 0 ? "badge-error" : "badge-success"
                  }`}
                >
                  {p.stock <= 0
                    ? "No disponible"
                    : `${p.stock} disponibles`}
                </span>
              </div>

              <div className="text-sm">
                <div>Precio: Q{p.price.toFixed(2)}</div>
                <div className="opacity-70">
                  Costo: Q{p.cost.toFixed(2)}
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-2 pt-2">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setEditing(p);
                    setOpenEdit(true);
                  }}
                >
                  Editar
                </button>

                <button
                  className="btn btn-ghost btn-sm text-error"
                  onClick={() => deleteProduct(p.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE */}
      <button
        className="btn btn-primary fixed left-4 right-4 bottom-5"
        onClick={() => setOpenCreate(true)}
      >
        Crear producto
      </button>

      {openCreate && (
        <CreateProductModal
          onClose={() => setOpenCreate(false)}
          onCreated={() => {
            setOpenCreate(false);
            load();
          }}
        />
      )}

      {openEdit && editing && (
        <EditProductModal
          product={editing}
          onClose={() => {
            setOpenEdit(false);
            setEditing(null);
          }}
          onSaved={() => {
            setOpenEdit(false);
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

/* =====================
   CREATE MODAL
===================== */

function CreateProductModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");

  const [stock, setStock] = useState<number | "">("");
  const [cost, setCost] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");

  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      alert("Nombre requerido");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("products").insert({
      name: name.trim(),
      sku: sku.trim() || null,
      stock: Number(stock || 0),
      cost: Number(cost || 0),
      price: Number(price || 0),
      active: true,
    });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    onCreated();
  }

  return (
    <Modal title="Crear producto" onClose={onClose}>
      <ProductForm
        name={name}
        setName={setName}
        sku={sku}
        setSku={setSku}
        stock={stock}
        setStock={setStock}
        cost={cost}
        setCost={setCost}
        price={price}
        setPrice={setPrice}
      />

      <ModalActions
        onClose={onClose}
        onSave={save}
        saving={saving}
      />
    </Modal>
  );
}

/* =====================
   EDIT MODAL
===================== */

function EditProductModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku ?? "");
  const [stock, setStock] = useState<number | "">(product.stock);
  const [cost, setCost] = useState<number | "">(product.cost);
  const [price, setPrice] = useState<number | "">(product.price);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);

    const { error } = await supabase
      .from("products")
      .update({
        name: name.trim(),
        sku: sku.trim() || null,
        stock: Number(stock || 0),
        cost: Number(cost || 0),
        price: Number(price || 0),
      })
      .eq("id", product.id);

    setSaving(false);
    if (error) return alert(error.message);
    onSaved();
  }

  return (
    <Modal title="Editar producto" onClose={onClose}>
      <div className="space-y-5">
        {/* IDENTIDAD */}
        <div className="space-y-2">
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <input
              className="input input-bordered w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Código (SKU)</label>
            <input
              className="input input-bordered w-full"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>
        </div>

        {/* STOCK + PRECIOS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium">Stock</label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={stock}
              onChange={(e) =>
                setStock(e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium">Costo</label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={cost}
              onChange={(e) =>
                setCost(e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium">Precio</label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={price}
              onChange={(e) =>
                setPrice(e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </div>
        </div>
      </div>

      <ModalActions onClose={onClose} onSave={save} saving={saving} />
    </Modal>
  );
}


/* =====================
   SHARED UI
===================== */

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-4">
      <div className="bg-base-100 w-full sm:max-w-md rounded-2xl p-4">
        <div className="font-semibold text-lg mb-3">
          {title}
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({
  onClose,
  onSave,
  saving,
}: {
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex gap-2 mt-4">
      <button className="btn btn-ghost w-1/2" onClick={onClose}>
        Cancelar
      </button>
      <button
        className="btn btn-primary w-1/2"
        onClick={onSave}
        disabled={saving}
      >
        {saving ? "Guardando..." : "Guardar"}
      </button>
    </div>
  );
}

function ProductForm({
  name,
  setName,
  sku,
  setSku,
  stock,
  setStock,
  cost,
  setCost,
  price,
  setPrice,
}: any) {
  return (
    <div className="space-y-2">
      <input
        className="input input-bordered w-full"
        placeholder="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        className="input input-bordered w-full"
        placeholder="Código (SKU)"
        value={sku}
        onChange={(e) => setSku(e.target.value)}
      />

      <input
        type="number"
        className="input input-bordered w-full"
        placeholder="Stock"
        value={stock}
        onChange={(e) =>
          setStock(
            e.target.value === ""
              ? ""
              : Number(e.target.value)
          )
        }
      />

      <input
        type="number"
        className="input input-bordered w-full"
        placeholder="Costo"
        value={cost}
        onChange={(e) =>
          setCost(
            e.target.value === ""
              ? ""
              : Number(e.target.value)
          )
        }
      />

      <input
        type="number"
        className="input input-bordered w-full"
        placeholder="Precio"
        value={price}
        onChange={(e) =>
          setPrice(
            e.target.value === ""
              ? ""
              : Number(e.target.value)
          )
        }
      />
    </div>
  );
}
