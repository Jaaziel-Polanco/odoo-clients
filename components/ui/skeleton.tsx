import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Skeleton = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800",
      className,
    )}
    {...props}
  />
);
