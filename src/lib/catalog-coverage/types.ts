/**
 * CATALOG-COVERAGE-01 — typy warstw coverage (P0a+).
 * DF: Noise Filter kinds P0 · Normalizer P0b · Alias Resolver P0c.
 */

export type {
  CatalogCoverageAliasRuleId,
  CatalogCoverageAliasPackRule,
} from "@/lib/catalog-coverage/alias-pack-wave1";

export type {
  CatalogCoverageAliasResolveResult,
  CatalogCoverageAliasResolveOpts,
} from "@/lib/catalog-coverage/alias-resolver";


/** Kinds Noise Filter P0 (DF §2.1) — wyłącznie niemateriałowe. */
export type CatalogCoverageNoiseKind =
  | "kalkulacja_wlasna"
  | "transport"
  | "lp_artifact"
  | "smieci_krotkie";

export interface CatalogCoverageNoiseResult {
  isNoise: boolean;
  noiseKind: CatalogCoverageNoiseKind | null;
  /** Krótki powód PL (diagnostyka / rationale) — bez mutacji źródeł. */
  reasonPl: string | null;
}

export interface CatalogCoverageNoiseFilterStats {
  lineCount: number;
  noiseCount: number;
  eligibleCount: number;
  noisePct: number;
  byKind: Record<CatalogCoverageNoiseKind, number>;
}

export interface CatalogCoverageNormalizeResult {
  /** Opis po standaryzacji formy (ephemeral — bez zapisu). */
  normalizedDescription: string;
  /** Czy znormalizowany tekst ≠ wejście po trim. */
  changed: boolean;
  /** Wyodrębniony KNR z ATH (hint dla Mappera; nie mutuje SSOT knrHint linii). */
  knrHint: string | null;
  /** Jednostka wyciągnięta z tekstu (gdy brak w polu unit). */
  unitHint: string | null;
  /** Średnica kanoniczna np. `fi32` (diagnostyka). */
  diameterHint: string | null;
}

export interface CatalogCoverageNormalizeStats {
  lineCount: number;
  changedCount: number;
  unchangedCount: number;
  withKnrHint: number;
  withUnitHint: number;
  withDiameterHint: number;
  changedPct: number;
}
