/**
 * INTELLIGENT-COST-ESTIMATOR-E2E-WIRE-01 W1 — read-only gap inventory from F5 shadow.
 *
 * ZERO HTTP · ZERO KV · ZERO Accept · ZERO research.
 * Does NOT call resolveWorkIdentityFromOfferBoqLine — identity from shadow only.
 */

import type {
  ShadowBoqPositionCostResult,
  ShadowGapCode,
  ShadowPositionCostLineResult,
} from "@/lib/tender-position-cost/boq-shadow-adapter";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import { isLaborGapJobAllowed } from "@/lib/intelligent-estimator";
import {
  buildIkLaborDedupeKey,
  buildIkMaterialDedupeKey,
  type IkGapInventory,
  type IkLaborGapJob,
  type IkMaterialGapJob,
} from "./types";

export type InventoryIkGapsFromShadowInput = {
  shadow: ShadowBoqPositionCostResult;
  tenderId: string;
  dwellingId?: string | null;
};

const SKIP_TRACK: ReadonlySet<ShadowGapCode> = new Set([
  "BRAK_IDENTYFIKACJI_ROBOTY",
  "NIEJEDNOZNACZNA_ROBOTA",
  "NIEPRAWIDLOWA_JEDNOSTKA",
  "PRZETERMINOWANA_STAWKA_ROBOT",
  "PRZETERMINOWANA_CENA_MATERIALU",
  "EQUIPMENT_OUT_OF_SCOPE",
  "EQUIPMENT_OWNER_INPUT_INVALID",
  "TRANSPORT_OUT_OF_SCOPE",
  "TRANSPORT_OWNER_INPUT_INVALID",
  "AUXILIARY_OUT_OF_SCOPE",
  "POMINIETO_NOISE",
]);

function trim(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Map F5 shadow gaps → labor / material job DTOs for orchestration.
 */
export function inventoryIkGapsFromShadow(
  input: InventoryIkGapsFromShadowInput,
): IkGapInventory {
  const tenderId = trim(input.tenderId);
  const dwellingId =
    input.dwellingId == null || trim(String(input.dwellingId)) === ""
      ? null
      : trim(String(input.dwellingId));

  const laborJobs: IkLaborGapJob[] = [];
  const materialJobs: IkMaterialGapJob[] = [];
  const skippedGapCodes: ShadowGapCode[] = [];
  const seenLabor = new Set<string>();
  const seenMaterial = new Set<string>();

  for (const line of input.shadow.lines) {
    collectSkipped(line, skippedGapCodes);
    maybePushLabor(line, tenderId, dwellingId, laborJobs, seenLabor);
    maybePushMaterials(line, tenderId, dwellingId, materialJobs, seenMaterial);
  }

  return {
    tenderId,
    dwellingId,
    laborJobs,
    materialJobs,
    skippedGapCodes,
  };
}

function collectSkipped(
  line: ShadowPositionCostLineResult,
  skipped: ShadowGapCode[],
): void {
  for (const code of line.gaps) {
    if (SKIP_TRACK.has(code) && !skipped.includes(code)) {
      skipped.push(code);
    }
  }
  // Identity statuses that never become labor jobs
  const st = line.identity.status;
  if (
    st === "NO_IDENTITY" ||
    st === "AMBIGUOUS" ||
    st === "INVALID_UNIT" ||
    st === "EQUIPMENT_GAP" ||
    st === "TRANSPORT_GAP" ||
    st === "AUXILIARY_GAP" ||
    st === "NOISE_SKIP"
  ) {
    // already reflected in gaps / status — no labor job
  }
}

function maybePushLabor(
  line: ShadowPositionCostLineResult,
  tenderId: string,
  dwellingId: string | null,
  out: IkLaborGapJob[],
  seen: Set<string>,
): void {
  if (!line.gaps.includes("BRAK_STAWKI_ROBOT")) return;
  if (line.identity.status !== "OK") return;
  const workId = trim(line.identity.workId ?? "");
  const unit = line.identity.unit;
  if (!workId || !unit) return;
  // A4 — BRAK_STAWKI_ROBOT jobs only when Classification Gate plane === LABOR
  if (!isLaborGapJobAllowed(workId)) return;
  // STALE is a separate gap — never auto-job from STALE alone (DF / W2)
  if (line.gaps.includes("PRZETERMINOWANA_STAWKA_ROBOT") && line.ourRate?.status === "STALE") {
    // If BOTH missing and stale somehow — still only invent when MISSING path;
    // BRAK_STAWKI_ROBOT implies MISSING/NO_IDENTITY labor resolve — STALE uses other code.
    // Extra guard: ourRate STALE without BRAK would not reach here without BRAK.
  }
  if (line.ourRate?.status === "STALE") return;

  const dedupeKey = buildIkLaborDedupeKey({
    tenderId,
    lineId: line.lineId,
    workId,
    unit,
  });
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);

  out.push({
    domain: "labor",
    gapCode: "BRAK_STAWKI_ROBOT",
    tenderId,
    dwellingId,
    lineId: line.lineId,
    lp: line.lp,
    workId,
    unit: unit as WgdomCostUnit,
    namePl: trim(line.description) || workId,
    dedupeKey,
  });
}

function maybePushMaterials(
  line: ShadowPositionCostLineResult,
  tenderId: string,
  dwellingId: string | null,
  out: IkMaterialGapJob[],
  seen: Set<string>,
): void {
  if (!line.gaps.includes("BRAK_CENY_MATERIALU") && line.materialsResolved.length === 0) {
    return;
  }

  for (const m of line.materialsResolved) {
    if (m.status !== "MISSING") continue;
    const materialKey = trim(m.materialKey ?? "");
    const catalogWorkId = trim(m.catalogWorkId ?? "");
    if (!materialKey || !catalogWorkId) continue;

    const dedupeKey = buildIkMaterialDedupeKey({
      tenderId,
      lineId: line.lineId,
      materialKey,
      catalogWorkId,
    });
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const workId =
      line.identity.status === "OK" ? trim(line.identity.workId ?? "") || null : null;

    out.push({
      domain: "material",
      gapCode: "BRAK_CENY_MATERIALU",
      tenderId,
      dwellingId,
      lineId: line.lineId,
      lp: line.lp,
      materialKey,
      catalogWorkId,
      namePl: null,
      quantityUnit: m.quantityUnit,
      workId,
      unit: line.identity.unit,
      dedupeKey,
    });
  }
}
