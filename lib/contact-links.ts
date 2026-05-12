const COUNTRY_DIAL: Record<string, string> = {
  "Dominican Republic": "1",
  Haiti: "509",
  Jamaica: "1",
  "United States": "1",
  Canada: "1",
  Panama: "507",
  Colombia: "57",
  Spain: "34",
  Venezuela: "58",
  Cuba: "53",
  Italy: "39",
  Mexico: "52",
  Argentina: "54",
  Brazil: "55",
  Chile: "56",
  Peru: "51",
  Ecuador: "593",
  Guatemala: "502",
  Honduras: "504",
  "El Salvador": "503",
  Nicaragua: "505",
  "Costa Rica": "506",
  "Puerto Rico": "1",
};

export const normalizePhone = (
  phone: string | null | undefined,
  country: string | null | undefined,
): string | null => {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length < 7) return null;
  const dial = country ? COUNTRY_DIAL[country] : null;
  if (!dial) return digits;
  if (digits.length === 10) return dial + digits;
  if (digits.length === 11 && digits.startsWith(dial)) return digits;
  return digits;
};

export const whatsappLink = (
  phone: string | null | undefined,
  country: string | null | undefined,
  message?: string,
): string | null => {
  const normalized = normalizePhone(phone, country);
  if (!normalized) return null;
  const base = `https://wa.me/${normalized}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};

export const telLink = (phone: string | null | undefined): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
};

export const mailtoLink = (
  email: string | null | undefined,
  subject?: string,
  body?: string,
): string | null => {
  if (!email) return null;
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return params.length > 0 ? `mailto:${email}?${params.join("&")}` : `mailto:${email}`;
};

export const odooContactUrl = (
  partnerId: number,
  baseUrl: string | undefined,
): string | null => {
  if (!baseUrl) return null;
  const clean = baseUrl.replace(/\/$/, "");
  return `${clean}/odoo/contacts/${partnerId}`;
};

export const googleMapsUrl = (
  city: string | null | undefined,
  country: string | null | undefined,
): string | null => {
  const parts = [city, country].filter(Boolean);
  if (parts.length === 0) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`;
};
