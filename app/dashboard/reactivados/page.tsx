import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactivatedTable } from "@/components/sales/reactivated-table";
import { FilterBar } from "@/components/sales/filters/filter-bar";
import {
  findReactivatedCustomers,
  type ReactivatedSort,
} from "@/lib/domain/sales/reactivated-customers";
import { getSaleSalespersons } from "@/lib/domain/sales/filter-options";

interface PageProps {
  searchParams: Promise<{
    days?: string;
    q?: string;
    salesperson?: string;
    date_from?: string;
    date_to?: string;
    sort?: string;
  }>;
}

const SORT_OPTIONS: { value: ReactivatedSort; label: string }[] = [
  { value: "order_date_desc", label: "Reactivación más reciente ↓" },
  { value: "order_date_asc", label: "Reactivación más antigua ↑" },
  { value: "gap_desc", label: "Mayor tiempo sin comprar ↓" },
  { value: "amount_desc", label: "Monto de la orden ↓" },
];

const DEFAULT_GAP_DAYS = 90;

export const dynamic = "force-dynamic";

export default async function ReactivadosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const gapDays = Number(params.days) || DEFAULT_GAP_DAYS;
  const sort = (params.sort as ReactivatedSort | undefined) ?? "order_date_desc";

  const [salespersons, customers] = await Promise.all([
    getSaleSalespersons(),
    findReactivatedCustomers({
      gapDays,
      search: params.q,
      salesperson: params.salesperson,
      dateFrom: params.date_from,
      dateTo: params.date_to,
      sort,
      limit: 1000,
    }),
  ]);

  const gapMonths = Math.round(gapDays / 30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Clientes reactivados
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Clientes que dejaron de comprar por al menos{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {gapDays} días
          </span>{" "}
          (~{gapMonths} {gapMonths === 1 ? "mes" : "meses"}) y volvieron con una
          orden de venta facturada o despachada. El vendedor sale del módulo de
          ventas. Click una fila para ver el detalle del cliente.
        </p>
      </div>

      <FilterBar
        enabled={["q", "salesperson", "sort", "days", "date_range"]}
        salespersons={salespersons}
        sortOptions={SORT_OPTIONS}
        defaultSort="order_date_desc"
        defaultDays={DEFAULT_GAP_DAYS}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {customers.length}{" "}
            {customers.length === 1 ? "reactivación" : "reactivaciones"}
          </CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <ReactivatedTable data={customers} />
        </div>
      </Card>
    </div>
  );
}
