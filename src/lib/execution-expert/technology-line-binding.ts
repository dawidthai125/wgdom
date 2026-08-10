/**
 * TECHNOLOGY-LINE-BINDING-01 — BOQ line → CostItemFamily → TechnologyPack binding.
 * REUSE TechnologyPack + projectBom · ZERO invented norms · unbound ≠ fake pack.
 */

import {
  composeBomId,
  deriveExecutionPlan,
  FIXTURE_ETICS_PACK_ID,
  FIXTURE_KOSTKA_PACK_ID,
  getPack,
  listAllPacks,
  projectProductionBom,
  seedB0Fixtures,
  canPackFeedProductionBom,
  type GeneratedBom,
  type TechnologyPack,
} from "@/lib/technology-foundation";
import type { OfferBoqDocument } from "@/lib/tender-offer-boq";
import { classifyCostItemFamily, type CostItemFamily } from "./cost-item-family";
import {
  isOfferBoqLineEligibleForExecution,
  offerBoqLineToBoqContextLine,
  type OfferBoqLineLike,
} from "./offer-boq-adapter";
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
  costItemFamily: CostItemFamily;
  packId: string | null;
  packVersion: string | null;
  bindStatus: TechnologyBindStatus;
  matchReasonsPl: string[];
  quantity: number;
  unit: string;
}

export interface TechnologyLineBindingResult {
  bindings: TechnologyLineBinding[];
  /** Bound lines only — packs resolved. */
  boundCount: number;
  unboundCount: number;
  mergedBom: GeneratedBom | null;
  /** Primary pack for legacy selection/contract (most bound lines). */
  primaryPack: TechnologyPack | null;
  selection: ExecutionPackSelection | null;
}

function ensureFixtures(): void {
  seedB0Fixtures();
}

function latestActivePack(packId: string): TechnologyPack | null {
  const active = listAllPacks().filter(
    (p) => p.packId === packId && p.lifecycle === "ACTIVE" && canPackFeedProductionBom(p),
  );
  if (active.length === 0) return null;
  return active.sort((a, b) => b.packVersion.localeCompare(a.packVersion))[0] ?? null;
}

function familyToPackId(family: CostItemFamily): string | null {
  if (family === "etics_envelope") return FIXTURE_ETICS_PACK_ID;
  if (family === "paving_cubes") return FIXTURE_KOSTKA_PACK_ID;
  return null;
}

function bindStatusForUnboundFamily(family: CostItemFamily): TechnologyBindStatus {
  if (family === "product_supply") return "product_path";
  if (family === "demolition" || family === "measurement") return "labor_only";
  if (family === "service_disposal") return "service";
  return "unbound";
}

/**
 * Build per-line technology bindings (hybrid model D).
 * Families without an ACTIVE pack → UNBOUND (no guessing).
 */
export function buildTechnologyLineBindings(
  doc: Pick<OfferBoqDocument, "lines" | "tenderId"> | { lines?: OfferBoqLineLike[]; tenderId?: string },
): TechnologyLineBinding[] {
  ensureFixtures();
  const tenderId =
    "tenderId" in doc && typeof doc.tenderId === "string" ? doc.tenderId : "";
  const lines = (doc.lines ?? []).filter(isOfferBoqLineEligibleForExecution);
  const out: TechnologyLineBinding[] = [];

  for (const line of lines) {
    const family = classifyCostItemFamily(line);
    const lineId = String(line.lineId || "").trim() || "line";
    const quantity = Number(line.quantity) || 0;
    const unit = String(line.unit || "").trim();
    const packIdWanted = familyToPackId(family);

    if (!packIdWanted) {
      out.push({
        tenderId,
        lineId,
        costItemFamily: family,
        packId: null,
        packVersion: null,
        bindStatus: bindStatusForUnboundFamily(family),
        matchReasonsPl: [`CostItemFamily=${family} — brak ACTIVE TechnologyPack`],
        quantity,
        unit,
      });
      continue;
    }

    const pack = latestActivePack(packIdWanted);
    if (!pack) {
      out.push({
        tenderId,
        lineId,
        costItemFamily: family,
        packId: null,
        packVersion: null,
        bindStatus: "unbound",
        matchReasonsPl: [`Pack ${packIdWanted} niedostępny w registry`],
        quantity,
        unit,
      });
      continue;
    }

    out.push({
      tenderId,
      lineId,
      costItemFamily: family,
      packId: pack.packId,
      packVersion: pack.packVersion,
      bindStatus: "bound",
      matchReasonsPl: [
        `CostItemFamily=${family}`,
        `TechnologyPack=${pack.packId}@${pack.packVersion}`,
      ],
      quantity,
      unit,
    });
  }

  return out;
}

/**
 * Line-scoped projectBom then merge by materialKey / labourKey / equipmentKey.
 * Unbound lines contribute nothing.
 */
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

    const ctx = { lines: [offerBoqLineToBoqContextLine(line)] };
    const plan = deriveExecutionPlan(pack, ctx);
    partials.push(projectProductionBom(pack, plan, ctx));
  }

  return mergeGeneratedBoms(partials);
}

export function mergeGeneratedBoms(boms: readonly GeneratedBom[]): GeneratedBom | null {
  if (boms.length === 0) return null;

  const materials = new Map<
    string,
    { materialKey: string; namePl: string; unit: string; quantity: number; bomLineId: string }
  >();
  const equipment = new Map<
    string,
    { equipmentKey: string; namePl: string; unit: string; quantity: number; bomLineId: string }
  >();
  const labour = new Map<
    string,
    { labourKey: string; namePl: string; hours: number; bomLineId: string }
  >();

  for (const bom of boms) {
    for (const m of bom.materials) {
      const prev = materials.get(m.materialKey);
      if (!prev) {
        materials.set(m.materialKey, { ...m });
      } else {
        prev.quantity = Number((prev.quantity + m.quantity).toFixed(6));
      }
    }
    for (const e of bom.equipment) {
      const prev = equipment.get(e.equipmentKey);
      if (!prev) {
        equipment.set(e.equipmentKey, { ...e });
      } else {
        prev.quantity = Number((prev.quantity + e.quantity).toFixed(6));
      }
    }
    for (const l of bom.labour) {
      const prev = labour.get(l.labourKey);
      if (!prev) {
        labour.set(l.labourKey, { ...l });
      } else {
        prev.hours = Number((prev.hours + l.hours).toFixed(6));
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
  const matchedLineIds = bindings
    .filter((b) => b.bindStatus === "bound" && b.packId === primary.packId)
    .map((b) => b.lineId);
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
    matchReasonsPl: reasons.length ? reasons : ["TECHNOLOGY-LINE-BINDING-01"],
    matchedLineIds,
  };
}

/**
 * Full binding + merged BOM for Execution Expert.
 */
export function analyzeTechnologyLineBindings(
  doc: Pick<OfferBoqDocument, "lines" | "tenderId"> | { lines?: OfferBoqLineLike[]; tenderId?: string },
): TechnologyLineBindingResult {
  const bindings = buildTechnologyLineBindings(doc);
  const boundCount = bindings.filter((b) => b.bindStatus === "bound").length;
  const unboundCount = bindings.length - boundCount;
  const mergedBom = projectAndMergeBomFromBindings(doc, bindings);
  const primaryPack = primaryPackFromBindings(bindings);
  const selection = selectionFromBindings(bindings, primaryPack);

  return {
    bindings,
    boundCount,
    unboundCount,
    mergedBom,
    primaryPack,
    selection,
  };
}
