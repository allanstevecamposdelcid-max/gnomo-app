/* Razón de devolución (obligatoria): se usa en el libro de ventas y en "Nueva venta → Devolución" */

export const RETURN_REASONS = [
  "Talla incorrecta",
  "Producto dañado o con defecto",
  "Diseño o color equivocado",
  "El cliente ya no lo quiso",
  "Otra razón",
];
const OTHER = "Otra razón";

/* Texto que se guarda: la razón y, si hay, el detalle */
export function returnReasonText(reason: string, detail: string) {
  return reason === OTHER ? detail.trim() : [reason, detail.trim()].filter(Boolean).join(" — ");
}

export function returnReasonValid(reason: string, detail: string) {
  return reason === OTHER ? detail.trim() !== "" : reason !== "";
}

export function ReturnReasonFields({ reason, detail, onReason, onDetail }: {
  reason: string;
  detail: string;
  onReason: (v: string) => void;
  onDetail: (v: string) => void;
}) {
  const isOther = reason === OTHER;
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted block mb-1">Razón de devolución *</label>
        <select className="input w-full" value={reason} onChange={(e) => onReason(e.target.value)}>
          <option value="">Selecciona una razón…</option>
          {RETURN_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-muted block mb-1">
          {isOther ? "Describe la razón *" : "Detalle (opcional)"}
        </label>
        <textarea className="input w-full resize-none" rows={2}
          placeholder={isOther ? "¿Por qué se devolvió?" : "Ej: pidió talla M en lugar de L"}
          value={detail} onChange={(e) => onDetail(e.target.value)} />
      </div>
    </div>
  );
}
