import { useMemo, useState } from "react";
import {
  LayoutDashboard, FileText, MessageSquare, ChevronRight, Zap,
  AlertTriangle, CheckCircle2, Calendar, FileWarning, BarChart3, FileDown, Cloud, Circle,
  HardHat, AlertCircle, Camera, ClipboardCheck,
} from "lucide-react";
import { InspectorJobCard } from "@/app/InspectorJobCard";
import { InspectorProgressBar } from "@/app/InspectorProgressBar";
import type { InspectorJobSection } from "@/app/InspectorNavigation";
import {
  buildFileDeliveryAlerts,
  buildMissingDocAlerts,
  buildReadyNoDateAlerts,
  buildActionCenterItems,
  buildTodayJobs,
  computeInspectionProgress,
  computeInspectorKpiStats,
  daysUntilHandover,
  type InspectorDashboardJob,
  type DashboardFilter,
  type QuickMarkDoc,
  type InspectorActionCenterItem,
} from "@/lib/inspector-dashboard";
import { DOC_LABELS, isReportSyncedDocLocked } from "@/lib/job-documents";
import { inferHandoverStage, plannedHandoverStatus, HANDOVER_STAGE_LABELS } from "@/lib/job-wm";
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
  { id: "admin", label: "Od administratora" },
  { id: "pliki", label: "Pliki" },
  { id: "dokumenty", label: "Dokumenty" },
  { id: "terminy", label: "Terminy" },
];

const KPI_TILES = [
  { key: "active" as const, label: "Aktywne", icon: HardHat },
  { key: "attention" as const, label: "Wymagają uwagi", icon: AlertCircle },
  { key: "completed" as const, label: "Zakończone", icon: ClipboardCheck },
  { key: "pendingPhotos" as const, label: "Zdjęcia oczekujące", icon: Camera },
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
  const [showLegacyAlerts, setShowLegacyAlerts] = useState(false);

  const kpi = useMemo(
    () => computeInspectorKpiStats(jobs, adminNotesPending),
    [jobs, adminNotesPending],
  );

  const weekStats = useMemo(() => statsForWeek(jobs, displayName), [jobs, displayName]);
  const todayJobs = useMemo(() => buildTodayJobs(jobs), [jobs]);
  const actionCenter = useMemo(
    () => buildActionCenterItems(jobs, adminNotesPending, 3),
    [jobs, adminNotesPending],
  );

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

  const allClear = actionCenter.length === 0 && todayJobs.length === 0;

  const showAdmin = filter === "all" || filter === "admin";
  const showFiles = filter === "all" || filter === "pliki";
  const showDocs = filter === "all" || filter === "dokumenty";
  const showTerminy = filter === "all" || filter === "terminy";

  const now = new Date();
  const reportMonth = now.getMonth();
  const reportYear = now.getFullYear();

  const kpiValues: Record<(typeof KPI_TILES)[number]["key"], number> = {
    active: kpi.activeCount,
    attention: kpi.needsAttentionCount,
    completed: kpi.completedCount,
    pendingPhotos: kpi.pendingPhotosCount,
  };

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

  const handleAction = (item: InspectorActionCenterItem) => {
    if (item.doc && (item.kind === "missing_file" || item.kind === "missing_doc")) {
      onMarkDoc(item.job.id, item.doc);
      return;
    }
    onOpenJob(item.job.id, item.section);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight">{inspectorGreeting(displayName)}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {allClear
            ? "Wszystko na bieżąco — brak pilnych kontroli na dziś."
            : actionCenter.length === 1
              ? "1 sprawa wymaga działania — centrum działań poniżej."
              : `${actionCenter.length} spraw w centrum działań · ${todayJobs.length} na dziś / wkrótce`}
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {KPI_TILES.map(({ key, label, icon: Icon }) => {
          const value = kpiValues[key];
          const accent =
            key === "attention" && value > 0 ? "border-red-500/30 bg-red-500/5"
              : key === "pendingPhotos" && value > 0 ? "border-amber-500/30 bg-amber-500/5"
                : key === "active" ? "border-sky-500/25 bg-sky-500/5"
                  : key === "completed" ? "border-emerald-500/25 bg-emerald-500/5"
                    : "border-border bg-secondary/40";
          const valueCls =
            key === "attention" && value > 0 ? "text-red-500"
              : key === "pendingPhotos" && value > 0 ? "text-amber-500"
                : "text-foreground";
          return (
            <div
              key={key}
              className={`shrink-0 min-w-[7.5rem] rounded-xl border px-3 py-2.5 ${accent}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={13} className="text-muted-foreground shrink-0"/>
                <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
              </div>
              <p
                className={`text-xl font-semibold tabular-nums ${valueCls}`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {value}
              </p>
            </div>
          );
        })}
      </div>

      {actionCenter.length > 0 && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-primary/15 flex items-center gap-2">
            <Zap size={15} className="text-primary shrink-0"/>
            <p className="text-sm font-semibold">Centrum działań</p>
            <span className="text-[10px] text-muted-foreground ml-auto">maks. 3</span>
          </div>
          <div className="divide-y divide-border/60">
            {actionCenter.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.job.address || "Bez adresu"}
                    {item.job.flatNumber && ` m.${item.job.flatNumber}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAction(item)}
                  className="shrink-0 px-3 py-2.5 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-xs font-medium touch-manipulation"
                >
                  {item.doc && (item.kind === "missing_file" || item.kind === "missing_doc") ? "Oznacz" : "Otwórz"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {todayJobs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-amber-500"/>
            <p className="text-sm font-semibold">Dzisiaj i wkrótce</p>
          </div>
          <div className="space-y-2">
            {todayJobs.slice(0, 6).map((job) => {
              const progress = computeInspectionProgress(job);
              const days = daysUntilHandover(job.plannedHandoverDate || "");
              const stage = inferHandoverStage(job);
              return (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => onOpenJob(job.id, "wm")}
                  className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors touch-manipulation"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {days === 0 ? "🟠 " : days != null && days < 0 ? "🔴 " : ""}
                        {job.address || "Bez adresu"}
                        {job.flatNumber && <span className="text-muted-foreground font-normal"> m.{job.flatNumber}</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {days === 0 ? "Odbiór dziś" : days != null && days < 0 ? `Termin minął (${Math.abs(days)} dni)` : `Za ${days} dni`}
                        {" · "}{HANDOVER_STAGE_LABELS[stage]}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-1"/>
                  </div>
                  <InspectorProgressBar percent={progress.percent} className="mt-2.5"/>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {allClear && (
        <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/25 rounded-xl px-4 py-3 text-sm text-green-700 dark:text-green-300">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5"/>
          <p>Wszystko na bieżąco — brak pilnych spraw na pulpicie.</p>
        </div>
      )}

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

      <button
        type="button"
        onClick={() => setShowLegacyAlerts((v) => !v)}
        className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-2 min-h-[44px] rounded-lg border border-border bg-secondary/30 touch-manipulation"
      >
        <LayoutDashboard size={13}/>
        {showLegacyAlerts ? "Ukryj szczegółowe alerty" : "Pokaż szczegółowe alerty i filtry"}
      </button>

      {showLegacyAlerts && (
        <>
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

          <div className="bg-secondary/40 border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileDown size={16} className="text-primary shrink-0"/>
              <p className="text-sm font-semibold">Raport PDF</p>
            </div>
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

          {showAdmin && adminNotesPending.length > 0 && (
            <AlertSection title={`Odpowiedź od administratora (${adminNotesPending.length})`} icon={MessageSquare} accent="violet" hint="Administrator odpisał — sprawdź notatki w sekcji Odbiór WM.">
              {adminNotesPending.map((job) => (
                <InspectorJobCard key={job.id} job={job} hasAdminReply onSelect={() => onOpenJob(job.id, "wm")} compact/>
              ))}
            </AlertSection>
          )}

          {showFiles && fileAlerts.length > 0 && (
            <AlertSection
              title={`Zlecenie / kosztorys (${fileAlerts.length})`}
              icon={FileText}
              accent={fileAlertsNeedingAction.length > 0 ? "red" : "ok"}
              hint="Tapnij, aby oznaczyć „jest” lub otwórz robotę."
            >
              {fileAlerts.map((alert) => (
                <LegacyFileRow key={alert.job.id} alert={alert} onOpen={() => onOpenJob(alert.job.id, "files")} onMarkDoc={onMarkDoc}/>
              ))}
            </AlertSection>
          )}

          {showTerminy && overdueJobs.length > 0 && (
            <AlertSection title={`Termin minął (${overdueJobs.length})`} icon={Calendar} accent="amber" hint="Zaktualizuj datę lub etap WM.">
              {overdueJobs.map((job) => (
                <InspectorJobCard key={`overdue-${job.id}`} job={job} onSelect={() => onOpenJob(job.id, "wm")} compact/>
              ))}
            </AlertSection>
          )}

          {showDocs && docAlerts.length > 0 && (
            <AlertSection title={`Brakujące dokumenty (${docAlerts.length})`} icon={FileWarning} accent="red" hint="Oznacz „Jest” jednym tapnięciem.">
              {docAlerts.map((alert) => (
                <div key={alert.job.id} className="px-4 py-3 border-b border-border/60 last:border-0">
                  <InspectorJobCard job={alert.job} onSelect={() => onOpenJob(alert.job.id, "docs")} compact/>
                  <div className="flex flex-wrap gap-1 mt-2 pl-1">
                    {alert.missingDocs.slice(0, 3).map((doc) => (
                      <QuickBtn key={doc} label={`${shortDocLabel(doc)} ✓`} onClick={() => onMarkDoc(alert.job.id, doc)}/>
                    ))}
                  </div>
                </div>
              ))}
            </AlertSection>
          )}

          {showTerminy && readyNoDate.length > 0 && (
            <AlertSection title={`Gotowe — brak daty (${readyNoDate.length})`} icon={Calendar} accent="amber" hint="Ustaw datę odbioru WM.">
              {readyNoDate.map((alert) => (
                <InspectorJobCard key={alert.job.id} job={alert.job} onSelect={() => onOpenJob(alert.job.id, "wm")} compact/>
              ))}
            </AlertSection>
          )}
        </>
      )}
    </div>
  );
}

function LegacyFileRow({
  alert,
  onOpen,
  onMarkDoc,
}: {
  alert: ReturnType<typeof buildFileDeliveryAlerts>[number];
  onOpen: () => void;
  onMarkDoc: (jobId: string, doc: QuickMarkDoc) => void;
}) {
  return (
    <div className="px-4 py-3 flex flex-col gap-2">
      <InspectorJobCard job={alert.job} onSelect={onOpen} compact/>
      <div className="flex flex-wrap gap-1">
        {(["zlecenie", "kosztorys"] as const).map((doc) => (
          <DocFileToggle
            key={doc}
            doc={doc}
            checked={!!alert.job.documents[doc]}
            locked={!!alert.job.documents[doc] && isReportSyncedDocLocked(alert.job, doc)}
            onClick={() => onMarkDoc(alert.job.id, doc)}
          />
        ))}
      </div>
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
      title={locked ? `${label} — zablokowane` : checked ? `${label} — jest` : `Oznacz: ${label}`}
      onClick={(e) => { e.stopPropagation(); if (!locked) onClick(); }}
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-2 min-h-[44px] rounded-md border transition-all touch-manipulation shrink-0 ${
        locked
          ? "bg-green-500/12 text-green-700 dark:text-green-300 border-green-500/35 cursor-default"
          : checked
            ? "bg-green-500/12 text-green-700 dark:text-green-300 border-green-500/35"
            : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/25"
      }`}
    >
      {checked ? <CheckCircle2 size={10}/> : <Circle size={10}/>}
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
  return (
    <div className={`rounded-xl border overflow-hidden ${border}`}>
      <div className="px-4 py-3 border-b border-border/60 space-y-1">
        <p className="text-sm font-semibold flex items-center gap-1.5"><Icon size={14}/>{title}</p>
        <p className="text-[11px] text-muted-foreground leading-snug flex items-start gap-1">
          <AlertTriangle size={11} className="shrink-0 mt-0.5 opacity-70"/>{hint}
        </p>
      </div>
      <div>{children}</div>
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
