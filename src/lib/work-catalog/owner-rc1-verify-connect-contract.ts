/**
 * OWNER_RC1_VERIFY_CONNECT_LEAF_UPGRADE_v1 — SSOT for Safe Merge + apply helper.
 *
 * REUSE: CONNECT workIds from MOPS RC-1 catalog · mappingIds from RC-1 LIM rows.
 * ZERO duplicate leaf/mapping lists · NOT a generic p2b allowlist.
 */

import {
  MOPS_ELEC_RC1_CONNECT_0407_01_WORK_ID,
  MOPS_ELEC_RC1_CONNECT_0504_03_WORK_ID,
} from "@/lib/work-catalog/ik-owner-create-mops-electrical-rc1-catalog";
import {
  MOPS_ELEC_RC1_MAP_0407_01,
  MOPS_ELEC_RC1_MAP_0504_03,
} from "@/lib/work-catalog/ik-owner-identity-mapping-mops-electrical-rc1";

export const OWNER_RC1_VERIFY_CONNECT_ATTESTATION =
  "OWNER_RC1_VERIFY_CONNECT" as const;

export const OWNER_RC1_VERIFY_CONNECT_POLICY_VERSION =
  "OWNER_RC1_VERIFY_CONNECT_LEAF_UPGRADE_v1" as const;

/** Pair: CONNECT leaf ↔ exact Owner RC1 VERIFY_CONNECT mappingId (from LIM SSOT). */
export type OwnerRc1VerifyConnectPair = {
  readonly workId: string;
  readonly mappingId: string;
};

export const OWNER_RC1_VERIFY_CONNECT_PAIRS: readonly OwnerRc1VerifyConnectPair[] =
  Object.freeze([
    {
      workId: MOPS_ELEC_RC1_CONNECT_0407_01_WORK_ID,
      mappingId: MOPS_ELEC_RC1_MAP_0407_01.mappingId,
    },
    {
      workId: MOPS_ELEC_RC1_CONNECT_0504_03_WORK_ID,
      mappingId: MOPS_ELEC_RC1_MAP_0504_03.mappingId,
    },
  ]);

const CONNECT_WORK_IDS: ReadonlySet<string> = new Set(
  OWNER_RC1_VERIFY_CONNECT_PAIRS.map((p) => p.workId),
);

const CONNECT_MAPPING_IDS: ReadonlySet<string> = new Set(
  OWNER_RC1_VERIFY_CONNECT_PAIRS.map((p) => p.mappingId),
);

export function isOwnerRc1VerifyConnectLeafWorkId(
  workId: string | null | undefined,
): boolean {
  const id = String(workId ?? "").trim();
  return Boolean(id) && CONNECT_WORK_IDS.has(id);
}

export function isOwnerRc1VerifyConnectMappingId(
  mappingId: string | null | undefined,
): boolean {
  const id = String(mappingId ?? "").trim();
  return Boolean(id) && CONNECT_MAPPING_IDS.has(id);
}

export function getOwnerRc1VerifyConnectPairForLeaf(
  workId: string | null | undefined,
): OwnerRc1VerifyConnectPair | null {
  const id = String(workId ?? "").trim();
  if (!id) return null;
  return OWNER_RC1_VERIFY_CONNECT_PAIRS.find((p) => p.workId === id) ?? null;
}

export function getOwnerRc1VerifyConnectPairForMapping(
  mappingId: string | null | undefined,
): OwnerRc1VerifyConnectPair | null {
  const id = String(mappingId ?? "").trim();
  if (!id) return null;
  return OWNER_RC1_VERIFY_CONNECT_PAIRS.find((p) => p.mappingId === id) ?? null;
}

/** Exact leaf↔mappingId pair (both must match SSOT). */
export function isOwnerRc1VerifyConnectExactPair(
  workId: string | null | undefined,
  mappingId: string | null | undefined,
): boolean {
  const pair = getOwnerRc1VerifyConnectPairForLeaf(workId);
  if (!pair) return false;
  return pair.mappingId === String(mappingId ?? "").trim();
}

/** Parse `mappingId=<id>` token from aiRationale / reasons blob. */
export function extractOwnerRc1VerifyConnectMappingIdFromRationale(
  rationale: string | null | undefined,
): string | null {
  const m = /(?:^|[·\s])mappingId=([a-z0-9][a-z0-9\-_]*)/i.exec(
    String(rationale || ""),
  );
  return m?.[1] ? String(m[1]).trim() : null;
}

export function formatOwnerRc1VerifyConnectMappingIdToken(
  mappingId: string,
): string {
  return `mappingId=${String(mappingId || "").trim()}`;
}

/**
 * Attestation gate for Safe Merge — OWNER_RC1_VERIFY_CONNECT + matching mappingId.
 * Does NOT accept COMPOUND/CANONICAL_LEAF_REBIND as substitute.
 */
export function hasOwnerRc1VerifyConnectAttestation(input: {
  leafWorkId: string | null | undefined;
  matchMethod: string | null | undefined;
  matchedBy: string | null | undefined;
  aiRationale: string | null | undefined;
}): boolean {
  const leaf = String(input.leafWorkId ?? "").trim();
  if (!isOwnerRc1VerifyConnectLeafWorkId(leaf)) return false;
  if (String(input.matchMethod || "") !== "auto_contract") return false;
  if (String(input.matchedBy || "") !== "auto_contract") return false;
  const r = String(input.aiRationale || "");
  if (!r.includes(OWNER_RC1_VERIFY_CONNECT_ATTESTATION)) return false;
  const mappingId = extractOwnerRc1VerifyConnectMappingIdFromRationale(r);
  if (!mappingId) return false;
  return isOwnerRc1VerifyConnectExactPair(leaf, mappingId);
}
