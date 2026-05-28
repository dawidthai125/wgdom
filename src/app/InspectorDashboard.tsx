import { useMemo } from "react";
import {
  LayoutDashboard, FileText, MessageSquare, ChevronRight,
  AlertTriangle, CheckCircle2, Calendar, FileWarning,
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
  type QuickMarkDoc,
} from "@/lib/inspector-dashboard";
import { inferHandoverStage, plannedHandoverStatus } from "@/lib/job-wm";

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function InspectorDashboard({
  jobs,
  adminNotesPending,
  onOpenJob,
  onMarkDoc,
}: {
  jobs: InspectorDashboardJob[];
  adminNotesPending: InspectorDashboardJob[];
  onOpenJob: (jobId: string, section?: InspectorJobSection) => void;
  onMarkDoc: (jobId: string, doc: QuickMarkDoc) => void;
}) {
  const stats = useMemo(
    () => computeInspectorDashboardStats(jobs, adminNotesPending.length),
    [jobs, adminNotesPending.length],
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

  const allClear =
    adminNotesPending.length === 0
    && fileAlerts.length === 0
    && docAlerts.length === 0
    && readyNoDate.length === 0
    && overdueJobs.length === 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <LayoutDashboard size={20} className="text-primary"/>
        </div>
        <div>
          <h2 className="text-base font-semibold">Pulpit</h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Pilne sprawy posortowane wg terminu odbioru. Zlecenie/kosztorys — oznacz „Jest” jednym tapnięciem (plik opcjonalny).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <StatTile label="Aktywne" value={stats.activeCount}/>
        <StatTile label="Bez zlecenia" value={stats.missingZlecenie} accent={stats.missingZlecenie > 0 ? "red" : "ok"}/>
        <StatTile label="Bez kosztorysu" value={stats.missingKosztorys} accent={stats.missingKosztorys > 0 ? "red" : "ok"}/>
        <StatTile label="Termin minął" value={stats.overdue} accent={stats.overdue > 0 ? "red" : "ok"}/>
        <StatTile label="Odbiór ≤7 dni" value={stats.soon} accent={stats.soon > 0 ? "amber" : "ok"}/>
        <StatTile label="Odpowiedzi admina" value={adminNotesPending.length} accent={adminNotesPending.length > 0 ? "violet" : "ok"}/>
      </div>

      {allClear && (
        <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/25 rounded-xl px-4 py-3 text-sm text-green-700 dark:text-green-300">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5"/>
          <p>Wszystko na bieżąco — brak pilnych spraw na pulpicie.</p>
        </div>
      )}

      {adminNotesPending.length > 0 && (
        <AlertSection title={`Odpowiedź od admina (${adminNotesPending.length})`} icon={MessageSquare} accent="violet" hint="Admin odpisał — sprawdź notatki w sekcji Odbiór WM.">
          {adminNotesPending.map((job) => (
            <JobRow key={job.id} job={job} badges={[{ text: "Nowa odpowiedź", tone: "violet" }]} onOpen={() => onOpenJob(job.id, "wm")}/>
          ))}
        </AlertSection>
      )}

      {fileAlerts.length > 0 && (
        <AlertSection
          title={`Zlecenie / kosztorys (${fileAlerts.length} ${fileAlerts.length === 1 ? "robota" : "robot"})`}
          icon={FileText}
          accent="red"
          hint="Każda robota tylko raz. Szybkie „Jest ✓” — bez wgrywania pliku, jeśli poszło mailem lub osobiście."
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
                    {alert.missingZlecenie && (
                      <QuickBtn label="Zlecenie ✓" onClick={() => onMarkDoc(alert.job.id, "zlecenie")}/>
                    )}
                    {alert.missingKosztorys && (
                      <QuickBtn label="Kosztorys ✓" onClick={() => onMarkDoc(alert.job.id, "kosztorys")}/>
                    )}
                  </>
                }
              />
            );
          })}
        </AlertSection>
      )}

      {overdueJobs.length > 0 && (
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

      {docAlerts.length > 0 && (
        <AlertSection title={`Brakujące dokumenty (${docAlerts.length})`} icon={FileWarning} accent="red" hint="Kominiarz, pomiary, oświadczenia… — zaznacz „Jest” w checklistcie dokumentów.">
          {docAlerts.map((alert) => (
            <JobRow
              key={alert.job.id}
              job={alert.job}
              subtitle={`Brakuje: ${alert.missingLabels.slice(0, 4).join(", ")}${alert.missingLabels.length > 4 ? "…" : ""}`}
              onOpen={() => onOpenJob(alert.job.id, "docs")}
            />
          ))}
        </AlertSection>
      )}

      {readyNoDate.length > 0 && (
        <AlertSection title={`Gotowe do odbioru — brak daty (${readyNoDate.length})`} icon={Calendar} accent="amber" hint="Ustaw planowaną datę odbioru WM w sekcji Odbiór WM.">
          {readyNoDate.map((alert) => (
            <JobRow key={alert.job.id} job={alert.job} badges={[{ text: "Ustaw datę odbioru", tone: "amber" }]} onOpen={() => onOpenJob(alert.job.id, "wm")}/>
          ))}
        </AlertSection>
      )}
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

function AlertSection({ title, hint, icon: Icon, accent, children }: { title: string; hint: string; icon: typeof FileText; accent: "red" | "violet" | "amber"; children: React.ReactNode }) {
  const border = accent === "violet" ? "border-violet-500/25 bg-violet-500/5" : accent === "amber" ? "border-amber-500/25 bg-amber-500/5" : "border-red-500/25 bg-red-500/5";
  const titleCls = accent === "violet" ? "text-violet-700 dark:text-violet-300" : accent === "amber" ? "text-amber-700 dark:text-amber-300" : "text-red-700 dark:text-red-300";
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
      className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-600/90 touch-manipulation shrink-0"
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
      <div className="flex flex-col items-end gap-2 shrink-0 pt-0.5">
        {actions}
        <button type="button" onClick={onOpen} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Otwórz">
          <ChevronRight size={16}/>
        </button>
      </div>
    </div>
  );
}
