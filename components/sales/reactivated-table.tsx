"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { fmtDate, fmtMoney, fmtNumber } from "@/lib/format";
import type { ReactivatedCustomer } from "@/lib/domain/sales/reactivated-customers";

const fulfillmentTone = (f: ReactivatedCustomer["fulfillment"]) =>
  f === "ambas" ? "success" : f === "facturada" ? "info" : "warning";

const fulfillmentLabel = (f: ReactivatedCustomer["fulfillment"]) =>
  f === "ambas" ? "Facturada + Despachada" : f === "facturada" ? "Facturada" : "Despachada";

export const ReactivatedTable = ({ data }: { data: ReactivatedCustomer[] }) => {
  const router = useRouter();
  const columns = useMemo<ColumnDef<ReactivatedCustomer, unknown>[]>(
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
        accessorKey: "salespersonName",
        header: "Vendedor",
        cell: ({ row }) => row.original.salespersonName ?? "—",
      },
      {
        accessorKey: "orderName",
        header: "Orden",
        cell: ({ row }) => (
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {row.original.orderName}
          </span>
        ),
      },
      {
        accessorKey: "orderDate",
        header: "Compra de retorno",
        cell: ({ row }) => fmtDate(row.original.orderDate),
      },
      {
        accessorKey: "previousOrderDate",
        header: "Compra anterior",
        cell: ({ row }) => fmtDate(row.original.previousOrderDate),
      },
      {
        accessorKey: "gapDays",
        header: "Sin comprar",
        cell: ({ row }) => (
          <Badge tone={row.original.gapDays >= 180 ? "danger" : "warning"}>
            {fmtNumber(row.original.gapDays)}d
          </Badge>
        ),
      },
      {
        accessorKey: "fulfillment",
        header: "Estado",
        cell: ({ row }) => (
          <Badge tone={fulfillmentTone(row.original.fulfillment)}>
            {fulfillmentLabel(row.original.fulfillment)}
          </Badge>
        ),
      },
      {
        accessorKey: "amountTotal",
        header: "Monto",
        cell: ({ row }) =>
          fmtMoney(row.original.amountTotal, row.original.currencyCode),
      },
    ],
    [],
  );

  return (
    <DataTable
      data={data}
      columns={columns}
      rowKey="orderId"
      onRowClick={(row) => router.push(`/dashboard/cliente/${row.partnerId}` as Route)}
      emptyTitle="Sin clientes reactivados"
      emptyDescription="Nadie con una orden facturada o despachada tras la brecha indicada. Ajusta los filtros o realiza un sync."
      csvFilename="clientes-reactivados.csv"
      csvHeaders={{
        name: "Cliente",
        email: "Email",
        phone: "Telefono",
        mobile: "Celular",
        vat: "RNC/Cedula",
        country: "Pais",
        city: "Ciudad",
        salespersonName: "Vendedor",
        orderName: "Orden",
        orderDate: "Compra de retorno",
        previousOrderDate: "Compra anterior",
        gapDays: "Dias sin comprar",
        fulfillment: "Estado",
        invoiceStatus: "Estado factura",
        deliveryStatus: "Estado entrega",
        amountTotal: "Monto",
        currencyCode: "Moneda",
      }}
    />
  );
};
