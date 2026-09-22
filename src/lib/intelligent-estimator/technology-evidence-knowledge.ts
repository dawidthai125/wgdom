/**
 * Technology evidence Knowledge (learning) — ATESD / ATSS.
 *
 * Stores reusable SOURCE / RELATION / SEARCH STRATEGY evidence — never unverified recipes as canonical.
 * GO-AUTO-IDENTITY-01: durable LS sidecar (kw-technology-evidence-knowledge) for cross-tender reuse.
 * In-memory mirror for dry-run; cloud via DATA_KEYS when configured.
 */

export const TECHNOLOGY_EVIDENCE_KNOWLEDGE_VERSION = "TEK-v1" as const;
export const TECHNOLOGY_EVIDENCE_KNOWLEDGE_STORAGE_KEY =
  "kw-technology-evidence-knowledge" as const;
export const TECHNOLOGY_EVIDENCE_KNOWLEDGE_SCHEMA_VERSION = 1 as const;

export type TechnologyEvidenceKnowledgeKind =
  | "SOURCE"
  | "TECHNOLOGY_RELATION"
  | "SEARCH_STRATEGY"
  | "VALIDATED_CANDIDATE_REF"
  | "PROVIDER_STATUS";

export type TechnologyEvidenceKnowledgeRecord = {
  id: string;
  kind: TechnologyEvidenceKnowledgeKind;
  workId: string | null;
  technologyIdentity: string | null;
  sourceUrl: string | null;
  sourceId: string | null;
  applicability: string;
  evidenceRefs: string[];
  validationState: "UNVERIFIED" | "VALIDATED" | "REJECTED" | "STATUS_ONLY";
  provenance: string;
  freshnessIso: string;
  searchStrategy: string | null;
  payload: Record<string, unknown>;
  invent: false;
};

export type TechnologyEvidenceKnowledgeStore = {
  schemaVersion: typeof TECHNOLOGY_EVIDENCE_KNOWLEDGE_SCHEMA_VERSION;
  records: TechnologyEvidenceKnowledgeRecord[];
  updatedAt: string;
};

const BY_ID = new Map<string, TechnologyEvidenceKnowledgeRecord>();
let hydrated = false;

function hydrateFromDurableIfNeeded(): void {
  if (hydrated) return;
  hydrated = true;
  try {
    if (typeof localStorage === "undefined") return;
    const raw = localStorage.getItem(TECHNOLOGY_EVIDENCE_KNOWLEDGE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<TechnologyEvidenceKnowledgeStore>;
    if (!Array.isArray(parsed.records)) return;
    for (const rec of parsed.records) {
      if (!rec || typeof rec !== "object" || rec.invent !== false) continue;
      if (!String(rec.id || "").trim()) continue;
      BY_ID.set(String(rec.id), rec as TechnologyEvidenceKnowledgeRecord);
    }
  } catch {
    /* ignore corrupt */
  }
}

function persistDurableMirror(): void {
  try {
    if (typeof localStorage === "undefined") return;
    const store: TechnologyEvidenceKnowledgeStore = {
      schemaVersion: TECHNOLOGY_EVIDENCE_KNOWLEDGE_SCHEMA_VERSION,
      records: [...BY_ID.values()],
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(
      TECHNOLOGY_EVIDENCE_KNOWLEDGE_STORAGE_KEY,
      JSON.stringify(store),
    );
    void pushTekStoreToCloudSafe(store);
  } catch {
    /* quota / test */
  }
}

async function pushTekStoreToCloudSafe(
  store: TechnologyEvidenceKnowledgeStore,
): Promise<void> {
  try {
    const { persistKey, isSupabaseConfigured } = await import("@/lib/cloud-sync");
    if (!isSupabaseConfigured()) return;
    await persistKey(TECHNOLOGY_EVIDENCE_KNOWLEDGE_STORAGE_KEY, store);
  } catch {
    /* offline */
  }
}

export function clearTechnologyEvidenceKnowledgeForTests(): void {
  BY_ID.clear();
  hydrated = true;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(TECHNOLOGY_EVIDENCE_KNOWLEDGE_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function emptyTechnologyEvidenceKnowledgeStore(
  nowIso = new Date().toISOString(),
): TechnologyEvidenceKnowledgeStore {
  return {
    schemaVersion: TECHNOLOGY_EVIDENCE_KNOWLEDGE_SCHEMA_VERSION,
    records: [],
    updatedAt: nowIso,
  };
}

export function normalizeTechnologyEvidenceKnowledgeStore(
  raw: unknown,
): TechnologyEvidenceKnowledgeStore {
  if (!raw || typeof raw !== "object") return emptyTechnologyEvidenceKnowledgeStore();
  const r = raw as Partial<TechnologyEvidenceKnowledgeStore>;
  const records: TechnologyEvidenceKnowledgeRecord[] = [];
  if (Array.isArray(r.records)) {
    for (const rec of r.records) {
      if (!rec || typeof rec !== "object" || (rec as { invent?: unknown }).invent !== false) {
        continue;
      }
      const id = String((rec as TechnologyEvidenceKnowledgeRecord).id || "").trim();
      if (!id) continue;
      records.push(rec as TechnologyEvidenceKnowledgeRecord);
    }
  }
  return {
    schemaVersion: TECHNOLOGY_EVIDENCE_KNOWLEDGE_SCHEMA_VERSION,
    records,
    updatedAt: String(r.updatedAt || "") || new Date().toISOString(),
  };
}

export function mergeTechnologyEvidenceKnowledgeStore(
  local: unknown,
  cloud: unknown,
): TechnologyEvidenceKnowledgeStore {
  const a = normalizeTechnologyEvidenceKnowledgeStore(local);
  const b = normalizeTechnologyEvidenceKnowledgeStore(cloud);
  if (a.records.length > 0 && b.records.length === 0) return a;
  if (a.records.length === 0 && b.records.length > 0) return b;
  const map = new Map<string, TechnologyEvidenceKnowledgeRecord>();
  for (const rec of [...a.records, ...b.records]) {
    const prev = map.get(rec.id);
    if (!prev || rec.freshnessIso > prev.freshnessIso) map.set(rec.id, rec);
  }
  return {
    schemaVersion: TECHNOLOGY_EVIDENCE_KNOWLEDGE_SCHEMA_VERSION,
    records: [...map.values()],
    updatedAt: a.updatedAt > b.updatedAt ? a.updatedAt : b.updatedAt,
  };
}

export function loadTechnologyEvidenceKnowledgeStoreLocal(): TechnologyEvidenceKnowledgeStore {
  hydrateFromDurableIfNeeded();
  return {
    schemaVersion: TECHNOLOGY_EVIDENCE_KNOWLEDGE_SCHEMA_VERSION,
    records: [...BY_ID.values()],
    updatedAt: new Date().toISOString(),
  };
}

export function saveTechnologyEvidenceKnowledgeStoreLocal(
  store: TechnologyEvidenceKnowledgeStore,
): void {
  const n = normalizeTechnologyEvidenceKnowledgeStore(store);
  BY_ID.clear();
  for (const rec of n.records) BY_ID.set(rec.id, rec);
  hydrated = true;
  persistDurableMirror();
}

export function upsertTechnologyEvidenceKnowledge(
  rec: TechnologyEvidenceKnowledgeRecord,
): TechnologyEvidenceKnowledgeRecord {
  hydrateFromDurableIfNeeded();
  if (rec.invent !== false) {
    throw new Error("TEK: invent forbidden");
  }
  if (rec.validationState === "UNVERIFIED" && rec.kind === "VALIDATED_CANDIDATE_REF") {
    throw new Error("TEK: cannot store unverified recipe as VALIDATED_CANDIDATE_REF");
  }
  BY_ID.set(rec.id, rec);
  persistDurableMirror();
  return rec;
}

export function listTechnologyEvidenceKnowledge(filter?: {
  workId?: string | null;
  kind?: TechnologyEvidenceKnowledgeKind;
}): TechnologyEvidenceKnowledgeRecord[] {
  hydrateFromDurableIfNeeded();
  const wid = filter?.workId != null ? String(filter.workId).trim() : null;
  const kind = filter?.kind;
  return [...BY_ID.values()].filter((r) => {
    if (kind && r.kind !== kind) return false;
    if (wid && r.workId !== wid) return false;
    return true;
  });
}

export function listValidatedTechnologyEvidenceForWork(
  workId: string,
): TechnologyEvidenceKnowledgeRecord[] {
  const id = String(workId || "").trim();
  if (!id) return [];
  return listTechnologyEvidenceKnowledge({ workId: id }).filter(
    (r) =>
      r.validationState === "VALIDATED"
      && (r.kind === "TECHNOLOGY_RELATION" || r.kind === "VALIDATED_CANDIDATE_REF"),
  );
}

export function buildTechnologySearchStrategies(input: {
  workId: string;
  description: string;
  unit: string;
  knrFamily?: string | null;
  knrCode?: string | null;
}): string[] {
  const desc = String(input.description || "").trim();
  const unit = String(input.unit || "").trim();
  const family = String(input.knrFamily || "").trim();
  const code = String(input.knrCode || "").trim();
  const tokens = desc
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4)
    .slice(0, 8);

  const out: string[] = [];
  if (family && code) {
    out.push(`${family} ${code} technologia wykonania`);
    out.push(`${family} ${code} nakłady materiały`);
    out.push(`${family} ${code} R M S`);
  }
  if (code) {
    out.push(`${code} materiały zużycie norma`);
    out.push(`${code} nakłady`);
    out.push(`${code} kosztorys nakładczy`);
    out.push(`${code} STWiORB`);
    out.push(`${code} specyfikacja techniczna`);
  }
  if (desc) {
    out.push(`${desc} ${unit} technologia wykonania materiały`);
    out.push(`${desc} nakłady zużycie`);
  }
  if (tokens.length) {
    out.push(`${tokens.join(" ")} przedmiar kosztorys zużycie`);
    out.push(`${tokens.slice(0, 4).join(" ")} norma materiałowa ${unit}`);
    out.push(`${tokens.slice(0, 3).join(" ")} STWiORB technologia`);
  }
  out.push(`${input.workId} technology BOM`);
  for (const rec of listTechnologyEvidenceKnowledge({ kind: "SEARCH_STRATEGY" })) {
    const s = String(rec.searchStrategy || rec.payload.query || "").trim();
    if (s) out.push(s);
  }
  return [...new Set(out.filter(Boolean))];
}
