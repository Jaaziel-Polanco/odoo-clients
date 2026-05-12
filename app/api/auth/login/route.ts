import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, verifyAppPassword } from "@/lib/auth/session";

const bodySchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalido" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Password requerido" }, { status: 400 });
  }
  if (!verifyAppPassword(parsed.data.password)) {
    return NextResponse.json({ ok: false, error: "Password incorrecto" }, { status: 401 });
  }
  const session = await getSession();
  session.authenticated = true;
  session.loggedInAt = Date.now();
  await session.save();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ ok: true });
}
