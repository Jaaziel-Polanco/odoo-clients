import { searchRead } from "@/lib/odoo/client";
import { env } from "@/lib/config/env";

/**
 * Auditoria forense EN VIVO contra Odoo (no usa el mirror local).
 *
 * Detecta ordenes de venta DESPACHADAS pero NO FACTURADAS que fueron CANCELADAS
 * — el caso de las ventas que quedaron "en el aire". Odoo resetea los campos
 * computados al cancelar (invoice_status -> 'no'), asi que no confiamos en ellos:
 * cruzamos los registros reales.
 *
 *   DESPACHADA = tiene un picking de salida (outgoing) en estado 'done'
 *   FACTURADO  = suma de facturas posteadas (out_invoice - out_refund)
 *   PENDIENTE  = amount_total del pedido - monto facturado
 *
 * Marca: state='cancel' AND despachada AND pendiente > tolerancia.
 */

const TOLERANCE = 1;
const CHUNK = 300;

type Many2One = [number, string] | false;

interface SaleOrderRaw {
  id: number;
  name: string;
  partner_id: Many2One;
  amount_total: number;
  currency_id: Many2One;
  date_order: string | false;
  user_id: Many2One;
  write_uid: Many2One;
  write_date: string | false;
  picking_ids: number[];
  invoice_ids: number[];
  client_order_ref: string | false;
}

interface PickingRaw {
  id: number;
  state: string;
  picking_type_code: string | false;
  date_done: string | false;
}

interface MoveRaw {
  id: number;
  state: string;
  move_type: string;
  amount_total: number;
}

export interface CancelledDelivery {
  id: number;
  name: string;
  partnerId: number | null;
  partnerName: string | null;
  salespersonName: string | null;
  lastModifiedBy: string | null;
  orderDate: string | null;
  deliveredDate: string | null;
  writeDate: string | null;
  currency: "USD" | "DOP" | string;
  amountTotal: number;
  amountInvoiced: number;
  amountPending: number;
  clientRef: string | null;
  link: string;
}

export interface CancelledDeliveriesResult {
  rows: CancelledDelivery[];
  totalCancelled: number;
  pendingByCurrency: { currency: string; amount: number; count: number }[];
  bySalesperson: { name: string; count: number; amount: number }[];
  generatedAt: string;
}

const m2oId = (v: Many2One): number | null => (Array.isArray(v) ? v[0] : null);
const m2oName = (v: Many2One): string | null => (Array.isArray(v) ? v[1] : null);

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const webBase = (): string =>
  (env.ODOO_WEB_URL ?? env.ODOO_URL).replace(/\/+$/, "");

const deepLink = (id: number): string =>
  `${webBase()}/web#id=${id}&model=sale.order&view_type=form`;

export const findCancelledDeliveries =
  async (): Promise<CancelledDeliveriesResult> => {
    const cancelled = await searchRead<SaleOrderRaw>(
      "sale.order",
      [["state", "=", "cancel"]],
      {
        fields: [
          "name",
          "partner_id",
          "amount_total",
          "currency_id",
          "date_order",
          "user_id",
          "write_uid",
          "write_date",
          "picking_ids",
          "invoice_ids",
          "client_order_ref",
        ],
        order: "write_date desc",
      },
    );

    const pickingIds = Array.from(
      new Set(cancelled.flatMap((o) => o.picking_ids ?? [])),
    );
    const invoiceIds = Array.from(
      new Set(cancelled.flatMap((o) => o.invoice_ids ?? [])),
    );

    const pickings = new Map<number, PickingRaw>();
    for (const batch of chunk(pickingIds, CHUNK)) {
      const recs = await searchRead<PickingRaw>(
        "stock.picking",
        [["id", "in", batch]],
        { fields: ["state", "picking_type_code", "date_done"] },
      );
      for (const r of recs) pickings.set(r.id, r);
    }

    const moves = new Map<number, MoveRaw>();
    for (const batch of chunk(invoiceIds, CHUNK)) {
      const recs = await searchRead<MoveRaw>(
        "account.move",
        [["id", "in", batch]],
        { fields: ["state", "move_type", "amount_total"] },
      );
      for (const r of recs) moves.set(r.id, r);
    }

    const rows: CancelledDelivery[] = [];
    for (const o of cancelled) {
      let delivered = false;
      let deliveredDate: string | null = null;
      for (const pid of o.picking_ids ?? []) {
        const p = pickings.get(pid);
        if (p && p.state === "done" && p.picking_type_code === "outgoing") {
          delivered = true;
          if (p.date_done && (!deliveredDate || p.date_done > deliveredDate)) {
            deliveredDate = p.date_done;
          }
        }
      }
      if (!delivered) continue;

      let invoiced = 0;
      for (const iid of o.invoice_ids ?? []) {
        const m = moves.get(iid);
        if (!m || m.state !== "posted") continue;
        if (m.move_type === "out_invoice") invoiced += Number(m.amount_total || 0);
        else if (m.move_type === "out_refund") invoiced -= Number(m.amount_total || 0);
      }

      const amountTotal = Number(o.amount_total || 0);
      const pending = amountTotal - invoiced;
      if (pending <= TOLERANCE) continue;

      rows.push({
        id: o.id,
        name: o.name,
        partnerId: m2oId(o.partner_id),
        partnerName: m2oName(o.partner_id),
        salespersonName: m2oName(o.user_id),
        lastModifiedBy: m2oName(o.write_uid),
        orderDate: o.date_order || null,
        deliveredDate,
        writeDate: o.write_date || null,
        currency: m2oName(o.currency_id) ?? "DOP",
        amountTotal,
        amountInvoiced: invoiced,
        amountPending: pending,
        clientRef: o.client_order_ref || null,
        link: deepLink(o.id),
      });
    }

    rows.sort((a, b) => b.amountPending - a.amountPending);

    const curMap = new Map<string, { amount: number; count: number }>();
    const spMap = new Map<string, { count: number; amount: number }>();
    for (const r of rows) {
      const c = curMap.get(r.currency) ?? { amount: 0, count: 0 };
      c.amount += r.amountPending;
      c.count += 1;
      curMap.set(r.currency, c);

      const sp = r.salespersonName ?? "Sin vendedor";
      const s = spMap.get(sp) ?? { count: 0, amount: 0 };
      s.count += 1;
      s.amount += r.amountPending;
      spMap.set(sp, s);
    }

    return {
      rows,
      totalCancelled: cancelled.length,
      pendingByCurrency: Array.from(curMap.entries())
        .map(([currency, v]) => ({ currency, ...v }))
        .sort((a, b) => b.amount - a.amount),
      bySalesperson: Array.from(spMap.entries())
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.amount - a.amount),
      generatedAt: new Date().toISOString(),
    };
  };
