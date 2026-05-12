"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  children: ReactNode;
  className?: string;
}

export const Sheet = ({
  open,
  onClose,
  side = "left",
  children,
  className,
}: SheetProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d.addEventListener("cancel", onCancel);
    return () => d.removeEventListener("cancel", onCancel);
  }, [onClose]);

  const onBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={onBackdropClick}
      className={cn(
        "fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/40 backdrop:backdrop-blur-sm open:flex",
        side === "right" ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "flex h-full w-72 flex-col overflow-y-auto border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950",
          side === "left" ? "border-r" : "border-l",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </dialog>
  );
};
