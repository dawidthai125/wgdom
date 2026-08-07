/**
 * KE-E1 — Resolver v0 (select + eligibility + scorecard + explain).
 * Blend: OFF (policy.blendEnabled=false). Pure · bez I/O.
 */

import { evaluateCandidateEligibility, mergeKePolicy } from "./eligibility";
import { buildScorecard } from "./scorecard";
import type {
  KnowledgeAlternateSummary,
  KnowledgeCandidate,
  KnowledgeEngineExplainMeta,
  KnowledgeReasonCode,
  KnowledgeResolverInput,
  KnowledgeResolverOutput,
  KnowledgeResolveSource,
  KnowledgeScorecard,
} from "./types";

function sourceToResolveKind(s: KnowledgeCandidate["source"]): KnowledgeResolveSource {
  if (s === "owner") return "owner";
  if (s === "company") return "company";
  if (s === "market") return "market";
  return "global_fallback";
}

function explainPl(
  source: KnowledgeResolveSource,
  codes: KnowledgeReasonCode[],
  score: KnowledgeScorecard | null,
): string {
  const scoreBit =
    score != null ? ` Score ${score.totalScore.toFixed(2)} (${score.level}).` : "";
  if (source === "owner") return `Owner Knowledge — jawna decyzja / lock.${scoreBit}`;
  if (source === "company")
    return `Company Knowledge — eligible posterior firmy.${scoreBit}`;
  if (source === "market")
    return `Market Knowledge — controlled market / Quotes.${scoreBit}`;
  if (source === "global_fallback")
    return `Global fallback — norma/heurystyka; wymaga weryfikacji.${scoreBit}`;
  if (source === "none") {
    if (codes.includes("OUT_SKIP")) return "OUT — poza wyceną robót katalogowych.";
    return "Brak eligible źródła Knowledge Engine.";
  }
  return `Knowledge Engine: ${source}.${scoreBit}`;
}

/**
 * Resolver v0 — wybór źródła ceny jednostkowej.
 */
export function resolveKnowledgePrice(input: KnowledgeResolverInput): KnowledgeResolverOutput {
  const policy = mergeKePolicy(input.policy);
  const nowIso = input.nowIso ?? new Date().toISOString();
  const reasonCodes: KnowledgeReasonCode[] = [];

  if (input.isOut) {
    return {
      unitPricePln: null,
      source: "none",
      scorecard: null,
      alternates: [],
      reviewRequired: false,
      reasonCodes: ["OUT_SKIP"],
      explain: explainPl("none", ["OUT_SKIP"], null),
      selectedCandidateId: null,
      selectedChainIndex: null,
    };
  }

  if (input.ownerLock && input.ownerLock.unitPricePln > 0) {
    reasonCodes.push("OWNER_LOCK");
    const scorecard: KnowledgeScorecard = {
      confidence: 1,
      freshness: 1,
      n: 1,
      variance: 1,
      agreement: 1,
      totalScore: 1,
      level: "high",
    };
    return {
      unitPricePln: input.ownerLock.unitPricePln,
      source: "owner",
      scorecard,
      alternates: [],
      reviewRequired: false,
      reasonCodes,
      explain: explainPl("owner", reasonCodes, scorecard),
      selectedCandidateId: input.ownerLock.refId ?? "owner_lock",
      selectedChainIndex: -1,
    };
  }

  const peerMarket = input.candidates.find((c) => c.source === "market" && c.unitPricePln > 0);

  type Ranked = {
    candidate: KnowledgeCandidate;
    eligible: boolean;
    eligReasons: KnowledgeReasonCode[];
    scorecard: KnowledgeScorecard;
  };

  const ranked: Ranked[] = input.candidates.map((c) => {
    const elig = evaluateCandidateEligibility(c, policy, nowIso);
    const scorecard = buildScorecard(c, {
      nMin: policy.nMin,
      nSole: policy.nSole,
      peerMarketPrice: peerMarket?.unitPricePln ?? null,
    });
    return {
      candidate: c,
      eligible: elig.eligible,
      eligReasons: elig.reasons,
      scorecard,
    };
  });

  for (const r of ranked) {
    for (const code of r.eligReasons) {
      if (!reasonCodes.includes(code)) reasonCodes.push(code);
    }
  }

  const alternates: KnowledgeAlternateSummary[] = ranked
    .slice()
    .sort((a, b) => b.scorecard.totalScore - a.scorecard.totalScore)
    .slice(0, 3)
    .map((r) => ({
      source: r.candidate.source,
      unitPricePln: r.candidate.unitPricePln,
      totalScore: r.scorecard.totalScore,
      eligible: r.eligible,
      refId: r.candidate.refId,
      labelPl: r.candidate.labelPl,
    }));

  const eligible = ranked.filter((r) => r.eligible);
  if (eligible.length === 0) {
    reasonCodes.push("NO_CANDIDATE");
    return {
      unitPricePln: null,
      source: "none",
      scorecard: null,
      alternates,
      reviewRequired: true,
      reasonCodes,
      explain: explainPl("none", reasonCodes, null),
      selectedCandidateId: null,
      selectedChainIndex: null,
    };
  }

  // KE-E1 select: łańcuch providerów wśród eligible (Market-first parity = first-hit).
  // Scorecard / alternates służą Explain — nie blend (OFF).
  eligible.sort((a, b) => a.candidate.chainIndex - b.candidate.chainIndex);
  const best = eligible[0]!;
  reasonCodes.push("SELECTED_BY_CHAIN_ORDER");
  // Gdyby score najwyższy był inny niż chain-first — zaznacz dla explain
  const byScore = eligible
    .slice()
    .sort((a, b) => b.scorecard.totalScore - a.scorecard.totalScore);
  if (byScore[0] && byScore[0].candidate.id !== best.candidate.id) {
    reasonCodes.push("SELECTED_BY_SCORE"); // informacyjnie: score preferowałby inne
  }

  const source = sourceToResolveKind(best.candidate.source);
  let reviewRequired =
    best.scorecard.level === "low" || source === "global_fallback";

  // Soft cap vs market (DF §6) — nie zmienia ceny w v0, tylko review
  if (peerMarket && source !== "market" && peerMarket.unitPricePln > 0) {
    const rel = Math.abs(best.candidate.unitPricePln - peerMarket.unitPricePln) / peerMarket.unitPricePln;
    if (rel > policy.capMarket * (0.25 / 0.35) && rel <= policy.capMarket) {
      reasonCodes.push("CAP_SOFT_WARN");
      reviewRequired = true;
    } else if (rel > policy.capMarket && source === "company") {
      // v0: nie blend / nie overwrite — oznacz review (cena zostaje, explain)
      reasonCodes.push("CAP_SOFT_WARN");
      reviewRequired = true;
    }
  }

  return {
    unitPricePln: best.candidate.unitPricePln,
    source,
    scorecard: best.scorecard,
    alternates,
    reviewRequired,
    reasonCodes,
    explain: explainPl(source, reasonCodes, best.scorecard),
    selectedCandidateId: best.candidate.id,
    selectedChainIndex: best.candidate.chainIndex,
  };
}

export function toKnowledgeEngineExplainMeta(
  out: KnowledgeResolverOutput,
  policy = mergeKePolicy(),
): KnowledgeEngineExplainMeta {
  return {
    schemaVersion: 1,
    source: out.source,
    scorecard: out.scorecard,
    reasonCodes: out.reasonCodes,
    explain: out.explain,
    reviewRequired: out.reviewRequired,
    alternates: out.alternates,
    policy: {
      nMin: policy.nMin,
      nSole: policy.nSole,
      blendEnabled: policy.blendEnabled,
      capMarket: policy.capMarket,
    },
  };
}
