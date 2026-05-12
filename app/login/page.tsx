import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth/guard";
import { LoginForm } from "@/components/auth/login-form";

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await isAuthenticated()) redirect("/dashboard");
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Greensun</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Panel de seguimiento de clientes Odoo
          </p>
        </div>
        <LoginForm redirectTo={next ?? "/dashboard"} />
      </div>
    </main>
  );
}
