/**
 * P0.2 — interpretacja wyników TF → pełny kontrakt Eksperta Wykonania.
 */

import type { TechnologyDecisionResult, TechnologyPack } from "@/lib/technology-foundation";
import type {
  ExecutionExpertBlocker,
  ExecutionExpertConfidence,
  ExecutionExpertContract,
  ExecutionGapOrRisk,
  ExecutionPackSelection,
  ExecutionPcrAlignment,
} from "./types";

export function buildExecutionExpertContract(opts: {
  selection: ExecutionPackSelection | null;
  pack: TechnologyPack | null;
  decision: TechnologyDecisionResult | null;
  gapsAndRisks: ExecutionGapOrRisk[];
  tenderId?: string;
}): ExecutionExpertContract {
  const { selection, pack, decision, gapsAndRisks, tenderId } = opts;

  const blockers: ExecutionExpertBlocker[] = [];

  if (!selection || !pack) {
    blockers.push({
      code: "EXEC_NO_TECHNOLOGY",
      messagePl: "Nie dobrano Technology Pack do robót z przedmiaru.",
      kind: "uncovered_boq_line",
    });
  }

  if (decision?.decision === "deny") {
    for (const i of decision.reasons.filter((r) => r.layer !== "decision" || r.code !== "OK")) {
      blockers.push({ code: i.code, messagePl: i.message, kind: "execution_risk" });
    }
    if (blockers.length === 0) {
      blockers.push({
        code: "EXEC_TF_DENY",
        messagePl: "Technology Foundation odrzuciła Pack (deny).",
        kind: "execution_risk",
      });
    }
  }

  for (const g of gapsAndRisks) {
    if (g.kind === "hidden_work" || g.kind === "uncovered_boq_line") continue;
    if (g.code.startsWith("STRUCT_") && g.code.includes("BLOCK")) {
      blockers.push({ code: g.code, messagePl: g.messagePl, kind: g.kind });
    }
    if (g.code.includes("BIZ_") && decision?.business.blockingIssues.some((b) => g.code.endsWith(b.code))) {
      blockers.push({ code: g.code, messagePl: g.messagePl, kind: g.kind });
    }
  }

  // Explicit business/structural blockers
  if (decision) {
    for (const i of decision.structural.blockingIssues) {
      if (!blockers.some((b) => b.code === i.code)) {
        blockers.push({ code: i.code, messagePl: i.message, kind: "execution_risk" });
      }
    }
    for (const i of decision.business.blockingIssues) {
      if (!blockers.some((b) => b.code === i.code)) {
        blockers.push({ code: i.code, messagePl: i.message, kind: "execution_risk" });
      }
    }
  }

  const hiddenCount = gapsAndRisks.filter((g) => g.kind === "hidden_work").length;
  const riskCount = gapsAndRisks.filter((g) => g.kind === "execution_risk").length;

  let pewnosc: ExecutionExpertConfidence = "low";
  if (selection && pack && decision) {
    if (decision.decision === "deny") pewnosc = "low";
    else if (selection.score >= 100 && decision.decision === "allow" && hiddenCount === 0) pewnosc = "high";
    else if (selection.score >= 100 && (decision.decision === "allow" || decision.decision === "degrade")) {
      pewnosc = hiddenCount > 2 || riskCount > 3 ? "medium" : "high";
    } else if (selection.score >= 50) pewnosc = "medium";
    else pewnosc = "low";
  }

  let zgodnosc: ExecutionPcrAlignment = "not_aligned";
  let zgodnoscOpisPl = "Brak spójnego rozumienia wykonania — nie dobrano technologii.";
  if (selection && pack && decision) {
    if (decision.decision === "deny" || blockers.length > 0) {
      zgodnosc = "not_aligned";
      zgodnoscOpisPl =
        "Decyzja wykonania niespójna z możliwościami / walidacją — wymagana korekta przed wyceną.";
    } else if (hiddenCount > 0 || decision.decision === "degrade") {
      zgodnosc = "partial";
      zgodnoscOpisPl =
        "Rozumienie wykonania częściowe: dobrano technologię, lecz wykryto braki, ryzyka lub ostrzeżenia.";
    } else {
      zgodnosc = "aligned";
      zgodnoscOpisPl = "Dobór technologii i plan wykonania są zgodne z rozumieniem robót z przedmiaru.";
    }
  }

  const co = !selection || !pack
    ? "Nie ustalono technologii wykonania dla przedmiaru."
    : `Wybrano technologię „${pack.namePl}” (${pack.packId}@${pack.packVersion}); wyprowadzono plan etapów, pakiet robót i zestawienie zasobów (bez cen).`;

  const dlaczego = !selection
    ? "Żaden ACTIVE Pack nie osiągnął progu dopasowania do opisów / katalogu pozycji przedmiaru."
    : `Dopasowanie wynika z: ${selection.matchReasonsPl.join("; ") || "oceny receptury Pack"}.` +
      (decision
        ? ` Walidacja Technology Foundation: ${decision.decision}.`
        : "");

  const basisParts: string[] = [];
  if (tenderId) basisParts.push(`sprawa/przetarg ${tenderId}`);
  basisParts.push("pozycje OfferBoq (przedmiar)");
  if (selection) {
    basisParts.push(`Pack ${selection.packId}@${selection.packVersion}`);
    basisParts.push(`linie: ${selection.matchedLineIds.join(", ") || "—"}`);
  }
  if (gapsAndRisks.length) {
    basisParts.push(`luki/ryzyka: ${gapsAndRisks.length}`);
  }
  basisParts.push("Technology Foundation (Plan / Bundle / BOM — bez PLN)");

  return {
    co,
    dlaczego,
    naPodstawieCzego: basisParts.join(" · "),
    pewnosc,
    blokery: blockers,
    zgodnoscZRozumieniemWykonania: zgodnosc,
    zgodnoscOpisPl,
  };
}
