/**
 * OWNER_RC1_CREATE_CANDIDATE_KPL_LEAF_UPGRADE_v1 — SSOT for Safe Merge + apply helper.
 *
 * REUSE: MOPS_ELEC_RC1_0501_03_WORK_ID · MOPS_ELEC_RC1_MAP_0501_03 (LIM SSOT).
 * ZERO duplicate leaf/mapping lists · NOT a generic knr-wc / KPL / CREATE allowlist.
 * KPL ≠ szt CREATE (OWNER_RC1_CREATE_CANDIDATE) · ≠ CONNECT.
 */

import { MOPS_ELEC_RC1_0501_03_WORK_ID } from "@/lib/work-catalog/ik-owner-create-mops-electrical-rc1-catalog";
import { MOPS_ELEC_RC1_MAP_0501_03 } from "@/lib/work-catalog/ik-owner-identity-mapping-mops-electrical-rc1";

export const OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION =
  "OWNER_RC1_CREATE_CANDIDATE_KPL" as const;

export const OWNER_RC1_CREATE_CANDIDATE_KPL_POLICY_VERSION =
  "OWNER_RC1_CREATE_CANDIDATE_KPL_LEAF_UPGRADE_v1" as const;

/** Pair: CREATE_CANDIDATE_KPL leaf ↔ exact Owner RC1 KPL mappingId (from LIM SSOT). */
export type OwnerRc1CreateCandidateKplPair = {
  readonly workId: string;
  readonly mappingId: string;
};

/** ALLOWLIST = EXACTLY ONE KPL CREATE leaf (0501-03 ↔ lim-mops-elec-rc1-0501-03-podloze-kpl). */
export const OWNER_RC1_CREATE_CANDIDATE_KPL_PAIRS: readonly OwnerRc1CreateCandidateKplPair[] =
  Object.freeze([
    {
      workId: MOPS_ELEC_RC1_0501_03_WORK_ID,
      mappingId: MOPS_ELEC_RC1_MAP_0501_03.mappingId,
    },
  ]);

const KPL_WORK_IDS: ReadonlySet<string> = new Set(
  OWNER_RC1_CREATE_CANDIDATE_KPL_PAIRS.map((p) => p.workId),
);

const KPL_MAPPING_IDS: ReadonlySet<string> = new Set(
  OWNER_RC1_CREATE_CANDIDATE_KPL_PAIRS.map((p) => p.mappingId),
);

export function isOwnerRc1CreateCandidateKplLeafWorkId(
  workId: string | null | undefined,
): boolean {
  const id = String(workId ?? "").trim();
  return Boolean(id) && KPL_WORK_IDS.has(id);
}

export function isOwnerRc1CreateCandidateKplMappingId(
  mappingId: string | null | undefined,
): boolean {
  const id = String(mappingId ?? "").trim();
  return Boolean(id) && KPL_MAPPING_IDS.has(id);
}

export function getOwnerRc1CreateCandidateKplPairForLeaf(
  workId: string | null | undefined,
): OwnerRc1CreateCandidateKplPair | null {
  const id = String(workId ?? "").trim();
  if (!id) return null;
  return OWNER_RC1_CREATE_CANDIDATE_KPL_PAIRS.find((p) => p.workId === id) ?? null;
}

export function getOwnerRc1CreateCandidateKplPairForMapping(
  mappingId: string | null | undefined,
): OwnerRc1CreateCandidateKplPair | null {
  const id = String(mappingId ?? "").trim();
  if (!id) return null;
  return OWNER_RC1_CREATE_CANDIDATE_KPL_PAIRS.find((p) => p.mappingId === id) ?? null;
}

/** Exact leaf↔mappingId pair (both must match SSOT). */
export function isOwnerRc1CreateCandidateKplExactPair(
  workId: string | null | undefined,
  mappingId: string | null | undefined,
): boolean {
  const pair = getOwnerRc1CreateCandidateKplPairForLeaf(workId);
  if (!pair) return false;
  return pair.mappingId === String(mappingId ?? "").trim();
}

/** Parse `mappingId=<id>` token from aiRationale / reasons blob. */
export function extractOwnerRc1CreateCandidateKplMappingIdFromRationale(
  rationale: string | null | undefined,
): string | null {
  const m = /(?:^|[·\s])mappingId=([a-z0-9][a-z0-9\-_]*)/i.exec(
    String(rationale || ""),
  );
  return m?.[1] ? String(m[1]).trim() : null;
}

export function formatOwnerRc1CreateCandidateKplMappingIdToken(
  mappingId: string,
): string {
  return `mappingId=${String(mappingId || "").trim()}`;
}

/**
 * Attestation gate for Safe Merge — OWNER_RC1_CREATE_CANDIDATE_KPL + matching mappingId.
 * Rejects bare OWNER_RC1_CREATE_CANDIDATE (without _KPL), CONNECT, CLLR.
 */
export function hasOwnerRc1CreateCandidateKplAttestation(input: {
  leafWorkId: string | null | undefined;
  matchMethod: string | null | undefined;
  matchedBy: string | null | undefined;
  aiRationale: string | null | undefined;
}): boolean {
  const leaf = String(input.leafWorkId ?? "").trim();
  if (!isOwnerRc1CreateCandidateKplLeafWorkId(leaf)) return false;
  if (String(input.matchMethod || "") !== "auto_contract") return false;
  if (String(input.matchedBy || "") !== "auto_contract") return false;
  const r = String(input.aiRationale || "");
  if (!r.includes(OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION)) return false;
  // Bare szt CREATE without _KPL must not authorize KPL (token boundary: require _KPL form)
  // If rationale has OWNER_RC1_CREATE_CANDIDATE but not ..._KPL — already failed above.
  // Reject CONNECT / RECLASS / CLLR masquerade
  if (r.includes("OWNER_RC1_VERIFY_CONNECT")) return false;
  if (r.includes("OWNER_RC1_RECLASS_STOLARKA")) return false;
  if (r.includes("COMPOUND_LEAF_REBIND")) return false;
  if (r.includes("CANONICAL_LEAF_REBIND")) return false;
  const mappingId = extractOwnerRc1CreateCandidateKplMappingIdFromRationale(r);
  if (!mappingId) return false;
  return isOwnerRc1CreateCandidateKplExactPair(leaf, mappingId);
}
