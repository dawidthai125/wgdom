/**
 * Durable labor-source discovery store (DISCOVERED + promoted routes).
 */

import {
  assertDiscoveryUrlSafe,
  isDiscoveryContentTypeAllowed,
} from "@/lib/labor-source-discovery/ssrf";
import {
  LABOR_SOURCE_DISCOVERY_SCHEMA_VERSION,
  LABOR_SOURCE_DISCOVERY_STORAGE_KEY,
  type DiscoveredSourceProvenance,
  type DiscoveredSourceRecord,
  type LaborSourceDiscoveryStore,
  type PromotedTrustedEvidenceRoute,
} from "@/lib/labor-source-discovery/types";

function simpleEtag(store: Pick<LaborSourceDiscoveryStore, "discoveries" | "promotedRoutes">): string {
  const ids = [
    ...store.discoveries.map((d) => `${d.discoveryId}:${d.status}`),
    ...store.promotedRoutes.map((r) => r.sourceId),
  ]
    .sort()
    .join("|");
  let h = 2166136261;
  for (let i = 0; i < ids.length; i++) {
    h ^= ids.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `lsd:${(h >>> 0).toString(16)}:${store.discoveries.length}:${store.promotedRoutes.length}`;
}

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}:${crypto.randomUUID()}`;
  }
  return `${prefix}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyLaborSourceDiscoveryStore(
  nowIso = new Date().toISOString(),
): LaborSourceDiscoveryStore {
  return {
    schemaVersion: LABOR_SOURCE_DISCOVERY_SCHEMA_VERSION,
    etag: simpleEtag({ discoveries: [], promotedRoutes: [] }),
    updatedAt: nowIso,
    discoveries: [],
    promotedRoutes: [],
  };
}

export function normalizeLaborSourceDiscoveryStore(raw: unknown): LaborSourceDiscoveryStore {
  if (!raw || typeof raw !== "object") return emptyLaborSourceDiscoveryStore();
  const r = raw as Partial<LaborSourceDiscoveryStore>;
  const discoveries = Array.isArray(r.discoveries)
    ? r.discoveries.filter(
        (d): d is DiscoveredSourceRecord =>
          !!d
          && typeof d === "object"
          && typeof (d as DiscoveredSourceRecord).discoveryId === "string"
          && typeof (d as DiscoveredSourceRecord).url === "string",
      )
    : [];
  const promotedRoutes = Array.isArray(r.promotedRoutes)
    ? r.promotedRoutes.filter(
        (p): p is PromotedTrustedEvidenceRoute =>
          !!p
          && typeof p === "object"
          && typeof (p as PromotedTrustedEvidenceRoute).sourceId === "string"
          && typeof (p as PromotedTrustedEvidenceRoute).url === "string"
          && (p as PromotedTrustedEvidenceRoute).laborOnly === true,
      )
    : [];
  return {
    schemaVersion: LABOR_SOURCE_DISCOVERY_SCHEMA_VERSION,
    etag: typeof r.etag === "string" && r.etag.trim() ? r.etag : simpleEtag({ discoveries, promotedRoutes }),
    updatedAt:
      typeof r.updatedAt === "string" && r.updatedAt.trim()
        ? r.updatedAt
        : new Date().toISOString(),
    discoveries,
    promotedRoutes,
  };
}

let memoryStore: LaborSourceDiscoveryStore | null = null;

export function loadLaborSourceDiscoveryStoreLocal(): LaborSourceDiscoveryStore {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(LABOR_SOURCE_DISCOVERY_STORAGE_KEY);
      if (raw) {
        const fromLs = normalizeLaborSourceDiscoveryStore(JSON.parse(raw));
        memoryStore = fromLs;
        return fromLs;
      }
    }
  } catch {
    /* fall through */
  }
  return memoryStore
    ? normalizeLaborSourceDiscoveryStore(memoryStore)
    : emptyLaborSourceDiscoveryStore();
}

export function saveLaborSourceDiscoveryStoreLocal(store: LaborSourceDiscoveryStore): void {
  const next = normalizeLaborSourceDiscoveryStore(store);
  const cur = loadLaborSourceDiscoveryStoreLocal();
  if (
    next.discoveries.length === 0
    && next.promotedRoutes.length === 0
    && (cur.discoveries.length > 0 || cur.promotedRoutes.length > 0)
  ) {
    throw new Error("labor-source-discovery: refusing empty write over non-empty store");
  }
  const withEtag: LaborSourceDiscoveryStore = {
    ...next,
    etag: simpleEtag(next),
    updatedAt: next.updatedAt || new Date().toISOString(),
  };
  memoryStore = withEtag;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LABOR_SOURCE_DISCOVERY_STORAGE_KEY, JSON.stringify(withEtag));
    }
  } catch {
    /* memory-only */
  }
  void pushDiscoveryStoreToCloudSafe(withEtag);
}

export function clearLaborSourceDiscoveryStoreForTests(): void {
  memoryStore = null;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(LABOR_SOURCE_DISCOVERY_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function mergeLaborSourceDiscoveryStore(
  local: unknown,
  cloud: unknown,
): LaborSourceDiscoveryStore {
  const a = normalizeLaborSourceDiscoveryStore(local);
  const b = normalizeLaborSourceDiscoveryStore(cloud);
  const aN = a.discoveries.length + a.promotedRoutes.length;
  const bN = b.discoveries.length + b.promotedRoutes.length;
  if (aN > 0 && bN === 0) return a;
  if (aN === 0 && bN > 0) return b;

  const disc = new Map<string, DiscoveredSourceRecord>();
  for (const d of [...a.discoveries, ...b.discoveries]) {
    const prev = disc.get(d.discoveryId);
    if (!prev || (Date.parse(d.observedAt) || 0) >= (Date.parse(prev.observedAt) || 0)) {
      disc.set(d.discoveryId, d);
    }
  }
  const promo = new Map<string, PromotedTrustedEvidenceRoute>();
  for (const p of [...a.promotedRoutes, ...b.promotedRoutes]) {
    const prev = promo.get(p.sourceId);
    if (!prev || (Date.parse(p.promotedAt) || 0) >= (Date.parse(prev.promotedAt) || 0)) {
      promo.set(p.sourceId, p);
    }
  }
  const discoveries = [...disc.values()].sort((x, y) =>
    x.discoveryId.localeCompare(y.discoveryId),
  );
  const promotedRoutes = [...promo.values()].sort((x, y) =>
    x.sourceId.localeCompare(y.sourceId),
  );
  const ta = Date.parse(a.updatedAt) || 0;
  const tb = Date.parse(b.updatedAt) || 0;
  return {
    schemaVersion: LABOR_SOURCE_DISCOVERY_SCHEMA_VERSION,
    etag: simpleEtag({ discoveries, promotedRoutes }),
    updatedAt: new Date(Math.max(ta, tb) || Date.now()).toISOString(),
    discoveries,
    promotedRoutes,
  };
}

export function mergeLaborSourceDiscoveryDataKey(local: unknown, cloud: unknown): unknown {
  return mergeLaborSourceDiscoveryStore(local, cloud);
}

async function pushDiscoveryStoreToCloudSafe(store: LaborSourceDiscoveryStore): Promise<void> {
  try {
    const { persistKey, isSupabaseConfigured } = await import("@/lib/cloud-sync");
    if (!isSupabaseConfigured()) return;
    await persistKey(LABOR_SOURCE_DISCOVERY_STORAGE_KEY, store);
  } catch {
    /* offline / test */
  }
}

/**
 * Enqueue explicit candidate URL (Owner/ops/ChatGPT). Status=DISCOVERED only — not Evidence.
 */
export function enqueueDiscoveredSource(input: {
  url: string;
  provenance: DiscoveredSourceProvenance;
  observedAt?: string;
  contentType?: string | null;
  qualityScore?: number;
}):
  | { ok: true; record: DiscoveredSourceRecord; store: LaborSourceDiscoveryStore }
  | { ok: false; reasonPl: string } {
  const safe = assertDiscoveryUrlSafe(input.url);
  if (!safe.ok) return { ok: false, reasonPl: safe.reasonPl };
  const now = input.observedAt || new Date().toISOString();
  const store = loadLaborSourceDiscoveryStoreLocal();
  const existing = store.discoveries.find((d) => d.url === safe.normalized);
  if (existing) {
    return { ok: true, record: existing, store };
  }
  const record: DiscoveredSourceRecord = {
    discoveryId: newId("disc"),
    host: safe.host,
    url: safe.normalized,
    status: "DISCOVERED",
    provenance: input.provenance,
    observedAt: now,
    contentType: input.contentType ?? null,
    qualityScore:
      typeof input.qualityScore === "number" && Number.isFinite(input.qualityScore)
        ? Math.max(0, Math.min(1, input.qualityScore))
        : 0.3,
  };
  const next: LaborSourceDiscoveryStore = {
    ...store,
    updatedAt: now,
    discoveries: [...store.discoveries, record],
  };
  saveLaborSourceDiscoveryStoreLocal(next);
  return { ok: true, record, store: loadLaborSourceDiscoveryStoreLocal() };
}

/** Mark DISCOVERED → FETCH_VALIDATED when content-type allowlisted (no Evidence write). */
export function markDiscoveredFetchValidated(input: {
  discoveryId: string;
  contentType: string;
  qualityScore?: number;
  nowIso?: string;
}):
  | { ok: true; record: DiscoveredSourceRecord }
  | { ok: false; reasonPl: string } {
  if (!isDiscoveryContentTypeAllowed(input.contentType)) {
    return { ok: false, reasonPl: "Content-Type poza allowlistą discovery." };
  }
  const store = loadLaborSourceDiscoveryStoreLocal();
  const idx = store.discoveries.findIndex((d) => d.discoveryId === input.discoveryId);
  if (idx < 0) return { ok: false, reasonPl: "Brak discoveryId." };
  const cur = store.discoveries[idx]!;
  if (cur.status === "REJECTED" || cur.status === "PROMOTED") {
    return { ok: false, reasonPl: `Status ${cur.status} — nie waliduję ponownie.` };
  }
  const now = input.nowIso || new Date().toISOString();
  const nextRec: DiscoveredSourceRecord = {
    ...cur,
    status: "FETCH_VALIDATED",
    contentType: String(input.contentType).split(";")[0]!.trim().toLowerCase(),
    qualityScore:
      typeof input.qualityScore === "number" ? input.qualityScore : Math.max(cur.qualityScore, 0.5),
  };
  const discoveries = store.discoveries.slice();
  discoveries[idx] = nextRec;
  saveLaborSourceDiscoveryStoreLocal({ ...store, updatedAt: now, discoveries });
  return { ok: true, record: nextRec };
}

/**
 * Extract https links from already-trusted KEEP-5 HTML — enqueue as DISCOVERED.
 * Does NOT promote · does NOT Evidence upsert.
 */
export function enqueueLinksFromTrustedKeep5Html(input: {
  html: string;
  parentTrustedUrl: string;
  actor?: string;
  maxLinks?: number;
}): { enqueued: DiscoveredSourceRecord[]; skipped: number } {
  const max = Math.min(input.maxLinks ?? 20, 50);
  const re = /https:\/\/[^\s"'<>]+/gi;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(input.html || "")) && found.size < max * 2) {
    found.add(m[0].replace(/[),.]+$/, ""));
  }
  const enqueued: DiscoveredSourceRecord[] = [];
  let skipped = 0;
  for (const url of found) {
    if (enqueued.length >= max) break;
    const r = enqueueDiscoveredSource({
      url,
      provenance: {
        enqueuedBy: "KEEP5_LINK_EXTRACT",
        parentTrustedUrl: input.parentTrustedUrl,
        actor: input.actor ?? null,
        notePl: "Extracted from trusted KEEP-5 HTML (DISCOVERED ≠ TRUSTED).",
      },
      qualityScore: 0.25,
    });
    if (r.ok) enqueued.push(r.record);
    else skipped += 1;
  }
  return { enqueued, skipped };
}

export function listPromotedTrustedEvidenceRoutes(): PromotedTrustedEvidenceRoute[] {
  return loadLaborSourceDiscoveryStoreLocal().promotedRoutes.slice();
}

export function resolvePromotedTrustedEvidenceRouteByUrl(
  urlStr: string,
): PromotedTrustedEvidenceRoute | null {
  const safe = assertDiscoveryUrlSafe(urlStr);
  if (!safe.ok) return null;
  return (
    loadLaborSourceDiscoveryStoreLocal().promotedRoutes.find((r) => {
      const n = assertDiscoveryUrlSafe(r.url);
      return n.ok && n.normalized === safe.normalized;
    }) ?? null
  );
}

export function resolvePromotedTrustedEvidenceRoute(
  sourceId: string,
): PromotedTrustedEvidenceRoute | null {
  const id = String(sourceId || "").trim();
  if (!id) return null;
  return (
    loadLaborSourceDiscoveryStoreLocal().promotedRoutes.find((r) => r.sourceId === id) ?? null
  );
}

export function isPromotedTrustedEvidenceSourceId(sourceId: string): boolean {
  return resolvePromotedTrustedEvidenceRoute(sourceId) != null;
}
