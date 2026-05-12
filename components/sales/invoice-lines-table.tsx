import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtNumber } from "@/lib/format";
import type { InvoiceLine } from "@/lib/domain/sales/invoice-detail";

interface Props {
  lines: InvoiceLine[];
  currency: "USD" | "DOP";
}

export const InvoiceLinesTable = ({ lines, currency }: Props) => {
  if (lines.length === 0) {
    return (
      <p className="px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">
        Esta factura no tiene lineas de producto.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Descripcion</th>
            <th className="px-3 py-2 text-right font-medium">Cantidad</th>
            <th className="px-3 py-2 text-left font-medium">UoM</th>
            <th className="px-3 py-2 text-right font-medium">Precio</th>
            <th className="px-3 py-2 text-right font-medium">Desc%</th>
            <th className="px-3 py-2 text-right font-medium">Subtotal</th>
            <th className="px-3 py-2 text-left font-medium">Impuestos</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            if (line.displayType === "section") {
              return (
                <tr
                  key={line.id}
                  className="border-t border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/30"
                >
                  <td colSpan={7} className="px-3 py-2 font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                    {line.description}
                  </td>
                </tr>
              );
            }
            if (line.displayType === "note") {
              return (
                <tr key={line.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td colSpan={7} className="px-3 py-2 italic text-zinc-500 dark:text-zinc-400">
                    {line.description}
                  </td>
                </tr>
              );
            }
            return (
              <tr
                key={line.id}
                className="border-t border-zinc-100 align-top hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50"
              >
                <td className="px-3 py-2">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {line.productName ?? line.description}
                  </div>
                  {line.productName && line.description && line.description !== line.productName ? (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-pre-line">
                      {line.description}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtNumber(line.quantity)}
                </td>
                <td className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {line.uomName ?? "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtMoney(line.priceUnit, currency)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {line.discount > 0 ? `${line.discount.toFixed(1)}%` : "—"}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {fmtMoney(line.priceSubtotal, currency)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {line.taxNames.length === 0 ? (
                      <span className="text-xs text-zinc-400">—</span>
                    ) : (
                      line.taxNames.map((t) => (
                        <Badge key={t} tone="neutral">
                          {t}
                        </Badge>
                      ))
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
