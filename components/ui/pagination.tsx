"use client";

import { Button } from "./button";

interface PaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export const Pagination = ({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100, 200],
}: PaginationProps) => {
  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);
  return (
    <div className="flex flex-col gap-2 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span>
          {start}-{end} de {total}
        </span>
        {onPageSizeChange ? (
          <label className="flex items-center gap-1">
            <span>por pagina</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 rounded border border-zinc-200 bg-white px-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onPageChange(0)}
          disabled={page === 0}
        >
          «
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
        >
          ‹ Anterior
        </Button>
        <span className="px-2 tabular-nums">
          {page + 1} / {Math.max(1, pageCount)}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onPageChange(page + 1)}
          disabled={page + 1 >= pageCount}
        >
          Siguiente ›
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onPageChange(pageCount - 1)}
          disabled={page + 1 >= pageCount}
        >
          »
        </Button>
      </div>
    </div>
  );
};
