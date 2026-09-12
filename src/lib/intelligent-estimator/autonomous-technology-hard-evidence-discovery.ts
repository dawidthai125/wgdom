/**
 * AUTONOMOUS TECHNOLOGY HARD-EVIDENCE DISCOVERY (ATHED-v1)
 *
 * LEGAL PROVIDER DISCOVERY → FETCH → EXTRACT → SOFT vs HARD → materials for ATSS/ATA.
 * Reuses AKSS fetch/PDF extract · SSRF · allowlist/registry · existing extractors.
 * ZERO invent · ZERO second orchestra · LICENSE_REQUIRED ≠ Owner.
 */

import { assertKnrDiscoveryUrlSafeForFetch } from "./knr-knowledge/knr-discovery-ssrf";
import {
  isKnrDiscoveryHostnameAllowlisted,
  KNR_DISCOVERY_HTTP_ALLOWLIST,
} from "./knr-knowledge/knr-discovery-allowlist";
import {
  PUBLIC_KNR_SOURCE_REGISTRY,
  buildPublicKnrEffectiveAllowlist,
} from "./ik-public-knr-source-registry";
import { extractKnrDiscoveryPdfTextFromBytes } from "./knr-knowledge/knr-discovery-pdf-text";
import {
  extractHardBomMaterialsFromPublicText,
  type AtssHardMaterialHit,
  type AtssSourceTier,
} from "./autonomous-technology-source-selection";
import {
  normalizeMaterialIdentity,
  normalizeMaterialIdentityBatch,
  extractMaterialNounFromWorkDescription,
  isLikelyConstructionMaterialName,
  isPrimaryStructuralMaterialName,
  isSecondaryBinderMaterialName,
  scoreMaterialNounPriority,
} from "./material-identity-normalization";
import {
  upsertTechnologyEvidenceKnowledge,
  buildTechnologySearchStrategies,
} from "./technology-evidence-knowledge";

export const AUTONOMOUS_TECHNOLOGY_HARD_EVIDENCE_VERSION = "ATHED-v1" as const;

export type AthedProviderStatus =
  | "AVAILABLE"
  | "FETCHED"
  | "EXTRACTABLE"
  | "RELEVANT"
  | "HARD_EVIDENCE"
  | "SOFT_ONLY"
  | "LICENSE_REQUIRED"
  | "BLOCKED"
  | "NOT_CONFIGURED"
  | "FETCH_FAILED"
  | "EMPTY";

export type AthedDocumentProbe = {
  sourceId: string;
  sourceUrl: string;
  origin: "ALLOWLIST" | "REGISTRY" | "LEARNED_PUBLIC" | "INJECTED";
  rankingScore: number;
  rankingReasons: string[];
  legalAccess: boolean;
  ssrfOk: boolean;
  allowlistedHost: boolean;
  httpStatus: number | null;
  fetchOk: boolean;
  documentType: "pdf" | "html" | "text" | "unknown" | null;
  extractable: boolean;
  textLength: number;
  relevant: boolean;
  relevanceReason: string | null;
  softEvidence: boolean;
  hardEvidence: boolean;
  materialHits: number;
  quantityHits: number;
  technologyStepsFound: boolean;
  status: AthedProviderStatus;
  excerpt: string | null;
  hardMaterials: AtssHardMaterialHit[];
  detail: string | null;
};

export type AthedFetchImpl = (url: string) => Promise<{
  ok: boolean;
  status: number;
  bytes: Uint8Array;
  contentType: string;
}>;

export type RunAthedInput = {
  workId: string;
  description: string;
  unit: string;
  knrFamily?: string | null;
  knrCode?: string | null;
  knownPublicSourceUrls?: readonly { sourceId: string; url: string; kind?: string }[] | null;
  nowIso: string;
  maxProbes?: number;
  fetchImpl?: AthedFetchImpl;
  /** Skip network — for unit tests / offline. */
  disableFetch?: boolean;
  /**
   * When set, ONLY these URLs are probed (tests / focused dry-run).
   * Still subject to SSRF + public-host / allowlist legalAccess.
   */
  sourceUrlsOverride?: readonly { sourceId: string; url: string; kind?: string }[] | null;
};

export type RunAthedResult = {
  version: typeof AUTONOMOUS_TECHNOLOGY_HARD_EVIDENCE_VERSION;
  workId: string;
  searchStrategies: string[];
  probes: AthedDocumentProbe[];
  totals: {
    sourcesDiscovered: number;
    sourcesProbed: number;
    fetchable: number;
    fetchedOk: number;
    extractable: number;
    relevant: number;
    softOnly: number;
    hardEvidence: number;
    blocked: number;
    fetchFailed: number;
  };
  hardMaterials: AtssHardMaterialHit[];
  evidenceClass: "HARD_EVIDENCE" | "SOFT_ONLY" | "NO_EVIDENCE";
  nextLegal:
    | "HARD_EVIDENCE_READY"
    | "SOFT_ONLY_CONTINUE_PROVIDERS"
    | "TECHNOLOGY_EVIDENCE_GAP_EXHAUSTED"
    | "AUTONOMOUS_RESOLUTION_QUEUE · TECHNOLOGY_EVIDENCE_GAP";
  /** True when every ranked legal source was probed (no further ladder steps). */
  ladderExhausted: boolean;
  ownerRuntimeDependency: 0;
};

const PUBLIC_HOST_RE =
  /(?:^|\.)((?:gov|bip|edu|mil)\.pl|gov\.pl|bip\.[a-z0-9.-]+\.pl|[a-z0-9-]+\.bip\.[a-z0-9.-]+)$/i;

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

function isRetailMarketplaceHost(hostname: string): boolean {
  return /(sklep|shop|allegro|olx|amazon|castorama|leroymerlin|leroy|obi\.pl|mediaexpert|castorama)/i.test(
    hostname,
  );
}

/**
 * Legal public / institutional hosts for HARD evidence fetch.
 * Includes BIP variants + curated institutional .pl (not DIY retail).
 */
function isPublicInstitutionHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (isKnrDiscoveryHostnameAllowlisted(h)) return true;
  if (PUBLIC_HOST_RE.test(h)) return true;
  if (h.endsWith(".gov.pl") || h.includes(".bip.") || h.endsWith(".edu.pl")) return true;
  // BIP / eBIP / newBIP / iBIP — public procurement portals
  if (h.includes("bip") || h.includes("ibip")) return true;
  if (h.includes("nfz-") || h.endsWith(".nfz.pl")) return true;
  if (isRetailMarketplaceHost(h)) return false;
  // Institutional public PL/EU (tenders, hospitals, research, municipal)
  if (
    (h.endsWith(".pl") || h.endsWith(".eu"))
    && /urzad|um\.|powiat|gmina|starost|marszalk|szpital|uczeln|uniwersyt|politech|lukasiewicz|spwsz|zmsp|ozpzd|mzzl|wcrs|rckik|ins\.|gov\.|edu\./i.test(
      h,
    )
  ) {
    return true;
  }
  return false;
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
): Promise<{ text: string; documentType: AthedDocumentProbe["documentType"]; extractable: boolean }> {
  const asUtf8 = () => new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const isPdf = /pdf/i.test(contentType) || url.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    const pdf = await extractKnrDiscoveryPdfTextFromBytes(bytes);
    if (pdf.ok && pdf.text.trim()) {
      return { text: pdf.text, documentType: "pdf", extractable: true };
    }
    return { text: "", documentType: "pdf", extractable: false };
  }
  const text = asUtf8();
  const documentType = /html/i.test(contentType) ? "html" : "text";
  return {
    text,
    documentType,
    extractable: text.replace(/\s+/g, "").length >= 40,
  };
}

/** Window around KNR code / description tokens — relevance scope for hard extract. */
export function extractRelevantTechnologySections(input: {
  text: string;
  knrCode?: string | null;
  description?: string | null;
  windowChars?: number;
}): { relevant: boolean; reason: string | null; sections: string[] } {
  const text = String(input.text || "");
  if (!text.trim()) return { relevant: false, reason: null, sections: [] };
  const win = input.windowChars ?? 1200;
  const sections: string[] = [];
  const code = String(input.knrCode || "").trim();
  if (code) {
    const re = new RegExp(code.replace("-", "[-/\\\\.]"), "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null && sections.length < 4) {
      const start = Math.max(0, m.index - Math.floor(win / 4));
      const end = Math.min(text.length, m.index + win);
      sections.push(text.slice(start, end));
    }
    if (sections.length) {
      return { relevant: true, reason: `knr_code:${code}`, sections };
    }
  }
  const tokens = softTokens(input.description || "");
  if (tokens.length >= 2) {
    const lower = text.toLowerCase();
    const hits = tokens.filter((t) => lower.includes(t));
    if (hits.length >= 2) {
      const idx = lower.indexOf(hits[0]!);
      sections.push(text.slice(Math.max(0, idx - 200), Math.min(text.length, idx + win)));
      return { relevant: true, reason: `desc_tokens:${hits.slice(0, 3).join("+")}`, sections };
    }
  }
  return { relevant: false, reason: null, sections: [] };
}

/**
 * Nakładcze / RMS-style material lines near work — explicit qty only.
 * Pattern: M … name … qty unit  OR  "Materiały:" block rows.
 */
export function extractNakladczeHardMaterials(input: {
  sectionText: string;
  sourceRef: string;
  tier?: AtssSourceTier;
}): AtssHardMaterialHit[] {
  const text = String(input.sectionText || "");
  const hits: AtssHardMaterialHit[] = [];
  const softDeny = /typowe|zwykle|ok\.|oko[lł]o|approx|~/i;

  // M-line: M.123 / M  zaprawa ... 4,5 kg  (also R/M/S nakładcze tables)
  const mLine =
    /(?:^|\n)\s*M[\d.]*\s+([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż][^\n]{2,60}?)\s+(\d+[.,]\d+|\d+)\s*(kg|l|mb|m2|m²|szt|m3)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = mLine.exec(text)) !== null) {
    const window = text.slice(Math.max(0, m.index - 20), m.index + (m[0]?.length || 0));
    if (softDeny.test(window)) continue;
    const namePl = String(m[1] || "").trim().replace(/\s+/g, " ");
    const qty = Number(String(m[2] || "").replace(",", "."));
    const unit = String(m[3] || "").replace("²", "2").toLowerCase();
    if (!namePl || !Number.isFinite(qty) || qty < 0) continue;
    // Reject labor-looking names
    if (/^r[\d.\s]|robocizn|r-g|rg\b/i.test(namePl)) continue;
    const norm = normalizeMaterialIdentity({
      rawText: namePl,
      unit,
      quantity: qty,
      source: input.sourceRef,
      provenance: input.sourceRef,
      contextText: window,
    });
    if (norm.status !== "ACCEPTED") continue;
    hits.push({
      materialKey: norm.materialKey || `mat.naklad.${namePl.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 48)}`,
      namePl: norm.normalizedName,
      unit,
      qtyFactor: qty,
      sourceRef: input.sourceRef,
      evidenceRefs: [input.sourceRef],
      tier: input.tier || "PUBLIC_BOQ_KOSZTORYS",
    });
  }

  // Tabular RMS: "Materiały" / "M:" block with name + qty + unit on one line
  const matBlock =
    /(?:materia[lł]y|nak[lł]ady\s+materia[lł]owe|zu[zż]ycie\s+materia[lł][oó]w)\s*[:\-]?\s*([\s\S]{0,800}?)(?=\n\s*(?:robocizn|sprz[eę]t|razem|technolog|$))/gi;
  while ((m = matBlock.exec(text)) !== null) {
    const block = String(m[1] || "");
    const rowRe =
      /([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż][^\n]{2,50}?)\s+(\d+[.,]\d+|\d+)\s*(kg|l|mb|m2|m²|szt|m3)\b/gi;
    let row: RegExpExecArray | null;
    while ((row = rowRe.exec(block)) !== null) {
      if (softDeny.test(row[0] || "")) continue;
      const namePl = String(row[1] || "").trim().replace(/\s+/g, " ");
      const qty = Number(String(row[2] || "").replace(",", "."));
      const unit = String(row[3] || "").replace("²", "2").toLowerCase();
      if (!namePl || !Number.isFinite(qty) || qty < 0) continue;
      if (/^r[\d.\s]|robocizn|sprz[eę]t/i.test(namePl)) continue;
      const norm = normalizeMaterialIdentity({
        rawText: namePl,
        unit,
        quantity: qty,
        source: input.sourceRef,
        provenance: input.sourceRef,
        contextText: row[0],
      });
      if (norm.status !== "ACCEPTED") continue;
      hits.push({
        materialKey: norm.materialKey || `mat.naklad.${namePl.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 48)}`,
        namePl: norm.normalizedName,
        unit,
        qtyFactor: qty,
        sourceRef: input.sourceRef,
        evidenceRefs: [input.sourceRef],
        tier: input.tier || "PUBLIC_BOQ_KOSZTORYS",
      });
    }
  }

  // Consumption line: zużycie: 4,5 kg/m2 (already covered by extractHardBom — keep complementary)
  const zuzycie =
    /zu[zż]ycie\s*[:\-]?\s*(\d+[.,]\d+|\d+)\s*(kg|l|mb|m2|m³|m3)\s*(?:\/\s*(m2|m²|szt|mb))?/gi;
  while ((m = zuzycie.exec(text)) !== null) {
    const window = text.slice(Math.max(0, m.index - 24), m.index + (m[0]?.length || 0) + 12);
    if (softDeny.test(window)) continue;
    const qty = Number(String(m[1] || "").replace(",", "."));
    const unit = String(m[2] || "").replace("²", "2").replace("³", "3").toLowerCase();
    if (!Number.isFinite(qty) || qty < 0) continue;
    // Need nearby material noun
    const before = text.slice(Math.max(0, m.index - 80), m.index);
    const nameMatch = before.match(
      /([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż][A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż0-9\s\-]{2,40})\s*$/,
    );
    const namePl = (nameMatch?.[1] || "material").trim().replace(/\s+/g, " ");
    if (/typowe|zwykle|ok/.test(namePl.toLowerCase())) continue;
    const norm = normalizeMaterialIdentity({
      rawText: namePl,
      unit,
      quantity: qty,
      source: input.sourceRef,
      provenance: input.sourceRef,
      contextText: window,
    });
    if (norm.status !== "ACCEPTED") continue;
    hits.push({
      materialKey: norm.materialKey || `mat.zuzycie.${namePl.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 48)}`,
      namePl: norm.normalizedName,
      unit,
      qtyFactor: qty,
      sourceRef: input.sourceRef,
      evidenceRefs: [input.sourceRef],
      tier: input.tier || "PUBLIC_BOQ_KOSZTORYS",
    });
  }

  return hits;
}

function detectTechnologySteps(sectionText: string): boolean {
  return /technolog|etap|warstw|monta[zż]|uk[lł]adan|przygotowan|gruntowan|klejen/i.test(
    sectionText,
  );
}

type RankedSource = {
  sourceId: string;
  url: string;
  origin: AthedDocumentProbe["origin"];
  score: number;
  reasons: string[];
};

function listRankedSources(input: RunAthedInput): RankedSource[] {
  const code = String(input.knrCode || "").trim();
  const tokens = softTokens(input.description);
  const out: RankedSource[] = [];
  const seen = new Set<string>();

  const push = (
    sourceId: string,
    url: string,
    origin: AthedDocumentProbe["origin"],
    base: number,
    reasons: string[],
  ) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    let score = base;
    const rs = [...reasons];
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (isKnrDiscoveryHostnameAllowlisted(host)) {
        score += 25;
        rs.push("ALLOWLIST_HOST");
      } else if (isPublicInstitutionHost(host)) {
        score += 15;
        rs.push("PUBLIC_HOST");
      }
    } catch {
      return;
    }
    out.push({ sourceId, url, origin, score, reasons: rs });
  };

  if (input.sourceUrlsOverride?.length) {
    for (const e of input.sourceUrlsOverride) {
      push(e.sourceId, e.url, "LEARNED_PUBLIC", 100, ["OVERRIDE"]);
    }
    return out.sort((a, b) => b.score - a.score || a.sourceId.localeCompare(b.sourceId));
  }

  for (const e of PUBLIC_KNR_SOURCE_REGISTRY.filter((x) => x.active)) {
    const reasons: string[] = ["REGISTRY"];
    let score = 40 + (e.priority || 0) / 10;
    if (code && e.tableCodeHints?.includes(code)) {
      score += 50;
      reasons.push("TABLE_CODE_HINT");
    }
    if (tokens.some((t) => e.keywordHints?.some((k) => k.toLowerCase().includes(t)))) {
      score += 20;
      reasons.push("KEYWORD");
    }
    push(e.sourceId, e.url, "REGISTRY", score, reasons);
  }

  for (const e of buildPublicKnrEffectiveAllowlist()) {
    if (!e.active) continue;
    push(e.sourceId, e.url, "ALLOWLIST", 55, ["ALLOWLIST"]);
  }
  for (const e of KNR_DISCOVERY_HTTP_ALLOWLIST.filter((x) => x.active)) {
    push(e.sourceId, e.url, "ALLOWLIST", 50, ["ALLOWLIST_BASE"]);
  }

  for (const e of input.knownPublicSourceUrls || []) {
    const reasons = ["LEARNED_PUBLIC"];
    let score = 70;
    if (code && e.url.includes(code.replace("-", ""))) {
      score += 10;
      reasons.push("URL_CODE_HINT");
    }
    push(e.sourceId, e.url, "LEARNED_PUBLIC", score, reasons);
  }

  return out.sort((a, b) => b.score - a.score || a.sourceId.localeCompare(b.sourceId));
}

/**
 * Probe legal documents for HARD technology/BOM evidence (async).
 */
export async function runAutonomousTechnologyHardEvidenceDiscovery(
  input: RunAthedInput,
): Promise<RunAthedResult> {
  const workId = String(input.workId || "").trim();
  const nowIso = input.nowIso;
  const maxProbes = input.maxProbes ?? 8;
  const fetchImpl = input.fetchImpl ?? defaultFetch;
  const searchStrategies = buildTechnologySearchStrategies({
    workId,
    description: input.description,
    unit: input.unit,
    knrFamily: input.knrFamily,
    knrCode: input.knrCode,
  });

  for (const q of searchStrategies.slice(0, 4)) {
    const qKey = q.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 36);
    upsertTechnologyEvidenceKnowledge({
      id: `tek:athed:search:${workId}:${qKey}`,
      kind: "SEARCH_STRATEGY",
      workId,
      technologyIdentity: null,
      sourceUrl: null,
      sourceId: "athed-v1",
      applicability: "technology_hard_evidence_search",
      evidenceRefs: [],
      validationState: "STATUS_ONLY",
      provenance: "athed:search",
      freshnessIso: nowIso,
      searchStrategy: q,
      payload: { query: q, documentType: null },
      invent: false,
    });
  }

  const rankedAll = listRankedSources(input);
  const ranked = rankedAll.slice(0, maxProbes);
  const ladderExhausted = ranked.length >= rankedAll.length && rankedAll.length > 0;
  const probes: AthedDocumentProbe[] = [];
  const hardAll: AtssHardMaterialHit[] = [];

  for (const src of ranked) {
    const ssrf = assertKnrDiscoveryUrlSafeForFetch(src.url);
    let hostname = "";
    try {
      hostname = new URL(src.url).hostname.toLowerCase();
    } catch {
      probes.push({
        sourceId: src.sourceId,
        sourceUrl: src.url,
        origin: src.origin,
        rankingScore: src.score,
        rankingReasons: src.reasons,
        legalAccess: false,
        ssrfOk: false,
        allowlistedHost: false,
        httpStatus: null,
        fetchOk: false,
        documentType: null,
        extractable: false,
        textLength: 0,
        relevant: false,
        relevanceReason: null,
        softEvidence: false,
        hardEvidence: false,
        materialHits: 0,
        quantityHits: 0,
        technologyStepsFound: false,
        status: "BLOCKED",
        excerpt: null,
        hardMaterials: [],
        detail: "INVALID_URL",
      });
      continue;
    }

    const allowlistedHost = isKnrDiscoveryHostnameAllowlisted(hostname);
    const publicHost = isPublicInstitutionHost(hostname);
    const legalAccess = ssrf.ok && (allowlistedHost || publicHost);

    if (!ssrf.ok || !legalAccess) {
      probes.push({
        sourceId: src.sourceId,
        sourceUrl: src.url,
        origin: src.origin,
        rankingScore: src.score,
        rankingReasons: src.reasons,
        legalAccess: false,
        ssrfOk: ssrf.ok,
        allowlistedHost,
        httpStatus: null,
        fetchOk: false,
        documentType: null,
        extractable: false,
        textLength: 0,
        relevant: false,
        relevanceReason: null,
        softEvidence: false,
        hardEvidence: false,
        materialHits: 0,
        quantityHits: 0,
        technologyStepsFound: false,
        status: "BLOCKED",
        excerpt: null,
        hardMaterials: [],
        detail: !ssrf.ok
          ? `SSRF_OR_URL:${"reason" in ssrf ? ssrf.reason : "DENY"}`
          : "HOST_NOT_PUBLIC_LEGAL",
      });
      continue;
    }

    if (input.disableFetch) {
      probes.push({
        sourceId: src.sourceId,
        sourceUrl: src.url,
        origin: src.origin,
        rankingScore: src.score,
        rankingReasons: src.reasons,
        legalAccess: true,
        ssrfOk: true,
        allowlistedHost,
        httpStatus: null,
        fetchOk: false,
        documentType: null,
        extractable: false,
        textLength: 0,
        relevant: false,
        relevanceReason: null,
        softEvidence: false,
        hardEvidence: false,
        materialHits: 0,
        quantityHits: 0,
        technologyStepsFound: false,
        status: "AVAILABLE",
        excerpt: null,
        hardMaterials: [],
        detail: "FETCH_DISABLED",
      });
      continue;
    }

    let httpStatus: number | null = null;
    let fetchOk = false;
    let bytes: Uint8Array = new Uint8Array();
    let contentType = "";
    try {
      const res = await fetchImpl(src.url);
      httpStatus = res.status;
      fetchOk = res.ok;
      bytes = res.bytes;
      contentType = res.contentType;
    } catch (e) {
      probes.push({
        sourceId: src.sourceId,
        sourceUrl: src.url,
        origin: src.origin,
        rankingScore: src.score,
        rankingReasons: src.reasons,
        legalAccess: true,
        ssrfOk: true,
        allowlistedHost,
        httpStatus: null,
        fetchOk: false,
        documentType: null,
        extractable: false,
        textLength: 0,
        relevant: false,
        relevanceReason: null,
        softEvidence: false,
        hardEvidence: false,
        materialHits: 0,
        quantityHits: 0,
        technologyStepsFound: false,
        status: "FETCH_FAILED",
        excerpt: null,
        hardMaterials: [],
        detail: e instanceof Error ? e.message : "FETCH_ERROR",
      });
      continue;
    }

    if (!fetchOk) {
      probes.push({
        sourceId: src.sourceId,
        sourceUrl: src.url,
        origin: src.origin,
        rankingScore: src.score,
        rankingReasons: src.reasons,
        legalAccess: true,
        ssrfOk: true,
        allowlistedHost,
        httpStatus,
        fetchOk: false,
        documentType: null,
        extractable: false,
        textLength: 0,
        relevant: false,
        relevanceReason: null,
        softEvidence: false,
        hardEvidence: false,
        materialHits: 0,
        quantityHits: 0,
        technologyStepsFound: false,
        status: "FETCH_FAILED",
        excerpt: null,
        hardMaterials: [],
        detail: `HTTP_${httpStatus}`,
      });
      continue;
    }

    const extracted = await bytesToText(src.url, bytes, contentType);
    const rel = extractRelevantTechnologySections({
      text: extracted.text,
      knrCode: input.knrCode,
      description: input.description,
    });

    const sourceRef = `athed:${src.sourceId}:${src.url}`;
    const sectionText = rel.sections.join("\n---\n") || "";
    const hardFromGeneric = rel.relevant
      ? extractHardBomMaterialsFromPublicText({
          text: sectionText,
          workId,
          knrCode: input.knrCode,
          sourceRef,
          nowIso,
        })
      : [];
    const hardFromNaklad = rel.relevant
      ? extractNakladczeHardMaterials({ sectionText, sourceRef })
      : [];
    const hardMaterials = [...hardFromGeneric, ...hardFromNaklad];
    // MIN: reject BOQ noise; recover from work description when relevant
    const minBatch = normalizeMaterialIdentityBatch({
      lines: hardMaterials.map((h) => ({
        materialKey: h.materialKey,
        namePl: h.namePl,
        unit: h.unit,
        qtyFactor: h.qtyFactor,
        sourceRef: h.sourceRef,
        evidenceRefs: h.evidenceRefs,
      })),
      workDescription: input.description,
    });
    let uniqueHard: AtssHardMaterialHit[] = minBatch.accepted.map((a) => ({
      materialKey: a.materialKey || `mat.min.${a.normalizedName}`,
      namePl: a.normalizedName,
      unit: a.unit || input.unit,
      qtyFactor: a.quantity ?? 1,
      sourceRef: a.source,
      evidenceRefs: [a.provenance],
      tier: "PUBLIC_BOQ_KOSZTORYS" as AtssSourceTier,
    }));

    /**
     * Prefer / ensure primary structural material from work description.
     * Do NOT leave TechnologyPack with only binder (zaprawa) when description
     * explicitly names cegły/silikat — that breaks AUT-MAT identity linkage.
     * qtyFactor=1 only as existing work-unit parity (same unit as work), never
     * invented piece consumption.
     */
    const hasStructural = uniqueHard.some(
      (h) => scoreMaterialNounPriority(h.namePl) >= 100,
    );
    const onlyBinders =
      uniqueHard.length > 0
      && uniqueHard.every((h) => isSecondaryBinderMaterialName(h.namePl));
    if ((!hasStructural || onlyBinders) && rel.relevant && input.description) {
      const noun = extractMaterialNounFromWorkDescription(input.description);
      if (
        noun
        && (isPrimaryStructuralMaterialName(noun.namePl)
          || scoreMaterialNounPriority(noun.namePl) >= 100)
      ) {
        const recovered = normalizeMaterialIdentity({
          rawText: noun.namePl,
          unit: input.unit,
          quantity: 1,
          source: sourceRef,
          provenance: "work_description_explicit_structural_material",
          extractionLocation: "work_description",
          workDescription: input.description,
        });
        if (recovered.status === "ACCEPTED") {
          const structuralHit: AtssHardMaterialHit = {
            materialKey: recovered.materialKey || `mat.min.${noun.namePl}`,
            namePl: recovered.normalizedName,
            unit: input.unit,
            qtyFactor: 1,
            sourceRef: recovered.provenance,
            evidenceRefs: [sourceRef, recovered.provenance, ...noun.rationale],
            tier: "PUBLIC_BOQ_KOSZTORYS",
          };
          if (onlyBinders) {
            // Replace mis-recovered binder-only pack materials with structural
            uniqueHard = [structuralHit];
          } else if (!hasStructural) {
            uniqueHard = [structuralHit, ...uniqueHard];
          }
        }
      }
    } else if (uniqueHard.length === 0 && rel.relevant && input.description) {
      const noun = extractMaterialNounFromWorkDescription(input.description);
      if (noun && isLikelyConstructionMaterialName(noun.namePl)) {
        const recovered = normalizeMaterialIdentity({
          rawText: noun.namePl,
          unit: input.unit,
          quantity: 1,
          source: sourceRef,
          provenance: "work_description_explicit_material",
          extractionLocation: "work_description",
          workDescription: input.description,
        });
        if (recovered.status === "ACCEPTED") {
          uniqueHard = [
            {
              materialKey: recovered.materialKey || `mat.min.${noun.namePl}`,
              namePl: recovered.normalizedName,
              unit: input.unit,
              qtyFactor: 1,
              sourceRef: recovered.provenance,
              evidenceRefs: [sourceRef, recovered.provenance],
              tier: "PUBLIC_BOQ_KOSZTORYS",
            },
          ];
        }
      }
    }
    const steps = rel.relevant && detectTechnologySteps(sectionText);
    const softEvidence = rel.relevant && uniqueHard.length === 0;
    const hardEvidence = uniqueHard.length > 0;

    let status: AthedProviderStatus = "FETCHED";
    if (!extracted.extractable) status = "FETCHED";
    else if (!rel.relevant) status = "EXTRACTABLE";
    else if (hardEvidence) status = "HARD_EVIDENCE";
    else if (softEvidence) status = "SOFT_ONLY";
    else status = "RELEVANT";

    if (hardEvidence) {
      hardAll.push(...uniqueHard);
      upsertTechnologyEvidenceKnowledge({
        id: `tek:athed:extract:${workId}:${src.sourceId}`,
        kind: "SOURCE",
        workId,
        technologyIdentity: null,
        sourceUrl: src.url,
        sourceId: src.sourceId,
        applicability: `hard_bom_extract:${workId}`,
        evidenceRefs: [sourceRef],
        validationState: "VALIDATED",
        provenance: sourceRef,
        freshnessIso: nowIso,
        searchStrategy: null,
        payload: {
          documentType: extracted.documentType,
          extractionStrategy: "relevant_window+nakladcze+MIN-v1.1+work_desc_recovery",
          evidenceType: "HARD_BOM_MATERIALS",
          materialCount: uniqueHard.length,
          rejectedNoise: minBatch.rejected.length,
        },
        invent: false,
      });
      upsertTechnologyEvidenceKnowledge({
        id: `tek:min:strategy:mline`,
        kind: "SEARCH_STRATEGY",
        workId,
        technologyIdentity: null,
        sourceUrl: null,
        sourceId: "min-v1",
        applicability: "material_identity_normalization",
        evidenceRefs: [],
        validationState: "STATUS_ONLY",
        provenance: "min-v1",
        freshnessIso: nowIso,
        searchStrategy:
          "nakladcze precursor OR work_description_z_phrase; reject room/geometry/operation tokens",
        payload: {
          strategy: "MIN-v1.1",
          noiseReject: minBatch.rejected.map((r) => r.rejectReasons).flat(),
        },
        invent: false,
      });
    } else if (softEvidence) {
      upsertTechnologyEvidenceKnowledge({
        id: `tek:athed:soft:${workId}:${src.sourceId}`,
        kind: "SOURCE",
        workId,
        technologyIdentity: null,
        sourceUrl: src.url,
        sourceId: src.sourceId,
        applicability: `soft_mention:${workId}`,
        evidenceRefs: [sourceRef],
        validationState: "UNVERIFIED",
        provenance: sourceRef,
        freshnessIso: nowIso,
        searchStrategy: null,
        payload: {
          documentType: extracted.documentType,
          evidenceType: "SOFT_ONLY",
          relevanceReason: rel.reason,
        },
        invent: false,
      });
    }

    probes.push({
      sourceId: src.sourceId,
      sourceUrl: src.url,
      origin: src.origin,
      rankingScore: src.score,
      rankingReasons: src.reasons,
      legalAccess: true,
      ssrfOk: true,
      allowlistedHost,
      httpStatus,
      fetchOk: true,
      documentType: extracted.documentType,
      extractable: extracted.extractable,
      textLength: extracted.text.replace(/\s+/g, "").length,
      relevant: rel.relevant,
      relevanceReason: rel.reason,
      softEvidence,
      hardEvidence,
      materialHits: uniqueHard.length,
      quantityHits: uniqueHard.length,
      technologyStepsFound: Boolean(steps),
      status,
      excerpt: sectionText ? sectionText.slice(0, 240) : null,
      hardMaterials: uniqueHard,
      detail: null,
    });
  }

  const hardDedup = new Map<string, AtssHardMaterialHit>();
  for (const h of hardAll) {
    if (!hardDedup.has(h.materialKey)) hardDedup.set(h.materialKey, h);
  }
  const hardMaterials = [...hardDedup.values()];

  const totals = {
    sourcesDiscovered: rankedAll.length,
    sourcesProbed: ranked.length,
    fetchable: probes.filter((p) => p.legalAccess && p.ssrfOk).length,
    fetchedOk: probes.filter((p) => p.fetchOk).length,
    extractable: probes.filter((p) => p.extractable).length,
    relevant: probes.filter((p) => p.relevant).length,
    softOnly: probes.filter((p) => p.softEvidence && !p.hardEvidence).length,
    hardEvidence: probes.filter((p) => p.hardEvidence).length,
    blocked: probes.filter((p) => p.status === "BLOCKED").length,
    fetchFailed: probes.filter((p) => p.status === "FETCH_FAILED").length,
  };

  const evidenceClass: RunAthedResult["evidenceClass"] =
    hardMaterials.length > 0
      ? "HARD_EVIDENCE"
      : totals.softOnly > 0
        ? "SOFT_ONLY"
        : "NO_EVIDENCE";

  const nextLegal: RunAthedResult["nextLegal"] =
    evidenceClass === "HARD_EVIDENCE"
      ? "HARD_EVIDENCE_READY"
      : !ladderExhausted && evidenceClass === "SOFT_ONLY"
        ? "SOFT_ONLY_CONTINUE_PROVIDERS"
      : ladderExhausted && evidenceClass !== "HARD_EVIDENCE"
        ? "TECHNOLOGY_EVIDENCE_GAP_EXHAUSTED"
        : evidenceClass === "SOFT_ONLY"
          ? "SOFT_ONLY_CONTINUE_PROVIDERS"
          : "AUTONOMOUS_RESOLUTION_QUEUE · TECHNOLOGY_EVIDENCE_GAP";

  return {
    version: AUTONOMOUS_TECHNOLOGY_HARD_EVIDENCE_VERSION,
    workId,
    searchStrategies,
    probes,
    totals,
    hardMaterials,
    evidenceClass,
    nextLegal,
    ladderExhausted,
    ownerRuntimeDependency: 0,
  };
}
