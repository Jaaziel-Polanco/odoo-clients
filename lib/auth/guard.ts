import { redirect } from "next/navigation";
import { getSession, type UserRole } from "./session";

/** Ruta de aterrizaje del empleado: su unica razon de entrar al sistema. */
export const EMPLOYEE_HOME = "/dashboard/inactivos";

export const requireAuth = async (): Promise<void> => {
  const session = await getSession();
  if (!session.authenticated) redirect("/login");
};

export const isAuthenticated = async (): Promise<boolean> => {
  const session = await getSession();
  return Boolean(session.authenticated);
};

/**
 * Rol de la sesion actual. Las sesiones creadas antes de existir los roles no
 * traen `role`; se asumen admin para no romper al usuario ya logueado.
 */
export const getRole = async (): Promise<UserRole | null> => {
  const session = await getSession();
  if (!session.authenticated) return null;
  return session.role ?? "admin";
};

export const isAdmin = async (): Promise<boolean> => (await getRole()) === "admin";

/**
 * Exige rol admin. Un empleado autenticado no ve un error: lo devolvemos a su
 * pantalla de trabajo. Sin sesion, al login.
 */
export const requireAdmin = async (): Promise<void> => {
  const role = await getRole();
  if (role === null) redirect("/login");
  if (role !== "admin") redirect(EMPLOYEE_HOME);
};
