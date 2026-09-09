/**
 * GO21 — AUTO_G1_ACCEPT contract evaluation (pure · no LS write · no Owner click).
 *
 * Policy: docs/architecture/AUTO-G1-ACCEPT-DECISION-FRAMEWORK.md
 * Master SSOT §12.2.1
 *
 * Confidence: NO invented numeric threshold — rule-based lock OR single surviving
 * trusted-method candidate with matchConfidence !== "low" (reuse OfferBoqConfidence enum).
 */

import type {
  OfferBoqConfidence,
  OfferBoqLine,
  OfferBoqMatchCandidate,
  OfferBoqMatchMethod,
} from "@/lib/tender-offer-boq";
import { hasCompleteTrustedIdentityTuple } from "@/lib/intelligent-estimator/ik-identity-trusted-preserve";

export const AUTO_G1_MATCH_METHOD = "auto_contract" as const satisfies OfferBoqMatchMethod;

export type AutoG1Decision = "AUTO_G1_ACCEPT" | "AUTO_G1_EXCEPTION";

export type AutoG1ContractResult = {
  decision: AutoG1Decision;
  catalogWorkId: string | null;
  ruleId: string | null;
  matchConfidence: OfferBoqConfidence | null;
  reasons: string[];
  filteredCandidateIds: string[];
  discardedContaminationIds: string[];
  evaluatedAtIso: string;
};

/** Contamination / false-friend work IDs for GK cladding descriptions. */
export const AUTO_G1_GK_CONTAMINATION_WORK_IDS: ReadonlySet<string> = new Set([
  "legacy-gladzie_tynki-m2",
  "cw.etics.render",
]);

/** Locked preference for GK cladding family (scianki package over plain GK). */
export const AUTO_G1_GK_LOCKED_WINNER = "cc-w2-scianki-dzialowe-gr-pakiet-m2";
export const AUTO_G1_GK_COMPETING_PLAIN = "legacy-gk-m2";

export const AUTO_G1_RULE_GK_CLADDING_SCIANKI = "auto_g1.gk_cladding.scianki_pakiet_v1";

function normDesc(line: OfferBoqLine): string {
  return String(line.normalizedDescription || line.description || "");
}

function candidateIds(line: OfferBoqLine): string[] {
  return [
    ...new Set(
      (line.candidateMatches ?? [])
        .map((c) => String(c.catalogWorkId || "").trim())
        .filter(Boolean),
    ),
  ];
}

/** Header / publisher noise — not a work position. */
export function isAutoG1NoiseDescription(description: string): boolean {
  const d = String(description || "").trim();
  if (!d) return true;
  if (/^\s*Warszawa(\s+[\d,.]+)?\s*$/i.test(d)) return true;
  if (/^\s*W-wa(\s+[\d,.]+)?\s*$/i.test(d)) return true;
  if (/IZOiEPB\s+ORGBUD/i.test(d) && !/Badanie|pomiar|uziem|skute|hydroizol/i.test(d)) {
    return true;
  }
  if (/^\s*d\.\d[!|]?\s+\d{4}-\d{2}\s*$/i.test(d)) return true;
  if (d.length < 8) return true;
  return false;
}

/** GK cladding / drywall lining on ceiling grid (generic — not tender-specific). */
export function isGkCladdingFamilyDescription(description: string): boolean {
  const d = String(description || "");
  const hasGk =
    /płyt\w*\s+gipsowo[- ]?kartonow|gipsowo[- ]?kartonow|GKF|okładzin\w*.*gips/i.test(d) ||
    (/suche\s+tynk/i.test(d) && /gips/i.test(d));
  const hasCeilingGrid = /strop|ruszt/i.test(d);
  const hasKnr = /2006\s*[-–]\s*04|2006-04/.test(d);
  return hasGk && (hasCeilingGrid || hasKnr || /okładzin/i.test(d));
}

export function isWindowSashFamilyDescription(description: string): boolean {
  return /Dopasowanie\s+skrzydeł\s+okienn/i.test(String(description || ""));
}

function exception(
  reasons: string[],
  extras: {
    evaluatedAtIso: string;
    filteredCandidateIds?: string[];
    discardedContaminationIds?: string[];
  },
): AutoG1ContractResult {
  return {
    decision: "AUTO_G1_EXCEPTION",
    catalogWorkId: null,
    ruleId: null,
    matchConfidence: null,
    reasons,
    filteredCandidateIds: extras.filteredCandidateIds ?? [],
    discardedContaminationIds: extras.discardedContaminationIds ?? [],
    evaluatedAtIso: extras.evaluatedAtIso,
  };
}

function accept(
  catalogWorkId: string,
  ruleId: string,
  matchConfidence: OfferBoqConfidence,
  reasons: string[],
  filteredCandidateIds: string[],
  discardedContaminationIds: string[],
  evaluatedAtIso: string,
): AutoG1ContractResult {
  return {
    decision: "AUTO_G1_ACCEPT",
    catalogWorkId,
    ruleId,
    matchConfidence,
    reasons,
    filteredCandidateIds,
    discardedContaminationIds,
    evaluatedAtIso,
  };
}

/**
 * Pure contract evaluation — no persistence, no manualOverrides.
 */
export function evaluateAutoG1Contract(
  line: OfferBoqLine,
  opts?: { nowMs?: number },
): AutoG1ContractResult {
  const evaluatedAtIso = new Date(opts?.nowMs ?? Date.now()).toISOString();
  const desc = normDesc(line);
  const ids = candidateIds(line);

  // Already durable trusted — caller should preserve; contract is N/A (not ACCEPT again).
  if (hasCompleteTrustedIdentityTuple(line)) {
    return exception(["ALREADY_TRUSTED_IDENTITY — preserve; AUTO skip"], {
      evaluatedAtIso,
      filteredCandidateIds: ids,
    });
  }

  const unit = String(line.unit || "").trim();
  if (!unit) {
    return exception(["INVALID_OR_MISSING_UNIT"], {
      evaluatedAtIso,
      filteredCandidateIds: ids,
    });
  }

  if (isAutoG1NoiseDescription(desc)) {
    return exception(["NOISE_OR_HEADER_DESCRIPTION"], {
      evaluatedAtIso,
      filteredCandidateIds: ids,
    });
  }

  if (isWindowSashFamilyDescription(desc)) {
    return exception(["WINDOW_SASH_FAMILY_NO_LOCKED_RULE"], {
      evaluatedAtIso,
      filteredCandidateIds: ids,
    });
  }

  // --- GK cladding locked rule (generic) ---
  if (isGkCladdingFamilyDescription(desc)) {
    const discarded = ids.filter((id) => AUTO_G1_GK_CONTAMINATION_WORK_IDS.has(id));
    const filtered = ids.filter((id) => !AUTO_G1_GK_CONTAMINATION_WORK_IDS.has(id));

    if (filtered.includes(AUTO_G1_GK_LOCKED_WINNER)) {
      return accept(
        AUTO_G1_GK_LOCKED_WINNER,
        AUTO_G1_RULE_GK_CLADDING_SCIANKI,
        "high",
        [
          "GK_CLADDING_FAMILY",
          "CONTAMINATION_FILTERED",
          `LOCKED_WINNER=${AUTO_G1_GK_LOCKED_WINNER}`,
          filtered.includes(AUTO_G1_GK_COMPETING_PLAIN)
            ? `PREFERENCE_OVER=${AUTO_G1_GK_COMPETING_PLAIN}`
            : "NO_PLAIN_GK_COMPETITOR",
        ],
        filtered,
        discarded,
        evaluatedAtIso,
      );
    }

    return exception(
      [
        "GK_CLADDING_FAMILY",
        "CONTAMINATION_FILTERED",
        "LOCKED_WINNER_ABSENT_FROM_CANDIDATES",
        "FAIL_CLOSED",
      ],
      {
        evaluatedAtIso,
        filteredCandidateIds: filtered,
        discardedContaminationIds: discarded,
      },
    );
  }

  // GO21 safety: no generic "single eligible" AUTO — mapper may surface one wrong
  // catalog_map hit (e.g. hydroizolacja → glazura). Locked family rules only.
  // Future GO may add additional locked rules; not first-candidate / not max-score.
  if (ids.length >= 2) {
    return exception(
      ["COMPETING_OR_UNRESOLVED_CANDIDATES", "NO_LOCKED_FAMILY_RULE", "FAIL_CLOSED"],
      {
        evaluatedAtIso,
        filteredCandidateIds: ids,
        discardedContaminationIds: ids.filter((id) =>
          AUTO_G1_GK_CONTAMINATION_WORK_IDS.has(id),
        ),
      },
    );
  }

  return exception(
    [
      ids.length === 0 ? "NO_CANDIDATES" : "NO_LOCKED_FAMILY_RULE",
      "FAIL_CLOSED",
    ],
    { evaluatedAtIso, filteredCandidateIds: ids },
  );
}

/**
 * Apply AUTO accept onto a mapped OfferBoq line (pure). Preserves other candidates for audit.
 */
export function applyAutoG1AcceptToLine(
  line: OfferBoqLine,
  result: AutoG1ContractResult,
): OfferBoqLine {
  if (result.decision !== "AUTO_G1_ACCEPT" || !result.catalogWorkId) {
    return line;
  }
  const rationale = [`AUTO_G1_ACCEPT rule=${result.ruleId}`, ...result.reasons].join(" · ");
  const primary: OfferBoqMatchCandidate = {
    catalogWorkId: result.catalogWorkId,
    workNamePl: result.catalogWorkId,
    workCategory: "",
    tradeId: null,
    score: 0,
    role: "primary",
    matchedBy: AUTO_G1_MATCH_METHOD,
    matchConfidence: result.matchConfidence ?? "high",
    rationale,
  };
  const rest = (line.candidateMatches ?? []).filter(
    (c) => c.catalogWorkId !== result.catalogWorkId,
  );
  return {
    ...line,
    catalogWorkId: result.catalogWorkId,
    matchMethod: AUTO_G1_MATCH_METHOD,
    matchedBy: AUTO_G1_MATCH_METHOD,
    matchConfidence: result.matchConfidence ?? "high",
    aiConfidence: result.matchConfidence ?? "high",
    aiRationale: rationale,
    candidateMatches: [primary, ...rest],
    warnings: (line.warnings ?? []).filter((w) => !String(w).startsWith("AUTO_G1_EXCEPTION")),
  };
}

/**
 * Annotate EXCEPTION without fabricating identity (keeps candidates).
 */
export function applyAutoG1ExceptionToLine(
  line: OfferBoqLine,
  result: AutoG1ContractResult,
): OfferBoqLine {
  const tag = `AUTO_G1_EXCEPTION:${result.reasons.join("|")}`;
  const warnings = [
    ...(line.warnings ?? []).filter((w) => !String(w).startsWith("AUTO_G1_EXCEPTION")),
    tag,
  ];
  return {
    ...line,
    warnings,
    aiRationale: [line.aiRationale, tag].filter(Boolean).join(" · ") || tag,
  };
}
