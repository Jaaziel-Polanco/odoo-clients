import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export interface SalesOverview {
  totalCustomers: number;
  customersWithInvoices: number;
  totalInvoices: number;
  lifetime: { usd: number; dop: number };
  last30: { usd: number; dop: number };
  last90: { usd: number; dop: number };
}

export interface RevenueByMonth {
  month: string;
  usd: number;
  dop: number;
}

export const getSalesOverview = async (): Promise<SalesOverview> => {
  const rows = await db.execute<{
    total_customers: number;
    customers_with_invoices: number;
    total_invoices: number;
    lifetime_usd: string;
    lifetime_dop: string;
    revenue_30_usd: string;
    revenue_30_dop: string;
    revenue_90_usd: string;
    revenue_90_dop: string;
  }>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM partners WHERE active = true AND customer_rank > 0) AS total_customers,
      (SELECT COUNT(DISTINCT partner_id)::int FROM invoices
         WHERE move_type IN ('out_invoice','out_refund') AND state = 'posted') AS customers_with_invoices,
      (SELECT COUNT(*)::int FROM invoices
         WHERE move_type IN ('out_invoice','out_refund') AND state = 'posted') AS total_invoices,
      COALESCE((SELECT SUM(CASE WHEN currency_code='USD' THEN
         (CASE WHEN move_type='out_refund' THEN -amount_total::numeric ELSE amount_total::numeric END)
         ELSE 0 END)::text FROM invoices WHERE move_type IN ('out_invoice','out_refund') AND state = 'posted'), '0') AS lifetime_usd,
      COALESCE((SELECT SUM(CASE WHEN currency_code='DOP' THEN
         (CASE WHEN move_type='out_refund' THEN -amount_total::numeric ELSE amount_total::numeric END)
         ELSE 0 END)::text FROM invoices WHERE move_type IN ('out_invoice','out_refund') AND state = 'posted'), '0') AS lifetime_dop,
      COALESCE((SELECT SUM(CASE WHEN currency_code='USD' THEN
         (CASE WHEN move_type='out_refund' THEN -amount_total::numeric ELSE amount_total::numeric END)
         ELSE 0 END)::text FROM invoices WHERE move_type IN ('out_invoice','out_refund') AND state = 'posted'
         AND invoice_date >= CURRENT_DATE - INTERVAL '30 days'), '0') AS revenue_30_usd,
      COALESCE((SELECT SUM(CASE WHEN currency_code='DOP' THEN
         (CASE WHEN move_type='out_refund' THEN -amount_total::numeric ELSE amount_total::numeric END)
         ELSE 0 END)::text FROM invoices WHERE move_type IN ('out_invoice','out_refund') AND state = 'posted'
         AND invoice_date >= CURRENT_DATE - INTERVAL '30 days'), '0') AS revenue_30_dop,
      COALESCE((SELECT SUM(CASE WHEN currency_code='USD' THEN
         (CASE WHEN move_type='out_refund' THEN -amount_total::numeric ELSE amount_total::numeric END)
         ELSE 0 END)::text FROM invoices WHERE move_type IN ('out_invoice','out_refund') AND state = 'posted'
         AND invoice_date >= CURRENT_DATE - INTERVAL '90 days'), '0') AS revenue_90_usd,
      COALESCE((SELECT SUM(CASE WHEN currency_code='DOP' THEN
         (CASE WHEN move_type='out_refund' THEN -amount_total::numeric ELSE amount_total::numeric END)
         ELSE 0 END)::text FROM invoices WHERE move_type IN ('out_invoice','out_refund') AND state = 'posted'
         AND invoice_date >= CURRENT_DATE - INTERVAL '90 days'), '0') AS revenue_90_dop
  `);
  const r = rows[0];
  return {
    totalCustomers: r?.total_customers ?? 0,
    customersWithInvoices: r?.customers_with_invoices ?? 0,
    totalInvoices: r?.total_invoices ?? 0,
    lifetime: { usd: Number(r?.lifetime_usd ?? 0), dop: Number(r?.lifetime_dop ?? 0) },
    last30: { usd: Number(r?.revenue_30_usd ?? 0), dop: Number(r?.revenue_30_dop ?? 0) },
    last90: { usd: Number(r?.revenue_90_usd ?? 0), dop: Number(r?.revenue_90_dop ?? 0) },
  };
};

export const getRevenueByMonth = async (months = 12): Promise<RevenueByMonth[]> => {
  const rows = await db.execute<{ month: string; usd: string; dop: string }>(sql`
    WITH series AS (
      SELECT generate_series(
        date_trunc('month', CURRENT_DATE - (${months}::int * INTERVAL '1 month')),
        date_trunc('month', CURRENT_DATE),
        INTERVAL '1 month'
      )::date AS month
    )
    SELECT
      to_char(s.month, 'YYYY-MM') AS month,
      COALESCE(SUM(CASE WHEN i.currency_code='USD' THEN
        (CASE WHEN i.move_type='out_refund' THEN -i.amount_total::numeric ELSE i.amount_total::numeric END)
        ELSE 0 END), 0)::text AS usd,
      COALESCE(SUM(CASE WHEN i.currency_code='DOP' THEN
        (CASE WHEN i.move_type='out_refund' THEN -i.amount_total::numeric ELSE i.amount_total::numeric END)
        ELSE 0 END), 0)::text AS dop
    FROM series s
    LEFT JOIN invoices i ON date_trunc('month', i.invoice_date)::date = s.month
      AND i.move_type IN ('out_invoice','out_refund')
      AND i.state = 'posted'
    GROUP BY s.month
    ORDER BY s.month
  `);
  return rows.map((r) => ({
    month: r.month,
    usd: Number(r.usd ?? 0),
    dop: Number(r.dop ?? 0),
  }));
};
