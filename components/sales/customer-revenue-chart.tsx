"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CustomerMonthlyRevenue } from "@/lib/domain/sales/customer-detail";
import { fmtMoney } from "@/lib/format";

interface Props {
  data: CustomerMonthlyRevenue[];
}

export const CustomerRevenueChart = ({ data }: Props) => {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
        Sin facturas en los ultimos 24 meses.
      </div>
    );
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
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
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
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
          <Line
            type="monotone"
            dataKey="usd"
            name="USD"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="dop"
            name="DOP"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
