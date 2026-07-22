"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { fmtDate, fmtMoney } from "@/lib/format";
import type { CreditInvoice } from "@/lib/domain/sales/credit-invoices";

const dueBadge = (days: number | null) => {
  if (days == null) return { tone: "neutral" as const, label: "Sin fecha" };
  if (days < 0)
    return { tone: "danger" as const, label: `Vencida hace ${Math.abs(days)}d` };
  if (days === 0) return { tone: "danger" as const, label: "Vence hoy" };
  if (days <= 5) return { tone: "warning" as const, label: `Vence en ${days}d` };
  if (days <= 10) return { tone: "warning" as const, label: `Vence en ${days}d` };
  return { tone: "neutral" as const, label: `Vence en ${days}d` };
};

export const CreditInvoicesTable = ({ data }: { data: CreditInvoice[] }) => {
  const columns = useMemo<ColumnDef<CreditInvoice, unknown>[]>(
    () => [
      {
        accessorKey: "partnerName",
        header: "Cliente",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {row.original.partnerName}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {row.original.mobile ?? row.original.phone ?? "Sin teléfono"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "name",
        header: "Factura",
        cell: ({ row }) => (
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {row.original.name}
          </span>
        ),
      },
      {
        accessorKey: "salespersonName",
        header: "Vendedor",
        cell: ({ row }) => row.original.salespersonName ?? "—",
      },
      {
        accessorKey: "dueDate",
        header: "Vencimiento",
        cell: ({ row }) => {
          const b = dueBadge(row.original.daysToDue);
          return (
            <div className="flex flex-col gap-0.5">
              <span>{fmtDate(row.original.dueDate)}</span>
              <Badge tone={b.tone}>{b.label}</Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "amountResidual",
        header: "Saldo pendiente",
        cell: ({ row }) => (
          <span className="font-semibold text-red-600 dark:text-red-400">
            {fmtMoney(row.original.amountResidual, row.original.currency)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <a
              href={row.original.odooLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Odoo ↗
            </a>
            {row.original.whatsappLink ? (
              <a
                href={row.original.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-emerald-700"
              >
                WhatsApp
              </a>
            ) : (
              <span
                className="inline-flex items-center rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-400 dark:border-zinc-700"
                title="Sin teléfono válido"
              >
                Sin tel.
              </span>
            )}
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
      rowKey="invoiceId"
      emptyTitle="Sin facturas pendientes"
      emptyDescription="No hay facturas a crédito pendientes para este filtro. Cambia el corte de vencimiento o el vendedor."
      csvFilename="cuentas-por-cobrar.csv"
      csvHeaders={{
        partnerName: "Cliente",
        mobile: "Celular",
        phone: "Telefono",
        vat: "RNC/Cedula",
        name: "Factura",
        salespersonName: "Vendedor",
        invoiceDate: "Fecha factura",
        dueDate: "Vencimiento",
        daysToDue: "Dias para vencer",
        paymentState: "Estado pago",
        currency: "Moneda",
        amountTotal: "Monto total",
        amountResidual: "Saldo pendiente",
        whatsappNumber: "WhatsApp",
        odooLink: "Link Odoo",
      }}
    />
  );
};
