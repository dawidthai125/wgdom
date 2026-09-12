/**
 * AUTONOMOUS MATERIAL EVIDENCE DISCOVERY (AMED-v1)
 *
 * Provider ladder for market price evidence — NOT a second material/price engine.
 * Feeds AMPED → AUT-MAT. BOM identity ≠ market price evidence.
 *
 * ZERO invent · ZERO Owner runtime · LICENSE_REQUIRED ≠ Owner · fail-closed.
 * NO median/average Accept · DRY-RUN friendly (caller controls persist).
 */

import type { CatalogWork } from "@/lib/work-catalog/types";
import { mapMaterialToMarketWork } from "@/lib/pricing-expert/material-market-map";
import { evaluateMaterialCache } from "./market-material-research-cache";
import {
  createFallbackDiySelectiveLookup,
  createNullDiySelectiveLookup,
} from "./diy-selective-lookup-client";
import { parseDiyShopHtml } from "./diy-shop-html-parse";
import {
  qualifyMarketResearchObservation,
  type QualifyingMarketObservationInput,
} from "./market-research-qualify";
import { roundMarketPricePln } from "@/lib/work-catalog/market-sources";
import { normalizeResearchUnit } from "./market-material-research-provider";
import type { PriceCandidate } from "./price-candidate-types";
import type { DiySelectiveLookupPort, DiyShopProviderId } from "./diy-selective-lookup-types";
import {
  buildMaterialSearchStrategies,
  listMaterialEvidenceKnowledge,
  upsertMaterialEvidenceKnowledge,
} from "./material-evidence-knowledge";
import {
  materialEvidenceMatchesRecoveredSpecification,
  recoverMaterialSpecification,
  runAutonomousMaterialSpecificationRecovery,
  type AmsrNormalizedSpecification,
  type MaterialSpecificationLevel,
  type MaterialSpecificationRecovery,
} from "./material-specification-recovery";
import {
  runAutonomousNamedSystemMarketMatch,
  type RunAmsmResult,
} from "./named-system-market-match";
import { tryConvertMasonryPiecePriceToM2 } from "./masonry-piece-to-m2";

export const AUTONOMOUS_MATERIAL_EVIDENCE_DISCOVERY_VERSION = "AMED-v1" as const;

export type { MaterialSpecificationLevel, MaterialSpecificationRecovery };
export { recoverMaterialSpecification };

export type AmedProviderStatus =
  | "AVAILABLE"
  | "FETCHABLE"
  | "EXTRACTABLE"
  | "RELEVANT"
  | "PRICE_EVIDENCE"
  | "SOFT_ONLY"
  | "LICENSE_REQUIRED"
  | "BLOCKED"
  | "NOT_CONFIGURED";

export type AmedSourceTier =
  | "EXISTING_VALIDATED_MATERIAL_EVIDENCE"
  | "EXISTING_KNOWLEDGE"
  | "PUBLIC_MANUFACTURER"
  | "PUBLIC_CONSTRUCTION_DOCUMENTATION"
  | "PUBLIC_PROCUREMENT_BOQ"
  | "LEGAL_PUBLIC_MATERIAL_CATALOG"
  | "LEGAL_SUPPLIER_CATALOG"
  | "OTHER_LEGAL_MARKET"
  | "LICENSED_PROVIDER";

export type AmedProviderProbe = {
  tier: AmedSourceTier;
  providerId: string;
  status: AmedProviderStatus;
  sourceUrl: string | null;
  legalAccess: boolean;
  notesPl: string | null;
};

export type AmedEvidenceHit = {
  providerId: string;
  materialIdentity: string;
  productSpecification: string | null;
  specificationLevel: MaterialSpecificationLevel;
  unit: string;
  priceNet: number;
  packageSize: number | null;
  priceBasis: string;
  dateIso: string;
  sourceUrl: string;
  provenance: string;
  availabilityContext: string | null;
  sellerKind: string | null;
  qualified: boolean;
  qualifyReject: string | null;
};

export type AmedMaterialCandidate = {
  canonicalMaterialIdentity: string;
  materialKey: string;
  catalogWorkId: string;
  specification: string | null;
  specificationLevel: MaterialSpecificationLevel;
  unit: string;
  normalizedPriceNet: number;
  source: string;
  provenance: string;
  evidenceReference: string;
  dateIso: string;
  freshnessIso: string;
  applicability: string;
  priceBasis: string;
  validationState: "PENDING" | "VALIDATED" | "REJECTED" | "SPEC_MISMATCH";
  /** Candidate ≠ AUT-MAT accept — eligibility gate before contract. */
  autMatEligible: boolean;
  ineligibleReason: string | null;
  priceCandidate: PriceCandidate | null;
};

export type AmedConflictState =
  | "NONE"
  | "FALSE_CONFLICT"
  | "TRUE_CONFLICT"
  | "RESOLVED_SINGLE_SOURCE"
  | "UNRESOLVED";

export type RunAmedInput = {
  materialKey: string;
  namePl: string;
  unit: string;
  qtyFactor: number;
  parentCatalogWorkId: string;
  worksById: ReadonlyMap<string, CatalogWork>;
  region?: string | null;
  nowMs?: number;
  technologyRelation?: string | null;
  factorSourceRef?: string | null;
  diyLookup?: DiySelectiveLookupPort;
  disableLiveResearch?: boolean;
  /** TPI / OfferBoq line — AMSR primary source. */
  offerBoqDescription?: string | null;
  /** Work / technology description. */
  workDescription?: string | null;
  /** ATHED extract snippets. */
  athedExtractTexts?: readonly string[] | null;
  technologyPackTexts?: readonly string[] | null;
  knowledgeTokens?: readonly string[] | null;
  knowledgeProvenance?: string | null;
  /** Optional public procurement / manufacturer URLs for AMSM ladder. */
  knownPublicSourceUrls?: readonly { sourceId: string; url: string; kind?: string }[] | null;
};

export type RunAmedResult = {
  version: typeof AUTONOMOUS_MATERIAL_EVIDENCE_DISCOVERY_VERSION;
  materialKey: string;
  namePl: string;
  specification: MaterialSpecificationRecovery;
  amsr: AmsrNormalizedSpecification | null;
  /** Named-system market match (when AMSR namedSystem set). */
  amsm: RunAmsmResult | null;
  providers: AmedProviderProbe[];
  evidence: AmedEvidenceHit[];
  candidates: AmedMaterialCandidate[];
  conflictState: AmedConflictState;
  conflictNotes: string[];
  missingDimensions: string[];
  autMatReadyCandidate: PriceCandidate | null;
  nextLegal: string;
  ownerRuntimeDependency: 0;
  invent: false;
  productionMutation: false;
};

const DIY_SHOPS: DiyShopProviderId[] = ["leroy", "castorama", "obi"];

function fold(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function specFingerprint(productName: string, hint: string | null): string {
  const h = hint || "";
  const name = fold(productName);
  const thick = (h.match(/(\d+(?:\.\d+)?)mm/) || name.match(/(\d+(?:[.,]\d+)?)\s*mm/))?.[1] || "?";
  const ac = (h.match(/AC([1-6])/i) || name.match(/\bac\s*([1-6])\b/))?.[1] || "?";
  const tech = /lamin/.test(h + name) ? "lam" : /winyl|spc/.test(h + name) ? "vin" : "?";
  return `${tech}|${thick}|AC${ac}`;
}

function buildPriceCandidateFromEvidence(input: {
  materialKey: string;
  catalogWorkId: string;
  namePl: string;
  unit: string;
  region: string;
  nowIso: string;
  hit: AmedEvidenceHit;
}): PriceCandidate {
  return {
    candidateId: `amed_${input.hit.providerId}_${Date.parse(input.hit.dateIso) || 0}`,
    demandId: `amed:${input.materialKey}`,
    provider: (input.hit.providerId === "leroy"
      || input.hit.providerId === "castorama"
      || input.hit.providerId === "obi"
      ? input.hit.providerId
      : "other") as PriceCandidate["provider"],
    sourceType: "market_reference",
    name: input.namePl,
    unit: input.unit,
    priceNet: roundMarketPricePln(input.hit.priceNet),
    currency: "PLN",
    priceDate: input.hit.dateIso.slice(0, 10),
    sourceUrl: input.hit.sourceUrl,
    retrievedAt: input.hit.dateIso,
    provenance: "manual_owner",
    notes: [
      "live_selective_diy",
      `shops=${input.hit.providerId}`,
      "amed_v1",
      `price_basis=${input.hit.priceBasis}`,
      `spec_level=${input.hit.specificationLevel}`,
      "single_source",
      "pending_owner_accept",
    ].join(" · "),
    materialKey: input.materialKey,
    catalogWorkId: input.catalogWorkId,
    region: input.region,
  };
}

/**
 * Multi-source conflict: never median/average. Classify FALSE vs TRUE conflict.
 */
export function resolveAmedEvidenceConflicts(input: {
  bomSpec: MaterialSpecificationRecovery;
  evidence: readonly AmedEvidenceHit[];
}): {
  conflictState: AmedConflictState;
  notes: string[];
  winners: AmedEvidenceHit[];
} {
  const qualified = input.evidence.filter((e) => e.qualified);
  if (qualified.length === 0) {
    return { conflictState: "NONE", notes: ["no_qualified_price_evidence"], winners: [] };
  }

  const byFp = new Map<string, AmedEvidenceHit[]>();
  for (const e of qualified) {
    const fp = specFingerprint(e.productSpecification || e.materialIdentity, e.productSpecification);
    const arr = byFp.get(fp) || [];
    arr.push(e);
    byFp.set(fp, arr);
  }

  if (byFp.size > 1) {
    return {
      conflictState: "FALSE_CONFLICT",
      notes: [
        "different_product_specifications",
        ...[...byFp.keys()].map((k) => `fp:${k}`),
      ],
      winners: [],
    };
  }

  const group = [...byFp.values()][0]!;
  if (group.length === 1) {
    return {
      conflictState: "RESOLVED_SINGLE_SOURCE",
      notes: ["single_qualified_source"],
      winners: [group[0]!],
    };
  }

  const prices = group.map((g) => g.priceNet).sort((a, b) => a - b);
  const lo = prices[0]!;
  const hi = prices[prices.length - 1]!;
  if (lo > 0 && (hi - lo) / lo > 0.08) {
    return {
      conflictState: "TRUE_CONFLICT",
      notes: [`same_spec_price_spread_${lo}_${hi}`],
      winners: [],
    };
  }

  // Freshest single source — corroboration allows pick, not average
  const sorted = [...group].sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  return {
    conflictState: "RESOLVED_SINGLE_SOURCE",
    notes: ["same_spec_corroborated_freshest_single"],
    winners: [sorted[0]!],
  };
}

export async function runAutonomousMaterialEvidenceDiscovery(
  input: RunAmedInput,
): Promise<RunAmedResult> {
  const nowMs = input.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const region = String(input.region || "wroclaw").trim() || "wroclaw";
  const namePl = String(input.namePl || "").trim();
  const materialKey = String(input.materialKey || "").trim();
  const unit = normalizeResearchUnit(input.unit) || String(input.unit || "").trim();

  const amsr = runAutonomousMaterialSpecificationRecovery({
    materialNamePl: namePl,
    unit,
    qtyFactor: input.qtyFactor,
    offerBoqDescription: input.offerBoqDescription ?? null,
    workDescription: input.workDescription ?? input.technologyRelation ?? null,
    athedExtractTexts: input.athedExtractTexts ?? null,
    technologyPackTexts: input.technologyPackTexts ?? null,
    knowledgeTokens: input.knowledgeTokens ?? null,
    knowledgeProvenance: input.knowledgeProvenance ?? null,
    factorSourceRef: input.factorSourceRef,
    nowIso,
  });
  const specification: MaterialSpecificationRecovery = {
    materialCategory: amsr.materialCategory,
    exactSpecification: amsr.exactSpecification,
    specificationLevel: amsr.specificationLevel,
    unit: amsr.unit,
    quantity: amsr.quantity,
    packageBasis: amsr.packageBasis,
    technologyRelation: amsr.technologyRelation,
    source: amsr.source,
    provenance: amsr.provenance,
    inventedAttributes: false,
    missingSpecDimensions: amsr.missingSpecDimensions,
  };

  const map = mapMaterialToMarketWork(materialKey);
  const catalogWorkId = map?.workId || input.parentCatalogWorkId;

  const providers: AmedProviderProbe[] = [];
  const evidence: AmedEvidenceHit[] = [];
  const missingDimensions = [...specification.missingSpecDimensions];
  if (amsr.namedSystem && !missingDimensions.includes("named_system_market_match")) {
    // not a missing BOM attr — tracking for market match separately
  }

  // 1) Existing validated material evidence (Price Memory CURRENT)
  const cache = evaluateMaterialCache({
    materialKey,
    catalogWorkId,
    region,
    worksById: input.worksById,
    nowMs,
  });
  providers.push({
    tier: "EXISTING_VALIDATED_MATERIAL_EVIDENCE",
    providerId: "price_memory_cache",
    status: cache.usability === "CURRENT"
      ? "PRICE_EVIDENCE"
      : cache.usability === "STALE"
      ? "SOFT_ONLY"
      : "AVAILABLE",
    sourceUrl: null,
    legalAccess: true,
    notesPl: `cache=${cache.usability}`,
  });
  if (cache.usability === "CURRENT" && cache.hit) {
    evidence.push({
      providerId: "price_memory_cache",
      materialIdentity: namePl,
      productSpecification: specification.exactSpecification,
      specificationLevel: specification.specificationLevel,
      unit,
      priceNet: roundMarketPricePln(cache.hit.price),
      packageSize: null,
      priceBasis: "price_memory",
      dateIso: cache.hit.updatedAt || nowIso,
      sourceUrl: `price_memory://${catalogWorkId}`,
      provenance: "EXISTING_VALIDATED_MATERIAL_EVIDENCE",
      availabilityContext: region,
      sellerKind: "direct_retailer",
      qualified: true,
      qualifyReject: null,
    });
  }

  // 2) Existing Knowledge (search strategies / prior provider status)
  const knowledge = listMaterialEvidenceKnowledge({
    materialCategory: specification.materialCategory,
  });
  providers.push({
    tier: "EXISTING_KNOWLEDGE",
    providerId: "mek_v1",
    status: knowledge.length > 0 ? "AVAILABLE" : "AVAILABLE",
    sourceUrl: null,
    legalAccess: true,
    notesPl: `records=${knowledge.length}`,
  });

  // 3–5) Public manufacturer / construction docs / procurement — not configured in this MIN seam
  for (const [tier, id] of [
    ["PUBLIC_MANUFACTURER", "public_manufacturer"],
    ["PUBLIC_CONSTRUCTION_DOCUMENTATION", "public_construction_docs"],
    ["PUBLIC_PROCUREMENT_BOQ", "public_procurement_boq"],
  ] as const) {
    providers.push({
      tier,
      providerId: id,
      status: "NOT_CONFIGURED",
      sourceUrl: null,
      legalAccess: true,
      notesPl: "registry_empty_for_material_price",
    });
  }

  // 6–7) Legal public / supplier catalogs (DIY allowlist)
  // When AMSR namedSystem is set — AMSM owns system↔product↔price (no generic-panel Accept).
  const lookup =
    input.diyLookup
    ?? (input.disableLiveResearch
      ? createNullDiySelectiveLookup()
      : createFallbackDiySelectiveLookup());

  let amsm: RunAmsmResult | null = null;
  if (amsr.namedSystem) {
    amsm = await runAutonomousNamedSystemMarketMatch({
      namedSystem: amsr.namedSystem,
      materialCategory: specification.materialCategory,
      materialKey,
      unit,
      catalogWorkId,
      region,
      nowMs,
      amsr,
      athedExtractTexts: input.athedExtractTexts ?? null,
      knownPublicSourceUrls: input.knownPublicSourceUrls ?? null,
      diyLookup: lookup,
      disableLiveResearch: input.disableLiveResearch,
    });
    for (const s of amsm.sources) {
      providers.push({
        tier:
          s.tier === "LEGAL_RETAILER_DISTRIBUTOR" || s.tier === "PUBLIC_CATALOG"
            ? "LEGAL_SUPPLIER_CATALOG"
            : s.tier === "LICENSED_PROVIDER"
            ? "LICENSED_PROVIDER"
            : s.tier === "EXISTING_KNOWLEDGE"
            ? "EXISTING_KNOWLEDGE"
            : s.tier === "PUBLIC_PROCUREMENT_BOQ"
            ? "PUBLIC_PROCUREMENT_BOQ"
            : "PUBLIC_CONSTRUCTION_DOCUMENTATION",
        providerId: `amsm_${s.providerId}`,
        status:
          s.status === "PRICE_EVIDENCE"
            ? "PRICE_EVIDENCE"
            : s.status === "LICENSE_REQUIRED"
            ? "LICENSE_REQUIRED"
            : s.status === "BLOCKED"
            ? "BLOCKED"
            : s.status === "SOFT_ONLY"
            ? "SOFT_ONLY"
            : s.status === "EMPTY" || s.status === "NOT_CONFIGURED"
            ? "NOT_CONFIGURED"
            : s.status === "SYSTEM_LINKAGE" || s.status === "RELEVANT" || s.status === "EXTRACTABLE"
            ? "EXTRACTABLE"
            : "FETCHABLE",
        sourceUrl: s.sourceUrl,
        legalAccess: s.legalAccess,
        notesPl: `[AMSM] ${s.status}${s.notesPl ? ` · ${s.notesPl}` : ""}`,
      });
    }
    if (amsm.candidate) {
      evidence.push({
        providerId: `amsm_${amsm.candidate.provider}`,
        materialIdentity: `${namePl} · ${amsr.namedSystem}`,
        productSpecification: amsm.productEvidence[0]?.productName ?? amsr.exactSpecification,
        specificationLevel: specification.specificationLevel,
        unit,
        priceNet: amsm.candidate.priceNet,
        packageSize: null,
        priceBasis: "amsm_named_system_qualified",
        dateIso: amsm.candidate.retrievedAt || nowIso,
        sourceUrl: amsm.candidate.sourceUrl || `amsm://${amsr.namedSystem}`,
        provenance: "AMSM-v1",
        availabilityContext: region,
        sellerKind: "direct_retailer",
        qualified: true,
        qualifyReject: null,
      });
    }
  }

  const strategies = buildMaterialSearchStrategies({
    materialCategory: specification.materialCategory,
    namePl: amsr.namedSystem
      ? `${namePl} ${amsr.namedSystem}`
      : amsr.exactSpecification
      ? `${namePl} ${amsr.exactSpecification}`
      : namePl,
    unit,
    specificationLevel: specification.specificationLevel,
  });
  if (amsr.namedSystem) {
    strategies.unshift(`${amsr.namedSystem} panele podłogowe`);
  }
  if (amsr.brickType) {
    const cm = amsr.thicknessCm;
    strategies.unshift(
      cm != null
        ? `cegła ${amsr.brickType} ${cm} cm`
        : `cegła ${amsr.brickType}`,
    );
    if (amsr.brickType === "silikat") {
      // Prefer retail brand token queries last-unshift → first in list
      strategies.unshift("cegła Silka");
      if (cm != null) {
        strategies.unshift(`cegła Silka ${cm} cm`);
        strategies.unshift(`Silka ${Math.round(cm * 10)} mm`);
      }
    }
  }
  if (amsr.tileFormat) {
    strategies.unshift(`płytki ceramiczne ${amsr.tileFormat}`);
    strategies.unshift(`glazura ${amsr.tileFormat}`);
    strategies.unshift(`płytki ${amsr.tileFormat} cm`);
    strategies.unshift(`płytki ${amsr.tileFormat}`);
  }
  const query = strategies[0] || namePl;

  upsertMaterialEvidenceKnowledge({
    id: `mek_search_${fold(specification.materialCategory).replace(/\s+/g, "_").slice(0, 48)}`,
    kind: "SEARCH_STRATEGY",
    materialCategory: specification.materialCategory,
    materialKey,
    providerId: null,
    sourceUrl: null,
    searchStrategy: strategies.join(" | "),
    applicability: "category_search",
    evidenceRefs: [`amed:${materialKey}`],
    validationState: "STATUS_ONLY",
    provenance: "AMED-v1",
    freshnessIso: nowIso,
    payload: {
      strategies,
      specificationLevel: specification.specificationLevel,
      namedSystem: amsr.namedSystem,
      amsmDecision: amsm?.matchDecision ?? null,
    },
    invent: false,
    priceAsUniversalTruth: false,
  });

  // Generic DIY: skip live Accept path when namedSystem requires AMSM linkage
  // (still probe for mismatch learning unless AMSM already exhausted retailers).
  const skipGenericDiyForNamedSystem =
    Boolean(amsr.namedSystem)
    && (amsm?.matchDecision === "SYSTEM_PRODUCT_PRICE_ALIGNED"
      || amsm?.matchDecision === "NAMED_SYSTEM_MARKET_GAP_EXHAUSTED");

  if (!input.disableLiveResearch && !skipGenericDiyForNamedSystem) {
    for (const shop of DIY_SHOPS) {
      let looked = null;
      let parsed = null;
      let usedQuery = query;
      // Try top strategies until identity-matching PDP (bounded · not catalogue harvest)
      const tryQueries = [...new Set(strategies.slice(0, 4))];
      for (const qTry of tryQueries) {
        const attempt = await lookup.lookup({
          provider: shop,
          query: qTry,
          materialKey,
          maxUrls: 1,
        });
        if (!attempt.ok) {
          looked = attempt;
          continue;
        }
        const p = parseDiyShopHtml({
          provider: shop,
          html: attempt.page.bodyText,
          query: qTry,
          sourceUrl: attempt.page.finalUrl || attempt.page.requestUrl,
        });
        looked = attempt;
        if (p?.identityMatched) {
          parsed = p;
          usedQuery = qTry;
          break;
        }
        // keep last parse for diagnostics
        parsed = p;
        usedQuery = qTry;
      }

      if (!looked || !looked.ok) {
        const blocked = /403|BLOCK|UPSTREAM_403/i.test(String(looked?.error || ""));
        providers.push({
          tier: "LEGAL_SUPPLIER_CATALOG",
          providerId: shop,
          status: blocked ? "BLOCKED" : "FETCHABLE",
          sourceUrl: null,
          legalAccess: true,
          notesPl: looked?.error || "lookup_fail",
        });
        upsertMaterialEvidenceKnowledge({
          id: `mek_provider_${shop}_${fold(specification.materialCategory).slice(0, 32)}`,
          kind: "PROVIDER_STATUS",
          materialCategory: specification.materialCategory,
          materialKey,
          providerId: shop,
          sourceUrl: null,
          searchStrategy: usedQuery,
          applicability: "diy_selective",
          evidenceRefs: [],
          validationState: "STATUS_ONLY",
          provenance: "AMED-v1",
          freshnessIso: nowIso,
          payload: { error: looked?.error, status: blocked ? "BLOCKED" : "FETCHABLE" },
          invent: false,
          priceAsUniversalTruth: false,
        });
        continue;
      }

      providers.push({
        tier: "LEGAL_SUPPLIER_CATALOG",
        providerId: shop,
        status: !parsed
          ? "EXTRACTABLE"
          : !parsed.identityMatched
          ? "RELEVANT"
          : parsed.priceGrossPln > 0
          ? "PRICE_EVIDENCE"
          : "SOFT_ONLY",
        sourceUrl: looked.page.finalUrl || looked.page.requestUrl,
        legalAccess: true,
        notesPl: parsed
          ? `identity=${parsed.identityMatched};basis=${parsed.priceBasis};seller=${parsed.sellerKind};q=${usedQuery}`
          : "parse_null",
      });

      if (!parsed?.identityMatched) continue;

      // Reject SERP / non-PDP (same rule as AMSM) — never Accept a search page price
      const srcUrl = parsed.sourceUrl || looked.page.finalUrl || "";
      if (/\/search[/?]|\/szukaj/i.test(srcUrl) && !/_CAPL\.prd|\/p\/\d+\//i.test(srcUrl)) {
        providers[providers.length - 1]!.notesPl =
          `${providers[providers.length - 1]!.notesPl || ""} · SERP_REJECTED`;
        continue;
      }

      // Brick category: reject tools/accessories that only mention Silka in title
      if (amsr.brickType || /ceg|silikat|bloczek/.test(fold(namePl))) {
        const pn = fold(parsed.productName);
        if (/brzeszczot|pila|pil[ay]|otwornic|wiertl|narzedz|uchwyt|reczn/.test(pn)) {
          continue;
        }
        if (!/cegl|silka|silikat|bloczek|pustak|wapienno/.test(pn)) {
          continue;
        }
      }

      // Tile category: require tile token in product name when format recovered
      if (amsr.tileFormat || /plytk|glazur|gres/.test(fold(namePl))) {
        const pn = fold(parsed.productName);
        // Stickers / decals are not ceramic tiles — reject even if title contains "płytki"
        if (/naklejk|sticker|decal|folia\s+dekor|samoprzylep/.test(pn)) {
          continue;
        }
        // Adhesive / mortar is binder, not the tile material
        if (
          /\bklej\b|zaprawa|fug[ai]|grunt|primer|mortar|adhesive/.test(pn)
          && !/plytk[ai]|glazur|gres|terakota|faians|ceramiczn/.test(pn.replace(/\bklej\b.*$/i, ""))
        ) {
          continue;
        }
        if (/klej\s+do\s+plyt|klej\s+zelowy|atlas\s+geoflex|sopro|ceresit\s+cm/.test(pn)) {
          continue;
        }
        if (!/plytk|glazur|gres|terakota|faians|ceramiczn/.test(pn)) {
          continue;
        }
        // When format is known, require format digits in name/spec (no popularity invent)
        if (amsr.tileFormat) {
          const fmt = String(amsr.tileFormat).toLowerCase().replace(/×/g, "x");
          const [a, b] = fmt.split("x");
          const hay = `${pn} ${fold(String(parsed.productSpecificationHint || ""))}`;
          const hasFmt =
            hay.includes(fmt)
            || (a && b && (hay.includes(`${a}x${b}`) || hay.includes(`${a} x ${b}`)));
          if (!hasFmt) continue;
        }
      }

      let priceNet = parsed.priceGrossPln;
      let priceBasis = parsed.priceBasis || "unknown";
      let packageSize: number | null = parsed.packageAreaM2 ?? null;

      // Package → m² only with explicit pack area (math), never invent.
      if (
        unit === "m2"
        && parsed.isPackagePrice
        && parsed.priceBasis === "package"
        && parsed.packageAreaM2
        && parsed.packageAreaM2 > 0
      ) {
        priceNet = roundMarketPricePln(parsed.priceGrossPln / parsed.packageAreaM2);
        priceBasis = "package_to_m2_explicit";
      } else if (
        unit === "m2"
        && amsr.thicknessCm != null
        && (parsed.priceBasis === "unknown" || parsed.isPackagePrice)
        && !/\/\s*m/i.test(String(parsed.productSpecificationHint || ""))
      ) {
        const conv = tryConvertMasonryPiecePriceToM2({
          productName: parsed.productName,
          html: looked.page.bodyText,
          priceGrossPln: parsed.priceGrossPln,
          requiredThicknessCm: amsr.thicknessCm,
        });
        if (conv) {
          priceNet = conv.priceNetPerM2;
          priceBasis = conv.priceBasis;
          packageSize = conv.faceAreaM2;
        } else if (parsed.isPackagePrice && parsed.priceBasis !== "per_m2") {
          continue;
        }
      } else if (parsed.isPackagePrice && unit !== "kg" && parsed.priceBasis !== "per_m2") {
        continue;
      }

      const raw: QualifyingMarketObservationInput = {
        materialKey,
        provider: shop,
        priceNet,
        currency: "PLN",
        priceType: parsed.priceType,
        sellerKind: parsed.sellerKind,
        sellerName: parsed.sellerName,
        observedAt: looked.page.fetchedAtIso || nowIso,
        sourceUrl: parsed.sourceUrl,
        sku: parsed.sku,
      };
      const q = qualifyMarketResearchObservation(raw);
      const productSpec =
        [parsed.productName, parsed.productSpecificationHint].filter(Boolean).join(" · ")
        || null;
      const evidenceLevel: MaterialSpecificationLevel = productSpec
        ? "PRODUCT_SPECIFIC"
        : "CATEGORY_GENERIC";

      evidence.push({
        providerId: shop,
        materialIdentity: namePl,
        productSpecification: productSpec
          ? `${parsed.productName} · ${productSpec}`
          : parsed.productName,
        specificationLevel: evidenceLevel,
        unit,
        priceNet: roundMarketPricePln(priceNet),
        packageSize,
        priceBasis,
        dateIso: nowIso,
        sourceUrl: parsed.sourceUrl,
        provenance: "LEGAL_SUPPLIER_CATALOG_DIRECT_OR_EDGE",
        availabilityContext: parsed.sellerName,
        sellerKind: parsed.sellerKind,
        qualified: q.ok,
        qualifyReject: q.ok ? null : q.reason,
      });

      upsertMaterialEvidenceKnowledge({
        id: `mek_extract_${shop}_${fold(namePl).replace(/\s+/g, "_").slice(0, 40)}`,
        kind: "EXTRACTION_PATTERN",
        materialCategory: specification.materialCategory,
        materialKey,
        providerId: shop,
        sourceUrl: parsed.sourceUrl,
        searchStrategy: usedQuery,
        applicability: evidenceLevel,
        evidenceRefs: [parsed.sourceUrl],
        validationState: q.ok ? "UNVERIFIED" : "REJECTED",
        provenance: "AMED-v1",
        freshnessIso: nowIso,
        payload: {
          priceBasis,
          specificationLevel: evidenceLevel,
          qualified: q.ok,
        },
        invent: false,
        priceAsUniversalTruth: false,
      });
    }
  } else {
    for (const shop of DIY_SHOPS) {
      providers.push({
        tier: "LEGAL_SUPPLIER_CATALOG",
        providerId: shop,
        status: "NOT_CONFIGURED",
        sourceUrl: null,
        legalAccess: true,
        notesPl: input.disableLiveResearch
          ? "live_research_disabled"
          : skipGenericDiyForNamedSystem
          ? "generic_diy_skipped · amsm_owns_named_system"
          : "live_research_disabled",
      });
    }
  }

  // 8) Other legal market — placeholder
  providers.push({
    tier: "OTHER_LEGAL_MARKET",
    providerId: "other_legal_market",
    status: "NOT_CONFIGURED",
    sourceUrl: null,
    legalAccess: true,
    notesPl: null,
  });

  // 9) Licensed
  providers.push({
    tier: "LICENSED_PROVIDER",
    providerId: "sekocenbud_or_licensed",
    status: "LICENSE_REQUIRED",
    sourceUrl: null,
    legalAccess: false,
    notesPl: "LICENSE_REQUIRED ≠ Owner — configure license; do not bypass paywall",
  });

  const conflict = resolveAmedEvidenceConflicts({
    bomSpec: specification,
    evidence,
  });

  const candidates: AmedMaterialCandidate[] = [];
  let autMatReadyCandidate: PriceCandidate | null = null;

  // Price Memory CURRENT → eligible if identity trusted upstream (AMPED checks)
  // Named system: cache alone ≠ system↔product linkage — AMSM required.
  for (const hit of evidence.filter((e) => e.providerId === "price_memory_cache" && e.qualified)) {
    if (amsr.namedSystem && amsm?.matchDecision !== "SYSTEM_PRODUCT_PRICE_ALIGNED") {
      candidates.push({
        canonicalMaterialIdentity: namePl,
        materialKey,
        catalogWorkId,
        specification: specification.exactSpecification,
        specificationLevel: specification.specificationLevel,
        unit,
        normalizedPriceNet: hit.priceNet,
        source: hit.providerId,
        provenance: hit.provenance,
        evidenceReference: hit.sourceUrl,
        dateIso: hit.dateIso,
        freshnessIso: hit.dateIso,
        applicability: "price_memory_blocked_named_system",
        priceBasis: hit.priceBasis,
        validationState: "SPEC_MISMATCH",
        autMatEligible: false,
        ineligibleReason: "NAMED_SYSTEM_REQUIRES_AMSM_LINKAGE",
        priceCandidate: null,
      });
      continue;
    }
    const pc = buildPriceCandidateFromEvidence({
      materialKey,
      catalogWorkId,
      namePl,
      unit,
      region,
      nowIso,
      hit,
    });
    pc.notes = "live_selective_diy · shops=cache · price_memory_current · amed_cache_reuse";
    candidates.push({
      canonicalMaterialIdentity: namePl,
      materialKey,
      catalogWorkId,
      specification: specification.exactSpecification,
      specificationLevel: specification.specificationLevel,
      unit,
      normalizedPriceNet: hit.priceNet,
      source: hit.providerId,
      provenance: hit.provenance,
      evidenceReference: hit.sourceUrl,
      dateIso: hit.dateIso,
      freshnessIso: hit.dateIso,
      applicability: "price_memory_current",
      priceBasis: hit.priceBasis,
      validationState: "VALIDATED",
      autMatEligible: true,
      ineligibleReason: null,
      priceCandidate: pc,
    });
    autMatReadyCandidate = pc;
  }

  // AMSM single-source candidate (named system) — prefer over generic winners
  if (amsm?.candidate && amsm.matchDecision === "SYSTEM_PRODUCT_PRICE_ALIGNED") {
    autMatReadyCandidate = amsm.candidate;
    if (!candidates.some((c) => c.evidenceReference === amsm!.candidate!.sourceUrl)) {
      candidates.unshift({
        canonicalMaterialIdentity: `${namePl} · ${amsr.namedSystem}`,
        materialKey,
        catalogWorkId,
        specification: amsm.productEvidence[0]?.productName ?? amsr.exactSpecification,
        specificationLevel: specification.specificationLevel,
        unit,
        normalizedPriceNet: amsm.candidate.priceNet,
        source: `amsm_${amsm.candidate.provider}`,
        provenance: "AMSM-v1",
        evidenceReference: amsm.candidate.sourceUrl || `amsm://${amsr.namedSystem}`,
        dateIso: amsm.candidate.retrievedAt || nowIso,
        freshnessIso: amsm.candidate.retrievedAt || nowIso,
        applicability: "amsm_named_system_qualified",
        priceBasis: "amsm_named_system_qualified",
        validationState: "PENDING",
        autMatEligible: true,
        ineligibleReason: null,
        priceCandidate: amsm.candidate,
      });
    }
  }

  for (const hit of conflict.winners) {
    if (hit.providerId === "price_memory_cache") continue;
    if (String(hit.providerId).startsWith("amsm_") && amsm?.candidate) {
      // already surfaced above
      continue;
    }

    // BOM category-generic / partial must match recovered attrs — never invent SKU Accept.
    const specMatch = materialEvidenceMatchesRecoveredSpecification({
      recovered: amsr,
      productName: hit.productSpecification || namePl,
      productSpecificationHint: hit.productSpecification,
    });
    const specMismatch = !specMatch.matched;

    const pc = buildPriceCandidateFromEvidence({
      materialKey,
      catalogWorkId,
      namePl,
      unit,
      region,
      nowIso,
      hit,
    });

    const eligible = !specMismatch && hit.qualified;
    candidates.push({
      canonicalMaterialIdentity: namePl,
      materialKey,
      catalogWorkId,
      specification: hit.productSpecification,
      specificationLevel: hit.specificationLevel,
      unit,
      normalizedPriceNet: hit.priceNet,
      source: hit.providerId,
      provenance: hit.provenance,
      evidenceReference: hit.sourceUrl,
      dateIso: hit.dateIso,
      freshnessIso: hit.dateIso,
      applicability: specMismatch
        ? "evidence_only_product_beyond_recovered_spec"
        : "single_source_qualified",
      priceBasis: hit.priceBasis,
      validationState: specMismatch ? "SPEC_MISMATCH" : hit.qualified ? "PENDING" : "REJECTED",
      autMatEligible: eligible,
      ineligibleReason: specMismatch
        ? specMatch.reason
        : hit.qualified
        ? null
        : hit.qualifyReject,
      priceCandidate: eligible ? pc : null,
    });

    if (eligible && !autMatReadyCandidate) {
      autMatReadyCandidate = pc;
    }
  }

  // Surface product evidence even when FALSE_CONFLICT (learning / report) — not AUT-MAT eligible
  if (conflict.conflictState === "FALSE_CONFLICT" || conflict.conflictState === "TRUE_CONFLICT") {
    for (const hit of evidence.filter((e) => e.qualified && e.providerId !== "price_memory_cache")) {
      if (candidates.some((c) => c.evidenceReference === hit.sourceUrl)) continue;
      candidates.push({
        canonicalMaterialIdentity: namePl,
        materialKey,
        catalogWorkId,
        specification: hit.productSpecification,
        specificationLevel: hit.specificationLevel,
        unit,
        normalizedPriceNet: hit.priceNet,
        source: hit.providerId,
        provenance: hit.provenance,
        evidenceReference: hit.sourceUrl,
        dateIso: hit.dateIso,
        freshnessIso: hit.dateIso,
        applicability: "conflict_evidence_not_accepted",
        priceBasis: hit.priceBasis,
        validationState: "REJECTED",
        autMatEligible: false,
        ineligibleReason:
          conflict.conflictState === "FALSE_CONFLICT"
            ? "FALSE_CONFLICT · different_specifications"
            : "TRUE_CONFLICT · same_spec_unresolved",
        priceCandidate: null,
      });
    }
    if (!missingDimensions.includes("same_specification_corroboration")) {
      missingDimensions.push(
        conflict.conflictState === "FALSE_CONFLICT"
          ? "BOM_OR_EVIDENCE_SPECIFICATION_ALIGNMENT"
          : "AUTONOMOUS_PRICE_CONFLICT_RESOLUTION",
      );
    }
  }

  if (
    !autMatReadyCandidate
    && evidence.some((e) => e.specificationLevel === "PRODUCT_SPECIFIC")
  ) {
    if (amsr.namedSystem) {
      if (!missingDimensions.includes("NAMED_SYSTEM_MARKET_MATCH")) {
        missingDimensions.unshift("NAMED_SYSTEM_MARKET_MATCH");
      }
    } else if (!missingDimensions.includes("BOM_MATERIAL_SPECIFICATION")) {
      missingDimensions.unshift("BOM_MATERIAL_SPECIFICATION");
    }
  }

  if (
    amsr.namedSystem
    && amsm
    && amsm.matchDecision !== "SYSTEM_PRODUCT_PRICE_ALIGNED"
    && !missingDimensions.includes("NAMED_SYSTEM_MARKET_GAP")
  ) {
    missingDimensions.unshift("NAMED_SYSTEM_MARKET_GAP");
  }

  let nextLegal = "AUTONOMOUS_RESOLUTION_QUEUE · MATERIAL_EVIDENCE_GAP";
  if (autMatReadyCandidate) {
    nextLegal = "CANDIDATE_READY · CONTINUE_AUT_MAT";
  } else if (
    amsr.namedSystem
    && amsm?.matchDecision === "NAMED_SYSTEM_MARKET_GAP_EXHAUSTED"
  ) {
    nextLegal =
      "AUTONOMOUS_RESOLUTION_QUEUE · EXHAUSTED_EVIDENCE_GAP · NAMED_SYSTEM_MARKET_GAP_EXHAUSTED";
  } else if (
    amsr.namedSystem
    && amsm?.matchDecision === "SYSTEM_PRODUCT_LINKED_NO_QUALIFIED_PRICE"
  ) {
    nextLegal =
      "AUTONOMOUS_RESOLUTION_QUEUE · NAMED_SYSTEM_PRICE_GAP";
  } else if (conflict.conflictState === "TRUE_CONFLICT") {
    nextLegal = "AUTONOMOUS_RESOLUTION_QUEUE · MATERIAL_EVIDENCE_CONFLICT";
  } else if (amsr.namedSystem && !autMatReadyCandidate) {
    nextLegal =
      "AUTONOMOUS_RESOLUTION_QUEUE · MATERIAL_EVIDENCE_GAP · NAMED_SYSTEM_OR_SPEC_MATCH";
  } else if (conflict.conflictState === "FALSE_CONFLICT") {
    nextLegal =
      "AUTONOMOUS_RESOLUTION_QUEUE · MATERIAL_EVIDENCE_GAP · SPECIFICATION_ALIGNMENT";
  } else if (providers.some((p) => p.status === "LICENSE_REQUIRED") && evidence.length === 0) {
    nextLegal = "AUTONOMOUS_RESOLUTION_QUEUE · MATERIAL_EVIDENCE_GAP · LICENSE_OR_LIVE_FETCH";
  }

  upsertMaterialEvidenceKnowledge({
    id: `mek_validation_${fold(materialKey || namePl).replace(/\s+/g, "_").slice(0, 48)}`,
    kind: "VALIDATION_OUTCOME",
    materialCategory: specification.materialCategory,
    materialKey,
    providerId: null,
    sourceUrl: null,
    searchStrategy: query,
    applicability: conflict.conflictState,
    evidenceRefs: evidence.map((e) => e.sourceUrl).filter(Boolean),
    validationState: autMatReadyCandidate ? "VALIDATED" : "REJECTED",
    provenance: "AMED-v1",
    freshnessIso: nowIso,
    payload: {
      conflictState: conflict.conflictState,
      evidenceCount: evidence.length,
      candidateCount: candidates.length,
      autMatReady: Boolean(autMatReadyCandidate),
      missingDimensions,
      amsrLevel: amsr.specificationLevel,
      namedSystem: amsr.namedSystem,
      amsmDecision: amsm?.matchDecision ?? null,
      amsmExhaustedGap: amsm?.exhaustedGap ?? null,
    },
    invent: false,
    priceAsUniversalTruth: false,
  });

  return {
    version: AUTONOMOUS_MATERIAL_EVIDENCE_DISCOVERY_VERSION,
    materialKey,
    namePl,
    specification,
    amsr,
    amsm,
    providers,
    evidence,
    candidates,
    conflictState: conflict.conflictState,
    conflictNotes: conflict.notes,
    missingDimensions,
    autMatReadyCandidate,
    nextLegal,
    ownerRuntimeDependency: 0,
    invent: false,
    productionMutation: false,
  };
}
