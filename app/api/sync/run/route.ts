import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { runFullSync } from "@/lib/sync/sync-service";

export const dynamic = "force-dynamic";

export async function POST() {
  await requireAuth();
  try {
    const result = await runFullSync();
    const hasError =
      result.partners.status === "error" ||
      result.invoices.status === "error" ||
      result.saleOrders.status === "error";
    return NextResponse.json(
      {
        ok: !hasError,
        partners: result.partners,
        invoices: result.invoices,
        saleOrders: result.saleOrders,
        error: hasError
          ? (result.partners.error ??
            result.invoices.error ??
            result.saleOrders.error)
          : undefined,
      },
      { status: hasError ? 502 : 200 },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
