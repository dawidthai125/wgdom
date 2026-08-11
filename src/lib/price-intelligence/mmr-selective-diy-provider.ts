/**
 * REAL-SOURCE-LIVE-ADAPTERS-08 — selective DIY trio MaterialResearchProvider.
 *
 * PRICE MEMORY FIRST is enforced upstream (Phase1 / orchestrate CURRENT→REUSE).
 * This provider ONLY runs for a single materialKey research job.
 * NEVER catalogue / category harvest.
 */

import { roundMarketPricePln } from "@/lib/work-catalog/market-sources";
import type { PriceCandidate } from "./price-candidate-types";
import {
  averageQualifyingRegularMarketPrices,
  qualifyMarketResearchObservation,
  type QualifyingMarketObservationInput,
} from "./market-research-qualify";
import { parseDiyShopHtml } from "./diy-shop-html-parse";
import type { DiySelectiveLookupPort, DiyShopProviderId } from "./diy-selective-lookup-types";
import type {
  MaterialResearchProvider,
  MaterialResearchProviderInput,
  MaterialResearchProviderResult,
} from "./market-material-research-types";
import { unitsCompatible } from "./market-material-research-provider";

export const MMR_DIY_SELECTIVE_PROVIDER_ID = "mmr02_diy_selective" as const;

const SHOPS: DiyShopProviderId[] = ["leroy", "castorama", "obi"];

function pickProviderId(
  qualifying: QualifyingMarketObservationInput[],
): PriceCandidate["provider"] {
  const ids = [...new Set(qualifying.map((q) => q.provider))];
  if (ids.length === 1 && (ids[0] === "leroy" || ids[0] === "castorama" || ids[0] === "obi")) {
    return ids[0];
  }
  return "other";
}

export type CreateSelectiveDiyTrioProviderOpts = {
  lookup: DiySelectiveLookupPort;
  onShopAttempt?: (info: {
    materialKey: string;
    provider: DiyShopProviderId;
    ok: boolean;
    error?: string;
  }) => void;
};

/**
 * connected:true · research ONE materialKey across allowlisted shops (serial, bounded).
 * autoAccepted ALWAYS false — Owner Accept remains trust boundary.
 */
export function createSelectiveDiyTrioResearchProvider(
  opts: CreateSelectiveDiyTrioProviderOpts,
): MaterialResearchProvider {
  return {
    id: MMR_DIY_SELECTIVE_PROVIDER_ID,
    connected: true,
    async research(input: MaterialResearchProviderInput): Promise<MaterialResearchProviderResult> {
      const query = String(input.namePl || "").trim() || String(input.materialKey || "").trim();
      if (!query) {
        return { ok: false, error: "PRICE_GAP", autoAccepted: false };
      }

      const rawObs: QualifyingMarketObservationInput[] = [];
      let lastUrl: string | undefined;

      for (const provider of SHOPS) {
        const looked = await opts.lookup.lookup({
          provider,
          query,
          materialKey: input.materialKey,
          maxUrls: 1,
        });
        opts.onShopAttempt?.({
          materialKey: input.materialKey,
          provider,
          ok: looked.ok,
          error: looked.ok ? undefined : looked.error,
        });
        if (!looked.ok) continue;

        const parsed = parseDiyShopHtml({
          provider,
          html: looked.page.bodyText,
          query,
          sourceUrl: looked.page.finalUrl || looked.page.requestUrl,
        });
        if (!parsed?.identityMatched) continue;

        lastUrl = parsed.sourceUrl;
        rawObs.push({
          materialKey: input.materialKey,
          provider,
          priceNet: parsed.priceGrossPln,
          currency: "PLN",
          priceType: parsed.priceType,
          sellerKind: parsed.sellerKind,
          sellerName: parsed.sellerName,
          observedAt: looked.page.fetchedAtIso || input.nowIso,
          sourceUrl: parsed.sourceUrl,
          sku: parsed.sku,
        });
      }

      const avg = averageQualifyingRegularMarketPrices(rawObs);
      if (avg.status !== "ok" || avg.averagePln == null || avg.qualifyingCount < 1) {
        return { ok: false, error: "PRICE_GAP", autoAccepted: false };
      }

      const qOnly: QualifyingMarketObservationInput[] = [];
      for (const o of rawObs) {
        const r = qualifyMarketResearchObservation(o);
        if (r.ok) qOnly.push(r.observation);
      }
      if (qOnly.length === 0) {
        return { ok: false, error: "PRICE_GAP", autoAccepted: false };
      }

      const priceNet = roundMarketPricePln(avg.averagePln);
      const provider = pickProviderId(qOnly);
      const candidate: PriceCandidate = {
        candidateId: `diy_${input.researchJobId.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 36)}_${Date.parse(input.nowIso) || 0}`,
        demandId: input.demandId,
        provider,
        sourceType: "market_reference",
        name: input.namePl,
        unit: input.unit,
        priceNet,
        currency: "PLN",
        priceDate: input.nowIso.slice(0, 10),
        sourceUrl: lastUrl,
        retrievedAt: input.nowIso,
        provenance: "manual_owner",
        notes: [
          "live_selective_diy",
          `coverage=${avg.sourceCoverage}`,
          avg.isMultiSourceAverage ? "multi_source_average" : "single_source",
          `shops=${qOnly.map((q) => q.provider).join("+")}`,
          "pending_owner_accept",
        ].join(" · "),
        materialKey: input.materialKey,
        catalogWorkId: input.catalogWorkId,
        region: input.region,
        providerSku: qOnly.find((q) => q.sku)?.sku || undefined,
      };

      if (!unitsCompatible(input.unit, candidate.unit)) {
        return { ok: false, error: "WRONG_UNIT", autoAccepted: false };
      }
      if (candidate.materialKey !== input.materialKey) {
        return { ok: false, error: "WRONG_MATERIAL_IDENTITY", autoAccepted: false };
      }

      return { ok: true, candidate, autoAccepted: false };
    },
  };
}
