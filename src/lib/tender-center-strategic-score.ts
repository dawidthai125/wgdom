/**
 * Tender Center PRO — Strategic Score (ETAP 2B).
 * Ocena strategiczna przetargu w kontekście kondycji W&G DOM (0–100).
 */

import type { Job } from "@/app/app-domain";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  computePipelineFunnel,
  isTenderOpenForOffers,
} from "@/lib/tenders-bzp";
import type { TenderCompanyProfile } from "@/lib/tenders-bzp-company";
import { estimatedValuePlnFromItem } from "@/lib/tenders-bzp-fit";
import type { GrowthMode } from "@/lib/tender-center-growth-mode";
import { GROWTH_MODE_LABELS, minOpportunityScoreForMode } from "@/lib/tender-center-growth-mode";
import type { CompanyHealthResult } from "@/lib/tender-center-health";
import { aggregateMarketKpi, countPreparingOffers, type TenderCenterMarketKpi } from "@/lib/tender-center-kpi";
import { computeWadiumInfo } from "@/lib/tenders-wadium";

export type StrategicScoreLabel = "STARTUJ" | "ANALIZUJ" | "ODPUŚĆ";

export interface StrategicScoreResult {
  score: number;
  label: StrategicScoreLabel;
  reasons: string[];
}

export interface StrategicScoreContext {
  health: CompanyHealthResult;
  growthMode: GrowthMode;
  jobs: Job[];
  items: TenderPipelineItem[];
  profile: TenderCompanyProfile;
  now?: Date;
  /** Precomputed KPI — pomija redundantne aggregateMarketKpi w scoreWadiumCapacity (Performance 2.1A). */
  marketKpi?: TenderCenterMarketKpi;
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function labelFromScore(score: number): StrategicScoreLabel {
  if (score >= 65) return "STARTUJ";
  if (score >= 40) return "ANALIZUJ";
  return "ODPUŚĆ";
}

function scoreHealth(health: CompanyHealthResult): { pts: number; reason?: string } {
  const h = health.index;
  if (h >= 80) return { pts: 22, reason: "+ wysoki Health Index firmy" };
  if (h >= 60) return { pts: 16, reason: "+ stabilna kondycja firmy" };
  if (h >= 40) return { pts: 8, reason: "− napięta kondycja firmy" };
  return { pts: 0, reason: "− ryzykowna kondycja — ogranicz nowe oferty" };
}

function scoreGrowthMode(mode: GrowthMode, valuePln: number | null, profile: TenderCompanyProfile): { pts: number; reason?: string } {
  const minOpp = minOpportunityScoreForMode(mode);
  let pts = 8;
  if (mode === "stabilize") {
    pts = 4;
    if (valuePln != null && valuePln > profile.maxOrderValuePln * 0.6) {
      return { pts: 2, reason: "− tryb Stabilizacja — duży kontrakt" };
    }
    return { pts, reason: `− tryb ${GROWTH_MODE_LABELS[mode]} (ostrożny)` };
  }
  if (mode === "balanced") return { pts: 10, reason: `+ tryb ${GROWTH_MODE_LABELS[mode]}` };
  if (mode === "growth") {
    pts = 12;
    return { pts, reason: `+ tryb ${GROWTH_MODE_LABELS[mode]} — przestrzeń na wzrost` };
  }
  if (mode === "expansion") {
    pts = 14;
    if (valuePln != null && valuePln >= profile.minOrderValuePln) {
      return { pts, reason: `+ tryb ${GROWTH_MODE_LABELS[mode]} — ekspansja aktywna` };
    }
    return { pts: 8, reason: `+ tryb ekspansji (min. radar ${minOpp})` };
  }
  return { pts, reason: `+ tryb ${GROWTH_MODE_LABELS[mode]}` };
}

function scoreActiveJobs(jobs: Job[], profile: TenderCompanyProfile): { pts: number; reason?: string } {
  const active = jobs.filter((j) => j.status === "in_progress").length;
  const max = Math.max(profile.maxConcurrentProjects, 1);
  const ratio = active / max;
  if (ratio <= 0.6) return { pts: 14, reason: "+ wolna pojemność robót" };
  if (ratio <= 0.85) return { pts: 10, reason: "+ umiarkowane obłożenie robót" };
  if (ratio <= 1) return { pts: 5, reason: "− wysokie obłożenie robót" };
  return { pts: 0, reason: "− przekroczony limit równoległych robót" };
}

function scoreOverload(items: TenderPipelineItem[], profile: TenderCompanyProfile): { pts: number; reason?: string } {
  const preparing = countPreparingOffers(items);
  const max = Math.max(profile.maxConcurrentProjects, 1);
  const ratio = preparing / max;
  if (ratio < 0.5) return { pts: 12, reason: "+ pipeline ofert nie przeciążony" };
  if (ratio < 1) return { pts: 7, reason: "− rosnące obłożenie ofert" };
  if (ratio < 1.5) return { pts: 3, reason: "− przeciążenie równoległych ofert" };
  return { pts: 0, reason: "− krytyczne przeciążenie pipeline" };
}

function scoreFreeResources(health: CompanyHealthResult): { pts: number; reason?: string } {
  const slots = health.freeSlots;
  if (slots >= 3) return { pts: 12, reason: "+ wolne zasoby dziś (≥3 os.)" };
  if (slots >= 1) return { pts: 8, reason: "+ częściowo wolne zasoby" };
  return { pts: 2, reason: "− brak wolnych slotów zespołu" };
}

function scoreWinHistory(items: TenderPipelineItem[]): { pts: number; reason?: string } {
  const funnel = computePipelineFunnel(items);
  const decided = funnel.won + funnel.lost;
  if (decided === 0) return { pts: 6, reason: "− brak historii wygranych/przegranych" };
  const rate = funnel.winRate ?? 0;
  if (rate >= 45) return { pts: 10, reason: `+ skuteczność przetargowa ${rate}%` };
  if (rate >= 25) return { pts: 7, reason: `+ umiarkowana skuteczność ${rate}%` };
  return { pts: 3, reason: `− niska skuteczność ${rate}%` };
}

function scoreContractSize(
  valuePln: number | null,
  profile: TenderCompanyProfile,
  health: CompanyHealthResult,
): { pts: number; reason?: string } {
  if (valuePln == null) return { pts: 4 };
  const ref = Math.max(profile.referenceExperiencePln, 1);
  const ratio = valuePln / ref;
  if (ratio <= 0.3) return { pts: 6, reason: "− kontrakt mały względem doświadczenia firmy" };
  if (ratio <= 1.2) return { pts: 14, reason: "+ wielkość kontraktu adekwatna do firmy" };
  if (ratio <= 2.5 && health.index >= 65) {
    return { pts: 10, reason: "+ duży kontrakt — firma ma kondycję na skalowanie" };
  }
  if (ratio > 2.5) return { pts: 3, reason: "− kontrakt bardzo duży względem firmy" };
  return { pts: 6, reason: "− kontrakt powyżej typowego doświadczenia" };
}

function scoreWadiumCapacity(
  item: TenderPipelineItem,
  profile: TenderCompanyProfile,
  items: TenderPipelineItem[],
  marketKpi?: TenderCenterMarketKpi,
): { pts: number; reason?: string } {
  const w = computeWadiumInfo(item, item.swzAnalysis ?? null, profile.maxWadiumPln);
  if (w.blocked) return { pts: 0, reason: "− brak headroomu na wadium" };
  const kpi = marketKpi ?? aggregateMarketKpi(items, profile);
  if (kpi.wadiumHeadroomPln <= 0 && w.amountPln != null) {
    return { pts: 2, reason: "− wadium innych ofert blokuje kapitał" };
  }
  if (kpi.wadiumHeadroomPln >= (w.amountPln ?? 0)) {
    return { pts: 8, reason: "+ wystarczający headroom wadium" };
  }
  return { pts: 4 };
}

export function computeStrategicScore(
  item: TenderPipelineItem,
  context: StrategicScoreContext,
): StrategicScoreResult {
  const now = context.now ?? new Date();
  if (!isTenderOpenForOffers(item.submittingOffersDate, now)) {
    return { score: 0, label: "ODPUŚĆ", reasons: ["− przetarg nieaktywny"] };
  }

  const valuePln = estimatedValuePlnFromItem(item, item.swzAnalysis ?? null);
  const reasons: string[] = [];

  const parts = [
    scoreHealth(context.health),
    scoreGrowthMode(context.growthMode, valuePln, context.profile),
    scoreActiveJobs(context.jobs, context.profile),
    scoreOverload(context.items, context.profile),
    scoreFreeResources(context.health),
    scoreWinHistory(context.items),
    scoreContractSize(valuePln, context.profile, context.health),
    scoreWadiumCapacity(item, context.profile, context.items, context.marketKpi),
  ];

  let total = 0;
  for (const p of parts) {
    total += p.pts;
    if (p.reason) reasons.push(p.reason);
  }

  const score = clamp(Math.round(total), 0, 100);
  return {
    score,
    label: labelFromScore(score),
    reasons: [...new Set(reasons)].slice(0, 5),
  };
}
