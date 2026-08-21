/**
 * IK-KNR KNOWLEDGE LAYER — public exports (KL-0 tracked contracts + KL-1 foundation).
 *
 * KL-1 IN: store · authority · lookup · write-router · validate · verify FSM planner.
 * KL-1 OUT: Host · Research-on-MISS · Evidence · VERIFY UI · corpus · cloud · normalize runtime.
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

/** KL-0 / KL-1 implementation markers. */
export const KNR_KNOWLEDGE_KL0_IMPLEMENTED = true as const;
