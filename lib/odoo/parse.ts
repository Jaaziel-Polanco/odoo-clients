export const parseOdooDateTime = (value: string | false | undefined): Date | null => {
  if (!value) return null;
  return new Date(`${value.replace(" ", "T")}Z`);
};

export const parseOdooDate = (value: string | false | undefined): string | null => {
  if (!value) return null;
  return value;
};

export const parseMany2one = <T = string>(
  value: [number, T] | false | undefined,
): { id: number; name: T } | null => {
  if (!value || !Array.isArray(value)) return null;
  return { id: value[0], name: value[1] };
};

export const odooStr = (value: string | false | undefined | null): string | null => {
  if (value === false || value === undefined || value === null || value === "") return null;
  return value;
};
