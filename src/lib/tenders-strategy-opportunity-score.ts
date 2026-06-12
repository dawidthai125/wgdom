/**
 * Tender Center PRO — Opportunity Score (ETAP 2B).
 * Ocena atrakcyjności pojedynczego przetargu (0–100).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  daysUntilTenderDeadline,
  isTenderOpenForOffers,
} from "@/lib/tenders-bzp";
import type { TenderCompanyProfile } from "@/lib/tenders-bzp-company";
import {
  estimatedValuePlnFromItem,
  extractRequiredReferencePln,
} from "@/lib/tenders-bzp-fit";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import { stripHtmlToText } from "@/lib/tenders-bzp-swz";

export type OpportunityScoreLabel =
  | "PRIORYTET"
  | "WYSOKA"
  | "ANALIZUJ"
  | "NISKA"
  | "SŁABA";

export interface OpportunityScoreResult {
  score: number;
  label: OpportunityScoreLabel;
  reasons: string[];
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function labelFromScore(score: number): OpportunityScoreLabel {
  if (score >= 80) return "PRIORYTET";
  if (score >= 65) return "WYSOKA";
  if (score >= 50) return "ANALIZUJ";
  if (score >= 35) return "NISKA";
  return "SŁABA";
}

function tenderReferenceText(item: TenderPipelineItem): string {
  const swz = item.swzAnalysis;
  return [
    item.title,
    item.noticeHtml ? stripHtmlToText(item.noticeHtml) : "",
    swz?.referenceRequirement ?? "",
    swz?.estimatedValueRaw ?? "",
  ].join("\n");
}

function scoreValuePln(valuePln: number | null, profile: TenderCompanyProfile): { pts: number; reason?: string } {
  if (valuePln == null || valuePln <= 0) {
    return { pts: 2, reason: "− brak wartości przetargu" };
  }
  const min = profile.minOrderValuePln;
  const max = profile.maxOrderValuePln;
  if (valuePln < min * 0.5) {
    return { pts: 6, reason: "− niska wartość kontraktu" };
  }
  if (valuePln < min) {
    return { pts: 10, reason: "− wartość poniżej minimum firmy" };
  }
  if (valuePln <= max) {
    return { pts: 18, reason: "+ wartość w docelowym zakresie firmy" };
  }
  if (valuePln <= max * 1.5) {
    return { pts: 14, reason: "+ wysoka wartość (powyżej typowego max)" };
  }
  return { pts: 8, reason: "− kontrakt bardzo duży względem profilu" };
}

function scoreDeadline(item: TenderPipelineItem, now: Date): { pts: number; reason?: string } {
  if (!isTenderOpenForOffers(item.submittingOffersDate, now)) {
    return { pts: 0, reason: "− termin składania minął" };
  }
  const days = daysUntilTenderDeadline(item.submittingOffersDate, now);
  if (days == null) return { pts: 8 };
  if (days < 0) return { pts: 0, reason: "− termin minął" };
  if (days <= 3) return { pts: 4, reason: "− bardzo krótki termin (≤3 dni)" };
  if (days <= 7) return { pts: 8, reason: "− krótki termin (≤7 dni)" };
  if (days <= 14) return { pts: 12, reason: "+ termin w granicach 2 tygodni" };
  if (days <= 45) return { pts: 15, reason: "+ komfortowy termin składania" };
  return { pts: 11, reason: "+ długi termin (ponad 45 dni)" };
}

function scoreSwz(item: TenderPipelineItem): { pts: number; reason?: string } {
  const swz = item.swzAnalysis;
  if (!swz) return { pts: 0, reason: "− brak analizy SWZ" };
  let pts = 8;
  const reasons: string[] = [];
  if (swz.estimatedValuePln != null) pts += 4;
  else reasons.push("− brak szacunku wartości w SWZ");
  if (swz.profitabilityHint === "good") {
    pts += 3;
    reasons.push("+ SWZ wskazuje dobrą opłacalność");
  } else if (swz.profitabilityHint === "risky") {
    pts -= 4;
    reasons.push("− SWZ wskazuje ryzyko opłacalności");
  }
  if (item.uploadedFile || (item.bzpDocuments?.length ?? 0) > 0) pts += 2;
  return { pts, reason: reasons[0] ?? "+ analiza SWZ gotowa" };
}

function scoreEstimate(item: TenderPipelineItem): { pts: number; reason?: string } {
  const bid = item.ourEstimatePln
    ?? item.tenderDossier?.bidProposal?.recommendedBidPln
    ?? null;
  if (bid != null && bid > 0) {
    return { pts: 12, reason: "+ mamy wycenę / rekomendację oferty" };
  }
  if (item.tenderDossier?.kosztorys?.ok) {
    return { pts: 7, reason: "+ kosztorys w dossier (bez finalnej oferty)" };
  }
  return { pts: 0, reason: "− brak naszej wyceny" };
}

function scoreFit(item: TenderPipelineItem): { pts: number; reasons: string[] } {
  const reasons: string[] = [];
  const fit = item.tenderFit;
  if (fit && fit.fitLabel !== "unknown") {
    let pts = clamp(Math.round(fit.fitScore * 0.2), 0, 20);
    if (fit.fitLabel === "strong") {
      pts = Math.max(pts, 16);
      reasons.push("+ dobre dopasowanie profilu");
    } else if (fit.fitLabel === "possible") {
      pts = Math.max(pts, 10);
      reasons.push("+ umiarkowane dopasowanie");
    } else {
      pts = Math.min(pts, 6);
      reasons.push("− słabe dopasowanie profilu");
    }
    if (fit.blockingIssues.length > 0) {
      pts -= Math.min(8, fit.blockingIssues.length * 3);
      reasons.push(`− ${fit.blockingIssues.length} blokad(y) wymagań`);
    }
    if (fit.winChancePct != null && fit.winChancePct >= 40) {
      reasons.push(`+ szacowane szanse ${fit.winChancePct}%`);
    }
    return { pts: clamp(pts, 0, 20), reasons };
  }
  const rel = item.relevanceScore;
  const pts = clamp(Math.round(rel * 0.35), 0, 14);
  if (rel >= 25) reasons.push("+ wysoka trafność słów kluczowych");
  else if (rel >= 15) reasons.push("+ umiarkowana trafność");
  else reasons.push("− niska trafność (brak pełnego tenderFit)");
  return { pts, reasons };
}

function scoreReferences(item: TenderPipelineItem, profile: TenderCompanyProfile): { pts: number; reason?: string } {
  const required = extractRequiredReferencePln(tenderReferenceText(item));
  if (required == null) return { pts: 8, reason: "+ brak wymogu referencji w danych" };
  if (required <= profile.referenceExperiencePln && required <= profile.totalReferencesPln) {
    return { pts: 10, reason: "+ referencje w zakresie firmy" };
  }
  if (required <= profile.totalReferencesPln * 1.2) {
    return { pts: 5, reason: "− referencje na granicy możliwości" };
  }
  return { pts: 0, reason: "− wymagane referencje przekraczają portfolio" };
}

function scoreWadium(item: TenderPipelineItem, profile: TenderCompanyProfile): { pts: number; reason?: string } {
  const w = computeWadiumInfo(item, item.swzAnalysis ?? null, profile.maxWadiumPln);
  if (w.amountPln == null) return { pts: 6 };
  if (w.blocked) return { pts: 0, reason: "− wadium blokuje udział" };
  if (w.amountPln <= profile.maxWadiumPln * 0.5) {
    return { pts: 10, reason: "+ wadium w bezpiecznym zakresie" };
  }
  return { pts: 7, reason: "+ wadium mieszczące się w limicie" };
}

function scoreLocation(item: TenderPipelineItem): { pts: number; reasons: string[] } {
  const reasons: string[] = [];
  let pts = 0;
  if (item.isWroclaw) {
    pts += 4;
    reasons.push("+ lokalizacja Wrocław");
  }
  if (item.priorityBuyerId) {
    pts += 3;
    reasons.push("+ kluczowy zamawiający");
  }
  if (pts === 0) reasons.push("− poza priorytetową lokalizacją");
  return { pts, reasons };
}

function scoreDataCompleteness(item: TenderPipelineItem): { pts: number; reasons: string[] } {
  let pts = 0;
  const reasons: string[] = [];
  if (item.submittingOffersDate) pts += 1;
  if (item.cpvCode) pts += 1;
  if (item.swzAnalysis) pts += 1;
  if (item.tenderFit) pts += 1;
  if ((item.bzpDocuments?.length ?? 0) > 0 || item.uploadedFile) pts += 1;
  if (pts >= 4) reasons.push("+ kompletne dane do decyzji");
  else if (pts >= 2) reasons.push("− częściowa kompletność danych");
  else reasons.push("− brak kluczowych danych");
  return { pts, reasons };
}

export function computeOpportunityScore(
  item: TenderPipelineItem,
  profile: TenderCompanyProfile,
  now: Date = new Date(),
): OpportunityScoreResult {
  if (!isTenderOpenForOffers(item.submittingOffersDate, now)) {
    return {
      score: 0,
      label: "SŁABA",
      reasons: ["− przetarg zamknięty (termin minął)"],
    };
  }

  const valuePln = estimatedValuePlnFromItem(item, item.swzAnalysis ?? null);
  const reasons: string[] = [];

  const parts = [
    scoreValuePln(valuePln, profile),
    scoreDeadline(item, now),
    scoreSwz(item),
    scoreEstimate(item),
    scoreFit(item),
    scoreReferences(item, profile),
    scoreWadium(item, profile),
    scoreLocation(item),
    scoreDataCompleteness(item),
  ];

  let total = 0;
  for (const p of parts) {
    total += "pts" in p ? p.pts : 0;
    if ("reason" in p && p.reason) reasons.push(p.reason);
    if ("reasons" in p && p.reasons) reasons.push(...p.reasons);
  }

  const score = clamp(Math.round(total), 0, 100);
  const deduped = [...new Set(reasons)].slice(0, 6);

  return {
    score,
    label: labelFromScore(score),
    reasons: deduped.length > 0 ? deduped : ["Brak szczegółowych sygnałów"],
  };
}
