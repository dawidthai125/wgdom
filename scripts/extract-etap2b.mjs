import fs from "fs";

const appPath = "src/app/App.tsx";
const lines = fs.readFileSync(appPath, "utf8").split(/\n/);
const start = lines.findIndex((l) => l.startsWith("function DashboardView("));
const end = lines.findIndex((l, i) => i > start && l.startsWith("function CloudLoader("));
if (start < 0 || end < 0) throw new Error(`markers not found: start=${start} end=${end}`);

const body = lines.slice(start, end).join("\n").replace(/^function DashboardView/m, "export function DashboardView");

const header = `import { useMemo } from "react";
import {
  MessageSquare, CalendarDays, Wallet, MapPin, Bell, LayoutGrid, Scale, AlertTriangle,
  FileText, CheckCircle2, Circle, Archive, Camera, Receipt, ClipboardList, ClipboardCheck,
  Calendar, HardHat, KeyRound, TrendingUp,
} from "lucide-react";
import type { TendersDashboardStats } from "@/lib/tenders-bzp";
import { appendJobActivity } from "@/lib/job-activity";
import { adminIsSuperAdmin } from "@/lib/admin-auth";
import type {
  DirectoryEmployee, WeekEmployee, WeekSnapshot, DocType, Job, PayrollJobConsistencyAlert,
} from "@/app/app-domain";
import {
  MONTH_NAMES, DOCUMENT_TYPES, REQUIRED_DOCS, DOC_LABELS,
  filterProductionActiveDirectory, hoursWorked, dayTotalHours,
  payrollJobConsistencyAlerts, consistencyAlertMessage,
  fmt, fmtH, fmtDate, getWeekRange, calcWeekEmployee, extraCostStatus,
  fixJobsForConsistencyAlert, jobDaysSinceStart, jobWorkerReports,
  reportNeedsAdminAttention, jobTotalCost, todayDayKey, todayIsoDate,
  jobsForEmployeeOnDashboard, formatJobStreet,
} from "@/app/app-domain";
import { useAdminAccess } from "@/app/admin-access";
import {
  confirmReportSyncedDocUncheck,
  applyReportDocDocumentToggle,
  isReportSyncedDocLocked,
} from "@/lib/job-documents";
import {
  markInspectorFeedSeen,
  markAdminJobNotesSeen,
  getUnseenInspectorFeed,
  getAdminJobNotesSeenAt,
  jobsWithInspectorNotesNeedingAdmin,
} from "@/lib/inspector-stats";
import {
  isWmClient,
  wmJobsWithOverduePlanned,
  wmJobsPlannedThisWeek,
  fmtPlannedHandover,
  HANDOVER_STAGE_LABELS,
  inferHandoverStage,
  computeWmPortfolioStats,
} from "@/lib/job-wm";
import { jobMissingRequiredDocs } from "@/lib/job-list-status";
import { getReportWorkScopeText } from "@/lib/work-scope-text";
import {
  computePayrollCashSplit,
  biweeklyCashContextLine,
  getPayrollClosingWeekRange,
  PAYROLL_WEEK_ROLLOVER_HOUR,
} from "@/lib/payroll-cycle";

`;

fs.writeFileSync("src/app/DashboardView.tsx", header + body + "\n");

const commentStart = lines.findIndex((l, i) => i < start && l.includes("─── Dashboard"));
const removeFrom = commentStart >= 0 ? commentStart : start;
const newLines = [...lines.slice(0, removeFrom), ...lines.slice(end)];
fs.writeFileSync(appPath, newLines.join("\n"));

console.log(JSON.stringify({ extracted: end - removeFrom, startLine: removeFrom + 1, endLine: end }));
