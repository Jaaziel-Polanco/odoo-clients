import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { env } from "@/lib/config/env";

/**
 * admin: acceso total (el usuario historico del sistema).
 * employee: solo seguimiento de clientes inactivos, sin data economica.
 */
export type UserRole = "admin" | "employee";

export interface SessionData {
  authenticated?: boolean;
  role?: UserRole;
  loggedInAt?: number;
}

export const SESSION_COOKIE_NAME = "greensun-session";

const cookieSecure =
  env.COOKIE_SECURE ?? env.NODE_ENV === "production";

export const sessionOptions: SessionOptions = {
  password: env.SESSION_SECRET,
  cookieName: SESSION_COOKIE_NAME,
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure,
    path: "/",
    maxAge: 60 * 60 * 12,
  },
};

export const getSession = async () => {
  const store = await cookies();
  return getIronSession<SessionData>(store, sessionOptions);
};

const constantTimeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
};

/**
 * Resuelve el rol a partir del password. Evalua ambas comparaciones siempre
 * para no filtrar cual coincidio por tiempo de respuesta. Admin gana si ambos
 * passwords estuvieran configurados iguales.
 */
export const resolveRole = (candidate: string): UserRole | null => {
  const isAdmin = constantTimeEqual(candidate, env.APP_PASSWORD);
  const isEmployee =
    env.EMPLOYEE_PASSWORD !== undefined &&
    constantTimeEqual(candidate, env.EMPLOYEE_PASSWORD);
  if (isAdmin) return "admin";
  if (isEmployee) return "employee";
  return null;
};

export const verifyAppPassword = (candidate: string) =>
  resolveRole(candidate) !== null;
