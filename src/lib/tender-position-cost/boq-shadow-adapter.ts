/**
 * TENDER-BOQ-PRICING-REBUILD-01 FAZA 4 — OfferBoq → shadow Position Cost (PARALLEL).
 *
 * REUSE: OfferBoq line identity · F1 OUR RATE · F3 BOM · F2 Price Memory · F0 engine
 * ZERO Bid cutover · ZERO mutacji OfferBoq pricing · ZERO HTTP/research
 * (no company catalog sell-price invent on this path)
 *
 * Wynik = osobny kontrakt shadow — nie nadpisuje linePricing ani pól Bid/Offer.
 */

import type {
  OfferBoqDocument,
  OfferBoqLine,
  OfferBoqMatchMethod,
} from "@/lib/tender-offer-boq";
import type { TechnologyPack } from "@/lib/technology-foundation";
import { normalizeWgdomCostUnit, type WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import { computePositionCost } from "@/lib/tender-position-cost/engine";
import {
  resolveTechnologyBomForWork,
  type BomTechnologyResolve,
} from "@/lib/tender-position-cost/bom-technology-adapter";
import {
  resolveLaborInputFromOurWorkRate,
  type OurRateLaborResolve,
} from "@/lib/tender-position-cost/our-rate-labor-adapter";
import {
  resolveMaterialInputFromPriceMemory,
  type MaterialSellResolve,
} from "@/lib/tender-position-cost/material-sell-adapter";
import type {
  PositionCostInput,
  PositionCostResult,
  PositionMaterialInput,
} from "@/lib/tender-position-cost/types";
import type { EquipmentComponentResult } from "@/lib/tender-position-cost/equipment-contract";
import type { TransportComponentResult } from "@/lib/tender-position-cost/transport-contract";
import { ensureOwnerRateQuestionForGap } from "@/lib/owner-rate-input";
import { resolveEquipmentFromOwnerInput } from "@/lib/tender-position-cost/owner-input-equipment-provider";
import { resolveTransportFromOwnerInput } from "@/lib/tender-position-cost/owner-input-transport-provider";
import {
  isTransportBidCandidate,
  isTransportUtylizacjaLine,
} from "@/lib/tender-position-cost/transport-bid-candidate";

export const SHADOW_POSITION_COST_SCHEMA_VERSION = 1 as const;

export type ShadowWorkIdentityStatus =
  | "OK"
  | "NO_IDENTITY"
  | "AMBIGUOUS"
  | "INVALID_UNIT"
  | "NOISE_SKIP"
  | "EQUIPMENT_GAP"
  | "EQUIPMENT_RESOLVED"
  | "TRANSPORT_GAP"
  | "TRANSPORT_RESOLVED"
  | "AUXILIARY_GAP";

export type ShadowGapCode =
  | "BRAK_IDENTYFIKACJI_ROBOTY"
  | "NIEJEDNOZNACZNA_ROBOTA"
  | "NIEPRAWIDLOWA_JEDNOSTKA"
  | "BRAK_STAWKI_ROBOT"
  | "PRZETERMINOWANA_STAWKA_ROBOT"
  | "BRAK_TECHNOLOGII_BOM"
  | "BRAK_NORMY_MATERIALOWEJ"
  | "BRAK_MATERIAL_KEY"
  | "BRAK_CENY_MATERIALU"
  | "PRZETERMINOWANA_CENA_MATERIALU"
  | "BRAK_KONWERSJI_JEDNOSTEK"
  | "EQUIPMENT_OUT_OF_SCOPE"
  | "EQUIPMENT_OWNER_INPUT_INVALID"
  | "TRANSPORT_OUT_OF_SCOPE"
  | "TRANSPORT_OWNER_INPUT_INVALID"
  | "AUXILIARY_OUT_OF_SCOPE"
  | "POMINIETO_NOISE"
  | "NIEPRAWIDLOWA_ILOSC";

const GAP_LABEL_PL: Record<ShadowGapCode, string> = {
  BRAK_IDENTYFIKACJI_ROBOTY: "BRAK IDENTYFIKACJI ROBOTY",
  NIEJEDNOZNACZNA_ROBOTA: "NIEJEDNOZNACZNA ROBOTA",
  NIEPRAWIDLOWA_JEDNOSTKA: "NIEPRAWIDŁOWA JEDNOSTKA",
  BRAK_STAWKI_ROBOT: "BRAK STAWKI ROBÓT",
  PRZETERMINOWANA_STAWKA_ROBOT: "PRZETERMINOWANA STAWKA ROBÓT",
  BRAK_TECHNOLOGII_BOM: "BRAK TECHNOLOGII / BOM",
  BRAK_NORMY_MATERIALOWEJ: "BRAK NORMY MATERIAŁOWEJ",
  BRAK_MATERIAL_KEY: "BRAK MATERIAL KEY",
  BRAK_CENY_MATERIALU: "BRAK CENY MATERIAŁU",
  PRZETERMINOWANA_CENA_MATERIALU: "PRZETERMINOWANA CENA MATERIAŁU",
  BRAK_KONWERSJI_JEDNOSTEK: "BRAK KONWERSJI JEDNOSTEK",
  EQUIPMENT_OUT_OF_SCOPE: "EQUIPMENT — brak Owner Input (GAP)",
  EQUIPMENT_OWNER_INPUT_INVALID: "EQUIPMENT — Owner Input INVALID (jednostka/stawka)",
  TRANSPORT_OUT_OF_SCOPE: "TRANSPORT — brak Owner Input (GAP)",
  TRANSPORT_OWNER_INPUT_INVALID: "TRANSPORT — Owner Input INVALID (jednostka/stawka)",
  AUXILIARY_OUT_OF_SCOPE: "TRANSPORT / AUXILIARY — OUT OF SCOPE",
  POMINIETO_NOISE: "POZYCJA NOISE — POMINIĘTA",
  NIEPRAWIDLOWA_ILOSC: "NIEPRAWIDŁOWA ILOŚĆ POZYCJI",
};

/** Metody identity uznane za pewne (bez category_heuristic / unmatched). */
const TRUSTED_MATCH: ReadonlySet<OfferBoqMatchMethod> = new Set([
  "exact_knr",
  "catalog_map",
  "alias",
  "manual",
]);

export type ShadowWorkIdentityResolve = {
  status: ShadowWorkIdentityStatus;
  statusLabelPl: string;
  workId: string | null;
  unit: WgdomCostUnit | null;
  unitRaw: string;
  matchMethod: OfferBoqMatchMethod | null;
  matchConfidence: string | null;
  gaps: ShadowGapCode[];
};

export type ShadowPositionCostLineResult = {
  lineId: string;
  lp: string;
  description: string;
  quantity: number;
  unitRaw: string;
  identity: ShadowWorkIdentityResolve;
  gaps: ShadowGapCode[];
  gapLabelsPl: string[];
  bom: BomTechnologyResolve | null;
  ourRate: OurRateLaborResolve | null;
  materialsResolved: MaterialSellResolve[];
  position: PositionCostResult | null;
  engineInput: PositionCostInput | null;
  /** Odczyt legacy (tylko raport Δ) — NIE używany w kalkulacji shadow. */
  legacyLineTotalPln: number | null;
  positionComplete: boolean;
  /** GO-1 — Owner Input Equipment resolution (null when not Equipment / unresolved). */
  equipment: EquipmentComponentResult | null;
  /** MODEL-1B — Owner Input Transport (null when not bid_candidate / unresolved). */
  transport: TransportComponentResult | null;
};

export type ShadowBoqPositionCostResult = {
  schemaVersion: typeof SHADOW_POSITION_COST_SCHEMA_VERSION;
  mode: "shadow";
  lineCount: number;
  lines: ShadowPositionCostLineResult[];
  aggregates: {
    completeLineCount: number;
    gapLineCount: number;
    skippedNoiseCount: number;
    laborCostPln: number | null;
    materialCostPln: number | null;
    /** SUM(resolved equipment totals) — 0 only when no Equipment lines resolved. */
    equipmentCostPln: number;
    /** SUM(resolved transport totals) — 0 when no Bid Transport resolved. */
    transportCostPln: number;
    totalPositionCostPln: number | null;
  };
};

function pushGap(gaps: ShadowGapCode[], code: ShadowGapCode): void {
  if (!gaps.includes(code)) gaps.push(code);
}

/**
 * Work identity z linii OfferBoq — REUSE pól mapowania.
 * NIE wybiera „pierwszego kandydata” przy ambiguity.
 */
export function resolveWorkIdentityFromOfferBoqLine(
  line: Pick<
    OfferBoqLine,
    | "catalogWorkId"
    | "unit"
    | "matchMethod"
    | "matchConfidence"
    | "candidateMatches"
    | "isNoise"
    | "noiseKind"
    | "costIntelligence"
    | "quantity"
  >,
): ShadowWorkIdentityResolve {
  const gaps: ShadowGapCode[] = [];
  const unitRaw = String(line.unit ?? "").trim();
  const unit = normalizeWgdomCostUnit(unitRaw);

  if (line.isNoise) {
    pushGap(gaps, "POMINIETO_NOISE");
    return {
      status: "NOISE_SKIP",
      statusLabelPl: GAP_LABEL_PL.POMINIETO_NOISE,
      workId: null,
      unit,
      unitRaw,
      matchMethod: line.matchMethod ?? null,
      matchConfidence: line.matchConfidence ?? null,
      gaps,
    };
  }

  const kind = line.costIntelligence?.lineKind;
  const noiseKind = line.noiseKind;
  // EQUIPMENT-01: Equipment ≠ Transport ≠ Auxiliary (D-EQ-01) — osobny GAP, nie AUXILIARY_GAP.
  if (kind === "Equipment") {
    pushGap(gaps, "EQUIPMENT_OUT_OF_SCOPE");
    return {
      status: "EQUIPMENT_GAP",
      statusLabelPl: GAP_LABEL_PL.EQUIPMENT_OUT_OF_SCOPE,
      workId: null,
      unit,
      unitRaw,
      matchMethod: line.matchMethod ?? null,
      matchConfidence: line.matchConfidence ?? null,
      gaps,
    };
  }
  if (noiseKind === "transport") {
    pushGap(gaps, "AUXILIARY_OUT_OF_SCOPE");
    return {
      status: "AUXILIARY_GAP",
      statusLabelPl: GAP_LABEL_PL.AUXILIARY_OUT_OF_SCOPE,
      workId: null,
      unit,
      unitRaw,
      matchMethod: line.matchMethod ?? null,
      matchConfidence: line.matchConfidence ?? null,
      gaps,
    };
  }

  if (!unit) {
    pushGap(gaps, "NIEPRAWIDLOWA_JEDNOSTKA");
    return {
      status: "INVALID_UNIT",
      statusLabelPl: GAP_LABEL_PL.NIEPRAWIDLOWA_JEDNOSTKA,
      workId: null,
      unit: null,
      unitRaw,
      matchMethod: line.matchMethod ?? null,
      matchConfidence: line.matchConfidence ?? null,
      gaps,
    };
  }

  const workId = String(line.catalogWorkId ?? "").trim() || null;
  const method = line.matchMethod;

  // Competing candidates (różne workId) przy nie-high exact → AMBIGUOUS
  const distinctCandidates = [
    ...new Set(
      (line.candidateMatches ?? [])
        .map((c) => String(c.catalogWorkId || "").trim())
        .filter(Boolean),
    ),
  ];
  const competing =
    distinctCandidates.length >= 2 &&
    method !== "manual" &&
    method !== "exact_knr" &&
    !(method === "alias" && line.matchConfidence === "high");

  if (competing) {
    pushGap(gaps, "NIEJEDNOZNACZNA_ROBOTA");
    return {
      status: "AMBIGUOUS",
      statusLabelPl: GAP_LABEL_PL.NIEJEDNOZNACZNA_ROBOTA,
      workId: null,
      unit,
      unitRaw,
      matchMethod: method,
      matchConfidence: line.matchConfidence ?? null,
      gaps,
    };
  }

  if (
    !workId ||
    method === "unmatched" ||
    method === "category_heuristic" ||
    !TRUSTED_MATCH.has(method) ||
    line.matchConfidence === "low"
  ) {
    pushGap(gaps, "BRAK_IDENTYFIKACJI_ROBOTY");
    return {
      status: "NO_IDENTITY",
      statusLabelPl: GAP_LABEL_PL.BRAK_IDENTYFIKACJI_ROBOTY,
      workId: null,
      unit,
      unitRaw,
      matchMethod: method,
      matchConfidence: line.matchConfidence ?? null,
      gaps,
    };
  }

  return {
    status: "OK",
    statusLabelPl: "IDENTITY OK",
    workId,
    unit,
    unitRaw,
    matchMethod: method,
    matchConfidence: line.matchConfidence ?? null,
    gaps: [],
  };
}

function noBomMaterialPlaceholder(): PositionMaterialInput {
  return {
    materialKey: null,
    status: "NO_BOM",
    quantity: null,
    quantityUnit: null,
    sellPricePln: null,
  };
}

function collectMaterialGaps(
  materials: MaterialSellResolve[],
  gaps: ShadowGapCode[],
): void {
  for (const m of materials) {
    if (m.status === "NO_KEY") pushGap(gaps, "BRAK_MATERIAL_KEY");
    if (m.status === "MISSING") pushGap(gaps, "BRAK_CENY_MATERIALU");
    if (m.status === "STALE") pushGap(gaps, "PRZETERMINOWANA_CENA_MATERIALU");
  }
}

function collectBomGaps(bom: BomTechnologyResolve, gaps: ShadowGapCode[]): void {
  if (bom.status === "MISSING_BOM" || bom.status === "AMBIGUOUS_BOM") {
    pushGap(gaps, "BRAK_TECHNOLOGII_BOM");
  }
  if (bom.status === "EMPTY_RECIPE" || bom.status === "INVALID_COMPONENT") {
    pushGap(gaps, "BRAK_NORMY_MATERIALOWEJ");
  }
  if (bom.status === "UNIT_CONVERSION_GAP") {
    pushGap(gaps, "BRAK_KONWERSJI_JEDNOSTEK");
  }
  if (bom.status === "INVALID_POSITION_QUANTITY") {
    pushGap(gaps, "NIEPRAWIDLOWA_ILOSC");
  }
}

export type ComputeShadowPositionCostForLineInput = {
  line: OfferBoqLine;
  store: WorkCatalogStore;
  nowMs: number;
  paintCoats?: 1 | 2 | null;
  packs?: readonly TechnologyPack[];
  targetMaterialUnit?: string | null;
  /**
   * GO-1 / MODEL-1B — tenderId for Owner Input Equipment / Transport resolution.
   * Absent → Equipment stays EQUIPMENT_GAP; Transport mark ignored without tenderId.
   */
  tenderId?: string | null;
  /** MULTI-DWELLING-01 — optional dwelling scope (DEFAULT when absent). */
  dwellingId?: string | null;
  /** When true (default if tenderId set), ensure Owner Rate Question on Equipment/Transport GAP. */
  ensureOwnerQuestions?: boolean;
};

/**
 * Jedna linia OfferBoq → shadow Position Cost (bez zapisu do linii).
 */
export function computeShadowPositionCostForOfferBoqLine(
  input: ComputeShadowPositionCostForLineInput,
): ShadowPositionCostLineResult {
  const { line, store, nowMs } = input;
  const gaps: ShadowGapCode[] = [];
  const identity = resolveWorkIdentityFromOfferBoqLine(line);
  for (const g of identity.gaps) pushGap(gaps, g);

  const base: ShadowPositionCostLineResult = {
    lineId: line.lineId,
    lp: line.lp,
    description: line.description,
    quantity: line.quantity,
    unitRaw: identity.unitRaw,
    identity,
    gaps,
    gapLabelsPl: [],
    bom: null,
    ourRate: null,
    materialsResolved: [],
    position: null,
    engineInput: null,
    legacyLineTotalPln:
      line.lineTotalPln != null && Number.isFinite(line.lineTotalPln)
        ? line.lineTotalPln
        : null,
    positionComplete: false,
    equipment: null,
    transport: null,
  };

  // 1) Noise — NEVER Owner Question / Bid Transport
  if (identity.status === "NOISE_SKIP") {
    base.gapLabelsPl = gaps.map((g) => GAP_LABEL_PL[g]);
    return base;
  }

  // 2) GO-1 — Equipment: Owner Input resolve (tender-scoped) · else GAP + ensure Q
  if (identity.status === "EQUIPMENT_GAP") {
    const tenderId = String(input.tenderId ?? "").trim();
    if (!tenderId) {
      base.gapLabelsPl = gaps.map((g) => GAP_LABEL_PL[g]);
      return base;
    }

    const namePl = String(line.description ?? "").trim() || "Sprzęt";
    const qty =
      typeof line.quantity === "number" && Number.isFinite(line.quantity)
        ? line.quantity
        : null;
    const unit = String(line.unit ?? "").trim() || null;

    if (
      input.ensureOwnerQuestions !== false &&
      qty != null &&
      qty > 0 &&
      unit
    ) {
      ensureOwnerRateQuestionForGap({
        tenderId,
        domain: "equipment",
        lineRef: line.lineId,
        dwellingId: input.dwellingId,
        evidenceSummaryPl: `Linia sprzętowa OfferBoq (${line.lp || line.lineId}): ${namePl} — brak stawki Owner Input.`,
        askedByRole: "chief",
        equipment: {
          namePl,
          quantity: qty,
          unit,
        },
      });
    }

    const equipment = resolveEquipmentFromOwnerInput({
      tenderId,
      lineId: line.lineId,
      namePl,
      quantity: qty,
      unit,
      dwellingId: input.dwellingId,
    });
    base.equipment = equipment;

    if (equipment.rateStatus === "RESOLVED" && equipment.totalPln != null) {
      // Clear EQUIPMENT_OUT_OF_SCOPE — resolved via owner_input
      base.gaps = gaps.filter((g) => g !== "EQUIPMENT_OUT_OF_SCOPE");
      base.identity = {
        ...identity,
        status: "EQUIPMENT_RESOLVED",
        statusLabelPl: "EQUIPMENT — Owner Input RESOLVED",
        gaps: base.gaps.slice(),
      };
      base.positionComplete = true;
      base.gapLabelsPl = base.gaps.map((g) => GAP_LABEL_PL[g]);
      return base;
    }

    if (equipment.rateStatus === "INVALID") {
      pushGap(gaps, "EQUIPMENT_OWNER_INPUT_INVALID");
      base.gaps = gaps;
      base.gapLabelsPl = gaps.map((g) => GAP_LABEL_PL[g]);
      return base;
    }

    // UNRESOLVED — keep EQUIPMENT_GAP
    base.gaps = gaps;
    base.gapLabelsPl = gaps.map((g) => GAP_LABEL_PL[g]);
    return base;
  }

  // 3) MODEL-1B — explicit bid_candidate only (never description / noise / CI)
  //    Utylizacja category → skip Bid Transport (fall through / AUX semantics).
  {
    const tenderId = String(input.tenderId ?? "").trim();
    if (
      tenderId &&
      isTransportBidCandidate(tenderId, line.lineId, input.dwellingId) &&
      !isTransportUtylizacjaLine(line)
    ) {
      const namePl = String(line.description ?? "").trim() || "Transport";
      const qty =
        typeof line.quantity === "number" && Number.isFinite(line.quantity)
          ? line.quantity
          : null;
      const unit = String(line.unit ?? "").trim() || null;

      pushGap(gaps, "TRANSPORT_OUT_OF_SCOPE");
      base.identity = {
        status: "TRANSPORT_GAP",
        statusLabelPl: GAP_LABEL_PL.TRANSPORT_OUT_OF_SCOPE,
        workId: null,
        unit: identity.unit,
        unitRaw: identity.unitRaw,
        matchMethod: line.matchMethod ?? null,
        matchConfidence: line.matchConfidence ?? null,
        gaps: gaps.slice(),
      };

      if (
        input.ensureOwnerQuestions !== false &&
        qty != null &&
        qty > 0 &&
        unit
      ) {
        ensureOwnerRateQuestionForGap({
          tenderId,
          domain: "transport",
          lineRef: line.lineId,
          dwellingId: input.dwellingId,
          evidenceSummaryPl: `Linia Bid Transport (${line.lp || line.lineId}): ${namePl} — brak stawki Owner Input.`,
          askedByRole: "chief",
          transport: {
            namePl,
            quantity: qty,
            unit,
          },
        });
      }

      const transport = resolveTransportFromOwnerInput({
        tenderId,
        lineId: line.lineId,
        namePl,
        quantity: qty,
        unit,
        dwellingId: input.dwellingId,
      });
      base.transport = transport;

      if (transport.rateStatus === "RESOLVED" && transport.totalPln != null) {
        base.gaps = gaps.filter((g) => g !== "TRANSPORT_OUT_OF_SCOPE");
        base.identity = {
          ...base.identity,
          status: "TRANSPORT_RESOLVED",
          statusLabelPl: "TRANSPORT — Owner Input RESOLVED",
          gaps: base.gaps.slice(),
        };
        base.positionComplete = true;
        base.gapLabelsPl = base.gaps.map((g) => GAP_LABEL_PL[g]);
        return base;
      }

      if (transport.rateStatus === "INVALID") {
        pushGap(gaps, "TRANSPORT_OWNER_INPUT_INVALID");
        base.gaps = gaps;
        base.identity = {
          ...base.identity,
          gaps: gaps.slice(),
        };
        base.gapLabelsPl = gaps.map((g) => GAP_LABEL_PL[g]);
        return base;
      }

      // UNRESOLVED — keep TRANSPORT_GAP
      base.gaps = gaps;
      base.gapLabelsPl = gaps.map((g) => GAP_LABEL_PL[g]);
      return base;
    }
  }

  // 4) orphan noiseKind=transport → AUXILIARY_GAP (NOT Bid Transport)
  if (identity.status === "AUXILIARY_GAP") {
    base.gapLabelsPl = gaps.map((g) => GAP_LABEL_PL[g]);
    return base;
  }

  if (identity.status !== "OK" || !identity.workId || !identity.unit) {
    base.gapLabelsPl = gaps.map((g) => GAP_LABEL_PL[g]);
    return base;
  }

  if (!Number.isFinite(line.quantity) || line.quantity < 0) {
    pushGap(gaps, "NIEPRAWIDLOWA_ILOSC");
    base.gaps = gaps;
    base.gapLabelsPl = gaps.map((g) => GAP_LABEL_PL[g]);
    return base;
  }

  const workId = identity.workId;
  const unit = identity.unit;

  const ourRate = resolveLaborInputFromOurWorkRate(store, workId, unit, nowMs);
  base.ourRate = ourRate;
  if (ourRate.status === "MISSING" || ourRate.status === "NO_IDENTITY") {
    pushGap(gaps, "BRAK_STAWKI_ROBOT");
  }
  if (ourRate.status === "STALE") {
    pushGap(gaps, "PRZETERMINOWANA_STAWKA_ROBOT");
  }

  const bom = resolveTechnologyBomForWork({
    workId,
    unit,
    positionQuantity: line.quantity,
    paintCoats: input.paintCoats,
    packs: input.packs,
    targetMaterialUnit: input.targetMaterialUnit,
  });
  base.bom = bom;
  collectBomGaps(bom, gaps);

  let materialsResolved: MaterialSellResolve[] = [];
  let materials: PositionMaterialInput[];

  if (bom.status === "OK") {
    materialsResolved = bom.materialSpecs.map((spec) =>
      resolveMaterialInputFromPriceMemory(store, spec, nowMs),
    );
    materials = materialsResolved.map((m) => m.material);
    collectMaterialGaps(materialsResolved, gaps);
  } else {
    materials = [noBomMaterialPlaceholder()];
  }

  base.materialsResolved = materialsResolved;

  const engineInput: PositionCostInput = {
    quantity: line.quantity,
    unit,
    labor: ourRate.labor,
    materials,
  };
  const position = computePositionCost(engineInput);
  base.engineInput = engineInput;
  base.position = position;
  base.positionComplete = position.positionComplete;
  base.gaps = gaps;
  base.gapLabelsPl = gaps.map((g) => GAP_LABEL_PL[g]);
  return base;
}

export type ComputeShadowBoqPositionCostsInput = {
  doc: Pick<OfferBoqDocument, "lines">;
  store: WorkCatalogStore;
  nowMs: number;
  paintCoats?: 1 | 2 | null;
  packs?: readonly TechnologyPack[];
  targetMaterialUnit?: string | null;
  tenderId?: string | null;
  dwellingId?: string | null;
  ensureOwnerQuestions?: boolean;
};

/**
 * Cały OfferBoq → shadow aggregates. NIE mutuje dokumentu. NIE woła Bid.
 */
export function computeShadowPositionCostsForOfferBoq(
  input: ComputeShadowBoqPositionCostsInput,
): ShadowBoqPositionCostResult {
  const lines = (input.doc.lines ?? []).map((line) =>
    computeShadowPositionCostForOfferBoqLine({
      line,
      store: input.store,
      nowMs: input.nowMs,
      paintCoats: input.paintCoats,
      packs: input.packs,
      targetMaterialUnit: input.targetMaterialUnit,
      tenderId: input.tenderId,
      dwellingId: input.dwellingId,
      ensureOwnerQuestions: input.ensureOwnerQuestions,
    }),
  );

  let completeLineCount = 0;
  let gapLineCount = 0;
  let skippedNoiseCount = 0;
  let laborSum = 0;
  let materialSum = 0;
  let totalSum = 0;
  let equipmentSum = 0;
  let transportSum = 0;
  let allCompleteForAgg = true;
  let anyCost = false;

  for (const row of lines) {
    if (row.identity.status === "NOISE_SKIP") {
      skippedNoiseCount += 1;
      continue;
    }
    if (
      row.identity.status === "EQUIPMENT_RESOLVED" &&
      row.equipment?.rateStatus === "RESOLVED" &&
      row.equipment.totalPln != null
    ) {
      completeLineCount += 1;
      equipmentSum += row.equipment.totalPln;
      anyCost = true;
      continue;
    }
    if (
      row.identity.status === "TRANSPORT_RESOLVED" &&
      row.transport?.rateStatus === "RESOLVED" &&
      row.transport.totalPln != null
    ) {
      completeLineCount += 1;
      transportSum += row.transport.totalPln;
      anyCost = true;
      continue;
    }
    if (row.positionComplete && row.position) {
      completeLineCount += 1;
      if (row.position.laborCostPln != null) {
        laborSum += row.position.laborCostPln;
        anyCost = true;
      }
      if (row.position.materialCostPln != null) {
        materialSum += row.position.materialCostPln;
        anyCost = true;
      }
      if (row.position.totalPositionCostPln != null) {
        totalSum += row.position.totalPositionCostPln;
      }
    } else {
      gapLineCount += 1;
      allCompleteForAgg = false;
    }
  }

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const equipmentCostPln = round2(equipmentSum);
  const transportCostPln = round2(transportSum);
  const laborMatTotal =
    allCompleteForAgg && completeLineCount > 0 ? round2(totalSum) : null;
  // Include equipment + transport in total when all billable lines complete.
  const totalPositionCostPln =
    allCompleteForAgg && completeLineCount > 0
      ? round2((laborMatTotal ?? 0) + equipmentCostPln + transportCostPln)
      : null;

  return {
    schemaVersion: SHADOW_POSITION_COST_SCHEMA_VERSION,
    mode: "shadow",
    lineCount: lines.length,
    lines,
    aggregates: {
      completeLineCount,
      gapLineCount,
      skippedNoiseCount,
      laborCostPln: anyCost && allCompleteForAgg ? round2(laborSum) : anyCost ? round2(laborSum) : null,
      materialCostPln:
        anyCost && allCompleteForAgg ? round2(materialSum) : anyCost ? round2(materialSum) : null,
      equipmentCostPln,
      transportCostPln,
      totalPositionCostPln,
    },
  };
}
