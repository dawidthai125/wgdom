/**
 * COST-MULTI-02 — resolveCostBidInput SSOT (Design Freeze §5).
 * Bid / OfferBoq czytają kosztorysForBid — nie nadpisują dossier.kosztorys.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";
import {
  COST_MULTI_01_ENABLED,
  resolveCostPackageFromItem,
} from "@/lib/cost-multi-01";
import { inferBranchHint } from "@/lib/cost-multi-01-classify";
import type { BranchCode } from "@/lib/cost-multi-01-types";
import {
  buildAggregateKosztorysSnapshot,
  filenamesMatchCost,
  snapshotUsableForAggregate,
} from "@/lib/cost-multi-02-aggregate";
import type {
  BranchWinnerSnapshot,
  CostBidInputDecision,
  CostBidInputMode,
  CostBranchArtifact,
} from "@/lib/cost-multi-02-types";

/** Rollback: `false` → Bid zawsze ONE (zachowanie 2.65.74). */
export const COST_MULTI_02_AGGREGATE_BID = true;

/** Opcjonalny twardy gate: HOLD → Bid bez ceny (default OFF). */
export const COST_MULTI_02_HOLD_BLOCKS_BID = false;

function oneDecision(
  legacy: TenderKosztorysSnapshot | null,
  extras: Partial<CostBidInputDecision> & { reasonCodes: string[] },
): CostBidInputDecision {
  return {
    mode: "ONE",
    packageStatus: extras.packageStatus ?? null,
    aggregatePolicy: extras.aggregatePolicy ?? null,
    kosztorysForBid: legacy,
    legacyKosztorys: legacy,
    reasonCodes: extras.reasonCodes,
    warnings: extras.warnings ?? [],
    sourceDocumentCount: extras.sourceDocumentCount ?? (legacy?.ok ? 1 : 0),
  };
}

function holdDecision(
  legacy: TenderKosztorysSnapshot | null,
  extras: Partial<CostBidInputDecision> & { reasonCodes: string[] },
): CostBidInputDecision {
  const block = COST_MULTI_02_HOLD_BLOCKS_BID;
  return {
    mode: "MANUAL_HOLD",
    packageStatus: extras.packageStatus ?? null,
    aggregatePolicy: extras.aggregatePolicy ?? "HOLD_MANUAL",
    kosztorysForBid: block ? null : legacy,
    legacyKosztorys: legacy,
    reasonCodes: extras.reasonCodes,
    warnings: extras.warnings ?? ["hold_manual"],
    sourceDocumentCount: extras.sourceDocumentCount ?? 0,
  };
}

export function readCostBranchArtifacts(item: TenderPipelineItem): CostBranchArtifact[] {
  const summary = item.tenderDossier?.scanSummary as
    | { branchWinnerArtifacts?: CostBranchArtifact[]; costBranchArtifacts?: CostBranchArtifact[] }
    | undefined;
  const raw = summary?.branchWinnerArtifacts ?? summary?.costBranchArtifacts;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (a): a is CostBranchArtifact =>
      Boolean(a && typeof a.filename === "string" && a.snapshot && a.snapshot.ok),
  );
}

function findArtifact(
  artifacts: CostBranchArtifact[],
  filename: string,
): CostBranchArtifact | null {
  return artifacts.find((a) => filenamesMatchCost(a.filename, filename)) ?? null;
}

/**
 * SSOT: ONE | AGGREGATE | MANUAL_HOLD przed Bid / OfferBoq.
 */
export function resolveCostBidInput(item: TenderPipelineItem): CostBidInputDecision {
  const legacy = item.tenderDossier?.kosztorys ?? null;

  if (!COST_MULTI_02_AGGREGATE_BID) {
    return oneDecision(legacy, { reasonCodes: ["flag_02_off"] });
  }
  if (!COST_MULTI_01_ENABLED) {
    return oneDecision(legacy, { reasonCodes: ["flag_01_off"] });
  }

  const pkg = resolveCostPackageFromItem(item);
  if (!pkg) {
    return oneDecision(legacy, { reasonCodes: ["no_cost_package"] });
  }

  if (pkg.status === "multi_hold" || pkg.status === "conflict") {
    return holdDecision(legacy, {
      packageStatus: pkg.status,
      aggregatePolicy: pkg.aggregate?.policy ?? "HOLD_MANUAL",
      reasonCodes: ["package_hold_or_conflict"],
      warnings: pkg.aggregate?.warnings ?? ["hold_manual"],
    });
  }

  if (pkg.aggregate?.policy === "HOLD_MANUAL") {
    return holdDecision(legacy, {
      packageStatus: pkg.status,
      aggregatePolicy: "HOLD_MANUAL",
      reasonCodes: ["policy_hold_manual"],
    });
  }

  if (pkg.status === "single" || pkg.aggregate?.policy === "BEST_SINGLE" || pkg.status === "empty") {
    return oneDecision(legacy, {
      packageStatus: pkg.status,
      aggregatePolicy: pkg.aggregate?.policy ?? null,
      reasonCodes: ["single_or_best"],
    });
  }

  if (
    pkg.status === "multi_ready"
    && pkg.aggregate?.policy === "SUM_BRANCH_WINNERS"
    && (pkg.aggregate.included?.length ?? 0) >= 2
  ) {
    // DF §6.1 #9 — unknown branch wśród included → HOLD (nie Aggregate).
    const unknownIncluded = pkg.aggregate.included.filter((inc) => {
      const hinted = inc.branchHint !== "unknown"
        ? inc.branchHint
        : inferBranchHint(inc.filename);
      return hinted === "unknown";
    });
    if (unknownIncluded.length > 0) {
      return holdDecision(legacy, {
        packageStatus: pkg.status,
        aggregatePolicy: "SUM_BRANCH_WINNERS",
        reasonCodes: ["unknown_branch_among_included"],
        warnings: ["unknown_branch", ...pkg.aggregate.warnings],
        sourceDocumentCount: pkg.aggregate.included.length,
      });
    }

    const artifacts = readCostBranchArtifacts(item);
    const winners: BranchWinnerSnapshot[] = [];
    const missing: string[] = [];

    for (const inc of pkg.aggregate.included) {
      const art = findArtifact(artifacts, inc.filename);
      if (!art || !snapshotUsableForAggregate(art.snapshot)) {
        missing.push(inc.filename);
        continue;
      }
      const branch: BranchCode = inc.branchHint !== "unknown"
        ? inc.branchHint
        : (art.branch ?? inferBranchHint(inc.filename));
      winners.push({
        documentId: inc.id,
        filename: inc.filename,
        branch,
        snapshot: art.snapshot,
      });
    }

    if (missing.length > 0 || winners.length < 2) {
      return holdDecision(legacy, {
        packageStatus: pkg.status,
        aggregatePolicy: "SUM_BRANCH_WINNERS",
        reasonCodes: ["missing_branch_snapshots"],
        warnings: ["missing_branch_snapshots", ...pkg.aggregate.warnings],
        sourceDocumentCount: winners.length,
      });
    }

    const merged = buildAggregateKosztorysSnapshot(winners);
    if (
      !merged
      || ((merged.catalogQuantities?.length ?? 0) === 0 && !merged.totalValue)
    ) {
      return oneDecision(legacy, {
        packageStatus: pkg.status,
        aggregatePolicy: "SUM_BRANCH_WINNERS",
        reasonCodes: ["aggregate_merge_empty"],
        warnings: ["aggregate_merge_empty"],
      });
    }

    return {
      mode: "AGGREGATE" satisfies CostBidInputMode,
      packageStatus: pkg.status,
      aggregatePolicy: "SUM_BRANCH_WINNERS",
      kosztorysForBid: merged,
      legacyKosztorys: legacy,
      reasonCodes: ["sum_branch_winners"],
      warnings: merged.warnings,
      sourceDocumentCount: winners.length,
    };
  }

  return oneDecision(legacy, {
    packageStatus: pkg.status,
    aggregatePolicy: pkg.aggregate?.policy ?? null,
    reasonCodes: ["unresolved_fallback_one"],
  });
}

/** Snapshot używany przez Bid/OfferBoq (nie mutuje dossier). */
export function resolveKosztorysSnapshotForPricing(
  item: TenderPipelineItem,
): TenderKosztorysSnapshot | null {
  return resolveCostBidInput(item).kosztorysForBid;
}

export type CostMulti02UiCopy = {
  tone: "info" | "warn" | "success";
  title: string;
  body: string;
  mode: CostBidInputMode;
};

export function resolveCostMulti02UiOverlay(
  decision: CostBidInputDecision,
): CostMulti02UiCopy | null {
  if (!COST_MULTI_02_AGGREGATE_BID) return null;
  if (decision.mode === "AGGREGATE") {
    return {
      tone: "success",
      mode: "AGGREGATE",
      title: `Wycena z ${decision.sourceDocumentCount} branż (Aggregate)`,
      body:
        "Kalkulator oferty liczy sumę przedmiarów branżowych (Branch winners). "
        + "Plik ONE w dossier pozostaje bez zmian (Discovery).",
    };
  }
  if (decision.mode === "MANUAL_HOLD") {
    return {
      tone: "warn",
      mode: "MANUAL_HOLD",
      title: "HOLD — wycena Aggregate wstrzymana",
      body:
        decision.reasonCodes.includes("missing_branch_snapshots")
          ? "Brak pełnych odczytów branż — uruchom Ponów analizę, aby zbudować Aggregate Bid. "
            + "Obecnie używany jest ONE (może być niepełny)."
          : "Polityka HOLD_MANUAL — nie sumujemy automatycznie. "
            + "Nie traktuj rekomendowanej ceny jako pełnej oferty wielobranżowej.",
    };
  }
  return null;
}

export {
  buildAggregateKosztorysSnapshot,
  snapshotUsableForAggregate,
  filenamesMatchCost,
} from "@/lib/cost-multi-02-aggregate";
export type * from "@/lib/cost-multi-02-types";
