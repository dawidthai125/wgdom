/**
 * TECHNOLOGY-LINE-BINDING-01 + TECHNOLOGY-DECOMPOSITION-01
 * BOQ → Decomposition → TechUnit[] → Family → Pack → Recipe → partial BOM → merge
 * 01B: painting coats → economy white pack.
 * PRIMING-01: priming eligibility → economy interior primer pack.
 * Provenance P-meta: sourceLineIds[] / techUnitIds[] on BOM lines.
 */

import {
  composeBomId,
  deriveExecutionPlan,
  FIXTURE_ELECTRICAL_CABLE_ECONOMY_PACK_ID,
  FIXTURE_ETICS_PACK_ID,
  FIXTURE_KOSTKA_PACK_ID,
  FIXTURE_PAINTING_ECONOMY_PACK_ID,
  FIXTURE_PRIMING_ECONOMY_PACK_ID,
  FIXTURE_SCREED_ECONOMY_WET_CEMENT_PACK_ID,
  getPack,
  listAllPacks,
  projectProductionBom,
  seedB0Fixtures,
  seedScreedEconomyWetCementV1,
  canPackFeedProductionBom,
  filterPackRecipeForCoats,
  filterPackRecipeForMaterialKey,
  type GeneratedBom,
  type GeneratedBomEquipmentLine,
  type GeneratedBomLabourLine,
  type GeneratedBomMaterialLine,
  type TechnologyPack,
} from "@/lib/technology-foundation";
import type { OfferBoqDocument } from "@/lib/tender-offer-boq";
import type { CostItemFamily } from "./cost-item-family";
import { resolveEconomyElectricalCableV1 } from "./electrical-circuit-spec";
import {
  isOfferBoqLineEligibleForExecution,
  offerBoqLineToBoqContextLine,
  type OfferBoqLineLike,
} from "./offer-boq-adapter";
import type { PaintCoats } from "./paint-coats";
import { resolvePrimingEconomyV1Eligibility } from "./priming-eligibility";
import { resolveWetCementScreedEconomyV1Eligibility } from "./screed-eligibility";
import {
  aggregateLineStatus,
  decomposeOfferBoqLine,
  techUnitFamilyToCostItemFamily,
  type LineAggregateStatus,
  type LineDecompositionResult,
  type TechUnit,
  type TechUnitStatus,
} from "./technology-decomposition";
import type { ExecutionPackSelection } from "./types";

export type TechnologyBindStatus =
  | "bound"
  | "unbound"
  | "rejected"
  | "product_path"
  | "labor_only"
  | "service";

export interface TechnologyLineBinding {
  tenderId: string;
  lineId: string;
  /** TECH-DECOMP-01 — one binding per TechUnit when decomposed. */
  techUnitId?: string;
  techUnitStatus?: TechUnitStatus;
  lineAggregateStatus?: LineAggregateStatus;
  costItemFamily: CostItemFamily;
  packId: string | null;
  packVersion: string | null;
  bindStatus: TechnologyBindStatus;
  matchReasonsPl: string[];
  quantity: number;
  unit: string;
  /** 01B — resolved paint coats when family=painting and bound. */
  coats?: PaintCoats;
  /** ECONOMY-ELECTRICAL-CABLE-V1 — resolved commodity cable key when bound. */
  materialKey?: string;
  /** Normalized circuitSpec when electrical V1 mapped. */
  circuitSpecNormalized?: string;
  /** ECONOMY_WET_CEMENT_SCREED_V1 — thickness for bind-time effective qtyFactor. */
  thicknessMm?: number;
  decompositionReason?: string;
}

export interface TechnologyLineBindingResult {
  bindings: TechnologyLineBinding[];
  techUnits: TechUnit[];
  lineDecompositions: LineDecompositionResult[];
  boundCount: number;
  unboundCount: number;
  mergedBom: GeneratedBom | null;
  primaryPack: TechnologyPack | null;
  selection: ExecutionPackSelection | null;
}

function ensureFixtures(): void {
  seedB0Fixtures();
  seedScreedEconomyWetCementV1();
}

/** Option A: pack qtyFactor=2.0 → effective = 2.0 × thicknessMm (projectBom unchanged). */
function applyScreedEffectiveQtyFactor(pack: TechnologyPack, thicknessMm: number): TechnologyPack {
  return {
    ...pack,
    materials: pack.materials.map((m) => ({
      ...m,
      qtyFactor: Number((m.qtyFactor * thicknessMm).toFixed(6)),
    })),
  };
}

function latestActivePack(packId: string): TechnologyPack | null {
  const active = listAllPacks().filter(
    (p) => p.packId === packId && p.lifecycle === "ACTIVE" && canPackFeedProductionBom(p),
  );
  if (active.length === 0) return null;
  return active.sort((a, b) => b.packVersion.localeCompare(a.packVersion))[0] ?? null;
}

function familyToPackId(family: CostItemFamily | string): string | null {
  if (family === "etics_envelope") return FIXTURE_ETICS_PACK_ID;
  if (family === "paving_cubes") return FIXTURE_KOSTKA_PACK_ID;
  if (family === "painting") return FIXTURE_PAINTING_ECONOMY_PACK_ID;
  if (family === "priming") return FIXTURE_PRIMING_ECONOMY_PACK_ID;
  if (family === "electrical_cable_lay") return FIXTURE_ELECTRICAL_CABLE_ECONOMY_PACK_ID;
  if (family === "screed_leveling") return FIXTURE_SCREED_ECONOMY_WET_CEMENT_PACK_ID;
  return null;
}

function bindStatusForUnboundFamily(family: CostItemFamily): TechnologyBindStatus {
  if (family === "product_supply") return "product_path";
  if (family === "demolition" || family === "measurement") return "labor_only";
  if (family === "service_disposal") return "service";
  return "unbound";
}

function unionIds(a: string[] | undefined, b: string[] | undefined): string[] | undefined {
  const set = new Set<string>([...(a || []), ...(b || [])]);
  if (set.size === 0) return undefined;
  return [...set].sort();
}

/** Stamp P-meta provenance onto a partial BOM (mutates copies). */
export function annotateBomProvenance(
  bom: GeneratedBom,
  sourceLineId: string,
  techUnitId: string,
): GeneratedBom {
  const stamp = <T extends { sourceLineIds?: string[]; techUnitIds?: string[] }>(row: T): T => ({
    ...row,
    sourceLineIds: unionIds(row.sourceLineIds, [sourceLineId]),
    techUnitIds: unionIds(row.techUnitIds, [techUnitId]),
  });
  return {
    ...bom,
    materials: bom.materials.map((m) => stamp(m)),
    equipment: bom.equipment.map((e) => stamp(e)),
    labour: bom.labour.map((l) => stamp(l)),
  };
}

/**
 * Resolve TechUnit → binding (pack/recipe). Updates unit.status + recipeBinding in place copy.
 */
function bindTechUnit(
  tenderId: string,
  unit: TechUnit,
  lineAggregateStatus: LineAggregateStatus,
  sourceLine: OfferBoqLineLike,
): { binding: TechnologyLineBinding; unit: TechUnit } {
  const costItemFamily =
    unit.family === "electrical_cable_lay"
      ? "electrical_cable_lay"
      : techUnitFamilyToCostItemFamily(unit.family);
  const quantity = unit.quantityInput.quantity;
  const unitStr = unit.quantityInput.unit;

  const base = {
    tenderId,
    lineId: unit.sourceLineId,
    techUnitId: unit.techUnitId,
    lineAggregateStatus,
    costItemFamily,
    quantity,
    unit: unitStr,
    decompositionReason: unit.decompositionReason,
  };

  // ECONOMY-ELECTRICAL-CABLE-V1 — identity from BOQ wording (may override PARAMETER_REQUIRED)
  if (unit.family === "electrical_cable_lay") {
    const resolved = resolveEconomyElectricalCableV1({
      description: sourceLine.description,
      normalizedDescription: sourceLine.normalizedDescription,
      catalogWorkId: sourceLine.catalogWorkId,
      runtimeCircuitSpec: unit.parameters?.circuitSpec ?? null,
    });

    if (resolved.kind === "mapped_v1" && resolved.materialKey && resolved.normalizedCircuitSpec) {
      const pack = latestActivePack(FIXTURE_ELECTRICAL_CABLE_ECONOMY_PACK_ID);
      if (!pack) {
        const u: TechUnit = { ...unit, status: "UNBOUND", recipeBinding: null };
        return {
          unit: u,
          binding: {
            ...base,
            techUnitStatus: "UNBOUND",
            packId: null,
            packVersion: null,
            bindStatus: "unbound",
            matchReasonsPl: [`Pack ${FIXTURE_ELECTRICAL_CABLE_ECONOMY_PACK_ID} niedostępny`],
          },
        };
      }
      const u: TechUnit = {
        ...unit,
        status: "BOUND",
        recipeBinding: { packId: pack.packId, packVersion: pack.packVersion },
        parameters: {
          ...unit.parameters,
          circuitSpec: resolved.normalizedCircuitSpec,
        },
      };
      return {
        unit: u,
        binding: {
          ...base,
          techUnitStatus: "BOUND",
          packId: pack.packId,
          packVersion: pack.packVersion,
          bindStatus: "bound",
          materialKey: resolved.materialKey,
          circuitSpecNormalized: resolved.normalizedCircuitSpec,
          matchReasonsPl: [
            `TechUnit=electrical_cable_lay`,
            `TechnologyPack=${pack.packId}@${pack.packVersion}`,
            resolved.reasonPl,
            unit.decompositionReason,
          ],
        },
      };
    }

    if (resolved.kind === "out_of_scope" || resolved.kind === "deferred") {
      const u: TechUnit = { ...unit, status: "UNBOUND", recipeBinding: null };
      return {
        unit: u,
        binding: {
          ...base,
          techUnitStatus: "UNBOUND",
          packId: null,
          packVersion: null,
          bindStatus: "unbound",
          matchReasonsPl: [resolved.reasonPl, unit.decompositionReason],
        },
      };
    }

    // parameter_required / incomplete
    const u: TechUnit = { ...unit, status: "PARAMETER_REQUIRED", recipeBinding: null };
    return {
      unit: u,
      binding: {
        ...base,
        techUnitStatus: "PARAMETER_REQUIRED",
        packId: null,
        packVersion: null,
        bindStatus: "unbound",
        matchReasonsPl: [
          resolved.reasonPl || "electrical — PARAMETER_REQUIRED",
          unit.decompositionReason,
        ],
      },
    };
  }

  const packIdWanted = familyToPackId(costItemFamily);

  // Forced PARAMETER_REQUIRED from decomposition (coats / thickness / circuit)
  if (unit.status === "PARAMETER_REQUIRED") {
    const u: TechUnit = { ...unit, status: "PARAMETER_REQUIRED", recipeBinding: null };
    return {
      unit: u,
      binding: {
        ...base,
        techUnitStatus: "PARAMETER_REQUIRED",
        packId: null,
        packVersion: null,
        bindStatus: "unbound",
        matchReasonsPl: [
          `TechUnit ${unit.family} — PARAMETER_REQUIRED`,
          unit.decompositionReason,
        ],
        ...(unit.parameters?.coats != null ? { coats: unit.parameters.coats } : {}),
      },
    };
  }

  if (!packIdWanted) {
    const bindStatus = bindStatusForUnboundFamily(costItemFamily);
    const u: TechUnit = { ...unit, status: "UNBOUND", recipeBinding: null };
    return {
      unit: u,
      binding: {
        ...base,
        techUnitStatus: "UNBOUND",
        packId: null,
        packVersion: null,
        bindStatus,
        matchReasonsPl: [
          `TechUnit family=${unit.family} → CostItemFamily=${costItemFamily} — brak ACTIVE TechnologyPack`,
          unit.decompositionReason,
        ],
      },
    };
  }

  // PRIMING-01 — economy latex primer only (no “every gruntowanie → mat.grunt”)
  if (costItemFamily === "priming" || unit.family === "priming") {
    if (resolvePrimingEconomyV1Eligibility(sourceLine) !== "eligible") {
      const u: TechUnit = { ...unit, status: "UNBOUND", recipeBinding: null };
      return {
        unit: u,
        binding: {
          ...base,
          costItemFamily: "priming",
          techUnitStatus: "UNBOUND",
          packId: null,
          packVersion: null,
          bindStatus: "unbound",
          matchReasonsPl: [
            "priming — poza ECONOMY_INTERIOR_PRIMER_V1 (UNBOUND)",
            unit.decompositionReason,
          ],
        },
      };
    }
  }

  // ECONOMY_WET_CEMENT_SCREED_V1 — family alone is NOT enough
  if (costItemFamily === "screed_leveling" || unit.family === "screed_leveling") {
    const elig = resolveWetCementScreedEconomyV1Eligibility(
      sourceLine,
      unit.parameters?.thicknessMm,
    );
    if (elig === "unbound") {
      const u: TechUnit = { ...unit, status: "UNBOUND", recipeBinding: null };
      return {
        unit: u,
        binding: {
          ...base,
          costItemFamily: "screed_leveling",
          techUnitStatus: "UNBOUND",
          packId: null,
          packVersion: null,
          bindStatus: "unbound",
          matchReasonsPl: [
            "screed — poza ECONOMY_WET_CEMENT_SCREED_V1 (UNBOUND)",
            unit.decompositionReason,
          ],
        },
      };
    }
    if (elig === "parameter_required") {
      const u: TechUnit = { ...unit, status: "PARAMETER_REQUIRED", recipeBinding: null };
      return {
        unit: u,
        binding: {
          ...base,
          costItemFamily: "screed_leveling",
          techUnitStatus: "PARAMETER_REQUIRED",
          packId: null,
          packVersion: null,
          bindStatus: "unbound",
          matchReasonsPl: [
            "screed — brak / niejednoznaczna grubość (PARAMETER_REQUIRED)",
            unit.decompositionReason,
          ],
        },
      };
    }
  }

  let coats: PaintCoats | undefined = unit.parameters?.coats;
  if (costItemFamily === "painting") {
    if (coats !== 1 && coats !== 2) {
      const u: TechUnit = { ...unit, status: "PARAMETER_REQUIRED", recipeBinding: null };
      return {
        unit: u,
        binding: {
          ...base,
          techUnitStatus: "PARAMETER_REQUIRED",
          packId: null,
          packVersion: null,
          bindStatus: "unbound",
          matchReasonsPl: [
            "painting — nie udało się ustalić 1/2 warstw (PARAMETER_REQUIRED)",
            unit.decompositionReason,
          ],
        },
      };
    }
  }

  if (costItemFamily === "priming" || unit.family === "priming") {
    coats = 1;
  }

  const pack = latestActivePack(packIdWanted);
  if (!pack) {
    const u: TechUnit = { ...unit, status: "UNBOUND", recipeBinding: null };
    return {
      unit: u,
      binding: {
        ...base,
        techUnitStatus: "UNBOUND",
        packId: null,
        packVersion: null,
        bindStatus: "unbound",
        matchReasonsPl: [`Pack ${packIdWanted} niedostępny`],
        ...(coats != null ? { coats } : {}),
      },
    };
  }

  const thicknessMm =
    costItemFamily === "screed_leveling" || unit.family === "screed_leveling"
      ? unit.parameters?.thicknessMm
      : undefined;

  const u: TechUnit = {
    ...unit,
    status: "BOUND",
    recipeBinding: { packId: pack.packId, packVersion: pack.packVersion },
    ...(coats != null ? { parameters: { ...unit.parameters, coats } } : {}),
  };

  return {
    unit: u,
    binding: {
      ...base,
      techUnitStatus: "BOUND",
      packId: pack.packId,
      packVersion: pack.packVersion,
      bindStatus: "bound",
      matchReasonsPl: [
        `TechUnit=${unit.family}`,
        `TechnologyPack=${pack.packId}@${pack.packVersion}`,
        unit.decompositionReason,
        ...(coats != null ? [`coats=${coats}`] : []),
        ...(thicknessMm != null ? [`thicknessMm=${thicknessMm}`] : []),
      ],
      ...(coats != null ? { coats } : {}),
      ...(thicknessMm != null ? { thicknessMm } : {}),
    },
  };
}

/**
 * Build per-TechUnit technology bindings (Architecture B).
 * Atomic lines → N=1. Compound → N≥2. Unresolved units stay visible (no guess).
 */
export function buildTechnologyLineBindings(
  doc: Pick<OfferBoqDocument, "lines" | "tenderId"> | { lines?: OfferBoqLineLike[]; tenderId?: string },
): TechnologyLineBinding[] {
  return analyzeTechnologyLineBindings(doc).bindings;
}

export function projectAndMergeBomFromBindings(
  doc: Pick<OfferBoqDocument, "lines"> | { lines?: OfferBoqLineLike[] },
  bindings: readonly TechnologyLineBinding[],
): GeneratedBom | null {
  ensureFixtures();
  const lineById = new Map<string, OfferBoqLineLike>();
  for (const line of doc.lines ?? []) {
    if (!isOfferBoqLineEligibleForExecution(line)) continue;
    lineById.set(String(line.lineId || "").trim(), line);
  }

  const partials: GeneratedBom[] = [];

  for (const b of bindings) {
    if (b.bindStatus !== "bound" || !b.packId || !b.packVersion) continue;
    const pack = getPack(b.packId, b.packVersion);
    if (!pack || !canPackFeedProductionBom(pack)) continue;
    const line = lineById.get(b.lineId);
    if (!line) continue;

    let packForBom = filterPackRecipeForMaterialKey(
      filterPackRecipeForCoats(pack, b.coats ?? null),
      b.materialKey,
    );
    if (
      packForBom.materials.length === 0 &&
      pack.materials.some((m) => m.coats === 1 || m.coats === 2)
    ) {
      continue;
    }
    if (b.materialKey && packForBom.materials.length === 0) {
      continue;
    }

    // SCREED Option A — effectiveQtyFactor = 2.0 × thicknessMm (no project-bom.ts change)
    if (
      b.packId === FIXTURE_SCREED_ECONOMY_WET_CEMENT_PACK_ID &&
      b.thicknessMm != null &&
      Number.isFinite(b.thicknessMm)
    ) {
      packForBom = applyScreedEffectiveQtyFactor(packForBom, b.thicknessMm);
    }

    const ctx = { lines: [offerBoqLineToBoqContextLine(line)] };
    const plan = deriveExecutionPlan(packForBom, ctx);
    let partial = projectProductionBom(packForBom, plan, ctx);
    if (b.techUnitId) {
      partial = annotateBomProvenance(partial, b.lineId, b.techUnitId);
    } else {
      partial = annotateBomProvenance(partial, b.lineId, `legacy:${b.lineId}`);
    }
    partials.push(partial);
  }

  return mergeGeneratedBoms(partials);
}

export function mergeGeneratedBoms(boms: readonly GeneratedBom[]): GeneratedBom | null {
  if (boms.length === 0) return null;

  const materials = new Map<string, GeneratedBomMaterialLine>();
  const equipment = new Map<string, GeneratedBomEquipmentLine>();
  const labour = new Map<string, GeneratedBomLabourLine>();

  for (const bom of boms) {
    for (const m of bom.materials) {
      const prev = materials.get(m.materialKey);
      if (!prev) {
        materials.set(m.materialKey, { ...m });
      } else {
        prev.quantity = Number((prev.quantity + m.quantity).toFixed(6));
        prev.sourceLineIds = unionIds(prev.sourceLineIds, m.sourceLineIds);
        prev.techUnitIds = unionIds(prev.techUnitIds, m.techUnitIds);
      }
    }
    for (const e of bom.equipment) {
      const prev = equipment.get(e.equipmentKey);
      if (!prev) {
        equipment.set(e.equipmentKey, { ...e });
      } else {
        prev.quantity = Number((prev.quantity + e.quantity).toFixed(6));
        prev.sourceLineIds = unionIds(prev.sourceLineIds, e.sourceLineIds);
        prev.techUnitIds = unionIds(prev.techUnitIds, e.techUnitIds);
      }
    }
    for (const l of bom.labour) {
      const prev = labour.get(l.labourKey);
      if (!prev) {
        labour.set(l.labourKey, { ...l });
      } else {
        prev.hours = Number((prev.hours + l.hours).toFixed(6));
        prev.sourceLineIds = unionIds(prev.sourceLineIds, l.sourceLineIds);
        prev.techUnitIds = unionIds(prev.techUnitIds, l.techUnitIds);
      }
    }
  }

  const first = boms[0]!;
  const packIds = [...new Set(boms.map((b) => b.packId))].sort();
  const packId = packIds.length === 1 ? first.packId : `merged:${packIds.join("+")}`;
  const packVersion = packIds.length === 1 ? first.packVersion : "merged";
  const planRevision = packIds.length === 1 ? first.planRevision : "line-binding-merge";

  return {
    bomId: composeBomId(packId, packVersion, planRevision),
    packId,
    packVersion,
    planRevision,
    materials: [...materials.values()],
    equipment: [...equipment.values()],
    labour: [...labour.values()],
  };
}

function primaryPackFromBindings(
  bindings: readonly TechnologyLineBinding[],
): TechnologyPack | null {
  const counts = new Map<string, { packId: string; packVersion: string; n: number }>();
  for (const b of bindings) {
    if (b.bindStatus !== "bound" || !b.packId || !b.packVersion) continue;
    const key = `${b.packId}@@${b.packVersion}`;
    const prev = counts.get(key);
    if (!prev) counts.set(key, { packId: b.packId, packVersion: b.packVersion, n: 1 });
    else prev.n += 1;
  }
  const ranked = [...counts.values()].sort(
    (a, b) => b.n - a.n || a.packId.localeCompare(b.packId),
  );
  const top = ranked[0];
  if (!top) return null;
  return getPack(top.packId, top.packVersion) ?? null;
}

function selectionFromBindings(
  bindings: readonly TechnologyLineBinding[],
  primary: TechnologyPack | null,
): ExecutionPackSelection | null {
  if (!primary) return null;
  const matchedLineIds = [
    ...new Set(
      bindings
        .filter((b) => b.bindStatus === "bound" && b.packId === primary.packId)
        .map((b) => b.lineId),
    ),
  ];
  const reasons = [
    ...new Set(
      bindings
        .filter((b) => b.bindStatus === "bound")
        .flatMap((b) => b.matchReasonsPl),
    ),
  ].slice(0, 8);
  return {
    packId: primary.packId,
    packVersion: primary.packVersion,
    namePl: primary.namePl,
    score: matchedLineIds.length * 100,
    matchReasonsPl: reasons.length ? reasons : ["TECHNOLOGY-DECOMPOSITION-01"],
    matchedLineIds,
  };
}

/**
 * Full decomposition + binding + merged BOM for Execution Expert.
 */
export function analyzeTechnologyLineBindings(
  doc: Pick<OfferBoqDocument, "lines" | "tenderId"> | { lines?: OfferBoqLineLike[]; tenderId?: string },
): TechnologyLineBindingResult {
  ensureFixtures();
  const tenderId =
    "tenderId" in doc && typeof doc.tenderId === "string" ? doc.tenderId : "";
  const lines = (doc.lines ?? []).filter(isOfferBoqLineEligibleForExecution);

  const bindings: TechnologyLineBinding[] = [];
  const techUnits: TechUnit[] = [];
  const lineDecompositions: LineDecompositionResult[] = [];

  for (const line of lines) {
    const decomp = decomposeOfferBoqLine(line);
    const resolvedUnits: TechUnit[] = [];
    const lineBindings: TechnologyLineBinding[] = [];

    for (const unit of decomp.units) {
      const { binding, unit: resolved } = bindTechUnit(
        tenderId,
        unit,
        decomp.lineStatus,
        line,
      );
      resolvedUnits.push(resolved);
      lineBindings.push(binding);
    }

    // Recompute aggregate after recipe binding
    const lineStatus = aggregateLineStatus(resolvedUnits);
    for (const b of lineBindings) {
      b.lineAggregateStatus = lineStatus;
    }

    lineDecompositions.push({
      ...decomp,
      units: resolvedUnits,
      lineStatus,
    });
    techUnits.push(...resolvedUnits);
    bindings.push(...lineBindings);
  }

  const boundCount = bindings.filter((b) => b.bindStatus === "bound").length;
  const unboundCount = bindings.length - boundCount;
  const mergedBom = projectAndMergeBomFromBindings(doc, bindings);
  const primaryPack = primaryPackFromBindings(bindings);
  const selection = selectionFromBindings(bindings, primaryPack);

  return {
    bindings,
    techUnits,
    lineDecompositions,
    boundCount,
    unboundCount,
    mergedBom,
    primaryPack,
    selection,
  };
}
