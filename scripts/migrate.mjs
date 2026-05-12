import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL no esta definida");
  process.exit(1);
}

const folder = process.env.MIGRATIONS_FOLDER ?? "./lib/db/migrations";

const client = postgres(url, { max: 1 });
const db = drizzle(client);

try {
  console.log(`[migrate] aplicando migraciones desde ${folder}...`);
  await migrate(db, { migrationsFolder: folder });
  console.log("[migrate] migraciones aplicadas");
  process.exit(0);
} catch (err) {
  console.error("[migrate] fallo:", err);
  process.exit(1);
} finally {
  await client.end({ timeout: 5 });
}
