/**
 * Validation Expert — public analyze API.
 * IN: wyłącznie ChiefDecydentDossier (RO).
 */

import type { ChiefDecydentDossier } from "@/lib/chief-orchestrator";
import { runConsistencyChecks } from "./consistency";
import {
  dedupeFindings,
  filterHard,
  filterSoft,
  mergeChecksRun,
  sortFindings,
} from "./findings";
import { runQaRules } from "./qa-rules";
import { buildValidationContract } from "./trace";
import type { ValidationExpertAnalysisResult, ValidationReport } from "./types";
import { buildSummaryPl, computeVerdict } from "./verdict";

export function analyzeValidationFromDossier(
  dossier: ChiefDecydentDossier,
): ValidationExpertAnalysisResult {
  const consistency = runConsistencyChecks(dossier);
  const qa = runQaRules(dossier);

  const findings = sortFindings(
    dedupeFindings([...consistency.findings, ...qa.findings]),
  );
  const hardFindings = filterHard(findings);
  const softFindings = filterSoft(findings);

  const { verdict, hardCount, softCount, softLimit } = computeVerdict(findings);
  const checksRun = mergeChecksRun(consistency.checksRun, qa.checksRun);

  const summaryPl = buildSummaryPl({ verdict, hardCount, softCount, softLimit });

  const notesPl = [
    ...dossier.orchestrationNotesPl.slice(0, 5),
    ...dossier.handoffBlockersPl.slice(0, 5),
  ];

  const report: ValidationReport = {
    summaryPl,
    checksRun,
    hardCount,
    softCount,
    softLimit,
    chainCoverage: {
      execution: dossier.experts.execution !== null,
      materials: dossier.experts.materials !== null,
      pricing: dossier.experts.pricing !== null,
      cost: dossier.experts.cost !== null,
      offer: dossier.experts.offer !== null,
    },
    notesPl,
  };

  const contract = buildValidationContract({
    dossier,
    verdict,
    hardFindings,
    checksRun,
    summaryPl,
  });

  return {
    contract,
    findings,
    hardFindings,
    softFindings,
    report,
    verdict,
  };
}
