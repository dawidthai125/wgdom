import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalLink, Loader2, Sparkles, Briefcase,
  Upload, ChevronDown, Trash2, FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  type TenderPipelineItem,
  type TenderPipelineStatus,
  TENDER_STATUS_LABELS,
  fetchTenderDocuments,
  fetchTenderNoticeDetails,
  analyzeTenderSwz,
  uploadTenderFile,
  computePipelineFunnel,
} from "@/lib/tenders-bzp";
import {
  learnKeywordsFromPipeline,
  suggestKeywordsFromPipeline,
} from "@/lib/tenders-bzp-learn";
import { parseNoticeHtmlBrief, mergeBriefWithItemTitle, athPreviewToSnapshot } from "@/lib/tenders-bzp-brief";
import { parseBestTenderDocuments, mergeSwzAnalysis, parseExternalTenderDocuments } from "@/lib/tender-document-resolver";
import { discoverExternalTenderDocs, type TenderExternalDocDiscovery } from "@/lib/tender-external-docs";
import { summarizeSwzFindings } from "@/lib/tenders-bid-prep";
import { TenderBidPrepPanel } from "@/app/TenderBidPrepPanel";
import { fetchAndParseKosztorys, isKosztorysPreviewExt } from "@/lib/ath-parser";
import { parsePlnFromKosztorysTotal } from "@/lib/tenders-bzp-doc-parse";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";
import { TenderDossierPanel } from "@/app/TenderDossierPanel";
import { TenderAttachmentsPanel } from "@/app/TenderAttachmentsPanel";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { assessTenderFit, estimatedValuePlnFromItem } from "@/lib/tenders-bzp-fit";
import { computeTenderBidProposal } from "@/lib/tenders-bid-calculator";

export function TenderDetailPanel({
  item,
  allItems,
  onUpdate,
  onCreateJob,
  onOpenJob,
  athPreviewEnabled,
  profileVersion = 0,
  onRemove,
}: {
  item: TenderPipelineItem;
  allItems: TenderPipelineItem[];
  onUpdate: (patch: Partial<TenderPipelineItem>) => void;
  onCreateJob?: (item: TenderPipelineItem) => string | void;
  onOpenJob?: (jobId: string) => void;
  athPreviewEnabled?: boolean;
  /** Inkrementowany po zapisie profilu firmy — przelicza dopasowanie. */
  profileVersion?: number;
  onRemove?: () => void;
}) {
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [learning, setLearning] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [externalDiscovering, setExternalDiscovering] = useState(false);
  const [showHtml, setShowHtml] = useState(false);
  const [docPreview, setDocPreview] = useState<InspectorFileItem | null>(null);
  const autoRanRef = useRef<Set<string>>(new Set());

  const applyExternalDiscovery = useCallback(async (discovery: TenderExternalDocDiscovery) => {
    let swzMerged = item.swzAnalysis ?? null;
    let kosztorysSnap = item.tenderDossier?.kosztorys ?? null;
    let estimatePln = item.ourEstimatePln ?? null;
    const brief = item.tenderDossier?.brief
      ?? mergeBriefWithItemTitle(
        item.noticeHtml ? parseNoticeHtmlBrief(item.noticeHtml) : parseNoticeHtmlBrief(""),
        item.title,
      );

    const patch: Partial<TenderPipelineItem> = { externalDocDiscovery: discovery };

    if (discovery.files.length > 0) {
      const relevantFiles = discovery.files.filter(
        (f) => f.isSwzHint || f.fromNotice || (f.matchedTender !== false && f.score >= 20),
      );
      const toParse = relevantFiles.length > 0 ? relevantFiles : discovery.files.slice(0, 2);
      const extParsed = await parseExternalTenderDocuments(
        toParse.map((f) => ({
          filename: f.filename,
          score: f.score,
          publicUrl: f.publicUrl,
        })),
        { ourEstimatePln: estimatePln, existingSwz: swzMerged ?? undefined },
      );
      const existingK = item.tenderDossier?.kosztorys;
      if (extParsed.kosztorys?.ok) {
        const extRows = extParsed.kosztorys.rows?.length ?? 0;
        const existingRows = existingK?.ok ? (existingK.rows?.length ?? 0) : 0;
        if (!existingK?.ok || extRows > existingRows) {
          kosztorysSnap = extParsed.kosztorys;
        }
      }
      if (extParsed.swzFromDoc) {
        const missingValue = swzMerged?.estimatedValuePln == null;
        const missingWadium = swzMerged?.wadiumPln == null;
        if (missingValue || missingWadium || !swzMerged) {
          swzMerged = mergeSwzAnalysis(swzMerged, extParsed.swzFromDoc);
        }
      }
      if (extParsed.estimatePln != null && estimatePln == null) {
        estimatePln = extParsed.estimatePln;
      }
    }

    patch.tenderDossier = {
      brief,
      kosztorys: kosztorysSnap,
      builtAt: new Date().toISOString(),
    };
    if (swzMerged) patch.swzAnalysis = swzMerged;
    if (estimatePln != null && item.ourEstimatePln == null) patch.ourEstimatePln = estimatePln;
    onUpdate(patch);
  }, [item, onUpdate]);

  const runExternalDiscovery = useCallback(async () => {
    if (!item.tenderId) return;
    setExternalDiscovering(true);
    try {
      const discovery = await discoverExternalTenderDocs({
        tenderId: item.tenderId,
        noticeHtml: item.noticeHtml,
        organizationName: item.organizationName,
        priorityBuyerId: item.priorityBuyerId,
        title: item.title,
        bzpNumber: item.bzpNumber,
      });
      await applyExternalDiscovery(discovery);
      if (discovery.files.length > 0) {
        toast.success(`Pobrano ${discovery.files.length} plik(ów) u zamawiającego`);
      } else if (discovery.pageLinks.length > 0) {
        toast.message("Są linki z ogłoszenia — otwórz ręcznie");
      } else {
        toast.message("Brak dokumentów powiązanych z tym postępowaniem");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd wyszukiwania dokumentów");
    } finally {
      setExternalDiscovering(false);
    }
  }, [item, applyExternalDiscovery]);

  useEffect(() => {
    if (autoRanRef.current.has(item.id)) return;
    autoRanRef.current.add(item.id);
    let cancelled = false;
    (async () => {
      setAutoRunning(true);
      const patch: Partial<TenderPipelineItem> = {};
      let html = item.noticeHtml ?? null;
      let docs = item.bzpDocuments ?? [];
      try {
        if (item.noticeNumber && !html) {
          const det = await fetchTenderNoticeDetails(item.noticeNumber);
          if (!cancelled) {
            patch.tenderState = det.tenderState;
            patch.noticeHtml = det.htmlBody;
            patch.noticeHtmlFetchedAt = new Date().toISOString();
            html = det.htmlBody;
          }
        }
        if (item.tenderId && !docs.length) {
          docs = await fetchTenderDocuments(item.tenderId);
          if (!cancelled) {
            patch.bzpDocuments = docs;
            patch.documentsFetchedAt = new Date().toISOString();
          }
        }
        if (Object.keys(patch).length > 0 && !cancelled) onUpdate(patch);

        let swz = item.swzAnalysis ?? null;
        if (item.noticeNumber && !swz && !cancelled) {
          swz = await analyzeTenderSwz({
            noticeNumber: item.noticeNumber,
            ourEstimatePln: item.ourEstimatePln ?? null,
          });
          onUpdate({ swzAnalysis: swz });
        }

        if (!item.tenderDossier && !cancelled) {
          const brief = mergeBriefWithItemTitle(
            html ? parseNoticeHtmlBrief(html) : parseNoticeHtmlBrief(""),
            item.title,
          );
          let kosztorysSnap = null;
          let swzMerged = swz;
          let estimatePln = item.ourEstimatePln ?? null;

          if (docs.length && item.tenderId) {
            try {
              const parsed = await parseBestTenderDocuments(item.tenderId, docs, {
                ourEstimatePln: estimatePln,
                existingSwz: swz ?? undefined,
              });
              kosztorysSnap = parsed.kosztorys;
              if (parsed.swzFromDoc) {
                swzMerged = mergeSwzAnalysis(swz, parsed.swzFromDoc);
                if (!swz) onUpdate({ swzAnalysis: swzMerged });
              }
              if (parsed.estimatePln != null && item.ourEstimatePln == null) {
                estimatePln = parsed.estimatePln;
              }
            } catch { /* brak kosztorysu */ }
          }

          if (item.uploadedFile && athPreviewEnabled && isKosztorysPreviewExt(item.uploadedFile.filename)) {
            try {
              const preview = await fetchAndParseKosztorys(
                item.uploadedFile.publicUrl,
                item.uploadedFile.filename,
                item.uploadedFile.path,
              );
              kosztorysSnap = athPreviewToSnapshot(preview, item.uploadedFile.filename);
              if (estimatePln == null) {
                estimatePln = parsePlnFromKosztorysTotal(kosztorysSnap.totalValue, kosztorysSnap.currency);
              }
            } catch { /* ignore */ }
          }

          const dossierPatch: Partial<TenderPipelineItem> = {
            tenderDossier: {
              brief,
              kosztorys: kosztorysSnap,
              builtAt: new Date().toISOString(),
            },
          };
          if (estimatePln != null && item.ourEstimatePln == null) {
            dossierPatch.ourEstimatePln = estimatePln;
          }
          if (swzMerged && swzMerged !== swz) {
            dossierPatch.swzAnalysis = swzMerged;
          }
          onUpdate(dossierPatch);
        }
      } catch {
        /* auto-analiza best-effort */
      } finally {
        if (!cancelled) setAutoRunning(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once per item id on expand
  }, [item.id]);

  const pipelineWinRate = computePipelineFunnel(allItems).winRate;

  useEffect(() => {
    if (!item.swzAnalysis && !item.noticeHtml) return;
    const fit = assessTenderFit(item, loadCompanyProfileLocal(), { pipelineWinRate });
    const prev = item.tenderFit;
    if (
      prev
      && prev.fitScore === fit.fitScore
      && prev.winChancePct === fit.winChancePct
      && prev.blockingIssues.join("|") === fit.blockingIssues.join("|")
      && prev.awardCriteria.length === fit.awardCriteria.length
    ) return;
    onUpdate({ tenderFit: fit });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- przeliczenie dopasowania
  }, [
    item.id,
    item.swzAnalysis?.parsedAt,
    item.noticeHtml,
    item.ourEstimatePln,
    item.tenderDossier?.builtAt,
    item.externalDocDiscovery?.builtAt,
    item.relevanceScore,
    profileVersion,
    pipelineWinRate,
  ]);

  const loadDocuments = useCallback(async () => {
    if (!item.tenderId) {
      toast.error("Brak tenderId — odśwież z BZP");
      return;
    }
    setLoadingDocs(true);
    try {
      const docs = await fetchTenderDocuments(item.tenderId);
      onUpdate({
        bzpDocuments: docs,
        documentsFetchedAt: new Date().toISOString(),
      });
      toast.success(docs.length ? `Znaleziono ${docs.length} załączników` : "Brak załączników");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd pobierania załączników");
    } finally {
      setLoadingDocs(false);
    }
  }, [item.tenderId, onUpdate]);

  const runAnalysis = useCallback(async (docIndex?: number) => {
    setAnalyzing(true);
    try {
      let analysis;
      if (docIndex && item.tenderId) {
        analysis = await analyzeTenderSwz({
          tenderId: item.tenderId,
          documentIndex: docIndex,
          ourEstimatePln: item.ourEstimatePln ?? null,
        });
      } else if (item.noticeNumber) {
        analysis = await analyzeTenderSwz({
          noticeNumber: item.noticeNumber,
          ourEstimatePln: item.ourEstimatePln ?? null,
        });
      } else {
        const doc = item.bzpDocuments?.find((d) => d.isSwzHint) ?? item.bzpDocuments?.[0];
        if (doc && item.tenderId) {
          analysis = await analyzeTenderSwz({
            tenderId: item.tenderId,
            documentIndex: doc.index,
            ourEstimatePln: item.ourEstimatePln ?? null,
          });
        } else {
          toast.error("Brak ogłoszenia BZP i załączników — odśwież dokumenty lub wgraj SWZ");
          return;
        }
      }

      const merged = mergeSwzAnalysis(item.swzAnalysis ?? null, analysis);
      const brief = item.tenderDossier?.brief
        ?? mergeBriefWithItemTitle(
          item.noticeHtml ? parseNoticeHtmlBrief(item.noticeHtml) : parseNoticeHtmlBrief(""),
          item.title,
        );

      onUpdate({
        swzAnalysis: merged,
        tenderDossier: {
          brief,
          kosztorys: item.tenderDossier?.kosztorys ?? null,
          builtAt: new Date().toISOString(),
        },
      });

      const summary = summarizeSwzFindings(merged);
      if (summary) toast.success(`Analiza: ${summary}`);
      else toast.message("Analiza zakończona — w tekście nie znaleziono kwoty ani wadium (sprawdź załączniki PDF)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd analizy SWZ");
    } finally {
      setAnalyzing(false);
    }
  }, [item, onUpdate]);

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await uploadTenderFile(item.id, file);
      onUpdate({ uploadedFile: uploaded });
      toast.success(`Wgrano: ${file.name}`);
      if (athPreviewEnabled && isKosztorysPreviewExt(file.name)) {
        const preview = await fetchAndParseKosztorys(uploaded.publicUrl, file.name, uploaded.path);
        const kosztorysSnap = athPreviewToSnapshot(preview, file.name);
        const brief = item.tenderDossier?.brief
          ?? mergeBriefWithItemTitle(
            item.noticeHtml ? parseNoticeHtmlBrief(item.noticeHtml) : parseNoticeHtmlBrief(""),
            item.title,
          );
        onUpdate({
          tenderDossier: {
            brief,
            kosztorys: kosztorysSnap,
            builtAt: new Date().toISOString(),
          },
        });
        if (preview.totalValue) {
          const num = parsePlnFromKosztorysTotal(preview.totalValue, preview.currency);
          if (num != null) onUpdate({ ourEstimatePln: num });
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd uploadu");
    } finally {
      setUploading(false);
    }
  }, [item.id, onUpdate, athPreviewEnabled]);

  const handleLearnKeywords = useCallback(async () => {
    setLearning(true);
    try {
      const { added } = await learnKeywordsFromPipeline(allItems);
      toast.success(added.length ? `Dodano ${added.length} słów kluczowych` : "Brak nowych propozycji");
    } catch {
      toast.error("Błąd zapisu słów kluczowych");
    } finally {
      setLearning(false);
    }
  }, [allItems]);

  const suggestions = suggestKeywordsFromPipeline(allItems);
  const swz = item.swzAnalysis;

  const bidProposal = useMemo(() => {
    const profile = loadCompanyProfileLocal();
    return computeTenderBidProposal({
      kosztorys: item.tenderDossier?.kosztorys,
      swz,
      fit: item.tenderFit,
      costModel: profile.costModel,
      minProjectDays: profile.minProjectDays,
      maxConcurrentProjects: profile.maxConcurrentProjects,
    });
  }, [item.tenderDossier?.kosztorys, item.tenderFit, swz]);

  const referenceValuePln = estimatedValuePlnFromItem(item, swz)
    ?? parsePlnFromKosztorysTotal(
      item.tenderDossier?.kosztorys?.totalValue,
      item.tenderDossier?.kosztorys?.currency,
    );

  return (
    <div className="px-4 pb-4 pt-2 border-t border-border space-y-3">
      {autoRunning && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-2">
          <Loader2 size={11} className="animate-spin" /> Ładowanie ogłoszenia i załączników…
        </p>
      )}

      <TenderBidPrepPanel
        item={item}
        swz={swz}
        fit={item.tenderFit}
        bidProposal={bidProposal}
        referenceValuePln={referenceValuePln}
        ourEstimatePln={item.ourEstimatePln}
        teamHeadcount={loadCompanyProfileLocal().costModel.headcount}
        analyzing={analyzing}
        onAnalyze={() => void runAnalysis()}
        onApplyRecommended={(pln) => onUpdate({ ourEstimatePln: pln })}
      />

      <TenderAttachmentsPanel
        item={item}
        athPreviewEnabled={athPreviewEnabled}
        loadingDocs={loadingDocs || autoRunning}
        onRefresh={() => void loadDocuments()}
        onAnalyze={(idx) => void runAnalysis(idx)}
        analyzing={analyzing}
        externalDiscovery={item.externalDocDiscovery}
        externalDiscovering={externalDiscovering}
        onSearchExternal={() => void runExternalDiscovery()}
      />

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted-foreground flex items-center gap-2">
          Status
          <select
            value={item.status}
            onChange={(e) => onUpdate({ status: e.target.value as TenderPipelineStatus })}
            className="bg-secondary rounded-lg px-2 py-1.5 text-xs border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            {(Object.keys(TENDER_STATUS_LABELS) as TenderPipelineStatus[]).map((s) => (
              <option key={s} value={s}>{TENDER_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>
        <a
          href={item.ezamowieniaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={12} />
          e-Zamówienia
        </a>
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium cursor-pointer hover:bg-secondary/80">
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          Wgraj SWZ
          <input
            type="file"
            accept=".pdf,.doc,.docx,.ath,.nor,.xml,.xlsx,.xls,.zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
              e.target.value = "";
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </label>
        {(item.status === "won" || item.status === "preparing") && onCreateJob && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (item.linkedJobId && onOpenJob) {
                onOpenJob(item.linkedJobId);
                return;
              }
              const jobId = onCreateJob(item);
              if (jobId) onUpdate({ linkedJobId: jobId, status: item.status === "won" ? "won" : item.status });
              toast.success("Utworzono robótę z przetargu");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-500/20"
          >
            <Briefcase size={12} />
            {item.linkedJobId ? "Otwórz robotę" : "Utwórz robotę"}
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-medium hover:bg-red-500/20"
          >
            <Trash2 size={12} />
            Usuń
          </button>
        )}
      </div>

      <label className="text-xs text-muted-foreground flex items-center gap-2">
        Nasz szacunek (PLN)
        <input
          type="number"
          min="0"
          step="1000"
          value={item.ourEstimatePln ?? ""}
          onChange={(e) => onUpdate({ ourEstimatePln: e.target.value ? Number(e.target.value) : null })}
          className="w-28 bg-secondary rounded-lg px-2 py-1 text-xs border border-border"
          onClick={(e) => e.stopPropagation()}
        />
      </label>

      <textarea
        value={item.notes}
        onChange={(e) => onUpdate({ notes: e.target.value })}
        placeholder="Notatki…"
        rows={2}
        className="w-full bg-secondary rounded-xl px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none resize-y min-h-[52px]"
        onClick={(e) => e.stopPropagation()}
      />

      <details className="rounded-xl border border-border overflow-hidden group">
        <summary className="px-3 py-2.5 text-xs font-medium bg-secondary/40 hover:bg-secondary/60 cursor-pointer list-none flex items-center justify-between">
          <span>Pełna karta przetargu i ogłoszenie BZP</span>
          <ChevronDown size={14} className="transition-transform group-open:rotate-180 shrink-0" />
        </summary>
        <div className="px-3 pb-3 pt-2 space-y-3 border-t border-border">
          <TenderDossierPanel
            item={item}
            dossier={item.tenderDossier}
            swz={swz}
            onOpenKosztorysPreview={(previewItem) => setDocPreview(previewItem)}
          />

          {item.noticeHtml && (
            <div className="rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowHtml((v) => !v); }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-secondary/50 hover:bg-secondary/80"
              >
                <span className="flex items-center gap-1.5"><FileText size={12} /> Pełne ogłoszenie BZP</span>
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
                onClick={(e) => { e.stopPropagation(); void handleLearnKeywords(); }}
                className="text-[10px] text-primary hover:underline"
              >
                {learning ? "Zapisywanie…" : "Ucz system z zaznaczonych przetargów"}
              </button>
            </div>
          )}
        </div>
      </details>

      {docPreview && (
        <JobFilePreviewModal
          item={docPreview}
          athPreviewEnabled={athPreviewEnabled !== false}
          onClose={() => setDocPreview(null)}
        />
      )}
    </div>
  );
}