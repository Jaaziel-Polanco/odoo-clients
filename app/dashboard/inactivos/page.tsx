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
import { getRole } from "@/lib/auth/guard";

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

/** Ordenar por revenue revelaria el ranking economico al rol employee. */
const MONEY_SORTS: InactiveSort[] = ["revenue_desc", "revenue_asc"];

export const dynamic = "force-dynamic";

export default async function InactivosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const settings = await getAppSettings();
  const canSeeMoney = (await getRole()) === "admin";
  // El umbral configurado es un piso: el filtro solo puede endurecer la
  // busqueda. Asi nunca aparece un cliente que compro mas reciente que lo
  // definido en Configuracion, aunque manipulen ?days= en la URL.
  const requestedDays = Number(params.days);
  const threshold =
    Number.isFinite(requestedDays) && requestedDays > 0
      ? Math.max(requestedDays, settings.inactivityThresholdDays)
      : settings.inactivityThresholdDays;
  const includeNeverPurchased = params.include_never === "true";
  const requestedSort = (params.sort as InactiveSort | undefined) ?? "oldest_first";
  const sort =
    !canSeeMoney && MONEY_SORTS.includes(requestedSort)
      ? "oldest_first"
      : requestedSort;

  const [countries, salespersons, customers, totalForCriteria] = await Promise.all([
    getCountries(),
    getSalespersons(),
    findInactiveCustomers({
      thresholdDays: threshold,
      quotationRecencyDays: settings.quotationRecencyDays,
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
      quotationRecencyDays: settings.quotationRecencyDays,
      includeNeverPurchased,
      search: params.q,
      country: params.country,
      salesperson: params.salesperson,
      dateFrom: params.date_from,
      dateTo: params.date_to,
    }),
  ]);

  // Los montos no viajan al browser cuando el rol no puede verlos.
  const visibleCustomers = canSeeMoney
    ? customers
    : customers.map((c) => ({ ...c, totalRevenueUsd: 0, totalRevenueDop: 0 }));

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
        sortOptions={
          canSeeMoney
            ? SORT_OPTIONS
            : SORT_OPTIONS.filter((o) => !MONEY_SORTS.includes(o.value))
        }
        defaultSort="oldest_first"
        defaultDays={settings.inactivityThresholdDays}
        minDays={settings.inactivityThresholdDays}
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
          <InactiveTable data={visibleCustomers} canSeeMoney={canSeeMoney} />
        </div>
      </Card>
    </div>
  );
}
