import { sql, eq, desc, and, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { invoices, partners } from "@/lib/db/schema";

export interface CustomerInvoice {
  id: number;
  name: string;
  invoiceDate: string | null;
  invoiceDateDue: string | null;
  amountTotal: number;
  amountResidual: number;
  currencyCode: string | null;
  moveType: string;
  paymentState: string | null;
  state: string;
  salespersonName: string | null;
}

export interface CustomerMonthlyRevenue {
  month: string;
  usd: number;
  dop: number;
  invoices: number;
}

export interface CustomerDetail {
  partnerId: number;
  name: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  vat: string | null;
  country: string | null;
  city: string | null;
  isCompany: boolean;
  createDate: Date | null;
  metrics: {
    firstInvoiceDate: string | null;
    lastInvoiceDate: string | null;
    daysSinceLast: number | null;
    invoiceCount: number;
    refundCount: number;
    pendingCount: number;
    totalRevenueUsd: number;
    totalRevenueDop: number;
    outstandingUsd: number;
    outstandingDop: number;
    avgGapDays: number | null;
    avgTicketUsd: number | null;
    avgTicketDop: number | null;
    primaryCurrency: "USD" | "DOP";
    primarySalesperson: string | null;
  };
  invoices: CustomerInvoice[];
  monthly: CustomerMonthlyRevenue[];
}

export const getCustomerDetail = async (partnerId: number): Promise<CustomerDetail | null> => {
  const partnerRow = await db
    .select()
    .from(partners)
    .where(eq(partners.id, partnerId))
    .limit(1);
  if (partnerRow.length === 0) return null;
  const p = partnerRow[0];

  const invs = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.partnerId, partnerId),
        inArray(invoices.moveType, ["out_invoice", "out_refund"]),
        eq(invoices.state, "posted"),
      ),
    )
    .orderBy(desc(invoices.invoiceDate));

  const invoicesMapped: CustomerInvoice[] = invs.map((i) => ({
    id: i.id,
    name: i.name,
    invoiceDate: i.invoiceDate,
    invoiceDateDue: i.invoiceDateDue,
    amountTotal: Number(i.amountTotal),
    amountResidual: Number(i.amountResidual),
    currencyCode: i.currencyCode,
    moveType: i.moveType,
    paymentState: i.paymentState,
    state: i.state,
    salespersonName: i.salespersonName,
  }));

  const metricsRows = await db.execute<{
    first_date: string | null;
    last_date: string | null;
    days_since_last: number | null;
    invoice_count: number;
    refund_count: number;
    pending_count: number;
    total_usd: string;
    total_dop: string;
    outstanding_usd: string;
    outstanding_dop: string;
    avg_gap: string | null;
    avg_ticket_usd: string | null;
    avg_ticket_dop: string | null;
    primary_currency: "USD" | "DOP" | null;
    primary_salesperson: string | null;
  }>(sql`
    WITH ordered AS (
      SELECT
        invoice_date,
        LAG(invoice_date) OVER (ORDER BY invoice_date) AS prev_date
      FROM invoices
      WHERE partner_id = ${partnerId}
        AND state='posted'
        AND move_type IN ('out_invoice','out_refund')
        AND invoice_date IS NOT NULL
    ),
    gaps AS (
      SELECT AVG((invoice_date - prev_date)::int)::numeric AS avg_gap
      FROM ordered
      WHERE prev_date IS NOT NULL
    )
    SELECT
      (SELECT MIN(invoice_date)::text FROM invoices
        WHERE partner_id=${partnerId} AND state='posted'
          AND move_type IN ('out_invoice','out_refund')) AS first_date,
      (SELECT MAX(invoice_date)::text FROM invoices
        WHERE partner_id=${partnerId} AND state='posted'
          AND move_type IN ('out_invoice','out_refund')) AS last_date,
      (SELECT (CURRENT_DATE - MAX(invoice_date))::int FROM invoices
        WHERE partner_id=${partnerId} AND state='posted'
          AND move_type IN ('out_invoice','out_refund')) AS days_since_last,
      (SELECT COUNT(*)::int FROM invoices
        WHERE partner_id=${partnerId} AND state='posted' AND move_type='out_invoice') AS invoice_count,
      (SELECT COUNT(*)::int FROM invoices
        WHERE partner_id=${partnerId} AND state='posted' AND move_type='out_refund') AS refund_count,
      (SELECT COUNT(*)::int FROM invoices
        WHERE partner_id=${partnerId} AND state='posted'
          AND move_type IN ('out_invoice','out_refund')
          AND amount_residual::numeric > 0) AS pending_count,
      COALESCE((SELECT SUM(CASE WHEN currency_code='USD' THEN
        (CASE WHEN move_type='out_refund' THEN -amount_total::numeric ELSE amount_total::numeric END)
        ELSE 0 END)::text FROM invoices
        WHERE partner_id=${partnerId} AND state='posted'
          AND move_type IN ('out_invoice','out_refund')), '0') AS total_usd,
      COALESCE((SELECT SUM(CASE WHEN currency_code='DOP' THEN
        (CASE WHEN move_type='out_refund' THEN -amount_total::numeric ELSE amount_total::numeric END)
        ELSE 0 END)::text FROM invoices
        WHERE partner_id=${partnerId} AND state='posted'
          AND move_type IN ('out_invoice','out_refund')), '0') AS total_dop,
      COALESCE((SELECT SUM(CASE WHEN currency_code='USD' THEN amount_residual::numeric ELSE 0 END)::text
        FROM invoices WHERE partner_id=${partnerId} AND state='posted'
          AND move_type='out_invoice'), '0') AS outstanding_usd,
      COALESCE((SELECT SUM(CASE WHEN currency_code='DOP' THEN amount_residual::numeric ELSE 0 END)::text
        FROM invoices WHERE partner_id=${partnerId} AND state='posted'
          AND move_type='out_invoice'), '0') AS outstanding_dop,
      (SELECT avg_gap::text FROM gaps) AS avg_gap,
      (SELECT AVG(amount_total::numeric)::text FROM invoices
        WHERE partner_id=${partnerId} AND state='posted'
          AND move_type='out_invoice' AND currency_code='USD') AS avg_ticket_usd,
      (SELECT AVG(amount_total::numeric)::text FROM invoices
        WHERE partner_id=${partnerId} AND state='posted'
          AND move_type='out_invoice' AND currency_code='DOP') AS avg_ticket_dop,
      (SELECT currency_code FROM invoices
        WHERE partner_id=${partnerId} AND state='posted'
          AND move_type IN ('out_invoice','out_refund')
        GROUP BY currency_code ORDER BY COUNT(*) DESC LIMIT 1) AS primary_currency,
      (SELECT salesperson_name FROM invoices
        WHERE partner_id=${partnerId} AND state='posted'
          AND salesperson_name IS NOT NULL
        GROUP BY salesperson_name ORDER BY COUNT(*) DESC LIMIT 1) AS primary_salesperson
  `);

  const m = metricsRows[0];

  const monthlyRows = await db.execute<{
    month: string;
    usd: string;
    dop: string;
    invoices: number;
  }>(sql`
    SELECT
      to_char(date_trunc('month', invoice_date), 'YYYY-MM') AS month,
      COALESCE(SUM(CASE WHEN currency_code='USD' THEN
        (CASE WHEN move_type='out_refund' THEN -amount_total::numeric ELSE amount_total::numeric END)
        ELSE 0 END), 0)::text AS usd,
      COALESCE(SUM(CASE WHEN currency_code='DOP' THEN
        (CASE WHEN move_type='out_refund' THEN -amount_total::numeric ELSE amount_total::numeric END)
        ELSE 0 END), 0)::text AS dop,
      COUNT(*)::int AS invoices
    FROM invoices
    WHERE partner_id=${partnerId}
      AND state='posted'
      AND move_type IN ('out_invoice','out_refund')
      AND invoice_date IS NOT NULL
      AND invoice_date >= CURRENT_DATE - INTERVAL '24 months'
    GROUP BY date_trunc('month', invoice_date)
    ORDER BY date_trunc('month', invoice_date)
  `);

  return {
    partnerId: p.id,
    name: p.name,
    displayName: p.displayName,
    email: p.email,
    phone: p.phone,
    mobile: p.mobile,
    vat: p.vat,
    country: p.country,
    city: p.city,
    isCompany: p.isCompany,
    createDate: p.createDate,
    metrics: {
      firstInvoiceDate: m?.first_date ?? null,
      lastInvoiceDate: m?.last_date ?? null,
      daysSinceLast: m?.days_since_last ?? null,
      invoiceCount: m?.invoice_count ?? 0,
      refundCount: m?.refund_count ?? 0,
      pendingCount: m?.pending_count ?? 0,
      totalRevenueUsd: Number(m?.total_usd ?? 0),
      totalRevenueDop: Number(m?.total_dop ?? 0),
      outstandingUsd: Number(m?.outstanding_usd ?? 0),
      outstandingDop: Number(m?.outstanding_dop ?? 0),
      avgGapDays: m?.avg_gap ? Number(m.avg_gap) : null,
      avgTicketUsd: m?.avg_ticket_usd ? Number(m.avg_ticket_usd) : null,
      avgTicketDop: m?.avg_ticket_dop ? Number(m.avg_ticket_dop) : null,
      primaryCurrency: (m?.primary_currency ?? "DOP") as "USD" | "DOP",
      primarySalesperson: m?.primary_salesperson ?? null,
    },
    invoices: invoicesMapped,
    monthly: monthlyRows.map((row) => ({
      month: row.month,
      usd: Number(row.usd ?? 0),
      dop: Number(row.dop ?? 0),
      invoices: row.invoices,
    })),
  };
};
