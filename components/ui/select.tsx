import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Select = ({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={cn(
      "h-9 w-full appearance-none rounded-md border border-zinc-200 bg-white bg-[length:14px] bg-[right_0.5rem_center] bg-no-repeat px-3 pr-8 text-sm shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-200 dark:focus:ring-zinc-200/10",
      className,
    )}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
    }}
    {...props}
  >
    {children}
  </select>
);
