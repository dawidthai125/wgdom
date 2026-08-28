/**
 * SSOT — bramka discovery dokumentów BZP (variant B root-cause fix).
 * Bez nowych pól KV; bez pełnego state machine.
 */
import type { TenderBzpDocument, TenderPipelineItem } from "@/lib/tenders-bzp";
import { fetchTenderDocuments } from "@/lib/tenders-bzp";

/** Zgodnie z Edge discoverTenderDocuments — off-platform wymaga sensownego HTML. */
export const DOCUMENT_DISCOVERY_HTML_MIN_LEN = 100;

export interface DocumentDiscoveryAnchor {
  noticeNumber?: string;
  noticeHtml?: string;
}

export interface DocumentDiscoveryFetchInput {
  tenderId: string;
  noticeNumber?: string;
  noticeHtml?: string;
}

export interface DocumentDiscoveryResult {
  docs: TenderBzpDocument[];
  /** Patch do merge w item — documentsFetchedAt tylko gdy authoritative. */
  patch: Partial<TenderPipelineItem>;
  /** Wywołano Edge fetch z pełnym anchor. */
  ran: boolean;
  authoritative: boolean;
}

/** noticeNumber lub noticeHtml (≥ min długości) — warunek wejścia discovery. */
export function resolveDocumentDiscoveryAnchor(
  item: Pick<TenderPipelineItem, "noticeNumber" | "noticeHtml" | "bzpNumber">,
): DocumentDiscoveryAnchor {
  const noticeNumber = (item.noticeNumber || item.bzpNumber || "").trim() || undefined;
  const rawHtml = (item.noticeHtml || "").trim();
  const noticeHtml = rawHtml.length >= DOCUMENT_DISCOVERY_HTML_MIN_LEN ? rawHtml : undefined;
  return { noticeNumber, noticeHtml };
}

/**
 * Edge `/tenders-bzp-documents` / mp-readmodels expect ezamówienia **OCDS** tenderId.
 * Pipeline `item.id` is often a distinct UUID that returns 0 documents (Chrobrego MOPS).
 * Prefer `item.tenderId` (OCDS) whenever present and distinct from pipeline id.
 */
export function resolveEzamowieniaDocumentsTenderId(
  item: Pick<TenderPipelineItem, "id" | "tenderId">,
): string | null {
  const ocds = String(item.tenderId ?? "").trim();
  const pipe = String(item.id ?? "").trim();
  if (ocds && ocds !== pipe) return ocds;
  if (ocds) return ocds;
  if (pipe) return pipe;
  return null;
}

export function canRunDocumentDiscovery(
  item: Pick<TenderPipelineItem, "id" | "tenderId" | "noticeNumber" | "noticeHtml" | "bzpNumber">,
): boolean {
  if (!resolveEzamowieniaDocumentsTenderId(item)) return false;
  const anchor = resolveDocumentDiscoveryAnchor(item);
  return Boolean(anchor.noticeNumber || anchor.noticeHtml);
}

/**
 * Discovery zakończone — nie trzeba ponownie wołać Edge (auto-bootstrap).
 * Puste docs + documentsFetchedAt = autorytatywne pusto (po naprawie).
 * Wyjątek: noticeHtml przyszedł po przedwczesnym skanie → retry.
 */
export function isDocumentDiscoverySettled(item: TenderPipelineItem): boolean {
  const docCount = item.bzpDocuments?.length ?? 0;
  if (docCount > 0) return true;
  if (!item.documentsFetchedAt) return false;
  if (item.noticeHtmlFetchedAt) {
    const noticeAt = Date.parse(item.noticeHtmlFetchedAt);
    const fetchedAt = Date.parse(item.documentsFetchedAt);
    if (Number.isFinite(noticeAt) && Number.isFinite(fetchedAt) && noticeAt > fetchedAt) {
      return false;
    }
  }
  return true;
}

export function buildDocumentDiscoveryFetchInput(
  item: Pick<TenderPipelineItem, "id" | "tenderId" | "noticeNumber" | "noticeHtml" | "bzpNumber">,
): DocumentDiscoveryFetchInput | null {
  const apiTenderId = resolveEzamowieniaDocumentsTenderId(item);
  if (!apiTenderId) return null;
  const anchor = resolveDocumentDiscoveryAnchor(item);
  if (!anchor.noticeNumber && !anchor.noticeHtml) return null;
  const input: DocumentDiscoveryFetchInput = {
    tenderId: apiTenderId,
    noticeNumber: anchor.noticeNumber,
  };
  // NG11-P0.2 — noticeHtml tylko gdy brak numeru (GET query); inaczej Edge pobiera HTML server-side.
  if (!anchor.noticeNumber && anchor.noticeHtml) {
    input.noticeHtml = anchor.noticeHtml;
  }
  return input;
}

export function shouldMarkDocumentsFetchedAt(authoritative: boolean): boolean {
  return authoritative;
}

type FetchDocumentsFn = (input: DocumentDiscoveryFetchInput) => Promise<TenderBzpDocument[]>;

/**
 * Jedna ścieżka discovery: bootstrap · manual refresh · change-monitor rescan.
 */
export async function runTenderDocumentDiscovery(
  item: TenderPipelineItem,
  opts?: {
    force?: boolean;
    fetchDocuments?: FetchDocumentsFn;
  },
): Promise<DocumentDiscoveryResult> {
  const existing = item.bzpDocuments ?? [];
  const fetchDocuments = opts?.fetchDocuments ?? fetchTenderDocuments;

  if (!opts?.force && isDocumentDiscoverySettled(item)) {
    return { docs: existing, patch: {}, ran: false, authoritative: false };
  }

  const input = buildDocumentDiscoveryFetchInput(item);
  if (!input) {
    return { docs: existing, patch: {}, ran: false, authoritative: false };
  }

  const docs = await fetchDocuments(input);
  const patch: Partial<TenderPipelineItem> = { bzpDocuments: docs };
  if (shouldMarkDocumentsFetchedAt(true)) {
    patch.documentsFetchedAt = new Date().toISOString();
  }
  return { docs, patch, ran: true, authoritative: true };
}

/** Klucz do deps hooka — re-run gdy pojawi się anchor. */
export function documentDiscoveryBootstrapKey(
  item: Pick<TenderPipelineItem, "id" | "tenderId" | "noticeNumber" | "noticeHtml" | "bzpNumber" | "noticeHtmlFetchedAt">,
): string {
  const anchor = resolveDocumentDiscoveryAnchor(item);
  return [
    item.id,
    item.tenderId ?? "",
    anchor.noticeNumber ?? "",
    anchor.noticeHtml ? String(anchor.noticeHtml.length) : "",
    item.noticeHtmlFetchedAt ?? "",
  ].join("|");
}
