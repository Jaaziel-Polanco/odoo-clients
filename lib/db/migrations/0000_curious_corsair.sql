CREATE TABLE "app_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"partner_id" integer NOT NULL,
	"move_type" text NOT NULL,
	"state" text NOT NULL,
	"payment_state" text,
	"invoice_date" date,
	"invoice_date_due" date,
	"amount_total" numeric(18, 4) DEFAULT '0' NOT NULL,
	"amount_untaxed" numeric(18, 4) DEFAULT '0' NOT NULL,
	"amount_residual" numeric(18, 4) DEFAULT '0' NOT NULL,
	"currency_code" text,
	"company_id" integer,
	"salesperson_id" integer,
	"salesperson_name" text,
	"write_date" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text,
	"email" text,
	"phone" text,
	"mobile" text,
	"vat" text,
	"country" text,
	"city" text,
	"is_company" boolean DEFAULT false NOT NULL,
	"customer_rank" integer DEFAULT 0 NOT NULL,
	"supplier_rank" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"category_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"create_date" timestamp with time zone,
	"write_date" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_state" (
	"resource" text PRIMARY KEY NOT NULL,
	"last_write_date" timestamp with time zone,
	"last_run_at" timestamp with time zone,
	"last_run_status" text,
	"last_run_error" text,
	"last_run_duration_ms" integer,
	"records_processed" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoices_partner_idx" ON "invoices" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "invoices_date_idx" ON "invoices" USING btree ("invoice_date");--> statement-breakpoint
CREATE INDEX "invoices_write_date_idx" ON "invoices" USING btree ("write_date");--> statement-breakpoint
CREATE INDEX "invoices_state_idx" ON "invoices" USING btree ("state");--> statement-breakpoint
CREATE INDEX "invoices_move_type_idx" ON "invoices" USING btree ("move_type");--> statement-breakpoint
CREATE INDEX "partners_write_date_idx" ON "partners" USING btree ("write_date");--> statement-breakpoint
CREATE INDEX "partners_customer_rank_idx" ON "partners" USING btree ("customer_rank");--> statement-breakpoint
CREATE INDEX "partners_active_idx" ON "partners" USING btree ("active");