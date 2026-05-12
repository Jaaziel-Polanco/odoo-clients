import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "@/components/config/settings-form";
import { getAppSettings } from "@/lib/domain/config/app-settings";
import { getSyncStatus } from "@/lib/sync/sync-service";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const [settings, syncRows] = await Promise.all([getAppSettings(), getSyncStatus()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuracion</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Ajusta los parametros usados por cada analisis. Los cambios aplican al
          recargar las paginas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parametros de analisis</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <SettingsForm initial={settings} />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estado de sincronizacion con Odoo</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          {syncRows.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No hay sincronizaciones registradas. Presiona &quot;Sync ahora&quot;
              en la barra superior.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-200 text-sm dark:border-zinc-800">
              <table className="w-full">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Recurso</th>
                    <th className="px-3 py-2 text-left font-medium">Estado</th>
                    <th className="px-3 py-2 text-left font-medium">Ultimo run</th>
                    <th className="px-3 py-2 text-left font-medium">Procesados</th>
                    <th className="px-3 py-2 text-left font-medium">Duracion</th>
                    <th className="px-3 py-2 text-left font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {syncRows.map((row) => (
                    <tr key={row.resource} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-3 py-2 font-medium">{row.resource}</td>
                      <td className="px-3 py-2">
                        <Badge tone={row.lastRunStatus === "ok" ? "success" : "danger"}>
                          {row.lastRunStatus ?? "—"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {row.lastRunAt
                          ? new Date(row.lastRunAt).toLocaleString("es-DO")
                          : "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{row.recordsProcessed}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {row.lastRunDurationMs ? `${row.lastRunDurationMs}ms` : "—"}
                      </td>
                      <td className="px-3 py-2 text-red-600 dark:text-red-400">
                        {row.lastRunError ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
