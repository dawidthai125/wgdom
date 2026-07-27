/**
 * AI-COST-01-STAB-01 — lokalna telemetria jakości AI (bez wysyłki poza aplikację).
 * Bez importu pricing-engine / component-edit (uniknięcie cyklu).
 */

import type { OfferBoqDocument } from "@/lib/tender-offer-boq";

export const OFFER_BOQ_AI_QUALITY_TELEMETRY_KEY = "kw-offer-boq-ai-quality-telemetry";

export type OfferBoqUnpricedReasonCode =
  | "no_catalog_match"
  | "unknown_origin"
  | "zero_quantity"
  | "other";

export interface OfferBoqAiQualityTelemetrySnapshot {
  recordedAt: string;
  tenderId: string | null;
  lineCount: number;
  componentCount: number;
  pricedComponentCount: number;
  unpricedComponentCount: number;
  manualChangeCount: number;
  manualApproveCount: number;
  companyKnowledgeHitCount: number;
  unpricedReasons: Partial<Record<OfferBoqUnpricedReasonCode, number>>;
}

export interface OfferBoqAiQualityTelemetryStore {
  schemaVersion: 1;
  updatedAt: string;
  snapshots: OfferBoqAiQualityTelemetrySnapshot[];
  totals: {
    snapshotCount: number;
    unpricedComponentSum: number;
    manualChangeSum: number;
    companyKnowledgeHitSum: number;
    unpricedReasons: Partial<Record<OfferBoqUnpricedReasonCode, number>>;
  };
}

const MAX_SNAPSHOTS = 40;

function emptyStore(): OfferBoqAiQualityTelemetryStore {
  return {
    schemaVersion: 1,
    updatedAt: new Date(0).toISOString(),
    snapshots: [],
    totals: {
      snapshotCount: 0,
      unpricedComponentSum: 0,
      manualChangeSum: 0,
      companyKnowledgeHitSum: 0,
      unpricedReasons: {},
    },
  };
}

export function normalizeOfferBoqAiQualityTelemetryStore(
  raw: unknown,
): OfferBoqAiQualityTelemetryStore {
  if (!raw || typeof raw !== "object") return emptyStore();
  const o = raw as Partial<OfferBoqAiQualityTelemetryStore>;
  const snapshots = Array.isArray(o.snapshots) ? o.snapshots.slice(0, MAX_SNAPSHOTS) : [];
  return {
    schemaVersion: 1,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : emptyStore().updatedAt,
    snapshots: snapshots as OfferBoqAiQualityTelemetrySnapshot[],
    totals: {
      snapshotCount: Number(o.totals?.snapshotCount) || snapshots.length,
      unpricedComponentSum: Number(o.totals?.unpricedComponentSum) || 0,
      manualChangeSum: Number(o.totals?.manualChangeSum) || 0,
      companyKnowledgeHitSum: Number(o.totals?.companyKnowledgeHitSum) || 0,
      unpricedReasons: { ...(o.totals?.unpricedReasons ?? {}) },
    },
  };
}

export function loadOfferBoqAiQualityTelemetryLocal(): OfferBoqAiQualityTelemetryStore {
  try {
    if (typeof localStorage === "undefined") return emptyStore();
    const raw = localStorage.getItem(OFFER_BOQ_AI_QUALITY_TELEMETRY_KEY);
    if (!raw) return emptyStore();
    return normalizeOfferBoqAiQualityTelemetryStore(JSON.parse(raw));
  } catch {
    return emptyStore();
  }
}

export function saveOfferBoqAiQualityTelemetryLocal(
  store: OfferBoqAiQualityTelemetryStore,
): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(OFFER_BOQ_AI_QUALITY_TELEMETRY_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

function classifyUnpricedReason(
  line: OfferBoqDocument["lines"][number],
  originKind: string,
): OfferBoqUnpricedReasonCode {
  if (!line.catalogWorkId) return "no_catalog_match";
  if (originKind === "unknown") return "unknown_origin";
  return "other";
}

export function buildOfferBoqAiQualityTelemetrySnapshot(
  doc: OfferBoqDocument,
  opts?: { tenderId?: string | null; recordedAt?: string },
): OfferBoqAiQualityTelemetrySnapshot {
  const recordedAt = opts?.recordedAt ?? new Date().toISOString();
  const unpricedReasons: Partial<Record<OfferBoqUnpricedReasonCode, number>> = {};
  let priced = 0;
  let unpriced = 0;
  let componentCount = 0;
  let manualChangeCount = 0;
  let manualApproveCount = 0;
  let companyKnowledgeHitCount = 0;

  for (const line of doc.lines) {
    for (const c of line.linePricing?.components ?? []) {
      componentCount += 1;
      const status = c.editStatus ?? "ai_proposal";
      if (status === "user_changed") manualChangeCount += 1;
      if (status === "user_approved") manualApproveCount += 1;
      if (c.companyKnowledgeHint?.used || c.priceOrigin?.kind === "company_knowledge") {
        companyKnowledgeHitCount += 1;
      }
      if (c.unitPricePln != null && c.unitPricePln > 0 && c.totalPln != null) {
        priced += 1;
      } else {
        unpriced += 1;
        const reason = classifyUnpricedReason(line, c.priceOrigin?.kind ?? "unknown");
        unpricedReasons[reason] = (unpricedReasons[reason] ?? 0) + 1;
      }
    }
  }

  return {
    recordedAt,
    tenderId: opts?.tenderId ?? doc.tenderId ?? null,
    lineCount: doc.lines.length,
    componentCount,
    pricedComponentCount: priced,
    unpricedComponentCount: unpriced,
    manualChangeCount,
    manualApproveCount,
    companyKnowledgeHitCount,
    unpricedReasons,
  };
}

export function recordOfferBoqAiQualityTelemetry(
  doc: OfferBoqDocument,
  opts?: { tenderId?: string | null; recordedAt?: string },
): OfferBoqAiQualityTelemetryStore {
  const snapshot = buildOfferBoqAiQualityTelemetrySnapshot(doc, opts);
  const prev = loadOfferBoqAiQualityTelemetryLocal();
  const snapshots = [snapshot, ...prev.snapshots].slice(0, MAX_SNAPSHOTS);
  const unpricedReasons = { ...prev.totals.unpricedReasons };
  for (const [k, v] of Object.entries(snapshot.unpricedReasons)) {
    const key = k as OfferBoqUnpricedReasonCode;
    unpricedReasons[key] = (unpricedReasons[key] ?? 0) + (v ?? 0);
  }
  const next: OfferBoqAiQualityTelemetryStore = {
    schemaVersion: 1,
    updatedAt: snapshot.recordedAt,
    snapshots,
    totals: {
      snapshotCount: prev.totals.snapshotCount + 1,
      unpricedComponentSum: prev.totals.unpricedComponentSum + snapshot.unpricedComponentCount,
      manualChangeSum: prev.totals.manualChangeSum + snapshot.manualChangeCount,
      companyKnowledgeHitSum:
        prev.totals.companyKnowledgeHitSum + snapshot.companyKnowledgeHitCount,
      unpricedReasons,
    },
  };
  saveOfferBoqAiQualityTelemetryLocal(next);
  return next;
}
