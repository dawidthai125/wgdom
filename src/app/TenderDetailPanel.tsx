import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalLink, Loader2, Briefcase,
  Upload, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  type TenderPipelineItem,
  fetchTenderDocuments,
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
import { mergeSwzAnalysis, parseExternalTenderDocuments } from "@/lib/tender-document-resolver";
import {
  analyzeTenderWithDossier,
  dossierFromAnalysisResult,
} from "@/lib/tender-dossier-pipeline";
import { mergeExternalDiscoveryDossierPatch } from "@/lib/tender-dossier-external-discovery";
import { pickBetterKosztorys } from "@/lib/tender-dossier-merge";
import { existingKosztorysUnlessStale, stampDossierParserVersion } from "@/lib/tender-dossier-parser-version";
import { useTenderDossierHeavyLazy } from "@/app/hooks/useTenderDossierHeavyLazy";
import { useTenderDocumentsBootstrap } from "@/app/hooks/useTenderDocumentsBootstrap";
import { resolvedCostStatusDisplay, traceSsotSnapshot } from "@/lib/tender-data-ssot";
import { discoverExternalTenderDocs, type TenderExternalDocDiscovery } from "@/lib/tender-external-docs";
import { summarizeSwzFindings } from "@/lib/tenders-bid-prep";
import { fetchTenderAwardResult } from "@/lib/tenders-bzp-award";
import { exportTenderBidPackagePdf } from "@/lib/tender-bid-package-pdf";
import { TenderBidPrepPanel, computeBidPrepChecks } from "@/app/TenderBidPrepPanel";
import { TenderBidProposalPanel } from "@/app/TenderBidProposalPanel";
import { TenderSummaryBar } from "@/app/TenderSummaryBar";
import { TenderMonitoringBanner } from "@/app/TenderMonitoringBanner";
import { TenderOfferSection } from "@/app/TenderOfferSection";
import { TenderOfferCompletenessPanel } from "@/app/TenderOfferCompletenessPanel";
import { TenderWorkspaceTabBar } from "@/app/TenderWorkspaceTabBar";
import { TenderAnalysisStatusStrip } from "@/app/TenderAnalysisStatusStrip";
import { TenderOwnerView } from "@/app/TenderOwnerView";
import { buildTenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import { loadOwnerDecisions } from "@/lib/tenders-strategy-owner-decisions";
import { loadCompanyQualificationProfileLocal } from "@/lib/company-qualification-profile";
import { checkTenderParticipation } from "@/lib/tender-participation-check";
import { extractParticipationRequirements } from "@/lib/tender-participation-requirements";
import { extractExperienceRequirements } from "@/lib/tender-experience-requirements";
import { resolvedCostStatus } from "@/lib/tender-data-ssot";
import { isKosztorysAwaitingHeavyParse } from "@/lib/tender-analysis-status-ux";
import { TenderDocumentsWorkspace } from "@/app/TenderDocumentsWorkspace";
import { TenderQualificationWorkspace } from "@/app/TenderQualificationWorkspace";
import { useTendersContextOptional } from "@/app/tenders/context/TendersContext";
import {
  TENDER_VALUATION_SECTION_ID,
  getTenderMonitoringCounts,
  resolveDefaultTenderWorkspace,
  type TenderWorkspaceTabId,
} from "@/lib/tender-workspace-ux";
import { TENDER_OWNER_WORKSPACE_SECTION_COPY } from "@/lib/tender-owner-language-pl";
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
import {
  getTenderPriceOverrides,
  loadTenderPriceOverridesStoreLocal,
} from "@/lib/tender-price-overrides";

export function TenderDetailPanel({
  item,
  allItems,
  onUpdate,
  onCreateJob,
  onOpenJob,
  athPreviewEnabled,
  profileVersion = 0,
  onRemove,
  embedV4ChromeHidden = false,
  embedV4Workspace,
  onEmbedV4Navigate,
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
  /** V4 — ukryj summary bar i legacy tab bar (shell w TenderDetailPage). */
  embedV4ChromeHidden?: boolean;
  /** V4 — wymuszona zakładka workspace (legacy id). */
  embedV4Workspace?: TenderWorkspaceTabId;
  /** V4 — nawigacja z TenderOwnerView → URL V4. */
  onEmbedV4Navigate?: (tab: TenderWorkspaceTabId) => void;
}) {
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [learning, setLearning] = useState(false);
  const [externalDiscovering, setExternalDiscovering] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [fetchingAward, setFetchingAward] = useState(false);
  const [savingSubmittedBid, setSavingSubmittedBid] = useState(false);
  const [submittedBidDraft, setSubmittedBidDraft] = useState<string>(
    () => (item.submittedBidPln != null ? String(item.submittedBidPln) : ""),
  );
  const [showHtml, setShowHtml] = useState(false);
  const [docPreview, setDocPreview] = useState<InspectorFileItem | null>(null);
  const [bidBreakdownOpen, setBidBreakdownOpen] = useState(false);
  const [bidPanelHighlight, setBidPanelHighlight] = useState(false);
  const [priceOverridesRevision, setPriceOverridesRevision] = useState(0);
  const [activeWorkspace, setActiveWorkspace] = useState<TenderWorkspaceTabId>(
    () => resolveDefaultTenderWorkspace(item),
  );
  const workspaceForLogic = embedV4Workspace ?? activeWorkspace;
  const { autoRunning } = useTenderDocumentsBootstrap({ item, onUpdate });
  const platformTelemetryRef = useRef<string | null>(null);
  const wantsHeavyDossier = workspaceForLogic === "documents" || workspaceForLogic === "valuation";
  const { dossierBuilding } = useTenderDossierHeavyLazy({
    item,
    enabled: wantsHeavyDossier,
    onUpdate,
    athPreviewEnabled,
  });
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
      const existingK = existingKosztorysUnlessStale(item.tenderDossier, item.tenderDossier?.kosztorys);
      if (extParsed.kosztorys?.ok) {
        kosztorysSnap = pickBetterKosztorys(existingK, extParsed.kosztorys)
          ?? extParsed.kosztorys
          ?? existingK
          ?? kosztorysSnap;
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

    patch.tenderDossier = mergeExternalDiscoveryDossierPatch(item.tenderDossier, {
      brief,
      kosztorys: kosztorysSnap,
      builtAt: new Date().toISOString(),
    });
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
        existingDossier: item.tenderDossier ?? null,
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
          tenderDossier: stampDossierParserVersion({
            brief,
            kosztorys: kosztorysSnap,
            builtAt: new Date().toISOString(),
          }),
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

  const tenderPriceOverrides = useMemo(() => {
    void priceOverridesRevision;
    const store = loadTenderPriceOverridesStoreLocal();
    return getTenderPriceOverrides(store, item.id);
  }, [item.id, priceOverridesRevision]);

  const valuationWorkspaceActive = workspaceForLogic === "valuation" || workspaceForLogic === "offer";

  const computeBidProposalNow = useCallback(() => {
    const profile = loadCompanyProfileLocal();
    return computeTenderBidProposal({
      kosztorys: item.tenderDossier?.kosztorys,
      swz,
      fit: item.tenderFit,
      costModel: profile.costModel,
      minProjectDays: profile.minProjectDays,
      maxConcurrentProjects: profile.maxConcurrentProjects,
      priceOverrides: tenderPriceOverrides.overrides,
    });
  }, [
    item.tenderDossier?.kosztorys,
    item.tenderFit,
    swz,
    tenderPriceOverrides.overrides,
  ]);

  const bidProposal = useMemo(() => {
    if (!valuationWorkspaceActive) return null;
    return computeBidProposalNow();
  }, [valuationWorkspaceActive, computeBidProposalNow]);

  const ownerFinanceProposal = useMemo(() => {
    if (resolvedCostStatus(item) === "NOT_FOUND") return null;
    if (isKosztorysAwaitingHeavyParse(item)) return null;
    return computeBidProposalNow();
  }, [item, computeBidProposalNow]);

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
        bidProposal: bidProposal ?? computeBidProposalNow(),
      });
      toast.success("Pobrano pakiet wyceny PDF");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd eksportu PDF");
    } finally {
      setExportingPdf(false);
    }
  }, [item, bidProposal, computeBidProposalNow]);

  const bidPrepChecks = useMemo(
    () => computeBidPrepChecks(item, swz, item.tenderFit, bidProposal, {
      pricingDeferred: workspaceForLogic === "overview",
    }),
    [item, swz, item.tenderFit, bidProposal, workspaceForLogic],
  );
  const readyCount = bidPrepChecks.filter((c) => c.status === "ok").length;

  const scoringContext = tendersCtx?.snapshot.scoringContext;

  const ownerDecision = useMemo(
    () => loadOwnerDecisions().byId[item.id] ?? null,
    [item.id],
  );

  const participationResult = useMemo(() => {
    const combinedText = [item.title, item.noticeHtml ?? ""].join("\n");
    const requirements = swz?.participationRequirements?.length
      ? swz.participationRequirements
      : extractParticipationRequirements(combinedText);
    const experienceRequirements = swz?.experienceRequirements?.length
      ? swz.experienceRequirements
      : extractExperienceRequirements(combinedText);
    if (requirements.length === 0 && experienceRequirements.length === 0) return null;
    return checkTenderParticipation(
      requirements,
      loadCompanyQualificationProfileLocal(),
      experienceRequirements,
    );
  }, [
    item.title,
    item.noticeHtml,
    swz?.participationRequirements,
    swz?.experienceRequirements,
  ]);

  const monitoringCounts = useMemo(() => getTenderMonitoringCounts(item), [item]);

  const intelligenceCtx = useMemo(() => {
    if (!scoringContext) return null;
    return buildTenderIntelligenceContext({
      item,
      scoringContext,
      ownerFinanceProposal,
      ownerDecision,
      monitoringCounts,
      bidPrepChecks,
      participationResult,
      swz,
      fit: item.tenderFit,
    });
  }, [
    item,
    scoringContext,
    ownerFinanceProposal,
    ownerDecision,
    monitoringCounts,
    bidPrepChecks,
    participationResult,
    swz,
    item.tenderFit,
  ]);

  useEffect(() => {
    setActiveWorkspace(resolveDefaultTenderWorkspace(item));
  }, [item.id, item.status]);

  const navigateWorkspace = useCallback((tab: TenderWorkspaceTabId) => {
    if (onEmbedV4Navigate) {
      onEmbedV4Navigate(tab);
      return;
    }
    setActiveWorkspace(tab);
    if (tab === "valuation") {
      setBidBreakdownOpen(false);
      setBidPanelHighlight(true);
      window.setTimeout(() => setBidPanelHighlight(false), 2200);
    }
  }, [onEmbedV4Navigate]);

  const effectiveWorkspace = workspaceForLogic;

  const workspaceBadges = useMemo(() => {
    const badges: Partial<Record<TenderWorkspaceTabId, string>> = {};
    const mon = getTenderMonitoringCounts(item);
    // P5-004 — monitoring już w nagłówku (Pilne); bez badge na Przeglądzie.
    if (mon.total > 0 && effectiveWorkspace !== "overview") {
      badges.overview = String(mon.total);
    }
    if (bidPrepChecks.some((c) => c.id === "kosztorys" && c.status !== "ok")) {
      badges.documents = "!";
    }
    const wadiumCheck = bidPrepChecks.find((c) => c.id === "wadium");
    if (wadiumCheck?.status === "partial") badges.qualification = "!";
    return badges;
  }, [item, bidPrepChecks, effectiveWorkspace]);

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
        bidProposal: bidProposal ?? computeBidProposalNow(),
        submittedBidPln: pln,
      });
      toast.success("Zapisano ofertę złożoną — snapshot kalibracji w chmurze");
    } catch {
      toast.error("Nie udało się zapisać oferty / kalibracji");
    } finally {
      setSavingSubmittedBid(false);
    }
  }, [item, bidProposal, computeBidProposalNow, submittedBidDraft, onUpdate]);

  return (
    <div className={`space-y-3 ${embedV4ChromeHidden ? "" : "px-4 pb-4 pt-2 border-t border-border"}`}>
      {autoRunning && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-2">
          <Loader2 size={11} className="animate-spin" /> Ładowanie ogłoszenia i załączników…
        </p>
      )}

      {!embedV4ChromeHidden && (
        <>
          <TenderSummaryBar
            item={item}
            swz={swz}
            readyCount={readyCount}
            readyTotal={bidPrepChecks.length}
            onStatusChange={(status) => onUpdate({ status })}
            ownerViewCompact={effectiveWorkspace === "overview"}
          />

          <TenderWorkspaceTabBar
            activeTab={effectiveWorkspace}
            onTabChange={navigateWorkspace}
            badges={workspaceBadges}
          />
        </>
      )}

      {effectiveWorkspace === "overview" && (
        <div className="space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {intelligenceCtx ? (
            <TenderOwnerView
              intelligenceCtx={intelligenceCtx}
              onNavigate={navigateWorkspace}
              onOpenPreview={(previewItem) => setDocPreview(previewItem)}
              detailsSection={(
                <>
                  <TenderMonitoringBanner
                    item={item}
                    onOpenStrategy={tendersCtx?.openTendersStrategy}
                  />

                  <TenderAnalysisStatusStrip
                    item={item}
                    swz={swz}
                    bidProposal={ownerFinanceProposal}
                    dossierBuilding={dossierBuilding}
                    autoRunning={autoRunning}
                    ownerMoreContext
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

                  <TenderBidPrepPanel
                    item={item}
                    swz={swz}
                    fit={item.tenderFit}
                    bidProposal={ownerFinanceProposal}
                    ourEstimatePln={item.ourEstimatePln}
                    analyzing={analyzing}
                    onAnalyze={() => void runAnalysis()}
                    onExportPdf={() => void handleExportPdf()}
                    exportingPdf={exportingPdf}
                    onUpdateOurEstimate={(pln) => onUpdate(patchOurEstimatePln(item, pln, "ręczna edycja"))}
                    onNavigateWorkspace={navigateWorkspace}
                    collapseTiles
                  />
                </>
              )}
            />
          ) : (
            <p className="text-xs text-muted-foreground px-1 py-2">
              Ładowanie kontekstu strategii przetargów…
            </p>
          )}

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

      {effectiveWorkspace === "documents" && (
        <TenderDocumentsWorkspace
          item={item}
          swz={swz}
          platformSourceLabel={platformDocStatus.sourceLabel}
          athPreviewEnabled={athPreviewEnabled}
          loadingDocs={loadingDocs || autoRunning || dossierBuilding}
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

      {effectiveWorkspace === "qualification" && (
        <TenderQualificationWorkspace
          item={item}
          swz={swz}
          fit={item.tenderFit}
        />
      )}

      {effectiveWorkspace === "valuation" && (
        <section id={TENDER_VALUATION_SECTION_ID} className="scroll-mt-2 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
            {TENDER_OWNER_WORKSPACE_SECTION_COPY.valuation}
          </p>
          {dossierBuilding && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-2 px-0.5">
              <Loader2 size={11} className="animate-spin" /> {TENDER_OWNER_WORKSPACE_SECTION_COPY.valuationProcessing}
            </p>
          )}
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
            tenderId={item.id}
            priceOverrides={tenderPriceOverrides.overrides}
            onPriceOverridesChanged={() => setPriceOverridesRevision((v) => v + 1)}
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

      {effectiveWorkspace === "offer" && (
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