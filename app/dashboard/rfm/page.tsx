import { Card, CardHeader, CardTitle, CardValue } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoHint } from "@/components/ui/info-hint";
import { RfmTable } from "@/components/sales/rfm-table";
import { FilterBar } from "@/components/sales/filters/filter-bar";
import {
  computeRfm,
  summarizeRfmSegments,
} from "@/lib/domain/sales/rfm-segmentation";
import { getAppSettings } from "@/lib/domain/config/app-settings";
import {
  getCountries,
  getSalespersons,
} from "@/lib/domain/sales/filter-options";
import { fmtMoneyMulti, fmtNumber } from "@/lib/format";

interface PageProps {
  searchParams: Promise<{ q?: string; country?: string; salesperson?: string }>;
}

export const dynamic = "force-dynamic";

export default async function RfmPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const settings = await getAppSettings();
  const [countries, salespersons, rows] = await Promise.all([
    getCountries(),
    getSalespersons(),
    computeRfm({
      windowMonths: settings.rfmWindowMonths,
      country: params.country,
      salesperson: params.salesperson,
      search: params.q,
    }),
  ]);
  const summary = summarizeRfmSegments(rows);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Segmentacion RFM</h1>
          <InfoHint
            text="R=Recencia (que tan reciente compro). F=Frecuencia (que tan seguido). M=Monto (cuanto gasta). Cada metrica se puntua 1-5 por quintil de la poblacion."
          />
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Ultimos {settings.rfmWindowMonths} meses. Click un cliente para detalle, o
          filtra por segmento abajo.
        </p>
      </div>

      <FilterBar
        enabled={["q", "country", "salesperson"]}
        countries={countries}
        salespersons={salespersons}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {summary.slice(0, 5).map((s) => (
          <Card key={s.segment}>
            <CardHeader>
              <CardTitle>
                <Badge>{s.segment}</Badge>
              </CardTitle>
              <CardValue>{fmtNumber(s.count)}</CardValue>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {fmtMoneyMulti({ usd: s.revenueUsd, dop: s.revenueDop })}
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle por cliente</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <RfmTable data={rows} />
        </div>
      </Card>
    </div>
  );
}
