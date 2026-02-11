"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";

type PorDia = {
  date: string;
  total: number;
};

type PorMes = {
  month: string;
  total: number;
};

export default function VentasCharts({
  porDia,
  porMes,
}: {
  porDia: PorDia[];
  porMes: PorMes[];
}) {
  return (
    <div className="space-y-10">
      <div className="card p-6">
        <h3 className="text-sm mb-4 opacity-70">
          Ventas por día
        </h3>

        <ResponsiveContainer width="100%" aspect={2}>
          <LineChart data={porDia}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#22c55e"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-6">
        <h3 className="text-sm mb-4 opacity-70">
          Ventas por mes
        </h3>

        <ResponsiveContainer width="100%" aspect={2}>
          <BarChart data={porMes}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar
              dataKey="total"
              fill="#22c55e"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
