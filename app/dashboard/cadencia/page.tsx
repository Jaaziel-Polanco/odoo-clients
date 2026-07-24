import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CadenceTable } from "@/components/sales/cadence-table";
import { FilterBar } from "@/components/sales/filters/filter-bar";
import { detectCadenceBreaks, type CadenceSort } from "@/lib/domain/sales/cadence-breaks";
import { getAppSettings } from "@/lib/domain/config/app-settings";
import {
  getCountries,
  getSalespersons,
} from "@/lib/domain/sales/filter-options";
import { getRole } from "@/lib/auth/guard";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    country?: string;
    salesperson?: string;
    date_from?: string;
    date_to?: string;
    sort?: string;
  }>;
}

const SORT_OPTIONS: { value: CadenceSort; label: string }[] = [
  { value: "ratio_desc", label: "Más atrasados primero (vs su patrón) ↓" },
  { value: "current_gap_desc", label: "Mayor atraso absoluto ↓" },
  { value: "avg_gap_asc", label: "Clientes más frecuentes ↑" },
  { value: "invoices_desc", label: "Más facturas históricas ↓" },
];

export const dynamic = "force-dynamic";

export default async function CadenciaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const settings = await getAppSettings();
  const canSeeMoney = (await getRole()) === "admin";
  const sort = (params.sort as CadenceSort | undefined) ?? "ratio_desc";

  const [countries, salespersons, data] = await Promise.all([
    getCountries(),
    getSalespersons(),
    detectCadenceBreaks({
      overdueMultiplier: settings.cadenceOverdueMultiplier,
      minInvoices: 3,
      limit: 1000,
      search: params.q,
      country: params.country,
      salesperson: params.salesperson,
      dateFrom: params.date_from,
      dateTo: params.date_to,
      sort,
    }),
  ]);

  // Los montos no viajan al browser cuando el rol no puede verlos.
  const visibleData = canSeeMoney
    ? data
    : data.map((d) => ({ ...d, totalRevenueUsd: 0, totalRevenueDop: 0 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Quiebre de cadencia</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Clientes con al menos 3 facturas cuyo atraso supera{" "}
          {settings.cadenceOverdueMultiplier}x su cadencia normal de compra.
        </p>
      </div>

      <FilterBar
        enabled={["q", "country", "salesperson", "sort", "date_range"]}
        countries={countries}
        salespersons={salespersons}
        sortOptions={SORT_OPTIONS}
        defaultSort="ratio_desc"
      />

      <Card>
        <CardHeader>
          <CardTitle>{data.length} clientes con cadencia rota</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <CadenceTable data={visibleData} canSeeMoney={canSeeMoney} />
        </div>
      </Card>
    </div>
  );
}
