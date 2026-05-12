"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { useToast } from "@/components/ui/toast";
import {
  googleMapsUrl,
  mailtoLink,
  odooContactUrl,
  telLink,
  whatsappLink,
} from "@/lib/contact-links";

interface ContactCardProps {
  partnerId: number;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  vat: string | null;
  country: string | null;
  city: string | null;
  odooBaseUrl: string | null;
}

export const ContactCard = ({
  partnerId,
  name,
  email,
  phone,
  mobile,
  vat,
  country,
  city,
  odooBaseUrl,
}: ContactCardProps) => {
  const { show } = useToast();
  const primaryPhone = mobile ?? phone;
  const wa = whatsappLink(
    primaryPhone,
    country,
    `Hola ${name}, le escribimos de Greensun para seguimiento.`,
  );
  const waPromo = whatsappLink(
    primaryPhone,
    country,
    `Hola ${name}, tenemos una promocion especial para usted en Greensun.`,
  );
  const waBlank = whatsappLink(primaryPhone, country);
  const tel = telLink(primaryPhone);
  const mail = mailtoLink(email);
  const mailFollowup = mailtoLink(
    email,
    "Seguimiento desde Greensun",
    `Hola ${name},\n\nEsperamos se encuentre bien. Notamos que no ha realizado compras recientes y queriamos saber si hay algo en lo que podamos asistirle.\n\nQuedamos atentos a su respuesta.\n\nSaludos,\nEquipo Greensun`,
  );
  const odoo = odooContactUrl(partnerId, odooBaseUrl ?? undefined);
  const maps = googleMapsUrl(city, country);

  const copyContactBlock = async () => {
    const lines = [
      name,
      vat ? `RNC: ${vat}` : null,
      email,
      primaryPhone,
      [city, country].filter(Boolean).join(", "),
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      show("Contacto copiado al portapapeles", "success");
    } catch {
      show("No se pudo copiar", "error");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Datos y acciones</CardTitle>
        <Button variant="ghost" size="sm" onClick={copyContactBlock}>
          ⧉ Copiar bloque
        </Button>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        <Field label="Email">
          {email ? (
            <div className="flex items-center gap-1">
              <a
                href={mail!}
                className="font-medium text-sky-700 hover:underline dark:text-sky-400"
              >
                {email}
              </a>
              <CopyButton value={email} label="Email copiado" />
            </div>
          ) : (
            <span className="text-zinc-400">Sin email</span>
          )}
        </Field>

        <Field label="Telefono / Movil">
          {primaryPhone ? (
            <div className="flex items-center gap-1">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {primaryPhone}
              </span>
              <CopyButton value={primaryPhone} label="Telefono copiado" />
            </div>
          ) : (
            <span className="text-zinc-400">Sin telefono</span>
          )}
        </Field>

        {vat ? (
          <Field label="RNC / VAT">
            <div className="flex items-center gap-1">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{vat}</span>
              <CopyButton value={vat} label="RNC copiado" />
            </div>
          </Field>
        ) : null}

        {country || city ? (
          <Field label="Ubicacion">
            <div className="flex items-center gap-2">
              <span>
                {[city, country].filter(Boolean).join(", ")}
              </span>
              {maps ? (
                <a
                  href={maps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-700 hover:underline dark:text-sky-400"
                >
                  Ver en Google Maps →
                </a>
              ) : null}
            </div>
          </Field>
        ) : null}

        <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Acciones rapidas
          </p>
          <div className="flex flex-wrap gap-2">
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer">
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500"
                >
                  💬 WhatsApp con plantilla
                </Button>
              </a>
            ) : null}
            {waBlank ? (
              <a href={waBlank} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm">
                  💬 WhatsApp en blanco
                </Button>
              </a>
            ) : null}
            {waPromo ? (
              <a href={waPromo} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm">
                  🎁 Plantilla promo
                </Button>
              </a>
            ) : null}
            {mail ? (
              <a href={mailFollowup ?? mail}>
                <Button variant="secondary" size="sm">
                  ✉ Email con plantilla
                </Button>
              </a>
            ) : null}
            {tel ? (
              <a href={tel}>
                <Button variant="secondary" size="sm">
                  ☎ Llamar
                </Button>
              </a>
            ) : null}
            {odoo ? (
              <a href={odoo} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm">
                  ↗ Abrir en Odoo
                </Button>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
      {label}
    </span>
    <div className="text-sm">{children}</div>
  </div>
);
