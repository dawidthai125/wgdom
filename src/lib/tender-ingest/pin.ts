/**
 * INGEST-01 — OCDS / BZP pin → TenderPipelineItem (additive; no PL02 change).
 * Intentionally avoids value-imports from tenders-bzp (cycle with re-exports).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { ImportTenderRequest } from "@/lib/tender-ingest/types";
import { ensureIngestStateForPin } from "@/lib/tender-ingest/registry";

function foldId(s: string): string {
  return String(s ?? "").trim().toLowerCase();
}

function tenderEzamowieniaUrlLocal(tenderId: string): string {
  if (!tenderId) return "https://ezamowienia.gov.pl/mo-client-board/";
  return `https://ezamowienia.gov.pl/mp-client/search/list/${encodeURIComponent(tenderId)}`;
}

/** Stable pipeline item id — never from filename/ZIP/AI. */
export function resolvePinnedTenderItemId(req: ImportTenderRequest): string {
  const ocds = String(req.ocdsId ?? "").trim();
  if (ocds) return ocds;
  const bzp = String(req.bzpNumber ?? "").trim();
  if (bzp) return `bzp:${bzp}`;
  throw new Error("IMPORT_REQUIRES_OCDS_OR_BZP");
}

export function buildPinnedPipelineItem(
  req: ImportTenderRequest,
  existing?: TenderPipelineItem,
): TenderPipelineItem {
  const title = String(req.title ?? "").trim();
  const organizationName = String(req.organizationName ?? "").trim();
  if (!title || !organizationName) throw new Error("IMPORT_REQUIRES_TITLE_AND_AUTHORITY");
  if (req.ingestMode !== "owner_requested" && req.ingestMode !== "fixture_pin") {
    throw new Error("IMPORT_INVALID_INGEST_MODE");
  }
  if (req.retention !== "normal" && req.retention !== "pinned") {
    throw new Error("IMPORT_INVALID_RETENTION");
  }

  const id = resolvePinnedTenderItemId(req);
  const ocds = String(req.ocdsId ?? "").trim();
  const bzpNumber = String(req.bzpNumber ?? "").trim();
  const now = new Date().toISOString();
  const city = String(req.organizationCity ?? existing?.organizationCity ?? "").trim();
  const retention: TenderPipelineItem["retention"] =
    req.retention === "pinned" || req.ingestMode === "fixture_pin" ? "pinned" : req.retention;

  const item: TenderPipelineItem = {
    id,
    bzpNumber: bzpNumber || existing?.bzpNumber || "",
    noticeNumber: existing?.noticeNumber || "",
    title,
    organizationName,
    organizationCity: city,
    organizationProvince: existing?.organizationProvince || "",
    cpvCode: existing?.cpvCode || "",
    publicationDate: existing?.publicationDate || now.slice(0, 10),
    submittingOffersDate: existing?.submittingOffersDate ?? null,
    orderType: existing?.orderType || "Works",
    tenderId: ocds || existing?.tenderId || id,
    moIdentifier: existing?.moIdentifier || "",
    status: existing?.status && existing.status !== "new" ? existing.status : "seen",
    notes: existing?.notes || "",
    relevanceScore: existing?.relevanceScore ?? 0,
    matchedKeywords: existing?.matchedKeywords ?? [],
    isWroclaw: existing?.isWroclaw ?? false,
    priorityBuyerId: existing?.priorityBuyerId ?? null,
    priorityBuyerLabel: existing?.priorityBuyerLabel ?? null,
    addedAt: existing?.addedAt || now,
    updatedAt: now,
    ezamowieniaUrl: ocds
      ? tenderEzamowieniaUrlLocal(ocds)
      : existing?.ezamowieniaUrl || tenderEzamowieniaUrlLocal(""),
    bzpDocuments: existing?.bzpDocuments,
    documentsFetchedAt: existing?.documentsFetchedAt ?? null,
    swzAnalysis: existing?.swzAnalysis ?? null,
    uploadedFile: existing?.uploadedFile ?? null,
    ourEstimatePln: existing?.ourEstimatePln ?? null,
    linkedJobId: existing?.linkedJobId ?? null,
    tenderState: existing?.tenderState ?? null,
    noticeHtml: existing?.noticeHtml ?? null,
    noticeHtmlFetchedAt: existing?.noticeHtmlFetchedAt ?? null,
    tenderDossier: existing?.tenderDossier ?? null,
    tenderFit: existing?.tenderFit ?? null,
    externalDocDiscovery: existing?.externalDocDiscovery ?? null,
    estimateHistory: existing?.estimateHistory ?? [],
    awardResult: existing?.awardResult ?? null,
    ocdsId: ocds || existing?.ocdsId,
    ingestMode: req.ingestMode,
    retention,
    sourceUrls: req.sourceUrls?.length ? req.sourceUrls : existing?.sourceUrls,
  };

  ensureIngestStateForPin(item.id, {
    ingestMode: item.ingestMode!,
    retention: item.retention!,
    ocdsId: item.ocdsId,
    bzpNumber: item.bzpNumber || undefined,
    sourceUrls: item.sourceUrls,
  });

  return item;
}

export function isPinnedRetentionItem(
  item: Pick<TenderPipelineItem, "retention" | "ingestMode">,
): boolean {
  return item.retention === "pinned" || item.ingestMode === "fixture_pin";
}

export function mergePinnedIntoPipeline(
  existing: TenderPipelineItem[],
  pinned: TenderPipelineItem,
): TenderPipelineItem[] {
  const id = foldId(pinned.id);
  const idx = existing.findIndex((i) => foldId(i.id) === id || foldId(i.tenderId) === id);
  if (idx < 0) return [...existing, pinned];
  const prev = existing[idx]!;
  const next = [...existing];
  next[idx] = {
    ...pinned,
    status: prev.status === "new" ? pinned.status : prev.status,
    notes: prev.notes || pinned.notes,
    addedAt: prev.addedAt,
    bzpDocuments: prev.bzpDocuments ?? pinned.bzpDocuments,
    tenderDossier: prev.tenderDossier ?? pinned.tenderDossier,
    uploadedFile: prev.uploadedFile ?? pinned.uploadedFile,
    externalDocDiscovery: prev.externalDocDiscovery ?? pinned.externalDocDiscovery,
  };
  return next;
}
