/** Zakładki modułu WM Druk (EM-UX-001 · EM-P2 katalog · WM-RYSUNKI-01). */
import { isWmRysunki01Enabled } from "@/lib/wm-technical-drawings/flag";

export type WmPrintTab =
  | "odbiory"
  | "rysunki"
  | "pomiary"
  | "schematy"
  | "katalog"
  | "szablony"
  | "historia"
  | "ustawienia";

export const WM_PRINT_TABS: { key: WmPrintTab; label: string }[] = [
  { key: "odbiory", label: "Odbiory" },
  { key: "rysunki", label: "Rysunki" },
  { key: "pomiary", label: "Pomiary" },
  { key: "schematy", label: "Schematy" },
  { key: "katalog", label: "Katalog Pomiarów" },
  { key: "szablony", label: "Szablony" },
  { key: "historia", label: "Historia" },
  { key: "ustawienia", label: "Ustawienia" },
];

/** Zakładki widoczne w UI — Rysunki tylko gdy flaga ON (MR-03). */
export function getVisibleWmPrintTabs(): { key: WmPrintTab; label: string }[] {
  const rysunkiOn = isWmRysunki01Enabled();
  return WM_PRINT_TABS.filter((t) => t.key !== "rysunki" || rysunkiOn);
}

export interface WmPrintPendingNavigation {
  tab: WmPrintTab;
  jobId?: string;
}
