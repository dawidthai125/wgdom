/**
 * AUTONOMOUS KNR SOURCE SELECTION AND INGESTION
 *
 * Reuses existing allowlist + public registry + extract + stageDiscoveryFactToPendingCatalog.
 * NEVER invents URLs · NEVER auto-VERIFIED · NEVER Owner runtime dependency.
 *
 * Outcome vocabulary (not OWNER_*):
 *   FULL_EXTRACT_STAGED_PENDING | EMPTY_EXTRACT_REJECTED | SUBSTRING_REJECTED
 *   | SOURCE_NOT_CONFIRMED | PROVIDER_SOURCE_UNAVAILABLE | PROVIDER_ACCESS_GAP
 *   | FETCH_FAILED | NOOP_EXISTING_PENDING
 */

import {
  KNR_DISCOVERY_HTTP_ALLOWLIST,
  type KnrDiscoveryAllowlistEntry,
} from "./knr-discovery-allowlist";
import {
  PUBLIC_KNR_SOURCE_REGISTRY,
  buildPublicKnrEffectiveAllowlist,
  type PublicKnrRegistryEntry,
} from "../ik-public-knr-source-registry";
import { KNR_DISCOVERY_SOURCE_SELECTION_BY_KEY } from "./knr-discovery-source-selection";
import { extractKnrDiscoveryFactFromDocumentText } from "./knr-discovery-fact-extract";
import { stageDiscoveryFactToPendingCatalog } from "./knr-discovery-catalog-stage";
import { extractKnrDiscoveryPdfTextFromBytes } from "./knr-discovery-pdf-text";
import {
  foldIdentityKeyV2,
  parseIdentityPartialFromCatalogBasis,
} from "./knr-identity-v2";
import { buildCatalogBasisFromRawCode } from "@/lib/tenders-bzp-brief";
import { lookupKnrCatalog } from "./knr-catalog-lookup";
import type { KnrCatalogStore } from "./knr-catalog-store";
import { buildChatgptKnrExpectedCodeVariants } from "./chatgpt-knr-research-knowledge";

export const AUTONOMOUS_KNR_SOURCE_SELECTION_VERSION = "AKSS-v1" as const;

export type AutonomousKnrSourceOutcome =
  | "FULL_EXTRACT_STAGED_PENDING"
  | "EMPTY_EXTRACT_REJECTED"
  | "SUBSTRING_REJECTED"
  | "SOURCE_NOT_CONFIRMED"
  | "PROVIDER_SOURCE_UNAVAILABLE"
  | "PROVIDER_ACCESS_GAP"
  | "FETCH_FAILED"
  | "NOOP_EXISTING_PENDING";

export type AutonomousKnrNextLegal =
  | "CONTINUE_PARTIAL_AUTONOMOUS · AUTONOMOUS_RESOLUTION_QUEUE"
  | "AUTONOMOUS_RESOLUTION_QUEUE"
  | "AUTONOMOUS_RESOLUTION_EXHAUSTED_DATA_GAP"
  | "PROVIDER_SOURCE_UNAVAILABLE"
  | "AUTONOMOUS_KNR_PENDING_VERIFY_PATH";

export type AutonomousKnrCodeInput = {
  tableCode: string;
  description?: string | null;
  unit?: string | null;
  lineIds?: readonly string[];
};

export type AutonomousKnrSourceProbe = {
  sourceId: string;
  sourceUrl: string;
  provider: string;
  originId: string;
  kind: "ALLOWLIST" | "PUBLIC_REGISTRY";
  score: number;
  scoreReason: string;
  sourceSupportsCodeHint: boolean;
  sourceAccessAllowed: boolean;
  sourceFetchable: boolean | null;
  extractable: boolean | null;
  fullRecordAvailable: boolean | null;
  descriptionAvailable: boolean | null;
  unitAvailable: boolean | null;
  provenanceAvailable: boolean;
  substringOnly: boolean;
  extractionStatus: string | null;
  httpStatus: number | null;
  outcome: AutonomousKnrSourceOutcome | "PROBED_OK" | "SKIPPED";
  detail?: string | null;
};

export type AutonomousKnrCodeResult = {
  knrCode: string;
  candidateSources: AutonomousKnrSourceProbe[];
  selectedSource: AutonomousKnrSourceProbe | null;
  whySelected: string | null;
  fetchResult: string;
  extractionResult: string;
  stagingResult: string;
  verificationResult: string;
  catalogResult: string;
  outcome: AutonomousKnrSourceOutcome;
  identityKeyV2: string | null;
  stagedPending: boolean;
  verificationStatus: string | null;
  localHit: boolean;
  ephemeralKeyBinding: string | null;
  nextLegalTransaction: AutonomousKnrNextLegal;
  retrievedAt: string | null;
  provenance: Record<string, unknown> | null;
};

export type RunAutonomousKnrSourceSelectionInput = {
  codes: readonly AutonomousKnrCodeInput[];
  catalogStore: KnrCatalogStore;
  nowIso: string;
  maxProbesPerCode?: number;
  fetchImpl?: (url: string) => Promise<{
    ok: boolean;
    status: number;
    bytes: Uint8Array;
    contentType: string;
  }>;
  allowlistOverride?: readonly KnrDiscoveryAllowlistEntry[] | null;
  registryOverride?: readonly PublicKnrRegistryEntry[] | null;
};

export type RunAutonomousKnrSourceSelectionResult = {
  version: typeof AUTONOMOUS_KNR_SOURCE_SELECTION_VERSION;
  nowIso: string;
  catalogStore: KnrCatalogStore;
  perCode: AutonomousKnrCodeResult[];
  totals: {
    codes: number;
    sourcesDiscovered: number;
    sourcesSelected: number;
    fetchesAttempted: number;
    fullExtracts: number;
    emptyExtracts: number;
    substringRejected: number;
    pendingRecords: number;
    verifiedRecords: number;
    localHits: number;
    providerUnavailable: number;
    accessGaps: number;
  };
  ephemeralKeyMap: Record<string, string[]>;
  ownerRuntimeDependency: 0;
  microSequencing: false;
  nextLegalTransaction: AutonomousKnrNextLegal;
};

function softTokens(s: string): string[] {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length >= 4);
}

/** Plausible full KNR display forms — prefer ChatGPT-learned family when known. */
export function buildAutonomousKnrExpectedCodeVariants(
  tableCode: string,
  description?: string | null,
): string[] {
  const code = String(tableCode || "").trim();
  if (!code) return [];
  const learned = buildChatgptKnrExpectedCodeVariants(code);
  const chapter = String(description || "").match(/\bd\.?\s*(\d{1,2})\b/i)?.[1];
  const catalogs = ["4-01", "4-02", "4-03", "2-02", "2-15", "13-21", "9-10"];
  if (chapter) {
    const pad = chapter.padStart(2, "0");
    catalogs.unshift(pad);
  }
  const out: string[] = [...learned];
  for (const cat of [...new Set(catalogs)]) {
    out.push(`KNR-W ${cat} ${code}`);
    out.push(`KNR ${cat} ${code}`);
    out.push(`KNNR ${cat} ${code}`);
  }
  return [...new Set(out)];
}

function byKeySourceIdsForCode(tableCode: string): string[] {
  const ids: string[] = [];
  for (const [key, sources] of Object.entries(KNR_DISCOVERY_SOURCE_SELECTION_BY_KEY)) {
    if (key.includes(tableCode)) ids.push(...sources);
  }
  return [...new Set(ids)];
}

type RankedSource = {
  sourceId: string;
  url: string;
  hostname: string;
  originId: string;
  kind: "ALLOWLIST" | "PUBLIC_REGISTRY";
  priority: string;
  tableCodeHints: readonly string[];
  evidenceKeyHints: readonly string[];
  keywordHints: readonly string[];
};

function listConfirmedLegalSources(opts: {
  allowlistOverride?: readonly KnrDiscoveryAllowlistEntry[] | null;
  registryOverride?: readonly PublicKnrRegistryEntry[] | null;
}): RankedSource[] {
  const allowlist =
    opts.allowlistOverride ?? KNR_DISCOVERY_HTTP_ALLOWLIST.filter((e) => e.active);
  const registry = (opts.registryOverride ?? PUBLIC_KNR_SOURCE_REGISTRY).filter((e) => e.active);
  const byId = new Map<string, RankedSource>();

  for (const e of allowlist) {
    if (!e.active || !e.url || !e.sourceId) continue;
    byId.set(e.sourceId, {
      sourceId: e.sourceId,
      url: e.url,
      hostname: e.hostname,
      originId: e.originId,
      kind: "ALLOWLIST",
      priority: e.priority,
      tableCodeHints: [],
      evidenceKeyHints: [],
      keywordHints: [],
    });
  }
  for (const e of registry) {
    if (!e.active || !e.url || !e.sourceId) continue;
    const prev = byId.get(e.sourceId);
    byId.set(e.sourceId, {
      sourceId: e.sourceId,
      url: e.url,
      hostname: e.hostname,
      originId: e.originId,
      kind: prev?.kind === "ALLOWLIST" ? "ALLOWLIST" : "PUBLIC_REGISTRY",
      priority: String(e.priority ?? prev?.priority ?? "OTHER"),
      tableCodeHints: e.tableCodeHints ?? [],
      evidenceKeyHints: e.evidenceKeyHints ?? [],
      keywordHints: e.keywordHints ?? [],
    });
  }
  for (const e of buildPublicKnrEffectiveAllowlist({
    baseAllowlist: allowlist,
    registryOverride: registry,
  })) {
    if (!byId.has(e.sourceId)) {
      byId.set(e.sourceId, {
        sourceId: e.sourceId,
        url: e.url,
        hostname: e.hostname,
        originId: e.originId,
        kind: "PUBLIC_REGISTRY",
        priority: e.priority,
        tableCodeHints: [],
        evidenceKeyHints: [],
        keywordHints: [],
      });
    }
  }
  return [...byId.values()];
}

function scoreSource(
  src: RankedSource,
  tableCode: string,
  description: string,
): { score: number; reason: string; supportsHint: boolean } {
  let score = 0;
  const reasons: string[] = [];
  const byKey = byKeySourceIdsForCode(tableCode);
  if (byKey.includes(src.sourceId)) {
    score += 100;
    reasons.push("BY_KEY");
  }
  if (src.tableCodeHints.includes(tableCode)) {
    score += 80;
    reasons.push("TABLE_CODE_HINT");
  }
  if (src.evidenceKeyHints.some((h) => h.includes(tableCode))) {
    score += 70;
    reasons.push("EVIDENCE_KEY_HINT");
  }
  const tokens = softTokens(description);
  let kw = 0;
  for (const hint of src.keywordHints) {
    const ht = softTokens(hint);
    if (tokens.some((t) => ht.includes(t) || (ht[0] && t.includes(ht[0])))) kw += 1;
  }
  if (kw) {
    score += Math.min(30, kw * 10);
    reasons.push("KEYWORD");
  }
  if (src.kind === "ALLOWLIST") {
    score += 25;
    reasons.push("ALLOWLIST_PRIORITY");
  }
  if (/GOVERNMENT|BIP|OFFICIAL/i.test(src.priority) || /gov|bip/i.test(src.hostname)) {
    score += 15;
    reasons.push("GOV_HOST");
  }
  score += 5;
  reasons.push("CONFIRMED_URL");
  const supportsHint =
    byKey.includes(src.sourceId)
    || src.tableCodeHints.includes(tableCode)
    || src.evidenceKeyHints.some((h) => h.includes(tableCode));
  return { score, reason: reasons.join("+") || "CONFIRMED_URL", supportsHint };
}

async function defaultFetch(url: string): Promise<{
  ok: boolean;
  status: number;
  bytes: Uint8Array;
  contentType: string;
}> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { Accept: "text/html,application/pdf,*/*" },
    signal: AbortSignal.timeout(25000),
  });
  const buf = new Uint8Array(await res.arrayBuffer());
  return {
    ok: res.ok,
    status: res.status,
    bytes: buf,
    contentType: res.headers.get("content-type") || "",
  };
}

async function bytesToText(
  url: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  const asUtf8 = () => new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (/pdf/i.test(contentType) || url.toLowerCase().endsWith(".pdf")) {
    const pdf = await extractKnrDiscoveryPdfTextFromBytes(bytes);
    if (pdf.ok && pdf.text.trim()) return pdf.text;
    // Fixture / mislabeled content-type: fall back to utf8 (never invent fields)
    return asUtf8();
  }
  return asUtf8();
}

function tryFullExtract(
  text: string,
  tableCode: string,
  description: string | null | undefined,
  sourceId: string,
): {
  status: string;
  fact: ReturnType<typeof extractKnrDiscoveryFactFromDocumentText> | null;
  expectedUsed: string | null;
} {
  const variants = buildAutonomousKnrExpectedCodeVariants(tableCode, description);
  for (const expected of variants) {
    const fact = extractKnrDiscoveryFactFromDocumentText(text, {
      expectedCode: expected,
      evidenceKeyV1: expected.replace(/\s+/g, "|").replace(/\|+/g, "|"),
      sourceId,
    });
    if (fact.extractionStatus === "FULL" && fact.description && fact.unit) {
      return { status: "FULL", fact, expectedUsed: expected };
    }
  }
  const bare = extractKnrDiscoveryFactFromDocumentText(text, {
    expectedCode: tableCode,
    evidenceKeyV1: `TENDER||${tableCode}`,
    sourceId,
  });
  return { status: bare.extractionStatus || "EMPTY", fact: bare, expectedUsed: tableCode };
}

function mapNext(outcome: AutonomousKnrSourceOutcome): AutonomousKnrNextLegal {
  switch (outcome) {
    case "FULL_EXTRACT_STAGED_PENDING":
    case "NOOP_EXISTING_PENDING":
      return "AUTONOMOUS_KNR_PENDING_VERIFY_PATH";
    case "PROVIDER_ACCESS_GAP":
    case "PROVIDER_SOURCE_UNAVAILABLE":
      return "PROVIDER_SOURCE_UNAVAILABLE";
    case "SOURCE_NOT_CONFIRMED":
    case "EMPTY_EXTRACT_REJECTED":
    case "SUBSTRING_REJECTED":
    case "FETCH_FAILED":
      return "AUTONOMOUS_RESOLUTION_EXHAUSTED_DATA_GAP";
    default:
      return "CONTINUE_PARTIAL_AUTONOMOUS · AUTONOMOUS_RESOLUTION_QUEUE";
  }
}

/**
 * Autonomous source selection + FULL-extract staging into existing catalog store (in-memory).
 * Does not write cloud · does not VERIFIED · does not invent URLs.
 */
export async function runAutonomousKnrSourceSelectionAndIngest(
  input: RunAutonomousKnrSourceSelectionInput,
): Promise<RunAutonomousKnrSourceSelectionResult> {
  const nowIso = input.nowIso;
  const fetchImpl = input.fetchImpl ?? defaultFetch;
  const maxProbes = input.maxProbesPerCode ?? 12;
  let catalogStore = input.catalogStore;
  const sources = listConfirmedLegalSources({
    allowlistOverride: input.allowlistOverride,
    registryOverride: input.registryOverride,
  });

  const perCode: AutonomousKnrCodeResult[] = [];
  const ephemeralKeyMap: Record<string, string[]> = {};
  let fetchesAttempted = 0;
  let fullExtracts = 0;
  let emptyExtracts = 0;
  let substringRejected = 0;
  let pendingRecords = 0;
  let verifiedRecords = 0;
  let localHits = 0;
  let providerUnavailable = 0;
  let accessGaps = 0;
  let sourcesSelected = 0;

  for (const codeInput of input.codes) {
    const tableCode = String(codeInput.tableCode || "").trim();
    const description = String(codeInput.description || "");
    const ranked = sources
      .map((src) => {
        const sc = scoreSource(src, tableCode, description);
        return { src, ...sc };
      })
      .sort((a, b) => b.score - a.score || a.src.sourceId.localeCompare(b.src.sourceId));

    const probes: AutonomousKnrSourceProbe[] = [];
    let selected: AutonomousKnrSourceProbe | null = null;
    let whySelected: string | null = null;
    let stagedPending = false;
    let identityKeyV2: string | null = null;
    let verificationStatus: string | null = null;
    let localHit = false;
    let ephemeralKeyBinding: string | null = null;
    let provenance: Record<string, unknown> | null = null;
    let retrievedAt: string | null = null;
    let outcome: AutonomousKnrSourceOutcome = "PROVIDER_SOURCE_UNAVAILABLE";
    let fetchResult = "NONE";
    let extractionResult = "NONE";
    let stagingResult = "NONE";
    let verificationResult = "NOT_RUN_NO_FULL";
    let catalogResult = "LOCAL_MISS";

    for (const row of ranked.slice(0, maxProbes)) {
      const baseProbe: AutonomousKnrSourceProbe = {
        sourceId: row.src.sourceId,
        sourceUrl: row.src.url,
        provider: row.src.hostname,
        originId: row.src.originId,
        kind: row.src.kind,
        score: row.score,
        scoreReason: row.reason,
        sourceSupportsCodeHint: row.supportsHint,
        sourceAccessAllowed: true,
        sourceFetchable: null,
        extractable: null,
        fullRecordAvailable: null,
        descriptionAvailable: null,
        unitAvailable: null,
        provenanceAvailable: true,
        substringOnly: false,
        extractionStatus: null,
        httpStatus: null,
        outcome: "SKIPPED",
      };

      if (!row.src.url || !/^https:\/\//i.test(row.src.url)) {
        probes.push({
          ...baseProbe,
          sourceAccessAllowed: false,
          outcome: "SOURCE_NOT_CONFIRMED",
          detail: "URL missing or not https confirmed",
        });
        continue;
      }

      fetchesAttempted += 1;
      let fetched;
      try {
        fetched = await fetchImpl(row.src.url);
      } catch (e) {
        probes.push({
          ...baseProbe,
          sourceFetchable: false,
          outcome: "FETCH_FAILED",
          detail: String((e as Error)?.message || e),
        });
        continue;
      }

      if (fetched.status === 401 || fetched.status === 402 || fetched.status === 403) {
        accessGaps += 1;
        probes.push({
          ...baseProbe,
          sourceFetchable: false,
          httpStatus: fetched.status,
          outcome: "PROVIDER_ACCESS_GAP",
          detail: `HTTP ${fetched.status}`,
        });
        continue;
      }
      if (!fetched.ok) {
        probes.push({
          ...baseProbe,
          sourceFetchable: false,
          httpStatus: fetched.status,
          outcome: "FETCH_FAILED",
          detail: `HTTP ${fetched.status}`,
        });
        continue;
      }

      const text = await bytesToText(row.src.url, fetched.bytes, fetched.contentType);
      const codeInText = text.includes(tableCode);
      const extracted = tryFullExtract(text, tableCode, description, row.src.sourceId);

      if (extracted.status === "FULL" && extracted.fact) {
        fullExtracts += 1;
        const probe: AutonomousKnrSourceProbe = {
          ...baseProbe,
          sourceFetchable: true,
          extractable: true,
          fullRecordAvailable: true,
          descriptionAvailable: true,
          unitAvailable: true,
          httpStatus: fetched.status,
          extractionStatus: "FULL",
          outcome: "PROBED_OK",
        };
        probes.push(probe);

        const basis =
          buildCatalogBasisFromRawCode(extracted.expectedUsed || `KNR ${tableCode}`)
          ?? buildCatalogBasisFromRawCode(`KNR-W 4-01 ${tableCode}`);
        if (!basis) continue;

        const identity = parseIdentityPartialFromCatalogBasis(basis);
        identityKeyV2 = foldIdentityKeyV2(identity);
        const staged = stageDiscoveryFactToPendingCatalog({
          fact: extracted.fact,
          identityKeyV2,
          evidenceKeyV1: basis.normalizedKey,
          identity,
          displayCode: tableCode,
          nowIso,
          catalogStore,
          originId: row.src.originId,
          sourceIdentifier: row.src.sourceId,
        });
        catalogStore = staged.store;
        stagingResult = staged.outcome;
        if (staged.outcome === "STAGED_PENDING") {
          stagedPending = true;
          pendingRecords += 1;
          outcome = "FULL_EXTRACT_STAGED_PENDING";
        } else if (staged.outcome === "NOOP_EXISTING") {
          stagedPending = true;
          outcome = "NOOP_EXISTING_PENDING";
        } else {
          outcome = "EMPTY_EXTRACT_REJECTED";
          stagingResult = staged.outcome;
        }

        selected = probe;
        whySelected = `${row.reason}; FULL extract via ${extracted.expectedUsed}; score=${row.score}`;
        sourcesSelected += 1;
        fetchResult = `OK ${fetched.status}`;
        extractionResult = "FULL";
        verificationStatus = staged.entry?.verificationStatus ?? "PENDING_VERIFY";
        verificationResult =
          "PENDING_VERIFY_PRESERVED · KL-6 Super Admin ACL not invoked (no Owner runtime; autonomous path stops at PENDING)";
        retrievedAt = nowIso;
        provenance = {
          sourceId: row.src.sourceId,
          sourceUrl: row.src.url,
          originId: row.src.originId,
          retrievedAt: nowIso,
          expectedCode: extracted.expectedUsed,
          evidenceKeyV1: basis.normalizedKey,
        };
        ephemeralKeyBinding = basis.normalizedKey;
        ephemeralKeyMap[basis.normalizedKey] = [row.src.sourceId];

        const looked = lookupKnrCatalog({ identityKeyV2 }, catalogStore);
        localHit = looked.status === "LOCAL_HIT";
        if (localHit) localHits += 1;
        catalogResult = looked.status;
        if (verificationStatus === "VERIFIED") verifiedRecords += 1;
        break;
      }

      if (codeInText) {
        substringRejected += 1;
        emptyExtracts += 1;
        probes.push({
          ...baseProbe,
          sourceFetchable: true,
          extractable: false,
          fullRecordAvailable: false,
          descriptionAvailable: Boolean(extracted.fact?.description),
          unitAvailable: Boolean(extracted.fact?.unit),
          substringOnly: true,
          httpStatus: fetched.status,
          extractionStatus: extracted.status,
          outcome: "SUBSTRING_REJECTED",
          detail:
            "Code substring present but FULL fact (layout+description+unit) not extractable — not a legal match",
        });
      } else {
        emptyExtracts += 1;
        probes.push({
          ...baseProbe,
          sourceFetchable: true,
          extractable: false,
          fullRecordAvailable: false,
          descriptionAvailable: false,
          unitAvailable: false,
          httpStatus: fetched.status,
          extractionStatus: extracted.status,
          outcome: "EMPTY_EXTRACT_REJECTED",
          detail: "No FULL extract for this code in source document",
        });
      }
    }

    if (!selected) {
      const anyAccess = probes.some((p) => p.outcome === "PROVIDER_ACCESS_GAP");
      const anySubstring = probes.some((p) => p.outcome === "SUBSTRING_REJECTED");
      if (
        anyAccess
        && probes.every(
          (p) => p.outcome === "PROVIDER_ACCESS_GAP" || p.outcome === "FETCH_FAILED",
        )
      ) {
        outcome = "PROVIDER_ACCESS_GAP";
      } else if (ranked.length === 0) {
        outcome = "SOURCE_NOT_CONFIRMED";
      } else if (anySubstring && probes.every((p) => p.outcome !== "PROBED_OK")) {
        outcome = "PROVIDER_SOURCE_UNAVAILABLE";
      } else {
        outcome = "PROVIDER_SOURCE_UNAVAILABLE";
      }
      if (
        outcome === "PROVIDER_SOURCE_UNAVAILABLE"
        || outcome === "SOURCE_NOT_CONFIRMED"
      ) {
        providerUnavailable += 1;
      }
      fetchResult = probes.some((p) => p.sourceFetchable) ? "ATTEMPTED" : "FAILED_OR_EMPTY";
      extractionResult = anySubstring ? "SUBSTRING_ONLY" : "EMPTY";
      stagingResult = "NOT_STAGED";
      verificationResult = "N/A";
      catalogResult = "LOCAL_MISS";
    }

    perCode.push({
      knrCode: tableCode,
      candidateSources: probes,
      selectedSource: selected,
      whySelected,
      fetchResult,
      extractionResult,
      stagingResult,
      verificationResult,
      catalogResult,
      outcome,
      identityKeyV2,
      stagedPending,
      verificationStatus,
      localHit,
      ephemeralKeyBinding,
      nextLegalTransaction: mapNext(outcome),
      retrievedAt,
      provenance,
    });
  }

  const anyPending = pendingRecords > 0 || perCode.some((c) => c.stagedPending);
  const allUnavailable = perCode.every((c) =>
    [
      "PROVIDER_SOURCE_UNAVAILABLE",
      "SOURCE_NOT_CONFIRMED",
      "PROVIDER_ACCESS_GAP",
      "SUBSTRING_REJECTED",
      "EMPTY_EXTRACT_REJECTED",
      "FETCH_FAILED",
    ].includes(c.outcome),
  );

  return {
    version: AUTONOMOUS_KNR_SOURCE_SELECTION_VERSION,
    nowIso,
    catalogStore,
    perCode,
    totals: {
      codes: input.codes.length,
      sourcesDiscovered: sources.length,
      sourcesSelected,
      fetchesAttempted,
      fullExtracts,
      emptyExtracts,
      substringRejected,
      pendingRecords,
      verifiedRecords,
      localHits,
      providerUnavailable,
      accessGaps,
    },
    ephemeralKeyMap,
    ownerRuntimeDependency: 0,
    microSequencing: false,
    nextLegalTransaction: anyPending
      ? "AUTONOMOUS_KNR_PENDING_VERIFY_PATH"
      : allUnavailable
        ? "PROVIDER_SOURCE_UNAVAILABLE"
        : "CONTINUE_PARTIAL_AUTONOMOUS · AUTONOMOUS_RESOLUTION_QUEUE",
  };
}

export const AUTONOMOUS_KNR_SOURCE_SELECTION_IMPLEMENTED = true as const;
