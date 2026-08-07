/**
 * Validation Expert — pełny kontrakt Trace (kształt Experts P0).
 */

import type { ChiefDecydentDossier } from "@/lib/chief-orchestrator";
import type {
  ValidationExpertContract,
  ValidationFinding,
  ValidationFindingCode,
  ValidationVerdict,
} from "./types";

export function buildValidationContract(opts: {
  dossier: ChiefDecydentDossier;
  verdict: ValidationVerdict;
  hardFindings: ValidationFinding[];
  checksRun: ValidationFindingCode[];
  summaryPl: string;
}): ValidationExpertContract {
  const { dossier, verdict, hardFindings, checksRun, summaryPl } = opts;

  const legs: string[] = [];
  if (dossier.experts.execution) legs.push("EE");
  if (dossier.experts.materials) legs.push("ME");
  if (dossier.experts.pricing) legs.push("PE");
  if (dossier.experts.cost) legs.push("Cost");
  if (dossier.experts.offer) legs.push("Offer");

  const pewnosc =
    verdict === "blocked" ? "low" : verdict === "needs_review" ? "medium" : "high";

  const zgodnoscZRozumieniemWykonania =
    verdict === "validated" ? "aligned" : verdict === "needs_review" ? "partial" : "not_aligned";

  return {
    co: "Walidacja jakości kosztorysu na kompletnym ChiefDecydentDossier (Consistency + QA).",
    dlaczego:
      "Gotowość orkiestracji (ready_for_decydent) nie oznacza jakości kosztorysu przed Decydentem.",
    naPodstawieCzego: `caseId=${dossier.caseId}; legi=[${legs.join(",") || "brak"}]; checks=${checksRun.join(",")}`,
    pewnosc,
    blokery: hardFindings.map((f) => ({ code: f.code, messagePl: f.messagePl })),
    zgodnoscZRozumieniemWykonania,
    zgodnoscOpisPl: summaryPl,
  };
}
