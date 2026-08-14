/**
 * MARKET-MATERIAL-RESEARCH-01 Stage B — orchestration types.
 * ZERO live HTTP · ZERO invent as truth · Owner Accept = trust boundary.
 */

import type { PriceCandidate } from "./price-candidate-types";
import type { PriceDemandRecord, PriceDemandStore } from "./demand-types";
import type { PriceMemoryHit } from "./price-memory";

/** L1 usability — PE freshness UX mapped to DF CURRENT/STALE/MISSING. */
export type MaterialCacheUsability = "CURRENT" | "STALE" | "MISSING";

export type MaterialResearchAction =
  | "REUSE"
  | "DEMAND"
  | "COOLDOWN_SKIP"
  | "HELD_SINGLE_FLIGHT"
  | "CANDIDATE_READY"
  | "FAILED"
  | "UNIT_REJECT"
  | "PRICE_GAP"
  | "CLASSIFICATION_HOLD";

/** Research job lifecycle (orchestration view — lease is Stage A). */
export type MaterialResearchJobPhase =
  | "NONE"
  | "DEMANDED"
  | "QUEUED"
  | "ACTIVE"
  | "CANDIDATE"
  | "ACCEPTED"
  | "PERSISTED"
  | "FAILED";

/** One BOQ / tender material need line (pre-dedup). */
export interface NeededMaterialLine {
  materialKey: string;
  catalogWorkId: string;
  namePl?: string;
  unit: string;
  region?: string;
  tenderId?: string | null;
  /** Optional line id for diagnostics — NOT used as job identity. */
  lineId?: string;
}

export interface DedupedMaterialNeed {
  materialKey: string;
  catalogWorkId: string;
  namePl: string;
  unit: string;
  region: string;
  tenderIds: string[];
  occurrenceCount: number;
}

export interface MaterialCacheDecision {
  materialKey: string;
  usability: MaterialCacheUsability;
  hit: PriceMemoryHit | null;
  missReason?: "no_identity" | "no_quote";
}

export interface MaterialResearchLeasePort {
  claim(input: {
    researchJobId: string;
    claimantId: string;
    leaseMs: number;
  }): Promise<{
    acquired: boolean;
    reason?: string | null;
    job?: { researchJobId: string; claimantId: string; status: string } | null;
  }>;
  release?(input: {
    researchJobId: string;
    claimantId: string;
  }): Promise<{ released: boolean }>;
}

export interface MaterialResearchProviderInput {
  materialKey: string;
  catalogWorkId: string;
  namePl: string;
  unit: string;
  region: string;
  demandId: string;
  researchJobId: string;
  nowIso: string;
}

export type MaterialResearchProviderResult =
  | {
      ok: true;
      candidate: PriceCandidate;
      /** Always false in Stage B — Accept is Owner-only. */
      autoAccepted: false;
    }
  | {
      ok: false;
      error: string;
      autoAccepted: false;
    };

/** Minimal provider contract — Stage B = mock/manual only. */
export interface MaterialResearchProvider {
  readonly id: string;
  readonly connected: boolean;
  research(input: MaterialResearchProviderInput): Promise<MaterialResearchProviderResult>;
}

export interface MaterialResearchCooldownMap {
  /** materialKey → cooldownUntil ISO */
  untilByMaterialKey: Map<string, string>;
}

export interface MaterialResearchJobView {
  researchJobId: string;
  materialKey: string;
  phase: MaterialResearchJobPhase;
  claimantId: string | null;
  demandId: string | null;
  candidate: PriceCandidate | null;
  accepted: boolean;
  persisted: boolean;
  error?: string;
}

export interface MaterialResearchLineResult {
  materialKey: string;
  usability: MaterialCacheUsability;
  action: MaterialResearchAction;
  researchJobId: string | null;
  demand: PriceDemandRecord | null;
  job: MaterialResearchJobView | null;
  reusedHit: PriceMemoryHit | null;
  externalResearchAttempted: boolean;
}

export interface MaterialResearchOrchestrationResult {
  uniqueMaterialKeys: string[];
  decisions: MaterialResearchLineResult[];
  demandsCreated: number;
  jobsClaimed: number;
  jobsHeld: number;
  reusedCurrent: number;
  candidatesReady: number;
  demandStore: PriceDemandStore;
  cooldown: MaterialResearchCooldownMap;
  /** Request-storm guard: true if any path tried N+1 per BOQ line. */
  perLineExternalForbidden: true;
}

export interface AcceptResearchCandidateResult {
  ok: boolean;
  accepted: boolean;
  persisted: boolean;
  wrotePurchase: false;
  wroteCompanyKnowledge: false;
  error?: string;
  demandStore: PriceDemandStore;
}
