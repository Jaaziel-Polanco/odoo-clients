import { Card, CardHeader, CardTitle, CardValue, CardFooter } from "@/components/ui/card";
import { AuditCancelledTable } from "@/components/sales/audit-cancelled-table";
import { fmtMoney, fmtNumber } from "@/lib/format";
import {
  findCancelledDeliveries,
  type CancelledDeliveriesResult,
} from "@/lib/domain/audit/cancelled-deliveries";

export const dynamic = "force-dynamic";

export default async function AuditoriaPage() {
  let result: CancelledDeliveriesResult | null = null;
  let error: string | null = null;
  try {
    result = await findCancelledDeliveries();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Auditoría — despachado sin facturar
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Órdenes de venta <span className="font-medium">canceladas</span> que ya
          fueron <span className="font-medium">despachadas</span> pero quedaron{" "}
          <span className="font-medium">sin facturar</span> — dinero entregado que
          no se cobró. Datos en vivo desde Odoo. Click{" "}
          <span className="font-medium">Abrir ↗</span> para ir a la orden y
          re-facturar.
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
            <p className="mb-2">
              Verifica las credenciales de Odoo en el entorno (ODOO_URL, ODOO_DB,
              ODOO_USERNAME, ODOO_API_KEY).
            </p>
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
                <CardTitle>Órdenes afectadas</CardTitle>
                <CardValue className="text-red-600 dark:text-red-400">
                  {fmtNumber(result.rows.length)}
                </CardValue>
              </CardHeader>
              <CardFooter>
                de {fmtNumber(result.totalCancelled)} canceladas en total
              </CardFooter>
            </Card>
            {result.pendingByCurrency.slice(0, 2).map((c) => (
              <Card key={c.currency}>
                <CardHeader>
                  <CardTitle>Pendiente {c.currency}</CardTitle>
                  <CardValue className="text-base text-red-600 dark:text-red-400">
                    {fmtMoney(c.amount, c.currency === "USD" ? "USD" : "DOP")}
                  </CardValue>
                </CardHeader>
                <CardFooter>{fmtNumber(c.count)} órdenes</CardFooter>
              </Card>
            ))}
            <Card>
              <CardHeader>
                <CardTitle>Vendedor con más casos</CardTitle>
                <CardValue className="text-base">
                  {result.bySalesperson[0]?.name ?? "—"}
                </CardValue>
              </CardHeader>
              <CardFooter>
                {result.bySalesperson[0]
                  ? `${fmtNumber(result.bySalesperson[0].count)} órdenes`
                  : "Sin datos"}
              </CardFooter>
            </Card>
          </div>

          {result.bySalesperson.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Por vendedor asignado</CardTitle>
              </CardHeader>
              <div className="px-6 pb-5">
                <div className="flex flex-col gap-1.5 text-sm">
                  {result.bySalesperson.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center justify-between border-b border-zinc-100 py-1.5 last:border-0 dark:border-zinc-800"
                    >
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {s.name}
                      </span>
                      <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                        {fmtNumber(s.count)} órdenes
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
                {result.rows.length === 1 ? "orden" : "órdenes"} por re-facturar
              </CardTitle>
            </CardHeader>
            <div className="px-6 pb-6">
              <AuditCancelledTable data={result.rows} />
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
