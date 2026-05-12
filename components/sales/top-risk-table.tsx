"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { RowContactActions } from "@/components/sales/row-contact-actions";
import { fmtDate, fmtMoneyMulti, fmtNumber } from "@/lib/format";
import type { TopAtRiskCustomer } from "@/lib/domain/sales/top-at-risk";

export const TopRiskTable = ({ data }: { data: TopAtRiskCustomer[] }) => {
  const router = useRouter();
  const columns = useMemo<ColumnDef<TopAtRiskCustomer, unknown>[]>(
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
        accessorKey: "salespersonName",
        header: "Vendedor",
        cell: ({ row }) => row.original.salespersonName ?? "—",
      },
      {
        accessorKey: "recentRevenueUsd",
        header: "Revenue reciente",
        cell: ({ row }) =>
          fmtMoneyMulti({
            usd: row.original.recentRevenueUsd,
            dop: row.original.recentRevenueDop,
          }),
      },
      {
        accessorKey: "lifetimeRevenueUsd",
        header: "Total historico",
        cell: ({ row }) =>
          fmtMoneyMulti({
            usd: row.original.lifetimeRevenueUsd,
            dop: row.original.lifetimeRevenueDop,
          }),
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
        accessorKey: "daysSinceLast",
        header: "Dias inactivo",
        cell: ({ row }) => (
          <Badge tone={row.original.daysSinceLast > 365 ? "danger" : "warning"}>
            {row.original.daysSinceLast}d
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <RowContactActions
            email={row.original.email}
            phone={row.original.phone}
            mobile={row.original.mobile}
            country={row.original.country}
            customerName={row.original.name}
          />
        ),
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
      emptyTitle="Sin clientes priorizables"
      emptyDescription="No hay clientes con revenue reciente que esten inactivos."
      csvFilename="top-clientes-en-riesgo.csv"
      csvHeaders={{
        name: "Cliente",
        email: "Email",
        country: "Pais",
        salespersonName: "Vendedor",
        recentRevenueUsd: "Reciente USD",
        recentRevenueDop: "Reciente DOP",
        lifetimeRevenueUsd: "Total USD",
        lifetimeRevenueDop: "Total DOP",
        invoiceCount: "# facturas",
        lastInvoiceDate: "Ultima compra",
        daysSinceLast: "Dias inactivo",
        riskScore: "Score riesgo",
      }}
    />
  );
};
