/**
 * P3.6 — szybkie filtry klientów strategicznych (UX only, bez zmian pipeline/backend).
 * Wspólna logika dopasowania dla listy Przetargów i skryptów audytowych.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";

export type StrategicClientFilterId =
  | "wm"
  | "zzk"
  | "mops"
  | "tbs"
  | "gminy"
  | "uczelnie";

export interface StrategicClientFilterDef {
  id: StrategicClientFilterId;
  label: string;
  shortLabel: string;
}

/** Kolejność chipów na liście Przetargów. */
export const STRATEGIC_CLIENT_FILTERS: readonly StrategicClientFilterDef[] = [
  { id: "wm", label: "Wrocławskie Mieszkania", shortLabel: "WM" },
  { id: "zzk", label: "Zarząd Zasobu Komunalnego", shortLabel: "ZZK" },
  { id: "mops", label: "MOPS Wrocław", shortLabel: "MOPS" },
  { id: "tbs", label: "TBS Wrocław", shortLabel: "TBS" },
  { id: "gminy", label: "Gmina Wrocław / ZIM", shortLabel: "Gminy" },
  { id: "uczelnie", label: "Uczelnie we Wrocławiu", shortLabel: "Uczelnie" },
] as const;

function foldPolish(s: string): string {
  return s.toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z");
}

type StrategicClientMatchFields = Pick<
  TenderPipelineItem,
  "priorityBuyerId" | "priorityBuyerLabel" | "organizationName" | "title" | "organizationCity"
>;

/** Czy przetarg należy do wybranego segmentu klienta strategicznego. */
export function matchesStrategicClientFilter(
  item: StrategicClientMatchFields,
  filterId: StrategicClientFilterId,
): boolean {
  const org = item.organizationName || "";
  const title = item.title || "";
  const hay = foldPolish(`${org} ${title} ${item.priorityBuyerLabel ?? ""}`);
  const city = foldPolish(item.organizationCity || "");
  const wroclawHay = city.includes("wroclaw") || city.startsWith("wroc") || hay.includes("wroclaw");

  switch (filterId) {
    case "wm":
      return item.priorityBuyerId === "wm" || /wroclawskie\s+mieszkania/.test(hay);
    case "zzk":
      return item.priorityBuyerId === "zik"
        || /zarzad\s+zasobu\s+komunalnego/.test(hay)
        || /\bzzk\b/.test(hay);
    case "mops":
      return item.priorityBuyerId === "mops"
        || /miejski\s+osrodek\s+pomocy\s+spolecznej/.test(hay)
        || /\bmops\b/.test(hay);
    case "tbs":
      return item.priorityBuyerId === "tbs"
        || /budownictwa\s+spolecznego\s+wroclaw/.test(hay)
        || /\btbs\b/.test(hay)
        || /tb[sś]\s+wroclaw/.test(hay);
    case "gminy":
      return item.priorityBuyerId === "gmina"
        || item.priorityBuyerId === "zim"
        || /zarzad\s+inwestycji\s+miejskich/.test(hay)
        || (/gmina\s+wroclaw/.test(hay) && !/katy|wroclawski/.test(hay));
    case "uczelnie":
      return wroclawHay && (
        /uniwersytet/.test(hay)
        || /politechnik/.test(hay)
        || /\buczeln/.test(hay)
        || /akademi/.test(hay)
        || /collegium/.test(hay)
        || /politechnika\s+wroclawska/.test(hay)
      );
    default:
      return false;
  }
}

export function countStrategicClientFilters(
  items: StrategicClientMatchFields[],
): Record<StrategicClientFilterId, number> {
  const counts = Object.fromEntries(
    STRATEGIC_CLIENT_FILTERS.map((f) => [f.id, 0]),
  ) as Record<StrategicClientFilterId, number>;
  for (const item of items) {
    for (const f of STRATEGIC_CLIENT_FILTERS) {
      if (matchesStrategicClientFilter(item, f.id)) counts[f.id] += 1;
    }
  }
  return counts;
}
