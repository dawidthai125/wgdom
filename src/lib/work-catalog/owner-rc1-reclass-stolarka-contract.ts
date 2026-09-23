/**
 * OWNER_RC1_RECLASS_STOLARKA_LEAF_UPGRADE_v1 — SSOT for Safe Merge + apply helper.
 *
 * REUSE: MOPS_ELEC_RC1_KLAMKI_WORK_ID · MOPS_ELEC_RC1_MAP_KLAMKI_STOLARKA (LIM SSOT).
 * ZERO duplicate leaf/mapping lists · NOT a generic p2b / RECLASS / DRZWI / szt allowlist.
 * RECLASS_STOLARKA ≠ CREATE · ≠ CREATE_KPL · ≠ CONNECT · ≠ cw.knr.
 */

import { MOPS_ELEC_RC1_KLAMKI_WORK_ID } from "@/lib/work-catalog/ik-owner-create-mops-electrical-rc1-catalog";
import { MOPS_ELEC_RC1_MAP_KLAMKI_STOLARKA } from "@/lib/work-catalog/ik-owner-identity-mapping-mops-electrical-rc1";

export const OWNER_RC1_RECLASS_STOLARKA_ATTESTATION =
  "OWNER_RC1_RECLASS_STOLARKA" as const;

export const OWNER_RC1_RECLASS_STOLARKA_POLICY_VERSION =
  "OWNER_RC1_RECLASS_STOLARKA_LEAF_UPGRADE_v1" as const;

/** Pair: RECLASS_STOLARKA leaf ↔ exact Owner RC1 klamki mappingId (from LIM SSOT). */
export type OwnerRc1ReclassStolarkaPair = {
  readonly workId: string;
  readonly mappingId: string;
};

/** ALLOWLIST = EXACTLY ONE RECLASS_STOLARKA leaf (klamki ↔ lim-mops-elec-rc1-klamki-stolarka). */
export const OWNER_RC1_RECLASS_STOLARKA_PAIRS: readonly OwnerRc1ReclassStolarkaPair[] =
  Object.freeze([
    {
      workId: MOPS_ELEC_RC1_KLAMKI_WORK_ID,
      mappingId: MOPS_ELEC_RC1_MAP_KLAMKI_STOLARKA.mappingId,
    },
  ]);

const RECLASS_WORK_IDS: ReadonlySet<string> = new Set(
  OWNER_RC1_RECLASS_STOLARKA_PAIRS.map((p) => p.workId),
);

const RECLASS_MAPPING_IDS: ReadonlySet<string> = new Set(
  OWNER_RC1_RECLASS_STOLARKA_PAIRS.map((p) => p.mappingId),
);

export function isOwnerRc1ReclassStolarkaLeafWorkId(
  workId: string | null | undefined,
): boolean {
  const id = String(workId ?? "").trim();
  return Boolean(id) && RECLASS_WORK_IDS.has(id);
}

export function isOwnerRc1ReclassStolarkaMappingId(
  mappingId: string | null | undefined,
): boolean {
  const id = String(mappingId ?? "").trim();
  return Boolean(id) && RECLASS_MAPPING_IDS.has(id);
}

export function getOwnerRc1ReclassStolarkaPairForLeaf(
  workId: string | null | undefined,
): OwnerRc1ReclassStolarkaPair | null {
  const id = String(workId ?? "").trim();
  if (!id) return null;
  return OWNER_RC1_RECLASS_STOLARKA_PAIRS.find((p) => p.workId === id) ?? null;
}

export function getOwnerRc1ReclassStolarkaPairForMapping(
  mappingId: string | null | undefined,
): OwnerRc1ReclassStolarkaPair | null {
  const id = String(mappingId ?? "").trim();
  if (!id) return null;
  return OWNER_RC1_RECLASS_STOLARKA_PAIRS.find((p) => p.mappingId === id) ?? null;
}

/** Exact leaf↔mappingId pair (both must match SSOT). */
export function isOwnerRc1ReclassStolarkaExactPair(
  workId: string | null | undefined,
  mappingId: string | null | undefined,
): boolean {
  const pair = getOwnerRc1ReclassStolarkaPairForLeaf(workId);
  if (!pair) return false;
  return pair.mappingId === String(mappingId ?? "").trim();
}

/** Parse `mappingId=<id>` token from aiRationale / reasons blob. */
export function extractOwnerRc1ReclassStolarkaMappingIdFromRationale(
  rationale: string | null | undefined,
): string | null {
  const m = /(?:^|[·\s])mappingId=([a-z0-9][a-z0-9\-_]*)/i.exec(
    String(rationale || ""),
  );
  return m?.[1] ? String(m[1]).trim() : null;
}

export function formatOwnerRc1ReclassStolarkaMappingIdToken(
  mappingId: string,
): string {
  return `mappingId=${String(mappingId || "").trim()}`;
}

/**
 * Attestation gate for Safe Merge — OWNER_RC1_RECLASS_STOLARKA + matching mappingId.
 * Rejects CREATE / CREATE_KPL / CONNECT / CLLR masquerade.
 */
export function hasOwnerRc1ReclassStolarkaAttestation(input: {
  leafWorkId: string | null | undefined;
  matchMethod: string | null | undefined;
  matchedBy: string | null | undefined;
  aiRationale: string | null | undefined;
}): boolean {
  const leaf = String(input.leafWorkId ?? "").trim();
  if (!isOwnerRc1ReclassStolarkaLeafWorkId(leaf)) return false;
  if (String(input.matchMethod || "") !== "auto_contract") return false;
  if (String(input.matchedBy || "") !== "auto_contract") return false;
  const r = String(input.aiRationale || "");
  if (!r.includes(OWNER_RC1_RECLASS_STOLARKA_ATTESTATION)) return false;
  // Cross-class: CREATE / KPL / CONNECT / CLLR must not authorize RECLASS
  if (r.includes("OWNER_RC1_CREATE_CANDIDATE_KPL")) return false;
  if (r.includes("OWNER_RC1_CREATE_CANDIDATE")) return false;
  if (r.includes("OWNER_RC1_VERIFY_CONNECT")) return false;
  if (r.includes("COMPOUND_LEAF_REBIND")) return false;
  if (r.includes("CANONICAL_LEAF_REBIND")) return false;
  const mappingId = extractOwnerRc1ReclassStolarkaMappingIdFromRationale(r);
  if (!mappingId) return false;
  return isOwnerRc1ReclassStolarkaExactPair(leaf, mappingId);
}
