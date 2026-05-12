import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { invoices, partners } from "@/lib/db/schema";
import { fetchInvoiceLines, fetchTaxNames } from "@/lib/odoo/client";
import { odooStr } from "@/lib/odoo/parse";
import type { OdooInvoiceLineRaw } from "@/lib/odoo/types";

export interface InvoiceLine {
  id: number;
  sequence: number;
  displayType: "product" | "section" | "note";
  description: string;
  productName: string | null;
  uomName: string | null;
  quantity: number;
  priceUnit: number;
  discount: number;
  priceSubtotal: number;
  priceTotal: number;
  taxNames: string[];
}

export interface InvoiceDetail {
  id: number;
  name: string;
  partnerId: number;
  partnerName: string;
  partnerEmail: string | null;
  moveType: string;
  state: string;
  paymentState: string | null;
  invoiceDate: string | null;
  invoiceDateDue: string | null;
  amountTotal: number;
  amountUntaxed: number;
  amountResidual: number;
  currencyCode: string;
  salespersonName: string | null;
  lines: InvoiceLine[];
  linesError: string | null;
}

const mapLine = (
  raw: OdooInvoiceLineRaw,
  taxNames: Record<number, string>,
): InvoiceLine => {
  const displayType: InvoiceLine["displayType"] =
    raw.display_type === "line_section"
      ? "section"
      : raw.display_type === "line_note"
        ? "note"
        : "product";
  const productName = raw.product_id && Array.isArray(raw.product_id)
    ? raw.product_id[1]
    : null;
  const uomName = raw.product_uom_id && Array.isArray(raw.product_uom_id)
    ? raw.product_uom_id[1]
    : null;
  return {
    id: raw.id,
    sequence: raw.sequence ?? 0,
    displayType,
    description: (odooStr(raw.name) ?? productName ?? "").trim(),
    productName,
    uomName,
    quantity: raw.quantity ?? 0,
    priceUnit: raw.price_unit ?? 0,
    discount: raw.discount ?? 0,
    priceSubtotal: raw.price_subtotal ?? 0,
    priceTotal: raw.price_total ?? 0,
    taxNames: (raw.tax_ids ?? [])
      .map((id) => taxNames[id])
      .filter((v): v is string => Boolean(v)),
  };
};

export const getInvoiceDetail = async (
  invoiceId: number,
): Promise<InvoiceDetail | null> => {
  const rows = await db
    .select({
      id: invoices.id,
      name: invoices.name,
      partnerId: invoices.partnerId,
      moveType: invoices.moveType,
      state: invoices.state,
      paymentState: invoices.paymentState,
      invoiceDate: invoices.invoiceDate,
      invoiceDateDue: invoices.invoiceDateDue,
      amountTotal: invoices.amountTotal,
      amountUntaxed: invoices.amountUntaxed,
      amountResidual: invoices.amountResidual,
      currencyCode: invoices.currencyCode,
      salespersonName: invoices.salespersonName,
      partnerName: partners.name,
      partnerEmail: partners.email,
    })
    .from(invoices)
    .innerJoin(partners, eq(partners.id, invoices.partnerId))
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (rows.length === 0) return null;
  const inv = rows[0];

  let lines: InvoiceLine[] = [];
  let linesError: string | null = null;
  try {
    const rawLines = await fetchInvoiceLines(invoiceId);
    const allTaxIds = Array.from(
      new Set(rawLines.flatMap((l) => l.tax_ids ?? [])),
    );
    const taxNames = await fetchTaxNames(allTaxIds);
    lines = rawLines.map((r) => mapLine(r, taxNames));
  } catch (err) {
    linesError = err instanceof Error ? err.message : String(err);
  }

  return {
    id: inv.id,
    name: inv.name,
    partnerId: inv.partnerId,
    partnerName: inv.partnerName,
    partnerEmail: inv.partnerEmail,
    moveType: inv.moveType,
    state: inv.state,
    paymentState: inv.paymentState,
    invoiceDate: inv.invoiceDate,
    invoiceDateDue: inv.invoiceDateDue,
    amountTotal: Number(inv.amountTotal),
    amountUntaxed: Number(inv.amountUntaxed),
    amountResidual: Number(inv.amountResidual),
    currencyCode: inv.currencyCode ?? "DOP",
    salespersonName: inv.salespersonName,
    lines,
    linesError,
  };
};
