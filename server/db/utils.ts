import { normalizeText } from '../../shared/textUtils';

export function asNull(value: string | null | undefined) {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function digitsOrTrim(value: string | null | undefined) {
  const v = asNull(value);
  if (!v) return null;
  const digits = v.replace(/\D+/g, "");
  return digits.length > 0 ? digits : v;
}

export { normalizeText };



