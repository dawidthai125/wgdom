/**
 * CATALOG-COVERAGE-01 P0c — Alias Pack Wave 1 (LOW) ONLY.
 * DF §4 · AR §12 — first match #1→#6 · 1 rule → 1 Product ID.
 *
 * Product ID: bind tylko gdy work istnieje w Library (DATA FIRST).
 * Brak work → Resolver zwraca null (no-op) — bez zapisu Library.
 */

export type CatalogCoverageAliasRuleId =
  | "zaprawianie_bruzd"
  | "zawor_odpowietrzajacy"
  | "zabezpieczenie_folia"
  | "stop_ptakow"
  | "multiswitch_antenowy"
  | "piece_demontaz";

export interface CatalogCoverageAliasPackRule {
  /** Kolejność ewaluacji = indeks w WAVE1_PACK (first match wins). */
  order: number;
  aliasRuleId: CatalogCoverageAliasRuleId;
  /** Opis semantyki (dokumentacja / rationale). */
  labelPl: string;
  /**
   * Jedyny Product ID dla reguły.
   * Reserved `cc-p0c-w1-*` — oczekiwane po seed P0d; do czasu seed = no-op.
   * `legacy-rozbiorki-m2` — istnieje w Library (keyword pieców/trzonów).
   */
  productId: string;
  /**
   * Match na fold PL znormalizowanego opisu.
   * piece_demontaz: AR binding — (demontaż|rozebranie) AND (piec|trzon); bez gołego „piece”.
   */
  test: (foldedHay: string) => boolean;
}

/**
 * Alias Pack Wave 1 — SSOT. Kolejność FROZEN (#1→#6).
 * ZERO drugiej listy poza tym plikiem.
 */
export const CATALOG_COVERAGE_P0C_WAVE1_PACK: readonly CatalogCoverageAliasPackRule[] = [
  {
    order: 1,
    aliasRuleId: "zaprawianie_bruzd",
    labelPl: "Zaprawianie / zamurowanie bruzd",
    productId: "cc-p0c-w1-zaprawianie-bruzd",
    test: (h) => /zaprawiani\w*\s+bruzd|zamurowan\w*\s+bruzd/.test(h),
  },
  {
    order: 2,
    aliasRuleId: "zawor_odpowietrzajacy",
    labelPl: "Zawór odpowietrzający / odpowietrznik",
    productId: "cc-p0c-w1-zawor-odpowietrzajacy",
    test: (h) => /zawor\w*\s+odpowietrz|odpowietrznik|automatyczn\w*\s+odpowietrz/.test(h),
  },
  {
    order: 3,
    aliasRuleId: "zabezpieczenie_folia",
    labelPl: "Zabezpieczenie okien / powierzchni folią",
    productId: "cc-p0c-w1-zabezpieczenie-folia",
    test: (h) =>
      /zabezpieczeni\w*\s+okien\s+fol|oklejani\w*\s+fol|zabezpieczeni\w*\s+.*\s+foli/.test(h),
  },
  {
    order: 4,
    aliasRuleId: "stop_ptakow",
    labelPl: "Stop ptaków (elewacja)",
    productId: "cc-p0c-w1-stop-ptakow",
    test: (h) => /stop\s+ptak|kolce\s+przeciw|zabezpieczeni\w*\s+przed\s+ptak/.test(h),
  },
  {
    order: 5,
    aliasRuleId: "multiswitch_antenowy",
    labelPl: "Multiswitch / instalacja antenowa RTV-SAT",
    productId: "cc-p0c-w1-multiswitch-antenowy",
    test: (h) => /multiswitch|rtv.?sat|instalacj\w*\s+antenow/.test(h),
  },
  {
    order: 6,
    aliasRuleId: "piece_demontaz",
    labelPl: "Demontaż / rozebranie pieców lub trzonów",
    productId: "legacy-rozbiorki-m2",
    test: (h) => {
      // AR binding: wymaga współwystępowania — bez gołego „piece”.
      const demontaz = /\bdemontaz|\brozebr/.test(h);
      const piecOrTrzon = /\bpiec|\btrzon/.test(h);
      return demontaz && piecOrTrzon;
    },
  },
] as const;

export const CATALOG_COVERAGE_P0C_WAVE1_RULE_IDS: readonly CatalogCoverageAliasRuleId[] =
  CATALOG_COVERAGE_P0C_WAVE1_PACK.map((r) => r.aliasRuleId);
