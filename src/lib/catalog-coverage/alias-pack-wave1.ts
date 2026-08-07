/**
 * CATALOG-COVERAGE-01 P0c/P0d — Alias Pack Wave 1 (LOW) ONLY.
 * DF §4 · AR §12 — first match #1→#6 · 1 rule → 1 Product ID.
 * P0d-A: precision zaprawianie (Negation Guard REUSE) · multiswitch = tylko token.
 *
 * Product ID: bind tylko gdy work istnieje w Library (DATA FIRST).
 * Brak work → Resolver zwraca null (no-op) — bez zapisu Library.
 */

import { hasZaprawianieBruzdPositive } from "@/lib/catalog-coverage/negation-guard";

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
  /** Wave1: CatalogCoverageAliasRuleId · Wave2+: string (DF CATALOG-WAVE-2). */
  aliasRuleId: CatalogCoverageAliasRuleId | string;
  /** Opis semantyki (dokumentacja / rationale). */
  labelPl: string;
  /**
   * Jedyny Product ID dla reguły.
   * Reserved `cc-p0c-w1-*` — SAFE w P0d-B; FULL w P0e.
   * `legacy-rozbiorki-m2` — istnieje w Library (keyword pieców/trzonów).
   */
  productId: string;
  /**
   * Match na fold PL znormalizowanego opisu.
   * piece_demontaz: AR binding — (demontaż|rozebranie) AND (piec|trzon); bez gołego „piece”.
   * zaprawianie: REUSE Negation Guard (bez „bez zaprawiania bruzd”).
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
    // P0d-A: Negation precedes match — shared Guard helper (ZERO DUP regex)
    test: (h) => hasZaprawianieBruzdPositive(h),
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
    labelPl: "Multiswitch antenowy",
    productId: "cc-p0c-w1-multiswitch-antenowy",
    // P0d-A: tylko token multiswitch — bez gołego rtv.?sat / instalacji antenowej
    test: (h) => /multiswitch/.test(h),
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
