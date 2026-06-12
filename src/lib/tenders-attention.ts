/**
 * P2-D.3 — agregacja „Wymaga uwagi” z istniejących monitorów (bez nowych KPI/scoringów).
 */
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { isTenderOpenForOffers, parseTenderDeadline } from "@/lib/tenders-bzp";
import type { TenderChangeEvent } from "@/lib/tender-change-monitor";

const PL_TZ = "Europe/Warsaw";

/** Klucz dnia kalendarzowego (PL) — do „dziś / jutro / za N dni” bez nowych KPI. */
function plCalendarDayKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: PL_TZ });
}

/** Dni kalendarzowe do terminu (PL) na bazie istniejącego `submittingOffersDate`. */
function calendarDaysUntilTenderDeadline(
  iso: string | null | undefined,
  now: Date,
): number | null {
  const d = parseTenderDeadline(iso);
  if (!d || d.getTime() <= now.getTime()) return null;
  const today = plCalendarDayKey(now);
  const deadline = plCalendarDayKey(d);
  const t0 = new Date(`${today}T12:00:00`);
  const t1 = new Date(`${deadline}T12:00:00`);
  return Math.round((t1.getTime() - t0.getTime()) / 86400000);
}

export type TenderAttentionReason =
  | "DEADLINE_SOON"
  | "NEW_DOCUMENT"
  | "NEW_QA"
  | "DEADLINE_CHANGED";

export interface TenderAttentionItem {
  tenderItemId: string;
  title: string;
  bzpNumber: string;
  reasons: TenderAttentionReason[];
  sortRank: number;
  deadlineDays: number | null;
  newDocumentCount: number;
  newQaCount: number;
  deadlineChangedAt: string | null;
  newDeadlineLabel: string | null;
  tone: "red" | "orange" | "amber";
  /** Linie opisu na karcie (bez score/risk/AI). */
  lines: string[];
}

const RECENT_MS = 7 * 24 * 3600_000;
export const TENDER_ATTENTION_MAX = 10;

function recentChangeEvents(item: TenderPipelineItem, now: Date): TenderChangeEvent[] {
  const cutoff = now.getTime() - RECENT_MS;
  return (item.changeMonitor?.events ?? []).filter(
    (e) => new Date(e.at).getTime() >= cutoff,
  );
}

function recentQaNewCount(item: TenderPipelineItem, now: Date): number {
  const cutoff = now.getTime() - RECENT_MS;
  return (item.qaMonitor?.events ?? []).filter(
    (e) => new Date(e.at).getTime() >= cutoff
      && (e.type === "NEW_QA" || e.type === "QA_BATCH"),
  ).reduce((sum, e) => sum + (e.count ?? 1), 0);
}

function formatDeadlineLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function deadlineLine(days: number | null): string | null {
  if (days == null || days < 0) return null;
  if (days === 0) return "Termin dziś";
  if (days === 1) return "Termin jutro";
  if (days <= 3) return `Termin za ${days} dni`;
  return null;
}

function computeSortRank(
  reasons: TenderAttentionReason[],
  deadlineDays: number | null,
): number {
  if (deadlineDays === 0) return 0;
  if (deadlineDays === 1) return 1;
  if (deadlineDays != null && deadlineDays >= 0 && deadlineDays <= 3) return 2;
  if (reasons.includes("DEADLINE_CHANGED")) return 3;
  if (reasons.includes("NEW_DOCUMENT")) return 4;
  if (reasons.includes("NEW_QA")) return 5;
  return 6;
}

function computeTone(
  reasons: TenderAttentionReason[],
  deadlineDays: number | null,
): "red" | "orange" | "amber" {
  if (deadlineDays != null && deadlineDays >= 0 && deadlineDays <= 1) return "red";
  if (reasons.includes("DEADLINE_CHANGED") || (deadlineDays != null && deadlineDays <= 3)) {
    return "orange";
  }
  return "amber";
}

function buildLines(opts: {
  reasons: TenderAttentionReason[];
  deadlineDays: number | null;
  newDocumentCount: number;
  newQaCount: number;
  newDeadlineLabel: string | null;
}): string[] {
  const lines: string[] = [];
  const dl = deadlineLine(opts.deadlineDays);
  if (dl && opts.reasons.includes("DEADLINE_SOON")) lines.push(dl);

  if (opts.reasons.includes("DEADLINE_CHANGED")) {
    lines.push("Termin zmieniony");
    if (opts.newDeadlineLabel) lines.push(`Nowy termin: ${opts.newDeadlineLabel}`);
  }

  if (opts.newDocumentCount > 0) {
    lines.push(
      opts.newDocumentCount === 1
        ? "+1 nowy dokument"
        : `+${opts.newDocumentCount} nowe dokumenty`,
    );
  }

  if (opts.newQaCount > 0) {
    lines.push(
      opts.newQaCount === 1
        ? "+1 nowa odpowiedź"
        : `+${opts.newQaCount} nowe odpowiedzi`,
    );
  }

  return lines;
}

/** Agreguje istniejące changeMonitor + qaMonitor + deadline — bez nowych obliczeń biznesowych. */
export function buildTenderAttentionItems(
  items: TenderPipelineItem[],
  opts?: { now?: Date; max?: number },
): TenderAttentionItem[] {
  const now = opts?.now ?? new Date();
  const max = opts?.max ?? TENDER_ATTENTION_MAX;
  const out: TenderAttentionItem[] = [];

  for (const item of items) {
    if (item.status === "ignored" || item.status === "lost" || item.status === "won") continue;

    const changes = recentChangeEvents(item, now);
    const newDocumentCount = changes.filter((e) => e.type === "NEW_DOCUMENT").length;
    const deadlineChanged = changes.find((e) => e.type === "DEADLINE_CHANGED") ?? null;
    const newQaCount = recentQaNewCount(item, now);

    const open = isTenderOpenForOffers(item.submittingOffersDate, now);
    const deadlineDays = open
      ? calendarDaysUntilTenderDeadline(item.submittingOffersDate, now)
      : null;
    const deadlineSoon = deadlineDays != null && deadlineDays >= 0 && deadlineDays <= 3;

    const reasons: TenderAttentionReason[] = [];
    if (deadlineSoon) reasons.push("DEADLINE_SOON");
    if (newDocumentCount > 0) reasons.push("NEW_DOCUMENT");
    if (newQaCount > 0) reasons.push("NEW_QA");
    if (deadlineChanged) reasons.push("DEADLINE_CHANGED");

    if (reasons.length === 0) continue;

    const newDeadlineLabel = deadlineChanged?.details
      ? formatDeadlineLabel(deadlineChanged.details)
      : formatDeadlineLabel(item.submittingOffersDate);

    const sortRank = computeSortRank(reasons, deadlineSoon ? deadlineDays : null);
    const tone = computeTone(reasons, deadlineSoon ? deadlineDays : null);

    out.push({
      tenderItemId: item.id,
      title: item.title,
      bzpNumber: item.bzpNumber,
      reasons,
      sortRank,
      deadlineDays: deadlineSoon ? deadlineDays : null,
      newDocumentCount,
      newQaCount,
      deadlineChangedAt: deadlineChanged?.at ?? null,
      newDeadlineLabel,
      tone,
      lines: buildLines({
        reasons,
        deadlineDays: deadlineSoon ? deadlineDays : null,
        newDocumentCount,
        newQaCount,
        newDeadlineLabel: deadlineChanged ? newDeadlineLabel : null,
      }),
    });
  }

  out.sort((a, b) => {
    if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
    const da = a.deadlineDays ?? 999;
    const db = b.deadlineDays ?? 999;
    if (da !== db) return da - db;
    return a.title.localeCompare(b.title, "pl");
  });

  return out.slice(0, max);
}

export function countTenderAttentionItems(items: TenderPipelineItem[], now = new Date()): number {
  return buildTenderAttentionItems(items, { now }).length;
}
