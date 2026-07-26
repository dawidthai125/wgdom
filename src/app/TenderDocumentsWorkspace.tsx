import { useMemo, useState } from "react";
import { ChevronDown, ClipboardList, FileText, Sparkles } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { TenderAttachmentsPanel } from "@/app/TenderAttachmentsPanel";
import { TenderDocumentsSummaryHeader } from "@/app/TenderDocumentsSummaryHeader";
import { TenderDocumentsSummarySkeleton } from "@/app/tenders/loading/TenderDocumentsSummarySkeleton";
import { TenderUxSectionTitle } from "@/app/tenders/design-system/TenderUxSectionTitle";
import { buildTenderDocumentsTabSummary } from "@/lib/tender-documents-tab-summary";
import { shouldShowLiveAnalysisSummary } from "@/lib/tender-analysis-auto-ux";
import { TenderDossierPanel } from "@/app/TenderDossierPanel";
import type { TenderTrustAssessment } from "@/lib/tender-trust-layer";
import { pickDocumentsTrustBadge } from "@/lib/tender-trust-ui";
import type { TenderExternalDocDiscovery } from "@/lib/tender-external-docs";
import {
  TENDER_ATTACHMENTS_SECTION_ID,
  TENDER_FORMAL_DETAILS_SECTION_ID,
  buildTenderFormalDetailsSummary,
  hasTenderFormalDetailsSection,
} from "@/lib/tender-workspace-ux";

export function TenderDocumentsWorkspace({
  item,
  swz,
  platformSourceLabel: _platformSourceLabel,
  athPreviewEnabled,
  loadingDocs,
  analyzing,
  autoRunning,
  dossierBuilding,
  dossierSaving,
  externalDiscovering,
  showHtml,
  onToggleHtml,
  suggestions,
  learning,
  onRefresh,
  onAnalyze,
  onSearchExternal,
  onLearnKeywords,
  onOpenKosztorysPreview,
  trustAssessment,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
  platformSourceLabel: string;
  athPreviewEnabled?: boolean;
  loadingDocs?: boolean;
  analyzing?: boolean;
  autoRunning?: boolean;
  dossierBuilding?: boolean;
  dossierSaving?: boolean;
  externalDiscovering?: boolean;
  showHtml: boolean;
  onToggleHtml: () => void;
  suggestions: string[];
  learning?: boolean;
  onRefresh: () => void;
  onAnalyze: (documentIndex: number) => void;
  onSearchExternal: () => void;
  onLearnKeywords: () => void;
  onOpenKosztorysPreview: (previewItem: InspectorFileItem) => void;
  trustAssessment: TenderTrustAssessment;
}) {
  const [showFullFormalDetails, setShowFullFormalDetails] = useState(false);

  const sourceLabel = swz?.source === "html"
    ? "ogłoszenie BZP"
    : swz?.source === "pdf"
      ? `PDF${swz.sourceFilename ? `: ${swz.sourceFilename}` : ""}`
      : swz?.source === "docx"
        ? "DOCX"
        : null;

  const documentsSummary = useMemo(
    () => buildTenderDocumentsTabSummary({
      item,
      swz,
      autoRunning: Boolean(autoRunning || analyzing),
      dossierBuilding: Boolean(dossierBuilding || analyzing),
      dossierSaving,
      kosztorysSession: {
        autoRunning: Boolean(autoRunning || analyzing),
        dossierBuilding: Boolean(dossierBuilding || analyzing),
        dossierSaving,
        lazyEnabled: true,
      },
    }),
    [item, swz, autoRunning, dossierBuilding, dossierSaving, analyzing],
  );

  const formalSummary = buildTenderFormalDetailsSummary(item, swz, item.tenderDossier);
  const documentsTrustBadge = pickDocumentsTrustBadge(trustAssessment);
  const showFormalSection = hasTenderFormalDetailsSection(
    item,
    swz,
    item.tenderDossier,
    suggestions.length,
  );

  const summaryBusy = Boolean(loadingDocs || autoRunning || dossierBuilding || analyzing);
  const showLiveSummary = shouldShowLiveAnalysisSummary({
    busy: summaryBusy,
    item,
    swz,
  });
  const summaryLoading = summaryBusy && !showLiveSummary;

  const hasSwzMetaSection = Boolean(
    swz?.parsedAt
    || (swz?.awardCriteria?.length ?? 0) > 0
    || (swz?.tableExtracts?.length ?? 0) > 0,
  );

  return (
    <div className="space-y-3">
      {summaryLoading ? (
        <TenderDocumentsSummarySkeleton />
      ) : (
        <TenderDocumentsSummaryHeader summary={documentsSummary} trustBadge={documentsTrustBadge} />
      )}

      <TenderAttachmentsPanel
        item={item}
        athPreviewEnabled={athPreviewEnabled}
        loadingDocs={loadingDocs}
        onRefresh={onRefresh}
        onAnalyze={onAnalyze}
        analyzing={analyzing}
        externalDiscovery={item.externalDocDiscovery as TenderExternalDocDiscovery | null | undefined}
        externalDiscovering={externalDiscovering}
        onSearchExternal={onSearchExternal}
        sectionId={TENDER_ATTACHMENTS_SECTION_ID}
      />

      {showFormalSection && (
        <div id={TENDER_FORMAL_DETAILS_SECTION_ID} className="rounded-xl border border-border overflow-hidden scroll-mt-2">
          <div className="px-3 py-2.5 bg-secondary/40 border-b border-border flex items-center gap-1.5">
            <ClipboardList size={13} className="text-muted-foreground shrink-0" />
            <TenderUxSectionTitle>Szczegóły formalne</TenderUxSectionTitle>
          </div>
          <div className="px-3 py-2.5 space-y-2">
            {formalSummary.length > 0 && (
              <dl className="space-y-1 text-xs">
                {formalSummary.map((line) => (
                  <div key={line.label} className="flex flex-wrap gap-x-1.5 gap-y-0.5">
                    <dt className="text-muted-foreground shrink-0">{line.label}:</dt>
                    <dd className="text-foreground font-medium">{line.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowFullFormalDetails((v) => !v); }}
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-medium"
            >
              <ChevronDown size={12} className={`transition-transform ${showFullFormalDetails ? "rotate-180" : ""}`} />
              {showFullFormalDetails
                ? "Ukryj pełne szczegóły formalne"
                : "Pokaż pełne szczegóły formalne"}
            </button>
            {showFullFormalDetails && (
              <div className="space-y-3 pt-1 border-t border-border/60">
                <TenderDossierPanel
                  item={item}
                  dossier={item.tenderDossier}
                  swz={swz}
                  onOpenKosztorysPreview={onOpenKosztorysPreview}
                />

                {suggestions.length > 0 && (
                  <div className="rounded-lg bg-secondary/50 px-3 py-2 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                      <Sparkles size={11} /> Propozycje słów kluczowych
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {suggestions.slice(0, 6).map((s) => (
                        <span key={s} className="text-[10px] bg-background px-1.5 py-0.5 rounded border border-border">{s}</span>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={learning}
                      onClick={(e) => { e.stopPropagation(); onLearnKeywords(); }}
                      className="text-[10px] text-primary hover:underline"
                    >
                      {learning ? "Zapisywanie…" : "Ucz system z zaznaczonych przetargów"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {hasSwzMetaSection && (
        <details
          data-tender-documents-swz-meta
          className="rounded-xl border border-border/60 overflow-hidden scroll-mt-2"
        >
          <summary className="px-3 py-2.5 bg-secondary/40 border-b border-border cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <TenderUxSectionTitle as="p" className="inline">
              Metadane analizy SWZ
            </TenderUxSectionTitle>
          </summary>
          <div className="px-3 py-2.5 space-y-2">
            {swz?.parsedAt && (
              <p className="text-[10px] text-muted-foreground rounded-lg border border-border/60 bg-secondary/20 px-3 py-2">
                Ostatnia analiza SWZ: {new Date(swz.parsedAt).toLocaleString("pl-PL")}
                {sourceLabel && <> · źródło: {sourceLabel}</>}
                {swz.profitabilityNote && (
                  <> · <span className={
                    swz.profitabilityHint === "good" ? "text-emerald-600"
                      : swz.profitabilityHint === "risky" ? "text-red-600" : "text-amber-600"
                  }>{swz.profitabilityNote}</span></>
                )}
              </p>
            )}

            {(swz?.awardCriteria?.length ?? 0) > 0 && (
              <div className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-2">
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
              <div className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-2 text-[10px] text-muted-foreground">
                <p className="font-medium text-foreground/90 mb-1">
                  Fragmenty tabel z PDF ({swz!.tableExtracts!.length})
                </p>
                <ul className="space-y-0.5 list-disc pl-4 max-h-40 overflow-y-auto">
                  {swz!.tableExtracts!.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}

      {item.noticeHtml && (
        <div className="rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleHtml(); }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-secondary/50 hover:bg-secondary/80"
          >
            <span className="flex items-center gap-1.5"><FileText size={12} /> Ogłoszenie HTML (BZP)</span>
            <ChevronDown size={14} className={`transition-transform ${showHtml ? "rotate-180" : ""}`} />
          </button>
          {showHtml && (
            <iframe
              title="Ogłoszenie BZP"
              sandbox=""
              srcDoc={item.noticeHtml}
              className="w-full h-64 sm:h-80 bg-white text-black border-t border-border"
            />
          )}
        </div>
      )}
    </div>
  );
}
