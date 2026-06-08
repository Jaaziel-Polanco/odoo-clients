import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export const getCountries = async (): Promise<FilterOption[]> => {
  const rows = await db.execute<{ country: string; count: number }>(sql`
    SELECT p.country AS country, COUNT(*)::int AS count
    FROM partners p
    WHERE p.country IS NOT NULL AND p.active = true AND p.customer_rank > 0
    GROUP BY p.country
    ORDER BY count DESC, p.country
  `);
  return rows.map((r) => ({ value: r.country, label: r.country, count: r.count }));
};

export const getSalespersons = async (): Promise<FilterOption[]> => {
  const rows = await db.execute<{ salesperson_name: string; count: number }>(sql`
    SELECT i.salesperson_name, COUNT(*)::int AS count
    FROM invoices i
    WHERE i.salesperson_name IS NOT NULL
      AND i.state = 'posted'
      AND i.move_type IN ('out_invoice','out_refund')
    GROUP BY i.salesperson_name
    ORDER BY count DESC
  `);
  return rows.map((r) => ({
    value: r.salesperson_name,
    label: r.salesperson_name,
    count: r.count,
  }));
};

// Vendedores tomados del modulo de ventas (sale.order), no de facturas.
export const getSaleSalespersons = async (): Promise<FilterOption[]> => {
  const rows = await db.execute<{ salesperson_name: string; count: number }>(sql`
    SELECT so.salesperson_name, COUNT(*)::int AS count
    FROM sale_orders so
    WHERE so.salesperson_name IS NOT NULL
      AND so.state IN ('sale', 'done')
    GROUP BY so.salesperson_name
    ORDER BY count DESC
  `);
  return rows.map((r) => ({
    value: r.salesperson_name,
    label: r.salesperson_name,
    count: r.count,
  }));
};
