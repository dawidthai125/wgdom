/**
 * WORK-CATALOG-P0 — single safe cloud write boundary (fetch → merge → validate → CAS push).
 */

import { APP_VERSION } from "@/lib/app-version";
import {
  fetchKeysFromCloud,
  isSupabaseConfigured,
  type PushKeysToCloudOptions,
} from "@/lib/cloud-sync";
import {
  assertWorkCatalogShrinkAllowed,
  countCatalogWorks,
  WorkCatalogShrinkRejectedError,
} from "@/lib/work-catalog/work-catalog-authority";
import { unionMergeWorkCatalogStore } from "@/lib/work-catalog/work-catalog-merge-safety";
import {
  buildWorkCatalogMetaPlaceholder,
  getExpectedWorkCatalogRevision,
  normalizeWorkCatalogMeta,
  readWorkCatalogMetaFromLs,
  WORK_CATALOG_META_KEY,
  writeWorkCatalogMetaToLs,
  type WorkCatalogMeta,
} from "@/lib/work-catalog/work-catalog-meta";
import { fingerprintWorkCatalogStore } from "@/lib/work-catalog/rollback-market-quotes";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import {
  normalizeWorkCatalogStore,
  saveWorkCatalogStoreLocal,
  WORK_CATALOG_STORAGE_KEY,
} from "@/lib/work-catalog/work-catalog-store";

export const WORK_CATALOG_STALE_REVISION_CODE = "catalog_stale_revision";
export const WORK_CATALOG_LEGACY_CLIENT_CODE = "catalog_legacy_client_rejected";
export const WORK_CATALOG_SHRINK_REJECTED_CODE = "catalog_shrink_rejected";

export type WorkCatalogCloudPushMode = "union" | "intent";

export class WorkCatalogStaleRevisionError extends Error {
  readonly code: string;
  readonly serverRevision: number;
  readonly serverCatalog: WorkCatalogStore | null;

  constructor(
    code: string,
    serverRevision: number,
    serverCatalog: WorkCatalogStore | null,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "WorkCatalogStaleRevisionError";
    this.code = code;
    this.serverRevision = serverRevision;
    this.serverCatalog = serverCatalog;
  }
}

export type WorkCatalogWriteAuditLog = {
  requestId?: string;
  timestamp: string;
  key: string;
  clientAppVersion: string;
  workCountBefore: number;
  workCountAfter: number;
  catalogRevisionBefore: number;
  catalogRevisionAfter: number;
  fingerprintBefore: string;
  fingerprintAfter: string;
  mode: WorkCatalogCloudPushMode;
  ok: boolean;
  rejectionReason?: string;
};

function emitWorkCatalogWriteAudit(entry: WorkCatalogWriteAuditLog): void {
  console.info("WORK_CATALOG_WRITE_AUDIT", entry);
}

async function pushCatalogCasToEdge(
  store: WorkCatalogStore,
  expectedRevision: number,
  options?: PushKeysToCloudOptions,
): Promise<{ ok: true; meta: WorkCatalogMeta; requestId?: string } | { ok: false; conflict: WorkCatalogStaleRevisionError }> {
  const { pushKeysToCloud } = await import("@/lib/cloud-sync");
  const metaPlaceholder = buildWorkCatalogMetaPlaceholder();
  const bodyRevision = expectedRevision;

  try {
    await pushKeysToCloud(
      [WORK_CATALOG_STORAGE_KEY, WORK_CATALOG_META_KEY],
      [store, metaPlaceholder],
      {
        ...options,
        workCatalogCas: true,
        expectedCatalogRevision: bodyRevision,
        clientAppVersion: options?.clientAppVersion ?? APP_VERSION,
        skipWorkCatalogIntercept: true,
      },
    );
    const cached = readWorkCatalogMetaFromLs() ?? normalizeWorkCatalogMeta(null);
    return { ok: true, meta: cached };
  } catch (e) {
    const { WorkCatalogStaleRevisionError: StaleErr } = await import(
      "@/lib/work-catalog/work-catalog-cloud-push"
    );
    if (e instanceof StaleErr) {
      return { ok: false, conflict: e };
    }
    throw e;
  }
}

export type PushWorkCatalogStoreToCloudSafeOptions = {
  mode?: WorkCatalogCloudPushMode;
  /** Skip when local+cloud union fingerprint unchanged. */
  skipIfUnchanged?: boolean;
  pushOptions?: PushKeysToCloudOptions;
};

/**
 * SSOT safe catalog cloud write — all production paths must use this (or saveWorkCatalogStore).
 */
export async function pushWorkCatalogStoreToCloudSafe(
  candidate: WorkCatalogStore,
  options: PushWorkCatalogStoreToCloudSafeOptions = {},
): Promise<WorkCatalogStore> {
  if (!isSupabaseConfigured()) {
    return normalizeWorkCatalogStore(candidate);
  }

  const mode = options.mode ?? "intent";
  const normalizedCandidate = normalizeWorkCatalogStore(candidate);

  let cloudRaw: unknown = null;
  let metaRaw: unknown = null;
  try {
    [cloudRaw, metaRaw] = await fetchKeysFromCloud([
      WORK_CATALOG_STORAGE_KEY,
      WORK_CATALOG_META_KEY,
    ]);
  } catch {
    /* offline — local only */
    saveWorkCatalogStoreLocal(normalizedCandidate, { updatedAtIso: normalizedCandidate.updatedAt });
    return normalizedCandidate;
  }

  const cloudStore =
    cloudRaw != null ? normalizeWorkCatalogStore(cloudRaw) : null;
  const metaBefore = normalizeWorkCatalogMeta(metaRaw);
  const fpBefore = cloudStore ? fingerprintWorkCatalogStore(cloudStore) : "";
  const countBefore = countCatalogWorks(cloudStore);

  let toWrite: WorkCatalogStore;
  if (mode === "union" && cloudStore) {
    toWrite = unionMergeWorkCatalogStore(cloudStore, normalizedCandidate);
  } else if (cloudStore) {
    assertWorkCatalogShrinkAllowed(cloudStore, normalizedCandidate);
    toWrite = normalizedCandidate;
  } else {
    toWrite = normalizedCandidate;
  }

  const fpAfter = fingerprintWorkCatalogStore(toWrite);
  const countAfter = countCatalogWorks(toWrite);

  if (options.skipIfUnchanged && cloudStore && fpBefore === fpAfter) {
    emitWorkCatalogWriteAudit({
      timestamp: new Date().toISOString(),
      key: WORK_CATALOG_STORAGE_KEY,
      clientAppVersion: APP_VERSION,
      workCountBefore: countBefore,
      workCountAfter: countAfter,
      catalogRevisionBefore: metaBefore.catalogRevision,
      catalogRevisionAfter: metaBefore.catalogRevision,
      fingerprintBefore: fpBefore,
      fingerprintAfter: fpAfter,
      mode,
      ok: true,
      rejectionReason: "skipped_unchanged",
    });
    return toWrite;
  }

  saveWorkCatalogStoreLocal(toWrite, { updatedAtIso: toWrite.updatedAt });

  let expectedRevision = getExpectedWorkCatalogRevision();
  if (metaRaw != null) {
    expectedRevision = metaBefore.catalogRevision;
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await pushCatalogCasToEdge(toWrite, expectedRevision, options.pushOptions);
    if (result.ok) {
      writeWorkCatalogMetaToLs(result.meta);
      emitWorkCatalogWriteAudit({
        timestamp: new Date().toISOString(),
        key: WORK_CATALOG_STORAGE_KEY,
        clientAppVersion: APP_VERSION,
        workCountBefore: countBefore,
        workCountAfter: countAfter,
        catalogRevisionBefore: metaBefore.catalogRevision,
        catalogRevisionAfter: result.meta.catalogRevision,
        fingerprintBefore: fpBefore,
        fingerprintAfter: fpAfter,
        mode,
        ok: true,
      });
      return toWrite;
    }

    const { conflict } = result;
    const serverCatalog = conflict.serverCatalog;
    if (serverCatalog) {
      toWrite =
        mode === "union"
          ? unionMergeWorkCatalogStore(serverCatalog, normalizedCandidate)
          : (() => {
              assertWorkCatalogShrinkAllowed(serverCatalog, normalizedCandidate);
              return normalizedCandidate;
            })();
      saveWorkCatalogStoreLocal(toWrite, { updatedAtIso: toWrite.updatedAt });
    }
    expectedRevision = conflict.serverRevision;
    writeWorkCatalogMetaToLs(
      normalizeWorkCatalogMeta({ catalogRevision: expectedRevision, updatedAt: Date.now() }),
    );
  }

  emitWorkCatalogWriteAudit({
    timestamp: new Date().toISOString(),
    key: WORK_CATALOG_STORAGE_KEY,
    clientAppVersion: APP_VERSION,
    workCountBefore: countBefore,
    workCountAfter: countAfter,
    catalogRevisionBefore: metaBefore.catalogRevision,
    catalogRevisionAfter: expectedRevision,
    fingerprintBefore: fpBefore,
    fingerprintAfter: fpAfter,
    mode,
    ok: false,
    rejectionReason: WORK_CATALOG_STALE_REVISION_CODE,
  });
  throw new WorkCatalogStaleRevisionError(
    WORK_CATALOG_STALE_REVISION_CODE,
    expectedRevision,
    cloudStore,
    "catalog CAS retry exhausted",
  );
}

/** RS / deferred bootstrap — union with cloud, push only when fingerprint changes. */
export async function pushWorkCatalogFromLocalUnionIfChanged(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { loadWorkCatalogStoreLocal } = await import("@/lib/work-catalog/work-catalog-store");
  const local = loadWorkCatalogStoreLocal();
  await pushWorkCatalogStoreToCloudSafe(local, { mode: "union", skipIfUnchanged: true });
}

export function isWorkCatalogShrinkRejectedError(e: unknown): e is WorkCatalogShrinkRejectedError {
  return e instanceof WorkCatalogShrinkRejectedError;
}
