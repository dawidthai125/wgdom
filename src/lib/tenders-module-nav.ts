import type {
  TendersCompanySectionId,
  TendersTabId,
} from "@/lib/tenders-module-labels";

/** Nawigacja modułu Przetargi — wspólny klucz localStorage z TendersProvider. */
export const TENDERS_TAB_STORAGE_KEY = "kw-tenders-active-tab-v1";

/** AC-RETURN — skąd użytkownik wszedł w Tender Workspace. */
export const TENDERS_RETURN_CONTEXT_KEY = "kw-tenders-return-context-v1";

/** Hub Firma — aktywna sekcja (nie top-level). */
export const TENDERS_COMPANY_SECTION_KEY = "kw-tenders-company-section-v1";

export const TENDERS_TAB_IDS: readonly TendersTabId[] = [
  "review",
  "queue",
  "map",
  "company",
] as const;

/** Legacy top-level ids (pre IA v2) → v2. */
const LEGACY_TAB_TO_V2: Record<string, TendersTabId> = {
  list: "queue",
  strategy: "review",
  map: "map",
  profile: "company",
  workcatalog: "company",
  pricecatalog: "company",
  pricebase: "company",
  settings: "company",
  review: "review",
  queue: "queue",
  company: "company",
};

const LEGACY_TO_COMPANY_SECTION: Record<string, TendersCompanySectionId> = {
  profile: "profile",
  workcatalog: "workcatalog",
  pricecatalog: "pricecatalog",
  pricebase: "pricebase",
  settings: "settings",
};

const COMPANY_SECTIONS: readonly TendersCompanySectionId[] = [
  "profile",
  "workcatalog",
  "pricecatalog",
  "pricebase",
  "settings",
];

export function isTendersTabId(raw: string | null | undefined): raw is TendersTabId {
  return raw != null && (TENDERS_TAB_IDS as readonly string[]).includes(raw);
}

export function isTendersCompanySectionId(
  raw: string | null | undefined,
): raw is TendersCompanySectionId {
  return raw != null && (COMPANY_SECTIONS as readonly string[]).includes(raw);
}

/** Mapuje surową wartość LS (legacy lub v2) na kanoniczny tab v2. */
export function migrateTendersTabId(raw: string | null | undefined): TendersTabId | null {
  if (!raw) return null;
  const mapped = LEGACY_TAB_TO_V2[raw];
  return mapped ?? null;
}

export function saveTendersActiveTab(tab: TendersTabId): void {
  try {
    localStorage.setItem(TENDERS_TAB_STORAGE_KEY, tab);
  } catch { /* ignore */ }
}

export function loadRawTendersActiveTab(): string | null {
  try {
    return localStorage.getItem(TENDERS_TAB_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Odczyt + migracja legacy id.
 * Nieznane / brak → Przegląd (kanoniczny start DF).
 */
export function resolveStoredTendersActiveTab(
  canViewWorkCatalog: boolean,
): TendersTabId {
  const raw = loadRawTendersActiveTab();
  const migrated = migrateTendersTabId(raw);
  if (migrated) {
    if (raw && raw !== migrated) {
      saveTendersActiveTab(migrated);
      const section = LEGACY_TO_COMPANY_SECTION[raw];
      if (section) saveTendersCompanySection(section);
    }
    return sanitizeTendersActiveTab(migrated, canViewWorkCatalog);
  }
  return "review";
}

export function sanitizeTendersActiveTab(
  tab: TendersTabId,
  _canViewWorkCatalog: boolean,
): TendersTabId {
  void _canViewWorkCatalog;
  return isTendersTabId(tab) ? tab : "review";
}

/** Pulpit / Menu / legacy Strategia → zawsze Przegląd (DF kanoniczny start). */
export const TENDERS_CANONICAL_START_EVENT = "wgdom-tenders-canonical-start";

export function openTendersAtReviewTab(): void {
  saveTendersActiveTab("review");
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent(TENDERS_CANONICAL_START_EVENT));
    } catch { /* ignore */ }
  }
}

/** @deprecated alias — Entry Remap Strategia → Przegląd */
export function openTendersAtStrategyTab(): void {
  openTendersAtReviewTab();
}

/** Legacy view=workcatalog → Firma · Biblioteka Robót. */
export function openTendersAtWorkCatalogTab(): void {
  saveTendersActiveTab("company");
  saveTendersCompanySection("workcatalog");
}

/** Entry → Firma · wybrana sekcja. */
export function openTendersAtCompanySection(section: TendersCompanySectionId): void {
  saveTendersActiveTab("company");
  saveTendersCompanySection(section);
}

export function saveTendersCompanySection(section: TendersCompanySectionId): void {
  try {
    sessionStorage.setItem(TENDERS_COMPANY_SECTION_KEY, section);
  } catch { /* ignore */ }
}

export function loadTendersCompanySection(): TendersCompanySectionId {
  try {
    const raw = sessionStorage.getItem(TENDERS_COMPANY_SECTION_KEY);
    if (isTendersCompanySectionId(raw)) return raw;
  } catch { /* ignore */ }
  return "profile";
}

export function clearTendersCompanySection(): void {
  try {
    sessionStorage.removeItem(TENDERS_COMPANY_SECTION_KEY);
  } catch { /* ignore */ }
}

/** AC-RETURN — zapisz kontekst przed wejściem w /przetargi/:id. */
export function saveTendersReturnContext(tab: TendersTabId): void {
  try {
    sessionStorage.setItem(TENDERS_RETURN_CONTEXT_KEY, tab);
  } catch { /* ignore */ }
}

export function peekTendersReturnContext(): TendersTabId | null {
  try {
    const raw = sessionStorage.getItem(TENDERS_RETURN_CONTEXT_KEY);
    return migrateTendersTabId(raw);
  } catch {
    return null;
  }
}

/** Odczyt i wyczyść — używane przy Powrót / native back. */
export function consumeTendersReturnContext(): TendersTabId | null {
  const tab = peekTendersReturnContext();
  try {
    sessionStorage.removeItem(TENDERS_RETURN_CONTEXT_KEY);
  } catch { /* ignore */ }
  return tab;
}

export function clearTendersReturnContext(): void {
  try {
    sessionStorage.removeItem(TENDERS_RETURN_CONTEXT_KEY);
  } catch { /* ignore */ }
}

/**
 * Safe default po deep linku / braku kontekstu:
 * Kolejka (DF AC-RETURN).
 */
export function defaultTendersReturnTab(): TendersTabId {
  return "queue";
}
