/**
 * P0.4 — roboty ukryte / braki względem Pack / ryzyka wykonania.
 */

import type { OfferBoqDocument } from "@/lib/tender-offer-boq";
import type {
  ExplainIssue,
  TechnologyDecisionResult,
  TechnologyPack,
} from "@/lib/technology-foundation";
import { isOfferBoqLineEligibleForExecution } from "./offer-boq-adapter";
import type { ExecutionGapOrRisk, ExecutionPackSelection } from "./types";

function foldPl(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ź/g, "z")
    .replace(/ż/g, "z")
    .replace(/\s+/g, " ")
    .trim();
}

function lineCoversCatalogWork(
  doc: Pick<OfferBoqDocument, "lines">,
  catalogWorkId: string,
): { covered: boolean; lineId?: string } {
  const id = catalogWorkId.trim();
  for (const line of doc.lines ?? []) {
    if (!isOfferBoqLineEligibleForExecution(line)) continue;
    if (line.catalogWorkId?.trim() === id) {
      return { covered: true, lineId: line.lineId };
    }
  }
  // Opisowe pokrycie: fragment nazwy kroku w opisie (słabe)
  const stepToken = foldPl(id.split(".").pop() || id);
  if (stepToken.length >= 4) {
    for (const line of doc.lines ?? []) {
      if (!isOfferBoqLineEligibleForExecution(line)) continue;
      const text = foldPl(`${line.description} ${line.normalizedDescription || ""}`);
      if (text.includes(stepToken)) return { covered: true, lineId: line.lineId };
    }
  }
  return { covered: false };
}

export function detectExecutionGapsAndRisks(opts: {
  doc: Pick<OfferBoqDocument, "lines">;
  pack: TechnologyPack | null;
  selection: ExecutionPackSelection | null;
  decision: TechnologyDecisionResult | null;
}): ExecutionGapOrRisk[] {
  const out: ExecutionGapOrRisk[] = [];
  const { doc, pack, selection, decision } = opts;

  if (!pack || !selection) {
    const uncovered = (doc.lines ?? []).filter(isOfferBoqLineEligibleForExecution);
    for (const line of uncovered.slice(0, 40)) {
      out.push({
        kind: "uncovered_boq_line",
        code: "EXEC_NO_PACK",
        messagePl: `Brak dobranej technologii wykonania dla pozycji: ${line.description.slice(0, 80)}`,
        relatedLineId: line.lineId,
        relatedCatalogWorkId: line.catalogWorkId ?? undefined,
      });
    }
    if (uncovered.length === 0) {
      out.push({
        kind: "execution_risk",
        code: "EXEC_EMPTY_BOQ",
        messagePl: "Przedmiar nie zawiera pozycji kwalifikujących się do analizy wykonania.",
      });
    }
    return out;
  }

  const matched = new Set(selection.matchedLineIds);

  // Kroki Pack bez pokrycia w przedmiarze → roboty ukryte / towarzyszące
  for (const step of pack.steps) {
    const { covered, lineId } = lineCoversCatalogWork(doc, step.catalogWorkId);
    if (!covered) {
      out.push({
        kind: "hidden_work",
        code: "EXEC_HIDDEN_STEP",
        messagePl: `Robota towarzysząca / potencjalnie ukryta w przedmiarze: „${step.namePl}” (${step.catalogWorkId})`,
        relatedStepId: step.stepId,
        relatedCatalogWorkId: step.catalogWorkId,
        relatedLineId: lineId,
      });
    }
  }

  // Wymagania regulacyjne → ryzyko
  for (const reg of pack.regulatory) {
    if (!reg.required) continue;
    out.push({
      kind: "execution_risk",
      code: "EXEC_REG_RISK",
      messagePl: `Ryzyko wykonania / wymóg: ${reg.namePl}`,
      relatedCatalogWorkId: reg.regulatoryId,
    });
  }

  // Linie OfferBoq poza matched set (przy wybranym Pack) → brak w technologii
  for (const line of doc.lines ?? []) {
    if (!isOfferBoqLineEligibleForExecution(line)) continue;
    if (matched.has(String(line.lineId))) continue;
    out.push({
      kind: "missing_in_boq",
      code: "EXEC_LINE_OUTSIDE_PACK",
      messagePl: `Pozycja poza dobraną technologią „${pack.namePl}”: ${line.description.slice(0, 80)}`,
      relatedLineId: line.lineId,
      relatedCatalogWorkId: line.catalogWorkId ?? undefined,
    });
  }

  const pushIssues = (issues: ExplainIssue[], kind: ExecutionGapOrRisk["kind"], prefix: string) => {
    for (const i of issues) {
      out.push({
        kind,
        code: `${prefix}_${i.code}`,
        messagePl: i.message,
      });
    }
  };

  if (decision) {
    pushIssues(decision.structural.blockingIssues, "execution_risk", "STRUCT");
    pushIssues(decision.business.blockingIssues, "execution_risk", "BIZ");
    pushIssues(decision.structural.warnings, "execution_risk", "STRUCT_WARN");
    pushIssues(decision.business.warnings, "execution_risk", "BIZ_WARN");
  }

  return out;
}
