import { Card, CardHeader, CardTitle, CardValue, CardFooter } from "@/components/ui/card";
import { CreditInvoicesTable } from "@/components/sales/credit-invoices-table";
import { CreditDueFilters } from "@/components/sales/credit-due-filters";
import { FilterBar } from "@/components/sales/filters/filter-bar";
import { fmtMoney, fmtNumber } from "@/lib/format";
import { getSalespersons } from "@/lib/domain/sales/filter-options";
import {
  findCreditInvoices,
  getCreditSummary,
  type CreditSort,
  type DueFilter,
} from "@/lib/domain/sales/credit-invoices";

interface PageProps {
  searchParams: Promise<{
    due?: string;
    q?: string;
    salesperson?: string;
    sort?: string;
  }>;
}

const SORT_OPTIONS: { value: CreditSort; label: string }[] = [
  { value: "due_asc", label: "Vencimiento más próximo ↑" },
  { value: "overdue_desc", label: "Más vencidas primero ↑" },
  { value: "residual_desc", label: "Mayor saldo ↓" },
];

export const dynamic = "force-dynamic";

export default async function CobranzasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const due = (params.due as DueFilter | undefined) ?? "all";
  const sort = (params.sort as CreditSort | undefined) ?? "due_asc";

  const [summary, salespersons, invoices] = await Promise.all([
    getCreditSummary(),
    getSalespersons(),
    findCreditInvoices({
      due,
      search: params.q,
      salesperson: params.salesperson,
      sort,
      limit: 1000,
    }),
  ]);

  const totalCount = summary.pendingByCurrency.reduce((s, c) => s + c.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Cuentas por cobrar
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Facturas a crédito sin pagar o pendientes de pago. Filtra por las que
          vencen pronto o las ya vencidas.{" "}
          <span className="font-medium">Odoo ↗</span> abre la factura;{" "}
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            WhatsApp
          </span>{" "}
          abre un mensaje de seguimiento pre-llenado al teléfono del cliente.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Facturas pendientes</CardTitle>
            <CardValue className="text-amber-600 dark:text-amber-400">
              {fmtNumber(totalCount)}
            </CardValue>
          </CardHeader>
          <CardFooter>Sin pagar / parciales</CardFooter>
        </Card>
        {summary.pendingByCurrency.slice(0, 2).map((c) => (
          <Card key={c.currency}>
            <CardHeader>
              <CardTitle>Saldo {c.currency}</CardTitle>
              <CardValue className="text-base text-red-600 dark:text-red-400">
                {fmtMoney(c.amount, c.currency === "USD" ? "USD" : "DOP")}
              </CardValue>
            </CardHeader>
            <CardFooter>{fmtNumber(c.count)} facturas</CardFooter>
          </Card>
        ))}
        <Card>
          <CardHeader>
            <CardTitle>Vencidas</CardTitle>
            <CardValue className="text-red-600 dark:text-red-400">
              {fmtNumber(summary.overdueCount)}
            </CardValue>
          </CardHeader>
          <CardFooter>{fmtNumber(summary.due10Count)} vencen en ≤10d</CardFooter>
        </Card>
      </div>

      <CreditDueFilters
        counts={{
          overdue: summary.overdueCount,
          due5: summary.due5Count,
          due10: summary.due10Count,
          all: totalCount,
        }}
      />

      <FilterBar
        enabled={["q", "salesperson", "sort"]}
        salespersons={salespersons}
        sortOptions={SORT_OPTIONS}
        defaultSort="due_asc"
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {invoices.length}{" "}
            {invoices.length === 1 ? "factura" : "facturas"} en el listado
          </CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <CreditInvoicesTable data={invoices} />
        </div>
      </Card>
    </div>
  );
}
