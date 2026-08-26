/**
 * IK FINALIZATION — provisional tender estimation seam (READ-ONLY pricing).
 *
 * When TRUSTED identity / OUR RATE is unavailable, reuse existing mapper binding
 * and catalog evidence (companyPricePln · internal-first OUR RATE) for PROVISIONAL
 * position costs only. Does NOT mutate Work Catalog · Price Memory · OUR RATE.
 */

import {
  computeSellPricePln,
  resolveMarginPct,
} from "@/lib/price-intelligence/our-price-catalog";
import type { OfferBoqLine } from "@/lib/tender-offer-boq";
import type { ShadowWorkIdentityResolve } from "@/lib/tender-position-cost/boq-shadow-adapter";
import type { OurRateLaborResolve } from "@/lib/tender-position-cost/our-rate-labor-adapter";
import type {
  CatalogWorkQuotesSellResolve,
  CatalogWorkQuotesSellStatus,
} from "@/lib/tender-position-cost/catalog-work-quotes-sell-adapter";
import { resolveCatalogCoverageAlias } from "@/lib/catalog-coverage/alias-resolver";
import { CATALOG_WAVE2_PRODUCT_IDS } from "@/lib/catalog-coverage/alias-pack-wave2";
import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import { buildWorkRateIdentityKey } from "@/lib/work-catalog/work-rate-types";
import { getWorkByIdFromStore } from "@/lib/work-catalog/catalog-work-utils";
import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import { normalizeWgdomCostUnit, type WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import { lookupWorkRate } from "@/lib/work-catalog/work-rate-lookup";
import { loadAppSettingsLocal, type AppSettings } from "@/lib/app-settings";
import { getOwnerClassificationPlane } from "./owner-classification-map";
import { hasCompleteTrustedIdentityTuple } from "./ik-identity-trusted-preserve";
import { isC2KnrWcProbWorkId } from "./c2-knr-wc-prob-owner-create";
import type { EstimatorPricingPlane } from "./classification-types";
import { buildInternalFirstIndexFromCatalogWorks } from "./ik-p5-internal-first-index";
import { lookupInternalFirst } from "./internal-first-semantic-match";
import type { InternalFirstCatalogRow } from "./internal-first-semantic-match";
import { listActiveWorksForRegion } from "@/lib/work-catalog/catalog-work-utils";

export type ProvisionalPricingStatus =
  | "VERIFIED"
  | "PROVISIONAL"
  | "PROVISIONAL_PROXY"
  | "GAP"
  | "UNAVAILABLE";

export const PROVISIONAL_REVIEW_TAG_OWNER = "OWNER_REVIEW_REQUIRED" as const;
export const PROVISIONAL_REVIEW_TAG_UNIT = "UNIT_CONVERSION_REVIEW_REQUIRED" as const;

export type ProvisionalUiLineStatus =
  | "VERIFIED"
  | "PROVISIONAL"
  | "PROXY"
  | "REVIEW_REQUIRED"
  | "GAP";

export type ProvisionalLineAttestation = {
  pricingStatus: ProvisionalPricingStatus;
  provisional: boolean;
  provisionalReason: string | null;
  reviewRequired: boolean;
  reviewTags: string[];
  sourceUnitRaw: string | null;
  pricingUnit: WgdomCostUnit | null;
  sourceType: ProvisionalRateSource | null;
  catalogWorkId: string | null;
  uiLineStatus: ProvisionalUiLineStatus;
};

export type ProvisionalResolveContext = {
  sourceUnitRaw?: string | null;
  bindingPatched?: boolean;
  rationaleTags?: readonly string[];
};

export type ProvisionalPricingSummary = {
  pricedLineCount: number;
  verifiedCount: number;
  provisionalCount: number;
  proxyCount: number;
  reviewRequiredCount: number;
  gapLineCount: number;
};

export type ProvisionalRateSource =
  | "OUR_RATE"
  | "CATALOG_COMPANY_PRICE"
  | "INTERNAL_FIRST"
  | "PRICE_MEMORY";

export type ProvisionalEstimatePlane = {
  plane: EstimatorPricingPlane;
  /** True when canonical Owner map was UNKNOWN and plane came from mapper/category evidence. */
  provisional: boolean;
};

let provisionalEstimationTestOverride: boolean | null = null;

/** Test harness only — does not persist. */
export function forceIkProvisionalEstimationForTests(on: boolean | null): void {
  provisionalEstimationTestOverride = on;
}

export function isIkProvisionalEstimationEnabled(
  remote?: Partial<AppSettings> | null,
  local?: Partial<AppSettings> | null,
): boolean {
  if (provisionalEstimationTestOverride === true) return true;
  if (provisionalEstimationTestOverride === false) return false;
  const parsed = remote ?? {};
  const loc = local ?? loadAppSettingsLocal();
  if (parsed.ikProvisionalEstimationEnabled === true) return true;
  if (parsed.ikProvisionalEstimationEnabled === false) return false;
  return loc.ikProvisionalEstimationEnabled === true;
}

/** Pricing-only unit token — uses global normalizeWgdomCostUnit SSOT (OD-01: prob stays prob). */
export function resolveProvisionalPricingUnit(
  raw: string | null | undefined,
): WgdomCostUnit | null {
  return normalizeWgdomCostUnit(raw);
}

function unitsCompatibleForProvisionalPricing(
  catalogUnitRaw: string | null | undefined,
  lineUnit: WgdomCostUnit,
): boolean {
  const catalogCanon = normalizeWgdomCostUnit(catalogUnitRaw);
  return catalogCanon != null && catalogCanon === lineUnit;
}

function buildProvisionalLinePatch(
  mapped: OfferBoqLine,
  singleId: string,
  method: OfferBoqLine["matchMethod"],
  confidence: OfferBoqLine["matchConfidence"],
  candidate: OfferBoqLine["candidateMatches"][number] | null,
  rationaleTag: string,
): Partial<OfferBoqLine> {
  const rationale = [...(mapped.aiRationale ?? [])];
  if (!rationale.includes(rationaleTag)) rationale.push(rationaleTag);
  return {
    catalogWorkId: singleId,
    matchMethod:
      method === "exact_knr" || method === "alias" || method === "manual"
        ? method
        : "catalog_map",
    matchConfidence: confidence ?? "medium",
    candidateMatches: candidate ? [candidate] : [],
    aiRationale: rationale,
  };
}

function shouldSkipProvisionalForOwnerMappedC2Prob(mapped: OfferBoqLine): boolean {
  const workId = String(mapped.catalogWorkId ?? "").trim();
  if (!isC2KnrWcProbWorkId(workId)) return false;
  if (resolveProvisionalPricingUnit(mapped.unit) !== "prob") return false;
  if (hasCompleteTrustedIdentityTuple(mapped)) return true;
  if (mapped.matchMethod === "exact_knr" && mapped.matchConfidence !== "low") return true;
  return false;
}

function pickProvisionalCandidateFromDescription(
  mapped: OfferBoqLine,
  works: readonly CatalogWork[],
): string | null {
  if (hasCompleteTrustedIdentityTuple(mapped)) return null;

  const hay = foldPolishText(mapped.description ?? "");
  const lineUnit = resolveProvisionalPricingUnit(mapped.unit);
  if (!hay || !lineUnit) return null;

  const isKnnr1305Probe =
    lineUnit === "prob"
    && /1305-0[12]|pierwsza proba|nastepna proba|sprawdzenie samoczynnego wylaczania/.test(hay);

  const rules: Array<{ test: RegExp; workId: string }> = [
    { test: /wylacznik|roznicowo|przeciwporaz|pomiar.*rezystancj/, workId: "legacy-elektryka-szt" },
    ...(isKnnr1305Probe
      ? []
      : [{
          test: /sprawdzenie samoczynnego wylaczania|pierwsza proba|nastepna proba/,
          workId: "legacy-elektryka-szt",
        }]),
    { test: /demontaz.*lacznik|lacznik.*instalacyjn/, workId: "legacy-elektryka-szt" },
    { test: /skrzydl.*okien|dopasowanie.*okien/, workId: "legacy-stolarka-szt" },
  ];

  const candidates = new Set(
    (mapped.candidateMatches ?? []).map((c) => String(c.catalogWorkId ?? "").trim()).filter(Boolean),
  );

  for (const rule of rules) {
    if (!rule.test.test(hay)) continue;
    if (candidates.has(rule.workId)) return rule.workId;
    const work = works.find((w) => w.id === rule.workId && w.active !== false);
    if (work && unitsCompatibleForProvisionalPricing(work.unit, lineUnit)) {
      return rule.workId;
    }
  }

  for (const c of mapped.candidateMatches ?? []) {
    const id = String(c.catalogWorkId ?? "").trim();
    const work = works.find((w) => w.id === id);
    if (work && unitsCompatibleForProvisionalPricing(work.unit, lineUnit)) {
      return id;
    }
  }
  return null;
}

function resolveProvisionalAliasBind(
  mapped: OfferBoqLine,
  works: readonly CatalogWork[],
): Partial<OfferBoqLine> | null {
  const lineUnit = resolveProvisionalPricingUnit(mapped.unit);
  if (!lineUnit) return null;

  const alias = resolveCatalogCoverageAlias({
    description: mapped.description ?? "",
    isNoise: false,
    works,
    requireQuotes: false,
  });

  let targetId = alias.resolvedProductId ?? alias.packProductId;
  if (
    alias.aliasRuleId === "wykwity_zacieki"
    && alias.missingWork
    && !works.some((w) => w.id === CATALOG_WAVE2_PRODUCT_IDS.wykwity_zacieki)
  ) {
    targetId = CATALOG_WAVE2_PRODUCT_IDS.oczyszczenie_podloza;
  }

  if (!targetId) return null;
  const work = works.find((w) => w.id === targetId && w.active !== false);
  if (!work || !unitsCompatibleForProvisionalPricing(work.unit, lineUnit)) return null;

  return buildProvisionalLinePatch(
    mapped,
    work.id,
    "alias",
    "medium",
    null,
    "IK_PROVISIONAL_ALIAS_BIND",
  );
}

function resolveProvisionalUnitMismatchRebind(
  mapped: OfferBoqLine,
  works: readonly CatalogWork[],
): Partial<OfferBoqLine> | null {
  const lineUnit = resolveProvisionalPricingUnit(mapped.unit);
  const workId = String(mapped.catalogWorkId ?? "").trim();
  if (!lineUnit || !workId) return null;
  const work = works.find((w) => w.id === workId);
  if (work && unitsCompatibleForProvisionalPricing(work.unit, lineUnit)) return null;

  const picked = pickProvisionalCandidateFromDescription(mapped, works);
  if (!picked) return null;
  return buildProvisionalLinePatch(
    mapped,
    picked,
    mapped.matchMethod ?? "catalog_map",
    mapped.matchConfidence ?? "medium",
    mapped.candidateMatches?.find((c) => c.catalogWorkId === picked) ?? null,
    "IK_PROVISIONAL_UNIT_MISMATCH_REBIND",
  );
}

function resolveProvisionalUnpricedAliasRebind(
  mapped: OfferBoqLine,
  works: readonly CatalogWork[],
): Partial<OfferBoqLine> | null {
  const aliasBind = resolveProvisionalAliasBind(mapped, works);
  if (!aliasBind?.catalogWorkId) return null;
  const currentId = String(mapped.catalogWorkId ?? "").trim();
  const targetId = String(aliasBind.catalogWorkId).trim();
  if (!currentId || targetId === currentId) return null;
  const current = works.find((w) => w.id === currentId && w.active !== false);
  if (current && Number(current.companyPricePln) > 0) return null;
  return aliasBind;
}

/**
 * Collapse competing mapper candidates to a single primary binding for pricing only.
 * Does NOT mark identity as TRUSTED — downstream marks PROVISIONAL.
 */
export function resolveProvisionalMapperLinePatch(
  mapped: OfferBoqLine,
  identity: Pick<ShadowWorkIdentityResolve, "status" | "workId">,
  works: readonly CatalogWork[] = [],
): Partial<OfferBoqLine> | null {
  if (!isIkProvisionalEstimationEnabled()) return null;
  if (shouldSkipProvisionalForOwnerMappedC2Prob(mapped)) return null;

  if (identity.status === "OK" && identity.workId) {
    const unitRebind = resolveProvisionalUnitMismatchRebind(mapped, works);
    if (unitRebind) return unitRebind;
    return resolveProvisionalUnpricedAliasRebind(mapped, works);
  }

  if (
    identity.status === "NOISE_SKIP"
    || identity.status === "EQUIPMENT_GAP"
    || identity.status === "AUXILIARY_GAP"
  ) {
    return null;
  }

  if (identity.status === "INVALID_UNIT") {
    const aliasBind = resolveProvisionalAliasBind(mapped, works);
    if (aliasBind) return aliasBind;
    const picked = pickProvisionalCandidateFromDescription(mapped, works);
    if (picked) {
      return buildProvisionalLinePatch(
        mapped,
        picked,
        "catalog_map",
        "medium",
        null,
        "IK_PROVISIONAL_INVALID_UNIT_BIND",
      );
    }
    return null;
  }

  const method = mapped.matchMethod;
  const descriptionPick = pickProvisionalCandidateFromDescription(mapped, works);

  if (
    (method === "unmatched" || method === "category_heuristic" || !mapped.catalogWorkId)
    && descriptionPick
  ) {
    return buildProvisionalLinePatch(
      mapped,
      descriptionPick,
      "catalog_map",
      "medium",
      mapped.candidateMatches?.find((c) => c.catalogWorkId === descriptionPick) ?? null,
      "IK_PROVISIONAL_DESCRIPTION_BIND",
    );
  }

  const aliasBind = resolveProvisionalAliasBind(mapped, works);
  if (aliasBind) return aliasBind;

  const primary = String(mapped.catalogWorkId ?? descriptionPick ?? "").trim();
  if (!primary) return null;

  if (method === "unmatched" || method === "category_heuristic") return null;
  if (mapped.matchConfidence === "low" && !descriptionPick) return null;

  if (identity.status !== "AMBIGUOUS" && identity.status !== "NO_IDENTITY") {
    return null;
  }

  const singleId = String(descriptionPick ?? primary).trim();
  if (!singleId) return null;

  const top =
    mapped.candidateMatches?.find((c) => c.catalogWorkId === singleId)
    ?? mapped.candidateMatches?.find((c) => c.role === "primary")
    ?? mapped.candidateMatches?.[0]
    ?? null;

  return buildProvisionalLinePatch(
    mapped,
    singleId,
    method,
    mapped.matchConfidence ?? "medium",
    top,
    "IK_PROVISIONAL_MAPPER_BINDING",
  );
}

/** Estimate plane for pricing only — does not mutate Owner classification map. */
export function resolveProvisionalEstimatePlane(workId: string): ProvisionalEstimatePlane {
  const id = String(workId ?? "").trim();
  if (!id) return { plane: "UNKNOWN", provisional: false };

  const canonical = getOwnerClassificationPlane(id);
  if (canonical !== "UNKNOWN") return { plane: canonical, provisional: false };

  const lower = id.toLowerCase();
  if (lower.startsWith("legacy-wyposazenie")) {
    return { plane: "MATERIAL", provisional: true };
  }
  if (lower.startsWith("legacy-transport_utylizacja")) {
    return { plane: "LABOR", provisional: true };
  }
  if (
    lower.startsWith("legacy-malowanie")
    || lower.startsWith("legacy-gk")
    || lower.startsWith("legacy-gladzie_tynki")
  ) {
    return {
      plane: lower.startsWith("legacy-gladzie_tynki") ? "COMPOUND" : "LABOR",
      provisional: true,
    };
  }
  if (
    /^legacy-(hydraulika|elektryka|instalacje_co|instalacje_gaz|wentylacja|stolarka|podlogi|glazura|rozbiorki)-/.test(
      lower,
    )
  ) {
    return { plane: "LABOR", provisional: true };
  }
  if (lower.startsWith("knr-wc-")) {
    return { plane: "LABOR", provisional: true };
  }
  if (lower.startsWith("cc-w2-")) {
    return { plane: "LABOR", provisional: true };
  }

  return { plane: "UNKNOWN", provisional: false };
}

function buildProvisionalLaborResolve(args: {
  workId: string;
  unit: WgdomCostUnit;
  basePln: number;
  sellPricePln: number;
  sourceType: string;
  lookup: OurRateLaborResolve["lookup"];
}): OurRateLaborResolve {
  const marginPct = null;
  return {
    status: "CURRENT",
    statusLabelPl: "PROVISIONAL",
    workId: args.workId,
    unit: args.unit,
    identityKey: buildWorkRateIdentityKey(args.workId, args.unit),
    ourRatePln: args.basePln,
    marginPct,
    sellPricePln: args.sellPricePln,
    sourceType: args.sourceType,
    regionScope: null,
    observedAt: null,
    updatedAt: null,
    labor: { status: "CURRENT", ourRatePln: args.sellPricePln },
    lookup: args.lookup,
  };
}

function tryCatalogCompanyPriceLabor(
  store: WorkCatalogStore,
  workId: string,
  unit: WgdomCostUnit,
): OurRateLaborResolve | null {
  const work = getWorkByIdFromStore(store, workId);
  if (!work || !unitsCompatibleForProvisionalPricing(work.unit, unit)) return null;
  const base = Number(work.companyPricePln);
  if (!Number.isFinite(base) || base <= 0) return null;
  const marginPct = resolveMarginPct(work);
  const sellPricePln = computeSellPricePln(base, marginPct) ?? base;
  if (!Number.isFinite(sellPricePln) || sellPricePln <= 0) return null;
  return buildProvisionalLaborResolve({
    workId,
    unit,
    basePln: base,
    sellPricePln,
    sourceType: "PROVISIONAL_CATALOG_COMPANY_PRICE",
    lookup: null,
  });
}

const PROVISIONAL_KNR_WC_MYCIE_FALLBACK_WORK_ID = CATALOG_WAVE2_PRODUCT_IDS.oczyszczenie_podloza;

function tryProvisionalKnrWcMycieFallback(
  store: WorkCatalogStore,
  args: { workId: string; unit: WgdomCostUnit; description: string; nowMs: number },
): OurRateLaborResolve | null {
  if (!args.workId.toLowerCase().startsWith("knr-wc-")) return null;
  const hay = foldPolishText(args.description);
  if (!/mycie|zmyc|zmyw.*podlo|posadzek.*lastryk/.test(hay)) return null;

  const fallbackWork = getWorkByIdFromStore(store, PROVISIONAL_KNR_WC_MYCIE_FALLBACK_WORK_ID);
  if (!fallbackWork || !unitsCompatibleForProvisionalPricing(fallbackWork.unit, args.unit)) {
    return null;
  }

  const lookup = lookupWorkRate(
    store,
    PROVISIONAL_KNR_WC_MYCIE_FALLBACK_WORK_ID,
    args.unit,
    args.nowMs,
  );
  if (lookup.status === "MISSING" || lookup.ourRatePln <= 0) {
    return tryCatalogCompanyPriceLabor(store, PROVISIONAL_KNR_WC_MYCIE_FALLBACK_WORK_ID, args.unit);
  }

  const marginPct = resolveMarginPct(fallbackWork);
  const sellPricePln = computeSellPricePln(lookup.ourRatePln, marginPct) ?? lookup.ourRatePln;

  if (sellPricePln == null || sellPricePln <= 0) return null;
  return buildProvisionalLaborResolve({
    workId: args.workId,
    unit: args.unit,
    basePln: lookup.ourRatePln,
    sellPricePln,
    sourceType: "PROVISIONAL_KNR_WC_MYCIE_OUR_RATE_FALLBACK",
    lookup,
  });
}

function tryInternalFirstLabor(
  store: WorkCatalogStore,
  args: {
    workId: string;
    unit: WgdomCostUnit;
    description: string;
    estimatePlane: ProvisionalEstimatePlane;
    index?: InternalFirstCatalogRow[];
  },
): OurRateLaborResolve | null {
  const works = listActiveWorksForRegion(store, store.activeRegion);
  const index = args.index ?? buildInternalFirstIndexFromCatalogWorks(works);
  const domain =
    args.estimatePlane.plane === "MATERIAL"
      ? "MATERIAL"
      : args.estimatePlane.plane === "COMPOUND"
        ? "LABOR_MATERIAL_PACKAGE"
        : "LABOR";
  const hit = lookupInternalFirst({
    description: args.description,
    unit: args.unit,
    sourceDomain: domain,
    index,
  });
  if (
    (hit.outcome !== "INTERNAL_EXACT_HIT" && hit.outcome !== "INTERNAL_SEMANTIC_HIT")
    || hit.match?.base == null
    || hit.match.base <= 0
  ) {
    return null;
  }
  if (hit.outcome === "INTERNAL_SEMANTIC_HIT" && hit.confidence === "LOW") return null;

  const sellPricePln = hit.match.base;
  return buildProvisionalLaborResolve({
    workId: args.workId,
    unit: args.unit,
    basePln: sellPricePln,
    sellPricePln,
    sourceType: "PROVISIONAL_INTERNAL_FIRST",
    lookup: null,
  });
}

export type ProvisionalLaborResolution = {
  ourRate: OurRateLaborResolve;
  pricingStatus: ProvisionalPricingStatus;
  source: ProvisionalRateSource;
  attestation: ProvisionalLineAttestation;
};

export function extractProvisionalRationaleTags(
  rationale: OfferBoqLine["aiRationale"] | string | null | undefined,
): string[] {
  if (Array.isArray(rationale)) {
    return rationale.map((t) => String(t)).filter(Boolean);
  }
  return [];
}

export function hasProvisionalSeamRationale(
  rationale: OfferBoqLine["aiRationale"] | readonly string[] | null | undefined,
): boolean {
  const tags = Array.isArray(rationale)
    ? rationale
    : extractProvisionalRationaleTags(rationale);
  return tags.some((t) => t.startsWith("IK_PROVISIONAL_"));
}

export function isSeamProvisionalPricingStatus(
  status: ProvisionalPricingStatus | null | undefined,
): boolean {
  return status === "PROVISIONAL" || status === "PROVISIONAL_PROXY";
}

export function detectUnitConversionReview(
  sourceUnitRaw: string | null | undefined,
  pricingUnit: WgdomCostUnit | null,
): boolean {
  if (!pricingUnit) return false;
  const raw = String(sourceUnitRaw ?? "").trim().toLowerCase();
  if (!raw) return false;
  if (raw === "prob" && pricingUnit === "szt") return true;
  if (raw === "kpl" && pricingUnit === "szt") {
    const canon = normalizeWgdomCostUnit(sourceUnitRaw);
    return canon === "szt";
  }
  return false;
}

function mapAttestationUiStatus(
  att: Pick<ProvisionalLineAttestation, "pricingStatus" | "reviewRequired">,
): ProvisionalUiLineStatus {
  if (att.reviewRequired) return "REVIEW_REQUIRED";
  if (att.pricingStatus === "PROVISIONAL_PROXY") return "PROXY";
  if (att.pricingStatus === "PROVISIONAL") return "PROVISIONAL";
  if (att.pricingStatus === "VERIFIED") return "VERIFIED";
  return "GAP";
}

function buildLineAttestation(args: {
  pricingStatus: ProvisionalPricingStatus;
  source: ProvisionalRateSource | null;
  catalogWorkId: string | null;
  sourceUnitRaw: string | null;
  pricingUnit: WgdomCostUnit | null;
  provisionalReason: string | null;
  reviewTags?: readonly string[];
}): ProvisionalLineAttestation {
  const reviewTags = [...new Set((args.reviewTags ?? []).map((t) => String(t).trim()).filter(Boolean))];
  const reviewRequired = reviewTags.length > 0;
  const provisional = isSeamProvisionalPricingStatus(args.pricingStatus);
  const base = {
    pricingStatus: args.pricingStatus,
    provisional,
    provisionalReason: args.provisionalReason,
    reviewRequired,
    reviewTags,
    sourceUnitRaw: args.sourceUnitRaw,
    pricingUnit: args.pricingUnit,
    sourceType: args.source,
    catalogWorkId: args.catalogWorkId,
    uiLineStatus: "VERIFIED" as ProvisionalUiLineStatus,
  };
  return { ...base, uiLineStatus: mapAttestationUiStatus(base) };
}

export function mapProvisionalAttestationToUiStatus(
  att: ProvisionalLineAttestation | null | undefined,
): ProvisionalUiLineStatus | null {
  return att?.uiLineStatus ?? null;
}

export function aggregateProvisionalPricingSummary(
  lines: readonly {
    positionComplete?: boolean;
    provisionalAttestation?: ProvisionalLineAttestation | null;
  }[],
): ProvisionalPricingSummary {
  let pricedLineCount = 0;
  let verifiedCount = 0;
  let provisionalCount = 0;
  let proxyCount = 0;
  let reviewRequiredCount = 0;
  let gapLineCount = 0;

  for (const row of lines) {
    if (!row.positionComplete) {
      gapLineCount += 1;
      continue;
    }
    pricedLineCount += 1;
    const att = row.provisionalAttestation;
    if (!att) continue;
    if (att.pricingStatus === "VERIFIED") verifiedCount += 1;
    if (att.pricingStatus === "PROVISIONAL") provisionalCount += 1;
    if (att.pricingStatus === "PROVISIONAL_PROXY") proxyCount += 1;
    if (att.reviewRequired) reviewRequiredCount += 1;
  }

  return {
    pricedLineCount,
    verifiedCount,
    provisionalCount,
    proxyCount,
    reviewRequiredCount,
    gapLineCount,
  };
}

function unitReviewTags(
  sourceUnitRaw: string | null | undefined,
  pricingUnit: WgdomCostUnit | null,
): string[] {
  return detectUnitConversionReview(sourceUnitRaw, pricingUnit)
    ? [PROVISIONAL_REVIEW_TAG_UNIT]
    : [];
}

function isAliasProxySeam(
  rationaleTags: readonly string[],
  description: string,
): boolean {
  if (rationaleTags.includes("IK_PROVISIONAL_ALIAS_BIND")) return true;
  const hay = foldPolishText(description);
  return /wykwit|zaciek/.test(hay);
}

/**
 * OUR RATE first, then catalog companyPricePln, then internal-first (existing index).
 * Never invents prices. Seam-sourced pricing never returns VERIFIED.
 */
export function tryResolveProvisionalLaborInput(
  store: WorkCatalogStore,
  args: {
    workId: string;
    unit: WgdomCostUnit;
    description: string;
    nowMs: number;
    existingOurRate: OurRateLaborResolve;
    index?: InternalFirstCatalogRow[];
    context?: ProvisionalResolveContext;
  },
): ProvisionalLaborResolution | null {
  if (!isIkProvisionalEstimationEnabled()) return null;

  const workId = String(args.workId ?? "").trim();
  if (!workId) return null;

  const ctx = args.context ?? {};
  const rationaleTags = ctx.rationaleTags ?? [];
  const sourceUnitRaw = ctx.sourceUnitRaw ?? null;
  const unitTags = unitReviewTags(sourceUnitRaw, args.unit);
  const seamInvolved =
    ctx.bindingPatched === true
    || hasProvisionalSeamRationale(rationaleTags)
    || String(args.existingOurRate.sourceType ?? "").startsWith("PROVISIONAL_");

  const verified = args.existingOurRate;
  if (
    verified.status === "CURRENT"
    && verified.sellPricePln != null
    && verified.sellPricePln > 0
  ) {
    if (!seamInvolved && unitTags.length === 0) {
      return {
        ourRate: verified,
        pricingStatus: "VERIFIED",
        source: "OUR_RATE",
        attestation: buildLineAttestation({
          pricingStatus: "VERIFIED",
          source: "OUR_RATE",
          catalogWorkId: workId,
          sourceUnitRaw,
          pricingUnit: args.unit,
          provisionalReason: null,
        }),
      };
    }
    const proxySeam = isAliasProxySeam(rationaleTags, args.description);
    const ownerTags = proxySeam ? [PROVISIONAL_REVIEW_TAG_OWNER] : [];
    return {
      ourRate: verified,
      pricingStatus: "PROVISIONAL_PROXY",
      source: "OUR_RATE",
      attestation: buildLineAttestation({
        pricingStatus: "PROVISIONAL_PROXY",
        source: "OUR_RATE",
        catalogWorkId: workId,
        sourceUnitRaw,
        pricingUnit: args.unit,
        provisionalReason: proxySeam ? "ALIAS_PROXY_OUR_RATE" : "PROVISIONAL_SEAM_OUR_RATE",
        reviewTags: [...ownerTags, ...unitTags],
      }),
    };
  }

  const estimatePlane = resolveProvisionalEstimatePlane(workId);
  if (estimatePlane.plane === "UNKNOWN") return null;

  const fromCompany = tryCatalogCompanyPriceLabor(store, workId, args.unit);
  if (fromCompany) {
    return {
      ourRate: fromCompany,
      pricingStatus: "PROVISIONAL",
      source: "CATALOG_COMPANY_PRICE",
      attestation: buildLineAttestation({
        pricingStatus: "PROVISIONAL",
        source: "CATALOG_COMPANY_PRICE",
        catalogWorkId: workId,
        sourceUnitRaw,
        pricingUnit: args.unit,
        provisionalReason: "CATALOG_COMPANY_PRICE",
        reviewTags: unitTags,
      }),
    };
  }

  const fromKnrMycie = tryProvisionalKnrWcMycieFallback(store, {
    workId,
    unit: args.unit,
    description: args.description,
    nowMs: args.nowMs,
  });
  if (fromKnrMycie) {
    return {
      ourRate: fromKnrMycie,
      pricingStatus: "PROVISIONAL_PROXY",
      source: "OUR_RATE",
      attestation: buildLineAttestation({
        pricingStatus: "PROVISIONAL_PROXY",
        source: "OUR_RATE",
        catalogWorkId: workId,
        sourceUnitRaw,
        pricingUnit: args.unit,
        provisionalReason: "KNR_WC_MYCIE_OUR_RATE_FALLBACK",
        reviewTags: [PROVISIONAL_REVIEW_TAG_OWNER, ...unitTags],
      }),
    };
  }

  const fromInternal = tryInternalFirstLabor(store, {
    workId,
    unit: args.unit,
    description: args.description,
    estimatePlane,
    index: args.index,
  });
  if (fromInternal) {
    return {
      ourRate: fromInternal,
      pricingStatus: "PROVISIONAL",
      source: "INTERNAL_FIRST",
      attestation: buildLineAttestation({
        pricingStatus: "PROVISIONAL",
        source: "INTERNAL_FIRST",
        catalogWorkId: workId,
        sourceUnitRaw,
        pricingUnit: args.unit,
        provisionalReason: "INTERNAL_FIRST",
        reviewTags: unitTags,
      }),
    };
  }

  return null;
}

function materialStatusFromSell(
  sellPricePln: number | null,
): CatalogWorkQuotesSellStatus {
  if (sellPricePln != null && sellPricePln > 0) return "CURRENT";
  return "MISSING";
}

export type ProvisionalMaterialResolution = {
  sell: CatalogWorkQuotesSellResolve;
  pricingStatus: ProvisionalPricingStatus;
  source: ProvisionalRateSource;
  attestation: ProvisionalLineAttestation;
};

/** MATERIAL_SUPPLY provisional path via catalog companyPricePln only (no Price Memory invent). */
export function tryResolveProvisionalMaterialSell(
  store: WorkCatalogStore,
  args: {
    workId: string;
    quantity: number | null;
    unit: string | null;
    existing: CatalogWorkQuotesSellResolve;
    context?: ProvisionalResolveContext;
  },
): ProvisionalMaterialResolution | null {
  if (!isIkProvisionalEstimationEnabled()) return null;

  const ctx = args.context ?? {};
  const sourceUnitRaw = ctx.sourceUnitRaw ?? args.unit ?? null;
  const rationaleTags = ctx.rationaleTags ?? [];
  const unitTags = unitReviewTags(sourceUnitRaw, resolveProvisionalPricingUnit(args.unit));
  const seamInvolved =
    ctx.bindingPatched === true || hasProvisionalSeamRationale(rationaleTags);

  const workId = String(args.workId ?? "").trim();
  const lineUnit = resolveProvisionalPricingUnit(args.unit);

  if (
    args.existing.status === "CURRENT"
    && args.existing.sellPricePln != null
    && !seamInvolved
    && unitTags.length === 0
  ) {
    return {
      sell: args.existing,
      pricingStatus: "VERIFIED",
      source: "PRICE_MEMORY",
      attestation: buildLineAttestation({
        pricingStatus: "VERIFIED",
        source: "PRICE_MEMORY",
        catalogWorkId: workId || null,
        sourceUnitRaw,
        pricingUnit: lineUnit,
        provisionalReason: null,
      }),
    };
  }

  const work = getWorkByIdFromStore(store, workId);
  if (!work) return null;
  if (!lineUnit || !unitsCompatibleForProvisionalPricing(work.unit, lineUnit)) return null;
  const base = Number(work.companyPricePln);
  if (!Number.isFinite(base) || base <= 0) return null;
  const marginPct = resolveMarginPct(work);
  const sellPricePln = computeSellPricePln(base, marginPct) ?? base;
  if (!Number.isFinite(sellPricePln) || sellPricePln <= 0) return null;

  const status = materialStatusFromSell(sellPricePln);
  const sell: CatalogWorkQuotesSellResolve = {
    status,
    statusLabelPl: status === "CURRENT" ? "PROVISIONAL" : "BRAK CENY MATERIAŁU",
    catalogWorkId: workId,
    materialKey: null,
    basePricePln: base,
    marginPct,
    sellPricePln,
    quantity: args.quantity,
    quantityUnit: args.unit,
    priceObservedAt: null,
    cache: null,
    hit: null,
    material: {
      materialKey: null,
      status: status === "CURRENT" ? "CURRENT" : "MISSING",
      quantity: args.quantity,
      quantityUnit: args.unit,
      sellPricePln,
    },
  };

  return {
    sell,
    pricingStatus: "PROVISIONAL",
    source: "CATALOG_COMPANY_PRICE",
    attestation: buildLineAttestation({
      pricingStatus: "PROVISIONAL",
      source: "CATALOG_COMPANY_PRICE",
      catalogWorkId: workId,
      sourceUnitRaw,
      pricingUnit: lineUnit,
      provisionalReason: "CATALOG_COMPANY_PRICE",
      reviewTags: unitTags,
    }),
  };
}

/** Whether provisional estimate plane allows labor-only pricing (skip BOM). */
export function isProvisionalLaborOnlyPath(
  workId: string,
  estimatePlane?: ProvisionalEstimatePlane,
): boolean {
  if (!isIkProvisionalEstimationEnabled()) return false;
  const id = String(workId ?? "").trim().toLowerCase();
  if (id.startsWith("cc-w2-")) {
    return true;
  }
  const ep = estimatePlane ?? resolveProvisionalEstimatePlane(workId);
  if (!ep.provisional) return false;
  return ep.plane === "LABOR" || ep.plane === "COMPOUND" || ep.plane === "MATERIAL";
}

/** Expose OUR RATE lookup for reports — no side effects. */
export function lookupVerifiedOurRate(
  store: WorkCatalogStore,
  workId: string,
  unit: WgdomCostUnit,
  nowMs: number,
) {
  return lookupWorkRate(store, workId, unit, nowMs);
}
