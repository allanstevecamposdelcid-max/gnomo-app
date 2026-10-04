# El Gnomo — Contabilidad

App de ventas, inventario y finanzas de El Gnomo, hecha con Next.js 16 y Supabase.

## Base de datos

1. En Supabase abre **SQL Editor → New query**, pega el contenido de [`supabase_schema.sql`](supabase_schema.sql) y ejecútalo.
2. Si el script cambia, se puede volver a ejecutar: no borra datos ni cambia la contraseña.
3. La contraseña inicial para ver las ganancias es ``. Cámbiala desde la app con el candado del encabezado → "Cambiar contraseña".

## Variables de entorno

| Variable | Dónde está |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |

Para trabajar en local, copia `.env.example` como `.env.local` y llena los valores.

## Correr en local

Necesitas Node.js 20.9 o superior.

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>.

## Desplegar en Vercel

1. En Vercel, **Add New → Project** e importa este repositorio.
2. Vercel detecta Next.js solo; no cambies los comandos de build.
3. En **Environment Variables** agrega las dos variables de arriba.
4. Presiona **Deploy**. Cada push a `main` se despliega automáticamente.

## Reglas del negocio

- **Envío gratis:** en compras mayores a Q300 se restan Q32 de la ganancia del pedido.
- **Devolución:** no cuenta como venta, el producto vuelve al inventario y se pierden 2 envíos (Q64). La razón es obligatoria.
- **Prendas lisas y diseños:** un diseño no tiene stock propio; usa y descuenta el stock de su prenda lisa base.

Los montos están en [`src/lib/constants.ts`](src/lib/constants.ts). Si cambias el costo del envío, cambia también los Q64 de `update_sale_status` en `supabase_schema.sql`.
