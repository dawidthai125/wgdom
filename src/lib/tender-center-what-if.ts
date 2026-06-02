/**
 * Tender Center PRO — Co jeśli? (ETAP 6A/6B).
 * Presety scenariuszy vs baseline (50% GO · obecny limit slotów). Runtime only.
 */

import type { TenderScoringBundle } from "@/lib/tender-center-decision";
import type {
  Forecast90DaysInput,
  ForecastHorizon,
  ForecastScenarioId,
  ForecastScenarioResult,
} from "@/lib/tender-center-forecast-90d";
import { computeSingleForecastScenario } from "@/lib/tender-center-forecast-90d";

export type WhatIfPresetId =
  | "baseline"
  | "none"
  | "half_go"
  | "all_go"
  | "plus_one_slot"
  | "custom";

export const WHAT_IF_PRESET_LABELS: Record<WhatIfPresetId, string> = {
  baseline: "Baseline (dziś)",
  none: "Nie wygram nic",
  half_go: "Wygram 50% GO",
  all_go: "Wygram wszystkie GO",
  plus_one_slot: "+1 slot równoległy",
  custom: "Własny scenariusz",
};

export const WHAT_IF_PRESET_ORDER: WhatIfPresetId[] = [
  "baseline",
  "none",
  "half_go",
  "all_go",
  "plus_one_slot",
  "custom",
];

export interface WhatIfHorizonDelta {
  days: 30 | 60 | 90;
  baselinePct: number;
  simulatedPct: number;
  deltaPct: number;
  baselineActiveJobs: number;
  simulatedActiveJobs: number;
}

export interface WhatIfComparisonResult {
  presetId: WhatIfPresetId;
  presetLabel: string;
  baseline: ForecastScenarioResult;
  simulated: ForecastScenarioResult;
  horizons: WhatIfHorizonDelta[];
  biggestChangeHorizon: 30 | 60 | 90;
  biggestChangeDeltaPct: number;
  conclusion: string;
  maxConcurrentBaseline: number;
  maxConcurrentSimulated: number;
  customWinCount?: number;
}

interface PresetRunSpec {
  scenarioId?: ForecastScenarioId;
  maxConcurrentDelta?: number;
  customWinTenderIds?: string[];
}

function presetRunSpec(
  presetId: WhatIfPresetId,
  customWinTenderIds?: string[],
): PresetRunSpec {
  switch (presetId) {
    case "baseline":
    case "half_go":
      return { scenarioId: "half_go" };
    case "none":
      return { scenarioId: "none" };
    case "all_go":
      return { scenarioId: "all_go" };
    case "plus_one_slot":
      return { scenarioId: "half_go", maxConcurrentDelta: 1 };
    case "custom":
      return { customWinTenderIds: customWinTenderIds ?? [] };
  }
}

/** Etykieta checkboxa — np. „MOPS Wrocław”. */
export function whatIfGoCandidateLabel(bundle: TenderScoringBundle): string {
  const org = bundle.item.organizationName?.trim() || "Zamawiający";
  const city = bundle.item.isWroclaw
    ? "Wrocław"
    : bundle.item.organizationCity?.trim();
  if (city && !org.toLowerCase().includes(city.toLowerCase())) {
    return `${org} ${city}`.slice(0, 56);
  }
  return org.slice(0, 56);
}

/** Domyślny wybór własny = ten sam zestaw co scenariusz C (50% GO). */
export function defaultCustomWinTenderIds(goCandidates: TenderScoringBundle[]): string[] {
  const n = Math.ceil(goCandidates.length * 0.5);
  return goCandidates.slice(0, n).map((b) => b.item.id);
}

function horizonByDays(
  scenario: ForecastScenarioResult,
  days: 30 | 60 | 90,
): ForecastHorizon {
  return scenario.horizons.find((h) => h.days === days)
    ?? { days, utilizationPct: 0, activeJobs: 0, risk: "BRAK_ROBOT" };
}

function buildHorizonDeltas(
  baseline: ForecastScenarioResult,
  simulated: ForecastScenarioResult,
): WhatIfHorizonDelta[] {
  return ([30, 60, 90] as const).map((days) => {
    const b = horizonByDays(baseline, days);
    const s = horizonByDays(simulated, days);
    return {
      days,
      baselinePct: b.utilizationPct,
      simulatedPct: s.utilizationPct,
      deltaPct: s.utilizationPct - b.utilizationPct,
      baselineActiveJobs: b.activeJobs,
      simulatedActiveJobs: s.activeJobs,
    };
  });
}

function findBiggestChange(horizons: WhatIfHorizonDelta[]): {
  horizon: 30 | 60 | 90;
  delta: number;
} {
  let best = horizons[0];
  for (const h of horizons) {
    if (Math.abs(h.deltaPct) >= Math.abs(best.deltaPct)) best = h;
  }
  return { horizon: best.days, delta: best.deltaPct };
}

function buildConclusion(
  presetId: WhatIfPresetId,
  presetLabel: string,
  biggestHorizon: 30 | 60 | 90,
  biggestDelta: number,
  simulated: ForecastScenarioResult,
  customWinCount?: number,
): string {
  if (presetId === "baseline") {
    return "To punkt odniesienia — scenariusz C (50% GO) przy obecnym limicie równoległych robót.";
  }

  if (presetId === "custom" && customWinCount === 0) {
    return "Własny scenariusz bez wybranych wygranych GO — obłożenie jak przy braku nowych kontraktów.";
  }

  if (biggestDelta === 0) {
    return `Scenariusz „${presetLabel}” nie zmienia obłożenia względem baseline w horyzoncie 90 dni.`;
  }

  const abs = Math.abs(biggestDelta);

  if (biggestDelta > 0) {
    if (simulated.horizons.some((h) => h.utilizationPct > 100)) {
      return `Scenariusz „${presetLabel}” podnosi obłożenie o ${abs}% za ${biggestHorizon} dni — ryzyko przeciążenia slotów.`;
    }
    return `Scenariusz „${presetLabel}” zwiększa obłożenie o ${abs}% za ${biggestHorizon} dni względem baseline.`;
  }

  if (simulated.horizons.some((h) => h.utilizationPct < 30)) {
    return `Scenariusz „${presetLabel}” obniża obłożenie o ${abs}% za ${biggestHorizon} dni — ryzyko pustych slotów produkcyjnych.`;
  }
  return `Scenariusz „${presetLabel}” obniża obłożenie o ${abs}% za ${biggestHorizon} dni względem baseline.`;
}

function resolvePresetLabel(
  presetId: WhatIfPresetId,
  simulated: ForecastScenarioResult,
  customWinCount?: number,
): string {
  if (presetId === "custom" && customWinCount != null) {
    return customWinCount === 0
      ? "Własny — brak wygranych"
      : `Własny — ${customWinCount} wygranych GO`;
  }
  return WHAT_IF_PRESET_LABELS[presetId];
}

export function computeWhatIfComparison(
  input: Forecast90DaysInput,
  presetId: WhatIfPresetId,
  customWinTenderIds?: string[],
): WhatIfComparisonResult {
  const baseline = computeSingleForecastScenario(input, { scenarioId: "half_go" });
  const spec = presetRunSpec(presetId, customWinTenderIds);
  const simulated = computeSingleForecastScenario(input, spec);

  const customWinCount = spec.customWinTenderIds?.length;
  const presetLabel = resolvePresetLabel(presetId, simulated, customWinCount);

  const horizons = buildHorizonDeltas(baseline, simulated);
  const { horizon: biggestChangeHorizon, delta: biggestChangeDeltaPct } = findBiggestChange(horizons);

  const ctxMax = input.profile.maxConcurrentProjects;
  const maxConcurrentBaseline = Math.max(ctxMax, 1);
  const maxConcurrentSimulated = Math.max(
    ctxMax + (spec.maxConcurrentDelta ?? 0),
    1,
  );

  return {
    presetId,
    presetLabel,
    baseline,
    simulated,
    horizons,
    biggestChangeHorizon,
    biggestChangeDeltaPct,
    conclusion: buildConclusion(
      presetId,
      presetLabel,
      biggestChangeHorizon,
      biggestChangeDeltaPct,
      simulated,
      customWinCount,
    ),
    maxConcurrentBaseline,
    maxConcurrentSimulated,
    customWinCount: presetId === "custom" ? customWinCount : undefined,
  };
}

/** Wszystkie presety naraz (bez custom — wymaga id). */
export function computeAllWhatIfPresets(
  input: Forecast90DaysInput,
): Record<Exclude<WhatIfPresetId, "custom">, WhatIfComparisonResult> {
  const out = {} as Record<Exclude<WhatIfPresetId, "custom">, WhatIfComparisonResult>;
  for (const id of WHAT_IF_PRESET_ORDER) {
    if (id === "custom") continue;
    out[id] = computeWhatIfComparison(input, id);
  }
  return out;
}

export function formatDeltaPct(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return "0";
}
