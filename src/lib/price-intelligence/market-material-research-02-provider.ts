/**
 * MARKET-MATERIAL-RESEARCH-02 — production provider factory + candidate validation.
 *
 * Legal PASS + D1 VERIFIED → liveHttpEligible.
 * REAL-SOURCE-LIVE-ADAPTERS-08: selective DIY trio (Leroy/Castorama/OBI) when eligible.
 * Shared Legal Gate: isMarketSyncP3LegalPass() — do NOT create a second gate.
 * Mock remains harness-only (useMockForTests / mockPriceNet / explicit provider).
 */

import { isMarketSyncP3LegalPass } from "@/lib/market-sync/p3-flag";
import type { PriceCandidate } from "./price-candidate-types";
import {
  MMR_02_DISCONNECTED_PROVIDER_ID,
  MMR_02_PACKAGE_UNITS,
  MMR_02_PRIMARY_SOURCE_STATUS,
  type Mmr02PrimarySourceStatus,
} from "./market-material-research-02-config";
import {
  createProviderLoadGuardState,
  wrapProviderWithLoadGuards,
  type ProviderLoadGuardState,
} from "./market-material-research-02-guards";
import {
  createDisconnectedLiveProviderStub,
  createMockManualResearchProvider,
  normalizeResearchUnit,
  unitsCompatible,
} from "./market-material-research-provider";
import type {
  MaterialResearchProvider,
  MaterialResearchProviderInput,
  MaterialResearchProviderResult,
} from "./market-material-research-types";
import type { DiySelectiveLookupPort } from "./diy-selective-lookup-types";
import { createEdgeDiySelectiveLookup } from "./diy-selective-lookup-client";
import { createSelectiveDiyTrioResearchProvider } from "./mmr-selective-diy-provider";

export type Mmr02DisconnectReason =
  | "D1_PRIMARY_SOURCE_UNKNOWN"
  | "LEGAL_GATE_OPEN"
  | "ADAPTER_NOT_IMPLEMENTED"
  | "SOURCE_UNAVAILABLE";

export type ResolveMmr02Phase2ProviderOpts = {
  nowMs?: number;
  /** Test harness only — mock candidates (never production default). */
  useMockForTests?: boolean;
  mockPriceNet?: number;
  /** Overrides — test only; must not mutate MARKET_SYNC_P3_LEGAL_GATE. */
  legalPassOverride?: boolean;
  primaryStatusOverride?: Mmr02PrimarySourceStatus;
  /** If set, wrap this inner (test probe). */
  probeInner?: MaterialResearchProvider;
  guardState?: ProviderLoadGuardState;
  /**
   * DIY selective lookup port (REAL-SOURCE-LIVE-ADAPTERS-08).
   * Tests: fixture/null · Production default: Edge proxy.
   */
  diyLookup?: DiySelectiveLookupPort;
};

export type ResolveMmr02Phase2ProviderResult = {
  provider: MaterialResearchProvider;
  liveHttpEligible: boolean;
  connected: boolean;
  reason:
    | Mmr02DisconnectReason
    | "MOCK_TEST"
    | "PROBE"
    | "OK_DISCONNECTED_NO_ADAPTER"
    | "OK_DIY_SELECTIVE";
  httpFetchCount: number;
  guardState: ProviderLoadGuardState;
};

export function isMmr02LiveHttpEligible(opts?: {
  legalPass?: boolean;
  primaryStatus?: Mmr02PrimarySourceStatus;
}): boolean {
  const legalOk = opts?.legalPass ?? isMarketSyncP3LegalPass();
  const d1 = opts?.primaryStatus ?? MMR_02_PRIMARY_SOURCE_STATUS;
  return legalOk && d1 !== "UNKNOWN";
}

/**
 * Disconnected production adapter — controlled PRICE_GAP / SOURCE_UNAVAILABLE.
 * Does NOT invent PLN. Does NOT call fetch.
 */
export function createMmr02DisconnectedProvider(
  reason: Mmr02DisconnectReason,
): MaterialResearchProvider {
  return {
    id: MMR_02_DISCONNECTED_PROVIDER_ID,
    connected: false,
    async research(
      _input: MaterialResearchProviderInput,
    ): Promise<MaterialResearchProviderResult> {
      return {
        ok: false,
        error: reason,
        autoAccepted: false,
      };
    },
  };
}

/** Shop stubs remain disconnected until thin live adapters (Owner GO IMPLEMENT). */
export function createMmr02ShopStubs(): MaterialResearchProvider[] {
  return [
    createDisconnectedLiveProviderStub("leroy"),
    createDisconnectedLiveProviderStub("castorama"),
    createDisconnectedLiveProviderStub("obi"),
  ];
}

export type ResearchCandidateValidationDraft = {
  materialKey: string;
  unit: string;
  currency?: string;
  provenance?: PriceCandidate["provenance"] | null;
  priceNet?: number;
  /** Explicit package / pack retail price without conversion SSOT. */
  isPackagePrice?: boolean;
  packageConversionApproved?: boolean;
};

/**
 * Candidate validation — wrong identity/unit/provenance/package/currency → GAP.
 * Does not persist. Does not invent conversion.
 */
export function validateResearchCandidate(opts: {
  requestMaterialKey: string;
  requestUnit: string;
  draft: ResearchCandidateValidationDraft;
}): { ok: true } | { ok: false; gap: string } {
  const { draft } = opts;
  if (!draft.materialKey || draft.materialKey !== opts.requestMaterialKey) {
    return { ok: false, gap: "WRONG_MATERIAL_IDENTITY" };
  }
  if (!draft.provenance) {
    return { ok: false, gap: "MISSING_PROVENANCE" };
  }
  const currency = String(draft.currency || "").trim().toUpperCase();
  if (!currency || currency !== "PLN") {
    return { ok: false, gap: "UNKNOWN_CURRENCY" };
  }
  const unitNorm = normalizeResearchUnit(draft.unit);
  if (draft.isPackagePrice && !draft.packageConversionApproved) {
    return { ok: false, gap: "PACKAGE_PRICE_NO_CONVERSION_SSOT" };
  }
  if (MMR_02_PACKAGE_UNITS.has(unitNorm) && !draft.packageConversionApproved) {
    return { ok: false, gap: "PACKAGE_PRICE_NO_CONVERSION_SSOT" };
  }
  if (!unitsCompatible(opts.requestUnit, draft.unit)) {
    return { ok: false, gap: "WRONG_UNIT" };
  }
  if (!(typeof draft.priceNet === "number" && Number.isFinite(draft.priceNet) && draft.priceNet > 0)) {
    return { ok: false, gap: "PRICE_GAP" };
  }
  return { ok: true };
}

/**
 * Resolve Phase-2 provider for production / harness.
 *
 * Production (Legal PASS + D1 VERIFIED): selective DIY trio (LIVE-ADAPTERS-08).
 * Harness: useMockForTests / mockPriceNet / diyLookup override / probeInner.
 */
export function resolveMmr02Phase2Provider(
  opts?: ResolveMmr02Phase2ProviderOpts,
): ResolveMmr02Phase2ProviderResult {
  const guardState = opts?.guardState ?? createProviderLoadGuardState();
  const legalPass = opts?.legalPassOverride ?? isMarketSyncP3LegalPass();
  const primaryStatus = opts?.primaryStatusOverride ?? MMR_02_PRIMARY_SOURCE_STATUS;
  const liveHttpEligible = isMmr02LiveHttpEligible({
    legalPass,
    primaryStatus,
  });

  if (opts?.useMockForTests || opts?.mockPriceNet != null) {
    const mock = createMockManualResearchProvider({ mockPriceNet: opts.mockPriceNet });
    return {
      provider: mock,
      liveHttpEligible: false,
      connected: mock.connected,
      reason: "MOCK_TEST",
      httpFetchCount: 0,
      guardState,
    };
  }

  if (!legalPass) {
    const provider = createMmr02DisconnectedProvider("LEGAL_GATE_OPEN");
    return {
      provider,
      liveHttpEligible: false,
      connected: false,
      reason: "LEGAL_GATE_OPEN",
      httpFetchCount: 0,
      guardState,
    };
  }

  if (primaryStatus === "UNKNOWN") {
    const provider = createMmr02DisconnectedProvider("D1_PRIMARY_SOURCE_UNKNOWN");
    return {
      provider,
      liveHttpEligible: false,
      connected: false,
      reason: "D1_PRIMARY_SOURCE_UNKNOWN",
      httpFetchCount: 0,
      guardState,
    };
  }

  if (opts?.probeInner) {
    const wrapped = wrapProviderWithLoadGuards(opts.probeInner, {
      state: guardState,
      nowMs: () => opts.nowMs ?? Date.now(),
    });
    return {
      provider: wrapped,
      liveHttpEligible: true,
      connected: wrapped.connected,
      reason: "PROBE",
      httpFetchCount: guardState.httpFetchCount,
      guardState,
    };
  }

  // LIVE-ADAPTERS-08 — selective LM/Casto/OBI (ONE materialKey · never catalogue).
  const lookup = opts?.diyLookup ?? createEdgeDiySelectiveLookup();
  const diy = createSelectiveDiyTrioResearchProvider({ lookup });
  const wrapped = wrapProviderWithLoadGuards(diy, {
    state: guardState,
    nowMs: () => opts?.nowMs ?? Date.now(),
  });
  return {
    provider: wrapped,
    liveHttpEligible,
    connected: wrapped.connected,
    reason: "OK_DIY_SELECTIVE",
    httpFetchCount: guardState.httpFetchCount,
    guardState,
  };
}
