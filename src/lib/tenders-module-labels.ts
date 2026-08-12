/**
 * NG-TENDERS-WORKSPACE-01 — etykiety top-level modułu Przetargi (IA v2).
 * Top-level max 4: Przegląd · Kolejka · Mapa · Firma.
 */

/** Etykiety modułu Przetargi — Workspace Architecture v2. */
export const TENDERS_MODULE_LABELS = {
  moduleTitle: "Przetargi",
  strategyView: "Przegląd przetargów",
  classicView: "Kolejka przetargów",
  loading: "Ładowanie przetargów…",
  tabs: {
    review: "Przegląd",
    queue: "Kolejka",
    map: "Mapa",
    company: "Firma",
  },
} as const;

export type TendersTabId = keyof typeof TENDERS_MODULE_LABELS.tabs;

/** Sekcje hubu Firma (nie top-level). */
export const TENDERS_COMPANY_SECTION_LABELS = {
  profile: "Profil firmy",
  workcatalog: "Biblioteka Robót",
  workratecatalog: "Nasz Katalog Robót",
  pricecatalog: "Nasz katalog cen",
  pricebase: "Ustawienia wyceny",
  settings: "Ustawienia",
} as const;

export type TendersCompanySectionId = keyof typeof TENDERS_COMPANY_SECTION_LABELS;
