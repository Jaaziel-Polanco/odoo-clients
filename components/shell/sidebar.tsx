"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export const NAV_ITEMS = [
  { href: "/dashboard" as Route, label: "Resumen", icon: "▦", hint: "Vista general" },
  { href: "/dashboard/inactivos" as Route, label: "Inactivos", icon: "⏸", hint: "Sin compras recientes" },
  { href: "/dashboard/top-riesgo" as Route, label: "Top en riesgo", icon: "★", hint: "Alto valor + inactivos" },
  { href: "/dashboard/cadencia" as Route, label: "Cadencia", icon: "⟳", hint: "Atraso vs patron historico" },
  { href: "/dashboard/rfm" as Route, label: "Segmentos RFM", icon: "◧", hint: "Recencia/Frecuencia/Monto" },
  { href: "/dashboard/revenue" as Route, label: "Revenue decline", icon: "↘", hint: "Caida vs periodo anterior" },
  { href: "/dashboard/config" as Route, label: "Configuracion", icon: "⚙", hint: "Umbrales y sync" },
];

interface SidebarProps {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}

export const Sidebar = ({ variant = "desktop", onNavigate }: SidebarProps) => {
  const pathname = usePathname();
  const isMobile = variant === "mobile";
  return (
    <aside
      className={cn(
        "shrink-0 bg-white p-4 dark:bg-zinc-950",
        isMobile
          ? "h-full w-full border-zinc-200 dark:border-zinc-800"
          : "hidden w-64 border-r border-zinc-200 dark:border-zinc-800 lg:block",
      )}
    >
      <div className="mb-8 px-2">
        <h1 className="text-lg font-semibold tracking-tight">Greensun</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Tracking de clientes Odoo
        </p>
      </div>
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-start gap-3 rounded-md px-3 py-2 text-sm transition",
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
              )}
            >
              <span className="mt-0.5 w-4 text-center opacity-70">{item.icon}</span>
              <span className="flex flex-col">
                <span className="leading-tight">{item.label}</span>
                <span
                  className={cn(
                    "text-[10px] font-normal",
                    active
                      ? "text-white/60 dark:text-zinc-900/60"
                      : "text-zinc-400 dark:text-zinc-500",
                  )}
                >
                  {item.hint}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
