import { cn } from "@/lib/cn";

interface InfoHintProps {
  text: string;
  className?: string;
}

export const InfoHint = ({ text, className }: InfoHintProps) => (
  <span
    title={text}
    aria-label={text}
    className={cn(
      "inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-300 text-[10px] font-bold text-zinc-500 cursor-help dark:border-zinc-700 dark:text-zinc-400",
      className,
    )}
  >
    ?
  </span>
);
