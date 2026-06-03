import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { loadAppSettingsLocal } from "@/lib/app-settings";
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
  isTenderImportant,
  daysUntilTenderDeadline,
  pruneExpiredUntouched,
  sortTendersByUrgency,
  syncTenderKeywordsAndRescore,
  shouldAutoRefreshBzp,
  markBzpSyncedAt,
  computePipelineFunnel,
  removeTenderFromPipeline,
} from "@/lib/tenders-bzp";
import { exportTendersPipelineCsv, getDeletedTenderIds } from "@/lib/tenders-sync";
import {
  computeActionChips,
  matchesQuickFilter,
  autoFetchAwardResults,
  type TenderQuickFilter,
} from "@/lib/tenders-actions";

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
  const [autoAwardRunning, setAutoAwardRunning] = useState(false);

  const bzpSettings = useMemo(() => loadAppSettingsLocal(), []);

  const persist = useCallback(async (next: TenderPipelineItem[]) => {
    setItems(next);
    try {
      await saveTendersPipeline(next);
    } catch {
      toast.error("Nie udało się zapisać pipeline do chmury");
    }
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
    const merged = pruneExpiredUntouched(mergeTenderPipeline(baseItems, mapped));
    const { items: withAwards, updated: awardsUpdated } = await autoFetchAwardResults(merged, 5);
    await persist(withAwards);
    markBzpSyncedAt();
    if (!silent) {
      const actionableN = withAwards.filter((m) => isActionableTender(m)).length;
      const priorityN = withAwards.filter(
        (m) => isTenderOpenForOffers(m.submittingOffersDate) && m.priorityBuyerId,
      ).length;
      const awardNote = awardsUpdated > 0 ? ` · ${awardsUpdated} wynik(ów) BZP` : "";
      toast.success(
        `BZP: ${actionableN} aktywnych do rozważenia (w tym ${priorityN} od kluczowych zamawiających)${awardNote}`,
      );
    }
    return withAwards;
  }, [persist]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let loaded = await loadTendersPipeline();
        const { items: rescored, changed } = await syncTenderKeywordsAndRescore(loaded);
        if (changed) {
          await saveTendersPipeline(rescored);
          loaded = rescored;
        }
        if (!cancelled) setItems(loaded);
        if (!cancelled) {
          setAutoAwardRunning(true);
          try {
            const { items: withAwards, updated } = await autoFetchAwardResults(loaded, 5);
            if (updated > 0) {
              await saveTendersPipeline(withAwards);
              if (!cancelled) setItems(withAwards);
            }
          } catch { /* ciche auto-wyniki */ }
          finally {
            if (!cancelled) setAutoAwardRunning(false);
          }
        }
        if (!cancelled && shouldAutoRefreshBzp(bzpSettings.bzpAutoRefreshHours)) {
          setAutoSyncing(true);
          try {
            await runBzpMerge(loaded, true);
          } catch {
            /* ciche auto-odświeżenie */
          } finally {
            if (!cancelled) setAutoSyncing(false);
          }
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [runBzpMerge]);

  const refreshFromBzp = useCallback(async () => {
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

  const updateItem = useCallback((id: string, patch: Partial<TenderPipelineItem>) => {
    const next = items.map((i) =>
      i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i,
    );
    void persist(next);
  }, [items, persist]);

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

  /** ETAP 8.0A — lekki reload z storage (Classic mount), bez BZP merge / autoAward. */
  const reloadFromStorage = useCallback(async () => {
    try {
      let loaded = await loadTendersPipeline();
      const { items: rescored, changed } = await syncTenderKeywordsAndRescore(loaded);
      if (changed) {
        await saveTendersPipeline(rescored);
        loaded = rescored;
      }
      setItems(loaded);
    } catch {
      /* zostaw bieżące items */
    }
  }, []);

  const actionChips = useMemo(() => computeActionChips(items), [items, profileVersion]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = items.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      const open = isTenderOpenForOffers(i.submittingOffersDate);
      if (localFilter === "actionable" && !isActionableTender(i)) return false;
      if (localFilter === "active" && !open) return false;
      if (localFilter === "archive" && open) return false;
      if (localFilter === "wroclaw" && !i.isWroclaw) return false;
      if (localFilter === "high" && !isTenderImportant(i)) return false;
      if (localFilter === "priority" && !i.priorityBuyerId) return false;
      if (quickFilter === "overload") {
        const preparing = items.filter((x) => x.status === "preparing" || x.status === "interested").length;
        if (preparing < loadCompanyProfileLocal().maxConcurrentProjects) return false;
        if (!["preparing", "interested"].includes(i.status)) return false;
      } else if (quickFilter && !matchesQuickFilter(i, quickFilter)) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q)
        || i.organizationName.toLowerCase().includes(q)
        || i.organizationCity.toLowerCase().includes(q)
        || i.bzpNumber.toLowerCase().includes(q)
      );
    });
    return sortTendersByUrgency(list);
  }, [items, search, localFilter, statusFilter, quickFilter, profileVersion]);

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
