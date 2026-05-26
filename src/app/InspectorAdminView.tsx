import { useMemo, useState, useEffect } from "react";
import {
  ClipboardCheck, Search, MapPin, FileText, CheckCircle2, Upload,
  ExternalLink, ChevronRight, Filter, LogIn, Eye, LayoutGrid,
} from "lucide-react";
import {
  collectInspectorFeed,
  type InspectorFeedItem,
  type InspectorActivityType,
  type JobWithActivity,
} from "@/lib/job-activity";
import {
  syncInspectorStatsFromCloud,
  summarizeInspectorStats,
  fmtInspectorStatsTime,
  type InspectorStatsStore,
  getJobNotesSeenAt,
} from "@/lib/inspector-stats";
import { jobsWithInspectorNotesNeedingAdmin } from "@/lib/job-wm";
import { WmPortfolioView } from "@/app/WmPortfolioView";
import type { JobWmJob } from "@/lib/job-wm";

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

function fmtDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Dziś";
  if (diffDays === 1) return "Wczoraj";
  if (diffDays < 7) return `${diffDays} dni temu`;
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function groupByDay(items: InspectorFeedItem[]): { label: string; items: InspectorFeedItem[] }[] {
  const map = new Map<string, InspectorFeedItem[]>();
  for (const item of items) {
    const day = item.at.slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(item);
  }
  return [...map.entries()].map(([day, dayItems]) => ({
    label: fmtDateShort(day + "T12:00:00"),
    items: dayItems,
  }));
}

function FeedCard({
  item,
  onOpenJob,
}: {
  item: InspectorFeedItem;
  onOpenJob: (jobId: string) => void;
}) {
  const isFile = item.type === "inspector_file";
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${isFile ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-blue-500/10 text-blue-500"}`}>
          {isFile ? <Upload size={16}/> : <CheckCircle2 size={16}/>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{item.text}</p>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="text-foreground/80 font-medium">{item.actor}</span>
            {" · "}
            {fmtDateTime(item.at)}
          </p>
          <button
            type="button"
            onClick={() => onOpenJob(item.jobId)}
            className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:underline text-left"
          >
            <MapPin size={11} className="shrink-0"/>
            <span className="truncate">
              {item.jobAddress || "Bez adresu"}
              {item.jobFlat ? ` m.${item.jobFlat}` : ""}
              {item.jobClient ? ` · ${item.jobClient}` : ""}
            </span>
            <ChevronRight size={11} className="shrink-0"/>
          </button>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${item.jobStatus === "completed" ? "bg-green-500/15 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
          {item.jobStatus === "completed" ? "Zdana" : "W trakcie"}
        </span>
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
  onOpenJob,
}: {
  jobs: JobWithActivity[];
  onOpenJob: (jobId: string) => void;
}) {
  const [tab, setTab] = useState<"activity" | "portfolio">("activity");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKind>("all");
  const [statsStore, setStatsStore] = useState<InspectorStatsStore | null>(null);

  const notesNeedingAdmin = useMemo(
    () => jobsWithInspectorNotesNeedingAdmin(jobs as JobWmJob[], getJobNotesSeenAt()).length,
    [jobs],
  );

  useEffect(() => {
    syncInspectorStatsFromCloud().then(setStatsStore).catch(() => setStatsStore(null));
  }, []);

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

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  const stats = useMemo(() => ({
    total: feed.length,
    docs: feed.filter((i) => i.type === "inspector_document").length,
    files: feed.filter((i) => i.type === "inspector_file").length,
    jobs: new Set(feed.map((i) => i.jobId)).size,
  }), [feed]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 sm:px-6 py-3 border-b border-border bg-card/50 shrink-0 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("activity")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium ${tab === "activity" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
        >
          <ClipboardCheck size={13}/> Aktywność
        </button>
        <button
          type="button"
          onClick={() => setTab("portfolio")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium ${tab === "portfolio" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
        >
          <LayoutGrid size={13}/> Portfolio WM
        </button>
      </div>

      {tab === "portfolio" ? (
        <WmPortfolioView jobs={jobs as JobWmJob[]} onOpenJob={onOpenJob} notesNeedingAdmin={notesNeedingAdmin}/>
      ) : (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 sm:px-6 py-4 border-b border-border bg-card/50 shrink-0 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <ClipboardCheck size={20} className="text-emerald-600 dark:text-emerald-400"/>
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Aktywność inspektora</h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Dokumenty, zlecenia i kosztorysy dodane przez inspektora — osobno od zakładki Roboty.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Wszystkie", value: stats.total },
            { label: "Dokumenty", value: stats.docs },
            { label: "Pliki", value: stats.files },
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
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <LogIn size={12}/> Statystyki logowań i wejść
            </p>
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

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj adresu, klienta, inspektora…"
              className="w-full bg-secondary rounded-xl pl-9 pr-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex gap-1.5 shrink-0">
            {([
              { key: "all" as const, label: "Wszystko" },
              { key: "inspector_document" as const, label: "Dokumenty" },
              { key: "inspector_file" as const, label: "Pliki" },
            ]).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                {f.key !== "all" && <Filter size={11}/>}
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-6" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
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
          grouped.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">{group.label}</p>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <FeedCard key={item.id} item={item} onOpenJob={onOpenJob}/>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
      )}
    </div>
  );
}
