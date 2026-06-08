import { searchRead } from "@/lib/odoo/client";
import { env } from "@/lib/config/env";

/**
 * Listado EN VIVO de entregas de salida (outgoing) pendientes que nunca se han
 * entregado y bloquean inventario en Odoo. El vendedor sale de la orden de venta
 * vinculada (sale_id -> sale.order.user_id), con fallback al responsable del
 * picking. Aging por scheduled_date con cortes de 45/60/80/90/120 dias.
 */

const CHUNK = 300;
export const AGING_BUCKETS = [45, 60, 80, 90, 120] as const;

type Many2One = [number, string] | false;

interface PickingRaw {
  id: number;
  name: string;
  state: string;
  origin: string | false;
  scheduled_date: string | false;
  date_deadline: string | false;
  partner_id: Many2One;
  sale_id: Many2One;
  user_id: Many2One;
  picking_type_id: Many2One;
}

interface SaleOrderRaw {
  id: number;
  user_id: Many2One;
  amount_total: number;
  currency_id: Many2One;
}

const STATE_LABELS: Record<string, string> = {
  draft: "Borrador",
  waiting: "En espera",
  confirmed: "Por reservar",
  assigned: "Lista (stock reservado)",
};

export interface PendingDelivery {
  id: number;
  name: string;
  state: string;
  stateLabel: string;
  reservesStock: boolean; // assigned = inventario bloqueado
  origin: string | null;
  warehouse: string | null;
  scheduledDate: string | null;
  ageDays: number | null;
  partnerName: string | null;
  saleOrderId: number | null;
  saleOrderName: string | null;
  salespersonName: string | null;
  link: string;
}

export interface PendingDeliveriesResult {
  rows: PendingDelivery[];
  total: number;
  reservedCount: number; // entregas en estado assigned (stock bloqueado)
  bucketCounts: { days: number; count: number }[]; // acumulado >= days
  bySalesperson: {
    name: string;
    count: number;
    reserved: number;
    oldestDays: number;
  }[];
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

const ageInDays = (iso: string | false): number | null => {
  if (!iso) return null;
  const then = new Date(iso.replace(" ", "T") + "Z").getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
};

export interface FindPendingOptions {
  minAgeDays?: number;
  salesperson?: string;
}

export const findPendingDeliveries = async ({
  minAgeDays,
  salesperson,
}: FindPendingOptions = {}): Promise<PendingDeliveriesResult> => {
  const pickings = await searchRead<PickingRaw>(
    "stock.picking",
    [
      ["picking_type_code", "=", "outgoing"],
      ["state", "not in", ["done", "cancel"]],
    ],
    {
      fields: [
        "name",
        "state",
        "origin",
        "scheduled_date",
        "date_deadline",
        "partner_id",
        "sale_id",
        "user_id",
        "picking_type_id",
      ],
      order: "scheduled_date asc",
    },
  );

  // Vendedor real desde la orden de venta vinculada.
  const saleIds = Array.from(
    new Set(pickings.map((p) => m2oId(p.sale_id)).filter((v): v is number => v != null)),
  );
  const sales = new Map<number, SaleOrderRaw>();
  for (const batch of chunk(saleIds, CHUNK)) {
    const recs = await searchRead<SaleOrderRaw>(
      "sale.order",
      [["id", "in", batch]],
      { fields: ["user_id", "amount_total", "currency_id"] },
    );
    for (const r of recs) sales.set(r.id, r);
  }

  const rows: PendingDelivery[] = pickings.map((p) => {
    const saleId = m2oId(p.sale_id);
    const sale = saleId != null ? sales.get(saleId) : undefined;
    const salesperson =
      (sale && m2oName(sale.user_id)) || m2oName(p.user_id) || null;
    return {
      id: p.id,
      name: p.name,
      state: p.state,
      stateLabel: STATE_LABELS[p.state] ?? p.state,
      reservesStock: p.state === "assigned",
      origin: p.origin || null,
      warehouse: m2oName(p.picking_type_id),
      scheduledDate: p.scheduled_date || null,
      ageDays: ageInDays(p.scheduled_date),
      partnerName: m2oName(p.partner_id),
      saleOrderId: saleId,
      saleOrderName: m2oName(p.sale_id),
      salespersonName: salesperson,
      link: `${webBase()}/web#id=${p.id}&model=stock.picking&view_type=form`,
    };
  });

  // Stats sobre el universo completo (independientes de los filtros) para los cortes.
  const bucketCounts = AGING_BUCKETS.map((days) => ({
    days,
    count: rows.filter((r) => (r.ageDays ?? -1) >= days).length,
  }));
  const reservedCount = rows.filter((r) => r.reservesStock).length;
  const total = rows.length;

  // Corte de antigüedad: define el universo del desglose por vendedor.
  let bucketRows = rows;
  if (minAgeDays != null) {
    bucketRows = bucketRows.filter((r) => (r.ageDays ?? -1) >= minAgeDays);
  }

  // El desglose por vendedor se calcula sobre el corte (no sobre el filtro de
  // vendedor) para que el dropdown y la tarjeta muestren a todos del bucket.
  const spMap = new Map<string, { count: number; reserved: number; oldestDays: number }>();
  for (const r of bucketRows) {
    const name = r.salespersonName ?? "Sin vendedor";
    const cur = spMap.get(name) ?? { count: 0, reserved: 0, oldestDays: 0 };
    cur.count += 1;
    if (r.reservesStock) cur.reserved += 1;
    cur.oldestDays = Math.max(cur.oldestDays, r.ageDays ?? 0);
    spMap.set(name, cur);
  }

  // Filtro de vendedor: aplica solo a las filas mostradas en la tabla.
  let finalRows = bucketRows;
  if (salesperson) {
    finalRows = finalRows.filter(
      (r) => (r.salespersonName ?? "Sin vendedor") === salesperson,
    );
  }
  finalRows = [...finalRows].sort((a, b) => (b.ageDays ?? -1) - (a.ageDays ?? -1));

  return {
    rows: finalRows,
    total,
    reservedCount,
    bucketCounts,
    bySalesperson: Array.from(spMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count),
    generatedAt: new Date().toISOString(),
  };
};
