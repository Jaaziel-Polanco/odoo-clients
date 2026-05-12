import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { InactiveTable } from "@/components/sales/inactive-table";
import { FilterBar } from "@/components/sales/filters/filter-bar";
import {
  countInactiveCustomers,
  findInactiveCustomers,
  type InactiveSort,
} from "@/lib/domain/sales/inactive-customers";
import { getAppSettings } from "@/lib/domain/config/app-settings";
import {
  getCountries,
  getSalespersons,
} from "@/lib/domain/sales/filter-options";

interface PageProps {
  searchParams: Promise<{
    days?: string;
    include_never?: string;
    q?: string;
    country?: string;
    salesperson?: string;
    date_from?: string;
    date_to?: string;
    sort?: string;
  }>;
}

const SORT_OPTIONS: { value: InactiveSort; label: string }[] = [
  { value: "oldest_first", label: "Más inactivos primero ↓" },
  { value: "newest_first", label: "Menos inactivos primero ↑" },
  { value: "revenue_desc", label: "Revenue total ↓" },
  { value: "revenue_asc", label: "Revenue total ↑" },
  { value: "name_asc", label: "Nombre A → Z" },
  { value: "name_desc", label: "Nombre Z → A" },
];

export const dynamic = "force-dynamic";

export default async function InactivosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const settings = await getAppSettings();
  const threshold = Number(params.days) || settings.inactivityThresholdDays;
  const includeNeverPurchased = params.include_never === "true";
  const sort = (params.sort as InactiveSort | undefined) ?? "oldest_first";

  const [countries, salespersons, customers, totalForCriteria] = await Promise.all([
    getCountries(),
    getSalespersons(),
    findInactiveCustomers({
      thresholdDays: threshold,
      includeNeverPurchased,
      search: params.q,
      country: params.country,
      salesperson: params.salesperson,
      dateFrom: params.date_from,
      dateTo: params.date_to,
      sort,
      limit: 1000,
    }),
    countInactiveCustomers({
      thresholdDays: threshold,
      includeNeverPurchased,
      search: params.q,
      country: params.country,
      salesperson: params.salesperson,
      dateFrom: params.date_from,
      dateTo: params.date_to,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes inactivos</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Clientes sin compras en los últimos{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {threshold} días
          </span>
          . Click una fila para ver el detalle.
        </p>
      </div>

      <FilterBar
        enabled={["q", "country", "salesperson", "sort", "days", "include_never", "date_range"]}
        countries={countries}
        salespersons={salespersons}
        sortOptions={SORT_OPTIONS}
        defaultSort="oldest_first"
        defaultDays={settings.inactivityThresholdDays}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {totalForCriteria === customers.length
              ? `${totalForCriteria} clientes`
              : `${customers.length} mostrados de ${totalForCriteria} totales`}
            {includeNeverPurchased ? " (incluye los que nunca compraron)" : null}
          </CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <InactiveTable data={customers} />
        </div>
      </Card>
    </div>
  );
}
