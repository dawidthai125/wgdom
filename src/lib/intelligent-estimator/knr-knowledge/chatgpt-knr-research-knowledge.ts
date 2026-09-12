/**
 * ChatGPT KNR Research Knowledge — EXTERNAL EXPERT DISCOVERY → IK learning.
 * Reuses kw-knr-catalog (PENDING) · kw-knr-discovery-evidence · ephemeral registry overrides.
 * NOT second catalog · NOT OUR RATE · NOT auto-VERIFIED · GPT ≠ runtime authority.
 */

import { fnv1aHex } from "@/lib/global-knowledge/canonical-id";
import { buildCatalogBasisFromRawCode } from "@/lib/tenders-bzp-brief";
import type { PublicKnrRegistryEntry } from "../ik-public-knr-source-registry";
import type { KnrDiscoveryAllowlistEntry } from "./knr-discovery-allowlist";
import type { KnrDiscoveryFactCandidate } from "./knr-discovery-fact-extract";
import { stageDiscoveryFactToPendingCatalog } from "./knr-discovery-catalog-stage";
import {
  emptyKnrDiscoveryEvidenceStore,
  upsertKnrDiscoveryEvidenceOffline,
} from "./knr-discovery-evidence-store";
import type {
  KnrDiscoveryEvidenceRecord,
  KnrDiscoveryEvidenceStore,
  KnrDiscoverySourcePriority,
  KnrDiscoveryStatus,
} from "./knr-discovery-evidence-types";
import {
  foldIdentityKeyV2,
  parseIdentityPartialFromCatalogBasis,
} from "./knr-identity-v2";
import type { KnrCatalogStore } from "./knr-catalog-store";
import { emptyKnrCatalogStore } from "./knr-catalog-store";
import {
  CHATGPT_KNR_RESEARCH_TPI729_VERIFIED,
  type ChatgptKnrSourceType,
  type ChatgptKnrVerifiedRecord,
} from "./chatgpt-knr-research-knowledge-data";

export {
  CHATGPT_KNR_RESEARCH_TPI729_VERIFIED,
  type ChatgptKnrSourceType,
  type ChatgptKnrVerifiedRecord,
  type ChatgptKnrVerifiedSource,
} from "./chatgpt-knr-research-knowledge-data";

export const CHATGPT_KNR_RESEARCH_KNOWLEDGE_VERSION = "CKRK-v1" as const;

export type KnrLearnedSearchStrategy = {
  strategyId: string;
  catalogFamilyPrefix: string | null;
  tableCode: string | null;
  searchPatterns: readonly string[];
  successfulSourceDomains: readonly string[];
  successfulSourceTypes: readonly ChatgptKnrSourceType[];
  descriptionTokens: readonly string[];
  unit: string | null;
  sourceStrategies: readonly string[];
  corroborationCount: number;
  provenance: "CHATGPT_EXTERNAL_EXPERT_DISCOVERY";
  retrievedAt: string;
};

export type KnrSourceQualityBand =
  | "OFFICIAL_PUBLIC_INSTITUTION"
  | "GOVERNMENT_GOV_PL"
  | "BIP"
  | "PUBLIC_UNIVERSITY_HOSPITAL_MUNICIPAL"
  | "PUBLIC_TENDER_ATTACHMENT"
  | "ESTABLISHED_PUBLIC_CONSTRUCTION"
  | "SECONDARY_WEB_INDEX";

export function scoreKnrSourceQuality(input: {
  sourceUrl: string;
  sourceType?: ChatgptKnrSourceType | null;
}): { band: KnrSourceQualityBand; score: number } {
  let hostname = "";
  try {
    hostname = new URL(input.sourceUrl).hostname.toLowerCase();
  } catch {
    return { band: "SECONDARY_WEB_INDEX", score: 10 };
  }
  if (hostname === "www.gov.pl" || hostname.endsWith(".gov.pl")) {
    return { band: "GOVERNMENT_GOV_PL", score: 95 };
  }
  if (hostname.includes("bip.") || hostname.includes(".bip.") || /\.ibip\./.test(hostname)) {
    return { band: "BIP", score: 90 };
  }
  if (
    /\.uw\.gov\.pl$/.test(hostname)
    || /nfz|szpital|spwsz|lukasiewicz|uniw|edu\.pl|um\.|ug\./i.test(hostname)
  ) {
    return { band: "PUBLIC_UNIVERSITY_HOSPITAL_MUNICIPAL", score: 85 };
  }
  if (input.sourceType === "OFFICIAL_PUBLIC_TENDER_DOCUMENT") {
    return { band: "PUBLIC_TENDER_ATTACHMENT", score: 80 };
  }
  if (input.sourceType === "PUBLIC_INSTITUTION" || input.sourceType === "PUBLIC_PDF") {
    return { band: "ESTABLISHED_PUBLIC_CONSTRUCTION", score: 70 };
  }
  return { band: "SECONDARY_WEB_INDEX", score: 40 };
}

export function buildKnrSearchPatterns(input: {
  tableCode: string;
  catalogFamilyPrefix?: string | null;
  semanticTokens?: readonly string[] | null;
  aliases?: readonly string[] | null;
}): string[] {
  const code = String(input.tableCode || "").trim();
  if (!code) return [];
  const slash = code.includes("-") ? code.replace("-", "/") : code;
  const family = String(input.catalogFamilyPrefix || "").trim();
  const tokens = (input.semanticTokens || []).map((t) => String(t).trim()).filter(Boolean);
  const aliases = (input.aliases || []).map((a) => String(a).trim()).filter(Boolean);
  const out = new Set<string>();
  out.add(code);
  out.add(slash);
  out.add(`"${code}"`);
  if (family) {
    out.add(`${family} ${code}`);
    out.add(`${family} ${slash}`);
    out.add(`"${family} ${code}"`);
  }
  out.add(`KNR ${code}`);
  out.add(`KNNR ${code}`);
  for (const a of aliases) out.add(a);
  for (const t of tokens.slice(0, 6)) {
    out.add(`${code} ${t}`);
    if (family) out.add(`${family} ${code} ${t}`);
  }
  return [...out];
}

export function hostnameFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function chatgptSourceIdFromUrl(url: string, tableCode: string): string {
  const host = hostnameFromUrl(url) || "unknown";
  const h = fnv1aHex(`${url}|${tableCode}`).slice(0, 10);
  const safeHost = host.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24);
  return `ext_gpt_${safeHost}_${h}`;
}

function sourceTypeToRegistryKind(
  t: ChatgptKnrSourceType,
): PublicKnrRegistryEntry["sourceKind"] {
  switch (t) {
    case "GOVERNMENT":
      return "GOVERNMENT";
    case "BIP":
      return "BIP";
    case "OFFICIAL_PUBLIC_TENDER_DOCUMENT":
      return "PUBLIC_TENDER";
    case "PUBLIC_INSTITUTION":
      return "PUBLIC_COST_ESTIMATE";
    case "PUBLIC_PDF":
      return "PUBLIC_PDF";
    default:
      return "OTHER_PUBLIC";
  }
}

function sourceTypeToPriority(t: ChatgptKnrSourceType): KnrDiscoverySourcePriority {
  switch (t) {
    case "GOVERNMENT":
      return "GOVERNMENT";
    case "BIP":
    case "OFFICIAL_PUBLIC_TENDER_DOCUMENT":
      return "OFFICIAL_PUBLIC_DOCUMENT";
    case "PUBLIC_INSTITUTION":
      return "UNIVERSITY";
    case "PUBLIC_PDF":
      return "PUBLIC_TENDER";
    default:
      return "OTHER";
  }
}

function sourceTypeToOriginId(t: ChatgptKnrSourceType): string {
  if (t === "GOVERNMENT") return "knr_government_public";
  return "knr_official_public_document";
}

export function buildChatgptKnrEphemeralRegistry(
  records: readonly ChatgptKnrVerifiedRecord[] = CHATGPT_KNR_RESEARCH_TPI729_VERIFIED,
): PublicKnrRegistryEntry[] {
  const out: PublicKnrRegistryEntry[] = [];
  const byId = new Map<string, PublicKnrRegistryEntry>();
  for (const rec of records) {
    for (const src of rec.sources) {
      const hostname = hostnameFromUrl(src.sourceUrl);
      if (!hostname || !/^https:\/\//i.test(src.sourceUrl)) continue;
      const sourceId = chatgptSourceIdFromUrl(src.sourceUrl, rec.tableCode);
      const existing = byId.get(sourceId);
      if (existing) {
        existing.tableCodeHints = [
          ...new Set([...(existing.tableCodeHints || []), rec.tableCode]),
        ];
        existing.evidenceKeyHints = [
          ...new Set([
            ...(existing.evidenceKeyHints || []),
            rec.canonicalDisplay.replace(/\s+/g, "|"),
          ]),
        ];
        existing.keywordHints = [
          ...new Set([...(existing.keywordHints || []), ...rec.semanticTokens.slice(0, 4)]),
        ];
        continue;
      }
      const q = scoreKnrSourceQuality(src);
      const entry: PublicKnrRegistryEntry = {
        sourceId,
        url: src.sourceUrl,
        hostname,
        originId: sourceTypeToOriginId(src.sourceType),
        sourceKind: sourceTypeToRegistryKind(src.sourceType),
        active: true,
        priority: q.score,
        title: `GPT research · ${rec.canonicalDisplay}`,
        tableCodeHints: [rec.tableCode],
        evidenceKeyHints: [rec.canonicalDisplay.replace(/\s+/g, "|")],
        keywordHints: [...rec.semanticTokens.slice(0, 6)],
      };
      byId.set(sourceId, entry);
      out.push(entry);
    }
  }
  return out;
}

export function buildChatgptKnrEphemeralAllowlist(
  registry: readonly PublicKnrRegistryEntry[],
): KnrDiscoveryAllowlistEntry[] {
  return registry.map((e) => ({
    sourceId: e.sourceId,
    hostname: e.hostname,
    url: e.url,
    originId: e.originId,
    active: e.active,
    priority:
      e.sourceKind === "GOVERNMENT" || e.sourceKind === "BIP"
        ? "GOVERNMENT"
        : e.sourceKind === "UNIVERSITY"
          ? "UNIVERSITY"
          : "OFFICIAL_PUBLIC_DOCUMENT",
  }));
}

export function buildChatgptKnrEphemeralKeyMap(
  records: readonly ChatgptKnrVerifiedRecord[] = CHATGPT_KNR_RESEARCH_TPI729_VERIFIED,
): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const rec of records) {
    const basis = buildCatalogBasisFromRawCode(rec.canonicalDisplay);
    const key = basis?.normalizedKey || rec.canonicalDisplay.replace(/\s+/g, "|");
    const ids = rec.sources.map((s) => chatgptSourceIdFromUrl(s.sourceUrl, rec.tableCode));
    map[key] = [...new Set([...(map[key] || []), ...ids])];
    const tender = `TENDER||${rec.tableCode}`;
    map[tender] = [...new Set([...(map[tender] || []), ...ids])];
  }
  return map;
}

export function buildChatgptKnrExpectedCodeVariants(
  tableCode: string,
  records: readonly ChatgptKnrVerifiedRecord[] = CHATGPT_KNR_RESEARCH_TPI729_VERIFIED,
): string[] {
  const rec = records.find((r) => r.tableCode === tableCode);
  if (!rec) return [];
  const out = new Set<string>();
  out.add(rec.canonicalDisplay);
  out.add(rec.canonicalDisplay.replace(/-/g, "/"));
  for (const fam of rec.alternateFamilies || []) out.add(`${fam} ${tableCode}`);
  for (const a of rec.aliases) out.add(`${rec.catalogFamilyPrefix} ${a}`);
  return [...out];
}

export function buildLearnedSearchStrategies(
  records: readonly ChatgptKnrVerifiedRecord[] = CHATGPT_KNR_RESEARCH_TPI729_VERIFIED,
  nowIso: string,
): KnrLearnedSearchStrategy[] {
  const globalDomains = new Set<string>();
  const globalTypes = new Set<ChatgptKnrSourceType>();
  for (const rec of records) {
    for (const s of rec.sources) {
      const h = hostnameFromUrl(s.sourceUrl);
      if (h) globalDomains.add(h);
      globalTypes.add(s.sourceType);
    }
  }

  const perCode: KnrLearnedSearchStrategy[] = records.map((rec) => {
    const domains = rec.sources
      .map((s) => hostnameFromUrl(s.sourceUrl))
      .filter((x): x is string => Boolean(x));
    return {
      strategyId: `learn:${rec.tableCode}:${rec.catalogFamilyPrefix.replace(/\s+/g, "_")}`,
      catalogFamilyPrefix: rec.catalogFamilyPrefix,
      tableCode: rec.tableCode,
      searchPatterns: buildKnrSearchPatterns({
        tableCode: rec.tableCode,
        catalogFamilyPrefix: rec.catalogFamilyPrefix,
        semanticTokens: rec.semanticTokens,
        aliases: rec.aliases,
      }),
      successfulSourceDomains: [...new Set(domains)],
      successfulSourceTypes: [...new Set(rec.sources.map((s) => s.sourceType))],
      descriptionTokens: [...rec.semanticTokens],
      unit: rec.unit,
      sourceStrategies: [
        "exact_code_search",
        "code_plus_catalog_family",
        "code_plus_description_tokens",
        "code_plus_unit",
        "public_tender_document",
        "BIP",
        "gov.pl",
        "municipal_public_institution",
        "multiple_source_corroboration",
      ],
      corroborationCount: rec.sources.length,
      provenance: "CHATGPT_EXTERNAL_EXPERT_DISCOVERY",
      retrievedAt: nowIso,
    };
  });

  const global: KnrLearnedSearchStrategy = {
    strategyId: "learn:global:chatgpt-tpi729",
    catalogFamilyPrefix: null,
    tableCode: null,
    searchPatterns: [
      "exact code",
      "code + catalog family",
      "code + description tokens",
      "code + unit",
      "Polish construction terms",
      "public tender documents",
      "BIP",
      "gov.pl",
      "municipal/public institutions",
      "universities",
      "public procurement attachments",
      "multiple-source corroboration",
    ],
    successfulSourceDomains: [...globalDomains],
    successfulSourceTypes: [...globalTypes],
    descriptionTokens: [],
    unit: null,
    sourceStrategies: [
      "public_tender_document",
      "BIP",
      "gov.pl",
      "exact_code_search",
      "family_from_source_not_chapter_invent",
    ],
    corroborationCount: records.reduce((n, r) => n + r.sources.length, 0),
    provenance: "CHATGPT_EXTERNAL_EXPERT_DISCOVERY",
    retrievedAt: nowIso,
  };

  return [global, ...perCode];
}

function toFact(rec: ChatgptKnrVerifiedRecord, sourceId: string): KnrDiscoveryFactCandidate {
  return {
    knrCode: rec.canonicalDisplay,
    normalizedKnrCode: rec.canonicalDisplay.replace(/\s+/g, "|"),
    description: rec.description,
    unit: rec.unit,
    sourceId,
    sourceUrlHash: fnv1aHex(rec.sources[0]?.sourceUrl || rec.tableCode),
    evidenceRef: `chatgpt-research:${rec.tableCode}:${sourceId}`,
    confidence: rec.sources.length >= 2 ? "high" : "medium",
    extractionStatus: "FULL",
  };
}

export type IngestChatgptKnrResearchResult = {
  version: typeof CHATGPT_KNR_RESEARCH_KNOWLEDGE_VERSION;
  nowIso: string;
  verifiedCodes: number;
  knowledgeEntries: number;
  learnedStrategies: KnrLearnedSearchStrategy[];
  ephemeralRegistry: PublicKnrRegistryEntry[];
  ephemeralAllowlist: KnrDiscoveryAllowlistEntry[];
  ephemeralKeyMap: Record<string, string[]>;
  catalogStore: KnrCatalogStore;
  discoveryStore: KnrDiscoveryEvidenceStore;
  staged: Array<{
    tableCode: string;
    canonicalDisplay: string;
    outcome: string;
    identityKeyV2: string | null;
    evidenceKeyV1: string | null;
    corroborationCount: number;
    sourceQuality: Array<{ url: string; band: KnrSourceQualityBand; score: number }>;
  }>;
  ownerRuntimeDependency: 0;
  productionMutation: false;
};

export function ingestChatgptKnrResearchKnowledge(input: {
  nowIso: string;
  records?: readonly ChatgptKnrVerifiedRecord[];
  catalogStore?: KnrCatalogStore | null;
  discoveryStore?: KnrDiscoveryEvidenceStore | null;
}): IngestChatgptKnrResearchResult {
  const nowIso = input.nowIso;
  const records = input.records ?? CHATGPT_KNR_RESEARCH_TPI729_VERIFIED;
  let catalogStore = input.catalogStore ?? emptyKnrCatalogStore(nowIso);
  let discoveryStore = input.discoveryStore ?? emptyKnrDiscoveryEvidenceStore(nowIso);
  const ephemeralRegistry = buildChatgptKnrEphemeralRegistry(records);
  const ephemeralAllowlist = buildChatgptKnrEphemeralAllowlist(ephemeralRegistry);
  const ephemeralKeyMap = buildChatgptKnrEphemeralKeyMap(records);
  const learnedStrategies = buildLearnedSearchStrategies(records, nowIso);
  const staged: IngestChatgptKnrResearchResult["staged"] = [];

  for (const rec of records) {
    const basis = buildCatalogBasisFromRawCode(rec.canonicalDisplay);
    const sourceQuality = rec.sources.map((s) => ({
      url: s.sourceUrl,
      ...scoreKnrSourceQuality(s),
    }));
    if (!basis) {
      staged.push({
        tableCode: rec.tableCode,
        canonicalDisplay: rec.canonicalDisplay,
        outcome: "BASIS_PARSE_FAIL",
        identityKeyV2: null,
        evidenceKeyV1: null,
        corroborationCount: rec.sources.length,
        sourceQuality,
      });
      continue;
    }
    const identity = parseIdentityPartialFromCatalogBasis(basis);
    const identityKeyV2 = foldIdentityKeyV2(identity);
    const evidenceKeyV1 = basis.normalizedKey;
    const primarySourceId = chatgptSourceIdFromUrl(rec.sources[0]!.sourceUrl, rec.tableCode);
    const fact = toFact(rec, primarySourceId);
    const stage = stageDiscoveryFactToPendingCatalog({
      fact,
      identityKeyV2,
      evidenceKeyV1,
      identity,
      displayCode: rec.canonicalDisplay,
      nowIso,
      catalogStore,
      originId: "knr_official_public_document",
      sourceIdentifier: primarySourceId,
    });
    catalogStore = stage.store;

    const sources = rec.sources.map((s) => {
      const sid = chatgptSourceIdFromUrl(s.sourceUrl, rec.tableCode);
      return {
        sourceId: sid,
        urlHash: fnv1aHex(s.sourceUrl),
        title: rec.canonicalDisplay,
        publisher: hostnameFromUrl(s.sourceUrl) || undefined,
        contentHash: fnv1aHex(`${s.sourceUrl}|${rec.description}|${rec.unit}`),
        fetchedAt: nowIso,
        priority: sourceTypeToPriority(s.sourceType),
        fragment: rec.description.slice(0, 160),
      };
    });

    const discoveryStatus: KnrDiscoveryStatus =
      sources.length >= 2 ? "CORROBORATED" : "DISCOVERED";

    const evidenceRecord: KnrDiscoveryEvidenceRecord = {
      schemaVersion: 1,
      evidenceKeyV1,
      identityKeyV2,
      family: String(identity.family || basis.family || "KNR"),
      displayCode: rec.canonicalDisplay,
      description: rec.description,
      unit: rec.unit,
      discoveryStatus,
      lifecycleState: "ACTIVE",
      sources,
      norms: { laborNorms: [], materialNorms: [], equipmentNorms: [] },
      queryHashes: buildKnrSearchPatterns({
        tableCode: rec.tableCode,
        catalogFamilyPrefix: rec.catalogFamilyPrefix,
        semanticTokens: rec.semanticTokens,
        aliases: rec.aliases,
      }).map((q) => fnv1aHex(q)),
      freshness: "FRESH",
      contentHash: fnv1aHex(`${evidenceKeyV1}|${rec.description}|${rec.unit}`),
      lastFetchedAt: nowIso,
      lastResearchAt: nowIso,
      updatedAt: nowIso,
      catalogRevisionLink: null,
    };

    const up = upsertKnrDiscoveryEvidenceOffline({
      record: evidenceRecord,
      nowIso,
      storeOverride: discoveryStore,
    });
    discoveryStore = up.store;

    staged.push({
      tableCode: rec.tableCode,
      canonicalDisplay: rec.canonicalDisplay,
      outcome: stage.outcome,
      identityKeyV2,
      evidenceKeyV1,
      corroborationCount: rec.sources.length,
      sourceQuality,
    });
  }

  return {
    version: CHATGPT_KNR_RESEARCH_KNOWLEDGE_VERSION,
    nowIso,
    verifiedCodes: records.length,
    knowledgeEntries: staged.filter((s) =>
      ["STAGED_PENDING", "NOOP_EXISTING"].includes(s.outcome),
    ).length,
    learnedStrategies,
    ephemeralRegistry,
    ephemeralAllowlist,
    ephemeralKeyMap,
    catalogStore,
    discoveryStore,
    staged,
    ownerRuntimeDependency: 0,
    productionMutation: false,
  };
}

export function lookupChatgptVerifiedRecord(
  tableCode: string,
  records: readonly ChatgptKnrVerifiedRecord[] = CHATGPT_KNR_RESEARCH_TPI729_VERIFIED,
): ChatgptKnrVerifiedRecord | null {
  return records.find((r) => r.tableCode === tableCode) ?? null;
}

export const CHATGPT_KNR_RESEARCH_KNOWLEDGE_IMPLEMENTED = true as const;
