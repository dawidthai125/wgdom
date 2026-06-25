import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshCw, Search, Scale, MapPin, Calendar, Building2,
  Filter, AlertCircle, HelpCircle, Download, Trash2, CheckSquare, Square,
  ChevronDown, SlidersHorizontal, Sparkles, Pin, BookmarkPlus,
} from "lucide-react";
import {
  type TenderPipelineItem,
  type TenderPipelineStatus,
  TENDER_STATUS_LABELS,
  isTenderOpenForOffers,
  daysUntilTenderDeadline,
  jobDraftFromTender,
  labelTenderState,
} from "@/lib/tenders-bzp";
import { TenderDetailPanel } from "@/app/TenderDetailPanel";
import { TendersLegend } from "@/app/TendersLegend";
import { TenderCompanyProfilePanel } from "@/app/TenderCompanyProfilePanel";
import { CompanyQualificationProfilePanel } from "@/app/CompanyQualificationProfilePanel";
import { TenderKeywordsPanel } from "@/app/TenderKeywordsPanel";
import { FIT_LABELS } from "@/lib/tenders-bzp-fit";
import { PROFITABILITY_LABELS } from "@/lib/tenders-bzp-swz";
import { tenderListBidLine } from "@/lib/tenders-bid-prep";
import { TendersMapPanel } from "@/app/TendersMapPanel";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import { useTendersContext } from "@/app/tenders/context/TendersContext";
import { getPipelineSessionCacheIfFresh } from "@/lib/tenders-pipeline-session-cache";
import {
  TENDERS_LIST_QUICK_BAR,
  TENDERS_LIST_QUEUE,
  applyFavoritePreset,
  applyListKpiPreset,
  applyListQuickBarPreset,
  applyQueuePreset,
  buildTendersListAiInsight,
  buildTendersListFilterPrefs,
  computeMyQueueCounts,
  createFavoriteFromState,
  detectActiveListKpi,
  detectListQuickBarId,
  isTenderMine,
  isTenderNeedsReactionToday,
  loadTendersListFavorites,
  loadTendersListFilterPrefs,
  matchesQueueFilter,
  saveTendersListFavorites,
  saveTendersListFilterPrefs,
  sortTendersForListDisplay,
  type TendersListKpiId,
  type TendersListQueueId,
  type TendersListQuickBarId,
} from "@/lib/tenders-list-ux";
import type { TenderQuickFilter } from "@/lib/tenders-actions";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pl-PL", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function daysUntil(iso: string | null): number | null {
  return daysUntilTenderDeadline(iso);
}

function quickBarChipClass(active: boolean): string {
  const base = "text-[10px] font-medium px-2 py-0.5 rounded-md border transition-colors";
  return active
    ? `${base} bg-primary/12 text-primary border-primary/30 ring-2 ring-primary/25`
    : `${base} bg-secondary/60 text-foreground/85 border-border hover:bg-secondary`;
}

function queueChipClass(active: boolean, hasItems: boolean): string {
  const base = "text-[10px] font-medium px-2 py-0.5 rounded-md border transition-colors";
  if (active) {
    return `${base} bg-primary/12 text-primary border-primary/30 ring-2 ring-primary/25`;
  }
  if (hasItems) {
    return `${base} bg-amber-500/8 text-amber-800 dark:text-amber-300 border-amber-500/20 hover:bg-amber-500/15`;
  }
  return `${base} bg-secondary/60 text-muted-foreground border-border hover:bg-secondary`;
}

function aiInsightClass(tone: "neutral" | "action" | "positive"): string {
  const base = "flex items-start gap-2 rounded-lg px-3 py-2 text-xs border";
  switch (tone) {
    case "action":
      return `${base} bg-amber-500/10 border-amber-500/25 text-amber-900 dark:text-amber-200`;
    case "positive":
      return `${base} bg-emerald-500/10 border-emerald-500/25 text-emerald-900 dark:text-emerald-200`;
    default:
      return `${base} bg-secondary/60 border-border text-muted-foreground`;
  }
}

function kpiChipClass(active: boolean, tone: "neutral" | "primary" | "amber" | "orange"): string {
  const base = "text-[11px] px-2 py-0.5 rounded-md tabular-nums border transition-colors cursor-pointer hover:opacity-90";
  if (!active) {
    switch (tone) {
      case "primary":
        return `${base} bg-primary/10 text-primary font-medium border-transparent`;
      case "amber":
        return `${base} bg-amber-500/10 text-amber-700 dark:text-amber-400 border-transparent`;
      case "orange":
        return `${base} bg-orange-500/10 text-orange-700 dark:text-orange-400 border-transparent`;
      default:
        return `${base} bg-secondary text-muted-foreground border-transparent`;
    }
  }
  return `${base} bg-primary/15 text-primary font-semibold border-primary/35 ring-2 ring-primary/30`;
}

function actionChipToneClass(tone: string, active: boolean): string {
  const base = "text-[10px] font-medium px-2 py-0.5 rounded-md border transition-colors";
  if (!active) {
    return `${base} bg-secondary/60 text-foreground/85 border-border hover:bg-secondary`;
  }
  switch (tone) {
    case "red":
      return `${base} bg-red-500/12 text-red-700 dark:text-red-400 border-red-500/25 ring-2 ring-primary/35`;
    case "amber":
      return `${base} bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/25 ring-2 ring-primary/35`;
    case "violet":
      return `${base} bg-violet-500/12 text-violet-700 dark:text-violet-400 border-violet-500/25 ring-2 ring-primary/35`;
    default:
      return `${base} bg-blue-500/12 text-blue-700 dark:text-blue-400 border-blue-500/25 ring-2 ring-primary/35`;
  }
}

export function TendersView({
  showTestBadge = false,
  listOnly = false,
  hideModuleHeader = false,
  onCreateJobFromTender,
  onOpenJob,
  athPreviewEnabled = true,
  initialExpandedId = null,
  onExpandedIdChange,
  onItemNavigate,
}: {
  showTestBadge?: boolean;
  /** ETAP 2 — lista bez mapy, profilu i słownika (osobne zakładki). */
  listOnly?: boolean;
  /** Ukryj nagłówek „Przetargi BZP” (moduł 3.0 ma własny). */
  hideModuleHeader?: boolean;
  onCreateJobFromTender?: (draft: ReturnType<typeof jobDraftFromTender>, item: TenderPipelineItem) => string | void;
  onOpenJob?: (jobId: string) => void;
  athPreviewEnabled?: boolean;
  initialExpandedId?: string | null;
  onExpandedIdChange?: (id: string | null) => void;
  /** V4 — klik w wiersz nawiguje do /przetargi/:id zamiast accordionu. */
  onItemNavigate?: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(initialExpandedId);
  const [showLegend, setShowLegend] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [queueFilter, setQueueFilter] = useState<TendersListQueueId | null>(null);
  const [favorites, setFavorites] = useState(() => loadTendersListFavorites());
  const { snapshot, bumpProfileVersion, profileVersion, ownerDecisions } = useTendersContext();
  const pipeline = snapshot.pipeline;
  const r1Hydrated = useRef(false);
  const prefsHydrated = useRef(false);

  const filterState = useMemo(() => ({
    localFilter: pipeline.localFilter,
    quickFilter: pipeline.quickFilter,
    strategicClientFilter: pipeline.strategicClientFilter,
    mineOnly,
    statusFilter: pipeline.statusFilter,
  }), [
    pipeline.localFilter,
    pipeline.quickFilter,
    pipeline.strategicClientFilter,
    mineOnly,
    pipeline.statusFilter,
  ]);

  const activeKpi = useMemo(() => detectActiveListKpi(filterState), [filterState]);
  const activeQuickBar = useMemo(() => detectListQuickBarId(filterState), [filterState]);

  const applyFilterPatch = useCallback((
    patch: ReturnType<typeof applyListQuickBarPreset> & { queueFilter?: TendersListQueueId | null },
  ) => {
    pipeline.setLocalFilter(patch.localFilter);
    pipeline.setQuickFilter(patch.quickFilter);
    pipeline.setStrategicClientFilter(patch.strategicClientFilter);
    pipeline.setStatusFilter(patch.statusFilter);
    setMineOnly(patch.mineOnly);
    if (patch.queueFilter !== undefined) setQueueFilter(patch.queueFilter);
  }, [pipeline]);

  const handleQuickBar = useCallback((id: TendersListQuickBarId) => {
    if (activeQuickBar === id) {
      applyFilterPatch({ ...applyListQuickBarPreset("actionable"), queueFilter: null });
      return;
    }
    applyFilterPatch({ ...applyListQuickBarPreset(id), queueFilter: null });
  }, [activeQuickBar, applyFilterPatch]);

  const handleKpiClick = useCallback((kpi: TendersListKpiId) => {
    if (activeKpi === kpi) {
      applyFilterPatch({ ...applyListQuickBarPreset("actionable"), queueFilter: null });
      return;
    }
    applyFilterPatch({ ...applyListKpiPreset(kpi), queueFilter: null });
  }, [activeKpi, applyFilterPatch]);

  const handleQueueClick = useCallback((id: TendersListQueueId) => {
    if (queueFilter === id) {
      applyFilterPatch({ ...applyListQuickBarPreset("actionable"), queueFilter: null });
      return;
    }
    applyFilterPatch(applyQueuePreset(id));
  }, [queueFilter, applyFilterPatch]);

  const handleApplyFavorite = useCallback((presetId: string) => {
    const preset = favorites.find((f) => f.id === presetId);
    if (!preset) return;
    const p = applyFavoritePreset(preset);
    pipeline.setSearch(p.search);
    pipeline.setLocalFilter(p.localFilter);
    pipeline.setStatusFilter(p.statusFilter);
    pipeline.setQuickFilter(p.quickFilter);
    pipeline.setStrategicClientFilter(p.strategicClientFilter);
    setMineOnly(p.mineOnly);
    setQueueFilter(p.queueFilter);
  }, [favorites, pipeline]);

  const handleSaveFavorite = useCallback(() => {
    const name = window.prompt("Nazwa ulubionego filtra:");
    if (!name?.trim()) return;
    const preset = createFavoriteFromState(name, {
      search: pipeline.search,
      localFilter: pipeline.localFilter,
      statusFilter: pipeline.statusFilter,
      quickFilter: pipeline.quickFilter,
      strategicClientFilter: pipeline.strategicClientFilter,
      mineOnly,
      queueFilter,
    });
    const next = [...favorites, preset].slice(-12);
    setFavorites(next);
    saveTendersListFavorites(next);
  }, [favorites, pipeline, mineOnly, queueFilter]);

  const handleToggleFavoritePin = useCallback((id: string) => {
    const next = favorites.map((f) => (f.id === id ? { ...f, pinned: !f.pinned } : f));
    setFavorites(next);
    saveTendersListFavorites(next);
  }, [favorites]);

  useEffect(() => {
    if (pipeline.loading || prefsHydrated.current) return;
    prefsHydrated.current = true;
    const prefs = loadTendersListFilterPrefs();
    if (!prefs) return;
    pipeline.setSearch(prefs.search);
    pipeline.setLocalFilter(prefs.localFilter);
    pipeline.setStatusFilter(prefs.statusFilter);
    pipeline.setQuickFilter(prefs.quickFilter);
    pipeline.setStrategicClientFilter(prefs.strategicClientFilter);
    setMineOnly(prefs.mineOnly);
    setQueueFilter(prefs.queueFilter ?? null);
  }, [pipeline.loading, pipeline]);

  useEffect(() => {
    if (!prefsHydrated.current || pipeline.loading) return;
    saveTendersListFilterPrefs(buildTendersListFilterPrefs({
      search: pipeline.search,
      localFilter: pipeline.localFilter,
      statusFilter: pipeline.statusFilter,
      quickFilter: pipeline.quickFilter,
      strategicClientFilter: pipeline.strategicClientFilter,
      mineOnly,
      queueFilter,
    }));
  }, [
    pipeline.search,
    pipeline.localFilter,
    pipeline.statusFilter,
    pipeline.quickFilter,
    pipeline.strategicClientFilter,
    mineOnly,
    queueFilter,
    pipeline.loading,
  ]);

  const queueCounts = useMemo(
    () => computeMyQueueCounts(pipeline.items, ownerDecisions.store),
    [pipeline.items, ownerDecisions.store],
  );

  const aiInsight = useMemo(
    () => buildTendersListAiInsight(pipeline.items, ownerDecisions.store, queueCounts),
    [pipeline.items, ownerDecisions.store, queueCounts],
  );

  const pinnedFavorites = useMemo(
    () => favorites.filter((f) => f.pinned),
    [favorites],
  );

  const todayItems = useMemo(
    () => sortTendersForListDisplay(
      pipeline.items.filter((i) => {
        if (!isTenderNeedsReactionToday(i)) return false;
        if (mineOnly && !isTenderMine(i, ownerDecisions.store)) return false;
        return true;
      }),
    ),
    [pipeline.items, mineOnly, ownerDecisions.store],
  );

  const displayList = useMemo(() => {
    let list = pipeline.filtered;
    if (mineOnly) {
      list = list.filter((i) => isTenderMine(i, ownerDecisions.store));
    }
    if (queueFilter) {
      list = list.filter((i) => matchesQueueFilter(i, queueFilter, ownerDecisions.store));
    }
    const todayIds = new Set(todayItems.map((i) => i.id));
    list = list.filter((i) => !todayIds.has(i.id));
    return sortTendersForListDisplay(list);
  }, [pipeline.filtered, mineOnly, ownerDecisions.store, todayItems, queueFilter]);

  const secondaryActionChips = useMemo(() => {
    const inQuickBar = new Set<TenderQuickFilter>(["deadline_7d", "no_kosztorys"]);
    return pipeline.actionChips.filter((c) => !inQuickBar.has(c.id));
  }, [pipeline.actionChips]);

  const secondaryStrategicChips = useMemo(
    () => pipeline.strategicClientFilters.filter((c) => c.id !== "wm" && c.id !== "zzk"),
    [pipeline.strategicClientFilters],
  );

  /** ETAP 8.0A / 2.1C — Classic mount; pomiń gdy sesyjny cache świeży (PRO już załadował). */
  useEffect(() => {
    if (r1Hydrated.current) return;
    r1Hydrated.current = true;
    if (getPipelineSessionCacheIfFresh()) return;
    void pipeline.reloadFromStorage();
  }, [pipeline.reloadFromStorage]);

  useEffect(() => {
    if (initialExpandedId) {
      setExpandedId(initialExpandedId);
      onExpandedIdChange?.(initialExpandedId);
    }
  }, [initialExpandedId, onExpandedIdChange]);

  const setExpanded = (id: string | null) => {
    setExpandedId(id);
    onExpandedIdChange?.(id);
  };

  const handleRemoveItem = async (id: string) => {
    const removed = await pipeline.removeItem(id);
    if (removed) setExpanded(expandedId === id ? null : expandedId);
  };

  const handleBulkRemove = async () => {
    await pipeline.bulkRemove();
    setExpanded(null);
  };

  const renderTenderItem = (item: TenderPipelineItem, todayHighlight = false) => {
    const days = daysUntil(item.submittingOffersDate);
    const offerOpen = isTenderOpenForOffers(item.submittingOffersDate);
    const urgent = offerOpen && days !== null && days >= 0 && days <= 7;
    const expanded = !onItemNavigate && expandedId === item.id;
    const bidLine = tenderListBidLine(item);
    const wadiumBlocked = computeWadiumInfo(
      item,
      item.swzAnalysis,
      loadCompanyProfileLocal().maxWadiumPln,
    ).blocked;
    return (
      <article
        key={item.id}
        className={`rounded-xl border bg-card overflow-hidden ${
          todayHighlight
            ? "border-amber-500/40 ring-1 ring-amber-500/15"
            : item.isWroclaw ? "border-primary/30" : "border-border"
        }`}
      >
        <button
          type="button"
          className="w-full text-left px-4 py-2.5 hover:bg-secondary/40 transition-colors flex gap-2"
          onClick={() => {
            if (onItemNavigate) {
              if (item.status === "new") {
                pipeline.updateItem(item.id, { status: "seen" });
              }
              onItemNavigate(item.id);
              return;
            }
            const opening = expandedId !== item.id;
            setExpanded(opening ? item.id : null);
            if (opening && item.status === "new") {
              pipeline.updateItem(item.id, { status: "seen" });
            }
          }}
        >
          {pipeline.bulkMode && (
            <span
              role="checkbox"
              aria-checked={pipeline.selectedIds.has(item.id)}
              className="shrink-0 pt-0.5"
              onClick={(e) => { e.stopPropagation(); pipeline.toggleSelect(item.id); }}
            >
              {pipeline.selectedIds.has(item.id)
                ? <CheckSquare size={16} className="text-primary" />
                : <Square size={16} className="text-muted-foreground" />}
            </span>
          )}
          <div className="flex flex-wrap items-start justify-between gap-2 flex-1 min-w-0">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {todayHighlight && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">
                    Dzisiaj
                  </span>
                )}
                {item.isWroclaw && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">Wrocław</span>
                )}
                {item.priorityBuyerLabel && (
                  <span className="text-[10px] font-semibold text-orange-700 dark:text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">{item.priorityBuyerLabel}</span>
                )}
                <span className="text-[10px] text-muted-foreground font-mono">{item.bzpNumber}</span>
                {item.relevanceScore >= 20 && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded">Trafność {item.relevanceScore}</span>
                )}
                {item.swzAnalysis && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.swzAnalysis.profitabilityHint === "good" ? "bg-emerald-500/10 text-emerald-600" : item.swzAnalysis.profitabilityHint === "risky" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"}`}>
                    {PROFITABILITY_LABELS[item.swzAnalysis.profitabilityHint]}
                  </span>
                )}
                {item.tenderFit && item.tenderFit.fitLabel !== "unknown" && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    item.tenderFit.fitLabel === "strong" ? "bg-emerald-500/10 text-emerald-600" :
                    item.tenderFit.fitLabel === "possible" ? "bg-blue-500/10 text-blue-600" :
                    "bg-red-500/10 text-red-600"
                  }`}>
                    {FIT_LABELS[item.tenderFit.fitLabel]}
                    {item.tenderFit.winChancePct != null && ` · ${item.tenderFit.winChancePct}%`}
                  </span>
                )}
                {item.linkedJobId && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded">Robota</span>
                )}
                {item.tenderState && (
                  <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">{labelTenderState(item.tenderState)}</span>
                )}
                {wadiumBlocked && (
                  <span className="text-[10px] font-semibold bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded">Wadium blokada</span>
                )}
                {item.awardResult && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.awardResult.isUs ? "bg-emerald-500/10 text-emerald-600" : "bg-secondary text-muted-foreground"}`}>
                    {item.awardResult.isUs ? "Wygraliśmy" : "Wynik BZP"}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold leading-snug">{item.title}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                <Building2 size={12} />
                {item.organizationName}
                <span>·</span>
                <MapPin size={12} />
                {item.organizationCity || "—"}
              </p>
              {bidLine && (
                <p className="text-[11px] font-medium text-foreground/85 tabular-nums">
                  {bidLine}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                item.status === "new" ? "bg-blue-500/15 text-blue-600" :
                item.status === "interested" || item.status === "preparing" ? "bg-violet-500/15 text-violet-600" :
                item.status === "won" ? "bg-emerald-500/15 text-emerald-600" :
                item.status === "ignored" || item.status === "lost" ? "bg-muted text-muted-foreground" :
                "bg-secondary text-foreground"
              }`}>
                {TENDER_STATUS_LABELS[item.status]}
              </span>
              {item.submittingOffersDate && (
                <span className={`text-[10px] flex items-center gap-1 ${
                  !offerOpen ? "text-muted-foreground line-through" :
                  urgent ? "text-amber-600 font-semibold" : "text-muted-foreground"
                }`}>
                  <Calendar size={11} />
                  {offerOpen ? "Oferty do:" : "Termin minął:"} {fmtDate(item.submittingOffersDate)}
                  {offerOpen && days !== null && days >= 0 && ` (${days} d.)`}
                </span>
              )}
            </div>
          </div>
        </button>

        {expanded && !onItemNavigate && (
          <TenderDetailPanel
            item={item}
            allItems={pipeline.items}
            onUpdate={(patch) => pipeline.updateItem(item.id, patch)}
            onRemove={() => void handleRemoveItem(item.id)}
            athPreviewEnabled={athPreviewEnabled}
            profileVersion={profileVersion}
            onOpenJob={onOpenJob}
            onCreateJob={onCreateJobFromTender
              ? (t) => onCreateJobFromTender(jobDraftFromTender(t), t)
              : undefined}
          />
        )}
      </article>
    );
  };

  if (pipeline.loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Ładowanie pipeline przetargów…
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {!hideModuleHeader && (
        <div className="sticky top-0 z-20 px-4 sm:px-6 py-3 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Scale size={18} className="text-primary" />
                <h1 className="text-lg font-semibold">Przetargi BZP</h1>
                {showTestBadge && (
                  <span className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">Super Admin · test</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                Wrocław — remonty i wykończenia (pomieszczenia, podłogi, sufity, malowanie). Hale, uniwerki, lokale, mieszkania.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void pipeline.refreshFromBzp()}
              disabled={pipeline.syncing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 min-h-[44px]"
            >
              <RefreshCw size={16} className={pipeline.syncing || pipeline.autoSyncing ? "animate-spin" : ""} />
              {pipeline.syncing ? "Pobieranie…" : pipeline.autoSyncing ? "Auto-sync…" : "Odśwież z BZP"}
            </button>
          </div>
        </div>
        )}

        <div className="px-4 sm:px-6 py-2 space-y-2">
        {/* Sticky toolbar — wyszukiwarka, status, filtry, odśwież */}
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90 border-b border-border space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-3xl">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={pipeline.search}
                onChange={(e) => pipeline.setSearch(e.target.value)}
                placeholder="Szukaj tytułu, zamawiającego, miasta, numeru BZP…"
                className="w-full bg-secondary rounded-lg pl-8 pr-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none"
              />
            </div>
            <select
              value={pipeline.statusFilter}
              onChange={(e) => pipeline.setStatusFilter(e.target.value as TenderPipelineStatus | "all")}
              className="w-full sm:w-40 bg-secondary rounded-lg px-2.5 py-2 text-xs border border-border focus:border-primary focus:outline-none"
              aria-label="Filtr statusu"
            >
              <option value="all">Wszystkie statusy</option>
              {(Object.keys(TENDER_STATUS_LABELS) as TenderPipelineStatus[]).map((s) => (
                <option key={s} value={s}>{TENDER_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void pipeline.refreshFromBzp()}
              disabled={pipeline.syncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-60 min-h-[36px] shrink-0"
              title="Odśwież z BZP"
            >
              <RefreshCw size={14} className={pipeline.syncing || pipeline.autoSyncing ? "animate-spin" : ""} />
              {pipeline.syncing ? "Pobieranie…" : "Odśwież"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1 items-center max-w-4xl">
            {TENDERS_LIST_QUICK_BAR.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleQuickBar(id)}
                className={quickBarChipClass(activeQuickBar === id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Komunikat AI (heurystyka UX, bez backendu) */}
        <div className={aiInsightClass(aiInsight.tone)} role="status">
          <Sparkles size={14} className="shrink-0 mt-0.5 opacity-80" />
          <span>{aiInsight.text}</span>
        </div>

        {/* KPI — klikalne filtry operacyjne */}
        <div className="flex flex-wrap items-center gap-1.5 max-w-3xl">
          <button
            type="button"
            onClick={() => handleKpiClick("active")}
            className={kpiChipClass(activeKpi === "active", "neutral")}
          >
            {pipeline.stats.active} aktywnych
          </button>
          <button
            type="button"
            onClick={() => handleKpiClick("actionable")}
            className={kpiChipClass(activeKpi === "actionable", "primary")}
          >
            ⚠ {pipeline.stats.actionable} do zgłoszenia
          </button>
          <button
            type="button"
            onClick={() => handleKpiClick("urgent")}
            className={kpiChipClass(activeKpi === "urgent", pipeline.stats.urgent > 0 ? "amber" : "neutral")}
          >
            ⏰ {pipeline.stats.urgent} kończy się ≤7 dni
          </button>
          <button
            type="button"
            onClick={() => handleKpiClick("priority")}
            className={kpiChipClass(activeKpi === "priority", "orange")}
          >
            ⭐ {pipeline.stats.priority} kluczowych
          </button>
        </div>

        {/* Moja kolejka — workspace właściciela */}
        <section className="space-y-1.5 max-w-4xl" aria-label="Moja kolejka">
          <h2 className="text-xs font-semibold text-foreground">Moja kolejka</h2>
          <div className="flex flex-wrap gap-1 items-center">
            {TENDERS_LIST_QUEUE.map(({ id, label }) => {
              const count = queueCounts[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleQueueClick(id)}
                  className={queueChipClass(queueFilter === id, count > 0)}
                >
                  {label}{count > 0 ? ` (${count})` : ""}
                </button>
              );
            })}
            {queueFilter && (
              <button
                type="button"
                onClick={() => applyFilterPatch({ ...applyListQuickBarPreset("actionable"), queueFilter: null })}
                className="text-[10px] text-muted-foreground hover:text-foreground underline px-1"
              >
                Wyczyść kolejkę
              </button>
            )}
          </div>
        </section>

        {/* Ulubione filtry — presety lokalne */}
        <section className="space-y-1.5 max-w-4xl" aria-label="Ulubione filtry">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xs font-semibold text-foreground">Ulubione filtry</h2>
            <button
              type="button"
              onClick={handleSaveFavorite}
              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              <BookmarkPlus size={12} />
              Zapisz bieżące
            </button>
          </div>
          {favorites.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">Przypnij własne presety — zapis lokalny w przeglądarce.</p>
          ) : (
            <div className="flex flex-wrap gap-1 items-center">
              {(pinnedFavorites.length > 0 ? pinnedFavorites : favorites).map((fav) => (
                <span key={fav.id} className="inline-flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleApplyFavorite(fav.id)}
                    className={quickBarChipClass(false)}
                    title={fav.name}
                  >
                    {fav.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleFavoritePin(fav.id)}
                    className={`p-0.5 rounded ${fav.pinned ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    title={fav.pinned ? "Odepnij" : "Przypnij"}
                    aria-label={fav.pinned ? "Odepnij preset" : "Przypnij preset"}
                  >
                    <Pin size={11} className={fav.pinned ? "fill-current" : ""} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Filtry dodatkowe (poza paskiem szybkich) */}
        {(secondaryActionChips.length > 0 || secondaryStrategicChips.some((c) => pipeline.strategicClientCounts[c.id] > 0)) && (
          <div className="flex flex-wrap gap-1 items-center">
            {secondaryActionChips.map((chip) => {
              const active = pipeline.quickFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => pipeline.setQuickFilter(active ? null : chip.id)}
                  className={actionChipToneClass(chip.tone, active)}
                >
                  {chip.label}{chip.count > 0 ? ` (${chip.count})` : ""}
                </button>
              );
            })}
            {secondaryStrategicChips.map((chip) => {
              const count = pipeline.strategicClientCounts[chip.id];
              if (count === 0) return null;
              const active = pipeline.strategicClientFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  title={chip.label}
                  onClick={() => pipeline.setStrategicClientFilter(active ? null : chip.id)}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-md border transition-colors ${
                    active
                      ? "bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30 ring-2 ring-orange-500/25"
                      : "bg-secondary/60 text-foreground/85 border-border hover:bg-secondary"
                  }`}
                >
                  {chip.shortLabel} ({count})
                </button>
              );
            })}
            {(pipeline.quickFilter || pipeline.strategicClientFilter || mineOnly || queueFilter) && (
              <button
                type="button"
                onClick={() => {
                  pipeline.setQuickFilter(null);
                  pipeline.setStrategicClientFilter(null);
                  setMineOnly(false);
                  setQueueFilter(null);
                  pipeline.setLocalFilter("actionable");
                }}
                className="text-[10px] text-muted-foreground hover:text-foreground underline px-1"
              >
                Wyczyść
              </button>
            )}
          </div>
        )}

        {/* Pasek narzędzi — analityka drugorzędna */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowPipeline((v) => !v)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/80 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary"
            aria-expanded={showPipeline}
          >
            <ChevronDown size={12} className={`shrink-0 transition-transform ${showPipeline ? "rotate-180" : ""}`} />
            Pipeline
          </button>
          <button
            type="button"
            onClick={() => setShowLegend((v) => !v)}
            className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-[11px] ${
              showLegend ? "bg-primary/15 text-primary" : "bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
            title="Legenda trafności i statusów"
            aria-label="Legenda trafności i statusów"
            aria-expanded={showLegend}
          >
            <HelpCircle size={14} />
          </button>
          <button
            type="button"
            onClick={() => setShowAdvancedPanel((v) => !v)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/80 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary"
            aria-expanded={showAdvancedPanel}
          >
            <SlidersHorizontal size={12} className="shrink-0" />
            Filtry zaawansowane
            <ChevronDown size={12} className={`shrink-0 transition-transform ${showAdvancedPanel ? "rotate-180" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => pipeline.toggleBulkMode()}
            className={`inline-flex items-center justify-center w-7 h-7 rounded-md ${
              pipeline.bulkMode ? "bg-violet-500/15 text-violet-700" : "bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
            title={pipeline.bulkMode ? "Wyłącz tryb masowy" : "Zaznacz wiele"}
            aria-label={pipeline.bulkMode ? "Wyłącz tryb masowy" : "Zaznacz wiele"}
          >
            {pipeline.bulkMode ? <CheckSquare size={14} /> : <Square size={14} />}
          </button>
          <button
            type="button"
            onClick={() => pipeline.exportCsv()}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary"
            title="Eksport CSV (aktualna lista)"
            aria-label="Eksport CSV"
          >
            <Download size={14} />
          </button>
        </div>

        {showPipeline && (
          <div className="rounded-lg bg-secondary/40 px-2.5 py-2 max-w-3xl">
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
              <span>Nowe: <strong className="text-foreground">{pipeline.funnel.new}</strong></span>
              <span>Obejrzane: <strong className="text-foreground">{pipeline.funnel.seen}</strong></span>
              <span>Interesuje: <strong className="text-violet-600">{pipeline.funnel.interested}</strong></span>
              <span>Oferta: <strong className="text-foreground">{pipeline.funnel.preparing}</strong></span>
              <span>Złożone: <strong className="text-foreground">{pipeline.funnel.submitted}</strong></span>
              <span>Wygrane: <strong className="text-emerald-600">{pipeline.funnel.won}</strong></span>
              <span>Przegrane: <strong className="text-foreground">{pipeline.funnel.lost}</strong></span>
              {pipeline.funnel.winRate != null && (
                <span>Skuteczność: <strong className="text-primary">{pipeline.funnel.winRate}%</strong></span>
              )}
            </div>
          </div>
        )}

        {showLegend && (
          <div className="max-w-3xl">
            <TendersLegend compact />
          </div>
        )}

        {showAdvancedPanel && (
          <div className="rounded-lg border border-border bg-secondary/30 px-2.5 py-2 space-y-2 max-w-3xl">
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={pipeline.localFilter}
                onChange={(e) => pipeline.setLocalFilter(e.target.value as typeof pipeline.localFilter)}
                className="flex-1 bg-secondary rounded-lg px-2.5 py-1.5 text-xs border border-border focus:border-primary focus:outline-none"
              >
                <option value="actionable">Do zgłoszenia (Wrocław · remont budynków)</option>
                <option value="active">Wszystkie aktywne</option>
                <option value="priority">Kluczowi zamawiający</option>
                <option value="wroclaw">Tylko Wrocław</option>
                <option value="high">Wysoka trafność</option>
                <option value="archive">Archiwum (termin minął)</option>
                <option value="all">Pełna lista</option>
              </select>
              <select
                value={pipeline.statusFilter}
                onChange={(e) => pipeline.setStatusFilter(e.target.value as TenderPipelineStatus | "all")}
                className="sm:w-44 bg-secondary rounded-lg px-2.5 py-1.5 text-xs border border-border focus:border-primary focus:outline-none"
              >
                <option value="all">Wszystkie statusy</option>
                {(Object.keys(TENDER_STATUS_LABELS) as TenderPipelineStatus[]).map((s) => (
                  <option key={s} value={s}>{TENDER_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              Wyświetlono <strong className="text-foreground">{displayList.length + todayItems.length}</strong>
              {" "}
              {(displayList.length + todayItems.length) === 1 ? "przetarg" : (displayList.length + todayItems.length) < 5 ? "przetargi" : "przetargów"}
              {pipeline.items.length !== displayList.length + todayItems.length && (
                <> z <strong className="text-foreground">{pipeline.items.length}</strong> w pipeline</>
              )}
            </p>
          </div>
        )}

        {!showAdvancedPanel && (
          <p className="text-[10px] text-muted-foreground tabular-nums -mt-0.5">
            Wyświetlono <strong className="text-foreground">{displayList.length + todayItems.length}</strong>
            {" "}
            {(displayList.length + todayItems.length) === 1 ? "przetarg" : (displayList.length + todayItems.length) < 5 ? "przetargi" : "przetargów"}
            {pipeline.items.length !== displayList.length + todayItems.length && (
              <> z <strong className="text-foreground">{pipeline.items.length}</strong></>
            )}
          </p>
        )}

        {!listOnly && (
          <>
            <TenderCompanyProfilePanel onSaved={() => bumpProfileVersion()} />
            <CompanyQualificationProfilePanel onSaved={() => bumpProfileVersion()} />
            <TenderKeywordsPanel onSaved={() => void pipeline.resyncKeywords()} />

            <TendersMapPanel
              items={pipeline.items}
              selectedId={expandedId}
              onSelect={(id) => setExpanded(id)}
            />
          </>
        )}

        {pipeline.bulkMode && pipeline.selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <span className="text-xs font-medium">{pipeline.selectedIds.size} zaznaczonych</span>
            <select
              value={pipeline.bulkStatus}
              onChange={(e) => pipeline.setBulkStatus(e.target.value as TenderPipelineStatus)}
              className="bg-secondary rounded-lg px-2 py-1.5 text-xs border border-border"
            >
              {(Object.keys(TENDER_STATUS_LABELS) as TenderPipelineStatus[]).map((s) => (
                <option key={s} value={s}>{TENDER_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <button type="button" onClick={pipeline.applyBulkStatus} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
              Ustaw status
            </button>
            <button type="button" onClick={() => void handleBulkRemove()} className="px-3 py-1.5 rounded-lg bg-red-600/90 text-white text-xs font-medium flex items-center gap-1">
              <Trash2 size={12} /> Usuń
            </button>
            <button type="button" onClick={pipeline.clearSelection} className="text-xs text-muted-foreground hover:underline">
              Wyczyść zaznaczenie
            </button>
          </div>
        )}

        {pipeline.error && (
          <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {pipeline.error}
          </div>
        )}

        {pipeline.autoAwardRunning && (
          <p className="text-[10px] text-muted-foreground">Sprawdzam wyniki zakończonych postępowań…</p>
        )}
        </div>

        <div className="px-4 sm:px-6 pb-3 space-y-2">
        {todayItems.length > 0 && (
          <section className="space-y-1.5">
            <h2 className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              Dzisiaj
              <span className="text-[10px] font-normal text-muted-foreground">
                — wymaga reakcji ({todayItems.length})
              </span>
            </h2>
            {todayItems.map((item) => renderTenderItem(item, true))}
          </section>
        )}

        {displayList.length === 0 && todayItems.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Filter size={32} className="mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {pipeline.localFilter === "actionable" && !mineOnly
                ? "Brak aktywnych przetargów do rozważenia — kliknij „Odśwież z BZP”"
                : "Brak przetargów dla wybranych filtrów"}
            </p>
          </div>
        ) : displayList.length > 0 && (
          <>
            {todayItems.length > 0 && (
              <h2 className="text-xs font-semibold text-muted-foreground pt-1">Lista</h2>
            )}
            {displayList.map((item) => renderTenderItem(item))}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
