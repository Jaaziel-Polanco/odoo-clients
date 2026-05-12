"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppSettings } from "@/lib/domain/config/app-settings";

interface SettingsFormProps {
  initial: AppSettings;
}

export const SettingsForm = ({ initial }: SettingsFormProps) => {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setFeedback({ ok: false, msg: json.error ?? "Error guardando" });
        return;
      }
      setFeedback({ ok: true, msg: "Configuracion guardada" });
      router.refresh();
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : String(err) });
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <Field
        label="Umbral de inactividad (dias)"
        help="Numero de dias sin compra para considerar un cliente inactivo."
      >
        <Input
          type="number"
          min={1}
          value={values.inactivityThresholdDays}
          onChange={(e) => update("inactivityThresholdDays", Number(e.target.value))}
        />
      </Field>

      <Field
        label="Multiplicador de cadencia"
        help="Atraso = X * cadencia normal. 1.5 = 50% mas tarde de lo habitual."
      >
        <Input
          type="number"
          min={1}
          step={0.1}
          value={values.cadenceOverdueMultiplier}
          onChange={(e) => update("cadenceOverdueMultiplier", Number(e.target.value))}
        />
      </Field>

      <Field
        label="Periodo revenue decline (meses)"
        help="Compara ultimos N meses vs N meses previos."
      >
        <Input
          type="number"
          min={1}
          value={values.revenueDeclinePeriodMonths}
          onChange={(e) => update("revenueDeclinePeriodMonths", Number(e.target.value))}
        />
      </Field>

      <Field
        label="Minima caida revenue (%)"
        help="Solo muestra clientes con caida >= este %."
      >
        <Input
          type="number"
          min={0}
          max={100}
          value={values.revenueDeclineMinDropPct}
          onChange={(e) => update("revenueDeclineMinDropPct", Number(e.target.value))}
        />
      </Field>

      <Field
        label="Ventana RFM (meses)"
        help="Periodo considerado para calcular Recencia/Frecuencia/Monto."
      >
        <Input
          type="number"
          min={1}
          value={values.rfmWindowMonths}
          onChange={(e) => update("rfmWindowMonths", Number(e.target.value))}
        />
      </Field>

      <div className="sm:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Guardar configuracion"}
        </Button>
        {feedback ? (
          <span
            className={
              feedback.ok
                ? "text-sm text-emerald-600 dark:text-emerald-400"
                : "text-sm text-red-600 dark:text-red-400"
            }
          >
            {feedback.msg}
          </span>
        ) : null}
      </div>
    </form>
  );
};

const Field = ({
  label,
  help,
  children,
}: {
  label: string;
  help: string;
  children: React.ReactNode;
}) => (
  <label className="space-y-1.5">
    <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
      {label}
    </span>
    {children}
    <span className="block text-xs text-zinc-500 dark:text-zinc-400">{help}</span>
  </label>
);
