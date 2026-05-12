import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";

export interface TopAtRiskCustomer {
  partnerId: number;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  country: string | null;
  recentRevenueUsd: number;
  recentRevenueDop: number;
  lifetimeRevenueUsd: number;
  lifetimeRevenueDop: number;
  primaryCurrency: "USD" | "DOP";
  invoiceCount: number;
  lastInvoiceDate: string | null;
  daysSinceLast: number;
  riskScore: number;
  salespersonName: string | null;
}

export type TopRiskSort =
  | "risk_desc"
  | "recent_revenue_desc"
  | "lifetime_revenue_desc"
  | "days_desc"
  | "days_asc";

export interface TopAtRiskOptions {
  thresholdDays: number;
  windowMonths?: number;
  limit?: number;
  country?: string;
  search?: string;
  salesperson?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: TopRiskSort;
}

const sortClause = (
  sort: TopRiskSort | undefined,
  thresholdDays: number,
): SQL => {
  switch (sort) {
    case "recent_revenue_desc":
      return sql`(recent_usd + recent_dop / 60.0) DESC`;
    case "lifetime_revenue_desc":
      return sql`(lifetime_usd + lifetime_dop / 60.0) DESC`;
    case "days_desc":
      return sql`days_since_last DESC`;
    case "days_asc":
      return sql`days_since_last ASC`;
    case "risk_desc":
    default:
      return sql`((recent_usd + recent_dop/60.0) * (days_since_last::numeric / NULLIF(${thresholdDays}::numeric, 0))) DESC`;
  }
};

const dateClause = (dateFrom?: string, dateTo?: string): SQL => {
  if (!dateFrom && !dateTo) return sql``;
  const parts: SQL[] = [];
  if (dateFrom) parts.push(sql`last_invoice_date >= ${dateFrom}::date`);
  if (dateTo) parts.push(sql`last_invoice_date <= ${dateTo}::date`);
  return sql` AND (${sql.join(parts, sql` AND `)})`;
};

export const findTopAtRisk = async ({
  thresholdDays,
  windowMonths = 24,
  limit = 100,
  country,
  search,
  salesperson,
  dateFrom,
  dateTo,
  sort,
}: TopAtRiskOptions): Promise<TopAtRiskCustomer[]> => {
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
    phone: string | null;
    mobile: string | null;
    country: string | null;
    recent_usd: string;
    recent_dop: string;
    lifetime_usd: string;
    lifetime_dop: string;
    primary_currency: "USD" | "DOP" | null;
    invoice_count: number;
    last_invoice_date: string | null;
    days_since_last: number;
    risk_score: string;
    last_salesperson: string | null;
  }>(sql`
    WITH customer_revenue AS (
      SELECT
        p.id AS partner_id,
        p.name,
        p.email,
        p.phone,
        p.mobile,
        p.country,
        MAX(i.invoice_date) AS last_invoice_date,
        (CURRENT_DATE - MAX(i.invoice_date))::int AS days_since_last,
        COUNT(i.id)::int AS invoice_count,
        SUM(CASE WHEN i.currency_code='USD' THEN
          (CASE WHEN i.move_type='out_refund' THEN -i.amount_total::numeric ELSE i.amount_total::numeric END)
          ELSE 0 END) AS lifetime_usd,
        SUM(CASE WHEN i.currency_code='DOP' THEN
          (CASE WHEN i.move_type='out_refund' THEN -i.amount_total::numeric ELSE i.amount_total::numeric END)
          ELSE 0 END) AS lifetime_dop,
        SUM(CASE WHEN i.invoice_date >= CURRENT_DATE - (${windowMonths}::int * INTERVAL '1 month')
                  AND i.currency_code='USD'
             THEN (CASE WHEN i.move_type='out_refund' THEN -i.amount_total::numeric ELSE i.amount_total::numeric END)
             ELSE 0 END) AS recent_usd,
        SUM(CASE WHEN i.invoice_date >= CURRENT_DATE - (${windowMonths}::int * INTERVAL '1 month')
                  AND i.currency_code='DOP'
             THEN (CASE WHEN i.move_type='out_refund' THEN -i.amount_total::numeric ELSE i.amount_total::numeric END)
             ELSE 0 END) AS recent_dop,
        (SELECT i2.currency_code FROM invoices i2
          WHERE i2.partner_id=p.id AND i2.state='posted'
            AND i2.move_type IN ('out_invoice','out_refund')
          GROUP BY i2.currency_code ORDER BY COUNT(*) DESC LIMIT 1) AS primary_currency,
        (SELECT i3.salesperson_name FROM invoices i3
          WHERE i3.partner_id=p.id AND i3.state='posted'
            AND i3.salesperson_name IS NOT NULL
          ORDER BY i3.invoice_date DESC NULLS LAST LIMIT 1) AS last_salesperson
      FROM partners p
      INNER JOIN invoices i ON i.partner_id = p.id
        AND i.move_type IN ('out_invoice', 'out_refund')
        AND i.state = 'posted'
      WHERE p.active = true AND p.customer_rank > 0
      ${countryClause}
      ${searchClause}
      ${salespersonClause}
      GROUP BY p.id, p.name, p.email, p.phone, p.mobile, p.country
    )
    SELECT
      partner_id,
      name,
      email,
      phone,
      mobile,
      country,
      recent_usd::text AS recent_usd,
      recent_dop::text AS recent_dop,
      lifetime_usd::text AS lifetime_usd,
      lifetime_dop::text AS lifetime_dop,
      primary_currency,
      invoice_count,
      last_invoice_date::text AS last_invoice_date,
      days_since_last,
      last_salesperson,
      ((recent_usd + recent_dop/60.0) * (days_since_last::numeric / NULLIF(${thresholdDays}::numeric, 0)))::text AS risk_score
    FROM customer_revenue
    WHERE days_since_last > ${thresholdDays}::int
      AND (recent_usd + recent_dop) > 0
      ${dateClause(dateFrom, dateTo)}
    ORDER BY ${sortClause(sort, thresholdDays)}
    LIMIT ${limit}
  `);

  return rows.map((r) => ({
    partnerId: r.partner_id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    mobile: r.mobile,
    country: r.country,
    recentRevenueUsd: Number(r.recent_usd ?? 0),
    recentRevenueDop: Number(r.recent_dop ?? 0),
    lifetimeRevenueUsd: Number(r.lifetime_usd ?? 0),
    lifetimeRevenueDop: Number(r.lifetime_dop ?? 0),
    primaryCurrency: r.primary_currency ?? "DOP",
    invoiceCount: r.invoice_count,
    lastInvoiceDate: r.last_invoice_date,
    daysSinceLast: r.days_since_last,
    riskScore: Number(r.risk_score ?? 0),
    salespersonName: r.last_salesperson,
  }));
};
