/**
 * WORK-RATE Legal Enablement — osobny gate stawek robót.
 * OSOBNY od MARKET_SYNC_P3_LEGAL_GATE — NIE reuse / NIE flip materiałów.
 *
 * PASS = Owner Attestation (KB.pl · SCCOT · Extradom · CennikRemontow.pl).
 * Dowody prywatne: HELD BY OWNER · NOT IN REPO.
 * Live adapters / HTTP: nadal poza tym krokiem (P2 + osobny GO).
 */

export type WorkRateLegalGateStatus = "BLOCKED" | "NOT_READY" | "PASS" | "FAIL";

/**
 * WORK_RATE_LEGAL_GATE = PASS po Owner Legal Enablement (2026-08-12).
 * Evidence: docs/architecture/WORK-RATE-OWNER-LEGAL-PASS.md
 * Selective research authorized · full catalogue FORBIDDEN · adapters = NOT IMPLEMENTED.
 */
export const WORK_RATE_LEGAL_GATE: WorkRateLegalGateStatus = "PASS";

export function isWorkRateLegalPass(): boolean {
  return WORK_RATE_LEGAL_GATE === "PASS";
}

/** Legal pozwala na selective research; runtime adapterów = osobny P2. */
export function isWorkRateResearchAllowed(): boolean {
  return isWorkRateLegalPass();
}

export type WorkRateSourceAttestationStatus = "VERIFIED" | "REVIEW" | "UNKNOWN" | "FAIL";

export type WorkRateAuthorizedSourceId =
  | "kb_pl"
  | "sccot"
  | "extradom"
  | "cennikremontow_pl";

export type WorkRateAuthorizedSource = {
  id: WorkRateAuthorizedSourceId;
  namePl: string;
  role: "PRIMARY" | "SECONDARY";
  regionFocusPl: string | null;
  status: WorkRateSourceAttestationStatus;
  authorization: "OWNER_ATTESTATION";
  evidence: "PRIVATE_OWNER_HELD";
  api: "NOT_AVAILABLE";
};

/** Metadane źródeł — bez treści prywatnej korespondencji. */
export const WORK_RATE_AUTHORIZED_SOURCES: readonly WorkRateAuthorizedSource[] = [
  {
    id: "kb_pl",
    namePl: "KB.pl",
    role: "PRIMARY",
    regionFocusPl: "Wrocław",
    status: "VERIFIED",
    authorization: "OWNER_ATTESTATION",
    evidence: "PRIVATE_OWNER_HELD",
    api: "NOT_AVAILABLE",
  },
  {
    id: "cennikremontow_pl",
    namePl: "CennikRemontow.pl",
    role: "PRIMARY",
    regionFocusPl: "Wrocław",
    status: "VERIFIED",
    authorization: "OWNER_ATTESTATION",
    evidence: "PRIVATE_OWNER_HELD",
    api: "NOT_AVAILABLE",
  },
  {
    id: "sccot",
    namePl: "SCCOT",
    role: "SECONDARY",
    regionFocusPl: null,
    status: "VERIFIED",
    authorization: "OWNER_ATTESTATION",
    evidence: "PRIVATE_OWNER_HELD",
    api: "NOT_AVAILABLE",
  },
  {
    id: "extradom",
    namePl: "Extradom",
    role: "SECONDARY",
    regionFocusPl: null,
    status: "VERIFIED",
    authorization: "OWNER_ATTESTATION",
    evidence: "PRIVATE_OWNER_HELD",
    api: "NOT_AVAILABLE",
  },
] as const;

export function isWorkRateSourceVerified(id: WorkRateAuthorizedSourceId): boolean {
  const row = WORK_RATE_AUTHORIZED_SOURCES.find((s) => s.id === id);
  return row?.status === "VERIFIED";
}

/** Selective research authorized by Legal PASS — nie oznacza, że adapter działa. */
export function isWorkRateSelectiveResearchAuthorized(): boolean {
  return isWorkRateLegalPass();
}

export function isWorkRateFullCatalogueForbidden(): boolean {
  return true;
}
