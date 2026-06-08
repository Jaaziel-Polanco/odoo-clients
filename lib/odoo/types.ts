export type OdooDomain = Array<OdooDomainCondition | "&" | "|" | "!">;
export type OdooDomainCondition = readonly [string, OdooOperator, OdooValue];

export type OdooOperator =
  | "="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "in"
  | "not in"
  | "like"
  | "ilike"
  | "not like"
  | "child_of"
  | "parent_of";

export type OdooValue = string | number | boolean | Date | Array<string | number> | null;

export interface OdooPartnerRaw {
  id: number;
  name: string;
  display_name?: string | false;
  email?: string | false;
  phone?: string | false;
  mobile?: string | false;
  vat?: string | false;
  country_id?: [number, string] | false;
  city?: string | false;
  is_company?: boolean;
  customer_rank?: number;
  supplier_rank?: number;
  active?: boolean;
  category_id?: Array<[number, string]> | number[];
  create_date?: string | false;
  write_date?: string;
}

export interface OdooInvoiceRaw {
  id: number;
  name: string;
  partner_id: [number, string] | false;
  move_type: string;
  state: string;
  payment_state?: string | false;
  invoice_date?: string | false;
  invoice_date_due?: string | false;
  amount_total: number;
  amount_untaxed: number;
  amount_residual: number;
  currency_id?: [number, string] | false;
  company_id?: [number, string] | false;
  invoice_user_id?: [number, string] | false;
  write_date: string;
}

export interface SearchReadOptions {
  fields?: string[];
  limit?: number;
  offset?: number;
  order?: string;
  context?: Record<string, unknown>;
}

export interface OdooInvoiceLineRaw {
  id: number;
  sequence: number;
  name?: string | false;
  product_id?: [number, string] | false;
  product_uom_id?: [number, string] | false;
  quantity?: number;
  price_unit?: number;
  discount?: number;
  price_subtotal?: number;
  price_total?: number;
  tax_ids?: number[];
  display_type?: string | false;
}
