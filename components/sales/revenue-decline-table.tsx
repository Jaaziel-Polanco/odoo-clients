"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { fmtMoneyMulti, fmtNumber } from "@/lib/format";
import type { RevenueDeclineRow } from "@/lib/domain/sales/revenue-decline";

export const RevenueDeclineTable = ({ data }: { data: RevenueDeclineRow[] }) => {
  const router = useRouter();
  const columns = useMemo<ColumnDef<RevenueDeclineRow, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Cliente",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {row.original.name}
            </span>
            {row.original.email ? (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {row.original.email}
              </span>
            ) : null}
          </div>
        ),
      },
      { accessorKey: "country", header: "Pais", cell: ({ row }) => row.original.country ?? "—" },
      {
        accessorKey: "previousRevenueUsd",
        header: "Periodo anterior",
        cell: ({ row }) =>
          fmtMoneyMulti({
            usd: row.original.previousRevenueUsd,
            dop: row.original.previousRevenueDop,
          }),
      },
      {
        accessorKey: "recentRevenueUsd",
        header: "Periodo reciente",
        cell: ({ row }) =>
          fmtMoneyMulti({
            usd: row.original.recentRevenueUsd,
            dop: row.original.recentRevenueDop,
          }),
      },
      {
        accessorKey: "dropPct",
        header: "Caida",
        cell: ({ row }) => (
          <Badge tone={row.original.dropPct >= 50 ? "danger" : "warning"}>
            -{row.original.dropPct.toFixed(0)}%
          </Badge>
        ),
      },
      {
        accessorKey: "previousInvoices",
        header: "# anterior",
        cell: ({ row }) => fmtNumber(row.original.previousInvoices),
      },
      {
        accessorKey: "recentInvoices",
        header: "# reciente",
        cell: ({ row }) => fmtNumber(row.original.recentInvoices),
      },
    ],
    [],
  );

  return (
    <DataTable
      data={data}
      columns={columns}
      rowKey="partnerId"
      onRowClick={(row) => router.push(`/dashboard/cliente/${row.partnerId}` as Route)}
      emptyTitle="Sin caidas significativas"
      emptyDescription="Reduce el % minimo de caida o el periodo en Configuracion."
      csvFilename="revenue-decline.csv"
      csvHeaders={{
        name: "Cliente",
        email: "Email",
        country: "Pais",
        previousRevenueUsd: "Anterior USD",
        previousRevenueDop: "Anterior DOP",
        recentRevenueUsd: "Reciente USD",
        recentRevenueDop: "Reciente DOP",
        dropPct: "Caida %",
        previousInvoices: "# anterior",
        recentInvoices: "# reciente",
      }}
    />
  );
};
