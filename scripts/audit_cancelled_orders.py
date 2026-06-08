#!/usr/bin/env python3
"""
Auditoria forense: ordenes de venta DESPACHADAS pero NO FACTURADAS que fueron
CANCELADAS en Odoo.

Contexto: una vendedora, antes de ser despedida, cancelo ordenes de venta que ya
estaban entregadas y pendientes de facturar. Al cancelarlas, Odoo resetea los
campos computados (invoice_status -> 'no', etc.), asi que NO confiamos en ellos.
En su lugar cruzamos los registros reales:

  - DESPACHADA  = tiene al menos un picking de salida en estado 'done'
  - FACTURADO   = suma de facturas posteadas (out_invoice - out_refund)
  - PENDIENTE   = amount_total del pedido - monto facturado

Una orden queda marcada si: state='cancel' AND despachada AND pendiente > 0.

Uso:
    python3 scripts/audit_cancelled_orders.py [--env .env.local] [--csv salida.csv]

Las credenciales se leen de .env.local (o del entorno):
    ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_API_KEY
"""

from __future__ import annotations

import argparse
import csv
import os
from collections import defaultdict
from xmlrpc import client as xmlrpc_client

TOLERANCE = 1.0  # margen en moneda para considerar "facturado completo"
CHUNK = 300


def load_env(path: str) -> dict[str, str]:
    env: dict[str, str] = {}
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as fh:
            for raw in fh:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                env[key.strip()] = value.strip().strip('"').strip("'")
    # el entorno gana sobre el archivo
    for key in ("ODOO_URL", "ODOO_DB", "ODOO_USERNAME", "ODOO_API_KEY", "ODOO_WEB_URL"):
        if os.environ.get(key):
            env[key] = os.environ[key]
    return env


def chunked(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


def fmt_money(amount: float) -> str:
    return f"{amount:,.2f}"


class Odoo:
    def __init__(self, url: str, db: str, username: str, api_key: str):
        self.base = url.rstrip("/")
        self.db = db
        self.username = username
        self.api_key = api_key
        self.common = xmlrpc_client.ServerProxy(f"{self.base}/xmlrpc/2/common", allow_none=True)
        self.models = xmlrpc_client.ServerProxy(f"{self.base}/xmlrpc/2/object", allow_none=True)
        self.uid = self.common.authenticate(db, username, api_key, {})
        if not self.uid:
            raise SystemExit("Autenticacion fallo. Verifica ODOO_DB, ODOO_USERNAME, ODOO_API_KEY.")

    def search_read(self, model, domain, fields, **kw):
        return self.models.execute_kw(
            self.db, self.uid, self.api_key, model, "search_read", [domain], {"fields": fields, **kw}
        )

    def search_count(self, model, domain):
        return self.models.execute_kw(
            self.db, self.uid, self.api_key, model, "search_count", [domain]
        )


def m2o_name(value):
    return value[1] if isinstance(value, (list, tuple)) and len(value) > 1 else None


def m2o_id(value):
    return value[0] if isinstance(value, (list, tuple)) and value else None


def resolve_cancellers(odoo: "Odoo", order_ids: list[int]) -> dict[int, tuple[str, str]]:
    """Saca del chatter (mail.message + tracking) quien movio el estado a Cancelado
    y cuando. Es la senal forense real, a diferencia de write_uid que OdooBot
    sobreescribe en recalculos posteriores."""
    result: dict[int, tuple[str, str]] = {}
    msgs = []
    try:
        for batch in chunked(order_ids, CHUNK):
            msgs += odoo.search_read(
                "mail.message",
                [["model", "=", "sale.order"], ["res_id", "in", batch],
                 ["tracking_value_ids", "!=", False]],
                ["res_id", "author_id", "date", "tracking_value_ids"],
                order="date asc",
            )
    except Exception as exc:  # noqa: BLE001
        print(f"  (aviso: no se pudo leer el chatter: {exc})")
        return result

    tv_ids = sorted({t for m in msgs for t in (m.get("tracking_value_ids") or [])})
    tvs: dict[int, dict] = {}
    for batch in chunked(tv_ids, CHUNK):
        try:
            for tv in odoo.search_read(
                "mail.tracking.value", [["id", "in", batch]],
                ["old_value_char", "new_value_char", "field_desc"],
            ):
                tvs[tv["id"]] = tv
        except Exception:  # noqa: BLE001
            pass

    for m in msgs:  # orden cronologico: la ultima transicion a cancel gana
        for tid in m.get("tracking_value_ids") or []:
            tv = tvs.get(tid)
            if not tv:
                continue
            newv = (tv.get("new_value_char") or "").strip().lower()
            if "cancel" in newv:
                result[m["res_id"]] = (m2o_name(m.get("author_id")) or "?", m.get("date") or "")
    return result


def run(env: dict, csv_path: str):
    url = env.get("ODOO_URL")
    db = env.get("ODOO_DB")
    user = env.get("ODOO_USERNAME")
    key = env.get("ODOO_API_KEY")
    web_base = (env.get("ODOO_WEB_URL") or url or "").rstrip("/")
    if not all([url, db, user, key]):
        raise SystemExit("Faltan credenciales: ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_API_KEY")

    print(f"Conectando a {url}  (db={db})...")
    odoo = Odoo(url, db, user, key)
    print(f"  uid={odoo.uid}  usuario={user}\n")

    total_cancel = odoo.search_count("sale.order", [["state", "=", "cancel"]])
    print(f"Ordenes de venta canceladas en total: {total_cancel}")

    cancelled = odoo.search_read(
        "sale.order",
        [["state", "=", "cancel"]],
        [
            "name", "partner_id", "amount_total", "amount_untaxed", "currency_id",
            "date_order", "user_id", "write_uid", "write_date", "create_date",
            "picking_ids", "invoice_ids", "client_order_ref",
            "invoice_status", "delivery_status",
        ],
        order="write_date desc",
    )

    # --- batch read de pickings y facturas vinculadas ---
    all_picking_ids = sorted({pid for o in cancelled for pid in (o.get("picking_ids") or [])})
    all_invoice_ids = sorted({iid for o in cancelled for iid in (o.get("invoice_ids") or [])})

    pickings: dict[int, dict] = {}
    for batch in chunked(all_picking_ids, CHUNK):
        for p in odoo.search_read(
            "stock.picking", [["id", "in", batch]],
            ["state", "picking_type_code", "date_done"],
        ):
            pickings[p["id"]] = p

    moves: dict[int, dict] = {}
    for batch in chunked(all_invoice_ids, CHUNK):
        for m in odoo.search_read(
            "account.move", [["id", "in", batch]],
            ["state", "move_type", "amount_total"],
        ):
            moves[m["id"]] = m

    flagged = []
    for o in cancelled:
        # despachada: algun picking de salida en estado 'done'
        delivered = False
        delivered_date = None
        for pid in o.get("picking_ids") or []:
            p = pickings.get(pid)
            if p and p.get("state") == "done" and p.get("picking_type_code") == "outgoing":
                delivered = True
                if p.get("date_done"):
                    delivered_date = max(delivered_date or "", p["date_done"])

        # facturado: out_invoice posteadas - out_refund posteadas
        invoiced_amount = 0.0
        for iid in o.get("invoice_ids") or []:
            m = moves.get(iid)
            if not m or m.get("state") != "posted":
                continue
            if m.get("move_type") == "out_invoice":
                invoiced_amount += float(m.get("amount_total") or 0)
            elif m.get("move_type") == "out_refund":
                invoiced_amount -= float(m.get("amount_total") or 0)

        amount_total = float(o.get("amount_total") or 0)
        pendiente = amount_total - invoiced_amount

        if delivered and pendiente > TOLERANCE:
            flagged.append({
                "id": o["id"],
                "name": o["name"],
                "cliente": m2o_name(o.get("partner_id")) or "",
                "partner_id": m2o_id(o.get("partner_id")),
                "vendedor": m2o_name(o.get("user_id")) or "",
                "cancelado_por": m2o_name(o.get("write_uid")) or "",
                "fecha_modificacion": o.get("write_date") or "",
                "fecha_orden": o.get("date_order") or "",
                "fecha_despacho": delivered_date or "",
                "moneda": m2o_name(o.get("currency_id")) or "",
                "monto_total": amount_total,
                "monto_facturado": invoiced_amount,
                "monto_pendiente": pendiente,
                "ref_cliente": o.get("client_order_ref") or "",
                "link": f"{web_base}/web#id={o['id']}&model=sale.order&view_type=form",
            })

    # ---------------- cancelador real desde el chatter ----------------
    chatter_ok = False
    if flagged:
        print("Resolviendo autor real de la cancelacion desde el chatter...")
        cancellers = resolve_cancellers(odoo, [f["id"] for f in flagged])
        chatter_ok = bool(cancellers)
        for f in flagged:
            real = cancellers.get(f["id"])
            if real:
                f["cancelado_real_por"], f["fecha_cancelacion"] = real
            else:
                f["cancelado_real_por"] = f["cancelado_por"]  # fallback a write_uid
                f["fecha_cancelacion"] = ""

    # ---------------- reporte ----------------
    print(f"\nOrdenes canceladas DESPACHADAS y NO FACTURADAS (con saldo): {len(flagged)}\n")
    if not flagged:
        print("Nada marcado. No se detectaron ordenes despachadas sin facturar.")
        return

    by_cur = defaultdict(float)
    by_vendedor = defaultdict(lambda: [0, 0.0])
    by_canceller = defaultdict(lambda: [0, 0.0])
    by_day = defaultdict(lambda: [0, 0.0])
    for f in flagged:
        by_cur[f["moneda"]] += f["monto_pendiente"]
        by_vendedor[f["vendedor"]][0] += 1
        by_vendedor[f["vendedor"]][1] += f["monto_pendiente"]
        by_canceller[f.get("cancelado_real_por") or f["cancelado_por"]][0] += 1
        by_canceller[f.get("cancelado_real_por") or f["cancelado_por"]][1] += f["monto_pendiente"]
        day = (f.get("fecha_cancelacion") or f["fecha_modificacion"] or "")[:10]
        by_day[day][0] += 1
        by_day[day][1] += f["monto_pendiente"]

    print("== MONTO PENDIENTE DE FACTURAR (por moneda) ==")
    for cur, amt in sorted(by_cur.items(), key=lambda x: -x[1]):
        print(f"  {cur or '?':<5} {fmt_money(amt)}")

    print("\n== POR VENDEDOR ASIGNADO ==")
    for name, (cnt, amt) in sorted(by_vendedor.items(), key=lambda x: -x[1][1]):
        print(f"  {cnt:>3} ordenes  {fmt_money(amt):>16}  {name}")

    canceller_src = (
        "autor real del cambio a Cancelado, desde el chatter"
        if chatter_ok
        else "write_uid = ultima modificacion; el chatter no es accesible con este usuario API"
    )
    print(f"\n== POR USUARIO QUE CANCELO ({canceller_src}) ==")
    for name, (cnt, amt) in sorted(by_canceller.items(), key=lambda x: -x[1][0]):
        print(f"  {cnt:>3} ordenes  {fmt_money(amt):>16}  {name}")

    print("\n== POR FECHA DE CANCELACION (deteccion del evento masivo) ==")
    for day, (cnt, amt) in sorted(by_day.items(), key=lambda x: x[0], reverse=True)[:15]:
        print(f"  {day}  {cnt:>3} ordenes  {fmt_money(amt):>16}")

    print("\n== DETALLE (top 30 por monto pendiente) ==")
    flagged_sorted = sorted(flagged, key=lambda x: -x["monto_pendiente"])
    for f in flagged_sorted[:30]:
        print(
            f"  {f['name']:<12} {f['moneda']:<4} {fmt_money(f['monto_pendiente']):>14}"
            f"  {f['cliente'][:35]:<35}  vend: {f['vendedor'][:20]:<20}  {f['link']}"
        )

    # ---------------- CSV ----------------
    cols = [
        "id", "name", "cliente", "partner_id", "vendedor",
        "cancelado_real_por", "fecha_cancelacion", "cancelado_por",
        "fecha_orden", "fecha_despacho", "fecha_modificacion", "moneda",
        "monto_total", "monto_facturado", "monto_pendiente", "ref_cliente", "link",
    ]
    with open(csv_path, "w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.DictWriter(fh, fieldnames=cols)
        writer.writeheader()
        for f in flagged_sorted:
            writer.writerow({c: f.get(c, "") for c in cols})
    print(f"\nCSV escrito: {csv_path}  ({len(flagged)} filas)")


def main():
    ap = argparse.ArgumentParser(description="Auditoria de ordenes canceladas despachadas sin facturar")
    ap.add_argument("--env", default=".env.local", help="ruta al archivo de variables (default .env.local)")
    ap.add_argument("--csv", default="audit-ordenes-canceladas.csv", help="ruta del CSV de salida")
    args = ap.parse_args()
    env = load_env(args.env)
    run(env, args.csv)


if __name__ == "__main__":
    main()
