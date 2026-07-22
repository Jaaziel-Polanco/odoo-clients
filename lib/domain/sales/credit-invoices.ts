import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { env } from "@/lib/config/env";
import { fmtMoney } from "@/lib/format";

/**
 * Cuentas por cobrar: facturas de cliente a credito sin pagar o parcialmente
 * pagadas (payment_state in not_paid/partial, saldo > 0). Lee del mirror local.
 * Genera links a Odoo y a WhatsApp (wa.me) con un mensaje de seguimiento
 * pre-llenado. Excluye 'in_payment' (ya en proceso de cobro) y 'paid'.
 */

const COMPANY = "Greensun";

export type DueFilter = "all" | "5" | "10" | "overdue";
export type CreditSort = "due_asc" | "residual_desc" | "overdue_desc";

export interface CreditInvoice {
  invoiceId: number;
  name: string;
  partnerId: number;
  partnerName: string;
  phone: string | null;
  mobile: string | null;
  vat: string | null;
  salespersonName: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  daysToDue: number | null; // <0 vencida, >=0 por vencer
  paymentState: string;
  currency: "USD" | "DOP";
  amountTotal: number;
  amountResidual: number;
  odooLink: string;
  whatsappLink: string | null;
  whatsappNumber: string | null;
}

export interface FindCreditInvoicesOptions {
  due?: DueFilter;
  search?: string;
  salesperson?: string;
  sort?: CreditSort;
  limit?: number;
}

const webBase = (): string =>
  (env.ODOO_WEB_URL ?? env.ODOO_URL).replace(/\/+$/, "");

/** Limpia el telefono a formato internacional para wa.me (RD por defecto). */
const cleanPhone = (raw: string | null): string | null => {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  // numero local RD de 10 digitos (809/829/849 + 7) -> anteponer codigo 1
  if (digits.length === 10) digits = `1${digits}`;
  // 7 digitos sin area -> no se puede enrutar
  if (digits.length < 10) return null;
  return digits;
};

const followUpMessage = (inv: {
  partnerName: string;
  name: string;
  amountResidual: number;
  currency: "USD" | "DOP";
  dueDate: string | null;
  daysToDue: number | null;
}): string => {
  const monto = fmtMoney(inv.amountResidual, inv.currency);
  const venc = inv.dueDate
    ? new Date(inv.dueDate).toLocaleDateString("es-DO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "su fecha de vencimiento";
  const overdue = (inv.daysToDue ?? 0) < 0;
  if (overdue) {
    return (
      `Hola ${inv.partnerName}, le saludamos de ${COMPANY}. ` +
      `Le recordamos que la factura ${inv.name} por ${monto} venció el ${venc} y figura pendiente de pago. ` +
      `¿Nos puede confirmar la fecha en que realizará el pago? Quedamos atentos. ¡Gracias!`
    );
  }
  return (
    `Hola ${inv.partnerName}, le saludamos de ${COMPANY}. ` +
    `Le recordamos que la factura ${inv.name} por ${monto} vence el ${venc}. ` +
    `Agradecemos coordinar su pago a tiempo. Quedamos atentos. ¡Gracias!`
  );
};

const dueClause = (due: DueFilter | undefined): SQL => {
  switch (due) {
    case "overdue":
      return sql`AND i.invoice_date_due < CURRENT_DATE`;
    case "5":
      return sql`AND i.invoice_date_due BETWEEN CURRENT_DATE AND CURRENT_DATE + 5`;
    case "10":
      return sql`AND i.invoice_date_due BETWEEN CURRENT_DATE AND CURRENT_DATE + 10`;
    case "all":
    default:
      return sql``;
  }
};

const sortClause = (sort: CreditSort | undefined): SQL => {
  switch (sort) {
    case "residual_desc":
      return sql`i.amount_residual::numeric DESC`;
    case "overdue_desc":
      return sql`i.invoice_date_due ASC NULLS LAST`;
    case "due_asc":
    default:
      return sql`i.invoice_date_due ASC NULLS LAST`;
  }
};

export const findCreditInvoices = async ({
  due,
  search,
  salesperson,
  sort,
  limit = 1000,
}: FindCreditInvoicesOptions = {}): Promise<CreditInvoice[]> => {
  const searchClause = search
    ? sql`AND (p.name ILIKE ${"%" + search + "%"} OR p.vat ILIKE ${"%" + search + "%"} OR i.name ILIKE ${"%" + search + "%"})`
    : sql``;
  const salespersonClause = salesperson
    ? sql`AND i.salesperson_name = ${salesperson}`
    : sql``;

  const rows = await db.execute<{
    invoice_id: number;
    name: string;
    partner_id: number;
    partner_name: string;
    phone: string | null;
    mobile: string | null;
    vat: string | null;
    salesperson_name: string | null;
    invoice_date: string | null;
    due_date: string | null;
    days_to_due: number | null;
    payment_state: string;
    currency_code: string | null;
    amount_total: string;
    amount_residual: string;
  }>(sql`
    SELECT
      i.id AS invoice_id,
      i.name,
      p.id AS partner_id,
      p.name AS partner_name,
      p.phone,
      p.mobile,
      p.vat,
      i.salesperson_name,
      i.invoice_date::text AS invoice_date,
      i.invoice_date_due::text AS due_date,
      (i.invoice_date_due - CURRENT_DATE)::int AS days_to_due,
      i.payment_state,
      i.currency_code,
      i.amount_total::text AS amount_total,
      i.amount_residual::text AS amount_residual
    FROM invoices i
    INNER JOIN partners p ON p.id = i.partner_id
    WHERE i.move_type = 'out_invoice'
      AND i.state = 'posted'
      AND i.payment_state IN ('not_paid', 'partial')
      AND i.amount_residual::numeric > 0
      ${dueClause(due)}
      ${searchClause}
      ${salespersonClause}
    ORDER BY ${sortClause(sort)}
    LIMIT ${limit}
  `);

  return rows.map((r) => {
    const currency: "USD" | "DOP" = r.currency_code === "USD" ? "USD" : "DOP";
    const amountResidual = Number(r.amount_residual ?? 0);
    const number = cleanPhone(r.mobile) ?? cleanPhone(r.phone);
    const base = {
      invoiceId: r.invoice_id,
      name: r.name,
      partnerId: r.partner_id,
      partnerName: r.partner_name,
      phone: r.phone,
      mobile: r.mobile,
      vat: r.vat,
      salespersonName: r.salesperson_name,
      invoiceDate: r.invoice_date,
      dueDate: r.due_date,
      daysToDue: r.days_to_due,
      paymentState: r.payment_state,
      currency,
      amountTotal: Number(r.amount_total ?? 0),
      amountResidual,
    };
    const text = followUpMessage(base);
    return {
      ...base,
      odooLink: `${webBase()}/web#id=${r.invoice_id}&model=account.move&view_type=form`,
      whatsappNumber: number,
      whatsappLink: number
        ? `https://wa.me/${number}?text=${encodeURIComponent(text)}`
        : null,
    };
  });
};

export interface CreditSummary {
  pendingByCurrency: { currency: string; amount: number; count: number }[];
  overdueCount: number;
  due5Count: number;
  due10Count: number;
  bySalesperson: { name: string; count: number; amount: number }[];
}

export const getCreditSummary = async (): Promise<CreditSummary> => {
  const rows = await db.execute<{
    currency_code: string | null;
    amount_residual: string;
    days_to_due: number | null;
    salesperson_name: string | null;
  }>(sql`
    SELECT i.currency_code,
           i.amount_residual::text AS amount_residual,
           (i.invoice_date_due - CURRENT_DATE)::int AS days_to_due,
           i.salesperson_name
    FROM invoices i
    WHERE i.move_type = 'out_invoice'
      AND i.state = 'posted'
      AND i.payment_state IN ('not_paid', 'partial')
      AND i.amount_residual::numeric > 0
  `);

  const curMap = new Map<string, { amount: number; count: number }>();
  const spMap = new Map<string, { count: number; amount: number }>();
  let overdueCount = 0;
  let due5Count = 0;
  let due10Count = 0;
  for (const r of rows) {
    const cur = r.currency_code === "USD" ? "USD" : "DOP";
    const amt = Number(r.amount_residual ?? 0);
    const d = r.days_to_due;
    const c = curMap.get(cur) ?? { amount: 0, count: 0 };
    c.amount += amt;
    c.count += 1;
    curMap.set(cur, c);
    if (d != null && d < 0) overdueCount += 1;
    if (d != null && d >= 0 && d <= 5) due5Count += 1;
    if (d != null && d >= 0 && d <= 10) due10Count += 1;
    const sp = r.salesperson_name ?? "Sin vendedor";
    const s = spMap.get(sp) ?? { count: 0, amount: 0 };
    s.count += 1;
    s.amount += amt;
    spMap.set(sp, s);
  }

  return {
    pendingByCurrency: Array.from(curMap.entries())
      .map(([currency, v]) => ({ currency, ...v }))
      .sort((a, b) => b.amount - a.amount),
    overdueCount,
    due5Count,
    due10Count,
    bySalesperson: Array.from(spMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.amount - a.amount),
  };
};
