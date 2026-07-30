/**
 * CATALOG-COVERAGE-01 — typy warstw coverage (P0a+).
 * DF: Noise Filter kinds P0.
 */

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
