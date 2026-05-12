import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appConfig } from "@/lib/db/schema";
import { env } from "@/lib/config/env";

export interface AppSettings {
  inactivityThresholdDays: number;
  cadenceOverdueMultiplier: number;
  revenueDeclineMinDropPct: number;
  revenueDeclinePeriodMonths: number;
  rfmWindowMonths: number;
}

const DEFAULTS = (): AppSettings => ({
  inactivityThresholdDays: env.INACTIVITY_DEFAULT_DAYS,
  cadenceOverdueMultiplier: 1.5,
  revenueDeclineMinDropPct: 20,
  revenueDeclinePeriodMonths: 3,
  rfmWindowMonths: 12,
});

const CONFIG_KEY = "app_settings_v1";

export const getAppSettings = async (): Promise<AppSettings> => {
  const rows = await db
    .select()
    .from(appConfig)
    .where(sql`${appConfig.key} = ${CONFIG_KEY}`)
    .limit(1);
  const stored = rows[0]?.value as Partial<AppSettings> | undefined;
  return { ...DEFAULTS(), ...(stored ?? {}) };
};

export const updateAppSettings = async (patch: Partial<AppSettings>): Promise<AppSettings> => {
  const current = await getAppSettings();
  const next = { ...current, ...patch };
  await db
    .insert(appConfig)
    .values({ key: CONFIG_KEY, value: next })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: { value: next, updatedAt: new Date() },
    });
  return next;
};
