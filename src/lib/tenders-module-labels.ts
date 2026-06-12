/** Etykiety modułu Przetargi (ex-COMMAND CENTER branding). */
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
    settings: "Ustawienia",
  },
} as const;

export type TendersTabId = keyof typeof TENDERS_MODULE_LABELS.tabs;
