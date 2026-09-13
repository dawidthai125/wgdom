/**
 * Material source evidence store — CAS-ish upsert + cloud merge.
 */

import type { MaterialEvidenceKnowledgeRecord } from "@/lib/price-intelligence/material-evidence-knowledge";
import {
  MATERIAL_SOURCE_EVIDENCE_SCHEMA_VERSION,
  MATERIAL_SOURCE_EVIDENCE_STORAGE_KEY,
  type MaterialSourceEvidenceObservation,
  type MaterialSourceEvidenceStore,
} from "@/lib/material-source-evidence/types";

function simpleEtag(obs: MaterialSourceEvidenceObservation[]): string {
  const ids = obs.map((o) => `${o.evidenceId}:${o.validationState}`).sort().join("|");
  let h = 2166136261;
  for (let i = 0; i < ids.length; i++) {
    h ^= ids.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `mse:${(h >>> 0).toString(16)}:${obs.length}`;
}

export function emptyMaterialSourceEvidenceStore(
  nowIso = new Date().toISOString(),
): MaterialSourceEvidenceStore {
  return {
    schemaVersion: MATERIAL_SOURCE_EVIDENCE_SCHEMA_VERSION,
    etag: simpleEtag([]),
    updatedAt: nowIso,
    observations: [],
  };
}

export function normalizeMaterialSourceEvidenceStore(raw: unknown): MaterialSourceEvidenceStore {
  if (!raw || typeof raw !== "object") return emptyMaterialSourceEvidenceStore();
  const r = raw as Partial<MaterialSourceEvidenceStore>;
  const observations = Array.isArray(r.observations)
    ? r.observations.filter(
        (o): o is MaterialSourceEvidenceObservation =>
          !!o
          && typeof o === "object"
          && typeof (o as MaterialSourceEvidenceObservation).evidenceId === "string"
          && (o as MaterialSourceEvidenceObservation).invent === false
          && (o as MaterialSourceEvidenceObservation).priceAsUniversalTruth === false,
      )
    : [];
  return {
    schemaVersion: MATERIAL_SOURCE_EVIDENCE_SCHEMA_VERSION,
    etag: typeof r.etag === "string" && r.etag.trim() ? r.etag : simpleEtag(observations),
    updatedAt:
      typeof r.updatedAt === "string" && r.updatedAt.trim()
        ? r.updatedAt
        : new Date().toISOString(),
    observations,
  };
}

let memoryStore: MaterialSourceEvidenceStore | null = null;

export function loadMaterialSourceEvidenceStoreLocal(): MaterialSourceEvidenceStore {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(MATERIAL_SOURCE_EVIDENCE_STORAGE_KEY);
      if (raw) {
        const fromLs = normalizeMaterialSourceEvidenceStore(JSON.parse(raw));
        memoryStore = fromLs;
        return fromLs;
      }
    }
  } catch {
    /* fall through */
  }
  return memoryStore
    ? normalizeMaterialSourceEvidenceStore(memoryStore)
    : emptyMaterialSourceEvidenceStore();
}

export function saveMaterialSourceEvidenceStoreLocal(store: MaterialSourceEvidenceStore): void {
  const next = normalizeMaterialSourceEvidenceStore(store);
  const cur = loadMaterialSourceEvidenceStoreLocal();
  if (next.observations.length === 0 && cur.observations.length > 0) {
    throw new Error("material-source-evidence: refusing empty write over non-empty store");
  }
  const withEtag: MaterialSourceEvidenceStore = {
    ...next,
    etag: simpleEtag(next.observations),
    updatedAt: next.updatedAt || new Date().toISOString(),
  };
  memoryStore = withEtag;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(MATERIAL_SOURCE_EVIDENCE_STORAGE_KEY, JSON.stringify(withEtag));
    }
  } catch {
    /* memory-only */
  }
  void pushMaterialEvidenceToCloudSafe(withEtag);
}

export function clearMaterialSourceEvidenceStoreForTests(): void {
  memoryStore = null;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(MATERIAL_SOURCE_EVIDENCE_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function mergeMaterialSourceEvidenceStore(
  local: unknown,
  cloud: unknown,
): MaterialSourceEvidenceStore {
  const a = normalizeMaterialSourceEvidenceStore(local);
  const b = normalizeMaterialSourceEvidenceStore(cloud);
  if (a.observations.length > 0 && b.observations.length === 0) return a;
  if (a.observations.length === 0 && b.observations.length > 0) return b;
  const map = new Map<string, MaterialSourceEvidenceObservation>();
  for (const o of [...a.observations, ...b.observations]) {
    const prev = map.get(o.evidenceId);
    if (!prev || (Date.parse(o.observedAt) || 0) >= (Date.parse(prev.observedAt) || 0)) {
      map.set(o.evidenceId, o);
    }
  }
  const observations = [...map.values()].sort((x, y) =>
    x.evidenceId.localeCompare(y.evidenceId),
  );
  const ta = Date.parse(a.updatedAt) || 0;
  const tb = Date.parse(b.updatedAt) || 0;
  return {
    schemaVersion: MATERIAL_SOURCE_EVIDENCE_SCHEMA_VERSION,
    etag: simpleEtag(observations),
    updatedAt: new Date(Math.max(ta, tb) || Date.now()).toISOString(),
    observations,
  };
}

export function mergeMaterialSourceEvidenceDataKey(local: unknown, cloud: unknown): unknown {
  return mergeMaterialSourceEvidenceStore(local, cloud);
}

async function pushMaterialEvidenceToCloudSafe(store: MaterialSourceEvidenceStore): Promise<void> {
  try {
    const { persistKey, isSupabaseConfigured } = await import("@/lib/cloud-sync");
    if (!isSupabaseConfigured()) return;
    await persistKey(MATERIAL_SOURCE_EVIDENCE_STORAGE_KEY, store);
  } catch {
    /* offline / test */
  }
}

export function observationFromMekRecord(
  rec: MaterialEvidenceKnowledgeRecord,
): MaterialSourceEvidenceObservation {
  return {
    evidenceId: rec.id,
    materialKey: rec.materialKey,
    materialCategory: rec.materialCategory,
    kind: rec.kind,
    providerId: rec.providerId,
    sourceUrl: rec.sourceUrl,
    validationState: rec.validationState,
    provenance: rec.provenance,
    observedAt: rec.freshnessIso,
    payload: { ...rec.payload },
    invent: false,
    priceAsUniversalTruth: false,
  };
}

/** CAS upsert by evidenceId — returns next store. */
export function upsertMaterialSourceEvidenceObservation(
  obs: MaterialSourceEvidenceObservation,
  nowIso = new Date().toISOString(),
): MaterialSourceEvidenceStore {
  if (obs.invent !== false || obs.priceAsUniversalTruth !== false) {
    throw new Error("material-source-evidence: invent forbidden");
  }
  const cur = loadMaterialSourceEvidenceStoreLocal();
  const idx = cur.observations.findIndex((o) => o.evidenceId === obs.evidenceId);
  const observations = cur.observations.slice();
  if (idx >= 0) observations[idx] = obs;
  else observations.push(obs);
  const next: MaterialSourceEvidenceStore = {
    schemaVersion: MATERIAL_SOURCE_EVIDENCE_SCHEMA_VERSION,
    etag: simpleEtag(observations),
    updatedAt: nowIso,
    observations,
  };
  saveMaterialSourceEvidenceStoreLocal(next);
  return loadMaterialSourceEvidenceStoreLocal();
}

/** Hydrate in-memory MEK from durable store (cold start). */
export function listDurableMaterialSourceEvidence(filter?: {
  materialKey?: string | null;
  kind?: string;
}): MaterialSourceEvidenceObservation[] {
  const key = filter?.materialKey != null ? String(filter.materialKey).trim() : null;
  const kind = filter?.kind;
  return loadMaterialSourceEvidenceStoreLocal().observations.filter((o) => {
    if (kind && o.kind !== kind) return false;
    if (key && o.materialKey !== key) return false;
    return true;
  });
}
