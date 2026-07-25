import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { TopRiskTable } from "@/components/sales/top-risk-table";
import { FilterBar } from "@/components/sales/filters/filter-bar";
import { findTopAtRisk, type TopRiskSort } from "@/lib/domain/sales/top-at-risk";
import { getAppSettings } from "@/lib/domain/config/app-settings";
import { requireAdmin } from "@/lib/auth/guard";
import {
  getCountries,
  getSalespersons,
} from "@/lib/domain/sales/filter-options";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    country?: string;
    salesperson?: string;
    days?: string;
    date_from?: string;
    date_to?: string;
    sort?: string;
  }>;
}

const SORT_OPTIONS: { value: TopRiskSort; label: string }[] = [
  { value: "risk_desc", label: "Score riesgo ↓" },
  { value: "recent_revenue_desc", label: "Revenue reciente ↓" },
  { value: "lifetime_revenue_desc", label: "Revenue total ↓" },
  { value: "days_desc", label: "Días inactivo ↓" },
  { value: "days_asc", label: "Días inactivo ↑" },
];

export const dynamic = "force-dynamic";

export default async function TopRiskPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const settings = await getAppSettings();
  // Mismo criterio que Inactivos: el umbral configurado es un piso.
  const requestedDays = Number(params.days);
  const threshold =
    Number.isFinite(requestedDays) && requestedDays > 0
      ? Math.max(requestedDays, settings.inactivityThresholdDays)
      : settings.inactivityThresholdDays;
  const sort = (params.sort as TopRiskSort | undefined) ?? "risk_desc";

  const [countries, salespersons, customers] = await Promise.all([
    getCountries(),
    getSalespersons(),
    findTopAtRisk({
      thresholdDays: threshold,
      quotationRecencyDays: settings.quotationRecencyDays,
      search: params.q,
      country: params.country,
      salesperson: params.salesperson,
      dateFrom: params.date_from,
      dateTo: params.date_to,
      sort,
      limit: 200,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Top clientes en riesgo</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Clientes valiosos que llevan más de {threshold} días sin comprar. Click una fila
          para ver detalle y contactarlos.
        </p>
      </div>

      <FilterBar
        enabled={["q", "country", "salesperson", "sort", "days", "date_range"]}
        countries={countries}
        salespersons={salespersons}
        sortOptions={SORT_OPTIONS}
        defaultSort="risk_desc"
        defaultDays={settings.inactivityThresholdDays}
        minDays={settings.inactivityThresholdDays}
      />

      <Card>
        <CardHeader>
          <CardTitle>{customers.length} priorizados</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <TopRiskTable data={customers} />
        </div>
      </Card>
    </div>
  );
}
