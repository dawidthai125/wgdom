/**
 * INGEST-01 — bridge ingest artifacts → dossier scanSummary (documentId).
 * Does NOT change BEST_SINGLE semantics of dossier.kosztorys.
 *
 * DESIGN-C: registry (`kw-tender-ingest-v1`) is authoritative FULL source.
 * Bridge must not downgrade usable pipeline FULL with weaker registry/shell/sentinel.
 */

import type { CostBranchArtifact } from "@/lib/cost-multi-02-types";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";
import { getIngestState } from "@/lib/tender-ingest/registry";
import { inferBranchHint } from "@/lib/cost-multi-01-classify";

/**
 * Usable FULL snapshot — aligned with mergeArtifactPair / readCostBranchArtifacts.
 * ok === true (registry FULL / pool) OR non-empty rows (merge preserve).
 */
export function isUsableCostArtifactSnapshot(
  snapshot: TenderKosztorysSnapshot | null | undefined,
): boolean {
  if (!snapshot) return false;
  if (snapshot.ok === true) return true;
  if ((snapshot.rows?.length ?? 0) > 0) return true;
  if ((snapshot.catalogQuantities?.length ?? 0) > 0) return true;
  return false;
}

function artifactKey(a: Pick<CostBranchArtifact, "documentId" | "filename">): string {
  return String(a.documentId ?? "").trim() || String(a.filename ?? "").trim();
}

function countUsableArtifacts(item: TenderPipelineItem | null | undefined): number {
  const arts =
    item?.tenderDossier?.scanSummary?.costBranchArtifacts
    ?? item?.tenderDossier?.scanSummary?.branchWinnerArtifacts
    ?? [];
  return arts.filter((a) => isUsableCostArtifactSnapshot(a?.snapshot)).length;
}

/**
 * Prefer usable FULL over sentinel/shell/weak.
 * Both usable → keep previous (no churn / no downgrade).
 */
export function preferCostBranchArtifact(
  prev: CostBranchArtifact | undefined,
  next: CostBranchArtifact,
): CostBranchArtifact {
  if (!prev) return next;
  const prevOk = isUsableCostArtifactSnapshot(prev.snapshot);
  const nextOk = isUsableCostArtifactSnapshot(next.snapshot);
  if (prevOk && !nextOk) return prev;
  if (!prevOk && nextOk) return next;
  if (prevOk && nextOk) return prev;
  // both weak — allow registry/next to fill shell metadata
  return next;
}

/** Merge owner-ingest artifacts into item.tenderDossier.scanSummary (additive). */
export function applyIngestArtifactsToPipelineItem(
  item: TenderPipelineItem,
): Partial<TenderPipelineItem> {
  const state = getIngestState(item.id) ?? (item.tenderId ? getIngestState(item.tenderId) : null);
  if (!state || state.artifacts.length === 0) return {};

  const fromIngest: CostBranchArtifact[] = state.artifacts.map((a) => ({
    filename: a.filename,
    documentId: a.documentId,
    branch: a.branch ?? inferBranchHint(a.filename),
    snapshot: a.snapshot,
  }));

  const prev =
    item.tenderDossier?.scanSummary?.branchWinnerArtifacts
    ?? item.tenderDossier?.scanSummary?.costBranchArtifacts
    ?? [];

  const byKey = new Map<string, CostBranchArtifact>();
  for (const a of prev) {
    const k = artifactKey(a);
    if (k) byKey.set(k, a);
  }
  for (const a of fromIngest) {
    const k = artifactKey(a);
    if (!k) continue;
    byKey.set(k, preferCostBranchArtifact(byKey.get(k), a));
  }
  const merged = [...byKey.values()];

  const now = new Date().toISOString();
  const dossier = item.tenderDossier
    ? {
        ...item.tenderDossier,
        scanSummary: {
          ...(item.tenderDossier.scanSummary ?? {
            scannedAt: now,
            documentCount: 0,
            parsedCount: 0,
            warnings: [] as string[],
          }),
          branchWinnerArtifacts: merged,
          costBranchArtifacts: merged,
        },
      }
    : {
        brief: {
          title: item.title,
          organizationName: item.organizationName,
          organizationCity: item.organizationCity,
          bzpNumber: item.bzpNumber,
          noticeNumber: item.noticeNumber,
          publicationDate: item.publicationDate,
          submittingOffersDate: item.submittingOffersDate,
          cpvCode: item.cpvCode,
          orderType: item.orderType,
        },
        kosztorys: null,
        builtAt: now,
        scanSummary: {
          scannedAt: now,
          documentCount: state.documents.length,
          parsedCount: merged.length,
          warnings: state.warnings.slice(0, 20),
          branchWinnerArtifacts: merged,
          costBranchArtifacts: merged,
        },
      };

  return { tenderDossier: dossier as TenderPipelineItem["tenderDossier"] };
}

/**
 * DESIGN-C hydrate — bridge registry FULL into pipeline after cold+cloud merge.
 * No Owner Ingest / no PDF parse / no cloud write.
 */
export function hydratePipelineItemsFromIngestRegistry(
  items: TenderPipelineItem[],
): { items: TenderPipelineItem[]; hydratedCount: number } {
  if (!Array.isArray(items) || items.length === 0) {
    return { items: items ?? [], hydratedCount: 0 };
  }

  let hydratedCount = 0;
  const next = items.map((item) => {
    const state =
      getIngestState(item.id)
      ?? (item.tenderId ? getIngestState(item.tenderId) : null);
    if (!state?.artifacts?.length) return item;
    if (!state.artifacts.some((a) => isUsableCostArtifactSnapshot(a.snapshot))) {
      return item;
    }

    const beforeUsable = countUsableArtifacts(item);
    const patch = applyIngestArtifactsToPipelineItem(item);
    if (!patch.tenderDossier) return item;

    const patched: TenderPipelineItem = { ...item, ...patch };
    const afterUsable = countUsableArtifacts(patched);
    // Only persist when usable FULL coverage improves (never downgrade / no churn).
    if (afterUsable > beforeUsable) {
      hydratedCount += 1;
      return patched;
    }
    return item;
  });

  return { items: next, hydratedCount };
}
