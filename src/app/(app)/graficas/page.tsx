import VentasCharts from "@/components/VentasCharts";
import { supabase } from "@/lib/supabaseClient";

export default async function GraficasPage() {
  // Ventas por día
  const { data: porDia } = await supabase
    .from("sales")
    .select("created_at, total");

  const ventasPorDia =
    porDia?.map((v) => ({
      date: new Date(v.created_at).toLocaleDateString(),
      total: v.total,
    })) ?? [];

  // Ventas por mes
  const ventasPorMes = ventasPorDia.reduce<Record<string, number>>(
    (acc, v) => {
      const month = v.date.slice(3); // MM/YYYY
      acc[month] = (acc[month] || 0) + v.total;
      return acc;
    },
    {}
  );

  const porMes = Object.entries(ventasPorMes).map(
    ([month, total]) => ({
      month,
      total,
    })
  );

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-8">
        Gráficas
      </h1>

      <VentasCharts porDia={ventasPorDia} porMes={porMes} />
    </main>
  );
}
