import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueDeclineTable } from "@/components/sales/revenue-decline-table";
import { FilterBar } from "@/components/sales/filters/filter-bar";
import {
  detectRevenueDecline,
  type RevenueDeclineSort,
} from "@/lib/domain/sales/revenue-decline";
import { getAppSettings } from "@/lib/domain/config/app-settings";
import {
  getCountries,
  getSalespersons,
} from "@/lib/domain/sales/filter-options";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    country?: string;
    salesperson?: string;
    sort?: string;
  }>;
}

const SORT_OPTIONS: { value: RevenueDeclineSort; label: string }[] = [
  { value: "drop_amount_desc", label: "Mayor caída absoluta ↓" },
  { value: "drop_pct_desc", label: "Mayor caída % ↓" },
  { value: "recent_revenue_desc", label: "Revenue reciente ↓" },
  { value: "previous_revenue_desc", label: "Revenue anterior ↓" },
];

export const dynamic = "force-dynamic";

export default async function RevenueDeclinePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const settings = await getAppSettings();
  const sort = (params.sort as RevenueDeclineSort | undefined) ?? "drop_amount_desc";

  const [countries, salespersons, data] = await Promise.all([
    getCountries(),
    getSalespersons(),
    detectRevenueDecline({
      periodMonths: settings.revenueDeclinePeriodMonths,
      minDropPct: settings.revenueDeclineMinDropPct,
      country: params.country,
      salesperson: params.salesperson,
      search: params.q,
      sort,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Revenue decline</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Clientes cuyo gasto en los últimos {settings.revenueDeclinePeriodMonths} meses
          cayó al menos {settings.revenueDeclineMinDropPct}% comparado al periodo
          anterior.
        </p>
      </div>

      <FilterBar
        enabled={["q", "country", "salesperson", "sort"]}
        countries={countries}
        salespersons={salespersons}
        sortOptions={SORT_OPTIONS}
        defaultSort="drop_amount_desc"
      />

      <Card>
        <CardHeader>
          <CardTitle>{data.length} clientes con caída significativa</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <RevenueDeclineTable data={data} />
        </div>
      </Card>
    </div>
  );
}
