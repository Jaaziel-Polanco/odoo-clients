import cron from "node-cron";
import { env } from "@/lib/config/env";
import { runFullSync } from "./sync-service";

let scheduled: ReturnType<typeof cron.schedule> | null = null;
let running = false;

export const startSyncScheduler = () => {
  if (!env.SYNC_CRON_ENABLED) {
    console.info("[sync] cron deshabilitado (SYNC_CRON_ENABLED=false)");
    return;
  }
  if (scheduled) return;
  if (!cron.validate(env.SYNC_CRON)) {
    console.error(`[sync] expresion cron invalida: ${env.SYNC_CRON}`);
    return;
  }
  scheduled = cron.schedule(env.SYNC_CRON, async () => {
    if (running) {
      console.warn("[sync] sync previo aun corre, salto este tick");
      return;
    }
    running = true;
    try {
      const result = await runFullSync();
      console.info("[sync] cron ok", {
        partners: result.partners.recordsProcessed,
        invoices: result.invoices.recordsProcessed,
      });
    } catch (err) {
      console.error("[sync] cron error", err);
    } finally {
      running = false;
    }
  });
  console.info(`[sync] cron iniciado: ${env.SYNC_CRON}`);
};

export const stopSyncScheduler = () => {
  scheduled?.stop();
  scheduled = null;
};

export const isSyncRunning = () => running;
