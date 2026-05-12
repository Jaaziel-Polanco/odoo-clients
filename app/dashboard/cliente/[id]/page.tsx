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
import { CustomerRevenueChart } from "@/components/sales/customer-revenue-chart";
import { CustomerInvoicesTable } from "@/components/sales/customer-invoices-table";
import { ContactCard } from "@/components/sales/contact-card";
import { getCustomerDetail } from "@/lib/domain/sales/customer-detail";
import { env } from "@/lib/config/env";
import { fmtDate, fmtMoney, fmtMoneyMulti, fmtNumber, fmtRelative } from "@/lib/format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const partnerId = Number(id);
  if (!Number.isFinite(partnerId)) notFound();

  const detail = await getCustomerDetail(partnerId);
  if (!detail) notFound();

  const { metrics } = detail;
  const odooBaseUrl = env.ODOO_WEB_URL ?? env.ODOO_URL;
  const inactivityTone =
    metrics.daysSinceLast == null
      ? "neutral"
      : metrics.daysSinceLast > 365
        ? "danger"
        : metrics.daysSinceLast > 90
          ? "warning"
          : "success";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Volver al dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {detail.name}
          {detail.isCompany ? (
            <Badge className="ml-2" tone="info">
              Empresa
            </Badge>
          ) : null}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {[detail.country, detail.city].filter(Boolean).join(" / ") || "Sin ubicacion"}
          {detail.vat ? ` · RNC ${detail.vat}` : null}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Ultima compra</CardTitle>
            <CardValue>
              <Badge tone={inactivityTone}>{fmtRelative(metrics.daysSinceLast)}</Badge>
            </CardValue>
          </CardHeader>
          <CardFooter>{fmtDate(metrics.lastInvoiceDate)}</CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Facturas / Notas</CardTitle>
            <CardValue>
              {fmtNumber(metrics.invoiceCount)}
              {metrics.refundCount > 0 ? (
                <span className="ml-2 text-sm text-zinc-500">
                  / {fmtNumber(metrics.refundCount)} NC
                </span>
              ) : null}
            </CardValue>
          </CardHeader>
          <CardFooter>
            {metrics.pendingCount > 0
              ? `${fmtNumber(metrics.pendingCount)} pendientes de pago`
              : "Todo cobrado"}
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total facturado</CardTitle>
            <CardValue className="text-base">
              {fmtMoneyMulti({
                usd: metrics.totalRevenueUsd,
                dop: metrics.totalRevenueDop,
              })}
            </CardValue>
          </CardHeader>
          <CardFooter>
            {metrics.firstInvoiceDate
              ? `Desde ${fmtDate(metrics.firstInvoiceDate)}`
              : "Sin historial"}
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Saldo pendiente</CardTitle>
            <CardValue className="text-base">
              {fmtMoneyMulti({
                usd: metrics.outstandingUsd,
                dop: metrics.outstandingDop,
              })}
            </CardValue>
          </CardHeader>
          <CardFooter>Facturas no cobradas</CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue por mes (24 meses)</CardTitle>
          </CardHeader>
          <div className="px-2 pb-4 sm:px-6">
            <CustomerRevenueChart data={detail.monthly} />
          </div>
        </Card>
        <ContactCard
          partnerId={detail.partnerId}
          name={detail.name}
          email={detail.email}
          phone={detail.phone}
          mobile={detail.mobile}
          vat={detail.vat}
          country={detail.country}
          city={detail.city}
          odooBaseUrl={odooBaseUrl}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comportamiento de compra</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-3 px-6 pb-6 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Cadencia promedio">
            {metrics.avgGapDays
              ? `${Math.round(metrics.avgGapDays)} dias entre compras`
              : "—"}
          </Metric>
          <Metric label="Ticket promedio (USD)">
            {metrics.avgTicketUsd ? fmtMoney(metrics.avgTicketUsd, "USD") : "—"}
          </Metric>
          <Metric label="Ticket promedio (DOP)">
            {metrics.avgTicketDop ? fmtMoney(metrics.avgTicketDop, "DOP") : "—"}
          </Metric>
          <Metric label="Moneda principal">{metrics.primaryCurrency}</Metric>
          <Metric label="Vendedor habitual">
            {metrics.primarySalesperson ?? "—"}
          </Metric>
          <Metric label="Cliente desde">
            {detail.createDate
              ? fmtDate(detail.createDate.toISOString().slice(0, 10))
              : "—"}
          </Metric>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de facturas ({detail.invoices.length})</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <CustomerInvoicesTable data={detail.invoices} />
        </div>
      </Card>
    </div>
  );
}

const Metric = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-0.5 rounded-md border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
    <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
    <span className="font-medium text-zinc-900 dark:text-zinc-100">{children}</span>
  </div>
);
