/**
 * KL-7-P2A — Discovery evidence cloud integration.
 * Cloud KV = kw-knr-discovery-evidence · localStorage = cache.
 * NEVER promotes to VERIFIED · ZERO HTTP discovery.
 */

import { fetchKeysFromCloud, persistKey } from "@/lib/cloud-sync";
import {
  mergeKnrDiscoveryEvidenceStore,
  mergeKnrDiscoveryEvidenceStoreDetailed,
  shouldPushKnrDiscoveryEvidenceToCloud,
} from "./knr-discovery-evidence-merge";
import {
  KNR_DISCOVERY_DEFAULT_UPDATED_AT,
  hasActiveKnrDiscoveryEvidence,
  isDestructiveKnrDiscoveryReplace,
  isEmptyKnrDiscoveryEvidenceStore,
  loadKnrDiscoveryEvidenceStoreLocal,
  normalizeKnrDiscoveryEvidenceStore,
  saveKnrDiscoveryEvidenceStoreLocal,
} from "./knr-discovery-evidence-store";
import {
  KNR_DISCOVERY_EVIDENCE_STORAGE_KEY,
  type KnrDiscoveryEvidenceStore,
} from "./knr-discovery-evidence-types";

export {
  KNR_DISCOVERY_EVIDENCE_STORAGE_KEY,
  mergeKnrDiscoveryEvidenceStore,
  mergeKnrDiscoveryEvidenceStoreDetailed,
  shouldPushKnrDiscoveryEvidenceToCloud,
};

export class KnrDiscoveryDestructivePersistError extends Error {
  readonly code = "destructive_discovery_replace" as const;
  constructor(
    message = "Refusing to persist empty discovery evidence over non-empty baseline",
  ) {
    super(message);
    this.name = "KnrDiscoveryDestructivePersistError";
  }
}

type CloudBaseline =
  | { status: "present"; store: KnrDiscoveryEvidenceStore }
  | { status: "missing" }
  | { status: "unknown" };

async function loadCloudBaseline(): Promise<CloudBaseline> {
  try {
    const [cloud] = await fetchKeysFromCloud([KNR_DISCOVERY_EVIDENCE_STORAGE_KEY]);
    if (cloud == null) return { status: "missing" };
    return { status: "present", store: normalizeKnrDiscoveryEvidenceStore(cloud) };
  } catch {
    return { status: "unknown" };
  }
}

export async function loadKnrDiscoveryEvidenceStore(): Promise<KnrDiscoveryEvidenceStore> {
  try {
    const local = loadKnrDiscoveryEvidenceStoreLocal();
    const [cloud] = await fetchKeysFromCloud([KNR_DISCOVERY_EVIDENCE_STORAGE_KEY]);
    if (cloud == null) return local;
    const merged = mergeKnrDiscoveryEvidenceStore(local, cloud);
    saveKnrDiscoveryEvidenceStoreLocal(merged, merged.updatedAt);
    return merged;
  } catch {
    return loadKnrDiscoveryEvidenceStoreLocal();
  }
}

export async function saveKnrDiscoveryEvidenceStore(
  store: KnrDiscoveryEvidenceStore,
  options: { updatedAtIso?: string } = {},
): Promise<void> {
  const updatedAt = options.updatedAtIso ?? store.updatedAt ?? KNR_DISCOVERY_DEFAULT_UPDATED_AT;
  let next = normalizeKnrDiscoveryEvidenceStore({ ...store, updatedAt });
  const cloud = await loadCloudBaseline();
  const local = loadKnrDiscoveryEvidenceStoreLocal();

  if (cloud.status === "present") {
    if (isDestructiveKnrDiscoveryReplace(next, cloud.store)) {
      throw new KnrDiscoveryDestructivePersistError();
    }
    const detailed = mergeKnrDiscoveryEvidenceStoreDetailed(next, cloud.store);
    next = detailed.store;
  } else if (
    cloud.status === "unknown"
    && isEmptyKnrDiscoveryEvidenceStore(next)
    && hasActiveKnrDiscoveryEvidence(local)
  ) {
    throw new KnrDiscoveryDestructivePersistError(
      "Refusing empty discovery persist while cloud baseline unknown and local has evidence",
    );
  }

  if (isDestructiveKnrDiscoveryReplace(next, local)) {
    throw new KnrDiscoveryDestructivePersistError();
  }

  saveKnrDiscoveryEvidenceStoreLocal(next, updatedAt);

  if (cloud.status === "present" && !shouldPushKnrDiscoveryEvidenceToCloud(next, cloud.store)) {
    return;
  }
  if (cloud.status === "missing" && isEmptyKnrDiscoveryEvidenceStore(next)) {
    return;
  }

  await persistKey(KNR_DISCOVERY_EVIDENCE_STORAGE_KEY, next);
}

export const KNR_DISCOVERY_SYNC_P2A_IMPLEMENTED = true as const;
