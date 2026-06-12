import {
  AlertCircle, CheckCircle2, HelpCircle, Loader2, RefreshCw, ClipboardList, FileDown, ShieldAlert, Trophy, CalendarPlus, BookOpen, Eye,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderFitAssessment } from "@/lib/tenders-bzp-fit";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { TenderAwardResult } from "@/lib/tenders-bzp-award";
import { computeBidPrepChecks, type BidPrepItemStatus } from "@/lib/tenders-bid-prep";
import { isTenderOpenForOffers } from "@/lib/tenders-bzp";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import {
  computeReferenceMatchSummary,
  computeAwardPriceComparison,
  downloadTenderDeadlineIcs,
} from "@/lib/tenders-actions";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { TenderFitPanel } from "@/app/TenderFitPanel";
import { TenderParticipationPanel } from "@/app/TenderParticipationPanel";
import { TenderWorksRegisterPanel } from "@/app/TenderWorksRegisterPanel";
import { TenderBidProposalPanel } from "@/app/TenderBidProposalPanel";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import {
  buildAthQuickAccessContext,
  downloadAthKosztorysPdf,
  traceAthQuickAccess,
} from "@/lib/tender-ath-quick-access";

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
  onExportPdf,
  exportingPdf,
  awardResult,
  onFetchAward,
  fetchingAward,
  athPreviewEnabled = true,
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
  onExportPdf?: () => void;
  exportingPdf?: boolean;
  awardResult?: TenderAwardResult | null;
  onFetchAward?: () => void;
  fetchingAward?: boolean;
  athPreviewEnabled?: boolean;
}) {
  const [athPreview, setAthPreview] = useState<InspectorFileItem | null>(null);
  const [athPdfBusy, setAthPdfBusy] = useState(false);
  const athAccess = useMemo(() => buildAthQuickAccessContext(item), [item]);

  const handleOpenAth = useCallback((previewItem: InspectorFileItem) => {
    setAthPreview(previewItem);
    traceAthQuickAccess({
      source: "ATH",
      rows: athAccess.rowCount,
      viewerOpened: true,
    });
  }, [athAccess.rowCount]);

  const handleDownloadAthPdf = useCallback(async () => {
    setAthPdfBusy(true);
    try {
      await downloadAthKosztorysPdf(item, athPreviewEnabled);
      toast.success("Pobrano PDF przedmiaru");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd generowania PDF");
    } finally {
      setAthPdfBusy(false);
    }
  }, [item, athPreviewEnabled]);
  const profile = loadCompanyProfileLocal();
  const wadium = computeWadiumInfo(item, swz, profile.maxWadiumPln);
  const refMatch = computeReferenceMatchSummary(item, profile);
  const priceCompare = computeAwardPriceComparison(item);
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

      {(awardResult || onFetchAward) && (
        <div className="mx-3 mb-2 rounded-lg border border-border/60 bg-secondary/20 px-2.5 py-2 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Trophy size={11} /> Wynik postępowania
            </p>
            {onFetchAward && !awardResult && (
              <button
                type="button"
                disabled={fetchingAward}
                onClick={(e) => { e.stopPropagation(); onFetchAward(); }}
                className="text-[10px] text-primary hover:underline disabled:opacity-50"
              >
                {fetchingAward ? "Szukam…" : "Pobierz z BZP"}
              </button>
            )}
          </div>
          {awardResult ? (
            <div className="space-y-1">
              <p className={`text-xs ${awardResult.isUs ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-foreground"}`}>
                {awardResult.winnerName}
                {awardResult.awardValueRaw && <> · {awardResult.awardValueRaw}</>}
                {awardResult.isUs && " · WYGRALIŚMY"}
              </p>
              {priceCompare && priceCompare.summaryLines.length > 0 && (
                <ul className="text-[10px] text-muted-foreground space-y-0.5 list-none">
                  {priceCompare.summaryLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">Brak wyniku — pobierz po rozstrzygnięciu postępowania.</p>
          )}
        </div>
      )}

      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {checks.map((check) => {
          const Icon = STATUS_ICON[check.status];
          const showAthActions = check.id === "kosztorys" && athAccess.enabled && athAccess.previewItem;
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
                  {check.hint && (check.status !== "ok" || check.id === "our-bid") && (
                    <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{check.hint}</p>
                  )}
                  {showAthActions && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAth(athAccess.previewItem!);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20"
                      >
                        <Eye size={11} />
                        Otwórz przedmiar
                      </button>
                      <button
                        type="button"
                        disabled={athPdfBusy}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDownloadAthPdf();
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-[10px] font-medium hover:bg-secondary/80 disabled:opacity-50"
                      >
                        {athPdfBusy ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
                        Pobierz PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-3 pb-3 space-y-3 border-t border-border/60 pt-3">
        <TenderParticipationPanel swz={swz} />
        <TenderWorksRegisterPanel tenderId={item.tenderId ?? item.id} swz={swz} />
        <TenderFitPanel fit={fit} awardCriteria={swz?.awardCriteria} />
        <TenderBidProposalPanel
          proposal={bidProposal}
          referenceValuePln={referenceValuePln}
          ourEstimatePln={ourEstimatePln}
          teamHeadcount={teamHeadcount}
          onApplyRecommended={onApplyRecommended}
          missingKosztorys={!item.tenderDossier?.kosztorys?.ok}
        />
      </div>

      {athPreview && (
        <JobFilePreviewModal
          item={athPreview}
          athPreviewEnabled={athPreviewEnabled}
          onClose={() => setAthPreview(null)}
        />
      )}
    </div>
  );
}
