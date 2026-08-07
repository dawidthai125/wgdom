/**
 * Validation Expert — QA rules Q1–Q6 (LOCKED DF).
 * Pure read — graceful skip when fields absent.
 */

import type { ChiefDecydentDossier } from "@/lib/chief-orchestrator";
import { buildFinding } from "./findings";
import type { ValidationFinding, ValidationFindingCode, ValidationRulePass } from "./types";

const TRACE_LEGS = ["execution", "materials", "pricing", "cost", "offer"] as const;

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

export function runQaRules(dossier: ChiefDecydentDossier): ValidationRulePass {
  const findings: ValidationFinding[] = [];
  const checksRun: ValidationFindingCode[] = [];

  // Q1 — comparative outlier
  const comparative =
    dossier.offerHandoffPayload?.comparative ?? dossier.experts.cost?.comparative ?? null;
  const pct = comparative?.realVsMarketMaterialsPct;
  if (comparative && isFiniteNumber(pct)) {
    checksRun.push("VAL_Q1_COMPARATIVE_OUTLIER");
    const abs = Math.abs(pct);
    if (abs > 40) {
      const severity = abs > 80 ? "hard" : "soft";
      findings.push(
        buildFinding({
          code: "VAL_Q1_COMPARATIVE_OUTLIER",
          severity,
          category: "qa",
          source: "cost",
          messagePl: `Odchylenie Real vs Market materiałów = ${pct.toFixed(1)}% (próg Soft 40 / Hard 80).`,
          recommendationPl:
            "Zweryfikuj Real Cost względem rynku — comparative jest informacyjne, bez przeliczania.",
          evidence: {
            path: "offerHandoffPayload.comparative.realVsMarketMaterialsPct",
            expert: "cost",
            values: {
              realVsMarketMaterialsPct: pct,
              thresholdSoft: 40,
              thresholdHard: 80,
            },
          },
        }),
      );
    }
  }

  // Q2 — material coverage
  const coverage = dossier.experts.materials?.packMaterialCoverage;
  if (coverage && typeof coverage.required === "number" && coverage.required > 0) {
    checksRun.push("VAL_Q2_LOW_MATERIAL_COVERAGE");
    const covered = typeof coverage.conforming === "number" ? coverage.conforming : 0;
    const ratio = covered / coverage.required;
    if (ratio < 0.7) {
      findings.push(
        buildFinding({
          code: "VAL_Q2_LOW_MATERIAL_COVERAGE",
          severity: "soft",
          category: "completeness",
          source: "materials",
          messagePl: `Niskie pokrycie materiałów Pack: ${covered}/${coverage.required} (${(ratio * 100).toFixed(0)}% < 70%).`,
          recommendationPl: "Popraw zgodność BOM z Pack przed decyzją.",
          evidence: {
            path: "experts.materials.packMaterialCoverage",
            expert: "materials",
            values: {
              conforming: covered,
              required: coverage.required,
              present: coverage.present ?? null,
              ratio,
            },
          },
        }),
      );
    }
  }

  // Q3 — PE risk / freshness concentration
  const peLines = dossier.experts.pricing?.lines;
  if (Array.isArray(peLines) && peLines.length > 0) {
    checksRun.push("VAL_Q3_PRICE_RISK_CONCENTRATION");
    const risky = peLines.filter((l) => {
      const highRisk = l?.priceRisk === "high";
      const staleFresh = l?.freshness === "stale" || l?.freshness === "missing";
      return highRisk || staleFresh;
    });
    const share = risky.length / peLines.length;
    if (share >= 0.3) {
      findings.push(
        buildFinding({
          code: "VAL_Q3_PRICE_RISK_CONCENTRATION",
          severity: "soft",
          category: "risk",
          source: "pricing",
          messagePl: `Koncentracja ryzyka rynkowego: ${(share * 100).toFixed(0)}% linii PE (high risk / stale).`,
          recommendationPl: "Przejrzyj świeżość quote i ryzyko cen przed Decydentem.",
          evidence: {
            path: "experts.pricing.lines",
            expert: "pricing",
            values: {
              riskyLines: risky.length,
              totalLines: peLines.length,
              share,
            },
          },
        }),
      );
    }
  }

  // Q4 — low confidence rollup
  const lowTraces = TRACE_LEGS.filter((leg) => dossier.traces[leg]?.pewnosc === "low");
  if (TRACE_LEGS.some((leg) => dossier.traces[leg] != null)) {
    checksRun.push("VAL_Q4_LOW_CONFIDENCE_ROLLUP");
    if (lowTraces.length >= 2) {
      findings.push(
        buildFinding({
          code: "VAL_Q4_LOW_CONFIDENCE_ROLLUP",
          severity: "soft",
          category: "trace_rollup",
          source: "cross_chain",
          messagePl: `Co najmniej 2 Trace z pewnością low (${lowTraces.join(", ")}).`,
          recommendationPl: "Podnieś jakość wejść ekspertów o niskiej pewności.",
          evidence: {
            path: "traces.*.pewnosc",
            values: { lowCount: lowTraces.length, legs: lowTraces.join(",") },
          },
        }),
      );
    }
  }

  // Q5 — expert blocker rollup (soft; not C6)
  let blockerSum = 0;
  for (const leg of TRACE_LEGS) {
    const b = dossier.traces[leg]?.blokery;
    if (Array.isArray(b)) blockerSum += b.length;
  }
  if (TRACE_LEGS.some((leg) => dossier.traces[leg] != null)) {
    checksRun.push("VAL_Q5_EXPERT_BLOCKER_ROLLUP");
    if (blockerSum >= 1) {
      findings.push(
        buildFinding({
          code: "VAL_Q5_EXPERT_BLOCKER_ROLLUP",
          severity: "soft",
          category: "trace_rollup",
          source: "cross_chain",
          messagePl: `Rollup blockerów Trace: ${blockerSum} łącznie (soft; alignment osobno w C6).`,
          recommendationPl: "Przejrzyj lokalne blokery ekspertów w Trace.",
          evidence: {
            path: "traces.*.blokery",
            values: { blockerSum },
          },
        }),
      );
    }
  }

  // Q6 — partial purchase / completenessOk
  const cost = dossier.experts.cost;
  if (cost != null) {
    checksRun.push("VAL_Q6_PARTIAL_PURCHASE_IMPACT");
    const notes = [
      ...(cost.comparative?.notesPl ?? []),
      ...(dossier.offerHandoffPayload?.comparative?.notesPl ?? []),
    ];
    const notesJoined = notes.join(" ").toLowerCase();
    const partialSignal =
      notesJoined.includes("partial") ||
      notesJoined.includes("częściow") ||
      notesJoined.includes("czesciow") ||
      notesJoined.includes("niepełn") ||
      notesJoined.includes("niepeln");
    const completenessFail = cost.completenessOk === false;
    if (completenessFail || partialSignal) {
      findings.push(
        buildFinding({
          code: "VAL_Q6_PARTIAL_PURCHASE_IMPACT",
          severity: "soft",
          category: "qa",
          source: "cost",
          messagePl: completenessFail
            ? "Cost completenessOk=false — wpływ na pewność oferty."
            : "Sygnał partial purchase / niepełnych zakupów w comparative notes.",
          recommendationPl: "Uzupełnij dane zakupowe lub zaakceptuj ryzyko Soft przed Decydentem.",
          evidence: {
            path: "experts.cost.completenessOk",
            expert: "cost",
            values: {
              completenessOk: cost.completenessOk,
              partialSignal,
            },
          },
        }),
      );
    }
  }

  return { findings, checksRun };
}
