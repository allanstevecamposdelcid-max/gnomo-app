"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import VentasCharts from "@/components/VentasCharts";

type RawSale = { created_at: string; total: number };

export default function GraficasPage() {
  const [rawData, setRawData] = useState<RawSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("sales")
      .select("created_at, total")
      .eq("status", "entregado")
      .order("created_at")
      .then(({ data }) => {
        setRawData((data ?? []) as RawSale[]);
        setLoading(false);
      });
  }, []);

  const porDia = useMemo(
    () =>
      rawData.map((v) => ({
        date: new Date(v.created_at).toLocaleDateString("es-GT"),
        total: v.total,
      })),
    [rawData]
  );

  const porMes = useMemo(() => {
    const map: Record<string, number> = {};
    for (const v of porDia) {
      const parts = v.date.split("/");
      const key = parts.length >= 3 ? `${parts[1]}/${parts[2]}` : v.date;
      map[key] = (map[key] || 0) + v.total;
    }
    return Object.entries(map).map(([month, total]) => ({ month, total }));
  }, [porDia]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Gráficas</h1>
        <p className="text-sm text-muted">Solo pedidos entregados</p>
      </div>
      {loading ? (
        <p className="text-sm text-muted">Cargando datos…</p>
      ) : (
        <VentasCharts porDia={porDia} porMes={porMes} />
      )}
    </div>
  );
}
