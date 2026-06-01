import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export type RfmSegment =
  | "Campeones"
  | "Leales"
  | "Potenciales"
  | "Nuevos"
  | "Prometedores"
  | "Necesitan atencion"
  | "A punto de dormir"
  | "En riesgo"
  | "No los podemos perder"
  | "Hibernando"
  | "Perdidos";

export interface RfmRow {
  partnerId: number;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  vat: string | null;
  country: string | null;
  city: string | null;
  recencyDays: number;
  frequency: number;
  monetaryUsd: number;
  monetaryDop: number;
  primaryCurrency: "USD" | "DOP";
  rScore: number;
  fScore: number;
  mScore: number;
  segment: RfmSegment;
}

const segmentLabel = (r: number, f: number, m: number): RfmSegment => {
  if (r >= 4 && f >= 4 && m >= 4) return "Campeones";
  if (r >= 3 && f >= 4) return "Leales";
  if (r >= 4 && f <= 2 && m >= 3) return "Potenciales";
  if (r >= 4 && f === 1) return "Nuevos";
  if (r >= 3 && f >= 2 && m >= 2) return "Prometedores";
  if (r === 3 && f >= 2) return "Necesitan atencion";
  if (r === 2 && f >= 2) return "A punto de dormir";
  if (r <= 2 && f >= 4 && m >= 4) return "No los podemos perder";
  if (r <= 2 && f >= 3 && m >= 3) return "En riesgo";
  if (r <= 2 && f <= 2) return "Hibernando";
  return "Perdidos";
};

export interface ComputeRfmOptions {
  windowMonths?: number;
  country?: string;
  salesperson?: string;
  search?: string;
}

export const computeRfm = async ({
  windowMonths = 12,
  country,
  salesperson,
  search,
}: ComputeRfmOptions = {}): Promise<RfmRow[]> => {
  const countryClause = country ? sql`AND p.country = ${country}` : sql``;
  const searchClause = search
    ? sql`AND (p.name ILIKE ${"%" + search + "%"} OR p.email ILIKE ${"%" + search + "%"})`
    : sql``;
  const salespersonClause = salesperson
    ? sql`AND i.salesperson_name = ${salesperson}`
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
    recency_days: number;
    frequency: number;
    monetary_usd: string;
    monetary_dop: string;
    primary_currency: "USD" | "DOP" | null;
    r_score: number;
    f_score: number;
    m_score: number;
  }>(sql`
    WITH customer_metrics AS (
      SELECT
        p.id AS partner_id,
        p.name,
        p.email,
        p.phone,
        p.mobile,
        p.vat,
        p.country,
        p.city,
        (CURRENT_DATE - MAX(i.invoice_date))::int AS recency_days,
        COUNT(i.id)::int AS frequency,
        SUM(CASE WHEN i.currency_code='USD'
          THEN (CASE WHEN i.move_type='out_refund' THEN -i.amount_total::numeric ELSE i.amount_total::numeric END)
          ELSE 0 END)::numeric AS monetary_usd,
        SUM(CASE WHEN i.currency_code='DOP'
          THEN (CASE WHEN i.move_type='out_refund' THEN -i.amount_total::numeric ELSE i.amount_total::numeric END)
          ELSE 0 END)::numeric AS monetary_dop,
        (SELECT i2.currency_code FROM invoices i2
          WHERE i2.partner_id=p.id AND i2.state='posted'
            AND i2.move_type IN ('out_invoice','out_refund')
          GROUP BY i2.currency_code ORDER BY COUNT(*) DESC LIMIT 1) AS primary_currency
      FROM partners p
      INNER JOIN invoices i ON i.partner_id = p.id
        AND i.move_type IN ('out_invoice', 'out_refund')
        AND i.state = 'posted'
        AND i.invoice_date >= CURRENT_DATE - (${windowMonths}::int * INTERVAL '1 month')
      WHERE p.active = true AND p.customer_rank > 0
      ${countryClause}
      ${searchClause}
      ${salespersonClause}
      GROUP BY p.id, p.name, p.email, p.phone, p.mobile, p.vat, p.country, p.city
      HAVING COUNT(i.id) > 0
    ),
    monetary_normalized AS (
      SELECT *,
        (COALESCE(monetary_usd,0) + COALESCE(monetary_dop,0) / 60.0) AS monetary_norm
      FROM customer_metrics
    ),
    scored AS (
      SELECT
        *,
        NTILE(5) OVER (ORDER BY recency_days DESC) AS r_score_inv,
        NTILE(5) OVER (ORDER BY frequency ASC) AS f_score,
        NTILE(5) OVER (ORDER BY monetary_norm ASC) AS m_score
      FROM monetary_normalized
    )
    SELECT
      partner_id,
      name,
      email,
      phone,
      mobile,
      vat,
      country,
      city,
      recency_days,
      frequency,
      monetary_usd::text AS monetary_usd,
      monetary_dop::text AS monetary_dop,
      primary_currency,
      (6 - r_score_inv) AS r_score,
      f_score,
      m_score
    FROM scored
    ORDER BY (6 - r_score_inv) DESC, f_score DESC, m_score DESC
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
    recencyDays: r.recency_days,
    frequency: r.frequency,
    monetaryUsd: Number(r.monetary_usd ?? 0),
    monetaryDop: Number(r.monetary_dop ?? 0),
    primaryCurrency: r.primary_currency ?? "DOP",
    rScore: r.r_score,
    fScore: r.f_score,
    mScore: r.m_score,
    segment: segmentLabel(r.r_score, r.f_score, r.m_score),
  }));
};

export const summarizeRfmSegments = (rows: RfmRow[]) => {
  const counts: Record<string, { count: number; revenueUsd: number; revenueDop: number }> = {};
  for (const row of rows) {
    if (!counts[row.segment])
      counts[row.segment] = { count: 0, revenueUsd: 0, revenueDop: 0 };
    counts[row.segment].count += 1;
    counts[row.segment].revenueUsd += row.monetaryUsd;
    counts[row.segment].revenueDop += row.monetaryDop;
  }
  return Object.entries(counts)
    .map(([segment, v]) => ({ segment: segment as RfmSegment, ...v }))
    .sort((a, b) => b.revenueUsd + b.revenueDop / 60 - (a.revenueUsd + a.revenueDop / 60));
};
