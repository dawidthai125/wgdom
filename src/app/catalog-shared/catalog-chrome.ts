/**
 * Shared catalog chrome helpers — Nasz katalog cen × Nasz Katalog Robót.
 * Presentation only. ZERO margin engine / KV / research.
 */

export type CatalogFreshnessId = "CURRENT" | "STALE" | "MISSING" | "ALL";

export function catalogFreshnessToneClass(
  freshness: Exclude<CatalogFreshnessId, "ALL"> | string,
): string {
  switch (freshness) {
    case "CURRENT":
      return "text-emerald-700 dark:text-emerald-400";
    case "STALE":
      return "text-orange-700 dark:text-orange-400";
    case "MISSING":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

export function catalogFreshnessDot(
  freshness: Exclude<CatalogFreshnessId, "ALL"> | string,
): string {
  switch (freshness) {
    case "CURRENT":
      return "🟢";
    case "STALE":
      return "🟠";
    case "MISSING":
      return "🔴";
    default:
      return "⚪";
  }
}

export function formatCatalogDateTimePl(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function catalogChangeToneClass(
  tone: "up" | "down" | "flat" | "unknown" | string,
): string {
  if (tone === "up") return "text-emerald-700 dark:text-emerald-400";
  if (tone === "down") return "text-destructive";
  return "text-muted-foreground";
}
