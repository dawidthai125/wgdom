/**
 * AUTONOMOUS TECHNOLOGY EVIDENCE DISCOVERY (ATESD-v1)
 *
 * Layers: DISCOVERY → EVIDENCE → CANDIDATE → VALIDATION → ATA → ACTIVE pack → AUTO_BOM
 * Extends existing research path (ATSS + runIkBomTechnologyResearch + ATA).
 * ZERO invent · ZERO TPI pack · ZERO Owner runtime · dry-run safe.
 */

import { evaluateAutoBomContract } from "@/lib/intelligent-estimator/orchestra/auto-g2-accept-contract";
import { runIkBomTechnologyResearch } from "@/lib/intelligent-estimator/ik-bom-technology-research-engine";
import {
  runAutonomousTechnologySourceSelection,
  type AtssSourceProbe,
} from "@/lib/intelligent-estimator/autonomous-technology-source-selection";
import {
  runAutonomousTechnologyHardEvidenceDiscovery,
  type AthedDocumentProbe,
  type RunAthedResult,
} from "@/lib/intelligent-estimator/autonomous-technology-hard-evidence-discovery";
import {
  buildActiveTechnologyPackFromAcceptedCandidate,
  evaluateAutonomousTechnologyAcceptContract,
  type AutonomousTechnologyAcceptResult,
  type AutonomousTechnologyCandidate,
} from "@/lib/intelligent-estimator/autonomous-technology-accept-contract";
import {
  upsertTechnologyEvidenceKnowledge,
} from "@/lib/intelligent-estimator/technology-evidence-knowledge";
import { evaluateAutMatMaterialAcceptContract } from "@/lib/price-intelligence/aut-mat-accept-contract";
import {
  runAutonomousMaterialPriceEvidenceDiscovery,
  type RunAmpedResult,
} from "@/lib/price-intelligence/autonomous-material-price-evidence-discovery";
import { isExplicitLaborOnlyWork } from "@/lib/tender-position-cost/labor-only-classification";
import { isLaborOnlyAutoBomV1Eligible } from "@/lib/intelligent-estimator/orchestra/labor-only-auto-bom-v1-contract";
import { loadKnrDiscoveryEvidenceStoreLocal } from "@/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-store";
import type { KnrDiscoveryEvidenceStore } from "@/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-types";
import {
  findActiveTechnologyPacksForWorkId,
} from "@/lib/tender-position-cost/bom-technology-adapter";
import { isOwnerRuntimeDependencyCode } from "@/lib/work-catalog/autonomous-identity-resolution-v2";
import { registerCapability, seedBaselineCapabilities } from "@/lib/technology-foundation/definition-registry";
import { registerDefinition } from "@/lib/technology-foundation/technology-definition";
import { getPack, registerPack } from "@/lib/technology-foundation/pack-registry";
import type { TechnologyPack } from "@/lib/technology-foundation/types";
import type { KnrCatalogStore } from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-store";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";

export const AUTONOMOUS_TECHNOLOGY_EVIDENCE_DISCOVERY_VERSION = "ATESD-v1.1" as const;

export type AtesdLeafInput = {
  catalogWorkId: string;
  description: string;
  unit: string;
  label?: string;
  quantity?: number;
  ourRateEligible: boolean;
  knrFamily?: string | null;
  knrCode?: string | null;
  knownPublicSourceUrls?: readonly { sourceId: string; url: string; kind?: string }[] | null;
};

export type AtesdItemResult = {
  label: string | null;
  catalogWorkId: string;
  ourRateEligible: boolean;
  atss: {
    nextLegal: string;
    probes: AtssSourceProbe[];
    hardMaterialCount: number;
    licensedStatus: string;
    searchStrategies: string[];
  };
  athed: {
    performed: boolean;
    evidenceClass: string | null;
    totals: RunAthedResult["totals"] | null;
    probes: AthedDocumentProbe[];
    nextLegal: string | null;
  };
  research: {
    performed: boolean;
    status: string | null;
    writeClass: string | null;
    remappedStatus: string | null;
    candidateCount: number;
    rejects: string[];
  };
  technologyCandidate: {
    present: boolean;
    technologyIdentity: string | null;
    materialCount: number;
    invent: false;
  };
  accept: AutonomousTechnologyAcceptResult | null;
  technologyPack: {
    eligible: boolean;
    built: boolean;
    packId: string | null;
    packVersion: string | null;
    persisted: false;
  };
  autoBom: {
    decision: string;
    reasons: string[];
    resolved: boolean;
  };
  mat: {
    decision: string;
    resolved: boolean;
    ampedVersion: string | null;
    materialCount: number;
    acceptedCount: number;
    gapCount: number;
    conflictCount: number;
    lines: Array<{
      materialKey: string;
      namePl: string;
      unit: string;
      qtyFactor: number;
      identityTrusted: boolean;
      candidatePresent: boolean;
      priceNet: number | null;
      autMatDecision: string;
      nextLegal: string;
    }>;
  };
  financeReady: boolean;
  /** Technology track next-legal (independent of OUR RATE). */
  technologyNextLegal: string;
  /** Labor track next-legal (OUR RATE gap / CURRENT) — never blocks ATA_BOM_ONLY. */
  laborNextLegal: string;
  /** Composed: technology · labor (backward-compatible single field). */
  nextLegal: string;
  ownerRuntimeDependency: 0;
};

/** Remap legacy OWNER_* research vocabulary → autonomous queue (global seam). */
export function remapTechnologyOwnerStatus(
  status: string | null | undefined,
): string | null {
  if (!status) return null;
  if (
    status === "OWNER_REQUIRED"
    || /OWNER_REQUIRED|OWNER_TECHNOLOGY|OWNER_CREATE_PACK|OWNER_BOM/i.test(status)
  ) {
    return "AUTONOMOUS_RESOLUTION_REQUIRED · TECHNOLOGY_EVIDENCE_GAP";
  }
  return null;
}

export function ensureAutonomousTechnologyDefsRegistered(): void {
  seedBaselineCapabilities();
  try {
    registerCapability({
      capabilityId: "cap.autonomous_technology",
      namePl: "Autonomous technology (evidence-backed)",
    });
  } catch {
    /* already */
  }
  try {
    registerDefinition({
      definitionId: "def.autonomous.technology.v1",
      capabilityId: "cap.autonomous_technology",
      namePl: "Definicja autonomous technology v1",
    });
  } catch {
    /* already */
  }
}

export function runAutonomousTechnologyEvidenceDiscoveryItem(input: {
  store: WorkCatalogStore;
  packs: readonly TechnologyPack[];
  item: AtesdLeafInput;
  knrCatalogStore?: KnrCatalogStore | null;
  nowMs?: number;
  tenderId?: string;
  /** Dry-run: register accepted pack into in-memory registry for AUTO_BOM probe. */
  registerAcceptedPackInMemory?: boolean;
  /** Optional ATHED result (from async path) — injects HARD materials into ATSS. */
  athedResult?: RunAthedResult | null;
  /** Optional AMPED result (from async path) — AUT-MAT per BOM material. */
  ampedResult?: RunAmpedResult | null;
  /** LABOR_ONLY_AUTO_BOM_V1 — default local discovery store; null disables. */
  discoveryStore?: KnrDiscoveryEvidenceStore | null;
}): {
  result: AtesdItemResult;
  packs: TechnologyPack[];
} {
  const nowMs = input.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const it = input.item;
  let packs: TechnologyPack[] = [...input.packs];
  ensureAutonomousTechnologyDefsRegistered();

  const discoveryStore =
    input.discoveryStore === undefined
      ? loadKnrDiscoveryEvidenceStoreLocal()
      : input.discoveryStore;
  const laborOnly =
    isExplicitLaborOnlyWork(it.catalogWorkId)
    || isLaborOnlyAutoBomV1Eligible(it.catalogWorkId, {
      unit: it.unit,
      discoveryStore,
      nowMs,
    });
  const packsHit = findActiveTechnologyPacksForWorkId(it.catalogWorkId, packs);

  const athed = input.athedResult ?? null;
  const atss = runAutonomousTechnologySourceSelection({
    workId: it.catalogWorkId,
    description: it.description,
    unit: it.unit,
    knrFamily: it.knrFamily,
    knrCode: it.knrCode,
    packs,
    knrCatalogStore: input.knrCatalogStore ?? null,
    nowIso,
    knownPublicSourceUrls: it.knownPublicSourceUrls,
    injectedHardMaterials: athed?.hardMaterials ?? null,
    documentProbeSummary: athed
      ? {
          fetchedOk: athed.totals.fetchedOk,
          extractable: athed.totals.extractable,
          relevant: athed.totals.relevant,
          softOnly: athed.totals.softOnly,
          hardEvidence: athed.totals.hardEvidence,
          evidenceClass: athed.evidenceClass,
        }
      : null,
  });

  let researchPerformed = false;
  let researchStatus: string | null = null;
  let writeClass: string | null = null;
  let remappedStatus: string | null = null;
  let researchRejects: string[] = [];
  let researchCandidateCount = 0;
  let candidate: AutonomousTechnologyCandidate | null = atss.technologyCandidate;

  // Existing pack or LABOR_ONLY — no invent path
  if (packsHit.length === 1 || laborOnly) {
    // fall through to AUTO_BOM
  } else if (it.ourRateEligible) {
    // Optional research enrichment still gated on OUR RATE (labor-adjacent research path).
    // HARD ATHED→ATSS candidate does NOT require OUR RATE (ATA_BOM_ONLY below).
    researchPerformed = true;
    const tech = runIkBomTechnologyResearch({
      tenderId: input.tenderId || "autonomous-technology-evidence",
      dwellingId: "atesd-dwelling",
      lineId: `atesd:${it.catalogWorkId}`,
      workId: it.catalogWorkId,
      unit: it.unit,
      quantity: it.quantity ?? 1,
      description: it.description,
      knrCatalogStore: input.knrCatalogStore ?? null,
      nowMs,
      publicTechnical: atss.publicTechnicalProvider,
      bomGapPorts: { extraPacks: packs },
    });
    researchStatus = tech.status;
    writeClass = tech.writeClass;
    remappedStatus = remapTechnologyOwnerStatus(tech.status)
      || remapTechnologyOwnerStatus(tech.writeClass);
    researchRejects = tech.validation?.rejects || tech.diagnostics?.reasons || [];
    if (tech.bomCandidate?.materials?.length && tech.validation?.ok) {
      researchCandidateCount = 1;
      if (!candidate) {
        candidate = {
          workId: it.catalogWorkId,
          unit: it.unit,
          technologyIdentity:
            String(tech.bomCandidate.technologyId || "")
              .replace(/@.*$/, "")
              .replace(/^ephemeral\./, "autotech.")
            || `autotech.${it.catalogWorkId.replace(/^cw\./, "").replace(/\./g, "_")}`,
          technologyDescription:
            tech.bomCandidate.technologyDescription || it.description,
          steps: [
            {
              stepId: "step.research.primary",
              namePl: it.description.slice(0, 80) || "Wykonanie",
              order: 1,
            },
          ],
          materials: tech.bomCandidate.materials.map((m) => ({
            materialKey: m.materialKey,
            namePl: m.description,
            unit: m.unit,
            qtyFactor: m.qtyFactor,
            factorSourceRef: m.evidence?.[0]?.sourceRef || "research",
            evidenceRefs: (m.evidence || []).map((e) => e.sourceRef),
          })),
          sourceId: tech.bomCandidate.sourceType,
          sourceUrl: null,
          provenance: (tech.evidence || []).map((e) => e.sourceRef).join("|") || "research",
          evidenceRefs: (tech.evidence || []).map((e) => e.sourceRef),
          sourceDateIso: nowIso,
          applicability: `exact_work:${it.catalogWorkId}`,
          confidence: tech.bomCandidate.confidence?.finalConfidence ?? 0,
          validationState: tech.validation?.ok ? "VALIDATED" : "UNVERIFIED",
          invent: false,
          knrFamily: it.knrFamily ?? null,
          knrCode: it.knrCode ?? null,
          conflict: false,
          guessedFields: [],
        };
      }
    }
  }

  let accept: AutonomousTechnologyAcceptResult | null = null;
  let packBuilt = false;
  let packId: string | null = null;
  let packVersion: string | null = null;

  // ATA_BOM_ONLY (ATA-v1.1): OUR RATE must NOT gate technology accept / pack build.
  if (candidate && packsHit.length === 0 && !laborOnly) {
    accept = evaluateAutonomousTechnologyAcceptContract({
      candidate,
      expectedWorkId: it.catalogWorkId,
      expectedUnit: it.unit,
      packs,
      nowMs,
    });
    if (
      accept.decision === "AUTONOMOUS_TECHNOLOGY_ACCEPT"
      && accept.mayBuildActivePack
    ) {
      const pack = buildActiveTechnologyPackFromAcceptedCandidate(candidate, accept);
      if (pack) {
        packBuilt = true;
        packId = pack.packId;
        packVersion = pack.packVersion;
        packs = [...packs.filter((p) => !(p.packId === pack.packId && p.packVersion === pack.packVersion)), pack];
        if (input.registerAcceptedPackInMemory) {
          if (!getPack(pack.packId, pack.packVersion)) {
            try {
              registerPack(pack);
            } catch {
              /* immutable clash — keep run-scoped */
            }
          }
        }
        upsertTechnologyEvidenceKnowledge({
          id: `tek:validated:${it.catalogWorkId}:${pack.packId}`,
          kind: "VALIDATED_CANDIDATE_REF",
          workId: it.catalogWorkId,
          technologyIdentity: candidate.technologyIdentity,
          sourceUrl: candidate.sourceUrl,
          sourceId: candidate.sourceId,
          applicability: candidate.applicability,
          evidenceRefs: candidate.evidenceRefs,
          validationState: "VALIDATED",
          provenance: candidate.provenance,
          freshnessIso: nowIso,
          searchStrategy: null,
          payload: {
            packId: pack.packId,
            packVersion: pack.packVersion,
            materials: candidate.materials,
          },
          invent: false,
        });
      }
    }
  }

  const line = {
    catalogWorkId: it.catalogWorkId,
    unit: it.unit,
    quantity: it.quantity ?? 1,
    matchMethod: "exact_knr" as const,
    matchConfidence: "high" as const,
    isNoise: false,
    description: it.description,
  };
  const bom = evaluateAutoBomContract({
    line: line as never,
    packs,
    nowMs,
    requireTrustedIdentity: true,
    discoveryStore,
  });
  const bomResolved = bom.decision === "AUTO_BOM_ACCEPT";

  let matDecision = "SKIPPED_NO_BOM";
  let matResolved = false;
  let matAmpedVersion: string | null = null;
  let matMaterialCount = 0;
  let matAcceptedCount = 0;
  let matGapCount = 0;
  let matConflictCount = 0;
  let matLines: AtesdItemResult["mat"]["lines"] = [];
  if (bomResolved) {
    if (laborOnly || (bom.provenance as { mode?: string })?.mode === "LABOR_ONLY") {
      matDecision = "NOT_REQUIRED_LABOR_ONLY";
      matResolved = true;
    } else if (input.ampedResult) {
      matAmpedVersion = input.ampedResult.version;
      matMaterialCount = input.ampedResult.materialCount;
      matAcceptedCount = input.ampedResult.accepted;
      matGapCount = input.ampedResult.gaps;
      matConflictCount = input.ampedResult.conflicts;
      matLines = input.ampedResult.lines.map((l) => ({
        materialKey: l.materialKey,
        namePl: l.namePl,
        unit: l.unit,
        qtyFactor: l.qtyFactor,
        identityTrusted: l.identityTrusted,
        candidatePresent: l.candidatePresent,
        priceNet: l.candidatePriceNet,
        autMatDecision: l.autMat.decision,
        nextLegal: l.nextLegal,
      }));
      matResolved = input.ampedResult.allMatReady;
      matDecision = matResolved
        ? "AUT_MAT_ACCEPT"
        : input.ampedResult.conflicts > 0
        ? "AUT_MAT_EXCEPTION · MATERIAL_EVIDENCE_CONFLICT"
        : "AUT_MAT_EXCEPTION · MATERIAL_EVIDENCE_GAP";
    } else {
      // Sync path without AMPED — honest gap (async path runs AMPED).
      const worksById = new Map(
        [
          ...(input.store.catalogs.wroclaw?.works || []),
          ...(input.store.catalogs.dolnyslask?.works || []),
        ].map((w) => [w.id, w]),
      );
      const mat = evaluateAutMatMaterialAcceptContract({
        worksById,
        candidate: null,
        expectedUnit: it.unit,
        identityTrusted: true,
        nowMs,
      });
      matDecision = mat.decision;
      matResolved = mat.decision === "AUT_MAT_ACCEPT";
      matMaterialCount = candidate?.materials.length ?? 0;
    }
  }

  const financeReady =
    it.ourRateEligible
    && bomResolved
    && (laborOnly || matResolved || (bom.provenance as { mode?: string })?.mode === "LABOR_ONLY");

  // LABOR track — independent; missing OUR RATE never blocks ATA_BOM_ONLY.
  const laborNextLegal = it.ourRateEligible
    ? "OUR_RATE_CURRENT"
    : "AUTONOMOUS_LABOR_RESEARCH · KEEP4_OR_CONFLICT";

  // TECHNOLOGY track — ATA_BOM_ONLY / AUTO_BOM / AUT-MAT (no ourRate gate).
  let technologyNextLegal = "AUTONOMOUS_RESOLUTION_QUEUE · TECHNOLOGY_EVIDENCE_GAP";
  if (bomResolved) {
    if (financeReady) {
      technologyNextLegal = "CONTINUE_FINANCE_WHEN_QUANTITY_OK";
    } else if (!it.ourRateEligible) {
      technologyNextLegal = matResolved || laborOnly
        ? "TECHNOLOGY_BOM_READY · AWAITING_OUR_RATE_FOR_POSITION_COST"
        : (input.ampedResult?.nextLegal
          || "TECHNOLOGY_BOM_READY · CONTINUE_AUT_MAT_WHEN_MATERIALS_REQUIRED");
    } else {
      technologyNextLegal = input.ampedResult?.nextLegal
        || "CONTINUE_AUT_MAT_WHEN_MATERIALS_REQUIRED";
    }
  } else if (accept?.decision === "AUTONOMOUS_TECHNOLOGY_EXCEPTION") {
    technologyNextLegal =
      "AUTONOMOUS_RESOLUTION_REQUIRED · TECHNOLOGY_CANDIDATE_VALIDATION_FAILED";
  } else if (athed?.evidenceClass === "SOFT_ONLY") {
    technologyNextLegal =
      "AUTONOMOUS_RESOLUTION_QUEUE · TECHNOLOGY_EVIDENCE_GAP · SOFT_ONLY_NO_HARD_BOM";
  } else if (researchStatus === "NO_EVIDENCE" || athed?.evidenceClass === "NO_EVIDENCE") {
    technologyNextLegal = "AUTONOMOUS_RESOLUTION_QUEUE · TECHNOLOGY_EVIDENCE_GAP";
  } else if (remappedStatus) {
    technologyNextLegal = remappedStatus;
  } else if (atss.nextLegal === "CONTINUE_RESEARCH") {
    technologyNextLegal = "CONTINUE_PARTIAL_AUTONOMOUS · ATSS_PROVIDER_LADDER";
  } else if (atss.nextLegal === "CANDIDATE_READY" && !accept) {
    technologyNextLegal = "CANDIDATE_READY · ATA_BOM_ONLY_PENDING";
  } else if (accept?.decision === "AUTONOMOUS_TECHNOLOGY_ACCEPT" && packBuilt) {
    technologyNextLegal = "ATA_BOM_ONLY_ACCEPT · PACK_BUILT · AUTO_BOM_EVALUATED";
  }

  if (
    isOwnerRuntimeDependencyCode(technologyNextLegal)
    || /OWNER_/i.test(technologyNextLegal)
  ) {
    technologyNextLegal = "AUTONOMOUS_RESOLUTION_QUEUE · TECHNOLOGY_EVIDENCE_GAP";
  }

  const nextLegal =
    it.ourRateEligible || technologyNextLegal.includes("KEEP4")
      ? technologyNextLegal
      : `${technologyNextLegal} · ${laborNextLegal}`;

  return {
    packs,
    result: {
      label: it.label ?? null,
      catalogWorkId: it.catalogWorkId,
      ourRateEligible: it.ourRateEligible,
      atss: {
        nextLegal: atss.nextLegal,
        probes: atss.probes,
        hardMaterialCount: atss.hardMaterials.length,
        licensedStatus: atss.licensedStatus,
        searchStrategies: atss.searchStrategies,
      },
      athed: {
        performed: Boolean(athed),
        evidenceClass: athed?.evidenceClass ?? null,
        totals: athed?.totals ?? null,
        probes: athed?.probes ?? [],
        nextLegal: athed?.nextLegal ?? null,
      },
      research: {
        performed: researchPerformed,
        status: researchStatus,
        writeClass,
        remappedStatus,
        candidateCount: researchCandidateCount + (candidate ? 1 : 0),
        rejects: researchRejects,
      },
      technologyCandidate: {
        present: Boolean(candidate),
        technologyIdentity: candidate?.technologyIdentity ?? null,
        materialCount: candidate?.materials.length ?? 0,
        invent: false,
      },
      accept,
      technologyPack: {
        eligible: Boolean(
          accept?.decision === "AUTONOMOUS_TECHNOLOGY_ACCEPT" || packsHit.length === 1,
        ),
        built: packBuilt,
        packId: packId || packsHit[0]?.packId || null,
        packVersion: packVersion || packsHit[0]?.packVersion || null,
        persisted: false,
      },
      autoBom: {
        decision: bom.decision,
        reasons: bom.reasons || [],
        resolved: bomResolved,
      },
      mat: {
        decision: matDecision,
        resolved: matResolved,
        ampedVersion: matAmpedVersion,
        materialCount: matMaterialCount,
        acceptedCount: matAcceptedCount,
        gapCount: matGapCount,
        conflictCount: matConflictCount,
        lines: matLines,
      },
      financeReady: Boolean(financeReady),
      technologyNextLegal,
      laborNextLegal,
      nextLegal,
      ownerRuntimeDependency: 0,
    },
  };
}

/** Async path: ATHED fetch+extract → ATSS/ATA (independent per item). */
export async function runAutonomousTechnologyEvidenceDiscoveryItemAsync(input: {
  store: WorkCatalogStore;
  packs: readonly TechnologyPack[];
  item: AtesdLeafInput;
  knrCatalogStore?: KnrCatalogStore | null;
  nowMs?: number;
  tenderId?: string;
  registerAcceptedPackInMemory?: boolean;
  athedFetchImpl?: Parameters<typeof runAutonomousTechnologyHardEvidenceDiscovery>[0]["fetchImpl"];
  athedMaxProbes?: number;
  disableAthedFetch?: boolean;
  athedSourceUrlsOverride?: Parameters<
    typeof runAutonomousTechnologyHardEvidenceDiscovery
  >[0]["sourceUrlsOverride"];
  /** Skip live DIY HTTP for AUT-MAT (tests). */
  disableAmpedLive?: boolean;
  ampedDiyLookup?: Parameters<
    typeof runAutonomousMaterialPriceEvidenceDiscovery
  >[0]["diyLookup"];
  /** LABOR_ONLY_AUTO_BOM_V1 — default local; null disables. */
  discoveryStore?: KnrDiscoveryEvidenceStore | null;
}): Promise<{
  result: AtesdItemResult;
  packs: TechnologyPack[];
  athed: RunAthedResult;
  amped: RunAmpedResult | null;
}> {
  const nowMs = input.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const athed = await runAutonomousTechnologyHardEvidenceDiscovery({
    workId: input.item.catalogWorkId,
    description: input.item.description,
    unit: input.item.unit,
    knrFamily: input.item.knrFamily,
    knrCode: input.item.knrCode,
    knownPublicSourceUrls: input.item.knownPublicSourceUrls,
    nowIso,
    maxProbes: input.athedMaxProbes ?? 10,
    fetchImpl: input.athedFetchImpl,
    disableFetch: input.disableAthedFetch === true,
    sourceUrlsOverride: input.athedSourceUrlsOverride,
  });
  let one = runAutonomousTechnologyEvidenceDiscoveryItem({
    ...input,
    nowMs,
    athedResult: athed,
  });

  let amped: RunAmpedResult | null = null;
  if (
    one.result.autoBom.resolved
    && (one.result.technologyCandidate.present || one.result.technologyPack.built
      || one.result.technologyPack.eligible)
    && one.result.mat.decision !== "NOT_REQUIRED_LABOR_ONLY"
  ) {
    // Materials from accepted candidate / built pack (prefer pack materials)
    const packMats =
      one.packs
        .find(
          (p) =>
            p.packId === one.result.technologyPack.packId
            && p.packVersion === one.result.technologyPack.packVersion,
        )
        ?.materials
      ?? [];
    const materials = (packMats.length
      ? packMats
      : athed.hardMaterials.map((h) => ({
          materialKey: h.materialKey,
          namePl: h.namePl,
          unit: h.unit,
          qtyFactor: h.qtyFactor,
          factorSourceRef: h.sourceRef,
        }))
    ).map((m) => ({
      materialKey: m.materialKey,
      namePl: m.namePl,
      unit: m.unit,
      qtyFactor: m.qtyFactor,
      parentCatalogWorkId: input.item.catalogWorkId,
      factorSourceRef: "factorSourceRef" in m ? m.factorSourceRef : null,
    }));

    if (materials.length > 0) {
      const worksById = new Map(
        [
          ...(input.store.catalogs.wroclaw?.works || []),
          ...(input.store.catalogs.dolnyslask?.works || []),
        ].map((w) => [w.id, w]),
      );
      amped = await runAutonomousMaterialPriceEvidenceDiscovery({
        materials,
        worksById,
        nowMs,
        region: input.store.activeRegion || "wroclaw",
        technologyBomIdentityTrusted: true,
        workDescription: input.item.description,
        diyLookup: input.ampedDiyLookup,
        disableLiveResearch: input.disableAmpedLive === true,
      });

      // Patch MAT onto first-pass result — do NOT re-run ATA (avoids packsHit wiping candidate).
      const matResolved = amped.allMatReady;
      const matDecision = matResolved
        ? "AUT_MAT_ACCEPT"
        : amped.conflicts > 0
        ? "AUT_MAT_EXCEPTION · MATERIAL_EVIDENCE_CONFLICT"
        : "AUT_MAT_EXCEPTION · MATERIAL_EVIDENCE_GAP";
      const financeReady =
        one.result.ourRateEligible
        && one.result.autoBom.resolved
        && matResolved;
      const laborNextLegal = one.result.ourRateEligible
        ? "OUR_RATE_CURRENT"
        : "AUTONOMOUS_LABOR_RESEARCH · KEEP4_OR_CONFLICT";
      let technologyNextLegal = financeReady
        ? "CONTINUE_FINANCE_WHEN_QUANTITY_OK"
        : !one.result.ourRateEligible
        ? (matResolved
          ? "TECHNOLOGY_BOM_READY · AWAITING_OUR_RATE_FOR_POSITION_COST"
          : amped.nextLegal || "TECHNOLOGY_BOM_READY · CONTINUE_AUT_MAT_WHEN_MATERIALS_REQUIRED")
        : amped.nextLegal;
      if (
        isOwnerRuntimeDependencyCode(technologyNextLegal)
        || /OWNER_/i.test(technologyNextLegal)
      ) {
        technologyNextLegal = "AUTONOMOUS_RESOLUTION_QUEUE · TECHNOLOGY_EVIDENCE_GAP";
      }
      const nextLegal =
        one.result.ourRateEligible || technologyNextLegal.includes("KEEP4")
          ? technologyNextLegal
          : `${technologyNextLegal} · ${laborNextLegal}`;

      one = {
        packs: one.packs,
        result: {
          ...one.result,
          mat: {
            decision: matDecision,
            resolved: matResolved,
            ampedVersion: amped.version,
            materialCount: amped.materialCount,
            acceptedCount: amped.accepted,
            gapCount: amped.gaps,
            conflictCount: amped.conflicts,
            lines: amped.lines.map((l) => ({
              materialKey: l.materialKey,
              namePl: l.namePl,
              unit: l.unit,
              qtyFactor: l.qtyFactor,
              identityTrusted: l.identityTrusted,
              candidatePresent: l.candidatePresent,
              priceNet: l.candidatePriceNet,
              autMatDecision: l.autMat.decision,
              nextLegal: l.nextLegal,
            })),
          },
          financeReady,
          technologyNextLegal,
          laborNextLegal,
          nextLegal,
        },
      };
    }
  }

  return { ...one, athed, amped };
}

export async function runAutonomousTechnologyEvidenceDiscoveryBatchAsync(input: {
  store: WorkCatalogStore;
  packs: readonly TechnologyPack[];
  items: readonly AtesdLeafInput[];
  knrCatalogStore?: KnrCatalogStore | null;
  nowMs?: number;
  tenderId?: string;
  registerAcceptedPackInMemory?: boolean;
  athedFetchImpl?: Parameters<typeof runAutonomousTechnologyHardEvidenceDiscovery>[0]["fetchImpl"];
  athedMaxProbes?: number;
  disableAthedFetch?: boolean;
  disableAmpedLive?: boolean;
  ampedDiyLookup?: Parameters<
    typeof runAutonomousMaterialPriceEvidenceDiscovery
  >[0]["diyLookup"];
  /** LABOR_ONLY_AUTO_BOM_V1 — default local; null disables. */
  discoveryStore?: KnrDiscoveryEvidenceStore | null;
}): Promise<{
  version: typeof AUTONOMOUS_TECHNOLOGY_EVIDENCE_DISCOVERY_VERSION;
  items: AtesdItemResult[];
  packs: TechnologyPack[];
  athedByWorkId: Record<string, RunAthedResult>;
  ampedByWorkId: Record<string, RunAmpedResult>;
  totals: {
    ourRateEligible: number;
    technologyCandidates: number;
    technologyPackEligible: number;
    technologyPackBuilt: number;
    autoBomPass: number;
    matResolved: number;
    financeReady: number;
    techEvidenceGap: number;
    hardEvidenceItems: number;
    softOnlyItems: number;
    ownerRuntimeDependency: 0;
  };
  partialExecution: true;
  microSequencing: false;
}> {
  let packs = [...input.packs];
  const items: AtesdItemResult[] = [];
  const athedByWorkId: Record<string, RunAthedResult> = {};
  const ampedByWorkId: Record<string, RunAmpedResult> = {};
  // Independent per item — parallel-safe sequential for pack merge
  for (const item of input.items) {
    const one = await runAutonomousTechnologyEvidenceDiscoveryItemAsync({
      store: input.store,
      packs,
      item,
      knrCatalogStore: input.knrCatalogStore,
      nowMs: input.nowMs,
      tenderId: input.tenderId,
      registerAcceptedPackInMemory: input.registerAcceptedPackInMemory,
      athedFetchImpl: input.athedFetchImpl,
      athedMaxProbes: input.athedMaxProbes,
      disableAthedFetch: input.disableAthedFetch,
      disableAmpedLive: input.disableAmpedLive,
      ampedDiyLookup: input.ampedDiyLookup,
      discoveryStore: input.discoveryStore,
    });
    packs = one.packs;
    items.push(one.result);
    athedByWorkId[item.catalogWorkId] = one.athed;
    if (one.amped) ampedByWorkId[item.catalogWorkId] = one.amped;
  }
  return {
    version: AUTONOMOUS_TECHNOLOGY_EVIDENCE_DISCOVERY_VERSION,
    items,
    packs,
    athedByWorkId,
    ampedByWorkId,
    totals: {
      ourRateEligible: items.filter((i) => i.ourRateEligible).length,
      technologyCandidates: items.filter((i) => i.technologyCandidate.present).length,
      technologyPackEligible: items.filter((i) => i.technologyPack.eligible).length,
      technologyPackBuilt: items.filter((i) => i.technologyPack.built).length,
      autoBomPass: items.filter((i) => i.autoBom.resolved).length,
      matResolved: items.filter((i) => i.mat.resolved).length,
      financeReady: items.filter((i) => i.financeReady).length,
      techEvidenceGap: items.filter((i) =>
        /TECHNOLOGY_EVIDENCE_GAP|VALIDATION_FAILED|ATSS_PROVIDER/i.test(i.nextLegal),
      ).length,
      hardEvidenceItems: items.filter((i) => i.athed.evidenceClass === "HARD_EVIDENCE").length,
      softOnlyItems: items.filter((i) => i.athed.evidenceClass === "SOFT_ONLY").length,
      ownerRuntimeDependency: 0,
    },
    partialExecution: true,
    microSequencing: false,
  };
}

export function runAutonomousTechnologyEvidenceDiscoveryBatch(input: {
  store: WorkCatalogStore;
  packs: readonly TechnologyPack[];
  items: readonly AtesdLeafInput[];
  knrCatalogStore?: KnrCatalogStore | null;
  nowMs?: number;
  tenderId?: string;
  registerAcceptedPackInMemory?: boolean;
  discoveryStore?: KnrDiscoveryEvidenceStore | null;
}): {
  version: typeof AUTONOMOUS_TECHNOLOGY_EVIDENCE_DISCOVERY_VERSION;
  items: AtesdItemResult[];
  packs: TechnologyPack[];
  totals: {
    ourRateEligible: number;
    technologyCandidates: number;
    technologyPackEligible: number;
    technologyPackBuilt: number;
    autoBomPass: number;
    matResolved: number;
    financeReady: number;
    techEvidenceGap: number;
    ownerRuntimeDependency: 0;
  };
  partialExecution: true;
  microSequencing: false;
} {
  let packs = [...input.packs];
  const items: AtesdItemResult[] = [];
  for (const item of input.items) {
    const one = runAutonomousTechnologyEvidenceDiscoveryItem({
      store: input.store,
      packs,
      item,
      knrCatalogStore: input.knrCatalogStore,
      nowMs: input.nowMs,
      tenderId: input.tenderId,
      registerAcceptedPackInMemory: input.registerAcceptedPackInMemory,
      discoveryStore: input.discoveryStore,
    });
    packs = one.packs;
    items.push(one.result);
  }
  return {
    version: AUTONOMOUS_TECHNOLOGY_EVIDENCE_DISCOVERY_VERSION,
    items,
    packs,
    totals: {
      ourRateEligible: items.filter((i) => i.ourRateEligible).length,
      technologyCandidates: items.filter((i) => i.technologyCandidate.present).length,
      technologyPackEligible: items.filter((i) => i.technologyPack.eligible).length,
      technologyPackBuilt: items.filter((i) => i.technologyPack.built).length,
      autoBomPass: items.filter((i) => i.autoBom.resolved).length,
      matResolved: items.filter((i) => i.mat.resolved).length,
      financeReady: items.filter((i) => i.financeReady).length,
      techEvidenceGap: items.filter((i) =>
        /TECHNOLOGY_EVIDENCE_GAP|VALIDATION_FAILED|ATSS_PROVIDER/i.test(i.nextLegal),
      ).length,
      ownerRuntimeDependency: 0,
    },
    partialExecution: true,
    microSequencing: false,
  };
}
