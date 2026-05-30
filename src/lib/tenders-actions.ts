/**
 * Akcje pipeline przetargów: chipy filtrów, alerty, auto-wyniki, .ics, porównania cen.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  daysUntilTenderDeadline,
  isTenderOpenForOffers,
  isActionableTender,
} from "@/lib/tenders-bzp";
import type { TenderCompanyProfile } from "@/lib/tenders-bzp-company";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import {
  estimatedValuePlnFromItem,
  extractRequiredReferencePln,
} from "@/lib/tenders-bzp-fit";
import { fmtPln, stripHtmlToText } from "@/lib/tenders-bzp-swz";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import { fetchTenderAwardResult, type TenderAwardResult } from "@/lib/tenders-bzp-award";
import { saveAs } from "file-saver";

export type TenderQuickFilter =
  | "deadline_no_bid"
  | "wadium_blocked"
  | "no_kosztorys"
  | "deadline_7d"
  | "reference_gap"
  | "overload";

export interface TenderActionChip {
  id: TenderQuickFilter;
  label: string;
  count: number;
  tone: "amber" | "red" | "violet" | "blue";
}

export interface TenderDashboardAlert {
  id: string;
  tenderId: string;
  title: string;
  message: string;
  tone: "amber" | "red";
}

export interface ReferenceMatchSummary {
  status: "ok" | "partial" | "gap" | "unknown";
  requiredPln: number | null;
  gapPln: number | null;
  summary: string;
}

export interface AwardPriceComparison {
  estimatedValuePln: number | null;
  ourEstimatePln: number | null;
  awardValuePln: number | null;
  winnerName: string | null;
  isUs: boolean;
  ourVsAwardPct: number | null;
  ourVsEstimatePct: number | null;
  awardVsEstimatePct: number | null;
  summaryLines: string[];
}

function profile(): TenderCompanyProfile {
  return loadCompanyProfileLocal();
}

function buildCombinedText(item: TenderPipelineItem): string {
  const swz = item.swzAnalysis;
  const parts = [
    item.title,
    item.noticeHtml ? stripHtmlToText(item.noticeHtml) : "",
    swz?.referenceRequirement ?? "",
    swz?.estimatedValueRaw ?? "",
  ];
  return parts.join("\n");
}

export function computeReferenceMatchSummary(
  item: TenderPipelineItem,
  prof = profile(),
): ReferenceMatchSummary {
  const swz = item.swzAnalysis;
  const requiredPln = extractRequiredReferencePln(buildCombinedText(item));
  if (requiredPln == null) {
    if (swz?.referenceRequirement) {
      return {
        status: "unknown",
        requiredPln: null,
        gapPln: null,
        summary: "Referencje — porównaj ręcznie z profilem firmy",
      };
    }
    return { status: "unknown", requiredPln: null, gapPln: null, summary: "Brak wymagań referencyjnych w SWZ" };
  }
  const okSingle = requiredPln <= prof.referenceExperiencePln;
  const okTotal = requiredPln <= prof.totalReferencesPln;
  if (okSingle) {
    return {
      status: "ok",
      requiredPln,
      gapPln: null,
      summary: `Referencje OK — wymagane ${fmtPln(requiredPln)}, max ref. ${fmtPln(prof.referenceExperiencePln)}`,
    };
  }
  if (okTotal) {
    const gap = Math.max(0, requiredPln - prof.referenceExperiencePln);
    return {
      status: "partial",
      requiredPln,
      gapPln: gap,
      summary: `Referencje częściowo — połącz ref. (brakuje ${fmtPln(gap)} w jednej, łącznie ${fmtPln(prof.totalReferencesPln)})`,
    };
  }
  const gap = requiredPln - prof.totalReferencesPln;
  return {
    status: "gap",
    requiredPln,
    gapPln: gap,
    summary: `Referencje NIE — brakuje ${fmtPln(gap)} (wymagane ${fmtPln(requiredPln)})`,
  };
}

function itemWadiumBlocked(item: TenderPipelineItem): boolean {
  return computeWadiumInfo(item, item.swzAnalysis, profile().maxWadiumPln).blocked;
}

function itemReferenceGap(item: TenderPipelineItem): boolean {
  return computeReferenceMatchSummary(item).status === "gap";
}

function itemNoKosztorys(item: TenderPipelineItem): boolean {
  if (!isTenderOpenForOffers(item.submittingOffersDate)) return false;
  if (item.status === "ignored" || item.status === "won" || item.status === "lost") return false;
  if (!["interested", "preparing", "submitted", "seen", "new"].includes(item.status)) return false;
  return !item.tenderDossier?.kosztorys?.ok;
}

function itemDeadlineNoBid(item: TenderPipelineItem): boolean {
  const days = daysUntilTenderDeadline(item.submittingOffersDate);
  if (!isTenderOpenForOffers(item.submittingOffersDate)) return false;
  if (days === null || days > 3 || days < 0) return false;
  if (item.status === "ignored" || item.status === "won" || item.status === "lost") return false;
  return item.ourEstimatePln == null;
}

function itemDeadline7d(item: TenderPipelineItem): boolean {
  const days = daysUntilTenderDeadline(item.submittingOffersDate);
  return isTenderOpenForOffers(item.submittingOffersDate)
    && days !== null && days >= 0 && days <= 7;
}

export function computePreparingCount(items: TenderPipelineItem[]): number {
  return items.filter((i) => i.status === "preparing" || i.status === "interested").length;
}

export function matchesQuickFilter(item: TenderPipelineItem, filter: TenderQuickFilter): boolean {
  switch (filter) {
    case "deadline_no_bid": return itemDeadlineNoBid(item);
    case "wadium_blocked": return itemWadiumBlocked(item) && isActionableTender(item);
    case "no_kosztorys": return itemNoKosztorys(item);
    case "deadline_7d": return itemDeadline7d(item);
    case "reference_gap": return itemReferenceGap(item) && isTenderOpenForOffers(item.submittingOffersDate);
    case "overload": return false;
    default: return true;
  }
}

export function computeActionChips(items: TenderPipelineItem[]): TenderActionChip[] {
  const prof = profile();
  const preparing = computePreparingCount(items);
  const chips: TenderActionChip[] = [
    {
      id: "deadline_no_bid",
      label: "Termin ≤3 d. bez wyceny",
      count: items.filter(itemDeadlineNoBid).length,
      tone: "red",
    },
    {
      id: "wadium_blocked",
      label: "Wadium blokuje",
      count: items.filter((i) => itemWadiumBlocked(i) && isActionableTender(i)).length,
      tone: "red",
    },
    {
      id: "no_kosztorys",
      label: "Brak kosztorysu",
      count: items.filter(itemNoKosztorys).length,
      tone: "amber",
    },
    {
      id: "deadline_7d",
      label: "Termin ≤7 dni",
      count: items.filter(itemDeadline7d).length,
      tone: "amber",
    },
    {
      id: "reference_gap",
      label: "Referencje NIE",
      count: items.filter((i) => itemReferenceGap(i) && isTenderOpenForOffers(i.submittingOffersDate)).length,
      tone: "red",
    },
  ];
  if (preparing >= prof.maxConcurrentProjects) {
    chips.push({
      id: "overload",
      label: `${preparing} ofert równolegle (limit ${prof.maxConcurrentProjects})`,
      count: preparing,
      tone: "violet",
    });
  }
  return chips.filter((c) => c.count > 0);
}

export function computeTenderDashboardAlerts(items: TenderPipelineItem[]): TenderDashboardAlert[] {
  const alerts: TenderDashboardAlert[] = [];
  for (const item of items) {
    if (itemDeadlineNoBid(item)) {
      const days = daysUntilTenderDeadline(item.submittingOffersDate);
      alerts.push({
        id: `${item.id}-bid`,
        tenderId: item.id,
        title: item.organizationName.slice(0, 40),
        message: `Termin za ${days} d. — brak wyceny · ${item.title.slice(0, 50)}`,
        tone: "red",
      });
    } else if (itemWadiumBlocked(item) && isActionableTender(item)) {
      alerts.push({
        id: `${item.id}-wad`,
        tenderId: item.id,
        title: item.organizationName.slice(0, 40),
        message: `Wadium blokuje udział · ${item.title.slice(0, 50)}`,
        tone: "red",
      });
    } else if (itemNoKosztorys(item) && (item.status === "preparing" || item.status === "interested")) {
      alerts.push({
        id: `${item.id}-kosz`,
        tenderId: item.id,
        title: item.organizationName.slice(0, 40),
        message: `Brak kosztorysu · ${item.title.slice(0, 50)}`,
        tone: "amber",
      });
    }
  }
  return alerts
    .sort((a, b) => (a.tone === "red" && b.tone !== "red" ? -1 : b.tone === "red" && a.tone !== "red" ? 1 : 0))
    .slice(0, 5);
}

function pctDiff(from: number, to: number): number | null {
  if (!from || !Number.isFinite(from)) return null;
  return Math.round(((to - from) / from) * 1000) / 10;
}

export function computeAwardPriceComparison(item: TenderPipelineItem): AwardPriceComparison | null {
  const award = item.awardResult;
  if (!award) return null;
  const estimatedValuePln = estimatedValuePlnFromItem(item, item.swzAnalysis ?? null);
  const ourEstimatePln = item.ourEstimatePln ?? null;
  const awardValuePln = award.awardValuePln ?? null;

  const ourVsAwardPct = ourEstimatePln != null && awardValuePln != null
    ? pctDiff(awardValuePln, ourEstimatePln)
    : null;
  const ourVsEstimatePct = ourEstimatePln != null && estimatedValuePln != null
    ? pctDiff(estimatedValuePln, ourEstimatePln)
    : null;
  const awardVsEstimatePct = awardValuePln != null && estimatedValuePln != null
    ? pctDiff(estimatedValuePln, awardValuePln)
    : null;

  const summaryLines: string[] = [];
  if (estimatedValuePln != null) summaryLines.push(`Wartość SWZ: ${fmtPln(estimatedValuePln)}`);
  if (ourEstimatePln != null) {
    summaryLines.push(`Nasz szacunek: ${fmtPln(ourEstimatePln)}${ourVsEstimatePct != null ? ` (${ourVsEstimatePct > 0 ? "+" : ""}${ourVsEstimatePct}% vs SWZ)` : ""}`);
  }
  if (awardValuePln != null) {
    summaryLines.push(`Wygrana oferta: ${fmtPln(awardValuePln)}${awardVsEstimatePct != null ? ` (${awardVsEstimatePct > 0 ? "+" : ""}${awardVsEstimatePct}% vs SWZ)` : ""}`);
  } else if (award.awardValueRaw) {
    summaryLines.push(`Wygrana oferta: ${award.awardValueRaw}`);
  }
  if (ourEstimatePln != null && awardValuePln != null && ourVsAwardPct != null) {
    summaryLines.push(`Nasz szacunek vs wygrana: ${ourVsAwardPct > 0 ? "+" : ""}${ourVsAwardPct}%`);
  }

  return {
    estimatedValuePln,
    ourEstimatePln,
    awardValuePln,
    winnerName: award.winnerName,
    isUs: award.isUs,
    ourVsAwardPct,
    ourVsEstimatePct,
    awardVsEstimatePct,
    summaryLines,
  };
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toIcsUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** Pobiera plik .ics z terminem składania ofert. */
export function downloadTenderDeadlineIcs(item: TenderPipelineItem): void {
  if (!item.submittingOffersDate) return;
  const start = toIcsUtc(item.submittingOffersDate);
  const endDate = new Date(item.submittingOffersDate);
  endDate.setHours(endDate.getHours() + 1);
  const end = toIcsUtc(endDate.toISOString());
  const uid = `wgdom-tender-${item.id}@wgdom.pl`;
  const summary = icsEscape(`Oferta: ${item.title.slice(0, 80)}`);
  const desc = icsEscape(`${item.organizationName} · ${item.bzpNumber}`);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//W&G DOM//Przetargi//PL",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${desc}`,
    `URL:${item.ezamowieniaUrl}`,
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    "DESCRIPTION:Termin ofert jutro",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const safe = item.bzpNumber.replace(/[^\dA-Za-z-]/g, "_").slice(0, 30);
  saveAs(blob, `termin-ofert-${safe}.ics`);
}

const AWARD_FETCH_COOLDOWN_MS = 7 * 86400000;
const AWARD_FETCH_MIN_DAYS_AFTER_DEADLINE = 1;

function shouldAutoFetchAward(item: TenderPipelineItem, now = Date.now()): boolean {
  if (item.awardResult) return false;
  if (item.status === "ignored") return false;
  if (isTenderOpenForOffers(item.submittingOffersDate, new Date(now))) return false;
  const deadline = item.submittingOffersDate ? new Date(item.submittingOffersDate).getTime() : NaN;
  if (!Number.isFinite(deadline)) return false;
  if (now - deadline < AWARD_FETCH_MIN_DAYS_AFTER_DEADLINE * 86400000) return false;
  const attempted = item.awardFetchAttemptedAt ? new Date(item.awardFetchAttemptedAt).getTime() : 0;
  if (attempted && now - attempted < AWARD_FETCH_COOLDOWN_MS) return false;
  return item.status !== "won" || !item.awardResult;
}

function statusFromAward(result: TenderAwardResult, current: TenderPipelineItem["status"]): TenderPipelineItem["status"] {
  if (result.isUs) return "won";
  if (current === "won") return "won";
  if (current === "preparing" || current === "interested" || current === "submitted" || current === "seen" || current === "new") {
    return "lost";
  }
  return current;
}

/** Pobiera wyniki BZP dla zakończonych postępowań (max `limit` na raz). */
export async function autoFetchAwardResults(
  items: TenderPipelineItem[],
  limit = 5,
): Promise<{ items: TenderPipelineItem[]; updated: number }> {
  const candidates = items
    .filter((i) => shouldAutoFetchAward(i))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  if (candidates.length === 0) return { items, updated: 0 };

  let updated = 0;
  const patchById = new Map<string, Partial<TenderPipelineItem>>();

  await Promise.all(candidates.slice(0, limit).map(async (item) => {
    const attemptedAt = new Date().toISOString();
    try {
      const result = await fetchTenderAwardResult({
        bzpNumber: item.bzpNumber,
        moIdentifier: item.moIdentifier,
        noticeHtml: item.noticeHtml,
      });
      const patch: Partial<TenderPipelineItem> = {
        awardFetchAttemptedAt: attemptedAt,
        updatedAt: attemptedAt,
      };
      if (result) {
        patch.awardResult = result;
        patch.status = statusFromAward(result, item.status);
      }
      patchById.set(item.id, patch);
      if (result) updated += 1;
    } catch {
      patchById.set(item.id, { awardFetchAttemptedAt: attemptedAt });
    }
  }));

  if (patchById.size === 0) return { items, updated: 0 };
  const next = items.map((i) => {
    const patch = patchById.get(i.id);
    return patch ? { ...i, ...patch } : i;
  });
  return { items: next, updated };
}

/** Statystyki pulpitu z alertami (bez cyklicznego importu w tenders-bzp). */
export function enrichTendersDashboardStats(
  base: import("@/lib/tenders-bzp").TendersDashboardStats,
  items: TenderPipelineItem[],
): import("@/lib/tenders-bzp").TendersDashboardStats {
  return { ...base, alerts: computeTenderDashboardAlerts(items) };
}
