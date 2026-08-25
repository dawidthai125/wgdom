/**
 * IK-KNR Phase 2 — thin source selection (normalizedKey / family → sourceIds[]).
 *
 * L3 model: key/family → Owner-approved document sourceIds (allowlist-bound URLs).
 * Production maps EMPTY until Owner populates allowlist + selection rows.
 * NEVER accepts raw URL. EMPTY → NO_SOURCE_SELECTION → HTTP=0.
 *
 * Example (Owner-filled later — NOT shipped live):
 *   BY_KEY["KNR|4-01|1202-07"] = ["l3_gov_attachment_xyz"]
 *   BY_FAMILY["KNR"] = ["l3_family_default"]  // optional fallback
 */

export type KnrDiscoverySourceSelectionReason =
  | "OVERRIDE"
  | "EVIDENCE_KEY"
  | "NORMALIZED_KEY"
  | "FAMILY"
  | "EMPTY";

/**
 * Production selection SSOT — Owner-curated L3 document sourceIds.
 * Keys = evidenceKeyV1 or normalizedKey (exact). Values = allowlisted sourceIds.
 * Controlled L3 PDF pilot: explicit BY_KEY → allowlisted sourceId (no portal crawl).
 */
export const KNR_DISCOVERY_SOURCE_SELECTION_BY_KEY: Readonly<
  Record<string, readonly string[]>
> = Object.freeze({
  "KNR-W|4-01|0701-05": Object.freeze(["l3_bip_malopolska_1646919"]),
  "KNR-W|4-01|1202-07": Object.freeze(["l3_rckik_wroclaw_1202_07"]),
});

/**
 * Family-level fallback (e.g. "KNR" → L3 document sourceIds).
 * Ship state: EMPTY — do not invent family→portal crawl.
 */
export const KNR_DISCOVERY_SOURCE_SELECTION_BY_FAMILY: Readonly<
  Record<string, readonly string[]>
> = Object.freeze({});

export type SelectKnrDiscoverySourceIdsInput = {
  evidenceKeyV1?: string | null;
  normalizedKey?: string | null;
  family?: string | null;
  /** Test / caller override — still must resolve via allowlist at planner. */
  sourceIdsOverride?: readonly string[] | null;
  keyMapOverride?: Readonly<Record<string, readonly string[]>> | null;
  familyMapOverride?: Readonly<Record<string, readonly string[]>> | null;
};

export type SelectKnrDiscoverySourceIdsResult = {
  sourceIds: readonly string[];
  reason: KnrDiscoverySourceSelectionReason;
};

function dedupeIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = String(raw ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Resolve sourceIds for one missing KNR. Empty ⇒ caller MUST skip HTTP Discovery.
 */
export function selectKnrDiscoverySourceIds(
  input: SelectKnrDiscoverySourceIdsInput = {},
): SelectKnrDiscoverySourceIdsResult {
  if (input.sourceIdsOverride != null) {
    const sourceIds = dedupeIds(input.sourceIdsOverride);
    return {
      sourceIds,
      reason: sourceIds.length ? "OVERRIDE" : "EMPTY",
    };
  }

  const keyMap = input.keyMapOverride ?? KNR_DISCOVERY_SOURCE_SELECTION_BY_KEY;
  const familyMap = input.familyMapOverride ?? KNR_DISCOVERY_SOURCE_SELECTION_BY_FAMILY;

  const ek = String(input.evidenceKeyV1 ?? "").trim();
  if (ek && keyMap[ek]?.length) {
    return { sourceIds: dedupeIds(keyMap[ek]!), reason: "EVIDENCE_KEY" };
  }

  const nk = String(input.normalizedKey ?? "").trim();
  if (nk && keyMap[nk]?.length) {
    return { sourceIds: dedupeIds(keyMap[nk]!), reason: "NORMALIZED_KEY" };
  }

  const family = String(input.family ?? "").trim().toUpperCase();
  if (family && familyMap[family]?.length) {
    return { sourceIds: dedupeIds(familyMap[family]!), reason: "FAMILY" };
  }

  return { sourceIds: [], reason: "EMPTY" };
}

export const KNR_DISCOVERY_SOURCE_SELECTION_P2_IMPLEMENTED = true as const;
