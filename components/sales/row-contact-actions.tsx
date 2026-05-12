"use client";

import { cn } from "@/lib/cn";
import { whatsappLink, mailtoLink, telLink } from "@/lib/contact-links";

interface RowContactActionsProps {
  email: string | null;
  phone: string | null;
  mobile: string | null;
  country: string | null;
  customerName: string;
  className?: string;
}

const stop = (e: React.MouseEvent) => e.stopPropagation();

export const RowContactActions = ({
  email,
  phone,
  mobile,
  country,
  customerName,
  className,
}: RowContactActionsProps) => {
  const waNumber = mobile ?? phone;
  const wa = whatsappLink(
    waNumber,
    country,
    `Hola ${customerName}, le escribimos de Greensun para seguimiento.`,
  );
  const tel = telLink(waNumber);
  const mail = mailtoLink(email);

  if (!wa && !tel && !mail) {
    return (
      <span className="text-xs text-zinc-400 dark:text-zinc-600">—</span>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 opacity-50 transition group-hover:opacity-100 focus-within:opacity-100",
        className,
      )}
    >
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stop}
          title={`WhatsApp ${waNumber}`}
          aria-label={`WhatsApp ${customerName}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
        >
          <WhatsAppIcon />
        </a>
      ) : null}
      {mail ? (
        <a
          href={mail}
          onClick={stop}
          title={`Email ${email}`}
          aria-label={`Email ${customerName}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-sky-600 transition hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-950/40"
        >
          <MailIcon />
        </a>
      ) : null}
      {tel && !wa ? (
        <a
          href={tel}
          onClick={stop}
          title={`Llamar ${waNumber}`}
          aria-label={`Llamar a ${customerName}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <PhoneIcon />
        </a>
      ) : null}
    </div>
  );
};

const WhatsAppIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4 7.94 7.94 0 0 0 5.1 15.79L4 20l4.31-1.13a7.92 7.92 0 0 0 3.74.95h.01A7.93 7.93 0 0 0 20 11.9a7.87 7.87 0 0 0-2.4-5.58Zm-5.55 12.2a6.6 6.6 0 0 1-3.36-.92l-.24-.14-2.56.67.68-2.5-.16-.25a6.58 6.58 0 0 1 10.21-8.16 6.5 6.5 0 0 1 1.93 4.65 6.59 6.59 0 0 1-6.5 6.65Zm3.61-4.94c-.2-.1-1.17-.58-1.35-.64-.18-.07-.31-.1-.45.1-.13.2-.51.64-.62.77-.12.13-.23.15-.43.05a5.4 5.4 0 0 1-1.59-.99 6 6 0 0 1-1.1-1.37c-.12-.2-.01-.31.09-.41.09-.1.2-.23.3-.35.1-.12.13-.2.2-.33.06-.13.03-.25-.02-.35-.05-.1-.45-1.07-.62-1.47-.16-.39-.32-.34-.45-.34h-.38a.74.74 0 0 0-.53.25 2.22 2.22 0 0 0-.7 1.65 3.86 3.86 0 0 0 .8 2.05c.1.13 1.43 2.19 3.46 3.08.48.21.86.34 1.16.43.49.16.93.13 1.28.08.39-.06 1.17-.48 1.34-.94.16-.46.16-.85.12-.94-.05-.08-.18-.13-.38-.23Z" />
  </svg>
);

const MailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
  </svg>
);
