import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalLink, Loader2, Briefcase,
  Upload, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  type TenderPipelineItem,
  fetchTenderDocuments,
  fetchTenderNoticeDetails,
  uploadTenderFile,
  computePipelineFunnel,
  patchOurEstimatePln,
  patchSubmittedBidPln,
} from "@/lib/tenders-bzp";
import {
  recordSubmittedBidCalibration,
  syncCalibrationAwardFromItem,
} from "@/lib/tender-cost-calibration";
import {
  learnKeywordsFromPipeline,
  suggestKeywordsFromPipeline,
} from "@/lib/tenders-bzp-learn";
import { parseNoticeHtmlBrief, mergeBriefWithItemTitle, athPreviewToSnapshot } from "@/lib/tenders-bzp-brief";
import { parseTenderDossierDocuments, mergeSwzAnalysis, parseExternalTenderDocuments } from "@/lib/tender-document-resolver";
import { analyzeTenderWithDossier, dossierFromAnalysisResult } from "@/lib/tender-dossier-pipeline";
import { resolvedCostStatusDisplay, traceSsotSnapshot } from "@/lib/tender-data-ssot";
import { discoverExternalTenderDocs, type TenderExternalDocDiscovery } from "@/lib/tender-external-docs";
import { summarizeSwzFindings } from "@/lib/tenders-bid-prep";
import { analyzeTenderSwzEnhanced } from "@/lib/tenders-bzp-analyze-local";
import { fetchTenderAwardResult } from "@/lib/tenders-bzp-award";
import { exportTenderBidPackagePdf } from "@/lib/tender-bid-package-pdf";
import { TenderBidPrepPanel, computeBidPrepChecks } from "@/app/TenderBidPrepPanel";
import { TenderBidProposalPanel } from "@/app/TenderBidProposalPanel";
import { TenderSummaryBar } from "@/app/TenderSummaryBar";
import { TenderMonitoringBanner } from "@/app/TenderMonitoringBanner";
import { TenderOfferSection } from "@/app/TenderOfferSection";
import { TenderOfferCompletenessPanel } from "@/app/TenderOfferCompletenessPanel";
import { TenderWorkspaceTabBar } from "@/app/TenderWorkspaceTabBar";
import { TenderOverviewShortcuts } from "@/app/TenderOverviewShortcuts";
import { TenderDocumentsWorkspace } from "@/app/TenderDocumentsWorkspace";
import { TenderQualificationWorkspace } from "@/app/TenderQualificationWorkspace";
import { useTendersContextOptional } from "@/app/tenders/context/TendersContext";
import {
  TENDER_VALUATION_SECTION_ID,
  getTenderMonitoringCounts,
  resolveDefaultTenderWorkspace,
  type TenderWorkspaceTabId,
} from "@/lib/tender-workspace-ux";
import { fetchAndParseKosztorys, isKosztorysPreviewExt } from "@/lib/ath-parser";
import { parsePlnFromKosztorysTotal } from "@/lib/tenders-bzp-filename";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";
import {
  logPlatformDocumentTelemetry,
  resolveTenderPlatformDocumentStatus,
} from "@/lib/tender-platform-awareness";
import { processTenderChangeMonitorUpdate } from "@/lib/tender-change-monitor";
import { processTenderQaMonitorUpdate } from "@/lib/tender-qa-monitor";
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
  const [exportingPdf, setExportingPdf] = useState(false);
  const [fetchingAward, setFetchingAward] = useState(false);
  const [savingSubmittedBid, setSavingSubmittedBid] = useState(false);
  const [submittedBidDraft, setSubmittedBidDraft] = useState<string>(
    () => (item.submittedBidPln != null ? String(item.submittedBidPln) : ""),
  );
  const [showHtml, setShowHtml] = useState(false);
  const [docPreview, setDocPreview] = useState<InspectorFileItem | null>(null);
  const [bidBreakdownOpen, setBidBreakdownOpen] = useState(true);
  const [bidPanelHighlight, setBidPanelHighlight] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<TenderWorkspaceTabId>(
    () => resolveDefaultTenderWorkspace(item),
  );
  const autoRanRef = useRef<Set<string>>(new Set());
  const platformTelemetryRef = useRef<string | null>(null);
  const tendersCtx = useTendersContextOptional();

  const platformDocStatus = useMemo(
    () => resolveTenderPlatformDocumentStatus(item, { loadingDocs: loadingDocs || autoRunning }),
    [item, loadingDocs, autoRunning],
  );

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
    const { changeMonitor, newEvents } = processTenderChangeMonitorUpdate(
      { ...item, ...patch },
      { externalDocDiscovery: discovery },
    );
    const { qaMonitor, newEvents: newQaEvents } = processTenderQaMonitorUpdate(
      { ...item, ...patch },
      { externalDocDiscovery: discovery },
    );
    patch.changeMonitor = changeMonitor;
    patch.qaMonitor = qaMonitor;
    const totalNew = newEvents.length + newQaEvents.length;
    if (totalNew > 0) {
      toast.warning(`Wykryto ${totalNew} zmian${totalNew === 1 ? "ę" : "y"} w dokumentacji`);
    }
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
          docs = await fetchTenderDocuments(item.tenderId, item.noticeNumber || undefined);
          if (!cancelled) {
            patch.bzpDocuments = docs;
            patch.documentsFetchedAt = new Date().toISOString();
          }
        }
        if (!cancelled && patch.bzpDocuments) {
          const merged = { ...item, ...patch };
          const { changeMonitor, newEvents } = processTenderChangeMonitorUpdate(
            merged,
            { documents: patch.bzpDocuments as typeof docs },
          );
          const { qaMonitor, newEvents: newQaEvents } = processTenderQaMonitorUpdate(
            merged,
            { documents: patch.bzpDocuments as typeof docs },
          );
          patch.changeMonitor = changeMonitor;
          patch.qaMonitor = qaMonitor;
          const totalNew = newEvents.length + newQaEvents.length;
          if (totalNew > 0) {
            toast.warning(`Wykryto ${totalNew} zmian${totalNew === 1 ? "ę" : "y"} w dokumentacji`);
          }
        }
        if (
          !cancelled
          && item.tenderId
          && docs.length === 0
          && !item.externalDocDiscovery?.builtAt
          && (html ?? item.noticeHtml)
        ) {
          try {
            const discovery = await discoverExternalTenderDocs({
              tenderId: item.tenderId,
              noticeHtml: html ?? item.noticeHtml,
              organizationName: item.organizationName,
              priorityBuyerId: item.priorityBuyerId,
              title: item.title,
              bzpNumber: item.bzpNumber,
            });
            if (!cancelled) {
              patch.externalDocDiscovery = discovery;
            }
          } catch { /* auto external discover best-effort */ }
        }
        if (Object.keys(patch).length > 0 && !cancelled) onUpdate(patch);

        let swz = item.swzAnalysis ?? null;
        if (!swz && !cancelled && (item.noticeNumber || item.tenderId)) {
          try {
            const { analysis } = await analyzeTenderSwzEnhanced({
              noticeNumber: item.noticeNumber || undefined,
              tenderId: item.tenderId,
              bzpDocuments: docs.length ? docs : item.bzpDocuments,
              noticeHtml: html ?? item.noticeHtml,
              ourEstimatePln: item.ourEstimatePln ?? null,
            });
            swz = analysis;
            onUpdate({ swzAnalysis: swz });
          } catch { /* auto-analiza best-effort */ }
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
              const parsed = await parseTenderDossierDocuments(item.tenderId, docs, {
                ourEstimatePln: estimatePln,
                existingSwz: swz ?? undefined,
                tenderTitle: item.title,
              });
              kosztorysSnap = parsed.kosztorys;
              if (parsed.swzMerged) {
                swzMerged = parsed.swzMerged;
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
    const key = `${item.id}|${item.documentsFetchedAt ?? ""}|${platformDocStatus.documentsFound}|${platformDocStatus.missingReason}`;
    if (platformTelemetryRef.current === key) return;
    if (platformDocStatus.missingReason === "loading") return;
    platformTelemetryRef.current = key;
    logPlatformDocumentTelemetry({
      platformDetected: platformDocStatus.platform,
      documentsFound: platformDocStatus.documentsFound,
      documentsMissingReason: platformDocStatus.missingReason,
    });
  }, [item.id, item.documentsFetchedAt, platformDocStatus]);

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
      const docs = await fetchTenderDocuments(item.tenderId, item.noticeNumber || undefined);
      const { changeMonitor, newEvents } = processTenderChangeMonitorUpdate(item, { documents: docs });
      const { qaMonitor, newEvents: newQaEvents } = processTenderQaMonitorUpdate(item, { documents: docs });
      const totalNew = newEvents.length + newQaEvents.length;
      onUpdate({
        bzpDocuments: docs,
        documentsFetchedAt: new Date().toISOString(),
        changeMonitor,
        qaMonitor,
      });
      if (totalNew > 0) {
        toast.warning(`Wykryto ${totalNew} zmian${totalNew === 1 ? "ę" : "y"} w dokumentacji`);
      } else {
        toast.success(docs.length ? `Znaleziono ${docs.length} załączników` : "Brak załączników");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd pobierania załączników");
    } finally {
      setLoadingDocs(false);
    }
  }, [item.tenderId, onUpdate]);

  const runAnalysis = useCallback(async (docIndex?: number) => {
    setAnalyzing(true);
    try {
      const brief = item.tenderDossier?.brief
        ?? mergeBriefWithItemTitle(
          item.noticeHtml ? parseNoticeHtmlBrief(item.noticeHtml) : parseNoticeHtmlBrief(""),
          item.title,
        );

      const result = await analyzeTenderWithDossier({
        noticeNumber: item.noticeNumber || undefined,
        tenderId: item.tenderId,
        documentIndex: docIndex,
        bzpDocuments: item.bzpDocuments,
        noticeHtml: item.noticeHtml,
        ourEstimatePln: item.ourEstimatePln ?? null,
        existing: item.swzAnalysis ?? null,
        existingKosztorys: item.tenderDossier?.kosztorys ?? null,
        tenderTitle: item.title,
      });

      const patch: Partial<TenderPipelineItem> = {
        swzAnalysis: result.analysis,
        tenderDossier: dossierFromAnalysisResult(brief, result),
      };
      if (result.estimatePln != null && item.ourEstimatePln == null) {
        patch.ourEstimatePln = result.estimatePln;
      }

      const updatedItem: TenderPipelineItem = { ...item, ...patch };
      // P2-E.4 — zawsze odśwież tenderFit po ręcznej analizie (bez stale KV snapshot)
      patch.tenderFit = assessTenderFit(updatedItem, loadCompanyProfileLocal(), { pipelineWinRate });
      const finalItem: TenderPipelineItem = { ...updatedItem, tenderFit: patch.tenderFit };

      onUpdate(patch);
      traceSsotSnapshot(finalItem, result.analysis);

      const summary = summarizeSwzFindings(finalItem, result.analysis);
      const critN = result.analysis.awardCriteria?.length ?? 0;
      const extraParts: string[] = [];
      if (critN > 0) extraParts.push(`${critN} kryteriów`);
      if (result.scanSummary.kosztorysFound) {
        const costUi = resolvedCostStatusDisplay(finalItem);
        extraParts.push(costUi.display.replace(/\.$/, ""));
      }
      if (result.scanSummary.valueFound) extraParts.push("wartość ✓");
      const extra = extraParts.length ? ` · ${extraParts.join(" · ")}` : "";
      if (summary) toast.success(`Analiza: ${summary}${extra}`);
      else toast.message(`Analiza dossier zakończona${extra}`);
      result.warnings.forEach((w) => toast.message(w));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd analizy SWZ");
    } finally {
      setAnalyzing(false);
    }
  }, [item, onUpdate, pipelineWinRate]);

  useEffect(() => {
    setSubmittedBidDraft(item.submittedBidPln != null ? String(item.submittedBidPln) : "");
  }, [item.id, item.submittedBidPln]);

  const handleFetchAward = useCallback(async () => {
    setFetchingAward(true);
    try {
      const result = await fetchTenderAwardResult({
        bzpNumber: item.bzpNumber,
        moIdentifier: item.moIdentifier,
        noticeHtml: item.noticeHtml,
      });
      if (result) {
        onUpdate({ awardResult: result });
        void syncCalibrationAwardFromItem({ ...item, awardResult: result });
        toast.success(result.isUs ? "Wygraliśmy to postępowanie!" : `Wynik: ${result.winnerName}`);
      } else {
        toast.message("Brak ogłoszenia o wyniku w BZP — postępowanie może być w toku");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd pobierania wyniku");
    } finally {
      setFetchingAward(false);
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
          if (num != null) onUpdate(patchOurEstimatePln(item, num, "kosztorys z uploadu"));
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

  const handleExportPdf = useCallback(async () => {
    setExportingPdf(true);
    try {
      await exportTenderBidPackagePdf({
        item,
        profile: loadCompanyProfileLocal(),
        bidProposal,
      });
      toast.success("Pobrano pakiet wyceny PDF");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd eksportu PDF");
    } finally {
      setExportingPdf(false);
    }
  }, [item, bidProposal]);

  const bidPrepChecks = useMemo(
    () => computeBidPrepChecks(item, swz, item.tenderFit, bidProposal),
    [item, swz, item.tenderFit, bidProposal],
  );
  const readyCount = bidPrepChecks.filter((c) => c.status === "ok").length;

  useEffect(() => {
    setActiveWorkspace(resolveDefaultTenderWorkspace(item));
  }, [item.id, item.status]);

  const navigateWorkspace = useCallback((tab: TenderWorkspaceTabId) => {
    setActiveWorkspace(tab);
    if (tab === "valuation") {
      setBidBreakdownOpen(true);
      setBidPanelHighlight(true);
      window.setTimeout(() => setBidPanelHighlight(false), 2200);
    }
  }, []);

  const workspaceBadges = useMemo(() => {
    const badges: Partial<Record<TenderWorkspaceTabId, string>> = {};
    const mon = getTenderMonitoringCounts(item);
    if (mon.total > 0) badges.overview = String(mon.total);
    if (bidPrepChecks.some((c) => c.id === "kosztorys" && c.status !== "ok")) {
      badges.documents = "!";
    }
    const wadiumCheck = bidPrepChecks.find((c) => c.id === "wadium");
    if (wadiumCheck?.status === "partial") badges.qualification = "!";
    return badges;
  }, [item, bidPrepChecks]);

  const handleSaveSubmittedBid = useCallback(async () => {
    const pln = submittedBidDraft ? Number(submittedBidDraft) : null;
    if (pln == null || !Number.isFinite(pln) || pln <= 0) {
      toast.error("Podaj poprawną kwotę oferty złożonej (PLN)");
      return;
    }
    setSavingSubmittedBid(true);
    try {
      const patch = patchSubmittedBidPln(item, pln);
      const nextStatus = item.status === "preparing" || item.status === "interested"
        ? "submitted" as const
        : item.status;
      onUpdate({ ...patch, status: nextStatus });
      await recordSubmittedBidCalibration({
        item: { ...item, ...patch, status: nextStatus },
        bidProposal,
        submittedBidPln: pln,
      });
      toast.success("Zapisano ofertę złożoną — snapshot kalibracji w chmurze");
    } catch {
      toast.error("Nie udało się zapisać oferty / kalibracji");
    } finally {
      setSavingSubmittedBid(false);
    }
  }, [item, bidProposal, submittedBidDraft, onUpdate]);

  return (
    <div className="px-4 pb-4 pt-2 border-t border-border space-y-3">
      {autoRunning && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-2">
          <Loader2 size={11} className="animate-spin" /> Ładowanie ogłoszenia i załączników…
        </p>
      )}

      <TenderSummaryBar
        item={item}
        swz={swz}
        readyCount={readyCount}
        readyTotal={bidPrepChecks.length}
        onStatusChange={(status) => onUpdate({ status })}
      />

      <TenderWorkspaceTabBar
        activeTab={activeWorkspace}
        onTabChange={navigateWorkspace}
        badges={workspaceBadges}
      />

      {activeWorkspace === "overview" && (
        <div className="space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto">
          <TenderMonitoringBanner
            item={item}
            onOpenStrategy={tendersCtx?.openTendersStrategy}
          />

          <div className="flex flex-wrap items-center gap-2">
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

          <TenderOverviewShortcuts
            item={item}
            swz={swz}
            fit={item.tenderFit}
            onNavigate={navigateWorkspace}
          />

          <TenderBidPrepPanel
            item={item}
            swz={swz}
            fit={item.tenderFit}
            bidProposal={bidProposal}
            ourEstimatePln={item.ourEstimatePln}
            analyzing={analyzing}
            onAnalyze={() => void runAnalysis()}
            onExportPdf={() => void handleExportPdf()}
            exportingPdf={exportingPdf}
            onUpdateOurEstimate={(pln) => onUpdate(patchOurEstimatePln(item, pln, "ręczna edycja"))}
            onNavigateWorkspace={navigateWorkspace}
            overviewMode
          />

          <textarea
            value={item.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Notatki…"
            rows={2}
            className="w-full bg-secondary rounded-xl px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none resize-y min-h-[52px] max-h-24"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {activeWorkspace === "documents" && (
        <TenderDocumentsWorkspace
          item={item}
          swz={swz}
          platformSourceLabel={platformDocStatus.sourceLabel}
          athPreviewEnabled={athPreviewEnabled}
          loadingDocs={loadingDocs || autoRunning}
          analyzing={analyzing}
          externalDiscovering={externalDiscovering}
          showHtml={showHtml}
          onToggleHtml={() => setShowHtml((v) => !v)}
          suggestions={suggestions}
          learning={learning}
          onRefresh={() => void loadDocuments()}
          onAnalyze={(idx) => void runAnalysis(idx)}
          onSearchExternal={() => void runExternalDiscovery()}
          onLearnKeywords={() => void handleLearnKeywords()}
          onOpenKosztorysPreview={(previewItem) => setDocPreview(previewItem)}
        />
      )}

      {activeWorkspace === "qualification" && (
        <TenderQualificationWorkspace
          item={item}
          swz={swz}
          fit={item.tenderFit}
        />
      )}

      {activeWorkspace === "valuation" && (
        <section id={TENDER_VALUATION_SECTION_ID} className="scroll-mt-2 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
            Wycena
          </p>
          <TenderBidProposalPanel
            proposal={bidProposal}
            referenceValuePln={referenceValuePln}
            ourEstimatePln={item.ourEstimatePln}
            teamHeadcount={loadCompanyProfileLocal().costModel.headcount}
            onApplyRecommended={(pln) => onUpdate(patchOurEstimatePln(item, pln, "propozycja kalkulatora"))}
            missingKosztorys={!item.tenderDossier?.kosztorys?.ok}
            breakdownOpen={bidBreakdownOpen}
            highlight={bidPanelHighlight}
            catalogQuantities={item.tenderDossier?.kosztorys?.catalogQuantities}
            showHistoricalCalibration={false}
          />
          {(item.estimateHistory?.length ?? 0) > 0 && (
            <details className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-2 text-[10px]">
              <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                Historia szacunku ({item.estimateHistory!.length})
              </summary>
              <ul className="mt-2 space-y-1 max-h-28 overflow-y-auto">
                {[...(item.estimateHistory ?? [])].reverse().map((snap, idx) => (
                  <li key={`${snap.at}-${idx}`} className="flex flex-wrap gap-x-2 text-muted-foreground">
                    <span className="font-medium text-foreground tabular-nums">
                      {snap.pln.toLocaleString("pl-PL")} zł
                    </span>
                    <span>{new Date(snap.at).toLocaleString("pl-PL")}</span>
                    {snap.note && <span className="italic">{snap.note}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {/* Sloty UX.1B: P2-G.3C Benchmark · P2-G.3D AI Validation · P2-G.3E RMS */}
        </section>
      )}

      {activeWorkspace === "offer" && (
        <div className="space-y-3">
          <TenderOfferCompletenessPanel swz={swz} combinedText={item.noticeHtml ?? undefined} />
          <TenderOfferSection
            item={item}
            bidProposal={bidProposal}
            awardResult={item.awardResult}
            submittedBidDraft={submittedBidDraft}
            onSubmittedBidDraftChange={setSubmittedBidDraft}
            onSaveSubmittedBid={() => void handleSaveSubmittedBid()}
            savingSubmittedBid={savingSubmittedBid}
            onFetchAward={() => void handleFetchAward()}
            fetchingAward={fetchingAward}
          />
        </div>
      )}

      {docPreview && (
        <JobFilePreviewModal
          item={docPreview}
          athPreviewEnabled={athPreviewEnabled !== false}
          bzpDocuments={item.bzpDocuments}
          onClose={() => setDocPreview(null)}
        />
      )}
    </div>
  );
}