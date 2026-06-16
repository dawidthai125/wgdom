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
import type { OperationalNote } from "@/lib/operational-notes";
import type { OperationalNoteAuditEntry } from "@/lib/operational-notes-audit";
import type { OperationalNoteReadReceipt } from "@/lib/operational-notes-read-state";
import type { WmPrintHistoryEntry } from "@/lib/wm-print/history";
import type { WmPrintJobDocument, WmPrintSettings, WmPrintTemplate } from "@/lib/wm-print/types";
import type { ElectricalMeasurement, ElectricalMeasurementRegistryState, ElectricalMeasurementSettings } from "@/lib/electrical-measurements/types";
import type { View } from "@/app/admin/admin-nav";
import { TeamDirectoryContactsView } from "@/app/TeamDirectoryContactsView";
import { TendersProvider } from "@/app/tenders/context/TendersProvider";

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
const OperationalNotesView = lazy(() =>
  import("@/app/OperationalNotesView").then((m) => ({ default: m.OperationalNotesView })),
);
const WmPrintView = lazy(() =>
  import("@/app/WmPrintView").then((m) => ({ default: m.WmPrintView })),
);
const TendersModule = lazy(() =>
  import("@/app/tenders/TendersModule").then((m) => ({ default: m.TendersModule })),
);

function TendersProviderScope({
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
    <TendersProvider
      enabled
      jobs={jobs}
      directory={directory}
      productionWeekEmployees={productionWeekEmployees}
      weekFrom={weekFrom}
      weekTo={weekTo}
      savedWeeks={savedWeeks}
    >
      {children}
    </TendersProvider>
  );
}

/** Pulpit + Przetargi — wspólny TendersProvider (snapshot strategiczny). */
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
  operationalNotes: OperationalNote[];
  setOperationalNotes: (v: OperationalNote[] | ((prev: OperationalNote[]) => OperationalNote[])) => void;
  operationalNotesReadState: OperationalNoteReadReceipt[];
  setOperationalNotesReadState: (
    v: OperationalNoteReadReceipt[] | ((prev: OperationalNoteReadReceipt[]) => OperationalNoteReadReceipt[]),
  ) => void;
  operationalNotesAuditLog: OperationalNoteAuditEntry[];
  setOperationalNotesAuditLog: (
    v: OperationalNoteAuditEntry[] | ((prev: OperationalNoteAuditEntry[]) => OperationalNoteAuditEntry[]),
  ) => void;
  commitOperationalNotes: (
    nextNotes?: OperationalNote[],
    nextAudit?: OperationalNoteAuditEntry[],
    deletedId?: string,
    nextReadState?: OperationalNoteReadReceipt[],
  ) => void;
  wmPrintTemplates: WmPrintTemplate[];
  setWmPrintTemplates: (v: WmPrintTemplate[] | ((prev: WmPrintTemplate[]) => WmPrintTemplate[])) => void;
  wmPrintJobDocs: WmPrintJobDocument[];
  setWmPrintJobDocs: (v: WmPrintJobDocument[] | ((prev: WmPrintJobDocument[]) => WmPrintJobDocument[])) => void;
  wmPrintSettings: WmPrintSettings;
  setWmPrintSettings: (v: WmPrintSettings | ((prev: WmPrintSettings) => WmPrintSettings)) => void;
  wmPrintHistory: WmPrintHistoryEntry[];
  setWmPrintHistory: (v: WmPrintHistoryEntry[] | ((prev: WmPrintHistoryEntry[]) => WmPrintHistoryEntry[])) => void;
  commitWmPrint: (
    nextTemplates?: WmPrintTemplate[],
    nextJobDocs?: WmPrintJobDocument[],
    nextSettings?: WmPrintSettings,
    deletedTemplateId?: string,
    deletedJobDocId?: string,
    nextHistory?: WmPrintHistoryEntry[],
  ) => void;
  deliveryPackagePublications: import("@/lib/delivery-package-publications/types").DeliveryPackagePublication[];
  setDeliveryPackagePublications: (
    v:
      | import("@/lib/delivery-package-publications/types").DeliveryPackagePublication[]
      | ((
          prev: import("@/lib/delivery-package-publications/types").DeliveryPackagePublication[],
        ) => import("@/lib/delivery-package-publications/types").DeliveryPackagePublication[]),
  ) => void;
  commitDeliveryPackagePublications: (
    next?: import("@/lib/delivery-package-publications/types").DeliveryPackagePublication[],
  ) => void;
  electricalMeasurements: ElectricalMeasurement[];
  setElectricalMeasurements: (
    v: ElectricalMeasurement[] | ((prev: ElectricalMeasurement[]) => ElectricalMeasurement[]),
  ) => void;
  electricalMeasurementRegistry: ElectricalMeasurementRegistryState;
  setElectricalMeasurementRegistry: (
    v:
      | ElectricalMeasurementRegistryState
      | ((prev: ElectricalMeasurementRegistryState) => ElectricalMeasurementRegistryState),
  ) => void;
  electricalMeasurementSettings: ElectricalMeasurementSettings;
  setElectricalMeasurementSettings: (
    v: ElectricalMeasurementSettings | ((prev: ElectricalMeasurementSettings) => ElectricalMeasurementSettings),
  ) => void;
  commitElectricalMeasurementSettings: (next?: ElectricalMeasurementSettings) => void;
  commitElectricalMeasurements: (
    nextMeasurements?: ElectricalMeasurement[],
    nextRegistry?: ElectricalMeasurementRegistryState,
  ) => void;
  pendingWmPrintNav: import("@/lib/wm-print/wm-print-tabs").WmPrintPendingNavigation | null;
  onInitialWmPrintNavigationConsumed: () => void;
  onOpenWmPrintMeasurements: (jobId: string) => void;
  adminSession: AdminSession | null | undefined;
  alertsSeenTick: number;
  onAlertsSeen: () => void;
  onOpenSms: () => void;
  onOpenTenders: () => void;
  onOpenTender: (tid: string) => void;
  handleNavigate: (
    v: View | "payroll" | "directory" | "archive" | "jobs" | "schedule" | "operationalnotes",
    jobId?: string,
    payrollEmpId?: string,
    jobSection?: import("@/app/JobDetailSectionNav").JobDetailSection,
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
  pendingJobSection: import("@/app/JobDetailSectionNav").JobDetailSection | null;
  onInitialJobConsumed: () => void;
  onOpenJobInJobs: (jobId: string, section: import("@/app/JobDetailSectionNav").JobDetailSection) => void;
  onGoToInspector: () => void;
  appSettings: AppSettings;
  onOpenTenderFromJobs: (tid: string) => void;
  jobsReturnNav: { label: string; onBack: () => void } | undefined;
  inspectorReturnNav: { label: string; onBack: () => void } | undefined;
  onOpenJobFromGallery: (id: string) => void;
  onOpenJobFromFiles: (id: string) => void;
  pendingTenderId: string | null;
  onOpenJobFromTender: (id: string) => void;
  onSetPendingJobId: (id: string) => void;
  onSetView: (v: View) => void;
  pendingRecoverableChargeId: string | null;
  onInitialRecoverableChargeConsumed: () => void;
  pendingRecoverableChargeCreatePreset: Partial<RecoverableCharge> | null;
  onInitialRecoverableChargeCreatePresetConsumed: () => void;
  onOpenRecoverableChargeFromJobs: (chargeId: string) => void;
  onOpenRecoverableChargeCreateFromJobs: (preset: Partial<RecoverableCharge>) => void;
  pendingOperationalNoteId: string | null;
  onInitialOperationalNoteConsumed: () => void;
  pendingOperationalNoteCreatePreset: { linkedJobId?: string; linkedJobNameSnapshot?: string; title?: string } | null;
  onInitialOperationalNoteCreatePresetConsumed: () => void;
  onOpenOperationalNoteFromJobs: (noteId: string, fromJobId?: string) => void;
  onOpenOperationalNoteCreateFromJobs: (preset: { linkedJobId?: string; linkedJobNameSnapshot?: string; title?: string }) => void;
  operationalNotesReturnNav: { label: string; onBack: () => void } | undefined;
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
  pendingJobSection,
  onInitialJobConsumed,
  onOpenJobInJobs,
  onGoToInspector,
  appSettings,
  onOpenTenderFromJobs,
  jobsReturnNav,
  inspectorReturnNav,
  onOpenJobFromGallery,
  onOpenJobFromFiles,
  pendingTenderId,
  onOpenJobFromTender,
  onSetPendingJobId,
  onSetView,
  pendingRecoverableChargeId,
  onInitialRecoverableChargeConsumed,
  pendingRecoverableChargeCreatePreset,
  onInitialRecoverableChargeCreatePresetConsumed,
  onOpenRecoverableChargeFromJobs,
  onOpenRecoverableChargeCreateFromJobs,
  operationalNotes,
  setOperationalNotes,
  operationalNotesReadState,
  setOperationalNotesReadState,
  operationalNotesAuditLog,
  setOperationalNotesAuditLog,
  commitOperationalNotes,
  wmPrintTemplates,
  setWmPrintTemplates,
  wmPrintJobDocs,
  setWmPrintJobDocs,
  wmPrintSettings,
  setWmPrintSettings,
  wmPrintHistory,
  setWmPrintHistory,
  commitWmPrint,
  deliveryPackagePublications,
  setDeliveryPackagePublications,
  commitDeliveryPackagePublications,
  electricalMeasurements,
  setElectricalMeasurements,
  electricalMeasurementRegistry,
  setElectricalMeasurementRegistry,
  electricalMeasurementSettings,
  setElectricalMeasurementSettings,
  commitElectricalMeasurementSettings,
  commitElectricalMeasurements,
  pendingWmPrintNav,
  onInitialWmPrintNavigationConsumed,
  onOpenWmPrintMeasurements,
  pendingOperationalNoteId,
  onInitialOperationalNoteConsumed,
  pendingOperationalNoteCreatePreset,
  onInitialOperationalNoteCreatePresetConsumed,
  onOpenOperationalNoteFromJobs,
  onOpenOperationalNoteCreateFromJobs,
  operationalNotesReturnNav,
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
      employeeLeaves={employeeLeaves}
      recoverableCharges={recoverableCharges}
      operationalNotes={operationalNotes}
      operationalNotesReadState={operationalNotesReadState}
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
      className={`flex flex-1 min-h-0 min-w-0 overflow-hidden ${payrollDetailOpen ? "" : "pb-[calc(3.5rem+env(safe-area-inset-bottom))]"} md:pb-0`}
    >
      {view === "dashboard" && (
        <ViewErrorBoundary label="Pulpit">
          {canViewTendersNav ? (
            <TendersProviderScope {...ccProviderInput}>{dashboardView}</TendersProviderScope>
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
      {(view === "directory" || view === "contacts") && (
        <ViewErrorBoundary label="Kadry">
          <TeamDirectoryContactsView
            tab={view === "contacts" ? "contacts" : "directory"}
            onTabChange={(tab) => onSetView(tab === "contacts" ? "contacts" : "directory")}
            directory={directory}
            savedWeeks={savedWeeks}
            employeeLeaves={employeeLeaves}
            onDirectoryChange={setDirectory}
            onDirectoryCommit={commitDirectory}
            onLeavesChange={setEmployeeLeaves}
            onLeavesCommit={commitEmployeeLeaves}
            onOpenSms={onOpenSms}
            contacts={contacts}
            onContactsChange={setContacts}
          />
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
              initialJobSection={pendingJobSection}
              onInitialJobConsumed={onInitialJobConsumed}
              weekEmployees={productionWeekEmployees}
              weekFrom={weekFrom}
              onGoToInspector={onGoToInspector}
              athPreviewEnabled={appSettings.athPreviewEnabled}
              onOpenTender={onOpenTenderFromJobs}
              returnNav={jobsReturnNav}
              recoverableCharges={recoverableCharges}
              onOpenRecoverableCharge={onOpenRecoverableChargeFromJobs}
              onChangeRecoverableCharges={setRecoverableCharges}
              onCommitRecoverableCharges={(next) => commitRecoverableCharges(next)}
              operationalNotes={operationalNotes}
              adminSession={adminSession}
              operationalNotesReadState={operationalNotesReadState}
              onOpenOperationalNote={onOpenOperationalNoteFromJobs}
              onCreateOperationalNoteFromJob={onOpenOperationalNoteCreateFromJobs}
              wmPrintHistory={wmPrintHistory}
              onOpenWmPrint={() => onSetView("wmprint")}
              onOpenWmPrintMeasurements={onOpenWmPrintMeasurements}
              electricalMeasurements={electricalMeasurements}
            />
          </Suspense>
        </ViewErrorBoundary>
      )}
      {view === "wmprint" && (
        <ViewErrorBoundary label="Odbiory WM Druk">
          <Suspense fallback={<ViewLoadFallback label="Ładowanie Odbiorów WM…" />}>
            <WmPrintView
              jobs={jobs}
              templates={wmPrintTemplates}
              jobDocs={wmPrintJobDocs}
              settings={wmPrintSettings}
              history={wmPrintHistory}
              adminSession={adminSession}
              uploadedBy={adminSession?.displayName || "Administrator"}
              onChangeTemplates={setWmPrintTemplates}
              onChangeJobDocs={setWmPrintJobDocs}
              onChangeSettings={setWmPrintSettings}
              onChangeHistory={setWmPrintHistory}
              onCommit={commitWmPrint}
              deliveryPackagePublications={deliveryPackagePublications}
              onChangeDeliveryPackagePublications={setDeliveryPackagePublications}
              onCommitDeliveryPackagePublications={commitDeliveryPackagePublications}
              electricalMeasurements={electricalMeasurements}
              onChangeElectricalMeasurements={setElectricalMeasurements}
              onCommitElectricalMeasurements={commitElectricalMeasurements}
              electricalMeasurementRegistry={electricalMeasurementRegistry}
              onChangeElectricalMeasurementRegistry={setElectricalMeasurementRegistry}
              electricalMeasurementSettings={electricalMeasurementSettings}
              onChangeElectricalMeasurementSettings={setElectricalMeasurementSettings}
              onCommitElectricalMeasurementSettings={commitElectricalMeasurementSettings}
              initialTab={pendingWmPrintNav?.tab ?? null}
              initialJobId={pendingWmPrintNav?.jobId ?? null}
              onInitialNavigationConsumed={onInitialWmPrintNavigationConsumed}
              onOpenJobInJobs={(jobId) => onOpenJobInJobs(jobId, "summary")}
            />
          </Suspense>
        </ViewErrorBoundary>
      )}
      {view === "operationalnotes" && (
        <ViewErrorBoundary label="Notatki operacyjne">
          <Suspense fallback={<ViewLoadFallback label="Ładowanie notatek…" />}>
            <OperationalNotesView
              notes={operationalNotes}
              jobs={jobs}
              session={adminSession}
              auditLog={operationalNotesAuditLog}
              readState={operationalNotesReadState}
              onChangeReadState={setOperationalNotesReadState}
              onChangeNotes={setOperationalNotes}
              onChangeAuditLog={setOperationalNotesAuditLog}
              onCommit={commitOperationalNotes}
              initialNoteId={pendingOperationalNoteId}
              onInitialNoteConsumed={onInitialOperationalNoteConsumed}
              initialCreatePreset={pendingOperationalNoteCreatePreset}
              onInitialCreatePresetConsumed={onInitialOperationalNoteCreatePresetConsumed}
              returnNav={operationalNotesReturnNav}
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
              adminRole={adminSession?.role}
              onOpenJobInJobs={onOpenJobInJobs}
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
              viewerRole={adminSession?.role ?? "admin"}
              directoryContacts={directory.map((d) => ({ name: d.name, phone: d.phone }))}
              onChange={setRecoverableCharges}
              onCommit={commitRecoverableCharges}
              initialChargeId={pendingRecoverableChargeId}
              onInitialChargeConsumed={onInitialRecoverableChargeConsumed}
              initialCreatePreset={pendingRecoverableChargeCreatePreset}
              onInitialCreatePresetConsumed={onInitialRecoverableChargeCreatePresetConsumed}
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
          <TendersProviderScope {...ccProviderInput}>
            <Suspense fallback={<ViewLoadFallback label="Ładowanie przetargów…" />}>
              <TendersModule
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
          </TendersProviderScope>
        </ViewErrorBoundary>
      )}
    </div>
  );
}
