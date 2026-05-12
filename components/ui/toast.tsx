"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

type ToastTone = "info" | "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, tone: ToastTone = "info") => {
    const id = nextId++;
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  return (
    <ToastContext value={{ show }}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {items.map((t) => (
          <ToastBubble key={t.id} item={t} />
        ))}
      </div>
    </ToastContext>
  );
};

const TONE_STYLE: Record<ToastTone, string> = {
  info: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
  success: "bg-emerald-600 text-white",
  error: "bg-red-600 text-white",
};

const ToastBubble = ({ item }: { item: ToastItem }) => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setOpen(true));
  }, []);
  return (
    <div
      className={cn(
        "pointer-events-auto rounded-md px-4 py-3 text-sm shadow-lg transition-all duration-200",
        TONE_STYLE[item.tone],
        open ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0",
      )}
    >
      {item.message}
    </div>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
};
