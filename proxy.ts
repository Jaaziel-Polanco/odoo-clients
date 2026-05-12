import { NextResponse, type NextRequest } from "next/server";
import { unsealData } from "iron-session";
import { SESSION_COOKIE_NAME, type SessionData } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/health"];

const isPublic = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return redirectToLogin(request);

  try {
    const data = await unsealData<SessionData>(cookie, {
      password: process.env.SESSION_SECRET ?? "",
    });
    if (!data?.authenticated) return redirectToLogin(request);
  } catch {
    return redirectToLogin(request);
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
