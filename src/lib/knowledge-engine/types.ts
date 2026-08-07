/**
 * KE-01 / KE-E1 — Knowledge Engine types (Resolver v0).
 * DESIGN FREEZE: Global · Market · Company · Owner · Evidence · Resolver
 */

export type KnowledgeSourceKind = "global" | "market" | "company" | "owner";

export type KnowledgeFreshness = "fresh" | "ok" | "stale" | "missing";

export type KnowledgeConfidenceLevel = "high" | "medium" | "low";

export type KnowledgeResolveSource =
  | "owner"
  | "company"
  | "market"
  | "blend"
  | "global_fallback"
  | "none";

export type KnowledgeReasonCode =
  | "OWNER_LOCK"
  | "COMPANY_ELIGIBLE"
  | "COMPANY_INELIGIBLE"
  | "COMPANY_N_BELOW_MIN"
  | "COMPANY_STALE"
  | "COMPANY_VARIANCE"
  | "MARKET_ELIGIBLE"
  | "MARKET_INELIGIBLE"
  | "MARKET_STALE"
  | "GLOBAL_FALLBACK"
  | "NO_CANDIDATE"
  | "SELECTED_BY_SCORE"
  | "SELECTED_BY_CHAIN_ORDER"
  | "TIEBREAK_CHAIN_ORDER"
  | "CAP_SOFT_WARN"
  | "OUT_SKIP";

/** DF §5 — wagi scorecard. */
export const KE_SCORE_WEIGHTS = {
  confidence: 0.3,
  freshness: 0.2,
  n: 0.25,
  variance: 0.15,
  agreement: 0.1,
} as const;

/** DF §4 — eligibility constants (v0). */
export const KE_N_MIN = 5;
export const KE_N_SOLE = 20;
export const KE_BLEND_BAND = 0.25;
export const KE_CAP_MARKET = 0.35;
export const KE_FRESH_DAYS = 180;

export interface KnowledgeScorecard {
  confidence: number;
  freshness: number;
  n: number;
  variance: number;
  agreement: number;
  totalScore: number;
  level: KnowledgeConfidenceLevel;
}

export interface KnowledgeCandidate {
  id: string;
  source: KnowledgeSourceKind;
  unitPricePln: number;
  /** Indeks w łańcuchu providerów (niższy = wcześniejszy; tie-break). */
  chainIndex: number;
  confidence: KnowledgeConfidenceLevel;
  freshness: KnowledgeFreshness;
  /** Liczba obserwacji / origins. */
  n: number;
  nApprovals?: number;
  /** Odchylenie względne (0 = brak / nieznane). */
  variance?: number | null;
  asOf?: string | null;
  refId?: string | null;
  labelPl?: string;
  /** Origin kind z AI-COST (np. controlled_market). */
  originKind?: string;
  /** Oryginalny lookup — opaque dla Resolvera. */
  raw?: unknown;
}

export interface KnowledgeResolverPolicy {
  nMin: number;
  nSole: number;
  blendBand: number;
  capMarket: number;
  freshDays: number;
  /** KE-E1: blend wyłączony (DF allow, Owner GO thin = off). */
  blendEnabled: boolean;
}

export const KE_DEFAULT_POLICY: KnowledgeResolverPolicy = {
  nMin: KE_N_MIN,
  nSole: KE_N_SOLE,
  blendBand: KE_BLEND_BAND,
  capMarket: KE_CAP_MARKET,
  freshDays: KE_FRESH_DAYS,
  blendEnabled: false,
};

export interface KnowledgeResolverInput {
  candidates: KnowledgeCandidate[];
  ownerLock?: { unitPricePln: number; refId?: string } | null;
  isOut?: boolean;
  policy?: Partial<KnowledgeResolverPolicy>;
  /** ISO „teraz” do freshness. */
  nowIso?: string;
}

export interface KnowledgeAlternateSummary {
  source: KnowledgeSourceKind;
  unitPricePln: number;
  totalScore: number;
  eligible: boolean;
  refId?: string | null;
  labelPl?: string;
}

export interface KnowledgeResolverOutput {
  unitPricePln: number | null;
  source: KnowledgeResolveSource;
  blendWeights?: { company: number; market: number };
  scorecard: KnowledgeScorecard | null;
  alternates: KnowledgeAlternateSummary[];
  reviewRequired: boolean;
  reasonCodes: KnowledgeReasonCode[];
  explain: string;
  /** Wybrany kandydat (gdy select). */
  selectedCandidateId?: string | null;
  selectedChainIndex?: number | null;
}

/** Metadane Explain na komponencie OfferBoq (KE-E1). */
export interface KnowledgeEngineExplainMeta {
  schemaVersion: 1;
  source: KnowledgeResolveSource;
  scorecard: KnowledgeScorecard | null;
  reasonCodes: KnowledgeReasonCode[];
  explain: string;
  reviewRequired: boolean;
  alternates: KnowledgeAlternateSummary[];
  policy: Pick<KnowledgeResolverPolicy, "nMin" | "nSole" | "blendEnabled" | "capMarket">;
}
