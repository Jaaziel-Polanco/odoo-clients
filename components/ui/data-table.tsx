"use client";

import { useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { Pagination } from "./pagination";
import { toCsv } from "@/lib/format";

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  csvHeaders?: Record<string, string>;
  csvFilename?: string;
  onRowClick?: (row: TData) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  initialPageSize?: number;
  rowKey?: keyof TData;
}

export const DataTable = <TData,>({
  data,
  columns,
  csvHeaders,
  csvFilename = "export.csv",
  onRowClick,
  emptyTitle = "Sin resultados",
  emptyDescription = "Ajusta los filtros o realiza un sync.",
  emptyAction,
  initialPageSize = 50,
  rowKey,
}: DataTableProps<TData>) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: initialPageSize });

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const onExportCsv = () => {
    if (!csvHeaders) return;
    const rows = table
      .getSortedRowModel()
      .rows.map((r) => r.original) as unknown as Record<string, unknown>[];
    const csv = toCsv(rows, csvHeaders);
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const visibleRows = table.getRowModel().rows;
  const totalRows = data.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          {totalRows} {totalRows === 1 ? "resultado" : "resultados"}
        </span>
        {csvHeaders && totalRows > 0 ? (
          <Button variant="secondary" size="sm" onClick={onExportCsv}>
            Exportar CSV
          </Button>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900/80 dark:text-zinc-400">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className={cn(
                        "px-3 py-2 text-left font-medium whitespace-nowrap",
                        h.column.getCanSort() && "cursor-pointer select-none hover:text-zinc-700 dark:hover:text-zinc-200",
                      )}
                      onClick={h.column.getToggleSortingHandler()}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getIsSorted() === "asc" ? "↑" : null}
                        {h.column.getIsSorted() === "desc" ? "↓" : null}
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <EmptyState
                      title={emptyTitle}
                      description={emptyDescription}
                      action={emptyAction}
                      icon="∅"
                    />
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const key = rowKey
                    ? String((row.original as Record<string, unknown>)[rowKey as string])
                    : row.id;
                  return (
                    <tr
                      key={key}
                      className={cn(
                        "group border-t border-zinc-100 transition dark:border-zinc-800",
                        onRowClick
                          ? "cursor-pointer hover:bg-zinc-50 focus-within:bg-zinc-50 dark:hover:bg-zinc-900/50 dark:focus-within:bg-zinc-900/50"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50",
                      )}
                      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                      onKeyDown={
                        onRowClick
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onRowClick(row.original);
                              }
                            }
                          : undefined
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-2 tabular-nums">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalRows > initialPageSize ? (
          <div className="border-t border-zinc-100 dark:border-zinc-800">
            <Pagination
              page={pagination.pageIndex}
              pageCount={table.getPageCount()}
              pageSize={pagination.pageSize}
              total={totalRows}
              onPageChange={(p) => setPagination((s) => ({ ...s, pageIndex: p }))}
              onPageSizeChange={(size) =>
                setPagination({ pageIndex: 0, pageSize: size })
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};
