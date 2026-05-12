import xmlrpc from "xmlrpc";
import { env } from "@/lib/config/env";
import type {
  OdooDomain,
  OdooInvoiceLineRaw,
  OdooInvoiceRaw,
  OdooPartnerRaw,
  SearchReadOptions,
} from "./types";

class OdooApiError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "OdooApiError";
  }
}

const buildClient = (path: string) => {
  const url = new URL(env.ODOO_URL);
  const isSecure = url.protocol === "https:";
  const factory = isSecure ? xmlrpc.createSecureClient : xmlrpc.createClient;
  return factory({
    host: url.hostname,
    port: url.port ? Number(url.port) : isSecure ? 443 : 80,
    path,
  });
};

const methodCall = <T>(
  client: ReturnType<typeof xmlrpc.createClient>,
  method: string,
  params: unknown[],
): Promise<T> =>
  new Promise((resolve, reject) => {
    client.methodCall(method, params, (err, value) => {
      if (err) return reject(new OdooApiError(`Odoo ${method} fallo`, err));
      resolve(value as T);
    });
  });

let cachedUid: number | null = null;

const authenticate = async (): Promise<number> => {
  if (cachedUid !== null) return cachedUid;
  const common = buildClient("/xmlrpc/2/common");
  const uid = await methodCall<number | false>(common, "authenticate", [
    env.ODOO_DB,
    env.ODOO_USERNAME,
    env.ODOO_API_KEY,
    {},
  ]);
  if (!uid || typeof uid !== "number") {
    throw new OdooApiError(
      "Autenticacion fallo. Verifica ODOO_DB, ODOO_USERNAME, ODOO_API_KEY.",
    );
  }
  cachedUid = uid;
  return uid;
};

const executeKw = async <T>(
  model: string,
  method: string,
  args: unknown[],
  kwargs: Record<string, unknown> = {},
): Promise<T> => {
  const uid = await authenticate();
  const object = buildClient("/xmlrpc/2/object");
  return methodCall<T>(object, "execute_kw", [
    env.ODOO_DB,
    uid,
    env.ODOO_API_KEY,
    model,
    method,
    args,
    kwargs,
  ]);
};

export const searchRead = async <T>(
  model: string,
  domain: OdooDomain,
  options: SearchReadOptions = {},
): Promise<T[]> => {
  const kwargs: Record<string, unknown> = {};
  if (options.fields) kwargs.fields = options.fields;
  if (options.limit !== undefined) kwargs.limit = options.limit;
  if (options.offset !== undefined) kwargs.offset = options.offset;
  if (options.order) kwargs.order = options.order;
  return executeKw<T[]>(model, "search_read", [domain], kwargs);
};

export const searchCount = (model: string, domain: OdooDomain): Promise<number> =>
  executeKw<number>(model, "search_count", [domain]);

const PARTNER_FIELDS = [
  "id",
  "name",
  "display_name",
  "email",
  "phone",
  "mobile",
  "vat",
  "country_id",
  "city",
  "is_company",
  "customer_rank",
  "supplier_rank",
  "active",
  "category_id",
  "create_date",
  "write_date",
];

const INVOICE_FIELDS = [
  "id",
  "name",
  "partner_id",
  "move_type",
  "state",
  "payment_state",
  "invoice_date",
  "invoice_date_due",
  "amount_total",
  "amount_untaxed",
  "amount_residual",
  "currency_id",
  "company_id",
  "invoice_user_id",
  "write_date",
];

export const fetchPartners = (
  domain: OdooDomain = [],
  options: Omit<SearchReadOptions, "fields"> = {},
): Promise<OdooPartnerRaw[]> =>
  searchRead<OdooPartnerRaw>("res.partner", domain, {
    fields: PARTNER_FIELDS,
    order: "write_date asc, id asc",
    ...options,
  });

export const fetchInvoices = (
  domain: OdooDomain = [],
  options: Omit<SearchReadOptions, "fields"> = {},
): Promise<OdooInvoiceRaw[]> =>
  searchRead<OdooInvoiceRaw>("account.move", domain, {
    fields: INVOICE_FIELDS,
    order: "write_date asc, id asc",
    ...options,
  });

const INVOICE_LINE_FIELDS = [
  "id",
  "sequence",
  "name",
  "product_id",
  "product_uom_id",
  "quantity",
  "price_unit",
  "discount",
  "price_subtotal",
  "price_total",
  "tax_ids",
  "display_type",
];

export const fetchInvoiceLines = (invoiceId: number): Promise<OdooInvoiceLineRaw[]> =>
  searchRead<OdooInvoiceLineRaw>(
    "account.move.line",
    [
      ["move_id", "=", invoiceId],
      ["display_type", "!=", "payment_term"],
    ],
    {
      fields: INVOICE_LINE_FIELDS,
      order: "sequence asc, id asc",
      limit: 500,
    },
  );

export const fetchTaxNames = async (taxIds: number[]): Promise<Record<number, string>> => {
  if (taxIds.length === 0) return {};
  const rows = await searchRead<{ id: number; name: string }>(
    "account.tax",
    [["id", "in", taxIds]],
    { fields: ["id", "name"] },
  );
  return Object.fromEntries(rows.map((r) => [r.id, r.name]));
};

export const pingOdoo = async (): Promise<{ ok: boolean; uid?: number; error?: string }> => {
  try {
    cachedUid = null;
    const uid = await authenticate();
    return { ok: true, uid };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
};

export { OdooApiError };
