"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtMoney } from "@/lib/format";
import type { CustomerInvoice } from "@/lib/domain/sales/customer-detail";

const moveTypeLabel: Record<string, string> = {
  out_invoice: "Factura",
  out_refund: "Nota crédito",
};

const paymentLabel: Record<string, string> = {
  paid: "Pagada",
  partial: "Parcial",
  in_payment: "En pago",
  not_paid: "No pagada",
  reversed: "Revertida",
};

const paymentTone = (
  state: string | null,
): "success" | "warning" | "danger" | "neutral" | "info" => {
  if (state === "paid") return "success";
  if (state === "partial") return "warning";
  if (state === "in_payment") return "info";
  if (state === "not_paid") return "danger";
  return "neutral";
};

type SortKey =
  | "date_desc"
  | "date_asc"
  | "amount_desc"
  | "amount_asc"
  | "name_desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date_desc", label: "Fecha más reciente ↓" },
  { value: "date_asc", label: "Fecha más antigua ↑" },
  { value: "amount_desc", label: "Monto mayor ↓" },
  { value: "amount_asc", label: "Monto menor ↑" },
  { value: "name_desc", label: "Documento Z → A" },
];

export const CustomerInvoicesTable = ({ data }: { data: CustomerInvoice[] }) => {
  const router = useRouter();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentState, setPaymentState] = useState<string>("");
  const [moveType, setMoveType] = useState<string>("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("date_desc");

  const filteredAndSorted = useMemo(() => {
    let rows = [...data];
    if (dateFrom) rows = rows.filter((r) => r.invoiceDate && r.invoiceDate >= dateFrom);
    if (dateTo) rows = rows.filter((r) => r.invoiceDate && r.invoiceDate <= dateTo);
    if (paymentState)
      rows = rows.filter((r) => (r.paymentState ?? "") === paymentState);
    if (moveType) rows = rows.filter((r) => r.moveType === moveType);
    if (pendingOnly) rows = rows.filter((r) => r.amountResidual > 0);
    switch (sort) {
      case "date_asc":
        rows.sort((a, b) => (a.invoiceDate ?? "").localeCompare(b.invoiceDate ?? ""));
        break;
      case "amount_desc":
        rows.sort((a, b) => b.amountTotal - a.amountTotal);
        break;
      case "amount_asc":
        rows.sort((a, b) => a.amountTotal - b.amountTotal);
        break;
      case "name_desc":
        rows.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "date_desc":
      default:
        rows.sort((a, b) => (b.invoiceDate ?? "").localeCompare(a.invoiceDate ?? ""));
    }
    return rows;
  }, [data, dateFrom, dateTo, paymentState, moveType, pendingOnly, sort]);

  const paymentStates = useMemo(() => {
    const set = new Set<string>();
    for (const r of data) if (r.paymentState) set.add(r.paymentState);
    return Array.from(set);
  }, [data]);

  const moveTypes = useMemo(() => {
    const set = new Set<string>();
    for (const r of data) set.add(r.moveType);
    return Array.from(set);
  }, [data]);

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setPaymentState("");
    setMoveType("");
    setPendingOnly(false);
    setSort("date_desc");
  };

  const hasFilters =
    dateFrom || dateTo || paymentState || moveType || pendingOnly || sort !== "date_desc";

  const columns = useMemo<ColumnDef<CustomerInvoice, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Documento",
        cell: ({ row }) => (
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {row.original.name}
          </span>
        ),
      },
      {
        accessorKey: "invoiceDate",
        header: "Fecha",
        cell: ({ row }) => fmtDate(row.original.invoiceDate),
      },
      {
        accessorKey: "moveType",
        header: "Tipo",
        cell: ({ row }) => (
          <Badge tone={row.original.moveType === "out_refund" ? "warning" : "neutral"}>
            {moveTypeLabel[row.original.moveType] ?? row.original.moveType}
          </Badge>
        ),
      },
      {
        accessorKey: "amountTotal",
        header: "Total",
        cell: ({ row }) =>
          fmtMoney(
            row.original.moveType === "out_refund"
              ? -row.original.amountTotal
              : row.original.amountTotal,
            (row.original.currencyCode as "USD" | "DOP") ?? "DOP",
          ),
      },
      {
        accessorKey: "amountResidual",
        header: "Pendiente",
        cell: ({ row }) =>
          row.original.amountResidual > 0
            ? fmtMoney(
                row.original.amountResidual,
                (row.original.currencyCode as "USD" | "DOP") ?? "DOP",
              )
            : "—",
      },
      {
        accessorKey: "paymentState",
        header: "Pago",
        cell: ({ row }) => (
          <Badge tone={paymentTone(row.original.paymentState)}>
            {paymentLabel[row.original.paymentState ?? ""] ??
              row.original.paymentState ??
              "—"}
          </Badge>
        ),
      },
      {
        accessorKey: "salespersonName",
        header: "Vendedor",
        cell: ({ row }) => row.original.salespersonName ?? "—",
      },
      {
        accessorKey: "invoiceDateDue",
        header: "Vence",
        cell: ({ row }) => fmtDate(row.original.invoiceDateDue),
      },
    ],
    [],
  );

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Desde</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          {moveTypes.length > 1 ? (
            <div>
              <Label>Tipo</Label>
              <Select value={moveType} onChange={(e) => setMoveType(e.target.value)}>
                <option value="">Todos</option>
                {moveTypes.map((t) => (
                  <option key={t} value={t}>
                    {moveTypeLabel[t] ?? t}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          {paymentStates.length > 0 ? (
            <div>
              <Label>Estado de pago</Label>
              <Select
                value={paymentState}
                onChange={(e) => setPaymentState(e.target.value)}
              >
                <option value="">Todos</option>
                {paymentStates.map((s) => (
                  <option key={s} value={s}>
                    {paymentLabel[s] ?? s}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <div className={moveTypes.length > 1 && paymentStates.length > 0 ? "lg:col-span-1" : ""}>
            <Label>Ordenar por</Label>
            <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={pendingOnly}
              onChange={(e) => setPendingOnly(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            Solo con saldo pendiente
          </label>
          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          ) : null}
          <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
            {filteredAndSorted.length} de {data.length} facturas
          </span>
        </div>
      </div>
      <DataTable
        data={filteredAndSorted}
        columns={columns}
        rowKey="id"
        onRowClick={(row) => router.push(`/dashboard/factura/${row.id}` as Route)}
        emptyTitle="Sin facturas con esos filtros"
        emptyDescription="Ajusta los filtros para ver más resultados."
        csvFilename="facturas-cliente.csv"
        csvHeaders={{
          name: "Documento",
          invoiceDate: "Fecha",
          moveType: "Tipo",
          amountTotal: "Total",
          amountResidual: "Pendiente",
          currencyCode: "Moneda",
          paymentState: "Pago",
          salespersonName: "Vendedor",
          invoiceDateDue: "Vence",
        }}
        initialPageSize={25}
      />
    </div>
  );
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
    {children}
  </label>
);
