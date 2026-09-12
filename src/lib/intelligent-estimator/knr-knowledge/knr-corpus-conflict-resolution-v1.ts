/**
 * CORPUS CONFLICT RESOLUTION v1 (CCR-v1) — generic · deterministic · fail-closed.
 *
 * Closes the contract gap: frozen CONFLICT_DENYLIST blocks ATH corpus ingest,
 * but identity may proceed when external HARD corroboration deterministically
 * selects one SAME_KNR competing variant (exact code + unit + scope).
 *
 * DOES NOT: delete loser evidence · overwrite corpus · fuzzy invent · Owner Accept ·
 * TPI-specific rules · remove codes from KNR_CORPUS_CONFLICT_DISPLAY_CODES ·
 * authorize ATH multi-RMS ingest (athCorpusIngestStillDenied always true).
 *
 * REUSE: soft-normalize · source quality scores from caller (ChatGPT scoreKnrSourceQuality).
 */

export const KNR_CORPUS_CONFLICT_RESOLUTION_VERSION = "CCR-v1" as const;
export const KNR_CORPUS_CONFLICT_RESOLUTION_POLICY =
  "CCR-v1-policy-2026-09" as const;

/** Minimum independent HARD sources with quality ≥ MIN_SOURCE_SCORE. */
export const CCR_V1_MIN_CORROBORATIONS = 2 as const;
export const CCR_V1_MIN_SOURCE_SCORE = 70 as const;

export type CorpusConflictCandidate = {
  contentHash: string;
  displayCode: string;
  description: string;
  unit: string;
  /** Optional provenance (ATH file, program version) — audit only. */
  provenance?: Record<string, unknown> | null;
};

export type CorpusConflictCorroboration = {
  sourceUrl: string;
  description: string;
  unit: string;
  qualityScore: number;
  band?: string | null;
};

export type CorpusConflictResolutionDecision =
  | "CORPUS_CONFLICT_RESOLVED"
  | "CORPUS_CONFLICT_FAIL_CLOSED";

export type CorpusConflictResolutionResult = {
  version: typeof KNR_CORPUS_CONFLICT_RESOLUTION_VERSION;
  policyVersion: typeof KNR_CORPUS_CONFLICT_RESOLUTION_POLICY;
  decision: CorpusConflictResolutionDecision;
  displayCode: string;
  unit: string;
  winnerContentHash: string | null;
  winnerDescription: string | null;
  loserContentHashes: string[];
  losersPreserved: true;
  corroborationCount: number;
  corroboratingSourceUrls: string[];
  distinctiveTokensUsed: string[];
  targetScopeCompatibleCount: number;
  targetScopeIncompatibleIds: string[];
  reasons: string[];
  auditTrail: {
    evaluatedAtIso: string;
    candidateCount: number;
    perCandidate: Array<{
      contentHash: string;
      description: string;
      distinctiveTokens: string[];
      corroborationHits: number;
      corroborationScoreSum: number;
      targetHits: number;
    }>;
  };
  /** Identity/ACLC path may proceed when RESOLVED. */
  mayProceedCanonicalIdentity: boolean;
  /** Frozen ATH CONFLICT denylist remains — do not multi-ingest competing RMS. */
  athCorpusIngestStillDenied: true;
  invent: false;
  ownerRuntimeDependency: 0;
};

function soft(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return soft(s)
    .split(" ")
    .filter((t) => t.length >= 4);
}

function unitNorm(u: string): string {
  return soft(u).replace(/\s+/g, "");
}

function distinctiveTokens(
  self: string,
  others: readonly string[],
): string[] {
  const selfTok = new Set(tokens(self));
  const otherTok = new Set(others.flatMap((o) => tokens(o)));
  return [...selfTok].filter((t) => !otherTok.has(t)).sort();
}

function fail(
  input: {
    displayCode: string;
    unit: string;
    nowIso: string;
    candidates: readonly CorpusConflictCandidate[];
  },
  reasons: string[],
  extra?: Partial<CorpusConflictResolutionResult>,
): CorpusConflictResolutionResult {
  return {
    version: KNR_CORPUS_CONFLICT_RESOLUTION_VERSION,
    policyVersion: KNR_CORPUS_CONFLICT_RESOLUTION_POLICY,
    decision: "CORPUS_CONFLICT_FAIL_CLOSED",
    displayCode: input.displayCode,
    unit: input.unit,
    winnerContentHash: null,
    winnerDescription: null,
    loserContentHashes: input.candidates.map((c) => c.contentHash),
    losersPreserved: true,
    corroborationCount: 0,
    corroboratingSourceUrls: [],
    distinctiveTokensUsed: [],
    targetScopeCompatibleCount: 0,
    targetScopeIncompatibleIds: [],
    reasons,
    auditTrail: {
      evaluatedAtIso: input.nowIso,
      candidateCount: input.candidates.length,
      perCandidate: input.candidates.map((c) => ({
        contentHash: c.contentHash,
        description: c.description,
        distinctiveTokens: [],
        corroborationHits: 0,
        corroborationScoreSum: 0,
        targetHits: 0,
      })),
    },
    mayProceedCanonicalIdentity: false,
    athCorpusIngestStillDenied: true,
    invent: false,
    ownerRuntimeDependency: 0,
    ...extra,
  };
}

/**
 * Pure evaluator — no store writes · no denylist mutation · no leaf create.
 */
export function evaluateKnrCorpusConflictResolutionV1(input: {
  displayCode: string;
  unit: string;
  candidates: readonly CorpusConflictCandidate[];
  corroborations: readonly CorpusConflictCorroboration[];
  /** Live activity descriptions that must be compatible with the winner. */
  targetActivities?: readonly { id?: string; description: string; unit?: string }[];
  nowIso: string;
}): CorpusConflictResolutionResult {
  const displayCode = String(input.displayCode || "").trim();
  const unit = unitNorm(input.unit);
  const nowIso = input.nowIso;
  const candidates = (input.candidates || []).filter(
    (c) =>
      soft(c.displayCode) === soft(displayCode) && unitNorm(c.unit) === unit,
  );

  if (!displayCode || !unit) {
    return fail(
      { displayCode, unit: input.unit, nowIso, candidates },
      ["MISSING_DISPLAY_OR_UNIT"],
    );
  }
  if (candidates.length < 2) {
    return fail(
      { displayCode, unit: input.unit, nowIso, candidates },
      ["NEED_AT_LEAST_TWO_COMPETING_CANDIDATES"],
    );
  }

  const hashSet = new Set(candidates.map((c) => c.contentHash));
  if (hashSet.size < 2) {
    return fail(
      { displayCode, unit: input.unit, nowIso, candidates },
      ["COMPETING_HASHES_COLLAPSED"],
    );
  }

  const corr = (input.corroborations || []).filter(
    (c) =>
      unitNorm(c.unit) === unit
      && Number(c.qualityScore) >= CCR_V1_MIN_SOURCE_SCORE
      && String(c.sourceUrl || "").trim(),
  );
  if (corr.length < CCR_V1_MIN_CORROBORATIONS) {
    return fail(
      { displayCode, unit: input.unit, nowIso, candidates },
      [
        `INSUFFICIENT_HARD_CORROBORATION need>=${CCR_V1_MIN_CORROBORATIONS} score>=${CCR_V1_MIN_SOURCE_SCORE} got=${corr.length}`,
      ],
    );
  }

  const perCandidate = candidates.map((c) => {
    const others = candidates
      .filter((o) => o.contentHash !== c.contentHash)
      .map((o) => o.description);
    const dist = distinctiveTokens(c.description, others);
    const rivalDistinctive = candidates
      .filter((o) => o.contentHash !== c.contentHash)
      .flatMap((o) => distinctiveTokens(o.description, [c.description]));
    let corroborationHits = 0;
    let corroborationScoreSum = 0;
    const hitUrls: string[] = [];
    for (const src of corr) {
      const hay = soft(src.description);
      let distOk = false;
      if (dist.length > 0) {
        // Superset / distinctive scope — must include ALL distinctive tokens.
        distOk = dist.every((t) => hay.includes(t));
      } else {
        // Subset description — core overlap, but MUST NOT include rival distinctive tokens
        // (otherwise every "na rusztach" source would also "confirm" the shorter variant).
        const core = soft(c.description)
          .split(" ")
          .filter((t) => t.length >= 6)
          .slice(0, 5);
        const coreHit = core.filter((t) => hay.includes(t)).length >= 3;
        const hasRivalScope = rivalDistinctive.some((t) => hay.includes(t));
        distOk = coreHit && !hasRivalScope;
      }
      if (distOk) {
        corroborationHits += 1;
        corroborationScoreSum += Number(src.qualityScore) || 0;
        hitUrls.push(src.sourceUrl);
      }
    }
    let targetHits = 0;
    for (const t of input.targetActivities || []) {
      if (t.unit && unitNorm(t.unit) !== unit) continue;
      const hay = soft(t.description);
      let ok = false;
      if (dist.length > 0) {
        ok = dist.every((tok) => hay.includes(tok));
      } else {
        const core = soft(c.description)
          .split(" ")
          .filter((x) => x.length >= 6)
          .slice(0, 4);
        ok =
          core.every((tok) => hay.includes(tok))
          && !rivalDistinctive.some((tok) => hay.includes(tok));
      }
      if (ok) targetHits += 1;
    }
    return {
      contentHash: c.contentHash,
      description: c.description,
      distinctiveTokens: dist,
      corroborationHits,
      corroborationScoreSum,
      targetHits,
      hitUrls: [...new Set(hitUrls)],
    };
  });

  // Prefer candidates with distinctive scope tokens corroborated by HARD sources
  const ranked = [...perCandidate].sort((a, b) => {
    if (b.corroborationHits !== a.corroborationHits) {
      return b.corroborationHits - a.corroborationHits;
    }
    if (b.corroborationScoreSum !== a.corroborationScoreSum) {
      return b.corroborationScoreSum - a.corroborationScoreSum;
    }
    if (b.targetHits !== a.targetHits) return b.targetHits - a.targetHits;
    return a.contentHash.localeCompare(b.contentHash);
  });

  const best = ranked[0]!;
  const second = ranked[1]!;

  if (best.corroborationHits < CCR_V1_MIN_CORROBORATIONS) {
    return fail(
      { displayCode, unit: input.unit, nowIso, candidates },
      [
        `WINNER_CORROBORATION_BELOW_THRESHOLD hits=${best.corroborationHits} need=${CCR_V1_MIN_CORROBORATIONS}`,
      ],
      {
        auditTrail: {
          evaluatedAtIso: nowIso,
          candidateCount: candidates.length,
          perCandidate: perCandidate.map(
            ({ hitUrls: _u, ...rest }) => rest,
          ),
        },
      },
    );
  }

  if (
    best.corroborationHits === second.corroborationHits
    && best.corroborationScoreSum === second.corroborationScoreSum
  ) {
    return fail(
      { displayCode, unit: input.unit, nowIso, candidates },
      ["TIE_NO_DETERMINISTIC_WINNER"],
      {
        auditTrail: {
          evaluatedAtIso: nowIso,
          candidateCount: candidates.length,
          perCandidate: perCandidate.map(({ hitUrls: _u, ...rest }) => rest),
        },
      },
    );
  }

  // Contradictory HARD: loser has equal-or-higher corroboration on its distinctive tokens
  if (
    second.distinctiveTokens.length > 0
    && second.corroborationHits >= best.corroborationHits
  ) {
    return fail(
      { displayCode, unit: input.unit, nowIso, candidates },
      ["STRONGER_OR_EQUAL_CONTRADICTORY_HARD"],
      {
        auditTrail: {
          evaluatedAtIso: nowIso,
          candidateCount: candidates.length,
          perCandidate: perCandidate.map(({ hitUrls: _u, ...rest }) => rest),
        },
      },
    );
  }

  const targets = input.targetActivities || [];
  const incompatible: string[] = [];
  let compatibleCount = 0;
  if (targets.length > 0) {
    for (const t of targets) {
      const id = t.id || soft(t.description).slice(0, 24);
      if (t.unit && unitNorm(t.unit) !== unit) {
        incompatible.push(String(id));
        continue;
      }
      const hay = soft(t.description);
      const ok =
        best.distinctiveTokens.length === 0
          ? soft(best.description)
              .split(" ")
              .filter((x) => x.length >= 6)
              .slice(0, 4)
              .every((tok) => hay.includes(tok))
          : best.distinctiveTokens.every((tok) => hay.includes(tok));
      if (ok) compatibleCount += 1;
      else incompatible.push(String(id));
    }
    if (incompatible.length > 0 && compatibleCount === 0) {
      return fail(
        { displayCode, unit: input.unit, nowIso, candidates },
        ["NO_TARGET_SCOPE_COMPATIBLE"],
        {
          targetScopeIncompatibleIds: incompatible,
          auditTrail: {
            evaluatedAtIso: nowIso,
            candidateCount: candidates.length,
            perCandidate: perCandidate.map(({ hitUrls: _u, ...rest }) => rest),
          },
        },
      );
    }
  }

  const winnerFull = candidates.find((c) => c.contentHash === best.contentHash)!;
  const losers = candidates
    .filter((c) => c.contentHash !== best.contentHash)
    .map((c) => c.contentHash);

  return {
    version: KNR_CORPUS_CONFLICT_RESOLUTION_VERSION,
    policyVersion: KNR_CORPUS_CONFLICT_RESOLUTION_POLICY,
    decision: "CORPUS_CONFLICT_RESOLVED",
    displayCode,
    unit: input.unit,
    winnerContentHash: best.contentHash,
    winnerDescription: winnerFull.description,
    loserContentHashes: losers,
    losersPreserved: true,
    corroborationCount: best.corroborationHits,
    corroboratingSourceUrls: best.hitUrls,
    distinctiveTokensUsed: best.distinctiveTokens,
    targetScopeCompatibleCount: compatibleCount,
    targetScopeIncompatibleIds: incompatible,
    reasons: [
      "EXACT_CODE_UNIT",
      "DISTINCTIVE_SCOPE_CORROBORATED",
      `WINNER_HASH=${best.contentHash}`,
      `LOSERS_PRESERVED=${losers.join(",")}`,
      `CORROBORATIONS=${best.corroborationHits}`,
    ],
    auditTrail: {
      evaluatedAtIso: nowIso,
      candidateCount: candidates.length,
      perCandidate: perCandidate.map(({ hitUrls: _u, ...rest }) => rest),
    },
    mayProceedCanonicalIdentity: true,
    athCorpusIngestStillDenied: true,
    invent: false,
    ownerRuntimeDependency: 0,
  };
}

/** Helper: scope gate for a single activity vs resolved winner description. */
export function isActivityCompatibleWithResolvedWinner(input: {
  activityDescription: string;
  winnerDescription: string;
  distinctiveTokens?: readonly string[];
}): boolean {
  const hay = soft(input.activityDescription);
  const dist =
    input.distinctiveTokens
    && input.distinctiveTokens.length > 0
      ? [...input.distinctiveTokens]
      : distinctiveTokens(input.winnerDescription, [
          // empty other → no distinctive; fall back to core tokens
          "",
        ]);
  if (dist.length === 0) {
    return soft(input.winnerDescription)
      .split(" ")
      .filter((t) => t.length >= 6)
      .slice(0, 4)
      .every((t) => hay.includes(t));
  }
  return dist.every((t) => hay.includes(t));
}
