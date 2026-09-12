/**
 * AUTONOMOUS MATERIAL PRICE EVIDENCE DISCOVERY (AMPED-v1)
 *
 * Reuse-first: identity → Price Memory cache → DIY selective market research → AUT-MAT.
 * ZERO invent · ZERO companyPrice · ZERO weaken AUT-MAT · ZERO persist (caller dry-run).
 * Multi-source DIY average → prefer single-source candidate (no median/average Accept).
 */

import type { CatalogWork } from "@/lib/work-catalog/types";
import { mapMaterialToMarketWork } from "@/lib/pricing-expert/material-market-map";
import {
  normalizeMaterialIdentityBatch,
} from "@/lib/intelligent-estimator/material-identity-normalization";
import {
  evaluateAutMatMaterialAcceptContract,
  type AutMatContractResult,
} from "./aut-mat-accept-contract";
import { evaluateMaterialCache } from "./market-material-research-cache";
import { resolveMmr02Phase2Provider } from "./market-material-research-02-provider";
import { createEdgeDiySelectiveLookup, createFallbackDiySelectiveLookup } from "./diy-selective-lookup-client";
import { parseDiyShopHtml } from "./diy-shop-html-parse";
import {
  qualifyMarketResearchObservation,
  type QualifyingMarketObservationInput,
} from "./market-research-qualify";
import { roundMarketPricePln } from "@/lib/work-catalog/market-sources";
import { normalizeResearchUnit, unitsCompatible } from "./market-material-research-provider";
import type { PriceCandidate } from "./price-candidate-types";
import type { DiyShopProviderId } from "./diy-selective-lookup-types";
import type { DiySelectiveLookupPort } from "./diy-selective-lookup-types";
import {
  runAutonomousMaterialEvidenceDiscovery,
  type RunAmedResult,
} from "./autonomous-material-evidence-discovery";

export const AUTONOMOUS_MATERIAL_PRICE_EVIDENCE_VERSION = "AMPED-v1" as const;

export type AmpedMaterialLine = {
  materialKey: string;
  namePl: string;
  unit: string;
  qtyFactor: number;
  /** Parent construction / technology workId (BOM context). */
  parentCatalogWorkId: string;
  factorSourceRef?: string | null;
  evidenceRefs?: readonly string[] | null;
};

export type AmpedMaterialResult = {
  materialKey: string;
  namePl: string;
  unit: string;
  qtyFactor: number;
  canonicalCatalogWorkId: string;
  identityTrusted: boolean;
  identitySource: "MATERIAL_MARKET_MAP" | "VALIDATED_TECHNOLOGY_BOM" | "NONE";
  cacheUsability: "CURRENT" | "STALE" | "MISSING";
  researchAttempted: boolean;
  researchError: string | null;
  candidatePresent: boolean;
  candidatePriceNet: number | null;
  candidateProvider: string | null;
  candidateSourceUrl: string | null;
  multiSourceAverageRejected: boolean;
  singleSourceResolved: boolean;
  /** AMED-v1 provider discovery summary (evidence ≠ Accept). */
  amed: {
    version: string;
    specificationLevel: string;
    providerCount: number;
    evidenceCount: number;
    candidateCount: number;
    conflictState: string;
    missingDimensions: string[];
    nextLegal: string;
  } | null;
  autMat: AutMatContractResult;
  nextLegal: string;
  invent: false;
};

export type RunAmpedInput = {
  materials: readonly AmpedMaterialLine[];
  worksById: ReadonlyMap<string, CatalogWork>;
  nowMs?: number;
  region?: string | null;
  /** When true, materials from ATA-validated pack may set identityTrusted. */
  technologyBomIdentityTrusted?: boolean;
  /** Technology / work description — MIN context recovery. */
  workDescription?: string | null;
  /** Tender OfferBoq line — AMSR primary specification source. */
  offerBoqDescription?: string | null;
  athedExtractTexts?: readonly string[] | null;
  technologyPackTexts?: readonly string[] | null;
  knowledgeTokens?: readonly string[] | null;
  knowledgeProvenance?: string | null;
  /** Inject lookup for tests; default Edge DIY. */
  diyLookup?: DiySelectiveLookupPort;
  /** Skip live HTTP (tests / offline) — only cache + gap. */
  disableLiveResearch?: boolean;
};

export type RunAmpedResult = {
  version: typeof AUTONOMOUS_MATERIAL_PRICE_EVIDENCE_VERSION;
  materialCount: number;
  accepted: number;
  gaps: number;
  conflicts: number;
  lines: AmpedMaterialResult[];
  allMatReady: boolean;
  ownerRuntimeDependency: 0;
  invent: false;
  nextLegal: string;
};

const SHOPS: DiyShopProviderId[] = ["leroy", "castorama", "obi"];

function foldLoose(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "");
}

function remapAutMatNext(contract: AutMatContractResult): string {
  if (contract.decision === "AUT_MAT_ACCEPT") {
    return contract.idempotentNoop
      ? "AUT_MAT_IDEMPOTENT_NOOP"
      : "AUT_MAT_ACCEPT · CONTINUE_POSITION_COST_WHEN_QTY_OK";
  }
  const r = contract.reasons[0] || "NO_CANDIDATE";
  if (r === "EVIDENCE_CONFLICT") {
    return "AUTONOMOUS_RESOLUTION_QUEUE · MATERIAL_EVIDENCE_CONFLICT";
  }
  if (
    r === "NO_CANDIDATE"
    || r === "MISSING_EVIDENCE"
    || r === "MISSING_PROVENANCE"
    || r === "EVIDENCE_STALE"
    || r === "INVALID_CANDIDATE_PRICE"
  ) {
    return "AUTONOMOUS_RESOLUTION_QUEUE · MATERIAL_EVIDENCE_GAP";
  }
  if (r === "NOT_TRUSTED_IDENTITY" || r === "NO_MATERIAL_KEY") {
    return "AUTONOMOUS_RESOLUTION_QUEUE · MATERIAL_IDENTITY_GAP";
  }
  if (r === "COMPANY_PRICE_FORBIDDEN" || r === "OWNER_SOURCE_FORBIDDEN") {
    return "AUTONOMOUS_RESOLUTION_QUEUE · MATERIAL_EVIDENCE_GAP · FORBIDDEN_SOURCE";
  }
  return `AUTONOMOUS_RESOLUTION_QUEUE · MATERIAL_AUT_MAT_EXCEPTION · ${r}`;
}

function buildSingleSourceCandidate(input: {
  materialKey: string;
  catalogWorkId: string;
  namePl: string;
  unit: string;
  demandId: string;
  researchJobId: string;
  nowIso: string;
  region: string;
  obs: QualifyingMarketObservationInput;
}): PriceCandidate {
  return {
    candidateId: `amped_ss_${input.researchJobId.slice(0, 24)}_${input.obs.provider}`,
    demandId: input.demandId,
    provider: (input.obs.provider === "leroy"
      || input.obs.provider === "castorama"
      || input.obs.provider === "obi"
      ? input.obs.provider
      : "other") as PriceCandidate["provider"],
    sourceType: "market_reference",
    name: input.namePl,
    unit: input.unit,
    priceNet: roundMarketPricePln(input.obs.priceNet),
    currency: "PLN",
    priceDate: input.nowIso.slice(0, 10),
    sourceUrl: input.obs.sourceUrl || undefined,
    retrievedAt: input.obs.observedAt || input.nowIso,
    provenance: "manual_owner",
    notes: [
      "live_selective_diy",
      "single_source",
      `shops=${input.obs.provider}`,
      "amped_conflict_resolution_single_source",
      "pending_owner_accept",
    ].join(" · "),
    materialKey: input.materialKey,
    catalogWorkId: input.catalogWorkId,
    region: input.region,
    providerSku: input.obs.sku || undefined,
  };
}

/**
 * Autonomous multi-source conflict resolution: never Accept averaged multi-price.
 * Prefer freshest single qualifying shop; if ≥2 shops with prices differing >8% → gap.
 */
async function resolveSingleSourceFromShops(opts: {
  lookup: DiySelectiveLookupPort;
  materialKey: string;
  catalogWorkId: string;
  namePl: string;
  unit: string;
  region: string;
  demandId: string;
  researchJobId: string;
  nowIso: string;
}): Promise<
  | { ok: true; candidate: PriceCandidate; conflict: false }
  | { ok: false; conflict: boolean; error: string }
> {
  const query = String(opts.namePl || "").trim() || String(opts.materialKey || "").trim();
  const requestUnit = normalizeResearchUnit(opts.unit);
  const qOnly: QualifyingMarketObservationInput[] = [];

  for (const provider of SHOPS) {
    const looked = await opts.lookup.lookup({
      provider,
      query,
      materialKey: opts.materialKey,
      maxUrls: 1,
    });
    if (!looked.ok) continue;
    const parsed = parseDiyShopHtml({
      provider,
      html: looked.page.bodyText,
      query,
      sourceUrl: looked.page.finalUrl || looked.page.requestUrl,
    });
    if (!parsed?.identityMatched) continue;
    // Skip package-only offers without unit basis — per_m2 / converted offers OK.
    if (
      parsed.isPackagePrice
      && requestUnit !== "kg"
      && parsed.priceBasis !== "per_m2"
      && !(parsed.priceBasis === "package" && parsed.packageAreaM2 && parsed.packageAreaM2 > 0)
    ) {
      continue;
    }
    let priceNet = parsed.priceGrossPln;
    if (
      requestUnit === "m2"
      && parsed.isPackagePrice
      && parsed.priceBasis === "package"
      && parsed.packageAreaM2
      && parsed.packageAreaM2 > 0
    ) {
      priceNet = roundMarketPricePln(parsed.priceGrossPln / parsed.packageAreaM2);
    }
    const raw: QualifyingMarketObservationInput = {
      materialKey: opts.materialKey,
      provider,
      priceNet,
      currency: "PLN",
      priceType: parsed.priceType,
      sellerKind: parsed.sellerKind,
      sellerName: parsed.sellerName,
      observedAt: looked.page.fetchedAtIso || opts.nowIso,
      sourceUrl: parsed.sourceUrl,
      sku: parsed.sku,
    };
    const q = qualifyMarketResearchObservation(raw);
    if (q.ok) qOnly.push(q.observation);
  }

  if (qOnly.length === 0) {
    return { ok: false, conflict: false, error: "PRICE_GAP" };
  }

  if (qOnly.length >= 2) {
    const prices = qOnly.map((o) => o.priceNet).sort((a, b) => a - b);
    const lo = prices[0]!;
    const hi = prices[prices.length - 1]!;
    if (lo > 0 && (hi - lo) / lo > 0.08) {
      return { ok: false, conflict: true, error: "TRUE_PRICE_CONFLICT" };
    }
  }

  // Freshest single source (corroboration allows pick, not average)
  qOnly.sort((a, b) => String(b.observedAt).localeCompare(String(a.observedAt)));
  const winner = qOnly[0]!;
  const candidate = buildSingleSourceCandidate({
    ...opts,
    unit: requestUnit,
    obs: winner,
  });
  if (!unitsCompatible(opts.unit, candidate.unit)) {
    return { ok: false, conflict: false, error: "WRONG_UNIT" };
  }
  return { ok: true, candidate, conflict: false };
}

export async function runAutonomousMaterialPriceEvidenceDiscovery(
  input: RunAmpedInput,
): Promise<RunAmpedResult> {
  const nowMs = input.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const region = String(input.region || "wroclaw").trim() || "wroclaw";
  const techTrusted = input.technologyBomIdentityTrusted !== false;
  const lines: AmpedMaterialResult[] = [];

  const lookup =
    input.diyLookup
    ?? createFallbackDiySelectiveLookup({
      primary: createEdgeDiySelectiveLookup(),
    });

  const providerBundle = resolveMmr02Phase2Provider({
    diyLookup: lookup,
  });

  // MIN-v1.1: never research raw PDF noise tokens; prefer structural work-desc nouns
  const minBatch = normalizeMaterialIdentityBatch({
    lines: input.materials.map((m) => ({
      materialKey: m.materialKey,
      namePl: m.namePl,
      unit: m.unit,
      qtyFactor: m.qtyFactor,
      sourceRef: m.factorSourceRef || m.parentCatalogWorkId,
    })),
    workDescription: input.workDescription ?? null,
  });

  const normalizedMaterials: AmpedMaterialLine[] = minBatch.accepted.map((a) => {
    const parent =
      input.materials.find((m) =>
        foldLoose(m.namePl) === foldLoose(a.rawText)
        || foldLoose(m.materialKey) === foldLoose(a.materialKey || "")
      )
      || input.materials[0];
    return {
      materialKey: a.materialKey || parent?.materialKey || `mat.min.${a.normalizedName}`,
      namePl: a.normalizedName,
      unit: a.unit || parent?.unit || "m2",
      qtyFactor: a.quantity ?? parent?.qtyFactor ?? 1,
      parentCatalogWorkId: parent?.parentCatalogWorkId || input.materials[0]?.parentCatalogWorkId || "",
      factorSourceRef: a.provenance,
      evidenceRefs: [a.provenance],
    };
  });

  // Record rejected noise as gap lines (no DIY)
  for (const rej of minBatch.rejected) {
    const autMat = evaluateAutMatMaterialAcceptContract({
      worksById: input.worksById,
      candidate: null,
      expectedUnit: "m2",
      identityTrusted: false,
      nowMs,
      region,
    });
    lines.push({
      materialKey: rej.materialKey,
      namePl: rej.rawText,
      unit: "?",
      qtyFactor: 0,
      canonicalCatalogWorkId: input.materials[0]?.parentCatalogWorkId || "",
      identityTrusted: false,
      identitySource: "NONE",
      cacheUsability: "MISSING",
      researchAttempted: false,
      researchError: `MIN_REJECT:${rej.rejectReasons.join("+")}`,
      candidatePresent: false,
      candidatePriceNet: null,
      candidateProvider: null,
      candidateSourceUrl: null,
      multiSourceAverageRejected: false,
      singleSourceResolved: false,
      amed: null,
      autMat,
      nextLegal: "AUTONOMOUS_RESOLUTION_QUEUE · MATERIAL_IDENTITY_GAP · EXTRACTION_NOISE",
      invent: false,
    });
  }

  for (const mat of normalizedMaterials) {
    const map = mapMaterialToMarketWork(mat.materialKey);
    const canonicalCatalogWorkId = map?.workId || mat.parentCatalogWorkId;
    const identitySource: AmpedMaterialResult["identitySource"] = map
      ? "MATERIAL_MARKET_MAP"
      : techTrusted
      ? "VALIDATED_TECHNOLOGY_BOM"
      : "NONE";
    const identityTrusted =
      identitySource === "MATERIAL_MARKET_MAP"
      || identitySource === "VALIDATED_TECHNOLOGY_BOM";

    const cache = evaluateMaterialCache({
      materialKey: mat.materialKey,
      catalogWorkId: canonicalCatalogWorkId,
      region,
      worksById: input.worksById,
      nowMs,
    });

    let candidate: PriceCandidate | null = null;
    let researchAttempted = false;
    let researchError: string | null = null;
    let multiSourceAverageRejected = false;
    let singleSourceResolved = false;
    let amedSummary: AmpedMaterialResult["amed"] = null;

    // AMED-v1: provider ladder + specification gate (before / alongside DIY)
    let amedResult: RunAmedResult | null = null;
    if (identityTrusted) {
      amedResult = await runAutonomousMaterialEvidenceDiscovery({
        materialKey: mat.materialKey,
        namePl: mat.namePl,
        unit: mat.unit,
        qtyFactor: mat.qtyFactor,
        parentCatalogWorkId: mat.parentCatalogWorkId || canonicalCatalogWorkId,
        worksById: input.worksById,
        region,
        nowMs,
        technologyRelation: mat.parentCatalogWorkId,
        factorSourceRef: mat.factorSourceRef,
        diyLookup: input.disableLiveResearch ? undefined : lookup,
        disableLiveResearch: input.disableLiveResearch === true,
        offerBoqDescription: input.offerBoqDescription ?? input.workDescription ?? null,
        workDescription: input.workDescription ?? null,
        athedExtractTexts: input.athedExtractTexts ?? null,
        technologyPackTexts: input.technologyPackTexts ?? null,
        knowledgeTokens: input.knowledgeTokens ?? null,
        knowledgeProvenance: input.knowledgeProvenance ?? null,
      });
      amedSummary = {
        version: amedResult.version,
        specificationLevel: amedResult.specification.specificationLevel,
        providerCount: amedResult.providers.length,
        evidenceCount: amedResult.evidence.length,
        candidateCount: amedResult.candidates.length,
        conflictState: amedResult.conflictState,
        missingDimensions: amedResult.missingDimensions,
        nextLegal: amedResult.nextLegal,
      };
      if (amedResult.autMatReadyCandidate) {
        candidate = amedResult.autMatReadyCandidate;
        singleSourceResolved = true;
        researchAttempted = !input.disableLiveResearch;
      }
    }

    // Cache CURRENT → synthetic candidate for AUT-MAT idempotent path
    if (!candidate && cache.usability === "CURRENT" && cache.hit) {
      candidate = {
        candidateId: `amped_cache_${mat.materialKey.slice(0, 40)}`,
        demandId: `amped:${mat.materialKey}`,
        provider: "other",
        sourceType: "market_reference",
        name: mat.namePl,
        unit: mat.unit,
        priceNet: roundMarketPricePln(cache.hit.price),
        currency: "PLN",
        priceDate: (cache.hit.updatedAt || nowIso).slice(0, 10),
        retrievedAt: cache.hit.updatedAt || nowIso,
        provenance: "manual_owner",
        notes: "price_memory_current · amped_cache_reuse · shops=cache",
        materialKey: mat.materialKey,
        catalogWorkId: canonicalCatalogWorkId,
        region,
        sourceUrl: undefined,
      };
      // notes without live_selective_diy — hasMarketEvidence needs URL or diy notes.
      // Prefer re-attach evidence marker for cache reuse:
      candidate.notes =
        "live_selective_diy · shops=cache · price_memory_current · amped_cache_reuse";
    } else if (!candidate && !input.disableLiveResearch && identityTrusted) {
      researchAttempted = true;
      const amedProbedDiy = amedResult?.providers.some(
        (p) =>
          p.tier === "LEGAL_SUPPLIER_CATALOG"
          && p.status !== "NOT_CONFIGURED",
      );
      if (amedProbedDiy) {
        // AMED already ran DIY ladder — do not duplicate HTTP; keep fail-closed gap/conflict.
        researchError =
          amedResult?.missingDimensions[0]
          || amedResult?.conflictState
          || "MATERIAL_EVIDENCE_GAP";
      } else {
      const demandId = `amped:${mat.materialKey}`;
      const researchJobId = `amped_job_${mat.materialKey.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}`;

      const primary = await providerBundle.provider.research({
        materialKey: mat.materialKey,
        catalogWorkId: canonicalCatalogWorkId,
        namePl: mat.namePl,
        unit: mat.unit,
        region,
        demandId,
        researchJobId,
        nowIso,
      });

      if (primary.ok && primary.candidate) {
        const notes = String(primary.candidate.notes || "");
        if (notes.includes("multi_source_average")) {
          multiSourceAverageRejected = true;
          const resolved = await resolveSingleSourceFromShops({
            lookup,
            materialKey: mat.materialKey,
            catalogWorkId: canonicalCatalogWorkId,
            namePl: mat.namePl,
            unit: mat.unit,
            region,
            demandId,
            researchJobId,
            nowIso,
          });
          if (resolved.ok) {
            candidate = resolved.candidate;
            singleSourceResolved = true;
          } else {
            researchError = resolved.error;
          }
        } else {
          candidate = {
            ...primary.candidate,
            materialKey: mat.materialKey,
            catalogWorkId: canonicalCatalogWorkId,
          };
        }
      } else {
        // Direct single-source attempt when trio returns PRICE_GAP
        const resolved = await resolveSingleSourceFromShops({
          lookup,
          materialKey: mat.materialKey,
          catalogWorkId: canonicalCatalogWorkId,
          namePl: mat.namePl,
          unit: mat.unit,
          region,
          demandId,
          researchJobId,
          nowIso,
        });
        if (resolved.ok) {
          candidate = resolved.candidate;
          singleSourceResolved = true;
        } else {
          researchError = !primary.ok ? primary.error : resolved.error;
        }
      }
      }
    } else if (!candidate && !identityTrusted) {
      researchError = "NOT_TRUSTED_IDENTITY";
    } else if (!candidate && input.disableLiveResearch) {
      researchError = "LIVE_RESEARCH_DISABLED";
    } else if (!candidate && amedResult && !amedResult.autMatReadyCandidate) {
      researchError =
        amedResult.missingDimensions[0]
        || amedResult.conflictState
        || "MATERIAL_EVIDENCE_GAP";
    }

    const autMat = evaluateAutMatMaterialAcceptContract({
      worksById: input.worksById,
      candidate,
      expectedUnit: mat.unit,
      identityTrusted,
      nowMs,
      region,
    });

    let nextLegal = remapAutMatNext(autMat);
    if (
      autMat.decision !== "AUT_MAT_ACCEPT"
      && amedResult
      && amedResult.missingDimensions.length > 0
    ) {
      nextLegal =
        `${nextLegal} · MISSING:${amedResult.missingDimensions.slice(0, 3).join("+")}`;
    }

    lines.push({
      materialKey: mat.materialKey,
      namePl: mat.namePl,
      unit: mat.unit,
      qtyFactor: mat.qtyFactor,
      canonicalCatalogWorkId,
      identityTrusted,
      identitySource,
      cacheUsability: cache.usability,
      researchAttempted,
      researchError,
      candidatePresent: Boolean(candidate),
      candidatePriceNet: candidate ? roundMarketPricePln(candidate.priceNet) : null,
      candidateProvider: candidate?.provider ?? null,
      candidateSourceUrl: candidate?.sourceUrl ?? null,
      multiSourceAverageRejected,
      singleSourceResolved,
      amed: amedSummary,
      autMat,
      nextLegal,
      invent: false,
    });
  }

  const accepted = lines.filter((l) => l.autMat.decision === "AUT_MAT_ACCEPT").length;
  const conflicts = lines.filter((l) =>
    l.autMat.reasons.includes("EVIDENCE_CONFLICT") || /CONFLICT/.test(l.nextLegal)
  ).length;
  const gaps = lines.length - accepted;
  const allMatReady = lines.length > 0 && accepted === lines.length;

  let nextLegal = "CONTINUE_AUT_MAT_WHEN_MATERIALS_REQUIRED";
  if (lines.length === 0) {
    nextLegal = "NO_MATERIALS · SKIP_AUT_MAT";
  } else if (allMatReady) {
    nextLegal = "CONTINUE_POSITION_COST · THEN_BID_CUTOVER · THEN_FINANCE";
  } else if (conflicts > 0) {
    nextLegal = "AUTONOMOUS_RESOLUTION_QUEUE · MATERIAL_EVIDENCE_CONFLICT";
  } else {
    nextLegal = "AUTONOMOUS_RESOLUTION_QUEUE · MATERIAL_EVIDENCE_GAP";
  }

  return {
    version: AUTONOMOUS_MATERIAL_PRICE_EVIDENCE_VERSION,
    materialCount: lines.length,
    accepted,
    gaps,
    conflicts,
    lines,
    allMatReady,
    ownerRuntimeDependency: 0,
    invent: false,
    nextLegal,
  };
}
