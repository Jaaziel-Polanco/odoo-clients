"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  pickingId: number;
  name: string;
}

type Phase = "idle" | "confirm" | "loading" | "error";

export const CancelPickingButton = ({ pickingId, name }: Props) => {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const doCancel = async () => {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/odoo/cancel-picking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickingId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Error ${res.status}`);
      }
      // exito: refresca el listado (la entrega ya no aparecera)
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  };

  if (phase === "loading") {
    return <span className="text-xs text-zinc-400">Cancelando…</span>;
  }

  if (phase === "confirm") {
    return (
      <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs text-zinc-500">¿Cancelar {name}?</span>
        <button
          onClick={doCancel}
          className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
        >
          Sí
        </button>
        <button
          onClick={() => setPhase("idle")}
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          No
        </button>
      </span>
    );
  }

  if (phase === "error") {
    return (
      <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setPhase("confirm")}
          className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/40"
        >
          Reintentar
        </button>
        <span className="max-w-[14rem] truncate text-xs text-red-500" title={error ?? ""}>
          {error}
        </span>
      </span>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setPhase("confirm");
      }}
      className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
    >
      Cancelar
    </button>
  );
};
