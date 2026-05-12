import type { ReactNode } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { Header } from "@/components/shell/header";
import { ToastProvider } from "@/components/ui/toast";
import { requireAuth } from "@/lib/auth/guard";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireAuth();
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
