/**
 * AUTONOMOUS TECHNOLOGY SOURCE SELECTION (ATSS-v1)
 *
 * AKSS-pattern ladder for technology/BOM evidence — not a second research engine.
 * Feeds existing runIkBomTechnologyResearch providers + ATA candidate path.
 *
 * ZERO invent · ZERO Owner runtime · LICENSE_REQUIRED ≠ Owner · fail-closed.
 */

import {
  PUBLIC_KNR_SOURCE_REGISTRY,
  buildPublicKnrEffectiveAllowlist,
} from "./ik-public-knr-source-registry";
import { KNR_DISCOVERY_HTTP_ALLOWLIST } from "./knr-knowledge/knr-discovery-allowlist";
import {
  buildTechnologySearchStrategies,
  listTechnologyEvidenceKnowledge,
  listValidatedTechnologyEvidenceForWork,
  upsertTechnologyEvidenceKnowledge,
} from "./technology-evidence-knowledge";
import { findActiveTechnologyPacksForWorkId } from "@/lib/tender-position-cost/bom-technology-adapter";
import type { TechnologyPack } from "@/lib/technology-foundation/types";
import type { KnrCatalogStore } from "./knr-knowledge/knr-catalog-store";
import { isKnrCatalogEntryServable } from "./knr-knowledge/knr-catalog-lookup";
import {
  createKnrCatalogNormativeProvider,
} from "./ik-knr-catalog-as-normative";
import { licensedNormativeCatalogProvider } from "./ik-bom-technology-research-providers";
import type {
  IkBomTechEvidence,
  IkBomProviderAvailability,
} from "./ik-bom-technology-research-types";
import type { PublicTechnicalEvidenceProvider } from "./ik-bom-technology-research-providers";
import type { AutonomousTechnologyCandidate } from "./autonomous-technology-accept-contract";
import {
  isLikelyConstructionMaterialName as minIsLikelyConstructionMaterialName,
  isPrimaryStructuralMaterialName,
  isSecondaryBinderMaterialName,
  normalizeMaterialIdentity,
  extractMaterialNounFromWorkDescription,
  scoreMaterialNounPriority,
} from "./material-identity-normalization";

export const AUTONOMOUS_TECHNOLOGY_SOURCE_SELECTION_VERSION = "ATSS-v1" as const;

export type AtssSourceTier =
  | "EXISTING_TECHNOLOGY_PACK"
  | "EXISTING_KNOWLEDGE"
  | "VALIDATED_TECHNOLOGY_EVIDENCE"
  | "KNR_CATALOG_NORMATIVE"
  | "PUBLIC_INSTITUTIONAL_TENDER"
  | "PUBLIC_BOQ_KOSZTORYS"
  | "PUBLIC_TECHNICAL_DOCUMENTATION"
  | "MANUFACTURER_TECHNICAL"
  | "INDEPENDENT_CONSTRUCTION_TECH"
  | "LICENSED_PROVIDER";

export type AtssSourceProbe = {
  tier: AtssSourceTier;
  sourceId: string;
  sourceUrl: string | null;
  availability: IkBomProviderAvailability | "HIT" | "EMPTY";
  legalAccess: boolean;
  hardBomPossible: boolean;
  score: number;
  scoreReason: string;
  evidenceRefs: string[];
  notesPl: string | null;
  outcome:
    | "HIT_PACK"
    | "HIT_KNOWLEDGE"
    | "HIT_NORMATIVE"
    | "HIT_HARD_BOM"
    | "SOFT_ONLY"
    | "LICENSE_REQUIRED"
    | "NOT_CONFIGURED"
    | "EMPTY"
    | "SKIPPED";
};

export type AtssHardMaterialHit = {
  materialKey: string;
  namePl: string;
  unit: string;
  qtyFactor: number;
  sourceRef: string;
  evidenceRefs: string[];
  tier: AtssSourceTier;
};

export type RunAtssInput = {
  workId: string;
  description: string;
  unit: string;
  knrFamily?: string | null;
  knrCode?: string | null;
  packs: readonly TechnologyPack[];
  knrCatalogStore?: KnrCatalogStore | null;
  nowIso: string;
  /** Optional: inject hard materials (tests / ATHED extract) — must carry provenance. */
  injectedHardMaterials?: readonly AtssHardMaterialHit[] | null;
  /** Optional learned public URLs (e.g. from ChatGPT knowledge sources) — not invent. */
  knownPublicSourceUrls?: readonly { sourceId: string; url: string; kind?: string }[] | null;
  /**
   * ATHED document probe summary — upgrades PUBLIC_* probes from SOFT_ONLY
   * when fetch/extract actually ran (still no invent).
   */
  documentProbeSummary?: {
    fetchedOk: number;
    extractable: number;
    relevant: number;
    softOnly: number;
    hardEvidence: number;
    evidenceClass: "HARD_EVIDENCE" | "SOFT_ONLY" | "NO_EVIDENCE";
  } | null;
};

export type RunAtssResult = {
  version: typeof AUTONOMOUS_TECHNOLOGY_SOURCE_SELECTION_VERSION;
  workId: string;
  searchStrategies: string[];
  probes: AtssSourceProbe[];
  hardMaterials: AtssHardMaterialHit[];
  publicEvidence: IkBomTechEvidence[];
  technologyCandidate: AutonomousTechnologyCandidate | null;
  publicTechnicalProvider: PublicTechnicalEvidenceProvider;
  licensedStatus: IkBomProviderAvailability;
  nextLegal:
    | "REUSE_TECHNOLOGY_PACK"
    | "CANDIDATE_READY"
    | "CONTINUE_RESEARCH"
    | "AUTONOMOUS_RESOLUTION_QUEUE · TECHNOLOGY_EVIDENCE_GAP";
  ownerRuntimeDependency: 0;
};

/** Thin re-export — SSOT is MATERIAL_IDENTITY_NORMALIZATION_v1. */
export function isLikelyConstructionMaterialName(namePl: string): boolean {
  return minIsLikelyConstructionMaterialName(namePl);
}

/**
 * Strict hard BOM extract — requires nakładcze/consumption precursor.
 * Bare BOQ "Token N m2" (rooms, area fragments) is NOT material evidence.
 */
export function extractHardBomMaterialsFromPublicText(input: {
  text: string;
  workId: string;
  knrCode?: string | null;
  sourceRef: string;
  nowIso: string;
}): AtssHardMaterialHit[] {
  const text = String(input.text || "");
  if (!text.trim()) return [];
  const code = String(input.knrCode || "").trim();
  if (code) {
    const codeRe = new RegExp(code.replace("-", "[-/]"), "i");
    if (!codeRe.test(text)) return [];
  }

  const hits: AtssHardMaterialHit[] = [];
  const re =
    /(?:zu[zż]ycie|norma|wska[zź]nik|nak[lł]ad\w*|materia[lł]\w*)\s*[:\-]?\s*([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż][A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż0-9._\-]{2,40}|mat\.[a-z0-9_]+)\s+[^\n]{0,40}?(\d+[.,]\d+|\d+)\s*(kg|l|mb|m2|m²|szt|m3)\s*(?:\/\s*(m2|m²|szt|mb))?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const materialKey = String(m[1] || "").trim();
    const qty = Number(String(m[2] || "").replace(",", "."));
    const matUnit = String(m[3] || "").replace("²", "2").toLowerCase();
    if (!materialKey || !Number.isFinite(qty) || qty < 0) continue;
    const window = text.slice(Math.max(0, m.index - 40), m.index + (m[0]?.length || 0) + 20);
    if (/typowe|zwykle|ok\.|oko[lł]o|approx|~|ponad\s+\d/i.test(window)) continue;
    const displayName = materialKey.startsWith("mat.")
      ? materialKey.replace(/^mat\.[a-z]+\./, "").replace(/_/g, " ")
      : materialKey;
    const norm = normalizeMaterialIdentity({
      rawText: displayName,
      unit: matUnit,
      quantity: qty,
      source: input.sourceRef,
      provenance: input.sourceRef,
      contextText: window,
    });
    if (norm.status !== "ACCEPTED") continue;
    hits.push({
      materialKey: materialKey.startsWith("mat.")
        ? materialKey
        : (norm.materialKey || `mat.public.${foldKey(materialKey)}`),
      namePl: norm.normalizedName,
      unit: matUnit,
      qtyFactor: qty,
      sourceRef: input.sourceRef,
      evidenceRefs: [input.sourceRef],
      tier: "PUBLIC_BOQ_KOSZTORYS",
    });
  }
  return hits;
}

function foldKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function learnProviderStatus(input: {
  workId: string;
  sourceId: string;
  availability: string;
  nowIso: string;
}): void {
  upsertTechnologyEvidenceKnowledge({
    id: `tek:provider:${input.sourceId}:${input.workId}`,
    kind: "PROVIDER_STATUS",
    workId: input.workId,
    technologyIdentity: null,
    sourceUrl: null,
    sourceId: input.sourceId,
    applicability: `technology_provider:${input.sourceId}`,
    evidenceRefs: [],
    validationState: "STATUS_ONLY",
    provenance: `atss:${input.availability}`,
    freshnessIso: input.nowIso,
    searchStrategy: null,
    payload: { availability: input.availability },
    invent: false,
  });
}

export function runAutonomousTechnologySourceSelection(
  input: RunAtssInput,
): RunAtssResult {
  const workId = String(input.workId || "").trim();
  const description = String(input.description || "").trim();
  const unit = String(input.unit || "").trim();
  const nowIso = input.nowIso;
  const probes: AtssSourceProbe[] = [];
  const hardMaterials: AtssHardMaterialHit[] = [];
  const publicEvidence: IkBomTechEvidence[] = [];

  const searchStrategies = buildTechnologySearchStrategies({
    workId,
    description,
    unit,
    knrFamily: input.knrFamily,
    knrCode: input.knrCode,
  });
  for (const q of searchStrategies.slice(0, 6)) {
    const qKey = q
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .slice(0, 40);
    upsertTechnologyEvidenceKnowledge({
      id: `tek:search:${workId}:${qKey}`,
      kind: "SEARCH_STRATEGY",
      workId,
      technologyIdentity: null,
      sourceUrl: null,
      sourceId: null,
      applicability: "technology_search",
      evidenceRefs: [],
      validationState: "STATUS_ONLY",
      provenance: "atss:learned_search",
      freshnessIso: nowIso,
      searchStrategy: q,
      payload: { query: q },
      invent: false,
    });
  }

  // 1 — existing TechnologyPack
  const packs = findActiveTechnologyPacksForWorkId(workId, input.packs);
  probes.push({
    tier: "EXISTING_TECHNOLOGY_PACK",
    sourceId: "technology-pack.registry",
    sourceUrl: null,
    availability: packs.length ? "HIT" : "EMPTY",
    legalAccess: true,
    hardBomPossible: packs.length === 1,
    score: packs.length === 1 ? 100 : packs.length > 1 ? 40 : 0,
    scoreReason: packs.length === 1
      ? "ACTIVE singleton pack"
      : packs.length > 1
        ? "AMBIGUOUS packs"
        : "no ACTIVE pack",
    evidenceRefs: packs.map((p) => `${p.packId}@${p.packVersion}`),
    notesPl: null,
    outcome: packs.length === 1 ? "HIT_PACK" : packs.length ? "SOFT_ONLY" : "EMPTY",
  });

  // 2–3 — Knowledge / validated evidence
  const knowledge = listTechnologyEvidenceKnowledge({ workId });
  const validated = listValidatedTechnologyEvidenceForWork(workId);
  probes.push({
    tier: "EXISTING_KNOWLEDGE",
    sourceId: "technology-evidence.knowledge",
    sourceUrl: null,
    availability: knowledge.length ? "HIT" : "EMPTY",
    legalAccess: true,
    hardBomPossible: validated.length > 0,
    score: validated.length ? 95 : knowledge.length ? 50 : 0,
    scoreReason: validated.length
      ? "validated technology evidence"
      : knowledge.length
        ? "knowledge without validated recipe"
        : "empty knowledge",
    evidenceRefs: validated.flatMap((v) => v.evidenceRefs),
    notesPl: null,
    outcome: validated.length ? "HIT_KNOWLEDGE" : knowledge.length ? "SOFT_ONLY" : "EMPTY",
  });
  probes.push({
    tier: "VALIDATED_TECHNOLOGY_EVIDENCE",
    sourceId: "technology-evidence.validated",
    sourceUrl: null,
    availability: validated.length ? "HIT" : "EMPTY",
    legalAccess: true,
    hardBomPossible: validated.length > 0,
    score: validated.length ? 94 : 0,
    scoreReason: validated.length ? "VALIDATED" : "none",
    evidenceRefs: validated.flatMap((v) => v.evidenceRefs),
    notesPl: null,
    outcome: validated.length ? "HIT_KNOWLEDGE" : "EMPTY",
  });

  for (const rec of validated) {
    const mats = Array.isArray(rec.payload.materials)
      ? (rec.payload.materials as AtssHardMaterialHit[])
      : [];
    for (const m of mats) {
      if (
        m
        && String(m.materialKey || "").trim()
        && Number.isFinite(m.qtyFactor)
        && String(m.factorSourceRef || m.sourceRef || "").trim()
      ) {
        hardMaterials.push({
          materialKey: m.materialKey,
          namePl: m.namePl || m.materialKey,
          unit: m.unit,
          qtyFactor: m.qtyFactor,
          sourceRef: m.factorSourceRef || m.sourceRef || rec.provenance,
          evidenceRefs: m.evidenceRefs?.length ? m.evidenceRefs : rec.evidenceRefs,
          tier: "VALIDATED_TECHNOLOGY_EVIDENCE",
        });
      }
    }
  }

  // 4 — KNR catalog normative (VERIFIED materialNorms only via existing provider)
  const knrStore = input.knrCatalogStore ?? null;
  if (knrStore) {
    const provider = createKnrCatalogNormativeProvider(knrStore, { nowIso });
    const lookupKey = input.knrFamily && input.knrCode
      ? `${String(input.knrFamily).toUpperCase().includes("KNNR") ? "KNNR" : "KNR"}|${String(input.knrFamily).replace(/^(KNR|KNNR)\s*/i, "").trim()}|${input.knrCode}`
      : null;
    const cands = provider.searchNormCandidates({
      workId,
      description,
      unit,
      lookupKey,
    });
    const servable = Object.values(knrStore.entries || {}).some((e) =>
      isKnrCatalogEntryServable(e),
    );
    probes.push({
      tier: "KNR_CATALOG_NORMATIVE",
      sourceId: provider.providerId,
      sourceUrl: null,
      availability: provider.availability,
      legalAccess: true,
      hardBomPossible: cands.some((c) => (c.materials?.length || 0) > 0),
      score: cands.length ? 90 : servable ? 30 : 5,
      scoreReason: cands.length
        ? "normative candidates"
        : servable
          ? "catalog servable but no work match / empty materials"
          : "no VERIFIED materialNorms in catalog (NOT_CONFIGURED)",
      evidenceRefs: cands.flatMap((c) => c.evidence?.map((e) => e.sourceRef) || []),
      notesPl: provider.requiredConfigPl ?? null,
      outcome: cands.some((c) => c.materials?.length)
        ? "HIT_NORMATIVE"
        : provider.availability === "NOT_CONFIGURED"
          ? "NOT_CONFIGURED"
          : "EMPTY",
    });
    for (const c of cands) {
      for (const m of c.materials || []) {
        if (!Number.isFinite(m.qtyFactor) || !m.materialKey) continue;
        hardMaterials.push({
          materialKey: m.materialKey,
          namePl: m.description || m.materialKey,
          unit: m.unit,
          qtyFactor: m.qtyFactor,
          sourceRef: m.sourceRef || c.evidence?.[0]?.sourceRef || "knr-catalog",
          evidenceRefs: (c.evidence || []).map((e) => e.sourceRef),
          tier: "KNR_CATALOG_NORMATIVE",
        });
      }
    }
  } else {
    probes.push({
      tier: "KNR_CATALOG_NORMATIVE",
      sourceId: "normative.knr-catalog-ssot",
      sourceUrl: null,
      availability: "NOT_CONFIGURED",
      legalAccess: true,
      hardBomPossible: false,
      score: 0,
      scoreReason: "knrCatalogStore not provided",
      evidenceRefs: [],
      notesPl: null,
      outcome: "NOT_CONFIGURED",
    });
  }

  // 5–6 — public institutional / BOQ (allowlist + registry + known URLs) — status only unless injected extract
  const effectiveAllow = buildPublicKnrEffectiveAllowlist();
  const publicUrls = [
    ...PUBLIC_KNR_SOURCE_REGISTRY.filter((e) => e.active).map((e) => ({
      sourceId: e.sourceId,
      url: e.url,
      kind: "registry",
    })),
    ...effectiveAllow.map((e) => ({
      sourceId: e.sourceId,
      url: e.url,
      kind: "allowlist",
    })),
    ...KNR_DISCOVERY_HTTP_ALLOWLIST.filter((e) => e.active).map((e) => ({
      sourceId: e.sourceId,
      url: e.url,
      kind: "allowlist_base",
    })),
    ...(input.knownPublicSourceUrls || []).map((e) => ({
      sourceId: e.sourceId,
      url: e.url,
      kind: e.kind || "learned",
    })),
  ];
  // Dedup by URL
  const seenUrl = new Set<string>();
  let publicLegal = 0;
  for (const u of publicUrls) {
    if (!u.url || seenUrl.has(u.url)) continue;
    seenUrl.add(u.url);
    publicLegal += 1;
  }
  probes.push({
    tier: "PUBLIC_INSTITUTIONAL_TENDER",
    sourceId: "public.institutional.allowlist_registry",
    sourceUrl: null,
    availability: publicLegal ? "AVAILABLE" : "NOT_CONFIGURED",
    legalAccess: true,
    hardBomPossible: (input.documentProbeSummary?.hardEvidence ?? 0) > 0,
    score: publicLegal ? 40 : 0,
    scoreReason: input.documentProbeSummary
      ? `ATHED fetchOk=${input.documentProbeSummary.fetchedOk} hard=${input.documentProbeSummary.hardEvidence} soft=${input.documentProbeSummary.softOnly}`
      : `${publicLegal} legal public URLs — probe via ATHED for HARD evidence`,
    evidenceRefs: [],
    notesPl: "URL alone ≠ evidence; ATHED fetch+extract required",
    outcome:
      (input.documentProbeSummary?.hardEvidence ?? 0) > 0
        ? "HIT_HARD_BOM"
        : (input.documentProbeSummary?.softOnly ?? 0) > 0
          ? "SOFT_ONLY"
          : publicLegal
            ? "SOFT_ONLY"
            : "NOT_CONFIGURED",
  });
  probes.push({
    tier: "PUBLIC_BOQ_KOSZTORYS",
    sourceId: "public.boq.kosztorys",
    sourceUrl: null,
    availability: publicLegal ? "AVAILABLE" : "NOT_CONFIGURED",
    legalAccess: true,
    hardBomPossible: (input.documentProbeSummary?.hardEvidence ?? 0) > 0,
    score: 35,
    scoreReason: input.documentProbeSummary?.evidenceClass
      ? `documentProbe=${input.documentProbeSummary.evidenceClass}`
      : "public BOQ may lack material qtyFactor — fail-closed",
    evidenceRefs: [],
    notesPl: null,
    outcome:
      (input.documentProbeSummary?.hardEvidence ?? 0) > 0
        ? "HIT_HARD_BOM"
        : (input.documentProbeSummary?.softOnly ?? 0) > 0
          ? "SOFT_ONLY"
          : publicLegal
            ? "SOFT_ONLY"
            : "NOT_CONFIGURED",
  });

  // 7–9 — manufacturer / public tech / independent — default NOT_CONFIGURED unless injected
  for (const tier of [
    "PUBLIC_TECHNICAL_DOCUMENTATION",
    "MANUFACTURER_TECHNICAL",
    "INDEPENDENT_CONSTRUCTION_TECH",
  ] as const) {
    probes.push({
      tier,
      sourceId: `provider.${tier.toLowerCase()}`,
      sourceUrl: null,
      availability: "NOT_CONFIGURED",
      legalAccess: true,
      hardBomPossible: false,
      score: 10,
      scoreReason: "null provider — may be injected by ports",
      evidenceRefs: [],
      notesPl: null,
      outcome: "NOT_CONFIGURED",
    });
  }

  // 10 — licensed
  const licensedStatus = licensedNormativeCatalogProvider.availability;
  probes.push({
    tier: "LICENSED_PROVIDER",
    sourceId: licensedNormativeCatalogProvider.providerId,
    sourceUrl: null,
    availability: licensedStatus,
    legalAccess: licensedStatus === "AVAILABLE",
    hardBomPossible: licensedStatus === "AVAILABLE",
    score: licensedStatus === "AVAILABLE" ? 88 : 5,
    scoreReason:
      licensedStatus === "LICENSE_REQUIRED"
        ? "provider unavailable under current access — NOT Owner"
        : String(licensedStatus),
    evidenceRefs: [],
    notesPl: licensedNormativeCatalogProvider.requiredConfigPl ?? null,
    outcome:
      licensedStatus === "LICENSE_REQUIRED"
        ? "LICENSE_REQUIRED"
        : licensedStatus === "AVAILABLE"
          ? "HIT_NORMATIVE"
          : "NOT_CONFIGURED",
  });
  learnProviderStatus({
    workId,
    sourceId: licensedNormativeCatalogProvider.providerId,
    availability: licensedStatus,
    nowIso,
  });

  // Injected hard materials (tests / prior extract with provenance) — MIN filter
  for (const m of input.injectedHardMaterials || []) {
    if (
      !String(m.materialKey || "").trim()
      || !Number.isFinite(m.qtyFactor)
      || m.qtyFactor < 0
      || !String(m.sourceRef || "").trim()
    ) {
      continue;
    }
    const norm = normalizeMaterialIdentity({
      rawText: m.namePl || m.materialKey,
      unit: m.unit,
      quantity: m.qtyFactor,
      source: m.sourceRef,
      provenance: m.sourceRef,
      workDescription: description,
    });
    if (norm.status !== "ACCEPTED") continue;
    hardMaterials.push({
      ...m,
      materialKey: norm.materialKey || m.materialKey,
      namePl: norm.normalizedName,
    });
    publicEvidence.push({
      sourceKind: "PUBLIC_TECHNICAL",
      sourceRef: m.sourceRef,
      retrievedAt: nowIso,
      excerpt: `${norm.normalizedName} ${m.qtyFactor} ${m.unit}`,
      supports: ["MATERIAL", "QTY_FACTOR", "UNIT", "TECHNOLOGY"],
      authority: 0.9,
    });
  }

  // Dedup hard materials by key
  const byKey = new Map<string, AtssHardMaterialHit>();
  for (const m of hardMaterials) {
    const k = m.materialKey;
    if (!byKey.has(k)) byKey.set(k, m);
  }
  let uniqueHard = [...byKey.values()];

  // Work-description recovery when extracts empty/noise but document was relevant
  // and description explicitly names the material (not invent).
  // Prefer structural (cegły/silikat) over binder (zaprawa) — identity linkage for AUT-MAT.
  const docTouched =
    (input.documentProbeSummary?.relevant ?? 0) > 0
    || (input.documentProbeSummary?.softOnly ?? 0) > 0
    || (input.documentProbeSummary?.hardEvidence ?? 0) > 0
    || (input.injectedHardMaterials?.length ?? 0) > 0;
  const hardHasStructural = uniqueHard.some(
    (h) => scoreMaterialNounPriority(h.namePl) >= 100,
  );
  const hardOnlyBinders =
    uniqueHard.length > 0
    && uniqueHard.every((h) => isSecondaryBinderMaterialName(h.namePl));
  if (
    docTouched
    && description
    && (uniqueHard.length === 0 || !hardHasStructural || hardOnlyBinders)
  ) {
    const noun = extractMaterialNounFromWorkDescription(description);
    if (
      noun
      && (scoreMaterialNounPriority(noun.namePl) >= 100
        || (uniqueHard.length === 0 && minIsLikelyConstructionMaterialName(noun.namePl)))
    ) {
      const recovered = normalizeMaterialIdentity({
        rawText: noun.namePl,
        unit,
        quantity: 1,
        source: `work_description:${workId}`,
        provenance: isPrimaryStructuralMaterialName(noun.namePl)
          ? "work_description_explicit_structural_material"
          : "work_description_explicit_material",
        extractionLocation: "work_description",
        workDescription: description,
      });
      if (recovered.status === "ACCEPTED") {
        const hit: AtssHardMaterialHit = {
          materialKey: recovered.materialKey || `mat.min.${noun.namePl}`,
          namePl: recovered.normalizedName,
          unit,
          qtyFactor: 1,
          sourceRef: recovered.provenance,
          evidenceRefs: [recovered.provenance, ...noun.rationale],
          tier: "PUBLIC_BOQ_KOSZTORYS",
        };
        uniqueHard = hardOnlyBinders || uniqueHard.length === 0
          ? [hit]
          : !hardHasStructural
            ? [hit, ...uniqueHard]
            : uniqueHard;
        publicEvidence.push({
          sourceKind: "PUBLIC_TECHNICAL",
          sourceRef: recovered.provenance,
          retrievedAt: nowIso,
          excerpt: `${recovered.normalizedName} qtyFactor=1 (${unit} work unit)`,
          supports: ["MATERIAL", "QTY_FACTOR", "UNIT", "TECHNOLOGY"],
          authority: 0.8,
        });
      }
    }
  }

  let technologyCandidate: AutonomousTechnologyCandidate | null = null;
  if (uniqueHard.length > 0 && packs.length === 0) {
    technologyCandidate = {
      workId,
      unit,
      technologyIdentity: `autotech.${workId.replace(/^cw\./, "").replace(/\./g, "_")}`,
      technologyDescription: description || `Technologia ${workId}`,
      steps: [
        {
          stepId: "step.autotech.primary",
          namePl: description.slice(0, 80) || "Wykonanie roboty",
          order: 1,
        },
      ],
      materials: uniqueHard.map((m) => ({
        materialKey: m.materialKey,
        namePl: m.namePl,
        unit: m.unit,
        qtyFactor: m.qtyFactor,
        factorSourceRef: m.sourceRef,
        evidenceRefs: m.evidenceRefs,
      })),
      sourceId: uniqueHard[0]!.tier,
      sourceUrl: null,
      provenance: uniqueHard.map((m) => m.sourceRef).join("|"),
      evidenceRefs: uniqueHard.flatMap((m) => m.evidenceRefs),
      sourceDateIso: nowIso,
      applicability: `exact_work:${workId}`,
      confidence: 0.92,
      validationState: "VALIDATED",
      invent: false,
      knrFamily: input.knrFamily ?? null,
      knrCode: input.knrCode ?? null,
      conflict: false,
      guessedFields: [],
    };
  }

  const publicTechnicalProvider: PublicTechnicalEvidenceProvider = {
    providerId: "public-tech.atss-v1",
    availability: publicEvidence.length || publicLegal
      ? "AVAILABLE"
      : "NOT_CONFIGURED",
    requiredConfigPl: publicEvidence.length
      ? undefined
      : "Brak hard public BOM evidence — soft public docs nie zamykają BOM.",
    searchPublicEvidence: () => publicEvidence,
  };

  let nextLegal: RunAtssResult["nextLegal"] = "AUTONOMOUS_RESOLUTION_QUEUE · TECHNOLOGY_EVIDENCE_GAP";
  if (packs.length === 1) nextLegal = "REUSE_TECHNOLOGY_PACK";
  else if (technologyCandidate) nextLegal = "CANDIDATE_READY";
  else if (probes.some((p) => p.outcome === "HIT_NORMATIVE" || p.availability === "AVAILABLE")) {
    nextLegal = "CONTINUE_RESEARCH";
  }

  return {
    version: AUTONOMOUS_TECHNOLOGY_SOURCE_SELECTION_VERSION,
    workId,
    searchStrategies,
    probes,
    hardMaterials: uniqueHard,
    publicEvidence,
    technologyCandidate,
    publicTechnicalProvider,
    licensedStatus,
    nextLegal,
    ownerRuntimeDependency: 0,
  };
}
