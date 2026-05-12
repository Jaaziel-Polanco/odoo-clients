import { sql } from "drizzle-orm";

export const CUSTOMER_INVOICE_FILTER = sql`
  i.move_type IN ('out_invoice', 'out_refund')
  AND i.state = 'posted'
`;

export const ACTIVE_CUSTOMER_FILTER = sql`
  p.active = true AND p.customer_rank > 0
`;

export const REVENUE_EXPR = sql<number>`
  CASE WHEN i.move_type = 'out_refund' THEN -i.amount_total::numeric
       ELSE i.amount_total::numeric END
`;
