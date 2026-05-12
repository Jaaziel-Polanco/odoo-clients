import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { env } from "@/lib/config/env";

export interface SessionData {
  authenticated?: boolean;
  loggedInAt?: number;
}

export const SESSION_COOKIE_NAME = "greensun-session";

export const sessionOptions: SessionOptions = {
  password: env.SESSION_SECRET,
  cookieName: SESSION_COOKIE_NAME,
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
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

export const verifyAppPassword = (candidate: string) =>
  constantTimeEqual(candidate, env.APP_PASSWORD);
