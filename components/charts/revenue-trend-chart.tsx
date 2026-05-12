"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtMoney } from "@/lib/format";
import type { RevenueByMonth } from "@/lib/domain/sales/overview";

export const RevenueTrendChart = ({ data }: { data: RevenueByMonth[] }) => {
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
        <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="usd-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="dop-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-zinc-200 dark:stroke-zinc-800"
          />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            className="text-zinc-500"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            className="text-zinc-500"
            tickFormatter={(v) =>
              v >= 1_000_000
                ? `${(v / 1_000_000).toFixed(1)}M`
                : v >= 1000
                  ? `${(v / 1000).toFixed(0)}k`
                  : String(v)
            }
          />
          <Tooltip
            formatter={(value, name) => [
              fmtMoney(Number(value), String(name) === "USD" ? "USD" : "DOP"),
              String(name),
            ]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid #e4e4e7",
              background: "white",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="usd"
            name="USD"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#usd-fill)"
          />
          <Area
            type="monotone"
            dataKey="dop"
            name="DOP"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#dop-fill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
