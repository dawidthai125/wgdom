/** Presentational PLN format — zero Offer math. */

export function formatPlnDisplay(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} zł`;
}
