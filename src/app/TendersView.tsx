import { useEffect, useRef, useState } from "react";
import {
  RefreshCw, Search, Scale, MapPin, Calendar, Building2,
  Filter, AlertCircle, HelpCircle, Download, Trash2, CheckSquare, Square,
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
import { TenderKeywordsPanel } from "@/app/TenderKeywordsPanel";
import { FIT_LABELS } from "@/lib/tenders-bzp-fit";
import { PROFITABILITY_LABELS } from "@/lib/tenders-bzp-swz";
import { tenderListBidLine } from "@/lib/tenders-bid-prep";
import { TendersMapPanel } from "@/app/TendersMapPanel";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import { useCommandCenterContext } from "@/app/tender-center/context/CommandCenterContext";
import { getPipelineSessionCacheIfFresh } from "@/lib/tenders-pipeline-session-cache";

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
  const [expandedId, setExpandedId] = useState<string | null>(initialExpandedId);
  const [showLegend, setShowLegend] = useState(false);
  const { snapshot, bumpProfileVersion, profileVersion } = useCommandCenterContext();
  const pipeline = snapshot.pipeline;
  const r1Hydrated = useRef(false);

  /** ETAP 8.0A / 2.1C — Classic mount; pomiń gdy sesyjny cache świeży (PRO już załadował). */
  useEffect(() => {
    if (r1Hydrated.current) return;
    r1Hydrated.current = true;
    if (getPipelineSessionCacheIfFresh()) return;
    void pipeline.reloadFromStorage();
  }, [pipeline.reloadFromStorage]);

  useEffect(() => {
    if (initialExpandedId) setExpandedId(initialExpandedId);
  }, [initialExpandedId]);

  const handleRemoveItem = async (id: string) => {
    const removed = await pipeline.removeItem(id);
    if (removed) setExpandedId((e) => (e === id ? null : e));
  };

  const handleBulkRemove = async () => {
    await pipeline.bulkRemove();
    setExpandedId(null);
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

        <div className="px-4 sm:px-6 py-4 space-y-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium">{pipeline.stats.actionable} do zgłoszenia</span>
          <span className="px-2.5 py-1 rounded-lg bg-secondary">{pipeline.stats.active} aktywnych</span>
          {pipeline.stats.urgent > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">{pipeline.stats.urgent} termin ≤7 dni</span>
          )}
          <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">{pipeline.stats.priority} kluczowi</span>
          <span className="px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">{pipeline.stats.interested} w analizie</span>
        </div>

        <div className="rounded-xl bg-secondary/40 px-3 py-2.5 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Lejek pipeline</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
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

        <button
          type="button"
          onClick={() => setShowLegend((v) => !v)}
          className="w-full sm:w-auto text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-center sm:justify-start gap-1.5 py-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
        >
          <HelpCircle size={13} className="text-primary shrink-0" />
          {showLegend ? "Ukryj legendę (trafność, statusy, oceny)" : "Co oznacza trafność i statusy? (legenda)"}
        </button>
        {showLegend && <TendersLegend compact />}

        <TenderCompanyProfilePanel onSaved={() => bumpProfileVersion()} />
        <TenderKeywordsPanel onSaved={() => void pipeline.resyncKeywords()} />

        <TendersMapPanel
          items={pipeline.items}
          selectedId={expandedId}
          onSelect={(id) => setExpandedId(id)}
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={pipeline.toggleBulkMode}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80"
          >
            {pipeline.bulkMode ? <CheckSquare size={13} /> : <Square size={13} />}
            {pipeline.bulkMode ? "Tryb masowy" : "Zaznacz wiele"}
          </button>
          <button
            type="button"
            onClick={pipeline.exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80"
          >
            <Download size={13} />
            Eksport CSV
          </button>
        </div>

        {pipeline.bulkMode && pipeline.selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
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

        {pipeline.actionChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] text-muted-foreground self-center mr-1">Wymaga działania:</span>
            {pipeline.actionChips.map((chip) => {
              const active = pipeline.quickFilter === chip.id;
              const toneCls = chip.tone === "red"
                ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25"
                : chip.tone === "amber"
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25"
                  : chip.tone === "violet"
                    ? "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/25"
                    : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25";
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => pipeline.setQuickFilter(active ? null : chip.id)}
                  className={`text-[10px] font-medium px-2 py-1 rounded-lg border transition-colors ${toneCls} ${active ? "ring-2 ring-primary/40" : "hover:opacity-90"}`}
                >
                  {chip.label} ({chip.count})
                </button>
              );
            })}
            {pipeline.quickFilter && (
              <button
                type="button"
                onClick={() => pipeline.setQuickFilter(null)}
                className="text-[10px] text-muted-foreground hover:text-foreground underline px-1"
              >
                Wyczyść filtr
              </button>
            )}
          </div>
        )}

        {pipeline.autoAwardRunning && (
          <p className="text-[10px] text-muted-foreground">Sprawdzam wyniki zakończonych postępowań…</p>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={pipeline.search}
              onChange={(e) => pipeline.setSearch(e.target.value)}
              placeholder="Szukaj tytułu, zamawiającego, miasta, numeru BZP…"
              className="w-full bg-secondary rounded-xl pl-9 pr-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={pipeline.localFilter}
              onChange={(e) => pipeline.setLocalFilter(e.target.value as typeof pipeline.localFilter)}
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
              value={pipeline.statusFilter}
              onChange={(e) => pipeline.setStatusFilter(e.target.value as TenderPipelineStatus | "all")}
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
        {pipeline.filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Filter size={32} className="mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {pipeline.localFilter === "actionable"
                ? "Brak aktywnych przetargów do rozważenia — kliknij „Odśwież z BZP”"
                : "Brak przetargów dla wybranych filtrów"}
            </p>
          </div>
        ) : pipeline.filtered.map((item) => {
          const days = daysUntil(item.submittingOffersDate);
          const offerOpen = isTenderOpenForOffers(item.submittingOffersDate);
          const urgent = offerOpen && days !== null && days >= 0 && days <= 7;
          const expanded = expandedId === item.id;
          const bidLine = tenderListBidLine(item);
          const wadiumBlocked = computeWadiumInfo(
            item,
            item.swzAnalysis,
            loadCompanyProfileLocal().maxWadiumPln,
          ).blocked;
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

              {expanded && (
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
        })}
        </div>
      </div>
    </div>
  );
}
