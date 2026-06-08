"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { fmtDate, fmtNumber } from "@/lib/format";
import { CancelPickingButton } from "./cancel-picking-button";
import type { PendingDelivery } from "@/lib/domain/audit/pending-deliveries";

const ageTone = (days: number | null) => {
  if (days == null) return "neutral";
  if (days >= 120) return "danger";
  if (days >= 90) return "danger";
  if (days >= 60) return "warning";
  return "neutral";
};

export const PendingDeliveriesTable = ({ data }: { data: PendingDelivery[] }) => {
  const columns = useMemo<ColumnDef<PendingDelivery, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Entrega",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {row.original.name}
            </span>
            {row.original.saleOrderName ? (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {row.original.saleOrderName}
              </span>
            ) : row.original.origin ? (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {row.original.origin}
              </span>
            ) : null}
          </div>
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
        cell: ({ row }) => row.original.salespersonName ?? "Sin vendedor",
      },
      {
        accessorKey: "stateLabel",
        header: "Estado",
        cell: ({ row }) => (
          <Badge tone={row.original.reservesStock ? "info" : "neutral"}>
            {row.original.stateLabel}
          </Badge>
        ),
      },
      {
        accessorKey: "scheduledDate",
        header: "Programada",
        cell: ({ row }) => fmtDate(row.original.scheduledDate),
      },
      {
        accessorKey: "ageDays",
        header: "Antigüedad",
        cell: ({ row }) => (
          <Badge tone={ageTone(row.original.ageDays)}>
            {row.original.ageDays == null ? "—" : `${fmtNumber(row.original.ageDays)}d`}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <a
              href={row.original.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Abrir ↗
            </a>
            <CancelPickingButton pickingId={row.original.id} name={row.original.name} />
          </div>
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
      emptyTitle="Sin entregas pendientes"
      emptyDescription="No hay entregas de salida sin despachar para este corte. Cambia el filtro de antigüedad o el vendedor."
      csvFilename="entregas-pendientes.csv"
      csvHeaders={{
        name: "Entrega",
        saleOrderName: "Orden de venta",
        partnerName: "Cliente",
        salespersonName: "Vendedor",
        stateLabel: "Estado",
        origin: "Origen",
        warehouse: "Almacen",
        scheduledDate: "Fecha programada",
        ageDays: "Dias pendiente",
        link: "Link Odoo",
      }}
    />
  );
};
