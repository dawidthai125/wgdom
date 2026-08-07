/**
 * P0.3 — braki technologiczne, braki względem przedmiaru, niezgodne materiały.
 */

import type { ExecutionExpertAnalysisResult } from "@/lib/execution-expert";
import type { TechnologyPack } from "@/lib/technology-foundation";
import type { MaterialGapOrRisk, MaterialLineAssessment } from "./types";

export function detectMaterialGaps(opts: {
  execution: ExecutionExpertAnalysisResult;
  pack: TechnologyPack | null;
  lines: MaterialLineAssessment[];
}): MaterialGapOrRisk[] {
  const out: MaterialGapOrRisk[] = [];
  const { execution, pack, lines } = opts;

  if (!pack || !execution.bom) {
    out.push({
      kind: "tech_missing",
      code: "MAT_NO_EXEC_BOM",
      messagePl:
        "Brak BOM / Pack z Eksperta Wykonania — nie można potwierdzić systemu materiałowego.",
    });
    return out;
  }

  const bomKeys = new Set((execution.bom.materials ?? []).map((m) => m.materialKey));
  const assessedKeys = new Set(lines.map((l) => l.materialKey));

  // Braki technologiczne: Pack wymaga materiału, którego nie ma w BOM
  for (const m of pack.materials) {
    if (!bomKeys.has(m.materialKey)) {
      out.push({
        kind: "tech_missing",
        code: "MAT_TECH_MISSING",
        messagePl: `Brak technologiczny: receptura wymaga „${m.namePl}” (${m.materialKey}), brak w BOM.`,
        materialKey: m.materialKey,
      });
    }
  }

  // Niezgodne: w BOM, spoza Pack / conformity niezgodny
  for (const line of lines) {
    if (line.conformity === "niezgodny") {
      out.push({
        kind: "incompatible",
        code: "MAT_INCOMPATIBLE",
        messagePl:
          line.notePl ||
          `Materiał niezgodny z technologią: ${line.namePl} (${line.materialKey}).`,
        materialKey: line.materialKey,
      });
    }
  }

  // Braki względem przedmiaru: EE wskazał ukryte roboty / luki — materiały powiązane z brakującymi krokami
  for (const g of execution.gapsAndRisks ?? []) {
    if (g.kind === "hidden_work") {
      out.push({
        kind: "boq_missing",
        code: "MAT_BOQ_HIDDEN_WORK",
        messagePl: `Ryzyko braku materiałowego względem przedmiaru (ukryta robota EE): ${g.messagePl}`,
        materialKey: undefined,
      });
    }
    if (g.kind === "uncovered_boq_line") {
      out.push({
        kind: "boq_missing",
        code: "MAT_BOQ_UNCOVERED",
        messagePl: `Pozycja przedmiaru bez technologii — materiały niepotwierdzone: ${g.messagePl}`,
      });
    }
  }

  // Jeśli EE partial/not_aligned — sygnał kompletności materiałowej względem przedmiaru
  if (
    execution.contract.zgodnoscZRozumieniemWykonania === "not_aligned" ||
    execution.contract.zgodnoscZRozumieniemWykonania === "partial"
  ) {
    const hasBoqGap = out.some((x) => x.kind === "boq_missing");
    if (!hasBoqGap && execution.contract.zgodnoscZRozumieniemWykonania === "not_aligned") {
      out.push({
        kind: "boq_missing",
        code: "MAT_BOQ_EXEC_MISALIGN",
        messagePl:
          "Ekspert Wykonania zgłosił brak zgodności z rozumieniem wykonania — zestaw materiałów może być niekompletny względem przedmiaru.",
      });
    }
  }

  // Martwe klucze w assessment bez Pack (już covered) — noop
  void assessedKeys;

  return out;
}
