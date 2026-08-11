/**
 * MARKET-MATERIAL-RESEARCH-01 Stage B — research provider abstraction.
 * LIVE providers: NOT CONNECTED. Mock/manual only.
 */

import { roundMarketPricePln } from "@/lib/work-catalog/market-sources";
import type { PriceCandidate } from "./price-candidate-types";
import type {
  MaterialResearchProvider,
  MaterialResearchProviderInput,
  MaterialResearchProviderResult,
} from "./market-material-research-types";

export const MMR_MOCK_PROVIDER_ID = "mock_manual" as const;
export const MMR_MOCK_MARKER = "TEST / MOCK / NON-PRODUCTION" as const;

/** Normalize units for equality (l ↔ L, m2 ↔ m² light fold). */
export function normalizeResearchUnit(unit: string): string {
  return String(unit || "")
    .trim()
    .toLowerCase()
    .replace(/²/g, "2")
    .replace(/\s+/g, "");
}

export function unitsCompatible(expected: string, candidate: string): boolean {
  const a = normalizeResearchUnit(expected);
  const b = normalizeResearchUnit(candidate);
  if (!a || !b) return false;
  return a === b;
}

/**
 * Mock provider — controlled candidate with provenance.
 * NEVER auto-accepts · NEVER invents as Real Cost · NOT live HTTP.
 */
export function createMockManualResearchProvider(opts?: {
  /** Explicit mock PLN — must be marked TEST; default placeholder for tests only. */
  mockPriceNet?: number;
  fail?: boolean;
  failError?: string;
  /** Override unit on candidate (for wrong-unit tests). */
  forceCandidateUnit?: string;
}): MaterialResearchProvider {
  const mockPrice = opts?.mockPriceNet ?? 12.34;
  return {
    id: MMR_MOCK_PROVIDER_ID,
    connected: false,
    async research(input: MaterialResearchProviderInput): Promise<MaterialResearchProviderResult> {
      if (opts?.fail) {
        return {
          ok: false,
          error: opts.failError || "mock_provider_failed",
          autoAccepted: false,
        };
      }
      const unit = opts?.forceCandidateUnit ?? input.unit;
      const priceNet = roundMarketPricePln(mockPrice);
      const candidate: PriceCandidate = {
        candidateId: `mock_${input.researchJobId.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}_${Date.parse(input.nowIso) || 0}`,
        demandId: input.demandId,
        provider: "other",
        sourceType: "market_reference",
        name: `${MMR_MOCK_MARKER} · ${input.namePl}`,
        unit,
        priceNet,
        currency: "PLN",
        priceDate: input.nowIso.slice(0, 10),
        retrievedAt: input.nowIso,
        provenance: "mock_test",
        notes: `${MMR_MOCK_MARKER} · provider=${MMR_MOCK_PROVIDER_ID} · NOT Owner Accept · NOT Purchase`,
        materialKey: input.materialKey,
        catalogWorkId: input.catalogWorkId,
        region: input.region,
      };
      return { ok: true, candidate, autoAccepted: false };
    },
  };
}

/** Future live shops — stub only. connected=false until Legal PASS + Owner GO. */
export function createDisconnectedLiveProviderStub(
  id: "leroy" | "castorama" | "obi",
): MaterialResearchProvider {
  return {
    id,
    connected: false,
    async research(): Promise<MaterialResearchProviderResult> {
      return {
        ok: false,
        error: `${id}_NOT_CONNECTED_legal_gate_open`,
        autoAccepted: false,
      };
    },
  };
}
