/**
 * KL-7-P2A — UI view-model for discovery evidence (presentation only).
 */

import {
  computeKnrDiscoveryOpsFreshness,
  loadKnrDiscoveryEvidenceStoreLocal,
} from "./knr-discovery-evidence-store";
import {
  KNR_DISCOVERY_OPS_FRESHNESS_DAYS,
  knrDiscoveryStatusLabelPl,
  type KnrDiscoveryEvidenceRecord,
  type KnrDiscoveryEvidenceStore,
  type KnrDiscoveryOpsFreshness,
  type KnrDiscoveryStatus,
} from "./knr-discovery-evidence-types";
import { buildP2aOfflineDiscoveryStore } from "./knr-discovery-evidence-fixtures";

export type KnrDiscoveryUiStatusFilter =
  | "ALL"
  | "EVIDENCE"
  | "CORROBORATED"
  | "CONFLICT"
  | "INCOMPLETE"
  | "READY_FOR_OWNER_VERIFY"
  | "DISCOVERED";

export type KnrDiscoveryUiFreshnessFilter = "ALL" | "CURRENT" | "STALE";

export type KnrDiscoveryUiRow = {
  rowId: string;
  evidenceKeyV1: string;
  identityKeyV2: string;
  displayCode: string;
  description: string;
  unit: string;
  family: string;
  discoveryStatus: KnrDiscoveryStatus;
  discoveryLabelPl: string;
  sourceCount: number;
  sourcesSummaryPl: string;
  freshness: KnrDiscoveryOpsFreshness;
  freshnessChrome: "CURRENT" | "STALE";
  freshnessLabelPl: string;
  normsSummaryPl: string;
  isOfflineFixture: boolean;
  record: KnrDiscoveryEvidenceRecord;
};

export const KNR_DISCOVERY_UI_STATUS_FILTERS: {
  id: KnrDiscoveryUiStatusFilter;
  label: string;
}[] = [
  { id: "ALL", label: "Wszystkie evidence" },
  { id: "EVIDENCE", label: "Evidence" },
  { id: "DISCOVERED", label: "DISCOVERED" },
  { id: "CORROBORATED", label: "CORROBORATED" },
  { id: "CONFLICT", label: "CONFLICT" },
  { id: "INCOMPLETE", label: "INCOMPLETE" },
  { id: "READY_FOR_OWNER_VERIFY", label: "READY_FOR_OWNER_VERIFY" },
];

export const KNR_DISCOVERY_UI_FRESHNESS_FILTERS: {
  id: KnrDiscoveryUiFreshnessFilter;
  label: string;
}[] = [
  { id: "ALL", label: "Wszystkie" },
  { id: "CURRENT", label: "Aktualne" },
  { id: "STALE", label: "Przeterminowane" },
];

function normsSummary(r: KnrDiscoveryEvidenceRecord): string {
  const a = r.norms.laborNorms.length;
  const b = r.norms.materialNorms.length;
  const c = r.norms.equipmentNorms.length;
  if (a + b + c === 0) return "R/M/S: —";
  return `R:${a} · M:${b} · S:${c}`;
}

export function toKnrDiscoveryUiRow(
  record: KnrDiscoveryEvidenceRecord,
  opts: { nowMs: number; isOfflineFixture?: boolean },
): KnrDiscoveryUiRow {
  const freshness = computeKnrDiscoveryOpsFreshness(
    record.lastFetchedAt,
    record.updatedAt,
    opts.nowMs,
    KNR_DISCOVERY_OPS_FRESHNESS_DAYS,
  );
  return {
    rowId: record.evidenceKeyV1,
    evidenceKeyV1: record.evidenceKeyV1,
    identityKeyV2: record.identityKeyV2 ?? "—",
    displayCode: record.displayCode,
    description: (record.description ?? "").trim() || "—",
    unit: (record.unit ?? "").trim() || "—",
    family: String(record.family),
    discoveryStatus: record.discoveryStatus,
    discoveryLabelPl: knrDiscoveryStatusLabelPl(record.discoveryStatus),
    sourceCount: record.sources.length,
    sourcesSummaryPl:
      record.sources.length === 0
        ? "—"
        : record.sources.map((s) => s.priority).join(" · "),
    freshness,
    freshnessChrome: freshness === "FRESH" ? "CURRENT" : "STALE",
    freshnessLabelPl: freshness === "FRESH" ? "AKTUALNY" : "PRZETERMINOWANY",
    normsSummaryPl: normsSummary(record),
    isOfflineFixture: opts.isOfflineFixture === true,
    record,
  };
}

export function loadKnrDiscoveryEntriesForUi(input?: {
  store?: KnrDiscoveryEvidenceStore;
  useFixtureWhenEmpty?: boolean;
}): { records: KnrDiscoveryEvidenceRecord[]; source: "local_store" | "p2a_fixture" | "empty" } {
  const store = input?.store ?? loadKnrDiscoveryEvidenceStoreLocal();
  const listed = Object.values(store.entries).filter((e) => e.lifecycleState === "ACTIVE");
  if (listed.length > 0) return { records: listed, source: "local_store" };
  if (input?.useFixtureWhenEmpty === false) return { records: [], source: "empty" };
  return {
    records: Object.values(buildP2aOfflineDiscoveryStore().entries),
    source: "p2a_fixture",
  };
}

export function buildKnrDiscoveryUiRows(input: {
  records: readonly KnrDiscoveryEvidenceRecord[];
  search?: string;
  statusFilter?: KnrDiscoveryUiStatusFilter;
  freshnessFilter?: KnrDiscoveryUiFreshnessFilter;
  nowMs?: number;
  isOfflineFixture?: boolean;
}): KnrDiscoveryUiRow[] {
  const nowMs = input.nowMs ?? Date.now();
  const q = String(input.search ?? "").trim().toLowerCase();
  const statusFilter = input.statusFilter ?? "ALL";
  const freshnessFilter = input.freshnessFilter ?? "ALL";

  return input.records
    .map((r) =>
      toKnrDiscoveryUiRow(r, {
        nowMs,
        isOfflineFixture: input.isOfflineFixture,
      }),
    )
    .filter((row) => {
      if (freshnessFilter === "CURRENT" && row.freshnessChrome !== "CURRENT") return false;
      if (freshnessFilter === "STALE" && row.freshnessChrome !== "STALE") return false;

      if (statusFilter === "EVIDENCE") {
        // All discovery evidence rows (not catalog)
      } else if (statusFilter !== "ALL" && row.discoveryStatus !== statusFilter) {
        return false;
      }

      if (!q) return true;
      const hay = [
        row.displayCode,
        row.evidenceKeyV1,
        row.identityKeyV2,
        row.description,
        row.family,
        row.discoveryLabelPl,
        row.sourcesSummaryPl,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
}
