import { useMemo, useState } from "react";
import {
  LayoutDashboard, FileText, MessageSquare, ChevronRight,
  AlertTriangle, CheckCircle2, Calendar, FileWarning, BarChart3, FileDown, Cloud, Circle,
} from "lucide-react";
import { JobWmStageBadge, JobWmPlannedBadge } from "@/app/JobWmPanel";
import type { InspectorJobSection } from "@/app/InspectorNavigation";
import {
  buildFileDeliveryAlerts,
  buildMissingDocAlerts,
  buildReadyNoDateAlerts,
  computeInspectorDashboardStats,
  planStatusBadge,
  type InspectorDashboardJob,
  type DashboardFilter,
  type QuickMarkDoc,
} from "@/lib/inspector-dashboard";
import { DOC_LABELS, isReportSyncedDocLocked } from "@/lib/job-documents";
import { inferHandoverStage, plannedHandoverStatus } from "@/lib/job-wm";
import { inspectorGreeting, statsForWeek, MONTH_NAMES_PL } from "@/lib/inspector-activity-stats";
import { downloadInspectorMonthReportPdf, downloadInspectorYearReportPdf } from "@/lib/inspector-report-pdf";
import { toast } from "sonner";

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

const FILTER_OPTIONS: { id: DashboardFilter; label: string }[] = [
  { id: "all", label: "Wszystko" },
  { id: "admin", label: "Admin" },
  { id: "pliki", label: "Pliki" },
  { id: "dokumenty", label: "Dokumenty" },
  { id: "terminy", label: "Terminy" },
];

export function InspectorDashboard({
  jobs,
  displayName,
  adminNotesPending,
  onOpenJob,
  onMarkDoc,
}: {
  jobs: InspectorDashboardJob[];
  displayName: string;
  adminNotesPending: InspectorDashboardJob[];
  onOpenJob: (jobId: string, section?: InspectorJobSection) => void;
  onMarkDoc: (jobId: string, doc: QuickMarkDoc) => void;
}) {
  const [filter, setFilter] = useState<DashboardFilter>("all");
  const [pdfBusy, setPdfBusy] = useState<"month" | "year" | null>(null);

  const stats = useMemo(
    () => computeInspectorDashboardStats(jobs, adminNotesPending.length),
    [jobs, adminNotesPending.length],
  );

  const weekStats = useMemo(() => statsForWeek(jobs, displayName), [jobs, displayName]);

  const fileAlerts = useMemo(() => buildFileDeliveryAlerts(jobs), [jobs]);
  const docAlerts = useMemo(() => buildMissingDocAlerts(jobs), [jobs]);
  const readyNoDate = useMemo(() => buildReadyNoDateAlerts(jobs), [jobs]);

  const overdueJobs = useMemo(
    () => jobs
      .filter((j) => j.status === "in_progress" && j.plannedHandoverDate)
      .filter((j) => plannedHandoverStatus(j.plannedHandoverDate || "", inferHandoverStage(j)) === "overdue")
      .sort((a, b) => (a.plannedHandoverDate || "").localeCompare(b.plannedHandoverDate || "")),
    [jobs],
  );

  const fileAlertsNeedingAction = useMemo(
    () => fileAlerts.filter((a) => a.missingZlecenie || a.missingKosztorys),
    [fileAlerts],
  );

  const urgentCount = useMemo(() => {
    const ids = new Set<string>();
    adminNotesPending.forEach((j) => ids.add(j.id));
    fileAlertsNeedingAction.forEach((a) => ids.add(a.job.id));
    docAlerts.forEach((a) => ids.add(a.job.id));
    readyNoDate.forEach((a) => ids.add(a.job.id));
    overdueJobs.forEach((j) => ids.add(j.id));
    return ids.size;
  }, [adminNotesPending, fileAlertsNeedingAction, docAlerts, readyNoDate, overdueJobs]);

  const allClear =
    adminNotesPending.length === 0
    && fileAlertsNeedingAction.length === 0
    && docAlerts.length === 0
    && readyNoDate.length === 0
    && overdueJobs.length === 0;

  const showAdmin = filter === "all" || filter === "admin";
  const showFiles = filter === "all" || filter === "pliki";
  const showDocs = filter === "all" || filter === "dokumenty";
  const showTerminy = filter === "all" || filter === "terminy";

  const now = new Date();
  const reportMonth = now.getMonth();
  const reportYear = now.getFullYear();

  const handleMonthPdf = async () => {
    setPdfBusy("month");
    try {
      await downloadInspectorMonthReportPdf(jobs, displayName, reportYear, reportMonth);
      toast.success("Raport miesiąca gotowy");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się wygenerować PDF");
    } finally {
      setPdfBusy(null);
    }
  };

  const handleYearPdf = async () => {
    setPdfBusy("year");
    try {
      await downloadInspectorYearReportPdf(jobs, displayName, reportYear);
      toast.success("Raport roczny gotowy");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się wygenerować PDF");
    } finally {
      setPdfBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{inspectorGreeting(displayName)}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {allClear
            ? "Wszystko na bieżąco — brak pilnych spraw na pulpicie."
            : urgentCount === 1
              ? "Masz 1 pilną sprawę — poniżej posortowane wg terminu odbioru."
              : `Masz ${urgentCount} pilne sprawy — poniżej posortowane wg terminu odbioru.`}
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setFilter(opt.id)}
            className={`shrink-0 px-3 py-2.5 min-h-[44px] rounded-full text-xs font-medium transition-colors touch-manipulation ${
              filter === opt.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <StatTile label="Aktywne" value={stats.activeCount}/>
        <StatTile label="Bez zlecenia" value={stats.missingZlecenie} accent={stats.missingZlecenie > 0 ? "red" : "ok"}/>
        <StatTile label="Bez kosztorysu" value={stats.missingKosztorys} accent={stats.missingKosztorys > 0 ? "red" : "ok"}/>
        <StatTile label="Termin minął" value={stats.overdue} accent={stats.overdue > 0 ? "red" : "ok"}/>
        <StatTile label="Odbiór ≤7 dni" value={stats.soon} accent={stats.soon > 0 ? "amber" : "ok"}/>
        <StatTile label="Odpowiedzi admina" value={adminNotesPending.length} accent={adminNotesPending.length > 0 ? "violet" : "ok"}/>
      </div>

      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <BarChart3 size={18} className="text-emerald-600 dark:text-emerald-400"/>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Twoja robota w tym tygodniu</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Od poniedziałku · wg dziennika aktywności</p>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <MiniStat label="Roboty" value={weekStats.jobsTouched}/>
          <MiniStat label="Dokumenty" value={weekStats.documentsMarked}/>
          <MiniStat label="Pliki" value={weekStats.filesUploaded}/>
          <MiniStat label="Zdjęcia" value={weekStats.photosUploaded}/>
          <MiniStat label="Notatki" value={weekStats.notesSent}/>
          <MiniStat label="Etapy" value={weekStats.stageUpdates}/>
        </div>
      </div>

      <div className="bg-secondary/40 border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileDown size={16} className="text-primary shrink-0"/>
          <p className="text-sm font-semibold">Raport PDF</p>
        </div>
        <p className="text-[11px] text-muted-foreground">Podsumowanie Twojej aktywności — do archiwum lub rozliczeń.</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pdfBusy !== null}
            onClick={handleMonthPdf}
            className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-xs font-medium touch-manipulation disabled:opacity-50"
          >
            <FileText size={14}/>
            {pdfBusy === "month" ? "Generuję…" : `Mój miesiąc (${MONTH_NAMES_PL[reportMonth]})`}
          </button>
          <button
            type="button"
            disabled={pdfBusy !== null}
            onClick={handleYearPdf}
            className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-lg bg-secondary text-foreground text-xs font-medium border border-border touch-manipulation disabled:opacity-50"
          >
            <Cloud size={14}/>
            {pdfBusy === "year" ? "Generuję…" : `Mój rok (${reportYear})`}
          </button>
        </div>
      </div>

      {allClear && filter === "all" && (
        <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/25 rounded-xl px-4 py-3 text-sm text-green-700 dark:text-green-300">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5"/>
          <p>Wszystko na bieżąco — brak pilnych spraw na pulpicie.</p>
        </div>
      )}

      {showAdmin && adminNotesPending.length > 0 && (
        <AlertSection title={`Odpowiedź od admina (${adminNotesPending.length})`} icon={MessageSquare} accent="violet" hint="Admin odpisał — sprawdź notatki w sekcji Odbiór WM.">
          {adminNotesPending.map((job) => (
            <JobRow key={job.id} job={job} badges={[{ text: "Nowa odpowiedź", tone: "violet" }]} onOpen={() => onOpenJob(job.id, "wm")}/>
          ))}
        </AlertSection>
      )}

      {showFiles && fileAlerts.length > 0 && (
        <AlertSection
          title={`Zlecenie / kosztorys (${fileAlerts.length} ${fileAlerts.length === 1 ? "robota" : "robot"})`}
          icon={FileText}
          accent={fileAlertsNeedingAction.length > 0 ? "red" : "ok"}
          hint="Kółka jak w panelu admina — tapnij, aby oznaczyć „jest” lub odznaczyć. Robota zostaje na liście; bez wgrywania pliku, jeśli poszło mailem."
        >
          {fileAlerts.map((alert) => {
            const planBadge = planStatusBadge(alert.planStatus, alert.job.plannedHandoverDate);
            return (
              <JobRow
                key={alert.job.id}
                job={alert.job}
                badges={[
                  planBadge ? { text: planBadge.text, tone: planBadge.tone === "red" ? "red" : "amber" } : null,
                  alert.missingZlecenie ? { text: "Brak zlecenia", tone: "red" } : null,
                  alert.missingKosztorys ? { text: "Brak kosztorysu", tone: "red" } : null,
                ].filter(Boolean) as { text: string; tone: "amber" | "red" | "violet" }[]}
                onOpen={() => onOpenJob(alert.job.id, "files")}
                actions={
                  <>
                    {(["zlecenie", "kosztorys"] as const).map((doc) => (
                      <DocFileToggle
                        key={doc}
                        doc={doc}
                        checked={!!alert.job.documents[doc]}
                        locked={!!alert.job.documents[doc] && isReportSyncedDocLocked(alert.job, doc)}
                        onClick={() => onMarkDoc(alert.job.id, doc)}
                      />
                    ))}
                  </>
                }
              />
            );
          })}
        </AlertSection>
      )}

      {showTerminy && overdueJobs.length > 0 && (
        <AlertSection title={`Termin odbioru minął (${overdueJobs.length})`} icon={Calendar} accent="amber" hint="Zaktualizuj datę odbioru lub etap WM — kliknij robotę.">
          {overdueJobs.map((job) => {
            const planBadge = planStatusBadge("overdue", job.plannedHandoverDate);
            return (
              <JobRow
                key={`overdue-${job.id}`}
                job={job}
                badges={planBadge ? [{ text: planBadge.text, tone: "red" }] : [{ text: "Termin minął", tone: "red" }]}
                onOpen={() => onOpenJob(job.id, "wm")}
              />
            );
          })}
        </AlertSection>
      )}

      {showDocs && docAlerts.length > 0 && (
        <AlertSection title={`Brakujące dokumenty (${docAlerts.length})`} icon={FileWarning} accent="red" hint="Kominiarz, pomiary, oświadczenia… — oznacz „Jest” jednym tapnięciem.">
          {docAlerts.map((alert) => (
            <JobRow
              key={alert.job.id}
              job={alert.job}
              subtitle={`Brakuje: ${alert.missingLabels.slice(0, 4).join(", ")}${alert.missingLabels.length > 4 ? "…" : ""}`}
              onOpen={() => onOpenJob(alert.job.id, "docs")}
              actions={
                <>
                  {alert.missingDocs.slice(0, 3).map((doc) => (
                    <QuickBtn
                      key={doc}
                      label={`${shortDocLabel(doc)} ✓`}
                      onClick={() => onMarkDoc(alert.job.id, doc)}
                    />
                  ))}
                </>
              }
            />
          ))}
        </AlertSection>
      )}

      {showTerminy && readyNoDate.length > 0 && (
        <AlertSection title={`Gotowe do odbioru — brak daty (${readyNoDate.length})`} icon={Calendar} accent="amber" hint="Ustaw planowaną datę odbioru WM w sekcji Odbiór WM.">
          {readyNoDate.map((alert) => (
            <JobRow key={alert.job.id} job={alert.job} badges={[{ text: "Ustaw datę odbioru", tone: "amber" }]} onOpen={() => onOpenJob(alert.job.id, "wm")}/>
          ))}
        </AlertSection>
      )}

      {!allClear && filter !== "all" && (
        (filter === "admin" && adminNotesPending.length === 0)
        || (filter === "pliki" && fileAlerts.length === 0)
        || (filter === "dokumenty" && docAlerts.length === 0)
        || (filter === "terminy" && overdueJobs.length === 0 && readyNoDate.length === 0)
      ) && (
        <p className="text-xs text-muted-foreground text-center py-6">Brak spraw w tym filtrze.</p>
      )}
    </div>
  );
}

function shortDocLabel(doc: QuickMarkDoc): string {
  const full = DOC_LABELS[doc];
  if (full.length <= 14) return full;
  return full.split(" ")[0] || full.slice(0, 12);
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background/60 rounded-lg px-2 py-2 border border-border/60 text-center">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">{label}</p>
      <p className="text-base font-semibold mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{value}</p>
    </div>
  );
}

function StatTile({ label, value, accent = "neutral" }: { label: string; value: number; accent?: "red" | "violet" | "amber" | "ok" | "neutral" }) {
  const valueCls =
    accent === "red" ? "text-red-400"
      : accent === "violet" ? "text-violet-500 dark:text-violet-400"
        : accent === "amber" ? "text-amber-400"
          : accent === "ok" ? "text-green-500 dark:text-green-400"
            : "text-foreground";
  return (
    <div className="bg-secondary/50 rounded-xl px-3 py-2.5 border border-border">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold mt-0.5 ${valueCls}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>{value}</p>
    </div>
  );
}

function DocFileToggle({
  doc,
  checked,
  locked,
  onClick,
}: {
  doc: "zlecenie" | "kosztorys";
  checked: boolean;
  locked: boolean;
  onClick: () => void;
}) {
  const label = DOC_LABELS[doc];
  return (
    <button
      type="button"
      title={
        locked
          ? `${label} — potwierdzone raportem (nie można odznaczyć)`
          : checked
            ? `${label} — jest (kliknij, aby odznaczyć)`
            : `Oznacz jako odebrane: ${label}`
      }
      onClick={(e) => { e.stopPropagation(); if (!locked) onClick(); }}
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-2 min-h-[44px] rounded-md border transition-all touch-manipulation shrink-0 ${
        locked
          ? "bg-green-500/12 text-green-700 dark:text-green-300 border-green-500/35 cursor-default"
          : checked
            ? "bg-green-500/12 text-green-700 dark:text-green-300 border-green-500/35 hover:bg-green-500/20 active:scale-[0.97]"
            : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/25 hover:bg-green-500/15 hover:text-green-700 hover:border-green-500/30 dark:hover:text-green-300 active:scale-[0.97]"
      }`}
    >
      {checked ? (
        <CheckCircle2 size={10} className="shrink-0"/>
      ) : (
        <Circle size={10} className="shrink-0 opacity-70"/>
      )}
      {label}
    </button>
  );
}

function AlertSection({ title, hint, icon: Icon, accent, children }: { title: string; hint: string; icon: typeof FileText; accent: "red" | "violet" | "amber" | "ok"; children: React.ReactNode }) {
  const border =
    accent === "violet" ? "border-violet-500/25 bg-violet-500/5"
      : accent === "amber" ? "border-amber-500/25 bg-amber-500/5"
        : accent === "ok" ? "border-green-500/25 bg-green-500/5"
          : "border-red-500/25 bg-red-500/5";
  const titleCls =
    accent === "violet" ? "text-violet-700 dark:text-violet-300"
      : accent === "amber" ? "text-amber-700 dark:text-amber-300"
        : accent === "ok" ? "text-green-700 dark:text-green-300"
          : "text-red-700 dark:text-red-300";
  return (
    <div className={`rounded-xl border overflow-hidden ${border}`}>
      <div className="px-4 py-3 border-b border-border/60 space-y-1">
        <p className={`text-sm font-semibold flex items-center gap-1.5 ${titleCls}`}>
          <Icon size={14}/>{title}
        </p>
        <p className="text-[11px] text-muted-foreground leading-snug flex items-start gap-1">
          <AlertTriangle size={11} className="shrink-0 mt-0.5 opacity-70"/>{hint}
        </p>
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </div>
  );
}

function QuickBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="text-xs font-semibold px-3 py-2.5 min-h-[44px] rounded-lg bg-emerald-600 text-white hover:bg-emerald-600/90 touch-manipulation shrink-0 max-w-[140px] truncate"
      title={label}
    >
      {label}
    </button>
  );
}

function JobRow({
  job,
  badges,
  subtitle,
  actions,
  onOpen,
}: {
  job: InspectorDashboardJob;
  badges?: { text: string; tone: "amber" | "red" | "violet" }[];
  subtitle?: string;
  actions?: React.ReactNode;
  onOpen: () => void;
}) {
  return (
    <div className="px-4 py-3 flex items-start gap-2 hover:bg-secondary/30 transition-colors">
      <button type="button" onClick={onOpen} className="flex-1 min-w-0 text-left touch-manipulation">
        <p className="font-semibold text-sm truncate">
          {job.address || "Bez adresu"}
          {job.flatNumber && <span className="text-muted-foreground"> m.{job.flatNumber}</span>}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{job.client || "—"}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{subtitle}</p>}
        <p className="text-[10px] text-muted-foreground mt-1">Start: {fmtDate(job.startDate)}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <JobWmStageBadge job={job}/>
          <JobWmPlannedBadge job={job}/>
          {badges?.map((b) => (
            <span key={b.text} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              b.tone === "violet" ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                : b.tone === "amber" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  : "bg-red-500/10 text-red-400"
            }`}>{b.text}</span>
          ))}
        </div>
      </button>
      <div className="flex flex-col items-end gap-2 shrink-0 pt-0.5 max-w-[40%]">
        <div className="flex flex-wrap justify-end gap-1">{actions}</div>
        <button type="button" onClick={onOpen} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Otwórz">
          <ChevronRight size={16}/>
        </button>
      </div>
    </div>
  );
}
