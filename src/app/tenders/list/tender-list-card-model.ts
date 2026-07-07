import {
  type TenderPipelineItem,
  type TenderPipelineStatus,
  TENDER_STATUS_LABELS,
  labelTenderState,
  isTenderOpenForOffers,
  daysUntilTenderDeadline,
} from "@/lib/tenders-bzp";
import { FIT_LABELS } from "@/lib/tenders-bzp-fit";
import { PROFITABILITY_LABELS } from "@/lib/tenders-bzp-swz";
import { tenderListBidLine } from "@/lib/tenders-bid-prep";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import type { TenderUxBadgeVariant } from "@/app/tenders/design-system/TenderUxBadge";

export type TenderListCardSeverity = "blocked" | "today" | "urgent" | "default";

export const TENDER_LIST_MOBILE_BADGE_MAX = 4;
export const TENDER_LIST_DESKTOP_BADGE_MAX = 8;

export type TenderListBadgeItem = {
  key: string;
  variant: TenderUxBadgeVariant;
  label: string;
  className?: string;
};

export type TenderListCardViewModel = {
  severity: TenderListCardSeverity;
  shellClass: string;
  mobileBadges: TenderListBadgeItem[];
  mobileBadgeOverflow: number;
  desktopBadges: TenderListBadgeItem[];
  bidLine: string | null;
  kpiTermin: string;
  kpiTrafność: string;
  kpiWadium: string;
  statusLabel: string;
  statusBadgeClass: string;
  deadlineText: string;
  deadlineClass: string;
  offerOpen: boolean;
  urgent: boolean;
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function resolveTenderListCardSeverity(input: {
  todayHighlight: boolean;
  wadiumBlocked: boolean;
  urgent: boolean;
}): TenderListCardSeverity {
  if (input.wadiumBlocked) return "blocked";
  if (input.todayHighlight) return "today";
  if (input.urgent) return "urgent";
  return "default";
}

export function tenderListCardSeverityStripeClass(severity: TenderListCardSeverity): string {
  switch (severity) {
    case "blocked":
      return "border-l-red-500";
    case "today":
      return "border-l-amber-400";
    case "urgent":
      return "border-l-amber-500";
    default:
      return "border-l-transparent";
  }
}

export function tenderListStatusBadgeClass(status: TenderPipelineStatus): string {
  switch (status) {
    case "new":
      return "bg-blue-500/15 text-blue-600 border-blue-500/25";
    case "interested":
    case "preparing":
      return "bg-violet-500/15 text-violet-600 border-violet-500/25";
    case "won":
      return "bg-emerald-500/15 text-emerald-600 border-emerald-500/25";
    case "ignored":
    case "lost":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-secondary text-foreground border-border";
  }
}

function buildBadgeCandidates(
  item: TenderPipelineItem,
  opts: { todayHighlight: boolean; wadiumBlocked: boolean; includeStatus: boolean },
): TenderListBadgeItem[] {
  const out: TenderListBadgeItem[] = [];

  if (opts.todayHighlight) {
    out.push({ key: "today", variant: "urgent", label: "Dzisiaj" });
  }
  if (opts.wadiumBlocked) {
    out.push({ key: "wadium-blocked", variant: "urgent", label: "Wadium blokada" });
  }
  if (opts.includeStatus) {
    out.push({
      key: "status",
      variant: "status",
      label: TENDER_STATUS_LABELS[item.status],
      className: tenderListStatusBadgeClass(item.status),
    });
  }
  if (item.isWroclaw) {
    out.push({
      key: "wroclaw",
      variant: "status",
      label: "Wrocław",
      className: "bg-primary/10 text-primary border-primary/25 uppercase font-semibold tracking-wide",
    });
  }
  if (item.priorityBuyerLabel) {
    out.push({
      key: "strategic",
      variant: "status",
      label: item.priorityBuyerLabel,
      className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/25",
    });
  }
  out.push({
    key: "bzp",
    variant: "status",
    label: item.bzpNumber,
    className: "font-mono text-muted-foreground",
  });
  if (item.relevanceScore >= 20) {
    out.push({
      key: "score",
      variant: "score",
      label: `Trafność ${item.relevanceScore}`,
    });
  }
  if (item.swzAnalysis) {
    const hint = item.swzAnalysis.profitabilityHint;
    out.push({
      key: "swz",
      variant: "status",
      label: PROFITABILITY_LABELS[hint],
      className:
        hint === "good"
          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
          : hint === "risky"
            ? "bg-red-500/10 text-red-600 border-red-500/25"
            : "bg-amber-500/10 text-amber-600 border-amber-500/25",
    });
  }
  if (item.tenderFit && item.tenderFit.fitLabel !== "unknown") {
    const fit = item.tenderFit.fitLabel;
    const win =
      item.tenderFit.winChancePct != null ? ` · ${item.tenderFit.winChancePct}%` : "";
    out.push({
      key: "fit",
      variant: "fit",
      label: `${FIT_LABELS[fit]}${win}`,
      className:
        fit === "strong"
          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
          : fit === "possible"
            ? "bg-blue-500/10 text-blue-600 border-blue-500/25"
            : "bg-red-500/10 text-red-600 border-red-500/25",
    });
  }
  if (item.linkedJobId) {
    out.push({ key: "job", variant: "score", label: "Robota" });
  }
  if (item.tenderState) {
    out.push({
      key: "state",
      variant: "status",
      label: labelTenderState(item.tenderState),
    });
  }
  if (item.awardResult) {
    out.push({
      key: "award",
      variant: item.awardResult.isUs ? "score" : "status",
      label: item.awardResult.isUs ? "Wygraliśmy" : "Wynik BZP",
    });
  }

  return out;
}

function sliceBadges(
  all: TenderListBadgeItem[],
  max: number,
): { visible: TenderListBadgeItem[]; overflow: number } {
  if (all.length <= max) return { visible: all, overflow: 0 };
  return { visible: all.slice(0, max), overflow: all.length - max };
}

export function buildTenderListCardViewModel(
  item: TenderPipelineItem,
  todayHighlight: boolean,
  profileMaxWadiumPln: number,
): TenderListCardViewModel {
  const days = daysUntilTenderDeadline(item.submittingOffersDate);
  const offerOpen = isTenderOpenForOffers(item.submittingOffersDate);
  const urgent = offerOpen && days !== null && days >= 0 && days <= 7;
  const wadium = computeWadiumInfo(item, item.swzAnalysis, profileMaxWadiumPln);
  const severity = resolveTenderListCardSeverity({
    todayHighlight,
    wadiumBlocked: wadium.blocked,
    urgent,
  });

  const shellParts = [
    "rounded-xl border bg-card overflow-hidden border-l-[3px]",
    tenderListCardSeverityStripeClass(severity),
  ];
  if (todayHighlight) {
    shellParts.push("border-amber-500/40 ring-1 ring-amber-500/15");
  } else if (item.isWroclaw) {
    shellParts.push("border-primary/30");
  } else {
    shellParts.push("border-border");
  }

  const mobileAll = buildBadgeCandidates(item, {
    todayHighlight,
    wadiumBlocked: wadium.blocked,
    includeStatus: true,
  });
  const desktopAll = buildBadgeCandidates(item, {
    todayHighlight,
    wadiumBlocked: wadium.blocked,
    includeStatus: false,
  });

  const mobileSlice = sliceBadges(mobileAll, TENDER_LIST_MOBILE_BADGE_MAX);
  const desktopSlice = sliceBadges(desktopAll, TENDER_LIST_DESKTOP_BADGE_MAX);

  let kpiTermin = "—";
  if (item.submittingOffersDate) {
    if (!offerOpen) {
      kpiTermin = `Minął: ${fmtDate(item.submittingOffersDate)}`;
    } else if (days !== null && days >= 0) {
      kpiTermin = `${days} d. · ${fmtDate(item.submittingOffersDate)}`;
    } else {
      kpiTermin = fmtDate(item.submittingOffersDate);
    }
  }

  const kpiTrafność =
    item.relevanceScore >= 20 ? `${item.relevanceScore}` : item.relevanceScore > 0 ? `${item.relevanceScore}` : "—";

  const kpiWadium = wadium.blocked
    ? "Blokada"
    : wadium.amountPln != null
      ? `${Math.round(wadium.amountPln).toLocaleString("pl-PL")} zł`
      : wadium.raw?.trim() || "—";

  let deadlineText = "";
  let deadlineClass = "text-muted-foreground";
  if (item.submittingOffersDate) {
    const prefix = offerOpen ? "Oferty do:" : "Termin minął:";
    deadlineText = `${prefix} ${fmtDate(item.submittingOffersDate)}`;
    if (offerOpen && days !== null && days >= 0) {
      deadlineText += ` (${days} d.)`;
    }
    if (!offerOpen) {
      deadlineClass = "text-muted-foreground line-through";
    } else if (urgent) {
      deadlineClass = "text-amber-600 font-semibold dark:text-amber-400";
    }
  }

  return {
    severity,
    shellClass: shellParts.join(" "),
    mobileBadges: mobileSlice.visible,
    mobileBadgeOverflow: mobileSlice.overflow,
    desktopBadges: desktopSlice.visible,
    bidLine: tenderListBidLine(item),
    kpiTermin,
    kpiTrafność,
    kpiWadium,
    statusLabel: TENDER_STATUS_LABELS[item.status],
    statusBadgeClass: tenderListStatusBadgeClass(item.status),
    deadlineText,
    deadlineClass,
    offerOpen,
    urgent,
  };
}
