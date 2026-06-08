CREATE TABLE "sale_orders" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"partner_id" integer NOT NULL,
	"state" text NOT NULL,
	"invoice_status" text,
	"delivery_status" text,
	"date_order" timestamp with time zone,
	"amount_total" numeric(18, 4) DEFAULT '0' NOT NULL,
	"amount_untaxed" numeric(18, 4) DEFAULT '0' NOT NULL,
	"currency_code" text,
	"company_id" integer,
	"salesperson_id" integer,
	"salesperson_name" text,
	"write_date" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sale_orders" ADD CONSTRAINT "sale_orders_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sale_orders_partner_idx" ON "sale_orders" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "sale_orders_date_idx" ON "sale_orders" USING btree ("date_order");--> statement-breakpoint
CREATE INDEX "sale_orders_write_date_idx" ON "sale_orders" USING btree ("write_date");--> statement-breakpoint
CREATE INDEX "sale_orders_state_idx" ON "sale_orders" USING btree ("state");--> statement-breakpoint
CREATE INDEX "sale_orders_salesperson_idx" ON "sale_orders" USING btree ("salesperson_name");