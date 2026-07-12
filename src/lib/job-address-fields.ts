/** JOBS-ADDRESS-SYNC-01 — field-level merge for job address scalars (jobs domain only). */

export function normalizeJobAddressField(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

/**
 * Field-level merge for address | flatNumber.
 * Non-empty wins over empty; both non-empty → prefer preferB side (LWW newer).
 */
export function mergeJobAddressField(
  a: unknown,
  b: unknown,
  preferB: boolean,
): string {
  const sa = normalizeJobAddressField(a);
  const sb = normalizeJobAddressField(b);
  const aEmpty = sa.length === 0;
  const bEmpty = sb.length === 0;
  if (aEmpty && bEmpty) return "";
  if (aEmpty) return sb;
  if (bEmpty) return sa;
  if (sa === sb) return sa;
  return preferB ? sb : sa;
}

export function mergeJobAddressScalarPair(
  prev: { address?: unknown; flatNumber?: unknown },
  next: { address?: unknown; flatNumber?: unknown },
  preferNext: boolean,
): { address: string; flatNumber: string } {
  return {
    address: mergeJobAddressField(prev.address, next.address, preferNext),
    flatNumber: mergeJobAddressField(prev.flatNumber, next.flatNumber, preferNext),
  };
}
