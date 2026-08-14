/**
 * IK-LABOR-EXPERT-REC-01 — RO Labor Rate Expert Recommendation.
 *
 * Works ONLY after CANDIDATE evidence pack.
 * ZERO invent PLN · ZERO Accept · ZERO KV · ZERO companyPrice.
 * Does NOT re-run work-rate-qualify (SSOT stays in work-catalog).
 */

import type {
  WorkRateResearchCandidate,
  WorkRateResearchRejectRow,
} from "@/lib/work-catalog/work-rate-research";
import {
  buildLaborRateEvidencePack,
  type LaborRateEvidenceContext,
  type LaborRateEvidencePack,
} from "./labor-rate-evidence";

/** Documented deterministic heuristics (NOT invented market prices). */
export const LABOR_RATE_DELTA_PCT_CAUTION = 40 as const;
export const LABOR_RATE_SPREAD_PCT_CAUTION = 50 as const;

export type LaborRateExpertStance =
  | "RECOMMEND_ACCEPT"
  | "RECOMMEND_CAUTION"
  | "RECOMMEND_REJECT"
  | "NO_RECOMMENDATION";

export type LaborRateExpertConfidence = "high" | "medium" | "low";

export type LaborRateExpertFinding = {
  code: string;
  severity: "info" | "caution" | "block";
  messagePl: string;
};

export type LaborRateExpertRecommendation = {
  stance: LaborRateExpertStance;
  confidence: LaborRateExpertConfidence;
  summaryPl: string;
  findings: LaborRateExpertFinding[];
  /** Rate echoed from evidence — never recomputed. */
  candidateRatePln: number | null;
  unit: string | null;
  /** Full pack reference (RO). null when NO_RECOMMENDATION without pack. */
  evidence: LaborRateEvidencePack | null;
  companyPriceUsedAsOurRate: false;
  aiAutoAccept: false;
  expertMayWrite: false;
  expertMayAccept: false;
};

function noRec(
  reasonPl: string,
  findings: LaborRateExpertFinding[] = [],
): LaborRateExpertRecommendation {
  return {
    stance: "NO_RECOMMENDATION",
    confidence: "low",
    summaryPl: reasonPl,
    findings,
    candidateRatePln: null,
    unit: null,
    evidence: null,
    companyPriceUsedAsOurRate: false,
    aiAutoAccept: false,
    expertMayWrite: false,
    expertMayAccept: false,
  };
}

function spreadPct(pack: LaborRateEvidencePack): number | null {
  const rates = pack.observations.map((o) => o.ratePln);
  if (rates.length < 2) return null;
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const mid = pack.candidateRatePln;
  if (!(mid > 0)) return null;
  return Math.round(((max - min) / mid) * 10000) / 100;
}

/**
 * Pure RO analysis. Optional sourceCandidate enables rate-equality assert.
 */
export function analyzeLaborRateCandidate(input: {
  pack: LaborRateEvidencePack | null | undefined;
  sourceCandidate?: WorkRateResearchCandidate | null;
}): LaborRateExpertRecommendation {
  const pack = input.pack ?? null;
  if (!pack) {
    return noRec(
      "Brak Evidence Pack — brak rekomendacji (GAP / brak CANDIDATE / puste evidence).",
      [
        {
          code: "NO_EVIDENCE_PACK",
          severity: "block",
          messagePl: "Wymagany CANDIDATE z kwalifikowanymi obserwacjami.",
        },
      ],
    );
  }

  const source = input.sourceCandidate ?? null;
  if (source) {
    const suggested = Number(source.suggestedRatePln);
    if (
      !Number.isFinite(suggested) ||
      pack.candidateRatePln !== suggested
    ) {
      return noRec(
        "Fail closed: candidateRatePln ≠ suggestedRatePln — ekspert nie inventuje stawki.",
        [
          {
            code: "RATE_ASSERT_FAIL",
            severity: "block",
            messagePl: `Pack ${pack.candidateRatePln} ≠ candidate ${suggested}.`,
          },
        ],
      );
    }
  }

  if (pack.observations.length === 0) {
    return noRec("Brak kwalifikowanych obserwacji — NO_RECOMMENDATION.", [
      {
        code: "EMPTY_OBSERVATIONS",
        severity: "block",
        messagePl: "Evidence bez observations.",
      },
    ]);
  }

  if (pack.observations.some((o) => o.laborOnly !== true)) {
    return {
      stance: "RECOMMEND_REJECT",
      confidence: "low",
      summaryPl:
        "Niespójność evidence: obserwacja nie labor-only — odrzuć (fail closed).",
      findings: [
        {
          code: "LABOR_ONLY_BREACH",
          severity: "block",
          messagePl: "Qualified observation musi mieć laborOnly=true.",
        },
      ],
      candidateRatePln: pack.candidateRatePln,
      unit: pack.unit,
      evidence: pack,
      companyPriceUsedAsOurRate: false,
      aiAutoAccept: false,
      expertMayWrite: false,
      expertMayAccept: false,
    };
  }

  if (pack.lmRejected && pack.observations.length === 0) {
    return {
      stance: "RECOMMEND_REJECT",
      confidence: "low",
      summaryPl: "L+M / non-labor-only w rejectach i brak kwalifikowanych obs.",
      findings: [
        {
          code: "LM_REJECTED",
          severity: "block",
          messagePl: "Źródła L+M nie mogą wejść do OUR RATE.",
        },
      ],
      candidateRatePln: null,
      unit: pack.unit,
      evidence: pack,
      companyPriceUsedAsOurRate: false,
      aiAutoAccept: false,
      expertMayWrite: false,
      expertMayAccept: false,
    };
  }

  const findings: LaborRateExpertFinding[] = [];
  let stance: LaborRateExpertStance = "RECOMMEND_ACCEPT";
  let confidence: LaborRateExpertConfidence = "high";

  if (pack.lowSample || pack.sampleSize < 3) {
    stance = "RECOMMEND_CAUTION";
    confidence = "low";
    findings.push({
      code: "LOW_SAMPLE",
      severity: "caution",
      messagePl: `Mała próbka (n=${pack.sampleSize}, regional=${pack.regionalSampleCount}).`,
    });
  }

  const spread = spreadPct(pack);
  if (spread != null && spread >= LABOR_RATE_SPREAD_PCT_CAUTION) {
    stance = "RECOMMEND_CAUTION";
    if (confidence === "high") confidence = "medium";
    findings.push({
      code: "HIGH_SPREAD",
      severity: "caution",
      messagePl: `Duży rozrzut obserwacji (~${spread}% vs mediana). Próg ostrożności: ${LABOR_RATE_SPREAD_PCT_CAUTION}%.`,
    });
  }

  if (
    pack.deltaPct != null &&
    Math.abs(pack.deltaPct) >= LABOR_RATE_DELTA_PCT_CAUTION
  ) {
    stance = "RECOMMEND_CAUTION";
    if (confidence === "high") confidence = "medium";
    findings.push({
      code: "LARGE_DELTA_VS_PREVIOUS",
      severity: "caution",
      messagePl: `Duża zmiana vs poprzednia OUR RATE: ${pack.deltaPct}% (Δ ${pack.deltaPln} PLN). Próg: ${LABOR_RATE_DELTA_PCT_CAUTION}%.`,
    });
  }

  if (pack.unitIncompatibleCount > 0) {
    findings.push({
      code: "UNIT_REJECTS_PRESENT",
      severity: "info",
      messagePl: `${pack.unitIncompatibleCount} źródeł odrzuconych (unit mismatch) — nie w medianie.`,
    });
  }

  if (stance === "RECOMMEND_ACCEPT" && confidence === "high") {
    findings.push({
      code: "EVIDENCE_OK",
      severity: "info",
      messagePl: "Evidence labor-only spójne · mediana z qualify · Owner nadal musi Accept.",
    });
  }

  const prevBit =
    pack.previousOurRatePln != null
      ? ` Poprzednia OUR RATE: ${pack.previousOurRatePln} PLN/${pack.unit}` +
        (pack.deltaPln != null ? ` (Δ ${pack.deltaPln} / ${pack.deltaPct}%).` : ".")
      : " Brak poprzedniej OUR RATE.";

  const stancePl =
    stance === "RECOMMEND_ACCEPT"
      ? "Rekomendacja: można zaakceptować"
      : stance === "RECOMMEND_CAUTION"
        ? "Rekomendacja: ostrożnie"
        : stance === "RECOMMEND_REJECT"
          ? "Rekomendacja: odrzuć"
          : "Brak rekomendacji";

  const summaryPl =
    `${stancePl} — kandydat ${pack.candidateRatePln} PLN/${pack.unit} · region ${pack.requestedRegionScope} · ` +
    `n=${pack.sampleSize} (regional ${pack.regionalSampleCount})` +
    (pack.lowSample ? " · mała próbka" : "") +
    `.${prevBit} Ekspert tylko informuje — Owner musi Accept. AI nie zapisuje.`;

  return {
    stance,
    confidence,
    summaryPl,
    findings,
    candidateRatePln: pack.candidateRatePln,
    unit: pack.unit,
    evidence: pack,
    companyPriceUsedAsOurRate: false,
    aiAutoAccept: false,
    expertMayWrite: false,
    expertMayAccept: false,
  };
}

/**
 * Convenience: GAP / non-candidate → NO_RECOMMENDATION without inventing pack.
 */
export function analyzeLaborRateFromResearchStatus(input: {
  status: string;
  candidate?: WorkRateResearchCandidate | null;
  rejects?: readonly WorkRateResearchRejectRow[] | null;
  ctx?: LaborRateEvidenceContext | null;
}): LaborRateExpertRecommendation {
  if (input.status !== "CANDIDATE" || !input.candidate) {
    return noRec(
      `Status research=${input.status} — brak CANDIDATE, zero rekomendacji stawki.`,
      [
        {
          code: "NOT_CANDIDATE",
          severity: "block",
          messagePl: "Expert działa dopiero po CANDIDATE.",
        },
      ],
    );
  }
  const pack = buildLaborRateEvidencePack(
    input.candidate,
    input.rejects,
    input.ctx,
  );
  return analyzeLaborRateCandidate({
    pack,
    sourceCandidate: input.candidate,
  });
}
