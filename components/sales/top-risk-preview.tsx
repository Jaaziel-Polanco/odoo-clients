import Link from "next/link";
import type { Route } from "next";
import { Badge } from "@/components/ui/badge";
import { fmtMoneyMulti, fmtRelative } from "@/lib/format";
import type { TopAtRiskCustomer } from "@/lib/domain/sales/top-at-risk";

export const TopRiskPreview = ({ data }: { data: TopAtRiskCustomer[] }) => {
  if (data.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Sin clientes en riesgo segun el umbral actual.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {data.map((c, idx) => (
        <li key={c.partnerId}>
          <Link
            href={`/dashboard/cliente/${c.partnerId}` as Route}
            className="flex items-center justify-between gap-3 px-6 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {idx + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {c.name}
                </p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {c.country ?? "—"} · {c.salespersonName ?? "Sin vendedor"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
              <span className="whitespace-nowrap text-xs font-medium text-zinc-900 dark:text-zinc-100">
                {fmtMoneyMulti({ usd: c.recentRevenueUsd, dop: c.recentRevenueDop })}
              </span>
              <Badge tone={c.daysSinceLast > 365 ? "danger" : "warning"}>
                {fmtRelative(c.daysSinceLast)}
              </Badge>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
};
