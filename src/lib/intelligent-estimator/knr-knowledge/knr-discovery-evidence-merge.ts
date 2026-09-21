/**
 * KL-7-P2A — local ↔ cloud merge for kw-knr-discovery-evidence (anti-wipe · fail-safe).
 * Cloud = storage SSOT for discovery memory — NOT authority · NOT VERIFIED.
 *
 * Decision C (OWNER_HARD_WINS · ARCH CLOSED):
 *   L1 — safe deterministic (presence / same-hash / lifecycle)
 *   L2 — unsafe conflict → durable HOLD / OWNER EXCEPTION (no silent winner)
 *   L3 — explicit valid Owner HARD → OWNER_HARD_WINS
 * NEXT_LOCAL_WINS is NOT business authority (legacy runtime fact superseded for unsafe conflicts).
 */

import {
  emptyKnrDiscoveryEvidenceStore,
  hasActiveKnrDiscoveryEvidence,
  isDestructiveKnrDiscoveryReplace,
  isEmptyKnrDiscoveryEvidenceStore,
  isValidOwnerHardAuthority,
  normalizeKnrDiscoveryEvidenceStore,
  rebuildKnrDiscoveryIndexes,
} from "./knr-discovery-evidence-store";
import type {
  KnrDiscoveryAuthorityHold,
  KnrDiscoveryAuthorityHoldReason,
  KnrDiscoveryEvidenceRecord,
  KnrDiscoveryEvidenceStore,
} from "./knr-discovery-evidence-types";

export type KnrDiscoveryMergeConflict = {
  evidenceKeyV1: string;
  reason:
    | "CONTENT_HASH_MISMATCH"
    | "FAMILY_MISMATCH"
    | "OWNER_HARD_CONFLICT"
    | "MALFORMED_HARD"
    | "AMBIGUOUS";
  localContentHash: string;
  cloudContentHash: string;
  /** Diagnostic only — L2 uses "hold"; L3 uses hard_*; L1 lifecycle may still use local|cloud. */
  keptSide: "local" | "cloud" | "hold" | "hard_local" | "hard_cloud";
  resolution?: "HOLD" | "OWNER_EXCEPTION" | "OWNER_HARD_WINS" | "LAYER1";
};

export type KnrDiscoveryMergeResult = {
  store: KnrDiscoveryEvidenceStore;
  conflicts: KnrDiscoveryMergeConflict[];
};

function parseIsoMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function statusRank(s: KnrDiscoveryEvidenceRecord["discoveryStatus"]): number {
  switch (s) {
    case "READY_FOR_OWNER_VERIFY":
      return 50;
    case "CORROBORATED":
      return 40;
    case "DISCOVERED":
      return 30;
    case "INCOMPLETE":
      return 20;
    case "CONFLICT":
      return 10;
    default:
      return 0;
  }
}

function pickSameHash(
  a: KnrDiscoveryEvidenceRecord,
  b: KnrDiscoveryEvidenceRecord,
): KnrDiscoveryEvidenceRecord {
  const ra = statusRank(a.discoveryStatus);
  const rb = statusRank(b.discoveryStatus);
  if (ra !== rb) return ra >= rb ? a : b;
  return parseIsoMs(a.updatedAt) >= parseIsoMs(b.updatedAt) ? a : b;
}

/**
 * Layer 1 helper ONLY — lifecycle ACTIVE preference.
 * MUST NOT decide unsafe business conflicts (content/family mismatch without HARD).
 */
function pickConflictLayer1(
  local: KnrDiscoveryEvidenceRecord,
  cloud: KnrDiscoveryEvidenceRecord,
): { entry: KnrDiscoveryEvidenceRecord; keptSide: "local" | "cloud" } {
  if (local.lifecycleState === "ACTIVE" && cloud.lifecycleState !== "ACTIVE") {
    return { entry: local, keptSide: "local" };
  }
  if (cloud.lifecycleState === "ACTIVE" && local.lifecycleState !== "ACTIVE") {
    return { entry: cloud, keptSide: "cloud" };
  }
  // Both same lifecycle class — still Layer 1 only when caller already ruled out unsafe mismatch.
  return { entry: local, keptSide: "local" };
}

function holdResolution(
  reason: KnrDiscoveryAuthorityHoldReason,
): KnrDiscoveryAuthorityHold["resolution"] {
  if (reason === "OWNER_HARD_CONFLICT" || reason === "AMBIGUOUS" || reason === "MALFORMED_HARD") {
    return "OWNER_EXCEPTION";
  }
  return "HOLD";
}

function applyAuthorityHold(
  shell: KnrDiscoveryEvidenceRecord,
  reason: KnrDiscoveryAuthorityHoldReason,
  localContentHash: string,
  otherContentHash: string,
  sinceIso: string,
): KnrDiscoveryEvidenceRecord {
  const authorityHold: KnrDiscoveryAuthorityHold = {
    reason,
    localContentHash,
    otherContentHash,
    sinceIso,
    resolution: holdResolution(reason),
  };
  return {
    ...shell,
    discoveryStatus: "CONFLICT",
    authorityHold,
    // Held shell is not a business winner — do not carry HARD claim on HOLD outcome
    ownerHardAuthority: null,
  };
}

function clearHoldKeepHard(entry: KnrDiscoveryEvidenceRecord): KnrDiscoveryEvidenceRecord {
  return {
    ...entry,
    authorityHold: null,
    discoveryStatus:
      entry.discoveryStatus === "CONFLICT" ? "DISCOVERED" : entry.discoveryStatus,
  };
}

type AuthorityResolve = {
  entry: KnrDiscoveryEvidenceRecord;
  conflict?: KnrDiscoveryMergeConflict;
};

/**
 * Decision C authority-aware resolver for a single evidenceKey present on both sides.
 */
function resolveKnrDiscoveryAuthorityConflict(
  key: string,
  local: KnrDiscoveryEvidenceRecord,
  cloud: KnrDiscoveryEvidenceRecord,
  sinceIso: string,
): AuthorityResolve {
  const famL = String(local.family).trim().toUpperCase();
  const famC = String(cloud.family).trim().toUpperCase();
  const familyMismatch = Boolean(famL && famC && famL !== famC);
  const contentMismatch = local.contentHash !== cloud.contentHash;
  const bothActive =
    local.lifecycleState === "ACTIVE" && cloud.lifecycleState === "ACTIVE";
  const hardL = isValidOwnerHardAuthority(local);
  const hardC = isValidOwnerHardAuthority(cloud);

  // Malformed HARD object present but invalid → treat as NOT HARD
  const rawHardL = local.ownerHardAuthority != null && !hardL;
  const rawHardC = cloud.ownerHardAuthority != null && !hardC;

  // L3b — two valid HARD, different covered/content hashes → OWNER EXCEPTION
  if (hardL && hardC && local.contentHash !== cloud.contentHash) {
    const entry = applyAuthorityHold(
      local,
      "OWNER_HARD_CONFLICT",
      local.contentHash,
      cloud.contentHash,
      sinceIso,
    );
    return {
      entry,
      conflict: {
        evidenceKeyV1: key,
        reason: "OWNER_HARD_CONFLICT",
        localContentHash: local.contentHash,
        cloudContentHash: cloud.contentHash,
        keptSide: "hold",
        resolution: "OWNER_EXCEPTION",
      },
    };
  }

  // L3 — exactly one valid HARD (wins regardless of local/cloud side)
  if (hardL && !hardC) {
    if (familyMismatch || contentMismatch || rawHardC) {
      const entry = clearHoldKeepHard({ ...local, authorityHold: null });
      return {
        entry,
        conflict: {
          evidenceKeyV1: key,
          reason: familyMismatch
            ? "FAMILY_MISMATCH"
            : rawHardC
              ? "MALFORMED_HARD"
              : "CONTENT_HASH_MISMATCH",
          localContentHash: local.contentHash,
          cloudContentHash: cloud.contentHash,
          keptSide: "hard_local",
          resolution: "OWNER_HARD_WINS",
        },
      };
    }
  }
  if (hardC && !hardL) {
    if (familyMismatch || contentMismatch || rawHardL) {
      const entry = clearHoldKeepHard({ ...cloud, authorityHold: null });
      return {
        entry,
        conflict: {
          evidenceKeyV1: key,
          reason: familyMismatch
            ? "FAMILY_MISMATCH"
            : rawHardL
              ? "MALFORMED_HARD"
              : "CONTENT_HASH_MISMATCH",
          localContentHash: local.contentHash,
          cloudContentHash: cloud.contentHash,
          keptSide: "hard_cloud",
          resolution: "OWNER_HARD_WINS",
        },
      };
    }
  }

  // Both valid HARD + same contentHash — Layer 1 same-hash (may keep richer status)
  if (hardL && hardC && local.contentHash === cloud.contentHash) {
    return { entry: pickSameHash(local, cloud) };
  }

  // L2 — unsafe ACTIVE/ACTIVE conflict without single HARD winner
  if (bothActive && (familyMismatch || contentMismatch)) {
    const reason: KnrDiscoveryAuthorityHoldReason = rawHardL || rawHardC
      ? "MALFORMED_HARD"
      : familyMismatch
        ? "FAMILY_MISMATCH"
        : "CONTENT_HASH_MISMATCH";
    const entry = applyAuthorityHold(local, reason, local.contentHash, cloud.contentHash, sinceIso);
    return {
      entry,
      conflict: {
        evidenceKeyV1: key,
        reason,
        localContentHash: local.contentHash,
        cloudContentHash: cloud.contentHash,
        keptSide: "hold",
        resolution: holdResolution(reason),
      },
    };
  }

  // L1 — not unsafe ACTIVE/ACTIVE: presence already handled; same-hash or lifecycle preference
  if (!contentMismatch && !familyMismatch) {
    const same = pickSameHash(local, cloud);
    if (hardL || hardC) {
      const hardSide = hardL ? local : cloud;
      return { entry: pickSameHash(hardSide, same) };
    }
    return { entry: same };
  }

  // L1 — mismatch but not both ACTIVE → lifecycle preference (no silent timestamp win)
  const layer1 = pickConflictLayer1(local, cloud);
  return {
    entry: layer1.entry,
    conflict: {
      evidenceKeyV1: key,
      reason: familyMismatch ? "FAMILY_MISMATCH" : "CONTENT_HASH_MISMATCH",
      localContentHash: local.contentHash,
      cloudContentHash: cloud.contentHash,
      keptSide: layer1.keptSide,
      resolution: "LAYER1",
    },
  };
}

export function mergeKnrDiscoveryEvidenceStoreDetailed(
  localRaw: unknown,
  cloudRaw: unknown,
): KnrDiscoveryMergeResult {
  const local = normalizeKnrDiscoveryEvidenceStore(localRaw);
  const cloud = normalizeKnrDiscoveryEvidenceStore(cloudRaw);

  if (isEmptyKnrDiscoveryEvidenceStore(cloud) && hasActiveKnrDiscoveryEvidence(local)) {
    return { store: local, conflicts: [] };
  }
  if (isEmptyKnrDiscoveryEvidenceStore(local) && hasActiveKnrDiscoveryEvidence(cloud)) {
    return { store: cloud, conflicts: [] };
  }
  if (isEmptyKnrDiscoveryEvidenceStore(local) && isEmptyKnrDiscoveryEvidenceStore(cloud)) {
    return { store: emptyKnrDiscoveryEvidenceStore(), conflicts: [] };
  }

  const sinceIso =
    parseIsoMs(local.updatedAt) >= parseIsoMs(cloud.updatedAt)
      ? local.updatedAt
      : cloud.updatedAt;

  const keys = new Set([...Object.keys(local.entries), ...Object.keys(cloud.entries)]);
  const entries: Record<string, KnrDiscoveryEvidenceRecord> = {};
  const conflicts: KnrDiscoveryMergeConflict[] = [];

  for (const key of keys) {
    const L = local.entries[key];
    const C = cloud.entries[key];
    if (L && !C) {
      entries[key] = L;
      continue;
    }
    if (C && !L) {
      entries[key] = C;
      continue;
    }
    if (!L || !C) continue;

    const resolved = resolveKnrDiscoveryAuthorityConflict(key, L, C, sinceIso);
    entries[key] = resolved.entry;
    if (resolved.conflict) conflicts.push(resolved.conflict);
  }

  const updatedAt = sinceIso;
  const indexes = rebuildKnrDiscoveryIndexes(entries);
  const store = normalizeKnrDiscoveryEvidenceStore({
    schemaVersion: 1,
    updatedAt,
    etag: "",
    entries,
    ...indexes,
  });

  return { store, conflicts };
}

export function mergeKnrDiscoveryEvidenceStore(
  localRaw: unknown,
  cloudRaw: unknown,
): KnrDiscoveryEvidenceStore {
  return mergeKnrDiscoveryEvidenceStoreDetailed(localRaw, cloudRaw).store;
}

/**
 * Prefer not to push empty over non-empty cloud.
 * Prefer push when local richer / differs and not destructive.
 * CONFLICT / HOLD stores are pushable (durable Decision C state — not empty wipe).
 */
export function shouldPushKnrDiscoveryEvidenceToCloud(
  merged: unknown,
  cloudVal: unknown,
): boolean {
  const m = normalizeKnrDiscoveryEvidenceStore(merged);
  const c = normalizeKnrDiscoveryEvidenceStore(cloudVal);
  if (isDestructiveKnrDiscoveryReplace(m, c)) return false;
  if (isEmptyKnrDiscoveryEvidenceStore(m) && !isEmptyKnrDiscoveryEvidenceStore(c)) {
    return false;
  }
  if (isEmptyKnrDiscoveryEvidenceStore(m) && isEmptyKnrDiscoveryEvidenceStore(c)) {
    return false;
  }
  return JSON.stringify(m.entries) !== JSON.stringify(c.entries);
}

export const KNR_DISCOVERY_MERGE_P2A_IMPLEMENTED = true as const;
export const KNR_DISCOVERY_DECISION_C_AUTHORITY_MERGE = true as const;
