// Oferta: compras mayores a este monto llevan envío gratis (lo paga el negocio)
export const FREE_SHIPPING_MIN = 300;
// Costo de un envío que absorbe el negocio
export const SHIPPING_COST = 32;
// Devolución: se pierden 2 envíos (ida y vuelta). Debe coincidir con update_sale_status en SQL.
export const RETURN_LOSS = SHIPPING_COST * 2;
// Aviso de poco stock: productos con esta cantidad o menos (los diseños usan el stock de su prenda lisa)
export const LOW_STOCK_MAX = 10;
