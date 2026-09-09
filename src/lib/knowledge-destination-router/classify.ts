/**
 * GO48 — classify knowledge by explicit typed discriminant only.
 */

import {
  KNOWLEDGE_TYPES,
  type KnowledgeAuthority,
  type KnowledgeClassifyInput,
  type KnowledgeDestinationId,
  type KnowledgeRoutePlan,
  type KnowledgeRouteStatus,
  type KnowledgeType,
  KB03_KNOWLEDGE_DESTINATION_ROUTER_ID,
} from "./types";

const TYPE_SET = new Set<string>(KNOWLEDGE_TYPES);

export type DestinationSpec = {
  destination: KnowledgeDestinationId;
  authority: KnowledgeAuthority;
  persistence: KnowledgeRoutePlan["persistence"];
  reusable: boolean;
  canonical: boolean;
  ownerRequired: boolean;
  indexed: boolean;
  /** Persist via router.persistKnowledge allowed without ownerAuthorized. */
  autoPersistAllowed: boolean;
  orphanReuse: boolean;
  messagePl: string;
};

/** Static destination map — no free-text routing. */
export const DESTINATION_BY_TYPE: Record<KnowledgeType, DestinationSpec> = {
  EVIDENCE: {
    destination: "LABOR_SOURCE_EVIDENCE",
    authority: "EVIDENCE_OBSERVATION",
    persistence: "EXISTING_STORE",
    reusable: true,
    canonical: false,
    ownerRequired: false,
    indexed: true,
    autoPersistAllowed: true,
    orphanReuse: true, // HTTP suppress still OPEN (GO46)
    messagePl: "Labor Evidence → kw-wgdom-labor-source-evidence (observation ≠ OUR RATE).",
  },
  LABOR_RATE: {
    // Observation plane for research rates = Evidence; canonical OUR RATE is separate type.
    destination: "LABOR_SOURCE_EVIDENCE",
    authority: "EVIDENCE_OBSERVATION",
    persistence: "EXISTING_STORE",
    reusable: true,
    canonical: false,
    ownerRequired: false,
    indexed: true,
    autoPersistAllowed: true,
    orphanReuse: true,
    messagePl: "Labor rate observation → Evidence store (not OUR RATE).",
  },
  OUR_RATE: {
    destination: "OUR_RATE_VIA_ACCEPT",
    authority: "OWNER_ACCEPT",
    persistence: "EXISTING_STORE",
    reusable: true,
    canonical: true,
    ownerRequired: true,
    indexed: true,
    autoPersistAllowed: false,
    orphanReuse: false,
    messagePl: "OUR RATE requires existing Owner Accept path — router will not write.",
  },
  WORK_CATALOG: {
    destination: "WORK_CATALOG",
    authority: "OWNER_ACCEPT",
    persistence: "EXISTING_STORE",
    reusable: true,
    canonical: true,
    ownerRequired: true,
    indexed: true,
    autoPersistAllowed: false,
    orphanReuse: false,
    messagePl: "Work Catalog writes require Owner/OPS + saveWorkCatalogRouted — not via router auto-write.",
  },
  WORK_IDENTITY: {
    destination: "WORK_CATALOG",
    authority: "OWNER_ACCEPT",
    persistence: "EXISTING_STORE",
    reusable: true,
    canonical: true,
    ownerRequired: true,
    indexed: true,
    autoPersistAllowed: false,
    orphanReuse: false,
    messagePl: "Work identity canonicalization = Owner Accept IdentityCandidate → CatalogWork.",
  },
  IDENTITY_CANDIDATE: {
    destination: "IDENTITY_CANDIDATE_STORE",
    authority: "OWNER_REVIEW",
    persistence: "EXISTING_STORE",
    reusable: true,
    canonical: false,
    ownerRequired: true, // Accept / durable review transitions Owner-gated at Accept; generation is separate
    indexed: true,
    autoPersistAllowed: false,
    orphanReuse: false,
    messagePl: "IdentityCandidate store exists — Accept→CatalogWork remains Owner-only (GO39/41).",
  },
  RESEARCH_CANDIDATE: {
    destination: "EPHEMERAL_CANDIDATE",
    authority: "RESEARCH_CANDIDATE",
    persistence: "EPHEMERAL",
    reusable: false,
    canonical: false,
    ownerRequired: false,
    indexed: false,
    autoPersistAllowed: false,
    orphanReuse: false,
    messagePl: "Research Candidate is ephemeral — not canonical.",
  },
  MATERIAL_PRICE: {
    destination: "PRICE_MEMORY_VIA_ACCEPT",
    authority: "OWNER_ACCEPT",
    persistence: "EXISTING_STORE",
    reusable: true,
    canonical: true,
    ownerRequired: true,
    indexed: true,
    autoPersistAllowed: false,
    orphanReuse: false,
    messagePl: "Material price → Price Memory only via existing Owner Accept (no Material Evidence store).",
  },
  MARKET_QUOTE: {
    destination: "PRICE_MEMORY_VIA_ACCEPT",
    authority: "OWNER_ACCEPT",
    persistence: "EXISTING_STORE",
    reusable: true,
    canonical: true,
    ownerRequired: true,
    indexed: true,
    autoPersistAllowed: false,
    orphanReuse: false,
    messagePl: "Market quote → marketQuotes via existing Accept path.",
  },
  KNR_MAPPING: {
    destination: "KNR_DISCOVERY",
    authority: "DISCOVERY",
    persistence: "EXISTING_STORE",
    reusable: true,
    canonical: false,
    ownerRequired: false,
    indexed: true,
    autoPersistAllowed: false, // use existing knr discovery writers — router does not auto HTTP/ingest
    orphanReuse: false,
    messagePl: "KNR mapping/discovery — existing knr discovery store; VERIFY separate.",
  },
  G177_MAPPING: {
    destination: "UNSUPPORTED",
    authority: "DISCOVERY",
    persistence: "UNSUPPORTED",
    reusable: false,
    canonical: false,
    ownerRequired: true,
    indexed: false,
    autoPersistAllowed: false,
    orphanReuse: false,
    messagePl: "G177 mapping — no dedicated router adapter; discovery/Owner seed only (OPEN).",
  },
  TECHNOLOGY: {
    destination: "UNSUPPORTED",
    authority: "PACK_GATE",
    persistence: "UNSUPPORTED",
    reusable: false,
    canonical: false,
    ownerRequired: true,
    indexed: false,
    autoPersistAllowed: false,
    orphanReuse: false,
    messagePl: "Technology plane — no auto router persist (OPEN).",
  },
  BOM: {
    destination: "UNSUPPORTED",
    authority: "PACK_GATE",
    persistence: "UNSUPPORTED",
    reusable: false,
    canonical: false,
    ownerRequired: true,
    indexed: false,
    autoPersistAllowed: false,
    orphanReuse: false,
    messagePl: "BOM — existing engines only; router does not persist (OPEN).",
  },
  TECHNOLOGY_PACK: {
    destination: "UNSUPPORTED",
    authority: "PACK_GATE",
    persistence: "UNSUPPORTED",
    reusable: false,
    canonical: false,
    ownerRequired: true,
    indexed: false,
    autoPersistAllowed: false,
    orphanReuse: false,
    messagePl: "TechnologyPack lifecycle unchanged — router will not activate/create packs.",
  },
  HISTORICAL: {
    destination: "UNSUPPORTED",
    authority: "HISTORICAL",
    persistence: "UNSUPPORTED",
    reusable: true,
    canonical: false,
    ownerRequired: false,
    indexed: false,
    autoPersistAllowed: false,
    orphanReuse: false,
    messagePl: "Historical observations — existing history rings; no new router store.",
  },
  TENDER_SPECIFIC: {
    destination: "UNSUPPORTED",
    authority: "TENDER_SCOPED",
    persistence: "UNSUPPORTED",
    reusable: false,
    canonical: false,
    ownerRequired: false,
    indexed: false,
    autoPersistAllowed: false,
    orphanReuse: false,
    messagePl: "Tender-specific knowledge — case-scoped; no global router persist.",
  },
  MARGIN: {
    destination: "COMMERCIAL_PRICING",
    authority: "OWNER_CONFIG",
    persistence: "EXISTING_STORE",
    reusable: true,
    canonical: false,
    ownerRequired: true,
    indexed: false,
    autoPersistAllowed: false,
    orphanReuse: false,
    messagePl: "Margin = commercialPricing / settings — Owner config only.",
  },
  SELL: {
    destination: "DERIVED_NO_STORE",
    authority: "DERIVED",
    persistence: "DERIVED",
    reusable: false,
    canonical: false,
    ownerRequired: false,
    indexed: false,
    autoPersistAllowed: false,
    orphanReuse: false,
    messagePl: "SELL is derived — not an authoritative knowledge store.",
  },
  SUPPLIER: {
    destination: "UNSUPPORTED",
    authority: "EVIDENCE_OBSERVATION",
    persistence: "UNSUPPORTED",
    reusable: false,
    canonical: false,
    ownerRequired: false,
    indexed: false,
    autoPersistAllowed: false,
    orphanReuse: false,
    messagePl: "Supplier metadata lives on Evidence provenance — no separate store adapter.",
  },
  REGIONAL: {
    destination: "UNSUPPORTED",
    authority: "EVIDENCE_OBSERVATION",
    persistence: "UNSUPPORTED",
    reusable: false,
    canonical: false,
    ownerRequired: false,
    indexed: false,
    autoPersistAllowed: false,
    orphanReuse: false,
    messagePl: "Regional scope is a field on Evidence/rates — no separate destination store.",
  },
  COMPANY_PRICE: {
    destination: "WORK_CATALOG",
    authority: "LEGACY",
    persistence: "EXISTING_STORE",
    reusable: false,
    canonical: false,
    ownerRequired: true,
    indexed: false,
    autoPersistAllowed: false,
    orphanReuse: false,
    messagePl: "companyPrice/companyPricePln is LEGACY — never auto→OUR RATE.",
  },
};

function planFromSpec(
  type: KnowledgeType,
  status: KnowledgeRouteStatus,
  messagePl?: string,
): KnowledgeRoutePlan {
  const spec = DESTINATION_BY_TYPE[type];
  return {
    routerId: KB03_KNOWLEDGE_DESTINATION_ROUTER_ID,
    status,
    knowledgeType: type,
    destination: spec.destination,
    authority: spec.authority,
    persistence: spec.persistence,
    reusable: spec.reusable,
    canonical: spec.canonical,
    ownerRequired: spec.ownerRequired,
    indexed: spec.indexed,
    orphanReuse: spec.orphanReuse,
    messagePl: messagePl ?? spec.messagePl,
    isCatalogWriteRouter: false,
  };
}

/**
 * Classify + plan destination. Fail closed on invalid / ambiguous.
 */
export function classifyKnowledge(input: KnowledgeClassifyInput): KnowledgeRoutePlan {
  const raw = input?.knowledgeType;
  if (!raw || !TYPE_SET.has(String(raw))) {
    return {
      routerId: KB03_KNOWLEDGE_DESTINATION_ROUTER_ID,
      status: "AMBIGUOUS_TYPE",
      knowledgeType: null,
      destination: "UNSUPPORTED",
      authority: "UNKNOWN",
      persistence: "NONE",
      reusable: false,
      canonical: false,
      ownerRequired: true,
      indexed: false,
      orphanReuse: false,
      messagePl: "Unknown or missing knowledgeType — fail closed.",
      isCatalogWriteRouter: false,
    };
  }

  const type = raw as KnowledgeType;
  const spec = DESTINATION_BY_TYPE[type];

  // Forbidden: request canonical write for non-canonical / evidence / candidate / sell / company price
  if (input.requestCanonicalWrite === true) {
    const forbiddenCanonical: Partial<Record<KnowledgeType, string>> = {
      EVIDENCE: "Evidence cannot become OUR RATE via router.",
      LABOR_RATE: "Labor rate observation cannot become OUR RATE via router.",
      RESEARCH_CANDIDATE: "Research Candidate cannot become OUR RATE via router.",
      SELL: "SELL is derived — forbidden as canonical write.",
      COMPANY_PRICE: "companyPrice cannot silently become OUR RATE.",
      HISTORICAL: "Historical cannot become OUR RATE via router.",
    };
    const msg = forbiddenCanonical[type];
    if (msg) {
      return planFromSpec(type, "FORBIDDEN_CANONICAL_WRITE", msg);
    }
  }

  if (input.intendedDestination) {
    if (input.intendedDestination !== spec.destination) {
      return planFromSpec(
        type,
        "AMBIGUOUS_DESTINATION",
        `Intended destination ${input.intendedDestination} ≠ planned ${spec.destination}.`,
      );
    }
  }

  if (spec.destination === "UNSUPPORTED" || spec.persistence === "UNSUPPORTED") {
    return planFromSpec(type, "UNSUPPORTED_DESTINATION");
  }

  if (spec.destination === "DERIVED_NO_STORE") {
    return planFromSpec(type, "ROUTE_OK");
  }

  if (spec.ownerRequired && input.ownerAuthorized !== true) {
    // Still a valid classification — persist will not write
    return planFromSpec(type, "OWNER_REQUIRED");
  }

  if (spec.orphanReuse) {
    return planFromSpec(type, "ORPHAN_REUSE_OPEN");
  }

  return planFromSpec(type, "ROUTE_OK");
}

export function isKnowledgeType(value: unknown): value is KnowledgeType {
  return typeof value === "string" && TYPE_SET.has(value);
}
