/**
 * IK-KNR KNOWLEDGE LAYER — public exports (KL-0/1 + KL-5 + KL-6 + KL-3B + Host KL-3).
 *
 * KL-3B IN: resolveKnrKnowledgeKl3b · L1 licensed ATH · PENDING_VERIFY only
 * Host KL-3: resolveHostKnrKnowledgeLookupOnly · OD-KNR-FLAG-1 YES (research-on-MISS)
 * Phase 2: on-demand Discovery wire (FEATURE default OFF · allowlist EMPTY → HTTP=0)
 * OUT: mass crawl · LLM · auto-VERIFIED · auto mapping · APP-1/APP-2 Host orchestration
 */

export * from "./types";
export * from "./knr-identity-v2";
export * from "./knr-catalog-entry-types";
export * from "./knr-provenance-types";
export * from "./knr-content-hash";
export * from "./knr-ath-ini-utils";
export * from "./knr-export-parser";
export * from "./knr-verify-types";
export * from "./knr-validate-contract";

/** KL-0 research-gate stub only — avoid type clash with KL-1 `lookupKnrCatalog`. */
export { stubLookupKnrCatalog } from "./knr-lookup-types";
export type { KnrCatalogLookupResearchGate } from "./knr-lookup-types";

export * from "./knr-catalog-authority";
export * from "./knr-catalog-store";
export * from "./knr-catalog-lookup";
export * from "./knr-catalog-write-router";
export * from "./knr-catalog-ui";
export * from "./knr-catalog-merge";
export * from "./knr-catalog-history";
export * from "./knr-catalog-update-compare";
export * from "./knr-catalog-proposed-update";
/** Cloud sync helpers — import path preferred for Host/UI to avoid accidental write. */
export {
  loadKnrCatalogStore,
  saveKnrCatalogStore,
  pushKnrCatalogStoreAfterVerify,
  KNR_CATALOG_CLOUD_P0_IMPLEMENTED,
} from "./knr-catalog-sync";

/** KL-7-P2A — discovery evidence memory (≠ catalog · ≠ ATH · HTTP OFF). */
export * from "./knr-discovery-evidence-types";
export * from "./knr-discovery-evidence-store";
export * from "./knr-discovery-evidence-merge";
export * from "./knr-discovery-evidence-lookup";
export * from "./knr-discovery-evidence-fixtures";
export * from "./knr-discovery-evidence-ui";
export {
  loadKnrDiscoveryEvidenceStore,
  saveKnrDiscoveryEvidenceStore,
  KnrDiscoveryDestructivePersistError,
  KNR_DISCOVERY_SYNC_P2A_IMPLEMENTED,
} from "./knr-discovery-evidence-sync";

/** KL-7-P2B — HTTP discovery foundation (DEFAULT OFF · empty allowlist). */
export * from "./knr-discovery-http-types";
export * from "./knr-discovery-allowlist";
export * from "./knr-discovery-ssrf";
export * from "./knr-discovery-http-legal";
export * from "./knr-discovery-http-planner";
export * from "./knr-discovery-http-exec";
export * from "./knr-discovery-http-ingest";
export * from "./knr-host-discovery-sidechannel";

/** KL-7-P2C — orchestration OFF-mode (lease · SF · batch · concurrency). */
export * from "./knr-discovery-orch-types";
export * from "./knr-discovery-job-lease";
export * from "./knr-discovery-client-sf";
export * from "./knr-discovery-orch-pool";
export * from "./knr-discovery-orch";

/** Phase 2 — on-demand Discovery learning loop (fail-closed · Owner sources required). */
export * from "./knr-discovery-source-selection";
export * from "./knr-discovery-source-candidates";
export * from "./knr-discovery-l3-document-resolver";
export * from "./knr-discovery-fact-extract";
export * from "./knr-discovery-catalog-stage";
export * from "./knr-discovery-on-demand";

/** Phase 2D — PDF L3 seam (fail-closed · no OCR · allowlist EMPTY · FEATURE OFF). */
export * from "./knr-discovery-document-cache";
export * from "./knr-discovery-pdf-text";
export * from "./knr-discovery-pdf-executor";

export * from "./knr-legal-gate-types";
export * from "./knr-legal-gate-runtime";
export * from "./knr-evidence-store";
export * from "./knr-normalize-contract";
export * from "./knr-ingest-pipeline";
export * from "./providers/knr-source-provider";
export * from "./providers/licensed-export-file-provider";
export * from "./knr-verify-display";
export * from "./knr-verify-orchestrator";
export * from "./knr-kl6-hydration";

export * from "./knr-knowledge-envelope";
export * from "./knr-research-types";
export * from "./providers/knr-research-provider";
export * from "./knr-research-kl3b";
export * from "./knr-host-kl3-adapter";
export * from "./knr-host-application-orchestrator";
export * from "./knr-host-application-diag";
export * from "./knr-norm-application";
export * from "./knr-pricing-identity";
export * from "./knr-pricing-bridge";
export * from "./knr-owner-identity-seed";

/** KL-0 / KL-1 / KL-5 implementation markers (KL-6 / KL-3B / APP-1 / APP-2-ID / APP-2 / Host KL-3 markers from modules). */
export const KNR_KNOWLEDGE_KL0_IMPLEMENTED = true as const;
export const KNR_KNOWLEDGE_KL5_IMPLEMENTED = true as const;
