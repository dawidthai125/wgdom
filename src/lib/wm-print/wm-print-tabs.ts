/** Zakładki modułu WM Druk (EM-UX-001 · EM-P2 katalog). */
export type WmPrintTab = "odbiory" | "pomiary" | "schematy" | "katalog" | "szablony" | "historia" | "ustawienia";

export const WM_PRINT_TABS: { key: WmPrintTab; label: string }[] = [
  { key: "odbiory", label: "Odbiory" },
  { key: "pomiary", label: "Pomiary" },
  { key: "schematy", label: "Schematy" },
  { key: "katalog", label: "Katalog Pomiarów" },
  { key: "szablony", label: "Szablony" },
  { key: "historia", label: "Historia" },
  { key: "ustawienia", label: "Ustawienia" },
];

export interface WmPrintPendingNavigation {
  tab: WmPrintTab;
  jobId?: string;
}
