import { sql, inArray, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { invoices, partners, saleOrders, syncState } from "@/lib/db/schema";
import type { NewInvoice, NewPartner, NewSaleOrder } from "@/lib/db/schema";
import { fetchInvoices, fetchPartners, fetchSaleOrders } from "@/lib/odoo/client";
import type {
  OdooInvoiceRaw,
  OdooPartnerRaw,
  OdooSaleOrderRaw,
  OdooDomain,
} from "@/lib/odoo/types";
import {
  odooStr,
  parseMany2one,
  parseOdooDate,
  parseOdooDateTime,
} from "@/lib/odoo/parse";

const BATCH_SIZE = 200;

export type SyncResource = "partners" | "invoices" | "sale_orders";

export interface SyncRunResult {
  resource: SyncResource;
  status: "ok" | "error";
  recordsProcessed: number;
  durationMs: number;
  lastWriteDate: Date | null;
  error?: string;
}

const mapPartner = (raw: OdooPartnerRaw): NewPartner => {
  const country = parseMany2one<string>(raw.country_id ?? false);
  const categories = Array.isArray(raw.category_id)
    ? raw.category_id
        .map((c) => (Array.isArray(c) ? c[1] : null))
        .filter((v): v is string => typeof v === "string")
    : [];
  const writeDate = parseOdooDateTime(raw.write_date);
  if (!writeDate) {
    throw new Error(`partner ${raw.id} sin write_date`);
  }
  return {
    id: raw.id,
    name: raw.name,
    displayName: odooStr(raw.display_name as string | false | undefined),
    email: odooStr(raw.email),
    phone: odooStr(raw.phone),
    mobile: odooStr(raw.mobile),
    vat: odooStr(raw.vat),
    country: country?.name ?? null,
    city: odooStr(raw.city),
    isCompany: raw.is_company ?? false,
    customerRank: raw.customer_rank ?? 0,
    supplierRank: raw.supplier_rank ?? 0,
    active: raw.active ?? true,
    categoryNames: categories,
    createDate: parseOdooDateTime(raw.create_date),
    writeDate,
  };
};

const mapInvoice = (raw: OdooInvoiceRaw): NewInvoice | null => {
  const partner = parseMany2one(raw.partner_id);
  if (!partner) return null;
  const writeDate = parseOdooDateTime(raw.write_date);
  if (!writeDate) return null;
  const currency = parseMany2one<string>(raw.currency_id ?? false);
  const salesperson = parseMany2one<string>(raw.invoice_user_id ?? false);
  return {
    id: raw.id,
    name: raw.name,
    partnerId: partner.id,
    moveType: raw.move_type,
    state: raw.state,
    paymentState: odooStr(raw.payment_state),
    invoiceDate: parseOdooDate(raw.invoice_date),
    invoiceDateDue: parseOdooDate(raw.invoice_date_due),
    amountTotal: String(raw.amount_total ?? 0),
    amountUntaxed: String(raw.amount_untaxed ?? 0),
    amountResidual: String(raw.amount_residual ?? 0),
    currencyCode: currency?.name ?? null,
    companyId: parseMany2one(raw.company_id ?? false)?.id ?? null,
    salespersonId: salesperson?.id ?? null,
    salespersonName: salesperson?.name ?? null,
    writeDate,
  };
};

const mapSaleOrder = (raw: OdooSaleOrderRaw): NewSaleOrder | null => {
  const partner = parseMany2one(raw.partner_id);
  if (!partner) return null;
  const writeDate = parseOdooDateTime(raw.write_date);
  if (!writeDate) return null;
  const currency = parseMany2one<string>(raw.currency_id ?? false);
  const salesperson = parseMany2one<string>(raw.user_id ?? false);
  return {
    id: raw.id,
    name: raw.name,
    partnerId: partner.id,
    state: raw.state,
    invoiceStatus: odooStr(raw.invoice_status),
    deliveryStatus: odooStr(raw.delivery_status),
    dateOrder: parseOdooDateTime(raw.date_order),
    amountTotal: String(raw.amount_total ?? 0),
    amountUntaxed: String(raw.amount_untaxed ?? 0),
    currencyCode: currency?.name ?? null,
    companyId: parseMany2one(raw.company_id ?? false)?.id ?? null,
    salespersonId: salesperson?.id ?? null,
    salespersonName: salesperson?.name ?? null,
    writeDate,
  };
};

const getLastWriteDate = async (resource: SyncResource): Promise<Date | null> => {
  const rows = await db
    .select()
    .from(syncState)
    .where(eq(syncState.resource, resource))
    .limit(1);
  return rows[0]?.lastWriteDate ?? null;
};

const formatOdooDate = (d: Date) =>
  d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");

const upsertPartners = async (rows: NewPartner[]): Promise<void> => {
  if (rows.length === 0) return;
  await db
    .insert(partners)
    .values(rows)
    .onConflictDoUpdate({
      target: partners.id,
      set: {
        name: sql`excluded.name`,
        displayName: sql`excluded.display_name`,
        email: sql`excluded.email`,
        phone: sql`excluded.phone`,
        mobile: sql`excluded.mobile`,
        vat: sql`excluded.vat`,
        country: sql`excluded.country`,
        city: sql`excluded.city`,
        isCompany: sql`excluded.is_company`,
        customerRank: sql`excluded.customer_rank`,
        supplierRank: sql`excluded.supplier_rank`,
        active: sql`excluded.active`,
        categoryNames: sql`excluded.category_names`,
        createDate: sql`excluded.create_date`,
        writeDate: sql`excluded.write_date`,
        syncedAt: sql`now()`,
      },
    });
};

const upsertInvoices = async (rows: NewInvoice[]): Promise<void> => {
  if (rows.length === 0) return;
  await db
    .insert(invoices)
    .values(rows)
    .onConflictDoUpdate({
      target: invoices.id,
      set: {
        name: sql`excluded.name`,
        partnerId: sql`excluded.partner_id`,
        moveType: sql`excluded.move_type`,
        state: sql`excluded.state`,
        paymentState: sql`excluded.payment_state`,
        invoiceDate: sql`excluded.invoice_date`,
        invoiceDateDue: sql`excluded.invoice_date_due`,
        amountTotal: sql`excluded.amount_total`,
        amountUntaxed: sql`excluded.amount_untaxed`,
        amountResidual: sql`excluded.amount_residual`,
        currencyCode: sql`excluded.currency_code`,
        companyId: sql`excluded.company_id`,
        salespersonId: sql`excluded.salesperson_id`,
        salespersonName: sql`excluded.salesperson_name`,
        writeDate: sql`excluded.write_date`,
        syncedAt: sql`now()`,
      },
    });
};

const upsertSaleOrders = async (rows: NewSaleOrder[]): Promise<void> => {
  if (rows.length === 0) return;
  await db
    .insert(saleOrders)
    .values(rows)
    .onConflictDoUpdate({
      target: saleOrders.id,
      set: {
        name: sql`excluded.name`,
        partnerId: sql`excluded.partner_id`,
        state: sql`excluded.state`,
        invoiceStatus: sql`excluded.invoice_status`,
        deliveryStatus: sql`excluded.delivery_status`,
        dateOrder: sql`excluded.date_order`,
        amountTotal: sql`excluded.amount_total`,
        amountUntaxed: sql`excluded.amount_untaxed`,
        currencyCode: sql`excluded.currency_code`,
        companyId: sql`excluded.company_id`,
        salespersonId: sql`excluded.salesperson_id`,
        salespersonName: sql`excluded.salesperson_name`,
        writeDate: sql`excluded.write_date`,
        syncedAt: sql`now()`,
      },
    });
};

const recordSyncRun = async (
  resource: SyncResource,
  result: Omit<SyncRunResult, "resource">,
): Promise<void> => {
  await db
    .insert(syncState)
    .values({
      resource,
      lastWriteDate: result.lastWriteDate,
      lastRunAt: new Date(),
      lastRunStatus: result.status,
      lastRunError: result.error ?? null,
      lastRunDurationMs: result.durationMs,
      recordsProcessed: result.recordsProcessed,
    })
    .onConflictDoUpdate({
      target: syncState.resource,
      set: {
        lastWriteDate: result.lastWriteDate ?? sql`${syncState.lastWriteDate}`,
        lastRunAt: new Date(),
        lastRunStatus: result.status,
        lastRunError: result.error ?? null,
        lastRunDurationMs: result.durationMs,
        recordsProcessed: result.recordsProcessed,
      },
    });
};

const syncPartnersIncremental = async (): Promise<SyncRunResult> => {
  const start = Date.now();
  const lastWriteDate = await getLastWriteDate("partners");
  const baseDomain: OdooDomain = [];
  const domain: OdooDomain = lastWriteDate
    ? [...baseDomain, ["write_date", ">", formatOdooDate(lastWriteDate)]]
    : baseDomain;

  let offset = 0;
  let total = 0;
  let maxWriteDate: Date | null = lastWriteDate;
  try {
    while (true) {
      const batch = await fetchPartners(domain, { limit: BATCH_SIZE, offset });
      if (batch.length === 0) break;
      const mapped = batch.map(mapPartner);
      await upsertPartners(mapped);
      for (const p of mapped) {
        if (!maxWriteDate || p.writeDate > maxWriteDate) maxWriteDate = p.writeDate;
      }
      total += mapped.length;
      if (batch.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
    }
    const result: SyncRunResult = {
      resource: "partners",
      status: "ok",
      recordsProcessed: total,
      durationMs: Date.now() - start,
      lastWriteDate: maxWriteDate,
    };
    await recordSyncRun("partners", result);
    return result;
  } catch (err) {
    const result: SyncRunResult = {
      resource: "partners",
      status: "error",
      recordsProcessed: total,
      durationMs: Date.now() - start,
      lastWriteDate,
      error: err instanceof Error ? err.message : String(err),
    };
    await recordSyncRun("partners", result);
    return result;
  }
};

const ensurePartnersExist = async (partnerIds: number[]): Promise<void> => {
  if (partnerIds.length === 0) return;
  const existing = await db
    .select({ id: partners.id })
    .from(partners)
    .where(inArray(partners.id, partnerIds));
  const existingSet = new Set(existing.map((r) => r.id));
  const missing = partnerIds.filter((id) => !existingSet.has(id));
  if (missing.length === 0) return;
  const fetched = await fetchPartners([["id", "in", missing]], {
    context: { active_test: false },
  });
  await upsertPartners(fetched.map(mapPartner));
};

const syncInvoicesIncremental = async (): Promise<SyncRunResult> => {
  const start = Date.now();
  const lastWriteDate = await getLastWriteDate("invoices");
  const baseDomain: OdooDomain = [
    ["move_type", "in", ["out_invoice", "out_refund"]],
  ];
  const domain: OdooDomain = lastWriteDate
    ? [...baseDomain, ["write_date", ">", formatOdooDate(lastWriteDate)]]
    : baseDomain;

  let offset = 0;
  let total = 0;
  let maxWriteDate: Date | null = lastWriteDate;
  try {
    while (true) {
      const batch = await fetchInvoices(domain, { limit: BATCH_SIZE, offset });
      if (batch.length === 0) break;
      const mapped = batch
        .map(mapInvoice)
        .filter((v): v is NewInvoice => v !== null);
      const partnerIds = Array.from(new Set(mapped.map((m) => m.partnerId)));
      await ensurePartnersExist(partnerIds);
      await upsertInvoices(mapped);
      for (const inv of mapped) {
        if (!maxWriteDate || inv.writeDate > maxWriteDate) maxWriteDate = inv.writeDate;
      }
      total += mapped.length;
      if (batch.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
    }
    const result: SyncRunResult = {
      resource: "invoices",
      status: "ok",
      recordsProcessed: total,
      durationMs: Date.now() - start,
      lastWriteDate: maxWriteDate,
    };
    await recordSyncRun("invoices", result);
    return result;
  } catch (err) {
    const result: SyncRunResult = {
      resource: "invoices",
      status: "error",
      recordsProcessed: total,
      durationMs: Date.now() - start,
      lastWriteDate,
      error: err instanceof Error ? err.message : String(err),
    };
    await recordSyncRun("invoices", result);
    return result;
  }
};

const syncSaleOrdersIncremental = async (): Promise<SyncRunResult> => {
  const start = Date.now();
  const lastWriteDate = await getLastWriteDate("sale_orders");
  // Solo ordenes confirmadas (ventas reales), no cotizaciones ni canceladas.
  const baseDomain: OdooDomain = [["state", "in", ["sale", "done"]]];
  const domain: OdooDomain = lastWriteDate
    ? [...baseDomain, ["write_date", ">", formatOdooDate(lastWriteDate)]]
    : baseDomain;

  let offset = 0;
  let total = 0;
  let maxWriteDate: Date | null = lastWriteDate;
  try {
    while (true) {
      const batch = await fetchSaleOrders(domain, { limit: BATCH_SIZE, offset });
      if (batch.length === 0) break;
      const mapped = batch
        .map(mapSaleOrder)
        .filter((v): v is NewSaleOrder => v !== null);
      const partnerIds = Array.from(new Set(mapped.map((m) => m.partnerId)));
      await ensurePartnersExist(partnerIds);
      await upsertSaleOrders(mapped);
      for (const so of mapped) {
        if (!maxWriteDate || so.writeDate > maxWriteDate) maxWriteDate = so.writeDate;
      }
      total += mapped.length;
      if (batch.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
    }
    const result: SyncRunResult = {
      resource: "sale_orders",
      status: "ok",
      recordsProcessed: total,
      durationMs: Date.now() - start,
      lastWriteDate: maxWriteDate,
    };
    await recordSyncRun("sale_orders", result);
    return result;
  } catch (err) {
    const result: SyncRunResult = {
      resource: "sale_orders",
      status: "error",
      recordsProcessed: total,
      durationMs: Date.now() - start,
      lastWriteDate,
      error: err instanceof Error ? err.message : String(err),
    };
    await recordSyncRun("sale_orders", result);
    return result;
  }
};

export const runFullSync = async (): Promise<{
  partners: SyncRunResult;
  invoices: SyncRunResult;
  saleOrders: SyncRunResult;
}> => {
  const partnersResult = await syncPartnersIncremental();
  const invoicesResult = await syncInvoicesIncremental();
  const saleOrdersResult = await syncSaleOrdersIncremental();
  return {
    partners: partnersResult,
    invoices: invoicesResult,
    saleOrders: saleOrdersResult,
  };
};

export const getSyncStatus = async () => {
  const rows = await db.select().from(syncState);
  return rows;
};
