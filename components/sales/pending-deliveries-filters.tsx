"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

interface Props {
  buckets: { days: number; count: number }[];
  salespersons: { name: string; count: number }[];
}

export const PendingDeliveriesFilters = ({ buckets, salespersons }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const minDays = searchParams.get("min_days") ?? "";
  const salesperson = searchParams.get("salesperson") ?? "";

  const set = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Antigüedad mínima:
        </span>
        <BucketButton
          active={minDays === ""}
          label="Todas"
          onClick={() => set({ min_days: null })}
        />
        {buckets.map((b) => (
          <BucketButton
            key={b.days}
            active={minDays === String(b.days)}
            label={`≥${b.days}d (${b.count})`}
            onClick={() => set({ min_days: String(b.days) })}
          />
        ))}
      </div>

      {salespersons.length > 0 ? (
        <div className="max-w-xs">
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Vendedor
          </label>
          <Select
            value={salesperson}
            onChange={(e) => set({ salesperson: e.target.value || null })}
          >
            <option value="">Todos los vendedores</option>
            {salespersons.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.count})
              </option>
            ))}
          </Select>
        </div>
      ) : null}
    </div>
  );
};

const BucketButton = ({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "rounded-full px-3 py-1 text-xs transition",
      active
        ? "bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        : "border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800",
    )}
  >
    {label}
  </button>
);
