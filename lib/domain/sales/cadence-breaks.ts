import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";

export interface CadenceBreak {
  partnerId: number;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  vat: string | null;
  country: string | null;
  city: string | null;
  avgGapDays: number;
  currentGapDays: number;
  overdueRatio: number;
  invoiceCount: number;
  lastInvoiceDate: string | null;
  totalRevenueUsd: number;
  totalRevenueDop: number;
  primaryCurrency: "USD" | "DOP";
}

export type CadenceSort =
  | "ratio_desc"
  | "current_gap_desc"
  | "avg_gap_asc"
  | "invoices_desc";

export interface DetectCadenceOptions {
  minInvoices?: number;
  overdueMultiplier?: number;
  limit?: number;
  country?: string;
  search?: string;
  salesperson?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: CadenceSort;
}

const sortClause = (sort: CadenceSort | undefined): SQL => {
  switch (sort) {
    case "current_gap_desc":
      return sql`a.current_gap DESC`;
    case "avg_gap_asc":
      return sql`g.avg_gap ASC`;
    case "invoices_desc":
      return sql`a.invoice_count DESC`;
    case "ratio_desc":
    default:
      return sql`(a.current_gap / NULLIF(g.avg_gap, 0)) DESC`;
  }
};

const dateClause = (dateFrom?: string, dateTo?: string): SQL => {
  if (!dateFrom && !dateTo) return sql``;
  const parts: SQL[] = [];
  if (dateFrom) parts.push(sql`a.last_invoice_date::date >= ${dateFrom}::date`);
  if (dateTo) parts.push(sql`a.last_invoice_date::date <= ${dateTo}::date`);
  return sql` AND (${sql.join(parts, sql` AND `)})`;
};

export const detectCadenceBreaks = async ({
  minInvoices = 3,
  overdueMultiplier = 1.5,
  limit = 1000,
  country,
  search,
  salesperson,
  dateFrom,
  dateTo,
  sort,
}: DetectCadenceOptions = {}): Promise<CadenceBreak[]> => {
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
    vat: string | null;
    country: string | null;
    city: string | null;
    avg_gap: string | null;
    current_gap: number;
    overdue_ratio: string;
    invoice_count: number;
    last_invoice_date: string | null;
    total_usd: string;
    total_dop: string;
    primary_currency: "USD" | "DOP" | null;
  }>(sql`
    WITH ordered AS (
      SELECT
        i.partner_id,
        i.invoice_date,
        LAG(i.invoice_date) OVER (PARTITION BY i.partner_id ORDER BY i.invoice_date) AS prev_date
      FROM invoices i
      WHERE i.move_type IN ('out_invoice', 'out_refund')
        AND i.state = 'posted'
        AND i.invoice_date IS NOT NULL
    ),
    gaps AS (
      SELECT
        partner_id,
        AVG((invoice_date - prev_date)::int)::numeric AS avg_gap
      FROM ordered
      WHERE prev_date IS NOT NULL
      GROUP BY partner_id
    ),
    aggregates AS (
      SELECT
        p.id AS partner_id,
        p.name,
        p.email,
        p.phone,
        p.mobile,
        p.vat,
        p.country,
        p.city,
        MAX(i.invoice_date)::text AS last_invoice_date,
        (CURRENT_DATE - MAX(i.invoice_date))::int AS current_gap,
        COUNT(i.id)::int AS invoice_count,
        SUM(CASE WHEN i.currency_code='USD'
          THEN (CASE WHEN i.move_type='out_refund' THEN -i.amount_total::numeric ELSE i.amount_total::numeric END)
          ELSE 0 END)::text AS total_usd,
        SUM(CASE WHEN i.currency_code='DOP'
          THEN (CASE WHEN i.move_type='out_refund' THEN -i.amount_total::numeric ELSE i.amount_total::numeric END)
          ELSE 0 END)::text AS total_dop,
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
      GROUP BY p.id, p.name, p.email, p.phone, p.mobile, p.vat, p.country, p.city
      HAVING COUNT(i.id) >= ${minInvoices}::int
    )
    SELECT
      a.partner_id,
      a.name,
      a.email,
      a.phone,
      a.mobile,
      a.vat,
      a.country,
      a.city,
      g.avg_gap::text AS avg_gap,
      a.current_gap,
      (a.current_gap / NULLIF(g.avg_gap, 0))::text AS overdue_ratio,
      a.invoice_count,
      a.last_invoice_date,
      a.total_usd,
      a.total_dop,
      a.primary_currency
    FROM aggregates a
    INNER JOIN gaps g ON g.partner_id = a.partner_id
    WHERE g.avg_gap > 0
      AND a.current_gap > g.avg_gap * ${overdueMultiplier}::numeric
      ${dateClause(dateFrom, dateTo)}
    ORDER BY ${sortClause(sort)}
    LIMIT ${limit}
  `);

  return rows.map((r) => ({
    partnerId: r.partner_id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    mobile: r.mobile,
    vat: r.vat,
    country: r.country,
    city: r.city,
    avgGapDays: Number(r.avg_gap ?? 0),
    currentGapDays: r.current_gap,
    overdueRatio: Number(r.overdue_ratio ?? 0),
    invoiceCount: r.invoice_count,
    lastInvoiceDate: r.last_invoice_date,
    totalRevenueUsd: Number(r.total_usd ?? 0),
    totalRevenueDop: Number(r.total_dop ?? 0),
    primaryCurrency: r.primary_currency ?? "DOP",
  }));
};
