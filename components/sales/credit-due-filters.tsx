"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todas pendientes" },
  { value: "5", label: "Vencen en ≤5d" },
  { value: "10", label: "Vencen en ≤10d" },
  { value: "overdue", label: "Ya vencidas" },
];

export const CreditDueFilters = ({
  counts,
}: {
  counts: { overdue: number; due5: number; due10: number; all: number };
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("due") ?? "";

  const set = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (!value) next.delete("due");
      else next.set("due", value);
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams],
  );

  const countFor = (value: string) =>
    value === "" ? counts.all : value === "5" ? counts.due5 : value === "10" ? counts.due10 : counts.overdue;

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <span className="mr-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Vencimiento:
      </span>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => set(o.value)}
          className={cn(
            "rounded-full px-3 py-1 text-xs transition",
            current === o.value
              ? "bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800",
          )}
        >
          {o.label} ({countFor(o.value)})
        </button>
      ))}
    </div>
  );
};
