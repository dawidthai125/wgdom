import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { ViewErrorBoundary } from "@/app/ViewErrorBoundary";
import { ViewLoadFallback } from "@/app/ViewLoadFallback";
import { executeCreateJobFromTender } from "@/lib/create-job-from-tender";
import type {
  DirectoryEmployee,
  Job,
  WeekEmployee,
  WeekSnapshot,
} from "@/app/app-domain";
import type { AdminSession } from "@/lib/admin-auth";
import { adminIsSuperAdmin } from "@/lib/admin-auth";
import type { AppSettings } from "@/lib/app-settings";
import type { EmailContact } from "@/lib/email-contacts";
import type { EmployeeLeave } from "@/lib/employee-leaves";
import type { RecoverableCharge } from "@/lib/recoverable-charges";
import type { View } from "@/app/admin/admin-nav";
import { CommandCenterProvider } from "@/app/tender-center/context/CommandCenterContext";

const PayrollView = lazy(() => import("@/app/PayrollView").then((m) => ({ default: m.PayrollView })));
const JobsView = lazy(() => import("@/app/JobsView").then((m) => ({ default: m.JobsView })));
const InspectorAdminView = lazy(() =>
  import("@/app/InspectorAdminView").then((m) => ({ default: m.InspectorAdminView })),
);
const GuideView = lazy(() => import("@/app/GuideView").then((m) => ({ default: m.GuideView })));
const MediaView = lazy(() => import("@/app/MediaView").then((m) => ({ default: m.MediaView })));
const RecoverableChargesView = lazy(() =>
  import("@/app/RecoverableChargesView").then((m) => ({ default: m.RecoverableChargesView })),
);
const TenderCenterProView = lazy(() =>
  import("@/app/TenderCenterProView").then((m) => ({ default: m.TenderCenterProView })),
);

/** Performance 2.1B — CC snapshot tylko na Pulpicie i w Przetargach (COMMAND CENTER). */
function CommandCenterProviderScope({
  jobs,
  directory,
  productionWeekEmployees,
  weekFrom,
  weekTo,
  savedWeeks,
  children,
}: {
  jobs: Job[];
  directory: DirectoryEmployee[];
  productionWeekEmployees: WeekEmployee[];
  weekFrom: string;
  weekTo: string;
  savedWeeks: WeekSnapshot[];
  children: ReactNode;
}) {
  return (
    <CommandCenterProvider
      enabled
      jobs={jobs}
      directory={directory}
      productionWeekEmployees={productionWeekEmployees}
      weekFrom={weekFrom}
      weekTo={weekTo}
      savedWeeks={savedWeeks}
    >
      {children}
    </CommandCenterProvider>
  );
}

/** Widoki nadal zdefiniowane w App.tsx — przekazywane, żeby uniknąć zależności cyklicznej. */
export type AdminEmbeddedViews = {
  DashboardView: ComponentType<Record<string, unknown>>;
  ScheduleView: ComponentType<Record<string, unknown>>;
  DirectoryView: ComponentType<Record<string, unknown>>;
  ContactsView: ComponentType<Record<string, unknown>>;
  ArchiveView: ComponentType<Record<string, unknown>>;
};

export type AdminViewRouterProps = {
  view: View;
  payrollDetailOpen: boolean;
  canViewTendersNav: boolean;
  embedded: AdminEmbeddedViews;
  jobs: Job[];
  directory: DirectoryEmployee[];
  productionWeekEmployees: WeekEmployee[];
  weekFrom: string;
  weekTo: string;
  savedWeeks: WeekSnapshot[];
  contacts: EmailContact[];
  employeeLeaves: EmployeeLeave[];
  setEmployeeLeaves: (v: EmployeeLeave[] | ((prev: EmployeeLeave[]) => EmployeeLeave[])) => void;
  commitEmployeeLeaves: (next?: EmployeeLeave[], deletedId?: string) => void;
  recoverableCharges: RecoverableCharge[];
  setRecoverableCharges: (v: RecoverableCharge[] | ((prev: RecoverableCharge[]) => RecoverableCharge[])) => void;
  commitRecoverableCharges: (next?: RecoverableCharge[], deletedId?: string) => void;
  adminSession: AdminSession | null | undefined;
  alertsSeenTick: number;
  onAlertsSeen: () => void;
  onOpenSms: () => void;
  onOpenTenders: () => void;
  onOpenTender: (tid: string) => void;
  handleNavigate: (
    v: View | "payroll" | "directory" | "archive" | "jobs" | "schedule",
    jobId?: string,
    payrollEmpId?: string,
    inspectorTab?: "activity" | "portfolio",
  ) => void;
  onFixJobs: (jobs: Job[] | ((prev: Job[]) => Job[])) => void;
  setWeekFrom: (v: string) => void;
  setWeekTo: (v: string) => void;
  toggleSettled: (id: string) => void;
  saveWeek: () => void;
  addFromDirectory: (ids: string[]) => void;
  removeWeekEmployee: (id: string) => void;
  clearAllWeekEmployees: () => void;
  replaceWeekWithAllActive: () => void;
  updateWeekEmployee: (updated: WeekEmployee) => void;
  syncWeekRatesFromDirectory: () => void;
  goToCurrent: () => void;
  restoreWeekFromArchive: () => void;
  saveBiweeklyBacklogWeek: (backlogFrom: string, backlogTo: string, employees: WeekEmployee[]) => void;
  pendingPayrollEmpId: string | null;
  onInitialPayrollEmpConsumed: () => void;
  onPayrollDetailOpenChange: (open: boolean) => void;
  setDirectory: (d: DirectoryEmployee[] | ((prev: DirectoryEmployee[]) => DirectoryEmployee[])) => void;
  commitDirectory: () => void;
  setContacts: (c: EmailContact[] | ((prev: EmailContact[]) => EmailContact[])) => void;
  onArchiveDelete: (id: string) => void;
  updateArchiveWeekEmployee: (weekId: string, updatedEmp: WeekEmployee) => void;
  toggleArchiveSettled: (weekId: string, empId: string) => void;
  setJobs: (jobs: Job[] | ((prev: Job[]) => Job[])) => void;
  deleteJobsByIds: (ids: string[]) => Promise<void>;
  pendingJobId: string | null;
  onInitialJobConsumed: () => void;
  onGoToInspector: (jobId?: string) => void;
  appSettings: AppSettings;
  onOpenTenderFromJobs: (tid: string) => void;
  jobsReturnNav: { label: string; onBack: () => void } | undefined;
  inspectorInitialTab: "activity" | "portfolio";
  pendingInspectorJobId: string | null;
  onInitialInspectorJobConsumed: () => void;
  inspectorReturnNav: { label: string; onBack: () => void } | undefined;
  onOpenJobFromGallery: (id: string) => void;
  onOpenJobFromFiles: (id: string) => void;
  pendingTenderId: string | null;
  onOpenJobFromTender: (id: string) => void;
  onSetPendingJobId: (id: string) => void;
  onSetView: (v: View) => void;
};

export function AdminViewRouter({
  view,
  payrollDetailOpen,
  canViewTendersNav,
  embedded,
  jobs,
  directory,
  productionWeekEmployees,
  weekFrom,
  weekTo,
  savedWeeks,
  contacts,
  employeeLeaves,
  setEmployeeLeaves,
  commitEmployeeLeaves,
  recoverableCharges,
  setRecoverableCharges,
  commitRecoverableCharges,
  adminSession,
  alertsSeenTick,
  onAlertsSeen,
  onOpenSms,
  onOpenTenders,
  onOpenTender,
  handleNavigate,
  onFixJobs,
  setWeekFrom,
  setWeekTo,
  toggleSettled,
  saveWeek,
  addFromDirectory,
  removeWeekEmployee,
  clearAllWeekEmployees,
  replaceWeekWithAllActive,
  updateWeekEmployee,
  syncWeekRatesFromDirectory,
  goToCurrent,
  restoreWeekFromArchive,
  saveBiweeklyBacklogWeek,
  pendingPayrollEmpId,
  onInitialPayrollEmpConsumed,
  onPayrollDetailOpenChange,
  setDirectory,
  commitDirectory,
  setContacts,
  onArchiveDelete,
  updateArchiveWeekEmployee,
  toggleArchiveSettled,
  setJobs,
  deleteJobsByIds,
  pendingJobId,
  onInitialJobConsumed,
  onGoToInspector,
  appSettings,
  onOpenTenderFromJobs,
  jobsReturnNav,
  inspectorInitialTab,
  pendingInspectorJobId,
  onInitialInspectorJobConsumed,
  inspectorReturnNav,
  onOpenJobFromGallery,
  onOpenJobFromFiles,
  pendingTenderId,
  onOpenJobFromTender,
  onSetPendingJobId,
  onSetView,
}: AdminViewRouterProps) {
  const { DashboardView, ScheduleView, DirectoryView, ContactsView, ArchiveView } = embedded;

  const ccProviderInput = {
    jobs,
    directory,
    productionWeekEmployees,
    weekFrom,
    weekTo,
    savedWeeks,
  };

  const dashboardView = (
    <DashboardView
      jobs={jobs}
      directory={directory}
      weekEmployees={productionWeekEmployees}
      weekFrom={weekFrom}
      weekTo={weekTo}
      savedWeeks={savedWeeks}
      recoverableCharges={recoverableCharges}
      onNavigate={handleNavigate}
      onFixJobs={onFixJobs}
      adminUserId={adminSession?.id}
      alertsSeenTick={alertsSeenTick}
      onAlertsSeen={onAlertsSeen}
      onOpenSms={onOpenSms}
      canViewTenders={canViewTendersNav}
      onOpenTenders={onOpenTenders}
      onOpenTender={onOpenTender}
      setJobs={setJobs}
      onOpenJobFromTender={onOpenJobFromTender}
      tenderJobUploadedBy={adminSession?.displayName || "Administrator"}
      onNavigateToJobFromTender={(jobId) => {
        onSetPendingJobId(jobId);
        onSetView("jobs");
      }}
      onCreateJobFromTender={(draft, item) =>
        executeCreateJobFromTender(draft, item, {
          setJobs,
          uploadedBy: adminSession?.displayName || "Administrator",
          onNavigateToJob: (jobId) => {
            onSetPendingJobId(jobId);
            onSetView("jobs");
          },
        })
      }
    />
  );

  return (
    <div
      className={`flex flex-1 min-h-0 overflow-hidden ${payrollDetailOpen ? "" : "pb-[calc(3.5rem+env(safe-area-inset-bottom))]"} md:pb-0`}
    >
      {view === "dashboard" && (
        <ViewErrorBoundary label="Pulpit">
          {canViewTendersNav ? (
            <CommandCenterProviderScope {...ccProviderInput}>{dashboardView}</CommandCenterProviderScope>
          ) : (
            dashboardView
          )}
        </ViewErrorBoundary>
      )}
      {view === "payroll" && (
        <ViewErrorBoundary label="Lista płac">
          <Suspense fallback={<ViewLoadFallback label="Ładowanie listy płac…" />}>
            <PayrollView
              weekEmployees={productionWeekEmployees}
              weekFrom={weekFrom}
              weekTo={weekTo}
              directory={directory}
              employeeLeaves={employeeLeaves}
              contacts={contacts}
              jobs={jobs}
              onWeekChange={(f, t) => {
                setWeekFrom(f);
                setWeekTo(t);
              }}
              onToggleSettled={toggleSettled}
              onSaveWeek={saveWeek}
              savedWeeks={savedWeeks}
              onAddFromDirectory={addFromDirectory}
              onRemoveWeekEmployee={removeWeekEmployee}
              onClearAllWeekEmployees={clearAllWeekEmployees}
              onReplaceWithAllActive={replaceWeekWithAllActive}
              onUpdateWeekEmployee={updateWeekEmployee}
              onSyncRatesFromDirectory={syncWeekRatesFromDirectory}
              onGoToCurrent={goToCurrent}
              onManageContacts={() => onSetView("contacts")}
              onRestoreFromArchive={restoreWeekFromArchive}
              onSaveBacklogWeek={saveBiweeklyBacklogWeek}
              initialEmpId={pendingPayrollEmpId}
              onInitialEmpConsumed={onInitialPayrollEmpConsumed}
              onDetailOpenChange={onPayrollDetailOpenChange}
            />
          </Suspense>
        </ViewErrorBoundary>
      )}
      {view === "schedule" && (
        <ViewErrorBoundary label="Grafik">
          <ScheduleView
            weekEmployees={productionWeekEmployees}
            weekFrom={weekFrom}
            weekTo={weekTo}
            jobs={jobs}
            directory={directory}
            onWeekChange={(f, t) => {
              setWeekFrom(f);
              setWeekTo(t);
            }}
            onGoToCurrent={goToCurrent}
            onOpenPayroll={() => onSetView("payroll")}
          />
        </ViewErrorBoundary>
      )}
      {view === "directory" && (
        <ViewErrorBoundary label="Pracownicy">
          <DirectoryView
            directory={directory}
            savedWeeks={savedWeeks}
            employeeLeaves={employeeLeaves}
            onChange={setDirectory}
            onCommit={commitDirectory}
            onLeavesChange={setEmployeeLeaves}
            onLeavesCommit={commitEmployeeLeaves}
            onOpenSms={onOpenSms}
          />
        </ViewErrorBoundary>
      )}
      {view === "contacts" && (
        <ViewErrorBoundary label="Kontakty">
          <ContactsView contacts={contacts} onChange={setContacts} />
        </ViewErrorBoundary>
      )}
      {view === "archive" && (
        <ViewErrorBoundary label="Archiwum">
          <ArchiveView
            savedWeeks={savedWeeks}
            onDelete={onArchiveDelete}
            onUpdateWeekEmployee={updateArchiveWeekEmployee}
            onToggleArchiveSettled={toggleArchiveSettled}
            jobs={jobs}
            directory={directory}
          />
        </ViewErrorBoundary>
      )}
      {view === "jobs" && (
        <ViewErrorBoundary label="Roboty">
          <Suspense fallback={<ViewLoadFallback label="Ładowanie robot…" />}>
            <JobsView
              jobs={jobs}
              setJobs={setJobs}
              onDeleteJobs={deleteJobsByIds}
              directory={directory}
              contacts={contacts}
              onManageContacts={() => onSetView("contacts")}
              initialJobId={pendingJobId}
              onInitialJobConsumed={onInitialJobConsumed}
              weekEmployees={productionWeekEmployees}
              weekFrom={weekFrom}
              onGoToInspector={onGoToInspector}
              athPreviewEnabled={appSettings.athPreviewEnabled}
              onOpenTender={onOpenTenderFromJobs}
              returnNav={jobsReturnNav}
            />
          </Suspense>
        </ViewErrorBoundary>
      )}
      {view === "inspector" && (
        <ViewErrorBoundary label="Inspektor">
          <Suspense fallback={<ViewLoadFallback label="Ładowanie inspektora…" />}>
            <InspectorAdminView
              jobs={jobs}
              setJobs={setJobs}
              directory={directory}
              adminUserId={adminSession?.id}
              adminDisplayName={adminSession?.displayName || "Administrator"}
              adminRole={adminSession?.role}
              initialTab={inspectorInitialTab}
              initialJobId={pendingInspectorJobId}
              onInitialJobConsumed={onInitialInspectorJobConsumed}
              contacts={contacts}
              athPreviewEnabled={appSettings.athPreviewEnabled}
              onAlertsSeen={onAlertsSeen}
              returnNav={inspectorReturnNav}
            />
          </Suspense>
        </ViewErrorBoundary>
      )}
      {view === "media" && (
        <ViewErrorBoundary label="Zdjęcia i pliki">
          <Suspense fallback={<ViewLoadFallback label="Ładowanie mediów…" />}>
            <MediaView
              jobs={jobs}
              athPreviewEnabled={appSettings.athPreviewEnabled}
              onOpenJobFromGallery={onOpenJobFromGallery}
              onOpenJobFromFiles={onOpenJobFromFiles}
            />
          </Suspense>
        </ViewErrorBoundary>
      )}
      {view === "recoverablecharges" && (
        <ViewErrorBoundary label="Do rozliczenia">
          <Suspense fallback={<ViewLoadFallback label="Ładowanie pozycji…" />}>
            <RecoverableChargesView
              charges={recoverableCharges}
              jobs={jobs}
              createdByName={adminSession?.displayName || "Administrator"}
              onChange={setRecoverableCharges}
              onCommit={commitRecoverableCharges}
            />
          </Suspense>
        </ViewErrorBoundary>
      )}
      {view === "guide" && (
        <ViewErrorBoundary label="Instrukcja">
          <Suspense fallback={<ViewLoadFallback label="Ładowanie instrukcji…" />}>
            <GuideView />
          </Suspense>
        </ViewErrorBoundary>
      )}
      {view === "tenders" && canViewTendersNav && (
        <ViewErrorBoundary label="Przetargi">
          <CommandCenterProviderScope {...ccProviderInput}>
            <Suspense fallback={<ViewLoadFallback label="Ładowanie przetargów…" />}>
              <TenderCenterProView
                showTestBadge={adminSession ? adminIsSuperAdmin(adminSession.role) : false}
                athPreviewEnabled={appSettings.athPreviewEnabled}
                initialExpandedId={pendingTenderId}
                jobs={jobs}
                directory={directory}
                productionWeekEmployees={productionWeekEmployees}
                weekFrom={weekFrom}
                weekTo={weekTo}
                savedWeeks={savedWeeks}
                onOpenJob={onOpenJobFromTender}
                setJobs={setJobs}
                tenderJobUploadedBy={adminSession?.displayName || "Administrator"}
                onNavigateToJobFromTender={(jobId) => {
                  onSetPendingJobId(jobId);
                  onSetView("jobs");
                }}
                onCreateJobFromTender={(draft, item) =>
                  executeCreateJobFromTender(draft, item, {
                    setJobs,
                    uploadedBy: adminSession?.displayName || "Administrator",
                    onNavigateToJob: (jobId) => {
                      onSetPendingJobId(jobId);
                      onSetView("jobs");
                    },
                  })
                }
              />
            </Suspense>
          </CommandCenterProviderScope>
        </ViewErrorBoundary>
      )}
    </div>
  );
}
