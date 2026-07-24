import { NextResponse, type NextRequest } from "next/server";
import { unsealData } from "iron-session";
import { SESSION_COOKIE_NAME, type SessionData } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/health"];

/**
 * Unicas rutas que puede tocar el rol employee. Todo lo demas (revenue, RFM,
 * cobranzas, auditoria, sync, configuracion...) queda fuera de su alcance.
 * El detalle de factura NO esta aqui a proposito: expone montos.
 */
const EMPLOYEE_ALLOWED_PATHS = [
  "/dashboard/inactivos",
  "/dashboard/cliente",
  "/dashboard/cadencia",
];

const EMPLOYEE_HOME = "/dashboard/inactivos";

const matchesPath = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

const isPublic = (pathname: string) => matchesPath(pathname, PUBLIC_PATHS);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return redirectToLogin(request);

  let data: SessionData | null = null;
  try {
    data = await unsealData<SessionData>(cookie, {
      password: process.env.SESSION_SECRET ?? "",
    });
    if (!data?.authenticated) return redirectToLogin(request);
  } catch {
    return redirectToLogin(request);
  }

  // Sesiones anteriores a los roles no traen `role`: se asumen admin.
  const role = data.role ?? "admin";
  if (role !== "admin" && !matchesPath(pathname, EMPLOYEE_ALLOWED_PATHS)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, error: "Sin permisos para esta operacion" },
        { status: 403 },
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = EMPLOYEE_HOME;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

const redirectToLogin = (request: NextRequest) => {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
};

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|next.svg|vercel.svg|.*\\.(?:png|jpg|svg|gif|ico)).*)",
  ],
};
