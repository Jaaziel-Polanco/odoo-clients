import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/guard";
import {
  getAppSettings,
  updateAppSettings,
} from "@/lib/domain/config/app-settings";

const patchSchema = z.object({
  inactivityThresholdDays: z.number().int().positive().max(3650).optional(),
  cadenceOverdueMultiplier: z.number().positive().max(100).optional(),
  revenueDeclineMinDropPct: z.number().min(0).max(100).optional(),
  revenueDeclinePeriodMonths: z.number().int().positive().max(120).optional(),
  rfmWindowMonths: z.number().int().positive().max(120).optional(),
});

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAuth();
  try {
    const settings = await getAppSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  await requireAuth();
  try {
    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.message },
        { status: 400 },
      );
    }
    const settings = await updateAppSettings(parsed.data);
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
