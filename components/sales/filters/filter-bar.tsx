"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { FilterOption } from "@/lib/domain/sales/filter-options";

export type FilterKey =
  | "q"
  | "country"
  | "salesperson"
  | "days"
  | "include_never"
  | "date_range"
  | "sort";

export interface SortOption {
  value: string;
  label: string;
}

export interface FilterBarProps {
  enabled: FilterKey[];
  countries?: FilterOption[];
  salespersons?: FilterOption[];
  sortOptions?: SortOption[];
  dayPresets?: number[];
  defaultDays?: number;
  defaultSort?: string;
}

const DEFAULT_DAY_PRESETS = [30, 60, 90, 180, 365];

const today = () => new Date().toISOString().slice(0, 10);
const offsetDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const firstOfMonth = (offset = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  return d.toISOString().slice(0, 10);
};
const lastOfMonth = (offset = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offset + 1, 0);
  return d.toISOString().slice(0, 10);
};
const firstOfYear = (offset = 0) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + offset, 0, 1);
  return d.toISOString().slice(0, 10);
};
const lastOfYear = (offset = 0) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + offset, 11, 31);
  return d.toISOString().slice(0, 10);
};

const DATE_PRESETS: Array<{
  key: string;
  label: string;
  from: () => string;
  to: () => string;
}> = [
  { key: "30d", label: "Últimos 30d", from: () => offsetDate(-30), to: today },
  { key: "90d", label: "Últimos 90d", from: () => offsetDate(-90), to: today },
  { key: "month", label: "Este mes", from: () => firstOfMonth(0), to: today },
  { key: "lastMonth", label: "Mes pasado", from: () => firstOfMonth(-1), to: () => lastOfMonth(-1) },
  { key: "year", label: "Este año", from: () => firstOfYear(0), to: today },
  { key: "lastYear", label: "Año pasado", from: () => firstOfYear(-1), to: () => lastOfYear(-1) },
];

export const FilterBar = ({
  enabled,
  countries = [],
  salespersons = [],
  sortOptions = [],
  dayPresets = DEFAULT_DAY_PRESETS,
  defaultDays,
  defaultSort,
}: FilterBarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = useCallback(
    (key: FilterKey | "date_from" | "date_to"): string =>
      searchParams.get(key) ?? "",
    [searchParams],
  );

  const [localQ, setLocalQ] = useState(() => get("q"));
  const [lastUrlQ, setLastUrlQ] = useState(() => get("q"));
  const urlQ = get("q");
  if (urlQ !== lastUrlQ) {
    setLastUrlQ(urlQ);
    setLocalQ(urlQ);
  }

  const set = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams],
  );

  useEffect(() => {
    if (!enabled.includes("q")) return;
    if (localQ === get("q")) return;
    const handle = setTimeout(() => set({ q: localQ || null }), 350);
    return () => clearTimeout(handle);
  }, [localQ, enabled, get, set]);

  const activeFilters = useMemo(() => {
    const keys = [...enabled, "date_from", "date_to"];
    return keys.filter((k) => get(k as FilterKey) !== "");
  }, [enabled, get]);

  const clearAll = () => {
    const cleared: Record<string, string | null> = {};
    for (const k of [...enabled, "date_from", "date_to"]) cleared[k] = null;
    set(cleared);
    setLocalQ("");
  };

  const applyDatePreset = (preset: (typeof DATE_PRESETS)[number]) => {
    set({ date_from: preset.from(), date_to: preset.to() });
  };

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {enabled.includes("q") ? (
          <div className="col-span-1 sm:col-span-2">
            <FieldLabel>Buscar</FieldLabel>
            <Input
              type="search"
              placeholder="Nombre, email, RNC..."
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
            />
          </div>
        ) : null}

        {enabled.includes("country") && countries.length > 0 ? (
          <div>
            <FieldLabel>País</FieldLabel>
            <Select
              value={get("country")}
              onChange={(e) => set({ country: e.target.value || null })}
            >
              <option value="">Todos los países</option>
              {countries.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label} ({c.count})
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {enabled.includes("salesperson") && salespersons.length > 0 ? (
          <div>
            <FieldLabel>Vendedor</FieldLabel>
            <Select
              value={get("salesperson")}
              onChange={(e) => set({ salesperson: e.target.value || null })}
            >
              <option value="">Todos los vendedores</option>
              {salespersons.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label} ({s.count})
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {enabled.includes("sort") && sortOptions.length > 0 ? (
          <div>
            <FieldLabel>Ordenar por</FieldLabel>
            <Select
              value={get("sort") || defaultSort || sortOptions[0]?.value}
              onChange={(e) => set({ sort: e.target.value })}
            >
              {sortOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>

      {enabled.includes("date_range") ? (
        <div className="space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Última compra entre:
            </span>
            {DATE_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => applyDatePreset(p)}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:max-w-md">
            <Input
              type="date"
              value={get("date_from")}
              onChange={(e) => set({ date_from: e.target.value || null })}
              aria-label="Fecha desde"
            />
            <Input
              type="date"
              value={get("date_to")}
              onChange={(e) => set({ date_to: e.target.value || null })}
              aria-label="Fecha hasta"
            />
          </div>
        </div>
      ) : null}

      {enabled.includes("days") ? (
        <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Inactivos hace más de:
            </span>
            {dayPresets.map((d) => {
              const current = Number(get("days")) || defaultDays;
              const active = current === d;
              return (
                <button
                  key={d}
                  onClick={() => set({ days: String(d) })}
                  className={
                    active
                      ? "rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }
                >
                  {d}d
                </button>
              );
            })}
            <Input
              type="number"
              min={1}
              max={3650}
              placeholder="Otro"
              value={get("days")}
              onChange={(e) => set({ days: e.target.value || null })}
              className="h-8 w-20 text-xs"
            />
          </div>

          {enabled.includes("include_never") ? (
            <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={get("include_never") === "true"}
                onChange={(e) =>
                  set({ include_never: e.target.checked ? "true" : null })
                }
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
              />
              Incluir clientes que nunca compraron
            </label>
          ) : null}
        </div>
      ) : null}

      {activeFilters.length > 0 ? (
        <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {activeFilters.length}{" "}
            {activeFilters.length === 1 ? "filtro activo" : "filtros activos"}
          </span>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Limpiar filtros
          </Button>
        </div>
      ) : null}
    </div>
  );
};

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
    {children}
  </label>
);
