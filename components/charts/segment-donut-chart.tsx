"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { RfmSegment } from "@/lib/domain/sales/rfm-segmentation";

const COLOR: Record<RfmSegment, string> = {
  Campeones: "#10b981",
  Leales: "#22c55e",
  Potenciales: "#3b82f6",
  Nuevos: "#06b6d4",
  Prometedores: "#8b5cf6",
  "Necesitan atencion": "#f59e0b",
  "A punto de dormir": "#f97316",
  "En riesgo": "#ef4444",
  "No los podemos perder": "#dc2626",
  Hibernando: "#a1a1aa",
  Perdidos: "#71717a",
};

interface Datum {
  segment: RfmSegment;
  count: number;
}

export const SegmentDonutChart = ({ data }: { data: Datum[] }) => {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
        Sin datos.
      </div>
    );
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="segment"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
          >
            {data.map((d) => (
              <Cell key={d.segment} fill={COLOR[d.segment]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`${Number(value)} clientes`, String(name)]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid #e4e4e7",
              background: "white",
            }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            wrapperStyle={{ fontSize: 11 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
