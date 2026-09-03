/**
 * INGEST-01 — bridge ingest artifacts → dossier scanSummary (documentId).
 * Does NOT change BEST_SINGLE semantics of dossier.kosztorys.
 */

import type { CostBranchArtifact } from "@/lib/cost-multi-02-types";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { getIngestState } from "@/lib/tender-ingest/registry";
import { inferBranchHint } from "@/lib/cost-multi-01-classify";

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
    const k = a.documentId || a.filename;
    byKey.set(k, a);
  }
  for (const a of fromIngest) {
    byKey.set(a.documentId || a.filename, a);
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
