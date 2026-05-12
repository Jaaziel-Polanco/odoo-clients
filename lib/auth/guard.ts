import { redirect } from "next/navigation";
import { getSession } from "./session";

export const requireAuth = async (): Promise<void> => {
  const session = await getSession();
  if (!session.authenticated) redirect("/login");
};

export const isAuthenticated = async (): Promise<boolean> => {
  const session = await getSession();
  return Boolean(session.authenticated);
};
