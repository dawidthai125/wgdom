/**
 * IK-KNR KNOWLEDGE LAYER — public exports (KL-0/1 + KL-5 + KL-6 + KL-3B Research-on-MISS).
 *
 * KL-3B IN: resolveKnrKnowledgeKl3b · L1 licensed ATH · PENDING_VERIFY only
 * KL-3B OUT: Host · HTTP · scraper · LLM · Corpus · Cloud · auto-VERIFIED
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

export * from "./knr-legal-gate-types";
export * from "./knr-legal-gate-runtime";
export * from "./knr-evidence-store";
export * from "./knr-normalize-contract";
export * from "./knr-ingest-pipeline";
export * from "./providers/knr-source-provider";
export * from "./providers/licensed-export-file-provider";
export * from "./knr-verify-display";
export * from "./knr-verify-orchestrator";

export * from "./knr-knowledge-envelope";
export * from "./knr-research-types";
export * from "./providers/knr-research-provider";
export * from "./knr-research-kl3b";

/** KL-0 / KL-1 / KL-5 implementation markers (KL-6 / KL-3B markers from modules). */
export const KNR_KNOWLEDGE_KL0_IMPLEMENTED = true as const;
export const KNR_KNOWLEDGE_KL5_IMPLEMENTED = true as const;
