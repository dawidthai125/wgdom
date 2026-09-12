/**
 * Technology evidence Knowledge (learning) — ATESD / ATSS.
 *
 * Stores reusable SOURCE / RELATION / SEARCH STRATEGY evidence — never unverified recipes as canonical.
 * In-memory SSOT for dry-run; ZERO cloud persist unless a later GO wires DATA_KEYS.
 */

export const TECHNOLOGY_EVIDENCE_KNOWLEDGE_VERSION = "TEK-v1" as const;

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

const BY_ID = new Map<string, TechnologyEvidenceKnowledgeRecord>();

export function clearTechnologyEvidenceKnowledgeForTests(): void {
  BY_ID.clear();
}

export function upsertTechnologyEvidenceKnowledge(
  rec: TechnologyEvidenceKnowledgeRecord,
): TechnologyEvidenceKnowledgeRecord {
  if (rec.invent !== false) {
    throw new Error("TEK: invent forbidden");
  }
  if (rec.validationState === "UNVERIFIED" && rec.kind === "VALIDATED_CANDIDATE_REF") {
    throw new Error("TEK: cannot store unverified recipe as VALIDATED_CANDIDATE_REF");
  }
  BY_ID.set(rec.id, rec);
  return rec;
}

export function listTechnologyEvidenceKnowledge(filter?: {
  workId?: string | null;
  kind?: TechnologyEvidenceKnowledgeKind;
}): TechnologyEvidenceKnowledgeRecord[] {
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
  // Learned strategies from knowledge
  for (const rec of listTechnologyEvidenceKnowledge({ kind: "SEARCH_STRATEGY" })) {
    const s = String(rec.searchStrategy || rec.payload.query || "").trim();
    if (s) out.push(s);
  }
  return [...new Set(out.filter(Boolean))];
}
