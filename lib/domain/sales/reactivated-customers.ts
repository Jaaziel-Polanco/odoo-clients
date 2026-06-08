import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";

export interface ReactivatedCustomer {
  partnerId: number;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  vat: string | null;
  country: string | null;
  city: string | null;
  orderId: number;
  orderName: string;
  orderDate: string | null;
  previousOrderDate: string | null;
  gapDays: number;
  salespersonName: string | null;
  invoiceStatus: string | null;
  deliveryStatus: string | null;
  fulfillment: "facturada" | "despachada" | "ambas";
  amountTotal: number;
  currencyCode: "USD" | "DOP";
}

export type ReactivatedSort =
  | "order_date_desc"
  | "order_date_asc"
  | "gap_desc"
  | "amount_desc";

export interface FindReactivatedOptions {
  // Brecha minima sin comprar (en dias) antes de la orden de retorno.
  gapDays?: number;
  limit?: number;
  search?: string;
  salesperson?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: ReactivatedSort;
}

const sortClause = (sort: ReactivatedSort | undefined): SQL => {
  switch (sort) {
    case "order_date_asc":
      return sql`r.order_date ASC`;
    case "gap_desc":
      return sql`r.gap_days DESC`;
    case "amount_desc":
      return sql`r.amount_total DESC`;
    case "order_date_desc":
    default:
      return sql`r.order_date DESC`;
  }
};

export const findReactivatedCustomers = async ({
  gapDays = 90,
  limit = 1000,
  search,
  salesperson,
  dateFrom,
  dateTo,
  sort,
}: FindReactivatedOptions = {}): Promise<ReactivatedCustomer[]> => {
  const searchClause = search
    ? sql`AND (p.name ILIKE ${"%" + search + "%"} OR p.email ILIKE ${"%" + search + "%"} OR p.vat ILIKE ${"%" + search + "%"})`
    : sql``;
  const salespersonClause = salesperson
    ? sql`AND r.salesperson_name = ${salesperson}`
    : sql``;
  const dateFromClause = dateFrom
    ? sql`AND r.order_date::date >= ${dateFrom}::date`
    : sql``;
  const dateToClause = dateTo
    ? sql`AND r.order_date::date <= ${dateTo}::date`
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
    order_id: number;
    order_name: string;
    order_date: string | null;
    previous_order_date: string | null;
    gap_days: number;
    salesperson_name: string | null;
    invoice_status: string | null;
    delivery_status: string | null;
    amount_total: string;
    currency_code: string | null;
  }>(sql`
    WITH ordered AS (
      SELECT
        so.id,
        so.name,
        so.partner_id,
        so.date_order,
        so.salesperson_name,
        so.invoice_status,
        so.delivery_status,
        so.amount_total,
        so.currency_code,
        LAG(so.date_order) OVER (
          PARTITION BY so.partner_id ORDER BY so.date_order
        ) AS prev_order
      FROM sale_orders so
      WHERE so.state IN ('sale', 'done')
        AND so.date_order IS NOT NULL
    ),
    reactivations AS (
      SELECT
        o.id AS order_id,
        o.name AS order_name,
        o.partner_id,
        o.date_order AS order_date,
        o.prev_order AS previous_order_date,
        EXTRACT(DAY FROM (o.date_order - o.prev_order))::int AS gap_days,
        o.salesperson_name,
        o.invoice_status,
        o.delivery_status,
        o.amount_total,
        o.currency_code
      FROM ordered o
      WHERE o.prev_order IS NOT NULL
        -- la orden de retorno debe estar facturada o despachada
        AND (
          o.invoice_status = 'invoiced'
          OR o.delivery_status IN ('partial', 'full')
        )
        -- brecha de al menos N dias respecto a la compra anterior
        AND o.date_order >= o.prev_order + make_interval(days => ${gapDays}::int)
    )
    SELECT
      p.id AS partner_id,
      p.name,
      p.email,
      p.phone,
      p.mobile,
      p.vat,
      p.country,
      p.city,
      r.order_id,
      r.order_name,
      r.order_date::text AS order_date,
      r.previous_order_date::text AS previous_order_date,
      r.gap_days,
      r.salesperson_name,
      r.invoice_status,
      r.delivery_status,
      r.amount_total::text AS amount_total,
      r.currency_code
    FROM reactivations r
    INNER JOIN partners p ON p.id = r.partner_id
    WHERE 1=1
      ${searchClause}
      ${salespersonClause}
      ${dateFromClause}
      ${dateToClause}
    ORDER BY ${sortClause(sort)}
    LIMIT ${limit}
  `);

  return rows.map((r) => {
    const invoiced = r.invoice_status === "invoiced";
    const delivered =
      r.delivery_status === "partial" || r.delivery_status === "full";
    const fulfillment: ReactivatedCustomer["fulfillment"] =
      invoiced && delivered ? "ambas" : invoiced ? "facturada" : "despachada";
    return {
      partnerId: r.partner_id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      mobile: r.mobile,
      vat: r.vat,
      country: r.country,
      city: r.city,
      orderId: r.order_id,
      orderName: r.order_name,
      orderDate: r.order_date,
      previousOrderDate: r.previous_order_date,
      gapDays: r.gap_days,
      salespersonName: r.salesperson_name,
      invoiceStatus: r.invoice_status,
      deliveryStatus: r.delivery_status,
      fulfillment,
      amountTotal: Number(r.amount_total ?? 0),
      currencyCode: r.currency_code === "USD" ? "USD" : "DOP",
    };
  });
};
