/** Presentational formatters — zero domain math / aggregation. */

export function formatPlnDisplay(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} zł`;
}

export function formatNumDisplay(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("pl-PL");
}

export function formatPctDisplay(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("pl-PL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

/** BOM / plan scroll container — presentational only (no truncate). */
export const EXPERT_SCROLL_CLASS =
  "max-h-48 overflow-y-auto rounded border border-border/50 bg-background/40 px-2 py-1.5 space-y-1";
