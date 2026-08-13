/**
 * TRANSPORT MODEL-1B — Transport pricing from tender-scoped Owner Input.
 * Requires explicit bid_candidate mark (caller). No fallback fills.
 */

import {
  areOwnerRateUnitsCompatible,
  findOwnerInputForLine,
  getCurrentOwnerInput,
} from "@/lib/owner-rate-input";
import type {
  TransportPriceProvider,
  TransportPriceProviderRequest,
  TransportPriceProviderResult,
  TransportComponentResult,
} from "@/lib/tender-position-cost/transport-contract";
import { buildTransportComponentResult } from "@/lib/tender-position-cost/transport-contract";

export type OwnerInputTransportProviderOpts = {
  /** REQUIRED — OI is tender_only. */
  tenderId: string;
};

function unresolved(reasonPl: string): TransportPriceProviderResult {
  return {
    rateStatus: "UNRESOLVED",
    unitRatePln: null,
    provenance: null,
    confidence: null,
    reasonPl,
  };
}

function invalid(reasonPl: string): TransportPriceProviderResult {
  return {
    rateStatus: "INVALID",
    unitRatePln: null,
    provenance: null,
    confidence: null,
    reasonPl,
  };
}

/**
 * Lookup current Owner Input answer for transport line (lineRef = lineId).
 * No answer → UNRESOLVED (≠ 0). Unit mismatch → INVALID.
 */
export function createOwnerInputTransportPriceProvider(
  opts: OwnerInputTransportProviderOpts,
): TransportPriceProvider {
  const tenderId = String(opts.tenderId ?? "").trim();
  return {
    id: "owner_input_transport",
    labelPl: "Owner Input — stawka transportu (tender-scoped)",
    lookup(req: TransportPriceProviderRequest): TransportPriceProviderResult {
      if (!tenderId) {
        return unresolved("TRANSPORT — brak tenderId dla Owner Input");
      }
      const lineId = String(req.lineId ?? "").trim();
      if (!lineId) {
        return invalid("TRANSPORT — brak lineId");
      }

      const item = findOwnerInputForLine({
        tenderId,
        domain: "transport",
        lineRef: lineId,
      });
      if (!item || item.question.status === "cancelled") {
        return unresolved(
          "TRANSPORT — brak Owner Input dla linii · UNRESOLVED ≠ 0 PLN",
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
          "TRANSPORT — pytanie Owner bez odpowiedzi · UNRESOLVED ≠ 0 PLN",
        );
      }

      if (!areOwnerRateUnitsCompatible(req.unit, answer.unit)) {
        return invalid(
          `TRANSPORT — niezgodność jednostek (linia: ${req.unit} · Owner: ${answer.unit})`,
        );
      }

      const rate = answer.amountPlnNet;
      if (typeof rate !== "number" || !Number.isFinite(rate) || !(rate > 0)) {
        return invalid("TRANSPORT — nieprawidłowa stawka Owner Input");
      }

      return {
        rateStatus: "RESOLVED",
        unitRatePln: rate,
        provenance: {
          kind: "owner_input",
          labelPl: "Owner Input — stawka transportu (tender-scoped)",
          ref: answer.answerId,
        },
        confidence: "high",
        reasonPl: `Owner Input rev.${answer.revisionN}`,
      };
    },
  };
}

/**
 * Resolve Transport component via Owner Input (tenderId + lineId).
 * Caller must only invoke for explicit bid_candidate lines.
 */
export function resolveTransportFromOwnerInput(opts: {
  tenderId: string;
  lineId: string;
  namePl: string;
  quantity: number | null;
  unit: string | null;
  transportKind?: string | null;
}): TransportComponentResult {
  const provider = createOwnerInputTransportPriceProvider({
    tenderId: opts.tenderId,
  });
  return buildTransportComponentResult({
    lineId: opts.lineId,
    namePl: opts.namePl,
    quantity: opts.quantity,
    unit: opts.unit,
    transportKind: opts.transportKind,
    sourceClass: "bid_candidate",
    provider,
  });
}
