"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { fmtDate, fmtMoney } from "@/lib/format";
import type { CancelledDelivery } from "@/lib/domain/audit/cancelled-deliveries";

export const AuditCancelledTable = ({ data }: { data: CancelledDelivery[] }) => {
  const columns = useMemo<ColumnDef<CancelledDelivery, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Orden",
        cell: ({ row }) => (
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {row.original.name}
          </span>
        ),
      },
      {
        accessorKey: "partnerName",
        header: "Cliente",
        cell: ({ row }) => row.original.partnerName ?? "—",
      },
      {
        accessorKey: "salespersonName",
        header: "Vendedor",
        cell: ({ row }) => row.original.salespersonName ?? "—",
      },
      {
        accessorKey: "orderDate",
        header: "Fecha orden",
        cell: ({ row }) => fmtDate(row.original.orderDate),
      },
      {
        accessorKey: "deliveredDate",
        header: "Despachado",
        cell: ({ row }) => fmtDate(row.original.deliveredDate),
      },
      {
        accessorKey: "amountPending",
        header: "Pendiente facturar",
        cell: ({ row }) => (
          <span className="font-semibold text-red-600 dark:text-red-400">
            {fmtMoney(row.original.amountPending, row.original.currency === "USD" ? "USD" : "DOP")}
          </span>
        ),
      },
      {
        id: "link",
        header: "Odoo",
        cell: ({ row }) => (
          <a
            href={row.original.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Abrir ↗
          </a>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      data={data}
      columns={columns}
      rowKey="id"
      emptyTitle="Nada pendiente"
      emptyDescription="No hay órdenes canceladas que estén despachadas y sin facturar. Si acabas de re-facturar, recarga para refrescar desde Odoo."
      csvFilename="auditoria-ordenes-canceladas.csv"
      csvHeaders={{
        name: "Orden",
        partnerName: "Cliente",
        salespersonName: "Vendedor",
        lastModifiedBy: "Ultima modif. (write_uid)",
        orderDate: "Fecha orden",
        deliveredDate: "Despachado",
        currency: "Moneda",
        amountTotal: "Monto total",
        amountInvoiced: "Monto facturado",
        amountPending: "Pendiente facturar",
        clientRef: "Ref cliente",
        link: "Link Odoo",
      }}
    />
  );
};
