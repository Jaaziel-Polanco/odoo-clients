"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { useToast } from "./toast";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export const CopyButton = ({ value, label, className, size = "sm" }: CopyButtonProps) => {
  const { show } = useToast();
  const [copied, setCopied] = useState(false);

  const onCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      show(`${label ?? "Copiado"}`, "success");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      show("No se pudo copiar", "error");
    }
  };

  return (
    <button
      onClick={onCopy}
      title={`Copiar ${label ?? "valor"}`}
      aria-label={`Copiar ${label ?? value}`}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
        size === "sm" ? "h-7 w-7 text-sm" : "h-9 w-9",
        className,
      )}
    >
      {copied ? "✓" : "⧉"}
    </button>
  );
};
