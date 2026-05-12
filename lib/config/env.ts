import { z } from "zod";

const envSchema = z.object({
  ODOO_URL: z.string().url().describe("Base URL del Odoo self-hosted"),
  ODOO_WEB_URL: z
    .string()
    .url()
    .optional()
    .describe("URL publica del Odoo para enlaces (default: ODOO_URL)"),
  ODOO_DB: z.string().min(1),
  ODOO_USERNAME: z.string().min(1),
  ODOO_API_KEY: z.string().min(1),

  DATABASE_URL: z.string().url(),

  APP_PASSWORD: z.string().min(4),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET debe tener al menos 32 caracteres"),

  INACTIVITY_DEFAULT_DAYS: z.coerce.number().int().positive().default(90),
  SYNC_CRON: z.string().default("5 * * * *"),
  SYNC_CRON_ENABLED: z
    .string()
    .default("true")
    .transform((v) => v.toLowerCase() === "true"),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

const STUB_ENV: Env = {
  ODOO_URL: "https://placeholder.invalid",
  ODOO_WEB_URL: undefined,
  ODOO_DB: "placeholder",
  ODOO_USERNAME: "placeholder",
  ODOO_API_KEY: "placeholder",
  DATABASE_URL: "postgres://placeholder@localhost:5432/placeholder",
  APP_PASSWORD: "placeholder",
  SESSION_SECRET: "x".repeat(32),
  INACTIVITY_DEFAULT_DAYS: 90,
  SYNC_CRON: "5 * * * *",
  SYNC_CRON_ENABLED: false,
  NODE_ENV: "production",
};

function loadEnv(): Env {
  if (isBuildPhase) {
    return STUB_ENV;
  }
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Variables de entorno invalidas. Copia .env.example a .env.local y completa:\n${issues}`,
    );
  }
  return parsed.data;
}

export const env = loadEnv();
