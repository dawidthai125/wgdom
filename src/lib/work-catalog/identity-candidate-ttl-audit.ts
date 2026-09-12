/**
 * GO37 — Identity Candidate TTL / Retention Evidence Audit (READ-ONLY).
 *
 * Question: Can P2 TTL durations be derived from authoritative repo evidence?
 * Answer: NO BASIS for numeric IdentityCandidate durations (P2 remains OPEN).
 *
 * Does NOT invent numbers · Does NOT amend GO36 frozen structure · Does NOT persist.
 */

export const GO37_AUDIT_VERSION = "identity-candidate-ttl-audit-v1" as const;

export type TtlOutcome =
  | "EVIDENCE-BACKED"
  | "DERIVABLE_BUT_REQUIRES_EXPLICIT_OWNER_CHOICE"
  | "NO_BASIS";

export type AuthorityLevel =
  | "MASTER_SSOT"
  | "ARCHITECTURE_POLICY"
  | "DECISION_TREE"
  | "IMPLEMENTATION"
  | "PRODUCTION_LIVE"
  | "TESTS_FIXTURES"
  | "CHAT_HISTORY"
  | "INFERENCE";

export type EvidenceRecord = {
  id: string;
  file: string;
  fieldOrConstant: string;
  numericValue: number | string | null;
  unit: string;
  appliesTo: string;
  meaning: string;
  authorityLevel: AuthorityLevel;
  ssotOrImpl: "SSOT_POLICY" | "SSOT_DOC" | "IMPLEMENTATION_DETAIL" | "TARGET_DESIGN" | "COUNT_CAP_NOT_TTL";
  reusableForIdentityCandidate: boolean;
  reusableWhy: string;
};

export type StateTtlAnalysis = {
  state:
    | "IDENTITY_CANDIDATE_OPEN"
    | "OWNER_REVIEW"
    | "REJECTED"
    | "SUPERSEDED"
    | "ACCEPTED_CANONICAL_PROVENANCE";
  shouldExpire: "YES_STRUCTURAL" | "NO" | "OWNER_CHOICE";
  ttlOutcome: TtlOutcome;
  ttlNumber: null;
  evidence: string[];
  authority: string;
  archivalBehavior: string;
  ownerInspectAfterArchival: boolean;
  mayReuse: boolean;
  mayResurrectCanonicalViaSimilarity: false;
  fingerprintAfterArchival: string;
};

/** Inventory of discovered TTL/retention-like rules (not exhaustive of every cache). */
export function inventoryTtlRetentionEvidence(): EvidenceRecord[] {
  return [
    {
      id: "E-GO36-P2-OPEN",
      file: "src/lib/work-catalog/identity-candidate-policy.ts",
      fieldOrConstant: "P2 / freezePersistenceAndTtl.ttlDurations",
      numericValue: null,
      unit: "n/a",
      appliesTo: "IdentityCandidate P2",
      meaning: "Structure frozen; duration values explicitly OPEN — no ops SSOT days",
      authorityLevel: "DECISION_TREE",
      ssotOrImpl: "SSOT_POLICY",
      reusableForIdentityCandidate: true,
      reusableWhy: "This is the controlling IdentityCandidate policy — durations remain OPEN",
    },
    {
      id: "E-GO35-EXPIRESAT-TARGET",
      file: "src/lib/work-catalog/identity-candidate-contract.ts",
      fieldOrConstant: "ttlPolicy / expiresAt field",
      numericValue: null,
      unit: "n/a",
      appliesTo: "IdentityCandidate TARGET schema",
      meaning: "expiresAt required if persisted; REJECTED/SUPERSEDED audit retention with capped history — no day count",
      authorityLevel: "ARCHITECTURE_POLICY",
      ssotOrImpl: "TARGET_DESIGN",
      reusableForIdentityCandidate: true,
      reusableWhy: "Structural field only — does not set duration",
    },
    {
      id: "E-WC-FRESHNESS-90",
      file: "src/lib/work-catalog/freshness.ts",
      fieldOrConstant: "WORK_FRESHNESS_STALE_AFTER_DAYS",
      numericValue: 90,
      unit: "days",
      appliesTo: "CatalogWork company price freshness (Biblioteka)",
      meaning: "Stale AFTER 90 days for company price display — not identity lifecycle",
      authorityLevel: "IMPLEMENTATION",
      ssotOrImpl: "IMPLEMENTATION_DETAIL",
      reusableForIdentityCandidate: false,
      reusableWhy:
        "Different object (price freshness vs identity proposal). Promoting 90d to IC TTL would be inference without Owner choice",
    },
    {
      id: "E-OUR-RATE-FRESHNESS-90",
      file: "src/lib/work-catalog/work-rate-freshness.ts",
      fieldOrConstant: "WORK_RATE_FRESHNESS_STALE_AFTER_DAYS",
      numericValue: 90,
      unit: "days",
      appliesTo: "OUR RATE observedAt freshness",
      meaning: "Rate staleness window — GO36 forbids OUR RATE as identity side effect",
      authorityLevel: "IMPLEMENTATION",
      ssotOrImpl: "IMPLEMENTATION_DETAIL",
      reusableForIdentityCandidate: false,
      reusableWhy: "Rate plane ≠ identity plane; FORBIDDEN as identity authority",
    },
    {
      id: "E-KNR-DISCOVERY-90",
      file: "src/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-types.ts",
      fieldOrConstant: "KNR_DISCOVERY_OPS_FRESHNESS_DAYS",
      numericValue: 90,
      unit: "days",
      appliesTo: "KNR discovery evidence ops UI freshness filter",
      meaning: "Ops window for discovery evidence freshness display",
      authorityLevel: "IMPLEMENTATION",
      ssotOrImpl: "IMPLEMENTATION_DETAIL",
      reusableForIdentityCandidate: false,
      reusableWhy: "KNR discovery freshness ≠ IdentityCandidate retention; KNR is DISCOVERY_ONLY",
    },
    {
      id: "E-KNR-CATALOG-90",
      file: "src/lib/intelligent-estimator/knr-knowledge/knr-catalog-ui.ts",
      fieldOrConstant: "KNR_CATALOG_OPS_FRESHNESS_DAYS",
      numericValue: 90,
      unit: "days",
      appliesTo: "KNR catalog ops UI freshness",
      meaning: "Same 90d ops filter pattern for KNR catalog",
      authorityLevel: "IMPLEMENTATION",
      ssotOrImpl: "IMPLEMENTATION_DETAIL",
      reusableForIdentityCandidate: false,
      reusableWhy: "KNR Catalog ≠ Work Catalog identity lifecycle",
    },
    {
      id: "E-KL7-P2C-TTL-90S",
      file: "docs/architecture/KL-7-P2C-DESIGN-FREEZE.md",
      fieldOrConstant: "OD-P2C-2 TTL default 90s / min 1s / max 1h",
      numericValue: 90,
      unit: "seconds",
      appliesTo: "KL-7 P2C operational timeout (batch/concurrency)",
      meaning: "Request/operation TTL — not archival policy for candidates",
      authorityLevel: "ARCHITECTURE_POLICY",
      ssotOrImpl: "SSOT_DOC",
      reusableForIdentityCandidate: false,
      reusableWhy: "Seconds-scale ops timeout; wrong semantic class for IC retention",
    },
    {
      id: "E-PAYROLL-HOURS-INTENT-7D",
      file: "src/lib/payroll-hours-intent-ledger.ts",
      fieldOrConstant: "PAYROLL_HOURS_INTENT_LEDGER_TTL_MS",
      numericValue: 7,
      unit: "days",
      appliesTo: "Payroll hours-intent localStorage ledger",
      meaning: "Bounded intent discard after 7 days — Owner-approved payroll hardening",
      authorityLevel: "IMPLEMENTATION",
      ssotOrImpl: "IMPLEMENTATION_DETAIL",
      reusableForIdentityCandidate: false,
      reusableWhy: "Payroll CRITICAL domain; different risk/object; not IC SSOT",
    },
    {
      id: "E-SETTLEMENT-IDEM-7D",
      file: "src/lib/payroll-settlement-mark-paid-if-unpaid.ts",
      fieldOrConstant: "SETTLEMENT_IDEMPOTENCY_MAX_AGE_MS",
      numericValue: 7,
      unit: "days",
      appliesTo: "Payroll settlement idempotency KV keys",
      meaning: "Idempotency key max age before ignore",
      authorityLevel: "IMPLEMENTATION",
      ssotOrImpl: "IMPLEMENTATION_DETAIL",
      reusableForIdentityCandidate: false,
      reusableWhy: "Settlement idempotency ≠ identity candidate archival",
    },
    {
      id: "E-PIPELINE-SESSION-60S",
      file: "src/lib/tenders-pipeline-session-cache.ts",
      fieldOrConstant: "PIPELINE_SESSION_CACHE_TTL_MS",
      numericValue: 60,
      unit: "seconds",
      appliesTo: "In-memory tenders pipeline session cache",
      meaning: "Performance cache invalidate",
      authorityLevel: "IMPLEMENTATION",
      ssotOrImpl: "IMPLEMENTATION_DETAIL",
      reusableForIdentityCandidate: false,
      reusableWhy: "GO37: cache TTL must not be promoted to IdentityCandidate policy",
    },
    {
      id: "E-WM-DRUK-AUDIT-CAP",
      file: "src/lib/wm-druk-audit.ts",
      fieldOrConstant: "WM_DRUK_AUDIT_CAP",
      numericValue: 3000,
      unit: "entries",
      appliesTo: "kw-wm-druk-audit-log append-only cap",
      meaning: "Count-based ring buffer — not time TTL",
      authorityLevel: "IMPLEMENTATION",
      ssotOrImpl: "COUNT_CAP_NOT_TTL",
      reusableForIdentityCandidate: false,
      reusableWhy: "Count cap may inspire TARGET capped history shape, but does not yield days",
    },
    {
      id: "E-OPS-NOTES-AUDIT-CAP",
      file: "src/lib/operational-notes.ts",
      fieldOrConstant: "auditLog.slice(0, 3000)",
      numericValue: 3000,
      unit: "entries",
      appliesTo: "Operational notes audit log",
      meaning: "Count-based retention cap",
      authorityLevel: "IMPLEMENTATION",
      ssotOrImpl: "COUNT_CAP_NOT_TTL",
      reusableForIdentityCandidate: false,
      reusableWhy: "No time duration; optional analogy for cap only under Owner GO",
    },
    {
      id: "E-SECURITY-AUDIT-CAP",
      file: "src/lib/security-audit-log.ts",
      fieldOrConstant: "SECURITY_AUDIT_CAP",
      numericValue: 5000,
      unit: "entries",
      appliesTo: "Security audit log",
      meaning: "Count-based cap",
      authorityLevel: "IMPLEMENTATION",
      ssotOrImpl: "COUNT_CAP_NOT_TTL",
      reusableForIdentityCandidate: false,
      reusableWhy: "Not a day TTL for IdentityCandidate",
    },
    {
      id: "E-LABOR-EVIDENCE-CAPS",
      file: "src/lib/labor-source-evidence/types.ts",
      fieldOrConstant: "LABOR_SOURCE_EVIDENCE_CAP_*",
      numericValue: "8000/80/2000/200",
      unit: "entries",
      appliesTo: "Labor source evidence store caps",
      meaning: "Evidence volume caps — rate research plane",
      authorityLevel: "IMPLEMENTATION",
      ssotOrImpl: "COUNT_CAP_NOT_TTL",
      reusableForIdentityCandidate: false,
      reusableWhy: "Rate evidence caps; GO29 downstream; not IC TTL",
    },
    {
      id: "E-TOMBSTONE-SLICE-500",
      file: "src/lib/cloud-sync.ts",
      fieldOrConstant: "deleted ids slice(-500)",
      numericValue: 500,
      unit: "entries",
      appliesTo: "Various tombstone id lists (jobs, directory, …)",
      meaning: "Bounded soft-delete id lists",
      authorityLevel: "IMPLEMENTATION",
      ssotOrImpl: "COUNT_CAP_NOT_TTL",
      reusableForIdentityCandidate: false,
      reusableWhy: "Tombstone count ≠ candidate time retention",
    },
    {
      id: "E-WM-DRAWINGS-EXPIRESAT",
      file: "src/lib/wm-technical-drawings/types.ts",
      fieldOrConstant: "DrawingLock.expiresAt",
      numericValue: null,
      unit: "ISO timestamp",
      appliesTo: "WM technical drawings edit lock lease",
      meaning: "Lock lease expiry field — duration set by lock acquire path, not IC",
      authorityLevel: "IMPLEMENTATION",
      ssotOrImpl: "IMPLEMENTATION_DETAIL",
      reusableForIdentityCandidate: false,
      reusableWhy: "Concurrency lock lease ≠ identity archival policy",
    },
    {
      id: "E-NO-LEGAL-RETENTION-IC",
      file: "(repository search)",
      fieldOrConstant: "legal/compliance retention for IdentityCandidate",
      numericValue: null,
      unit: "n/a",
      appliesTo: "IdentityCandidate",
      meaning: "No explicit legal/compliance retention assumption found for IdentityCandidate",
      authorityLevel: "MASTER_SSOT",
      ssotOrImpl: "SSOT_DOC",
      reusableForIdentityCandidate: true,
      reusableWhy: "Absence of legal SSOT → cannot invent compliance-driven days",
    },
  ];
}

export function analyzeStateByStateP2(): StateTtlAnalysis[] {
  const commonNoNumber: Pick<
    StateTtlAnalysis,
    "ttlNumber" | "mayResurrectCanonicalViaSimilarity"
  > = {
    ttlNumber: null,
    mayResurrectCanonicalViaSimilarity: false,
  };

  return [
    {
      state: "IDENTITY_CANDIDATE_OPEN",
      shouldExpire: "OWNER_CHOICE",
      ttlOutcome: "NO_BASIS",
      ...commonNoNumber,
      evidence: [
        "GO36 P2 OPEN — no day SSOT",
        "GO35 expiresAt TARGET without duration",
        "Ephemeral HYBRID (P1) may make time-TTL optional until durable",
        "No Master SSOT IdentityCandidate open-window",
      ],
      authority: "DECISION_TREE GO36 + absence in Master/architecture IC policy",
      archivalBehavior:
        "If Owner later sets expiry: archival retention (not hard delete); no EXPIRED state (GO36 structure)",
      ownerInspectAfterArchival: true,
      mayReuse: false,
      fingerprintAfterArchival:
        "Archived open row does not free fingerprint for a second simultaneous OPEN; new open requires SUPERSEDE or material new fingerprint per GO36 P8/P9 — durations do not amend that",
    },
    {
      state: "OWNER_REVIEW",
      shouldExpire: "OWNER_CHOICE",
      ttlOutcome: "NO_BASIS",
      ...commonNoNumber,
      evidence: [
        "No Owner Review SLA days in SSOT",
        "DURABLE_TARGET under P1 — retention expected, duration unknown",
        "90d price freshness exists but wrong semantic class",
      ],
      authority: "Absence + non-reusable 90d analogs (IMPLEMENTATION)",
      archivalBehavior: "Archival after Owner-chosen window; decision queue history preserved",
      ownerInspectAfterArchival: true,
      mayReuse: false,
      fingerprintAfterArchival:
        "OWNER_REVIEW archival must not allow silent re-queue of same fingerprint as fresh OPEN without Owner rule — policy OPEN for duration only",
    },
    {
      state: "REJECTED",
      shouldExpire: "NO",
      ttlOutcome: "DERIVABLE_BUT_REQUIRES_EXPLICIT_OWNER_CHOICE",
      ...commonNoNumber,
      evidence: [
        "GO36 P9 REJECT_STICKY — history survives",
        "GO35/GO36: no hard delete; archival not deletion",
        "Audit caps (3000/5000) suggest bounded storage shape but not days",
        "Resurrection via similarity FORBIDDEN",
      ],
      authority: "DECISION_TREE GO36 structure; count caps IMPLEMENTATION analogy only",
      archivalBehavior:
        "Prefer indefinite audit retain or Owner-set archival window; never hard-delete for resurrection hygiene",
      ownerInspectAfterArchival: true,
      mayReuse: false,
      fingerprintAfterArchival:
        "REJECTED fingerprint family remains blocked from similarity resurrect; material new fingerprint + Owner path only",
    },
    {
      state: "SUPERSEDED",
      shouldExpire: "NO",
      ttlOutcome: "DERIVABLE_BUT_REQUIRES_EXPLICIT_OWNER_CHOICE",
      ...commonNoNumber,
      evidence: [
        "GO36 P9 SUPERSEDE_CHAIN_PRESERVES_HISTORY",
        "Chain required for audit of why newer candidate won",
        "Count caps analog only",
      ],
      authority: "DECISION_TREE GO36",
      archivalBehavior: "Retain chain links; archival OK; hard delete forbidden without Owner GO",
      ownerInspectAfterArchival: true,
      mayReuse: false,
      fingerprintAfterArchival:
        "Superseded fingerprint remains in history; open uniqueness applies to non-terminal open set only",
    },
    {
      state: "ACCEPTED_CANONICAL_PROVENANCE",
      shouldExpire: "NO",
      ttlOutcome: "DERIVABLE_BUT_REQUIRES_EXPLICIT_OWNER_CHOICE",
      ...commonNoNumber,
      evidence: [
        "Accept creates CatalogWork — provenance must remain auditable",
        "GO36: canonical never silently replaced by candidate supersession",
        "No SSOT for deleting Accept provenance after N days",
        "Payroll/meta history patterns retain history (different domain)",
      ],
      authority: "DECISION_TREE Accept semantics + absence of delete-provenance SSOT",
      archivalBehavior:
        "Provenance row should remain indefinitely or Owner archival; CatalogWork remains SSOT of identity",
      ownerInspectAfterArchival: true,
      mayReuse: true,
      fingerprintAfterArchival:
        "Accept maps fingerprint→workId permanently for idempotent Accept retry; archival must not break that mapping",
    },
  ];
}

export function analyzeFingerprintIdempotencyImpact(): {
  policyUnchanged: true;
  impacts: Array<{ topic: string; conclusion: string }>;
} {
  return {
    policyUnchanged: true,
    impacts: [
      {
        topic: "one open candidate per fingerprint",
        conclusion:
          "TTL duration (once Owner-set) must not create a second simultaneous OPEN for same fingerprint; archival of OPEN removes from open-set only after terminal/archival transition rules Owner defines",
      },
      {
        topic: "reopening a candidate",
        conclusion:
          "Not authorized by TTL alone — would need Owner rule; GO36 forbids silent mutate / similarity resurrect",
      },
      {
        topic: "new candidate after archival",
        conclusion:
          "Allowed only with material new fingerprint (P8) or explicit Owner exception GO — TTL numbers do not change this",
      },
      {
        topic: "supersession",
        conclusion: "Independent of TTL; driven by evidence change → SUPERSEDED link",
      },
      {
        topic: "duplicate prevention",
        conclusion: "Fingerprint + Accept idempotency unchanged; TTL must not mint duplicate CatalogWork",
      },
    ],
  };
}

export function documentArchivalSemantics(): {
  expiredLifecycleState: false;
  hardDeleteDefault: false;
  archivalPreservesDecisionHistory: true;
  ownerInspectAfterArchival: true;
  note: string;
} {
  return {
    expiredLifecycleState: false,
    hardDeleteDefault: false,
    archivalPreservesDecisionHistory: true,
    ownerInspectAfterArchival: true,
    note: "GO36 structure unchanged — GO37 confirms no repo evidence to set day counts; archival semantics remain as frozen",
  };
}

export function listOwnerDecisionsStillRequired(): Array<{
  id: string;
  question: string;
  outcomeClass: TtlOutcome;
}> {
  return [
    {
      id: "OD-P2-OPEN",
      question: "TTL/archival window for OPEN IdentityCandidate (or ephemeral-only until Review)?",
      outcomeClass: "NO_BASIS",
    },
    {
      id: "OD-P2-OWNER-REVIEW",
      question: "TTL/SLA for OWNER_REVIEW queue rows?",
      outcomeClass: "NO_BASIS",
    },
    {
      id: "OD-P2-REJECTED",
      question: "Indefinite retain vs archival window + count cap for REJECTED?",
      outcomeClass: "DERIVABLE_BUT_REQUIRES_EXPLICIT_OWNER_CHOICE",
    },
    {
      id: "OD-P2-SUPERSEDED",
      question: "Indefinite retain vs archival window + count cap for SUPERSEDED chain?",
      outcomeClass: "DERIVABLE_BUT_REQUIRES_EXPLICIT_OWNER_CHOICE",
    },
    {
      id: "OD-P2-ACCEPTED-PROVENANCE",
      question: "Indefinite Accept provenance retain (recommended by structure) vs archival window?",
      outcomeClass: "DERIVABLE_BUT_REQUIRES_EXPLICIT_OWNER_CHOICE",
    },
    {
      id: "OD-P2-COUNT-CAP",
      question: "If durable KV: adopt count cap analogous to audit logs (3000/5000) — optional, separate from TTL days?",
      outcomeClass: "DERIVABLE_BUT_REQUIRES_EXPLICIT_OWNER_CHOICE",
    },
  ];
}

/**
 * Full GO37 audit — pure / no I/O / no policy mutation / no persistence.
 */
export function auditIdentityCandidateTtlEvidence(): {
  verdict: "IDENTITY_CANDIDATE_TTL_AUDIT_PASS_P2_REMAINS_OPEN";
  auditVersion: typeof GO37_AUDIT_VERSION;
  searchedAreas: string[];
  evidenceRecords: EvidenceRecord[];
  reusableEvidenceCount: number;
  evidenceBackedDurationCount: number;
  stateByState: StateTtlAnalysis[];
  fingerprintIdempotency: ReturnType<typeof analyzeFingerprintIdempotencyImpact>;
  archivalSemantics: ReturnType<typeof documentArchivalSemantics>;
  ownerDecisionsStillRequired: ReturnType<typeof listOwnerDecisionsStillRequired>;
  p2Status: "OPEN";
  inventedNumbers: false;
  policyAmended: false;
  mutationGuard: {
    kv: false;
    wc: false;
    candidatePersist: false;
    accept: false;
    pack: false;
    rate: false;
    research: false;
  };
} {
  const evidenceRecords = inventoryTtlRetentionEvidence();
  const stateByState = analyzeStateByStateP2();
  const evidenceBackedDurationCount = stateByState.filter(
    (s) => s.ttlOutcome === "EVIDENCE-BACKED",
  ).length;

  return {
    verdict: "IDENTITY_CANDIDATE_TTL_AUDIT_PASS_P2_REMAINS_OPEN",
    auditVersion: GO37_AUDIT_VERSION,
    searchedAreas: [
      "src/lib/work-catalog (freshness, identity-candidate-*, our rate)",
      "src/lib/intelligent-estimator/knr-knowledge",
      "src/lib/payroll-* TTL / idempotency",
      "src/lib/tenders-pipeline-session-cache",
      "src/lib/wm-druk-audit · operational-notes · security-audit-log · labor-source-evidence",
      "src/lib/cloud-sync tombstone caps",
      "src/lib/wm-technical-drawings expiresAt",
      "docs/architecture (KL-7 P2C, IDENTITY-CANDIDATE-POLICY-GO36, Bridge DF)",
      "GO35/GO36 modules (TARGET expiresAt, P2 OPEN)",
    ],
    evidenceRecords,
    reusableEvidenceCount: evidenceRecords.filter((e) => e.reusableForIdentityCandidate).length,
    evidenceBackedDurationCount,
    stateByState,
    fingerprintIdempotency: analyzeFingerprintIdempotencyImpact(),
    archivalSemantics: documentArchivalSemantics(),
    ownerDecisionsStillRequired: listOwnerDecisionsStillRequired(),
    p2Status: "OPEN",
    inventedNumbers: false,
    policyAmended: false,
    mutationGuard: {
      kv: false,
      wc: false,
      candidatePersist: false,
      accept: false,
      pack: false,
      rate: false,
      research: false,
    },
  };
}
