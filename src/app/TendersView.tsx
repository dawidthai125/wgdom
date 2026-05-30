import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw, Search, Scale, MapPin, Calendar, Building2,
  Filter, AlertCircle, HelpCircle, Download, Trash2, CheckSquare, Square,
} from "lucide-react";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { loadAppSettingsLocal } from "@/lib/app-settings";
import {
  type TenderPipelineItem,
  type TenderPipelineStatus,
  TENDER_STATUS_LABELS,
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
  jobDraftFromTender,
  syncTenderKeywordsAndRescore,
  shouldAutoRefreshBzp,
  markBzpSyncedAt,
  computePipelineFunnel,
  labelTenderState,
  removeTenderFromPipeline,
} from "@/lib/tenders-bzp";
import { exportTendersPipelineCsv, getDeletedTenderIds } from "@/lib/tenders-sync";
import { TenderDetailPanel } from "@/app/TenderDetailPanel";
import { TendersLegend } from "@/app/TendersLegend";
import { TenderCompanyProfilePanel } from "@/app/TenderCompanyProfilePanel";
import { TenderKeywordsPanel } from "@/app/TenderKeywordsPanel";
import { FIT_LABELS } from "@/lib/tenders-bzp-fit";
import { PROFITABILITY_LABELS } from "@/lib/tenders-bzp-swz";

type LocalFilter = "actionable" | "active" | "priority" | "wroclaw" | "high" | "archive" | "all";

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

export function TendersView({
  showTestBadge = false,
  onCreateJobFromTender,
  onOpenJob,
  athPreviewEnabled = true,
  initialExpandedId = null,
}: {
  showTestBadge?: boolean;
  onCreateJobFromTender?: (draft: ReturnType<typeof jobDraftFromTender>, item: TenderPipelineItem) => string | void;
  onOpenJob?: (jobId: string) => void;
  athPreviewEnabled?: boolean;
  initialExpandedId?: string | null;
}) {
  const [items, setItems] = useState<TenderPipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [localFilter, setLocalFilter] = useState<LocalFilter>("actionable");
  const [statusFilter, setStatusFilter] = useState<TenderPipelineStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(initialExpandedId);
  const [error, setError] = useState("");
  const [autoSyncing, setAutoSyncing] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [profileVersion, setProfileVersion] = useState(0);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<TenderPipelineStatus>("ignored");

  const bzpSettings = useMemo(() => loadAppSettingsLocal(), []);

  useEffect(() => {
    if (initialExpandedId) setExpandedId(initialExpandedId);
  }, [initialExpandedId]);

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
    await persist(merged);
    markBzpSyncedAt();
    if (!silent) {
      const actionableN = merged.filter((m) => isActionableTender(m)).length;
      const priorityN = merged.filter((m) => isTenderOpenForOffers(m.submittingOffersDate) && m.priorityBuyerId).length;
      toast.success(`BZP: ${actionableN} aktywnych do rozważenia (w tym ${priorityN} od kluczowych zamawiających)`);
    }
    return merged;
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
    if (!window.confirm("Usunąć przetarg z listy pipeline? (nie wróci przy sync BZP)")) return;
    try {
      const next = await removeTenderFromPipeline(items, id);
      setItems(next);
      setExpandedId((e) => (e === id ? null : e));
      setSelectedIds((s) => { const n = new Set(s); n.delete(id); return n; });
      toast.success("Usunięto z pipeline");
    } catch {
      toast.error("Nie udało się usunąć");
    }
  }, [items]);

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
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q)
        || i.organizationName.toLowerCase().includes(q)
        || i.organizationCity.toLowerCase().includes(q)
        || i.bzpNumber.toLowerCase().includes(q)
      );
    });
    return sortTendersByUrgency(list);
  }, [items, search, localFilter, statusFilter]);

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
    setExpandedId(null);
    toast.success("Usunięto zaznaczone");
  }, [items, selectedIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
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

  if (loading) {
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
              onClick={() => void refreshFromBzp()}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 min-h-[44px]"
            >
              <RefreshCw size={16} className={syncing || autoSyncing ? "animate-spin" : ""} />
              {syncing ? "Pobieranie…" : autoSyncing ? "Auto-sync…" : "Odśwież z BZP"}
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 space-y-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium">{stats.actionable} do zgłoszenia</span>
          <span className="px-2.5 py-1 rounded-lg bg-secondary">{stats.active} aktywnych</span>
          {stats.urgent > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">{stats.urgent} termin ≤7 dni</span>
          )}
          <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">{stats.priority} kluczowi</span>
          <span className="px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">{stats.interested} w analizie</span>
        </div>

        <div className="rounded-xl bg-secondary/40 px-3 py-2.5 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Lejek pipeline</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <span>Nowe: <strong className="text-foreground">{funnel.new}</strong></span>
            <span>Obejrzane: <strong className="text-foreground">{funnel.seen}</strong></span>
            <span>Interesuje: <strong className="text-violet-600">{funnel.interested}</strong></span>
            <span>Oferta: <strong className="text-foreground">{funnel.preparing}</strong></span>
            <span>Złożone: <strong className="text-foreground">{funnel.submitted}</strong></span>
            <span>Wygrane: <strong className="text-emerald-600">{funnel.won}</strong></span>
            <span>Przegrane: <strong className="text-foreground">{funnel.lost}</strong></span>
            {funnel.winRate != null && (
              <span>Skuteczność: <strong className="text-primary">{funnel.winRate}%</strong></span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowLegend((v) => !v)}
          className="w-full sm:w-auto text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-center sm:justify-start gap-1.5 py-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
        >
          <HelpCircle size={13} className="text-primary shrink-0" />
          {showLegend ? "Ukryj legendę (trafność, statusy, oceny)" : "Co oznacza trafność i statusy? (legenda)"}
        </button>
        {showLegend && <TendersLegend compact />}

        <TenderCompanyProfilePanel onSaved={() => setProfileVersion((v) => v + 1)} />
        <TenderKeywordsPanel onSaved={() => void syncTenderKeywordsAndRescore(items).then(({ items: r, changed }) => {
          if (changed) void persist(r);
        })} />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => { setBulkMode((v) => !v); setSelectedIds(new Set()); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80"
          >
            {bulkMode ? <CheckSquare size={13} /> : <Square size={13} />}
            {bulkMode ? "Tryb masowy" : "Zaznacz wiele"}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80"
          >
            <Download size={13} />
            Eksport CSV
          </button>
        </div>

        {bulkMode && selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <span className="text-xs font-medium">{selectedIds.size} zaznaczonych</span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as TenderPipelineStatus)}
              className="bg-secondary rounded-lg px-2 py-1.5 text-xs border border-border"
            >
              {(Object.keys(TENDER_STATUS_LABELS) as TenderPipelineStatus[]).map((s) => (
                <option key={s} value={s}>{TENDER_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <button type="button" onClick={applyBulkStatus} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
              Ustaw status
            </button>
            <button type="button" onClick={() => void bulkRemove()} className="px-3 py-1.5 rounded-lg bg-red-600/90 text-white text-xs font-medium flex items-center gap-1">
              <Trash2 size={12} /> Usuń
            </button>
            <button type="button" onClick={() => setSelectedIds(new Set())} className="text-xs text-muted-foreground hover:underline">
              Wyczyść zaznaczenie
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj tytułu, zamawiającego, miasta, numeru BZP…"
              className="w-full bg-secondary rounded-xl pl-9 pr-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={localFilter}
              onChange={(e) => setLocalFilter(e.target.value as LocalFilter)}
              className="bg-secondary rounded-xl px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none min-h-[44px]"
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TenderPipelineStatus | "all")}
              className="bg-secondary rounded-xl px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none min-h-[44px]"
            >
              <option value="all">Wszystkie statusy</option>
              {(Object.keys(TENDER_STATUS_LABELS) as TenderPipelineStatus[]).map((s) => (
                <option key={s} value={s}>{TENDER_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>
        </div>

        <div className="px-4 sm:px-6 pb-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Filter size={32} className="mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {localFilter === "actionable"
                ? "Brak aktywnych przetargów do rozważenia — kliknij „Odśwież z BZP”"
                : "Brak przetargów dla wybranych filtrów"}
            </p>
          </div>
        ) : filtered.map((item) => {
          const days = daysUntil(item.submittingOffersDate);
          const offerOpen = isTenderOpenForOffers(item.submittingOffersDate);
          const urgent = offerOpen && days !== null && days >= 0 && days <= 7;
          const expanded = expandedId === item.id;
          return (
            <article
              key={item.id}
              className={`rounded-xl border bg-card overflow-hidden ${item.isWroclaw ? "border-primary/30" : "border-border"}`}
            >
              <button
                type="button"
                className="w-full text-left px-4 py-3.5 hover:bg-secondary/40 transition-colors flex gap-2"
                onClick={() => {
                  const opening = expandedId !== item.id;
                  setExpandedId(opening ? item.id : null);
                  if (opening && item.status === "new") {
                    updateItem(item.id, { status: "seen" });
                  }
                }}
              >
                {bulkMode && (
                  <span
                    role="checkbox"
                    aria-checked={selectedIds.has(item.id)}
                    className="shrink-0 pt-0.5"
                    onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                  >
                    {selectedIds.has(item.id)
                      ? <CheckSquare size={16} className="text-primary" />
                      : <Square size={16} className="text-muted-foreground" />}
                  </span>
                )}
                <div className="flex flex-wrap items-start justify-between gap-2 flex-1 min-w-0">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
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
                    </div>
                    <p className="text-sm font-semibold leading-snug">{item.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <Building2 size={12} />
                      {item.organizationName}
                      <span>·</span>
                      <MapPin size={12} />
                      {item.organizationCity || "—"}
                    </p>
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

              {expanded && (
                <TenderDetailPanel
                  item={item}
                  allItems={items}
                  onUpdate={(patch) => updateItem(item.id, patch)}
                  onRemove={() => void removeItem(item.id)}
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
        })}
        </div>
      </div>
    </div>
  );
}
