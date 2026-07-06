import {
  CATALOG_UX_PRICING_SETTINGS_TAB_LABEL,
  CATALOG_UX_WORK_CATALOG_TAB_LABEL,
} from "@/lib/tender-catalog-ux-labels";

/** Etykiety modułu Przetargi (moduł Przetargi — Strategia). */
export const TENDERS_MODULE_LABELS = {
  moduleTitle: "Przetargi",
  strategyView: "Analiza przetargów",
  classicView: "Lista przetargów",
  loading: "Ładowanie przetargów…",
  tabs: {
    list: "Lista",
    strategy: "Strategia",
    map: "Mapa",
    profile: "Profil firmy",
    workcatalog: CATALOG_UX_WORK_CATALOG_TAB_LABEL,
    pricebase: CATALOG_UX_PRICING_SETTINGS_TAB_LABEL,
    settings: "Ustawienia",
  },
} as const;

export type TendersTabId = keyof typeof TENDERS_MODULE_LABELS.tabs;
