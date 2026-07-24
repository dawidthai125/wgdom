import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { loadAppSettingsLocal } from "@/lib/app-settings";
import {
  flushTenderPipelinePersist,
  installTenderPipelinePersistFlushListeners,
  isDebouncePersistActive,
  persistTenderPipelineImmediate,
  scheduleTenderPipelinePersist,
  syncTenderPipelineLocalOnly,
} from "@/lib/tender-pipeline/tender-pipeline-persist-coalesce";
import type { TenderItemUpdateOpts } from "@/lib/tender-pipeline/tender-item-persist";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import {
  type TenderPipelineItem,
  type TenderPipelineStatus,
  fetchBzpTendersFromServer,
  loadTendersPipeline,
  saveTendersPipeline,
  mergeTenderPipeline,
  mapBzpToPipelineItem,
  isTenderOpenForOffers,
  isActionableTender,
  daysUntilTenderDeadline,
  pruneExpiredUntouched,
  sortTendersByUrgency,
  syncTenderKeywordsAndRescore,
  rescorePipelineWithKeywords,
  shouldAutoRefreshBzp,
  markBzpSyncedAt,
  computePipelineFunnel,
  removeTenderFromPipeline,
} from "@/lib/tenders-bzp";
import { loadCustomKeywordsLocal } from "@/lib/tenders-bzp-learn";
import {
  getPipelineCacheGeneration,
  getPipelineSessionCacheIfFresh,
  invalidatePipelineSessionCache,
  keywordsEpochFromCustom,
  markPipelineAutoAwardCompleted,
  patchPipelineSessionCache,
  setPipelineSessionCache,
  shouldSkipAutoAwardPass,
} from "@/lib/tenders-pipeline-session-cache";
import { exportTendersPipelineCsv, getDeletedTenderIds } from "@/lib/tenders-sync";
import { rescanPipelineDocumentChanges, applyBzpMergeChangeMonitor } from "@/lib/tender-change-monitor";
import {
  computeActionChips,
  autoFetchAwardResults,
  type TenderQuickFilter,
} from "@/lib/tenders-actions";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import {
  countStrategicClientFilters,
  STRATEGIC_CLIENT_FILTERS,
  type StrategicClientFilterId,
} from "@/lib/tenders-strategic-client-filters";
import { filterTendersListPipelineItems } from "@/lib/tenders-list-ux";

export type TenderPipelineLocalFilter =
  | "actionable"
  | "active"
  | "priority"
  | "wroclaw"
  | "high"
  | "archive"
  | "all";

export type UseTendersPipelineOptions = {
  /** Inkrementowany po zapisie profilu firmy — przelicza filtry i chipy akcji. */
  profileVersion?: number;
};

export function useTendersPipeline(options: UseTendersPipelineOptions = {}) {
  const profileVersion = options.profileVersion ?? 0;

  const [items, setItems] = useState<TenderPipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [localFilter, setLocalFilter] = useState<TenderPipelineLocalFilter>("actionable");
  const [statusFilter, setStatusFilter] = useState<TenderPipelineStatus | "all">("all");
  const [error, setError] = useState("");
  const [autoSyncing, setAutoSyncing] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<TenderPipelineStatus>("ignored");
  const [quickFilter, setQuickFilter] = useState<TenderQuickFilter | null>(null);
  const [strategicClientFilter, setStrategicClientFilter] = useState<StrategicClientFilterId | null>(null);
  const [autoAwardRunning, setAutoAwardRunning] = useState(false);

  const bzpSettings = useMemo(() => loadAppSettingsLocal(), []);

  const persist = useCallback(async (next: TenderPipelineItem[]) => {
    setItems(next);
    try {
      await persistTenderPipelineImmediate(next);
    } catch {
      toast.error("Nie udało się zapisać pipeline do chmury");
    }
  }, []);

  useEffect(() => {
    const releaseListeners = installTenderPipelinePersistFlushListeners();
    return () => {
      void flushTenderPipelinePersist("unmount");
      releaseListeners();
    };
  }, []);

  const runBzpMerge = useCallback(async (baseItems: TenderPipelineItem[], silent = false) => {
    const s = loadAppSettingsLocal();
    const raw = await fetchBzpTendersFromServer({
      days: s.bzpScanDays,
      pages: s.bzpScanPages,
      orgPages: s.bzpScanOrgPages,
      province: "PL02",
    });
    const deleted = new Set(getDeletedTenderIds());
    const mapped = raw
      .map((n) => {
        const prev = baseItems.find((i) => i.id === String(n.objectId || n.moIdentifier || n.bzpNumber));
        return mapBzpToPipelineItem(n, prev);
      })
      .filter((m) => !deleted.has(m.id));
    const mergedRaw = pruneExpiredUntouched(mergeTenderPipeline(baseItems, mapped));
    const merged = mergedRaw.map((item) => {
      const prev = baseItems.find((p) => p.id === item.id);
      if (!prev) return item;
      const patch = applyBzpMergeChangeMonitor(prev, item);
      return patch ? { ...item, ...patch } : item;
    });
    const { items: withAwards, updated: awardsUpdated } = await autoFetchAwardResults(merged, 5);
    const { items: withChanges, newEventCount } = await rescanPipelineDocumentChanges(withAwards, 3);
    await persist(withChanges);
    markPipelineAutoAwardCompleted();
    markBzpSyncedAt();
    if (!silent) {
      const actionableN = withChanges.filter((m) => isActionableTender(m)).length;
      const priorityN = withChanges.filter(
        (m) => isTenderOpenForOffers(m.submittingOffersDate) && m.priorityBuyerId,
      ).length;
      const awardNote = awardsUpdated > 0 ? ` · ${awardsUpdated} wynik(ów) BZP` : "";
      const changeNote = newEventCount > 0 ? ` · ${newEventCount} zmian(y) dokumentacji` : "";
      toast.success(
        `BZP: ${actionableN} aktywnych do rozważenia (w tym ${priorityN} od kluczowych zamawiających)${awardNote}${changeNote}`,
      );
    }
    return withChanges;
  }, [persist]);

  useEffect(() => {
    let cancelled = false;
    const genAtStart = getPipelineCacheGeneration();

    const runBackgroundTasks = async (loaded: TenderPipelineItem[]) => {
      if (cancelled || genAtStart !== getPipelineCacheGeneration()) return;

      if (!shouldSkipAutoAwardPass()) {
        setAutoAwardRunning(true);
        try {
          const { items: withAwards, updated } = await autoFetchAwardResults(loaded, 5);
          if (cancelled || genAtStart !== getPipelineCacheGeneration()) return;
          if (updated > 0) {
            await persistTenderPipelineImmediate(withAwards);
            if (!cancelled) setItems(withAwards);
          }
          markPipelineAutoAwardCompleted();
        } catch { /* ciche auto-wyniki */ }
        finally {
          if (!cancelled) setAutoAwardRunning(false);
        }
      }

      if (cancelled || genAtStart !== getPipelineCacheGeneration()) return;

      if (shouldAutoRefreshBzp(bzpSettings.bzpAutoRefreshHours)) {
        setAutoSyncing(true);
        try {
          await runBzpMerge(loaded, true);
        } catch {
          /* ciche auto-odświeżenie */
        } finally {
          if (!cancelled) setAutoSyncing(false);
        }
      }
    };

    (async () => {
      try {
        const cached = getPipelineSessionCacheIfFresh();
        if (cached) {
          let loaded = cached.items;
          const localKw = loadCustomKeywordsLocal();
          const epoch = keywordsEpochFromCustom(localKw);
          if (cached.meta.keywordsEpoch !== epoch) {
            const { items: rescored, changed } = rescorePipelineWithKeywords(loaded, localKw);
            if (changed) {
              loaded = rescored;
              patchPipelineSessionCache(loaded, {
                customKeywords: localKw,
                partialMeta: { keywordsEpoch: epoch },
              });
              if (!cancelled && genAtStart === getPipelineCacheGeneration()) {
                void persistTenderPipelineImmediate(rescored).catch(() => {});
              }
            }
          }
          if (cancelled || genAtStart !== getPipelineCacheGeneration()) return;
          setItems(loaded);
          void runBackgroundTasks(loaded);
          return;
        }

        setLoading(true);
        let loaded = await loadTendersPipeline();
        const { items: rescored, changed, custom } = await syncTenderKeywordsAndRescore(loaded);
        if (changed) {
          loaded = rescored;
        }
        if (cancelled || genAtStart !== getPipelineCacheGeneration()) return;
        setItems(loaded);
        setPipelineSessionCache({
          items: loaded,
          customKeywords: custom,
          cloudHydrated: true,
          autoAwardCompletedAt: null,
        });

        if (changed) {
          void persistTenderPipelineImmediate(rescored).catch(() => {});
        }

        void runBackgroundTasks(loaded);
      } catch {
        if (!cancelled) {
          setItems([]);
          invalidatePipelineSessionCache("mount-error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [runBzpMerge, bzpSettings.bzpAutoRefreshHours]);

  const refreshFromBzp = useCallback(async () => {
    invalidatePipelineSessionCache("refresh-bzp");
    setSyncing(true);
    setError("");
    try {
      await runBzpMerge(items, false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Błąd pobierania przetargów";
      setError(msg);
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  }, [items, runBzpMerge]);

  /**
   * P3-AUDIT-001-FIX-A — functional update; bez stale closure na items.
   * TENDERS-SYNC-STORM-P0 — opts.persist: local = LS only; cloud = coalesce (force);
   * brak opts = dotychczasowe zachowanie (debounce flag / immediate save).
   */
  const updateItem = useCallback((
    id: string,
    patch: Partial<TenderPipelineItem>,
    opts?: TenderItemUpdateOpts,
  ) => {
    setItems((prev) => {
      const next = prev.map((i) =>
        i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i,
      );
      const mode = opts?.persist;
      if (mode === "local") {
        syncTenderPipelineLocalOnly(next);
      } else if (mode === "cloud") {
        // Heavy final: always coalesce — even when pipelinePerfDebouncePersist is OFF.
        scheduleTenderPipelinePersist(next, { force: true });
      } else if (isDebouncePersistActive()) {
        scheduleTenderPipelinePersist(next);
      } else {
        void saveTendersPipeline(next).catch(() => {
          toast.error("Nie udało się zapisać pipeline do chmury");
        });
      }
      return next;
    });
  }, []);

  const removeItem = useCallback(async (id: string) => {
    if (!window.confirm("Usunąć przetarg z listy pipeline? (nie wróci przy sync BZP)")) return false;
    try {
      const next = await removeTenderFromPipeline(items, id);
      setItems(next);
      setSelectedIds((s) => { const n = new Set(s); n.delete(id); return n; });
      toast.success("Usunięto z pipeline");
      return true;
    } catch {
      toast.error("Nie udało się usunąć");
      return false;
    }
  }, [items]);

  const resyncKeywords = useCallback(async () => {
    const { items: rescored, changed } = await syncTenderKeywordsAndRescore(items);
    if (changed) await persist(rescored);
  }, [items, persist]);

  /** ETAP 8.0A / 2.1C — Classic mount; cache hit = zero fetch. */
  const reloadFromStorage = useCallback(async () => {
    const cached = getPipelineSessionCacheIfFresh();
    if (cached) {
      setItems(cached.items);
      return;
    }
    try {
      let loaded = await loadTendersPipeline();
      const { items: rescored, changed, custom } = await syncTenderKeywordsAndRescore(loaded);
      if (changed) {
        await persistTenderPipelineImmediate(rescored);
        loaded = rescored;
      }
      setPipelineSessionCache({
        items: loaded,
        customKeywords: custom,
        cloudHydrated: true,
        autoAwardCompletedAt: shouldSkipAutoAwardPass() ? Date.now() : null,
      });
      setItems(loaded);
    } catch {
      /* zostaw bieżące items */
    }
  }, []);

  const actionChips = useMemo(() => computeActionChips(items), [items, profileVersion]);

  const filtered = useMemo(() => {
    const list = filterTendersListPipelineItems(items, {
      search,
      localFilter,
      statusFilter,
      quickFilter,
      strategicClientFilter,
    }, {
      maxConcurrentProjects: loadCompanyProfileLocal().maxConcurrentProjects,
    });
    return sortTendersByUrgency(list);
  }, [items, search, localFilter, statusFilter, quickFilter, strategicClientFilter, profileVersion]);

  const strategicClientCounts = useMemo(
    () => countStrategicClientFilters(items),
    [items],
  );

  const exportCsv = useCallback(() => {
    const blob = new Blob([exportTendersPipelineCsv(filtered)], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `przetargi-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Eksport: ${filtered.length} wierszy`);
  }, [filtered]);

  const applyBulkStatus = useCallback(() => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const next = items.map((i) =>
      selectedIds.has(i.id)
        ? { ...i, status: bulkStatus, updatedAt: new Date().toISOString() }
        : i,
    );
    void persist(next);
    setSelectedIds(new Set());
    toast.success(`Zmieniono status ${count} przetargów`);
  }, [items, selectedIds, bulkStatus, persist]);

  const bulkRemove = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Usunąć ${selectedIds.size} przetarg(ów) z pipeline?`)) return;
    let next = items;
    for (const id of selectedIds) {
      next = await removeTenderFromPipeline(next, id);
    }
    setItems(next);
    setSelectedIds(new Set());
    toast.success("Usunięto zaznaczone");
  }, [items, selectedIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleBulkMode = useCallback(() => {
    setBulkMode((v) => !v);
    setSelectedIds(new Set());
  }, []);

  const stats = useMemo(() => ({
    actionable: items.filter((i) => isActionableTender(i)).length,
    active: items.filter((i) => isTenderOpenForOffers(i.submittingOffersDate)).length,
    urgent: items.filter((i) => {
      const d = daysUntilTenderDeadline(i.submittingOffersDate);
      return isTenderOpenForOffers(i.submittingOffersDate) && d !== null && d >= 0 && d <= 7;
    }).length,
    priority: items.filter((i) => isTenderOpenForOffers(i.submittingOffersDate) && i.priorityBuyerId).length,
    interested: items.filter((i) => i.status === "interested" || i.status === "preparing").length,
  }), [items]);

  const funnel = useMemo(() => computePipelineFunnel(items), [items]);

  return {
    items,
    loading,
    syncing,
    autoSyncing,
    autoAwardRunning,
    error,
    search,
    setSearch,
    localFilter,
    setLocalFilter,
    statusFilter,
    setStatusFilter,
    quickFilter,
    setQuickFilter,
    strategicClientFilter,
    setStrategicClientFilter,
    strategicClientCounts,
    strategicClientFilters: STRATEGIC_CLIENT_FILTERS,
    bulkMode,
    setBulkMode,
    toggleBulkMode,
    selectedIds,
    bulkStatus,
    setBulkStatus,
    persist,
    refreshFromBzp,
    updateItem,
    removeItem,
    resyncKeywords,
    reloadFromStorage,
    actionChips,
    filtered,
    exportCsv,
    applyBulkStatus,
    bulkRemove,
    toggleSelect,
    clearSelection,
    stats,
    funnel,
  };
}
