"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { fmtDate, fmtMoneyMulti, fmtNumber } from "@/lib/format";
import type { CadenceBreak } from "@/lib/domain/sales/cadence-breaks";

export const CadenceTable = ({ data }: { data: CadenceBreak[] }) => {
  const router = useRouter();
  const columns = useMemo<ColumnDef<CadenceBreak, unknown>[]>(
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
        accessorKey: "avgGapDays",
        header: "Cadencia normal",
        cell: ({ row }) => `${Math.round(row.original.avgGapDays)}d`,
      },
      {
        accessorKey: "currentGapDays",
        header: "Atraso actual",
        cell: ({ row }) => `${row.original.currentGapDays}d`,
      },
      {
        accessorKey: "overdueRatio",
        header: "Vs normal",
        cell: ({ row }) => (
          <Badge tone={row.original.overdueRatio > 3 ? "danger" : "warning"}>
            {row.original.overdueRatio.toFixed(1)}x
          </Badge>
        ),
      },
      {
        accessorKey: "invoiceCount",
        header: "# fact",
        cell: ({ row }) => fmtNumber(row.original.invoiceCount),
      },
      {
        accessorKey: "lastInvoiceDate",
        header: "Ultima compra",
        cell: ({ row }) => fmtDate(row.original.lastInvoiceDate),
      },
      {
        accessorKey: "totalRevenueUsd",
        header: "Total historico",
        cell: ({ row }) =>
          fmtMoneyMulti({
            usd: row.original.totalRevenueUsd,
            dop: row.original.totalRevenueDop,
          }),
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
      emptyTitle="Nadie con cadencia rota"
      emptyDescription="Reduce el multiplicador en Configuracion para detectar atrasos mas leves."
      csvFilename="quiebre-cadencia.csv"
      csvHeaders={{
        name: "Cliente",
        email: "Email",
        phone: "Telefono",
        mobile: "Celular",
        vat: "RNC/Cedula",
        country: "Pais",
        city: "Ciudad",
        avgGapDays: "Cadencia normal (d)",
        currentGapDays: "Atraso actual (d)",
        overdueRatio: "Vs normal (x)",
        invoiceCount: "# facturas",
        lastInvoiceDate: "Ultima compra",
        totalRevenueUsd: "Total USD",
        totalRevenueDop: "Total DOP",
      }}
    />
  );
};
