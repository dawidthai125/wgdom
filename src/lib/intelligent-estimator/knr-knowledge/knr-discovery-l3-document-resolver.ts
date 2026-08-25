/**
 * IK-KNR Phase 2 — L3 document resolution (Owner-approved sourceId → document URL).
 *
 * Fail-closed: NEVER accepts client rawUrl.
 * URL comes ONLY from allowlist entry bound to sourceId.
 * No portal crawl · no web search · no ezamowienia harvest.
 *
 * Production allowlist EMPTY → every resolve fails closed.
 */

import {
  resolveKnrDiscoveryAllowlistSource,
  type KnrDiscoveryAllowlistEntry,
} from "./knr-discovery-allowlist";

/** Legal origins eligible for L3 official public document discovery. */
export const KNR_DISCOVERY_L3_ORIGIN_IDS = Object.freeze([
  "knr_official_public_document",
  "knr_government_public",
  "knr_university_public",
] as const);

export type KnrDiscoveryL3DocumentResolveOk = {
  ok: true;
  sourceId: string;
  url: string;
  hostname: string;
  originId: string;
  priority: KnrDiscoveryAllowlistEntry["priority"];
};

export type KnrDiscoveryL3DocumentResolveFail = {
  ok: false;
  reason:
    | "DISCOVERY_SOURCE_DOCUMENT_NOT_RESOLVED"
    | "UNKNOWN_SOURCE"
    | "SOURCE_INACTIVE"
    | "INVALID_URL"
    | "HOST_MISMATCH"
    | "ORIGIN_NOT_L3_COMPATIBLE"
    | "EMPTY_SOURCE_IDS";
  sourceId: string | null;
};

export type KnrDiscoveryL3DocumentResolveResult =
  | KnrDiscoveryL3DocumentResolveOk
  | KnrDiscoveryL3DocumentResolveFail;

function isL3CompatibleOrigin(originId: string): boolean {
  return (KNR_DISCOVERY_L3_ORIGIN_IDS as readonly string[]).includes(originId);
}

/**
 * Resolve one sourceId to a single HTTPS document URL via allowlist SSOT.
 * Does not fetch. Does not invent URLs.
 */
export function resolveKnrDiscoveryL3Document(
  sourceId: string,
  allowlistOverride?: readonly KnrDiscoveryAllowlistEntry[] | null,
): KnrDiscoveryL3DocumentResolveResult {
  const id = String(sourceId ?? "").trim();
  if (!id) {
    return {
      ok: false,
      reason: "EMPTY_SOURCE_IDS",
      sourceId: null,
    };
  }

  const resolved = resolveKnrDiscoveryAllowlistSource(id, allowlistOverride);
  if (!resolved.ok) {
    return {
      ok: false,
      reason:
        resolved.reason === "UNKNOWN_SOURCE"
          ? "DISCOVERY_SOURCE_DOCUMENT_NOT_RESOLVED"
          : resolved.reason,
      sourceId: id,
    };
  }

  if (!isL3CompatibleOrigin(resolved.entry.originId)) {
    return {
      ok: false,
      reason: "ORIGIN_NOT_L3_COMPATIBLE",
      sourceId: id,
    };
  }

  return {
    ok: true,
    sourceId: id,
    url: resolved.entry.url,
    hostname: resolved.entry.hostname,
    originId: resolved.entry.originId,
    priority: resolved.entry.priority,
  };
}

/**
 * Resolve selected sourceIds to documents. First successful wins (deterministic order).
 * All fail → DISCOVERY_SOURCE_DOCUMENT_NOT_RESOLVED (HTTP must stay 0).
 */
export function resolveKnrDiscoveryL3DocumentsForSources(
  sourceIds: readonly string[],
  allowlistOverride?: readonly KnrDiscoveryAllowlistEntry[] | null,
):
  | { ok: true; documents: KnrDiscoveryL3DocumentResolveOk[]; unresolved: string[] }
  | {
      ok: false;
      reason: "DISCOVERY_SOURCE_DOCUMENT_NOT_RESOLVED" | "EMPTY_SOURCE_IDS";
      unresolved: string[];
    } {
  const ids = sourceIds.map((s) => String(s ?? "").trim()).filter(Boolean);
  if (!ids.length) {
    return { ok: false, reason: "EMPTY_SOURCE_IDS", unresolved: [] };
  }

  const documents: KnrDiscoveryL3DocumentResolveOk[] = [];
  const unresolved: string[] = [];
  for (const id of ids) {
    const row = resolveKnrDiscoveryL3Document(id, allowlistOverride);
    if (row.ok) documents.push(row);
    else unresolved.push(id);
  }

  if (!documents.length) {
    return {
      ok: false,
      reason: "DISCOVERY_SOURCE_DOCUMENT_NOT_RESOLVED",
      unresolved,
    };
  }

  return { ok: true, documents, unresolved };
}

/**
 * TEST-ONLY L3 BOQ document fixture — NEVER merge into production allowlist.
 * originId = knr_official_public_document (legal-compatible for HTTP gate).
 */
export const KNR_DISCOVERY_L3_DOCUMENT_TEST_FIXTURE: readonly KnrDiscoveryAllowlistEntry[] =
  Object.freeze([
    {
      sourceId: "p2_l3_boq_doc_fixture",
      hostname: "example.com",
      url: "https://example.com/l3-boq/knr-4-01-1202-07-fixture.html",
      originId: "knr_official_public_document",
      active: true,
      priority: "OFFICIAL_PUBLIC_DOCUMENT",
    },
  ]);

/** Deterministic fake HTML body for L3 BOQ learning-loop tests. */
export function buildFakeL3BoqDocumentHtml(opts?: {
  knrCode?: string;
  description?: string;
  unit?: string;
}): string {
  const knrCode = opts?.knrCode ?? "KNR 4-01 1202-07";
  const description = opts?.description ?? "Skucie tynków zewnętrznych";
  const unit = opts?.unit ?? "m2";
  return (
    `<html><body>`
    + `<table><tr><td>${knrCode}</td>`
    + `<td>opis: ${description}</td>`
    + `<td>${unit}</td></tr></table>`
    + ` enough text for min length gate xxxxxxxxxx`
    + `</body></html>`
  );
}

/**
 * TEST-ONLY L3 PDF document fixture — NEVER merge into production allowlist.
 * Controlled activation requires separate Owner GO + FEATURE.
 */
export const KNR_DISCOVERY_L3_PDF_DOCUMENT_TEST_FIXTURE: readonly KnrDiscoveryAllowlistEntry[] =
  Object.freeze([
    {
      sourceId: "p2_l3_pdf_doc_fixture",
      hostname: "example.com",
      url: "https://example.com/l3-boq/knr-4-01-fixture.pdf",
      originId: "knr_official_public_document",
      active: true,
      priority: "OFFICIAL_PUBLIC_DOCUMENT",
    },
  ]);

/** Deterministic multi-KNR PDF body text for learning-loop / shared-fetch tests. */
export function buildFakeL3BoqDocumentPdfText(opts?: {
  rows?: ReadonlyArray<{ knrCode: string; description: string; unit: string }>;
}): string {
  const rows = opts?.rows ?? [
    {
      knrCode: "KNR 4-01 0354-07",
      description: "Wykucie z muru oscieznicy stalowych drzwi",
      unit: "szt.",
    },
    {
      knrCode: "KNR-W 4-01 0701-05",
      description: "Odbicie tynkow wewnetrznych z zaprawy cementowej",
      unit: "m2",
    },
    {
      knrCode: "KNR 4-01 1202/08",
      description: "Zeskrobanie i zmycie starej farby",
      unit: "m2",
    },
  ];
  const lines = rows.map((r) => `${r.knrCode} ${r.description} ${r.unit}`);
  return (
    "PRZEDMIAR ROBOT L3 PDF FIXTURE\n"
    + lines.join("\n")
    + "\n enough text for min length gate xxxxxxxxxx"
  );
}

export const KNR_DISCOVERY_L3_DOCUMENT_RESOLVER_P2_IMPLEMENTED = true as const;
