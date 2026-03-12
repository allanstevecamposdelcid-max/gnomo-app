-- ============================================================
-- TABLA: suppliers (Proveedores / Contactos)
-- Ejecutar en Supabase SQL Editor
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  phone      TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
