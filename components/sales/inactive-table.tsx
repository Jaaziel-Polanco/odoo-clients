"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { RowContactActions } from "@/components/sales/row-contact-actions";
import { fmtDate, fmtMoneyMulti, fmtNumber, fmtRelative } from "@/lib/format";
import type { InactiveCustomer } from "@/lib/domain/sales/inactive-customers";

const toneForDays = (d: number | null): "neutral" | "warning" | "danger" => {
  if (d == null) return "neutral";
  if (d > 365) return "danger";
  if (d > 180) return "warning";
  return "neutral";
};

export const InactiveTable = ({ data }: { data: InactiveCustomer[] }) => {
  const router = useRouter();
  const columns = useMemo<ColumnDef<InactiveCustomer, unknown>[]>(
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
      {
        accessorKey: "country",
        header: "Ubicacion",
        cell: ({ row }) =>
          row.original.country
            ? `${row.original.country}${row.original.city ? ` / ${row.original.city}` : ""}`
            : "—",
      },
      {
        accessorKey: "salespersonName",
        header: "Vendedor",
        cell: ({ row }) => row.original.salespersonName ?? "—",
      },
      {
        accessorKey: "lastInvoiceDate",
        header: "Ultima compra",
        cell: ({ row }) => fmtDate(row.original.lastInvoiceDate),
      },
      {
        accessorKey: "daysSinceLast",
        header: "Inactividad",
        cell: ({ row }) => (
          <Badge tone={toneForDays(row.original.daysSinceLast)}>
            {fmtRelative(row.original.daysSinceLast)}
          </Badge>
        ),
      },
      {
        accessorKey: "invoiceCount",
        header: "# fact",
        cell: ({ row }) => fmtNumber(row.original.invoiceCount),
      },
      {
        accessorKey: "totalRevenueUsd",
        header: "Total historico",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {fmtMoneyMulti({
              usd: row.original.totalRevenueUsd,
              dop: row.original.totalRevenueDop,
            })}
          </span>
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
      emptyTitle="Ningun cliente cumple ese criterio"
      emptyDescription="Prueba reducir el umbral de dias o quitar filtros."
      csvFilename="clientes-inactivos.csv"
      csvHeaders={{
        name: "Cliente",
        email: "Email",
        phone: "Telefono",
        mobile: "Celular",
        vat: "RNC/Cedula",
        country: "Pais",
        city: "Ciudad",
        salespersonName: "Vendedor",
        lastInvoiceDate: "Ultima compra",
        daysSinceLast: "Dias inactivo",
        invoiceCount: "# facturas",
        totalRevenueUsd: "Total USD",
        totalRevenueDop: "Total DOP",
      }}
    />
  );
};
