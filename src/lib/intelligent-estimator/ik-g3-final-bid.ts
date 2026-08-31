/**
 * IK AUTONOMY-08 P4 — G3 Final Bid persist adapter.
 *
 * DF: docs/architecture/IK-AUTONOMY-08-P4-G3-FINAL-BID-DESIGN-FREEZE.md
 *
 * HARD:
 *  - ≠ submittedBidPln / ourEstimatePln / recordDecision / setOwnerDecision
 *  - ≠ Catalog / OUR RATE / Identity / Research / G1 / G2
 *  - Only patches TenderPipelineItem.ikFinalBid + saveTendersPipeline
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  loadTendersPipeline,
  saveTendersPipeline,
} from "@/lib/tenders-bzp";

export const IK_G3_FINAL_BID_SCHEMA_VERSION = 1 as const;
export const IK_G3_FINAL_BID_KIND = "ik_g3_final_bid" as const;
export const IK_G3_DEFAULT_VAT_RATE = 0.23 as const;

export type IkG3FinalBidRecord = {
  schemaVersion: typeof IK_G3_FINAL_BID_SCHEMA_VERSION;
  kind: typeof IK_G3_FINAL_BID_KIND;
  tenderPipelineId: string;
  ocdsId: string | null;
  netPln: number;
  vatRate: number;
  vatPln: number;
  grossPln: number;
  currency: "PLN";
  source: "owner_g3";
  p7RecommendedNetPln: number | null;
  ownerOverride: true;
  approvedAt: string;
  approvedBy: "owner";
  caseLabel?: string;
};

export type IkG3BuildInput = {
  tenderPipelineId: string;
  ocdsId?: string | null;
  netPln: number;
  vatRate?: number;
  vatPln: number;
  grossPln: number;
  p7RecommendedNetPln?: number | null;
  caseLabel?: string;
  approvedAt?: string;
};

export type IkG3ValidateResult =
  | { ok: true }
  | { ok: false; reason: string };

export type IkG3PersistResult =
  | {
      ok: true;
      noop?: boolean;
      record: IkG3FinalBidRecord;
      tenderPipelineId: string;
      writes: { pipelinePersist: 1 | 0 };
    }
  | {
      ok: false;
      reason: string;
      writes: { pipelinePersist: 0 };
    };

function isFinitePositive(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

function roundPln(n: number): number {
  return Math.round(n);
}

/** Pure amount integrity check (DF §1.2). */
export function validateIkG3Amounts(input: {
  netPln: number;
  vatRate: number;
  vatPln: number;
  grossPln: number;
}): IkG3ValidateResult {
  const { netPln, vatRate, vatPln, grossPln } = input;
  if (!isFinitePositive(netPln) || !isFinitePositive(vatPln) || !isFinitePositive(grossPln)) {
    return { ok: false, reason: "INVALID_AMOUNT" };
  }
  if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 1) {
    return { ok: false, reason: "INVALID_VAT_RATE" };
  }
  if (roundPln(netPln + vatPln) !== roundPln(grossPln)) {
    return { ok: false, reason: "NET_VAT_GROSS_MISMATCH" };
  }
  const expectedGross = roundPln(netPln * (1 + vatRate));
  if (Math.abs(expectedGross - roundPln(grossPln)) > 1) {
    return { ok: false, reason: "VAT_RATE_GROSS_MISMATCH" };
  }
  return { ok: true };
}

/** Pure builder — no I/O. */
export function buildIkG3FinalBidRecord(input: IkG3BuildInput): {
  ok: true;
  record: IkG3FinalBidRecord;
} | { ok: false; reason: string } {
  const tenderPipelineId = String(input.tenderPipelineId || "").trim();
  if (!tenderPipelineId) return { ok: false, reason: "MISSING_TENDER_ID" };

  const vatRate = input.vatRate ?? IK_G3_DEFAULT_VAT_RATE;
  const amounts = validateIkG3Amounts({
    netPln: input.netPln,
    vatRate,
    vatPln: input.vatPln,
    grossPln: input.grossPln,
  });
  if (!amounts.ok) return amounts;

  const record: IkG3FinalBidRecord = {
    schemaVersion: IK_G3_FINAL_BID_SCHEMA_VERSION,
    kind: IK_G3_FINAL_BID_KIND,
    tenderPipelineId,
    ocdsId: input.ocdsId != null && String(input.ocdsId).trim()
      ? String(input.ocdsId).trim()
      : null,
    netPln: roundPln(input.netPln),
    vatRate,
    vatPln: roundPln(input.vatPln),
    grossPln: roundPln(input.grossPln),
    currency: "PLN",
    source: "owner_g3",
    p7RecommendedNetPln:
      input.p7RecommendedNetPln != null && Number.isFinite(input.p7RecommendedNetPln)
        ? roundPln(input.p7RecommendedNetPln)
        : null,
    ownerOverride: true,
    approvedAt: input.approvedAt ?? new Date().toISOString(),
    approvedBy: "owner",
    ...(input.caseLabel ? { caseLabel: input.caseLabel } : {}),
  };
  return { ok: true, record };
}

export function readIkG3FinalBid(
  item: TenderPipelineItem | null | undefined,
): IkG3FinalBidRecord | null {
  const raw = item?.ikFinalBid;
  if (!raw || typeof raw !== "object") return null;
  if (raw.kind !== IK_G3_FINAL_BID_KIND) return null;
  if (raw.schemaVersion !== IK_G3_FINAL_BID_SCHEMA_VERSION) return null;
  return raw;
}

/** Presentation-only status line — ≠ P7 recommendedBid · ≠ submittedBid. */
export function formatIkG3FinalBidStatusPl(
  record: IkG3FinalBidRecord | null | undefined,
): string | null {
  if (!record) return null;
  const net = record.netPln.toLocaleString("pl-PL");
  const vat = record.vatPln.toLocaleString("pl-PL");
  const gross = record.grossPln.toLocaleString("pl-PL");
  return `G3 FINAL BID: PERSISTED · ${net} PLN netto · VAT ${vat} · ${gross} PLN brutto`;
}

export function patchIkG3FinalBidOnItem(
  item: TenderPipelineItem,
  record: IkG3FinalBidRecord,
  nowIso?: string,
): TenderPipelineItem {
  if (item.id !== record.tenderPipelineId) {
    throw new Error("G3_TENDER_ID_MISMATCH");
  }
  return {
    ...item,
    ikFinalBid: record,
    updatedAt: nowIso ?? new Date().toISOString(),
  };
}

function sameG3Record(a: IkG3FinalBidRecord | null, b: IkG3FinalBidRecord): boolean {
  if (!a) return false;
  return (
    a.kind === b.kind &&
    a.tenderPipelineId === b.tenderPipelineId &&
    a.netPln === b.netPln &&
    a.vatPln === b.vatPln &&
    a.grossPln === b.grossPln &&
    a.vatRate === b.vatRate &&
    (a.ocdsId ?? null) === (b.ocdsId ?? null)
  );
}

/**
 * Persist G3 Final Bid for one tender.
 * ONLY mutates ikFinalBid (+ updatedAt) on that item · saveTendersPipeline.
 */
export async function persistIkG3FinalBid(opts: {
  tenderPipelineId: string;
  expectedOcds?: string | null;
  netPln: number;
  vatRate?: number;
  vatPln: number;
  grossPln: number;
  p7RecommendedNetPln?: number | null;
  caseLabel?: string;
  /** Inject pipeline for tests — skips load. */
  items?: TenderPipelineItem[];
  /** Inject saver for tests. */
  save?: (items: TenderPipelineItem[]) => Promise<void>;
}): Promise<IkG3PersistResult> {
  const built = buildIkG3FinalBidRecord({
    tenderPipelineId: opts.tenderPipelineId,
    ocdsId: opts.expectedOcds ?? null,
    netPln: opts.netPln,
    vatRate: opts.vatRate,
    vatPln: opts.vatPln,
    grossPln: opts.grossPln,
    p7RecommendedNetPln: opts.p7RecommendedNetPln,
    caseLabel: opts.caseLabel,
  });
  if (!built.ok) {
    return { ok: false, reason: built.reason, writes: { pipelinePersist: 0 } };
  }
  const record = built.record;

  const items = opts.items ?? (await loadTendersPipeline());
  const idx = items.findIndex((x) => x?.id === opts.tenderPipelineId);
  if (idx < 0) {
    return { ok: false, reason: "TENDER_NOT_FOUND", writes: { pipelinePersist: 0 } };
  }
  const item = items[idx];
  if (
    opts.expectedOcds != null &&
    String(opts.expectedOcds).trim() &&
    String(item.tenderId || "").trim() !== String(opts.expectedOcds).trim()
  ) {
    return { ok: false, reason: "OCDS_MISMATCH", writes: { pipelinePersist: 0 } };
  }

  const prev = readIkG3FinalBid(item);
  if (sameG3Record(prev, record)) {
    return {
      ok: true,
      noop: true,
      record: prev!,
      tenderPipelineId: opts.tenderPipelineId,
      writes: { pipelinePersist: 0 },
    };
  }

  const nextItem = patchIkG3FinalBidOnItem(item, record);
  const nextItems = items.slice();
  nextItems[idx] = nextItem;
  const save = opts.save ?? saveTendersPipeline;
  await save(nextItems);

  return {
    ok: true,
    record,
    tenderPipelineId: opts.tenderPipelineId,
    writes: { pipelinePersist: 1 },
  };
}
