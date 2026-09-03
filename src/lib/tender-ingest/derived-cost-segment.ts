/**
 * OD-OCR-15 C2 — Intra-PDF derived cost documents (CONNECT only).
 * Logical BOQ = derived TenderIngestDocument (source=derived_cost_segment).
 * REUSE: sha256Hex, recordIngestArtifact, pdfPrzedmiarHeuristicToPreview, Multi-BOQ.
 * HARD: no LogicalBoq type · no parentArchiveId misuse · no full-PDF byte dup on D.
 */

import type { BranchCode } from "@/lib/cost-multi-01-types";
import type { IkOcrPageResult, IkOcrResult } from "@/lib/document-intelligence/ocr-types";
import { pdfPrzedmiarHeuristicToPreview } from "@/lib/pdf-przedmiar-heuristic";
import { athPreviewToSnapshot } from "@/lib/tenders-bzp-brief";
import { newDocumentId, sha256Hex } from "@/lib/tender-ingest/hash";
import { recordIngestArtifact } from "@/lib/tender-ingest/queue";
import {
  emptyIngestState,
  getIngestState,
  upsertIngestState,
} from "@/lib/tender-ingest/registry";
import type { TenderIngestDocument, TenderIngestState } from "@/lib/tender-ingest/types";

export type DerivedSegmentSignal =
  | "przedmiar_instal_knr_w"
  | "orgbud_kobra"
  | "page_boundary"
  | "lp_restart"
  | "weak_przedmiar_score"
  | "norma_footer";

export type SegmentProposalStatus = "candidate" | "hold_weak" | "hold_ambiguous";

export type IntraPdfSegmentProposal = {
  startPageIndex: number;
  endPageIndex: number;
  branchHintCandidate: BranchCode | null;
  signals: DerivedSegmentSignal[];
  warnings: string[];
  status: SegmentProposalStatus;
};

export type IntraPdfSegmentationResult = {
  status: "accept" | "hold";
  proposals: IntraPdfSegmentProposal[];
  accepted: Array<{
    startPageIndex: number;
    endPageIndex: number;
    branch: BranchCode;
    signals: DerivedSegmentSignal[];
  }>;
  warnings: string[];
};

function foldText(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Canonical segment text for hash + parse (collapse whitespace). */
export function normalizeSegmentText(text: string): string {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export async function computeDerivedSegmentContentHash(opts: {
  parentDocumentId: string;
  startPageIndex: number;
  endPageIndex: number;
  normalizedSegmentText: string;
}): Promise<string> {
  const payload = [
    String(opts.parentDocumentId ?? "").trim(),
    String(opts.startPageIndex),
    String(opts.endPageIndex),
    normalizeSegmentText(opts.normalizedSegmentText),
  ].join("|");
  const bytes = new TextEncoder().encode(payload);
  return sha256Hex(bytes);
}

export function joinOcrPagesText(
  pages: readonly IkOcrPageResult[],
  startPageIndex: number,
  endPageIndex: number,
): string {
  const slice = pages
    .filter((p) => p.pageIndex >= startPageIndex && p.pageIndex <= endPageIndex)
    .sort((a, b) => a.pageIndex - b.pageIndex)
    .map((p) => String(p.text ?? ""));
  return normalizeSegmentText(slice.join("\n"));
}

function pageHasStrongSanitary(text: string): boolean {
  const t = foldText(text);
  const przedmiar1 = /przedmiar:\s*1/.test(t);
  const knrw = /\bknr-w\b/.test(t);
  // STRONG pair for Norma installations restart (TPI/729-class). LP restart alone ≠ ACCEPT.
  return przedmiar1 && knrw;
}

function pageHasStrongElectrical(text: string): boolean {
  const t = foldText(text);
  return /orgbud/.test(t) && /kobra/.test(t);
}

function pageHasWeakPrzedmiar(text: string): boolean {
  const t = foldText(text);
  return /przedmiar\s+robot/.test(t) || /^przedmiar\b/.test(t);
}

type BoundaryHit = {
  pageIndex: number;
  branch: BranchCode;
  signals: DerivedSegmentSignal[];
};

/**
 * Propose intra-PDF cost segments from OCR pages.
 * DETECTION ≠ IDENTITY — caller must use acceptIntraPdfCostSegments.
 */
export function proposeIntraPdfCostSegments(
  pages: readonly IkOcrPageResult[],
): IntraPdfSegmentProposal[] {
  const sorted = [...pages].sort((a, b) => a.pageIndex - b.pageIndex);
  if (sorted.length === 0) return [];

  const boundaries: BoundaryHit[] = [];
  for (const p of sorted) {
    const text = String(p.text ?? "");
    if (pageHasStrongElectrical(text)) {
      boundaries.push({
        pageIndex: p.pageIndex,
        branch: "electrical",
        signals: ["orgbud_kobra", "page_boundary"],
      });
      continue;
    }
    if (pageHasStrongSanitary(text)) {
      boundaries.push({
        pageIndex: p.pageIndex,
        branch: "sanitary",
        signals: ["przedmiar_instal_knr_w", "page_boundary"],
      });
    }
  }

  // Dedupe consecutive same-branch hits (header repeats on later pages of same BOQ).
  const starts: BoundaryHit[] = [];
  for (const b of boundaries) {
    const prev = starts[starts.length - 1];
    if (prev && prev.branch === b.branch) continue;
    // Same page can't start two; if electrical and sanitary both, electrical wins above.
    if (prev && b.pageIndex <= prev.pageIndex) continue;
    starts.push(b);
  }

  const firstIdx = sorted[0]!.pageIndex;
  const lastIdx = sorted[sorted.length - 1]!.pageIndex;

  if (starts.length === 0) {
    const weakOnly = sorted.some((p) => pageHasWeakPrzedmiar(String(p.text ?? "")));
    return [
      {
        startPageIndex: firstIdx,
        endPageIndex: lastIdx,
        branchHintCandidate: null,
        signals: weakOnly ? ["weak_przedmiar_score"] : [],
        warnings: ["NO_STRONG_INTRA_PDF_BOUNDARY"],
        status: "hold_weak",
      },
    ];
  }

  // First segment: pages before first strong secondary/tertiary start → construction.
  const proposals: IntraPdfSegmentProposal[] = [];
  const firstStart = starts[0]!.pageIndex;

  if (firstStart > firstIdx) {
    proposals.push({
      startPageIndex: firstIdx,
      endPageIndex: firstStart - 1,
      branchHintCandidate: "construction",
      signals: ["page_boundary"],
      warnings: [],
      status: "candidate",
    });
  } else if (starts[0]!.branch !== "construction") {
    // Strong marker on page 0 of a non-construction section — need a prior segment;
    // without prior pages this is ambiguous for multi-BOQ split.
    proposals.push({
      startPageIndex: firstIdx,
      endPageIndex: lastIdx,
      branchHintCandidate: starts[0]!.branch,
      signals: starts[0]!.signals,
      warnings: ["STRONG_ON_FIRST_PAGE_NO_PRIOR_SEGMENT"],
      status: "hold_ambiguous",
    });
    return proposals;
  }

  for (let i = 0; i < starts.length; i++) {
    const cur = starts[i]!;
    const end =
      i + 1 < starts.length ? starts[i + 1]!.pageIndex - 1 : lastIdx;
    if (end < cur.pageIndex) {
      proposals.push({
        startPageIndex: cur.pageIndex,
        endPageIndex: cur.pageIndex,
        branchHintCandidate: cur.branch,
        signals: cur.signals,
        warnings: ["EMPTY_OR_INVERTED_RANGE"],
        status: "hold_ambiguous",
      });
      continue;
    }
    proposals.push({
      startPageIndex: cur.pageIndex,
      endPageIndex: end,
      branchHintCandidate: cur.branch,
      signals: cur.signals,
      warnings: [],
      status: "candidate",
    });
  }

  return proposals;
}

/**
 * ACCEPT only when ≥2 candidate segments with explicit BranchCode and no HOLD flags.
 * LP-restart / weak-only never ACCEPT alone (enforced by propose).
 */
export function acceptIntraPdfCostSegments(
  pages: readonly IkOcrPageResult[],
): IntraPdfSegmentationResult {
  const proposals = proposeIntraPdfCostSegments(pages);
  const warnings: string[] = [];

  if (proposals.some((p) => p.status === "hold_ambiguous")) {
    return {
      status: "hold",
      proposals,
      accepted: [],
      warnings: [...warnings, "HOLD_AMBIGUOUS_BOUNDARY"],
    };
  }
  if (proposals.some((p) => p.status === "hold_weak")) {
    return {
      status: "hold",
      proposals,
      accepted: [],
      warnings: [...warnings, "HOLD_WEAK_ONLY"],
    };
  }

  const candidates = proposals.filter((p) => p.status === "candidate");
  if (candidates.length < 2) {
    return {
      status: "hold",
      proposals,
      accepted: [],
      warnings: [...warnings, "HOLD_NEED_AT_LEAST_TWO_SEGMENTS"],
    };
  }

  const accepted: IntraPdfSegmentationResult["accepted"] = [];
  const branches = new Set<BranchCode>();
  for (const c of candidates) {
    if (!c.branchHintCandidate || c.branchHintCandidate === "unknown") {
      return {
        status: "hold",
        proposals,
        accepted: [],
        warnings: [...warnings, "HOLD_MISSING_BRANCH"],
      };
    }
    if (c.endPageIndex < c.startPageIndex) {
      return {
        status: "hold",
        proposals,
        accepted: [],
        warnings: [...warnings, "HOLD_INVALID_RANGE"],
      };
    }
    accepted.push({
      startPageIndex: c.startPageIndex,
      endPageIndex: c.endPageIndex,
      branch: c.branchHintCandidate,
      signals: c.signals,
    });
    branches.add(c.branchHintCandidate);
  }

  // Distinct branches required for Multi-BOQ LP-restart KEEP BOTH without merge redesign.
  if (branches.size < accepted.length) {
    return {
      status: "hold",
      proposals,
      accepted: [],
      warnings: [...warnings, "HOLD_DUPLICATE_BRANCH_ACROSS_SEGMENTS"],
    };
  }

  return { status: "accept", proposals, accepted, warnings };
}

export async function registerDerivedCostDocument(opts: {
  tenderId: string;
  parentDocumentId: string;
  startPageIndex: number;
  endPageIndex: number;
  segmentText: string;
  displayName?: string;
  warnings?: string[];
}): Promise<{ state: TenderIngestState; document: TenderIngestDocument; reused: boolean }> {
  const tenderId = String(opts.tenderId ?? "").trim();
  const parentDocumentId = String(opts.parentDocumentId ?? "").trim();
  if (!tenderId) throw new Error("MISSING_TENDER_ID");
  if (!parentDocumentId) throw new Error("MISSING_PARENT_DOCUMENT_ID");

  const normalized = normalizeSegmentText(opts.segmentText);
  const contentHash = await computeDerivedSegmentContentHash({
    parentDocumentId,
    startPageIndex: opts.startPageIndex,
    endPageIndex: opts.endPageIndex,
    normalizedSegmentText: normalized,
  });

  let state = getIngestState(tenderId) ?? emptyIngestState(tenderId);
  const existing = state.documents.find(
    (d) =>
      d.ingestStatus === "retained"
      && d.source === "derived_cost_segment"
      && d.contentHash === contentHash,
  );
  if (existing) {
    return { state, document: existing, reused: true };
  }

  const label =
    opts.displayName?.trim()
    || `derived#p${opts.startPageIndex}-${opts.endPageIndex}`;
  const doc: TenderIngestDocument = {
    documentId: newDocumentId(),
    tenderId,
    source: "derived_cost_segment",
    originalFilename: label,
    displayName: label,
    contentHash,
    mimeType: "text/plain",
    size: new TextEncoder().encode(normalized).byteLength,
    parentDocumentId,
    startPageIndex: opts.startPageIndex,
    endPageIndex: opts.endPageIndex,
    ingestStatus: "retained",
    classHint: "COST",
    parseStatus: "queued",
    warnings: [...(opts.warnings ?? [])],
  };

  state = upsertIngestState({
    ...state,
    documents: [...state.documents, doc],
  });
  return { state, document: doc, reused: false };
}

/**
 * Full CONNECT: OCR pages → ACCEPT → N derived docs → heuristic per segment → artifacts.
 * Does NOT auto-map Owner Map (document→dwelling remains Owner gate).
 */
export async function connectIntraPdfDerivedCostDocuments(opts: {
  tenderId: string;
  parentDocumentId: string;
  parentDisplayName?: string;
  ocr: Pick<IkOcrResult, "pages">;
}): Promise<{
  status: "accepted" | "hold";
  derivedDocumentIds: string[];
  warnings: string[];
  segmentation: IntraPdfSegmentationResult;
  state: TenderIngestState | null;
}> {
  const tenderId = String(opts.tenderId ?? "").trim();
  const parentDocumentId = String(opts.parentDocumentId ?? "").trim();
  const segmentation = acceptIntraPdfCostSegments(opts.ocr.pages ?? []);

  if (segmentation.status !== "accept") {
    return {
      status: "hold",
      derivedDocumentIds: [],
      warnings: segmentation.warnings,
      segmentation,
      state: getIngestState(tenderId),
    };
  }

  const derivedDocumentIds: string[] = [];
  const warnings = [...segmentation.warnings];
  const baseName = String(opts.parentDisplayName ?? "Przedmiar.pdf").trim() || "Przedmiar.pdf";

  for (const seg of segmentation.accepted) {
    const segmentText = joinOcrPagesText(opts.ocr.pages, seg.startPageIndex, seg.endPageIndex);
    if (!segmentText.replace(/\s/g, "").length) {
      warnings.push(`EMPTY_SEGMENT_TEXT:${seg.startPageIndex}-${seg.endPageIndex}`);
      return {
        status: "hold",
        derivedDocumentIds: [],
        warnings: [...warnings, "HOLD_EMPTY_SEGMENT"],
        segmentation: { ...segmentation, status: "hold", accepted: [] },
        state: getIngestState(tenderId),
      };
    }

    const { document } = await registerDerivedCostDocument({
      tenderId,
      parentDocumentId,
      startPageIndex: seg.startPageIndex,
      endPageIndex: seg.endPageIndex,
      segmentText,
      displayName: `${baseName}#p${seg.startPageIndex}-${seg.endPageIndex}:${seg.branch}`,
      warnings: seg.signals.map((s) => `SIGNAL:${s}`),
    });
    derivedDocumentIds.push(document.documentId);

    const preview = pdfPrzedmiarHeuristicToPreview(segmentText, document.displayName, {
      extractionMethod: "ocr",
    });
    let snapshot = athPreviewToSnapshot(preview, document.displayName);
    if (!snapshot.ok) {
      // Sparse OCR segment: keep artifact identity; never invent priced rows.
      snapshot = {
        ...snapshot,
        ok: true,
        warnings: [...(snapshot.warnings ?? []), "DERIVED_SEGMENT_PARSE_SPARSE"],
      };
      warnings.push(`SEGMENT_PARSE_SPARSE:${document.documentId}`);
    }
    recordIngestArtifact({
      tenderId,
      documentId: document.documentId,
      filename: document.displayName,
      contentHash: document.contentHash,
      snapshot,
      branch: seg.branch,
    });
  }

  return {
    status: "accepted",
    derivedDocumentIds,
    warnings,
    segmentation,
    state: getIngestState(tenderId),
  };
}
