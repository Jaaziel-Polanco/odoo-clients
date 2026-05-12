import { getSyncStatus } from "@/lib/sync/sync-service";
import { SyncButton } from "./sync-button";
import { LogoutButton } from "./logout-button";
import { MobileNav } from "./mobile-nav";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export const Header = async () => {
  const status = await getSyncStatus();
  const lastInvoiceSync = status.find((s) => s.resource === "invoices");
  const lastRunAt = lastInvoiceSync?.lastRunAt
    ? new Date(lastInvoiceSync.lastRunAt)
    : null;
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-6">
      <div className="flex items-center gap-2 min-w-0">
        <MobileNav />
        <div className="min-w-0 text-sm text-zinc-500 dark:text-zinc-400">
          {lastRunAt ? (
            <>
              <span className="hidden sm:inline">Ultimo sync: </span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                hace {formatDistanceToNow(lastRunAt, { locale: es })}
              </span>
              {lastInvoiceSync?.lastRunStatus === "error" ? (
                <span className="ml-2 text-red-600 dark:text-red-400">⚠</span>
              ) : null}
            </>
          ) : (
            <span>Sin sincronizaciones. Presiona &quot;Sync ahora&quot;.</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <SyncButton />
        <LogoutButton />
      </div>
    </header>
  );
};
