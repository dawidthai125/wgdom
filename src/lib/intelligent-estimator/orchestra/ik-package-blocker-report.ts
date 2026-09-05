/**
 * W4-2 — Package Gate blocker transparency (read-only).
 * REUSE: computePositionCostShadowAndGate · evaluatePackageGate · ShadowGapCode.
 * ZERO gate threshold changes · ZERO second PLN path.
 */

import type { TenderPackage } from "@/lib/multi-dwelling/types";
import { evaluatePackageGate } from "@/lib/multi-dwelling/package-gate";
import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import { computePositionCostShadowAndGate } from "@/lib/tender-position-cost/bid-position-cost-cutover";
import type {
  ShadowGapCode,
  ShadowPositionCostLineResult,
} from "@/lib/tender-position-cost/boq-shadow-adapter";

export type IkPackageBlockerClassification =
  | "IDENTITY_GAP"
  | "OUR_RATE_GAP"
  | "MATERIAL_GAP"
  | "EQUIPMENT_GAP"
  | "TRANSPORT_GAP"
  | "AUXILIARY_GAP"
  | "OTHER_GAP";

export type IkPackageBlockerLine = {
  dwellingId: string;
  lineId: string;
  lp: string;
  description: string;
  gapCode: ShadowGapCode;
  classification: IkPackageBlockerClassification;
  suggestedActionPl: string;
  blocksPackageGate: boolean;
};

export type IkPackageBlockerReport = {
  tenderId: string;
  packageGatePass: boolean;
  packageGateReasonsPl: string[];
  blockers: IkPackageBlockerLine[];
  billableLineCount: number;
  completeLineCount: number;
  gapLineCount: number;
};

function classifyGap(code: ShadowGapCode): IkPackageBlockerClassification {
  switch (code) {
    case "BRAK_IDENTYFIKACJI_ROBOTY":
    case "NIEJEDNOZNACZNA_ROBOTA":
    case "NIEPRAWIDLOWA_JEDNOSTKA":
      return "IDENTITY_GAP";
    case "NIEPRAWIDLOWA_ILOSC":
    case "BOQ_QUANTITY_HOLD":
      return "OTHER_GAP";
    case "BRAK_STAWKI_ROBOT":
    case "PRZETERMINOWANA_STAWKA_ROBOT":
      return "OUR_RATE_GAP";
    case "BRAK_TECHNOLOGII_BOM":
    case "BRAK_NORMY_MATERIALOWEJ":
    case "BRAK_MATERIAL_KEY":
    case "BRAK_CENY_MATERIALU":
    case "PRZETERMINOWANA_CENA_MATERIALU":
    case "BRAK_KONWERSJI_JEDNOSTEK":
      return "MATERIAL_GAP";
    case "EQUIPMENT_OUT_OF_SCOPE":
    case "EQUIPMENT_OWNER_INPUT_INVALID":
      return "EQUIPMENT_GAP";
    case "TRANSPORT_OUT_OF_SCOPE":
    case "TRANSPORT_OWNER_INPUT_INVALID":
      return "TRANSPORT_GAP";
    case "AUXILIARY_OUT_OF_SCOPE":
      return "AUXILIARY_GAP";
    default:
      return "OTHER_GAP";
  }
}

function suggestedActionFor(code: ShadowGapCode): string {
  switch (code) {
    case "BRAK_IDENTYFIKACJI_ROBOTY":
      return "Przypisz catalogWorkId (manual / Owner KNR map / alias).";
    case "NIEJEDNOZNACZNA_ROBOTA":
      return "Wybierz jedną pracę z kandydatów — bez auto-wyboru.";
    case "NIEPRAWIDLOWA_JEDNOSTKA":
      return "Popraw jednostkę BOQ lub Owner unit compatibility.";
    case "NIEPRAWIDLOWA_ILOSC":
      return "Uzupełnij ilość pozycji (qty>0) — Owner Review · bez invent.";
    case "BOQ_QUANTITY_HOLD":
      return "Quantity HOLD (S4-B) — Owner resolve · bez silent fallback.";
    case "BRAK_STAWKI_ROBOT":
    case "PRZETERMINOWANA_STAWKA_ROBOT":
      return "Owner Accept → OUR RATE w Work Catalog (P5 EC).";
    case "BRAK_CENY_MATERIALU":
    case "PRZETERMINOWANA_CENA_MATERIALU":
    case "BRAK_MATERIAL_KEY":
    case "BRAK_NORMY_MATERIALOWEJ":
    case "BRAK_TECHNOLOGII_BOM":
    case "BRAK_KONWERSJI_JEDNOSTEK":
      return "Owner Accept → Price Memory SELL (P6 EC) lub uzupełnij BOM.";
    case "EQUIPMENT_OUT_OF_SCOPE":
    case "EQUIPMENT_OWNER_INPUT_INVALID":
      return "Owner Input — stawka sprzętu (tender-scoped).";
    case "TRANSPORT_OUT_OF_SCOPE":
    case "TRANSPORT_OWNER_INPUT_INVALID":
      return "Owner Input — stawka transportu bid_candidate.";
    case "AUXILIARY_OUT_OF_SCOPE":
      return "Transport pomocniczy poza bid — weryfikacja klasyfikacji linii.";
    case "NIEPRAWIDLOWA_ILOSC":
      return "Popraw ilość w BOQ.";
    default:
      return "Rozwiąż GAP zgodnie z F5 shadow — bez obejścia packageGate.";
  }
}

function primaryGapCode(line: ShadowPositionCostLineResult): ShadowGapCode {
  if (line.gaps.length > 0) return line.gaps[0]!;
  switch (line.identity.status) {
    case "NO_IDENTITY":
      return "BRAK_IDENTYFIKACJI_ROBOTY";
    case "AMBIGUOUS":
      return "NIEJEDNOZNACZNA_ROBOTA";
    case "INVALID_UNIT":
      return "NIEPRAWIDLOWA_JEDNOSTKA";
    case "EQUIPMENT_GAP":
      return "EQUIPMENT_OUT_OF_SCOPE";
    case "TRANSPORT_GAP":
      return "TRANSPORT_OUT_OF_SCOPE";
    case "AUXILIARY_GAP":
      return "AUXILIARY_OUT_OF_SCOPE";
    default:
      return "BRAK_STAWKI_ROBOT";
  }
}

function lineBlocksPackage(line: ShadowPositionCostLineResult): boolean {
  if (line.identity.status === "NOISE_SKIP") return false;
  return !line.positionComplete;
}

function blockerFromLine(
  dwellingId: string,
  line: ShadowPositionCostLineResult,
  blocksPackageGate: boolean,
): IkPackageBlockerLine {
  const gapCode = primaryGapCode(line);
  return {
    dwellingId,
    lineId: line.lineId,
    lp: line.lp,
    description: line.description,
    gapCode,
    classification: classifyGap(gapCode),
    suggestedActionPl: suggestedActionFor(gapCode),
    blocksPackageGate,
  };
}

/**
 * Per-line blockers for package gate — REUSE F5 shadow evaluation only.
 */
export function buildIkPackageBlockerReport(
  pkg: TenderPackage,
  store: WorkCatalogStore,
  opts?: { nowMs?: number; ensureOwnerQuestions?: boolean },
): IkPackageBlockerReport {
  const nowMs = opts?.nowMs ?? Date.now();
  const ensureOwnerQuestions = opts.ensureOwnerQuestions ?? false;
  const packageGate = evaluatePackageGate(pkg);
  const blockers: IkPackageBlockerLine[] = [];
  let billableLineCount = 0;
  let completeLineCount = 0;
  let gapLineCount = 0;

  for (const dwelling of pkg.dwellings) {
    const offerBoq = dwelling.offerBoq;
    if (!offerBoq || !(offerBoq.lines?.length > 0)) continue;

    const dwellingId = normalizeDwellingId(dwelling.dwellingId);
    const { shadow } = computePositionCostShadowAndGate({
      doc: offerBoq,
      store,
      nowMs,
      tenderId: pkg.tenderId,
      dwellingId,
      ensureOwnerQuestions,
    });

    billableLineCount += shadow.aggregates.completeLineCount + shadow.aggregates.gapLineCount;
    completeLineCount += shadow.aggregates.completeLineCount;
    gapLineCount += shadow.aggregates.gapLineCount;

    for (const line of shadow.lines) {
      if (!lineBlocksPackage(line)) continue;
      blockers.push(
        blockerFromLine(dwellingId, line, !packageGate.pass),
      );
    }
  }

  blockers.sort((a, b) => {
    const dw = a.dwellingId.localeCompare(b.dwellingId, "pl");
    if (dw !== 0) return dw;
    const lp = a.lp.localeCompare(b.lp, "pl", { numeric: true });
    if (lp !== 0) return lp;
    return a.lineId.localeCompare(b.lineId, "pl");
  });

  return {
    tenderId: pkg.tenderId,
    packageGatePass: packageGate.pass,
    packageGateReasonsPl: [...packageGate.reasonsPl],
    blockers,
    billableLineCount,
    completeLineCount,
    gapLineCount,
  };
}
