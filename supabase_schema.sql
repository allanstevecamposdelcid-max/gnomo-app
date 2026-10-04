-- ============================================================
-- El Gnomo — esquema completo de la base de datos
-- Ejecutar UNA VEZ en Supabase → SQL Editor → New query → Run
-- (es seguro volver a ejecutarlo: usa IF NOT EXISTS / OR REPLACE)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ────────────────────────────────────────────────────────────
-- CATÁLOGOS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vendedores terceros / proveedores
CREATE TABLE IF NOT EXISTS suppliers (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  phone      TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  phone      TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT          NOT NULL,
  sku         TEXT,
  stock       INTEGER       NOT NULL DEFAULT 0,
  cost        NUMERIC(12,2) NOT NULL DEFAULT 0,
  price       NUMERIC(12,2) NOT NULL DEFAULT 0,
  active      BOOLEAN       NOT NULL DEFAULT TRUE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id)  ON DELETE SET NULL,
  -- Diseño estampado sobre una prenda lisa: usa y descuenta el stock de esa prenda base
  base_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
ALTER TABLE products ADD COLUMN IF NOT EXISTS
  base_product_id UUID REFERENCES products(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_base     ON products(base_product_id);

-- Solo un nivel: prenda lisa → diseños (un diseño no puede ser base de otro)
CREATE OR REPLACE FUNCTION products_check_base() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.base_product_id IS NOT NULL THEN
    IF NEW.base_product_id = NEW.id THEN
      RAISE EXCEPTION 'Un producto no puede ser su propia prenda base';
    END IF;
    IF EXISTS (SELECT 1 FROM products WHERE id = NEW.base_product_id AND base_product_id IS NOT NULL) THEN
      RAISE EXCEPTION 'La prenda base no puede ser un diseño';
    END IF;
    IF EXISTS (SELECT 1 FROM products WHERE base_product_id = NEW.id) THEN
      RAISE EXCEPTION 'Este producto es prenda base de otros diseños, no puede usar otra prenda base';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_products_check_base ON products;
CREATE TRIGGER trg_products_check_base
  BEFORE INSERT OR UPDATE OF base_product_id ON products
  FOR EACH ROW EXECUTE FUNCTION products_check_base();

-- ────────────────────────────────────────────────────────────
-- VENTAS
-- ────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS order_number_seq;

CREATE TABLE IF NOT EXISTS sales (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number      TEXT          NOT NULL UNIQUE
                    DEFAULT 'GN-' || LPAD(nextval('order_number_seq')::TEXT, 5, '0'),
  customer_name     TEXT          NOT NULL,
  customer_phone    TEXT,
  tracking_number   TEXT          NOT NULL,
  payment_type      TEXT          NOT NULL DEFAULT 'pagado'
                    CHECK (payment_type IN ('pagado','contra_entrega')),
  concept           TEXT,
  total             NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_cost     NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Envío gratis por compra > Q300: lo que absorbe el negocio (Q32)
  shipping_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  dtf_cost          NUMERIC(12,2) NOT NULL DEFAULT 0,
  status            TEXT          NOT NULL DEFAULT 'pendiente'
                    CHECK (status IN ('pendiente','enviado','entregado','no_recibido','devuelto')),
  return_reason     TEXT,
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS return_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_status  ON sales(status);

CREATE TABLE IF NOT EXISTS sale_items (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id      UUID          NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id   UUID          REFERENCES products(id) ON DELETE SET NULL,
  -- Producto al que se le descontó el stock (la prenda base si es un diseño)
  stock_product_id UUID      REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT          NOT NULL,
  qty          INTEGER       NOT NULL CHECK (qty > 0),
  unit_price   NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_cost    NUMERIC(12,2) NOT NULL DEFAULT 0
);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS
  stock_product_id UUID REFERENCES products(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sale_items_sale    ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

-- ────────────────────────────────────────────────────────────
-- FINANZAS
-- ────────────────────────────────────────────────────────────

-- Gastos operacionales del día (caja)
CREATE TABLE IF NOT EXISTS expenses (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  description  TEXT          NOT NULL,
  amount       NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  expense_date DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- Gastos fijos: se repiten cada mes desde start_date hasta end_date (NULL = sin fin)
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT          NOT NULL DEFAULT 'otros'
              CHECK (category IN ('renta','sueldos','internet','publicidad','servicios','otros')),
  description TEXT          NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  start_date  DATE          NOT NULL DEFAULT CURRENT_DATE,
  end_date    DATE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Pérdidas: envíos de pedidos no recibidos y devoluciones
CREATE TABLE IF NOT EXISTS losses (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id     UUID          REFERENCES sales(id) ON DELETE CASCADE,
  reason      TEXT          NOT NULL CHECK (reason IN ('no_recibido','devolucion','otro')),
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  loss_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_losses_date ON losses(loss_date);

-- Configuración privada (contraseña de ganancias). Sin políticas: nadie la lee directo.
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- El aviso de poco stock lo calcula la app (LOW_STOCK_MAX en src/lib/constants.ts).
-- Esta vista ya no se usa.
DROP VIEW IF EXISTS low_stock_products;

-- ────────────────────────────────────────────────────────────
-- FUNCIONES
-- ────────────────────────────────────────────────────────────

-- Crear venta con varios productos y descontar stock.
-- Si el producto es un diseño, el stock se descuenta de su prenda base.
CREATE OR REPLACE FUNCTION create_sale_multi(
  p_customer_name     TEXT,
  p_customer_phone    TEXT,
  p_tracking_number   TEXT,
  p_payment_type      TEXT,
  p_concept           TEXT,
  p_items             JSONB,
  p_dtf_cost          NUMERIC DEFAULT 0,
  p_shipping_cost     NUMERIC DEFAULT 0,
  p_shipping_discount NUMERIC DEFAULT 0
) RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
  v_sale_id  UUID;
  v_item     JSONB;
  v_stock_id UUID;
  v_stock    INTEGER;
  v_total    NUMERIC := 0;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La venta no tiene productos';
  END IF;

  INSERT INTO sales (customer_name, customer_phone, tracking_number, payment_type,
                     concept, dtf_cost, shipping_cost, shipping_discount)
  VALUES (p_customer_name, p_customer_phone, p_tracking_number, p_payment_type,
          p_concept, COALESCE(p_dtf_cost, 0), COALESCE(p_shipping_cost, 0),
          COALESCE(p_shipping_discount, 0))
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT COALESCE(base_product_id, id) INTO v_stock_id FROM products
      WHERE id = (v_item->>'product_id')::UUID;
    IF v_stock_id IS NULL THEN
      RAISE EXCEPTION 'Producto no encontrado: %', v_item->>'product_name';
    END IF;

    SELECT stock INTO v_stock FROM products WHERE id = v_stock_id FOR UPDATE;
    IF v_stock < (v_item->>'qty')::INTEGER THEN
      RAISE EXCEPTION 'Stock insuficiente para % (disponible: %)', v_item->>'product_name', v_stock;
    END IF;

    UPDATE products SET stock = stock - (v_item->>'qty')::INTEGER
      WHERE id = v_stock_id;

    INSERT INTO sale_items (sale_id, product_id, stock_product_id, product_name, qty, unit_price, unit_cost)
    VALUES (v_sale_id, (v_item->>'product_id')::UUID, v_stock_id, v_item->>'product_name',
            (v_item->>'qty')::INTEGER, (v_item->>'unit_price')::NUMERIC,
            (v_item->>'unit_cost')::NUMERIC);

    v_total := v_total + (v_item->>'qty')::INTEGER * (v_item->>'unit_price')::NUMERIC;
  END LOOP;

  UPDATE sales SET total = v_total WHERE id = v_sale_id;
  RETURN v_sale_id;
END;
$$;

-- Devuelve al inventario lo que descontó una venta (a la prenda base si era un diseño)
CREATE OR REPLACE FUNCTION restore_sale_stock(p_sale_id UUID)
RETURNS VOID
LANGUAGE sql AS $$
  UPDATE products p SET stock = p.stock + x.qty
  FROM (SELECT COALESCE(stock_product_id, product_id) AS pid, SUM(qty) AS qty
        FROM sale_items
        WHERE sale_id = p_sale_id AND COALESCE(stock_product_id, product_id) IS NOT NULL
        GROUP BY 1) x
  WHERE p.id = x.pid;
$$;

-- Cambiar estado de una venta.
--   no_recibido → el producto vuelve al inventario y se pierde el costo de envío
--   devuelto    → NO cuenta como venta: el producto vuelve al inventario y solo
--                 se pierden 2 envíos (Q32 + Q32 = Q64). La razón es obligatoria.
DROP FUNCTION IF EXISTS update_sale_status(UUID, TEXT);
CREATE OR REPLACE FUNCTION update_sale_status(p_sale_id UUID, p_new_status TEXT, p_reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
  v_sale sales%ROWTYPE;
BEGIN
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venta no encontrada'; END IF;
  IF v_sale.status = p_new_status THEN RETURN; END IF;
  IF v_sale.status IN ('no_recibido','devuelto') THEN
    RAISE EXCEPTION 'Esta venta ya está cerrada como "%" y no se puede cambiar', v_sale.status;
  END IF;
  IF p_new_status = 'devuelto' AND length(trim(COALESCE(p_reason, ''))) = 0 THEN
    RAISE EXCEPTION 'La razón de devolución es obligatoria';
  END IF;

  IF p_new_status IN ('no_recibido','devuelto') THEN
    PERFORM restore_sale_stock(p_sale_id);

    IF p_new_status = 'no_recibido' THEN
      INSERT INTO losses (sale_id, reason, amount, description)
      VALUES (p_sale_id, 'no_recibido', v_sale.shipping_cost,
              'Envío perdido — pedido no recibido');
    ELSE
      INSERT INTO losses (sale_id, reason, amount, description)
      VALUES (p_sale_id, 'devolucion', 64,
              'Devolución (Q32 + Q32): ' || trim(p_reason));
    END IF;
  END IF;

  UPDATE sales SET
    status        = p_new_status,
    return_reason = CASE WHEN p_new_status = 'devuelto' THEN trim(p_reason) ELSE return_reason END,
    sent_at       = CASE WHEN p_new_status = 'enviado' AND sent_at IS NULL THEN NOW() ELSE sent_at END
  WHERE id = p_sale_id;
END;
$$;

-- Eliminar una venta. Si seguía activa, su stock vuelve al inventario
-- (las cerradas como no recibido / devolución ya lo devolvieron).
CREATE OR REPLACE FUNCTION delete_sale(p_sale_id UUID)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_status NOT IN ('no_recibido','devuelto') THEN
    PERFORM restore_sale_stock(p_sale_id);
  END IF;
  DELETE FROM sales WHERE id = p_sale_id;  -- sale_items y losses se borran en cascada
END;
$$;

-- Resumen de pérdidas del mes (Finanzas → Control pérdidas)
CREATE OR REPLACE FUNCTION get_loss_summary(p_month INTEGER, p_year INTEGER)
RETURNS TABLE (
  total_perdido           NUMERIC,
  total_envios            NUMERIC,
  pedidos_no_recibidos    BIGINT,
  total_pedidos           BIGINT,
  porcentaje_no_recibidos NUMERIC
)
LANGUAGE sql STABLE AS $$
  WITH r AS (
    SELECT make_date(p_year, p_month, 1) AS d1,
           (make_date(p_year, p_month, 1) + INTERVAL '1 month')::DATE AS d2
  ),
  s AS (
    SELECT sa.* FROM sales sa, r
    WHERE sa.created_at >= r.d1 AND sa.created_at < r.d2
  )
  SELECT
    (SELECT COALESCE(SUM(l.amount), 0) FROM losses l, r
       WHERE l.loss_date >= r.d1 AND l.loss_date < r.d2),
    (SELECT COALESCE(SUM(shipping_cost + shipping_discount), 0) FROM s),
    (SELECT COUNT(*) FROM s WHERE status IN ('no_recibido','devuelto')),
    (SELECT COUNT(*) FROM s),
    (SELECT CASE WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('no_recibido','devuelto')) / COUNT(*), 1)
            END FROM s);
$$;

-- Contraseña de ganancias (se guarda cifrada; nunca se envía al navegador)
CREATE OR REPLACE FUNCTION check_profit_password(p_password TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT COALESCE(
    (SELECT value = crypt(p_password, value) FROM app_settings WHERE key = 'profit_password'),
    FALSE);
$$;

CREATE OR REPLACE FUNCTION change_profit_password(p_old TEXT, p_new TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT check_profit_password(p_old) THEN RETURN FALSE; END IF;
  IF length(COALESCE(p_new, '')) < 4 THEN
    RAISE EXCEPTION 'La contraseña nueva debe tener al menos 4 caracteres';
  END IF;
  UPDATE app_settings SET value = crypt(p_new, gen_salt('bf'))
    WHERE key = 'profit_password';
  RETURN TRUE;
END;
$$;

-- Contraseña inicial: 1234  (cámbiala desde la app: candado → "Cambiar contraseña")
INSERT INTO app_settings (key, value)
VALUES ('profit_password', extensions.crypt('1234', extensions.gen_salt('bf')))
ON CONFLICT (key) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- SEGURIDAD (RLS)
-- La app no tiene inicio de sesión: se permite acceso con la anon key.
-- app_settings queda sin políticas (solo accesible por las funciones de arriba).
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories','suppliers','contacts','products','sales',
                           'sale_items','expenses','fixed_expenses','losses'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS app_all ON %I', t);
    EXECUTE format('CREATE POLICY app_all ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
