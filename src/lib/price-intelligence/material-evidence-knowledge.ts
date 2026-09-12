/**
 * MATERIAL EVIDENCE KNOWLEDGE (MEK-v1) — AMED learning store.
 *
 * Stores provider / search / extraction / validation outcomes — NEVER a random price as truth.
 * In-memory SSOT for dry-run; ZERO cloud persist unless a later GO wires DATA_KEYS.
 */

export const MATERIAL_EVIDENCE_KNOWLEDGE_VERSION = "MEK-v1" as const;

export type MaterialEvidenceKnowledgeKind =
  | "PROVIDER_STATUS"
  | "SEARCH_STRATEGY"
  | "EXTRACTION_PATTERN"
  | "PRICE_BASIS"
  | "SPECIFICATION_MATCHING"
  | "PACKAGE_CONVERSION_RULE"
  | "PROVENANCE"
  | "VALIDATION_OUTCOME"
  | "EXHAUSTED_EVIDENCE_GAP";

export type MaterialEvidenceKnowledgeRecord = {
  id: string;
  kind: MaterialEvidenceKnowledgeKind;
  materialCategory: string | null;
  materialKey: string | null;
  providerId: string | null;
  sourceUrl: string | null;
  searchStrategy: string | null;
  applicability: string;
  evidenceRefs: string[];
  validationState: "UNVERIFIED" | "VALIDATED" | "REJECTED" | "STATUS_ONLY";
  provenance: string;
  freshnessIso: string;
  payload: Record<string, unknown>;
  /** Forbidden: treating a one-off shop price as universal catalog truth. */
  invent: false;
  priceAsUniversalTruth: false;
};

const BY_ID = new Map<string, MaterialEvidenceKnowledgeRecord>();

export function clearMaterialEvidenceKnowledgeForTests(): void {
  BY_ID.clear();
}

export function upsertMaterialEvidenceKnowledge(
  rec: MaterialEvidenceKnowledgeRecord,
): MaterialEvidenceKnowledgeRecord {
  if (rec.invent !== false || rec.priceAsUniversalTruth !== false) {
    throw new Error("MEK: invent / universal price truth forbidden");
  }
  BY_ID.set(rec.id, rec);
  return rec;
}

export function listMaterialEvidenceKnowledge(filter?: {
  materialCategory?: string | null;
  kind?: MaterialEvidenceKnowledgeKind;
  materialKey?: string | null;
}): MaterialEvidenceKnowledgeRecord[] {
  const cat = filter?.materialCategory != null ? String(filter.materialCategory).trim() : null;
  const key = filter?.materialKey != null ? String(filter.materialKey).trim() : null;
  const kind = filter?.kind;
  return [...BY_ID.values()].filter((r) => {
    if (kind && r.kind !== kind) return false;
    if (cat && r.materialCategory !== cat) return false;
    if (key && r.materialKey !== key) return false;
    return true;
  });
}

export function buildMaterialSearchStrategies(input: {
  materialCategory: string;
  namePl: string;
  unit: string;
  specificationLevel: string;
}): string[] {
  const name = String(input.namePl || "").trim();
  const cat = String(input.materialCategory || "").trim() || name;
  const unit = String(input.unit || "").trim();
  const out: string[] = [];
  if (name) out.push(name);
  if (cat && cat !== name) out.push(cat);
  if (name && unit) out.push(`${name} ${unit}`);
  if (input.specificationLevel === "CATEGORY_GENERIC" && name) {
    out.push(`${name} cena m2`);
  }
  // Dedup preserve order
  const seen = new Set<string>();
  return out.filter((s) => {
    const k = s.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Terminal autonomous gap — never Owner escalation. */
export function recordExhaustedEvidenceGap(input: {
  id: string;
  materialCategory: string | null;
  materialKey: string | null;
  reason: string;
  namedSystem?: string | null;
  evidenceRefs?: string[];
  payload?: Record<string, unknown>;
  nowIso?: string;
}): MaterialEvidenceKnowledgeRecord {
  return upsertMaterialEvidenceKnowledge({
    id: input.id,
    kind: "EXHAUSTED_EVIDENCE_GAP",
    materialCategory: input.materialCategory,
    materialKey: input.materialKey,
    providerId: null,
    sourceUrl: null,
    searchStrategy: null,
    applicability: input.reason,
    evidenceRefs: input.evidenceRefs || [],
    validationState: "REJECTED",
    provenance: "MEK-v1 · autonomous_exhausted_gap",
    freshnessIso: input.nowIso || new Date().toISOString(),
    payload: {
      reason: input.reason,
      namedSystem: input.namedSystem ?? null,
      ownerRuntimeDependency: 0,
      ...(input.payload || {}),
    },
    invent: false,
    priceAsUniversalTruth: false,
  });
}

export function findExhaustedEvidenceGap(filter: {
  materialKey?: string | null;
  namedSystem?: string | null;
  reason?: string | null;
}): MaterialEvidenceKnowledgeRecord | null {
  const key = filter.materialKey != null ? String(filter.materialKey).trim() : null;
  const ns = filter.namedSystem != null
    ? String(filter.namedSystem).toLowerCase().trim()
    : null;
  const reason = filter.reason != null ? String(filter.reason).trim() : null;
  return (
    [...BY_ID.values()].find((r) => {
      if (r.kind !== "EXHAUSTED_EVIDENCE_GAP") return false;
      if (key && r.materialKey !== key) return false;
      if (reason && r.applicability !== reason) return false;
      if (ns) {
        const payloadNs = String((r.payload as { namedSystem?: string })?.namedSystem || "")
          .toLowerCase()
          .trim();
        if (payloadNs !== ns) return false;
      }
      return true;
    }) ?? null
  );
}
