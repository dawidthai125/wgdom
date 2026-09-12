/**
 * AUTONOMOUS NAMED-SYSTEM MARKET MATCH (AMSM-v1)
 *
 * Generic: any AMSR namedSystem → legal discovery → system↔product linkage → price evidence.
 * Reuses DIY selective lookup + MEK · ZERO invent · ZERO generic-panel fallback · ZERO weaken AUT-MAT.
 *
 * namedSystem identity ≠ product identity ≠ SKU ≠ market price.
 */

import { parseDiyShopHtml } from "./diy-shop-html-parse";
import {
  createFallbackDiySelectiveLookup,
  createNullDiySelectiveLookup,
} from "./diy-selective-lookup-client";
import {
  qualifyMarketResearchObservation,
  type QualifyingMarketObservationInput,
} from "./market-research-qualify";
import { roundMarketPricePln } from "@/lib/work-catalog/market-sources";
import { normalizeResearchUnit } from "./market-material-research-provider";
import type { DiySelectiveLookupPort, DiyShopProviderId } from "./diy-selective-lookup-types";
import type { PriceCandidate } from "./price-candidate-types";
import {
  listMaterialEvidenceKnowledge,
  upsertMaterialEvidenceKnowledge,
  recordExhaustedEvidenceGap,
  findExhaustedEvidenceGap,
} from "./material-evidence-knowledge";
import type { AmsrNormalizedSpecification } from "./material-specification-recovery";

export const AUTONOMOUS_NAMED_SYSTEM_MARKET_MATCH_VERSION = "AMSM-v1" as const;

export type AmsmSourceTier =
  | "EXISTING_KNOWLEDGE"
  | "ATHED_PUBLIC_TECHNICAL"
  | "MANUFACTURER_SYSTEM_OWNER"
  | "PUBLIC_PROCUREMENT_BOQ"
  | "PUBLIC_CATALOG"
  | "LEGAL_RETAILER_DISTRIBUTOR"
  | "LICENSED_PROVIDER";

export type AmsmProviderStatus =
  | "AVAILABLE"
  | "FETCHABLE"
  | "EXTRACTABLE"
  | "RELEVANT"
  | "SYSTEM_LINKAGE"
  | "PRICE_EVIDENCE"
  | "SOFT_ONLY"
  | "LICENSE_REQUIRED"
  | "BLOCKED"
  | "NOT_CONFIGURED"
  | "EMPTY"
  | "NO_SYSTEM_LINKAGE";

export type AmsmSourceProbe = {
  tier: AmsmSourceTier;
  providerId: string;
  status: AmsmProviderStatus;
  sourceUrl: string | null;
  legalAccess: boolean;
  notesPl: string | null;
  systemIdentityEvidence: string | null;
  productIdentityEvidence: string | null;
};

export type AmsmSystemIdentityEvidence = {
  namedSystem: string;
  sourceTier: AmsmSourceTier;
  sourceRef: string;
  snippet: string;
  invent: false;
};

export type AmsmProductEvidence = {
  productName: string;
  specificationHint: string | null;
  sourceUrl: string;
  providerId: string;
  systemLinkage: true;
  linkageReason: string;
  invent: false;
};

export type AmsmPriceEvidence = {
  priceNet: number;
  unit: string;
  priceBasis: string;
  dateIso: string;
  sourceUrl: string;
  providerId: string;
  qualified: boolean;
  qualifyReject: string | null;
  invent: false;
};

export type AmsmMatchDecision =
  | "SYSTEM_PRODUCT_PRICE_ALIGNED"
  | "SYSTEM_PRODUCT_LINKED_NO_QUALIFIED_PRICE"
  | "NO_SYSTEM_PRODUCT_LINKAGE"
  | "NAMED_SYSTEM_MARKET_GAP_EXHAUSTED";

export type RunAmsmInput = {
  namedSystem: string;
  materialCategory: string;
  materialKey: string;
  unit: string;
  catalogWorkId: string;
  region?: string | null;
  nowMs?: number;
  /** AMSR recovered partial/full spec — for provenance merge, not invent. */
  amsr?: AmsrNormalizedSpecification | null;
  /** ATHED / public extract texts already fetched. */
  athedExtractTexts?: readonly string[] | null;
  /** Optional public procurement / manufacturer URLs (allowlisted by caller). */
  knownPublicSourceUrls?: readonly { sourceId: string; url: string; kind?: string }[] | null;
  diyLookup?: DiySelectiveLookupPort;
  disableLiveResearch?: boolean;
};

export type RunAmsmResult = {
  version: typeof AUTONOMOUS_NAMED_SYSTEM_MARKET_MATCH_VERSION;
  namedSystem: string;
  sources: AmsmSourceProbe[];
  systemIdentityEvidence: AmsmSystemIdentityEvidence[];
  recoveredSpecification: {
    fromAmsr: AmsrNormalizedSpecification | null;
    fromMarketDocs: Record<string, string>;
    inventedAttributes: false;
  };
  productEvidence: AmsmProductEvidence[];
  priceEvidence: AmsmPriceEvidence[];
  matchDecision: AmsmMatchDecision;
  matchNotes: string[];
  candidate: PriceCandidate | null;
  exhaustedGap: string[] | null;
  nextLegal: string;
  ownerRuntimeDependency: 0;
  invent: false;
  productionMutation: false;
};

const DIY_SHOPS: DiyShopProviderId[] = ["leroy", "castorama", "obi"];

/** Common Polish adjectives / stems that are NOT proprietary named systems. */
const NAMED_SYSTEM_STOPWORDS = new Set(
  [
    "podlogowych",
    "podlog",
    "drewnianych",
    "drewnian",
    "laminowanych",
    "laminowan",
    "winylowych",
    "winylow",
    "cementowych",
    "cementow",
    "gipsowych",
    "gipsow",
    "mineralnych",
    "mineraln",
    "naturalnych",
    "naturaln",
    "sztucznych",
    "sztuczn",
    "budowlanych",
    "budowlan",
    "wewnetrznych",
    "wewnetrzn",
    "zewnetrznych",
    "zewnetrzn",
    "przemyslowych",
    "przemyslow",
    "komercyjnych",
    "komercyjn",
    "mieszkaniowych",
    "mieszkaniow",
    "systemowych",
    "systemow",
    "analogicznych",
    "analogiczn",
    "podobnych",
    "podobn",
    "warstwowych",
    "warstwow",
    "jednowarstw",
    "dwuwarstw",
    "trojwarstw",
    "trójwarstw",
    "wielowarstw",
    "odpornych",
    "odporn",
    "antystatycznych",
    "antystatyczn",
    // work/description adjectives — never proprietary systems
    "dzial",
    "dzialow",
    "piask",
    "piaskow",
    "wapienn",
    "klej",
    "klejow",
    "zapraw",
    "zaprawow",
    "sciank",
    "scian",
    "licowan",
    "kombinowan",
    "przygotowan",
    "podloz",
    "silikat", // material type → brick_type, not namedSystem
    "ceramiczn",
    "klinkier",
    "betonow",
    "cementow",
    "wapiennopiask",
    "wapienno",
    "piaskow",
    "anhydryt", // screed material type ≠ proprietary tile system
    "anhydrytow",
    // door/window BOQ adjectives — never tile/panel named systems
    "jednoskrzydl",
    "dwuskrzydl",
    "skrzydl",
    "osciezn",
    "stolark",
    "okienn",
    "drzwiow",
    "zespolon",
    "uchyln",
    "rozwieran",
  ].map((s) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/ł/g, "l"),
  ),
);

function fold(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l");
}

/**
 * Generic named-system stem from BOQ adjective (…owych) — excludes stopwords.
 * E.g. "prospanelowych" → "prospanel".
 */
export function extractNamedSystemCandidatesFromText(text: string): string[] {
  const raw = String(text || "");
  const out: string[] = [];
  const re =
    /\b([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż][A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż0-9]{3,})(?:owych|owy|owe|owa|u)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const stem = fold(m[1]!).replace(/-/g, "");
    if (NAMED_SYSTEM_STOPWORDS.has(stem)) continue;
    // Proprietary system stems are typically long brand-like tokens (e.g. prospanel)
    if (stem.length < 8) continue;
    if (!out.includes(stem)) out.push(stem);
  }
  // Explicit Latin brand tokens (no Polish ending)
  const brand = raw.match(/\b(Prospanel|PROSPANEL)\b/g);
  if (brand) {
    for (const b of brand) {
      const s = fold(b);
      if (!out.includes(s)) out.push(s);
    }
  }
  return out;
}

/** Strict: product NAME must contain namedSystem token (URL query alone ≠ linkage). */
export function productLinksToNamedSystem(input: {
  namedSystem: string;
  productName: string;
  sourceUrl?: string | null;
  htmlSnippet?: string | null;
}): { linked: boolean; reason: string } {
  const ns = fold(input.namedSystem);
  if (!ns || ns.length < 3) {
    return { linked: false, reason: "EMPTY_NAMED_SYSTEM" };
  }
  const nameF = fold(input.productName);
  // Search / listing chrome is never a product identity
  if (
    /wyniki wyszukiwania|search results|majsterkowanie w castoramie|szukaj w/.test(nameF)
    || nameF.length < 8
  ) {
    return { linked: false, reason: "NO_SYSTEM_LINKAGE · search_or_chrome_title" };
  }
  if (nameF.includes(ns)) {
    return {
      linked: true,
      reason: `token_in_product_name · ${ns}`,
    };
  }
  // Path segment (not query) may corroborate only when name also has product-like tokens
  const url = String(input.sourceUrl || "");
  const pathOnly = url.split("?")[0] || "";
  if (
    /\/search|\/szukaj|\/katalog\/wyszukiwanie/i.test(url)
    || !/_CAPL|\.prd|\/p\/\d+|\/product\//i.test(pathOnly)
  ) {
    return {
      linked: false,
      reason: `NO_SYSTEM_LINKAGE · required=${ns} · not_pdp_or_name_lacks_token`,
    };
  }
  if (fold(pathOnly).includes(ns) && nameF.length >= 12) {
    return {
      linked: true,
      reason: `token_in_pdp_path · ${ns}`,
    };
  }
  return {
    linked: false,
    reason: `NO_SYSTEM_LINKAGE · required=${ns} · product_lacks_named_system_token`,
  };
}

/** Reject Castorama/Leroy/OBI search SERP as if it were a product. */
export function isNamedSystemRetailPdpUrl(url: string | null | undefined): boolean {
  const u = String(url || "");
  if (!u) return false;
  if (/\/search\?|\/search\/|\/szukaj/i.test(u)) return false;
  return /_CAPL\.prd|\.prd(?:\?|$)|\/p\/\d+|\/product\//i.test(u);
}

function buildCandidate(input: {
  materialKey: string;
  catalogWorkId: string;
  namedSystem: string;
  materialCategory: string;
  unit: string;
  region: string;
  nowIso: string;
  price: AmsmPriceEvidence;
  product: AmsmProductEvidence;
}): PriceCandidate {
  return {
    candidateId: `amsm_${input.namedSystem}_${input.price.providerId}_${Date.parse(input.price.dateIso) || 0}`,
    demandId: `amsm:${input.namedSystem}:${input.materialKey}`,
    provider: (input.price.providerId === "leroy"
      || input.price.providerId === "castorama"
      || input.price.providerId === "obi"
      ? input.price.providerId
      : "other") as PriceCandidate["provider"],
    sourceType: "market_reference",
    name: `${input.materialCategory} · ${input.namedSystem}`,
    unit: input.unit,
    priceNet: roundMarketPricePln(input.price.priceNet),
    currency: "PLN",
    priceDate: input.price.dateIso.slice(0, 10),
    sourceUrl: input.price.sourceUrl,
    retrievedAt: input.price.dateIso,
    provenance: "manual_owner",
    notes: [
      "live_selective_diy",
      `shops=${input.price.providerId}`,
      "amsm_v1",
      `named_system=${input.namedSystem}`,
      `system_linkage=${input.product.linkageReason}`,
      `price_basis=${input.price.priceBasis}`,
      "single_source",
      "pending_owner_accept",
    ].join(" · "),
    materialKey: input.materialKey,
    catalogWorkId: input.catalogWorkId,
    region: input.region,
  };
}

export async function runAutonomousNamedSystemMarketMatch(
  input: RunAmsmInput,
): Promise<RunAmsmResult> {
  const nowMs = input.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const region = String(input.region || "wroclaw").trim() || "wroclaw";
  const namedSystem = fold(input.namedSystem).trim();
  const unit = normalizeResearchUnit(input.unit) || String(input.unit || "").trim();
  const sources: AmsmSourceProbe[] = [];
  const systemIdentityEvidence: AmsmSystemIdentityEvidence[] = [];
  const productEvidence: AmsmProductEvidence[] = [];
  const priceEvidence: AmsmPriceEvidence[] = [];
  const fromMarketDocs: Record<string, string> = {};
  const matchNotes: string[] = [];

  if (!namedSystem) {
    return {
      version: AUTONOMOUS_NAMED_SYSTEM_MARKET_MATCH_VERSION,
      namedSystem: "",
      sources: [],
      systemIdentityEvidence: [],
      recoveredSpecification: {
        fromAmsr: input.amsr ?? null,
        fromMarketDocs: {},
        inventedAttributes: false,
      },
      productEvidence: [],
      priceEvidence: [],
      matchDecision: "NAMED_SYSTEM_MARKET_GAP_EXHAUSTED",
      matchNotes: ["empty_named_system"],
      candidate: null,
      exhaustedGap: ["EMPTY_NAMED_SYSTEM"],
      nextLegal: "AUTONOMOUS_RESOLUTION_QUEUE · NAMED_SYSTEM_MARKET_GAP",
      ownerRuntimeDependency: 0,
      invent: false,
      productionMutation: false,
    };
  }

  // —— 1. EXISTING_KNOWLEDGE ——
  const knowledge = listMaterialEvidenceKnowledge({
    materialCategory: input.materialCategory,
  }).filter((r) => {
    const payload = JSON.stringify(r.payload || {});
    return fold(`${r.searchStrategy || ""} ${payload} ${r.applicability}`).includes(namedSystem);
  });
  const validatedLink = knowledge.find(
    (r) =>
      r.validationState === "VALIDATED"
      && (r.kind === "SPECIFICATION_MATCHING" || r.kind === "VALIDATION_OUTCOME"),
  );
  sources.push({
    tier: "EXISTING_KNOWLEDGE",
    providerId: "mek_v1",
    status: validatedLink
      ? "SYSTEM_LINKAGE"
      : knowledge.length
      ? "AVAILABLE"
      : "EMPTY",
    sourceUrl: null,
    legalAccess: true,
    notesPl: `records=${knowledge.length};validatedLink=${Boolean(validatedLink)}`,
    systemIdentityEvidence: knowledge.length ? `mek_mentions_${namedSystem}` : null,
    productIdentityEvidence: validatedLink ? String(validatedLink.id) : null,
  });
  if (input.amsr?.namedSystem && fold(input.amsr.namedSystem) === namedSystem) {
    systemIdentityEvidence.push({
      namedSystem,
      sourceTier: "EXISTING_KNOWLEDGE",
      sourceRef: "amsr_named_system",
      snippet: input.amsr.exactSpecification || namedSystem,
      invent: false,
    });
  }

  // —— 2. ATHED / public technical ——
  let athedLinkage = false;
  const athedTexts = [...(input.athedExtractTexts || [])];
  for (let i = 0; i < athedTexts.length; i++) {
    const t = athedTexts[i]!;
    if (fold(t).includes(namedSystem)) {
      athedLinkage = true;
      systemIdentityEvidence.push({
        namedSystem,
        sourceTier: "ATHED_PUBLIC_TECHNICAL",
        sourceRef: `athed:${i}`,
        snippet: t.slice(0, 200),
        invent: false,
      });
      // Spec attrs only if co-located — reuse AMSR-style local window already in AMSR; here status only
      const thick = t.match(
        new RegExp(`${namedSystem}[^\\n]{0,80}?(\\d{1,2}(?:[.,]\\d+)?)\\s*mm`, "i"),
      );
      if (thick?.[1]) fromMarketDocs.thickness_mm = thick[1].replace(",", ".");
      const ac = t.match(
        new RegExp(`${namedSystem}[^\\n]{0,80}?\\bAC\\s*([1-6])\\b`, "i"),
      );
      if (ac?.[1]) fromMarketDocs.abrasion_class_AC = `AC${ac[1]}`;
    }
  }
  sources.push({
    tier: "ATHED_PUBLIC_TECHNICAL",
    providerId: "athed_extracts",
    status: athedLinkage ? "SYSTEM_LINKAGE" : athedTexts.length ? "RELEVANT" : "NOT_CONFIGURED",
    sourceUrl: null,
    legalAccess: true,
    notesPl: athedLinkage
      ? "named_system_in_athed_text"
      : athedTexts.length
      ? "athed_texts_lack_named_system"
      : "no_athed_texts_provided",
    systemIdentityEvidence: athedLinkage ? namedSystem : null,
    productIdentityEvidence: null,
  });

  // —— 3. Manufacturer / system owner ——
  sources.push({
    tier: "MANUFACTURER_SYSTEM_OWNER",
    providerId: "manufacturer_registry",
    status: "NOT_CONFIGURED",
    sourceUrl: null,
    legalAccess: true,
    notesPl: "no_system_owner_url_in_registry_for_named_system",
    systemIdentityEvidence: null,
    productIdentityEvidence: null,
  });

  // —— 4. Public procurement / BOQ (known URLs) ——
  let publicBoqHit = false;
  for (const src of input.knownPublicSourceUrls || []) {
    // Status-only without invent: caller may have prefetched into athedExtractTexts.
    // Live fetch of arbitrary URLs is ATHED's job; here we only note configuration.
    const mentioned = athedTexts.some((t) => fold(t).includes(namedSystem));
    if (mentioned) publicBoqHit = true;
    sources.push({
      tier: "PUBLIC_PROCUREMENT_BOQ",
      providerId: src.sourceId,
      status: mentioned ? "SYSTEM_LINKAGE" : "FETCHABLE",
      sourceUrl: src.url,
      legalAccess: true,
      notesPl: mentioned
        ? "named_system_seen_in_provided_extracts"
        : "url_configured_awaiting_extract_with_named_system",
      systemIdentityEvidence: mentioned ? namedSystem : null,
      productIdentityEvidence: null,
    });
  }
  if (!(input.knownPublicSourceUrls || []).length) {
    sources.push({
      tier: "PUBLIC_PROCUREMENT_BOQ",
      providerId: "public_procurement",
      status: "NOT_CONFIGURED",
      sourceUrl: null,
      legalAccess: true,
      notesPl: "no_known_public_urls_for_named_system_probe",
      systemIdentityEvidence: null,
      productIdentityEvidence: null,
    });
  }
  void publicBoqHit;

  // —— 5–6. Public catalogs / legal retailers (DIY allowlist) ——
  const lookup =
    input.diyLookup
    ?? (input.disableLiveResearch
      ? createNullDiySelectiveLookup()
      : createFallbackDiySelectiveLookup());

  // Terminal gap — do not re-probe DIY for same namedSystem (no arbitrary SKU hunting)
  const priorExhausted = findExhaustedEvidenceGap({
    namedSystem,
    reason: "NAMED_SYSTEM_MARKET_GAP_EXHAUSTED",
  });
  const skipLiveRetail = Boolean(input.disableLiveResearch || priorExhausted);

  const queries = [
    namedSystem,
    `${namedSystem} panele`,
    `${namedSystem} panel podlogowy`,
  ];

  if (!skipLiveRetail) {
    for (const shop of DIY_SHOPS) {
      let bestStatus: AmsmProviderStatus = "EMPTY";
      let bestUrl: string | null = null;
      let bestNotes = "no_page";
      let linkedProduct: AmsmProductEvidence | null = null;
      let linkedPrice: AmsmPriceEvidence | null = null;

      for (const q of queries) {
        const looked = await lookup.lookup({
          provider: shop,
          query: q,
          materialKey: input.materialKey,
          maxUrls: 1,
        });
        if (!looked.ok) {
          const blocked = /403|BLOCK|UPSTREAM_403/i.test(String(looked.error || ""));
          bestStatus = blocked ? "BLOCKED" : "FETCHABLE";
          bestNotes = looked.error || "lookup_fail";
          continue;
        }
        bestUrl = looked.page.finalUrl || looked.page.requestUrl;
        bestStatus = "EXTRACTABLE";
        const parsed = parseDiyShopHtml({
          provider: shop,
          html: looked.page.bodyText,
          query: q,
          sourceUrl: bestUrl,
        });
        if (!parsed) {
          bestNotes = "parse_null";
          // Detect empty search (no PDP followed)
          if (/search\?|\/search\//i.test(bestUrl) && !/_CAPL|\.prd|\/p\/\d+/i.test(bestUrl)) {
            bestStatus = "EMPTY";
            bestNotes = "search_page_no_pdp_for_named_system";
          }
          continue;
        }
        if (!isNamedSystemRetailPdpUrl(parsed.sourceUrl || bestUrl)) {
          bestStatus = "EMPTY";
          bestNotes = "serp_or_non_pdp_rejected · no_named_system_product";
          continue;
        }
        bestStatus = "RELEVANT";
        bestNotes = `product=${parsed.productName.slice(0, 80)}`;
        const link = productLinksToNamedSystem({
          namedSystem,
          productName: parsed.productName,
          sourceUrl: parsed.sourceUrl,
          htmlSnippet: looked.page.bodyText.slice(0, 2000),
        });
        if (!link.linked) {
          bestStatus = "NO_SYSTEM_LINKAGE";
          bestNotes = link.reason;
          continue;
        }
        bestStatus = "SYSTEM_LINKAGE";
        linkedProduct = {
          productName: parsed.productName,
          specificationHint: parsed.productSpecificationHint || null,
          sourceUrl: parsed.sourceUrl,
          providerId: shop,
          systemLinkage: true,
          linkageReason: link.reason,
          invent: false,
        };
        productEvidence.push(linkedProduct);
        systemIdentityEvidence.push({
          namedSystem,
          sourceTier: "LEGAL_RETAILER_DISTRIBUTOR",
          sourceRef: parsed.sourceUrl,
          snippet: parsed.productName,
          invent: false,
        });

        let priceNet = parsed.priceGrossPln;
        let priceBasis = parsed.priceBasis || "unknown";
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
          parsed.isPackagePrice
          && unit !== "kg"
          && parsed.priceBasis !== "per_m2"
        ) {
          bestNotes = "package_without_conversion";
          break;
        }

        const raw: QualifyingMarketObservationInput = {
          materialKey: input.materialKey,
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
        const qObs = qualifyMarketResearchObservation(raw);
        linkedPrice = {
          priceNet: roundMarketPricePln(priceNet),
          unit,
          priceBasis,
          dateIso: looked.page.fetchedAtIso || nowIso,
          sourceUrl: parsed.sourceUrl,
          providerId: shop,
          qualified: qObs.ok,
          qualifyReject: qObs.ok ? null : qObs.reason,
          invent: false,
        };
        priceEvidence.push(linkedPrice);
        if (qObs.ok) bestStatus = "PRICE_EVIDENCE";
        break;
      }

      sources.push({
        tier: shop === "leroy" || shop === "castorama" || shop === "obi"
          ? "LEGAL_RETAILER_DISTRIBUTOR"
          : "PUBLIC_CATALOG",
        providerId: shop,
        status: bestStatus,
        sourceUrl: bestUrl,
        legalAccess: true,
        notesPl: bestNotes,
        systemIdentityEvidence: linkedProduct ? namedSystem : null,
        productIdentityEvidence: linkedProduct?.productName ?? null,
      });
    }
  } else {
    for (const shop of DIY_SHOPS) {
      sources.push({
        tier: "LEGAL_RETAILER_DISTRIBUTOR",
        providerId: shop,
        status: priorExhausted ? "EMPTY" : "NOT_CONFIGURED",
        sourceUrl: null,
        legalAccess: true,
        notesPl: priorExhausted
          ? "EXHAUSTED_EVIDENCE_GAP · skip_reprobe_named_system"
          : "live_research_disabled",
        systemIdentityEvidence: null,
        productIdentityEvidence: null,
      });
    }
  }

  // —— 7. Licensed ——
  sources.push({
    tier: "LICENSED_PROVIDER",
    providerId: "sekocenbud_or_licensed",
    status: "LICENSE_REQUIRED",
    sourceUrl: null,
    legalAccess: false,
    notesPl: "LICENSE_REQUIRED ≠ Owner — do not bypass paywall",
    systemIdentityEvidence: null,
    productIdentityEvidence: null,
  });

  // —— Decision ——
  const qualifiedPrices = priceEvidence.filter((p) => p.qualified);
  const linkedProducts = productEvidence.filter((p) => p.systemLinkage);

  let matchDecision: AmsmMatchDecision;
  let candidate: PriceCandidate | null = null;
  let exhaustedGap: string[] | null = null;

  if (qualifiedPrices.length > 0 && linkedProducts.length > 0) {
    // Prefer single freshest qualified — never average
    const sorted = [...qualifiedPrices].sort((a, b) => b.dateIso.localeCompare(a.dateIso));
    const winner = sorted[0]!;
    const product =
      linkedProducts.find((p) => p.sourceUrl === winner.sourceUrl) || linkedProducts[0]!;
    candidate = buildCandidate({
      materialKey: input.materialKey,
      catalogWorkId: input.catalogWorkId,
      namedSystem,
      materialCategory: input.materialCategory,
      unit,
      region,
      nowIso,
      price: winner,
      product,
    });
    matchDecision = "SYSTEM_PRODUCT_PRICE_ALIGNED";
    matchNotes.push("single_source_named_system_qualified");
  } else if (linkedProducts.length > 0) {
    matchDecision = "SYSTEM_PRODUCT_LINKED_NO_QUALIFIED_PRICE";
    matchNotes.push("system_product_found_but_price_not_qualified");
    exhaustedGap = [
      "NAMED_SYSTEM_PRODUCT_LINKED",
      "QUALIFIED_PRICE_MISSING",
      ...priceEvidence.map((p) => p.qualifyReject || "unqualified").filter(Boolean),
    ];
  } else if (priorExhausted) {
    matchDecision = "NAMED_SYSTEM_MARKET_GAP_EXHAUSTED";
    matchNotes.push("prior_exhausted_evidence_gap_reused");
    exhaustedGap = [
      "EXHAUSTED_EVIDENCE_GAP",
      "reason=NAMED_SYSTEM_MARKET_GAP_EXHAUSTED",
      `required_named_system=${namedSystem}`,
      "no_reprobe",
    ];
  } else {
    matchDecision = "NAMED_SYSTEM_MARKET_GAP_EXHAUSTED";
    matchNotes.push("no_legal_product_with_named_system_token");
    exhaustedGap = [
      "EXHAUSTED_EVIDENCE_GAP",
      "NAMED_SYSTEM_MARKET_GAP",
      `required_named_system=${namedSystem}`,
      "no_system_product_linkage_in_legal_retail_catalogs",
      "no_manufacturer_registry_hit",
      "no_invent_generic_panel_fallback",
      "LICENSE_REQUIRED_available_but_not_owner",
    ];
    const noLink = sources.filter((s) => s.status === "NO_SYSTEM_LINKAGE" || s.status === "EMPTY");
    if (noLink.length) {
      exhaustedGap.push(`probes_without_linkage=${noLink.map((s) => s.providerId).join("+")}`);
    }
  }

  if (matchDecision === "NAMED_SYSTEM_MARKET_GAP_EXHAUSTED") {
    recordExhaustedEvidenceGap({
      id: `mek_exhausted_ns_${namedSystem}_${fold(input.materialKey).slice(0, 24)}`,
      materialCategory: input.materialCategory,
      materialKey: input.materialKey,
      reason: "NAMED_SYSTEM_MARKET_GAP_EXHAUSTED",
      namedSystem,
      evidenceRefs: sources.map((s) => s.sourceUrl).filter(Boolean) as string[],
      payload: {
        matchDecision,
        exhaustedGap,
        ownerRuntimeDependency: 0,
      },
      nowIso,
    });
  }

  upsertMaterialEvidenceKnowledge({
    id: `mek_amsm_${namedSystem}_${fold(input.materialKey).slice(0, 24)}`,
    kind: "VALIDATION_OUTCOME",
    materialCategory: input.materialCategory,
    materialKey: input.materialKey,
    providerId: "amsm_v1",
    sourceUrl: candidate?.sourceUrl ?? null,
    searchStrategy: queries.join(" | "),
    applicability: matchDecision,
    evidenceRefs: productEvidence.map((p) => p.sourceUrl),
    validationState: candidate ? "UNVERIFIED" : "REJECTED",
    provenance: "AMSM-v1",
    freshnessIso: nowIso,
    payload: {
      namedSystem,
      matchDecision,
      productCount: productEvidence.length,
      qualifiedPriceCount: qualifiedPrices.length,
      exhaustedGap,
    },
    invent: false,
    priceAsUniversalTruth: false,
  });

  const nextLegal =
    matchDecision === "SYSTEM_PRODUCT_PRICE_ALIGNED"
      ? "CANDIDATE_READY · CONTINUE_AUT_MAT"
      : matchDecision === "SYSTEM_PRODUCT_LINKED_NO_QUALIFIED_PRICE"
      ? "AUTONOMOUS_RESOLUTION_QUEUE · NAMED_SYSTEM_PRICE_GAP"
      : "AUTONOMOUS_RESOLUTION_QUEUE · EXHAUSTED_EVIDENCE_GAP · NAMED_SYSTEM_MARKET_GAP_EXHAUSTED";

  return {
    version: AUTONOMOUS_NAMED_SYSTEM_MARKET_MATCH_VERSION,
    namedSystem,
    sources,
    systemIdentityEvidence,
    recoveredSpecification: {
      fromAmsr: input.amsr ?? null,
      fromMarketDocs,
      inventedAttributes: false,
    },
    productEvidence,
    priceEvidence,
    matchDecision,
    matchNotes,
    candidate,
    exhaustedGap,
    nextLegal,
    ownerRuntimeDependency: 0,
    invent: false,
    productionMutation: false,
  };
}
