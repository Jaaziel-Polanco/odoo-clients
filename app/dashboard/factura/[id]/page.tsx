import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardValue,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvoiceLinesTable } from "@/components/sales/invoice-lines-table";
import { getInvoiceDetail } from "@/lib/domain/sales/invoice-detail";
import { env } from "@/lib/config/env";
import { fmtDate, fmtMoney } from "@/lib/format";
import { odooContactUrl } from "@/lib/contact-links";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const moveTypeLabel: Record<string, string> = {
  out_invoice: "Factura",
  out_refund: "Nota credito",
  in_invoice: "Factura proveedor",
  in_refund: "Nota credito proveedor",
};

const paymentTone = (
  state: string | null,
): "success" | "warning" | "danger" | "neutral" | "info" => {
  if (state === "paid") return "success";
  if (state === "partial") return "warning";
  if (state === "in_payment") return "info";
  if (state === "not_paid") return "danger";
  return "neutral";
};

const paymentLabel: Record<string, string> = {
  paid: "Pagada",
  partial: "Parcial",
  in_payment: "En pago",
  not_paid: "No pagada",
  reversed: "Revertida",
  invoicing_legacy: "Legacy",
};

export default async function InvoicePage({ params }: PageProps) {
  const { id } = await params;
  const invoiceId = Number(id);
  if (!Number.isFinite(invoiceId)) notFound();

  const invoice = await getInvoiceDetail(invoiceId);
  if (!invoice) notFound();

  const currency = (invoice.currencyCode === "USD" ? "USD" : "DOP") as "USD" | "DOP";
  const odooBase = env.ODOO_WEB_URL ?? env.ODOO_URL;
  const odooInvoiceUrl = `${odooBase.replace(/\/$/, "")}/odoo?action=&model=account.move&view_type=form&id=${invoice.id}`;
  const odooPartnerUrl = odooContactUrl(invoice.partnerId, odooBase);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/cliente/${invoice.partnerId}`}
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Volver al cliente
        </Link>
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{invoice.name}</h1>
          <Badge tone={invoice.moveType === "out_refund" ? "warning" : "neutral"}>
            {moveTypeLabel[invoice.moveType] ?? invoice.moveType}
          </Badge>
          <Badge tone={paymentTone(invoice.paymentState)}>
            {invoice.paymentState
              ? paymentLabel[invoice.paymentState] ?? invoice.paymentState
              : "—"}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Cliente:{" "}
          <Link
            href={`/dashboard/cliente/${invoice.partnerId}`}
            className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
          >
            {invoice.partnerName}
          </Link>
          {invoice.partnerEmail ? ` · ${invoice.partnerEmail}` : null}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Fecha emision</CardTitle>
            <CardValue className="text-base">{fmtDate(invoice.invoiceDate)}</CardValue>
          </CardHeader>
          <CardFooter>
            {invoice.invoiceDateDue
              ? `Vence ${fmtDate(invoice.invoiceDateDue)}`
              : "Sin vencimiento"}
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Subtotal</CardTitle>
            <CardValue className="text-base">
              {fmtMoney(invoice.amountUntaxed, currency)}
            </CardValue>
          </CardHeader>
          <CardFooter>
            Impuestos: {fmtMoney(invoice.amountTotal - invoice.amountUntaxed, currency)}
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total</CardTitle>
            <CardValue className="text-base">
              {fmtMoney(invoice.amountTotal, currency)}
            </CardValue>
          </CardHeader>
          <CardFooter>{currency}</CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pendiente</CardTitle>
            <CardValue
              className={
                invoice.amountResidual > 0
                  ? "text-base text-amber-600 dark:text-amber-400"
                  : "text-base text-emerald-600 dark:text-emerald-400"
              }
            >
              {invoice.amountResidual > 0
                ? fmtMoney(invoice.amountResidual, currency)
                : "Cobrada"}
            </CardValue>
          </CardHeader>
          <CardFooter>{invoice.salespersonName ?? "Sin vendedor"}</CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Lineas ({invoice.lines.filter((l) => l.displayType === "product").length}{" "}
            productos)
          </CardTitle>
          <div className="flex gap-2">
            <a href={odooInvoiceUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm">
                ↗ Abrir en Odoo
              </Button>
            </a>
            {odooPartnerUrl ? (
              <a href={odooPartnerUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm">
                  Cliente en Odoo
                </Button>
              </a>
            ) : null}
          </div>
        </CardHeader>
        {invoice.linesError ? (
          <div className="mx-6 mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            No se pudo cargar las lineas desde Odoo: {invoice.linesError}
          </div>
        ) : null}
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          <InvoiceLinesTable lines={invoice.lines} currency={currency} />
        </div>
        <div className="border-t border-zinc-100 px-6 py-3 dark:border-zinc-800">
          <dl className="ml-auto w-full max-w-xs space-y-1 text-sm">
            <Row label="Subtotal">{fmtMoney(invoice.amountUntaxed, currency)}</Row>
            <Row label="Impuestos">
              {fmtMoney(invoice.amountTotal - invoice.amountUntaxed, currency)}
            </Row>
            <Row label="Total" emphasis>
              {fmtMoney(invoice.amountTotal, currency)}
            </Row>
            {invoice.amountResidual > 0 ? (
              <Row label="Pendiente">
                {fmtMoney(invoice.amountResidual, currency)}
              </Row>
            ) : null}
          </dl>
        </div>
      </Card>
    </div>
  );
}

const Row = ({
  label,
  emphasis,
  children,
}: {
  label: string;
  emphasis?: boolean;
  children: React.ReactNode;
}) => (
  <div
    className={
      emphasis
        ? "flex items-center justify-between border-t border-zinc-200 pt-1 text-base font-semibold dark:border-zinc-800"
        : "flex items-center justify-between text-zinc-600 dark:text-zinc-400"
    }
  >
    <dt>{label}</dt>
    <dd className="tabular-nums">{children}</dd>
  </div>
);
