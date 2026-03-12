import VentasCharts from "@/components/VentasCharts";
import { supabase } from "@/lib/supabaseClient";

export default async function GraficasPage() {
  const { data: rawData } = await supabase
    .from("sales")
    .select("created_at, total")
    .eq("status", "entregado")
    .order("created_at");

  const porDia = (rawData ?? []).map((v) => ({
    date: new Date(v.created_at).toLocaleDateString("es-GT"),
    total: v.total,
  }));

  const mesMap = porDia.reduce<Record<string, number>>((acc, v) => {
    const parts = v.date.split("/");
    const key = parts.length >= 3 ? `${parts[1]}/${parts[2]}` : v.date;
    acc[key] = (acc[key] || 0) + v.total;
    return acc;
  }, {});

  const porMes = Object.entries(mesMap).map(([month, total]) => ({ month, total }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Gráficas</h1>
        <p className="text-sm text-muted">Solo pedidos entregados</p>
      </div>
      <VentasCharts porDia={porDia} porMes={porMes} />
    </div>
  );
}
