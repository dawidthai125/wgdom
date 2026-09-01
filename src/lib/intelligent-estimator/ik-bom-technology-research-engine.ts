/**
 * IK BOM Technology Research Engine — RESEARCH LAYER above resolveTechnologyBomForWork.
 *
 * L0 tender → L1 packs (runIkBomGapResearch) → L2 normative → L3 manufacturer
 * → L4 public → L5 analog/web → VALIDATE → ephemeral / NO_EVIDENCE diagnostic.
 *
 * ZERO invent · ZERO Catalog/PM/TechnologyPack ACTIVE write · ZERO Accept/P7/G3
 * NEVER scrape commercial KNR/SEKOCENBUD without licensed provider.
 */

import {
  runIkBomGapResearch,
  type IkBomGapJob,
  type IkBomGapResearchPorts,
  type IkEphemeralBomBasis,
  type RunIkBomGapResearchResult,
} from "./ik-bom-gap-research";
import type {
  IkBomTechConfidence,
  IkBomTechEvidence,
  IkBomTechMaterialLine,
  IkBomTechNoEvidenceDetail,
  IkBomTechNormCandidate,
  IkBomTechResearchBudget,
  IkBomTechResearchStatus,
  IkBomTechnologyCandidate,
  IkBomTechSourceType,
  IkBomTechTenderClaim,
} from "./ik-bom-technology-research-types";
import {
  IK_BOM_TECH_RESEARCH_SCHEMA_VERSION,
} from "./ik-bom-technology-research-types";
import {
  nullAnalogTenderEvidenceProvider,
  nullManufacturerEvidenceProvider,
  nullNormativeCatalogProvider,
  nullPublicTechnicalEvidenceProvider,
  nullSekocenbudAdapter,
  nullWebEvidenceProvider,
  createTenderPodstawaEvidenceProvider,
  licensedNormativeCatalogProvider,
  type AnalogTenderEvidenceProvider,
  type ManufacturerEvidenceProvider,
  type NormativeCatalogProvider,
  type PublicTechnicalEvidenceProvider,
  type SekocenbudAdapter,
  type TenderDocumentsEvidenceProvider,
  type WebEvidenceProvider,
} from "./ik-bom-technology-research-providers";
import { runIkBomIdentityGate } from "./ik-bom-identity-gate";
import {
  extractIkBomPodstawaEvidence,
  normativeLookupKey,
} from "./ik-bom-podstawa-extract";
import {
  createKnrCatalogNormativeProvider,
  findPendingKnrInCatalog,
} from "./ik-knr-catalog-as-normative";
import type {
  IkBomProviderTried,
  IkBomResearchLineTrace,
} from "./ik-bom-technology-research-types";

export const DEFAULT_BOM_TECH_CONFIDENCE_THRESHOLD = 0.85;

export type RunIkBomTechnologyResearchOpts = {
  tenderId: string;
  dwellingId: string;
  lineId: string;
  offerBoqLine?: {
    description?: string;
    unit?: string;
    quantity?: number;
    lp?: string;
  } | null;
  workIdentity?: { workId?: string | null } | null;
  workId?: string;
  unit?: string;
  quantity?: number;
  description?: string;
  researchBudget?: IkBomTechResearchBudget | null;
  nowMs?: number;
  confidenceThreshold?: number;
  bomGapPorts?: IkBomGapResearchPorts | null;
  normativeCatalog?: NormativeCatalogProvider | null;
  /** SSOT kw-knr-catalog — L2 preferred when VERIFIED materials exist. */
  knrCatalogStore?: import("./knr-knowledge/knr-catalog-store").KnrCatalogStore | null;
  /**
   * Sync Public KNR Research (scraper/fixture). Runs on catalog miss /
   * IDENTITY_MISMATCH / NO_WORK_ID — stages PENDING_VERIFY, never invents BOM.
   */
  publicKnrResearchSync?: ((input: {
    rawCode?: string | null;
    description?: string;
    identityRequired?: boolean;
  }) => {
    knrEvidenceFound: boolean;
    bomComplete: boolean;
    catalogLifecycle: string;
    messagePl: string;
    telemetryWhy: string[];
    reanalyzeRequired: boolean;
  }) | null;
  tenderDocuments?: TenderDocumentsEvidenceProvider | null;
  manufacturer?: ManufacturerEvidenceProvider | null;
  publicTechnical?: PublicTechnicalEvidenceProvider | null;
  web?: WebEvidenceProvider | null;
  analogTender?: AnalogTenderEvidenceProvider | null;
  sekocenbud?: SekocenbudAdapter | null;
  knownMaterialKeys?: ReadonlySet<string> | readonly string[] | null;
};

export type RunIkBomTechnologyResearchResult = {
  status: IkBomTechResearchStatus;
  workId: string;
  technologyCandidate: IkBomTechnologyCandidate | null;
  bomCandidate: IkBomTechnologyCandidate | null;
  ephemeral: IkEphemeralBomBasis | null;
  confidence: IkBomTechConfidence | null;
  evidence: IkBomTechEvidence[];
  validation: { ok: boolean; rejects: string[] };
  writeClass: "READ" | "EPHEMERAL" | "OWNER_REQUIRED";
  invent: false;
  diagnostics: IkBomTechNoEvidenceDetail;
  levelTrace: string[];
  gapCompat: RunIkBomGapResearchResult | null;
  sekocenbudAvailable: boolean;
  messagePl: string;
  cloudWrite: false;
  catalogWrite: false;
  priceMemoryWrite: false;
  technologyPackWrite: false;
  /** Per-line observability for Auto Gap / Owner. */
  researchTrace: IkBomResearchLineTrace;
};

function foldUnit(u: string): string {
  return String(u || "")
    .trim()
    .toLowerCase()
    .replace(/²/g, "2")
    .replace(/m\^?2\b/g, "m2")
    .replace(/\s+/g, "");
}

function unitsMatch(a: string, b: string): boolean {
  const fa = foldUnit(a);
  const fb = foldUnit(b);
  return Boolean(fa && fb && fa === fb);
}

function knownKeySet(
  known: RunIkBomTechnologyResearchOpts["knownMaterialKeys"],
): Set<string> {
  if (!known) return new Set();
  if (known instanceof Set) {
    return new Set([...known].map((k) => String(k).trim()).filter(Boolean));
  }
  return new Set([...known].map((k) => String(k).trim()).filter(Boolean));
}

function emptyConfidence(): IkBomTechConfidence {
  return {
    technologyConfidence: 0,
    materialIdentityConfidence: 0,
    qtyFactorConfidence: 0,
    unitConfidence: 0,
    normativeConfidence: 0,
    finalConfidence: 0,
  };
}

function finalizeConfidence(
  parts: Omit<IkBomTechConfidence, "finalConfidence">,
): IkBomTechConfidence {
  const finalConfidence = Math.min(
    parts.technologyConfidence,
    parts.materialIdentityConfidence,
    parts.qtyFactorConfidence,
    parts.unitConfidence,
  );
  return { ...parts, finalConfidence };
}

function emptyDiagnostics(extra: string[] = []): IkBomTechNoEvidenceDetail {
  return {
    technologyMissing: true,
    noNormativeCandidate: true,
    noTenderSpecification: true,
    noManufacturerEvidence: true,
    noMaterialKey: true,
    noQtyFactorProvenance: true,
    unitMismatch: false,
    ambiguousTechnologies: false,
    identityMismatch: false,
    normativeSourceUnavailable: false,
    licenseRequired: false,
    laborOnlySuggested: false,
    reasons: [...extra],
    why: [...extra],
  };
}

function syncVal<T>(v: T | Promise<T>): T {
  if (v != null && typeof (v as Promise<T>).then === "function") {
    throw new Error("BOM Technology Research: async provider in sync path");
  }
  return v as T;
}

function validateMaterials(
  materials: IkBomTechMaterialLine[],
  known: ReadonlySet<string>,
): { ok: boolean; rejects: string[] } {
  const rejects: string[] = [];
  if (materials.length === 0) rejects.push("EMPTY_MATERIALS");
  for (const m of materials) {
    const mk = String(m.materialKey ?? "").trim();
    if (!mk) rejects.push("MISSING_MATERIAL_KEY");
    else if (known.size > 0 && !known.has(mk)) {
      rejects.push(`UNKNOWN_MATERIAL_KEY:${mk}`);
    }
    if (!String(m.unit ?? "").trim()) rejects.push(`MISSING_UNIT:${mk || "?"}`);
    if (m.qtyFactor == null || !Number.isFinite(m.qtyFactor) || m.qtyFactor < 0) {
      rejects.push(`MISSING_QTY_FACTOR:${mk || "?"}`);
    }
    const hasQtyEv = m.evidence.some(
      (e) => e.supports.includes("QTY_FACTOR") || e.supports.includes("MATERIAL"),
    );
    if (!hasQtyEv) rejects.push(`NO_QTY_EVIDENCE:${mk || "?"}`);
  }
  return { ok: rejects.length === 0, rejects };
}

function confidenceFromMaterials(
  materials: IkBomTechMaterialLine[],
  opts: { technology: number; unit: number; normative: number },
): IkBomTechConfidence {
  const keysOk = materials.length > 0 && materials.every((m) => String(m.materialKey).trim());
  const qtyOk =
    materials.length > 0
    && materials.every(
      (m) =>
        Number.isFinite(m.qtyFactor)
        && m.qtyFactor >= 0
        && m.evidence.some(
          (e) => e.supports.includes("QTY_FACTOR") || e.supports.includes("MATERIAL"),
        ),
    );
  return finalizeConfidence({
    technologyConfidence: opts.technology,
    materialIdentityConfidence: keysOk ? opts.technology : 0,
    qtyFactorConfidence: qtyOk ? opts.technology : 0,
    unitConfidence: opts.unit,
    normativeConfidence: opts.normative,
  });
}

function candidateToEphemeral(
  cand: IkBomTechnologyCandidate,
  threshold: number,
  nowIso: string,
): IkEphemeralBomBasis {
  return {
    type: "EPHEMERAL_BOM",
    candidateId: `bomtech:${cand.dwellingId}:${cand.lineId}:${cand.technologyId}`,
    workId: cand.workId,
    dwellingId: cand.dwellingId,
    lineId: cand.lineId,
    materials: cand.materials.map((m) => ({
      materialKey: m.materialKey,
      namePl: m.description,
      unit: m.unit,
      qtyFactor: m.qtyFactor,
      factorSourceKind: "norm_ref" as const,
      factorSourceRef: m.evidence[0]?.sourceRef ?? cand.technologyId,
      factorApprovedAt: nowIso,
    })),
    packId: cand.technologyId,
    packVersion: "research-1",
    namePl: cand.technologyDescription,
    definitionId: "def.bom.technology.research",
    packCapabilities: ["cap.ephemeral_bom_research"],
    attestation: {
      resolverId: "bom-research-v1",
      confidence: cand.confidence.finalConfidence,
      threshold,
      evidence: cand.evidence.map((e) => ({
        sourceKind:
          e.sourceKind === "TECHNOLOGY_PACK_APPROVED"
            ? ("TECHNOLOGY_PACK_APPROVED" as const)
            : e.sourceKind === "TECHNOLOGY_PACK_REVIEW"
              ? ("TECHNOLOGY_PACK_REVIEW" as const)
              : e.sourceKind === "TECHNOLOGY_PACK_ACTIVE"
                ? ("TECHNOLOGY_PACK_ACTIVE" as const)
                : e.sourceKind === "NORMATIVE_CATALOG"
                  ? ("NORM_STRUCTURED" as const)
                  : ("OWNER_APPROVED_HISTORICAL" as const),
        sourceRef: e.sourceRef,
        excerpt: e.excerpt,
        retrievedAt: e.retrievedAt,
      })),
      builtAt: nowIso,
      reasonPl: `BOM Technology Research · ${cand.sourceType} · conf=${cand.confidence.finalConfidence.toFixed(2)}`,
    },
    invent: false,
  };
}

function gapCompatCandidate(
  workId: string,
  dwellingId: string,
  lineId: string,
  candidate: IkBomTechnologyCandidate,
  ephemeral: IkEphemeralBomBasis,
  messagePl: string,
): Extract<RunIkBomGapResearchResult, { status: "CANDIDATE" }> {
  return {
    status: "CANDIDATE",
    candidate: {
      schemaVersion: 1,
      workId,
      packDraft: {
        packId: candidate.technologyId,
        packVersion: "research-1",
        namePl: candidate.technologyDescription,
        materials: ephemeral.materials,
        catalogWorkId: workId,
        definitionId: ephemeral.definitionId,
        packCapabilities: ephemeral.packCapabilities,
      },
      lifecycleHint: "CANDIDATE",
      confidence: candidate.confidence.finalConfidence,
      evidence: ephemeral.attestation.evidence,
      resolverId: "bom-research-v1",
      validation: candidate.validation,
      dwellingId,
      lineId,
      invent: false,
      writeClass: "EPHEMERAL",
    },
    ephemeral,
    messagePl,
  };
}

function fromL1(
  job: IkBomGapJob,
  gap: Extract<RunIkBomGapResearchResult, { status: "CANDIDATE" }>,
): IkBomTechnologyCandidate {
  const pack = gap.candidate.packDraft;
  const sk = gap.ephemeral.attestation.evidence[0]?.sourceKind;
  const sourceType: IkBomTechSourceType =
    sk === "TECHNOLOGY_PACK_APPROVED"
      ? "TECHNOLOGY_PACK_APPROVED"
      : sk === "TECHNOLOGY_PACK_REVIEW"
        ? "TECHNOLOGY_PACK_REVIEW"
        : sk === "NORM_STRUCTURED"
          ? "NORMATIVE_CATALOG"
          : "OWNER_APPROVED_HISTORICAL";
  const evidence: IkBomTechEvidence[] = gap.candidate.evidence.map((e) => ({
    sourceKind: sourceType,
    sourceRef: e.sourceRef,
    excerpt: e.excerpt,
    retrievedAt: e.retrievedAt,
    supports: ["TECHNOLOGY", "MATERIAL", "QTY_FACTOR", "UNIT"],
    authority: 0.9,
  }));
  const materials: IkBomTechMaterialLine[] = pack.materials.map((m) => ({
    materialKey: m.materialKey,
    description: m.namePl,
    unit: m.unit,
    qtyFactor: m.qtyFactor,
    role: "PRIMARY",
    evidence,
  }));
  return {
    schemaVersion: IK_BOM_TECH_RESEARCH_SCHEMA_VERSION,
    tenderId: job.tenderId,
    dwellingId: job.dwellingId,
    lineId: job.lineId,
    workId: job.workId,
    technologyId: `${pack.packId}@${pack.packVersion}`,
    technologyDescription: pack.namePl,
    sourceType,
    normativeBasis: null,
    materials,
    laborBasis: null,
    equipmentBasis: null,
    confidence: finalizeConfidence({
      technologyConfidence: gap.candidate.confidence,
      materialIdentityConfidence: gap.candidate.confidence,
      qtyFactorConfidence: gap.candidate.confidence,
      unitConfidence: 1,
      normativeConfidence: sourceType === "NORMATIVE_CATALOG" ? gap.candidate.confidence : 0.5,
    }),
    validation: gap.candidate.validation,
    evidence,
    writeClass: "EPHEMERAL",
    invent: false,
  };
}

function tenderToMaterials(
  claims: IkBomTechTenderClaim[],
  known: ReadonlySet<string>,
): { materials: IkBomTechMaterialLine[]; rejects: string[] } {
  const materials: IkBomTechMaterialLine[] = [];
  const rejects: string[] = [];
  for (const c of claims) {
    if (c.claimKind !== "MATERIAL" && c.claimKind !== "QTY_FACTOR") continue;
    const mk = String(c.materialKey ?? "").trim();
    const u = String(c.unit ?? "").trim();
    const qty = c.qtyFactor;
    if (!mk) {
      rejects.push("TENDER_CLAIM_NO_MATERIAL_KEY");
      continue;
    }
    if (known.size > 0 && !known.has(mk)) {
      rejects.push(`TENDER_UNKNOWN_MATERIAL_KEY:${mk}`);
      continue;
    }
    if (!u || qty == null || !Number.isFinite(qty) || qty < 0) {
      rejects.push(`TENDER_CLAIM_INCOMPLETE:${mk}`);
      continue;
    }
    materials.push({
      materialKey: mk,
      description: c.text || mk,
      unit: u,
      qtyFactor: qty,
      role: "PRIMARY",
      evidence: c.evidence.map((e) => ({
        ...e,
        supports: e.supports.length ? e.supports : ["MATERIAL", "QTY_FACTOR", "TECHNOLOGY"],
      })),
    });
  }
  return { materials, rejects };
}

function normToCandidate(
  job: IkBomGapJob,
  norm: IkBomTechNormCandidate,
  known: ReadonlySet<string>,
): { candidate: IkBomTechnologyCandidate | null; rejects: string[] } {
  if (!unitsMatch(norm.unit, job.unit)) {
    return { candidate: null, rejects: [`UNIT_MISMATCH:${norm.unit}≠${job.unit}`] };
  }
  const materials: IkBomTechMaterialLine[] = [];
  const rejects: string[] = [];
  for (const m of norm.materials) {
    const mk = String(m.materialKey ?? "").trim();
    if (!mk) {
      rejects.push("NORM_MISSING_MATERIAL_KEY");
      continue;
    }
    if (known.size > 0 && !known.has(mk)) {
      rejects.push(`UNKNOWN_MATERIAL_KEY:${mk}`);
      continue;
    }
    if (!Number.isFinite(m.qtyFactor) || m.qtyFactor < 0) {
      rejects.push(`NORM_BAD_QTY:${mk}`);
      continue;
    }
    materials.push({
      materialKey: mk,
      description: m.description,
      unit: m.unit,
      qtyFactor: m.qtyFactor,
      role: m.role,
      evidence: norm.evidence.map((e) => ({
        ...e,
        supports: e.supports.length
          ? e.supports
          : ["NORMATIVE_BASIS", "MATERIAL", "QTY_FACTOR", "UNIT"],
      })),
    });
  }
  if (!materials.length) {
    return { candidate: null, rejects: rejects.length ? rejects : ["NORM_EMPTY_MATERIALS"] };
  }
  const validation = validateMaterials(materials, known);
  if (!validation.ok) return { candidate: null, rejects: validation.rejects };
  const confidence = confidenceFromMaterials(materials, {
    technology: Math.min(1, norm.score),
    unit: 1,
    normative: Math.min(1, norm.score),
  });
  return {
    candidate: {
      schemaVersion: IK_BOM_TECH_RESEARCH_SCHEMA_VERSION,
      tenderId: job.tenderId,
      dwellingId: job.dwellingId,
      lineId: job.lineId,
      workId: job.workId,
      technologyId: `norm:${norm.catalog}:${norm.catalogId}:${norm.itemId}`,
      technologyDescription: norm.description,
      sourceType: "NORMATIVE_CATALOG",
      normativeBasis: {
        catalog: norm.catalog,
        catalogId: norm.catalogId,
        tableId: norm.tableId,
        itemId: norm.itemId,
        description: norm.description,
        unit: norm.unit,
      },
      materials,
      laborBasis: null,
      equipmentBasis: null,
      confidence,
      validation,
      evidence: [...norm.evidence],
      writeClass: "EPHEMERAL",
      invent: false,
    },
    rejects: [],
  };
}

function makeTrace(partial: Partial<IkBomResearchLineTrace> & Pick<IkBomResearchLineTrace, "lineId" | "dwellingId">): IkBomResearchLineTrace {
  return {
    lineId: partial.lineId,
    dwellingId: partial.dwellingId,
    workId: partial.workId ?? null,
    initialGap: partial.initialGap ?? "BRAK_TECHNOLOGII_BOM",
    identityStatus: partial.identityStatus ?? "UNKNOWN",
    providersTried: partial.providersTried ?? [],
    sourcesFound: partial.sourcesFound ?? [],
    candidates: partial.candidates ?? 0,
    rejects: partial.rejects ?? [],
    selectedCandidateId: partial.selectedCandidateId ?? null,
    confidence: partial.confidence ?? null,
    evidenceRefs: partial.evidenceRefs ?? [],
    ephemeralApplied: partial.ephemeralApplied ?? false,
    stopReason: partial.stopReason ?? "HOLD",
    why: partial.why ?? [],
  };
}

function okCandidate(
  workId: string,
  candidate: IkBomTechnologyCandidate,
  ephemeral: IkEphemeralBomBasis,
  diagnostics: IkBomTechNoEvidenceDetail,
  levelTrace: string[],
  allEvidence: IkBomTechEvidence[],
  sekocenbudAvailable: boolean,
  messagePl: string,
  gapMessage: string,
  researchTrace: IkBomResearchLineTrace,
): RunIkBomTechnologyResearchResult {
  diagnostics.technologyMissing = false;
  diagnostics.noMaterialKey = false;
  diagnostics.noQtyFactorProvenance = false;
  return {
    status: "CANDIDATE",
    workId,
    technologyCandidate: candidate,
    bomCandidate: candidate,
    ephemeral,
    confidence: candidate.confidence,
    evidence: allEvidence.length ? allEvidence : candidate.evidence,
    validation: candidate.validation,
    writeClass: "EPHEMERAL",
    invent: false,
    diagnostics,
    levelTrace,
    gapCompat: gapCompatCandidate(
      workId,
      candidate.dwellingId,
      candidate.lineId,
      candidate,
      ephemeral,
      gapMessage,
    ),
    sekocenbudAvailable,
    messagePl,
    cloudWrite: false,
    catalogWrite: false,
    priceMemoryWrite: false,
    technologyPackWrite: false,
    researchTrace: {
      ...researchTrace,
      candidates: 1,
      selectedCandidateId: candidate.technologyId,
      confidence: candidate.confidence.finalConfidence,
      ephemeralApplied: true,
      stopReason: "CANDIDATE",
      evidenceRefs: candidate.evidence.map((e) => e.sourceRef),
    },
  };
}

/**
 * Sync research entry (Auto Gap + tests). Providers must be sync (Null/Fixture).
 */
export function runIkBomTechnologyResearch(
  opts: RunIkBomTechnologyResearchOpts,
): RunIkBomTechnologyResearchResult {
  const started = Date.now();
  const nowMs = opts.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const threshold = opts.confidenceThreshold ?? DEFAULT_BOM_TECH_CONFIDENCE_THRESHOLD;
  const budget = opts.researchBudget ?? {};
  const levelTrace: string[] = [];
  const allEvidence: IkBomTechEvidence[] = [];
  const providersTried: IkBomProviderTried[] = [];
  const known = knownKeySet(opts.knownMaterialKeys ?? opts.bomGapPorts?.knownMaterialKeys);
  const sekStatus = (opts.sekocenbud ?? nullSekocenbudAdapter).status();
  const sekocenbudAvailable = sekStatus.available === true;
  const diagnostics = emptyDiagnostics();

  const workIdRaw = String(opts.workId ?? opts.workIdentity?.workId ?? "").trim();
  const dwellingId = String(opts.dwellingId ?? "").trim();
  const lineId = String(opts.lineId ?? "").trim();
  const tenderId = String(opts.tenderId ?? "").trim();
  const description = String(opts.description ?? opts.offerBoqLine?.description ?? "").trim();
  const unit = String(opts.unit ?? opts.offerBoqLine?.unit ?? "").trim();
  const quantity = opts.quantity ?? opts.offerBoqLine?.quantity ?? 1;

  const identity = runIkBomIdentityGate({
    workId: workIdRaw || null,
    dwellingId,
    lineId,
    description,
  });
  levelTrace.push(`IDENTITY_${identity.status}`);

  const podstawa = extractIkBomPodstawaEvidence({ description });
  const lookupKey = normativeLookupKey(podstawa.catalogBasis);
  if (podstawa.tableCodes.length) {
    diagnostics.why.push(
      `PODSTAWA_SIGNALS:${podstawa.tableCodes.join(",")}${lookupKey ? `|key=${lookupKey}` : ""}`,
    );
  }
  for (const n of podstawa.notesPl) diagnostics.why.push(n);

  const baseTrace = (): IkBomResearchLineTrace =>
    makeTrace({
      lineId,
      dwellingId,
      workId: workIdRaw || null,
      identityStatus: identity.status,
      providersTried,
      sourcesFound: allEvidence.map((e) => e.sourceRef),
      rejects: [...diagnostics.reasons],
      why: [...diagnostics.why],
    });

  const runPublicKnrSidecar = (identityRequired: boolean) => {
    if (!opts.publicKnrResearchSync) return null;
    try {
      const pk = opts.publicKnrResearchSync({
        rawCode: lookupKey,
        description,
        identityRequired,
      });
      diagnostics.why.push(
        `PUBLIC_KNR:${pk.catalogLifecycle}:${pk.knrEvidenceFound ? "FOUND" : "MISS"}`,
        pk.messagePl,
        ...pk.telemetryWhy.slice(0, 6),
      );
      if (pk.knrEvidenceFound && !pk.bomComplete) {
        diagnostics.why.push("KNR_SUCCESS_BOM_HOLD");
      }
      return pk;
    } catch (e) {
      diagnostics.why.push(`PUBLIC_KNR_ERROR:${String((e as Error)?.message ?? e)}`);
      return null;
    }
  };

  const hold = (
    status: IkBomTechResearchStatus,
    messagePl: string,
    rejects: string[],
    gapCompat: RunIkBomGapResearchResult | null = null,
  ): RunIkBomTechnologyResearchResult => {
    const why = [...new Set([...diagnostics.why, ...rejects, messagePl])];
    diagnostics.reasons = [...new Set([...diagnostics.reasons, ...rejects])];
    diagnostics.why = why;
    return {
      status,
      workId: workIdRaw,
      technologyCandidate: null,
      bomCandidate: null,
      ephemeral: null,
      confidence: emptyConfidence(),
      evidence: allEvidence,
      validation: { ok: false, rejects },
      writeClass: "OWNER_REQUIRED",
      invent: false,
      diagnostics,
      levelTrace,
      gapCompat,
      sekocenbudAvailable,
      messagePl,
      cloudWrite: false,
      catalogWrite: false,
      priceMemoryWrite: false,
      technologyPackWrite: false,
      researchTrace: {
        ...baseTrace(),
        stopReason: status,
        rejects,
        why,
        ephemeralApplied: false,
      },
    };
  };

  if (identity.status === "NO_DWELLING") {
    return hold("OWNER_REQUIRED", "Brak dwellingId.", ["MISSING_DWELLING_ID"]);
  }
  if (identity.status === "NO_LINE") {
    return hold("NO_EVIDENCE", "Brak lineId.", ["MISSING_LINE_ID"]);
  }
  if (identity.status === "NO_WORK_ID") {
    diagnostics.why.push(
      "NO_WORK_ID — BOM research zabroniony; najpierw identity/KNR mapping.",
      ...podstawa.notesPl,
    );
    const pk = runPublicKnrSidecar(true);
    return hold(
      "OWNER_REQUIRED",
      pk?.knrEvidenceFound
        ? `KNR_EVIDENCE_FOUND + IDENTITY_REQUIRED — workId unresolved. ${pk.messagePl}`
        : `NO_WORK_ID — ${identity.suggestedNextActionPl}${lookupKey ? ` · podstawa=${lookupKey}` : ""}`,
      pk?.knrEvidenceFound
        ? ["KNR_EVIDENCE_FOUND", "IDENTITY_REQUIRED", "MISSING_WORK_ID"]
        : ["MISSING_WORK_ID", ...identity.mismatchReasons],
    );
  }
  if (identity.status === "IDENTITY_MISMATCH") {
    diagnostics.identityMismatch = true;
    diagnostics.technologyMissing = true;
    diagnostics.why.push(
      "IDENTITY_MISMATCH — zablokowano BOM research dla błędnego workId.",
      ...identity.mismatchReasons,
      identity.suggestedNextActionPl,
    );
    // Continue public KNR research by podstawa — never apply wrong-workId BOM
    const pk = runPublicKnrSidecar(false);
    return hold(
      "IDENTITY_MISMATCH",
      `IDENTITY_MISMATCH: workId=${workIdRaw} vs description — NIE używaj BOM z błędnej tożsamości. ${
        pk?.knrEvidenceFound
          ? `Public KNR evidence: ${pk.messagePl}`
          : identity.suggestedNextActionPl
      }`,
      ["IDENTITY_MISMATCH", ...identity.mismatchReasons],
    );
  }

  const workId = workIdRaw;

  const job: IkBomGapJob = {
    tenderId,
    dwellingId,
    lineId,
    lp: String(opts.offerBoqLine?.lp ?? ""),
    workId,
    unit,
    quantity: Number.isFinite(quantity) ? Number(quantity) : 1,
    description,
    gapCode: "BRAK_TECHNOLOGII_BOM",
  };

  // Default L0: podstawa evidence extractor (AVAILABLE) — still no qty invent
  const tenderDocs =
    opts.tenderDocuments ?? createTenderPodstawaEvidenceProvider();
  const normative =
    opts.normativeCatalog
    ?? (opts.knrCatalogStore
      ? createKnrCatalogNormativeProvider(opts.knrCatalogStore, { nowIso })
      : nullNormativeCatalogProvider);
  const manufacturer = opts.manufacturer ?? nullManufacturerEvidenceProvider;
  const publicTech = opts.publicTechnical ?? nullPublicTechnicalEvidenceProvider;
  const web = opts.web ?? nullWebEvidenceProvider;
  const analog = opts.analogTender ?? nullAnalogTenderEvidenceProvider;

  // Declare licensed commercial layer status even when not injected
  providersTried.push({
    providerId: licensedNormativeCatalogProvider.providerId,
    layer: "L2",
    availability: licensedNormativeCatalogProvider.availability,
    requests: 0,
    hits: 0,
    candidates: 0,
    rejects: ["LICENSE_REQUIRED_SKIP"],
    elapsedMs: 0,
    notesPl: licensedNormativeCatalogProvider.requiredConfigPl,
  });
  if (licensedNormativeCatalogProvider.availability === "LICENSE_REQUIRED") {
    diagnostics.licenseRequired = true;
    diagnostics.normativeSourceUnavailable = true;
    diagnostics.why.push(
      "L2 licensed WACETOB/SEKOCENBUD = LICENSE_REQUIRED (nie scrapowane).",
    );
  }
  if (!sekocenbudAvailable) {
    diagnostics.why.push("SEKOCENBUD = NOT_CONFIGURED (price adapter ≠ BOM).");
  }

  if (budget.maxElapsedMs && Date.now() - started > budget.maxElapsedMs) {
    return hold("OWNER_REQUIRED", "Research budget elapsed.", ["BUDGET"]);
  }

  // ——— continue with L0 (existing body below uses tenderDocs/normative/…) ———
  // L0
  levelTrace.push("L0_TENDER");
  const t0 = Date.now();
  const tenderClaims = syncVal(
    tenderDocs.findTechnologyClaims({
      tenderId,
      dwellingId,
      lineId,
      description,
      unit,
      workId,
    }),
  );
  providersTried.push({
    providerId: tenderDocs.providerId,
    layer: "L0",
    availability: tenderDocs.availability ?? "AVAILABLE",
    requests: 1,
    hits: tenderClaims.length,
    candidates: 0,
    rejects: [],
    elapsedMs: Date.now() - t0,
    notesPl: tenderDocs.requiredConfigPl,
  });
  if (tenderClaims.length) {
    diagnostics.noTenderSpecification = false;
    for (const c of tenderClaims) allEvidence.push(...c.evidence);
    const { materials, rejects } = tenderToMaterials(tenderClaims, known);
    if (materials.length) {
      const validation = validateMaterials(materials, known);
      const confidence = confidenceFromMaterials(materials, {
        technology: 0.92,
        unit: unit ? 1 : 0,
        normative: 0.4,
      });
      if (validation.ok && confidence.finalConfidence >= threshold) {
        const candidate: IkBomTechnologyCandidate = {
          schemaVersion: IK_BOM_TECH_RESEARCH_SCHEMA_VERSION,
          tenderId,
          dwellingId,
          lineId,
          workId,
          technologyId: `tender:${tenderId}:${lineId}`,
          technologyDescription:
            tenderClaims.find((c) => c.claimKind === "TECHNOLOGY" || c.claimKind === "SYSTEM")
              ?.text || description || "Tender technology",
          sourceType: "TENDER_PRIMARY",
          normativeBasis: null,
          materials,
          laborBasis: null,
          equipmentBasis: null,
          confidence,
          validation,
          evidence: allEvidence,
          writeClass: "EPHEMERAL",
          invent: false,
        };
        levelTrace.push("L0_CANDIDATE");
        return okCandidate(
          workId,
          candidate,
          candidateToEphemeral(candidate, threshold, nowIso),
          diagnostics,
          levelTrace,
          allEvidence,
          sekocenbudAvailable,
          "L0 tender → CANDIDATE.",
          "Tender primary evidence → ephemeral BOM.",
          baseTrace(),
        );
      }
      diagnostics.reasons.push(...rejects, ...validation.rejects);
      diagnostics.why.push("L0 claims bez hard BOM (brak materialKey+qtyFactor).");
    } else {
      diagnostics.reasons.push(...rejects, "TENDER_CLAIMS_WITHOUT_HARD_BOM");
      diagnostics.why.push(
        "L0: znaleziono evidence (np. podstawa KNR), ale BEZ twardego qtyFactor/materialKey — evidence only.",
      );
    }
  } else if ((tenderDocs.availability ?? "AVAILABLE") !== "AVAILABLE") {
    diagnostics.why.push(
      `L0 ${tenderDocs.providerId} = ${tenderDocs.availability}: ${tenderDocs.requiredConfigPl || ""}`,
    );
  }

  // L1
  levelTrace.push("L1_TRUSTED_PACK");
  const l1 = runIkBomGapResearch(job, {
    ...(opts.bomGapPorts ?? {}),
    knownMaterialKeys: opts.bomGapPorts?.knownMaterialKeys ?? opts.knownMaterialKeys,
    nowMs,
  });
  if (l1.status === "ACTIVE_OK") {
    levelTrace.push("L1_ACTIVE_OK");
    diagnostics.technologyMissing = false;
    diagnostics.noMaterialKey = false;
    diagnostics.noQtyFactorProvenance = false;
    providersTried.push({
      providerId: "technology-pack.registry",
      layer: "L1",
      availability: "AVAILABLE",
      requests: 1,
      hits: 1,
      candidates: 1,
      rejects: [],
      elapsedMs: 0,
      notesPl: "ACTIVE TechnologyPack exact workId",
    });
    return {
      status: "RESOLVED",
      workId,
      technologyCandidate: null,
      bomCandidate: null,
      ephemeral: null,
      confidence: finalizeConfidence({
        technologyConfidence: 1,
        materialIdentityConfidence: 1,
        qtyFactorConfidence: 1,
        unitConfidence: 1,
        normativeConfidence: 0.5,
      }),
      evidence: allEvidence,
      validation: { ok: true, rejects: [] },
      writeClass: "READ",
      invent: false,
      diagnostics,
      levelTrace,
      gapCompat: l1,
      sekocenbudAvailable,
      messagePl: l1.messagePl,
      cloudWrite: false,
      catalogWrite: false,
      priceMemoryWrite: false,
      technologyPackWrite: false,
      researchTrace: {
        ...baseTrace(),
        stopReason: "RESOLVED",
        candidates: 1,
        ephemeralApplied: false,
        why: ["L1 ACTIVE TechnologyPack — pure F5 lookup"],
      },
    };
  }
  if (l1.status === "CANDIDATE") {
    levelTrace.push("L1_CANDIDATE");
    const tech = fromL1(job, l1);
    allEvidence.push(...tech.evidence);
    providersTried.push({
      providerId: "technology-pack.registry",
      layer: "L1",
      availability: "AVAILABLE",
      requests: 1,
      hits: 1,
      candidates: 1,
      rejects: [],
      elapsedMs: 0,
    });
    if (tech.confidence.finalConfidence < threshold) {
      return hold(
        "OWNER_REQUIRED",
        "L1 poniżej confidence.",
        [`CONFIDENCE:${tech.confidence.finalConfidence}<${threshold}`],
        l1,
      );
    }
    diagnostics.technologyMissing = false;
    diagnostics.noMaterialKey = false;
    diagnostics.noQtyFactorProvenance = false;
    return {
      status: "CANDIDATE",
      workId,
      technologyCandidate: tech,
      bomCandidate: tech,
      ephemeral: l1.ephemeral,
      confidence: tech.confidence,
      evidence: allEvidence,
      validation: tech.validation,
      writeClass: "EPHEMERAL",
      invent: false,
      diagnostics,
      levelTrace,
      gapCompat: l1,
      sekocenbudAvailable,
      messagePl: l1.messagePl,
      cloudWrite: false,
      catalogWrite: false,
      priceMemoryWrite: false,
      technologyPackWrite: false,
      researchTrace: {
        ...baseTrace(),
        stopReason: "CANDIDATE",
        candidates: 1,
        selectedCandidateId: tech.technologyId,
        confidence: tech.confidence.finalConfidence,
        ephemeralApplied: true,
      },
    };
  }
  if (l1.status === "HOLD" && l1.reason === "AMBIGUOUS") {
    diagnostics.ambiguousTechnologies = true;
    return hold("AMBIGUOUS", l1.messagePl, l1.rejects, l1);
  }
  providersTried.push({
    providerId: "technology-pack.registry",
    layer: "L1",
    availability: "AVAILABLE",
    requests: 1,
    hits: 0,
    candidates: 0,
    rejects: l1.status === "HOLD" ? l1.rejects : [],
    elapsedMs: 0,
    notesPl: l1.status === "HOLD" ? l1.messagePl : "NO_PACK",
  });

  // Before L2: optional Public KNR Research when catalog miss (sync port)
  if (opts.publicKnrResearchSync && opts.knrCatalogStore) {
    const pending = findPendingKnrInCatalog(opts.knrCatalogStore, lookupKey);
    if (!pending.found) {
      const pk = runPublicKnrSidecar(false);
      if (pk?.reanalyzeRequired) {
        levelTrace.push("PUBLIC_KNR_STAGED_REANALYZE");
      }
    } else {
      diagnostics.why.push(
        `KNR_PENDING_IN_CATALOG:${pending.evidenceKeyV1} · BOM HOLD (empty norms)`,
      );
    }
  } else if (opts.publicKnrResearchSync) {
    runPublicKnrSidecar(false);
  }

  // L2
  levelTrace.push("L2_NORMATIVE");
  const t2 = Date.now();
  const normHits = syncVal(
    normative.searchNormCandidates({
      workId,
      description,
      unit,
      tenderId,
      dwellingId,
      lineId,
      budget,
      lookupKey,
    }),
  );
  providersTried.push({
    providerId: normative.providerId,
    layer: "L2",
    availability: normative.availability ?? "NOT_CONFIGURED",
    requests: 1,
    hits: normHits.length,
    candidates: normHits.length,
    rejects: [],
    elapsedMs: Date.now() - t2,
    notesPl: normative.requiredConfigPl,
  });
  if ((normative.availability ?? "AVAILABLE") !== "AVAILABLE") {
    diagnostics.normativeSourceUnavailable = true;
    diagnostics.why.push(
      `L2 ${normative.providerId} = ${normative.availability}: ${normative.requiredConfigPl || ""}`,
    );
  }
  const ranked = [...normHits].sort((a, b) => b.score - a.score);
  const unitOk = ranked.filter((n) => unitsMatch(n.unit, unit));
  if (ranked.length && !unitOk.length) {
    diagnostics.unitMismatch = true;
    diagnostics.reasons.push("NORM_UNIT_REJECT");
  }
  if (!unitOk.length) {
    diagnostics.noNormativeCandidate = true;
    diagnostics.reasons.push("NO_NORMATIVE_CANDIDATE");
  } else {
    diagnostics.noNormativeCandidate = false;
    const top = unitOk[0]!.score;
    const tops = unitOk.filter((n) => Math.abs(n.score - top) < 1e-9);
    if (tops.length > 1) {
      diagnostics.ambiguousTechnologies = true;
      return hold("AMBIGUOUS", "Wiele równorzędnych norm — HOLD.", ["AMBIGUOUS_NORM_CANDIDATES"]);
    }
    if (tops[0]!.materials.length === 0) {
      diagnostics.laborOnlySuggested = true;
      diagnostics.why.push(
        "L2 norm hit z pustymi materials — możliwy LABOR_ONLY, ale Auto Gap NIE auto-promuje bez Owner allowlist workId.",
      );
      return hold(
        "OWNER_REQUIRED",
        "Normative hit sugeruje LABOR_ONLY / brak M-lines — Owner policy wymagana (ZERO auto LABOR_ONLY z MISSING_BOM).",
        ["LABOR_ONLY_OWNER_REQUIRED", `NORM=${tops[0]!.catalog}:${tops[0]!.itemId}`],
      );
    }
    const { candidate, rejects } = normToCandidate(job, tops[0]!, known);
    if (candidate && candidate.confidence.finalConfidence >= threshold) {
      allEvidence.push(...candidate.evidence);
      levelTrace.push("L2_CANDIDATE");
      return okCandidate(
        workId,
        candidate,
        candidateToEphemeral(candidate, threshold, nowIso),
        diagnostics,
        levelTrace,
        allEvidence,
        sekocenbudAvailable,
        `L2 ${candidate.normativeBasis?.catalog} → CANDIDATE.`,
        "Normative catalog → ephemeral BOM.",
        baseTrace(),
      );
    }
    diagnostics.reasons.push(...rejects);
    diagnostics.why.push(...rejects);
    if (rejects.some((r) => r.startsWith("UNKNOWN_MATERIAL_KEY"))) {
      diagnostics.noMaterialKey = true;
    }
    if (rejects.some((r) => r.includes("QTY"))) diagnostics.noQtyFactorProvenance = true;
  }

  // L3
  levelTrace.push("L3_MANUFACTURER");
  const t3 = Date.now();
  const mfgEv = syncVal(manufacturer.findSystemEvidence({ description, workId }));
  allEvidence.push(...mfgEv);
  if (mfgEv.length) diagnostics.noManufacturerEvidence = false;
  const mfgCons = syncVal(manufacturer.findConsumption({ description, workId, unit }));
  providersTried.push({
    providerId: manufacturer.providerId,
    layer: "L3",
    availability: manufacturer.availability ?? "NOT_CONFIGURED",
    requests: 1,
    hits: mfgCons.length + mfgEv.length,
    candidates: mfgCons.length,
    rejects: [],
    elapsedMs: Date.now() - t3,
    notesPl: manufacturer.requiredConfigPl,
  });
  if ((manufacturer.availability ?? "AVAILABLE") !== "AVAILABLE" && !mfgCons.length) {
    diagnostics.why.push(
      `L3 ${manufacturer.providerId} = ${manufacturer.availability}: ${manufacturer.requiredConfigPl || ""}`,
    );
  }
  if (mfgCons.length) {
    const materials: IkBomTechMaterialLine[] = mfgCons.map((m) => ({
      materialKey: m.materialKey,
      description: m.description,
      unit: m.unit,
      qtyFactor: m.qtyFactor,
      role: "PRIMARY",
      evidence: m.evidence,
    }));
    const validation = validateMaterials(materials, known);
    const confidence = confidenceFromMaterials(materials, {
      technology: 0.9,
      unit: unit ? 1 : 0,
      normative: 0.3,
    });
    if (validation.ok && confidence.finalConfidence >= threshold) {
      const candidate: IkBomTechnologyCandidate = {
        schemaVersion: IK_BOM_TECH_RESEARCH_SCHEMA_VERSION,
        tenderId,
        dwellingId,
        lineId,
        workId,
        technologyId: `mfg:${workId}:${lineId}`,
        technologyDescription: description || "Manufacturer system",
        sourceType: "MANUFACTURER",
        normativeBasis: null,
        materials,
        laborBasis: null,
        equipmentBasis: null,
        confidence,
        validation,
        evidence: [...allEvidence, ...materials.flatMap((m) => m.evidence)],
        writeClass: "EPHEMERAL",
        invent: false,
      };
      levelTrace.push("L3_CANDIDATE");
      return okCandidate(
        workId,
        candidate,
        candidateToEphemeral(candidate, threshold, nowIso),
        diagnostics,
        levelTrace,
        candidate.evidence,
        sekocenbudAvailable,
        "L3 manufacturer → CANDIDATE.",
        "Manufacturer evidence → ephemeral BOM.",
        baseTrace(),
      );
    }
    diagnostics.reasons.push(...validation.rejects);
  } else {
    diagnostics.reasons.push("NO_MANUFACTURER_CONSUMPTION");
  }

  // L4
  levelTrace.push("L4_PUBLIC");
  const t4 = Date.now();
  const pub = syncVal(publicTech.searchPublicEvidence({ description, workId, unit, budget }));
  providersTried.push({
    providerId: publicTech.providerId,
    layer: "L4",
    availability: publicTech.availability ?? "NOT_CONFIGURED",
    requests: 1,
    hits: pub.length,
    candidates: 0,
    rejects: pub.length ? [] : ["NO_PUBLIC_HARD_BOM"],
    elapsedMs: Date.now() - t4,
    notesPl: publicTech.requiredConfigPl,
  });
  allEvidence.push(...pub);
  if (!pub.length) {
    diagnostics.reasons.push("NO_PUBLIC_TECHNICAL_EVIDENCE");
    if ((publicTech.availability ?? "AVAILABLE") !== "AVAILABLE") {
      diagnostics.why.push(
        `L4 ${publicTech.providerId} = ${publicTech.availability}: ${publicTech.requiredConfigPl || ""}`,
      );
    }
  } else {
    diagnostics.why.push(
      "L4 public evidence found — TIER2/3 alone nie zamyka BOM bez hard qtyFactor/materialKey.",
    );
  }

  // L5 analog
  if (budget.allowAnalogTender !== false) {
    levelTrace.push("L5_ANALOG");
    const analogs = syncVal(
      analog.findAnalog({ workId, description, unit, excludeTenderId: tenderId }),
    ).filter((a) => unitsMatch(a.unit, unit));
    if (analogs.length === 1) {
      const a = analogs[0]!;
      const materials: IkBomTechMaterialLine[] = a.materials.map((m) => ({
        materialKey: m.materialKey,
        description: m.description,
        unit: m.unit,
        qtyFactor: m.qtyFactor,
        role: "PRIMARY",
        evidence: a.evidence,
      }));
      const validation = validateMaterials(materials, known);
      const confidence = confidenceFromMaterials(materials, {
        technology: Math.min(0.8, a.confidenceCap),
        unit: 1,
        normative: 0.2,
      });
      if (
        validation.ok
        && confidence.finalConfidence >= threshold
        && a.confidenceCap >= threshold
      ) {
        const candidate: IkBomTechnologyCandidate = {
          schemaVersion: IK_BOM_TECH_RESEARCH_SCHEMA_VERSION,
          tenderId,
          dwellingId,
          lineId,
          workId,
          technologyId: `analog:${a.sourceTenderId}:${workId}`,
          technologyDescription: `Analog tender ${a.sourceTenderId}`,
          sourceType: "ANALOG_TENDER",
          normativeBasis: null,
          materials,
          laborBasis: null,
          equipmentBasis: null,
          confidence,
          validation,
          evidence: a.evidence,
          writeClass: "EPHEMERAL",
          invent: false,
        };
        levelTrace.push("L5_ANALOG_CANDIDATE");
        return okCandidate(
          workId,
          candidate,
          candidateToEphemeral(candidate, threshold, nowIso),
          diagnostics,
          levelTrace,
          a.evidence,
          sekocenbudAvailable,
          "L5 analog → CANDIDATE.",
          "Analog tender → ephemeral.",
          baseTrace(),
        );
      }
      diagnostics.reasons.push("ANALOG_BELOW_THRESHOLD_OR_INVALID", ...validation.rejects);
    } else if (analogs.length > 1) {
      diagnostics.ambiguousTechnologies = true;
      diagnostics.reasons.push("AMBIGUOUS_ANALOG");
    }
  }

  if (budget.allowWeb) {
    levelTrace.push("L5_WEB");
    const hits = syncVal(
      web.search({
        description,
        workId,
        unit,
        maxResults: budget.maxWebResults ?? 5,
      }),
    );
    for (const h of hits) {
      allEvidence.push({
        sourceKind: "GENERIC_WEB",
        sourceRef: h.url,
        title: h.title,
        publisher: h.publisher,
        url: h.url,
        retrievedAt: nowIso,
        excerpt: h.excerpt,
        evidenceHash: h.evidenceHash,
        authority: h.authority,
        supports: h.supports,
      });
    }
    diagnostics.reasons.push("WEB_EVIDENCE_NOT_SUFFICIENT_FOR_QTY");
  }

  levelTrace.push("NO_EVIDENCE");
  diagnostics.reasons = [...new Set(diagnostics.reasons)];
  diagnostics.why = [...new Set(diagnostics.why)];
  if (opts.knrCatalogStore && lookupKey) {
    const pending = findPendingKnrInCatalog(opts.knrCatalogStore, lookupKey);
    if (pending.found) {
      diagnostics.why.push("KNR_SUCCESS_BOM_HOLD — public/pending KNR bez material qty");
    }
  }
  const messagePl = [
    "NO_EVIDENCE — brak legalnego BOM candidate.",
    diagnostics.identityMismatch ? "identity mismatch" : null,
    diagnostics.technologyMissing ? "technology missing" : null,
    diagnostics.noNormativeCandidate ? "no normative candidate" : null,
    diagnostics.normativeSourceUnavailable ? "normative source unavailable/not configured" : null,
    diagnostics.licenseRequired ? "licensed KNR/SEKOCENBUD required" : null,
    diagnostics.noTenderSpecification ? "no tender hard BOM claims" : null,
    diagnostics.noManufacturerEvidence ? "no manufacturer evidence" : null,
    diagnostics.noMaterialKey ? "no materialKey" : null,
    diagnostics.noQtyFactorProvenance ? "no qtyFactor provenance" : null,
    diagnostics.unitMismatch ? "unit mismatch" : null,
    diagnostics.ambiguousTechnologies ? "ambiguous technologies" : null,
    diagnostics.laborOnlySuggested ? "labor-only suggested (Owner required)" : null,
    !sekocenbudAvailable ? "SEKOCENBUD unavailable" : null,
    lookupKey ? `podstawaKey=${lookupKey}` : null,
    `providers=${providersTried.map((p) => `${p.providerId}:${p.availability}`).join(",")}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return hold(
    "NO_EVIDENCE",
    messagePl,
    diagnostics.reasons.length ? diagnostics.reasons : ["NO_EVIDENCE"],
    l1.status === "HOLD" || l1.status === "REJECT" ? l1 : null,
  );
}

/** @deprecated alias — prefer runIkBomTechnologyResearch */
export const runIkBomTechnologyResearchSync = runIkBomTechnologyResearch;
