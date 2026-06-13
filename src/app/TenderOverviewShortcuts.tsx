import { BookOpen, ShieldAlert, Target } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderFitAssessment } from "@/lib/tenders-bzp-fit";
import { FIT_LABELS } from "@/lib/tenders-bzp-fit";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import { computeReferenceMatchSummary } from "@/lib/tenders-actions";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import type { TenderWorkspaceTabId } from "@/lib/tender-workspace-ux";

export function TenderOverviewShortcuts({
  item,
  swz,
  fit,
  onNavigate,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
  fit: TenderFitAssessment | null | undefined;
  onNavigate: (tab: TenderWorkspaceTabId) => void;
}) {
  const profile = loadCompanyProfileLocal();
  const wadium = computeWadiumInfo(item, swz, profile.maxWadiumPln);
  const refMatch = computeReferenceMatchSummary(item, profile);

  const hasWadium = wadium.blocked || wadium.amountPln != null || Boolean(wadium.raw);
  const hasRef = refMatch.status !== "unknown";
  const hasFit = Boolean(fit);

  if (!hasWadium && !hasRef && !hasFit) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {hasFit && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNavigate("qualification"); }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-secondary/40 text-[10px] hover:bg-secondary/70"
        >
          <Target size={11} className="shrink-0 text-primary" />
          <span className="font-medium">Dopasowanie:</span>
          <span>{FIT_LABELS[fit!.fitLabel]} · {fit!.fitScore}/100</span>
        </button>
      )}
      {hasWadium && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNavigate("qualification"); }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] hover:opacity-90 ${
            wadium.blocked
              ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400"
              : "border-border bg-secondary/40"
          }`}
        >
          <ShieldAlert size={11} className="shrink-0" />
          <span className="font-medium">Wadium:</span>
          <span>{wadium.blocked ? `${wadium.summary} — BLOKADA` : wadium.summary}</span>
        </button>
      )}
      {hasRef && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNavigate("qualification"); }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-secondary/40 text-[10px] hover:bg-secondary/70 ${
            refMatch.status === "ok" ? "text-emerald-700 dark:text-emerald-400"
              : refMatch.status === "partial" ? "text-amber-700 dark:text-amber-400"
                : "text-red-700 dark:text-red-400"
          }`}
        >
          <BookOpen size={11} className="shrink-0" />
          <span className="font-medium">Referencje:</span>
          <span className="truncate max-w-[14rem]">{refMatch.summary}</span>
        </button>
      )}
    </div>
  );
}
