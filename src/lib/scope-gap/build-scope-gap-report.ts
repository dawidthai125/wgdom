/**
 * Scope Gap MVP — pure builder (RO). engineVersion = scope-gap-mvp-1.
 * DF: SCOPE-GAP-MVP-THIN-DESIGN-FREEZE-01.
 * Zero mutacji Bid / AI-COST / Quotes / History.
 */

import {
  expectedCodesForTemplate,
  isCodePresentInBlob,
  normalizeScopeGapText,
  rationaleForGap,
  SCOPE_GAP_LABEL_PL,
  severityForGap,
} from "./rules-mvp-1";
import {
  SCOPE_GAP_MVP_DISCLAIMER_PL,
  SCOPE_GAP_MVP_EMPTY_WARNINGS_PL,
  SCOPE_GAP_MVP_ENGINE_VERSION,
  type ScopeGapMvpInput,
  type ScopeGapReport,
  type ScopeGapWarning,
} from "./types";

const WARNINGS_CAP = 8;

const SEVERITY_RANK: Record<ScopeGapWarning["severity"], number> = {
  high: 0,
  warn: 1,
  info: 2,
};

function emptyUnavailable(reason: string, computedAt: string, template: ScopeGapMvpInput["investmentTemplate"]): ScopeGapReport {
  return {
    available: false,
    emptyReasonPl: reason,
    engineVersion: SCOPE_GAP_MVP_ENGINE_VERSION,
    investmentTemplate: template,
    warnings: [],
    disclaimerPl: SCOPE_GAP_MVP_DISCLAIMER_PL,
    computedAt,
  };
}

/**
 * Buduje raport luk zakresu — pure, fail-soft.
 * Fail-soft pustego OfferBoq: available=false + emptyReason (Decision IMPL).
 */
export function buildScopeGapReport(input: ScopeGapMvpInput): ScopeGapReport {
  const computedAt = input.computedAtIso || "1970-01-01T00:00:00.000Z";
  const template = input.investmentTemplate;

  try {
    if (!input.hasOfferBoqLines || input.lineCount < 1) {
      return emptyUnavailable(
        "Brak pozycji OfferBoq — luki zakresu niedostępne.",
        computedAt,
        template,
      );
    }

    const athNorm = normalizeScopeGapText(input.presentTextBlob);
    const swzNorm =
      input.swzTextBlob != null && String(input.swzTextBlob).trim()
        ? normalizeScopeGapText(input.swzTextBlob)
        : "";

    const expected = expectedCodesForTemplate(template, athNorm);
    const warnings: ScopeGapWarning[] = [];

    for (const code of expected) {
      const athPresent = isCodePresentInBlob(code, athNorm);
      if (athPresent) continue;

      const swzHit = swzNorm ? isCodePresentInBlob(code, swzNorm) : false;
      const { severity, confidence } = severityForGap({ template, code, swzHit });
      const sources: ScopeGapWarning["sources"] = swzHit ? ["rule", "swz"] : ["rule"];

      warnings.push({
        id: `scope_gap:${code}`,
        code,
        labelPl: SCOPE_GAP_LABEL_PL[code],
        severity,
        confidence,
        rationalePl: rationaleForGap({ code, template, swzHit }),
        evidencePresentPl: athPresent
          ? "Wykryto w przedmiarze"
          : swzHit
            ? "Brak w przedmiarze; sygnał w SWZ"
            : "Brak typowych tokenów w przedmiarze",
        sources,
      });

      if (warnings.length >= WARNINGS_CAP) break;
    }

    warnings.sort((a, b) => {
      const sr = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (sr !== 0) return sr;
      return a.code.localeCompare(b.code);
    });

    const capped = warnings.slice(0, WARNINGS_CAP);

    return {
      available: true,
      emptyReasonPl: capped.length === 0 ? SCOPE_GAP_MVP_EMPTY_WARNINGS_PL : null,
      engineVersion: SCOPE_GAP_MVP_ENGINE_VERSION,
      investmentTemplate: template,
      warnings: capped,
      disclaimerPl: SCOPE_GAP_MVP_DISCLAIMER_PL,
      computedAt,
    };
  } catch {
    return emptyUnavailable(
      "Błąd obliczania luk zakresu (fail-soft).",
      computedAt,
      template,
    );
  }
}
