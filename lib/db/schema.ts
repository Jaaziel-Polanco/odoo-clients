import {
  pgTable,
  integer,
  text,
  timestamp,
  date,
  numeric,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const partners = pgTable(
  "partners",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    displayName: text("display_name"),
    email: text("email"),
    phone: text("phone"),
    mobile: text("mobile"),
    vat: text("vat"),
    country: text("country"),
    city: text("city"),
    isCompany: boolean("is_company").notNull().default(false),
    customerRank: integer("customer_rank").notNull().default(0),
    supplierRank: integer("supplier_rank").notNull().default(0),
    active: boolean("active").notNull().default(true),
    categoryNames: jsonb("category_names").$type<string[]>().notNull().default([]),
    createDate: timestamp("create_date", { withTimezone: true }),
    writeDate: timestamp("write_date", { withTimezone: true }).notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("partners_write_date_idx").on(table.writeDate),
    index("partners_customer_rank_idx").on(table.customerRank),
    index("partners_active_idx").on(table.active),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    partnerId: integer("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    moveType: text("move_type").notNull(),
    state: text("state").notNull(),
    paymentState: text("payment_state"),
    invoiceDate: date("invoice_date"),
    invoiceDateDue: date("invoice_date_due"),
    amountTotal: numeric("amount_total", { precision: 18, scale: 4 }).notNull().default("0"),
    amountUntaxed: numeric("amount_untaxed", { precision: 18, scale: 4 }).notNull().default("0"),
    amountResidual: numeric("amount_residual", { precision: 18, scale: 4 }).notNull().default("0"),
    currencyCode: text("currency_code"),
    companyId: integer("company_id"),
    salespersonId: integer("salesperson_id"),
    salespersonName: text("salesperson_name"),
    writeDate: timestamp("write_date", { withTimezone: true }).notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("invoices_partner_idx").on(table.partnerId),
    index("invoices_date_idx").on(table.invoiceDate),
    index("invoices_write_date_idx").on(table.writeDate),
    index("invoices_state_idx").on(table.state),
    index("invoices_move_type_idx").on(table.moveType),
  ],
);

export const saleOrders = pgTable(
  "sale_orders",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    partnerId: integer("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    state: text("state").notNull(),
    invoiceStatus: text("invoice_status"),
    deliveryStatus: text("delivery_status"),
    dateOrder: timestamp("date_order", { withTimezone: true }),
    amountTotal: numeric("amount_total", { precision: 18, scale: 4 }).notNull().default("0"),
    amountUntaxed: numeric("amount_untaxed", { precision: 18, scale: 4 }).notNull().default("0"),
    currencyCode: text("currency_code"),
    companyId: integer("company_id"),
    salespersonId: integer("salesperson_id"),
    salespersonName: text("salesperson_name"),
    writeDate: timestamp("write_date", { withTimezone: true }).notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sale_orders_partner_idx").on(table.partnerId),
    index("sale_orders_date_idx").on(table.dateOrder),
    index("sale_orders_write_date_idx").on(table.writeDate),
    index("sale_orders_state_idx").on(table.state),
    index("sale_orders_salesperson_idx").on(table.salespersonName),
  ],
);

export const syncState = pgTable("sync_state", {
  resource: text("resource").primaryKey(),
  lastWriteDate: timestamp("last_write_date", { withTimezone: true }),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastRunStatus: text("last_run_status"),
  lastRunError: text("last_run_error"),
  lastRunDurationMs: integer("last_run_duration_ms"),
  recordsProcessed: integer("records_processed").notNull().default(0),
});

export const appConfig = pgTable("app_config", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Partner = typeof partners.$inferSelect;
export type NewPartner = typeof partners.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type SaleOrder = typeof saleOrders.$inferSelect;
export type NewSaleOrder = typeof saleOrders.$inferInsert;
export type SyncState = typeof syncState.$inferSelect;
export type AppConfigRow = typeof appConfig.$inferSelect;
