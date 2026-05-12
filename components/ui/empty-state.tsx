import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export const EmptyState = ({ title, description, icon, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
    {icon ? (
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-2xl text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        {icon}
      </div>
    ) : null}
    <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">{title}</h3>
    {description ? (
      <p className="mt-1 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
        {description}
      </p>
    ) : null}
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);
