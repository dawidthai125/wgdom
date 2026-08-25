/**
 * KL-7-P2C — Orchestration types (OFF-mode capable).
 * Job lifecycle axis ≠ KnrDiscoveryStatus ≠ verification.
 * Avoid raw token "DISCOVERED" on job axis — use ORCH_HTTP_SUCCEEDED.
 */

import type { KnrDiscoveryStatus } from "./knr-discovery-evidence-types";
import type { KnrDiscoveryEvidenceStore } from "./knr-discovery-evidence-types";
import type {
  KnrDiscoveryHttpAccounting,
  KnrDiscoveryHttpDenyCode,
  KnrDiscoveryHttpJobStatus,
} from "./knr-discovery-http-types";

/** OD-P2C-4 */
export const KNR_DISCOVERY_ORCH_BATCH_MAX = 5 as const;
/** OD-P2C-5 */
export const KNR_DISCOVERY_ORCH_CONCURRENCY_MAX = 3 as const;
/** OD-P2C-2 */
export const KNR_DISCOVERY_JOB_LEASE_MS_DEFAULT = 90_000 as const;
export const KNR_DISCOVERY_JOB_LEASE_MS_MIN = 1_000 as const;
export const KNR_DISCOVERY_JOB_LEASE_MS_MAX = 3_600_000 as const;

/**
 * Orchestration / HTTP-job lifecycle (AXIS A).
 * Distinct names from P2A discoveryStatus (AXIS B).
 */
export type KnrDiscoveryOrchJobStatus =
  | "IDLE"
  | "PLANNED"
  | "LEASED"
  | "ORCH_FETCHING"
  | "ORCH_HTTP_SUCCEEDED"
  | "ORCH_INGESTED"
  | "ORCH_CORROBORATING"
  | "FAILED"
  | "DENIED"
  | "EXPIRED"
  | "HELD_BY_OTHER"
  | "BATCH_TRUNCATED_SKIP";

export type KnrDiscoveryOrchSourceResult = {
  sourceId: string;
  orchStatus: KnrDiscoveryOrchJobStatus;
  httpJobStatus: KnrDiscoveryHttpJobStatus | null;
  denyCode: KnrDiscoveryHttpDenyCode | null;
  leaseReason: string | null;
  accounting: KnrDiscoveryHttpAccounting;
};

export type KnrDiscoveryOrchResult = {
  evidenceKeyV1: string;
  family: string;
  plannedSourceIds: string[];
  truncatedSourceIds: string[];
  duplicateSourceIdsDropped: string[];
  sourceResults: KnrDiscoveryOrchSourceResult[];
  /** Sum of per-source httpRequestCount. OFF defaults → 0. */
  httpRequestCount: number;
  discoveryStatus: KnrDiscoveryStatus | null;
  /**
   * Phase 2 — final discovery evidence store after orch ingest.
   * Authority writes remain false (≠ catalog VERIFIED).
   */
  discoveryStore?: KnrDiscoveryEvidenceStore;
  authorityWrites: {
    catalog: false;
    ath: false;
    verified: false;
    priced: false;
  };
  offMode: boolean;
};

export const KNR_DISCOVERY_ORCH_P2C_IMPLEMENTED = true as const;
