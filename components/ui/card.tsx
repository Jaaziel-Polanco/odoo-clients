import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
      className,
    )}
    {...props}
  />
);

export const CardHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn("text-sm font-medium text-zinc-500 dark:text-zinc-400", className)}
    {...props}
  />
);

export const CardValue = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("text-2xl font-semibold tracking-tight tabular-nums", className)}
    {...props}
  />
);

export const CardContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-6 pb-6", className)} {...props} />
);

export const CardFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex items-center border-t border-zinc-100 px-6 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400",
      className,
    )}
    {...props}
  />
);
