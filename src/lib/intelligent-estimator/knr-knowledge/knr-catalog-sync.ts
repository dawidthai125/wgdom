/**
 * KL-7-P0 — KNR catalog cloud integration (ADAPT: work-catalog-sync.ts).
 * Cloud KV key = kw-knr-catalog · localStorage = cache.
 * Authority writes remain knr-verify-orchestrator → write-router only.
 */

import { fetchKeysFromCloud, persistKey } from "@/lib/cloud-sync";
import {
  KnrCatalogDestructivePersistError,
  assertKnrCatalogPersistSafe,
  hasVerifiedKnrCatalogEntries,
  isDestructiveKnrCatalogReplace,
  isEmptyKnrCatalogStore,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-authority";
import {
  mergeKnrCatalogStore,
  mergeKnrCatalogStoreDetailed,
  shouldPushKnrCatalogToCloud,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-merge";
import {
  KNR_CATALOG_STORAGE_KEY,
  loadKnrCatalogStoreLocal,
  normalizeKnrCatalogStore,
  saveKnrCatalogStoreLocal,
  type KnrCatalogStore,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-store";

export {
  KNR_CATALOG_STORAGE_KEY,
  mergeKnrCatalogStore,
  mergeKnrCatalogStoreDetailed,
  shouldPushKnrCatalogToCloud,
};

export type SaveKnrCatalogStoreCloudOptions = {
  updatedAtIso?: string;
};

type CloudKnrBaseline =
  | { status: "present"; store: KnrCatalogStore }
  | { status: "missing" }
  | { status: "unknown" };

async function loadCloudKnrBaseline(): Promise<CloudKnrBaseline> {
  try {
    const [cloud] = await fetchKeysFromCloud([KNR_CATALOG_STORAGE_KEY]);
    if (cloud == null) return { status: "missing" };
    return { status: "present", store: normalizeKnrCatalogStore(cloud) };
  } catch {
    return { status: "unknown" };
  }
}

function assertKnrCatalogCloudPersistAllowed(
  next: KnrCatalogStore,
  local: KnrCatalogStore,
  cloud: CloudKnrBaseline,
): void {
  if (cloud.status === "present" && isDestructiveKnrCatalogReplace(next, cloud.store)) {
    throw new KnrCatalogDestructivePersistError();
  }
  if (cloud.status === "unknown" && isEmptyKnrCatalogStore(next) && hasVerifiedKnrCatalogEntries(local)) {
    throw new KnrCatalogDestructivePersistError(
      "Refusing empty KNR catalog persist while cloud baseline unknown and local has VERIFIED",
    );
  }
  assertKnrCatalogPersistSafe(next, local);
}

/** Fetch cloud, merge with local (anti-wipe), write local cache. */
export async function loadKnrCatalogStore(): Promise<KnrCatalogStore> {
  try {
    const local = loadKnrCatalogStoreLocal();
    const [cloud] = await fetchKeysFromCloud([KNR_CATALOG_STORAGE_KEY]);
    if (cloud == null) return local;
    const merged = mergeKnrCatalogStore(local, cloud);
    saveKnrCatalogStoreLocal(merged, merged.updatedAt);
    return merged;
  } catch {
    return loadKnrCatalogStoreLocal();
  }
}

/**
 * Persist local cache + cloud when safe.
 * Does NOT create VERIFIED — caller must already have legal store (VERIFY path).
 */
export async function saveKnrCatalogStore(
  store: KnrCatalogStore,
  options: SaveKnrCatalogStoreCloudOptions = {},
): Promise<void> {
  const updatedAt = options.updatedAtIso ?? store.updatedAt;
  let next = normalizeKnrCatalogStore({ ...store, updatedAt });
  const cloud = await loadCloudKnrBaseline();
  const local = loadKnrCatalogStoreLocal();

  if (cloud.status === "present") {
    const detailed = mergeKnrCatalogStoreDetailed(next, cloud.store);
    next = detailed.store;
    // Conflicting VERIFIED hashes → do not push destructive overwrite.
    if (detailed.conflicts.length > 0 && !shouldPushKnrCatalogToCloud(next, cloud.store)) {
      saveKnrCatalogStoreLocal(next, next.updatedAt);
      return;
    }
  }

  assertKnrCatalogCloudPersistAllowed(next, local, cloud);
  saveKnrCatalogStoreLocal(next, next.updatedAt);

  if (cloud.status === "missing" || cloud.status === "present") {
    const cloudVal = cloud.status === "present" ? cloud.store : null;
    if (shouldPushKnrCatalogToCloud(next, cloudVal)) {
      await persistKey(KNR_CATALOG_STORAGE_KEY, next);
    }
  }
}

/** After Owner VERIFY local CAS — push canonical store when anti-wipe allows. */
export async function pushKnrCatalogStoreAfterVerify(
  store: KnrCatalogStore,
): Promise<{ pushed: boolean; reason?: string }> {
  try {
    const cloud = await loadCloudKnrBaseline();
    const cloudVal = cloud.status === "present" ? cloud.store : null;
    if (cloud.status === "unknown") {
      return { pushed: false, reason: "cloud_unknown" };
    }
    if (!shouldPushKnrCatalogToCloud(store, cloudVal)) {
      return { pushed: false, reason: "push_blocked_anti_wipe_or_conflict" };
    }
    if (cloud.status === "present") {
      assertKnrCatalogPersistSafe(store, cloud.store);
    }
    assertKnrCatalogPersistSafe(store, loadKnrCatalogStoreLocal());
    saveKnrCatalogStoreLocal(store, store.updatedAt);
    await persistKey(KNR_CATALOG_STORAGE_KEY, store);
    return { pushed: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { pushed: false, reason: msg };
  }
}

export const KNR_CATALOG_CLOUD_P0_IMPLEMENTED = true as const;
