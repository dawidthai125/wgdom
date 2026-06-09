import { useMemo, useState, useEffect, useCallback } from "react";
import {
  ClipboardCheck, Search, MapPin, FileText, CheckCircle2, Upload,
  ExternalLink, ChevronRight, ChevronLeft, Filter, LogIn, Eye,
  MessageSquare, Camera, Calendar, RefreshCw, Trash2, X, ArrowLeft,
  Wallet, Receipt, Briefcase,
} from "lucide-react";
import {
  collectInspectorFeed,
  removeInspectorFeedItem,
  type InspectorFeedItem,
  type InspectorActivityType,
  type JobWithActivity,
} from "@/lib/job-activity";
import {
  syncInspectorStatsFromCloud,
  summarizeInspectorStats,
  fmtInspectorStatsTime,
  type InspectorStatsStore,
  getAdminJobNotesSeenAt,
  markInspectorFeedSeen,
  markAdminJobNotesSeen,
  getUnseenInspectorFeed,
} from "@/lib/inspector-stats";
import { pushKeysToCloudSafe } from "@/lib/cloud-sync";
import { jobsWithInspectorNotesNeedingAdmin } from "@/lib/job-wm";
import type { JobWmJob } from "@/lib/job-wm";
import type { JobDetailSection } from "@/app/JobDetailSectionNav";
import { resolveInspectorFeedDeepLink } from "@/lib/inspector-feed-deeplink";
import { AuthorAttribution } from "@/app/AuthorAttribution";

type FilterKind = "all" | InspectorActivityType;

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function feedTypeIcon(type: InspectorActivityType) {
  switch (type) {
    case "inspector_file":
      return { Icon: Upload, cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };
    case "inspector_stage":
      return { Icon: Calendar, cls: "bg-violet-500/10 text-violet-500" };
    case "inspector_note":
      return { Icon: MessageSquare, cls: "bg-blue-500/10 text-blue-500" };
    case "inspector_photo":
      return { Icon: Camera, cls: "bg-amber-500/10 text-amber-500" };
    case "inspector_billing_proposal":
      return { Icon: Wallet, cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };
    case "inspector_billing_note":
      return { Icon: Receipt, cls: "bg-sky-500/10 text-sky-500" };
    case "inspector_document":
      return { Icon: CheckCircle2, cls: "bg-blue-500/10 text-blue-500" };
    default:
      return { Icon: CheckCircle2, cls: "bg-blue-500/10 text-blue-500" };
  }
}

const FEED_PAGE_SIZE = 10;

function FeedCard({
  item,
  onOpenInJobs,
  onDelete,
  deleteConfirmId,
  onDeleteConfirm,
  onDeleteCancel,
  directoryContacts,
  viewerRole,
}: {
  item: InspectorFeedItem;
  onOpenInJobs: (jobId: string, section: JobDetailSection) => void;
  onDelete: (item: InspectorFeedItem) => void;
  deleteConfirmId: string | null;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
  directoryContacts: { name: string; phone: string }[];
  viewerRole: import("@/lib/admin-auth").AdminRole;
}) {
  const { Icon, cls } = feedTypeIcon(item.type);
  const { section, sectionLabel } = resolveInspectorFeedDeepLink(item);
  const confirming = deleteConfirmId === item.id;
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${cls}`}>
          <Icon size={16}/>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{item.text}</p>
          <p className="text-xs text-muted-foreground mt-1">
            <AuthorAttribution
              name={item.actor}
              directory={directoryContacts}
              viewerRole={viewerRole}
              accentClass="text-foreground/80 font-medium"
            />
            {" · "}
            {fmtDateTime(item.at)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
            <MapPin size={10} className="shrink-0"/>
            <span className="truncate">
              {item.jobAddress || "Bez adresu"}
              {item.jobFlat ? ` m.${item.jobFlat}` : ""}
              {item.jobClient ? ` · ${item.jobClient}` : ""}
            </span>
          </p>
          <button
            type="button"
            onClick={() => onOpenInJobs(item.jobId, section)}
            className="mt-2 inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            <Briefcase size={12}/>
            Otwórz w Robotach
            <span className="opacity-80">→ {sectionLabel}</span>
            <ChevronRight size={11}/>
          </button>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${item.jobStatus === "completed" ? "bg-green-500/15 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
            {item.jobStatus === "completed" ? "Zdana" : "W trakcie"}
          </span>
          {confirming ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="text-[10px] bg-destructive text-white px-2 py-1 rounded-lg font-medium"
              >
                Usuń
              </button>
              <button type="button" onClick={onDeleteCancel} className="p-1 text-muted-foreground hover:text-foreground">
                <X size={12}/>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onDeleteConfirm(item.id)}
              title="Usuń wpis z listy aktywności"
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <Trash2 size={13}/>
            </button>
          )}
        </div>
      </div>
      {item.fileUrl && (
        <div className="px-4 pb-3 pt-0">
          <a
            href={item.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            <FileText size={12}/>
            {item.fileName || "Otwórz plik"}
            <ExternalLink size={11}/>
          </a>
        </div>
      )}
    </div>
  );
}

export function InspectorAdminView({
  jobs,
  setJobs,
  directory,
  adminUserId,
  adminRole = "admin",
  onOpenJobInJobs,
  onAlertsSeen,
  returnNav,
}: {
  jobs: JobWithActivity[];
  setJobs: (v: JobWithActivity[] | ((p: JobWithActivity[]) => JobWithActivity[])) => void;
  directory: { id: string; name: string; phone: string; position?: string }[];
  adminUserId?: string;
  adminRole?: import("@/lib/admin-auth").AdminRole;
  onOpenJobInJobs: (jobId: string, section: JobDetailSection) => void;
  onAlertsSeen?: () => void;
  returnNav?: { label: string; onBack: () => void };
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKind>("all");
  const [feedPage, setFeedPage] = useState(0);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statsStore, setStatsStore] = useState<InspectorStatsStore | null>(null);
  const [statsRefreshing, setStatsRefreshing] = useState(false);

  const notesNeedingAdmin = useMemo(
    () => jobsWithInspectorNotesNeedingAdmin(jobs as JobWmJob[], getAdminJobNotesSeenAt(adminUserId)).length,
    [jobs, adminUserId],
  );

  const unseenCount = useMemo(
    () => getUnseenInspectorFeed(jobs, undefined, adminUserId).length + notesNeedingAdmin,
    [jobs, adminUserId, notesNeedingAdmin],
  );

  const refreshStats = useCallback(async () => {
    setStatsRefreshing(true);
    try {
      const store = await syncInspectorStatsFromCloud();
      setStatsStore(store);
    } catch {
      setStatsStore(null);
    } finally {
      setStatsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") refreshStats();
    };
    window.addEventListener("focus", refreshStats);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", refreshStats);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refreshStats]);

  const loginStats = useMemo(
    () => (statsStore ? summarizeInspectorStats(statsStore) : null),
    [statsStore],
  );

  const feed = useMemo(() => collectInspectorFeed(jobs), [jobs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return feed.filter((item) => {
      if (filter !== "all" && item.type !== filter) return false;
      if (!q) return true;
      return (
        item.jobAddress.toLowerCase().includes(q)
        || item.jobClient.toLowerCase().includes(q)
        || item.actor.toLowerCase().includes(q)
        || item.text.toLowerCase().includes(q)
      );
    });
  }, [feed, search, filter]);

  useEffect(() => {
    setFeedPage(0);
    setDeleteConfirmId(null);
  }, [search, filter]);

  const feedTotalPages = Math.max(1, Math.ceil(filtered.length / FEED_PAGE_SIZE));
  const safeFeedPage = Math.min(feedPage, feedTotalPages - 1);
  const pagedFeed = useMemo(
    () => filtered.slice(safeFeedPage * FEED_PAGE_SIZE, safeFeedPage * FEED_PAGE_SIZE + FEED_PAGE_SIZE),
    [filtered, safeFeedPage],
  );
  const feedRangeFrom = filtered.length === 0 ? 0 : safeFeedPage * FEED_PAGE_SIZE + 1;
  const feedRangeTo = Math.min((safeFeedPage + 1) * FEED_PAGE_SIZE, filtered.length);

  const handleDeleteFeedItem = useCallback((item: InspectorFeedItem) => {
    setJobs((prev) => {
      const next = removeInspectorFeedItem(prev, item);
      pushKeysToCloudSafe(["kw-jobs"], [next]).catch(() => {});
      return next;
    });
    setDeleteConfirmId(null);
  }, [setJobs]);

  const stats = useMemo(() => ({
    total: feed.length,
    docs: feed.filter((i) => i.type === "inspector_document").length,
    files: feed.filter((i) => i.type === "inspector_file").length,
    billingProposals: feed.filter((i) => i.type === "inspector_billing_proposal").length,
    stages: feed.filter((i) => i.type === "inspector_stage").length,
    notes: feed.filter((i) => i.type === "inspector_note").length,
    photos: feed.filter((i) => i.type === "inspector_photo").length,
    jobs: new Set(feed.map((i) => i.jobId)).size,
  }), [feed]);

  const handleMarkSeen = async () => {
    const ts = new Date().toISOString();
    await markInspectorFeedSeen(adminUserId, ts);
    await markAdminJobNotesSeen(adminUserId, ts);
    onAlertsSeen?.();
  };

  const filterButtons: { key: FilterKind; label: string }[] = [
    { key: "all", label: "Wszystko" },
    { key: "inspector_document", label: "Dokumenty" },
    { key: "inspector_file", label: "Pliki" },
    { key: "inspector_stage", label: "Etapy" },
    { key: "inspector_note", label: "Notatki WM" },
    { key: "inspector_photo", label: "Zdjęcia" },
    { key: "inspector_billing_proposal", label: "Propozycje billing" },
    { key: "inspector_billing_note", label: "Uwagi billing" },
  ];

  const directoryContacts = useMemo(
    () => directory.map((d) => ({ name: d.name, phone: d.phone })),
    [directory],
  );

  return (
    <div className="flex flex-1 min-h-0 w-full overflow-hidden">
      <div className="flex-1 w-full overflow-y-auto overscroll-contain">
        <div
          className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-8 space-y-6"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          {returnNav && (
            <button
              type="button"
              onClick={returnNav.onBack}
              className="flex items-center gap-2 text-sm font-medium text-primary min-h-[44px] -ml-1 mb-2"
            >
              <ArrowLeft size={16}/>Wróć do {returnNav.label}
            </button>
          )}

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <ClipboardCheck size={20} className="text-emerald-600 dark:text-emerald-400"/>
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold">Aktywność inspektora</h2>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Monitoring zmian z aplikacji inspektora. Akcje operacyjne — w zakładce Roboty.
                </p>
              </div>
            </div>
            {unseenCount > 0 && (
              <button
                type="button"
                onClick={handleMarkSeen}
                className="shrink-0 text-[11px] px-3 py-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 font-medium"
              >
                Oznacz przeczytane ({unseenCount})
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { label: "Wszystkie", value: stats.total },
              { label: "Dokumenty", value: stats.docs },
              { label: "Pliki", value: stats.files },
              { label: "Propozycje billing", value: stats.billingProposals },
              { label: "Roboty", value: stats.jobs },
            ].map((s) => (
              <div key={s.label} className="bg-secondary/50 rounded-xl px-3 py-2.5 border border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</p>
              </div>
            ))}
          </div>

          {loginStats && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <LogIn size={12}/> Statystyki logowań i wejść
                </p>
                <button
                  type="button"
                  onClick={refreshStats}
                  disabled={statsRefreshing}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-secondary disabled:opacity-50"
                >
                  <RefreshCw size={11} className={statsRefreshing ? "animate-spin" : ""}/>
                  Odśwież
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center sm:text-left">
                <div>
                  <p className="text-[10px] text-muted-foreground">Logowania (7 dni)</p>
                  <p className="text-base font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{loginStats.loginsLast7Days}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Wejścia (7 dni)</p>
                  <p className="text-base font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{loginStats.visitsLast7Days}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Ostatnie logowanie</p>
                  <p className="text-[11px] font-medium mt-0.5">{fmtInspectorStatsTime(loginStats.lastLoginAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Ostatnie wejście</p>
                  <p className="text-[11px] font-medium mt-0.5">{fmtInspectorStatsTime(loginStats.lastVisitAt)}</p>
                </div>
              </div>
              {loginStats.byUser.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-emerald-500/10">
                  {loginStats.byUser.map((u) => (
                    <span key={u.userId} className="text-[10px] bg-secondary px-2 py-1 rounded-full text-muted-foreground">
                      <Eye size={9} className="inline mr-0.5 -mt-px"/>
                      {u.displayName}: {u.logins} log. / {u.visits} wej.
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukaj adresu, klienta, inspektora…"
                className="w-full bg-secondary rounded-xl pl-9 pr-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {filterButtons.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  {f.key !== "all" && <Filter size={11}/>}
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <ClipboardCheck size={32} className="mx-auto text-muted-foreground/30"/>
              <p className="text-sm text-muted-foreground">
                {feed.length === 0
                  ? "Inspektor jeszcze nic nie zmienił — wpisy pojawią się po zaznaczeniu dokumentów lub wgraniu plików."
                  : "Brak wyników dla wybranych filtrów."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] text-muted-foreground px-1">
                Wpisy {feedRangeFrom}–{feedRangeTo} z {filtered.length}
                {filter !== "all" || search.trim() ? " (po filtrze)" : ""}
              </p>
              <div className="space-y-2">
                {pagedFeed.map((item) => (
                  <FeedCard
                    key={item.id}
                    item={item}
                    onOpenInJobs={onOpenJobInJobs}
                    onDelete={handleDeleteFeedItem}
                    deleteConfirmId={deleteConfirmId}
                    onDeleteConfirm={setDeleteConfirmId}
                    onDeleteCancel={() => setDeleteConfirmId(null)}
                    directoryContacts={directoryContacts}
                    viewerRole={adminRole}
                  />
                ))}
              </div>
              {feedTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Strona <span className="font-semibold text-foreground">{safeFeedPage + 1}</span> z {feedTotalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setFeedPage((p) => Math.max(0, p - 1)); setDeleteConfirmId(null); }}
                      disabled={safeFeedPage === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      <ChevronLeft size={14}/>
                      Poprzednia
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFeedPage((p) => Math.min(feedTotalPages - 1, p + 1)); setDeleteConfirmId(null); }}
                      disabled={safeFeedPage >= feedTotalPages - 1}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      Następna
                      <ChevronRight size={14}/>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
