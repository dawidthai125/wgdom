import { useMemo } from "react";
import {
  AlertTriangle, Archive, Wallet, Scale, Receipt, ClipboardCheck,
  Calendar, CalendarDays, MessageSquare, ChevronDown, ChevronUp,
} from "lucide-react";
import type { WeekEmployee, Job, PayrollJobConsistencyAlert } from "@/app/app-domain";
import type { JobDetailSection } from "@/app/JobDetailSectionNav";
import { fmt, fmtDate, consistencyAlertMessage } from "@/app/app-domain";
import { PAYROLL_WEEK_ROLLOVER_HOUR } from "@/lib/payroll-cycle";
import { getReportWorkScopeText } from "@/lib/work-scope-text";
import {
  fmtPlannedHandover, HANDOVER_STAGE_LABELS, inferHandoverStage,
} from "@/lib/job-wm";
import { resolveInspectorFeedDeepLink } from "@/lib/inspector-feed-deeplink";
import { JOB_LIST_STATUS_CONFIG, resolveJobListStatus } from "@/lib/job-list-status";
import type { UrgentCategoryId, UrgentTodayCategory } from "@/lib/dashboard-urgent-today";
import type { RecoverableChargesAlertsResult } from "@/lib/recoverable-charges";
import { fmtRecoverableAmount } from "@/lib/recoverable-charges";
import type { InspectorFeedItem } from "@/lib/job-activity";
import { WgButton, WgCard } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import { WG_FOCUS_RING, WG_TOUCH_MIN } from "@/lib/wg-ui-tokens";

type PendingPhoto = { photo: Job["photos"][number]; job: Job };
type PendingReceipt = { cost: NonNullable<WeekEmployee["extraCosts"]>[number]; emp: WeekEmployee };
type PendingReport = { report: ReturnType<typeof import("@/app/app-domain").jobWorkerReports>[number]; job: Job };

/** Ghost text CTA — S2: never primary */
const GHOST_LINK =
  "h-auto w-auto p-0 text-xs text-primary hover:underline shrink-0";

const ROW_BTN =
  "w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors";

const COUNT_BADGE =
  "text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-lg shrink-0";

export function DashboardPilneUwagiSection({
  urgentTodayTotal,
  categories,
  pilneExpanded,
  setPilneExpanded,
  expandedCategories,
  toggleCategory,
  pilneCollapsedSummary,
  needsUnsavedWeekAlert,
  needsPayrollBlockerAlert,
  weekFrom,
  weekTo,
  payrollRolloverBlockers,
  consistencyAlerts,
  pendingPhotos,
  pendingReceipts,
  pendingReports,
  handoverJobs,
  unseenInspectorFeed,
  wmOverdueJobs,
  wmThisWeekJobs,
  inspectorNotesPending,
  recoverableAlertStats,
  jobs,
  onNavigate,
  acknowledgeReport,
  markInspectorAlertsSeen,
  handleFixConsistency,
}: {
  urgentTodayTotal: number;
  categories: UrgentTodayCategory[];
  pilneExpanded: boolean;
  setPilneExpanded: (fn: (v: boolean) => boolean) => void;
  expandedCategories: Set<UrgentCategoryId>;
  toggleCategory: (id: UrgentCategoryId) => void;
  pilneCollapsedSummary: string;
  needsUnsavedWeekAlert: boolean;
  needsPayrollBlockerAlert: boolean;
  weekFrom: string;
  weekTo: string;
  payrollRolloverBlockers: WeekEmployee[];
  consistencyAlerts: PayrollJobConsistencyAlert[];
  pendingPhotos: PendingPhoto[];
  pendingReceipts: PendingReceipt[];
  pendingReports: PendingReport[];
  handoverJobs: Job[];
  unseenInspectorFeed: InspectorFeedItem[];
  wmOverdueJobs: Job[];
  wmThisWeekJobs: Job[];
  inspectorNotesPending: Job[];
  recoverableAlertStats: RecoverableChargesAlertsResult;
  jobs: Job[];
  onNavigate: (
    v: "payroll" | "directory" | "archive" | "jobs" | "schedule" | "inspector" | "recoverablecharges",
    jobId?: string,
    payrollEmpId?: string,
    jobSection?: JobDetailSection,
  ) => void;
  acknowledgeReport: (jobId: string, reportId: string) => void;
  markInspectorAlertsSeen: () => void;
  handleFixConsistency: (alert: PayrollJobConsistencyAlert) => void;
}) {
  const visibleCategories = useMemo(
    () => categories.filter((c) => c.count > 0),
    [categories],
  );

  if (urgentTodayTotal <= 0) return null;

  const renderCategoryBody = (id: UrgentCategoryId) => {
    switch (id) {
      case "place":
        return (
          <div className="divide-y divide-border/60">
            {needsUnsavedWeekAlert && (
              <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
                    <Archive size={14} className="text-primary shrink-0" />
                    Tydzień niezapisany w archiwum
                    <span className="text-xs text-muted-foreground font-normal">({fmtDate(weekFrom)} – {fmtDate(weekTo)})</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    W niedzielę (po {PAYROLL_WEEK_ROLLOVER_HOUR}:00 — nowy tydzień) tydzień zapisuje się automatycznie, gdy wszyscy rozliczeni. Zapisz ręcznie, jeśli auto-zapis nie zadziałał.
                  </p>
                </div>
                <WgButton type="button" variant="ghost" onClick={() => onNavigate("payroll")} className={GHOST_LINK}>
                  Zapisz tydzień →
                </WgButton>
              </div>
            )}
            {needsPayrollBlockerAlert && payrollRolloverBlockers.length > 0 && (
              <div className="px-4 sm:px-5 py-3.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Wallet size={14} className="text-yellow-400" />
                    Wypłata sobotnia bez rozliczenia
                  </p>
                  <WgButton type="button" variant="ghost" onClick={() => onNavigate("payroll")} className={GHOST_LINK}>
                    Lista płac →
                  </WgButton>
                </div>
                <div className="space-y-1.5">
                  {payrollRolloverBlockers.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => onNavigate("payroll", undefined, e.id)}
                      className={cn(ROW_BTN, WG_FOCUS_RING)}
                    >
                      <span className="text-foreground">{e.name || "—"}</span>
                      {" — nierozliczona kasa sobotnia"}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {consistencyAlerts.length > 0 && (
              <div className="px-4 sm:px-5 py-3.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Scale size={14} className="text-orange-400" />
                    Spójność listy płac ↔ roboty
                  </p>
                  <WgButton type="button" variant="ghost" onClick={() => onNavigate("payroll")} className={GHOST_LINK}>
                    Lista płac →
                  </WgButton>
                </div>
                <div className="space-y-2">
                  {consistencyAlerts.map((a, i) => {
                    const canFix =
                      a.kind !== "payroll_only" ||
                      jobs.some((j) => j.status === "in_progress");
                    return (
                      <div key={`${a.name}-${a.dateIso}-${i}`} className="flex items-start justify-between gap-3">
                        <p className="text-xs text-muted-foreground leading-relaxed min-w-0 flex-1">
                          {consistencyAlertMessage(a)}
                        </p>
                        <WgButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={!canFix}
                          title={
                            canFix
                              ? a.multiSite
                                ? "Dopasuj sumę godzin — rozdziel między roboty (lista płac ma pierwszeństwo)"
                                : "Dopasuj roboty do godzin z listy płac"
                              : "Brak aktywnej roboty — dodaj wpis ręcznie w Roboty"
                          }
                          onClick={() => handleFixConsistency(a)}
                          className="shrink-0 h-auto min-h-0 px-2.5 py-1 text-xs font-medium"
                        >
                          Popraw
                        </WgButton>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {pendingReceipts.length > 0 && (
              <div className="px-4 sm:px-5 py-3.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Receipt size={14} className="text-emerald-400" />
                    Paragony / faktury do akceptacji
                  </p>
                  <WgButton type="button" variant="ghost" onClick={() => onNavigate("payroll")} className={GHOST_LINK}>
                    Lista płac →
                  </WgButton>
                </div>
                <div className="space-y-1.5">
                  {pendingReceipts.map(({ cost, emp }) => (
                    <button
                      key={cost.id}
                      type="button"
                      onClick={() => onNavigate("payroll", undefined, emp.id)}
                      className={cn(ROW_BTN, WG_FOCUS_RING)}
                    >
                      <span className="text-foreground">{emp.name || "—"}</span>
                      {cost.description ? ` — ${cost.description}` : ""}
                      {" · "}
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(parseFloat(cost.amount) || 0)} PLN</span>
                      {cost.submittedBy && cost.submittedBy !== emp.name && (
                        <span className="text-muted-foreground"> · od {cost.submittedBy}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case "dokumentacja-ekipy":
        return (
          <div className="px-4 sm:px-5 py-3.5 space-y-1.5">
            {pendingReports.map(({ report, job }) => (
              <button
                key={report.id}
                type="button"
                onClick={() => {
                  acknowledgeReport(job.id, report.id);
                  onNavigate("jobs", job.id);
                }}
                className={cn(ROW_BTN, "truncate", WG_FOCUS_RING)}
              >
                <span className="text-foreground">{report.workerName}</span>
                {" · "}
                {job.address || "Bez adresu"}
                {getReportWorkScopeText(report).split("\n").find((l) => l.trim()) && ` — ${getReportWorkScopeText(report).split("\n").find((l) => l.trim())!.trim()}`}
                {" · "}
                {fmtDate((report.updatedAt || report.submittedAt).slice(0, 10))}
                {report.updatedAt && report.adminReviewedAt && report.updatedAt > report.adminReviewedAt && (
                  <span className="text-violet-400"> · edyt.</span>
                )}
              </button>
            ))}
          </div>
        );
      case "zdjecia":
        return (
          <div className="px-4 sm:px-5 py-3.5 space-y-1.5">
            {pendingPhotos.map(({ photo, job }) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => onNavigate("jobs", job.id)}
                className={cn(ROW_BTN, "truncate", WG_FOCUS_RING)}
              >
                <span className="text-foreground">{job.address || "Bez adresu"}</span>
                {" · "}
                <span className="text-foreground/90">{photo.uploadedBy}</span>
                {photo.caption ? ` — ${photo.caption}` : ""}
                {" · "}
                {fmtDate(photo.uploadedAt.slice(0, 10))}
              </button>
            ))}
          </div>
        );
      case "inspektor":
        return (
          <div className="divide-y divide-border/60">
            {unseenInspectorFeed.length > 0 && (
              <div className="px-4 sm:px-5 py-3.5">
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <ClipboardCheck size={14} className="text-emerald-500" />
                    Inspektor — nowe zmiany
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <WgButton
                      type="button"
                      variant="ghost"
                      onClick={markInspectorAlertsSeen}
                      className="h-auto w-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Oznacz przeczytane
                    </WgButton>
                    <WgButton type="button" variant="ghost" onClick={() => onNavigate("inspector")} className={GHOST_LINK}>
                      Inspektor →
                    </WgButton>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {unseenInspectorFeed.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavigate("jobs", item.jobId, undefined, resolveInspectorFeedDeepLink(item).section)}
                      className={cn(ROW_BTN, WG_FOCUS_RING)}
                    >
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{item.actor}</span>
                      {" · "}
                      <span className="text-foreground/90">{item.text}</span>
                      {" · "}
                      <span className="text-foreground">{item.jobAddress || "Bez adresu"}</span>
                      {" · "}
                      {fmtDate(item.at.slice(0, 10))}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {inspectorNotesPending.length > 0 && (
              <div className="px-4 sm:px-5 py-3.5">
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare size={14} className="text-violet-400" />
                    Notatki od inspektora
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <WgButton
                      type="button"
                      variant="ghost"
                      onClick={markInspectorAlertsSeen}
                      className="h-auto w-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Oznacz przeczytane
                    </WgButton>
                    <WgButton type="button" variant="ghost" onClick={() => onNavigate("inspector")} className={GHOST_LINK}>
                      Inspektor →
                    </WgButton>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {inspectorNotesPending.map((job) => {
                    const last = (job.jobNotes || [])[0];
                    if (!last) return null;
                    return (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => onNavigate("jobs", job.id, undefined, "summary")}
                        className={cn(ROW_BTN, WG_FOCUS_RING)}
                      >
                        <span className="text-foreground">{job.address || "Bez adresu"}</span>
                        {" · "}
                        <span className="text-emerald-600 dark:text-emerald-400">{last.author}</span>
                        {": "}
                        {(last.context === "billing" || last.recoverableChargeId)
                          ? `Do rozliczenia: ${last.text.length > 50 ? `${last.text.slice(0, 50)}…` : last.text}`
                          : last.text.length > 60 ? `${last.text.slice(0, 60)}…` : last.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      case "wm":
        return (
          <div className="divide-y divide-border/60">
            {wmOverdueJobs.length > 0 && (
              <div className="px-4 sm:px-5 py-3.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Calendar size={14} className="text-red-400" />
                    WM — termin odbioru minął
                  </p>
                  <WgButton type="button" variant="ghost" onClick={() => onNavigate("jobs")} className={GHOST_LINK}>
                    Roboty →
                  </WgButton>
                </div>
                <div className="space-y-1.5">
                  {wmOverdueJobs.map((job) => (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => onNavigate("jobs", job.id, undefined, "summary")}
                      className={cn(ROW_BTN, WG_FOCUS_RING)}
                    >
                      <span className="text-foreground">{job.address || "Bez adresu"}</span>
                      {job.flatNumber ? ` m.${job.flatNumber}` : ""}
                      {" · "}
                      <span className="text-red-400">{fmtPlannedHandover(job.plannedHandoverDate || "")}</span>
                      {" · "}
                      {HANDOVER_STAGE_LABELS[inferHandoverStage(job)]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {wmThisWeekJobs.length > 0 && (
              <div className="px-4 sm:px-5 py-3.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <CalendarDays size={14} className="text-amber-400" />
                    WM — odbiór w tym tygodniu
                  </p>
                  <WgButton type="button" variant="ghost" onClick={() => onNavigate("jobs")} className={GHOST_LINK}>
                    Roboty →
                  </WgButton>
                </div>
                <div className="space-y-1.5">
                  {wmThisWeekJobs.map((job) => (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => onNavigate("jobs", job.id, undefined, "summary")}
                      className={cn(ROW_BTN, WG_FOCUS_RING)}
                    >
                      <span className="text-foreground">{job.address || "Bez adresu"}</span>
                      {job.flatNumber ? ` m.${job.flatNumber}` : ""}
                      {" · "}
                      <span className="text-amber-400">{fmtPlannedHandover(job.plannedHandoverDate || "")}</span>
                      {" · "}
                      {HANDOVER_STAGE_LABELS[inferHandoverStage(job)]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case "odbior":
        return (
          <div className="px-4 sm:px-5 py-3.5 space-y-1.5">
            {handoverJobs.map((job) => {
              const statusKind = resolveJobListStatus(job);
              const statusLabel = JOB_LIST_STATUS_CONFIG[statusKind].label;
              return (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => onNavigate("jobs", job.id)}
                  className={cn(ROW_BTN, "truncate", WG_FOCUS_RING)}
                >
                  <span className="text-foreground">{job.address || "Bez adresu"}</span>
                  {job.flatNumber ? ` m.${job.flatNumber}` : ""}
                  {job.client ? (
                    <>
                      {" · "}
                      <span className="text-foreground/90">{job.client}</span>
                    </>
                  ) : null}
                  {" · "}
                  <span className="text-orange-500/90">{statusLabel}</span>
                  {job.plannedHandoverDate ? (
                    <>
                      {" · "}
                      {fmtPlannedHandover(job.plannedHandoverDate)}
                    </>
                  ) : null}
                </button>
              );
            })}
          </div>
        );
      case "do-odzyskania":
        return (
          <div className="px-4 sm:px-5 py-3.5 space-y-2">
            {recoverableAlertStats.alerts.map((alert) => (
              <button
                key={alert.chargeId}
                type="button"
                onClick={() => onNavigate("recoverablecharges")}
                className={cn(
                  WG_FOCUS_RING,
                  "w-full text-left rounded-lg border border-border/60 bg-amber-500/5 px-2.5 py-2 hover:bg-amber-500/10 transition-colors",
                )}
              >
                <p className="text-xs font-medium truncate">{alert.title}</p>
                <p className="text-xs font-semibold mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmtRecoverableAmount(alert.amountRemaining)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.reason}</p>
              </button>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <WgCard
      id="dashboard-pilne-uwagi"
      elevation="soft"
      padding="sm"
      radius="md"
      className="overflow-hidden"
      aria-label="Pilne uwagi na dziś"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <AlertTriangle size={13} className="text-amber-500 shrink-0" />
          <span className="text-sm font-semibold text-foreground">Pilne uwagi na dziś</span>
          <span className={COUNT_BADGE}>{urgentTodayTotal}</span>
        </div>
        <WgButton
          type="button"
          variant="ghost"
          onClick={() => setPilneExpanded((v) => !v)}
          aria-expanded={pilneExpanded}
          className={cn(WG_TOUCH_MIN, "h-11 gap-1.5 text-xs px-2 shrink-0")}
        >
          {pilneExpanded ? "Ukryj szczegóły" : "Pokaż szczegóły"}
          {pilneExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </WgButton>
      </div>
      {!pilneExpanded && pilneCollapsedSummary && (
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{pilneCollapsedSummary}</p>
      )}
      {pilneExpanded && (
        <div className="pt-1 -mx-1 divide-y divide-border">
          {visibleCategories.map((category) => (
            <div key={category.id}>
              <button
                type="button"
                onClick={() => toggleCategory(category.id)}
                aria-expanded={expandedCategories.has(category.id)}
                className={cn(
                  WG_FOCUS_RING,
                  "w-full px-3 sm:px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-secondary/25 transition-colors",
                )}
              >
                <span className="text-sm font-medium text-foreground flex items-center gap-2 min-w-0">
                  {category.label}
                  <span className={COUNT_BADGE}>{category.count}</span>
                </span>
                {expandedCategories.has(category.id) ? (
                  <ChevronUp size={16} className="shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown size={16} className="shrink-0 text-muted-foreground" />
                )}
              </button>
              {expandedCategories.has(category.id) && renderCategoryBody(category.id)}
            </div>
          ))}
        </div>
      )}
    </WgCard>
  );
}
