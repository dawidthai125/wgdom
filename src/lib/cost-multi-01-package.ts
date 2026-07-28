/**
 * COST-MULTI-01 — budowa CostPackage + polityka agregacji (DF §7–§8).
 * Zakaz: sum(all).
 */

import {
  classifyCostDocumentType,
  isFormalOfferCostFilename,
} from "@/lib/tender-cost-discovery";
import {
  branchCodeLabelPl,
  classifyRelation,
  costTypeQualityTier,
  toCostDocumentRef,
} from "@/lib/cost-multi-01-classify";
import type {
  AggregatePolicy,
  BranchCode,
  BranchPackage,
  BranchWinnerRule,
  BuildCostPackageInput,
  CostAggregate,
  CostDocumentRef,
  CostExclusion,
  CostPackage,
  CostPackageStatus,
  ExclusionReasonCode,
  IncompletenessSignal,
} from "@/lib/cost-multi-01-types";
import { COST_MULTI_01_POLICY_VERSION } from "@/lib/cost-multi-01-types";

function revisionRank(filename: string): number {
  const h = filename.toLowerCase();
  let rank = 0;
  const v = h.match(/(?:^|[^a-z0-9])v(\d+)(?:[^a-z0-9]|$)/) ?? h.match(/_v(\d+)/);
  if (v) rank = Math.max(rank, Number(v[1]));
  if (/poprawion|aktualiz|rev/.test(h)) rank += 10;
  if (/\bwersja\s*(\d+)/.test(h)) {
    const w = h.match(/\bwersja\s*(\d+)/);
    if (w) rank = Math.max(rank, Number(w[1]));
  }
  return rank;
}

function pickBranchWinner(members: CostDocumentRef[]): {
  winner: CostDocumentRef | null;
  rule: BranchWinnerRule;
  status: BranchPackage["status"];
  superseded: CostDocumentRef[];
} {
  if (members.length === 0) {
    return { winner: null, rule: "none", status: "empty", superseded: [] };
  }
  if (members.length === 1) {
    return { winner: members[0], rule: "sole", status: "ok", superseded: [] };
  }

  const sorted = [...members].sort((a, b) => {
    const tierDiff = costTypeQualityTier(b.costType) - costTypeQualityTier(a.costType);
    if (tierDiff !== 0) return tierDiff;
    const rowsA = a.rowCount ?? -1;
    const rowsB = b.rowCount ?? -1;
    if (rowsB !== rowsA) return rowsB - rowsA;
    return revisionRank(b.filename) - revisionRank(a.filename);
  });

  const top = sorted[0];
  const second = sorted[1];
  const sameTier =
    costTypeQualityTier(top.costType) === costTypeQualityTier(second.costType)
    && (top.rowCount ?? -1) === (second.rowCount ?? -1)
    && revisionRank(top.filename) === revisionRank(second.filename);

  if (sameTier) {
    return { winner: null, rule: "none", status: "ambiguous", superseded: [] };
  }

  const revDiff = revisionRank(top.filename) - revisionRank(second.filename);
  const rule: BranchWinnerRule =
    revDiff !== 0 && costTypeQualityTier(top.costType) === costTypeQualityTier(second.costType)
      ? "revision_latest"
      : "tier_rows";

  return {
    winner: top,
    rule,
    status: "ok",
    superseded: sorted.slice(1),
  };
}

function applyPreExclusions(members: CostDocumentRef[]): {
  kept: CostDocumentRef[];
  exclusions: CostExclusion[];
  stagedHold: boolean;
  conflictVariant: boolean;
} {
  const exclusions: CostExclusion[] = [];
  const kept: CostDocumentRef[] = [];
  let stagedHold = false;
  let conflictVariant = false;
  let hasNonVariantBase = false;

  for (const m of members) {
    const pushEx = (reason: ExclusionReasonCode, role: CostDocumentRef["roleInPackage"] = "excluded") => {
      exclusions.push({ documentId: m.id, filename: m.filename, reason });
      kept.push({ ...m, roleInPackage: role });
    };

    if (isFormalOfferCostFilename(m.filename)) {
      pushEx("formal_offer");
      continue;
    }
    if (m.costType === "unknown") {
      pushEx("unsupported_type");
      continue;
    }
    if (m.parseOk === false) {
      pushEx("parse_failed");
      continue;
    }
    if (m.relationHints.includes("option")) {
      pushEx("option_scope", "alternate");
      continue;
    }
    if (m.relationHints.includes("variant")) {
      pushEx("variant_scope", "alternate");
      conflictVariant = true;
      continue;
    }
    if (m.relationHints.includes("stage")) {
      pushEx("stage_out_of_base", "held");
      stagedHold = true;
      continue;
    }

    hasNonVariantBase = true;
    kept.push({ ...m, roleInPackage: "held" });
  }

  return {
    kept,
    exclusions,
    stagedHold,
    conflictVariant: conflictVariant && !hasNonVariantBase,
  };
}

function buildBranchPackages(active: CostDocumentRef[]): {
  branches: BranchPackage[];
  exclusions: CostExclusion[];
  members: CostDocumentRef[];
} {
  const byBranch = new Map<BranchCode, CostDocumentRef[]>();
  for (const m of active) {
    if (m.roleInPackage === "excluded" || m.roleInPackage === "alternate") continue;
    const list = byBranch.get(m.branchHint) ?? [];
    list.push(m);
    byBranch.set(m.branchHint, list);
  }

  const branches: BranchPackage[] = [];
  const exclusions: CostExclusion[] = [];
  const outMembers: CostDocumentRef[] = [...active.filter((m) => m.roleInPackage === "excluded" || m.roleInPackage === "alternate")];

  for (const [branch, list] of byBranch) {
    const { winner, rule, status, superseded } = pickBranchWinner(list);
    const membersOut: CostDocumentRef[] = [];
    for (const m of list) {
      if (winner && m.id === winner.id) {
        membersOut.push({ ...m, roleInPackage: "included_base" });
      } else if (status === "ambiguous") {
        membersOut.push({ ...m, roleInPackage: "held" });
      } else if (superseded.some((s) => s.id === m.id)) {
        const reason: ExclusionReasonCode =
          rule === "revision_latest" ? "superseded_revision" : "duplicate_of_winner";
        exclusions.push({ documentId: m.id, filename: m.filename, reason });
        membersOut.push({ ...m, roleInPackage: "excluded" });
      } else {
        membersOut.push({ ...m, roleInPackage: "held" });
      }
    }
    outMembers.push(...membersOut);
    branches.push({
      branch,
      members: membersOut,
      winner: winner ? { ...winner, roleInPackage: "included_base" } : null,
      winnerRule: rule,
      status,
    });
  }

  return { branches, exclusions, members: outMembers };
}

function selectPolicy(args: {
  activeBase: CostDocumentRef[];
  branches: BranchPackage[];
  stagedHold: boolean;
  conflictVariant: boolean;
}): { status: CostPackageStatus; policy: AggregatePolicy | null; reason: string } {
  const { activeBase, branches, stagedHold, conflictVariant } = args;

  if (conflictVariant) {
    return { status: "conflict", policy: "HOLD_MANUAL", reason: "variant_without_base" };
  }
  if (stagedHold) {
    return { status: "multi_hold", policy: "HOLD_MANUAL", reason: "stage_present" };
  }

  const baseOnly = activeBase.filter((m) => m.roleInPackage === "included_base" || m.roleInPackage === "held");
  if (baseOnly.length === 0) {
    return { status: "empty", policy: null, reason: "empty" };
  }

  if (branches.some((b) => b.status === "ambiguous")) {
    return { status: "multi_hold", policy: "HOLD_MANUAL", reason: "branch_ambiguous" };
  }

  const winners = branches
    .filter((b) => b.branch !== "unknown" && b.winner)
    .map((b) => b.winner!) ;

  const unknownWinners = branches.filter((b) => b.branch === "unknown" && b.winner);

  if (winners.length <= 1 && unknownWinners.length === 0) {
    return { status: "single", policy: "BEST_SINGLE", reason: "single_or_one_branch" };
  }

  if (unknownWinners.length > 0) {
    return { status: "multi_hold", policy: "HOLD_MANUAL", reason: "unknown_branch" };
  }

  if (winners.length >= 2) {
    let allOtherHigh = true;
    for (let i = 0; i < winners.length; i++) {
      for (let j = i + 1; j < winners.length; j++) {
        const rel = classifyRelation(winners[i], winners[j]);
        if (rel.type !== "other_branch" || rel.confidence !== "high") {
          allOtherHigh = false;
          break;
        }
      }
      if (!allOtherHigh) break;
    }
    if (allOtherHigh) {
      return { status: "multi_ready", policy: "SUM_BRANCH_WINNERS", reason: "disjoint_branches" };
    }
    return { status: "multi_hold", policy: "HOLD_MANUAL", reason: "relation_not_other_branch" };
  }

  return { status: "multi_hold", policy: "HOLD_MANUAL", reason: "default_hold" };
}

function buildAggregate(
  policy: AggregatePolicy | null,
  branches: BranchPackage[],
  exclusions: CostExclusion[],
): CostAggregate | null {
  if (!policy) return null;

  if (policy === "HOLD_MANUAL") {
    return {
      policy,
      included: [],
      excluded: exclusions,
      metrics: { branchCount: 0, totalRowCount: null, totalValuePln: null },
      warnings: ["hold_manual"],
    };
  }

  const winners =
    policy === "BEST_SINGLE"
      ? branches.filter((b) => b.winner).map((b) => b.winner!).slice(0, 1)
      : branches.filter((b) => b.branch !== "unknown" && b.winner).map((b) => b.winner!);

  const warnings: string[] = [];
  const branchSet = new Set(winners.map((w) => w.branchHint));
  if (branchSet.has("finishes") && branchSet.has("construction")) {
    warnings.push("scope_overlap_unchecked");
  }

  let totalRowCount: number | null = 0;
  let anyRowMissing = false;
  let totalValuePln: number | null = 0;
  let anyValueMissing = false;
  for (const w of winners) {
    if (w.rowCount == null) {
      anyRowMissing = true;
    } else {
      totalRowCount += w.rowCount;
    }
    if (w.totalValuePln == null) {
      anyValueMissing = true;
    } else {
      totalValuePln += w.totalValuePln;
    }
  }
  if (anyRowMissing) {
    totalRowCount = winners.some((w) => w.rowCount != null) ? totalRowCount : null;
    if (anyRowMissing) warnings.push("row_counts_partial");
  }
  if (anyValueMissing) totalValuePln = null;

  return {
    policy,
    included: winners,
    excluded: exclusions,
    metrics: {
      branchCount: winners.length,
      totalRowCount,
      totalValuePln,
    },
    warnings,
  };
}

function buildIncompleteness(
  members: CostDocumentRef[],
  aggregate: CostAggregate | null,
  legacy: CostDocumentRef | null,
  status: CostPackageStatus,
): IncompletenessSignal {
  const detectedCostCount = members.filter((m) => m.costType !== "unknown").length;
  const selectedCount = aggregate?.included.length ?? (legacy ? 1 : 0);
  const knownBranches = new Set(
    members
      .filter((m) => m.branchHint !== "unknown" && m.roleInPackage !== "excluded")
      .map((m) => m.branchHint),
  );
  const legacyBranch = legacy?.branchHint;
  const missing: string[] = [];
  for (const b of knownBranches) {
    if (legacyBranch && b !== legacyBranch) {
      missing.push(branchCodeLabelPl(b));
    }
  }

  const multi = status === "multi_ready" || status === "multi_hold" || status === "conflict";
  const legacyOneCoversAllBranches = !multi || knownBranches.size <= 1;

  let messageKey = "cost_multi_none";
  if (status === "multi_ready") messageKey = "cost_multi_ready_incomplete_one";
  else if (status === "multi_hold") messageKey = "cost_multi_hold";
  else if (status === "conflict") messageKey = "cost_multi_conflict";
  else if (status === "single") messageKey = "cost_multi_single";

  return {
    legacyOneCoversAllBranches,
    selectedCount,
    detectedCostCount,
    missingBranchHints: missing,
    messageKey,
  };
}

/** Buduje CostPackage zgodnie z DF — bez sum(all), bez Bid. */
export function buildCostPackage(input: BuildCostPackageInput): CostPackage {
  const builtAt = input.builtAt ?? new Date().toISOString();
  const refs = input.documents.map(toCostDocumentRef);

  const pre = applyPreExclusions(refs);
  const activeForBranches = pre.kept.filter(
    (m) => m.roleInPackage !== "excluded" && m.roleInPackage !== "alternate",
  );

  const branched = buildBranchPackages([
    ...pre.kept.filter((m) => m.roleInPackage === "excluded" || m.roleInPackage === "alternate"),
    ...activeForBranches,
  ]);

  const exclusions = [...pre.exclusions, ...branched.exclusions];
  const { status, policy } = selectPolicy({
    activeBase: branched.members,
    branches: branched.branches,
    stagedHold: pre.stagedHold,
    conflictVariant: pre.conflictVariant,
  });

  const aggregate = buildAggregate(policy, branched.branches, exclusions);

  let legacyOneWinner: CostDocumentRef | null = null;
  if (input.legacyWinnerFilename) {
    const match =
      branched.members.find((m) => m.filename === input.legacyWinnerFilename
        || costDocumentDisplayMatch(m.filename, input.legacyWinnerFilename!))
      ?? refs.find((m) => costDocumentDisplayMatch(m.filename, input.legacyWinnerFilename!))
      ?? null;
    if (match) {
      legacyOneWinner = { ...match, roleInPackage: "legacy_winner" };
    }
  }

  const incompleteness = buildIncompleteness(branched.members, aggregate, legacyOneWinner, status);

  return {
    tenderItemId: input.tenderItemId,
    lotKey: input.lotKey ?? null,
    status,
    members: branched.members,
    branches: branched.branches,
    exclusions,
    aggregate,
    legacyOneWinner,
    incompleteness,
    policyVersion: COST_MULTI_01_POLICY_VERSION,
    builtAt,
  };
}

function costDocumentDisplayMatch(a: string, b: string): boolean {
  const base = (s: string) => (s.split(" → ").pop() ?? s).trim().toLowerCase();
  return base(a) === base(b) || a === b;
}

/** Filtruje kandydatów kosztowych z listy nazw (REUSE classifyCostDocumentType). */
export function filterCostCandidateFilenames(filenames: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const filename of filenames) {
    if (isFormalOfferCostFilename(filename)) continue;
    const { type } = classifyCostDocumentType(filename);
    if (type === "none") continue;
    if (seen.has(filename)) continue;
    seen.add(filename);
    out.push(filename);
  }
  return out;
}
