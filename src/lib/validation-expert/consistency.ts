/**
 * Validation Expert — Consistency C1–C8 (LOCKED DF).
 * Pure read of ChiefDecydentDossier — no analyze* / no mutate.
 */

import type { ChiefDecydentDossier } from "@/lib/chief-orchestrator";
import { buildFinding } from "./findings";
import type {
  ValidationFinding,
  ValidationFindingCode,
  ValidationFindingSource,
  ValidationRulePass,
} from "./types";

const TRACE_LEGS = [
  "execution",
  "materials",
  "pricing",
  "cost",
  "offer",
] as const satisfies readonly ValidationFindingSource[];

function isReady(dossier: ChiefDecydentDossier): boolean {
  return dossier.status === "ready_for_decydent";
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

export function runConsistencyChecks(dossier: ChiefDecydentDossier): ValidationRulePass {
  const findings: ValidationFinding[] = [];
  const checksRun: ValidationFindingCode[] = [];
  const ready = isReady(dossier);

  // C1
  if (ready) {
    checksRun.push("VAL_C1_MISSING_COST_OR_OFFER");
    if (dossier.experts.cost === null || dossier.experts.offer === null) {
      findings.push(
        buildFinding({
          code: "VAL_C1_MISSING_COST_OR_OFFER",
          severity: "hard",
          category: "completeness",
          source: "dossier",
          messagePl:
            "Przy statusie ready_for_decydent brakuje snapshota Cost lub Offer w dossier.",
          recommendationPl:
            "Upewnij się, że łańcuch Experts zakończył Cost i Offer przed walidacją jakości.",
          evidence: {
            path: "experts.cost|experts.offer",
            values: {
              costPresent: dossier.experts.cost !== null,
              offerPresent: dossier.experts.offer !== null,
              status: dossier.status,
            },
          },
        }),
      );
    }
  }

  // C2
  if (ready) {
    const a = dossier.decisionMakerPayload?.realCostPln;
    const b = dossier.offerHandoffPayload?.realCostPln;
    if (isFiniteNumber(a) && isFiniteNumber(b)) {
      checksRun.push("VAL_C2_REAL_IDENTITY_MISMATCH");
      if (Math.abs(a - b) > 0.01) {
        findings.push(
          buildFinding({
            code: "VAL_C2_REAL_IDENTITY_MISMATCH",
            severity: "hard",
            category: "consistency",
            source: "cross_chain",
            messagePl: `Niespójność Real Cost: Decydent ${a} PLN vs handoff Cost ${b} PLN.`,
            recommendationPl:
              "Sprawdź tożsamość Real Cost między Cost handoff a sygnałem Oferty (bez przeliczania).",
            evidence: {
              path: "decisionMakerPayload.realCostPln",
              values: {
                decisionMakerRealCostPln: a,
                handoffRealCostPln: b,
                absDiff: Math.abs(a - b),
              },
            },
          }),
        );
      }
    }
  }

  // C3
  if (ready) {
    checksRun.push("VAL_C3_MISSING_DECYDENT_SIGNAL");
    if (dossier.decisionMakerPayload == null) {
      findings.push(
        buildFinding({
          code: "VAL_C3_MISSING_DECYDENT_SIGNAL",
          severity: "hard",
          category: "completeness",
          source: "offer",
          messagePl: "Brak decisionMakerPayload przy statusie ready_for_decydent.",
          recommendationPl: "Offer Expert powinien wystawić sygnał Decydenta przed QA.",
          evidence: {
            path: "decisionMakerPayload",
            expert: "offer",
            values: { decisionMakerPayload: null, status: dossier.status },
          },
        }),
      );
    }
  }

  // C4
  if (ready && dossier.experts.materials != null) {
    const completeness = dossier.experts.materials.completeness;
    if (typeof completeness === "string") {
      checksRun.push("VAL_C4_ME_INCOMPLETE");
      if (completeness === "niekompletny") {
        findings.push(
          buildFinding({
            code: "VAL_C4_ME_INCOMPLETE",
            severity: "hard",
            category: "completeness",
            source: "materials",
            messagePl: "System materiałów oceniony jako niekompletny przy ready_for_decydent.",
            recommendationPl: "Uzupełnij materiały / Pack coverage przed decyzją jakościową.",
            evidence: {
              path: "experts.materials.completeness",
              expert: "materials",
              values: {
                completeness,
                note: dossier.experts.materials.completenessNotePl ?? null,
              },
            },
          }),
        );
      }
    }
  }

  // C5 — always when flag true (evaluated when reading flags)
  checksRun.push("VAL_C5_RESIDUAL_RETURN");
  if (dossier.returnFlags.returnToMaterialExpert === true) {
    findings.push(
      buildFinding({
        code: "VAL_C5_RESIDUAL_RETURN",
        severity: "soft",
        category: "risk",
        source: "dossier",
        messagePl: "Residual returnToMaterialExpert po LOOP PE→ME.",
        recommendationPl: "Decydent: oceń ryzyko rynkowe / dostępność mimo kontynuacji łańcucha.",
        evidence: {
          path: "returnFlags.returnToMaterialExpert",
          values: {
            returnToMaterialExpert: true,
            requiresReanalysis: dossier.returnFlags.requiresReanalysis,
            loopCount: dossier.loopCount,
          },
        },
      }),
    );
  }

  // C6
  if (ready) {
    checksRun.push("VAL_C6_TRACE_NOT_ALIGNED");
    for (const leg of TRACE_LEGS) {
      const trace = dossier.traces[leg];
      if (!trace) continue;
      if (trace.zgodnoscZRozumieniemWykonania === "not_aligned") {
        findings.push(
          buildFinding({
            code: "VAL_C6_TRACE_NOT_ALIGNED",
            severity: "hard",
            category: "consistency",
            source: leg,
            messagePl: `Trace ${leg}: zgodność = not_aligned.`,
            recommendationPl: "Napraw alignment eksperta przed uznaniem kosztorysu za zweryfikowany.",
            evidence: {
              path: `traces.${leg}.zgodnoscZRozumieniemWykonania`,
              expert: leg,
              traceField: "zgodnoscZRozumieniemWykonania",
              values: {
                zgodnosc: "not_aligned",
                opis: trace.zgodnoscOpisPl ?? null,
              },
            },
            ordinal: TRACE_LEGS.indexOf(leg),
          }),
        );
      }
    }
  }

  // C7
  for (const leg of TRACE_LEGS) {
    const expert = dossier.experts[leg];
    const trace = dossier.traces[leg];
    if (expert !== null && trace === null) {
      checksRun.push("VAL_C7_TRACE_MISSING");
      findings.push(
        buildFinding({
          code: "VAL_C7_TRACE_MISSING",
          severity: "soft",
          category: "completeness",
          source: leg,
          messagePl: `Snapshot eksperta ${leg} obecny, ale brak Trace contract.`,
          recommendationPl: "Uzupełnij kontrakt Trace dla przejrzystości Decydenta.",
          evidence: {
            path: `traces.${leg}`,
            expert: leg,
            values: { expertPresent: true, tracePresent: false },
          },
          ordinal: TRACE_LEGS.indexOf(leg),
        }),
      );
    }
  }
  // Mark C7 run if any expert present (even when all traces OK)
  if (
    !checksRun.includes("VAL_C7_TRACE_MISSING") &&
    TRACE_LEGS.some((leg) => dossier.experts[leg] !== null)
  ) {
    checksRun.push("VAL_C7_TRACE_MISSING");
  }

  // C8
  const primary = dossier.primaryRecommendation;
  const scenarios = dossier.scenarios;
  if (primary != null && Array.isArray(scenarios) && scenarios.length > 0) {
    checksRun.push("VAL_C8_PRIMARY_NOT_IN_SCENARIOS");
    const p = primary.offerPricePln;
    if (isFiniteNumber(p)) {
      const match = scenarios.some((s) => {
        const sp = s?.breakdown?.offerPricePln ?? (s as { offerPricePln?: number })?.offerPricePln;
        return isFiniteNumber(sp) && Math.abs(sp - p) <= 0.01;
      });
      if (!match) {
        findings.push(
          buildFinding({
            code: "VAL_C8_PRIMARY_NOT_IN_SCENARIOS",
            severity: "soft",
            category: "consistency",
            source: "offer",
            messagePl: "Cena primaryRecommendation nie występuje w scenarios (tolerancja 0.01).",
            recommendationPl: "Sprawdź spójność scenariuszy Oferty z rekomendacją główną.",
            evidence: {
              path: "primaryRecommendation.offerPricePln",
              expert: "offer",
              values: {
                primaryOfferPricePln: p,
                scenariosCount: scenarios.length,
              },
            },
          }),
        );
      }
    }
  }

  return { findings, checksRun };
}
