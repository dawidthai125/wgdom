/**
 * Faza 2 krok 2: app-domain, app-ui, admin-access, PayrollView, JobsView.
 */
import { readFileSync, writeFileSync } from "fs";

const appPath = "src/app/App.tsx";
const lines = readFileSync(appPath, "utf8").split(/\r?\n/);

const idx = (pred) => {
  const i = lines.findIndex(pred);
  if (i < 0) throw new Error(String(pred));
  return i;
};

const typesStart = idx((l) => l.startsWith("// ─── Types"));
const sharedUiStart = idx((l) => l.startsWith("// ─── Shared UI"));
const payrollCalcStart = idx((l) => l.includes("Employee Calculator"));
const payrollExportStart = idx((l) => l.startsWith("// ─── Lista Płac — eksport"));
const payrollViewStart = idx((l) => l.startsWith("// ─── Lista Płac (current week)"));
const employeeArchiveStart = idx((l) => l.startsWith("function EmployeeArchiveModal"));
const jobEmailStart = idx((l) => l.startsWith("function jobEmailDefaultSubject"));
const jobsViewStart = idx((l) => l.startsWith("// ─── Jobs View"));
const scheduleStart = idx((l) => l.startsWith("// ─── Grafik tygodniowy"));

const payrollViewEnd = employeeArchiveStart - 1;
const weekDetailEnd = payrollExportStart - 1;

function exportBlock(text) {
  return text
    .replace(/^type /gm, "export type ")
    .replace(/^interface /gm, "export interface ")
    .replace(/^const /gm, "export const ")
    .replace(/^function /gm, "export function ");
}

const payrollDayCellStart = lines.findIndex((l) => l.startsWith("function PayrollDayCellDisplay"));
const domainPart2Start = lines.findIndex((l) => l.startsWith("function payrollWeeklyGrid"));
const domainPart1 = lines.slice(typesStart + 1, payrollDayCellStart).join("\n");
const domainPart2 = lines.slice(domainPart2Start, sharedUiStart).join("\n");
const domainBody = exportBlock(`${domainPart1}\n${domainPart2}`);

writeFileSync(
  "src/app/app-domain.ts",
  `/** Typy i helpery domenowe — wydzielone z App.tsx. */
import type { JobActivityType } from "@/lib/job-activity";
import {
  isBiweeklyPayrollEmployee,
  calcBiweeklyRowDisplay,
  calcWeekNetNoPrevSat,
  getPayrollWeekRange,
  getPayrollClosingWeekRange,
} from "@/lib/payroll-cycle";
import type { PayrollWeeklyGrid } from "@/lib/payroll-export";
import { isDataKey, type DataKey } from "@/lib/cloud-sync";
import { digestSha256Hex } from "@/lib/admin-auth";
import { Camera } from "lucide-react";

${domainBody}
`,
);

const payrollDayCell = exportBlock(lines.slice(payrollDayCellStart, domainPart2Start).join("\n"));

const adminCtxStart = lines.findIndex((l) => l.startsWith("const AdminAccessContext"));
const adminCtxEnd = lines.findIndex((l, i) => i > adminCtxStart && l.startsWith("function WeekEmployeeDetail")) - 1;
writeFileSync(
  "src/app/admin-access.tsx",
  `import { createContext, useContext } from "react";
import type { AdminSession } from "@/lib/admin-auth";
import { adminCanViewRates } from "@/lib/admin-auth";

${exportBlock(lines.slice(adminCtxStart, adminCtxEnd + 1).join("\n"))}

export function AdminAccessProvider({
  session,
  children,
}: {
  session: AdminSession | null;
  children: React.ReactNode;
}) {
  const canViewRates = session ? adminCanViewRates(session.role) : true;
  return (
    <AdminAccessContext.Provider value={{ session, canViewRates }}>
      {children}
    </AdminAccessContext.Provider>
  );
}
`,
);

const sharedUiEnd = lines.findIndex((l, i) => i > sharedUiStart && l.startsWith("const KW_LAST_BACKUP_WEEK_KEY")) - 1;
writeFileSync(
  "src/app/app-ui.tsx",
  `import { useState, useEffect, useRef, type RefObject, type ElementType, type ReactNode } from "react";
import { HelpCircle, Mic, MicOff } from "lucide-react";
import { fmtH, formatPayrollDayCell, type DayData } from "@/app/app-domain";

${exportBlock(`${payrollDayCell}\n${lines.slice(sharedUiStart + 1, sharedUiEnd + 1).join("\n")}`).replace(/React\.ElementType/g, "ElementType").replace(/React\.ReactNode/g, "ReactNode")}
`,
);

const weekDetailStart = lines.findIndex((l) => l.startsWith("function WeekEmployeeDetail"));
writeFileSync(
  "src/app/payroll-editors.tsx",
  `import { Plus, Trash2, Clock, FileText } from "lucide-react";
import { Checkbox } from "@/app/app-ui";
import {
  type DayData,
  type DayExtraHour,
  type DayNote,
  fmtH,
  hoursWorked,
  dayExtraHoursOnly,
  dayTotalHours,
} from "@/app/app-domain";

${exportBlock(lines.slice(lines.findIndex((l) => l.startsWith("function PayrollDayEditor")), adminCtxStart).join("\n"))}
`,
);

writeFileSync(
  "src/app/WeekEmployeeDetail.tsx",
  `import { useCallback } from "react";
import { Banknote, X, Plus, Trash2, FileText, Clock } from "lucide-react";
import { useAdminAccess } from "@/app/admin-access";
import { PayrollDayEditor } from "@/app/payroll-editors";
import {
  isBiweeklyPayrollEmployee,
  calcBiweeklyRowDisplay,
  calcWeekNetNoPrevSat,
} from "@/lib/payroll-cycle";
import {
  type WeekEmployee,
  type WeekSnapshot,
  type DirectoryEmployee,
  type DayKey,
  type DayData,
  type EmployeeExtraCost,
  DAYS,
  DAY_LABELS,
  fmt,
  fmtH,
  calcWeekEmployee,
  previousSaturdayIso,
} from "@/app/app-domain";

${exportBlock(lines.slice(weekDetailStart, weekDetailEnd + 1).join("\n"))}
`,
);

writeFileSync(
  "src/app/PayrollView.tsx",
  `import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import {
  Calculator, Clock, Banknote, User, Plus, Trash2, ChevronRight, ChevronLeft, Users,
  FileText, FileDown, CheckCircle2, Circle, Archive, ChevronDown, ChevronUp, Calendar,
  CalendarDays, TrendingUp, Wallet, X, Phone, UserPlus, Edit2, Check, Search, Building2,
  MapPin, AlertTriangle, Download, Upload, HardHat, StickyNote, Cloud, Mail, Send, Eye,
  RotateCcw, BarChart3, Scale, HelpCircle,
} from "lucide-react";
import { saveAs } from "file-saver";
import { useWheelScrollForward } from "@/lib/wheel-scroll-forward";
import { registerNativeBackHandler } from "@/lib/native-app-bridge";
import {
  buildPayrollEmailHtml,
  generatePayrollPdfBlob,
  generatePayrollWordBlob,
  buildPayrollExtraCostLines,
  blobToBase64,
  type PayrollCalcRow,
  type PayrollExportTotals,
} from "@/lib/payroll-export";
import {
  isBiweeklyPayrollEmployee,
  calcBiweeklyRowDisplay,
  computePayrollCashSplit,
  biweeklyMissingPrevWeekArchive,
  biweeklyCashContextLine,
  calcWeekNetNoPrevSat,
  getPayrollWeekRange,
  getPayrollClosingWeekRange,
  PAYROLL_WEEK_ROLLOVER_HOUR,
} from "@/lib/payroll-cycle";
import { contactsForPayroll, contactAllowsPayroll, type EmailContact } from "@/lib/email-contacts";
import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";
import { useAdminAccess } from "@/app/admin-access";
import { Checkbox, PayrollDayCellDisplay } from "@/app/app-ui";
import { WeekEmployeeDetail } from "@/app/WeekEmployeeDetail";
import {
  type WeekEmployee,
  type WeekSnapshot,
  type DirectoryEmployee,
  type Job,
  fmt,
  fmtH,
  fmtDate,
  calcWeekEmployee,
  payrollWeeklyGrid,
  payrollJobConsistencyAlerts,
  consistencyAlertMessage,
  payrollPrevSatDetailLines,
  payrollWeekExtraHourLines,
  payrollJobWorkLines,
  getPrevSaturday,
  previousSaturdayIso,
  filterProductionWeekEmployees,
  isTestWeekEmployee,
  PREV_SAT_SHORT,
  getWeekRange,
} from "@/app/app-domain";

${exportBlock(lines.slice(payrollExportStart + 1, payrollViewEnd + 1).join("\n"))}
`,
);

writeFileSync(
  "src/app/JobsView.tsx",
  `import { useState, useCallback, useMemo, useEffect, useRef, Fragment } from "react";
import {
  Plus, Trash2, ChevronRight, ChevronLeft, FileText, FileDown, CheckCircle2, Archive,
  ChevronDown, ChevronUp, Calendar, CalendarDays, X, Phone, Edit2, Check, Search, Building2,
  MapPin, KeyRound, HardHat, StickyNote, Cloud, Download, Upload, Mail, Send,
  Camera, ImagePlus, Eye, ArrowLeft, ClipboardList, Ruler, Images, FolderOpen, Package,
  Receipt, AlertTriangle, Copy, Sparkles, Clock, Users, Banknote, Scale, MessageSquare,
} from "lucide-react";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { useWheelScrollForward } from "@/lib/wheel-scroll-forward";
import { registerNativeBackHandler } from "@/lib/native-app-bridge";
import { useAdminAccess } from "@/app/admin-access";
import { adminIsSuperAdmin } from "@/lib/admin-auth";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";
import { JobCostBreakdownPanel } from "@/app/JobCostBreakdownPanel";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { JobListFilterBar, JobListLegend, JobListPrimaryBadge, JobPhasePicker, applyJobPhase } from "@/app/JobListStatus";
import { JobListCard } from "@/app/JobListCard";
import { JobAllFilesView, JobFileCatalogList } from "@/app/JobAllFilesView";
import { JobDetailSectionNav, JobsDetailEmptyState, type JobDetailSection } from "@/app/JobDetailSectionNav";
import { InspectorJobFileUpload } from "@/app/InspectorJobFileUpload";
import { JobMetaPickers, JobMetaBadges } from "@/app/JobMetaPickers";
import { WorkScopeEditor, WorkScopeDisplay } from "@/app/WorkScopeEditor";
import { JobWmStageBadge, JobWmPlannedBadge } from "@/app/JobWmPanel";
import { HiddenFileInput } from "@/app/HiddenFileInput";
import { LabelWithHint, VoiceNoteButton } from "@/app/app-ui";
import { appendJobActivity, type JobActivityType } from "@/lib/job-activity";
import { countBrowserFiles, jobHasBrowserFiles } from "@/lib/job-files-browser";
import { downloadJobGalleryZip } from "@/lib/photo-download";
import { isPdfFilename, isKosztorysPreviewExt } from "@/lib/ath-parser";
import {
  latestJobFile, syncJobDocuments, isReportSyncedDocLocked, confirmReportSyncedDocUncheck,
  applyReportDocDocumentToggle, clearReportDocSaOverrideFromReport, removeJobFileAttachment,
  type InspectorJobFileKind,
} from "@/lib/job-documents";
import { deleteJobFile, uploadJobFile } from "@/lib/job-file-upload";
import { collectJobFileCatalog, countJobFiles, type JobFileCatalogItem } from "@/lib/job-files-index";
import {
  countJobsByListFilter, inferJobPhase, jobMatchesListFilter, jobMissingRequiredDocs,
  JOB_PHASE_LABELS, type JobListFilter, type JobPhase,
} from "@/lib/job-list-status";
import { normalizeJobMetaFields, isJobHousingSet, HOUSING_TYPE_LABELS, STOVE_TYPE_LABELS_FULL } from "@/lib/job-meta";
import {
  getReportWorkScopeText, reportHasWorkScope, scopeTextHasContent, scopeTextLineCount,
  scopeTextToWorkItems, workItemsToScopeText,
} from "@/lib/work-scope-text";
import { contactsForJobs, contactAllowsJobs, type EmailContact } from "@/lib/email-contacts";
import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";
import { watermarkedFile, jobWatermarkLines } from "@/lib/photo-watermark";
import {
  normalizeJobWmFields, isWmClient, fmtPlannedHandover, HANDOVER_STAGE_LABELS,
  inferHandoverStage, removeInspectorPhoto,
} from "@/lib/job-wm";
import {
  type Job, type WeekEmployee, type DirectoryEmployee, type PhotoEntry, type WorkEntry, type DocType,
  DOCUMENT_TYPES, DOC_LABELS, REQUIRED_DOCS, DEFAULT_JOB_ENTRY_HOURS,
  fmt, fmtDate, fmtH, localIsoDate, defaultJob, normalizeJob, jobDisplayTitle, jobTotalHours,
  jobCost, jobTotalCost, jobMaterialsCost, jobApprovedPhotos, jobWorkerReports, reportNeedsAdminAttention,
  jobDaysSinceStart, jobDuration, jobGalleryBucket, galleryDaysUntilArchive, sortJobsActiveFirst,
  formatJobStreet, clientShareUrl, clientShareToken, workEntriesFromPayrollForDate,
  duplicateWorkEntryWithPayrollHours, collectEntriesFromYesterday, groupWorkEntriesByEmployee, ACTIVITY_LABELS,
} from "@/app/app-domain";

${exportBlock(lines.slice(jobEmailStart, scheduleStart).join("\n"))}
`,
);

const newLines = [...lines];
newLines.splice(jobsViewStart, scheduleStart - jobsViewStart);
newLines.splice(payrollExportStart, payrollViewEnd - payrollExportStart + 1);
newLines.splice(payrollCalcStart, weekDetailEnd - payrollCalcStart + 1);
newLines.splice(typesStart, sharedUiStart - typesStart);

const guideLazy = newLines.findIndex((l) => l.includes('import("@/app/GuideView")'));
newLines.splice(
  guideLazy + 2,
  0,
  `import * as domain from "@/app/app-domain";`,
  `import { AdminAccessContext, AdminAccessProvider, useAdminAccess } from "@/app/admin-access";`,
  `import { Checkbox, StatCard, NavItemWithHint, LabelWithHint, VoiceNoteButton, PayrollDayCellDisplay } from "@/app/app-ui";`,
  `import { WeekEmployeeDetail } from "@/app/WeekEmployeeDetail";`,
  `const PayrollView = lazy(() => import("@/app/PayrollView").then((m) => ({ default: m.PayrollView })));`,
  `const JobsView = lazy(() => import("@/app/JobsView").then((m) => ({ default: m.JobsView })));`,
);

writeFileSync(appPath, newLines.join("\n"));
console.log("Done. Build next.");
