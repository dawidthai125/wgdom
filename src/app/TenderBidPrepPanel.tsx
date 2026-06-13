import {
  AlertCircle, CheckCircle2, HelpCircle, Loader2, RefreshCw, ClipboardList, FileDown, ShieldAlert, CalendarPlus, BookOpen,
} from "lucide-react";
import { useCallback, useMemo } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderFitAssessment } from "@/lib/tenders-bzp-fit";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { computeBidPrepChecks, type BidPrepItemStatus } from "@/lib/tenders-bid-prep";
import { isTenderOpenForOffers } from "@/lib/tenders-bzp";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import {
  computeReferenceMatchSummary,
  downloadTenderDeadlineIcs,
} from "@/lib/tenders-actions";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { TENDER_BID_PROPOSAL_PANEL_ID } from "@/lib/tender-bid-ux";

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
  ourEstimatePln,
  analyzing,
  onAnalyze,
  onExportPdf,
  exportingPdf,
  onUpdateOurEstimate,
  onScrollToAttachments,
  onScrollToBidDetails,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
  fit: TenderFitAssessment | null | undefined;
  bidProposal: TenderBidProposal | null | undefined;
  ourEstimatePln?: number | null;
  analyzing?: boolean;
  onAnalyze: () => void;
  onExportPdf?: () => void;
  exportingPdf?: boolean;
  /** UX.1A — jedno źródło edycji naszej wyceny (kafelek). */
  onUpdateOurEstimate?: (pln: number | null) => void;
  /** UX.1A — skrót ATH → załączniki. */
  onScrollToAttachments?: () => void;
  onScrollToBidDetails?: () => void;
}) {
  const profile = loadCompanyProfileLocal();
  const wadium = computeWadiumInfo(item, swz, profile.maxWadiumPln);
  const refMatch = computeReferenceMatchSummary(item, profile);
  const checks = computeBidPrepChecks(item, swz, fit, bidProposal);
  const readyCount = checks.filter((c) => c.status === "ok").length;
  const canAnalyze = Boolean(
    item.noticeNumber || (item.tenderId && (item.bzpDocuments?.length ?? 0) > 0),
  );

  const scrollToBidDetails = useCallback(() => {
    if (onScrollToBidDetails) {
      onScrollToBidDetails();
      return;
    }
    document.getElementById(TENDER_BID_PROPOSAL_PANEL_ID)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [onScrollToBidDetails]);

  const sourceLabel = swz?.source === "html"
    ? "ogłoszenie BZP"
    : swz?.source === "pdf"
      ? `PDF${swz.sourceFilename ? `: ${swz.sourceFilename}` : ""}`
      : swz?.source === "docx"
        ? "DOCX"
        : null;

  const hasKosztorysShortcut = useMemo(
    () => Boolean(item.tenderDossier?.kosztorys?.ok || item.uploadedFile),
    [item.tenderDossier?.kosztorys?.ok, item.uploadedFile],
  );

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
          title={!canAnalyze ? "Brak numeru ogłoszenia i załączników" : "PDF SWZ (pdf.js) + kryteria + wadium"}
        >
          {analyzing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          {analyzing ? "Analizuję…" : "Analizuj SWZ"}
        </button>
        {onExportPdf && (
          <button
            type="button"
            disabled={exportingPdf}
            onClick={(e) => { e.stopPropagation(); onExportPdf(); }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary text-[10px] font-medium hover:bg-secondary/80 disabled:opacity-50"
          >
            {exportingPdf ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
            Pakiet PDF
          </button>
        )}
      </div>

      {wadium.blocked && (
        <div className="mx-3 mt-2 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-2 text-[10px] text-red-700 dark:text-red-400">
          <ShieldAlert size={13} className="shrink-0 mt-0.5" />
          <span><strong>Wadium blokuje udział</strong> — {wadium.summary}. Limit w profilu: {profile.maxWadiumPln.toLocaleString("pl-PL")} zł.</span>
        </div>
      )}

      {!wadium.blocked && wadium.amountPln != null && (
        <p className="text-[10px] text-muted-foreground px-3 pt-2">
          Wadium: {wadium.summary}
        </p>
      )}

      {refMatch.status !== "unknown" && (
        <p className={`text-[10px] px-3 pt-1.5 ${
          refMatch.status === "ok" ? "text-emerald-700 dark:text-emerald-400"
            : refMatch.status === "partial" ? "text-amber-700 dark:text-amber-400"
              : "text-red-700 dark:text-red-400 font-medium"
        }`}>
          <BookOpen size={10} className="inline mr-1 -mt-0.5" />
          {refMatch.summary}
        </p>
      )}

      {item.submittingOffersDate && isTenderOpenForOffers(item.submittingOffersDate) && (
        <div className="px-3 pt-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); downloadTenderDeadlineIcs(item); }}
            className="text-[10px] text-primary hover:underline inline-flex items-center gap-1"
          >
            <CalendarPlus size={11} />
            Dodaj termin ofert do kalendarza
          </button>
        </div>
      )}

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

      {(swz?.awardCriteria?.length ?? 0) > 0 && (
        <div className="px-3 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Kryteria z analizy SWZ
          </p>
          <div className="flex flex-wrap gap-1">
            {swz!.awardCriteria!.map((c) => (
              <span key={c.name} className="text-[10px] bg-violet-500/10 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded">
                {c.name}{c.weightPct != null ? ` ${c.weightPct}%` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {(swz?.tableExtracts?.length ?? 0) > 0 && (
        <details className="px-3 pb-2 text-[10px] text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">Fragmenty tabel z PDF ({swz!.tableExtracts!.length})</summary>
          <ul className="mt-1 space-y-0.5 list-disc pl-4 max-h-24 overflow-y-auto">
            {swz!.tableExtracts!.slice(0, 6).map((t) => <li key={t}>{t}</li>)}
          </ul>
        </details>
      )}

      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {checks.map((check) => {
          const Icon = STATUS_ICON[check.status];
          const isOurBid = check.id === "our-bid";
          const isKosztorys = check.id === "kosztorys";
          const clickable = isOurBid && check.navigateToBidDetails && !isOurBid;
          const bidNav = isOurBid && check.navigateToBidDetails;
          return (
            <div
              key={check.id}
              role={bidNav ? "button" : undefined}
              tabIndex={bidNav ? 0 : undefined}
              onClick={bidNav ? (e) => { e.stopPropagation(); scrollToBidDetails(); } : undefined}
              onKeyDown={bidNav ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  scrollToBidDetails();
                }
              } : undefined}
              className={`rounded-lg border px-2.5 py-2 ${STATUS_STYLE[check.status]} ${
                bidNav ? "cursor-pointer hover:ring-2 hover:ring-violet-500/35 hover:shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-violet-500/50" : ""
              }`}
            >
              <div className="flex items-start gap-1.5">
                <Icon size={12} className={`shrink-0 mt-0.5 ${STATUS_TEXT[check.status]}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {check.label}
                  </p>
                  {isOurBid && onUpdateOurEstimate ? (
                    <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={ourEstimatePln ?? ""}
                        onChange={(e) => {
                          const pln = e.target.value ? Number(e.target.value) : null;
                          onUpdateOurEstimate(pln);
                        }}
                        placeholder="PLN"
                        className="w-full max-w-[9rem] bg-background rounded-md px-2 py-1 text-xs border border-border font-mono"
                      />
                    </div>
                  ) : (
                    <p className={`text-xs font-medium mt-0.5 break-words ${STATUS_TEXT[check.status]}`}>
                      {check.displayLines?.length ? (
                        <span className="block space-y-0.5">
                          {check.displayLines.map((line) => (
                            <span key={line} className="block">{line}</span>
                          ))}
                        </span>
                      ) : (
                        check.display
                      )}
                    </p>
                  )}
                  {check.hint && (check.status !== "ok" || isOurBid) && (
                    <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{check.hint}</p>
                  )}
                  {check.actionHint && !isOurBid && (
                    <p className="text-[10px] text-violet-700 dark:text-violet-300 mt-1 font-medium">
                      {check.actionHint}
                    </p>
                  )}
                  {isOurBid && check.actionHint && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); scrollToBidDetails(); }}
                      className="text-[10px] text-violet-700 dark:text-violet-300 mt-1 font-medium hover:underline block text-left"
                    >
                      {check.actionHint}
                    </button>
                  )}
                  {isKosztorys && hasKosztorysShortcut && onScrollToAttachments && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onScrollToAttachments();
                      }}
                      className="text-[10px] text-primary mt-2 font-medium hover:underline"
                    >
                      Zobacz w dokumentach →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Eksport pomocniczy dla paska podsumowania. */
export { computeBidPrepChecks };
