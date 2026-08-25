/**
 * IK-KNR Phase 2 — AUDIT-ONLY source candidates (NOT production allowlist).
 * WACETOB / SEKOCENBUD require Owner-supplied HTTPS URL + originId + legal fit.
 * Do NOT merge into KNR_DISCOVERY_HTTP_ALLOWLIST without Owner GO.
 */

export type KnrDiscoverySourceCandidateStatus =
  | "SOURCE_CONFIG_REQUIRED"
  | "SOURCE_NOT_USABLE"
  | "LEGAL_GAP";

export type KnrDiscoverySourceCandidateAudit = {
  label: string;
  status: KnrDiscoverySourceCandidateStatus;
  /** Never treat as production hostname until Owner fills allowlist entry. */
  hostnameHint: string | null;
  url: null;
  sourceId: null;
  originId: null;
  levelHint: "L2" | "L3" | "L4" | "L5" | "UNKNOWN";
  notesPl: string;
};

/**
 * Industry catalog vendors — candidates for Owner review only.
 * Current HTTP legal gate does NOT include industry L5 origins → LEGAL_GAP
 * until separate Owner policy decision (do not expand gate here).
 */
export const KNR_DISCOVERY_SOURCE_CANDIDATES_AUDIT: readonly KnrDiscoverySourceCandidateAudit[] =
  Object.freeze([
    {
      label: "WACETOB",
      status: "SOURCE_CONFIG_REQUIRED",
      hostnameHint: null,
      url: null,
      sourceId: null,
      originId: null,
      levelHint: "L5",
      notesPl:
        "Katalogi KNR (m.in. 4-01/4-02/4-03/2-15/2-02). Wymaga Owner: exact HTTPS URL, sourceId, originId, robots/licencja. Pod obecnym legal gate L5 = LEGAL_GAP bez osobnej decyzji.",
    },
    {
      label: "SEKOCENBUD",
      status: "SOURCE_CONFIG_REQUIRED",
      hostnameHint: null,
      url: null,
      sourceId: null,
      originId: null,
      levelHint: "L5",
      notesPl:
        "Bazy kosztorysowe KNR/KNNR. Wymaga Owner: exact HTTPS URL, sourceId, originId, legal. L5 industry ≠ auto allowlist.",
    },
  ]);

export function listKnrDiscoverySourceCandidatesRequiringOwnerConfig(): readonly KnrDiscoverySourceCandidateAudit[] {
  return KNR_DISCOVERY_SOURCE_CANDIDATES_AUDIT.filter(
    (c) => c.status === "SOURCE_CONFIG_REQUIRED" || c.status === "LEGAL_GAP",
  );
}

export const KNR_DISCOVERY_SOURCE_CANDIDATES_AUDIT_MARKER = true as const;
