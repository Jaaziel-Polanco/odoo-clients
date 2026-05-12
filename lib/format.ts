const numberFormatter = new Intl.NumberFormat("es-DO", {
  maximumFractionDigits: 0,
});

const moneyFormatters: Record<string, Intl.NumberFormat> = {
  USD: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }),
  DOP: new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 0,
  }),
};

const defaultMoney = moneyFormatters.DOP;

export const fmtNumber = (n: number | null | undefined): string =>
  n == null ? "—" : numberFormatter.format(n);

export const fmtMoney = (
  n: number | null | undefined,
  currency: "USD" | "DOP" = "DOP",
): string => {
  if (n == null) return "—";
  const f = moneyFormatters[currency] ?? defaultMoney;
  return f.format(n);
};

export interface MultiCurrencyAmount {
  usd?: number;
  dop?: number;
}

export const fmtMoneyMulti = (amounts: MultiCurrencyAmount): string => {
  const parts: string[] = [];
  if (amounts.usd && Math.abs(amounts.usd) >= 1) parts.push(fmtMoney(amounts.usd, "USD"));
  if (amounts.dop && Math.abs(amounts.dop) >= 1) parts.push(fmtMoney(amounts.dop, "DOP"));
  return parts.length === 0 ? "—" : parts.join(" · ");
};

export const sumMulti = (a: MultiCurrencyAmount): number =>
  (a.usd ?? 0) + (a.dop ?? 0);

export const fmtDate = (d: string | null | undefined): string => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("es-DO", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return d;
  }
};

export const fmtRelative = (days: number | null | undefined): string => {
  if (days == null) return "Sin compras";
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} dias`;
  if (days < 365) return `Hace ${Math.floor(days / 30)} meses`;
  return `Hace ${Math.floor(days / 365)} anos`;
};

export const toCsv = (rows: Record<string, unknown>[], headers: Record<string, string>): string => {
  const headerKeys = Object.keys(headers);
  const headerRow = headerKeys.map((k) => escapeCsv(headers[k])).join(",");
  const body = rows
    .map((row) => headerKeys.map((k) => escapeCsv(row[k])).join(","))
    .join("\n");
  return `${headerRow}\n${body}`;
};

const escapeCsv = (value: unknown): string => {
  if (value == null) return "";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};
