import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";

export interface RevenueDeclineRow {
  partnerId: number;
  name: string;
  email: string | null;
  country: string | null;
  recentRevenueUsd: number;
  recentRevenueDop: number;
  previousRevenueUsd: number;
  previousRevenueDop: number;
  primaryCurrency: "USD" | "DOP";
  dropPct: number;
  recentInvoices: number;
  previousInvoices: number;
}

export type RevenueDeclineSort =
  | "drop_amount_desc"
  | "drop_pct_desc"
  | "recent_revenue_desc"
  | "previous_revenue_desc";

export interface DetectRevenueDeclineOptions {
  periodMonths?: number;
  minDropPct?: number;
  minPreviousRevenue?: number;
  limit?: number;
  country?: string;
  search?: string;
  salesperson?: string;
  sort?: RevenueDeclineSort;
}

const sortClause = (sort: RevenueDeclineSort | undefined): SQL => {
  switch (sort) {
    case "drop_pct_desc":
      return sql`(100 * (previous_norm - recent_norm) / NULLIF(previous_norm, 0)) DESC`;
    case "recent_revenue_desc":
      return sql`recent_norm DESC`;
    case "previous_revenue_desc":
      return sql`previous_norm DESC`;
    case "drop_amount_desc":
    default:
      return sql`(previous_norm - recent_norm) DESC`;
  }
};

export const detectRevenueDecline = async ({
  periodMonths = 3,
  minDropPct = 20,
  minPreviousRevenue = 100,
  limit = 1000,
  country,
  search,
  salesperson,
  sort,
}: DetectRevenueDeclineOptions = {}): Promise<RevenueDeclineRow[]> => {
  const countryClause = country ? sql`AND p.country = ${country}` : sql``;
  const searchClause = search
    ? sql`AND (p.name ILIKE ${"%" + search + "%"} OR p.email ILIKE ${"%" + search + "%"})`
    : sql``;
  const salespersonClause = salesperson
    ? sql`AND EXISTS (SELECT 1 FROM invoices ii WHERE ii.partner_id=p.id AND ii.salesperson_name=${salesperson})`
    : sql``;

  const rows = await db.execute<{
    partner_id: number;
    name: string;
    email: string | null;
    country: string | null;
    recent_usd: string;
    recent_dop: string;
    previous_usd: string;
    previous_dop: string;
    primary_currency: "USD" | "DOP" | null;
    drop_pct: string;
    recent_invoices: number;
    previous_invoices: number;
  }>(sql`
    WITH windows AS (
      SELECT
        p.id AS partner_id,
        p.name,
        p.email,
        p.country,
        SUM(CASE
          WHEN i.invoice_date >= CURRENT_DATE - (${periodMonths}::int * INTERVAL '1 month')
            AND i.currency_code='USD'
          THEN (CASE WHEN i.move_type='out_refund' THEN -i.amount_total::numeric ELSE i.amount_total::numeric END)
          ELSE 0 END) AS recent_usd,
        SUM(CASE
          WHEN i.invoice_date >= CURRENT_DATE - (${periodMonths}::int * INTERVAL '1 month')
            AND i.currency_code='DOP'
          THEN (CASE WHEN i.move_type='out_refund' THEN -i.amount_total::numeric ELSE i.amount_total::numeric END)
          ELSE 0 END) AS recent_dop,
        SUM(CASE
          WHEN i.invoice_date < CURRENT_DATE - (${periodMonths}::int * INTERVAL '1 month')
           AND i.invoice_date >= CURRENT_DATE - (${periodMonths * 2}::int * INTERVAL '1 month')
            AND i.currency_code='USD'
          THEN (CASE WHEN i.move_type='out_refund' THEN -i.amount_total::numeric ELSE i.amount_total::numeric END)
          ELSE 0 END) AS previous_usd,
        SUM(CASE
          WHEN i.invoice_date < CURRENT_DATE - (${periodMonths}::int * INTERVAL '1 month')
           AND i.invoice_date >= CURRENT_DATE - (${periodMonths * 2}::int * INTERVAL '1 month')
            AND i.currency_code='DOP'
          THEN (CASE WHEN i.move_type='out_refund' THEN -i.amount_total::numeric ELSE i.amount_total::numeric END)
          ELSE 0 END) AS previous_dop,
        SUM(CASE
          WHEN i.invoice_date >= CURRENT_DATE - (${periodMonths}::int * INTERVAL '1 month')
          THEN 1 ELSE 0 END)::int AS recent_invoices,
        SUM(CASE
          WHEN i.invoice_date < CURRENT_DATE - (${periodMonths}::int * INTERVAL '1 month')
           AND i.invoice_date >= CURRENT_DATE - (${periodMonths * 2}::int * INTERVAL '1 month')
          THEN 1 ELSE 0 END)::int AS previous_invoices,
        (SELECT i2.currency_code FROM invoices i2
          WHERE i2.partner_id=p.id AND i2.state='posted'
            AND i2.move_type IN ('out_invoice','out_refund')
          GROUP BY i2.currency_code ORDER BY COUNT(*) DESC LIMIT 1) AS primary_currency
      FROM partners p
      INNER JOIN invoices i ON i.partner_id = p.id
        AND i.move_type IN ('out_invoice', 'out_refund')
        AND i.state = 'posted'
      WHERE p.active = true AND p.customer_rank > 0
      ${countryClause}
      ${searchClause}
      ${salespersonClause}
      GROUP BY p.id, p.name, p.email, p.country
    ),
    normalized AS (
      SELECT *,
        (recent_usd + recent_dop/60.0) AS recent_norm,
        (previous_usd + previous_dop/60.0) AS previous_norm
      FROM windows
    )
    SELECT
      partner_id,
      name,
      email,
      country,
      recent_usd::text AS recent_usd,
      recent_dop::text AS recent_dop,
      previous_usd::text AS previous_usd,
      previous_dop::text AS previous_dop,
      primary_currency,
      (100 * (previous_norm - recent_norm) / NULLIF(previous_norm, 0))::text AS drop_pct,
      recent_invoices,
      previous_invoices
    FROM normalized
    WHERE previous_norm >= ${minPreviousRevenue}::numeric
      AND (100 * (previous_norm - recent_norm) / NULLIF(previous_norm, 0)) >= ${minDropPct}::numeric
    ORDER BY ${sortClause(sort)}
    LIMIT ${limit}
  `);

  return rows.map((r) => ({
    partnerId: r.partner_id,
    name: r.name,
    email: r.email,
    country: r.country,
    recentRevenueUsd: Number(r.recent_usd ?? 0),
    recentRevenueDop: Number(r.recent_dop ?? 0),
    previousRevenueUsd: Number(r.previous_usd ?? 0),
    previousRevenueDop: Number(r.previous_dop ?? 0),
    primaryCurrency: r.primary_currency ?? "DOP",
    dropPct: Number(r.drop_pct ?? 0),
    recentInvoices: r.recent_invoices,
    previousInvoices: r.previous_invoices,
  }));
};
