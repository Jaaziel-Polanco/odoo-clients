import { NextResponse } from "next/server";
import { requireAuth, isAdmin } from "@/lib/auth/guard";
import { getSyncStatus } from "@/lib/sync/sync-service";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAuth();
  if (!(await isAdmin())) {
    return NextResponse.json(
      { ok: false, error: "Sin permisos para esta operacion" },
      { status: 403 },
    );
  }
  try {
    const rows = await getSyncStatus();
    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
