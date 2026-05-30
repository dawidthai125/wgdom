import {
  AlertCircle, CheckCircle2, HelpCircle, Loader2, RefreshCw, ClipboardList,
} from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderFitAssessment } from "@/lib/tenders-bzp-fit";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import {
  computeBidPrepChecks,
  type BidPrepItemStatus,
} from "@/lib/tenders-bid-prep";
import { TenderFitPanel } from "@/app/TenderFitPanel";
import { TenderBidProposalPanel } from "@/app/TenderBidProposalPanel";

const STATUS_ICON = {
  ok: CheckCircle2,
  partial: HelpCircle,
  missing: AlertCircle,
} as const;

const STATUS_STYLE: Record<BidPrepItemStatus, string> = {
  ok: "border-emerald-500/30 bg-emerald-500/5",
  partial: "border-amber-500/30 bg-amber-500/5",
  missing: "border-border bg-secondary/30",
};

const STATUS_TEXT: Record<BidPrepItemStatus, string> = {
  ok: "text-emerald-700 dark:text-emerald-400",
  partial: "text-amber-700 dark:text-amber-400",
  missing: "text-muted-foreground",
};

export function TenderBidPrepPanel({
  item,
  swz,
  fit,
  bidProposal,
  referenceValuePln,
  ourEstimatePln,
  teamHeadcount,
  analyzing,
  onAnalyze,
  onApplyRecommended,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
  fit: TenderFitAssessment | null | undefined;
  bidProposal: TenderBidProposal | null | undefined;
  referenceValuePln?: number | null;
  ourEstimatePln?: number | null;
  teamHeadcount?: number | null;
  analyzing?: boolean;
  onAnalyze: () => void;
  onApplyRecommended?: (pln: number) => void;
}) {
  const checks = computeBidPrepChecks(item, swz, fit, bidProposal);
  const readyCount = checks.filter((c) => c.status === "ok").length;
  const canAnalyze = Boolean(
    item.noticeNumber || (item.tenderId && (item.bzpDocuments?.length ?? 0) > 0),
  );

  const sourceLabel = swz?.source === "html"
    ? "ogłoszenie BZP"
    : swz?.source === "pdf"
      ? `PDF${swz.sourceFilename ? `: ${swz.sourceFilename}` : ""}`
      : swz?.source === "docx"
        ? "DOCX"
        : null;

  return (
    <div className="rounded-xl border border-primary/25 bg-card overflow-hidden space-y-0">
      <div className="px-3 py-2.5 bg-primary/5 border-b border-primary/15 flex flex-wrap items-center gap-2">
        <ClipboardList size={15} className="text-primary shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">Karta ofertowa</p>
          <p className="text-[10px] text-muted-foreground">
            {readyCount}/{checks.length} elementów gotowych do wyceny
          </p>
        </div>
        <button
          type="button"
          disabled={analyzing || !canAnalyze}
          onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-600 text-white text-[10px] font-medium hover:bg-violet-700 disabled:opacity-50"
          title={!canAnalyze ? "Brak numeru ogłoszenia i załączników" : "Wyciąga wartość, wadium, terminy z ogłoszenia lub PDF SWZ"}
        >
          {analyzing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          {analyzing ? "Analizuję…" : "Analizuj SWZ / ogłoszenie"}
        </button>
      </div>

      {swz?.parsedAt && (
        <p className="text-[10px] text-muted-foreground px-3 py-1.5 border-b border-border/60 bg-secondary/20">
          Ostatnia analiza: {new Date(swz.parsedAt).toLocaleString("pl-PL")}
          {sourceLabel && <> · źródło: {sourceLabel}</>}
          {swz.profitabilityNote && (
            <> · <span className={
              swz.profitabilityHint === "good" ? "text-emerald-600" :
              swz.profitabilityHint === "risky" ? "text-red-600" : "text-amber-600"
            }>{swz.profitabilityNote}</span></>
          )}
        </p>
      )}

      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {checks.map((check) => {
          const Icon = STATUS_ICON[check.status];
          return (
            <div
              key={check.id}
              className={`rounded-lg border px-2.5 py-2 ${STATUS_STYLE[check.status]}`}
            >
              <div className="flex items-start gap-1.5">
                <Icon size={12} className={`shrink-0 mt-0.5 ${STATUS_TEXT[check.status]}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {check.label}
                  </p>
                  <p className={`text-xs font-medium mt-0.5 break-words ${STATUS_TEXT[check.status]}`}>
                    {check.display}
                  </p>
                  {check.hint && check.status !== "ok" && (
                    <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{check.hint}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-3 pb-3 space-y-3 border-t border-border/60 pt-3">
        <TenderFitPanel fit={fit} />
        <TenderBidProposalPanel
          proposal={bidProposal}
          referenceValuePln={referenceValuePln}
          ourEstimatePln={ourEstimatePln}
          teamHeadcount={teamHeadcount}
          onApplyRecommended={onApplyRecommended}
          missingKosztorys={!item.tenderDossier?.kosztorys?.ok}
        />
      </div>
    </div>
  );
}
