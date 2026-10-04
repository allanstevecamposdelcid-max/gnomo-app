import type { ReactNode } from "react";

type Tone = "warning" | "danger";

const TONES: Record<Tone, string> = {
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger:  "bg-red-500/10 text-red-600 dark:text-red-400",
};

/* Aviso corto: ícono, título, una línea de detalle y una acción opcional */
export default function Notice({ tone = "warning", icon, title, detail, action }: {
  tone?: Tone;
  icon: ReactNode;
  title: string;
  detail?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="card px-4 py-3 flex items-center gap-3">
      <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${TONES[tone]}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug">{title}</p>
        {detail && <p className="text-xs text-muted leading-snug truncate">{detail}</p>}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="shrink-0 rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-xs font-medium hover:bg-[rgb(var(--card-soft))] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
