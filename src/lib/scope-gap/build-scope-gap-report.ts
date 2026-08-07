/**
 * SCOPE-COMPLETENESS-01 Stage A — pure builder (RO).
 * Prod emit: scope-completeness-a1 · cap 12.
 * Compat: buildScopeGapReportMvp1 → scope-gap-mvp-1 · cap 8.
 * Zero mutacji Bid / AI-COST / Quotes / S4.
 */

import {
  expectedCodesForTemplateA1,
  isCodePresentInBlobA1,
  rationaleForGapA1,
  SCOPE_GAP_A1_LABEL_PL,
  severityForGapA1,
} from "./rules-a1";
import {
  expectedCodesForTemplate,
  isCodePresentInBlob,
  rationaleForGap,
  SCOPE_GAP_LABEL_PL,
  severityForGap,
  normalizeScopeGapText,
} from "./rules-mvp-1";
import {
  SCOPE_COMPLETENESS_A1_EMPTY_WARNINGS_PL,
  SCOPE_COMPLETENESS_A1_ENGINE_VERSION,
  SCOPE_COMPLETENESS_A1_WARNINGS_CAP,
  SCOPE_GAP_MVP_DISCLAIMER_PL,
  SCOPE_GAP_MVP_EMPTY_WARNINGS_PL,
  SCOPE_GAP_MVP_ENGINE_VERSION,
  SCOPE_GAP_MVP_WARNINGS_CAP,
  type ScopeGapEngineVersion,
  type ScopeGapInvestmentTemplate,
  type ScopeGapMvpInput,
  type ScopeGapReport,
  type ScopeGapRuleCode,
  type ScopeGapWarning,
} from "./types";

const SEVERITY_RANK: Record<ScopeGapWarning["severity"], number> = {
  high: 0,
  warn: 1,
  info: 2,
};

type RulesPack = {
  engineVersion: ScopeGapEngineVersion;
  cap: number;
  emptyPl: string;
  expected: (
    template: ScopeGapInvestmentTemplate,
    presentNormalized: string,
  ) => readonly ScopeGapRuleCode[];
  isPresent: (code: ScopeGapRuleCode, blobNormalized: string) => boolean;
  severity: (opts: {
    template: ScopeGapInvestmentTemplate;
    code: ScopeGapRuleCode;
    swzHit: boolean;
  }) => { severity: ScopeGapWarning["severity"]; confidence: number };
  rationale: (opts: {
    code: ScopeGapRuleCode;
    template: ScopeGapInvestmentTemplate;
    swzHit: boolean;
  }) => string;
  label: Record<ScopeGapRuleCode, string>;
};

const PACK_A1: RulesPack = {
  engineVersion: SCOPE_COMPLETENESS_A1_ENGINE_VERSION,
  cap: SCOPE_COMPLETENESS_A1_WARNINGS_CAP,
  emptyPl: SCOPE_COMPLETENESS_A1_EMPTY_WARNINGS_PL,
  expected: expectedCodesForTemplateA1,
  isPresent: isCodePresentInBlobA1,
  severity: severityForGapA1,
  rationale: rationaleForGapA1,
  label: SCOPE_GAP_A1_LABEL_PL,
};

const PACK_MVP1: RulesPack = {
  engineVersion: SCOPE_GAP_MVP_ENGINE_VERSION,
  cap: SCOPE_GAP_MVP_WARNINGS_CAP,
  emptyPl: SCOPE_GAP_MVP_EMPTY_WARNINGS_PL,
  expected: expectedCodesForTemplate,
  isPresent: isCodePresentInBlob,
  severity: severityForGap,
  rationale: rationaleForGap,
  label: SCOPE_GAP_LABEL_PL,
};

function emptyUnavailable(
  reason: string,
  computedAt: string,
  template: ScopeGapInvestmentTemplate,
  engineVersion: ScopeGapEngineVersion,
): ScopeGapReport {
  return {
    available: false,
    emptyReasonPl: reason,
    engineVersion,
    investmentTemplate: template,
    warnings: [],
    disclaimerPl: SCOPE_GAP_MVP_DISCLAIMER_PL,
    computedAt,
  };
}

function buildWithPack(input: ScopeGapMvpInput, pack: RulesPack): ScopeGapReport {
  const computedAt = input.computedAtIso || "1970-01-01T00:00:00.000Z";
  const template = input.investmentTemplate;

  try {
    if (!input.hasOfferBoqLines || input.lineCount < 1) {
      return emptyUnavailable(
        "Brak pozycji OfferBoq — luki zakresu niedostępne.",
        computedAt,
        template,
        pack.engineVersion,
      );
    }

    const athNorm = normalizeScopeGapText(input.presentTextBlob);
    const swzNorm =
      input.swzTextBlob != null && String(input.swzTextBlob).trim()
        ? normalizeScopeGapText(input.swzTextBlob)
        : "";

    const expected = pack.expected(template, athNorm);
    const warnings: ScopeGapWarning[] = [];

    for (const code of expected) {
      const athPresent = pack.isPresent(code, athNorm);
      if (athPresent) continue;

      const swzHit = swzNorm ? pack.isPresent(code, swzNorm) : false;
      const { severity, confidence } = pack.severity({ template, code, swzHit });
      const sources: ScopeGapWarning["sources"] = swzHit ? ["rule", "swz"] : ["rule"];

      warnings.push({
        id: `scope_gap:${code}`,
        code,
        labelPl: pack.label[code],
        severity,
        confidence,
        rationalePl: pack.rationale({ code, template, swzHit }),
        evidencePresentPl: athPresent
          ? "Wykryto w przedmiarze"
          : swzHit
            ? "Brak w przedmiarze; sygnał w SWZ"
            : "Brak typowych tokenów w przedmiarze",
        sources,
      });

      if (warnings.length >= pack.cap) break;
    }

    warnings.sort((a, b) => {
      const sr = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (sr !== 0) return sr;
      return a.code.localeCompare(b.code);
    });

    const capped = warnings.slice(0, pack.cap);

    return {
      available: true,
      emptyReasonPl: capped.length === 0 ? pack.emptyPl : null,
      engineVersion: pack.engineVersion,
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
      pack.engineVersion,
    );
  }
}

/** Prod Stage A — engine scope-completeness-a1 · cap 12. */
export function buildScopeGapReport(input: ScopeGapMvpInput): ScopeGapReport {
  return buildWithPack(input, PACK_A1);
}

/** Compat / regresja MVP — engine scope-gap-mvp-1 · cap 8. */
export function buildScopeGapReportMvp1(input: ScopeGapMvpInput): ScopeGapReport {
  return buildWithPack(input, PACK_MVP1);
}
