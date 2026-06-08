import { Card, CardHeader, CardTitle, CardValue, CardFooter } from "@/components/ui/card";
import { PendingDeliveriesTable } from "@/components/sales/pending-deliveries-table";
import { PendingDeliveriesFilters } from "@/components/sales/pending-deliveries-filters";
import { fmtNumber } from "@/lib/format";
import {
  findPendingDeliveries,
  type PendingDeliveriesResult,
} from "@/lib/domain/audit/pending-deliveries";

interface PageProps {
  searchParams: Promise<{ min_days?: string; salesperson?: string }>;
}

export const dynamic = "force-dynamic";

export default async function EntregasPendientesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const minAgeDays = params.min_days ? Number(params.min_days) : undefined;

  let result: PendingDeliveriesResult | null = null;
  let error: string | null = null;
  try {
    result = await findPendingDeliveries({
      minAgeDays,
      salesperson: params.salesperson,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Entregas pendientes — bloqueando inventario
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Órdenes de entrega de salida <span className="font-medium">nunca despachadas</span>{" "}
          que mantienen inventario reservado en Odoo. Agrupadas por vendedor
          responsable. Datos en vivo. <span className="font-medium">Abrir ↗</span>{" "}
          va a la entrega en Odoo; <span className="font-medium text-red-600 dark:text-red-400">Cancelar</span>{" "}
          la cancela de verdad y libera el stock.
        </p>
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">
              No se pudo consultar Odoo
            </CardTitle>
          </CardHeader>
          <div className="px-6 pb-6 text-sm text-zinc-600 dark:text-zinc-300">
            <pre className="overflow-x-auto rounded-md bg-zinc-100 p-3 text-xs dark:bg-zinc-800">
              {error}
            </pre>
          </div>
        </Card>
      ) : result ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Entregas pendientes</CardTitle>
                <CardValue className="text-amber-600 dark:text-amber-400">
                  {fmtNumber(result.total)}
                </CardValue>
              </CardHeader>
              <CardFooter>Sin despachar (todas)</CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Stock reservado</CardTitle>
                <CardValue className="text-red-600 dark:text-red-400">
                  {fmtNumber(result.reservedCount)}
                </CardValue>
              </CardHeader>
              <CardFooter>Estado &quot;lista&quot; (bloquea inventario)</CardFooter>
            </Card>
            {result.bucketCounts
              .filter((b) => b.days === 90 || b.days === 120)
              .map((b) => (
                <Card key={b.days}>
                  <CardHeader>
                    <CardTitle>≥ {b.days} días</CardTitle>
                    <CardValue className="text-red-600 dark:text-red-400">
                      {fmtNumber(b.count)}
                    </CardValue>
                  </CardHeader>
                  <CardFooter>Más críticas</CardFooter>
                </Card>
              ))}
          </div>

          <PendingDeliveriesFilters
            buckets={result.bucketCounts}
            salespersons={result.bySalesperson.map((s) => ({
              name: s.name,
              count: s.count,
            }))}
          />

          {result.bySalesperson.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Por vendedor responsable (en este corte)</CardTitle>
              </CardHeader>
              <div className="px-6 pb-5">
                <div className="flex flex-col gap-1.5 text-sm">
                  {result.bySalesperson.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center justify-between border-b border-zinc-100 py-1.5 last:border-0 dark:border-zinc-800"
                    >
                      <span className="text-zinc-700 dark:text-zinc-300">{s.name}</span>
                      <span className="flex items-center gap-3 tabular-nums text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{fmtNumber(s.count)} entregas</span>
                        <span>{fmtNumber(s.reserved)} reservadas</span>
                        <span>hasta {fmtNumber(s.oldestDays)}d</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>
                {result.rows.length}{" "}
                {result.rows.length === 1 ? "entrega" : "entregas"} en el listado
              </CardTitle>
            </CardHeader>
            <div className="px-6 pb-6">
              <PendingDeliveriesTable data={result.rows} />
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
