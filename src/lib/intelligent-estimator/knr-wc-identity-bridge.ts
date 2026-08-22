/**
 * IK-KNR-WC-IDENTITY-BRIDGE P1 — batch LOCAL-FIRST proposal builder.
 *
 * PURE / deterministic · HTTP=0 · scraping=0 · zero WC/A1/mapping/pricing writes.
 * REUSE: catalogBasis identity fold · catalog/discovery stores (read) · foldPolishText.
 *
 * DF: docs/architecture/IK-KNR-WC-IDENTITY-BRIDGE-DESIGN-FREEZE.md (APPROVED)
 */

import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import { normalizeWgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import { isKnrWcIdentityBridgeP1Enabled } from "./knr-wc-identity-bridge-feature";
import type { KnrCatalogEntry } from "./knr-knowledge/knr-catalog-entry-types";
import {
  isKnrCatalogEntryServable,
} from "./knr-knowledge/knr-catalog-lookup";
import type { KnrCatalogStore } from "./knr-knowledge/knr-catalog-store";
import type {
  KnrDiscoveryEvidenceRecord,
  KnrDiscoveryEvidenceStore,
} from "./knr-knowledge/knr-discovery-evidence-types";
import {
  foldIdentityKeyV2,
  parseIdentityPartialFromCatalogBasis,
} from "./knr-knowledge/knr-identity-v2";
import type { CatalogBasis } from "@/lib/tenders-bzp-swz";
import type {
  KnrWcBridgeKeyInput,
  KnrWcBridgeOwnerMappingRef,
  KnrWcBridgeWorkRef,
  KnrWcDiscoveryStatus,
  KnrWcDuplicateRisk,
  KnrWcEvidenceRef,
  KnrWcIdentityProposal,
  KnrWcIdentityProposalBatch,
  KnrWcIdentityProposalBatchMetrics,
  KnrWcRecommendation,
  KnrWcSimilarWork,
  KnrWcSourceStatus,
  KnrWcUnitStatus,
  KnrWcVerificationState,
} from "./knr-wc-identity-bridge-types";

const SIMILAR_CAP = 5;

/** Frozen advisory notes for known MOPS field risks (DF §10 / §16). */
const SPECIAL_RISK_BY_KEY: Readonly<Record<string, readonly string[]>> = {
  "KNNR||1014-07": ["NO_SAFE_EXISTING_WORK_ID", "mycie_posadzek"],
  "KNNR|5|1305-01": ["UNIT_PROB_HOLD", "first_probe"],
  "KNNR|5|1305-02": ["UNIT_PROB_HOLD", "next_probe"],
  "KNR-W|4-01|0909-04": ["dopasowanie_skrzydel_not_demontaz_okna"],
  "KNR-W|5-08|0407-01": ["family_KNR_W_vs_KNR_verify"],
  "KNR|13-21|0402-03": ["RCD_test_not_generic_pomiar"],
  "KNR|2-02|1505-01": ["malowanie_sufity_not_auto_legacy_malowanie", "pair_risk_1204_02"],
  "KNR|2-15|0110-01": ["proba_szczelnosci_mb_not_auto_kpl"],
  "KNR|2-15|0224-03": ["montaz_WC_plane_Owner_A1"],
  "KNR|4-01|1204-02": ["malowanie_sciany_not_auto_legacy", "pair_risk_1505_01"],
  "KNR|4-02|0233-06": ["demontaz_PCW_fi50"],
  "KNR|4-02|0233-08": ["demontaz_PCW_fi110_not_fi50_substitute"],
  "KNR|4-03|1124-01": ["demontaz_lacznikow_not_montaz"],
  "KNR|5-08|0501-03": ["ignore_false_harvest_KNR_4_04_0501_03"],
  "KNR|5-08|0504-03": ["LED_IP20_split_vs_0504_07"],
  "KNR|5-08|0504-07": ["LED_IP44_split_vs_0504_03"],
  "NNRNKB||1134-01": ["gruntowanie_sufity_split_vs_1134_02", "identity_normalize"],
  "NNRNKB||1134-02": ["gruntowanie_pion_split_vs_1134_01", "identity_normalize"],
  "KNNR|2|1404-05": ["malowanie_rur_not_malowanie_listew_mb", "NO_SAFE_EXISTING_WORK_ID"],
  "KNR|2-15|0115-05": ["bateria_plane_material_vs_labor_Owner"],
};

const PAIR_DUPLICATE_HINTS: ReadonlyArray<readonly [string, string]> = [
  ["KNR|2-02|1505-01", "KNR|4-01|1204-02"],
  ["KNR|5-08|0504-03", "KNR|5-08|0504-07"],
  ["KNR|4-02|0233-06", "KNR|4-02|0233-08"],
  ["NNRNKB||1134-01", "NNRNKB||1134-02"],
];

export type BuildKnrWcIdentityProposalsInput = {
  tenderId: string;
  /** Batch of keys — prefer all 20 at once. */
  keys: readonly KnrWcBridgeKeyInput[];
  works?: readonly KnrWcBridgeWorkRef[];
  catalogStore?: KnrCatalogStore | null;
  discoveryStore?: KnrDiscoveryEvidenceStore | null;
  ownerMappings?: readonly KnrWcBridgeOwnerMappingRef[];
  /** Default false via feature module. */
  featureEnabled?: boolean | null;
};

function emptyMetrics(partial: Partial<KnrWcIdentityProposalBatchMetrics> & {
  totalKeysInput: number;
  uniqueKeys: number;
  duplicateKeysDropped: number;
}): KnrWcIdentityProposalBatchMetrics {
  return {
    proposals: 0,
    holdUnit: 0,
    holdEvidence: 0,
    discoveryRequired: 0,
    knrLocalHit: 0,
    evidenceHit: 0,
    catalogIndexBuilds: 0,
    catalogLookupCalls: 0,
    discoveryIndexBuilds: 0,
    discoveryLookupCalls: 0,
    worksScanCalls: 0,
    remoteStoreLoads: 0,
    supabaseQueryCount: 0,
    httpRequestCount: 0,
    researchExecuted: false,
    catalogWorkWritten: 0,
    a1Written: 0,
    mappingWritten: 0,
    pricingWritten: 0,
    scraping: 0,
    ...partial,
  };
}

function emptyBatch(
  tenderId: string,
  metrics: KnrWcIdentityProposalBatchMetrics,
): KnrWcIdentityProposalBatch {
  return {
    tenderId,
    proposals: [],
    skippedHoldKeys: [],
    skippedMappedKeys: [],
    metrics,
  };
}

function tokenize(text: string): Set<string> {
  const folded = foldPolishText(text || "");
  const parts = folded.split(/[^a-z0-9]+/g).filter((t) => t.length >= 3);
  return new Set(parts);
}

function displayFromKey(key: string, family?: string | null, catalogId?: string | null, table?: string | null): string {
  if (family && table) {
    return catalogId ? `${family} ${catalogId} ${table}` : `${family} ${table}`;
  }
  const parts = key.split("|");
  if (parts.length >= 3) {
    const [f, c, t] = parts;
    return c ? `${f} ${c} ${t}` : `${f} ${t}`;
  }
  return key;
}

function parseKeyParts(normalizedKey: string): {
  family: string;
  catalogId: string | null;
  tableCode: string;
} {
  const parts = normalizedKey.split("|");
  if (parts.length >= 3) {
    return {
      family: parts[0] || "",
      catalogId: parts[1] ? parts[1] : null,
      tableCode: parts[parts.length - 1] || "",
    };
  }
  return { family: "", catalogId: null, tableCode: "" };
}

function unitStatusOf(unitRaw: string): {
  unitStatus: KnrWcUnitStatus;
  proposedUnit: string | null;
} {
  const raw = String(unitRaw || "").trim();
  if (!raw) return { unitStatus: "UNKNOWN", proposedUnit: null };
  const lower = raw.toLowerCase();
  if (lower === "prob" || lower === "prób" || lower === "prób." || lower === "prob.") {
    return { unitStatus: "HOLD_UNIT", proposedUnit: null };
  }
  const canon = normalizeWgdomCostUnit(raw);
  if (!canon) return { unitStatus: "HOLD_UNIT", proposedUnit: null };
  return { unitStatus: "OK", proposedUnit: canon };
}

function stubProposedWorkId(normalizedKey: string): string {
  return `proposal:${normalizedKey.replace(/\|/g, "/")}`;
}

type CatalogIndex = {
  byEvidenceKey: Map<string, KnrCatalogEntry>;
  byIdentityKey: Map<string, KnrCatalogEntry>;
};

function buildCatalogIndex(store: KnrCatalogStore): CatalogIndex {
  const byEvidenceKey = new Map<string, KnrCatalogEntry>();
  const byIdentityKey = new Map<string, KnrCatalogEntry>();

  for (const [ik, entry] of Object.entries(store.entries ?? {})) {
    if (!isKnrCatalogEntryServable(entry)) continue;
    byIdentityKey.set(ik, entry);
  }

  for (const [ek, ids] of Object.entries(store.aliasIndex ?? {})) {
    for (const id of ids) {
      const entry = store.entries[id];
      if (!isKnrCatalogEntryServable(entry)) continue;
      if (!byEvidenceKey.has(ek)) byEvidenceKey.set(ek, entry!);
      break;
    }
  }

  return { byEvidenceKey, byIdentityKey };
}

type DiscoveryIndex = {
  byEvidenceKey: Map<string, KnrDiscoveryEvidenceRecord>;
};

function isEvidenceServable(entry: KnrDiscoveryEvidenceRecord | undefined): boolean {
  if (!entry) return false;
  if (entry.lifecycleState !== "ACTIVE") return false;
  return (
    entry.discoveryStatus === "DISCOVERED"
    || entry.discoveryStatus === "CORROBORATED"
    || entry.discoveryStatus === "READY_FOR_OWNER_VERIFY"
  );
}

function buildDiscoveryIndex(store: KnrDiscoveryEvidenceStore): DiscoveryIndex {
  const byEvidenceKey = new Map<string, KnrDiscoveryEvidenceRecord>();
  for (const [ek, rec] of Object.entries(store.entries ?? {})) {
    if (!isEvidenceServable(rec)) continue;
    byEvidenceKey.set(ek, rec);
  }
  return { byEvidenceKey };
}

function scoreSimilar(
  queryTokens: Set<string>,
  work: KnrWcBridgeWorkRef,
  preferredUnit: string | null,
): number {
  if (!work.active) return 0;
  const nameTok = tokenize(`${work.namePl} ${work.tradeId ?? ""}`);
  let hit = 0;
  for (const t of queryTokens) {
    if (nameTok.has(t)) hit += 1;
  }
  if (hit === 0) return 0;
  let score = hit / Math.max(queryTokens.size, 1);
  if (preferredUnit && work.unit === preferredUnit) score += 0.15;
  return Math.min(1, score);
}

function pickSimilarWorks(
  works: readonly KnrWcBridgeWorkRef[],
  nameHay: string,
  preferredUnit: string | null,
): KnrWcSimilarWork[] {
  const tokens = tokenize(nameHay);
  if (tokens.size === 0 || works.length === 0) return [];
  const scored: KnrWcSimilarWork[] = [];
  for (const w of works) {
    const score = scoreSimilar(tokens, w, preferredUnit);
    if (score < 0.2) continue;
    scored.push({
      workId: w.id,
      namePl: w.namePl,
      unit: w.unit,
      tradeId: w.tradeId,
      active: w.active,
      score: Math.round(score * 1000) / 1000,
    });
  }
  scored.sort((a, b) => b.score - a.score || a.workId.localeCompare(b.workId));
  return scored.slice(0, SIMILAR_CAP);
}

function duplicateRiskFor(
  key: string,
  similar: readonly KnrWcSimilarWork[],
  batchKeys: ReadonlySet<string>,
): KnrWcDuplicateRisk {
  for (const [a, b] of PAIR_DUPLICATE_HINTS) {
    if ((key === a && batchKeys.has(b)) || (key === b && batchKeys.has(a))) {
      return "HIGH";
    }
  }
  if (similar.some((s) => s.score >= 0.55)) return "POSSIBLE";
  if (similar.length > 0) return "POSSIBLE";
  return "NONE";
}

function basisFromKey(key: KnrWcBridgeKeyInput): CatalogBasis {
  const parsed = parseKeyParts(key.normalizedKey);
  const family = (key.family || parsed.family || "OTHER") as CatalogBasis["family"];
  const catalogId = key.catalogId ?? parsed.catalogId;
  const tableCode = key.tableCode || parsed.tableCode || null;
  return {
    family,
    catalogId,
    tableCode,
    rawCode: key.rawCode || key.displayCode || displayFromKey(key.normalizedKey, family, catalogId, tableCode),
    display: key.displayCode || displayFromKey(key.normalizedKey, family, catalogId, tableCode),
    normalizedKey: key.normalizedKey,
  };
}

/**
 * Batch builder — LOCAL-FIRST · deduped keys · shared indexes · HTTP=0.
 */
export function buildKnrWcIdentityProposals(
  input: BuildKnrWcIdentityProposalsInput,
): KnrWcIdentityProposalBatch {
  const tenderId = String(input.tenderId || "").trim() || "unknown-tender";
  const rawKeys = input.keys ?? [];
  const totalKeysInput = rawKeys.length;

  if (!isKnrWcIdentityBridgeP1Enabled(input.featureEnabled)) {
    return emptyBatch(
      tenderId,
      emptyMetrics({
        totalKeysInput,
        uniqueKeys: 0,
        duplicateKeysDropped: 0,
      }),
    );
  }

  const seen = new Set<string>();
  const unique: KnrWcBridgeKeyInput[] = [];
  let duplicateKeysDropped = 0;
  for (const k of rawKeys) {
    const nk = String(k.normalizedKey || "").trim();
    if (!nk) continue;
    if (seen.has(nk)) {
      duplicateKeysDropped += 1;
      continue;
    }
    seen.add(nk);
    unique.push({ ...k, normalizedKey: nk });
  }

  const batchKeySet = new Set(unique.map((k) => k.normalizedKey));
  const mappedActive = new Set(
    (input.ownerMappings ?? [])
      .filter((m) => m.active && m.ownerApproval)
      .map((m) => m.normalizedKey),
  );

  let catalogIndexBuilds = 0;
  let catalogLookupCalls = 0;
  let catalogIndex: CatalogIndex | null = null;
  if (input.catalogStore) {
    catalogIndex = buildCatalogIndex(input.catalogStore);
    catalogIndexBuilds = 1;
  }

  let discoveryIndexBuilds = 0;
  let discoveryLookupCalls = 0;
  let discoveryIndex: DiscoveryIndex | null = null;
  if (input.discoveryStore) {
    discoveryIndex = buildDiscoveryIndex(input.discoveryStore);
    discoveryIndexBuilds = 1;
  }

  const works = input.works ?? [];
  const worksScanCalls = works.length > 0 ? 1 : 0;

  const proposals: KnrWcIdentityProposal[] = [];
  const skippedHoldKeys: string[] = [];
  const skippedMappedKeys: string[] = [];
  let holdUnit = 0;
  let holdEvidence = 0;
  let discoveryRequired = 0;
  let knrLocalHit = 0;
  let evidenceHit = 0;

  for (const key of unique) {
    const nk = key.normalizedKey;
    const parsed = parseKeyParts(nk);
    const tableCode = key.tableCode || parsed.tableCode;

    if (!tableCode) {
      skippedHoldKeys.push(nk);
      continue;
    }

    if (mappedActive.has(nk)) {
      skippedMappedKeys.push(nk);
      continue;
    }

    const family = String(key.family || parsed.family || "");
    const catalogId = key.catalogId ?? parsed.catalogId;
    const unitRaw = String(key.unitRaw ?? "").trim() || "UNKNOWN";
    const { unitStatus, proposedUnit } = unitStatusOf(unitRaw);

    const basis = basisFromKey(key);
    const partial = parseIdentityPartialFromCatalogBasis(basis);
    const identityKeyV2 = foldIdentityKeyV2(partial);

    let catalogEntry: KnrCatalogEntry | null = null;
    if (catalogIndex) {
      catalogLookupCalls += 1;
      catalogEntry =
        catalogIndex.byEvidenceKey.get(nk)
        ?? catalogIndex.byIdentityKey.get(identityKeyV2)
        ?? null;
    }

    let discoveryRec: KnrDiscoveryEvidenceRecord | null = null;
    if (!catalogEntry && discoveryIndex) {
      discoveryLookupCalls += 1;
      discoveryRec = discoveryIndex.byEvidenceKey.get(nk) ?? null;
    }

    const harvest = key.harvestEvidence ?? null;

    let sourceStatus: KnrWcSourceStatus = "NONE";
    let discoveryStatus: KnrWcDiscoveryStatus = "DISCOVERY_REQUIRED";
    let verificationState: KnrWcVerificationState = "DISCOVERY_REQUIRED";

    const refs: KnrWcEvidenceRef[] = [
      {
        kind: "catalogBasis",
        refId: nk,
        detail: basis.rawCode,
      },
    ];

    let officialNamePl = key.officialNamePl?.trim() || null;
    let descriptionPl = key.descriptionPl?.trim() || null;

    if (catalogEntry) {
      knrLocalHit += 1;
      sourceStatus = "LOCAL_CATALOG";
      discoveryStatus = "LOCAL_HIT";
      verificationState =
        catalogEntry.verificationStatus === "VERIFIED" ? "VERIFIED" : "PENDING_VERIFY";
      refs.push({
        kind: "knrCatalog",
        refId: catalogEntry.identityKeyV2,
        detail: catalogEntry.displayCode,
      });
      if (!officialNamePl && catalogEntry.description) {
        officialNamePl = String(catalogEntry.description).slice(0, 200);
      }
      if (!descriptionPl && catalogEntry.description) {
        descriptionPl = String(catalogEntry.description);
      }
    } else if (discoveryRec) {
      evidenceHit += 1;
      sourceStatus = "DISCOVERY_EVIDENCE";
      discoveryStatus = "EVIDENCE_HIT";
      verificationState = "PENDING_VERIFY";
      refs.push({
        kind: "discoveryEvidence",
        refId: discoveryRec.evidenceKeyV1,
        detail: discoveryRec.displayCode,
      });
      if (!officialNamePl && discoveryRec.description) {
        officialNamePl = String(discoveryRec.description).slice(0, 200);
      }
      if (!descriptionPl && discoveryRec.description) {
        descriptionPl = String(discoveryRec.description);
      }
    } else if (harvest && (harvest.description || harvest.displayCode)) {
      sourceStatus = "HARVEST";
      discoveryStatus = "EVIDENCE_HIT";
      verificationState = "TENDER_ONLY";
      refs.push({
        kind: "harvest",
        refId: harvest.sourceRef || harvest.displayCode || nk,
        detail: harvest.displayCode,
      });
      if (!officialNamePl && harvest.description) {
        officialNamePl = String(harvest.description).slice(0, 200);
      }
      if (!descriptionPl && harvest.description) {
        descriptionPl = String(harvest.description);
      }
    } else if (descriptionPl || officialNamePl) {
      sourceStatus = "TENDER";
      discoveryStatus = "DISCOVERY_REQUIRED";
      verificationState = "TENDER_ONLY";
      discoveryRequired += 1;
      refs.push({
        kind: "tenderLine",
        refId: nk,
        detail: "tender_description_only",
      });
    } else {
      sourceStatus = "NONE";
      discoveryStatus = "DISCOVERY_REQUIRED";
      verificationState = "DISCOVERY_REQUIRED";
      discoveryRequired += 1;
    }

    if (key.lineRefs?.length) {
      for (const lr of key.lineRefs) {
        refs.push({
          kind: "tenderLine",
          refId: `${lr.dwellingId}|${lr.lineId}`,
        });
      }
    }

    const nameHay = [officialNamePl, descriptionPl, displayFromKey(nk, family, catalogId, tableCode)]
      .filter(Boolean)
      .join(" ");
    const similarWorks = pickSimilarWorks(works, nameHay, proposedUnit);
    const duplicateRisk = duplicateRiskFor(nk, similarWorks, batchKeySet);
    const specialRiskNotes = [...(SPECIAL_RISK_BY_KEY[nk] ?? [])];

    let recommendation: KnrWcRecommendation = "CREATE_NEW";
    if (unitStatus === "HOLD_UNIT") {
      recommendation = "HOLD_UNIT";
      holdUnit += 1;
    } else if (!officialNamePl && !descriptionPl && sourceStatus === "NONE") {
      recommendation = "HOLD_EVIDENCE";
      holdEvidence += 1;
    } else if (duplicateRisk === "HIGH") {
      recommendation = "HOLD";
      specialRiskNotes.push("DUPLICATE_REVIEW_REQUIRED");
    }

    // Never recommend REUSE_EXISTING in P1 — Owner-only (similarWorks are evidence).
    if (recommendation === "REUSE_EXISTING") {
      recommendation = "CREATE_NEW";
    }

    const displayCode =
      key.displayCode
      || catalogEntry?.displayCode
      || harvest?.displayCode
      || displayFromKey(nk, family, catalogId, tableCode);

    const proposal: KnrWcIdentityProposal = {
      proposalId: `knr-wc-p1:${tenderId}:${nk}`,
      tenderId,
      normalizedKey: nk,
      identityKeyV2,
      displayCode,
      family,
      catalogId,
      tableCode,
      officialNamePl,
      descriptionPl,
      unitRaw,
      proposedUnit,
      proposedTradeId: null,
      proposedWorkId: stubProposedWorkId(nk),
      knrEvidenceRefs: refs,
      verificationState,
      similarWorks,
      duplicateRisk,
      recommendation,
      ownerDecision: "unset",
      sourceStatus,
      discoveryStatus,
      unitStatus,
      lineRefs: [...(key.lineRefs ?? [])],
      specialRiskNotes,
    };

    proposals.push(proposal);
  }

  // Code-unit order (not localeCompare) — deterministic across Node locales.
  proposals.sort((a, b) =>
    a.normalizedKey < b.normalizedKey ? -1 : a.normalizedKey > b.normalizedKey ? 1 : 0,
  );

  const metrics: KnrWcIdentityProposalBatchMetrics = {
    totalKeysInput,
    uniqueKeys: unique.length,
    duplicateKeysDropped,
    proposals: proposals.length,
    holdUnit,
    holdEvidence,
    discoveryRequired,
    knrLocalHit,
    evidenceHit,
    catalogIndexBuilds,
    catalogLookupCalls,
    discoveryIndexBuilds,
    discoveryLookupCalls,
    worksScanCalls,
    supabaseQueryCount: 0,
    httpRequestCount: 0,
    researchExecuted: false,
    catalogWorkWritten: 0,
    a1Written: 0,
    mappingWritten: 0,
    pricingWritten: 0,
    scraping: 0,
  };

  return {
    tenderId,
    proposals,
    skippedHoldKeys,
    skippedMappedKeys,
    metrics,
  };
}

/** Frozen MOPS-20 key list for dry-run / tests (DF acceptance). */
export const MOPS_20_NORMALIZED_KEYS = [
  "KNNR||1014-07",
  "KNNR|5|1305-01",
  "KNNR|5|1305-02",
  "KNR-W|4-01|0909-04",
  "KNR-W|5-08|0407-01",
  "KNR|13-21|0402-03",
  "KNR|2-02|1505-01",
  "KNR|2-15|0110-01",
  "KNR|2-15|0224-03",
  "KNR|4-01|1204-02",
  "KNR|4-02|0233-06",
  "KNR|4-02|0233-08",
  "KNR|4-03|1124-01",
  "KNR|5-08|0501-03",
  "KNR|5-08|0504-03",
  "KNR|5-08|0504-07",
  "NNRNKB||1134-01",
  "NNRNKB||1134-02",
  "KNNR|2|1404-05",
  "KNR|2-15|0115-05",
] as const;
