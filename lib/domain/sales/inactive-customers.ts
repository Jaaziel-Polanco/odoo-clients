import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";

export interface InactiveCustomer {
  partnerId: number;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  country: string | null;
  city: string | null;
  isCompany: boolean;
  lastInvoiceDate: string | null;
  daysSinceLast: number | null;
  invoiceCount: number;
  totalRevenueUsd: number;
  totalRevenueDop: number;
  primaryCurrency: "USD" | "DOP";
  salespersonName: string | null;
}

export type InactiveSort =
  | "oldest_first"
  | "newest_first"
  | "revenue_desc"
  | "revenue_asc"
  | "name_asc"
  | "name_desc";

export interface FindInactiveOptions {
  thresholdDays: number;
  includeNeverPurchased?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
  country?: string;
  salesperson?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: InactiveSort;
}

const buildSearchClause = (search: string | undefined) =>
  search
    ? sql`AND (p.name ILIKE ${"%" + search + "%"} OR p.email ILIKE ${"%" + search + "%"} OR p.vat ILIKE ${"%" + search + "%"})`
    : sql``;

const buildCountryClause = (country: string | undefined) =>
  country ? sql`AND p.country = ${country}` : sql``;

const buildSalespersonClause = (salesperson: string | undefined) =>
  salesperson
    ? sql`AND EXISTS (SELECT 1 FROM invoices ii WHERE ii.partner_id = p.id AND ii.salesperson_name = ${salesperson})`
    : sql``;

const buildDateClause = (dateFrom?: string, dateTo?: string): SQL => {
  if (!dateFrom && !dateTo) return sql``;
  const parts: SQL[] = [];
  if (dateFrom) parts.push(sql`MAX(i.invoice_date) >= ${dateFrom}::date`);
  if (dateTo) parts.push(sql`MAX(i.invoice_date) <= ${dateTo}::date`);
  return sql` AND (${sql.join(parts, sql` AND `)})`;
};

const buildSortClause = (sort: InactiveSort | undefined): SQL => {
  switch (sort) {
    case "newest_first":
      return sql`MAX(i.invoice_date) DESC NULLS LAST, p.id ASC`;
    case "revenue_desc":
      return sql`(COALESCE(SUM(i.amount_total::numeric), 0)) DESC, p.id ASC`;
    case "revenue_asc":
      return sql`(COALESCE(SUM(i.amount_total::numeric), 0)) ASC, p.id ASC`;
    case "name_asc":
      return sql`p.name ASC`;
    case "name_desc":
      return sql`p.name DESC`;
    case "oldest_first":
    default:
      return sql`MAX(i.invoice_date) ASC NULLS LAST, p.id ASC`;
  }
};

export const findInactiveCustomers = async ({
  thresholdDays,
  includeNeverPurchased = false,
  limit = 1000,
  offset = 0,
  search,
  country,
  salesperson,
  dateFrom,
  dateTo,
  sort,
}: FindInactiveOptions): Promise<InactiveCustomer[]> => {
  const havingClause = includeNeverPurchased
    ? sql`MAX(i.invoice_date) IS NULL OR MAX(i.invoice_date) < CURRENT_DATE - (${thresholdDays}::int * INTERVAL '1 day')`
    : sql`MAX(i.invoice_date) IS NOT NULL AND MAX(i.invoice_date) < CURRENT_DATE - (${thresholdDays}::int * INTERVAL '1 day')`;

  const rows = await db.execute<{
    partner_id: number;
    name: string;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    country: string | null;
    city: string | null;
    is_company: boolean;
    last_invoice_date: string | null;
    days_since_last: number | null;
    invoice_count: number;
    total_usd: string;
    total_dop: string;
    primary_currency: "USD" | "DOP" | null;
    last_salesperson: string | null;
  }>(sql`
    SELECT
      p.id AS partner_id,
      p.name,
      p.email,
      p.phone,
      p.mobile,
      p.country,
      p.city,
      p.is_company,
      MAX(i.invoice_date)::text AS last_invoice_date,
      (CURRENT_DATE - MAX(i.invoice_date))::int AS days_since_last,
      COUNT(i.id)::int AS invoice_count,
      COALESCE(SUM(CASE WHEN i.currency_code='USD'
        THEN (CASE WHEN i.move_type='out_refund' THEN -i.amount_total::numeric ELSE i.amount_total::numeric END)
        ELSE 0 END), 0)::text AS total_usd,
      COALESCE(SUM(CASE WHEN i.currency_code='DOP'
        THEN (CASE WHEN i.move_type='out_refund' THEN -i.amount_total::numeric ELSE i.amount_total::numeric END)
        ELSE 0 END), 0)::text AS total_dop,
      (SELECT i2.currency_code FROM invoices i2
        WHERE i2.partner_id = p.id AND i2.state='posted'
          AND i2.move_type IN ('out_invoice','out_refund')
        GROUP BY i2.currency_code ORDER BY COUNT(*) DESC LIMIT 1) AS primary_currency,
      (SELECT i3.salesperson_name FROM invoices i3
        WHERE i3.partner_id = p.id AND i3.state='posted'
          AND i3.salesperson_name IS NOT NULL
        ORDER BY i3.invoice_date DESC NULLS LAST LIMIT 1) AS last_salesperson
    FROM partners p
    LEFT JOIN invoices i ON i.partner_id = p.id
      AND i.move_type IN ('out_invoice', 'out_refund')
      AND i.state = 'posted'
    WHERE p.active = true AND p.customer_rank > 0
    ${buildSearchClause(search)}
    ${buildCountryClause(country)}
    ${buildSalespersonClause(salesperson)}
    GROUP BY p.id, p.name, p.email, p.phone, p.mobile, p.country, p.city, p.is_company
    HAVING (${havingClause})${buildDateClause(dateFrom, dateTo)}
    ORDER BY ${buildSortClause(sort)}
    LIMIT ${limit} OFFSET ${offset}
  `);

  return rows.map((r) => ({
    partnerId: r.partner_id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    mobile: r.mobile,
    country: r.country,
    city: r.city,
    isCompany: r.is_company,
    lastInvoiceDate: r.last_invoice_date,
    daysSinceLast: r.days_since_last,
    invoiceCount: r.invoice_count,
    totalRevenueUsd: Number(r.total_usd ?? 0),
    totalRevenueDop: Number(r.total_dop ?? 0),
    primaryCurrency: r.primary_currency ?? "DOP",
    salespersonName: r.last_salesperson,
  }));
};

export const countInactiveCustomers = async (
  options: Pick<
    FindInactiveOptions,
    | "thresholdDays"
    | "includeNeverPurchased"
    | "search"
    | "country"
    | "salesperson"
    | "dateFrom"
    | "dateTo"
  >,
): Promise<number> => {
  const {
    thresholdDays,
    includeNeverPurchased = false,
    search,
    country,
    salesperson,
    dateFrom,
    dateTo,
  } = options;
  const havingClause = includeNeverPurchased
    ? sql`MAX(i.invoice_date) IS NULL OR MAX(i.invoice_date) < CURRENT_DATE - (${thresholdDays}::int * INTERVAL '1 day')`
    : sql`MAX(i.invoice_date) IS NOT NULL AND MAX(i.invoice_date) < CURRENT_DATE - (${thresholdDays}::int * INTERVAL '1 day')`;

  const rows = await db.execute<{ total: number }>(sql`
    SELECT COUNT(*)::int AS total FROM (
      SELECT p.id
      FROM partners p
      LEFT JOIN invoices i ON i.partner_id = p.id
        AND i.move_type IN ('out_invoice', 'out_refund')
        AND i.state = 'posted'
      WHERE p.active = true AND p.customer_rank > 0
      ${buildSearchClause(search)}
      ${buildCountryClause(country)}
      ${buildSalespersonClause(salesperson)}
      GROUP BY p.id
      HAVING (${havingClause})${buildDateClause(dateFrom, dateTo)}
    ) sub
  `);
  return rows[0]?.total ?? 0;
};
