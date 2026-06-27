import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  ScrollText,
  Search,
  Shield,
} from "lucide-react";
import type { AdminSession } from "@/lib/admin-auth";
import { canAccessAuditHub } from "@/lib/audit-hub/acl";
import { buildAuditHubViewModel } from "@/lib/audit-hub/view-model";
import { auditHubDeepLinkLabel } from "@/lib/audit-hub/deeplink";
import {
  EMPTY_AUDIT_HUB_FILTERS,
  type AuditHubFilters,
} from "@/lib/audit-hub/filters";
import {
  AUDIT_FEED_SOURCE_LABEL_PL,
  type AuditFeedDeepLink,
  type AuditFeedItem,
  type AuditHubInput,
} from "@/lib/audit-hub/types";
import { useIsMobile } from "@/app/components/ui/use-mobile";
import { useModalScrollLock } from "@/lib/modal-scroll-lock";
import { syncInspectorStatsFromCloud } from "@/lib/inspector-stats";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";

function fmtFeedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" });
}

function sourceChipClass(source: AuditFeedItem["source"]): string {
  switch (source) {
    case "operational_notes":
      return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "inspector_login":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "job_activity":
      return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "wm_print":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "wm_druk":
      return "bg-teal-500/10 text-teal-700 dark:text-teal-300";
    case "delivery_package":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
    case "security_log":
      return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300";
    default:
      return "bg-secondary text-muted-foreground";
  }
}

function severityBadgeClass(severity?: string): string {
  switch (severity) {
    case "info":
      return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "warn":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "high":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-300";
    case "critical":
      return "bg-red-500/10 text-red-700 dark:text-red-300";
    default:
      return "bg-secondary text-muted-foreground";
  }
}

function severityLabelPl(severity?: string): string {
  switch (severity) {
    case "info":
      return "Info";
    case "warn":
      return "Ostrzeżenie";
    case "high":
      return "Wysokie";
    case "critical":
      return "Krytyczne";
    default:
      return severity ?? "";
  }
}

export function AuditHubView({
  session,
  operationalNotesAuditLog,
  securityAuditLog,
  wmDrukAuditLog,
  jobs,
  wmPrintHistory,
  deliveryPackagePublications,
  onDeepLink,
}: {
  session: AdminSession | null | undefined;
  operationalNotesAuditLog: AuditHubInput["operationalNotesAuditLog"];
  securityAuditLog: AuditHubInput["securityAuditLog"];
  wmDrukAuditLog: AuditHubInput["wmDrukAuditLog"];
  jobs: AuditHubInput["jobs"];
  wmPrintHistory: AuditHubInput["wmPrintHistory"];
  deliveryPackagePublications: AuditHubInput["deliveryPackagePublications"];
  onDeepLink: (deepLink: AuditFeedDeepLink) => void;
}) {
  const allowed = canAccessAuditHub(session);
  const isMobile = useIsMobile();
  const [filters, setFilters] = useState<AuditHubFilters>(EMPTY_AUDIT_HUB_FILTERS);
  const [page, setPage] = useState(1);
  const [inspectorEvents, setInspectorEvents] = useState<AuditHubInput["inspectorLoginEvents"]>([]);
  const [inspectorLoading, setInspectorLoading] = useState(true);
  const [inspectorError, setInspectorError] = useState(false);
  const [detailItem, setDetailItem] = useState<AuditFeedItem | null>(null);

  useModalScrollLock(detailItem != null);

  const refreshInspectorStats = useCallback(async () => {
    setInspectorLoading(true);
    setInspectorError(false);
    try {
      const store = await syncInspectorStatsFromCloud();
      setInspectorEvents(store.events);
    } catch {
      setInspectorEvents([]);
      setInspectorError(true);
    } finally {
      setInspectorLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    refreshInspectorStats();
  }, [allowed, refreshInspectorStats]);

  const hubInput = useMemo<AuditHubInput>(
    () => ({
      operationalNotesAuditLog,
      inspectorLoginEvents: inspectorEvents,
      jobs,
      wmPrintHistory,
      wmDrukAuditLog,
      deliveryPackagePublications,
      securityAuditLog,
    }),
    [operationalNotesAuditLog, inspectorEvents, jobs, wmPrintHistory, wmDrukAuditLog, deliveryPackagePublications, securityAuditLog],
  );

  const model = useMemo(
    () => buildAuditHubViewModel(hubInput, filters, page),
    [hubInput, filters, page],
  );

  useEffect(() => {
    setPage(1);
  }, [filters.source, filters.actor, filters.search]);

  useEffect(() => {
    if (page > model.paged.totalPages) setPage(model.paged.totalPages);
  }, [page, model.paged.totalPages]);

  if (!allowed) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Brak dostępu — tylko Super Admin.</p>
      </div>
    );
  }

  const loading = inspectorLoading;
  const empty = !loading && model.filtered.length === 0;
  const deepLinkLabel = detailItem ? auditHubDeepLinkLabel(detailItem.deepLink) : null;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Shield size={18} className="text-primary shrink-0" />
              Audit Hub
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              Agregacja logów z 7 źródeł — w tym WM Druk Pomiary/Schematy oraz Security log. Read-only.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refreshInspectorStats()}
            disabled={inspectorLoading}
            className="self-start flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 disabled:opacity-50"
          >
            <RefreshCw size={13} className={inspectorLoading ? "animate-spin" : ""} />
            Odśwież logowania inspektora
          </button>
        </div>

        {inspectorError && (
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            Nie udało się pobrać logowań inspektora z chmury — pozostałe źródła są dostępne.
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <div className="bg-secondary/50 rounded-xl px-3 py-2.5 border border-border col-span-2 sm:col-span-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Razem</p>
            <p className="text-lg font-semibold mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {loading ? "…" : model.kpi.total}
            </p>
          </div>
          {(Object.keys(AUDIT_FEED_SOURCE_LABEL_PL) as Array<keyof typeof AUDIT_FEED_SOURCE_LABEL_PL>).map((key) => (
            <div key={key} className="bg-secondary/50 rounded-xl px-3 py-2.5 border border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                {AUDIT_FEED_SOURCE_LABEL_PL[key]}
              </p>
              <p className="text-base font-semibold mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {loading ? "…" : model.kpi.bySource[key]}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">Źródło</span>
              <select
                value={filters.source}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    source: e.target.value as AuditHubFilters["source"],
                  }))
                }
                className="w-full px-2.5 py-2 text-sm bg-background rounded-lg border border-border"
              >
                <option value="all">Wszystkie</option>
                {model.filterOptions.sources.map((s) => (
                  <option key={s} value={s}>
                    {AUDIT_FEED_SOURCE_LABEL_PL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">Osoba</span>
              <select
                value={filters.actor}
                onChange={(e) => setFilters((f) => ({ ...f, actor: e.target.value }))}
                className="w-full px-2.5 py-2 text-sm bg-background rounded-lg border border-border"
              >
                <option value="all">Wszyscy</option>
                {model.filterOptions.actors.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs space-y-1 sm:col-span-1">
              <span className="text-muted-foreground">Szukaj</span>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  placeholder="Treść, robota, akcja…"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-background rounded-lg border border-border"
                />
              </div>
            </label>
          </div>
          {(filters.source !== "all" || filters.actor !== "all" || filters.search.trim()) && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_AUDIT_HUB_FILTERS)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Wyczyść filtry
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16 space-y-2">
            <RefreshCw size={28} className="mx-auto text-muted-foreground/40 animate-spin" />
            <p className="text-sm text-muted-foreground">Ładowanie logów inspektora…</p>
          </div>
        ) : empty ? (
          <div className="text-center py-16 space-y-2 border border-dashed border-border rounded-xl">
            <ScrollText size={32} className="mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {model.kpi.total === 0
                ? "Brak wpisów w dostępnych źródłach."
                : "Brak wyników dla wybranych filtrów."}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/40 text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Data</th>
                      <th className="px-3 py-2 font-medium">Źródło</th>
                      <th className="px-3 py-2 font-medium">Akcja</th>
                      <th className="px-3 py-2 font-medium">Kto</th>
                      <th className="px-3 py-2 font-medium">Opis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.paged.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-border/60 hover:bg-secondary/30 cursor-pointer"
                        onClick={() => setDetailItem(item)}
                      >
                        <td className="px-3 py-2 whitespace-nowrap text-xs">{fmtFeedDate(item.at)}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sourceChipClass(item.source)}`}>
                            {AUDIT_FEED_SOURCE_LABEL_PL[item.source]}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 flex-wrap">
                            {item.actionLabel}
                            {item.severity && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${severityBadgeClass(item.severity)}`}>
                                {severityLabelPl(item.severity)}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs truncate max-w-[100px]">{item.actor}</td>
                        <td className="px-3 py-2 text-xs truncate max-w-[240px]">{item.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Pokazano {model.paged.items.length} z {model.paged.total} (filtrowane: {model.kpi.filteredTotal} / {model.kpi.total})
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={model.paged.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-lg hover:bg-secondary disabled:opacity-40"
                  aria-label="Poprzednia strona"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2 tabular-nums">
                  {model.paged.page} / {model.paged.totalPages}
                </span>
                <button
                  type="button"
                  disabled={model.paged.page >= model.paged.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-2 rounded-lg hover:bg-secondary disabled:opacity-40"
                  aria-label="Następna strona"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Sheet open={detailItem != null} onOpenChange={(open) => !open && setDetailItem(null)}>
        <SheetContent side={isMobile ? "bottom" : "right"} className={isMobile ? "max-h-[92dvh] rounded-t-2xl" : "w-full sm:max-w-md"}>
          <SheetHeader>
            <SheetTitle>Szczegóły wpisu</SheetTitle>
            <SheetDescription>Metadane z istniejącego źródła logów.</SheetDescription>
          </SheetHeader>
          {detailItem && (
            <div className="mt-4 space-y-3 text-sm">
              <dl className="space-y-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Data</dt>
                  <dd>{fmtFeedDate(detailItem.at)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Źródło</dt>
                  <dd>{AUDIT_FEED_SOURCE_LABEL_PL[detailItem.source]}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Akcja</dt>
                  <dd className="flex items-center gap-2 flex-wrap">
                    {detailItem.actionLabel}
                    {detailItem.severity && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${severityBadgeClass(detailItem.severity)}`}>
                        {severityLabelPl(detailItem.severity)}
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Kto</dt>
                  <dd>{detailItem.actor}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Opis</dt>
                  <dd className="break-words">{detailItem.summary}</dd>
                </div>
                {detailItem.detail && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Szczegóły</dt>
                    <dd className="break-words text-muted-foreground">{detailItem.detail}</dd>
                  </div>
                )}
                {detailItem.jobLabel && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Robota</dt>
                    <dd>{detailItem.jobLabel}</dd>
                  </div>
                )}
              </dl>
              {deepLinkLabel && (
                <button
                  type="button"
                  onClick={() => {
                    onDeepLink(detailItem.deepLink);
                    setDetailItem(null);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
                >
                  <ExternalLink size={13} />
                  {deepLinkLabel}
                </button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
