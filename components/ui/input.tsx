import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Input = ({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      "h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-200 dark:focus:ring-zinc-200/10",
      className,
    )}
    {...props}
  />
);
