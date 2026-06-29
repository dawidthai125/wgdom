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
    workcatalog: "Biblioteka robót",
    pricebase: "Baza cen",
    settings: "Ustawienia",
  },
} as const;

export type TendersTabId = keyof typeof TENDERS_MODULE_LABELS.tabs;
