"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export const SyncButton = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [running, setRunning] = useState(false);
  const { show } = useToast();

  const onSync = async () => {
    if (running) return;
    setRunning(true);
    show("Sincronizando con Odoo...", "info");
    try {
      const res = await fetch("/api/sync/run", { method: "POST" });
      const json = (await res.json()) as {
        ok: boolean;
        partners?: { recordsProcessed: number };
        invoices?: { recordsProcessed: number };
        error?: string;
      };
      if (!res.ok || !json.ok) {
        show(json.error ?? "Sync fallo", "error");
        return;
      }
      show(
        `Sync OK: ${json.partners?.recordsProcessed ?? 0} clientes, ${json.invoices?.recordsProcessed ?? 0} facturas`,
        "success",
      );
      startTransition(() => router.refresh());
    } catch (err) {
      show(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={onSync}
      disabled={isPending || running}
    >
      {running ? "Sincronizando..." : "Sync ahora"}
    </Button>
  );
};
