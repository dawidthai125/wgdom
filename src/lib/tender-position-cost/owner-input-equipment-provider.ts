/**
 * OWNER-INPUT-BID GO-1 — Equipment pricing from tender-scoped Owner Input.
 * No fallback fills · tender_only · provenance owner_input.
 */

import {
  areOwnerRateUnitsCompatible,
  findOwnerInputForLine,
  getCurrentOwnerInput,
} from "@/lib/owner-rate-input";
import type {
  EquipmentPriceProvider,
  EquipmentPriceProviderRequest,
  EquipmentPriceProviderResult,
} from "@/lib/tender-position-cost/equipment-contract";
import { buildEquipmentComponentResult } from "@/lib/tender-position-cost/equipment-contract";
import type { EquipmentComponentResult } from "@/lib/tender-position-cost/equipment-contract";

export type OwnerInputEquipmentProviderOpts = {
  /** REQUIRED — OI is tender_only. */
  tenderId: string;
  /** MULTI-DWELLING-01 — optional; absent ⇒ DEFAULT_DWELLING_ID. */
  dwellingId?: string | null;
};

function unresolved(reasonPl: string): EquipmentPriceProviderResult {
  return {
    rateStatus: "UNRESOLVED",
    unitRatePln: null,
    provenance: null,
    confidence: null,
    reasonPl,
  };
}

function invalid(reasonPl: string): EquipmentPriceProviderResult {
  return {
    rateStatus: "INVALID",
    unitRatePln: null,
    provenance: null,
    confidence: null,
    reasonPl,
  };
}

/**
 * Lookup current Owner Input answer for equipment line (lineRef = lineId).
 * No answer → UNRESOLVED (≠ 0). Unit mismatch → INVALID.
 */
export function createOwnerInputEquipmentPriceProvider(
  opts: OwnerInputEquipmentProviderOpts,
): EquipmentPriceProvider {
  const tenderId = String(opts.tenderId ?? "").trim();
  const dwellingId = opts.dwellingId;
  return {
    id: "owner_input_equipment",
    labelPl: "Owner Input — stawka sprzętu (tender-scoped)",
    lookup(req: EquipmentPriceProviderRequest): EquipmentPriceProviderResult {
      if (!tenderId) {
        return unresolved("EQUIPMENT — brak tenderId dla Owner Input");
      }
      const lineId = String(req.lineId ?? "").trim();
      if (!lineId) {
        return invalid("EQUIPMENT — brak lineId");
      }

      const item = findOwnerInputForLine({
        tenderId,
        domain: "equipment",
        lineRef: lineId,
        dwellingId,
      });
      if (!item || item.question.status === "cancelled") {
        return unresolved(
          "EQUIPMENT — brak Owner Input dla linii · UNRESOLVED ≠ 0 PLN",
        );
      }

      const answer =
        item.currentAnswer ??
        getCurrentOwnerInput({
          tenderId,
          questionId: item.question.questionId,
        });
      if (!answer) {
        return unresolved(
          "EQUIPMENT — pytanie Owner bez odpowiedzi · UNRESOLVED ≠ 0 PLN",
        );
      }

      if (!areOwnerRateUnitsCompatible(req.unit, answer.unit)) {
        return invalid(
          `EQUIPMENT — niezgodność jednostek (linia: ${req.unit} · Owner: ${answer.unit})`,
        );
      }

      const rate = answer.amountPlnNet;
      if (typeof rate !== "number" || !Number.isFinite(rate) || !(rate > 0)) {
        return invalid("EQUIPMENT — nieprawidłowa stawka Owner Input");
      }

      return {
        rateStatus: "RESOLVED",
        unitRatePln: rate,
        provenance: {
          kind: "owner_input",
          labelPl: "Owner Input — stawka sprzętu (tender-scoped)",
          ref: answer.answerId,
        },
        confidence: "high",
        reasonPl: `Owner Input rev.${answer.revisionN}`,
      };
    },
  };
}

/**
 * Resolve Equipment component via Owner Input (tenderId + lineId).
 */
export function resolveEquipmentFromOwnerInput(opts: {
  tenderId: string;
  lineId: string;
  namePl: string;
  quantity: number | null;
  unit: string | null;
  equipmentKey?: string | null;
  dwellingId?: string | null;
}): EquipmentComponentResult {
  const provider = createOwnerInputEquipmentPriceProvider({
    tenderId: opts.tenderId,
    dwellingId: opts.dwellingId,
  });
  return buildEquipmentComponentResult({
    lineId: opts.lineId,
    namePl: opts.namePl,
    quantity: opts.quantity,
    unit: opts.unit,
    offerBoqLineKind: "Equipment",
    equipmentKey: opts.equipmentKey,
    provider,
  });
}
