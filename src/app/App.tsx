import { useState, useCallback, useMemo, useEffect, useRef, Fragment, createContext, useContext, type RefObject } from "react";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";
import { CompanyMusicPlayer } from "@/app/components/CompanyMusicPlayer";
import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import { EmployeeSmsModal } from "@/app/EmployeeSmsModal";
import { HiddenFileInput } from "@/app/HiddenFileInput";
import { downloadJobDocumentsPack } from "@/lib/job-documents-pack";
import { isPrivacyShieldSuppressed } from "@/lib/privacy-shield";
import {
  Calculator, Clock, Banknote, User, Plus, Trash2,
  ChevronRight, ChevronLeft, Users, FileText, FileDown, CheckCircle2,
  Circle, Archive, ChevronDown, ChevronUp,
  Calendar, CalendarDays, TrendingUp, Wallet, X, Phone,
  UserPlus, Edit2, Check, Search, Building2, MapPin, KeyRound,
  LayoutDashboard, Package, Receipt, AlertTriangle, Download, Upload,
  HardHat, StickyNote, Cloud, CloudUpload, CloudOff,
  Mic, MicOff, Bell, Copy, ScrollText, Sparkles,
  BookOpen, ChevronDown as ChevDown, HelpCircle, Smartphone, Monitor,
  Camera, ImagePlus, Lock, LogOut, Eye, ArrowLeft, ShieldCheck, ThumbsUp, ThumbsDown, Clock3,
  ClipboardList, Ruler, Mail, Send, RotateCcw, BarChart3, Scale, Images, Settings, Menu, ClipboardCheck, MessageSquare, LayoutGrid,
} from "lucide-react";
import {
  API_BASE,
  API_HEADERS,
  DATA_KEYS,
  pushKeysToCloud,
  pushAllDataToCloud,
  fetchKeysFromCloud,
  normalizeJobsValue,
  mergeJobsById,
  fetchJobsBackupStatus,
  restoreCloudJobsBackup,
  mergeWeekEmployees,
  mergeArchive,
  mergeDirectory,
  mergeContacts,
  mergeDataKey,
  weekEmployeesListRichness,
  fetchPayrollBackupStatus,
  restoreCloudPayrollBackup,
  fetchFullDataBackupStatus,
  restoreAllCloudDataBackup,
  addDeletedJobId,
  pushJobsAfterDelete,
  getDeletedJobIds,
  mergeDeletedJobIds,
  saveDeletedJobIds,
  normalizeDeletedJobIds,
  JOBS_DELETED_IDS_KEY,
  DIRECTORY_DELETED_IDS_KEY,
  getDeletedDirectoryIds,
  saveDeletedDirectoryIds,
  mergeDeletedDirectoryIds,
  normalizeDeletedDirectoryIds,
  addDeletedDirectoryId,
  pushDirectoryToCloud,
  stripWorkerPinHashesFromDirectory,
  WORKER_PINS_RESET_FLAG,
  ADMIN_PASSWORDS_KEY,
  ADMIN_USERS_CONFIG_KEY,
  APP_SETTINGS_KEY,
} from "@/lib/cloud-sync";
import { saveLocalDataSnapshot, restoreLocalDataSnapshot, listLocalDataSnapshots, readLocalDataBundle } from "@/lib/local-data-backup";
import { saveLocalJobsSnapshot, restoreLocalJobsSnapshot, listLocalJobsSnapshots } from "@/lib/jobs-safety";
import {
  type AdminSession,
  listAdminUsersForLogin,
  listInspectorUsersForLogin,
  verifyAdminLogin,
  adminCanViewRates,
  adminRoleLabel,
  adminIsSuperAdmin,
  loadAdminSessionFromStorage,
  saveAdminSessionToStorage,
  adminRememberEnabled,
  saveRememberedAdminPassword,
  loadRememberedAdminPassword,
  clearRememberedAdminPassword,
  setAdminUserPassword,
  resetAdminUserPassword,
  loadAdminPasswordOverrides,
  mergeAdminPasswordOverrides,
  loadAdminUsersConfig,
  mergeAdminUsersConfig,
  listAdminUsersForManagement,
  setAdminUserRole,
  createAdminUser,
  deleteAdminUser,
  setAdminUserPhone,
  digestSha256Hex,
  type AdminAssignableRole,
} from "@/lib/admin-auth";
import { InspectorPanel } from "@/app/InspectorPanel";
import { InspectorAdminView } from "@/app/InspectorAdminView";
import {
  appendJobActivity,
  collectInspectorFeed,
  isInspectorActivityType,
  type JobActivity,
  type JobActivityType,
} from "@/lib/job-activity";
import {
  latestJobFile,
  syncJobDocumentsFromFiles,
  type InspectorJobFileKind,
} from "@/lib/job-documents";
import {
  recordInspectorEvent,
  markInspectorFeedSeen,
  markAdminJobNotesSeen,
  getUnseenInspectorFeed,
  getAdminJobNotesSeenAt,
  syncAlertsSeenFromCloud,
  countUnseenInspectorAlerts,
} from "@/lib/inspector-stats";
import {
  normalizeJobWmFields,
  jobsWithInspectorNotesNeedingAdmin,
  isWmClient,
  wmJobsWithOverduePlanned,
  wmJobsPlannedThisWeek,
  fmtPlannedHandover,
  HANDOVER_STAGE_LABELS,
  inferHandoverStage,
  computeWmPortfolioStats,
} from "@/lib/job-wm";
import { JobWmStageBadge, JobWmPlannedBadge } from "@/app/JobWmPanel";
import { JobMetaPickers, JobMetaBadges } from "@/app/JobMetaPickers";
import { normalizeJobMetaFields, isJobHousingSet, HOUSING_TYPE_LABELS, STOVE_TYPE_LABELS_FULL, type HousingType, type StoveType } from "@/lib/job-meta";
import { syncAppSettingsFromCloud, saveAppSettings, loadAppSettingsLocal, type AppSettings } from "@/lib/app-settings";
import { WorkScopeEditor, WorkScopeDisplay } from "@/app/WorkScopeEditor";
import {
  getReportWorkScopeText,
  reportHasWorkScope,
  scopeTextHasContent,
  scopeTextLineCount,
  scopeTextToWorkItems,
  workItemsToScopeText,
} from "@/lib/work-scope-text";
import { isSupabaseConfigured } from "@/config/supabase";
import { saveAs } from "file-saver";
import { watermarkedFile, jobWatermarkLines } from "@/lib/photo-watermark";
import { queuePhoto, listQueuedPhotos, removeQueuedPhoto, queuedPhotoCount } from "@/lib/photo-queue";
import { PwaInstallBanner } from "@/app/PwaInstallBanner";
import {
  type EmailContact,
  defaultEmailContact,
  contactsForJobs,
  contactsForPayroll,
  contactAllowsJobs,
  contactAllowsPayroll,
} from "@/lib/email-contacts";
import {
  type PayrollCalcRow,
  type PayrollExportTotals,
  type PayrollWeeklyGrid,
  buildPayrollEmailHtml,
  generatePayrollPdfBlob,
  generatePayrollWordBlob,
  type PayrollJobWorkLine,
  blobToBase64,
} from "@/lib/payroll-export";

/** pdfmake ~1 MB — ładuj dopiero przy eksporcie PDF (szybszy start na telefonie). */
async function loadPdfMake() {
  const pdfMake = (await import("pdfmake/build/pdfmake")).default;
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  pdfMake.vfs = (pdfFontsModule.default ?? pdfFontsModule) as any;
  return pdfMake;
}

type PdfDocDef = Parameters<Awaited<ReturnType<typeof loadPdfMake>>["createPdf"]>[0];

// ─── Types ────────────────────────────────────────────────────────────────────

type DayKey = "Pn" | "Wt" | "Sr" | "Cz" | "Pt" | "So";
const DAY_LABELS: Record<DayKey, string> = { Pn: "Poniedziałek", Wt: "Wtorek", Sr: "Środa", Cz: "Czwartek", Pt: "Piątek", So: "Sobota" };
const DAYS: DayKey[] = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const MONTH_NAMES = ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"];

/** Trwała kartoteka pracownika */
interface DirectoryEmployee {
  id: string;
  name: string;
  phone: string;
  position: string;    // stanowisko np. "Murarz", "Kierowca"
  defaultRate: string; // domyślna stawka PLN/h
  startDate: string;   // data zatrudnienia ISO
  active: boolean;     // czy aktualnie pracuje
  notes: string;
  /** Logistyka / dostawy — ten sam dzień na wielu robotach (suma godzin, nie jedna robota) */
  multiSiteDaily?: boolean;
  /** SHA-256 hash osobistego kodu 4-cyfrowego (logowanie pracownika) */
  workerPinHash?: string;
  /** Konto testowe — tylko logowanie pracownika, bez listy płac, grafiku i raportów */
  testAccount?: boolean;
}

interface DayData {
  active: boolean;
  from: string;
  to: string;
  zaliczka: string;
  /** Dodatkowe godziny ponad podstawowy wpis dnia (np. wieczorem, w innym miejscu) */
  extraHours?: DayExtraHour[];
  /** Notatki tekstowe (głównie Sob. poprz.) */
  notes?: DayNote[];
}

/** Dodatkowy blok godzin w danym dniu tygodnia */
interface DayExtraHour {
  id: string;
  description: string;
  from: string;
  to: string;
}

/** Krótki opis (Sob. poprz. — co robiono, wynajęci pracownicy, kwoty do rozliczenia) */
interface DayNote {
  id: string;
  text: string;
}

type ExtraCostStatus = "pending" | "approved" | "rejected";

/** Koszt pracownika do zwrotu w wypłacie (chemia, paliwo, zakupy na budowę) */
interface EmployeeExtraCost {
  id: string;
  description: string;
  amount: string;
  /** Skan paragonu / faktury (URL z storage) */
  receiptUrl?: string;
  status?: ExtraCostStatus;
  rejectReason?: string;
  submittedAt?: string;
  submittedBy?: string;
}

/** Pracownik przypisany do konkretnego tygodnia — snapshot danych z kartoteki */
interface WeekEmployee {
  id: string;             // lokalny ID w ramach tygodnia
  directoryId: string;    // powiązanie z kartoteką (może być "" dla spoza kartoteki)
  name: string;
  phone: string;
  position: string;
  rate: string;           // stawka na ten tydzień (może różnić się od domyślnej)
  days: Record<DayKey, DayData>;
  /** Sobota poprzedniego tygodnia — wypłacana w bieżącym tygodniu */
  prevSaturday?: DayData;
  extraCosts?: EmployeeExtraCost[];
  settled: boolean;
}

interface EmployeeSnapshot {
  name: string; position: string; rate: number;
  weekHours?: number; prevSatHours?: number;
  totalHours: number; grossPay: number; totalZaliczka: number; totalExtraCosts: number;
  netPay: number;
  settled: boolean;
}

/** Wpis czasu na robocie zapisany w archiwum tygodnia */
interface ArchivedWorkEntry {
  jobId: string;
  address: string;
  flatNumber: string;
  directoryId: string;
  employeeName: string;
  date: string;
  hours: number;
  rate: number;
}

interface WeekSnapshot {
  id: string;
  weekFrom: string; weekTo: string;
  savedAt: string;
  employees: EmployeeSnapshot[];
  totalEmployees: number; totalHours: number;
  totalGross: number; totalZaliczka: number; totalNet: number;
  /** Pełna lista płac (dni, godziny, zaliczki) — od v1.9 */
  weekEmployees?: WeekEmployee[];
  /** Przypisania do robót w tym tygodniu — od v1.9 */
  workEntries?: ArchivedWorkEntry[];
}

// ─── Jobs Types ───────────────────────────────────────────────────────────────

const DOCUMENT_TYPES = ["zlecenie","zakres","kosztorys","kominiarz","pomiary","oswiadczenia","gwarancje","rysunek","zdjecia"] as const;
const REQUIRED_DOCS = ["zlecenie","zakres","kosztorys","kominiarz","pomiary","oswiadczenia","gwarancje","rysunek"] as const;
type DocType = typeof DOCUMENT_TYPES[number];
const DOC_LABELS: Record<DocType,string> = {
  zlecenie:"Zlecenie", zakres:"Zakres robót", kosztorys:"Kosztorys",
  kominiarz:"Kominiarz", pomiary:"Pomiary", oswiadczenia:"Oświadczenia",
  gwarancje:"Gwarancje", rysunek:"Rysunek/Plan", zdjecia:"Zdjęcia",
};

interface WorkEntry {
  id: string;
  directoryId: string;
  employeeName: string;
  date: string;
  hours: number;
  rate: number;
  notes: string;
}

interface MaterialEntry {
  id: string;
  description: string;
  cost: number;
  date: string;
}

interface PhotoEntry {
  id: string;
  path: string;
  publicUrl: string;
  label: "before" | "after" | "progress";
  uploadedBy: string;
  uploadedAt: string;
  status: "pending" | "approved" | "rejected";
  caption?: string;
  /** Powód odrzucenia przez admina */
  rejectReason?: string;
}

type RoomTypeKey = "salon" | "pokoj" | "kuchnia" | "korytarz" | "lazienka" | "toaleta" | "inne";

const ROOM_TYPE_LABELS: Record<RoomTypeKey, string> = {
  salon: "Salon",
  pokoj: "Pokój",
  kuchnia: "Kuchnia",
  korytarz: "Korytarz",
  lazienka: "Łazienka",
  toaleta: "Toaleta (WC)",
  inne: "Inne",
};

interface RoomDimension {
  id: string;
  roomType: RoomTypeKey;
  customLabel: string;
  length: string;
  width: string;
  height: string;
  note?: string;
}

interface WorkReportItem {
  id: string;
  text: string;
  note: string;
}

/** Raport pracownika: zakres prac + wymiary / rysunek — przypisany do roboty */
interface WorkerJobReport {
  id: string;
  workerName: string;
  /** worker = ekipa; super_admin/admin/moderator = kto z admina dodał */
  authorAdminRole?: import("@/lib/admin-auth").AdminRole | "worker";
  submittedAt: string;
  updatedAt?: string;
  /** Kiedy admin obejrzał raport — znika z „Uwaga dziś” (ponownie po edycji przez pracownika) */
  adminReviewedAt?: string;
  /** Zakres prac jako tekst z listą (główne pole od v2.17) */
  workScopeText?: string;
  workItems: WorkReportItem[];
  rooms: RoomDimension[];
  generalNote?: string;
  sketchNote?: string;
  sketch?: { path: string; publicUrl: string } | null;
}

interface ClientShareLink {
  token: string;
  createdAt: string;
  enabled: boolean;
}


interface Job {
  id: string;
  address: string;
  flatNumber: string;
  client: string;
  startDate: string;
  endDate: string;
  status: "in_progress" | "completed";
  keysHandedOver: boolean;
  notes: string;
  documents: Record<DocType, boolean>;
  workEntries: WorkEntry[];
  materials: MaterialEntry[];
  invoiceStatus: "pending" | "invoiced" | "paid";
  invoiceNumber: string;
  invoiceAmount: string;
  photos: PhotoEntry[];
  workerReports?: WorkerJobReport[];
  activityLog?: JobActivity[];
  clientShare?: ClientShareLink;
  jobFiles?: import("@/lib/job-documents").JobFileAttachment[];
  handoverStage?: import("@/lib/job-wm").JobHandoverStage;
  plannedHandoverDate?: string;
  jobNotes?: import("@/lib/job-wm").JobNote[];
  inspectorPhotos?: import("@/lib/job-wm").InspectorPhotoEntry[];
  hiddenInspectorFeedIds?: string[];
  housingType?: HousingType | "";
  stoveType?: StoveType | "";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultDay(): DayData { return { active: false, from: "07:00", to: "16:00", zaliczka: "" }; }
function defaultDays(): Record<DayKey, DayData> { return Object.fromEntries(DAYS.map((d) => [d, defaultDay()])) as Record<DayKey, DayData>; }

function defaultDirEmployee(): DirectoryEmployee {
  return { id: crypto.randomUUID(), name: "", phone: "", position: "", defaultRate: "25.00", startDate: new Date().toISOString().slice(0,10), active: true, notes: "" };
}

/** Heurystyka: znane konto testowe (np. test + 000000000). */
function inferTestAccountHeuristic(emp: DirectoryEmployee): boolean {
  const name = emp.name.trim().toLowerCase();
  const phone9 = normalizePhone9(emp.phone);
  return name === "test" || phone9 === "000000000";
}

function isTestDirectoryEmployee(emp: DirectoryEmployee | undefined | null): boolean {
  if (!emp) return false;
  if (emp.testAccount === false) return false;
  if (emp.testAccount === true) return true;
  return inferTestAccountHeuristic(emp);
}

function isProductionDirectoryEmployee(emp: DirectoryEmployee): boolean {
  return !isTestDirectoryEmployee(emp);
}

function isProductionActiveDirectoryEmployee(emp: DirectoryEmployee): boolean {
  return emp.active && isProductionDirectoryEmployee(emp);
}

function filterProductionDirectory(directory: DirectoryEmployee[]): DirectoryEmployee[] {
  return directory.filter(isProductionDirectoryEmployee);
}

function filterProductionActiveDirectory(directory: DirectoryEmployee[]): DirectoryEmployee[] {
  return directory.filter(isProductionActiveDirectoryEmployee);
}

function isTestWeekEmployee(emp: WeekEmployee, directory: DirectoryEmployee[]): boolean {
  if (!emp.directoryId) return false;
  const dir = directory.find((d) => d.id === emp.directoryId);
  return isTestDirectoryEmployee(dir);
}

function filterProductionWeekEmployees(weekEmployees: WeekEmployee[], directory: DirectoryEmployee[]): WeekEmployee[] {
  return weekEmployees.filter((e) => !isTestWeekEmployee(e, directory));
}

function normalizeDirectoryTestFlags(list: DirectoryEmployee[]): DirectoryEmployee[] {
  let changed = false;
  const next = list.map((d) => {
    if (d.testAccount === false) return d;
    if (isTestDirectoryEmployee(d) && d.testAccount !== true) {
      changed = true;
      return { ...d, testAccount: true };
    }
    return d;
  });
  return changed ? next : list;
}

const PHOTO_LABEL_NAMES: Record<PhotoEntry["label"], string> = {
  before: "Przed remontem",
  after: "Po remoncie",
  progress: "W trakcie",
};

const PHOTO_LABEL_ORDER: PhotoEntry["label"][] = ["before", "after", "progress"];

const PHOTO_LABEL_SECTION: Record<PhotoEntry["label"], { icon: typeof Camera; accent: string; border: string }> = {
  before: { icon: Camera, accent: "text-blue-400", border: "border-blue-500/20" },
  after: { icon: Eye, accent: "text-green-400", border: "border-green-500/20" },
  progress: { icon: ImagePlus, accent: "text-yellow-400", border: "border-yellow-500/20" },
};

const PREV_SAT_SHORT = "Sob. poprz.";

function getPrevSaturday(emp: WeekEmployee): DayData {
  return emp.prevSaturday ?? defaultDay();
}

function previousSaturdayIso(weekFrom: string): string {
  const [y, m, d] = weekFrom.split("-").map(Number);
  const mon = new Date(y, m - 1, d);
  mon.setDate(mon.getDate() - 2);
  return mon.toISOString().slice(0, 10);
}

function weekEmployeeFromDir(dir: DirectoryEmployee): WeekEmployee {
  return { id: crypto.randomUUID(), directoryId: dir.id, name: dir.name, phone: dir.phone, position: dir.position, rate: dir.defaultRate, days: defaultDays(), prevSaturday: defaultDay(), extraCosts: [], settled: false };
}

function parseTime(t: string) { const [h, m] = t.split(":").map(Number); return isNaN(h)||isNaN(m) ? 0 : h+m/60; }
function hoursWorked(from: string, to: string) { const d = parseTime(to)-parseTime(from); return d>0 ? +d.toFixed(2) : 0; }
function dayTotalHours(day: DayData): number {
  const base = day.active ? hoursWorked(day.from, day.to) : 0;
  const extra = (day.extraHours ?? []).reduce((s, e) => s + hoursWorked(e.from, e.to), 0);
  return +(base + extra).toFixed(2);
}
function dayExtraHoursOnly(day: DayData): number {
  return +(day.extraHours ?? []).reduce((s, e) => s + hoursWorked(e.from, e.to), 0).toFixed(2);
}
function prevSatBaseHours(day: DayData): number {
  return day.active ? hoursWorked(day.from, day.to) : 0;
}

function payrollWeekExtraHourLines(employees: WeekEmployee[]) {
  const lines: {
    name: string;
    position: string;
    day: string;
    baseShift: string;
    extraRange: string;
    hours: number;
    reason: string;
  }[] = [];
  for (const emp of employees) {
    for (const key of DAYS) {
      const day = emp.days[key];
      const baseShift = day.active ? `${day.from}–${day.to}` : "—";
      for (const ex of day.extraHours ?? []) {
        const h = hoursWorked(ex.from, ex.to);
        const reason = ex.description.trim();
        if (h <= 0 && !reason) continue;
        lines.push({
          name: emp.name || "—",
          position: emp.position || "—",
          day: DAY_LABELS[key],
          baseShift,
          extraRange: h > 0 ? `${ex.from}–${ex.to}` : "—",
          hours: h,
          reason: reason || "—",
        });
      }
    }
  }
  return lines;
}

function payrollJobWorkLines(jobs: Job[], weekFrom: string, weekTo: string): PayrollJobWorkLine[] {
  const lines: PayrollJobWorkLine[] = [];
  for (const job of jobs) {
    const jobAddress = formatJobStreet(job);
    for (const we of job.workEntries) {
      if (we.date < weekFrom || we.date > weekTo || we.hours <= 0) continue;
      const dk = dayKeyForIsoInWeek(we.date, weekFrom);
      const parts = we.date.split("-");
      const dayLabel = dk && parts.length === 3 ? `${dk}\n${parts[2]}.${parts[1]}` : fmtDate(we.date);
      lines.push({
        name: we.employeeName?.trim() || "—",
        dateIso: we.date,
        dayLabel,
        jobAddress,
        hours: we.hours,
        rate: we.rate,
        cost: +(we.hours * we.rate).toFixed(2),
        notes: we.notes?.trim() || "",
      });
    }
  }
  return lines.sort(
    (a, b) => a.dateIso.localeCompare(b.dateIso) || a.name.localeCompare(b.name, "pl") || a.jobAddress.localeCompare(b.jobAddress, "pl"),
  );
}

function normalizeEmpName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function jobHoursForEmployeeOnDate(
  emp: Pick<WeekEmployee, "directoryId" | "name">,
  jobs: Job[],
  dateIso: string,
  directory: DirectoryEmployee[],
): number {
  let total = 0;
  for (const job of jobs) {
    for (const we of job.workEntries) {
      if (we.date !== dateIso || we.hours <= 0) continue;
      if (workEntryMatchesEmployee(emp, we, directory)) total += we.hours;
    }
  }
  return +total.toFixed(2);
}

interface PayrollJobConsistencyAlert {
  name: string;
  dayLabel: string;
  dayKey: DayKey;
  dateIso: string;
  payrollHours: number;
  jobHours: number;
  kind: "mismatch" | "payroll_only" | "job_only";
  multiSite?: boolean;
  jobSiteCount?: number;
  jobSiteSummary?: string;
}

function directoryEmployeeForRef(
  empRef: Pick<WeekEmployee, "directoryId" | "name">,
  directory: DirectoryEmployee[],
): DirectoryEmployee | undefined {
  if (empRef.directoryId) return directory.find((d) => d.id === empRef.directoryId);
  return directory.find((d) => normalizeEmpName(d.name) === normalizeEmpName(empRef.name));
}

function isMultiSiteEmployee(
  empRef: Pick<WeekEmployee, "directoryId" | "name">,
  directory: DirectoryEmployee[],
): boolean {
  return directoryEmployeeForRef(empRef, directory)?.multiSiteDaily === true;
}

function jobSitesForEmployeeOnDate(
  empRef: Pick<WeekEmployee, "directoryId" | "name">,
  jobs: Job[],
  dateIso: string,
  directory: DirectoryEmployee[],
): { jobId: string; entryId: string; label: string; hours: number }[] {
  const sites: { jobId: string; entryId: string; label: string; hours: number }[] = [];
  for (const job of jobs) {
    for (const we of job.workEntries) {
      if (we.date !== dateIso || we.hours <= 0) continue;
      if (!workEntryMatchesEmployee(empRef, we, directory)) continue;
      const addr = job.address?.trim() || "Bez adresu";
      const label = addr.length > 22 ? `${addr.slice(0, 20)}…` : addr;
      sites.push({ jobId: job.id, entryId: we.id, label, hours: we.hours });
    }
  }
  return sites;
}

function summarizeJobSites(sites: { label: string }[]): string {
  if (sites.length === 0) return "";
  const uniq = [...new Set(sites.map((s) => s.label))];
  const shown = uniq.slice(0, 3).join(", ");
  return uniq.length > 3 ? `${shown}…` : shown;
}

function payrollJobConsistencyAlerts(
  weekEmployees: WeekEmployee[],
  jobs: Job[],
  weekFrom: string,
  weekTo: string,
  directory: DirectoryEmployee[],
): PayrollJobConsistencyAlert[] {
  const alerts: PayrollJobConsistencyAlert[] = [];
  const cols = weekDayColumns(weekFrom);
  const TOLERANCE = 0.01;

  const pushAlert = (
    name: string,
    col: { key: DayKey; iso: string; dateLabel: string },
    payrollHours: number,
    jobHours: number,
    empRef: Pick<WeekEmployee, "directoryId" | "name">,
  ) => {
    if (isMultiSiteEmployee(empRef, directory)) return;
    const pay = +payrollHours.toFixed(2);
    const job = +jobHours.toFixed(2);
    if (pay <= TOLERANCE && job <= TOLERANCE) return;
    let kind: PayrollJobConsistencyAlert["kind"];
    if (pay > TOLERANCE && job > TOLERANCE && Math.abs(pay - job) > TOLERANCE) kind = "mismatch";
    else if (pay > TOLERANCE && job <= TOLERANCE) kind = "payroll_only";
    else if (job > TOLERANCE && pay <= TOLERANCE) kind = "job_only";
    else return;
    const multiSite = isMultiSiteEmployee(empRef, directory);
    const sites = job > 0 ? jobSitesForEmployeeOnDate(empRef, jobs, col.iso, directory) : [];
    alerts.push({
      name,
      dayLabel: `${DAY_LABELS[col.key]} (${col.dateLabel})`,
      dayKey: col.key,
      dateIso: col.iso,
      payrollHours: pay,
      jobHours: job,
      kind,
      multiSite,
      jobSiteCount: sites.length,
      jobSiteSummary: sites.length > 0 ? summarizeJobSites(sites) : undefined,
    });
  };

  for (const emp of weekEmployees) {
    if (isTestWeekEmployee(emp, directory)) continue;
    for (const col of cols) {
      pushAlert(
        emp.name || "—",
        col,
        dayTotalHours(emp.days[col.key]),
        jobHoursForEmployeeOnDate(emp, jobs, col.iso, directory),
        emp,
      );
    }
  }

  const externalByKeyDate = new Map<string, { name: string; col: (typeof cols)[0]; hours: number; directoryId: string }>();
  for (const job of jobs) {
    for (const we of job.workEntries) {
      if (we.date < weekFrom || we.date > weekTo || we.hours <= 0) continue;
      if (we.directoryId && isTestDirectoryEmployee(directory.find((d) => d.id === we.directoryId))) continue;
      if (weekEmployees.some((e) => workEntryMatchesEmployee(e, we, directory))) continue;
      const col = cols.find((c) => c.iso === we.date);
      if (!col) continue;
      const key = `${we.directoryId || normalizeEmpName(we.employeeName)}|${we.date}`;
      const prev = externalByKeyDate.get(key);
      if (prev) prev.hours += we.hours;
      else {
        externalByKeyDate.set(key, {
          name: we.employeeName?.trim() || "—",
          col,
          hours: we.hours,
          directoryId: we.directoryId,
        });
      }
    }
  }
  for (const { name, col, hours, directoryId } of externalByKeyDate.values()) {
    pushAlert(name, col, 0, hours, { directoryId, name });
  }

  return alerts.sort(
    (a, b) => a.dateIso.localeCompare(b.dateIso) || a.name.localeCompare(b.name, "pl"),
  );
}

function findEmployeeWeekStats(snap: WeekSnapshot, dirId: string, name: string): { hours: number; netPay: number } | null {
  if (snap.weekEmployees?.length) {
    const we = snap.weekEmployees.find(
      (e) => (dirId && e.directoryId === dirId) || normalizeEmpName(e.name) === normalizeEmpName(name),
    );
    if (we) {
      const c = calcWeekEmployee(we);
      return { hours: c.totalHours, netPay: c.netPay };
    }
  }
  const es = snap.employees.find((e) => normalizeEmpName(e.name) === normalizeEmpName(name));
  if (es) return { hours: es.totalHours, netPay: es.netPay };
  return null;
}

interface EmployeeArchiveStats {
  year: number;
  totalHours: number;
  totalNet: number;
  weekCount: number;
  monthlyHours: number[];
  monthlyNet: number[];
  weeks: { weekFrom: string; weekTo: string; hours: number; netPay: number }[];
}

function buildEmployeeArchiveStats(dirId: string, name: string, savedWeeks: WeekSnapshot[], year: number): EmployeeArchiveStats {
  const monthlyHours = Array.from({ length: 12 }, () => 0);
  const monthlyNet = Array.from({ length: 12 }, () => 0);
  const weeks: EmployeeArchiveStats["weeks"] = [];
  let totalHours = 0;
  let totalNet = 0;

  for (const snap of savedWeeks) {
    if (new Date(snap.weekFrom).getFullYear() !== year) continue;
    const stats = findEmployeeWeekStats(snap, dirId, name);
    if (!stats) continue;
    totalHours += stats.hours;
    totalNet += stats.netPay;
    const m = new Date(snap.weekFrom).getMonth();
    monthlyHours[m] += stats.hours;
    monthlyNet[m] += stats.netPay;
    weeks.push({ weekFrom: snap.weekFrom, weekTo: snap.weekTo, hours: stats.hours, netPay: stats.netPay });
  }
  weeks.sort((a, b) => b.weekFrom.localeCompare(a.weekFrom));

  return { year, totalHours, totalNet, weekCount: weeks.length, monthlyHours, monthlyNet, weeks };
}

function consistencyAlertMessage(a: PayrollJobConsistencyAlert): string {
  const siteInfo =
    a.multiSite && a.jobSiteCount && a.jobSiteCount > 0
      ? ` na ${a.jobSiteCount} ${a.jobSiteCount === 1 ? "robocie" : "robotach"}${a.jobSiteSummary ? ` (${a.jobSiteSummary})` : ""}`
      : a.multiSite
        ? " (wiele robót dziennie)"
        : "";
  if (a.kind === "mismatch") {
    return `${a.name}: ${fmtH(a.payrollHours)} w liście płac, ${fmtH(a.jobHours)}${siteInfo} — ${a.dayLabel}`;
  }
  if (a.kind === "payroll_only") {
    return `${a.name}: ${fmtH(a.payrollHours)} w liście płac, brak wpisu${a.multiSite ? " na robotach" : " na robocie"} — ${a.dayLabel}`;
  }
  return `${a.name}: ${fmtH(a.jobHours)}${siteInfo}, brak w liście płac — ${a.dayLabel}`;
}

function payrollPrevSatDetailLines(employees: WeekEmployee[], weekFrom: string) {
  const dateLabel = fmtDate(previousSaturdayIso(weekFrom));
  const lines: {
    name: string;
    position: string;
    dateLabel: string;
    timeRange: string;
    hours: number;
    zaliczka: number;
    gross: number;
    notesText: string;
  }[] = [];
  for (const emp of employees) {
    const day = getPrevSaturday(emp);
    const hours = prevSatBaseHours(day);
    const zaliczka = parseFloat(day.zaliczka) || 0;
    const rate = parseFloat(emp.rate) || 0;
    const gross = +(hours * rate).toFixed(2);
    const notes = (day.notes ?? []).map((n) => n.text.trim()).filter(Boolean);
    const notesText = notes.map((n) => (notes.length > 1 ? `• ${n}` : n)).join("\n");
    if (hours <= 0 && zaliczka <= 0 && notes.length === 0) continue;
    lines.push({
      name: emp.name || "—",
      position: emp.position || "—",
      dateLabel,
      timeRange: day.active ? `${day.from}–${day.to}` : "—",
      hours,
      zaliczka,
      gross,
      notesText: notesText || "—",
    });
  }
  return lines;
}

function formatPayrollDayCell(day: DayData): string {
  const parts: string[] = [];
  let total = 0;
  if (day.active) {
    const h = hoursWorked(day.from, day.to);
    if (h > 0 || day.from || day.to) {
      parts.push(`${day.from}–${day.to}`);
      total += h;
    }
    const zal = parseFloat(day.zaliczka) || 0;
    if (zal > 0) parts.push(`zal. ${fmt(zal)}`);
  }
  for (const ex of day.extraHours ?? []) {
    const h = hoursWorked(ex.from, ex.to);
    const desc = ex.description.trim();
    if (h <= 0 && !desc) continue;
    if (h > 0) parts.push(`+${ex.from}–${ex.to}`);
    else parts.push(`+${desc}`);
    total += h;
  }
  if (parts.length === 0) return "—";
  if (total > 0) parts.push(fmtH(total));
  return parts.join("\n");
}

function payrollWeeklyGrid(employees: WeekEmployee[], weekFrom: string): PayrollWeeklyGrid {
  const cols = weekDayColumns(weekFrom);
  const dayHeaders = cols.map((c) => `${DAY_LABELS[c.key]}\n${c.dateLabel}`);
  const rows = employees
    .map((emp) => ({
      name: emp.name || "—",
      position: emp.position || "—",
      dayCells: cols.map((c) => formatPayrollDayCell(emp.days[c.key])),
      weekHours: +DAYS.reduce((s, d) => s + dayTotalHours(emp.days[d]), 0).toFixed(2),
    }))
    .filter((row) => row.weekHours > 0 || row.dayCells.some((c) => c !== "—"));
  return { dayHeaders, rows };
}

function fmt(n: number) { return n.toLocaleString("pl-PL",{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtH(n: number) { const h=Math.floor(n),m=Math.round((n-h)*60); return m===0?`${h}h`:`${h}h ${m}m`; }
function fmtDate(iso: string) { if(!iso) return ""; const [y,mo,d]=iso.split("-"); return `${d}.${mo}.${y}`; }
function getWeekRange() {
  const now=new Date(),day=now.getDay(),diff=day===0?1:1-day;
  const mon=new Date(now); mon.setDate(now.getDate()+diff);
  const sat=new Date(mon); sat.setDate(mon.getDate()+5);
  const iso=(d:Date)=>d.toISOString().slice(0,10);
  return {from:iso(mon),to:iso(sat)};
}
function calcWeekEmployee(emp: WeekEmployee) {
  const weekHours = +(DAYS.reduce((s, d) => s + dayTotalHours(emp.days[d]), 0)).toFixed(2);
  const prevSatHours = +prevSatBaseHours(getPrevSaturday(emp)).toFixed(2);
  const totalHours = +(weekHours + prevSatHours).toFixed(2);
  const totalExtraHours = +DAYS.reduce((s, d) => s + dayExtraHoursOnly(emp.days[d]), 0).toFixed(2);
  const weekZaliczka = DAYS.reduce((s, d) => s + (parseFloat(emp.days[d].zaliczka) || 0), 0);
  const prevSatZaliczka = parseFloat(getPrevSaturday(emp).zaliczka) || 0;
  const totalZaliczka = weekZaliczka + prevSatZaliczka;
  const totalExtraCosts = (emp.extraCosts ?? []).reduce((s, c) => s + approvedExtraCostAmount(c), 0);
  const rateNum = parseFloat(emp.rate) || 0;
  const weekGross = +(weekHours * rateNum).toFixed(2);
  const prevSatGross = +(prevSatHours * rateNum).toFixed(2);
  const grossPay = +(weekGross + prevSatGross).toFixed(2);
  const weekNet = +(weekGross - weekZaliczka).toFixed(2);
  const prevSatNet = +(prevSatGross - prevSatZaliczka).toFixed(2);
  const netPay = +(grossPay - totalZaliczka + totalExtraCosts).toFixed(2);
  return {
    weekHours, prevSatHours, totalHours, totalExtraHours,
    weekZaliczka, prevSatZaliczka, totalZaliczka, totalExtraCosts,
    weekGross, prevSatGross, grossPay, weekNet, prevSatNet, netPay, rateNum,
  };
}

function extraCostStatus(c: EmployeeExtraCost): ExtraCostStatus {
  return c.status ?? "approved";
}

function approvedExtraCostAmount(c: EmployeeExtraCost): number {
  if (extraCostStatus(c) !== "approved") return 0;
  return parseFloat(c.amount) || 0;
}

const PHOTO_STATUS_LABELS: Record<PhotoEntry["status"], string> = {
  pending: "Oczekuje na akceptację",
  approved: "Zaakceptowane",
  rejected: "Odrzucone",
};

const EXTRA_COST_STATUS_LABELS: Record<ExtraCostStatus, string> = {
  pending: "Oczekuje na akceptację",
  approved: "Zaakceptowane",
  rejected: "Odrzucone",
};

function workerTodayWorkInfo(
  emp: WeekEmployee | null,
  jobs: Job[],
  weekFrom: string,
  weekTo: string,
): { working: boolean; locations: string[]; timeRange: string; hoursLabel: string } {
  if (!emp) return { working: false, locations: [], timeRange: "", hoursLabel: "" };
  const todayIso = todayIsoDate();
  const todayKey = todayDayKey();
  if (todayKey) {
    const cell = scheduleCellFor(emp, todayKey, todayIso, jobs, []);
    if (cell.working) {
      return { working: true, locations: cell.locations, timeRange: cell.timeRange, hoursLabel: cell.hoursLabel };
    }
  }
  const dashJobs = jobsForEmployeeOnDashboard(emp, jobs, todayIso, weekFrom, weekTo, []);
  if (dashJobs.length > 0) {
    return {
      working: true,
      locations: dashJobs.map(formatJobStreet),
      timeRange: "",
      hoursLabel: "",
    };
  }
  return { working: false, locations: [], timeRange: "", hoursLabel: "" };
}

// ─── Jobs Helpers ─────────────────────────────────────────────────────────────

const DEFAULT_JOB_ENTRY_HOURS = 9;
/** Krótki wpis na jednej robocie (logistyka — Jarosław itd.) */
const DEFAULT_MULTI_SITE_VISIT_HOURS = 2;

function previousIsoDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return localIsoDate(dt);
}

function dayKeyForIsoInWeek(iso: string, weekFrom: string): DayKey | null {
  return weekDayColumns(weekFrom).find((c) => c.iso === iso)?.key ?? null;
}

function hoursFromPayrollDay(day: DayData): number {
  const total = dayTotalHours(day);
  if (total > 0) return total;
  if (!day.active) return DEFAULT_JOB_ENTRY_HOURS;
  return 0;
}

function duplicateWorkEntry(entry: WorkEntry, date: string): WorkEntry {
  return { ...entry, id: crypto.randomUUID(), date };
}

/** Godziny wpisu na robocie — z listy płac na dany dzień, inaczej 9 h standard. */
function duplicateWorkEntryWithPayrollHours(
  entry: WorkEntry,
  targetDate: string,
  weekEmployees: WeekEmployee[],
  weekFrom: string,
  directory: DirectoryEmployee[] = [],
): WorkEntry {
  const base = duplicateWorkEntry(entry, targetDate);
  const dirEmp = entry.directoryId ? directory.find((d) => d.id === entry.directoryId) : undefined;
  if (dirEmp?.multiSiteDaily) {
    return {
      ...base,
      hours: entry.hours > 0 ? entry.hours : DEFAULT_MULTI_SITE_VISIT_HOURS,
    };
  }
  const emp = weekEmployees.find(
    (e) =>
      (entry.directoryId && e.directoryId === entry.directoryId) ||
      normalizeEmpName(e.name) === normalizeEmpName(entry.employeeName),
  );
  const dayKey = dayKeyForIsoInWeek(targetDate, weekFrom);
  if (emp && dayKey) {
    const payHours = dayTotalHours(emp.days[dayKey]);
    if (payHours > 0) return { ...base, hours: payHours };
  }
  return { ...base, hours: DEFAULT_JOB_ENTRY_HOURS };
}

function employeeRefForAlert(
  alert: PayrollJobConsistencyAlert,
  weekEmployees: WeekEmployee[],
  directory: DirectoryEmployee[],
): Pick<WeekEmployee, "directoryId" | "name"> {
  const weekEmp = weekEmployees.find((e) => normalizeEmpName(e.name) === normalizeEmpName(alert.name));
  if (weekEmp) return weekEmp;
  const dir = directory.find((d) => normalizeEmpName(d.name) === normalizeEmpName(alert.name));
  return { directoryId: dir?.id || "", name: alert.name };
}

function pickJobForConsistencyFix(
  empRef: Pick<WeekEmployee, "directoryId" | "name">,
  jobs: Job[],
  weekFrom: string,
  weekTo: string,
  directory: DirectoryEmployee[],
): Job | null {
  const inWeek = (d: string) => d >= weekFrom && d <= weekTo;
  const scores = new Map<string, number>();
  for (const job of jobs) {
    if (job.status !== "in_progress") continue;
    const count = job.workEntries.filter(
      (e) => inWeek(e.date) && workEntryMatchesEmployee(empRef, e, directory),
    ).length;
    if (count > 0) scores.set(job.id, count);
  }
  if (scores.size > 0) {
    const bestId = [...scores.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return jobs.find((j) => j.id === bestId) ?? null;
  }
  return jobs.find((j) => j.status === "in_progress") ?? null;
}

function jobsForMultiSiteSplit(
  empRef: Pick<WeekEmployee, "directoryId" | "name">,
  jobs: Job[],
  dateIso: string,
  weekFrom: string,
  weekTo: string,
  directory: DirectoryEmployee[],
): Job[] {
  const yesterday = previousIsoDate(dateIso);
  const yesterdayIds = new Set(
    jobs
      .filter((job) =>
        job.status === "in_progress" &&
        job.workEntries.some(
          (e) => e.date === yesterday && workEntryMatchesEmployee(empRef, e, directory),
        ),
      )
      .map((j) => j.id),
  );
  if (yesterdayIds.size > 0) return jobs.filter((j) => yesterdayIds.has(j.id));

  const weekIds = new Set(
    jobs
      .filter((job) =>
        job.status === "in_progress" &&
        job.workEntries.some(
          (e) =>
            e.date >= weekFrom &&
            e.date <= weekTo &&
            workEntryMatchesEmployee(empRef, e, directory),
        ),
      )
      .map((j) => j.id),
  );
  if (weekIds.size > 0) return jobs.filter((j) => weekIds.has(j.id));

  return jobs.filter((j) => j.status === "in_progress");
}

function distributeHoursAcrossEntries(
  allMatches: { jobId: string; entryId: string; hours: number }[],
  targetHours: number,
): Map<string, number> {
  const hourByEntryId = new Map<string, number>();
  if (allMatches.length === 0) return hourByEntryId;
  if (allMatches.length === 1) {
    hourByEntryId.set(allMatches[0].entryId, targetHours);
    return hourByEntryId;
  }
  const currentTotal = allMatches.reduce((s, m) => s + m.hours, 0);
  let assigned = 0;
  for (let i = 0; i < allMatches.length; i++) {
    const m = allMatches[i];
    if (i === allMatches.length - 1) {
      hourByEntryId.set(m.entryId, +(targetHours - assigned).toFixed(2));
    } else {
      const share =
        currentTotal > 0
          ? (m.hours / currentTotal) * targetHours
          : targetHours / allMatches.length;
      const h = +share.toFixed(2);
      hourByEntryId.set(m.entryId, h);
      assigned += h;
    }
  }
  return hourByEntryId;
}

/** Dopasowuje wpisy na robotach do godzin z listy płac (lista płac ma pierwszeństwo). */
function fixJobsForConsistencyAlert(
  jobs: Job[],
  alert: PayrollJobConsistencyAlert,
  weekEmployees: WeekEmployee[],
  weekFrom: string,
  weekTo: string,
  directory: DirectoryEmployee[],
): Job[] {
  const empRef = employeeRefForAlert(alert, weekEmployees, directory);
  const multiSite = alert.multiSite ?? isMultiSiteEmployee(empRef, directory);
  const targetHours = alert.payrollHours;
  const matchesEntry = (we: WorkEntry) =>
    we.date === alert.dateIso && workEntryMatchesEmployee(empRef, we, directory);

  const allMatches = jobs.flatMap((j) =>
    j.workEntries
      .filter(matchesEntry)
      .map((we) => ({ jobId: j.id, entryId: we.id, hours: we.hours })),
  );
  const hasEntries = allMatches.length > 0;

  const weekEmp = weekEmployees.find(
    (e) =>
      (empRef.directoryId && e.directoryId === empRef.directoryId) ||
      normalizeEmpName(e.name) === normalizeEmpName(empRef.name),
  );
  const dirEmp = directoryEmployeeForRef(empRef, directory);
  const rate = weekEmp ? parseFloat(weekEmp.rate) || 0 : parseFloat(dirEmp?.defaultRate || "0") || 0;

  if (targetHours <= 0.01) {
    return jobs.map((job) => {
      if (!job.workEntries.some(matchesEntry)) return job;
      return appendJobActivity(
        { ...job, workEntries: job.workEntries.filter((we) => !matchesEntry(we)) },
        "work_entry",
        `${alert.name}: usunięto wpis ${alert.dayLabel} (brak w liście płac)`,
        "Pulpit",
      );
    });
  }

  if (!hasEntries) {
    if (multiSite) {
      const targetJobs = jobsForMultiSiteSplit(empRef, jobs, alert.dateIso, weekFrom, weekTo, directory);
      if (targetJobs.length === 0) return jobs;
      const perJob = +(targetHours / targetJobs.length).toFixed(2);
      let remainder = targetHours;
      return jobs.map((job, _ji) => {
        const idx = targetJobs.findIndex((tj) => tj.id === job.id);
        if (idx < 0) return job;
        const h =
          idx === targetJobs.length - 1
            ? +remainder.toFixed(2)
            : perJob;
        remainder -= h;
        const newEntry: WorkEntry = {
          id: crypto.randomUUID(),
          directoryId: empRef.directoryId || dirEmp?.id || "",
          employeeName: empRef.name,
          date: alert.dateIso,
          hours: h,
          rate,
          notes: "Logistyka — z listy płac",
        };
        return appendJobActivity(
          { ...job, workEntries: [...job.workEntries, newEntry] },
          "work_entry",
          `${alert.name}: ${fmtH(h)} — ${alert.dayLabel} (${formatJobStreet(job)})`,
          "Pulpit",
        );
      });
    }
    const targetJob = pickJobForConsistencyFix(empRef, jobs, weekFrom, weekTo, directory);
    if (!targetJob) return jobs;
    const newEntry: WorkEntry = {
      id: crypto.randomUUID(),
      directoryId: empRef.directoryId || dirEmp?.id || "",
      employeeName: empRef.name,
      date: alert.dateIso,
      hours: targetHours,
      rate,
      notes: "Uzupełnione z listy płac",
    };
    return jobs.map((job) =>
      job.id !== targetJob.id
        ? job
        : appendJobActivity(
            { ...job, workEntries: [...job.workEntries, newEntry] },
            "work_entry",
            `${alert.name}: ${fmtH(targetHours)} — ${alert.dayLabel} (z listy płac)`,
            "Pulpit",
          ),
    );
  }

  const hourByEntryId = distributeHoursAcrossEntries(allMatches, targetHours);
  const fixLabel = multiSite && allMatches.length > 1
    ? `${alert.name}: ${fmtH(targetHours)} — ${alert.dayLabel} (rozdzielono na ${allMatches.length} roboty)`
    : `${alert.name}: ${fmtH(targetHours)} — ${alert.dayLabel} (dopasowano do listy płac)`;

  return jobs.map((job) => {
    if (!job.workEntries.some((we) => hourByEntryId.has(we.id))) return job;
    const nextEntries = job.workEntries.map((we) =>
      hourByEntryId.has(we.id) ? { ...we, hours: hourByEntryId.get(we.id)! } : we,
    );
    return appendJobActivity({ ...job, workEntries: nextEntries }, "work_entry", fixLabel, "Pulpit");
  });
}

function payrollHoursForDirectoryOnDate(
  dirId: string,
  dateIso: string,
  weekEmployees: WeekEmployee[],
  weekFrom: string,
): number {
  const emp = weekEmployees.find((e) => e.directoryId === dirId);
  const dayKey = dayKeyForIsoInWeek(dateIso, weekFrom);
  if (!emp || !dayKey) return 0;
  return dayTotalHours(emp.days[dayKey]);
}

function workEntryGroupKey(entry: WorkEntry): string {
  return entry.directoryId || `name:${entry.employeeName}`;
}

interface WorkEntryGroup {
  key: string;
  directoryId: string;
  employeeName: string;
  entries: WorkEntry[];
  totalHours: number;
  totalCost: number;
  dayCount: number;
}

function groupWorkEntriesByEmployee(entries: WorkEntry[]): WorkEntryGroup[] {
  const map = new Map<string, WorkEntry[]>();
  for (const e of entries) {
    const k = workEntryGroupKey(e);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(e);
  }
  return [...map.entries()]
    .map(([key, ents]) => {
      const sorted = [...ents].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
      return {
        key,
        directoryId: sorted[0].directoryId,
        employeeName: sorted[0].employeeName,
        entries: sorted,
        totalHours: sorted.reduce((s, e) => s + e.hours, 0),
        totalCost: sorted.reduce((s, e) => s + e.hours * e.rate, 0),
        dayCount: new Set(sorted.map((e) => e.date)).size,
      };
    })
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName, "pl"));
}

function collectEntriesFromYesterday(
  job: Job,
  targetDate: string,
  weekEmployees: WeekEmployee[],
  weekFrom: string,
  directory: DirectoryEmployee[],
): WorkEntry[] {
  const yesterday = previousIsoDate(targetDate);
  const existingToday = new Set(
    job.workEntries
      .filter((e) => e.date === targetDate)
      .map((e) => e.directoryId || e.employeeName),
  );
  return job.workEntries
    .filter((e) => e.date === yesterday)
    .filter((e) => !existingToday.has(e.directoryId || e.employeeName))
    .map((e) => duplicateWorkEntryWithPayrollHours(e, targetDate, weekEmployees, weekFrom, directory));
}

function workEntriesFromPayrollForDate(
  job: Job,
  weekEmployees: WeekEmployee[],
  weekFrom: string,
  targetDate: string,
): WorkEntry[] {
  const dayKey = dayKeyForIsoInWeek(targetDate, weekFrom);
  if (!dayKey) return [];
  const existingToday = new Set(
    job.workEntries.filter((e) => e.date === targetDate).map((e) => e.directoryId),
  );
  const out: WorkEntry[] = [];
  for (const emp of weekEmployees) {
    const day = emp.days[dayKey];
    if (!day || !emp.directoryId) continue;
    const hours = dayTotalHours(day);
    if (hours <= 0) continue;
    if (existingToday.has(emp.directoryId)) continue;
    const extraNotes = (day.extraHours ?? [])
      .filter((e) => hoursWorked(e.from, e.to) > 0)
      .map((e) => `${e.from}–${e.to}${e.description.trim() ? `: ${e.description.trim()}` : ""}`)
      .join("; ");
    out.push({
      id: crypto.randomUUID(),
      directoryId: emp.directoryId,
      employeeName: emp.name,
      date: targetDate,
      hours,
      rate: parseFloat(emp.rate) || 0,
      notes: extraNotes ? `Dodatkowe: ${extraNotes}` : "",
    });
  }
  return out;
}

function defaultJob(): Job {
  return {
    id: crypto.randomUUID(), address: "", flatNumber: "", client: "Wrocławskie Mieszkania",
    startDate: new Date().toISOString().slice(0,10), endDate: "", status: "in_progress",
    keysHandedOver: false,
    notes: "",
    documents: Object.fromEntries(DOCUMENT_TYPES.map(d=>[d,false])) as Record<DocType,boolean>,
    workEntries: [],
    materials: [],
    invoiceStatus: "pending",
    invoiceNumber: "",
    invoiceAmount: "",
    photos: [],
    workerReports: [],
    activityLog: [],
  };
}

function normalizeJob(job: Job): Job {
  return normalizeJobMetaFields(normalizeJobWmFields(syncJobDocumentsFromFiles({
    ...job,
    photos: job.photos || [],
    workerReports: job.workerReports || [],
    activityLog: job.activityLog || [],
    materials: job.materials || [],
    jobFiles: job.jobFiles || [],
  })));
}

function clientShareToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

function clientShareUrl(token: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/?podglad=${token}`;
}

async function prepareWatermarkedPhoto(job: Job, file: File): Promise<File> {
  return watermarkedFile(file, jobWatermarkLines(job.address, job.flatNumber));
}

const ACTIVITY_LABELS: Record<JobActivityType, string> = {
  photo_upload: "Zdjęcie",
  photo_approved: "Akceptacja zdjęcia",
  photo_rejected: "Odrzucenie zdjęcia",
  report_add: "Raport",
  report_edit: "Edycja raportu",
  report_delete: "Usunięcie raportu",
  status_change: "Status",
  document: "Dokument",
  note: "Notatka",
  share_link: "Link klienta",
  email_sent: "Email",
  material: "Materiał",
  work_entry: "Czas pracy",
  inspector_document: "Inspektor · dokument",
  inspector_file: "Inspektor · plik",
  inspector_stage: "Inspektor · etap",
  inspector_note: "Inspektor · notatka",
  inspector_photo: "Inspektor · zdjęcie",
};

function jobMissingRequiredDocs(job: Job): DocType[] {
  return REQUIRED_DOCS.filter((d) => !job.documents[d]);
}

function jobDaysSinceStart(job: Job): number {
  const start = new Date(job.startDate);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, Math.round((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function jobWorkerReports(job: Job): WorkerJobReport[] {
  return (job.workerReports || []).map(normalizeWorkerReport);
}

function reportNeedsAdminAttention(r: WorkerJobReport): boolean {
  if (!r.adminReviewedAt) return true;
  if (r.updatedAt && r.updatedAt > r.adminReviewedAt) return true;
  return false;
}

function normalizeWorkItem(raw: unknown): WorkReportItem {
  if (typeof raw === "string") {
    return { id: crypto.randomUUID(), text: raw, note: "" };
  }
  const o = raw as Partial<WorkReportItem>;
  return {
    id: o.id || crypto.randomUUID(),
    text: o.text || "",
    note: o.note || "",
  };
}

function normalizeWorkerReport(r: WorkerJobReport): WorkerJobReport {
  const items = Array.isArray(r.workItems) ? r.workItems.map(normalizeWorkItem) : [];
  const workScopeText = r.workScopeText?.trim()
    ? r.workScopeText
    : workItemsToScopeText(items);
  const syncedItems = workScopeText.trim() ? scopeTextToWorkItems(workScopeText) : items;
  return {
    ...r,
    workScopeText,
    workItems: syncedItems,
    generalNote: r.generalNote || "",
    sketchNote: r.sketchNote || "",
    rooms: (r.rooms || []).map((room) => ({
      ...room,
      note: room.note || "",
    })),
  };
}

function workItemHasContent(item: WorkReportItem): boolean {
  return Boolean(item.text.trim() || item.note.trim());
}

function roomHasContent(room: RoomDimension): boolean {
  return Boolean(room.length.trim() || room.width.trim() || room.height.trim() || (room.note || "").trim());
}

function roomDisplayName(room: RoomDimension, pokojIndex: number): string {
  if (room.roomType === "pokoj") return room.customLabel.trim() || `Pokój ${pokojIndex + 1}`;
  if (room.roomType === "inne") return room.customLabel.trim() || "Inne";
  return ROOM_TYPE_LABELS[room.roomType];
}

function defaultRoom(roomType: RoomTypeKey, customLabel = ""): RoomDimension {
  return { id: crypto.randomUUID(), roomType, customLabel, length: "", width: "", height: "", note: "" };
}

function jobDuration(job: Job): number {
  const end = job.endDate ? new Date(job.endDate) : new Date();
  const start = new Date(job.startDate);
  return Math.max(0, Math.round((end.getTime()-start.getTime())/(1000*60*60*24)));
}
function jobCost(job: Job): number {
  return job.workEntries.reduce((s,e)=>s+e.hours*e.rate,0);
}
function jobTotalHours(job: Job): number {
  return job.workEntries.reduce((s,e)=>s+e.hours,0);
}
function jobMaterialsCost(job: Job): number {
  return (job.materials||[]).reduce((s,m)=>s+m.cost,0);
}
function jobTotalCost(job: Job): number {
  return jobCost(job)+jobMaterialsCost(job);
}

const GALLERY_ARCHIVE_DAYS = 30;

function jobDisplayTitle(job: Job): string {
  const addr = job.address?.trim() || "Bez adresu";
  return job.flatNumber ? `${addr} m.${job.flatNumber}` : addr;
}

function jobApprovedPhotos(job: Job): PhotoEntry[] {
  return (job.photos || []).filter((p) => p.status === "approved" && p.publicUrl);
}

function jobHandoverIso(job: Job): string | null {
  if (job.status !== "completed" || !job.keysHandedOver) return null;
  if (job.endDate) return job.endDate;
  const log = job.activityLog || [];
  for (let i = log.length - 1; i >= 0; i--) {
    const a = log[i];
    if (a.type === "status_change") return a.at.slice(0, 10);
  }
  return job.startDate || null;
}

function daysSinceIso(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const then = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((today.getTime() - then.getTime()) / 86400000);
}

type JobGalleryBucket = "active" | "grace" | "archived";

function jobGalleryBucket(job: Job): JobGalleryBucket | null {
  if (jobApprovedPhotos(job).length === 0) return null;
  if (job.status !== "completed" || !job.keysHandedOver) return "active";
  const handoverIso = jobHandoverIso(job);
  if (!handoverIso) return "grace";
  return daysSinceIso(handoverIso) <= GALLERY_ARCHIVE_DAYS ? "grace" : "archived";
}

function galleryDaysUntilArchive(job: Job): number | null {
  const handoverIso = jobHandoverIso(job);
  if (!handoverIso) return null;
  return Math.max(0, GALLERY_ARCHIVE_DAYS - daysSinceIso(handoverIso));
}

function todayDayKey(): DayKey|null {
  const d=new Date().getDay(); return d===0?null:DAYS[d-1];
}

function localIsoDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayIsoDate(): string {
  return localIsoDate();
}

function personNamesMatch(a: string, b: string): boolean {
  const na = a.trim().toLowerCase().replace(/\s+/g, " ");
  const nb = b.trim().toLowerCase().replace(/\s+/g, " ");
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const fa = na.split(" ")[0];
  const fb = nb.split(" ")[0];
  return fa.length > 2 && fa === fb;
}

/** Dopasowanie wpisu na robocie — bez mylenia np. „Tomek od Mikołaja” z innym „Tomekiem”. */
function workEntryNamesMatch(a: string, b: string): boolean {
  const na = a.trim().toLowerCase().replace(/\s+/g, " ");
  const nb = b.trim().toLowerCase().replace(/\s+/g, " ");
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(" od ") || nb.includes(" od ")) return false;
  const partsA = na.split(" ");
  const partsB = nb.split(" ");
  if (partsA.length === 1 && partsB.length === 1 && partsA[0].length > 2) {
    return partsA[0] === partsB[0];
  }
  return false;
}

function workEntryMatchesEmployee(
  emp: Pick<WeekEmployee, "directoryId" | "name">,
  we: Pick<WorkEntry, "directoryId" | "employeeName">,
  directory: DirectoryEmployee[],
): boolean {
  if (emp.directoryId && we.directoryId) {
    return emp.directoryId === we.directoryId;
  }
  if (we.directoryId) {
    const dir = directory.find((d) => d.id === we.directoryId);
    if (emp.directoryId) return false;
    if (dir && workEntryNamesMatch(emp.name, dir.name)) return true;
  }
  if (emp.directoryId) {
    const dir = directory.find((d) => d.id === emp.directoryId);
    if (we.directoryId) return false;
    if (dir && workEntryNamesMatch(dir.name, we.employeeName)) return true;
  }
  return workEntryNamesMatch(emp.name, we.employeeName);
}

function fridayIsoOfWeek(weekFrom: string): string {
  const [y, m, d] = weekFrom.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 4);
  return localIsoDate(dt);
}

function findWeekEmployeeForWorker(
  weekEmployees: WeekEmployee[],
  workerId: string,
  workerName: string,
): WeekEmployee | null {
  if (workerId) {
    const byId = weekEmployees.find((e) => e.directoryId === workerId);
    if (byId) return byId;
  }
  return weekEmployees.find((e) => personNamesMatch(e.name, workerName)) ?? null;
}

interface WorkerPayoutRow {
  weekFrom: string;
  weekTo: string;
  savedAt: string;
  netPay: number;
  totalHours: number;
  settled: boolean;
}

function workerPayoutHistory(
  savedWeeks: WeekSnapshot[],
  workerId: string,
  workerName: string,
): WorkerPayoutRow[] {
  const rows: WorkerPayoutRow[] = [];
  for (const week of savedWeeks) {
    const fromDetail = week.weekEmployees?.find(
      (e) => (workerId && e.directoryId === workerId) || personNamesMatch(e.name, workerName),
    );
    if (fromDetail) {
      const calc = calcWeekEmployee(fromDetail);
      rows.push({
        weekFrom: week.weekFrom,
        weekTo: week.weekTo,
        savedAt: week.savedAt,
        netPay: calc.netPay,
        totalHours: calc.totalHours,
        settled: fromDetail.settled,
      });
      continue;
    }
    const snap = week.employees.find((e) => personNamesMatch(e.name, workerName));
    if (snap) {
      rows.push({
        weekFrom: week.weekFrom,
        weekTo: week.weekTo,
        savedAt: week.savedAt,
        netPay: snap.netPay,
        totalHours: snap.totalHours,
        settled: snap.settled,
      });
    }
  }
  return rows.sort((a, b) => b.weekFrom.localeCompare(a.weekFrom));
}

function employeeMatchesWorkEntry(
  emp: WeekEmployee,
  we: WorkEntry,
  directory: DirectoryEmployee[],
): boolean {
  return workEntryMatchesEmployee(emp, we, directory);
}

function sortJobsActiveFirst(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    if (a.status === "in_progress" && b.status !== "in_progress") return -1;
    if (b.status === "in_progress" && a.status !== "in_progress") return 1;
    return 0;
  });
}

/** Pulpit: adres roboty — tylko wpis czasu pracy z dzisiejszą datą (Roboty → Dodaj wpis). */
function jobsForEmployeeOnDashboard(
  emp: WeekEmployee,
  jobs: Job[],
  dateIso: string,
  _weekFrom: string,
  _weekTo: string,
  directory: DirectoryEmployee[],
): Job[] {
  const active = jobs.filter((j) => j.status === "in_progress");
  return sortJobsActiveFirst(
    active.filter((job) =>
      job.workEntries.some(
        (we) => we.date === dateIso && employeeMatchesWorkEntry(emp, we, directory),
      ),
    ),
  );
}

function weekDayColumns(weekFrom: string): { key: DayKey; iso: string; shortLabel: string; dateLabel: string }[] {
  const [y, m, d] = weekFrom.split("-").map(Number);
  const mon = new Date(y, m - 1, d);
  const short: Record<DayKey, string> = { Pn: "Pn", Wt: "Wt", Sr: "Śr", Cz: "Cz", Pt: "Pt", So: "So" };
  return DAYS.map((key, i) => {
    const dt = new Date(mon);
    dt.setDate(mon.getDate() + i);
    const iso = localIsoDate(dt);
    const [, mo, day] = iso.split("-");
    return { key, iso, shortLabel: short[key], dateLabel: `${day}.${mo}` };
  });
}

function shortJobAddress(job: Job): string {
  const a = job.address?.trim() || "—";
  const base = a.length > 24 ? `${a.slice(0, 22)}…` : a;
  return job.flatNumber ? `${base} m.${job.flatNumber}` : base;
}

function jobsForEmployeeOnIsoDate(
  emp: WeekEmployee,
  jobs: Job[],
  dateIso: string,
  directory: DirectoryEmployee[],
): Job[] {
  return sortJobsActiveFirst(
    jobs.filter((job) =>
      job.workEntries.some(
        (we) => we.date === dateIso && employeeMatchesWorkEntry(emp, we, directory),
      ),
    ),
  );
}

function scheduleCellFor(
  emp: WeekEmployee,
  dayKey: DayKey,
  dateIso: string,
  jobs: Job[],
  directory: DirectoryEmployee[],
): { working: boolean; timeRange: string; hoursLabel: string; locations: string[] } {
  const day = emp.days[dayKey];
  const activeJobs = jobs.filter((j) => j.status === "in_progress");
  const jobList = jobsForEmployeeOnIsoDate(emp, activeJobs, dateIso, directory);
  const locations = jobList.map(shortJobAddress);
  const extraList = day.extraHours ?? [];
  const totalH = dayTotalHours(day);
  const working = day.active || extraList.length > 0 || locations.length > 0;
  const timeParts: string[] = [];
  if (day.active) timeParts.push(`${day.from}–${day.to}`);
  for (const ex of extraList) {
    if (hoursWorked(ex.from, ex.to) > 0) timeParts.push(`${ex.from}–${ex.to}`);
  }
  return {
    working,
    timeRange: timeParts.join(" + "),
    hoursLabel: totalH > 0 ? fmtH(totalH) : "",
    locations,
  };
}

function collectWorkEntriesForWeek(jobs: Job[], weekFrom: string, weekTo: string): ArchivedWorkEntry[] {
  const out: ArchivedWorkEntry[] = [];
  for (const job of jobs) {
    for (const we of job.workEntries) {
      if (we.date >= weekFrom && we.date <= weekTo) {
        out.push({
          jobId: job.id,
          address: job.address,
          flatNumber: job.flatNumber,
          directoryId: we.directoryId,
          employeeName: we.employeeName,
          date: we.date,
          hours: we.hours,
          rate: we.rate,
        });
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.employeeName.localeCompare(b.employeeName, "pl"));
}

function buildWeekSnapshot(
  weekFrom: string,
  weekTo: string,
  weekEmployees: WeekEmployee[],
  jobs: Job[],
  existing?: WeekSnapshot,
): WeekSnapshot {
  const employees = weekEmployees.map((emp) => {
    const c = calcWeekEmployee(emp);
    return {
      name: emp.name,
      position: emp.position,
      rate: c.rateNum,
      weekHours: c.weekHours,
      prevSatHours: c.prevSatHours,
      totalHours: c.totalHours,
      grossPay: c.grossPay,
      totalZaliczka: c.totalZaliczka,
      totalExtraCosts: c.totalExtraCosts,
      netPay: c.netPay,
      settled: emp.settled,
    };
  });
  return {
    id: existing?.id ?? crypto.randomUUID(),
    weekFrom,
    weekTo,
    savedAt: new Date().toISOString(),
    employees,
    totalEmployees: weekEmployees.length,
    totalHours: weekEmployees.reduce((s, e) => s + calcWeekEmployee(e).totalHours, 0),
    totalGross: weekEmployees.reduce((s, e) => s + calcWeekEmployee(e).grossPay, 0),
    totalZaliczka: weekEmployees.reduce((s, e) => s + calcWeekEmployee(e).totalZaliczka, 0),
    totalNet: weekEmployees.reduce((s, e) => s + calcWeekEmployee(e).netPay, 0),
    weekEmployees: JSON.parse(JSON.stringify(weekEmployees)) as WeekEmployee[],
    workEntries: collectWorkEntriesForWeek(jobs, weekFrom, weekTo),
  };
}

function archivedWorkEntryMatches(
  emp: WeekEmployee,
  we: ArchivedWorkEntry,
  directory: DirectoryEmployee[],
): boolean {
  return workEntryMatchesEmployee(emp, we, directory);
}

function scheduleCellFromArchive(
  emp: WeekEmployee,
  dayKey: DayKey,
  dateIso: string,
  workEntries: ArchivedWorkEntry[],
  directory: DirectoryEmployee[],
): { working: boolean; timeRange: string; hoursLabel: string; locations: string[] } {
  const day = emp.days[dayKey];
  const dayEntries = workEntries.filter(
    (we) => we.date === dateIso && archivedWorkEntryMatches(emp, we, directory),
  );
  const locations = [...new Set(dayEntries.map((we) => {
    const a = we.address?.trim() || "—";
    const base = a.length > 24 ? `${a.slice(0, 22)}…` : a;
    return we.flatNumber ? `${base} m.${we.flatNumber}` : base;
  }))];
  const extraList = day.extraHours ?? [];
  const totalH = dayTotalHours(day);
  const working = day.active || extraList.length > 0 || locations.length > 0;
  const timeParts: string[] = [];
  if (day.active) timeParts.push(`${day.from}–${day.to}`);
  for (const ex of extraList) {
    if (hoursWorked(ex.from, ex.to) > 0) timeParts.push(`${ex.from}–${ex.to}`);
  }
  return {
    working,
    timeRange: timeParts.join(" + "),
    hoursLabel: totalH > 0 ? fmtH(totalH) : "",
    locations,
  };
}

function formatJobStreet(job: Job): string {
  const street = job.address?.trim() || "Bez adresu";
  return job.flatNumber ? `${street} m.${job.flatNumber}` : street;
}

function jobAddressKey(job: Job): string {
  const addr = job.address.trim().toLowerCase().replace(/\s+/g, " ");
  const flat = job.flatNumber.trim().toLowerCase();
  if (!addr) return "";
  return flat ? `${addr}|${flat}` : addr;
}

/** 9 cyfr numeru PL (bez +48) — do logowania pracownika. */
function normalizePhone9(phone: string): string | null {
  const d = phone.replace(/\D/g, "");
  if (d.length < 9) return null;
  return d.slice(-9);
}

function workerHasPhonePin(emp: DirectoryEmployee): boolean {
  return normalizePhone9(emp.phone) !== null;
}

function workerPhonePinValid(emp: DirectoryEmployee, pinInput: string): boolean {
  const stored = normalizePhone9(emp.phone);
  const entered = normalizePhone9(pinInput);
  if (!stored || !entered) return false;
  return stored === entered;
}

function workerHasPersonalPin(emp: DirectoryEmployee): boolean {
  return !!(emp.workerPinHash && emp.workerPinHash.length > 0);
}

async function hashWorkerPin(pin: string): Promise<string> {
  return digestSha256Hex(`wgdom-worker-pin-v1:${pin}`);
}

async function verifyWorkerPin(emp: DirectoryEmployee, pin: string): Promise<boolean> {
  if (!workerHasPersonalPin(emp)) return false;
  const hash = await hashWorkerPin(pin.replace(/\D/g, "").slice(0, 4));
  return hash === emp.workerPinHash;
}

function workerPinTooWeak(emp: DirectoryEmployee, pin: string): boolean {
  const digits = pin.replace(/\D/g, "").slice(0, 4);
  if (digits.length !== 4) return true;
  const phone9 = normalizePhone9(emp.phone);
  if (phone9 && digits === phone9.slice(-4)) return true;
  return false;
}

const ADMIN_PIN_KEY = "kw-admin-pin";

async function uploadPhoto(
  jobId: string,
  file: File,
  label: string,
  uploadedBy: string,
  caption = "",
): Promise<{ entry: PhotoEntry | null; error?: string }> {
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${label}-${Date.now()}.${ext}`;

  try {
    const form = new FormData();
    form.append("file", file);
    form.append("jobId", jobId);
    form.append("filename", filename);

    const res = await fetch(`${API_BASE}/storage-upload`, {
      method: "POST",
      headers: { Authorization: API_HEADERS.Authorization },
      body: form,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return {
        entry: null,
        error: data.error || (res.status === 404
          ? "Serwer zdjęć nie jest wdrożony — zaktualizuj funkcję Supabase (storage-upload)"
          : `Błąd serwera (${res.status})`),
      };
    }

    return {
      entry: {
        id: crypto.randomUUID(),
        path: data.path,
        publicUrl: data.publicUrl,
        label: label as PhotoEntry["label"],
        uploadedBy,
        uploadedAt: new Date().toISOString(),
        status: "pending",
        caption: caption.trim(),
      },
    };
  } catch {
    return { entry: null, error: "Brak połączenia z internetem" };
  }
}

async function uploadReceipt(
  workerKey: string,
  file: File,
): Promise<{ publicUrl: string | null; error?: string }> {
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `receipt-${Date.now()}.${ext}`;
  const jobId = `receipts-${workerKey.replace(/[^a-zA-Z0-9_-]/g, "_") || "worker"}`;

  try {
    const form = new FormData();
    form.append("file", file);
    form.append("jobId", jobId);
    form.append("filename", filename);

    const res = await fetch(`${API_BASE}/storage-upload`, {
      method: "POST",
      headers: { Authorization: API_HEADERS.Authorization },
      body: form,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return {
        publicUrl: null,
        error: data.error || (res.status === 404
          ? "Serwer zdjęć nie jest wdrożony — zaktualizuj funkcję Supabase (storage-upload)"
          : `Błąd serwera (${res.status})`),
      };
    }

    return { publicUrl: data.publicUrl as string };
  } catch {
    return { publicUrl: null, error: "Brak połączenia z internetem" };
  }
}

function useLocalStorage<T>(key: string, initial: T): [T, (v: T|((p:T)=>T))=>void] {
  const [state, setState] = useState<T>(()=>{ try{ const s=localStorage.getItem(key); return s?JSON.parse(s):initial; }catch{ return initial; } });
  const set = useCallback((v: T|((p:T)=>T))=>{
    setState(prev=>{ const next=typeof v==="function"?(v as (p:T)=>T)(prev):v; try{localStorage.setItem(key,JSON.stringify(next));}catch{} return next; });
  },[key]);
  return [state,set];
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Checkbox({checked,onChange}:{checked:boolean;onChange:(v:boolean)=>void}) {
  return <button onClick={()=>onChange(!checked)} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${checked?"bg-primary border-primary":"border-muted-foreground/40"}`}>
    {checked&&<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
  </button>;
}

function StatCard({label,value,sub,icon:Icon,accent=false}:{label:string;value:string;sub?:string;icon:React.ElementType;accent?:boolean}) {
  return <div className={`rounded-xl border p-4 space-y-2 ${accent?"bg-primary/10 border-primary/20":"bg-card border-border"}`}>
    <div className="flex items-center gap-2 text-muted-foreground"><Icon size={13}/><span className="text-xs font-medium uppercase tracking-wider">{label}</span></div>
    <p className={`text-xl font-bold leading-tight ${accent?"text-primary":"text-foreground"}`} style={{fontFamily:"'JetBrains Mono', monospace"}}>{value}</p>
    {sub&&<p className="text-xs text-muted-foreground">{sub}</p>}
  </div>;
}

function NavItemWithHint({
  hint,
  children,
}: {
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative group/navhint">
      {children}
      <div
        role="tooltip"
        className="absolute left-[calc(100%+6px)] top-1/2 -translate-y-1/2 z-[100] w-max max-w-[240px] px-3 py-2 rounded-lg text-[11px] leading-snug text-foreground/90 bg-card/95 backdrop-blur-sm border border-border/80 shadow-lg opacity-0 invisible group-hover/navhint:opacity-100 group-hover/navhint:visible transition-all duration-200 delay-300 group-hover/navhint:delay-500 pointer-events-none"
      >
        {hint}
      </div>
    </div>
  );
}

/** Dymek przy polu formularza — używaj przy nowych opcjach w panelu admina. */
function LabelWithHint({ label, hint, htmlFor }: { label: string; hint: string; htmlFor?: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-xs text-muted-foreground">{label}</label>
      ) : (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
      <div className="relative group/fieldhint shrink-0">
        <HelpCircle size={12} className="text-muted-foreground/55 hover:text-muted-foreground cursor-help" aria-hidden />
        <div
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+6px)] z-[100] w-max max-w-[260px] px-3 py-2 rounded-lg text-[11px] leading-snug text-foreground/90 bg-card/98 backdrop-blur-sm border border-border/80 shadow-lg opacity-0 invisible group-hover/fieldhint:opacity-100 group-hover/fieldhint:visible transition-all duration-200 pointer-events-none"
        >
          {hint}
        </div>
      </div>
    </div>
  );
}

type SpeechRecognitionCtor = new() => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: { length: number; [i: number]: { isFinal?: boolean; [i: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

function speechRecognitionAvailable(): SpeechRecognitionCtor | undefined {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition) as SpeechRecognitionCtor | undefined;
}

function isIosDevice(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function VoiceNoteButton({
  onResult,
  hintClassName,
  focusRef,
}: {
  onResult: (text: string) => void;
  hintClassName?: string;
  focusRef?: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}) {
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState("");
  const recRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ios = isIosDevice();

  const clearWatchdog = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const cleanupRec = () => {
    clearWatchdog();
    try { recRef.current?.abort(); } catch { /* ignore */ }
    recRef.current = null;
    setListening(false);
  };

  useEffect(() => () => cleanupRec(), []);

  const iosKeyboardHint = "Na iPhone: kliknij 🎤 na klawiaturze przy polu tekstowym — to bezpieczne dyktowanie (przycisk w aplikacji zawiesza Safari).";

  const handleClick = () => {
    if (ios) {
      setHint(iosKeyboardHint);
      focusRef?.current?.focus();
      return;
    }

    const SR = speechRecognitionAvailable();
    if (!SR) {
      setHint("Dyktowanie niedostępne — wpisz tekstem.");
      focusRef?.current?.focus();
      return;
    }

    if (listening) {
      cleanupRec();
      return;
    }

    setHint("");
    const rec = new SR();
    rec.lang = "pl-PL";
    rec.interimResults = false;
    rec.continuous = false;

    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript?.trim();
      if (text) onResult(text);
    };

    rec.onend = () => {
      clearWatchdog();
      recRef.current = null;
      setListening(false);
    };

    rec.onerror = (ev) => {
      cleanupRec();
      const code = ev.error;
      if (code === "not-allowed") setHint("Brak dostępu do mikrofonu — zezwól w ustawieniach.");
      else if (code !== "aborted") setHint("Nie udało się nagrać — spróbuj ponownie.");
    };

    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
      timeoutRef.current = setTimeout(() => {
        cleanupRec();
        setHint("Koniec czasu nagrywania — spróbuj ponownie.");
      }, 15000);
    } catch {
      cleanupRec();
      setHint("Nie udało się uruchomić nagrywania.");
    }
  };

  return (
    <div className="shrink-0 flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        title={ios ? "Dyktuj klawiaturą iPhone (🎤)" : listening ? "Zatrzymaj" : "Dyktuj notatkę głosową"}
        className={`p-1.5 rounded-lg transition-colors shrink-0 touch-manipulation ${listening ? "text-destructive animate-pulse bg-destructive/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
      >
        {listening ? <MicOff size={14}/> : <Mic size={14}/>}
      </button>
      {hint && (
        <p className={`text-[10px] text-amber-400/90 leading-snug max-w-[220px] text-right ${hintClassName || ""}`}>
          {hint}
        </p>
      )}
    </div>
  );
}

const KW_LAST_BACKUP_WEEK_KEY = "kw-last-backup-week";

function collectLocalBackupData(overrides?: Partial<Record<string, unknown>>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const k of DATA_KEYS) {
    const v = localStorage.getItem(k);
    if (v) {
      try { data[k] = JSON.parse(v); } catch { /* ignore */ }
    }
  }
  if (overrides) Object.assign(data, overrides);
  return data;
}

/** Email backup — tylko w sobotę, raz na zarchiwizowany tydzień (po zapisie listy płac). */
function triggerWeeklyBackupEmail(
  archivedWeekFrom: string,
  archivedWeekTo: string,
  jobsForSnapshot: Job[],
  archiveOverride?: WeekSnapshot[],
): void {
  if (new Date().getDay() !== 6) return;
  if (localStorage.getItem(KW_LAST_BACKUP_WEEK_KEY) === archivedWeekFrom) return;

  const data = collectLocalBackupData(
    archiveOverride ? { "kw-archive": archiveOverride } : undefined,
  );
  if (Object.keys(data).length === 0) return;

  localStorage.setItem(KW_LAST_BACKUP_WEEK_KEY, archivedWeekFrom);
  if (jobsForSnapshot.length > 0) saveLocalJobsSnapshot(jobsForSnapshot);

  fetch(`${API_BASE}/send-backup-email`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({
      data,
      date: localIsoDate(),
      weekFrom: archivedWeekFrom,
      weekTo: archivedWeekTo,
    }),
  }).catch(() => {});
}

// ─── Employee Calculator (weekly hours detail) ────────────────────────────────

// ─── Employee Calculator (weekly hours detail) ────────────────────────────────

function PayrollDayEditor({
  day,
  title,
  hint,
  titleClass = "",
  variant = "day",
  onUpdate,
}: {
  day: DayData;
  title: string;
  hint?: string;
  titleClass?: string;
  variant?: "day" | "prevSaturday";
  onUpdate: (next: DayData) => void;
}) {
  const updateField = (field: keyof DayData, value: string | boolean) => {
    onUpdate({ ...day, [field]: value });
  };
  const extraList = day.extraHours ?? [];
  const notesList = day.notes ?? [];
  const updateExtra = (next: DayExtraHour[]) => onUpdate({ ...day, extraHours: next });
  const updateNotes = (next: DayNote[]) => onUpdate({ ...day, notes: next, extraHours: variant === "prevSaturday" ? undefined : day.extraHours });
  const baseH = day.active ? hoursWorked(day.from, day.to) : 0;
  const extraH = variant === "prevSaturday" ? 0 : dayExtraHoursOnly(day);
  const totalDayH = variant === "prevSaturday" ? baseH : dayTotalHours(day);
  const hasContent = variant === "prevSaturday" ? day.active || notesList.length > 0 : day.active || extraList.length > 0;

  return (
    <div className={`transition-opacity ${hasContent ? "" : "opacity-50"}`}>
      <div className={`px-4 py-3 ${(variant === "prevSaturday" ? notesList.length : extraList.length) > 0 ? "pb-2" : ""}`}>
        <div className="sm:hidden space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Checkbox checked={day.active} onChange={(v) => updateField("active", v)}/>
              <div className="min-w-0">
                <span className={`text-sm font-medium block truncate ${titleClass}`}>{title}</span>
                {hint && <span className="text-[10px] text-muted-foreground block truncate">{hint}</span>}
              </div>
            </div>
            {totalDayH > 0 && (
              <span className="text-xs font-semibold text-primary shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {fmtH(totalDayH)}{extraH > 0 && baseH > 0 ? ` (+${fmtH(extraH)})` : ""}
              </span>
            )}
          </div>
          {day.active && (
            <div className="grid grid-cols-3 gap-2 pl-8">
              <div><label className="text-xs text-muted-foreground block mb-1">Od</label><input type="time" value={day.from} onChange={(e) => updateField("from", e.target.value)} className="w-full bg-secondary rounded-lg px-2 py-1.5 text-xs border border-transparent focus:border-primary focus:outline-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}/></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Do</label><input type="time" value={day.to} onChange={(e) => updateField("to", e.target.value)} className="w-full bg-secondary rounded-lg px-2 py-1.5 text-xs border border-transparent focus:border-primary focus:outline-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}/></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Zaliczka</label><input type="number" min="0" step="10" placeholder="0" value={day.zaliczka} onChange={(e) => updateField("zaliczka", e.target.value)} className="w-full bg-secondary rounded-lg px-2 py-1.5 text-xs border border-transparent focus:border-primary focus:outline-none placeholder:text-muted-foreground/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}/></div>
            </div>
          )}
        </div>
        <div className="hidden sm:grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,0.75fr)_minmax(0,0.95fr)] items-center gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Checkbox checked={day.active} onChange={(v) => updateField("active", v)}/>
            <div className="min-w-0">
              <span className={`text-sm font-medium block truncate ${titleClass}`}>{title}</span>
              {hint && <span className="text-[10px] text-muted-foreground block truncate">{hint}</span>}
            </div>
          </div>
          <input type="time" value={day.from} disabled={!day.active} onChange={(e) => updateField("from", e.target.value)} className="w-full min-w-0 bg-secondary rounded-lg px-1.5 py-1.5 text-xs text-center border border-transparent focus:border-primary focus:outline-none disabled:cursor-not-allowed" style={{ fontFamily: "'JetBrains Mono', monospace" }}/>
          <input type="time" value={day.to} disabled={!day.active} onChange={(e) => updateField("to", e.target.value)} className="w-full min-w-0 bg-secondary rounded-lg px-1.5 py-1.5 text-xs text-center border border-transparent focus:border-primary focus:outline-none disabled:cursor-not-allowed" style={{ fontFamily: "'JetBrains Mono', monospace" }}/>
          <div className="text-center">
            <span className={`text-xs font-semibold ${totalDayH > 0 ? "text-primary" : "text-muted-foreground/25"}`} style={{ fontFamily: "'JetBrains Mono', monospace" }} title={extraH > 0 ? `w tym ${fmtH(extraH)} dodatkowych` : undefined}>
              {totalDayH > 0 ? fmtH(totalDayH) : "—"}
            </span>
          </div>
          <input type="number" min="0" step="10" placeholder="0" value={day.zaliczka} disabled={!day.active} onChange={(e) => updateField("zaliczka", e.target.value)} className="w-full min-w-0 bg-secondary rounded-lg px-1.5 py-1.5 text-xs text-center border border-transparent focus:border-primary focus:outline-none disabled:cursor-not-allowed placeholder:text-muted-foreground/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}/>
        </div>
      </div>
      {variant === "prevSaturday" ? (
        <div className="px-4 pb-3 sm:pl-10 space-y-2">
          {notesList.map((note) => (
            <div key={note.id} className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5 flex items-start gap-2">
              <FileText size={12} className="text-amber-500 shrink-0 mt-1"/>
              <textarea
                rows={2}
                placeholder="Opis (np. co robiono, ilu pracowników wypożyczono, kwota do rozliczenia)"
                value={note.text}
                onChange={(e) => updateNotes(notesList.map((item) => item.id === note.id ? { ...item, text: e.target.value } : item))}
                className="flex-1 min-w-0 bg-background rounded-lg px-2.5 py-1.5 text-xs border border-transparent focus:border-amber-500/40 focus:outline-none resize-y min-h-[2.5rem]"
              />
              <button type="button" onClick={() => updateNotes(notesList.filter((item) => item.id !== note.id))} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"><Trash2 size={13}/></button>
            </div>
          ))}
          <button type="button" onClick={() => updateNotes([...notesList, { id: crypto.randomUUID(), text: "" }])} className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-500 transition-colors">
            <Plus size={12}/> Opis
          </button>
        </div>
      ) : (
        <div className="px-4 pb-3 sm:pl-10 space-y-2">
          {extraList.map((ex) => {
            const exH = hoursWorked(ex.from, ex.to);
            return (
              <div key={ex.id} className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-primary shrink-0"/>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">Dodatkowe godziny</span>
                  {exH > 0 && <span className="ml-auto text-xs font-semibold text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtH(exH)}</span>}
                </div>
                <input type="text" placeholder="Opis (np. dogrywka, transport)" value={ex.description} onChange={(e) => updateExtra(extraList.map((item) => item.id === ex.id ? { ...item, description: e.target.value } : item))} className="w-full bg-background rounded-lg px-2.5 py-1.5 text-xs border border-transparent focus:border-primary focus:outline-none"/>
                <div className="flex items-center gap-2">
                  <input type="time" value={ex.from} onChange={(e) => updateExtra(extraList.map((item) => item.id === ex.id ? { ...item, from: e.target.value } : item))} className="flex-1 bg-background rounded-lg px-2 py-1.5 text-xs text-center border border-transparent focus:border-primary focus:outline-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}/>
                  <span className="text-xs text-muted-foreground">–</span>
                  <input type="time" value={ex.to} onChange={(e) => updateExtra(extraList.map((item) => item.id === ex.id ? { ...item, to: e.target.value } : item))} className="flex-1 bg-background rounded-lg px-2 py-1.5 text-xs text-center border border-transparent focus:border-primary focus:outline-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}/>
                  <button type="button" onClick={() => updateExtra(extraList.filter((item) => item.id !== ex.id))} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"><Trash2 size={13}/></button>
                </div>
              </div>
            );
          })}
          <button type="button" onClick={() => updateExtra([...extraList, { id: crypto.randomUUID(), description: "", from: "16:00", to: "18:00" }])} className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
            <Plus size={12}/> Dodatkowe godziny — {title}
          </button>
        </div>
      )}
    </div>
  );
}

const AdminAccessContext = createContext<{ session: AdminSession | null; canViewRates: boolean }>({
  session: null,
  canViewRates: true,
});

function useAdminAccess() {
  return useContext(AdminAccessContext);
}

function WeekEmployeeDetail({emp, weekFrom, onChange, onClose}:{emp:WeekEmployee; weekFrom:string; onChange:(u:WeekEmployee)=>void; onClose:()=>void}) {
  const { canViewRates } = useAdminAccess();
  const updateDayData = useCallback((key: DayKey, next: DayData) => {
    onChange({ ...emp, days: { ...emp.days, [key]: next } });
  }, [emp, onChange]);
  const prevSatIso = previousSaturdayIso(weekFrom);
  const extraCosts = emp.extraCosts ?? [];
  const updateExtraCosts = useCallback((next: EmployeeExtraCost[]) => {
    onChange({ ...emp, extraCosts: next });
  }, [emp, onChange]);
  const addExtraCost = () => {
    updateExtraCosts([...extraCosts, { id: crypto.randomUUID(), description: "", amount: "" }]);
  };
  const {
    weekHours, prevSatHours, totalHours, totalExtraHours,
    totalZaliczka, totalExtraCosts, grossPay, weekGross, prevSatGross, netPay, rateNum,
  } = calcWeekEmployee(emp);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div>
          <p className="text-sm font-semibold">{emp.name||"Pracownik"}</p>
          <p className="text-xs text-muted-foreground">{emp.position||"—"}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><X size={16}/></button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5 space-y-5">
        {canViewRates && (
        <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3">
          <Banknote size={14} className="text-muted-foreground shrink-0"/>
          <span className="text-sm text-muted-foreground flex-1">Stawka w tym tygodniu</span>
          <input type="number" min="0" step="0.50" value={emp.rate}
            onChange={(e)=>onChange({...emp,rate:e.target.value})}
            className="w-24 bg-background rounded-lg px-2 py-1.5 text-sm text-right border border-transparent focus:border-primary focus:outline-none"
            style={{fontFamily:"'JetBrains Mono', monospace"}}/>
          <span className="text-xs text-muted-foreground">PLN/h</span>
        </div>
        )}

        {/* Days */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="hidden sm:grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,0.75fr)_minmax(0,0.95fr)] px-4 py-2 text-xs text-muted-foreground border-b border-border gap-2" style={{fontFamily:"'JetBrains Mono', monospace"}}>
            <span>Dzień</span><span className="text-center">Od</span><span className="text-center">Do</span><span className="text-center">Godziny</span><span className="text-center">Zaliczka</span>
          </div>
          <div className="divide-y divide-border">
            <div className="bg-amber-500/5 border-b border-amber-500/15">
              <PayrollDayEditor
                day={getPrevSaturday(emp)}
                title={PREV_SAT_SHORT}
                hint={`${fmtDate(prevSatIso)} · wypłata w tym tygodniu`}
                titleClass="text-amber-500"
                variant="prevSaturday"
                onUpdate={(next) => onChange({ ...emp, prevSaturday: { ...next, extraHours: undefined } })}
              />
            </div>
            {DAYS.map((key) => (
              <PayrollDayEditor
                key={key}
                day={emp.days[key]}
                title={DAY_LABELS[key]}
                titleClass={key === "So" ? "text-primary" : ""}
                hint={key === "So" ? "Bieżąca sobota — czasem wypłata w sobotę" : undefined}
                onUpdate={(next) => updateDayData(key, next)}
              />
            ))}
          </div>
          <p className="hidden sm:block px-4 py-2 text-[10px] text-muted-foreground/60 border-t border-border/50">Sob. poprz. = sobota z poprzedniego tygodnia (płatna teraz). Bieżąca sobota = ostatni dzień tygodnia Pn–So.</p>
        </div>

        {/* Koszty do zwrotu */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <p className="text-sm font-semibold">Koszty do zwrotu</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Chemia, paliwo, zakupy na budowę — dopłata do wypłaty</p>
            </div>
            <button type="button" onClick={addExtraCost} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-medium text-foreground transition-colors">
              <Plus size={13}/> Dodaj
            </button>
          </div>
          {extraCosts.length === 0 ? (
            <p className="px-4 py-4 text-xs text-muted-foreground text-center">Brak kosztów w tym tygodniu</p>
          ) : (
            <div className="divide-y divide-border">
              {extraCosts.map((cost) => {
                const st = extraCostStatus(cost);
                return (
                <div key={cost.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <input
                      type="text"
                      placeholder="Opis (np. chemia, paliwo)"
                      value={cost.description}
                      onChange={(e) => updateExtraCosts(extraCosts.map((c) => c.id === cost.id ? { ...c, description: e.target.value } : c))}
                      className="flex-1 min-w-0 bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={cost.amount}
                      onChange={(e) => updateExtraCosts(extraCosts.map((c) => c.id === cost.id ? { ...c, amount: e.target.value } : c))}
                      className="w-24 shrink-0 bg-secondary rounded-lg px-2 py-2 text-sm text-right border border-transparent focus:border-primary focus:outline-none"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    />
                    <span className="text-xs text-muted-foreground pt-2.5 shrink-0">PLN</span>
                    <button
                      type="button"
                      onClick={() => updateExtraCosts(extraCosts.filter((c) => c.id !== cost.id))}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-0.5">
                    {st !== "approved" && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        st === "pending" ? "bg-yellow-500/15 text-yellow-400" : "bg-red-500/15 text-red-400"
                      }`}>
                        {EXTRA_COST_STATUS_LABELS[st]}
                      </span>
                    )}
                    {cost.submittedBy && (
                      <span className="text-[10px] text-muted-foreground">od {cost.submittedBy}</span>
                    )}
                    {cost.receiptUrl && (
                      <a href={cost.receiptUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline flex items-center gap-1">
                        <Receipt size={10}/> Paragon / faktura
                      </a>
                    )}
                    {st === "rejected" && cost.rejectReason && (
                      <span className="text-[10px] text-red-400/90 italic">Powód: {cost.rejectReason}</span>
                    )}
                    {st === "pending" && (
                      <>
                        <button type="button"
                          onClick={() => updateExtraCosts(extraCosts.map((c) => c.id === cost.id ? { ...c, status: "approved" as const, rejectReason: undefined } : c))}
                          className="text-[10px] px-2 py-1 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 font-medium flex items-center gap-1">
                          <ThumbsUp size={10}/> Akceptuj
                        </button>
                        <button type="button"
                          onClick={() => {
                            const reason = window.prompt("Powód odrzucenia (opcjonalnie):", "") ?? "";
                            updateExtraCosts(extraCosts.map((c) => c.id === cost.id ? {
                              ...c,
                              status: "rejected" as const,
                              rejectReason: reason.trim() || undefined,
                            } : c));
                          }}
                          className="text-[10px] px-2 py-1 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 font-medium flex items-center gap-1">
                          <ThumbsDown size={10}/> Odrzuć
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );})}
            </div>
          )}
        </div>

        {/* Mini summary */}
        <div className="space-y-2">
          <div className="flex justify-between py-1.5 border-b border-border/50 text-sm"><span className="text-muted-foreground">Tydzień Pn–So</span><span className="font-semibold" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(weekHours)}</span></div>
          {prevSatHours>0&&<div className="flex justify-between py-1.5 border-b border-border/50 text-sm"><span className="text-muted-foreground">{PREV_SAT_SHORT}</span><span className="font-semibold text-amber-500" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(prevSatHours)}</span></div>}
          <div className="flex justify-between py-1.5 border-b border-border/50 text-sm"><span className="text-muted-foreground">Razem godzin</span><span className="font-semibold" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(totalHours)}</span></div>
          {totalExtraHours>0&&<div className="flex justify-between py-1.5 border-b border-border/50 text-sm"><span className="text-muted-foreground">w tym dodatkowe</span><span className="font-semibold text-primary/80" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(totalExtraHours)}</span></div>}
          <div className="flex justify-between py-1.5 border-b border-border/50 text-sm"><span className="text-muted-foreground">Brutto tydzień</span><span className="font-semibold text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(weekGross)} PLN</span></div>
          {prevSatGross>0&&<div className="flex justify-between py-1.5 border-b border-border/50 text-sm"><span className="text-muted-foreground">Brutto {PREV_SAT_SHORT}</span><span className="font-semibold text-amber-500/90" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(prevSatGross)} PLN</span></div>}
          <div className="flex justify-between py-1.5 border-b border-border/50 text-sm"><span className="text-muted-foreground">Brutto razem</span><span className="font-semibold text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(grossPay)} PLN</span></div>
          {totalZaliczka>0&&<div className="flex justify-between py-1.5 border-b border-border/50 text-sm"><span className="text-muted-foreground">Zaliczki</span><span className="font-semibold text-destructive" style={{fontFamily:"'JetBrains Mono', monospace"}}>−{fmt(totalZaliczka)} PLN</span></div>}
          {totalExtraCosts>0&&<div className="flex justify-between py-1.5 border-b border-border/50 text-sm"><span className="text-muted-foreground">Koszty do zwrotu</span><span className="font-semibold text-green-500" style={{fontFamily:"'JetBrains Mono', monospace"}}>+{fmt(totalExtraCosts)} PLN</span></div>}
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-primary">Do wypłaty</span>
            <span className={`text-xl font-bold ${netPay<0?"text-destructive":"text-primary"}`} style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(netPay)} PLN</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Lista Płac — eksport / email ─────────────────────────────────────────────

function toPayrollCalcRows(rows: ({ emp: WeekEmployee } & ReturnType<typeof calcWeekEmployee>)[]): PayrollCalcRow[] {
  return rows.map((r) => ({
    emp: { name: r.emp.name, position: r.emp.position, settled: r.emp.settled },
    weekHours: r.weekHours,
    prevSatHours: r.prevSatHours,
    totalHours: r.totalHours,
    totalExtraHours: r.totalExtraHours,
    weekZaliczka: r.weekZaliczka,
    prevSatZaliczka: r.prevSatZaliczka,
    totalZaliczka: r.totalZaliczka,
    totalExtraCosts: r.totalExtraCosts,
    weekGross: r.weekGross,
    prevSatGross: r.prevSatGross,
    grossPay: r.grossPay,
    weekNet: r.weekNet,
    prevSatNet: r.prevSatNet,
    netPay: r.netPay,
    rateNum: r.rateNum,
  }));
}

function PayrollEmailModal({
  weekFrom,
  weekTo,
  rows,
  totals,
  contacts,
  jobs,
  onClose,
  onManageContacts,
}: {
  weekFrom: string;
  weekTo: string;
  rows: ({ emp: WeekEmployee } & ReturnType<typeof calcWeekEmployee>)[];
  totals: PayrollExportTotals;
  contacts: EmailContact[];
  jobs: Job[];
  onClose: () => void;
  onManageContacts: () => void;
}) {
  const payrollContacts = contactsForPayroll(contacts);
  const [contactId, setContactId] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [attachPdf, setAttachPdf] = useState(true);
  const [attachWord, setAttachWord] = useState(true);
  const [subject, setSubject] = useState(`Lista płac W&G DOM — ${fmtDate(weekFrom)} – ${fmtDate(weekTo)}`);
  const [introMessage, setIntroMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendStage, setSendStage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const useManual = contactId === "__manual__" || payrollContacts.length === 0;
  const selectedContact = payrollContacts.find((c) => c.id === contactId) || null;
  const recipientEmail = useManual ? manualEmail.trim() : (selectedContact?.email.trim() || "");
  const calcRows = useMemo(() => toPayrollCalcRows(rows), [rows]);
  const canSend = Boolean(recipientEmail) && (attachPdf || attachWord) && !sending;

  const handleSend = async () => {
    setError("");
    if (!recipientEmail) {
      setError("Wybierz odbiorcę z uprawnieniem „Lista płac” lub wpisz email ręcznie.");
      return;
    }
    if (!attachPdf && !attachWord) {
      setError("Zaznacz co najmniej jeden załącznik (PDF lub Word).");
      return;
    }
    setSending(true);
    setSendStage("Przygotowanie…");
    try {
      const weeklyGrid = payrollWeeklyGrid(rows.map((r) => r.emp), weekFrom);
      const extraHourLines = payrollWeekExtraHourLines(rows.map((r) => r.emp));
      const prevSatDetails = payrollPrevSatDetailLines(rows.map((r) => r.emp), weekFrom);
      const prevSatIso = previousSaturdayIso(weekFrom);
      const jobWorkLines = payrollJobWorkLines(jobs, weekFrom, weekTo);
      const attachments: { filename: string; content: string }[] = [];
      if (attachPdf) {
        setSendStage("Ładuję generator PDF…");
        const pdfBlob = await generatePayrollPdfBlob(weekFrom, weekTo, calcRows, totals, weeklyGrid, extraHourLines, prevSatDetails, prevSatIso, jobWorkLines);
        setSendStage("Koduję PDF…");
        attachments.push({ filename: `lista-plac-${weekFrom}.pdf`, content: await blobToBase64(pdfBlob) });
      }
      if (attachWord) {
        setSendStage("Generuję Word…");
        const wordBlob = await generatePayrollWordBlob(weekFrom, weekTo, calcRows, totals, weeklyGrid, extraHourLines, prevSatDetails, prevSatIso);
        setSendStage("Koduję Word…");
        attachments.push({ filename: `lista-plac-${weekFrom}.docx`, content: await blobToBase64(wordBlob) });
      }
      const html = await buildPayrollEmailHtml(weekFrom, weekTo, calcRows, totals, introMessage);
      setSendStage("Wysyłam email…");
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 120_000);
      const res = await fetch(`${API_BASE}/send-payroll-email`, {
        method: "POST",
        headers: API_HEADERS,
        signal: controller.signal,
        body: JSON.stringify({
          to: recipientEmail,
          toName: selectedContact?.name || "",
          subject: subject.trim() || `Lista płac W&G DOM — ${fmtDate(weekFrom)} – ${fmtDate(weekTo)}`,
          html,
          attachments,
        }),
      });
      window.clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `Błąd wysyłki (${res.status})`);
      setSuccess(true);
      setTimeout(onClose, 1800);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setError("Przekroczono czas oczekiwania (2 min). Spróbuj wysłać tylko PDF albo tylko Word.");
      } else {
        setError(e instanceof Error ? e.message : "Nie udało się wysłać emaila.");
      }
    } finally {
      setSending(false);
      setSendStage("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="bg-card rounded-t-2xl sm:rounded-2xl border border-border w-full max-w-lg shadow-2xl max-h-[92dvh] flex flex-col">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <p className="text-sm font-semibold">Wyślij listę płac emailem</p>
            <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(weekFrom)} – {fmtDate(weekTo)}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"><X size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {success ? (
            <div className="flex items-center gap-2 text-green-400 text-sm py-8 justify-center"><CheckCircle2 size={18}/>Wysłano pomyślnie</div>
          ) : (
            <>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Odbiorca (tylko kontakty z uprawnieniem Lista płac)</label>
                {payrollContacts.length === 0 ? (
                  <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-2">
                    Brak kontaktów z uprawnieniem „Lista płac”. Włącz je w zakładce Kontakty lub wpisz adres ręcznie poniżej.
                  </p>
                ) : (
                  <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none mb-2">
                    <option value="">— Wybierz kontakt —</option>
                    {payrollContacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name || c.email}{c.company ? ` · ${c.company}` : ""} ({c.email})</option>
                    ))}
                    <option value="__manual__">Inny adres (wpisz ręcznie)</option>
                  </select>
                )}
                {(useManual || payrollContacts.length === 0) && (
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Email odbiorcy</label>
                    <input type="email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="odbiorca@example.com" className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"/>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Temat</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"/>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Wiadomość (w treści maila — podgląd tabeli jak w PDF)</label>
                <textarea rows={3} value={introMessage} onChange={(e) => setIntroMessage(e.target.value)} placeholder="Opcjonalnie: krótki opis dla odbiorcy..." className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none resize-y"/>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Załączniki</p>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={attachPdf} onChange={(e) => setAttachPdf(e.target.checked)} className="rounded"/>
                  PDF (pełna lista + załączniki)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={attachWord} onChange={(e) => setAttachWord(e.target.checked)} className="rounded"/>
                  Word (.docx)
                </label>
              </div>
              {error && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}
            </>
          )}
        </div>
        {!success && (
          <div className="px-5 py-4 border-t border-border flex flex-col sm:flex-row gap-2 shrink-0">
            <button type="button" onClick={onManageContacts} className="text-xs text-primary hover:underline text-left sm:mr-auto py-2">Zarządzaj kontaktami →</button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors">Anuluj</button>
            <button type="button" onClick={handleSend} disabled={!canSend} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              {sending ? <><CloudUpload size={14} className="animate-pulse"/>{sendStage || "Wysyłanie…"}</> : <><Send size={14}/>Wyślij</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PayrollPdfPreviewModal({
  weekFrom,
  weekTo,
  generateBlob,
  onClose,
}: {
  weekFrom: string;
  weekTo: string;
  generateBlob: () => Promise<Blob>;
  onClose: () => void;
}) {
  const blobRef = useRef<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setLoading(true);
    setReady(false);
    setError("");
    setPdfUrl(null);
    blobRef.current = null;

    generateBlob()
      .then((blob) => {
        if (cancelled) return;
        blobRef.current = blob;
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError("Nie udało się wygenerować podglądu PDF.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [generateBlob]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleDownload = () => {
    const blob = blobRef.current;
    if (blob) saveAs(blob, `lista-plac-${weekFrom}.pdf`);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-5"
      style={{ background: "rgba(0,0,0,0.78)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payroll-pdf-preview-title"
    >
      <div
        className="bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl w-full max-w-6xl h-[94dvh] sm:h-[90dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-5 py-3.5 border-b border-border flex items-center gap-3 shrink-0 bg-gradient-to-r from-primary/10 via-card to-card">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Eye size={16} className="text-primary"/>
          </div>
          <div className="flex-1 min-w-0">
            <p id="payroll-pdf-preview-title" className="text-sm font-semibold truncate">Lista płac — podgląd PDF</p>
            <p className="text-xs text-muted-foreground">{fmtDate(weekFrom)} – {fmtDate(weekTo)}</p>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={loading || !ready}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/90 hover:bg-destructive text-white text-xs font-medium transition-colors disabled:opacity-40"
          >
            <FileDown size={13}/>Pobierz
          </button>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" aria-label="Zamknij">
            <X size={18}/>
          </button>
        </div>

        <div className="flex-1 min-h-0 relative bg-[#525659]">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/95 z-10">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
              <p className="text-sm text-muted-foreground">Generuję dokument PDF…</p>
              <p className="text-xs text-muted-foreground/70">Pierwsze otwarcie może potrwać kilka sekund</p>
            </div>
          )}
          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <AlertTriangle size={28} className="text-destructive"/>
              <p className="text-sm text-destructive">{error}</p>
              <button type="button" onClick={onClose} className="text-xs px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">Zamknij</button>
            </div>
          )}
          {pdfUrl && !loading && (
            <iframe
              src={pdfUrl}
              title={`Lista płac ${fmtDate(weekFrom)} – ${fmtDate(weekTo)}`}
              className="w-full h-full border-0 bg-white"
            />
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-border flex items-center justify-between gap-3 shrink-0 bg-secondary/20">
          <p className="text-[11px] text-muted-foreground hidden sm:block">Esc lub klik poza oknem — zamknij · przewijaj strony w podglądzie</p>
          <button
            type="button"
            onClick={handleDownload}
            disabled={loading || !ready}
            className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/90 text-white text-xs font-medium disabled:opacity-40"
          >
            <FileDown size={13}/>Pobierz PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Lista Płac (current week) ────────────────────────────────────────────────

function PayrollView({
  weekEmployees, weekFrom, weekTo, directory, contacts, jobs,
  onWeekChange, onToggleSettled, onSaveWeek, savedWeeks,
  onAddFromDirectory, onRemoveWeekEmployee, onUpdateWeekEmployee,   onGoToCurrent,
  onManageContacts,
  onRestoreFromArchive,
  onSyncRatesFromDirectory,
  initialEmpId,
  onInitialEmpConsumed,
}:{
  weekEmployees: WeekEmployee[]; weekFrom:string; weekTo:string;
  directory: DirectoryEmployee[];
  contacts: EmailContact[];
  jobs: Job[];
  onWeekChange:(f:string,t:string)=>void;
  onToggleSettled:(id:string)=>void;
  onSaveWeek:()=>void;
  savedWeeks:WeekSnapshot[];
  onAddFromDirectory:(ids:string[])=>void;
  onRemoveWeekEmployee:(id:string)=>void;
  onUpdateWeekEmployee:(emp:WeekEmployee)=>void;
  onGoToCurrent:()=>void;
  onManageContacts:()=>void;
  onRestoreFromArchive?:()=>void;
  onSyncRatesFromDirectory?:()=>void;
  initialEmpId?: string | null;
  onInitialEmpConsumed?: () => void;
}) {
  const { canViewRates } = useAdminAccess();
  const [selectedEmpId, setSelectedEmpId] = useState<string|null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string|null>(null);
  const [satDismissed, setSatDismissed] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  useEffect(() => {
    if (initialEmpId && weekEmployees.some((e) => e.id === initialEmpId)) {
      setSelectedEmpId(initialEmpId);
      onInitialEmpConsumed?.();
    }
  }, [initialEmpId, weekEmployees, onInitialEmpConsumed]);

  const isSaturday = new Date().getDay() === 6;

  const lastSavedWeek = savedWeeks.length > 0
    ? [...savedWeeks].sort((a,b) => b.weekFrom.localeCompare(a.weekFrom))[0]
    : null;

  const copyFromLastWeek = () => {
    if (!lastSavedWeek) return;
    const lastNames = new Set(lastSavedWeek.employees.map(e => e.name));
    const alreadyAssigned = new Set(weekEmployees.map(e => e.directoryId).filter(Boolean));
    const toAdd = directory.filter((d) => d.active && isProductionDirectoryEmployee(d) && lastNames.has(d.name) && !alreadyAssigned.has(d.id));
    if (toAdd.length > 0) onAddFromDirectory(toAdd.map(d => d.id));
  };

  const rows = weekEmployees.map((emp)=>({emp,...calcWeekEmployee(emp)}));
  const totalWeekHours = rows.reduce((s,r)=>s+r.weekHours,0);
  const totalPrevSatHours = rows.reduce((s,r)=>s+r.prevSatHours,0);
  const totalHoursAll = rows.reduce((s,r)=>s+r.totalHours,0);
  const totalWeekGross = rows.reduce((s,r)=>s+r.weekGross,0);
  const totalPrevSatGross = rows.reduce((s,r)=>s+r.prevSatGross,0);
  const totalGross = rows.reduce((s,r)=>s+r.grossPay,0);
  const totalWeekZaliczka = rows.reduce((s,r)=>s+r.weekZaliczka,0);
  const totalPrevSatZaliczka = rows.reduce((s,r)=>s+r.prevSatZaliczka,0);
  const totalZaliczkaSum = rows.reduce((s,r)=>s+r.totalZaliczka,0);
  const totalExtraCostsSum = rows.reduce((s,r)=>s+r.totalExtraCosts,0);
  const totalNet = rows.reduce((s,r)=>s+r.netPay,0);

  const alreadySaved = savedWeeks.some((w)=>w.weekFrom===weekFrom&&w.weekTo===weekTo);
  const archivedForWeek = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
  const archiveRichness = archivedForWeek?.weekEmployees ? weekEmployeesListRichness(archivedForWeek.weekEmployees) : 0;
  const currentRichness = weekEmployeesListRichness(weekEmployees);
  const showRestoreBanner = Boolean(onRestoreFromArchive && archivedForWeek?.weekEmployees?.length && archiveRichness > currentRichness + 1);

  // Directory employees not yet in this week
  const assignedDirIds = new Set(weekEmployees.map((e)=>e.directoryId).filter(Boolean));
  const availableFromDir = filterProductionActiveDirectory(directory).filter((d) => !assignedDirIds.has(d.id));
  const filteredAvailable = availableFromDir.filter((d)=>
    d.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    d.position.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  const selectedEmp = weekEmployees.find((e)=>e.id===selectedEmpId)||null;

  const exportTotals: PayrollExportTotals = {
    totalWeekHours,
    totalPrevSatHours,
    totalHoursAll,
    totalWeekGross,
    totalPrevSatGross,
    totalGross,
    totalWeekZaliczka,
    totalPrevSatZaliczka,
    totalZaliczkaSum,
    totalExtraCostsSum,
    totalNet,
    settledCount: rows.filter((r) => r.emp.settled).length,
    employeeCount: rows.length,
  };

  const payrollExportArgs = () => {
    const calcRows = toPayrollCalcRows(rows);
    const weeklyGrid = payrollWeeklyGrid(rows.map((r) => r.emp), weekFrom);
    const extraHourLines = payrollWeekExtraHourLines(rows.map((r) => r.emp));
    const prevSatDetails = payrollPrevSatDetailLines(rows.map((r) => r.emp), weekFrom);
    const prevSatIso = previousSaturdayIso(weekFrom);
    const jobWorkLines = payrollJobWorkLines(jobs, weekFrom, weekTo);
    return { calcRows, weeklyGrid, extraHourLines, prevSatDetails, prevSatIso, jobWorkLines };
  };

  const buildPayrollPdfBlob = useCallback(async () => {
    const { calcRows, weeklyGrid, extraHourLines, prevSatDetails, prevSatIso, jobWorkLines } = payrollExportArgs();
    return generatePayrollPdfBlob(weekFrom, weekTo, calcRows, exportTotals, weeklyGrid, extraHourLines, prevSatDetails, prevSatIso, jobWorkLines);
  }, [weekFrom, weekTo, rows, exportTotals, jobs]);

  const exportPDF = async () => {
    const blob = await buildPayrollPdfBlob();
    saveAs(blob, `lista-plac-${weekFrom}.pdf`);
  };

  const exportWord = async () => {
    const { calcRows, weeklyGrid, extraHourLines, prevSatDetails, prevSatIso } = payrollExportArgs();
    const blob = await generatePayrollWordBlob(weekFrom, weekTo, calcRows, exportTotals, weeklyGrid, extraHourLines, prevSatDetails, prevSatIso);
    saveAs(blob, `lista-plac-${weekFrom}.docx`);
  };

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Main list */}
      <div className={`flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300 ${selectedEmp?"sm:flex-[0_0_38%] lg:flex-[0_0_34%]":"w-full"}`}>
        <div className="flex-1 overflow-y-auto">
          <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 w-full max-w-none`}>

            {/* Saturday reminder */}
            {isSaturday && !satDismissed && (
              <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/25 rounded-xl px-4 py-3">
                <Bell size={15} className="text-yellow-400 shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-yellow-400">Dziś sobota — pamiętaj o zamknięciu tygodnia!</p>
                  <p className="text-xs text-muted-foreground">Kliknij „Zapisz tydzień”, aby zarchiwizować listę płac. W sobotę wysyłany jest też jeden backup emailem (raz na tydzień).</p>
                </div>
                <button onClick={()=>setSatDismissed(true)} className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"><X size={14}/></button>
              </div>
            )}

            {showRestoreBanner && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
                <AlertTriangle size={15} className="text-amber-400 shrink-0 hidden sm:block"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-400">W archiwum jest pełniejsza wersja tego tygodnia</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Brakuje godzin Sob.pr. lub dodatkowych wpisów? Przywróć z zapisanego archiwum.</p>
                </div>
                <button type="button" onClick={onRestoreFromArchive} className="shrink-0 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors">
                  Przywróć z archiwum
                </button>
              </div>
            )}

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between flex-wrap">
              <div className="bg-card rounded-xl border border-border px-5 py-3.5 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground"><Calendar size={13}/><span className="text-xs font-medium uppercase tracking-wider">Tydzień</span></div>
                <div className="flex items-center gap-2">
                  <input type="date" value={weekFrom} onChange={(e)=>onWeekChange(e.target.value,weekTo)} className="bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none" style={{fontFamily:"'JetBrains Mono', monospace"}}/>
                  <span className="text-muted-foreground">—</span>
                  <input type="date" value={weekTo} onChange={(e)=>onWeekChange(weekFrom,e.target.value)} className="bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none" style={{fontFamily:"'JetBrains Mono', monospace"}}/>
                </div>
                {weekFrom !== getWeekRange().from && (
                  <button onClick={onGoToCurrent} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors border border-primary/30 px-2.5 py-1.5 rounded-lg hover:bg-primary/10">
                    <Calendar size={11}/>Bieżący tydzień
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={()=>setShowPicker(true)} className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/70 border border-border rounded-lg text-sm font-medium transition-colors">
                  <UserPlus size={14}/>Dodaj pracownika
                </button>
                {canViewRates && onSyncRatesFromDirectory && weekEmployees.length > 0 && (
                  <button
                    type="button"
                    onClick={onSyncRatesFromDirectory}
                    className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/70 border border-border rounded-lg text-sm font-medium transition-colors"
                    title="Ustaw stawki w tym tygodniu według domyślnych stawek z kartoteki Pracownicy"
                  >
                    <RotateCcw size={14}/>Stawki z kartoteki
                  </button>
                )}
                {lastSavedWeek && weekEmployees.length === 0 && (
                  <button onClick={copyFromLastWeek} className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/70 border border-border rounded-lg text-sm font-medium transition-colors" title={`Skopiuj pracowników z ${fmtDate(lastSavedWeek.weekFrom)}–${fmtDate(lastSavedWeek.weekTo)}`}>
                    <Copy size={14}/>Kopiuj z poprzedniego tygodnia
                  </button>
                )}
                <button onClick={onSaveWeek} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${alreadySaved?"bg-green-500/15 text-green-400 border border-green-500/20":"bg-secondary hover:bg-secondary/70 border border-border"}`}>
                  <Archive size={14}/>{alreadySaved?"Zapisany ✓":"Zapisz tydzień"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfPreview(true)}
                  disabled={weekEmployees.length === 0 || !canViewRates}
                  className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/70 border border-border rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  title={!canViewRates ? "Eksport z stawkami — tylko administrator" : weekEmployees.length === 0 ? "Dodaj pracowników do listy" : "Podgląd PDF w oknie aplikacji"}
                >
                  <Eye size={14}/>Podgląd PDF
                </button>
                {canViewRates && (
                <>
                <button onClick={exportPDF} disabled={weekEmployees.length === 0} className="flex items-center gap-2 px-4 py-2.5 bg-destructive/80 hover:bg-destructive text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"><FileDown size={14}/>PDF</button>
                <button onClick={exportWord} className="flex items-center gap-2 px-4 py-2.5 bg-primary/90 hover:bg-primary text-primary-foreground rounded-lg text-sm font-medium transition-colors"><FileDown size={14}/>Word</button>
                {weekEmployees.length > 0 && (
                  <button onClick={() => setShowEmailModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/70 border border-border rounded-lg text-sm font-medium transition-colors">
                    <Send size={14}/>Email
                  </button>
                )}
                </>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-xl border border-border">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <FileText size={13} className="text-muted-foreground"/>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Lista Płac — {fmtDate(weekFrom)} – {fmtDate(weekTo)}</span>
                <span className="ml-auto text-xs text-muted-foreground">{weekEmployees.filter(e=>e.settled).length}/{weekEmployees.length} rozliczonych</span>
              </div>

              {weekEmployees.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Users size={36} className="mx-auto text-muted-foreground/20"/>
                  <p className="text-sm text-muted-foreground">Brak pracowników w tym tygodniu.</p>
                  <button onClick={()=>setShowPicker(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                    <UserPlus size={14}/>Dodaj pracowników
                  </button>
                </div>
              ) : (
                <>
                  <div className="hidden sm:block overflow-x-auto overscroll-x-contain">
                    <table className="w-full min-w-[1040px] text-sm">
                      <thead><tr className="border-b border-border text-xs text-muted-foreground group/head" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                        <th className="px-3 py-3 text-left w-8">Lp.</th>
                        <th className="px-3 py-3 text-left min-w-[140px]">Pracownik</th>
                        <th className="px-2 py-3 text-right w-14" title="Pn–So bieżącego tygodnia">Tydzień</th>
                        <th className="px-2 py-3 text-right w-14" title="Sobota poprzedniego tygodnia">Sob.pr.</th>
                        <th className="px-2 py-3 text-right w-16">Razem h</th>
                        <th className="px-2 py-3 text-right w-20">Brutto</th>
                        <th className="px-2 py-3 text-right w-20">Zaliczki</th>
                        <th className="px-2 py-3 text-right w-16">Koszty</th>
                        <th className="px-2 py-3 text-right w-24 whitespace-nowrap">Do wypłaty</th>
                        <th className="sticky right-9 z-20 px-2 py-3 text-center whitespace-nowrap w-[7.75rem] bg-card shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.45)]">Status</th>
                        <th className="sticky right-0 z-20 px-2 py-3 w-9 bg-card"/>
                      </tr></thead>
                      <tbody className="divide-y divide-border">
                        {rows.map((r,i)=>(
                          <tr key={r.emp.id} onClick={()=>setSelectedEmpId(r.emp.id===selectedEmpId?null:r.emp.id)}
                            className={`group cursor-pointer transition-colors hover:bg-secondary/30 ${r.emp.settled?"opacity-60":""} ${r.emp.id===selectedEmpId?"bg-primary/5 border-l-2 border-primary":""}`}>
                            <td className="px-3 py-3.5 text-muted-foreground text-xs" style={{fontFamily:"'JetBrains Mono', monospace"}}>{i+1}</td>
                            <td className="px-3 py-3.5 min-w-[140px]">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">{r.emp.name?r.emp.name[0].toUpperCase():"?"}</div>
                                <div className="min-w-0">
                                  <p className="font-medium leading-tight truncate">{r.emp.name||<span className="italic text-muted-foreground">Bez nazwy</span>}</p>
                                  <p className="text-xs text-muted-foreground truncate">{r.emp.position||"—"}{canViewRates && <> · {fmt(r.rateNum)} PLN/h</>}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-3.5 text-right whitespace-nowrap" style={{fontFamily:"'JetBrains Mono', monospace"}}>{r.weekHours>0?fmtH(r.weekHours):<span className="text-muted-foreground/40">—</span>}</td>
                            <td className="px-2 py-3.5 text-right whitespace-nowrap" style={{fontFamily:"'JetBrains Mono', monospace"}}>{r.prevSatHours>0?<span className="text-amber-500">{fmtH(r.prevSatHours)}</span>:<span className="text-muted-foreground/40">—</span>}</td>
                            <td className="px-2 py-3.5 text-right font-medium whitespace-nowrap" style={{fontFamily:"'JetBrains Mono', monospace"}}>{r.totalHours>0?fmtH(r.totalHours):<span className="text-muted-foreground/40">—</span>}</td>
                            <td className="px-2 py-3.5 text-right text-muted-foreground whitespace-nowrap" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(r.grossPay)}</td>
                            <td className="px-2 py-3.5 text-right whitespace-nowrap" style={{fontFamily:"'JetBrains Mono', monospace"}}>{r.totalZaliczka>0?<span className="text-destructive">−{fmt(r.totalZaliczka)}</span>:<span className="text-muted-foreground/40">—</span>}</td>
                            <td className="px-2 py-3.5 text-right whitespace-nowrap" style={{fontFamily:"'JetBrains Mono', monospace"}}>{r.totalExtraCosts>0?<span className="text-green-500">+{fmt(r.totalExtraCosts)}</span>:<span className="text-muted-foreground/40">—</span>}</td>
                            <td className="px-2 py-3.5 text-right font-bold text-primary whitespace-nowrap" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(r.netPay)} <span className="text-[10px] font-normal text-primary/70">zł</span></td>
                            <td className={`sticky right-9 z-10 px-2 py-3.5 whitespace-nowrap shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.45)] ${r.emp.id===selectedEmpId?"bg-primary/5":"bg-card group-hover:bg-secondary/30"}`} onClick={(e)=>e.stopPropagation()}>
                              <button onClick={()=>onToggleSettled(r.emp.id)} title={r.emp.settled?"Rozliczony — kliknij aby cofnąć":"Oczekuje — kliknij po wypłacie"} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${r.emp.settled?"bg-green-500/15 text-green-400 hover:bg-green-500/25":"bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"}`}>
                                {r.emp.settled?<><CheckCircle2 size={11} className="shrink-0"/>Rozliczony</>:<><Circle size={11} className="shrink-0"/>Oczekuje</>}
                              </button>
                            </td>
                            <td className={`sticky right-0 z-10 px-2 py-3.5 ${r.emp.id===selectedEmpId?"bg-primary/5":"bg-card group-hover:bg-secondary/30"}`} onClick={(e)=>e.stopPropagation()}>
                              {deleteConfirm===r.emp.id?(
                                <div className="flex items-center gap-1">
                                  <button onClick={()=>{onRemoveWeekEmployee(r.emp.id);setDeleteConfirm(null);}} className="text-xs bg-destructive text-white px-2 py-0.5 rounded">Usuń</button>
                                  <button onClick={()=>setDeleteConfirm(null)} className="text-xs text-muted-foreground hover:text-foreground px-1"><X size={11}/></button>
                                </div>
                              ):(
                                <button onClick={()=>setDeleteConfirm(r.emp.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded"><Trash2 size={13}/></button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border bg-secondary/20">
                          <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-muted-foreground">Tydzień Pn–So</td>
                          <td className="px-3 py-2 text-right text-xs font-semibold" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(totalWeekHours)}</td>
                          <td className="px-3 py-2 text-right text-xs text-muted-foreground/40">—</td>
                          <td className="px-3 py-2 text-right text-xs font-semibold" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(totalWeekHours)}</td>
                          <td className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(totalWeekGross)}</td>
                          <td className="px-3 py-2 text-right text-xs font-semibold text-destructive" style={{fontFamily:"'JetBrains Mono', monospace"}}>{totalWeekZaliczka>0?`−${fmt(totalWeekZaliczka)}`:"—"}</td>
                          <td colSpan={2}/>
                          <td colSpan={2}/>
                        </tr>
                        {totalPrevSatHours>0&&<tr className="bg-secondary/20">
                          <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-amber-500">{PREV_SAT_SHORT}</td>
                          <td className="px-3 py-2 text-right text-xs text-muted-foreground/40">—</td>
                          <td className="px-3 py-2 text-right text-xs font-semibold text-amber-500" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(totalPrevSatHours)}</td>
                          <td className="px-3 py-2 text-right text-xs font-semibold text-amber-500" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(totalPrevSatHours)}</td>
                          <td className="px-3 py-2 text-right text-xs font-semibold text-amber-500/80" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(totalPrevSatGross)}</td>
                          <td className="px-3 py-2 text-right text-xs font-semibold text-destructive" style={{fontFamily:"'JetBrains Mono', monospace"}}>{totalPrevSatZaliczka>0?`−${fmt(totalPrevSatZaliczka)}`:"—"}</td>
                          <td colSpan={2}/>
                          <td colSpan={2}/>
                        </tr>}
                        <tr className="border-t-2 border-border bg-secondary/30">
                          <td colSpan={2} className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Razem</td>
                          <td className="px-3 py-3 text-right font-bold" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(totalWeekHours)}</td>
                          <td className="px-3 py-3 text-right font-bold text-amber-500" style={{fontFamily:"'JetBrains Mono', monospace"}}>{totalPrevSatHours>0?fmtH(totalPrevSatHours):"—"}</td>
                          <td className="px-3 py-3 text-right font-bold" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(totalHoursAll)}</td>
                          <td className="px-3 py-3 text-right font-bold text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(totalGross)}</td>
                          <td className="px-3 py-3 text-right font-bold text-destructive" style={{fontFamily:"'JetBrains Mono', monospace"}}>{totalZaliczkaSum>0?`−${fmt(totalZaliczkaSum)}`:"—"}</td>
                          <td className="px-3 py-3 text-right font-bold text-green-500" style={{fontFamily:"'JetBrains Mono', monospace"}}>{totalExtraCostsSum>0?`+${fmt(totalExtraCostsSum)}`:"—"}</td>
                          <td className="px-3 py-3 text-right font-bold text-primary text-base whitespace-nowrap" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(totalNet)} <span className="text-[10px] font-normal text-primary/70">zł</span></td>
                          <td className="sticky right-9 z-10 bg-secondary/30 shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.45)]"/>
                          <td className="sticky right-0 z-10 bg-secondary/30"/>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  {/* Mobile */}
                  <div className="sm:hidden divide-y divide-border">
                    {rows.map((r)=>(
                      <div key={r.emp.id} className={`p-4 space-y-3 ${r.emp.settled?"opacity-60":""}`} onClick={()=>setSelectedEmpId(r.emp.id===selectedEmpId?null:r.emp.id)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">{r.emp.name?r.emp.name[0].toUpperCase():"?"}</div>
                            <div><p className="text-sm font-medium">{r.emp.name||"—"}</p><p className="text-xs text-muted-foreground">{r.emp.position||"—"}</p></div>
                          </div>
                          <button onClick={(e)=>{e.stopPropagation();onToggleSettled(r.emp.id);}} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 ${r.emp.settled?"bg-green-500/15 text-green-400":"bg-yellow-500/10 text-yellow-400"}`}>
                            {r.emp.settled?<><CheckCircle2 size={11}/>Rozliczony</>:<><Circle size={11}/>Oczekuje</>}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                          <div className="bg-secondary rounded-lg px-2 py-2"><p className="text-xs text-muted-foreground">Tydzień</p><p className="text-sm font-semibold" style={{fontFamily:"'JetBrains Mono', monospace"}}>{r.weekHours>0?fmtH(r.weekHours):"—"}</p></div>
                          <div className="bg-secondary rounded-lg px-2 py-2"><p className="text-xs text-muted-foreground">Sob.pr.</p><p className="text-sm font-semibold text-amber-500" style={{fontFamily:"'JetBrains Mono', monospace"}}>{r.prevSatHours>0?fmtH(r.prevSatHours):"—"}</p></div>
                          <div className="bg-secondary rounded-lg px-2 py-2"><p className="text-xs text-muted-foreground">Zaliczki</p><p className="text-sm font-semibold text-destructive" style={{fontFamily:"'JetBrains Mono', monospace"}}>{r.totalZaliczka>0?`−${fmt(r.totalZaliczka)}`:"—"}</p></div>
                          <div className="bg-secondary rounded-lg px-2 py-2"><p className="text-xs text-muted-foreground">Koszty</p><p className="text-sm font-semibold text-green-500" style={{fontFamily:"'JetBrains Mono', monospace"}}>{r.totalExtraCosts>0?`+${fmt(r.totalExtraCosts)}`:"—"}</p></div>
                          <div className="bg-primary/10 rounded-lg px-2 py-2 col-span-2 sm:col-span-1"><p className="text-xs text-primary/70">Do wypłaty</p><p className="text-sm font-bold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(r.netPay)}</p></div>
                        </div>
                      </div>
                    ))}
                    <div className="p-4 bg-secondary/30 flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Łącznie</span>
                      <span className="text-lg font-bold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(totalNet)} PLN</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selectedEmp && (
        <div className="w-full sm:flex-1 sm:min-w-[400px] lg:min-w-[480px] border-l border-border bg-card shrink-0 flex flex-col min-h-0 h-full overflow-hidden absolute sm:relative inset-0 sm:inset-auto z-10 sm:z-auto">
          <WeekEmployeeDetail emp={selectedEmp} weekFrom={weekFrom} onChange={onUpdateWeekEmployee} onClose={()=>setSelectedEmpId(null)}/>
        </div>
      )}

      {/* Picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.7)"}}>
          <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div><p className="text-sm font-semibold">Dodaj pracowników do tygodnia</p><p className="text-xs text-muted-foreground">{fmtDate(weekFrom)} – {fmtDate(weekTo)}</p></div>
              <button onClick={()=>{setShowPicker(false);setPickerSearch("");setPickerSelected(new Set());}} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X size={16}/></button>
            </div>
            <div className="px-4 py-3 border-b border-border space-y-2">
              <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input type="text" placeholder="Szukaj..." value={pickerSearch} onChange={(e)=>setPickerSearch(e.target.value)} className="w-full bg-secondary rounded-lg pl-8 pr-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none"/></div>
              {filteredAvailable.length>0&&(
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Zaznaczono: {pickerSelected.size} / {filteredAvailable.length}</span>
                  {pickerSelected.size===filteredAvailable.length
                    ? <button onClick={()=>setPickerSelected(new Set())} className="text-xs text-primary hover:underline font-medium">Odznacz wszystkich</button>
                    : <button onClick={()=>setPickerSelected(new Set(filteredAvailable.map(d=>d.id)))} className="text-xs text-primary hover:underline font-medium">Zaznacz wszystkich</button>
                  }
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {filteredAvailable.length===0&&<p className="text-sm text-muted-foreground text-center py-8">Wszyscy aktywni pracownicy są już dodani.</p>}
              {filteredAvailable.map((d)=>{
                const sel = pickerSelected.has(d.id);
                return (
                  <button key={d.id} onClick={()=>setPickerSelected(prev=>{const n=new Set(prev);sel?n.delete(d.id):n.add(d.id);return n;})} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left ${sel?"bg-primary/10 border border-primary/30":"hover:bg-secondary border border-transparent"}`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${sel?"bg-primary text-primary-foreground":"bg-secondary text-muted-foreground"}`}>{d.name?d.name[0].toUpperCase():"?"}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{d.name||<span className="italic text-muted-foreground">Bez nazwy</span>}</p>
                      <p className="text-xs text-muted-foreground">{d.position||"—"}{canViewRates && <> · {d.defaultRate} PLN/h</>}</p>
                    </div>
                    {sel
                      ? <CheckCircle2 size={16} className="text-primary shrink-0"/>
                      : <Circle size={16} className="text-muted-foreground/40 shrink-0"/>
                    }
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-border">
              <button
                onClick={()=>{if(pickerSelected.size>0){onAddFromDirectory([...pickerSelected]);}setShowPicker(false);setPickerSearch("");setPickerSelected(new Set());}}
                disabled={pickerSelected.size===0}
                className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {pickerSelected.size>0?`Dodaj zaznaczonych (${pickerSelected.size})`:"Zaznacz pracowników"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPdfPreview && (
        <PayrollPdfPreviewModal
          weekFrom={weekFrom}
          weekTo={weekTo}
          generateBlob={buildPayrollPdfBlob}
          onClose={() => setShowPdfPreview(false)}
        />
      )}

      {showEmailModal && (
        <PayrollEmailModal
          weekFrom={weekFrom}
          weekTo={weekTo}
          rows={rows}
          totals={exportTotals}
          contacts={contacts}
          jobs={jobs}
          onClose={() => setShowEmailModal(false)}
          onManageContacts={() => { setShowEmailModal(false); onManageContacts(); }}
        />
      )}
    </div>
  );
}

function EmployeeArchiveModal({
  employee,
  savedWeeks,
  onClose,
}: {
  employee: DirectoryEmployee;
  savedWeeks: WeekSnapshot[];
  onClose: () => void;
}) {
  const years = useMemo(
    () => Array.from(new Set(savedWeeks.map((w) => new Date(w.weekFrom).getFullYear()))).sort((a, b) => b - a),
    [savedWeeks],
  );
  const [year, setYear] = useState(years[0] ?? new Date().getFullYear());
  const stats = useMemo(
    () => buildEmployeeArchiveStats(employee.id, employee.name, savedWeeks, year),
    [employee.id, employee.name, savedWeeks, year],
  );
  const maxMonthlyNet = Math.max(...stats.monthlyNet, 1);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92dvh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{employee.name || "Pracownik"}</p>
            <p className="text-xs text-muted-foreground">Karta z archiwum listy płac</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><X size={16}/></button>
        </div>
        <div className="p-5 space-y-5">
          {years.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${year === y ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
          {stats.weekCount === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Brak zapisanych tygodni z tym pracownikiem w {year} r.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Godziny</p>
                  <p className="text-base font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtH(stats.totalHours)}</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Wypłaty</p>
                  <p className="text-base font-bold text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(stats.totalNet)}</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Tygodni</p>
                  <p className="text-base font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stats.weekCount}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Wypłaty miesięczne · {year}</p>
                <div className="flex items-end gap-1 h-24">
                  {stats.monthlyNet.map((net, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                      <div
                        className={`w-full rounded-t transition-all ${net > 0 ? "bg-primary/70" : "bg-border/40"}`}
                        style={{ height: net > 0 ? `${Math.max(8, (net / maxMonthlyNet) * 72)}px` : "4px" }}
                        title={net > 0 ? `${MONTH_NAMES[i]}: ${fmt(net)} PLN` : MONTH_NAMES[i]}
                      />
                      <span className="text-[8px] text-muted-foreground truncate w-full text-center">{MONTH_NAMES[i].slice(0, 3)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Tygodnie ({stats.weekCount})</p>
                <div className="space-y-1 max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border">
                  {stats.weeks.map((w) => (
                    <div key={w.weekFrom} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">{fmtDate(w.weekFrom)} – {fmtDate(w.weekTo)}</span>
                      <span className="shrink-0 flex items-center gap-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        <span>{fmtH(w.hours)}</span>
                        <span className="font-semibold text-primary">{fmt(w.netPay)} PLN</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DirectoryView({directory, savedWeeks, onChange, onCommit, onOpenSms}:{directory:DirectoryEmployee[]; savedWeeks: WeekSnapshot[]; onChange:(d:DirectoryEmployee[])=>void; onCommit?:()=>void; onOpenSms?:()=>void}) {
  const { canViewRates } = useAdminAccess();
  const [editId, setEditId] = useState<string|null>(null);
  const [archiveEmpId, setArchiveEmpId] = useState<string|null>(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState("");
  const [adminPinBusy, setAdminPinBusy] = useState(false);
  const [adminPinMsg, setAdminPinMsg] = useState("");

  const filtered = directory.filter((d)=>{
    if(!showInactive&&!d.active) return false;
    return d.name.toLowerCase().includes(search.toLowerCase()) || d.position.toLowerCase().includes(search.toLowerCase()) || d.phone.includes(search);
  });

  const addEmployee = () => {
    const e = defaultDirEmployee();
    onChange([...directory, e]);
    setEditId(e.id);
  };

  const update = (updated:DirectoryEmployee) => onChange(directory.map((d)=>d.id===updated.id?updated:d));
  const remove = (id:string) => {
    addDeletedDirectoryId(id);
    const next = directory.filter((d)=>d.id!==id);
    onChange(next);
    pushDirectoryToCloud(next).catch(() => {});
  };
  const toggleActive = (id:string) => update({...directory.find((d)=>d.id===id)!, active:!directory.find((d)=>d.id===id)!.active});

  const editEmp = directory.find((d)=>d.id===editId)||null;
  const archiveEmp = directory.find((d)=>d.id===archiveEmpId)||null;

  const applyAdminWorkerPin = async (pin: string) => {
    if (!editEmp) return;
    const digits = pin.replace(/\D/g, "").slice(0, 4);
    if (digits.length !== 4) { setAdminPinMsg("Kod musi mieć 4 cyfry"); return; }
    if (workerPinTooWeak(editEmp, digits)) { setAdminPinMsg("Kod nie może być ostatnimi 4 cyframi telefonu"); return; }
    setAdminPinBusy(true);
    setAdminPinMsg("");
    try {
      const hash = await hashWorkerPin(digits);
      update({ ...editEmp, workerPinHash: hash });
      setAdminPinInput("");
      setAdminPinMsg("Kod zapisany — pracownik może logować się telefonem + tym kodem.");
    } finally {
      setAdminPinBusy(false);
    }
  };

  const resetAdminWorkerPin = () => {
    if (!editEmp) return;
    const next = { ...editEmp };
    delete next.workerPinHash;
    update(next);
    setAdminPinInput("");
    setAdminPinMsg("Kod usunięty — pracownik ustawi nowy przy następnym logowaniu.");
  };

  useEffect(() => {
    setAdminPinInput("");
    setAdminPinMsg("");
  }, [editId]);

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {archiveEmp && (
        <EmployeeArchiveModal employee={archiveEmp} savedWeeks={savedWeeks} onClose={() => setArchiveEmpId(null)}/>
      )}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input type="text" placeholder="Szukaj po nazwisku, stanowisku, telefonie..." value={search} onChange={(e)=>setSearch(e.target.value)} className="w-full bg-card border border-border rounded-xl pl-8 pr-3 py-2.5 text-sm focus:border-primary focus:outline-none transition-colors"/>
            </div>
            <div className="flex items-center gap-3 ml-auto flex-wrap">
              {onOpenSms && (
                <button type="button" onClick={onOpenSms} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 transition-colors">
                  <MessageSquare size={14}/>SMS pilne
                </button>
              )}
              <button onClick={()=>setShowInactive(v=>!v)} className={`text-xs px-3 py-2 rounded-lg border transition-colors ${showInactive?"bg-secondary border-border text-foreground":"border-border text-muted-foreground hover:text-foreground"}`}>
                {showInactive?"Ukryj nieaktywnych":"Pokaż nieaktywnych"}
              </button>
              <button onClick={addEmployee} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                <Plus size={14}/>Nowy pracownik
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Aktywni" value={String(directory.filter((d) => d.active && isProductionDirectoryEmployee(d)).length)} icon={Users} accent/>
            <StatCard label="Konta test" value={String(directory.filter((d) => isTestDirectoryEmployee(d)).length)} icon={HardHat}/>
            <StatCard label="Łącznie" value={String(directory.length)} icon={Building2}/>
          </div>

          {/* Employee cards */}
          <div className="space-y-2">
            {filtered.length===0&&(
              <div className="bg-card rounded-xl border border-border p-10 text-center text-muted-foreground text-sm">
                {directory.length===0?"Brak pracowników — dodaj pierwszego.":"Brak wyników wyszukiwania."}
              </div>
            )}
            {filtered.map((emp)=>(
              <div key={emp.id} className={`bg-card rounded-xl border transition-all ${editId===emp.id?"border-primary/40":"border-border"} ${!emp.active?"opacity-60":""} overflow-hidden`}>
                {editId===emp.id&&editEmp ? (
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <LabelWithHint label="Imię i nazwisko *" hint="Pełne imię i nazwisko — widoczne na liście płac, grafiku i w trybie pracownika." htmlFor={`dir-name-${editEmp.id}`}/>
                        <input id={`dir-name-${editEmp.id}`} type="text" value={editEmp.name} onChange={(e)=>update({...editEmp,name:e.target.value})} placeholder="Jan Kowalski" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                      </div>
                      <div>
                        <LabelWithHint label="Stanowisko" hint="Np. Murarz, Elektryk — informacyjnie w kartotece (nie na liście logowania pracownika)." htmlFor={`dir-pos-${editEmp.id}`}/>
                        <input id={`dir-pos-${editEmp.id}`} type="text" value={editEmp.position} onChange={(e)=>update({...editEmp,position:e.target.value})} placeholder="np. Murarz, Kierowca..." className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                      </div>
                      <div>
                        <LabelWithHint label="Telefon" hint="Numer do logowania pracownika — wpisuje 9 ostatnich cyfr (bez +48). Wymagany do trybu pracownika." htmlFor={`dir-phone-${editEmp.id}`}/>
                        <input id={`dir-phone-${editEmp.id}`} type="tel" value={editEmp.phone} onChange={(e)=>update({...editEmp,phone:e.target.value})} placeholder="+48 000 000 000" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                      </div>
                      {canViewRates && (
                      <div>
                        <LabelWithHint label="Domyślna stawka (PLN/h)" hint="Podpowiada się w liście płac i na robotach. Można zmienić na konkretny tydzień bez edycji kartoteki." htmlFor={`dir-rate-${editEmp.id}`}/>
                        <input id={`dir-rate-${editEmp.id}`} type="number" min="0" step="0.5" value={editEmp.defaultRate} onChange={(e)=>update({...editEmp,defaultRate:e.target.value})} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors" style={{fontFamily:"'JetBrains Mono', monospace"}}/>
                      </div>
                      )}
                      <div>
                        <LabelWithHint label="Data zatrudnienia" hint="Opcjonalnie — do informacji w kartotece i archiwum rocznym." htmlFor={`dir-start-${editEmp.id}`}/>
                        <input id={`dir-start-${editEmp.id}`} type="date" value={editEmp.startDate} onChange={(e)=>update({...editEmp,startDate:e.target.value})} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors" style={{fontFamily:"'JetBrains Mono', monospace"}}/>
                      </div>
                      <div>
                        <LabelWithHint label="Uwagi" hint="Notatki wewnętrne — widzi tylko administrator." htmlFor={`dir-notes-${editEmp.id}`}/>
                        <input id={`dir-notes-${editEmp.id}`} type="text" value={editEmp.notes} onChange={(e)=>update({...editEmp,notes:e.target.value})} placeholder="Dodatkowe informacje..." className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                      </div>
                    </div>
                    <div className="bg-secondary/40 rounded-xl p-4 border border-border space-y-3">
                      <LabelWithHint
                        label="Kod pracownika (4 cyfry)"
                        hint="Osobisty PIN oprócz telefonu — chroni wypłatę przed podglądem przez innych. Pracownik ustawia sam przy pierwszym logowaniu albo Ty wpisujesz kod tutaj. Reset usuwa kod — przy logowaniu ustawi nowy."
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        {workerHasPersonalPin(editEmp) ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">
                            <ShieldCheck size={12}/> Kod ustawiony
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                            <KeyRound size={12}/> Brak kodu — ustawi przy logowaniu
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <input
                          type="tel"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={4}
                          placeholder="Nowy kod 4 cyfry"
                          value={adminPinInput}
                          onChange={(e)=>{ setAdminPinInput(e.target.value.replace(/\D/g,"").slice(0,4)); setAdminPinMsg(""); }}
                          onKeyDown={(e)=>e.key==="Enter"&&applyAdminWorkerPin(adminPinInput)}
                          className="w-36 bg-secondary rounded-lg px-3 py-2 text-sm tracking-widest border border-transparent focus:border-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={adminPinBusy || adminPinInput.length !== 4}
                          onClick={()=>applyAdminWorkerPin(adminPinInput)}
                          className="px-3 py-2 rounded-lg bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 disabled:opacity-40 transition-colors"
                        >
                          {adminPinBusy ? "…" : "Ustaw kod"}
                        </button>
                        {workerHasPersonalPin(editEmp) && (
                          <button
                            type="button"
                            onClick={resetAdminWorkerPin}
                            className="px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            Resetuj kod
                          </button>
                        )}
                      </div>
                      {adminPinMsg && <p className="text-[11px] text-muted-foreground">{adminPinMsg}</p>}
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer bg-secondary/50 rounded-xl p-3 border border-border">
                      <input
                        type="checkbox"
                        checked={editEmp.multiSiteDaily === true}
                        onChange={(e) => update({ ...editEmp, multiSiteDaily: e.target.checked })}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="text-sm font-medium block">Wiele robót dziennie (logistyka / dostawy)</span>
                        <span className="text-xs text-muted-foreground leading-relaxed">Np. kierowca rozwożący towar — nie sprawdzamy spójności godzin z robotami (wystarczy lista płac).</span>
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer bg-violet-500/5 rounded-xl p-3 border border-violet-500/20">
                      <input
                        type="checkbox"
                        checked={isTestDirectoryEmployee(editEmp)}
                        onChange={(e) => update({ ...editEmp, testAccount: e.target.checked ? true : false })}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="text-sm font-medium block flex items-center gap-2">
                          Konto testowe
                          <span className="text-[10px] font-normal text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded-full">TEST</span>
                        </span>
                        <span className="text-xs text-muted-foreground leading-relaxed">
                          Tylko logowanie w trybie pracownika (zdjęcia, raporty). Nie trafia na listę płac, grafik, pulpit ani roboty. Auto-wykrywane dla imienia „test” i numeru +48 000 000 000.
                        </span>
                      </span>
                    </label>
                    <div className="flex items-center gap-2 pt-2">
                      <button onClick={()=>{ setEditId(null); onCommit?.(); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"><Check size={13}/>Zapisz</button>
                      <button onClick={()=>setEditId(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Anuluj</button>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${emp.active?"bg-primary text-primary-foreground":"bg-secondary text-muted-foreground"}`}>
                      {emp.name?emp.name[0].toUpperCase():"?"}
                    </div>
                    <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-0.5">
                      <div>
                        <p className="text-sm font-semibold leading-tight">{emp.name||<span className="italic text-muted-foreground">Bez nazwy</span>}</p>
                        <p className="text-xs text-muted-foreground">{emp.position||<span className="italic">brak stanowiska</span>}
                          {emp.multiSiteDaily && <span className="ml-2 text-[10px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full">wiele robót/dzień</span>}
                          {isTestDirectoryEmployee(emp) && <span className="ml-2 text-[10px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full">TEST</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone size={11} className="shrink-0"/>{emp.phone||"—"}
                        {workerHasPersonalPin(emp) && (
                          <span title="Kod pracownika ustawiony" className="inline-flex items-center gap-0.5 text-[10px] text-green-400/90 ml-1">
                            <Lock size={10}/> kod
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {canViewRates && <span style={{fontFamily:"'JetBrains Mono', monospace"}}>{emp.defaultRate} PLN/h</span>}
                        {emp.startDate&&<span>od {fmtDate(emp.startDate)}</span>}
                        {!emp.active&&<span className="bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">Nieaktywny</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={()=>setArchiveEmpId(emp.id)} title="Karta z archiwum" className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"><BarChart3 size={13}/></button>
                      <button onClick={()=>setEditId(emp.id)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Edit2 size={13}/></button>
                      <button onClick={()=>toggleActive(emp.id)} title={emp.active?"Oznacz jako nieaktywny":"Przywróć"} className={`p-1.5 rounded-lg transition-colors ${emp.active?"hover:bg-secondary text-muted-foreground hover:text-yellow-400":"text-green-400 hover:bg-green-400/10"}`}>
                        {emp.active?<Circle size={13}/>:<CheckCircle2 size={13}/>}
                      </button>
                      <button onClick={()=>remove(emp.id)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={13}/></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Kontakty email ───────────────────────────────────────────────────────────

function ContactsView({ contacts, onChange }: { contacts: EmailContact[]; onChange: (c: EmailContact[]) => void }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.company.toLowerCase().includes(q);
  });

  const addContact = () => {
    const c = defaultEmailContact();
    onChange([...contacts, c]);
    setEditId(c.id);
  };

  const update = (updated: EmailContact) => onChange(contacts.map((c) => (c.id === updated.id ? updated : c)));
  const remove = (id: string) => onChange(contacts.filter((c) => c.id !== id));
  const editContact = contacts.find((c) => c.id === editId) || null;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input type="text" placeholder="Szukaj po nazwie, emailu, firmie..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-card border border-border rounded-xl pl-8 pr-3 py-2.5 text-sm focus:border-primary focus:outline-none transition-colors"/>
            </div>
            <button type="button" onClick={addContact} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors ml-auto">
              <Plus size={14}/>Nowy kontakt
            </button>
          </div>

          <p className="text-sm text-muted-foreground">
            Odbiorcy emaili z aplikacji. Uprawnienia decydują, gdzie kontakt pojawi się na liście wyboru: materiały z robót (zdjęcia, raporty) albo lista płac (PDF/Word).
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Kontakty" value={String(contacts.length)} icon={Mail} accent/>
            <StatCard label="Z emailem" value={String(contacts.filter((c) => c.email.trim()).length)} icon={Send}/>
            <StatCard label="Roboty" value={String(contactsForJobs(contacts).length)} icon={HardHat}/>
            <StatCard label="Lista płac" value={String(contactsForPayroll(contacts).length)} icon={Receipt}/>
          </div>

          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="bg-card rounded-xl border border-border p-10 text-center text-muted-foreground text-sm">
                {contacts.length === 0 ? "Brak kontaktów — dodaj pierwszego odbiorcę." : "Brak wyników wyszukiwania."}
              </div>
            )}
            {filtered.map((contact) => (
              <div key={contact.id} className={`bg-card rounded-xl border transition-all ${editId === contact.id ? "border-primary/40" : "border-border"} overflow-hidden`}>
                {editId === contact.id && editContact ? (
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><label className="text-xs text-muted-foreground block mb-1">Imię i nazwisko / nazwa *</label><input type="text" value={editContact.name} onChange={(e) => update({ ...editContact, name: e.target.value })} placeholder="Jan Kowalski" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/></div>
                      <div><label className="text-xs text-muted-foreground block mb-1">Email *</label><input type="email" value={editContact.email} onChange={(e) => update({ ...editContact, email: e.target.value })} placeholder="jan@example.com" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/></div>
                      <div><label className="text-xs text-muted-foreground block mb-1">Firma / rola</label><input type="text" value={editContact.company} onChange={(e) => update({ ...editContact, company: e.target.value })} placeholder="np. Zleceniodawca, Inwestor..." className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/></div>
                      <div><label className="text-xs text-muted-foreground block mb-1">Uwagi</label><input type="text" value={editContact.notes} onChange={(e) => update({ ...editContact, notes: e.target.value })} placeholder="Opcjonalnie..." className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/></div>
                    </div>
                    <div className="space-y-2 pt-1">
                      <p className="text-xs text-muted-foreground font-medium">Uprawnienia wysyłki</p>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={contactAllowsJobs(editContact)} onChange={(e) => update({ ...editContact, allowJobs: e.target.checked })} className="rounded"/>
                        Roboty — zdjęcia, raporty, wymiary
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={contactAllowsPayroll(editContact)} onChange={(e) => update({ ...editContact, allowPayroll: e.target.checked })} className="rounded"/>
                        Lista płac — PDF i Word
                      </label>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <button type="button" onClick={() => setEditId(null)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"><Check size={13}/>Zapisz</button>
                      <button type="button" onClick={() => setEditId(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Anuluj</button>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {contact.name ? contact.name[0].toUpperCase() : "@"}
                    </div>
                    <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5">
                      <div>
                        <p className="text-sm font-semibold leading-tight">{contact.name || <span className="italic text-muted-foreground">Bez nazwy</span>}</p>
                        <p className="text-xs text-muted-foreground">{contact.company || "—"}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                        <Mail size={11} className="shrink-0"/>{contact.email || <span className="italic">brak email</span>}
                      </div>
                      <div className="flex flex-wrap gap-1 sm:col-span-2">
                        {contactAllowsJobs(contact) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Roboty</span>
                        )}
                        {contactAllowsPayroll(contact) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">Lista płac</span>
                        )}
                        {!contactAllowsJobs(contact) && !contactAllowsPayroll(contact) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Brak uprawnień</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => setEditId(contact.id)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Edit2 size={13}/></button>
                      <button type="button" onClick={() => remove(contact.id)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={13}/></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Archiwum — grafik tygodnia (zapisany) ────────────────────────────────────

function ArchiveScheduleGrid({
  week,
  directory,
}: {
  week: WeekSnapshot;
  directory: DirectoryEmployee[];
}) {
  const emps = week.weekEmployees ?? [];
  const workEntries = week.workEntries ?? [];
  const columns = weekDayColumns(week.weekFrom);
  const sortedEmps = [...emps].sort((a, b) => a.name.localeCompare(b.name, "pl"));

  if (emps.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-muted-foreground text-sm">
        Brak zapisanego grafiku — to starszy wpis archiwum (tylko podsumowanie płac).
        <p className="text-xs mt-2">Nowe zapisy tygodnia zawierają pełny grafik.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="bg-secondary/30">
            <th className="sticky left-0 z-10 bg-secondary/30 border-b border-r border-border px-3 py-2 text-xs font-semibold text-muted-foreground min-w-[120px]">
              Pracownik
            </th>
            {columns.map((col) => (
              <th key={col.key} className="border-b border-border px-2 py-2 text-center min-w-[80px]">
                <p className="text-xs font-bold">{col.shortLabel}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{col.dateLabel}</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedEmps.map((emp, ri) => (
            <tr key={emp.id} className={ri % 2 === 0 ? "bg-background" : "bg-card/30"}>
              <td className={`sticky left-0 z-10 border-r border-b border-border px-3 py-2 ${ri % 2 === 0 ? "bg-background" : "bg-card/30"}`}>
                <p className="text-sm font-medium">{emp.name || "—"}</p>
                <p className="text-[10px] text-muted-foreground">{emp.position || "—"}</p>
              </td>
              {columns.map((col) => {
                const cell = scheduleCellFromArchive(emp, col.key, col.iso, workEntries, directory);
                return (
                  <td key={col.key} className={`border-b border-border px-1.5 py-2 align-top text-center ${cell.working ? "" : "opacity-40"}`}>
                    {cell.working ? (
                      <div className="space-y-1 flex flex-col items-center">
                        {cell.timeRange && (
                          <span className="text-[10px] font-semibold text-green-400/90 bg-green-500/10 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
                            {cell.timeRange}
                          </span>
                        )}
                        {cell.hoursLabel && (
                          <span className="text-[9px] text-muted-foreground">{cell.hoursLabel}</span>
                        )}
                        {cell.locations.map((loc, i) => (
                          <span key={i} className="text-[9px] text-primary flex items-start gap-0.5 max-w-[88px]">
                            <MapPin size={8} className="shrink-0 mt-0.5"/>
                            <span className="text-left">{loc}</span>
                          </span>
                        ))}
                        {!cell.timeRange && cell.locations.length === 0 && (
                          <span className="text-[9px] text-muted-foreground italic">robota</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50 text-sm">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Galeria zdjęć z robot ────────────────────────────────────────────────────

interface JobPhotoGalleryEntry {
  job: Job;
  bucket: JobGalleryBucket;
  photos: PhotoEntry[];
}

function JobPhotosGalleryView({
  jobs,
  onOpenJob,
}: {
  jobs: Job[];
  onOpenJob: (jobId: string) => void;
}) {
  const [tab, setTab] = useState<"gallery" | "archive">("gallery");
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<{ photo: PhotoEntry; job: Job } | null>(null);

  const entries = useMemo(() => {
    const list: JobPhotoGalleryEntry[] = [];
    for (const job of jobs) {
      const bucket = jobGalleryBucket(job);
      const photos = jobApprovedPhotos(job);
      if (!bucket || photos.length === 0) continue;
      list.push({ job, bucket, photos });
    }
    return list;
  }, [jobs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter(({ job }) => {
      if (!q) return true;
      return (
        job.address.toLowerCase().includes(q) ||
        job.flatNumber.toLowerCase().includes(q) ||
        job.client.toLowerCase().includes(q)
      );
    });
  }, [entries, search]);

  const galleryJobs = useMemo(
    () => filtered.filter((e) => e.bucket === "active" || e.bucket === "grace"),
    [filtered],
  );
  const archiveJobs = useMemo(
    () => filtered.filter((e) => e.bucket === "archived"),
    [filtered],
  );

  const visible = tab === "gallery" ? galleryJobs : archiveJobs;

  const totalApproved = entries.reduce((s, e) => s + e.photos.length, 0);
  const galleryPhotoCount = galleryJobs.reduce((s, e) => s + e.photos.length, 0);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const PhotoThumbGrid = ({ photos, job }: { photos: PhotoEntry[]; job: Job }) => (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
      {photos.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setLightbox({ photo: p, job })}
          className="group relative aspect-square rounded-xl overflow-hidden bg-secondary ring-1 ring-border/60 hover:ring-primary/40 transition-all"
        >
          <img src={p.publicUrl} alt="" className="w-full h-full object-cover"/>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"/>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-1.5 py-1 pointer-events-none">
            <p className="text-[8px] text-white font-medium truncate">{PHOTO_LABEL_NAMES[p.label]}</p>
          </div>
        </button>
      ))}
    </div>
  );

  const JobPhotoCard = ({ entry }: { entry: JobPhotoGalleryEntry }) => {
    const { job, bucket, photos } = entry;
    const expanded = expandedIds.has(job.id);
    const daysLeft = bucket === "grace" ? galleryDaysUntilArchive(job) : null;
    const handoverIso = jobHandoverIso(job);

    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => toggleExpanded(job.id)}
          className="w-full text-left px-4 sm:px-5 py-4 hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-secondary shrink-0 ring-1 ring-border">
              {photos[0]?.publicUrl ? (
                <img src={photos[0].publicUrl} alt="" className="w-full h-full object-cover"/>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Camera size={20}/></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{jobDisplayTitle(job)}</p>
                  <p className="text-xs text-muted-foreground truncate">{job.client || "—"}</p>
                </div>
                {expanded ? <ChevronDown size={16} className="text-muted-foreground shrink-0 mt-0.5"/> : <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-0.5"/>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {photos.length} zdj.
                </span>
                {bucket === "active" && job.status === "in_progress" && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">W trakcie</span>
                )}
                {bucket === "active" && job.status === "completed" && !job.keysHandedOver && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">Zdane</span>
                )}
                {bucket === "grace" && daysLeft !== null && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    W galerii jeszcze {daysLeft} dni
                  </span>
                )}
                {bucket === "archived" && handoverIso && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    Zdane {fmtDate(handoverIso)}
                  </span>
                )}
              </div>
            </div>
          </div>
          {!expanded && photos.length > 1 && (
            <div className="flex gap-1 mt-3 overflow-hidden">
              {photos.slice(0, 5).map((p) => (
                <div key={p.id} className="w-10 h-10 rounded-lg overflow-hidden bg-secondary shrink-0 ring-1 ring-border/50">
                  <img src={p.publicUrl} alt="" className="w-full h-full object-cover"/>
                </div>
              ))}
              {photos.length > 5 && (
                <div className="w-10 h-10 rounded-lg bg-secondary shrink-0 flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                  +{photos.length - 5}
                </div>
              )}
            </div>
          )}
        </button>

        {expanded && (
          <div className="px-4 sm:px-5 pb-4 space-y-4 border-t border-border pt-4">
            {PHOTO_LABEL_ORDER.map((label) => {
              const group = photos.filter((p) => p.label === label);
              if (group.length === 0) return null;
              const meta = PHOTO_LABEL_SECTION[label];
              const Icon = meta.icon;
              return (
                <div key={label}>
                  <div className={`flex items-center gap-2 mb-2 pb-1 border-b ${meta.border}`}>
                    <Icon size={13} className={meta.accent}/>
                    <span className={`text-xs font-semibold uppercase tracking-wider ${meta.accent}`}>
                      {PHOTO_LABEL_NAMES[label]}
                    </span>
                    <span className="text-[10px] text-muted-foreground">({group.length})</span>
                  </div>
                  <PhotoThumbGrid photos={group} job={job}/>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => onOpenJob(job.id)}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              <MapPin size={12}/>Otwórz robotę
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto pb-20 sm:pb-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Images size={22} className="text-primary"/>
            Zdjęcia z robot
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tylko zaakceptowane zdjęcia. Po zdaniu mieszkania i kluczy roboty zostają tutaj {GALLERY_ARCHIVE_DAYS} dni, potem trafiają do archiwum.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-card rounded-xl border border-border px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">W galerii</p>
            <p className="text-lg font-bold text-primary mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{galleryPhotoCount}</p>
          </div>
          <div className="bg-card rounded-xl border border-border px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Roboty</p>
            <p className="text-lg font-bold mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{galleryJobs.length}</p>
          </div>
          <div className="bg-card rounded-xl border border-border px-4 py-3 col-span-2 sm:col-span-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Łącznie zaakcept.</p>
            <p className="text-lg font-bold mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{totalApproved}</p>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-secondary rounded-xl">
          <button
            type="button"
            onClick={() => setTab("gallery")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "gallery" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Galeria ({galleryJobs.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("archive")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "archive" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Archiwum ({archiveJobs.length})
          </button>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input
            type="text"
            placeholder="Szukaj adresu, klienta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary rounded-xl pl-9 pr-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
          />
        </div>

        {visible.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Images size={40} className="mx-auto opacity-20 mb-3"/>
            <p className="text-sm">
              {tab === "gallery"
                ? "Brak zaakceptowanych zdjęć w galerii. Akceptuj zdjęcia w zakładce Roboty."
                : "Archiwum zdjęć jest puste — tu trafiają roboty zdane dłużej niż 30 dni temu."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((entry) => (
              <JobPhotoCard key={entry.job.id} entry={entry}/>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90" onClick={() => setLightbox(null)}>
          <button type="button" className="absolute top-4 right-4 text-white/70 hover:text-white p-2" onClick={() => setLightbox(null)}>
            <X size={24}/>
          </button>
          <img
            src={lightbox.photo.publicUrl}
            alt=""
            className="max-w-full max-h-[85vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-6 left-4 right-4 text-center pointer-events-none">
            <p className="text-white font-medium text-sm">{jobDisplayTitle(lightbox.job)}</p>
            <p className="text-white/90 text-xs mt-0.5">{PHOTO_LABEL_NAMES[lightbox.photo.label]}</p>
            {lightbox.photo.caption && <p className="text-white/75 text-xs mt-1 italic">{lightbox.photo.caption}</p>}
            <p className="text-white/50 text-[11px] mt-1">
              {lightbox.photo.uploadedBy} · {new Date(lightbox.photo.uploadedAt).toLocaleDateString("pl-PL")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Archive view ─────────────────────────────────────────────────────────────

function ArchiveView({savedWeeks, onDelete, jobs, directory}:{savedWeeks:WeekSnapshot[]; onDelete:(id:string)=>void; jobs:Job[]; directory:DirectoryEmployee[]}) {
  const [selectedYear, setSelectedYear] = useState<number|null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number|null>(null);
  const [expandedWeek, setExpandedWeek] = useState<string|null>(null);
  const [expandedTab, setExpandedTab] = useState<"payroll"|"schedule">("payroll");
  const [deleteConfirm, setDeleteConfirm] = useState<string|null>(null);

  const years = useMemo(()=>Array.from(new Set(savedWeeks.map((w)=>new Date(w.weekFrom).getFullYear()))).sort((a,b)=>b-a),[savedWeeks]);
  const activeYear = selectedYear??years[0]??new Date().getFullYear();
  const months = useMemo(()=>Array.from(new Set(savedWeeks.filter((w)=>new Date(w.weekFrom).getFullYear()===activeYear).map((w)=>new Date(w.weekFrom).getMonth()))).sort((a,b)=>b-a),[savedWeeks,activeYear]);
  const activeMonth = selectedMonth!==null?selectedMonth:(months[0]??new Date().getMonth());

  const filteredWeeks = useMemo(()=>savedWeeks.filter((w)=>{const d=new Date(w.weekFrom);return d.getFullYear()===activeYear&&d.getMonth()===activeMonth;}).sort((a,b)=>b.weekFrom.localeCompare(a.weekFrom)),[savedWeeks,activeYear,activeMonth]);

  const yearlyWeeks = savedWeeks.filter((w)=>new Date(w.weekFrom).getFullYear()===activeYear);
  const yearlyNet = yearlyWeeks.reduce((s,w)=>s+w.totalNet,0);
  const yearlyHours = yearlyWeeks.reduce((s,w)=>s+w.totalHours,0);

  const monthlyNet = filteredWeeks.reduce((s,w)=>s+w.totalNet,0);
  const monthlyHours = filteredWeeks.reduce((s,w)=>s+w.totalHours,0);
  const monthlyGross = filteredWeeks.reduce((s,w)=>s+w.totalGross,0);
  const monthlyZaliczka = filteredWeeks.reduce((s,w)=>s+w.totalZaliczka,0);

  // Jobs that started in this month
  const monthJobs = jobs.filter(j=>{
    const d = new Date(j.startDate);
    return d.getFullYear()===activeYear && d.getMonth()===activeMonth;
  });
  const monthJobsCost = monthJobs.reduce((s,j)=>s+jobCost(j),0);
  const monthMatCost = monthJobs.reduce((s,j)=>s+jobMaterialsCost(j),0);
  const monthInvoiced = monthJobs.reduce((s,j)=>s+(parseFloat(j.invoiceAmount)||0),0);

  const exportMonthlyReport = async () => {
    const pdfMake = await loadPdfMake();
    const C = { navy:"#344254", red:"#C0392B", light:"#EDF1F6", white:"#FFFFFF", muted:"#8A9BB0", green:"#1E7E34" };
    const monthLabel = `${MONTH_NAMES[activeMonth]} ${activeYear}`;
    const filename = `raport-${activeYear}-${String(activeMonth+1).padStart(2,"0")}.pdf`;

    // Build jobs table rows
    const jobRows = monthJobs.map(j=>[
      {text:(j.address||"—")+(j.flatNumber?` m.${j.flatNumber}`:""), fontSize:8},
      {text:j.client||"—", fontSize:8, color:C.muted},
      {text:j.status==="completed"?"Zdane":"W trakcie", fontSize:8, color:j.status==="completed"?C.green:C.red},
      {text:jobCost(j)>0?`${fmt(jobCost(j))} PLN`:"—", fontSize:8, alignment:"right"},
      {text:jobMaterialsCost(j)>0?`${fmt(jobMaterialsCost(j))} PLN`:"—", fontSize:8, alignment:"right", color:C.muted},
      {text:jobTotalCost(j)>0?`${fmt(jobTotalCost(j))} PLN`:"—", fontSize:8, bold:true, alignment:"right", color:C.red},
      {text:parseFloat(j.invoiceAmount||"0")>0?`${fmt(parseFloat(j.invoiceAmount))} PLN`:"—", fontSize:8, alignment:"right"},
    ]);

    // Build payroll sections for each week
    const payrollSections: unknown[] = [];
    filteredWeeks.forEach((w, wi) => {
      payrollSections.push(
        {text:`Tydzień ${wi+1}: ${fmtDate(w.weekFrom)} – ${fmtDate(w.weekTo)}`, fontSize:9, bold:true, color:C.navy, margin:[0, wi===0?0:10, 0, 4]},
        {
          table:{
            headerRows:1,
            widths:["*","auto","auto","auto","auto","auto"],
            body:[
              [
                {text:"Pracownik", bold:true, fillColor:C.navy, color:C.white, fontSize:7},
                {text:"Stanowisko", bold:true, fillColor:C.navy, color:C.white, fontSize:7},
                {text:"Godz.", bold:true, fillColor:C.navy, color:C.white, fontSize:7, alignment:"right"},
                {text:"Brutto", bold:true, fillColor:C.navy, color:C.white, fontSize:7, alignment:"right"},
                {text:"Zaliczki", bold:true, fillColor:C.navy, color:C.white, fontSize:7, alignment:"right"},
                {text:"Do wypłaty", bold:true, fillColor:C.navy, color:C.white, fontSize:7, alignment:"right"},
              ],
              ...w.employees.map((e,i)=>[
                {text:e.name||"—", fontSize:7, fillColor:i%2===0?C.white:C.light},
                {text:e.position||"—", fontSize:7, color:C.muted, fillColor:i%2===0?C.white:C.light},
                {text:fmtH(e.totalHours), fontSize:7, alignment:"right", fillColor:i%2===0?C.white:C.light},
                {text:`${fmt(e.grossPay)} PLN`, fontSize:7, alignment:"right", color:C.muted, fillColor:i%2===0?C.white:C.light},
                {text:e.totalZaliczka>0?`${fmt(e.totalZaliczka)} PLN`:"—", fontSize:7, alignment:"right", color:e.totalZaliczka>0?C.red:C.muted, fillColor:i%2===0?C.white:C.light},
                {text:`${fmt(e.netPay)} PLN`, fontSize:7, bold:true, alignment:"right", color:C.red, fillColor:i%2===0?C.white:C.light},
              ]),
              [
                {text:"SUMA", bold:true, fillColor:C.light, fontSize:8},
                {text:`${w.totalEmployees} prac.`, fontSize:7, fillColor:C.light, color:C.muted},
                {text:fmtH(w.totalHours), bold:true, fontSize:8, alignment:"right", fillColor:C.light},
                {text:`${fmt(w.totalGross)} PLN`, bold:true, fontSize:8, alignment:"right", color:C.muted, fillColor:C.light},
                {text:w.totalZaliczka>0?`${fmt(w.totalZaliczka)} PLN`:"—", bold:true, fontSize:8, alignment:"right", color:C.red, fillColor:C.light},
                {text:`${fmt(w.totalNet)} PLN`, bold:true, fontSize:8, alignment:"right", color:C.red, fillColor:C.light},
              ],
            ],
          },
          layout:{hLineColor:()=>"#E5E7EB", vLineColor:()=>"#E5E7EB"},
        }
      );
    });

    const dd: PdfDocDef = {
      pageSize:"A4", pageOrientation:"landscape",
      pageMargins:[40,60,40,60],
      defaultStyle:{font:"Roboto", fontSize:10, lineHeight:1.3},
      content:[
        // Header bar
        {canvas:[{type:"rect",x:0,y:0,w:762,h:55,color:C.navy}]},
        {text:"W&G DOM", fontSize:26, bold:true, color:C.white, absolutePosition:{x:40,y:18}},
        {text:"Raport Miesięczny", fontSize:12, color:C.red, absolutePosition:{x:40,y:46}},
        {text:monthLabel, fontSize:20, bold:true, color:C.white, absolutePosition:{x:500,y:22}},
        {text:`Wygenerowano: ${new Date().toLocaleDateString("pl-PL")}`, fontSize:8, color:C.muted, absolutePosition:{x:500,y:50}},
        {text:" ", fontSize:6, margin:[0,20,0,0]},

        // Summary boxes
        {
          columns:[
            {stack:[
              {canvas:[{type:"rect",x:0,y:0,w:170,h:55,color:"#1A2332",r:6}]},
              {text:"WYPŁATY NETTO", fontSize:7, bold:true, color:C.muted, absolutePosition:{x:10,y:8}},
              {text:`${fmt(monthlyNet)} PLN`, fontSize:16, bold:true, color:C.red, absolutePosition:{x:10,y:22}},
              {text:`${fmtH(monthlyHours)} · ${filteredWeeks.length} tyg.`, fontSize:7, color:C.muted, absolutePosition:{x:10,y:46}},
            ], width:180, margin:[0,0,0,0]},
            {stack:[
              {canvas:[{type:"rect",x:0,y:0,w:170,h:55,color:"#1A2332",r:6}]},
              {text:"KOSZT ROBÓT", fontSize:7, bold:true, color:C.muted, absolutePosition:{x:10,y:8}},
              {text:`${fmt(monthJobsCost)} PLN`, fontSize:16, bold:true, color:C.white, absolutePosition:{x:10,y:22}},
              {text:`${monthJobs.filter(j=>j.status==="in_progress").length} w trakcie · ${monthJobs.filter(j=>j.status==="completed").length} zdanych`, fontSize:7, color:C.muted, absolutePosition:{x:10,y:46}},
            ], width:180, margin:[0,0,0,0]},
            {stack:[
              {canvas:[{type:"rect",x:0,y:0,w:170,h:55,color:"#1A2332",r:6}]},
              {text:"MATERIAŁY", fontSize:7, bold:true, color:C.muted, absolutePosition:{x:10,y:8}},
              {text:`${fmt(monthMatCost)} PLN`, fontSize:16, bold:true, color:C.white, absolutePosition:{x:10,y:22}},
              {text:`${monthJobs.length} robót`, fontSize:7, color:C.muted, absolutePosition:{x:10,y:46}},
            ], width:180, margin:[0,0,0,0]},
            {stack:[
              {canvas:[{type:"rect",x:0,y:0,w:170,h:55,color:"#1A2332",r:6}]},
              {text:"FAKTUROWANIE", fontSize:7, bold:true, color:C.muted, absolutePosition:{x:10,y:8}},
              {text:`${fmt(monthInvoiced)} PLN`, fontSize:16, bold:true, color:monthInvoiced>0?C.green:C.muted, absolutePosition:{x:10,y:22}},
              {text:`zysk: ${fmt(monthInvoiced-monthJobsCost-monthMatCost)} PLN`, fontSize:7, color:C.muted, absolutePosition:{x:10,y:46}},
            ], width:180, margin:[0,0,0,0]},
          ],
          columnGap:10,
          margin:[0,10,0,20],
        },

        // Jobs section
        ...(monthJobs.length>0 ? [
          {text:"ROBOTY W MIESIĄCU", fontSize:9, bold:true, color:C.muted, margin:[0,0,0,6]},
          {
            table:{
              headerRows:1,
              widths:["*","*","auto","auto","auto","auto","auto"],
              body:[
                [
                  {text:"Adres", bold:true, fillColor:C.navy, color:C.white, fontSize:8},
                  {text:"Klient", bold:true, fillColor:C.navy, color:C.white, fontSize:8},
                  {text:"Status", bold:true, fillColor:C.navy, color:C.white, fontSize:8},
                  {text:"Koszt prac", bold:true, fillColor:C.navy, color:C.white, fontSize:8, alignment:"right"},
                  {text:"Materiały", bold:true, fillColor:C.navy, color:C.white, fontSize:8, alignment:"right"},
                  {text:"Łącznie", bold:true, fillColor:C.navy, color:C.white, fontSize:8, alignment:"right"},
                  {text:"Faktura", bold:true, fillColor:C.navy, color:C.white, fontSize:8, alignment:"right"},
                ],
                ...jobRows,
                [
                  {text:"SUMA", bold:true, fillColor:C.light, colSpan:3, fontSize:9}, {}, {},
                  {text:`${fmt(monthJobsCost)} PLN`, bold:true, fillColor:C.light, alignment:"right", fontSize:9, color:C.muted},
                  {text:`${fmt(monthMatCost)} PLN`, bold:true, fillColor:C.light, alignment:"right", fontSize:9, color:C.muted},
                  {text:`${fmt(monthJobsCost+monthMatCost)} PLN`, bold:true, fillColor:C.light, alignment:"right", fontSize:9, color:C.red},
                  {text:monthInvoiced>0?`${fmt(monthInvoiced)} PLN`:"—", bold:true, fillColor:C.light, alignment:"right", fontSize:9},
                ],
              ],
            },
            layout:{hLineColor:()=>"#E5E7EB", vLineColor:()=>"#E5E7EB"},
            margin:[0,0,0,20],
          },
        ] as unknown[] : []),

        // Payroll section
        ...(filteredWeeks.length>0 ? [
          {text:"LISTA PŁAC — TYGODNIE", fontSize:9, bold:true, color:C.muted, margin:[0,0,0,8]},
          ...payrollSections,
          // Monthly payroll total
          {
            canvas:[{type:"rect",x:0,y:0,w:762,h:42,color:C.navy}],
            margin:[0,14,0,0],
          },
          {
            columns:[
              {text:"PODSUMOWANIE WYPŁAT — "+monthLabel, fontSize:10, bold:true, color:C.white},
              {stack:[
                {columns:[
                  {text:"Brutto:", fontSize:9, color:C.muted, width:"auto"},
                  {text:`${fmt(monthlyGross)} PLN`, fontSize:9, color:C.white, width:"auto", margin:[6,0,0,0]},
                  {text:"Zaliczki:", fontSize:9, color:C.muted, width:"auto", margin:[12,0,0,0]},
                  {text:`${fmt(monthlyZaliczka)} PLN`, fontSize:9, color:monthlyZaliczka>0?C.red:C.muted, width:"auto", margin:[6,0,0,0]},
                  {text:"DO WYPŁATY:", fontSize:10, bold:true, color:C.white, width:"auto", margin:[14,0,0,0]},
                  {text:`${fmt(monthlyNet)} PLN`, fontSize:14, bold:true, color:C.red, width:"auto", margin:[6,-2,0,0]},
                ]},
              ], alignment:"right"},
            ],
            absolutePosition:{x:40, y:-42+12},
          },
          {text:" ", fontSize:6, margin:[0,26,0,0]},
        ] as unknown[] : []),
      ],
    };
    pdfMake.createPdf(dd).download(filename);
  };

  const exportYearlyReport = async () => {
    const pdfMake = await loadPdfMake();
    const C = { navy:"#344254", red:"#C0392B", light:"#EDF1F6", white:"#FFFFFF", muted:"#8A9BB0", green:"#1E7E34" };
    const filename = `raport-roczny-${activeYear}.pdf`;
    const yearlyGross = yearlyWeeks.reduce((s, w) => s + w.totalGross, 0);
    const avgLaborHour = yearlyHours > 0 ? yearlyGross / yearlyHours : 0;

    const monthlyPayouts = Array.from({ length: 12 }, () => 0);
    const monthlyHoursArr = Array.from({ length: 12 }, () => 0);
    const monthlyWeekCounts = Array.from({ length: 12 }, () => 0);
    for (const w of yearlyWeeks) {
      const m = new Date(w.weekFrom).getMonth();
      monthlyPayouts[m] += w.totalNet;
      monthlyHoursArr[m] += w.totalHours;
      monthlyWeekCounts[m] += 1;
    }

    const yearJobsList = jobs.filter((j) => new Date(j.startDate).getFullYear() === activeYear);
    const completedInYear = jobs.filter(
      (j) =>
        j.status === "completed" &&
        (j.endDate ? new Date(j.endDate).getFullYear() === activeYear : new Date(j.startDate).getFullYear() === activeYear),
    );
    const yearLaborCost = yearJobsList.reduce((s, j) => s + jobCost(j), 0);
    const yearMatCost = yearJobsList.reduce((s, j) => s + jobMaterialsCost(j), 0);
    const yearInvoiced = yearJobsList.reduce((s, j) => s + (parseFloat(j.invoiceAmount) || 0), 0);

    const monthRows = MONTH_NAMES.map((name, i) => [
      { text: name, fontSize: 8, fillColor: i % 2 === 0 ? C.white : C.light },
      { text: monthlyWeekCounts[i] > 0 ? String(monthlyWeekCounts[i]) : "—", fontSize: 8, alignment: "center" as const, fillColor: i % 2 === 0 ? C.white : C.light, color: C.muted },
      { text: monthlyHoursArr[i] > 0 ? fmtH(monthlyHoursArr[i]) : "—", fontSize: 8, alignment: "right" as const, fillColor: i % 2 === 0 ? C.white : C.light },
      { text: monthlyPayouts[i] > 0 ? `${fmt(monthlyPayouts[i])} PLN` : "—", fontSize: 8, bold: monthlyPayouts[i] > 0, alignment: "right" as const, color: monthlyPayouts[i] > 0 ? C.red : C.muted, fillColor: i % 2 === 0 ? C.white : C.light },
    ]);

    const dd: PdfDocDef = {
      pageSize: "A4",
      pageOrientation: "landscape",
      pageMargins: [40, 60, 40, 60],
      defaultStyle: { font: "Roboto", fontSize: 10, lineHeight: 1.3 },
      content: [
        { canvas: [{ type: "rect", x: 0, y: 0, w: 762, h: 55, color: C.navy }] },
        { text: "W&G DOM", fontSize: 26, bold: true, color: C.white, absolutePosition: { x: 40, y: 18 } },
        { text: "Raport Roczny", fontSize: 12, color: C.red, absolutePosition: { x: 40, y: 46 } },
        { text: String(activeYear), fontSize: 20, bold: true, color: C.white, absolutePosition: { x: 500, y: 22 } },
        { text: `Wygenerowano: ${new Date().toLocaleDateString("pl-PL")}`, fontSize: 8, color: C.muted, absolutePosition: { x: 500, y: 50 } },
        { text: " ", fontSize: 6, margin: [0, 20, 0, 0] },
        {
          columns: [
            { stack: [
              { canvas: [{ type: "rect", x: 0, y: 0, w: 170, h: 55, color: "#1A2332", r: 6 }] },
              { text: "WYPŁATY NETTO", fontSize: 7, bold: true, color: C.muted, absolutePosition: { x: 10, y: 8 } },
              { text: `${fmt(yearlyNet)} PLN`, fontSize: 16, bold: true, color: C.red, absolutePosition: { x: 10, y: 22 } },
              { text: `${fmtH(yearlyHours)} · ${yearlyWeeks.length} tyg.`, fontSize: 7, color: C.muted, absolutePosition: { x: 10, y: 46 } },
            ], width: 180 },
            { stack: [
              { canvas: [{ type: "rect", x: 0, y: 0, w: 170, h: 55, color: "#1A2332", r: 6 }] },
              { text: "ŚR. KOSZT GODZ.", fontSize: 7, bold: true, color: C.muted, absolutePosition: { x: 10, y: 8 } },
              { text: avgLaborHour > 0 ? `${fmt(avgLaborHour)} PLN/h` : "—", fontSize: 16, bold: true, color: C.white, absolutePosition: { x: 10, y: 22 } },
              { text: `brutto ${fmt(yearlyGross)} PLN`, fontSize: 7, color: C.muted, absolutePosition: { x: 10, y: 46 } },
            ], width: 180 },
            { stack: [
              { canvas: [{ type: "rect", x: 0, y: 0, w: 170, h: 55, color: "#1A2332", r: 6 }] },
              { text: "ROBOTY ZDANE", fontSize: 7, bold: true, color: C.muted, absolutePosition: { x: 10, y: 8 } },
              { text: String(completedInYear.length), fontSize: 16, bold: true, color: C.green, absolutePosition: { x: 10, y: 22 } },
              { text: `${yearJobsList.length} rozpoczętych w ${activeYear}`, fontSize: 7, color: C.muted, absolutePosition: { x: 10, y: 46 } },
            ], width: 180 },
            { stack: [
              { canvas: [{ type: "rect", x: 0, y: 0, w: 170, h: 55, color: "#1A2332", r: 6 }] },
              { text: "FAKTUROWANIE", fontSize: 7, bold: true, color: C.muted, absolutePosition: { x: 10, y: 8 } },
              { text: `${fmt(yearInvoiced)} PLN`, fontSize: 16, bold: true, color: yearInvoiced > 0 ? C.green : C.muted, absolutePosition: { x: 10, y: 22 } },
              { text: `koszt robót: ${fmt(yearLaborCost + yearMatCost)} PLN`, fontSize: 7, color: C.muted, absolutePosition: { x: 10, y: 46 } },
            ], width: 180 },
          ],
          margin: [0, 0, 0, 16],
        },
        { text: "Wypłaty i godziny — podział miesięczny", fontSize: 10, bold: true, color: C.navy, margin: [0, 0, 0, 6] },
        {
          table: {
            headerRows: 1,
            widths: ["*", 50, 70, 90],
            body: [
              [
                { text: "Miesiąc", bold: true, fillColor: C.navy, color: C.white, fontSize: 8 },
                { text: "Tyg.", bold: true, fillColor: C.navy, color: C.white, fontSize: 8, alignment: "center" as const },
                { text: "Godziny", bold: true, fillColor: C.navy, color: C.white, fontSize: 8, alignment: "right" as const },
                { text: "Wypłaty netto", bold: true, fillColor: C.navy, color: C.white, fontSize: 8, alignment: "right" as const },
              ],
              ...monthRows,
              [
                { text: "RAZEM", bold: true, fillColor: C.light, fontSize: 8 },
                { text: String(yearlyWeeks.length), bold: true, fillColor: C.light, fontSize: 8, alignment: "center" as const },
                { text: fmtH(yearlyHours), bold: true, fillColor: C.light, fontSize: 8, alignment: "right" as const },
                { text: `${fmt(yearlyNet)} PLN`, bold: true, fillColor: C.light, fontSize: 8, color: C.red, alignment: "right" as const },
              ],
            ],
          },
          layout: { hLineColor: () => "#E5E7EB", vLineColor: () => "#E5E7EB" },
        },
        { text: "Roboty zakończone w roku", fontSize: 10, bold: true, color: C.navy, margin: [0, 14, 0, 6] },
        completedInYear.length === 0
          ? { text: "Brak zdanych robót w tym roku.", fontSize: 8, color: C.muted }
          : {
              table: {
                headerRows: 1,
                widths: ["*", 80, 60, 70, 70],
                body: [
                  [
                    { text: "Adres", bold: true, fillColor: C.navy, color: C.white, fontSize: 7 },
                    { text: "Klient", bold: true, fillColor: C.navy, color: C.white, fontSize: 7 },
                    { text: "Zdane", bold: true, fillColor: C.navy, color: C.white, fontSize: 7, alignment: "center" as const },
                    { text: "Koszt", bold: true, fillColor: C.navy, color: C.white, fontSize: 7, alignment: "right" as const },
                    { text: "FV", bold: true, fillColor: C.navy, color: C.white, fontSize: 7, alignment: "right" as const },
                  ],
                  ...completedInYear.slice(0, 40).map((j, i) => [
                    { text: (j.address || "—") + (j.flatNumber ? ` m.${j.flatNumber}` : ""), fontSize: 7, fillColor: i % 2 === 0 ? C.white : C.light },
                    { text: j.client || "—", fontSize: 7, color: C.muted, fillColor: i % 2 === 0 ? C.white : C.light },
                    { text: j.endDate ? fmtDate(j.endDate) : fmtDate(j.startDate), fontSize: 7, alignment: "center" as const, fillColor: i % 2 === 0 ? C.white : C.light },
                    { text: jobTotalCost(j) > 0 ? `${fmt(jobTotalCost(j))}` : "—", fontSize: 7, alignment: "right" as const, fillColor: i % 2 === 0 ? C.white : C.light },
                    { text: parseFloat(j.invoiceAmount || "0") > 0 ? `${fmt(parseFloat(j.invoiceAmount))}` : "—", fontSize: 7, alignment: "right" as const, fillColor: i % 2 === 0 ? C.white : C.light },
                  ]),
                ],
              },
              layout: { hLineColor: () => "#E5E7EB", vLineColor: () => "#E5E7EB" },
            },
      ],
    };
    pdfMake.createPdf(dd).download(filename);
  };

  if(savedWeeks.length===0) return <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground"><Archive size={48} className="opacity-15"/><p className="text-sm font-medium">Brak zapisanych tygodni</p><p className="text-xs text-center max-w-xs">Przejdź do Listy Płac i kliknij "Zapisz tydzień".</p></div>;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="flex items-center gap-2 flex-wrap">
          {years.map((y)=><button key={y} onClick={()=>{setSelectedYear(y);setSelectedMonth(null);}} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeYear===y?"bg-primary text-primary-foreground":"bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>{y}</button>)}
          <button onClick={exportYearlyReport} className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary/90 hover:bg-primary text-primary-foreground rounded-xl text-sm font-medium transition-colors shrink-0">
            <FileDown size={14}/>Raport roczny PDF
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Wypłaty rok" value={`${fmt(yearlyNet)} PLN`} sub={`${yearlyWeeks.length} tygodni`} icon={TrendingUp} accent/>
          <StatCard label="Godziny rok" value={fmtH(yearlyHours)} sub={`śr. ${fmtH(yearlyHours/Math.max(yearlyWeeks.length,1))}/tydz.`} icon={Clock}/>
          <StatCard label="Tygodni" value={String(yearlyWeeks.length)} sub="zapisanych" icon={Calendar}/>
          <StatCard label="Miesięcy" value={String(new Set(yearlyWeeks.map(w=>new Date(w.weekFrom).getMonth())).size)} sub={`z ${activeYear}`} icon={Archive}/>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {months.map((m)=><button key={m} onClick={()=>setSelectedMonth(m)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeMonth===m?"bg-secondary text-foreground border border-primary/30":"text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}>{MONTH_NAMES[m]}</button>)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label={`Wypłaty — ${MONTH_NAMES[activeMonth]}`} value={`${fmt(monthlyNet)} PLN`} sub={`${filteredWeeks.length} tygodni`} icon={Wallet} accent/>
          <StatCard label="Godziny w miesiącu" value={fmtH(monthlyHours)} sub={`brutto: ${fmt(monthlyGross)} PLN`} icon={Clock}/>
          <StatCard label="Maks. pracownicy" value={String(Math.max(...filteredWeeks.map(w=>w.totalEmployees),0))} sub="w tygodniu" icon={Users}/>
        </div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground px-1">Tygodnie — {MONTH_NAMES[activeMonth]} {activeYear}</h3>
          <button onClick={exportMonthlyReport} className="flex items-center gap-2 px-4 py-2 bg-destructive/80 hover:bg-destructive text-white rounded-xl text-sm font-medium transition-colors shrink-0">
            <FileDown size={14}/>Raport miesięczny PDF
          </button>
        </div>
        {filteredWeeks.length===0&&<div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">Brak zapisanych tygodni w tym miesiącu.</div>}
        {filteredWeeks.map((week)=>{
          const isOpen=expandedWeek===week.id;
          return <div key={week.id} className="bg-card rounded-xl border border-border overflow-hidden">
            <button onClick={()=>{setExpandedWeek(isOpen?null:week.id);setExpandedTab("payroll");}} className="w-full px-5 py-4 flex items-center gap-4 hover:bg-secondary/20 transition-colors text-left">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-semibold">{fmtDate(week.weekFrom)} – {fmtDate(week.weekTo)}</span>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{week.totalEmployees} prac.</span>
                  {week.weekEmployees && week.weekEmployees.length > 0 && (
                    <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">+ grafik</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-0.5">
                  <span className="text-xs text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(week.totalHours)}</span>
                  <span className="text-xs text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>brutto: {fmt(week.totalGross)} PLN</span>
                  <span className="text-xs font-semibold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>netto: {fmt(week.totalNet)} PLN</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {deleteConfirm===week.id?<div className="flex items-center gap-1" onClick={(e)=>e.stopPropagation()}><button onClick={()=>onDelete(week.id)} className="text-xs bg-destructive text-white px-2 py-1 rounded font-medium">Usuń</button><button onClick={()=>setDeleteConfirm(null)} className="text-xs text-muted-foreground px-1"><X size={12}/></button></div>:<button onClick={(e)=>{e.stopPropagation();setDeleteConfirm(week.id);}} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"><Trash2 size={13}/></button>}
                {isOpen?<ChevronUp size={16} className="text-muted-foreground"/>:<ChevronDown size={16} className="text-muted-foreground"/>}
              </div>
            </button>
            {isOpen&&<div className="border-t border-border">
              <div className="flex border-b border-border px-2 pt-2 gap-1">
                <button onClick={()=>setExpandedTab("payroll")} className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors ${expandedTab==="payroll"?"bg-background text-primary border border-b-0 border-border":"text-muted-foreground hover:text-foreground"}`}>
                  Lista płac
                </button>
                <button onClick={()=>setExpandedTab("schedule")} className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${expandedTab==="schedule"?"bg-background text-primary border border-b-0 border-border":"text-muted-foreground hover:text-foreground"}`}>
                  <CalendarDays size={12}/>Grafik
                </button>
              </div>
              {expandedTab==="payroll" ? (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-muted-foreground border-b border-border" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                  <th className="px-5 py-2.5 text-left">Pracownik</th><th className="px-3 py-2.5 text-left hidden sm:table-cell">Stanowisko</th>
                  <th className="px-3 py-2.5 text-right">Tydzień</th><th className="px-3 py-2.5 text-right">Sob.pr.</th><th className="px-3 py-2.5 text-right">Razem h</th><th className="px-3 py-2.5 text-right">Brutto</th>
                  <th className="px-3 py-2.5 text-right">Zaliczki</th><th className="px-3 py-2.5 text-right">Koszty</th><th className="px-3 py-2.5 text-right">Wypłata</th>
                  <th className="px-5 py-2.5 text-center">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {week.employees.map((emp,i)=>{
                    const full = week.weekEmployees?.find((we) => we.name === emp.name && we.position === emp.position);
                    const c = full ? calcWeekEmployee(full) : {
                      weekHours: emp.weekHours ?? emp.totalHours,
                      prevSatHours: emp.prevSatHours ?? 0,
                      totalHours: emp.totalHours,
                      grossPay: emp.grossPay,
                      totalZaliczka: emp.totalZaliczka,
                      totalExtraCosts: emp.totalExtraCosts ?? 0,
                      netPay: emp.netPay,
                    };
                    return (
                    <tr key={i} className={`hover:bg-secondary/20 ${emp.settled?"opacity-60":""}`}>
                      <td className="px-5 py-3"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">{emp.name?emp.name[0].toUpperCase():"?"}</div><span className="font-medium">{emp.name||"—"}</span></div></td>
                      <td className="px-3 py-3 text-muted-foreground text-xs hidden sm:table-cell">{emp.position||"—"}</td>
                      <td className="px-3 py-3 text-right text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{c.weekHours>0?fmtH(c.weekHours):"—"}</td>
                      <td className="px-3 py-3 text-right" style={{fontFamily:"'JetBrains Mono', monospace"}}>{c.prevSatHours>0?<span className="text-amber-500">{fmtH(c.prevSatHours)}</span>:"—"}</td>
                      <td className="px-3 py-3 text-right font-medium" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(c.totalHours)}</td>
                      <td className="px-3 py-3 text-right text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(c.grossPay)}</td>
                      <td className="px-3 py-3 text-right" style={{fontFamily:"'JetBrains Mono', monospace"}}>{emp.totalZaliczka>0?<span className="text-destructive">−{fmt(emp.totalZaliczka)}</span>:<span className="text-muted-foreground/40">—</span>}</td>
                      <td className="px-3 py-3 text-right" style={{fontFamily:"'JetBrains Mono', monospace"}}>{c.totalExtraCosts>0?<span className="text-green-500">+{fmt(c.totalExtraCosts)}</span>:<span className="text-muted-foreground/40">—</span>}</td>
                      <td className="px-3 py-3 text-right font-bold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(c.netPay)} PLN</td>
                      <td className="px-5 py-3 text-center"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${emp.settled?"bg-green-500/15 text-green-400":"bg-yellow-500/10 text-yellow-400"}`}>{emp.settled?<><CheckCircle2 size={10}/>Rozliczony</>:<><Circle size={10}/>Oczekuje</>}</span></td>
                    </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr className="border-t border-border bg-secondary/20">
                  <td className="px-5 py-2.5 text-xs font-bold text-muted-foreground uppercase" colSpan={2}>Suma</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(week.totalHours)}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(week.totalGross)}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-destructive" style={{fontFamily:"'JetBrains Mono', monospace"}}>{week.totalZaliczka>0?`−${fmt(week.totalZaliczka)}`:"—"}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-green-500" style={{fontFamily:"'JetBrains Mono', monospace"}}>{week.employees.some((e) => (e.totalExtraCosts ?? 0) > 0)?`+${fmt(week.employees.reduce((s, e) => s + (e.totalExtraCosts ?? 0), 0))}`:"—"}</td>
                  <td className="px-3 py-2.5 text-right text-sm font-bold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(week.totalNet)} PLN</td>
                  <td/>
                </tr></tfoot>
              </table>
              </div>
              ) : (
                <ArchiveScheduleGrid week={week} directory={directory}/>
              )}
            </div>}
          </div>;
        })}
      </div>
    </div>
  );
}

// ─── Email z roboty ───────────────────────────────────────────────────────────

type EmailSelectKey = string;

function jobEmailDefaultSubject(job: Job): string {
  const addr = `${job.address || "Robota"}${job.flatNumber ? ` m.${job.flatNumber}` : ""}`;
  return `W&G DOM — ${addr}`;
}

function collectJobEmailSelectableKeys(job: Job): EmailSelectKey[] {
  const keys: EmailSelectKey[] = [];
  for (const p of (job.photos || []).filter((ph) => ph.status !== "rejected" && ph.publicUrl)) {
    keys.push(`p:${p.id}`);
  }
  for (const report of jobWorkerReports(job)) {
    if (reportHasWorkScope(report)) keys.push(`ws:${report.id}`);
    for (const item of report.workItems.filter(workItemHasContent)) {
      keys.push(`wi:${report.id}:${item.id}`);
    }
    if (report.generalNote?.trim()) keys.push(`gn:${report.id}`);
    let pokojIdx = 0;
    for (const room of report.rooms.filter(roomHasContent)) {
      const idx = room.roomType === "pokoj" ? pokojIdx++ : 0;
      void idx;
      keys.push(`rm:${report.id}:${room.id}`);
    }
    if (report.sketch?.publicUrl) keys.push(`sk:${report.id}`);
  }
  return keys;
}

function buildJobEmailPayload(
  job: Job,
  selected: Set<EmailSelectKey>,
  to: string,
  toName: string,
  subject: string,
  introMessage: string,
) {
  const photos = (job.photos || [])
    .filter((p) => selected.has(`p:${p.id}`) && p.publicUrl)
    .map((p) => ({
      publicUrl: p.publicUrl,
      label: p.label,
      caption: p.caption,
      uploadedBy: p.uploadedBy,
    }));

  const reportMap = new Map<string, {
    workerName: string;
    date: string;
    workItems: { text: string; note?: string }[];
    rooms: { name: string; length: string; width: string; height: string; note?: string }[];
    sketch?: { publicUrl: string; note?: string };
    generalNote?: string;
  }>();

  for (const report of jobWorkerReports(job)) {
    const scopeSelected = selected.has(`ws:${report.id}`);
    const workItems = report.workItems
      .filter((item) => workItemHasContent(item) && (scopeSelected || selected.has(`wi:${report.id}:${item.id}`)))
      .map((item) => ({ text: item.text, note: item.note || undefined }));

    const rooms: { name: string; length: string; width: string; height: string; note?: string }[] = [];
    let pokojIdx = 0;
    for (const room of report.rooms.filter(roomHasContent)) {
      const idx = room.roomType === "pokoj" ? pokojIdx++ : 0;
      if (selected.has(`rm:${report.id}:${room.id}`)) {
        rooms.push({
          name: roomDisplayName(room, idx),
          length: room.length,
          width: room.width,
          height: room.height,
          note: room.note || undefined,
        });
      }
    }

    const sketch = selected.has(`sk:${report.id}`) && report.sketch?.publicUrl
      ? { publicUrl: report.sketch.publicUrl, note: report.sketchNote || undefined }
      : undefined;

    const generalNote = selected.has(`gn:${report.id}`) && report.generalNote?.trim()
      ? report.generalNote.trim()
      : undefined;

    if (workItems.length > 0 || rooms.length > 0 || sketch || generalNote) {
      reportMap.set(report.id, {
        workerName: report.workerName,
        date: fmtDate(report.submittedAt.slice(0, 10)),
        workItems,
        rooms,
        sketch,
        generalNote,
      });
    }
  }

  const reportSections = Array.from(reportMap.values()).map((sec) => ({
    workerName: sec.workerName,
    date: sec.date,
    workItems: sec.workItems.length > 0 ? sec.workItems : undefined,
    rooms: sec.rooms.length > 0 ? sec.rooms : undefined,
    sketch: sec.sketch,
    generalNote: sec.generalNote,
  }));

  return {
    to,
    toName: toName || undefined,
    subject: subject.trim() || jobEmailDefaultSubject(job),
    introMessage: introMessage.trim() || undefined,
    jobHeader: {
      address: job.address,
      flatNumber: job.flatNumber,
      client: job.client,
    },
    photos,
    reportSections,
  };
}

function JobEmailModal({
  job,
  contacts,
  onClose,
  onManageContacts,
  onSent,
}: {
  job: Job;
  contacts: EmailContact[];
  onClose: () => void;
  onManageContacts: () => void;
  onSent?: (to: string) => void;
}) {
  const allKeys = useMemo(() => collectJobEmailSelectableKeys(job), [job]);
  const [selected, setSelected] = useState<Set<EmailSelectKey>>(() => new Set(allKeys));
  const [contactId, setContactId] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [subject, setSubject] = useState(() => jobEmailDefaultSubject(job));
  const [introMessage, setIntroMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const validContacts = contactsForJobs(contacts);
  const useManual = contactId === "__manual__";
  const selectedContact = validContacts.find((c) => c.id === contactId) || null;
  const recipientEmail = useManual ? manualEmail.trim() : (selectedContact?.email.trim() || "");

  const toggleKey = (key: EmailSelectKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allKeys));
  const selectNone = () => setSelected(new Set());

  const selectionCount = selected.size;
  const canSend = recipientEmail.length > 0 && selectionCount > 0 && !sending;

  const handleSend = async () => {
    setError("");
    if (!recipientEmail) {
      setError("Wybierz odbiorcę lub wpisz adres email.");
      return;
    }
    if (selectionCount === 0) {
      setError("Zaznacz co najmniej jedną pozycję do wysłania.");
      return;
    }

    const payload = buildJobEmailPayload(
      job,
      selected,
      recipientEmail,
      selectedContact?.name || "",
      subject,
      introMessage,
    );

    const hasContent = payload.photos.length > 0 || payload.reportSections.some(
      (s) => (s.workItems?.length || 0) > 0 || (s.rooms?.length || 0) > 0 || s.sketch || s.generalNote,
    );
    if (!hasContent) {
      setError("Wybrane pozycje nie zawierają treści — zaznacz coś innego.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/send-job-email`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Błąd wysyłki (${res.status})`);
      }
      setSuccess(true);
      onSent?.(recipientEmail);
      setTimeout(onClose, 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się wysłać emaila.");
    } finally {
      setSending(false);
    }
  };

  if (allKeys.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
        <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Wyślij email z roboty</p>
              <p className="text-xs text-muted-foreground mt-1">Na tej robocie nie ma jeszcze zdjęć ani raportów do wysłania.</p>
            </div>
            <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"><X size={16}/></button>
          </div>
          <button type="button" onClick={onClose} className="w-full py-2.5 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors">Zamknij</button>
        </div>
      </div>
    );
  }

  const reports = jobWorkerReports(job);
  const photos = (job.photos || []).filter((p) => p.status !== "rejected" && p.publicUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="bg-card rounded-t-2xl sm:rounded-2xl border border-border w-full max-w-lg shadow-2xl max-h-[92dvh] flex flex-col">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <p className="text-sm font-semibold flex items-center gap-2"><Mail size={15} className="text-primary"/>Wyślij email</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{job.address || "Robota"}{job.flatNumber && ` m.${job.flatNumber}`}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X size={16}/></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 size={40} className="text-green-400"/>
              <p className="text-sm font-semibold">Wysłano na {recipientEmail}</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground block">Odbiorca (kontakty z uprawnieniem Roboty)</label>
                {validContacts.length === 0 ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-xs text-yellow-400/90">
                    Brak kontaktów z uprawnieniem „Roboty”.{" "}
                    <button type="button" onClick={onManageContacts} className="underline font-medium hover:text-yellow-300">Dodaj w Kontaktach</button>
                  </div>
                ) : (
                  <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none">
                    <option value="">— Wybierz z listy —</option>
                    {validContacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name || c.email}{c.company ? ` (${c.company})` : ""} — {c.email}</option>
                    ))}
                    <option value="__manual__">Inny adres…</option>
                  </select>
                )}
                {(useManual || validContacts.length === 0) && (
                  <input type="email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="email@example.com" className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"/>
                )}
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Temat</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"/>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Wiadomość (opcjonalnie)</label>
                <textarea value={introMessage} onChange={(e) => setIntroMessage(e.target.value)} rows={2} placeholder="Krótka wiadomość na początku maila..." className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none resize-none"/>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Co wysłać</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={selectAll} className="text-[10px] text-primary hover:underline">Wszystko</button>
                    <span className="text-muted-foreground/30">·</span>
                    <button type="button" onClick={selectNone} className="text-[10px] text-muted-foreground hover:underline">Nic</button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">Zaznaczono: {selectionCount} z {allKeys.length}</p>

                {photos.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Camera size={12}/>Zdjęcia ({photos.length})</p>
                    <div className="space-y-2">
                      {photos.map((p) => {
                        const key = `p:${p.id}`;
                        return (
                          <label key={p.id} className={`flex items-center gap-3 p-2 rounded-xl border cursor-pointer transition-colors ${selected.has(key) ? "border-primary/40 bg-primary/5" : "border-border hover:bg-secondary/40"}`}>
                            <input type="checkbox" checked={selected.has(key)} onChange={() => toggleKey(key)} className="shrink-0 accent-primary"/>
                            <img src={p.publicUrl} alt="" className="w-12 h-12 rounded-lg object-cover bg-secondary shrink-0"/>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium">{PHOTO_LABEL_NAMES[p.label]}</p>
                              {p.caption && <p className="text-[10px] text-muted-foreground truncate">{p.caption}</p>}
                              <p className="text-[10px] text-muted-foreground">{p.uploadedBy} · {fmtDate(p.uploadedAt.slice(0, 10))}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {reports.map((report) => {
                  const reportKeys = allKeys.filter((k) => k.includes(`:${report.id}`) || k.endsWith(`:${report.id}`));
                  if (reportKeys.length === 0) return null;
                  let pokojIdx = 0;
                  return (
                    <div key={report.id} className="mb-4 border border-border rounded-xl overflow-hidden">
                      <div className="px-3 py-2 bg-secondary/40 border-b border-border">
                        <p className="text-xs font-semibold">{report.workerName}</p>
                        <p className="text-[10px] text-muted-foreground">{fmtDate(report.submittedAt.slice(0, 10))}</p>
                      </div>
                      <div className="p-2 space-y-1">
                        {reportHasWorkScope(report) && (
                          <label className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer ${selected.has(`ws:${report.id}`) ? "bg-violet-500/10" : "hover:bg-secondary/30"}`}>
                            <input type="checkbox" checked={selected.has(`ws:${report.id}`)} onChange={() => toggleKey(`ws:${report.id}`)} className="mt-0.5 shrink-0 accent-primary"/>
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Zakres wykonanych prac</p>
                              <p className="text-xs line-clamp-4 whitespace-pre-wrap">{getReportWorkScopeText(report)}</p>
                            </div>
                          </label>
                        )}
                        {!reportHasWorkScope(report) && report.workItems.filter(workItemHasContent).map((item) => {
                          const key = `wi:${report.id}:${item.id}`;
                          return (
                            <label key={item.id} className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer ${selected.has(key) ? "bg-violet-500/10" : "hover:bg-secondary/30"}`}>
                              <input type="checkbox" checked={selected.has(key)} onChange={() => toggleKey(key)} className="mt-0.5 shrink-0 accent-primary"/>
                              <div className="min-w-0">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Zakres</p>
                                <p className="text-xs">{item.text}</p>
                                {item.note && <p className="text-[10px] text-muted-foreground italic">{item.note}</p>}
                              </div>
                            </label>
                          );
                        })}
                        {report.generalNote?.trim() && (
                          <label className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer ${selected.has(`gn:${report.id}`) ? "bg-violet-500/10" : "hover:bg-secondary/30"}`}>
                            <input type="checkbox" checked={selected.has(`gn:${report.id}`)} onChange={() => toggleKey(`gn:${report.id}`)} className="mt-0.5 shrink-0 accent-primary"/>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Wiadomość</p>
                              <p className="text-xs line-clamp-2">{report.generalNote}</p>
                            </div>
                          </label>
                        )}
                        {report.rooms.filter(roomHasContent).map((room) => {
                          const idx = room.roomType === "pokoj" ? pokojIdx++ : 0;
                          const key = `rm:${report.id}:${room.id}`;
                          return (
                            <label key={room.id} className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer ${selected.has(key) ? "bg-violet-500/10" : "hover:bg-secondary/30"}`}>
                              <input type="checkbox" checked={selected.has(key)} onChange={() => toggleKey(key)} className="mt-0.5 shrink-0 accent-primary"/>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Wymiary — {roomDisplayName(room, idx)}</p>
                                <p className="text-xs font-mono">{room.length || "—"} × {room.width || "—"} × {room.height || "—"} m</p>
                              </div>
                            </label>
                          );
                        })}
                        {report.sketch?.publicUrl && (
                          <label className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer ${selected.has(`sk:${report.id}`) ? "bg-violet-500/10" : "hover:bg-secondary/30"}`}>
                            <input type="checkbox" checked={selected.has(`sk:${report.id}`)} onChange={() => toggleKey(`sk:${report.id}`)} className="mt-0.5 shrink-0 accent-primary"/>
                            <div className="flex items-center gap-2">
                              <img src={report.sketch.publicUrl} alt="" className="w-10 h-10 rounded object-cover bg-secondary"/>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rysunek z wymiarami</p>
                                {report.sketchNote && <p className="text-[10px] text-muted-foreground italic">{report.sketchNote}</p>}
                              </div>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5"/>
                  <span>{error}</span>
                </div>
              )}
            </>
          )}
        </div>

        {!success && (
          <div className="px-5 py-4 border-t border-border flex gap-2 shrink-0" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors">Anuluj</button>
            <button type="button" onClick={handleSend} disabled={!canSend} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {sending ? <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"/>Wysyłanie…</> : <><Send size={14}/>Wyślij</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Jobs View ────────────────────────────────────────────────────────────────

function JobsView({
  jobs,
  setJobs,
  directory,
  contacts,
  onManageContacts,
  initialJobId,
  onInitialJobConsumed,
  weekEmployees,
  weekFrom,
  onGoToInspector,
}: {
  jobs: Job[];
  setJobs: (v: Job[] | ((p: Job[]) => Job[])) => void;
  directory: DirectoryEmployee[];
  contacts: EmailContact[];
  onManageContacts: () => void;
  initialJobId?: string | null;
  onInitialJobConsumed?: () => void;
  weekEmployees: WeekEmployee[];
  weekFrom: string;
  onGoToInspector?: (jobId?: string) => void;
}) {
  const { canViewRates, session: adminSession } = useAdminAccess();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "in_progress" | "completed">("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmListId, setDeleteConfirmListId] = useState<string | null>(null);
  const [workerFilter, setWorkerFilter] = useState<string>("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [packBusy, setPackBusy] = useState(false);

  // Work entry add form state
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [entryDirId, setEntryDirId] = useState("");
  const [entryDate, setEntryDate] = useState(localIsoDate());
  const [entryHours, setEntryHours] = useState(String(DEFAULT_JOB_ENTRY_HOURS));
  const [entryRate, setEntryRate] = useState("");

  const [statusWarning, setStatusWarning] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedWorkerKeys, setExpandedWorkerKeys] = useState<Set<string>>(new Set());
  const jobNotesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!initialJobId) return;
    if (jobs.some((j) => j.id === initialJobId)) {
      setSelectedJobId(initialJobId);
    }
    onInitialJobConsumed?.();
  }, [initialJobId, jobs, onInitialJobConsumed]);

  const selectedJob = jobs.find(j=>j.id===selectedJobId)||null;
  const todayIso = localIsoDate();

  const yesterdayEntriesToCopy = useMemo(
    () => (selectedJob ? collectEntriesFromYesterday(selectedJob, todayIso, weekEmployees, weekFrom, directory) : []),
    [selectedJob, todayIso, weekEmployees, weekFrom, directory],
  );

  const payrollEntriesForToday = useMemo(
    () => (selectedJob ? workEntriesFromPayrollForDate(selectedJob, weekEmployees, weekFrom, todayIso) : []),
    [selectedJob, weekEmployees, weekFrom, todayIso],
  );

  const workerGroups = useMemo(
    () => groupWorkEntriesByEmployee(selectedJob?.workEntries ?? []),
    [selectedJob?.workEntries],
  );

  const duplicateJobAddressKeys = useMemo(() => {
    const counts = new Map<string, number>();
    for (const j of jobs) {
      const key = jobAddressKey(j);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k));
  }, [jobs]);

  const isDuplicateJob = (job: Job) => duplicateJobAddressKeys.has(jobAddressKey(job));

  useEffect(() => {
    setExpandedWorkerKeys(new Set());
  }, [selectedJobId]);

  const markedReportsForJobRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedJobId) {
      markedReportsForJobRef.current = null;
      return;
    }
    if (markedReportsForJobRef.current === selectedJobId) return;
    setJobs((prev) => {
      const job = prev.find((j) => j.id === selectedJobId);
      if (!job) return prev;
      const unreviewed = jobWorkerReports(job).filter(reportNeedsAdminAttention);
      if (unreviewed.length === 0) {
        markedReportsForJobRef.current = selectedJobId;
        return prev;
      }
      markedReportsForJobRef.current = selectedJobId;
      const now = new Date().toISOString();
      return prev.map((j) =>
        j.id !== selectedJobId
          ? j
          : {
              ...j,
              workerReports: jobWorkerReports(j).map((r) =>
                reportNeedsAdminAttention(r) ? { ...r, adminReviewedAt: now } : r,
              ),
            },
      );
    });
  }, [selectedJobId, setJobs]);

  const toggleWorkerGroup = (key: string) => {
    setExpandedWorkerKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const docsCount = (job: Job) => DOCUMENT_TYPES.filter(d=>job.documents[d]).length;
  const allDocsDone = (job: Job) => REQUIRED_DOCS.every(d=>job.documents[d]);

  const updateJob = (updated: Job, activity?: { type: JobActivityType; text: string; actor?: string }) => {
    let next = activity
      ? appendJobActivity(updated, activity.type, activity.text, activity.actor || "Administrator")
      : updated;

    if (isWmClient(next.client)) {
      next = normalizeJobWmFields(next);
      setJobs((prev) => prev.map((j) => (j.id === next.id ? next : j)));
      return;
    }

    const wasAllDone = allDocsDone(next);
    const withStatus = wasAllDone && next.status === "in_progress"
      ? appendJobActivity({ ...next, status: "completed" as const }, "status_change", "Automatycznie oznaczono jako zdane (komplet dokumentów)", "System")
      : next;
    setJobs((prev) => prev.map((j) => (j.id === withStatus.id ? withStatus : j)));
  };

  const tryToggleStatus = (job: Job) => {
    if (isWmClient(job.client)) {
      setStatusWarning(true);
      setTimeout(() => setStatusWarning(false), 4000);
      return;
    }
    if (job.status === "in_progress" && (!allDocsDone(job) || !isJobHousingSet(job))) {
      setStatusWarning(true);
      setTimeout(() => setStatusWarning(false), 4000);
      return;
    }
    setStatusWarning(false);
    const nextStatus = job.status === "in_progress" ? "completed" as const : "in_progress" as const;
    updateJob(
      { ...job, status: nextStatus },
      { type: "status_change", text: nextStatus === "completed" ? "Oznaczono jako zdane" : "Przywrócono status „w trakcie”" },
    );
  };

  const addJob = () => {
    const j = defaultJob();
    setJobs(prev=>[j,...prev]);
    setSelectedJobId(j.id);
  };

  const deleteJob = (id: string) => {
    const deletedIds = addDeletedJobId(id);
    setJobs((prev) => {
      const updated = prev.filter((j) => j.id !== id);
      pushJobsAfterDelete(updated, deletedIds).catch(() => {});
      return updated;
    });
    if (selectedJobId === id) setSelectedJobId(null);
    setDeleteConfirmId(null);
    setDeleteConfirmListId(null);
  };

  const exportJobPDF = async (job: Job) => {
    const pdfMake = await loadPdfMake();
    const C2 = { navy:"#344254", red:"#C0392B", light:"#EDF1F6", white:"#FFFFFF", muted:"#8A9BB0" };
    const title = `${job.address||"Bez adresu"}${job.flatNumber?` m.${job.flatNumber}`:""}`;
    const docsChecked = DOCUMENT_TYPES.filter(d=>job.documents[d]);
    const workerRows = job.workEntries.map(e=> canViewRates
      ? [
          {text:fmtDate(e.date),fontSize:9,color:C2.muted},{text:e.employeeName||"—",fontSize:9},
          {text:fmtH(e.hours),fontSize:9,alignment:"right"},{text:`${fmt(e.rate)} PLN/h`,fontSize:9,color:C2.muted,alignment:"right"},
          {text:`${fmt(e.hours*e.rate)} PLN`,fontSize:9,bold:true,alignment:"right",color:C2.red},
        ]
      : [
          {text:fmtDate(e.date),fontSize:9,color:C2.muted},{text:e.employeeName||"—",fontSize:9},
          {text:fmtH(e.hours),fontSize:9,alignment:"right"},
          {text:`${fmt(e.hours*e.rate)} PLN`,fontSize:9,bold:true,alignment:"right",color:C2.red},
        ]
    );
    const matRows = (job.materials||[]).map(m=>[
      {text:m.description||"—",fontSize:9},{text:fmtDate(m.date),fontSize:9,color:C2.muted,alignment:"right"},
      {text:`${fmt(m.cost)} PLN`,fontSize:9,bold:true,alignment:"right",color:C2.red},
    ]);
    const dd: PdfDocDef = {
      pageSize:"A4", pageOrientation:"portrait",
      pageMargins:[40,60,40,60],
      defaultStyle:{font:"Roboto",fontSize:10,lineHeight:1.3},
      content:[
        {canvas:[{type:"rect",x:0,y:0,w:515,h:50,color:C2.navy}]},
        {text:"W&G DOM", fontSize:22, bold:true, color:C2.white, absolutePosition:{x:40,y:20}},
        {text:"Karta Roboty", fontSize:11, color:C2.red, absolutePosition:{x:40,y:46}},
        {text:`Wygenerowano: ${new Date().toLocaleDateString("pl-PL")}`, fontSize:8, color:C2.muted, absolutePosition:{x:350,y:52}},
        {text:" ", fontSize:6, margin:[0,20,0,0]},
        // Job header
        {text:title, fontSize:18, bold:true, color:C2.navy, margin:[0,8,0,2]},
        {text:job.client||"—", fontSize:11, color:C2.muted, margin:[0,0,0,10]},
        {
          columns:[
            {stack:[
              {text:"Data rozpoczęcia", fontSize:8, color:C2.muted},
              {text:fmtDate(job.startDate)||"—", fontSize:10, bold:true, color:C2.navy},
            ]},
            {stack:[
              {text:"Data zakończenia", fontSize:8, color:C2.muted},
              {text:fmtDate(job.endDate)||"—", fontSize:10, bold:true, color:C2.navy},
            ]},
            {stack:[
              {text:"Status", fontSize:8, color:C2.muted},
              {text:job.status==="completed"?"Zdane":"W trakcie", fontSize:10, bold:true, color:job.status==="completed"?"#1E7E34":C2.red},
            ]},
            {stack:[
              {text:"Klucze", fontSize:8, color:C2.muted},
              {text:job.keysHandedOver?"Zdane":"Nie zdane", fontSize:10, bold:true, color:job.keysHandedOver?"#1E7E34":C2.muted},
            ]},
            {stack:[
              {text:"Lokal", fontSize:8, color:C2.muted},
              {text:isJobHousingSet(job)?HOUSING_TYPE_LABELS[job.housingType]:"—", fontSize:10, bold:true, color:C2.navy},
            ]},
            {stack:[
              {text:"Kuchenka", fontSize:8, color:C2.muted},
              {text:job.stoveType?STOVE_TYPE_LABELS_FULL[job.stoveType]:"—", fontSize:10, bold:true, color:C2.navy},
            ]},
          ],
          margin:[0,0,0,14],
        },
        // Documents
        {text:"DOKUMENTY DO ODBIORU", fontSize:8, bold:true, color:C2.muted, margin:[0,0,0,6]},
        {
          columns: DOCUMENT_TYPES.map(d=>({
            stack:[
              {canvas:[{type:"rect",x:0,y:0,w:55,h:32,color:job.documents[d]?"#D4EFDF":"#F8F9FB",r:4}]},
              {text:DOC_LABELS[d], fontSize:7, color:job.documents[d]?"#1E7E34":C2.muted, absolutePosition:{x:0,y:0}, margin:[4,10,4,0], alignment:"center"},
            ],
            width:"auto",margin:[0,0,6,0],
          })),
          columnGap:0,
          margin:[0,0,0,16],
        },
        // Workers
        ...(job.workEntries.length>0 ? [
          {text:"CZAS PRACY PRACOWNIKÓW", fontSize:8, bold:true, color:C2.muted, margin:[0,0,0,4]},
          {
            table:{
              headerRows:1,
              widths: canViewRates ? ["auto","*","auto","auto","auto"] : ["auto","*","auto","auto"],
              body:[
                canViewRates
                  ? [{text:"Data",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8},{text:"Pracownik",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8},{text:"Godz.",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8,alignment:"right"},{text:"Stawka",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8,alignment:"right"},{text:"Koszt",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8,alignment:"right"}]
                  : [{text:"Data",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8},{text:"Pracownik",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8},{text:"Godz.",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8,alignment:"right"},{text:"Koszt",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8,alignment:"right"}],
                ...workerRows,
                canViewRates
                  ? [{text:"Suma",bold:true,fillColor:C2.light,colSpan:2,fontSize:9},{},
                     {text:fmtH(jobTotalHours(job)),bold:true,fillColor:C2.light,alignment:"right",fontSize:9},
                     {text:"",fillColor:C2.light},
                     {text:`${fmt(jobCost(job))} PLN`,bold:true,fillColor:C2.light,color:C2.red,alignment:"right",fontSize:9}]
                  : [{text:"Suma",bold:true,fillColor:C2.light,colSpan:2,fontSize:9},{},
                     {text:fmtH(jobTotalHours(job)),bold:true,fillColor:C2.light,alignment:"right",fontSize:9},
                     {text:`${fmt(jobCost(job))} PLN`,bold:true,fillColor:C2.light,color:C2.red,alignment:"right",fontSize:9}],
              ],
            },
            layout:{hLineColor:()=>"#E5E7EB",vLineColor:()=>"#E5E7EB"},
            margin:[0,0,0,12],
          },
        ] : []),
        // Materials
        ...(matRows.length>0 ? [
          {text:"MATERIAŁY", fontSize:8, bold:true, color:C2.muted, margin:[0,0,0,4]},
          {
            table:{
              headerRows:1,
              widths:["*","auto","auto"],
              body:[
                [{text:"Opis",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8},{text:"Data",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8,alignment:"right"},{text:"Koszt",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8,alignment:"right"}],
                ...matRows,
                [{text:"Suma materiałów",bold:true,fillColor:C2.light,colSpan:2,fontSize:9},{},{text:`${fmt(jobMaterialsCost(job))} PLN`,bold:true,fillColor:C2.light,color:C2.red,alignment:"right",fontSize:9}],
              ],
            },
            layout:{hLineColor:()=>"#E5E7EB",vLineColor:()=>"#E5E7EB"},
            margin:[0,0,0,12],
          },
        ] : []),
        // Total
        ...((job.workEntries.length>0||(job.materials||[]).length>0) ? [
          {canvas:[{type:"rect",x:0,y:0,w:515,h:40,color:C2.navy}]},
          {columns:[
            {text:"ŁĄCZNY KOSZT REMONTU", fontSize:9, bold:true, color:C2.white, margin:[0,12,0,0]},
            {text:`${fmt(jobTotalCost(job))} PLN`, fontSize:18, bold:true, color:C2.red, alignment:"right", margin:[0,6,0,0]},
          ], absolutePosition:{x:40,y:-40+2}},
          {text:" ", fontSize:6, margin:[0,24,0,0]},
        ] : []),
        // Notes
        ...(job.notes ? [
          {text:"NOTATKI", fontSize:8, bold:true, color:C2.muted, margin:[0,8,0,4]},
          {text:job.notes, fontSize:9, color:C2.navy, margin:[0,0,0,0]},
        ] : []),
      ],
    };
    pdfMake.createPdf(dd).download(`robota-${(job.address||"bez-adresu").replace(/\s+/g,"-").toLowerCase()}.pdf`);
  };

  // Filter + search
  const filtered = jobs.filter(j=>{
    if(filter==="in_progress"&&j.status!=="in_progress") return false;
    if(filter==="completed"&&j.status!=="completed") return false;
    if(workerFilter && !j.workEntries.some(e=>e.directoryId===workerFilter)) return false;
    const q = search.toLowerCase();
    return !q || j.address.toLowerCase().includes(q) || j.client.toLowerCase().includes(q) || j.flatNumber.toLowerCase().includes(q);
  });

  // Group by month of startDate
  const grouped = useMemo(()=>{
    const map = new Map<string, Job[]>();
    filtered.forEach(j=>{
      const d = new Date(j.startDate);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,"0")}`;
      if(!map.has(key)) map.set(key,[]);
      map.get(key)!.push(j);
    });
    // Sort groups newest first
    return Array.from(map.entries()).sort((a,b)=>b[0].localeCompare(a[0]));
  },[filtered]);

  const groupLabel = (key: string) => {
    const [y,m] = key.split("-");
    return `${MONTH_NAMES[parseInt(m)]} ${y}`;
  };

  // Work entry form helpers
  const selectedDirEmp = directory.find(d=>d.id===entryDirId)||null;

  const handleAddEntry = () => {
    if(!selectedJob||!entryDirId||!entryDate||!entryHours) return;
    const emp = directory.find(d=>d.id===entryDirId);
    const weekEmp = weekEmployees.find((e) => e.directoryId === entryDirId);
    const entry: WorkEntry = {
      id: crypto.randomUUID(),
      directoryId: entryDirId,
      employeeName: emp?.name||"—",
      date: entryDate,
      hours: parseFloat(entryHours)||0,
      rate: parseFloat(entryRate) || parseFloat(weekEmp?.rate || "") || parseFloat(emp?.defaultRate||"0")||0,
      notes: "",
    };
    updateJob(
      {...selectedJob, workEntries:[...selectedJob.workEntries,entry]},
      { type: "work_entry", text: `${entry.employeeName} — ${fmtDate(entry.date)}, ${fmtH(entry.hours)}` },
    );
    setShowAddEntry(false);
    setEntryDirId("");
    setEntryHours(String(DEFAULT_JOB_ENTRY_HOURS));
    setEntryRate("");
  };

  const appendWorkEntries = (newEntries: WorkEntry[], label: string) => {
    if (!selectedJob || newEntries.length === 0) return;
    updateJob(
      { ...selectedJob, workEntries: [...selectedJob.workEntries, ...newEntries] },
      { type: "work_entry", text: label },
    );
  };

  const copyYesterdayToToday = () => {
    appendWorkEntries(
      yesterdayEntriesToCopy,
      `Skopiowano wczoraj → dziś (${yesterdayEntriesToCopy.length} os.)`,
    );
  };

  const fillTodayFromPayroll = () => {
    appendWorkEntries(
      payrollEntriesForToday,
      `Z listy płac na dziś (${payrollEntriesForToday.length} os.)`,
    );
  };

  const syncEntryHoursFromPayroll = (dirId: string, dateIso: string) => {
    const dirEmp = directory.find((d) => d.id === dirId);
    const weekEmp = weekEmployees.find((e) => e.directoryId === dirId);
    if (dirEmp?.multiSiteDaily) {
      setEntryHours(String(DEFAULT_MULTI_SITE_VISIT_HOURS));
      if (weekEmp?.rate) setEntryRate(weekEmp.rate);
      else if (dirEmp.defaultRate) setEntryRate(dirEmp.defaultRate);
      return;
    }
    const payH = payrollHoursForDirectoryOnDate(dirId, dateIso, weekEmployees, weekFrom);
    if (payH > 0) {
      setEntryHours(String(payH));
      if (weekEmp?.rate) setEntryRate(weekEmp.rate);
      else if (dirEmp?.defaultRate) setEntryRate(dirEmp.defaultRate);
    } else {
      setEntryHours(String(DEFAULT_JOB_ENTRY_HOURS));
    }
    if (weekEmp?.rate) setEntryRate(weekEmp.rate);
    else if (dirEmp?.defaultRate) setEntryRate(dirEmp.defaultRate);
  };

  const copyEntryToToday = (entry: WorkEntry) => {
    if (!selectedJob) return;
    if (selectedJob.workEntries.some(
      (e) => e.date === todayIso && (e.directoryId === entry.directoryId || e.employeeName === entry.employeeName),
    )) return;
    appendWorkEntries(
      [duplicateWorkEntryWithPayrollHours(entry, todayIso, weekEmployees, weekFrom, directory)],
      `${entry.employeeName} skopiowany na ${fmtDate(todayIso)}`,
    );
  };

  const openAddEntry = () => {
    setEntryDirId("");
    setEntryDate(todayIso);
    setEntryHours(String(DEFAULT_JOB_ENTRY_HOURS));
    setEntryRate("");
    setShowAddEntry(true);
  };

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left panel — job list */}
      <div className={`flex flex-col border-r border-border bg-card shrink-0 overflow-hidden transition-all duration-300 ${selectedJob?"hidden sm:flex sm:w-72 lg:w-80":"flex w-full sm:w-72 lg:w-80"}`}>
        {/* Top */}
        <div className="px-4 pt-4 pb-3 space-y-3 border-b border-border">
          <button onClick={addJob} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={14}/>Nowa robota
          </button>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
            <input type="text" placeholder="Szukaj adresu, klienta..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full bg-secondary rounded-lg pl-8 pr-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none"/>
          </div>
          <div className="flex gap-1">
            {(["all","in_progress","completed"] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)} className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${filter===f?"bg-secondary text-foreground border border-primary/30":"text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}>
                {f==="all"?"Wszystkie":f==="in_progress"?"W trakcie":"Zdane"}
              </button>
            ))}
          </div>
          {filterProductionActiveDirectory(directory).length>0&&(
            <select value={workerFilter} onChange={e=>setWorkerFilter(e.target.value)}
              className="w-full bg-secondary rounded-lg px-3 py-2 text-xs border border-transparent focus:border-primary focus:outline-none text-muted-foreground">
              <option value="">Wszyscy pracownicy</option>
              {filterProductionActiveDirectory(directory).map(d=>(
                <option key={d.id} value={d.id}>{d.name}{d.position?` — ${d.position}`:""}</option>
              ))}
            </select>
          )}
        </div>

        {/* Job list */}
        <div className="flex-1 overflow-y-auto">
          {jobs.length===0&&(
            <div className="p-8 text-center space-y-2 text-muted-foreground">
              <MapPin size={32} className="mx-auto opacity-20"/>
              <p className="text-sm">Brak robót. Kliknij "Nowa robota".</p>
            </div>
          )}
          {grouped.map(([key,groupJobs])=>(
            <div key={key}>
              <div className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground bg-background/50 border-b border-border sticky top-0">
                {groupLabel(key)}
              </div>
              {groupJobs.map(job=>{
                const docsCount = DOCUMENT_TYPES.filter(d=>job.documents[d]).length;
                const cost = jobCost(job);
                const isSelected = job.id===selectedJobId;
                const isDupe = isDuplicateJob(job);
                const workerCount = new Set(job.workEntries.map((e) => e.directoryId || e.employeeName)).size;
                return (
                  <div key={job.id} className={`flex items-stretch border-b border-border transition-colors ${isSelected?"bg-primary/8 border-l-2 border-l-primary":""} ${isDupe?"bg-amber-500/5":""}`}>
                    <button onClick={()=>setSelectedJobId(job.id)} className={`flex-1 min-w-0 text-left px-4 py-3.5 hover:bg-secondary/40 transition-colors ${isSelected?"":"hover:bg-secondary/40"}`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate leading-tight">{job.address||<span className="italic text-muted-foreground">Bez adresu</span>}{job.flatNumber&&<span className="text-muted-foreground"> m.{job.flatNumber}</span>}</p>
                          <p className="text-xs text-muted-foreground truncate">{job.client||"—"}</p>
                          <JobMetaBadges job={job}/>
                          {(isDupe || job.workEntries.length > 0) && (
                            <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                              {isDupe && <span className="text-amber-600 dark:text-amber-400 font-medium">Duplikat adresu · </span>}
                              {job.workEntries.length > 0 && `${workerCount} os. · ${fmtH(jobTotalHours(job))}`}
                              {job.workEntries.length === 0 && isDupe && "brak wpisów — kandydat do usunięcia"}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {job.keysHandedOver && <span title="Klucze zdane"><KeyRound size={12} className="text-blue-400"/></span>}
                          {jobWorkerReports(job).length > 0 && (
                            <span title="Raporty pracowników" className="text-[10px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full font-medium">
                              {jobWorkerReports(job).length} rap.
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${job.status==="completed"?"bg-green-500/15 text-green-400":"bg-yellow-500/10 text-yellow-400"}`}>
                            {job.status==="completed"?"Zdane":"W trakcie"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <div className="flex-1 bg-border rounded-full h-1 overflow-hidden">
                            <div className="bg-primary h-1 rounded-full transition-all" style={{width:`${(docsCount/REQUIRED_DOCS.length)*100}%`}}/>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{docsCount}/{REQUIRED_DOCS.length}</span>
                        </div>
                        {cost>0&&<span className="text-xs font-semibold text-primary shrink-0" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(cost)} PLN</span>}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <JobWmStageBadge job={job}/>
                        <JobWmPlannedBadge job={job}/>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${job.documents.zlecenie ? "bg-green-500/15 text-green-400" : "bg-secondary text-muted-foreground"}`}>
                          <FileText size={9}/> Zlec. {job.documents.zlecenie ? "✓" : "—"}
                        </span>
                        <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${job.documents.kosztorys ? "bg-green-500/15 text-green-400" : "bg-secondary text-muted-foreground"}`}>
                          <ClipboardList size={9}/> Kosz. {job.documents.kosztorys ? "✓" : "—"}
                        </span>
                      </div>
                    </button>
                    <div className="flex items-center pr-2 shrink-0">
                      {deleteConfirmListId===job.id ? (
                        <div className="flex flex-col items-end gap-1 py-2" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] text-muted-foreground text-right leading-tight max-w-[72px]">Usunąć całą robotę?</span>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => deleteJob(job.id)} className="text-[10px] bg-destructive text-white px-2 py-1 rounded font-medium">Tak</button>
                            <button type="button" onClick={() => setDeleteConfirmListId(null)} className="text-[10px] text-muted-foreground px-1"><X size={12}/></button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmListId(job.id); setDeleteConfirmId(null); }}
                          title="Usuń całą robotę"
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={14}/>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {jobs.length>0&&filtered.length===0&&(
            <div className="p-8 text-center text-muted-foreground text-sm">Brak wyników.</div>
          )}
        </div>
      </div>

      {/* Right panel — job detail */}
      {selectedJob ? (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 space-y-6">

            {/* Back button (mobile) */}
            <button onClick={()=>setSelectedJobId(null)} className="sm:hidden flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
              <ChevronRight size={14} className="rotate-180"/>Powrót do listy
            </button>

            {/* Header */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Adres</label>
                      <input type="text" value={selectedJob.address} onChange={e=>updateJob({...selectedJob,address:e.target.value})} placeholder="ul. Przykładowa 12" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Nr mieszkania</label>
                      <input type="text" value={selectedJob.flatNumber} onChange={e=>updateJob({...selectedJob,flatNumber:e.target.value})} placeholder="np. 5A" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Klient / Zleceniodawca</label>
                      <input type="text" value={selectedJob.client} onChange={e=>updateJob({...selectedJob,client:e.target.value})} placeholder="np. Wrocławskie Mieszkania" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground block mb-1">Data rozpoczęcia</label>
                        <input type="date" value={selectedJob.startDate} onChange={e=>updateJob({...selectedJob,startDate:e.target.value})} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors" style={{fontFamily:"'JetBrains Mono', monospace"}}/>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground block mb-1">Data zakończenia</label>
                        <input type="date" value={selectedJob.endDate} onChange={e=>updateJob({...selectedJob,endDate:e.target.value})} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors" style={{fontFamily:"'JetBrains Mono', monospace"}}/>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <JobMetaPickers
                        housingType={selectedJob.housingType}
                        stoveType={selectedJob.stoveType}
                        onHousingChange={(v) => updateJob({ ...selectedJob, housingType: v })}
                        onStoveChange={(v) => updateJob({ ...selectedJob, stoveType: v })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status row */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  {isWmClient(selectedJob.client) ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <JobWmStageBadge job={selectedJob}/>
                      {selectedJob.plannedHandoverDate && <JobWmPlannedBadge job={selectedJob}/>}
                      <span className="text-xs text-muted-foreground">
                        Status WM ustawiasz w sekcji <strong className="text-foreground/80">Odbiór WM</strong> poniżej
                      </span>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={()=>tryToggleStatus(selectedJob)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${selectedJob.status==="completed"?"bg-green-500/15 text-green-400 border-green-500/20 hover:bg-green-500/25":"bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20"}`}>
                        {selectedJob.status==="completed"?<><CheckCircle2 size={13}/>Zdane</>:<><Circle size={13}/>W trakcie</>}
                      </button>
                      <button
                        onClick={()=>updateJob({...selectedJob, keysHandedOver:!selectedJob.keysHandedOver})}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${selectedJob.keysHandedOver?"bg-blue-500/15 text-blue-400 border-blue-500/20 hover:bg-blue-500/25":"bg-secondary text-muted-foreground border-border hover:text-foreground hover:bg-secondary/70"}`}>
                        {selectedJob.keysHandedOver?<><CheckCircle2 size={13}/>Klucze zdane</>:<><Circle size={13}/>Klucze</>}
                      </button>
                    </>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock size={13}/>
                    <span>Czas remontu: <span className="font-semibold text-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{jobDuration(selectedJob)} dni</span></span>
                  </div>
                  {!isWmClient(selectedJob.client) && !allDocsDone(selectedJob) && selectedJob.status === "in_progress" && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      Brakuje <span className="font-semibold text-yellow-400">{REQUIRED_DOCS.filter(d=>!selectedJob.documents[d]).length}</span> z {REQUIRED_DOCS.length} wymaganych dokumentów
                    </span>
                  )}
                  {!isWmClient(selectedJob.client) && allDocsDone(selectedJob) && selectedJob.status === "in_progress" && (
                    <span className="text-xs text-green-400 ml-auto flex items-center gap-1">
                      <CheckCircle2 size={11}/>Wszystkie dokumenty skompletowane — można zdać
                    </span>
                  )}
                  {isWmClient(selectedJob.client) && allDocsDone(selectedJob) && inferHandoverStage(selectedJob) !== "handed_over" && (
                    <span className="text-xs text-emerald-400 ml-auto flex items-center gap-1">
                      <CheckCircle2 size={11}/>Dokumenty kompletne — ustaw etap „Gotowa do odbioru WM”
                    </span>
                  )}
                </div>
                {statusWarning && isWmClient(selectedJob.client) && (
                  <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-4 py-2.5 text-sm text-amber-700 dark:text-amber-300">
                    <AlertTriangle size={14} className="shrink-0"/>
                    <span>Roboty WM — status zmieniasz w sekcji <strong>Odbiór WM</strong> (etap odbioru), nie przyciskiem „Zdane”.</span>
                  </div>
                )}
                {statusWarning && !isWmClient(selectedJob.client) && (
                  <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5 text-sm text-destructive">
                    <X size={14} className="shrink-0"/>
                    <span>
                      Nie można oznaczyć jako zdane —
                      {!isJobHousingSet(selectedJob) && <> wybierz <strong>typ lokalu</strong></>}
                      {!isJobHousingSet(selectedJob) && !allDocsDone(selectedJob) && " oraz"}
                      {!allDocsDone(selectedJob) && (
                        <> brakuje <strong>{REQUIRED_DOCS.filter(d=>!selectedJob.documents[d]).length}</strong> dokumentów:{" "}
                        {REQUIRED_DOCS.filter(d=>!selectedJob.documents[d]).map(d=>DOC_LABELS[d]).join(", ")}</>
                      )}
                      .
                    </span>
                  </div>
                )}
                {isDuplicateJob(selectedJob) && (
                  <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-4 py-2.5 text-sm">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5"/>
                    <div>
                      <p className="font-medium text-amber-700 dark:text-amber-300">Ten adres jest zdublowany</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Masz więcej niż jedną robotę pod tym samym adresem. Usuń pustą lub niepotrzebną kopię — kosz „Usuń robotę” u góry albo kosz na liście po lewej.
                      </p>
                    </div>
                  </div>
                )}
                {!allDocsDone(selectedJob) && selectedJob.status === "in_progress" && jobDaysSinceStart(selectedJob) >= 7 && (
                  <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-4 py-3 text-sm">
                    <Bell size={14} className="text-amber-400 shrink-0 mt-0.5"/>
                    <div>
                      <p className="font-medium text-amber-400">Przypomnienie — brakujące dokumenty</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Robota trwa już {jobDaysSinceStart(selectedJob)} dni. Brakuje:{" "}
                        {jobMissingRequiredDocs(selectedJob).map((d) => DOC_LABELS[d]).join(", ")}.
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 justify-end flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowHistory((v) => !v)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-secondary hover:bg-secondary/70 border border-border rounded-lg font-medium transition-colors"
                  >
                    <ScrollText size={12}/>{showHistory ? "Ukryj historię" : "Historia"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(true)}
                    disabled={collectJobEmailSelectableKeys(selectedJob).length === 0}
                    title={collectJobEmailSelectableKeys(selectedJob).length === 0 ? "Brak zdjęć ani raportów do wysłania" : "Wyślij wybrane materiały emailem"}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary/90 hover:bg-primary text-primary-foreground rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Mail size={12}/>Email
                  </button>
                  <button
                    type="button"
                    disabled={packBusy}
                    title="ZIP: zlecenie, kosztorys, zdjęcia, checklist dokumentów"
                    onClick={async () => {
                      setPackBusy(true);
                      try {
                        await downloadJobDocumentsPack(selectedJob);
                      } finally {
                        setPackBusy(false);
                      }
                    }}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <Package size={12}/>{packBusy ? "Pakowanie…" : "Pakiet ZIP"}
                  </button>
                  <button onClick={()=>exportJobPDF(selectedJob)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-destructive/80 hover:bg-destructive text-white rounded-lg font-medium transition-colors">
                    <FileDown size={12}/>PDF
                  </button>
                  {deleteConfirmId===selectedJob.id?(
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Usunąć całą robotę?</span>
                      <button onClick={()=>deleteJob(selectedJob.id)} className="text-xs bg-destructive text-white px-3 py-1.5 rounded-lg font-medium">Tak, usuń</button>
                      <button onClick={()=>setDeleteConfirmId(null)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg"><X size={12}/></button>
                    </div>
                  ):(
                    <button onClick={()=>{ setDeleteConfirmId(selectedJob.id); setDeleteConfirmListId(null); }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 text-destructive hover:bg-destructive/10 border border-destructive/30 rounded-lg font-medium transition-colors">
                      <Trash2 size={12}/>Usuń robotę
                    </button>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-xs text-muted-foreground flex-1">Notatki</label>
                  <VoiceNoteButton focusRef={jobNotesRef} onResult={text=>updateJob({...selectedJob,notes:(selectedJob.notes?selectedJob.notes+" ":"")+text})}/>
                </div>
                <textarea ref={jobNotesRef} value={selectedJob.notes} onChange={e=>updateJob({...selectedJob,notes:e.target.value})} placeholder="Uwagi, informacje dodatkowe..." rows={3} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors resize-none"/>
              </div>

              {/* Link podglądu dla klienta */}
              <div className="bg-secondary/30 rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Eye size={13} className="text-primary"/>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Podgląd dla klienta</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Klient zobaczy tylko zaakceptowane zdjęcia i raporty — bez kosztów ani notatek wewnętrznych.
                </p>
                {selectedJob.clientShare?.enabled ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={clientShareUrl(selectedJob.clientShare.token)}
                        className="flex-1 bg-background rounded-lg px-3 py-2 text-xs border border-border font-mono truncate"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(clientShareUrl(selectedJob.clientShare!.token)).catch(() => {});
                          setShareCopied(true);
                          setTimeout(() => setShareCopied(false), 2000);
                        }}
                        className="flex items-center gap-1.5 text-xs px-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium shrink-0"
                      >
                        <Copy size={12}/>{shareCopied ? "Skopiowano" : "Kopiuj"}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateJob(
                        { ...selectedJob, clientShare: { ...selectedJob.clientShare!, enabled: false } },
                        { type: "share_link", text: "Wyłączono link podglądu dla klienta" },
                      )}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Wyłącz link
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const token = selectedJob.clientShare?.token || clientShareToken();
                      updateJob(
                        {
                          ...selectedJob,
                          clientShare: {
                            token,
                            createdAt: selectedJob.clientShare?.createdAt || new Date().toISOString(),
                            enabled: true,
                          },
                        },
                        { type: "share_link", text: "Wygenerowano link podglądu dla klienta" },
                      );
                    }}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 bg-primary/90 hover:bg-primary text-primary-foreground rounded-lg font-medium"
                  >
                    <Eye size={12}/>Utwórz link podglądu
                  </button>
                )}
              </div>
            </div>

            {showHistory && (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center gap-2 flex-wrap">
                  <ScrollText size={13} className="text-muted-foreground"/>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Historia roboty</span>
                  <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
                    {(selectedJob.activityLog || []).filter((ev) => !isInspectorActivityType(ev.type)).length}
                  </span>
                  {(() => {
                    const inspectorCount = collectInspectorFeed([selectedJob]).length;
                    if (inspectorCount === 0 || !onGoToInspector) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => onGoToInspector(selectedJob.id)}
                        className="ml-auto text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <ClipboardCheck size={11}/>
                        {inspectorCount} zmian inspektora → zakładka Inspektor
                      </button>
                    );
                  })()}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-border">
                  {(selectedJob.activityLog || []).filter((ev) => !isInspectorActivityType(ev.type)).length === 0 ? (
                    <p className="px-5 py-8 text-sm text-muted-foreground text-center">Brak wpisów — aktywność pojawi się po zmianach na robocie.</p>
                  ) : (
                    (selectedJob.activityLog || []).filter((ev) => !isInspectorActivityType(ev.type)).map((ev) => (
                      <div key={ev.id} className="px-5 py-3 flex gap-3">
                        <div className="shrink-0 w-16 text-[10px] text-muted-foreground pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {new Date(ev.at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs">
                            <span className="text-primary font-medium">{ACTIVITY_LABELS[ev.type]}</span>
                            <span className="text-muted-foreground"> · {ev.actor}</span>
                          </p>
                          <p className="text-xs text-foreground/90 mt-0.5">{ev.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {selectedJob && isWmClient(selectedJob.client) && onGoToInspector && (
              <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                  <ClipboardCheck size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0"/>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Odbiór WM</span>
                  <JobWmStageBadge job={selectedJob}/>
                  <JobWmPlannedBadge job={selectedJob}/>
                  {(selectedJob.jobNotes || []).length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-500">
                      {(selectedJob.jobNotes || []).length} not.
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onGoToInspector(selectedJob.id)}
                  className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-600/90 font-medium"
                >
                  Szczegóły w Inspektorze
                  <ChevronRight size={12}/>
                </button>
              </div>
            )}

            {/* Documents card */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={13} className="text-muted-foreground"/>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Dokumenty do odbioru</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{REQUIRED_DOCS.filter(d=>selectedJob.documents[d]).length}</span>/{REQUIRED_DOCS.length} wymaganych
                </span>
              </div>
              <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DOCUMENT_TYPES.map(doc=>{
                  const checked = selectedJob.documents[doc];
                  const optional = doc === "zdjecia";
                  const inspectorFile = (doc === "zlecenie" || doc === "kosztorys")
                    ? latestJobFile(selectedJob, doc as InspectorJobFileKind)
                    : undefined;
                  return (
                    <button key={doc} onClick={()=>{
                      const next = !checked;
                      updateJob(
                        {...selectedJob,documents:{...selectedJob.documents,[doc]:next}},
                        { type: "document", text: `${next ? "Zaznaczono" : "Odznaczono"}: ${DOC_LABELS[doc]}` },
                      );
                    }}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${checked?"bg-green-500/10 border-green-500/20":optional?"bg-secondary border-dashed border-border hover:border-muted-foreground/30":"bg-secondary border-border hover:border-muted-foreground/30"}`}>
                      {checked
                        ? <CheckCircle2 size={15} className="text-green-400 shrink-0"/>
                        : <Circle size={15} className="text-muted-foreground/40 shrink-0"/>
                      }
                      <div className="min-w-0">
                        <span className={`text-xs font-medium leading-tight ${checked?"text-green-400":"text-muted-foreground"}`}>{DOC_LABELS[doc]}</span>
                        {optional&&<p className="text-[10px] text-muted-foreground/50 leading-none mt-0.5">opcjonalne</p>}
                        {inspectorFile && (
                          <p className="text-[10px] text-primary/80 leading-tight mt-0.5 truncate flex items-center gap-0.5" title={inspectorFile.filename}>
                            <FileText size={9} className="shrink-0"/>{inspectorFile.filename}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Workers & Cost card */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Users size={13} className="text-muted-foreground"/>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pracownicy na robocie</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {yesterdayEntriesToCopy.length > 0 && (
                    <button
                      type="button"
                      onClick={copyYesterdayToToday}
                      title="Skopiuj wszystkich z wczoraj na dziś (9 h / te same stawki)"
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-lg font-medium transition-colors"
                    >
                      <Copy size={11}/>Wczoraj → dziś ({yesterdayEntriesToCopy.length})
                    </button>
                  )}
                  {payrollEntriesForToday.length > 0 && (
                    <button
                      type="button"
                      onClick={fillTodayFromPayroll}
                      title="Dodaj pracowników zaznaczonych dziś w liście płac"
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 bg-secondary hover:bg-secondary/70 border border-border rounded-lg font-medium transition-colors"
                    >
                      <CalendarDays size={11}/>Z listy płac ({payrollEntriesForToday.length})
                    </button>
                  )}
                  <button onClick={openAddEntry} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-secondary hover:bg-secondary/70 border border-border rounded-lg font-medium transition-colors">
                    <Plus size={12}/>Dodaj wpis
                  </button>
                </div>
              </div>

              {/* Add entry form */}
              {showAddEntry&&(
                <div className="px-5 py-4 bg-secondary/40 border-b border-border space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nowy wpis pracy</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Pracownik</label>
                      <select value={entryDirId} onChange={e=>{
                        const id = e.target.value;
                        setEntryDirId(id);
                        const emp=directory.find(d=>d.id===id);
                        if(emp) setEntryRate(emp.defaultRate);
                        if(id) syncEntryHoursFromPayroll(id, entryDate);
                      }} className="w-full bg-background rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none transition-colors">
                        <option value="">Wybierz pracownika...</option>
                        {filterProductionActiveDirectory(directory).map(d=>(
                          <option key={d.id} value={d.id}>{d.name} — {d.position}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Data</label>
                      <input type="date" value={entryDate} onChange={e=>{
                        const d = e.target.value;
                        setEntryDate(d);
                        if(entryDirId) syncEntryHoursFromPayroll(entryDirId, d);
                      }} className="w-full bg-background rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none transition-colors" style={{fontFamily:"'JetBrains Mono', monospace"}}/>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">
                        Godziny{" "}
                        <span className="text-muted-foreground/70">
                          {selectedDirEmp?.multiSiteDaily
                            ? "(na tej robocie, nie cały dzień)"
                            : "(domyślnie 9 h lub z listy płac)"}
                        </span>
                      </label>
                      <input type="number" min="0.5" step="0.5" value={entryHours} onChange={e=>setEntryHours(e.target.value)} className="w-full bg-background rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none transition-colors" style={{fontFamily:"'JetBrains Mono', monospace"}}/>
                    </div>
                    {canViewRates && (
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Stawka (PLN/h)</label>
                      <input type="number" min="0" step="0.5" value={entryRate} onChange={e=>setEntryRate(e.target.value)} placeholder={selectedDirEmp?.defaultRate||"0"} className="w-full bg-background rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none transition-colors" style={{fontFamily:"'JetBrains Mono', monospace"}}/>
                    </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleAddEntry} disabled={!entryDirId||!entryHours} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      <Check size={13}/>Dodaj
                    </button>
                    <button onClick={()=>setShowAddEntry(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Anuluj</button>
                    {canViewRates && entryDirId&&entryHours&&entryRate&&(
                      <span className="ml-auto text-xs text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                        = {fmt((parseFloat(entryHours)||0)*(parseFloat(entryRate)||0))} PLN
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Work entries table */}
              {selectedJob.workEntries.length===0&&!showAddEntry&&(
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Brak wpisów. Kliknij "Dodaj wpis" aby dodać czas pracy.
                </div>
              )}
              {selectedJob.workEntries.length>0&&(
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-border" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                        <th className="px-5 py-2.5 text-left">Pracownik</th>
                        <th className="px-3 py-2.5 text-right">Dni</th>
                        <th className="px-3 py-2.5 text-right">Godziny</th>
                        <th className="px-3 py-2.5 text-right">Koszt</th>
                        <th className="px-3 py-2.5 w-16"/>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {workerGroups.map((group) => {
                        const isMulti = group.entries.length > 1;
                        const isExpanded = isMulti && expandedWorkerKeys.has(group.key);
                        const canCopyToday = !selectedJob.workEntries.some(
                          (e) => e.date === todayIso && (e.directoryId === group.directoryId || e.employeeName === group.employeeName),
                        ) && group.entries.some((e) => e.date !== todayIso);

                        if (!isMulti) {
                          const entry = group.entries[0];
                          return (
                            <tr key={group.key} className="hover:bg-secondary/20">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-3.5 shrink-0"/>
                                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                                    {group.employeeName ? group.employeeName[0].toUpperCase() : "?"}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-sm font-medium block truncate">{group.employeeName || "—"}</span>
                                    <span className="text-[11px] text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtDate(entry.date)}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right text-xs text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>1</td>
                              <td className="px-3 py-3 text-right font-medium" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(entry.hours)}</td>
                              <td className="px-3 py-3 text-right">
                                {canViewRates && (
                                <span className="text-xs text-muted-foreground block" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(entry.rate)} PLN/h</span>
                                )}
                                <span className="text-sm font-semibold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(entry.hours * entry.rate)}</span>
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center justify-end gap-0.5">
                                  {canCopyToday && (
                                    <button type="button" onClick={() => copyEntryToToday(entry)} title="Kopiuj na dziś" className="p-1 text-primary hover:text-primary/80 transition-colors rounded">
                                      <Copy size={12}/>
                                    </button>
                                  )}
                                  <button onClick={() => updateJob({ ...selectedJob, workEntries: selectedJob.workEntries.filter((e) => e.id !== entry.id) })} className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded">
                                    <Trash2 size={12}/>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <Fragment key={group.key}>
                            <tr
                              className={`cursor-pointer hover:bg-secondary/30 ${isExpanded ? "bg-secondary/15" : ""}`}
                              onClick={() => toggleWorkerGroup(group.key)}
                            >
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  {isExpanded
                                    ? <ChevronDown size={14} className="text-muted-foreground shrink-0"/>
                                    : <ChevronRight size={14} className="text-muted-foreground shrink-0"/>}
                                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                                    {group.employeeName ? group.employeeName[0].toUpperCase() : "?"}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-sm font-medium block truncate">{group.employeeName || "—"}</span>
                                    <span className="text-[10px] text-muted-foreground/70">
                                      {group.entries.length} wpis{group.entries.length < 5 ? "y" : "ów"} · kliknij aby rozwinąć
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right text-xs text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{group.dayCount}</td>
                              <td className="px-3 py-3 text-right font-medium" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(group.totalHours)}</td>
                              <td className="px-3 py-3 text-right font-semibold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(group.totalCost)}</td>
                              <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                                {canCopyToday && (
                                  <div className="flex items-center justify-end">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const last = group.entries.find((e) => e.date !== todayIso);
                                        if (last) copyEntryToToday(last);
                                      }}
                                      title="Kopiuj ostatni wpis na dziś"
                                      className="p-1 text-primary hover:text-primary/80 transition-colors rounded"
                                    >
                                      <Copy size={12}/>
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                            {isExpanded && group.entries.map((entry) => (
                              <tr key={entry.id} className="bg-secondary/10 hover:bg-secondary/20 border-t border-border/50">
                                <td className="pl-12 pr-3 py-2.5">
                                  <span className="text-xs text-muted-foreground block" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtDate(entry.date)}</span>
                                  <input
                                    type="text"
                                    placeholder="Notatka..."
                                    value={entry.notes || ""}
                                    onChange={(e) => updateJob({
                                      ...selectedJob,
                                      workEntries: selectedJob.workEntries.map((we) => we.id === entry.id ? { ...we, notes: e.target.value } : we),
                                    })}
                                    className="w-full mt-1 bg-transparent text-[11px] text-muted-foreground placeholder:text-muted-foreground/30 border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors py-0.5"
                                  />
                                </td>
                                <td className="px-3 py-2.5 text-right text-[11px] text-muted-foreground">—</td>
                                <td className="px-3 py-2.5 text-right text-xs" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(entry.hours)}</td>
                                <td className="px-3 py-2.5 text-right">
                                  {canViewRates && (
                                  <span className="text-xs text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(entry.rate)} PLN/h · </span>
                                  )}
                                  <span className="text-xs font-medium text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(entry.hours * entry.rate)}</span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center justify-end gap-0.5">
                                    {entry.date !== todayIso && !selectedJob.workEntries.some(
                                      (e) => e.date === todayIso && (e.directoryId === entry.directoryId || e.employeeName === entry.employeeName),
                                    ) && (
                                      <button type="button" onClick={() => copyEntryToToday(entry)} title="Kopiuj na dziś" className="p-1 text-primary hover:text-primary/80 transition-colors rounded">
                                        <Copy size={11}/>
                                      </button>
                                    )}
                                    <button onClick={() => updateJob({ ...selectedJob, workEntries: selectedJob.workEntries.filter((e) => e.id !== entry.id) })} className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded">
                                      <Trash2 size={11}/>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-secondary/30">
                        <td className="px-5 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Suma · {workerGroups.length} os.
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs font-bold" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                          {new Set(selectedJob.workEntries.map((e) => e.date)).size}
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs font-bold" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(jobTotalHours(selectedJob))}</td>
                        <td className="px-3 py-2.5 text-right text-sm font-bold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(jobCost(selectedJob))}</td>
                        <td/>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Cost summary card */}
              {selectedJob.workEntries.length>0&&(
                <div className="px-5 pb-2">
                  <div className="bg-secondary/50 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Koszt pracowników</p>
                      <p className="text-xs text-muted-foreground">{jobTotalHours(selectedJob).toFixed(1)}h · {new Set(selectedJob.workEntries.map(e=>e.date)).size} dni</p>
                    </div>
                    <span className="text-lg font-bold text-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(jobCost(selectedJob))} PLN</span>
                  </div>
                </div>
              )}
            </div>

            {/* Materials */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2"><Package size={13} className="text-muted-foreground"/><span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Materiały</span></div>
                <button onClick={()=>{
                  const desc=window.prompt("Opis materiału:");
                  if(!desc) return;
                  const costStr=window.prompt("Koszt (PLN):");
                  const cost=parseFloat(costStr||"0")||0;
                  const m:MaterialEntry={id:crypto.randomUUID(),description:desc,cost,date:new Date().toISOString().slice(0,10)};
                  updateJob({...selectedJob,materials:[...(selectedJob.materials||[]),m]});
                }} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                  <Plus size={13}/>Dodaj
                </button>
              </div>
              {(selectedJob.materials||[]).length===0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground">Brak wpisów materiałów.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-muted-foreground border-b border-border" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                      <th className="px-5 py-2 text-left">Opis</th><th className="px-3 py-2 text-right">Data</th><th className="px-5 py-2 text-right">Koszt</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                      {(selectedJob.materials||[]).map(m=>(
                        <tr key={m.id} className="hover:bg-secondary/20 group">
                          <td className="px-5 py-2.5 font-medium">{m.description}</td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground text-xs" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtDate(m.date)}</td>
                          <td className="px-5 py-2.5 text-right font-semibold" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                            <span>{fmt(m.cost)} PLN</span>
                            <button onClick={()=>updateJob({...selectedJob,materials:(selectedJob.materials||[]).filter(x=>x.id!==m.id)})} className="ml-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"><Trash2 size={12}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="border-t border-border bg-secondary/20">
                      <td colSpan={2} className="px-5 py-2.5 text-xs font-bold text-muted-foreground uppercase">Suma materiałów</td>
                      <td className="px-5 py-2.5 text-right font-bold text-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(jobMaterialsCost(selectedJob))} PLN</td>
                    </tr></tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Total cost summary */}
            {(selectedJob.workEntries.length>0||(selectedJob.materials||[]).length>0)&&(
              <div className="bg-primary/10 border border-primary/20 rounded-xl px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Łączny koszt remontu</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Pracownicy: {fmt(jobCost(selectedJob))} PLN</span>
                    <span>Materiały: {fmt(jobMaterialsCost(selectedJob))} PLN</span>
                  </div>
                </div>
                <span className="text-2xl font-bold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(jobTotalCost(selectedJob))} <span className="text-base font-normal">PLN</span></span>
              </div>
            )}

            {/* Worker reports */}
            <JobWorkerReportsPanel
              jobId={selectedJob.id}
              authorName={adminSession?.displayName || "Administrator"}
              authorAdminRole={adminSession?.role && adminSession.role !== "inspector" ? adminSession.role : "admin"}
              reports={jobWorkerReports(selectedJob)}
              onAddReport={(report) => updateJob({
                ...selectedJob,
                workerReports: [...jobWorkerReports(selectedJob), report],
              }, { type: "report_add", text: `Dodano raport (${scopeTextLineCount(getReportWorkScopeText(report))} linii)` })}
              onDelete={(reportId) => updateJob({
                ...selectedJob,
                workerReports: jobWorkerReports(selectedJob).filter(r => r.id !== reportId),
              }, { type: "report_delete", text: "Usunięto raport" })}
            />

            {/* Photos */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera size={13} className="text-muted-foreground"/>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Zdjęcia</span>
                  {(selectedJob.photos||[]).filter(p=>p.status==="pending").length > 0 && (
                    <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {(selectedJob.photos||[]).filter(p=>p.status==="pending").length} nowych
                    </span>
                  )}
                </div>
                <HiddenFileInput multiple onPick={async (files) => {
                  if (!files?.length) return;
                  for (const file of Array.from(files)) {
                    const wm = await prepareWatermarkedPhoto(selectedJob, file);
                    const { entry } = await uploadPhoto(selectedJob.id, wm, "progress", "admin");
                    if (entry) {
                      updateJob({
                        ...selectedJob,
                        photos:[...(selectedJob.photos||[]), {...entry, status:"approved"}],
                      }, { type: "photo_upload", text: `Admin dodał zdjęcie (${entry.label})` });
                    }
                  }
                }}>
                  {(open) => (
                    <button
                      type="button"
                      onClick={open}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors"
                    >
                      <ImagePlus size={13}/>Dodaj
                    </button>
                  )}
                </HiddenFileInput>
              </div>
              <div className="p-4">
                <PhotoGallery
                  photos={selectedJob.photos||[]}
                  onUpdate={(photos, activity) => {
                    const prev = selectedJob.photos || [];
                    updateJob({ ...selectedJob, photos }, activity);
                  }}
                />
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="flex-1 hidden sm:flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <MapPin size={48} className="opacity-15"/>
          <p className="text-sm font-medium">Wybierz robotę z listy</p>
          <p className="text-xs text-center max-w-xs">lub kliknij "Nowa robota" aby dodać nową.</p>
        </div>
      )}
      {showEmailModal && selectedJob && (
        <JobEmailModal
          job={selectedJob}
          contacts={contacts}
          onClose={() => setShowEmailModal(false)}
          onManageContacts={() => { setShowEmailModal(false); onManageContacts(); }}
          onSent={(to) => updateJob(selectedJob, { type: "email_sent", text: `Wysłano materiały na ${to}` })}
        />
      )}
    </div>
  );
}

// ─── Grafik tygodniowy ────────────────────────────────────────────────────────

function ScheduleView({
  weekEmployees,
  weekFrom,
  weekTo,
  jobs,
  directory,
  onWeekChange,
  onGoToCurrent,
  onOpenPayroll,
}: {
  weekEmployees: WeekEmployee[];
  weekFrom: string;
  weekTo: string;
  jobs: Job[];
  directory: DirectoryEmployee[];
  onWeekChange: (from: string, to: string) => void;
  onGoToCurrent: () => void;
  onOpenPayroll: () => void;
}) {
  const columns = useMemo(() => weekDayColumns(weekFrom), [weekFrom]);
  const todayIso = todayIsoDate();
  const currentWeek = getWeekRange();
  const sortedEmps = useMemo(
    () => [...weekEmployees].sort((a, b) => a.name.localeCompare(b.name, "pl")),
    [weekEmployees],
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-border bg-card shrink-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays size={16} className="text-primary"/>
              Grafik tygodniowy
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kto pracuje, gdzie i w jakich godzinach — ten sam tydzień co Lista Płac
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={weekFrom} onChange={(e) => onWeekChange(e.target.value, weekTo)}
              className="bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}/>
            <span className="text-muted-foreground text-sm">–</span>
            <input type="date" value={weekTo} onChange={(e) => onWeekChange(weekFrom, e.target.value)}
              className="bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}/>
            {weekFrom !== currentWeek.from && (
              <button onClick={onGoToCurrent} className="text-xs px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/70 border border-border font-medium">
                Bieżący tydzień
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary/20 border border-primary/30"/>Dziś</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500/15 border border-green-500/25"/>Praca (lista płac)</span>
          <span className="flex items-center gap-1.5"><MapPin size={10} className="text-primary"/>Adres z roboty</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {sortedEmps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-muted-foreground">
            <CalendarDays size={40} className="opacity-20 mb-3"/>
            <p className="text-sm font-medium text-foreground">Brak pracowników w tym tygodniu</p>
            <p className="text-xs mt-2 max-w-sm">Dodaj ekipę w Liście Płac i zaznacz dni pracy. Adresy pojawią się po wpisach „Pracownicy na robocie”.</p>
            <button onClick={onOpenPayroll} className="mt-4 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
              Otwórz Listę Płac
            </button>
          </div>
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="sticky top-0 z-20 bg-card shadow-[0_1px_0_var(--border)]">
              <tr>
                <th className="sticky left-0 z-30 bg-card border-b border-r border-border px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[120px] sm:min-w-[140px]">
                  Pracownik
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`border-b border-border px-2 py-3 text-center min-w-[88px] sm:min-w-[100px] ${col.iso === todayIso ? "bg-primary/10" : "bg-card"}`}
                  >
                    <p className={`text-xs font-bold ${col.iso === todayIso ? "text-primary" : ""}`}>{col.shortLabel}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{col.dateLabel}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedEmps.map((emp, ri) => (
                <tr key={emp.id} className={ri % 2 === 0 ? "bg-background" : "bg-card/40"}>
                  <td className={`sticky left-0 z-10 border-r border-b border-border px-3 py-2.5 ${ri % 2 === 0 ? "bg-background" : "bg-card/40"}`}>
                    <p className="text-sm font-medium leading-tight">{emp.name || "—"}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[130px]">{emp.position || "—"}</p>
                  </td>
                  {columns.map((col) => {
                    const cell = scheduleCellFor(emp, col.key, col.iso, jobs, directory);
                    const isToday = col.iso === todayIso;
                    return (
                      <td
                        key={col.key}
                        className={`border-b border-border px-1.5 py-2 align-top text-center ${isToday ? "bg-primary/5" : ""} ${cell.working ? "" : "opacity-40"}`}
                      >
                        {cell.working ? (
                          <div className="space-y-1 min-h-[52px] flex flex-col items-center justify-start">
                            {cell.timeRange && (
                              <span className="text-[10px] font-semibold text-green-400/90 bg-green-500/10 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
                                {cell.timeRange}
                              </span>
                            )}
                            {cell.hoursLabel && (
                              <span className="text-[9px] text-muted-foreground">{cell.hoursLabel}</span>
                            )}
                            {cell.locations.length > 0 ? (
                              cell.locations.map((loc, i) => (
                                <span key={i} className="text-[9px] leading-snug text-primary flex items-start gap-0.5 max-w-[96px]">
                                  <MapPin size={8} className="shrink-0 mt-0.5"/>
                                  <span className="text-left">{loc}</span>
                                </span>
                              ))
                            ) : cell.timeRange ? (
                              <span className="text-[9px] text-muted-foreground italic">bez roboty</span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50 text-sm">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardView({
  jobs, directory, weekEmployees, weekFrom, weekTo, savedWeeks,
  onNavigate, onFixJobs, adminUserId, alertsSeenTick, onAlertsSeen, onOpenSms,
}: {
  jobs: Job[];
  directory: DirectoryEmployee[];
  weekEmployees: WeekEmployee[];
  weekFrom: string; weekTo: string;
  savedWeeks: WeekSnapshot[];
  onNavigate: (v: "payroll" | "directory" | "archive" | "jobs" | "schedule" | "inspector", jobId?: string, payrollEmpId?: string, inspectorTab?: "activity" | "portfolio") => void;
  onFixJobs: (updater: (prev: Job[]) => Job[]) => void;
  adminUserId?: string;
  alertsSeenTick: number;
  onAlertsSeen: () => void;
  onOpenSms?: () => void;
}) {
  const todayKey = todayDayKey();
  const todayIso = todayIsoDate();
  const workingToday = weekEmployees.filter((e) => todayKey && dayTotalHours(e.days[todayKey]) > 0);
  const offToday = weekEmployees.filter((e) => !(todayKey && dayTotalHours(e.days[todayKey]) > 0));

  const activeJobs = jobs.filter((j) => j.status === "in_progress");
  const completedJobs = jobs.filter((j) => j.status === "completed");
  const jobsMissingDocs = jobs.filter(
    (j) => j.status === "in_progress" && jobMissingRequiredDocs(j).length > 0,
  );
  const staleDocsJobs = jobsMissingDocs.filter((j) => jobDaysSinceStart(j) >= 7);
  const jobsReadyToClose = jobs.filter(
    (j) => j.status === "in_progress" && DOCUMENT_TYPES.every((d) => j.documents[d]),
  );

  const weekTotal = weekEmployees.reduce((s, e) => s + calcWeekEmployee(e).netPay, 0);
  const weekHours = weekEmployees.reduce((s, e) => s + calcWeekEmployee(e).totalHours, 0);

  const yearNow = new Date().getFullYear();
  const yearWeeks = savedWeeks.filter((w) => new Date(w.weekFrom).getFullYear() === yearNow);
  const yearTotal = yearWeeks.reduce((s, w) => s + w.totalNet, 0);
  const monthNow = new Date().getMonth();
  const monthWeeks = yearWeeks.filter((w) => new Date(w.weekFrom).getMonth() === monthNow);
  const monthTotal = monthWeeks.reduce((s, w) => s + w.totalNet, 0);

  const recentJobs = [...activeJobs].sort((a, b) => b.startDate.localeCompare(a.startDate)).slice(0, 6);
  const recentWeeks = [...savedWeeks].sort((a, b) => b.weekFrom.localeCompare(a.weekFrom)).slice(0, 3);

  const pendingPhotos = useMemo(
    () =>
      jobs
        .flatMap((j) =>
          (j.photos || [])
            .filter((p) => p.status === "pending")
            .map((p) => ({ photo: p, job: j })),
        )
        .sort((a, b) => b.photo.uploadedAt.localeCompare(a.photo.uploadedAt)),
    [jobs],
  );

  const pendingReceipts = useMemo(
    () =>
      weekEmployees.flatMap((emp) =>
        (emp.extraCosts ?? [])
          .filter((c) => extraCostStatus(c) === "pending")
          .map((cost) => ({ cost, emp })),
      ),
    [weekEmployees],
  );

  const pendingReports = useMemo(
    () =>
      jobs
        .filter((j) => j.status === "in_progress")
        .flatMap((j) =>
          jobWorkerReports(j)
            .filter((r) => reportNeedsAdminAttention(r))
            .map((report) => ({ report, job: j })),
        )
        .sort((a, b) =>
          (b.report.updatedAt || b.report.submittedAt).localeCompare(
            a.report.updatedAt || a.report.submittedAt,
          ),
        ),
    [jobs],
  );

  const totalReportsActive = useMemo(
    () => activeJobs.reduce((s, j) => s + jobWorkerReports(j).length, 0),
    [activeJobs],
  );

  const consistencyAlerts = useMemo(
    () => payrollJobConsistencyAlerts(weekEmployees, jobs, weekFrom, weekTo, directory),
    [weekEmployees, jobs, weekFrom, weekTo, directory],
  );

  const unseenInspectorFeed = useMemo(
    () => getUnseenInspectorFeed(jobs, undefined, adminUserId),
    [jobs, adminUserId, alertsSeenTick],
  );

  const inspectorNotesPending = useMemo(
    () => jobsWithInspectorNotesNeedingAdmin(jobs, getAdminJobNotesSeenAt(adminUserId)),
    [jobs, adminUserId, alertsSeenTick],
  );

  const wmPortfolioStats = useMemo(
    () => computeWmPortfolioStats(jobs, { notesNeedingAdminAttention: inspectorNotesPending.length }),
    [jobs, inspectorNotesPending.length],
  );

  const wmOverdueJobs = useMemo(() => wmJobsWithOverduePlanned(jobs), [jobs]);
  const wmThisWeekJobs = useMemo(() => wmJobsPlannedThisWeek(jobs), [jobs]);

  const markInspectorAlertsSeen = () => {
    const ts = new Date().toISOString();
    markInspectorFeedSeen(adminUserId, ts).catch(() => {});
    markAdminJobNotesSeen(adminUserId, ts).catch(() => {});
    onAlertsSeen();
  };

  const currentWeekRange = getWeekRange();
  const isCurrentPayrollWeek = weekFrom === currentWeekRange.from && weekTo === currentWeekRange.to;
  const weekSaved = savedWeeks.some((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
  const unsettledEmployees = weekEmployees.filter((e) => !e.settled);
  const dayOfWeek = new Date().getDay();
  const isFriday = dayOfWeek === 5;
  const isSaturday = dayOfWeek === 6;
  const showSaturdayBanner =
    isSaturday && isCurrentPayrollWeek && weekEmployees.length > 0 && (!weekSaved || unsettledEmployees.length > 0);

  // Tydzień zapisuje się automatycznie w sobotę (AppInner) — alert tylko w sobotę, gdy auto-zapis nie zadziałał
  const needsUnsavedWeekAlert =
    weekEmployees.length > 0 && !weekSaved && isCurrentPayrollWeek && isSaturday;
  // Rozliczenia w piątek — bez sensu świecić alertem cały tydzień
  const needsUnsettledAlert = unsettledEmployees.length > 0 && isCurrentPayrollWeek && isFriday;

  const attentionCount =
    (needsUnsavedWeekAlert ? 1 : 0) +
    (needsUnsettledAlert ? unsettledEmployees.length : 0) +
    consistencyAlerts.length +
    jobsMissingDocs.length +
    pendingPhotos.length +
    pendingReceipts.length +
    pendingReports.length +
    unseenInspectorFeed.length +
    inspectorNotesPending.length +
    wmOverdueJobs.length +
    wmThisWeekJobs.length;

  const handleFixConsistency = (alert: PayrollJobConsistencyAlert) => {
    onFixJobs((prev) => fixJobsForConsistencyAlert(prev, alert, weekEmployees, weekFrom, weekTo, directory));
  };

  const acknowledgeReport = (jobId: string, reportId: string) => {
    const now = new Date().toISOString();
    onFixJobs((prev) =>
      prev.map((j) =>
        j.id !== jobId
          ? j
          : {
              ...j,
              workerReports: jobWorkerReports(j).map((r) =>
                r.id === reportId ? { ...r, adminReviewedAt: now } : r,
              ),
            },
      ),
    );
  };

  const todayLabel = new Date().toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">

        {/* Nagłówek */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Pulpit</h1>
            <p className="text-sm text-muted-foreground capitalize mt-0.5">{todayLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tydzień listy płac: {fmtDate(weekFrom)} – {fmtDate(weekTo)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onOpenSms && (
              <button
                type="button"
                onClick={onOpenSms}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 transition-colors"
              >
                <MessageSquare size={13}/>
                SMS pilne
              </button>
            )}
            {(
              [
                { v: "schedule" as const, icon: CalendarDays, label: "Grafik" },
                { v: "payroll" as const, icon: Wallet, label: "Lista płac" },
                { v: "jobs" as const, icon: MapPin, label: "Roboty" },
              ] as const
            ).map(({ v, icon: Icon, label }) => (
              <button
                key={v}
                type="button"
                onClick={() => onNavigate(v)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border transition-colors"
              >
                <Icon size={13} className="text-primary"/>
                {label}
              </button>
            ))}
          </div>
        </div>

        {showSaturdayBanner && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Bell size={18} className="text-primary shrink-0 mt-0.5"/>
              <div>
                <p className="text-sm font-semibold text-primary">Sobota — czas zamknąć tydzień</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {!weekSaved && "Tydzień zapisze się automatycznie dziś przy otwarciu aplikacji — możesz też zapisać ręcznie. "}
                  {unsettledEmployees.length > 0 && (
                    <>{unsettledEmployees.length} {unsettledEmployees.length === 1 ? "osoba oczekuje" : "osób oczekuje"} na rozliczenie: {unsettledEmployees.slice(0, 4).map((e) => e.name.split(" ")[0]).join(", ")}{unsettledEmployees.length > 4 ? "…" : ""}.</>
                  )}
                  {weekSaved && unsettledEmployees.length === 0 && "Tydzień zapisany — sprawdź, czy wszyscy mają status Rozliczony."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("payroll")}
              className="shrink-0 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {!weekSaved ? "Zapisz tydzień →" : "Lista płac →"}
            </button>
          </div>
        )}

        {/* Skróty liczbowe */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => onNavigate("jobs")}
            className="bg-card border border-border rounded-xl px-4 py-3 text-left hover:border-primary/30 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Roboty w trakcie</p>
            <p className="text-2xl font-bold text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {activeJobs.length}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{completedJobs.length} zdanych</p>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("payroll")}
            className="bg-card border border-border rounded-xl px-4 py-3 text-left hover:border-primary/30 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Wypłata tyg.</p>
            <p className="text-lg font-bold text-primary leading-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {fmt(weekTotal)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{fmtH(weekHours)} · {weekEmployees.length} os.</p>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("directory")}
            className="bg-card border border-border rounded-xl px-4 py-3 text-left hover:border-primary/30 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Ekipa dziś</p>
            <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {workingToday.length}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {weekEmployees.length > 0 ? `${offToday.length} wolne · ${filterProductionActiveDirectory(directory).length} w kartotece` : "brak w liście płac"}
            </p>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("inspector", undefined, undefined, "portfolio")}
            className="bg-card border border-emerald-500/20 rounded-xl px-4 py-3 text-left hover:border-emerald-500/40 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <LayoutGrid size={10} className="text-emerald-500"/> Aktywne WM
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {wmPortfolioStats.total}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {wmPortfolioStats.overduePlanned > 0 ? `${wmPortfolioStats.overduePlanned} po terminie` : "Portfolio WM →"}
            </p>
          </button>
          <div
            className={`rounded-xl px-4 py-3 border ${
              attentionCount > 0
                ? "bg-amber-500/5 border-amber-500/25"
                : "bg-card border-border"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Do ogarnięcia</p>
            <p
              className={`text-2xl font-bold ${attentionCount > 0 ? "text-amber-400" : "text-muted-foreground"}`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {attentionCount}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {attentionCount > 0 ? "patrz sekcja poniżej" : "wszystko OK"}
            </p>
          </div>
        </div>

        {/* Uwaga dziś */}
        {attentionCount > 0 && (
          <div className="bg-card border border-amber-500/20 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-amber-500/15 flex items-center gap-2 bg-amber-500/5">
              <AlertTriangle size={14} className="text-amber-400 shrink-0"/>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Uwaga dziś</span>
              <span className="text-[10px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full font-bold ml-auto">{attentionCount}</span>
            </div>
            <div className="divide-y divide-border">
              {needsUnsavedWeekAlert && (
                <div className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
                      <Archive size={14} className="text-primary shrink-0"/>
                      Tydzień niezapisany w archiwum
                      <span className="text-xs text-muted-foreground font-normal">({fmtDate(weekFrom)} – {fmtDate(weekTo)})</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      W sobotę tydzień zapisuje się automatycznie przy otwarciu aplikacji — zapisz ręcznie, jeśli auto-zapis nie zadziałał.
                    </p>
                  </div>
                  <button type="button" onClick={() => onNavigate("payroll")} className="text-xs text-primary hover:underline shrink-0">
                    Zapisz tydzień →
                  </button>
                </div>
              )}
              {needsUnsettledAlert && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Wallet size={14} className="text-yellow-400"/>
                      Nierozliczeni pracownicy
                      <span className="text-[10px] bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">
                        {unsettledEmployees.length}
                      </span>
                    </p>
                    <button type="button" onClick={() => onNavigate("payroll")} className="text-xs text-primary hover:underline">
                      Lista płac →
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {unsettledEmployees.slice(0, 8).map((e) => (
                      <span key={e.id} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{e.name || "—"}</span>
                    ))}
                    {unsettledEmployees.length > 8 && (
                      <span className="text-[10px] text-muted-foreground">+ {unsettledEmployees.length - 8}</span>
                    )}
                  </div>
                </div>
              )}
              {consistencyAlerts.length > 0 && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Scale size={14} className="text-orange-400"/>
                      Spójność listy płac ↔ roboty
                      <span className="text-[10px] bg-orange-500/15 text-orange-400 px-1.5 py-0.5 rounded-full font-bold">
                        {consistencyAlerts.length}
                      </span>
                    </p>
                    <button type="button" onClick={() => onNavigate("payroll")} className="text-xs text-primary hover:underline">
                      Lista płac →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {consistencyAlerts.slice(0, 8).map((a, i) => {
                      const canFix =
                        a.kind !== "payroll_only" ||
                        jobs.some((j) => j.status === "in_progress");
                      return (
                        <div key={`${a.name}-${a.dateIso}-${i}`} className="flex items-start justify-between gap-3">
                          <p className="text-xs text-muted-foreground leading-relaxed min-w-0 flex-1">
                            {consistencyAlertMessage(a)}
                          </p>
                          <button
                            type="button"
                            disabled={!canFix}
                            title={
                              canFix
                                ? a.multiSite
                                  ? "Dopasuj sumę godzin — rozdziel między roboty (lista płac ma pierwszeństwo)"
                                  : "Dopasuj roboty do godzin z listy płac"
                                : "Brak aktywnej roboty — dodaj wpis ręcznie w Roboty"
                            }
                            onClick={() => handleFixConsistency(a)}
                            className="shrink-0 text-[10px] px-2.5 py-1 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Popraw
                          </button>
                        </div>
                      );
                    })}
                    {consistencyAlerts.length > 8 && (
                      <p className="text-[10px] text-muted-foreground">+ {consistencyAlerts.length - 8} więcej rozbieżności</p>
                    )}
                  </div>
                </div>
              )}
              {pendingPhotos.length > 0 && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Camera size={14} className="text-yellow-400"/>
                      Zdjęcia od pracowników — do akceptacji
                      <span className="text-[10px] bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">
                        {pendingPhotos.length}
                      </span>
                    </p>
                    <button type="button" onClick={() => onNavigate("jobs")} className="text-xs text-primary hover:underline">
                      Roboty →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {pendingPhotos.slice(0, 5).map(({ photo, job }) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => onNavigate("jobs", job.id)}
                        className="w-full text-left text-xs text-muted-foreground truncate hover:text-foreground transition-colors"
                      >
                        <span className="text-foreground">{job.address || "Bez adresu"}</span>
                        {" · "}
                        <span className="text-foreground/90">{photo.uploadedBy}</span>
                        {photo.caption ? ` — ${photo.caption}` : ""}
                        {" · "}
                        {fmtDate(photo.uploadedAt.slice(0, 10))}
                      </button>
                    ))}
                    {pendingPhotos.length > 5 && (
                      <p className="text-[10px] text-muted-foreground">+ {pendingPhotos.length - 5} więcej</p>
                    )}
                  </div>
                </div>
              )}
              {pendingReceipts.length > 0 && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Receipt size={14} className="text-emerald-400"/>
                      Paragony / faktury do akceptacji
                      <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
                        {pendingReceipts.length}
                      </span>
                    </p>
                    <button type="button" onClick={() => onNavigate("payroll")} className="text-xs text-primary hover:underline">
                      Lista płac →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {pendingReceipts.slice(0, 5).map(({ cost, emp }) => (
                      <button
                        key={cost.id}
                        type="button"
                        onClick={() => onNavigate("payroll", undefined, emp.id)}
                        className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
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
                    {pendingReceipts.length > 5 && (
                      <p className="text-[10px] text-muted-foreground">+ {pendingReceipts.length - 5} więcej</p>
                    )}
                  </div>
                </div>
              )}
              {pendingReports.length > 0 && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <ClipboardList size={14} className="text-violet-400"/>
                      Nowe raporty od pracowników
                      <span className="text-[10px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full font-bold">
                        {pendingReports.length}
                      </span>
                    </p>
                    <button type="button" onClick={() => onNavigate("jobs")} className="text-xs text-primary hover:underline">
                      Roboty →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {pendingReports.slice(0, 5).map(({ report, job }) => (
                      <button
                        key={report.id}
                        type="button"
                        onClick={() => {
                          acknowledgeReport(job.id, report.id);
                          onNavigate("jobs", job.id);
                        }}
                        className="w-full text-left text-xs text-muted-foreground truncate hover:text-foreground transition-colors"
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
                    {pendingReports.length > 5 && (
                      <p className="text-[10px] text-muted-foreground">+ {pendingReports.length - 5} więcej</p>
                    )}
                  </div>
                </div>
              )}
              {unseenInspectorFeed.length > 0 && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <ClipboardCheck size={14} className="text-emerald-500"/>
                      Inspektor — nowe zmiany
                      <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
                        {unseenInspectorFeed.length}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={markInspectorAlertsSeen} className="text-[10px] text-muted-foreground hover:text-foreground">
                        Oznacz przeczytane
                      </button>
                      <button type="button" onClick={() => onNavigate("inspector")} className="text-xs text-primary hover:underline">
                        Inspektor →
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {unseenInspectorFeed.slice(0, 6).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onNavigate("inspector", item.jobId)}
                        className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
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
                    {unseenInspectorFeed.length > 6 && (
                      <p className="text-[10px] text-muted-foreground">+ {unseenInspectorFeed.length - 6} więcej w zakładce Inspektor</p>
                    )}
                  </div>
                </div>
              )}
              {wmOverdueJobs.length > 0 && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Calendar size={14} className="text-red-400"/>
                      WM — termin odbioru minął
                      <span className="text-[10px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full font-bold">
                        {wmOverdueJobs.length}
                      </span>
                    </p>
                    <button type="button" onClick={() => onNavigate("inspector", undefined, undefined, "portfolio")} className="text-xs text-primary hover:underline shrink-0">
                      Portfolio WM →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {wmOverdueJobs.slice(0, 5).map((job) => (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => onNavigate("inspector", job.id, undefined, "portfolio")}
                        className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="text-foreground">{job.address || "Bez adresu"}</span>
                        {job.flatNumber ? ` m.${job.flatNumber}` : ""}
                        {" · "}
                        <span className="text-red-400">{fmtPlannedHandover(job.plannedHandoverDate || "")}</span>
                        {" · "}
                        {HANDOVER_STAGE_LABELS[inferHandoverStage(job)]}
                      </button>
                    ))}
                    {wmOverdueJobs.length > 5 && (
                      <p className="text-[10px] text-muted-foreground">+ {wmOverdueJobs.length - 5} więcej</p>
                    )}
                  </div>
                </div>
              )}
              {wmThisWeekJobs.length > 0 && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <CalendarDays size={14} className="text-amber-400"/>
                      WM — odbiór w tym tygodniu
                      <span className="text-[10px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">
                        {wmThisWeekJobs.length}
                      </span>
                    </p>
                    <button type="button" onClick={() => onNavigate("inspector", undefined, undefined, "portfolio")} className="text-xs text-primary hover:underline shrink-0">
                      Portfolio WM →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {wmThisWeekJobs.slice(0, 5).map((job) => (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => onNavigate("inspector", job.id, undefined, "portfolio")}
                        className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="text-foreground">{job.address || "Bez adresu"}</span>
                        {job.flatNumber ? ` m.${job.flatNumber}` : ""}
                        {" · "}
                        <span className="text-amber-400">{fmtPlannedHandover(job.plannedHandoverDate || "")}</span>
                        {" · "}
                        {HANDOVER_STAGE_LABELS[inferHandoverStage(job)]}
                      </button>
                    ))}
                    {wmThisWeekJobs.length > 5 && (
                      <p className="text-[10px] text-muted-foreground">+ {wmThisWeekJobs.length - 5} więcej</p>
                    )}
                  </div>
                </div>
              )}
              {inspectorNotesPending.length > 0 && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare size={14} className="text-violet-400"/>
                      Notatki od inspektora
                      <span className="text-[10px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full font-bold">
                        {inspectorNotesPending.length}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={markInspectorAlertsSeen} className="text-[10px] text-muted-foreground hover:text-foreground">
                        Oznacz przeczytane
                      </button>
                      <button type="button" onClick={() => onNavigate("inspector")} className="text-xs text-primary hover:underline">
                        Inspektor →
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {inspectorNotesPending.slice(0, 5).map((job) => {
                      const last = (job.jobNotes || [])[0];
                      if (!last) return null;
                      return (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() => onNavigate("inspector", job.id)}
                          className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <span className="text-foreground">{job.address || "Bez adresu"}</span>
                          {" · "}
                          <span className="text-emerald-600 dark:text-emerald-400">{last.author}</span>
                          {": "}
                          {last.text.length > 60 ? `${last.text.slice(0, 60)}…` : last.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {jobsMissingDocs.length > 0 && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <FileText size={14} className="text-yellow-400"/>
                      Brak dokumentów
                      <span className="text-[10px] bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">
                        {jobsMissingDocs.length}
                      </span>
                    </p>
                    <button type="button" onClick={() => onNavigate("jobs")} className="text-xs text-primary hover:underline shrink-0">
                      Roboty →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {jobsMissingDocs.slice(0, 4).map((job) => {
                      const missing = jobMissingRequiredDocs(job);
                      const days = jobDaysSinceStart(job);
                      return (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() => onNavigate("inspector", job.id, undefined, "portfolio")}
                          className="w-full text-left text-xs hover:text-foreground transition-colors"
                        >
                          <span className="font-medium">{job.address || "Bez adresu"}</span>
                          <span className="text-muted-foreground">
                            {" "}— brak: {missing.slice(0, 3).map((d) => DOC_LABELS[d]).join(", ")}{missing.length > 3 ? "…" : ""}
                            {days >= 7 && <span className="text-amber-400"> · {days} dni</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {jobsReadyToClose.length > 0 && (
                    <p className="text-[10px] text-green-400 mt-2">{jobsReadyToClose.length} robót gotowych do zdania</p>
                  )}
                  {staleDocsJobs.length > 0 && (
                    <p className="text-[10px] text-amber-400 mt-2 flex items-center gap-1">
                      <Bell size={10}/>{staleDocsJobs.length} robót &gt;7 dni bez kompletu dokumentów
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Pracuje dziś — szersza kolumna */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardHat size={13} className="text-primary"/>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pracuje dziś</span>
              </div>
              <button type="button" onClick={() => onNavigate("schedule")} className="text-xs text-primary hover:underline">
                Grafik →
              </button>
            </div>
            {weekEmployees.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Brak pracowników w tym tygodniu.
                <button type="button" onClick={() => onNavigate("payroll")} className="block mx-auto mt-2 text-xs text-primary hover:underline">
                  Otwórz listę płac
                </button>
              </div>
            ) : workingToday.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                {todayKey ? "Nikt nie jest zaplanowany na dziś." : "Niedziela — wolne"}
                {offToday.length > 0 && (
                  <p className="text-xs mt-2">{offToday.length} w ekipie tygodnia</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
                {workingToday.map((emp) => {
                  const { netPay } = calcWeekEmployee(emp);
                  const todayDay = todayKey ? emp.days[todayKey] : null;
                  const todayTimeParts: string[] = [];
                  if (todayDay?.active) todayTimeParts.push(`${todayDay.from}–${todayDay.to}`);
                  for (const ex of todayDay?.extraHours ?? []) {
                    if (hoursWorked(ex.from, ex.to) > 0) todayTimeParts.push(`${ex.from}–${ex.to}`);
                  }
                  const todayH = todayKey ? dayTotalHours(emp.days[todayKey]) : 0;
                  const todayJobs = jobsForEmployeeOnDashboard(emp, jobs, todayIso, weekFrom, weekTo, directory);
                  const streets = todayJobs.map(formatJobStreet);
                  return (
                    <div key={emp.id} className="px-5 py-3.5 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                        {emp.name ? emp.name[0].toUpperCase() : "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold truncate">{emp.name || "Bez nazwy"}</p>
                          <p className="text-sm font-semibold shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {fmtH(todayH)}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {todayTimeParts.length > 0 ? todayTimeParts.join(" + ") : "—"}
                          {emp.position ? ` · ${emp.position}` : ""}
                        </p>
                        {streets.length > 0 ? (
                          <p className="text-xs text-primary mt-1 flex items-start gap-1 leading-snug">
                            <MapPin size={11} className="shrink-0 mt-0.5"/>
                            <span>{streets.join(" · ")}</span>
                          </p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground mt-1 italic">Brak wpisu na robocie na dziś</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">Tydz.: {fmt(netPay)} PLN</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Aktywne roboty */}
          <div className="lg:col-span-3 bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-muted-foreground"/>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Roboty w trakcie</span>
                {totalReportsActive > 0 && (
                  <span className="text-[10px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full font-medium">
                    {totalReportsActive} rap.
                  </span>
                )}
              </div>
              <button type="button" onClick={() => onNavigate("jobs")} className="text-xs text-primary hover:underline">
                Wszystkie →
              </button>
            </div>
            {recentJobs.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">
                Brak aktywnych robót.
                <button type="button" onClick={() => onNavigate("jobs")} className="block mx-auto mt-2 text-xs text-primary hover:underline">
                  Dodaj robotę
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentJobs.map((job) => {
                  const docsOk = DOCUMENT_TYPES.filter((d) => job.documents[d]).length;
                  const cost = jobTotalCost(job);
                  const reportsN = jobWorkerReports(job).length;
                  const pendingN = (job.photos || []).filter((p) => p.status === "pending").length;
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => onNavigate("jobs", job.id)}
                      className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-secondary/20 transition-colors text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate">
                            {job.address || "Bez adresu"}
                            {job.flatNumber && <span className="text-muted-foreground font-normal"> m.{job.flatNumber}</span>}
                          </p>
                          {job.keysHandedOver && <KeyRound size={11} className="text-blue-400 shrink-0"/>}
                          {pendingN > 0 && (
                            <span className="text-[9px] bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded-full">{pendingN} zdj.</span>
                          )}
                          {reportsN > 0 && (
                            <span className="text-[9px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full">{reportsN} rap.</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{job.client || "—"} · od {fmtDate(job.startDate)}</p>
                      </div>
                      <div className="shrink-0 text-right space-y-1.5 min-w-[88px]">
                        <div className="flex items-center gap-1.5 justify-end">
                          <div className="w-14 bg-border rounded-full h-1 overflow-hidden">
                            <div className="bg-primary h-1 rounded-full" style={{ width: `${(docsOk / DOCUMENT_TYPES.length) * 100}%` }}/>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{docsOk}/{DOCUMENT_TYPES.length}</span>
                        </div>
                        {cost > 0 && (
                          <p className="text-xs font-semibold text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {fmt(cost)} PLN
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Podsumowanie finansowe + archiwum */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingUp size={16} className="text-primary"/>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Wypłaty · {MONTH_NAMES[monthNow]}</p>
              <p className="text-lg font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(monthTotal)} PLN</p>
              <p className="text-[10px] text-muted-foreground">{monthWeeks.length} tyg. w archiwum</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <Calendar size={16} className="text-muted-foreground"/>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Wypłaty · {yearNow}</p>
              <p className="text-lg font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(yearTotal)} PLN</p>
              <p className="text-[10px] text-muted-foreground">{yearWeeks.length} tyg. zapisanych</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("archive")}
            className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <Archive size={14} className="text-muted-foreground"/>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Ostatnie tygodnie</span>
            </div>
            {recentWeeks.length === 0 ? (
              <p className="text-xs text-muted-foreground">Brak archiwum — zapisz tydzień w liście płac</p>
            ) : (
              <div className="space-y-1">
                {recentWeeks.map((w) => (
                  <div key={w.id} className="flex justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{fmtDate(w.weekFrom)} – {fmtDate(w.weekTo)}</span>
                    <span className="font-semibold text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(w.totalNet)}</span>
                  </div>
                ))}
              </div>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Instrukcja obsługi ───────────────────────────────────────────────────────

function HelpView() {
  const [open, setOpen] = useState<string|null>("start");

  const sections: {id:string; icon:React.ElementType; title:string; subtitle:string; content:React.ReactNode}[] = [
    {
      id:"start",
      icon:Smartphone,
      title:"Od czego zacząć?",
      subtitle:"Pierwsze kroki w aplikacji",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">Aplikacja W&G DOM służy do zarządzania pracownikami, robotami i finansami firmy. Wszystkie dane zapisują się automatycznie i są dostępne na każdym urządzeniu — telefonie, tablecie i komputerze.</p>
          <div className="space-y-3">
            {[
              {num:"1", title:"Dodaj pracowników", desc:'Kliknij "Pracownicy" w menu → "Nowy pracownik". Wpisz imię, nazwisko, telefon, stanowisko i stawkę godzinową. To trzeba zrobić tylko raz — potem ta lista będzie dostępna w całej aplikacji.'},
              {num:"2", title:"Otwórz nową robotę", desc:'Kliknij "Roboty" w menu → "Nowa robota". Wpisz adres, klienta i datę rozpoczęcia. Możesz od razu zacząć zaznaczać dokumenty i dodawać pracowników.'},
              {num:"3", title:"Uzupełniaj listę płac w tygodniu", desc:'Kliknij "Lista Płac" → "Dodaj pracownika". Zaznacz dni, godziny, ewentualne zaliczki, koszty do zwrotu (chemia, paliwo) i dodatkowe godziny (np. dogrywka wieczorem). Pod koniec tygodnia kliknij "Zapisz tydzień".'},
            ].map(s=>(
              <div key={s.num} className="flex gap-4 bg-secondary/50 rounded-xl p-4">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">{s.num}</div>
                <div>
                  <p className="text-sm font-semibold mb-1">{s.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
            <Monitor size={16} className="text-blue-400 shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-medium text-blue-400 mb-1">Dane synchronizują się automatycznie</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Nie musisz nic zapisywać ręcznie. Chmurka w prawym górnym rogu mruga gdy zapisuje — jak jest zielona, wszystko jest bezpieczne. Otwórz aplikację na telefonie, danych i na wszystkich urządzeniach będą te same dane.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id:"schedule",
      icon:CalendarDays,
      title:"Grafik tygodniowy",
      subtitle:"Siatka: kto, gdzie i kiedy",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">W menu <strong>Grafik</strong> widzisz tabelę: wiersze to pracownicy z bieżącego tygodnia listy płac, kolumny to dni (Pn–So) z datami.</p>
          <div className="space-y-3">
            {[
              {q:"Skąd biorą się godziny?", a:"Z Listy Płac — podstawowa zmiana (zaznaczony dzień, od–do) plus ewentualne „Dodatkowe godziny” pod dniem. W komórce widać łączną sumę i zakresy, np. 07:00–16:00 + 16:00–18:00. Jeśli nie ma godzin w liście płac, komórka jest pusta (—), chyba że jest wpis na robocie."},
              {q:"Czy grafik pokazuje dodatkowe godziny?", a:"Tak — grafik (bieżący i w Archiwum) sumuje podstawową zmianę i wszystkie bloki dodatkowych godzin z listy płac. Opis dodatkowych godzin (np. „transport”) widać w panelu pracownika i w PDF/Word, nie w siatce grafiku."},
              {q:"Skąd bierze się adres?", a:"Z Roboty → Pracownicy na robocie → Dodaj wpis z datą tego dnia. Adres pojawia się pod godzinami z ikoną pinezki."},
              {q:"Czy grafik zmienia dane?", a:"Nie — tylko podgląd. Edycja godzin: Lista Płac. Edycja miejsca pracy: Roboty."},
              {q:"Inny tydzień?", a:"Zmień daty u góry (tak jak w Liście Płac) lub kliknij „Bieżący tydzień”."},
            ].map((item,i)=>(
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-sm font-medium flex items-center gap-2"><HelpCircle size={13} className="text-primary shrink-0"/>{item.q}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id:"payroll",
      icon:FileText,
      title:"Lista Płac",
      subtitle:"Jak rozliczać pracowników tygodniowo",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">Lista Płac służy do śledzenia godzin pracy każdego pracownika w danym tygodniu i wyliczania wypłat.</p>
          <div className="space-y-3">
            {[
              {q:"Jak dodać pracownika do tygodnia?", a:'Kliknij "Dodaj pracownika" → zaznacz jednego lub kilku pracowników z listy (lub "Zaznacz wszystkich") → kliknij "Dodaj zaznaczonych". Jeśli tydzień jest pusty, pojawi się też przycisk "Kopiuj z poprzedniego tygodnia" — kliknij go, żeby od razu dodać tych samych co ostatnio.'},
              {q:"Jak wpisać godziny pracy?", a:"Kliknij na pracownika na liście — otworzy się panel z dniami tygodnia. Zaznacz dni kiedy pracował i wpisz godziny od–do. Aplikacja sama policzy ile godzin i ile się należy."},
              {q:"Jak dodać dodatkowe godziny w danym dniu?", a:"W panelu pracownika, pod wybranym dniem kliknij „Dodatkowe godziny w …”. Wpisz opis (np. dogrywka wieczorem, transport), godziny od–do i zapisz. Godziny dodają się do sumy dnia i całego tygodnia — w PDF/Word pojawi się osobna tabelka ze szczegółami."},
              {q:"Co to jest Sob. poprz.?", a:"Sobota poprzedniego tygodnia — wypłacana w bieżącym tygodniu (bo za sobotę płacisz dopiero w następnym). U góry panelu pracownika, na żółtym tle: godziny, zaliczka i przycisk „+ Opis” (np. co robiono albo ilu pracowników wypożyczono innym). Bieżąca sobota (ostatni wiersz Pn–So) to praca w tym tygodniu — czasem wypłata w sobotę zamiast w piątek."},
              {q:"Jak czytać sumy na liście płac?", a:"Kolumna Tydzień = godziny Pn–So bieżącego tygodnia (bez sob. poprz.). Sob.pr. = tylko sobota z poprzedniego tygodnia. Razem h = obie sumy. Na dole tabeli są trzy wiersze: Tydzień Pn–So, Sob. poprz. (jeśli jest) i RAZEM z do wypłaty."},
              {q:"Co to jest zaliczka?", a:"Jeśli pracownik wziął od Ciebie gotówkę z góry (np. na wypłatę w trakcie tygodnia), wpisz kwotę jako zaliczkę w danym dniu. Zostanie odjęta od kwoty do wypłaty."},
              {q:"Co to są koszty do zwrotu?", a:"W panelu pracownika (sekcja pod dniami tygodnia) kliknij „Dodaj” przy „Koszty do zwrotu”. Wpisz opis (chemia, paliwo, zakupy) i kwotę. Te koszty są doliczane do wypłaty — w przeciwieństwie do zaliczki, która jest odejmowana. Wzór: do wypłaty = brutto − zaliczki + koszty do zwrotu."},
              {q:"Jak liczy się wypłata?", a:"Brutto = łączne godziny (w tym dodatkowe) × stawka. Do wypłaty = brutto − suma zaliczek + suma kosztów do zwrotu. Kolumny w tabeli, PDF i Word pokazują te składniki osobno."},
              {q:"Co oznacza status Rozliczony / Oczekuje?", a:'Kiedy wypłacisz pracownikowi należną kwotę, kliknij przycisk "Oczekuje" — zmieni się na zielony "Rozliczony". To tylko znacznik dla Ciebie, żebyś wiedział komu już zapłaciłeś.'},
              {q:"Jak zapisać tydzień do archiwum?", a:'Kliknij "Zapisz tydzień". Dane trafią do Archiwum gdzie możesz je zawsze sprawdzić. W sobotę aplikacja przypomni żebyś nie zapomniał. Jeśli zapis już istnieje, zapyta czy nadpisać.'},
              {q:"Jak przejść do innego tygodnia?", a:'Zmień daty ręcznie lub kliknij "Bieżący tydzień" żeby wrócić do aktualnego. Aplikacja automatycznie archiwizuje poprzedni tydzień przy przejściu.'},
            ].map((item,i)=>(
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-sm font-medium flex items-center gap-2"><HelpCircle size={13} className="text-primary shrink-0"/>{item.q}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex gap-3">
            <FileDown size={16} className="text-primary shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-medium text-primary mb-1">Eksport do PDF i Word</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Przycisk „Podgląd PDF” otwiera dokument w oknie aplikacji. PDF zawiera też ostatnią stronę z przypisaniami do robót (wpisy z kart robót w danym tygodniu). „PDF” zapisuje plik; „Word” generuje .docx.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id:"jobs",
      icon:MapPin,
      title:"Roboty",
      subtitle:"Zarządzanie zleceniami i dokumentami",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">W zakładce Roboty prowadzisz ewidencję wszystkich zleceń — od otwarcia do zdania kluczy. Każda robota ma swoją kartę z dokumentami, pracownikami i kosztami.</p>
          <div className="space-y-3">
            {[
              {q:"Jak założyć nową robotę?", a:'Kliknij "Nowa robota" w lewym górnym rogu. Wpisz adres, numer mieszkania i klienta. Pod polami dat wybierz typ lokalu (Zamienny / Komunalny / Repatrianci — obowiązkowe) oraz kuchenkę (gaz / elektr. / 2 paln.).'},
              {q:"Dokumenty do odbioru — co to jest?", a:"To lista dokumentów które trzeba zebrać żeby zdać robotę. Zaznaczaj je gdy je masz: Zlecenie, Zakres robót, Kosztorys, Kominiarz, Pomiary, Oświadczenia, Gwarancje, Rysunek/Plan. Zdjęcia są opcjonalne. Pasek postępu na liście robót pokazuje ile dokumentów masz już skompletowanych."},
              {q:"Kiedy robota zmienia status na Zdana?", a:"Gdy zaznaczysz wszystkie wymagane dokumenty (bez zdjęć) i wybierzesz typ lokalu. Przycisk „Zdane” ostrzeje, jeśli brakuje dokumentów albo typu lokalu."},
              {q:"Jak dodać czas pracy na robocie?", a:'Roboty → wybierz robotę → „Pracownicy na robocie”. Najszybciej: „Wczoraj → dziś” (ta sama ekipa co wczoraj) lub „Z listy płac” (osoby zaznaczone dziś w liście płac). Ręcznie: „Dodaj wpis” — pracownik, data (domyślnie dziś), 9 h, stawka. Wpis pokazuje adres na Pulpicie i w Grafiku.'},
              {q:"Jak dodać koszty materiałów?", a:'Przewiń do sekcji "Materiały" → kliknij "Dodaj". Wpisz opis i koszt. Materiały sumują się z kosztem pracy i tworzą łączny koszt remontu.'},
              {q:"Jak dodać raport (zakres + wymiary)?", a:'Sekcja „Raporty — zakres i wymiary” na karcie roboty: u góry formularz (taki sam jak u pracownika), na dole lista wysłanych raportów. Możesz też poprosić pracownika o wysłanie z telefonu.'},
              {q:"Jak wyeksportować kartę roboty do PDF?", a:'Kliknij czerwony przycisk "PDF" w nagłówku roboty. Wygeneruje się dokument z dokumentami, pracownikami, materiałami i podsumowaniem kosztów.'},
              {q:"Raporty pracowników — gdzie?", a:"Roboty → wybierz robotę → „Raporty — zakres i wymiary”. Rozwiń wpis — widać punkty, tabelę pomieszczeń i rysunek."},
              {q:"Link podglądu dla klienta", a:"W karcie roboty: sekcja „Podgląd dla klienta” → Utwórz link → Kopiuj. Klient otwiera link bez logowania — widzi tylko zaakceptowane zdjęcia i raporty (bez kosztów). Wyłącz link gdy nie jest już potrzebny."},
              {q:"Historia roboty", a:"Przycisk „Historia” na karcie roboty — log zdarzeń: zdjęcia, dokumenty, emaile, link klienta, zmiany statusu."},
              {q:"Pulpit — szybki dostęp do roboty", a:"W sekcji „Uwaga dziś” i „Roboty w trakcie” kliknij wiersz — aplikacja otworzy od razu tę robotę w zakładce Roboty."},
            ].map((item,i)=>(
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-sm font-medium flex items-center gap-2"><HelpCircle size={13} className="text-primary shrink-0"/>{item.q}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id:"directory",
      icon:Users,
      title:"Pracownicy",
      subtitle:"Kartoteka — dane osobowe i stawki",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">Kartoteka to główna baza pracowników. Dane wpisane tutaj będą dostępne w Liście Płac i Robotach — nie musisz wpisywać ich za każdym razem.</p>
          <div className="space-y-3">
            {[
              {q:"Jak dodać nowego pracownika?", a:'Kliknij "Nowy pracownik". Wpisz imię i nazwisko, telefon, stanowisko (np. Murarz, Elektryk, Kierowca) i domyślną stawkę godzinową. Data zatrudnienia jest opcjonalna.'},
              {q:"Telefon i kod pracownika", a:"Numer w kartotece (np. +48 501 234 567) — pracownik wpisuje 9 ostatnich cyfr przy logowaniu. Dodatkowo ustawia osobisty kod 4 cyfry (jak PIN do karty) przy pierwszym logowaniu — chroni wypłatę przed podglądem przez kolegów. Administrator może ustawić lub zresetować kod w edycji pracownika."},
              {q:"Reset kodu pracownika", a:"Pracownicy → edytuj → sekcja „Kod pracownika” → Resetuj kod. Pracownik ustawi nowy kod przy następnym logowaniu (telefon zostaje bez zmian)."},
              {q:"Konto testowe (np. do sprawdzania panelu pracownika)", a:"W edycji pracownika zaznacz „Konto testowe”. Takie konto może się logować jako pracownik (zdjęcia, raporty), ale nie pojawia się na liście płac, grafiku, pulpicie ani w wyborze pracownika na robocie. Auto-wykrywane dla imienia „test” i numeru +48 000 000 000."},
              {q:"Aplikacja na ekranie telefonu (PWA)", a:"Po wejściu jako pracownik pojawi się baner „Dodaj na ekran”. Na Androidzie — Zainstaluj. Na iPhone (Safari) — Udostępnij → Dodaj do ekranu początkowego. Działa szybciej i trzyma zdjęcia w kolejce offline gdy brak sieci."},
              {q:"Zdjęcia offline i znak wodny", a:"Bez internetu zdjęcia trafiają do kolejki i wysyłają się same po powrocie sieci. Każde zdjęcie ma znak wodny: adres, data i W&G DOM."},
              {q:"Notatka głosowa w raporcie", a:"Przy dodawaniu raportu (zakres prac, wiadomość dla admina) — ikona mikrofonu. Działa w Chrome/Edge na telefonie i komputerze."},
              {q:"Co to jest domyślna stawka?", a:"To stawka PLN za godzinę, którą ten pracownik zwykle zarabia. Będzie się automatycznie podpowiadać w Liście Płac i w Robotach. Możesz ją zmienić dla konkretnego tygodnia lub roboty — bez zmiany tej domyślnej."},
              {q:"Wiele robót dziennie — kiedy włączyć?", a:"Dla kierowcy, logistyki — kogoś kto jeździ po mieście i nie da się wpisać dokładnych godzin na każdej robocie (np. Jarosław). W kartotece zaznacz „Wiele robót dziennie” — wtedy nie pojawia się w alertach spójności na Pulpicie. Godziny liczysz tylko w liście płac."},
              {q:"Karta z archiwum pracownika", a:"Przy pracowniku kliknij ikonę wykresu (📊). Zobaczysz sumę godzin i wypłat w roku, wykres miesięczny oraz listę zapisanych tygodni z archiwum listy płac."},
              {q:"Jak oznaczyć pracownika jako nieaktywnego?", a:"Kliknij okrągły przycisk przy pracowniku (po prawej). Zmieni status na Nieaktywny — pracownik zniknie z list przy dodawaniu do tygodnia, ale jego historia zostanie. Żeby przywrócić — kliknij ponownie."},
            ].map((item,i)=>(
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-sm font-medium flex items-center gap-2"><HelpCircle size={13} className="text-primary shrink-0"/>{item.q}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id:"archive",
      icon:Archive,
      title:"Archiwum",
      subtitle:"Historia tygodni i raport miesięczny",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">Archiwum przechowuje wszystkie zamknięte tygodnie z historią wypłat. Możesz tu sprawdzić ile kto zarobił w dowolnym tygodniu i wygenerować raport miesięczny.</p>
          <div className="space-y-3">
            {[
              {q:"Jak przeglądać archiwum?", a:"U góry wybierz rok, potem miesiąc. Zobaczysz wszystkie tygodnie z tego okresu z podsumowaniem godzin i wypłat. Kliknij tydzień żeby rozwinąć szczegółową listę pracowników."},
              {q:"Jak wygenerować raport miesięczny?", a:'Wybierz miesiąc, potem kliknij czerwony przycisk "Raport miesięczny PDF". Dostaniesz dokument A4 poziomy z: podsumowaniem finansowym (wypłaty, koszty robót, materiały, faktury), tabelą wszystkich robót z tego miesiąca i szczegółowymi listami płac z każdego tygodnia.'},
              {q:"Jak usunąć zapisany tydzień?", a:"Przy każdym tygodniu jest ikona kosza. Kliknij ją → potwierdź. Uwaga: tej operacji nie można cofnąć."},
              {q:"Co jest w archiwum od wersji 1.9?", a:"Pełny tydzień: podsumowanie wypłat (z kolumną kosztów do zwrotu), szczegóły listy płac (dni, godziny, dodatkowe bloki, zaliczki) oraz zapisany grafik z adresami robót. W sobotę aplikacja robi auto-zapis bieżącego tygodnia."},
              {q:"Gdzie zobaczyć stary grafik?", a:"Archiwum → rozwiń tydzień → zakładka Grafik. Starsze wpisy (sprzed 1.9) mają tylko listę płac bez grafiku."},
            ].map((item,i)=>(
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-sm font-medium flex items-center gap-2"><HelpCircle size={13} className="text-primary shrink-0"/>{item.q}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id:"worker",
      icon:HardHat,
      title:"Tryb pracownika",
      subtitle:"Zdjęcia, raporty z budowy i wymiary",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">Na ekranie startowym wybierz <strong>Pracownik</strong> → znajdź się na liście → wpisz <strong>9 ostatnich cyfr telefonu</strong> (bez +48) oraz <strong>swój kod 4 cyfry</strong>. Przy pierwszym logowaniu ustawisz kod sam. Potem wybierz robotę — zdjęcia, raport lub sprawdź wypłatę.</p>
          <div className="space-y-3">
            {[
              {q:"Logowanie — telefon + kod", a:"Telefon potwierdza kim jesteś (9 cyfr z kartoteki). Kod 4 cyfry to Twój osobisty PIN — ustawiasz przy pierwszym logowaniu. Nie podawaj go kolegom. Zapomniałeś? Administrator resetuje kod w kartotece Pracownicy."},
              {q:"Zakładka Roboty", a:"Lista aktywnych remontów. Wybierz robotę → wgrywaj zdjęcia (przed / w trakcie / po), wysyłaj raport z zakresem prac i wymiarami. Bez internetu zdjęcia czekają w kolejce i wyślą się same."},
              {q:"Zakładka Wypłata u pracownika", a:"Kwota do wypłaty w najbliższy piątek, godziny bieżącego tygodnia, zaliczki i koszty do zwrotu (jeśli wpisane). Niżej — archiwum wypłat z zapisanych tygodni. Administrator musi najpierw dodać Cię do listy płac w danym tygodniu."},
              {q:"Ochrona danych wypłat", a:"Logowanie wymaga telefonu i osobistego kodu — kolega nie wejdzie na Twój profil samym numerem. Kwota ukrywa się też gdy przełączysz aplikację (Alt+Tab). Kopiowanie tekstu jest zablokowane."},
              {q:"Jak się zalogować?", a:"Administrator musi wpisać Twój numer w kartotece Pracownicy. Wybierz swoje imię z listy, wpisz telefon i kod. Nie wpisuj ręcznie cudzego imienia."},
              {q:"Jak dodać wiele zdjęć?", a:"W robocie użyj sekcji „Galeria — wiele zdjęć”: wybierz typ (przed/w trakcie/po), kliknij „Wybierz z galerii”, zaznacz wiele zdjęć, podejrzyj miniaturki i „Wyślij”."},
              {q:"Jak wysłać raport z budowy?", a:"Sekcja „Raport z budowy”: wpisz zakres w jednym polu (lista — kropki, numery, podpunkty), wymiary z opisem pomieszczenia lub foto rysunku, na dole „Wiadomość dla admina”. Po wysłaniu możesz edytować lub usunąć raport w „Twoje raporty”."},
              {q:"Opisy zdjęć?", a:"Przy galerii — opis pod każdym zdjęciem przed wysłaniem. Przy aparacie — pole „Opis do następnych zdjęć”. Po wgraniu — edytuj opis lub usuń zdjęcie w „Twoje wgrane zdjęcia”."},
              {q:"Gdzie admin widzi raport?", a:"Roboty → wybierz robotę → „Raporty — zakres i wymiary”. Rozwiń wpis — widać punkty z opisami, tabelę wymiarów, rysunek i wiadomość."},
              {q:"Nie widzę żadnej roboty", a:"Administrator musi dodać robotę ze statusem „w trakcie”. Lista ładuje się z chmury."},
            ].map((item,i)=>(
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-sm font-medium flex items-center gap-2"><HelpCircle size={13} className="text-primary shrink-0"/>{item.q}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id:"inspector",
      icon:ClipboardCheck,
      title:"Panel Inspektora",
      subtitle:"Wrocławskie Mieszkania — podgląd robót bez stawek",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">Na ekranie startowym wybierz <strong>Inspektor</strong> → użytkownik (np. Szymon Szóstak) → hasło. Inspektor widzi wszystkie roboty, ale <strong>bez stawek PLN/h</strong> pracowników. Widzi natomiast kto jest przypisany do roboty i numer telefonu z kartoteki.</p>
          <div className="space-y-3">
            {[
              {q:"Co widać na liście robót?", a:"Adres, klient, status, ikony: czy jest zlecenie PDF, kosztorys NORMA, ile dokumentów zebranych, ile zdjęć zaakceptowanych. Filtry: aktywne / zdane / wszystkie + wyszukiwarka."},
              {q:"Zlecenie i kosztorys", a:"Przy robocie możesz zaznaczyć checkbox „mam zlecenie” / „mam kosztorys” oraz wrzucić plik (zlecenie: PDF; kosztorys: PDF, NOR, XML, DOC z programu NORMA). Status widać na liście — nie musisz pamiętać czy już wysłałeś email."},
              {q:"Dokumenty i zakresy", a:"Checklista dokumentów (zlecenie, zakres, kominiarz, pomiary…). Sekcja raportów pracowników: zakres prac, wymiary pomieszczeń, zdjęcia rysunków z opisami."},
              {q:"Galeria zdjęć", a:"Tylko zdjęcia zaakceptowane przez admina. Pobierz pojedyncze lub „Pobierz wszystkie” z danej roboty."},
              {q:"Kto zarządza kontem inspektora?", a:"Super Administrator (Dawid) w panelu ⚙ — zmiana hasła, dodawanie kolejnych inspektorów. Hasła sync w chmurze jak u adminów."},
              {q:"Gdzie admin widzi zmiany inspektora?", a:"Pulpit → „Uwaga dziś” (nowe zmiany od ostatniego przeczytania) oraz zakładka Inspektor — oś czasu + statystyki logowań. W Robotach sekcja Zlecenie · Kosztorys na żywo."},
              {q:"Instrukcja dla inspektora", a:"W panelu inspektora: przycisk Pomoc / baner przy pierwszym wejściu. Dymki ? przy sekcjach wyjaśniają co kliknąć. Instrukcja opisuje zlecenia, kosztorysy NORMA, dokumenty, zdjęcia i raporty."},
            ].map((item,i)=>(
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-sm font-medium flex items-center gap-2"><HelpCircle size={13} className="text-primary shrink-0"/>{item.q}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id:"changelog",
      icon:ScrollText,
      title:"Historia zmian",
      subtitle:"Co nowego w aplikacji",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">W menu po lewej (lub na dole na telefonie) jest zakładka <strong>Zmiany</strong>. Tam znajdziesz chronologiczną listę aktualizacji — od najnowszej wersji w dół. Domyślnie widać 10 wpisów; na dole możesz przełączać strony albo ustawić 20 lub 50 wpisów na stronie.</p>
          <div className="space-y-3">
            {[
              {q:"Po co jest ta zakładka?", a:"Żebyś wiedział co się zmieniło po aktualizacji — nowe funkcje, poprawki i ulepszenia. Najnowsza wersja jest na górze z zieloną etykietą „Najnowsza”."},
              {q:"Skąd wiem jaka jest moja wersja?", a:"W prawym górnym rogu strony Zmiany widać numer wersji (np. v1.6). Ten sam numer pojawia się przy każdym wpisie w historii."},
              {q:"Czy muszę coś robić po aktualizacji?", a:"Nie — wystarczy odświeżyć stronę. Dane wczytają się z chmury automatycznie. Przeczytaj tylko wpisy „Nowość”, jeśli chcesz skorzystać z nowych przycisków."},
            ].map((item,i)=>(
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-sm font-medium flex items-center gap-2"><HelpCircle size={13} className="text-primary shrink-0"/>{item.q}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id:"cloud-data",
      icon:Cloud,
      title:"Co zapisuje się w chmurze?",
      subtitle:"Które dane są wspólne na wszystkich urządzeniach",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">Wszystko co dodajesz w aplikacji jako dane firmy zapisuje się <strong>lokalnie i w chmurze</strong>. Nie musisz klikać „Zapisz do chmury” — dzieje się to samo po każdej zmianie (ikona chmurki u góry).</p>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5 leading-relaxed">
            <li><strong>Pracownicy</strong> — kartoteka, stawki, telefony, hash kodu pracownika (nie widać kodu — tylko zapisany)</li>
            <li><strong>Kontakty</strong> — odbiorcy email z uprawnieniami: Roboty (materiały z budowy) lub Lista płac</li>
            <li><strong>Lista płac</strong> — godziny (w tym dodatkowe), zaliczki, koszty do zwrotu, rozliczenia; eksport PDF/Word i wysyłka emailem</li>
            <li><strong>Archiwum</strong> — zapisane tygodnie</li>
            <li><strong>Roboty</strong> — adresy, dokumenty, materiały, raporty, wpisy czasu pracy</li>
            <li><strong>Zdjęcia</strong> — pliki w chmurze Supabase Storage; informacja o zdjęciu (kto, kiedy, status) w danych roboty</li>
            <li><strong>Logowanie admina / inspektora</strong> — konta z hasłami jako hash SHA-256, sync w chmurze (<code>kw-admin-passwords</code>). Super Admin zmienia hasła w panelu ⚙. Pliki zlecenia/kosztorysu inspektora zapisują się przy robocie (<code>jobFiles</code>)</li>
          </ul>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-medium text-amber-400 mb-1">Bez internetu</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Możesz pracować dalej — dane zostaną w przeglądarce. Gdy wróci sieć, aplikacja ponowi zapis (czerwona chmurka = sprawdź połączenie i poczekaj chwilę).</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id:"backup",
      icon:Download,
      title:"Kopie zapasowe i synchronizacja",
      subtitle:"Jak nie stracić danych",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">Dane zapisują się automatycznie w chmurze — nie musisz nic robić. Ale warto wiedzieć jak działa system bezpieczeństwa.</p>
          <div className="space-y-3">
            {[
              {q:"Logowanie administratora — konta i role", a:"Panel administracyjny → wybierz użytkownika z listy → wpisz hasło. Super Administrator (Dawid) w ikonie ⚙ może: zmieniać hasła, przełączać rolę Administrator ↔ Moderator oraz dodawać nowych użytkowników (login + hasło + poziom: Admin, Moderator lub Inspektor). Moderator nie widzi stawek PLN/h. Inspektor loguje się osobnym przyciskiem na ekranie startowym."},
              {q:"Logowanie administratora — zapamiętaj hasło", a:"Przy logowaniu możesz zaznaczyć „Zapamiętaj hasło na tym urządzeniu”. Hasło jest szyfrowane lokalnie w przeglądarce — nie wysyła się do chmury. Przy następnym wejściu na tym samym telefonie/komputerze pole hasła wypełni się samo (dla wybranego użytkownika). Wyloguj się ręcznie jeśli korzystasz ze wspólnego urządzenia."},
              {q:"Czy dane mogą zniknąć?", a:"Dane są w przeglądarce i w chmurze Supabase. Każdy zapis scala lokalne z chmurowymi — pustsza wersja nie nadpisze bogatszej. Chmura trzyma kopie prev/prev2 i dzienny pełny backup wszystkich kluczy. Przed sync tworzona jest też lokalna kopia na urządzeniu."},
              {q:"Co oznaczają ikonki chmurki w prawym górnym rogu?", a:"Szara chmurka = wszystko zsynchronizowane. Animowana chmurka ze strzałką = trwa zapis. Zielona chmurka = właśnie zapisano. Czerwona chmurka z X = błąd połączenia (sprawdź internet)."},
              {q:"Co to jest backup i jak go zrobić?", a:'W lewym menu (na komputerze) na dole jest "Eksportuj backup". Kliknij — pobierze się plik .json ze wszystkimi danymi. Trzymaj go w bezpiecznym miejscu (dysk zewnętrzny, Google Drive). Żeby przywrócić dane — kliknij "Importuj backup" i wybierz ten plik (import scala z obecnymi danymi).'},
              {q:"Automatyczny backup emailem", a:"Raz w tygodniu — w sobotę, po zapisaniu tygodnia do archiwum (przycisk „Zapisz tydzień” lub automatyczny zapis w sobotę). Wysyłana jest jedna kopia JSON na adres z ustawień (domyślnie dawid.thai@int.pl). Nie ma już codziennych maili przy każdym wejściu w aplikację. Dodatkowo każdy zapis do chmury tworzy kopie w Supabase (prev / prev2 / dzienna) dla listy płac, archiwum, robót, pracowników i kontaktów."},
              {q:"Utrata danych — co robić?", a:"Menu Dane → „Przywróć wszystkie dane (chmura)” lub „(lokalnie)”. Dla pojedynczych typów: lista płac lub roboty osobno. W Liście płac: „Przywróć z archiwum” dla bieżącego tygodnia. Regularnie rób też Eksport backup na dysk."},
              {q:"Używam dwóch urządzeń — które dane są właściwe?", a:"Przy każdym zapisie aplikacja scala dane z obu źródeł — bogatsze wpisy wygrywają. Stara karta z pustą listą nie nadpisze chmury. Przy pierwszym wejściu na nowym urządzeniu dane pobierają się z chmury i łączą z lokalnymi."},
            ].map((item,i)=>(
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-sm font-medium flex items-center gap-2"><HelpCircle size={13} className="text-primary shrink-0"/>{item.q}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id:"tips",
      icon:Sparkles,
      title:"Przydatne sztuczki",
      subtitle:"Funkcje które ułatwiają pracę",
      content:(
        <div className="space-y-3">
          {[
            {icon:Copy, title:"Kopiuj pracowników z zeszłego tygodnia", desc:"W Liście Płac, gdy tydzień jest pusty, pojawia się przycisk \"Kopiuj z poprzedniego tygodnia\". Kliknij — od razu doda tych samych pracowników co w poprzednim tygodniu. Oszczędzasz czas."},
            {icon:Mic, title:"Dyktowanie notatek głosem", desc:"Przy polu Notatki w robotach jest ikona mikrofonu. Kliknij, powiedz co chcesz wpisać — aplikacja zamieni mowę na tekst. Działa w przeglądarce Chrome na telefonie i komputerze."},
            {icon:Bell, title:"Reminder w sobotę", desc:"W sobotę na Pulpicie pojawia się niebieski baner: zapisz tydzień i rozlicz pracowników. W Liście Płac też jest żółty baner. Po „Zapisz tydzień” wysyłany jest backup emailem (raz na tydzień)."},
            {icon:Scale, title:"Spójność listy płac ↔ roboty", desc:"Porównywana jest suma godzin z listy płac z wpisami na robotach. Pracownik z „Wiele robót dziennie” w kartotece jest pomijany (logistyka, kierowca)."},
            {icon:BarChart3, title:"Karta pracownika z archiwum", desc:"Pracownicy → ikona wykresu przy osobie: roczne godziny, wypłaty, słupki miesięczne i lista tygodni z archiwum."},
            {icon:FileDown, title:"Raport roczny PDF", desc:"Archiwum → wybierz rok → „Raport roczny PDF”: wypłaty × 12 miesięcy, roboty zdane, średni koszt roboczogodziny."},
            {icon:LayoutDashboard, title:"Pulpit — centrum dowodzenia", desc:"Sekcja „Uwaga dziś”: zdjęcia, raporty, paragony, inspektor (nowe zmiany), spójność godzin, dokumenty. Klik w wiersz → otwiera robotę, listę płac lub Inspektora."},
            {icon:CalendarDays, title:"Grafik tygodniowy", desc:"Menu Grafik — cały tydzień na jednym ekranie. Godziny z listy płac (łącznie z dodatkowymi blokami), adres z wpisu na robocie."},
            {icon:Wallet, title:"Koszty do zwrotu vs zaliczka", desc:"Zaliczka = pieniądze wzięte z góry (odejmowane). Koszty do zwrotu = pracownik zapłacił z własnej kieszeni (doliczane). Oba wpisujesz w panelu pracownika w Liście Płac."},
            {icon:Clock, title:"Dodatkowe godziny w dniu", desc:"Pod każdym dniem w panelu pracownika: „Dodatkowe godziny w …” → opis + od–do. Wliczają się do wypłaty, grafiku i PDF."},
            {icon:Search, title:"Globalne wyszukiwanie", desc:"Ikona lupy w prawym górnym rogu. Wpisz imię pracownika lub adres roboty — aplikacja znajdzie to w całej bazie danych."},
            {icon:Users, title:"Filtrowanie robót po pracowniku", desc:"W zakładce Roboty jest rozwijana lista pracowników. Wybierz kogoś — zobaczysz tylko roboty na których ten pracownik miał wpisy czasu pracy."},
            {icon:KeyRound, title:"Zapamiętaj hasło admina", desc:"Przy logowaniu administratora zaznacz „Zapamiętaj hasło na tym urządzeniu” — hasło zostaje zaszyfrowane lokalnie (nie w chmurze). Nie używaj na wspólnym komputerze."},
            {icon:FileDown, title:"PDF z roboty do wysłania klientowi", desc:"Każda robota ma przycisk PDF w nagłówku. Generuje profesjonalny dokument z listą dokumentów, czasem pracy i kosztami — można go od razu wysłać mailowo."},
            {icon:Mail, title:"Email z roboty — zdjęcia i raporty", desc:"Maile z biuro@wgdom.fun. W Kontaktach włącz uprawnienie „Roboty” — tylko te adresy pojawią się przy wysyłce z karty roboty. Wybierz treść (zdjęcia, raport) i wyślij."},
            {icon:Wallet, title:"Email listy płac — PDF i Word", desc:"W Liście płac: Email → wybierz odbiorcę z uprawnieniem „Lista płac” (ustawiasz w Kontaktach). Dołącz PDF i/lub Word; w treści maila tabela jak w PDF."},
          ].map((tip,i)=>(
            <div key={i} className="flex gap-4 bg-secondary/40 rounded-xl p-4 border border-border">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <tip.icon size={15} className="text-primary"/>
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">{tip.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 space-y-3">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <BookOpen size={18} className="text-primary"/>
          </div>
          <div>
            <h1 className="text-lg font-bold">Instrukcja obsługi</h1>
            <p className="text-xs text-muted-foreground">Wszystko co musisz wiedzieć żeby sprawnie korzystać z aplikacji</p>
          </div>
        </div>

        {/* Sections */}
        {sections.map(sec=>(
          <div key={sec.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={()=>setOpen(open===sec.id?null:sec.id)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-secondary/20 transition-colors text-left"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${open===sec.id?"bg-primary/15":"bg-secondary"}`}>
                <sec.icon size={18} className={open===sec.id?"text-primary":"text-muted-foreground"}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">{sec.title}</p>
                <p className="text-xs text-muted-foreground">{sec.subtitle}</p>
              </div>
              <ChevDown size={16} className={`text-muted-foreground transition-transform shrink-0 ${open===sec.id?"rotate-180":""}`}/>
            </button>
            {open===sec.id&&(
              <div className="px-5 pb-5 border-t border-border pt-4">
                {sec.content}
              </div>
            )}
          </div>
        ))}

        <p className="text-xs text-muted-foreground text-center pt-2 pb-4">Masz pytanie? Napisz lub zadzwoń do osoby która skonfigurowała aplikację.</p>
      </div>
    </div>
  );
}

// ─── Changelog ───────────────────────────────────────────────────────────────

/** Przy nowych funkcjach uzupełnij: CHANGELOG, helpSections, navItems.hint, LabelWithHint w formularzach. */
const CHANGELOG: {date:string; version:string; label:string; items:{type:"new"|"fix"|"improve"; text:string}[]}[] = [
  {
    date:"2026-05-27", version:"2.19.10", label:"Lista płac — zapis godzin i odznaczanie dni",
    items:[
      {type:"fix", text:"Lista płac — odznaczenie dnia (np. czwartek) i zmiana godzin zostają po odświeżeniu; chmura nie przywraca starego wpisu"},
    ],
  },
  {
    date:"2026-05-27", version:"2.19.9", label:"Lista płac — zapis stawek",
    items:[
      {type:"fix", text:"Lista płac — zmiana stawki w tygodniu nie znika po odświeżeniu (sync z chmurą nie nadpisywał stawki przy tych samych godzinach)"},
      {type:"new", text:"Lista płac — przycisk „Stawki z kartoteki” (wyrównanie stawek tygodnia do domyślnych z Pracownicy)"},
    ],
  },
  {
    date:"2026-05-27", version:"2.19.8", label:"Reset kodów pracowników",
    items:[
      {type:"improve", text:"Jednorazowy reset wszystkich kodów PIN pracowników — przy pierwszym wejściu po aktualizacji każdy ustawia kod od nowa"},
    ],
  },
  {
    date:"2026-05-27", version:"2.19.7", label:"Naprawa logowania pracownika",
    items:[
      {type:"fix", text:"Logowanie pracownika — naprawiony brakujący hash PIN (przycisk Zaloguj działał jak martwy)"},
      {type:"improve", text:"Przycisk logowania aktywny po wyborze profilu — walidacja telefonu/kodu z komunikatem"},
    ],
  },
  {
    date:"2026-05-27", version:"2.19.6", label:"Inspektor — paginacja aktywności",
    items:[
      {type:"improve", text:"Admin → Inspektor → Aktywność: 10 wpisów na stronę z numeracją stron"},
      {type:"new", text:"Usuwanie pojedynczych wpisów aktywności inspektora (kosz → potwierdź)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.19.5", label:"Roboty — lokal i kuchenka",
    items:[
      {type:"new", text:"Roboty — typ lokalu (Zamienny / Komunalny / Repatrianci) — obowiązkowy przed zdaniem"},
      {type:"new", text:"Roboty — kuchenka (gaz / elektr. / 2 paln.) — kompaktowy wybór w karcie roboty"},
      {type:"improve", text:"Inspektor i Admin → Inspektor — ten sam wybór lokalu i kuchenki; sync z Robotami przez chmurę"},
    ],
  },
  {
    date:"2026-05-26", version:"2.19.4", label:"SMS — komunikat trybu testowego SMSAPI",
    items:[
      {type:"improve", text:"SMS pilne — wyraźniejszy błąd gdy konto SMSAPI jest testowe (tylko numer z rejestracji)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.19.3", label:"SMS — zespół + poprawka zaznaczania",
    items:[
      {type:"improve", text:"SMS pilne — lista obejmuje też adminów, moderatorów, super admina i inspektorów (numery z ⚙ Super Admin)"},
      {type:"fix", text:"SMS — „Wyczyść wybór” naprawdę odznacza wszystkich; domyślnie zaznaczeni wszyscy z numerem"},
    ],
  },
  {
    date:"2026-05-26", version:"2.19.2", label:"SMS — naprawa pola nadawcy SMSAPI",
    items:[
      {type:"fix", text:"SMSAPI — retry bez błędnego SMSAPI_FROM; czytelniejsze komunikaty (konto testowe, zły nadawca)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.19.1", label:"Naprawa wyboru zdjęć z galerii",
    items:[
      {type:"fix", text:"Roboty → raport → Foto rysunku / Z galerii — niezawodny wybór pliku na Windows (admin i pracownik)"},
      {type:"fix", text:"Privacy shield pracownika nie blokuje ekranu podczas systemowego okna wyboru pliku"},
    ],
  },
  {
    date:"2026-05-26", version:"2.19.0", label:"Pakiet dokumentów + SMS pilne",
    items:[
      {type:"new", text:"Roboty — „Pakiet ZIP” jednym kliknięciem: zlecenie, kosztorys, zdjęcia inspektora i zatwierdzone, checklist w README"},
      {type:"new", text:"Pulpit i Pracownicy — „SMS pilne”: ogłoszenie do wszystkich aktywnych lub wybranych (SMSAPI / Twilio w Supabase)"},
      {type:"improve", text:"Endpoint send-sms-bulk — max 50 odbiorców, prefiks SMS_PREFIX opcjonalny"},
    ],
  },
  {
    date:"2026-05-26", version:"2.18.1", label:"Inspektor — mobile UX",
    items:[
      {type:"improve", text:"Kapsułki sekcji i szybkie akcje — min. 44 px (wygodny dotyk na iPhone/Android)"},
      {type:"new", text:"Baner „Dodaj na ekran główny” w panelu inspektora (iOS + Android PWA)"},
      {type:"new", text:"Pull-to-refresh — ciągnij w dół na liście, w robocie i w Portfolio"},
    ],
  },
  {
    date:"2026-05-26", version:"2.18.0", label:"Inspektor — nawigacja i sekcje",
    items:[
      {type:"new", text:"Panel inspektora — dolny pasek: Robót | Portfolio | Pomoc (jak aplikacja mobilna)"},
      {type:"new", text:"Szczegóły roboty — kapsułki sekcji (WM, Pliki, Dok., Ekipa, Raporty, Zdjęcia) z przewijaniem i badge’ami braków"},
      {type:"improve", text:"Szybkie akcje na robocie (wgraj zlecenie, odpowiedź admina…) + wyróżnienie kart z nową notatką"},
    ],
  },
  {
    date:"2026-05-26", version:"2.17.0", label:"Raport — zakres jak w notatniku",
    items:[
      {type:"improve", text:"Zakres prac — jedno pole tekstowe z listą (kropki, numeracja, podpunkty →); Enter kontynuuje styl listy"},
      {type:"improve", text:"Wklejanie z Notatek / Worda — enter i listy zostają; kropki i numeracja się porządkują"},
    ],
  },
  {
    date:"2026-05-26", version:"2.16.1", label:"Telefony — przypisane do osób, nie ról",
    items:[
      {type:"improve", text:"⚙ Super Admin — numer telefonu przy każdym koncie użytkownika (admin, moderator, inspektor), nie ogólnie per rola"},
      {type:"fix", text:"Panel inspektora synchronizuje numery kont z chmury przy odświeżeniu"},
    ],
  },
  {
    date:"2026-05-26", version:"2.16.0", label:"Inspektor — autor treści + telefon kontaktu",
    items:[
      {type:"new", text:"Panel inspektora — przy każdej treści (raport, zdjęcie, plik, notatka) widać kto dodał; najechanie = numer telefonu"},
      {type:"new", text:"⚙ Super Admin — numer telefonu przypisany do każdego użytkownika (sync w chmurze)"},
      {type:"improve", text:"Raporty z Roboty — admin zapisuje własne imię i rolę zamiast ogólnego „Administrator”"},
    ],
  },
  {
    date:"2026-05-26", version:"2.15.2", label:"Inspektor — naprawa wyśrodkowania",
    items:[
      {type:"fix", text:"Zakładka Inspektor — flex-1 w-full jak Kontakty; treść wyśrodkowana w obszarze obok menu, nie przyklejona do sidebara"},
    ],
  },
  {
    date:"2026-05-26", version:"2.15.1", label:"Inspektor — wyśrodkowany layout",
    items:[
      {type:"improve", text:"Zakładka Inspektor (Aktywność, Portfolio WM, szczegóły roboty) — zawartość wyśrodkowana jak Kontakty i Zmiany (max-w-4xl)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.15.0", label:"WM — workflow tylko w Inspektorze",
    items:[
      {type:"improve", text:"Roboty WM — kompaktowy pasek (etap, termin, link) zamiast pełnego panelu inspektora"},
      {type:"improve", text:"Inspektor (admin) — szczegóły roboty WM in-tab: etap, notatki, pliki, upload zlecenia/kosztorysu"},
      {type:"improve", text:"Pulpit — alerty WM i notatki inspektora otwierają robotę w zakładce Inspektor, nie w Robotach"},
    ],
  },
  {
    date:"2026-05-26", version:"2.14.0", label:"Pliki inspektora — podgląd, pobieranie, email ATH",
    items:[
      {type:"new", text:"Roboty — sekcja „Pliki inspektora”: pobierz, podgląd PDF, wyślij na email (pojedynczo lub zaznaczone)"},
      {type:"new", text:"Podgląd kosztorysów ATH/NOR/XML (best-effort) — włączany w ⚙ Super Admin (domyślnie wył.)"},
      {type:"new", text:"Email z załącznikami plików inspektora (zlecenie, kosztorys, zdjęcia) — endpoint send-job-files-email"},
      {type:"improve", text:"Upload kosztorysu — akceptuje pliki .ath (NORMA)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.13.0", label:"Inspektor — komunikacja, feed, upload admina",
    items:[
      {type:"new", text:"Inspektor — alert gdy admin odpowie w notatkach + mini-historia zmian na karcie roboty"},
      {type:"new", text:"Admin może wgrać zlecenie/kosztorys w Robotach; sugestia etapu po uploadzie zlecenia"},
      {type:"new", text:"Pulpit — kafelek „Aktywne WM” → Portfolio WM"},
      {type:"improve", text:"Badge Inspektor = nieprzeczytane (feed + notatki), nie cała historia"},
      {type:"improve", text:"Feed Inspektor: filtry Etapy/Notatki/Zdjęcia; „Oznacz przeczytane” zamiast auto przy wejściu"},
      {type:"improve", text:"Instrukcja inspektora v2.11 (etapy, notatki, portfolio, zdjęcia); dymki ? na tap mobile"},
      {type:"improve", text:"„Przeczytane” alertów sync w chmurze per admin/inspektor; merge etapów = ostatnia zmiana w activityLog"},
      {type:"improve", text:"Statystyki logowań inspektora — przycisk Odśwież w zakładce Inspektor"},
    ],
  },
  {
    date:"2026-05-26", version:"2.12.0", label:"WM — Pulpit alerty, live sync, spójność statusów",
    items:[
      {type:"new", text:"Pulpit „Uwaga dziś” — alerty WM: termin odbioru minął + odbiór w tym tygodniu (link do roboty i Portfolio WM)"},
      {type:"new", text:"Panel inspektora — live sync: odświeżanie przy powrocie do karty, co 45 s, przycisk Odśwież"},
      {type:"improve", text:"Roboty WM — etap odbioru jako jedyne źródło statusu (bez auto-zdania przy dokumentach); naprawa niespójności przy ładowaniu"},
    ],
  },
  {
    date:"2026-05-26", version:"2.11.0", label:"WM — etapy odbioru, notatki, portfolio",
    items:[
      {type:"new", text:"Etap odbioru WM — wspólny status (zlecenie → realizacja → dokumenty → gotowa → odebrana) dla inspektora i admina"},
      {type:"new", text:"Notatki Inspektor ↔ Admin przy robocie + alert na Pulpicie"},
      {type:"new", text:"Planowana data odbioru WM + Portfolio WM (zbiorczy widok braków i terminów)"},
      {type:"new", text:"Zdjęcia inspektora — osobna galeria (usterki, odbiór), upload z telefonu"},
    ],
  },
  {
    date:"2026-05-26", version:"2.10.3", label:"Inspektor — statystyki, alerty, instrukcja",
    items:[
      {type:"new", text:"Admin → Inspektor: statystyki logowań i wejść (7 dni, ostatnie logowanie, per użytkownik)"},
      {type:"new", text:"Pulpit „Uwaga dziś” — alerty gdy inspektor coś zmienił/wgrał (link do roboty i zakładki Inspektor)"},
      {type:"new", text:"Panel inspektora — instrukcja krok po kroku, baner pierwszego wejścia, dymki ? przy sekcjach"},
      {type:"improve", text:"Liczenie logowań/wejść sync w chmurze (kw-inspector-stats)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.10.2", label:"Roboty ↔ Inspektor — wspólne dane",
    items:[
      {type:"improve", text:"Roboty — sekcja Zlecenie · Kosztorys (ptaszki, pliki inspektora, link do osi Inspektor); ta sama siatka dokumentów też się aktualizuje"},
      {type:"improve", text:"Lista robót — badge Zlec./Kosz. na każdej karcie (zielony ptaszek gdy inspektor zaznaczy lub wgra plik)"},
      {type:"fix", text:"Sync chmury — merge dokumentów (OR) i jobFiles między adminem a inspektorem; wgrany plik auto-zaznacza dokument"},
    ],
  },
  {
    date:"2026-05-26", version:"2.10.1", label:"Admin — zakładka Inspektor",
    items:[
      {type:"new", text:"Menu Inspektor — oś czasu zmian inspektora (dokumenty, zlecenia PDF, kosztorysy) z linkiem do roboty"},
      {type:"improve", text:"Historia w Robotach — bez wpisów inspektora; skrót „X zmian inspektora → zakładka Inspektor”"},
      {type:"improve", text:"Inspektor przy zapisie loguje aktywność do activityLog (sync w chmurze z robotą)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.10.0", label:"Panel Inspektora — Wrocławskie Mieszkania",
    items:[
      {type:"new", text:"Logowanie Inspektor — osobny panel dla Szymona Szóstaka (bez stawek pracowników, z telefonami na robocie)"},
      {type:"new", text:"Inspektor — lista robót, galeria zdjęć z pobieraniem, checklista dokumentów, zakresy i wymiary z raportów"},
      {type:"new", text:"Zlecenie PDF — checkbox + upload; kosztorys NORMA/PDF — ikona statusu i wrzucanie pliku przy robocie"},
      {type:"new", text:"Rola Inspektor w ustawieniach ⚙ — Super Admin może dodać kolejnych inspektorów (hasło sync w chmurze)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.21", label:"Mobile iOS/Android — pracownik i admin",
    items:[
      {type:"improve", text:"Pracownik — sticky powrót z roboty, większe przyciski (44px), zakładki 48px, fix podwójnego znaku wodnego w kolejce offline"},
      {type:"improve", text:"Admin mobile — dolne menu: Pulpit / Lista / Grafik / Roboty + Więcej (6 pozycji); ustawienia ⚙ jako sheet od dołu"},
      {type:"fix", text:"iOS — 100dvh + safe-area na logowaniu, font 16px w polach (bez zoom przy focus)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.20", label:"Super Admin — role i nowi użytkownicy",
    items:[
      {type:"new", text:"Ustawienia ⚙ — zmiana roli Administrator ↔ Moderator (Stanisław, Paweł, dodani użytkownicy)"},
      {type:"new", text:"Kreator konta — login, hasło, poziom (Administrator lub Moderator)"},
      {type:"improve", text:"Nowi użytkownicy i role sync w chmurze (kw-admin-users-config)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.19", label:"Super Admin — zmiana haseł użytkowników",
    items:[
      {type:"new", text:"Ikona ustawień (⚙) w prawym górnym rogu — tylko dla Super Administratora"},
      {type:"new", text:"Panel haseł: zmiana hasła dla Dawida, Stanisława i Pawła + przywrócenie hasła startowego"},
      {type:"improve", text:"Hasła adminów sync w chmurze (kw-admin-passwords) — działają na wszystkich urządzeniach"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.18", label:"Panel admin — 3 użytkowników i role",
    items:[
      {type:"new", text:"Logowanie admina — wybór użytkownika (Dawid / Stanisław / Paweł) + hasło (SHA-256, bez plain text w kodzie)"},
      {type:"new", text:"Role: Super Administrator, Administrator, Moderator — moderator bez podglądu stawek PLN/h"},
      {type:"improve", text:"Moderator — ukryte stawki w kartotece, liście płac, robotach; eksport PDF/Word tylko dla adminów"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.17", label:"Panel pracownika — grafik, paragony, status zdjęć",
    items:[
      {type:"new", text:"Tryb pracownika — „Gdzie dziś pracuję?”: adres i godziny z grafiku / wpisu na robocie"},
      {type:"new", text:"Zakładka Grafik — własny tydzień Pn–So (godziny + adresy robót)"},
      {type:"new", text:"Skan paragonu (chemia, paliwo) → koszty do zwrotu u admina po akceptacji"},
      {type:"improve", text:"Pulpit „Uwaga dziś” — alerty: zdjęcia do akceptacji, nowe raporty od pracowników, paragony/faktury"},
      {type:"improve", text:"Status zdjęć z opisem (oczekuje / zaakceptowane / odrzucone) + powód odrzucenia od admina"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.16", label:"Kartoteka — trwałe usuwanie i sync",
    items:[
      {type:"fix", text:"Usunięcie pracownika z kartoteki nie wraca po wylogowaniu — tombstones kw-directory-deleted-ids (jak przy robotach)"},
      {type:"fix", text:"Edycja telefonu / danych pracownika — zapis od razu po „Zapisz”, logowanie pracownika scala z lokalnym stanem"},
      {type:"fix", text:"Serwer Supabase — akceptuje celowe skrócenie kartoteki z listą usuniętych id"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.15", label:"Konto testowe pracownika",
    items:[
      {type:"new", text:"Kartoteka — „Konto testowe”: tylko tryb pracownika (zdjęcia, raporty), bez listy płac, grafiku, pulpitu i wpisów na robotach"},
      {type:"improve", text:"Auto-wykrywanie konta test (imię „test”, telefon +48 000 000 000) — oznaczenie TEST w kartotece"},
      {type:"improve", text:"Istniejący wpis test na liście płac jest automatycznie usuwany po odświeżeniu"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.14", label:"Kod pracownika 4 cyfry",
    items:[
      {type:"new", text:"Logowanie pracownika — telefon + osobisty kod 4 cyfry; pierwsze logowanie: pracownik ustawia kod sam"},
      {type:"new", text:"Kartoteka — admin ustawia lub resetuje kod pracownika; dymki pomocnicze przy polach"},
      {type:"improve", text:"Instrukcja — opis logowania, kodu, resetu i funkcji trybu pracownika (Roboty / Wypłata)"},
      {type:"fix", text:"Odtwarzacz hymnów — panel nie jest przycinany (portal fixed)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.3", label:"Logistyka — bez alertów spójności",
    items:[
      {type:"improve", text:"Pracownik z „Wiele robót dziennie” nie pojawia się w alertach spójności na Pulpicie — wystarczy lista płac"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.13", label:"Odtwarzacz hymnow",
    items:[
      {type:"new", text:"Pasek górny — dyskretny odtwarzacz 4 hymnow firmowych (play, lista, głośność); muzyka w public/music"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.12", label:"Menu — podpowiedzi",
    items:[
      {type:"improve", text:"Lewe menu — po najechaniu delikatny dymek z opisem każdej zakładki"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.11", label:"Galeria zdjęć z robot",
    items:[
      {type:"new", text:"Menu „Zdjęcia” — galeria zaakceptowanych zdjęć pogrupowanych po robotach (Przed / W trakcie / Po)"},
      {type:"new", text:"Po zdaniu mieszkania i kluczy zdjęcia zostają w galerii 30 dni, potem przechodzą do archiwum zdjęć"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.10", label:"Roboty — trwałe usuwanie",
    items:[
      {type:"fix", text:"Usunięte roboty nie wracają po odświeżeniu — zapis do chmury z listą skasowanych id (wymaga deploy funkcji Supabase)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.9", label:"Roboty — usuwanie duplikatów",
    items:[
      {type:"fix", text:"PDF listy płac — scalanie zduplikowanych wpisów tego samego adresu w siatce robót"},
      {type:"improve", text:"Roboty — kosz na liście do usunięcia całej roboty; oznaczenie „Duplikat adresu” gdy ten sam adres jest dwa razy"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.8", label:"PDF — przywrócony układ",
    items:[
      {type:"fix", text:"PDF/Word — cofnięty eksperymentalny układ z v2.9.7; z powrotem ten sam układ co wcześniej, tylko +2 pt czcionki"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.7", label:"PDF — roboty i łamanie stron",
    items:[
      {type:"fix", text:"PDF listy płac — przywrócona tabela „Praca na robotach” (kto, gdzie, godziny) + siatka tygodniowa"},
      {type:"fix", text:"PDF — moduły nie ucinają się przy większej czcionce; nagłówek sekcji osobno, tabela łamie wiersze między stronami"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.6", label:"PDF/Word — większa czcionka",
    items:[
      {type:"improve", text:"Lista płac PDF i Word — powiększone czcionki w tabelach i załącznikach (lepsza czytelność na wydruku)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.5", label:"Pulpit — link do robot",
    items:[
      {type:"improve", text:"Pulpit — alert „Brak dokumentów”: link „Roboty →” jak przy innych alertach w sekcji Uwaga dziś"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.4", label:"Alerty — piątek i sobota",
    items:[
      {type:"improve", text:"Pulpit — alert „Tydzień niezapisany” tylko w sobotę (Pn–Pt tydzień zapisuje się automatycznie w sobotę)"},
      {type:"improve", text:"Pulpit — alert „Nierozliczeni pracownicy” tylko w piątek (dzień rozliczeń)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.2", label:"Logistyka — wiele robót dziennie",
    items:[
      {type:"new", text:"Pracownicy — opcja „Wiele robót dziennie” (kierowca, dostawy): spójność liczy sumę ze wszystkich adresów"},
      {type:"improve", text:"„Popraw” przy spójności — dla logistyki rozdziela godziny z listy płac między roboty (nie jedna robota)"},
      {type:"improve", text:"Roboty — krótki wpis na robocie (domyślnie 2 h) dla pracownika z wieloma robotami dziennie"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.1", label:"Spójność — Popraw + 9 h",
    items:[
      {type:"new", text:"Pulpit — przy rozbieżności godzin przycisk „Popraw”: dopasowuje roboty do listy płac (lista płac ma pierwszeństwo)"},
      {type:"improve", text:"Roboty — domyślnie 9 h przy dodawaniu wpisu; „Wczoraj → dziś” i ręczny wpis biorą godziny z listy płac gdy są"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.0", label:"Pulpit, kartoteka, archiwum",
    items:[
      {type:"new", text:"Pulpit — sekcja „Uwaga dziś”: niezapisany tydzień, nierozliczeni, spójność listy płac ↔ roboty, dokumenty, zdjęcia"},
      {type:"new", text:"Pulpit — alerty rozbieżności godzin (lista płac vs wpisy na robotach)"},
      {type:"new", text:"Pulpit — banner w sobotę: przypomnienie o zapisaniu tygodnia i rozliczeniu pracowników"},
      {type:"new", text:"Pracownicy — karta z archiwum: roczne godziny, wypłaty, wykres miesięczny, lista tygodni"},
      {type:"new", text:"Archiwum — raport roczny PDF: wypłaty × 12 miesięcy, roboty zdane, średni koszt roboczogodziny"},
    ],
  },
  {
    date:"2026-05-26", version:"2.8.1", label:"PDF — siatka pracy na robotach",
    items:[
      {type:"improve", text:"Lista płac PDF — ostatnia strona: siatka tygodniowa (pracownik × dni Pn–So) zamiast długiej listy wiersz po wierszu; uwagi osobno na dole"},
    ],
  },
  {
    date:"2026-05-26", version:"2.8.0", label:"PDF — praca na robotach",
    items:[
      {type:"new", text:"Lista płac PDF — ostatnia strona: kto, na jakiej robocie, ile godzin i koszt (z wpisów w kartach robót)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.9", label:"Lista płac — podgląd PDF",
    items:[
      {type:"new", text:"Lista płac — „Podgląd PDF” w dużym oknie aplikacji (przewijanie, pobieranie z podglądu)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.8", label:"Lista płac — logo w eksporcie",
    items:[
      {type:"improve", text:"PDF, Word i email listy płac — logo W&G DOM obok tytułu „Lista płac”"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.7", label:"Historia zmian — paginacja",
    items:[
      {type:"improve", text:"Zakładka Zmiany — domyślnie 10 wpisów na stronie, przełączanie stron na dole, wybór 10 / 20 / 50 wpisów"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.6", label:"Lista płac — bez stanowiska",
    items:[
      {type:"improve", text:"Logowanie pracownika — na liście widać tylko imię, bez stanowiska"},
      {type:"improve", text:"PDF, Word i e-mail listy płac — usunięto kolumnę Stanowisko ze wszystkich tabel"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.5", label:"PDF/Word — tabela tygodniowa",
    items:[
      {type:"improve", text:"Strona 2 listy płac — jedna tabela: pracownicy w wierszach, dni Pn–So w kolumnach (od–do, dodatkowe, suma dnia)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.4", label:"PDF/Word — rozpis po dniach",
    items:[
      {type:"new", text:"Lista płac PDF i Word — strona 2: szczegółowy rozpis Pn–So (dzień, od–do, podstawa / dodatkowo, zaliczka, uwagi)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.3", label:"Pulpit — poprawne adresy pracowników",
    items:[
      {type:"fix", text:"„Pracuje dziś” nie myli np. „Tomek od Mikołaja” z innym Tomkiem — dopasowanie po ID kartoteki, nie samym imieniu"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.2", label:"Pełna ochrona danych w chmurze",
    items:[
      {type:"fix", text:"Każdy zapis do chmury scala dane — pustsza wersja z innej karty nie nadpisze listy płac, archiwum, pracowników ani kontaktów"},
      {type:"new", text:"Kopie prev/prev2 w Supabase dla wszystkich kluczy + dzienny pełny backup (kw-full-day)"},
      {type:"new", text:"Lokalna kopia wszystkich danych przed synchronizacją (to urządzenie)"},
      {type:"new", text:"Menu Dane → „Przywróć wszystkie dane (chmura / lokalnie)”"},
      {type:"improve", text:"Import backup JSON scala pracowników i kontakty z obecnymi danymi"},
      {type:"improve", text:"Start aplikacji (CloudLoader) scala wszystkie typy danych, nie tylko roboty"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.0", label:"Email listy płac + uprawnienia kontaktów",
    items:[
      {type:"new", text:"Lista płac — przycisk Email: wyślij PDF i/lub Word jako załączniki, treść maila z tabelą jak w PDF"},
      {type:"new", text:"Kontakty — uprawnienia Roboty / Lista płac (osobne listy odbiorców przy wysyłce)"},
      {type:"improve", text:"Eksport PDF/Word listy płac — wspólny moduł (ten sam układ co w emailu)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.7", label:"Lista płac — poprawki UI",
    items:[
      {type:"fix", text:"Status Rozliczony / Oczekuje — pełny napis, bez przycinania w tabeli"},
      {type:"new", text:"Sob. poprz. — „+ Opis” zamiast dodatkowych godzin (notatka o pracy lub wypożyczonych ludziach)"},
      {type:"improve", text:"Panel edycji godzin szerszy — lista płac zwęża się po kliknięciu pracownika; bez poziomego przewijania"},
      {type:"new", text:"Opisy Sob. poprz. w eksporcie PDF i Word"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.6", label:"Sobota poprzedniego tygodnia (Sob.pr.)",
    items:[
      {type:"new", text:"Lista płac — pole Sob. poprz. (sobota z poprzedniego tygodnia, wypłata w bieżącym) z dodatkowymi godzinami i opisem"},
      {type:"new", text:"Osobne sumy: tydzień Pn–So, Sob.pr. i razem — w tabeli, panelu, PDF i Word"},
      {type:"improve", text:"Bieżąca sobota (So) pozostaje w tygodniu — dla wypłat w sobotę zamiast w piątek"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.5", label:"Instrukcja — pełna aktualizacja",
    items:[
      {type:"improve", text:"Instrukcja obsługi uzupełniona o wszystkie funkcje z v2.6.0–2.6.4: wypłata pracownika, koszty, dodatkowe godziny, backup w sobotę, zapamiętaj hasło"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.4", label:"Dodatkowe godziny w dniu",
    items:[
      {type:"new", text:"Lista płac — dodatkowe godziny przypisane do konkretnego dnia (opis + godziny od–do), wliczane do wypłaty"},
      {type:"improve", text:"Grafik i sumy godzin uwzględniają dodatkowe bloki; PDF/Word — tabela szczegółów pod listą płac"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.3", label:"Backup w sobotę + koszty do zwrotu",
    items:[
      {type:"improve", text:"Backup emailem — raz w tygodniu w sobotę, po zapisie tygodnia do archiwum (bez codziennych maili)"},
      {type:"new", text:"Lista płac — koszty do zwrotu pracownikowi (chemia, paliwo, zakupy) — dopłata do wypłaty, osobno od zaliczki"},
      {type:"improve", text:"Kolumna Koszty w tabeli, PDF/Word, archiwum i profil wypłaty pracownika"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.2", label:"Lista płac — panel edycji pracownika",
    items:[
      {type:"fix", text:"Panel boczny (godziny, zaliczki) — przewijanie w pionie i poziomie; szerszy panel na laptopie"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.1", label:"Zapamiętaj hasło admina",
    items:[
      {type:"new", text:"Logowanie administratora — opcja „Zapamiętaj hasło na tym urządzeniu” (szyfrowane lokalnie, bez chmury)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.0", label:"Profil wypłaty pracownika",
    items:[
      {type:"new", text:"Zakładka Wypłata u pracownika — kwota do wypłaty w piątek, godziny i tydzień"},
      {type:"new", text:"Archiwum wypłat pracownika — historia zapisanych tygodni z listy płac"},
      {type:"new", text:"Ochrona danych wypłat — ukrywanie przy przełączeniu aplikacji, zakaz kopiowania, komunikat o zrzutach ekranu"},
    ],
  },
  {
    date:"2026-05-26", version:"2.5.6", label:"Pracownik — głos i rysunek z galerii",
    items:[
      {type:"fix", text:"iPhone: mikrofon nie zawiesza strony — dyktowanie przez 🎤 na klawiaturze (Web Speech API wyłączone na iOS)"},
      {type:"new", text:"Rysunek w raporcie — wybór: zrób zdjęcie aparatem albo wrzuć wcześniejsze z galerii"},
    ],
  },
  {
    date:"2026-05-26", version:"2.5.5", label:"Galeria zdjęć na robocie",
    items:[
      {type:"improve", text:"Zdjęcia pogrupowane: Przed remontem · Po remoncie · W trakcie"},
      {type:"improve", text:"Usuwanie zdjęcia — przycisk ✕ na miniaturze zamiast listy pod spodem"},
    ],
  },
  {
    date:"2026-05-26", version:"2.5.4", label:"Pracownicy na robocie — grupowanie",
    items:[
      {type:"improve", text:"Wpisy pracy grupowane po pracowniku — jeden wiersz z sumą zamiast długiej listy"},
      {type:"new", text:"Rozwijana lista dni — kliknij pracownika z wieloma wpisami, aby zobaczyć daty, godziny i stawki"},
    ],
  },
  {
    date:"2026-05-26", version:"2.5.3", label:"Szybsze wpisy pracowników na robocie",
    items:[
      {type:"improve", text:"Domyślnie 9 godzin przy dodawaniu wpisu (zamiast 8)"},
      {type:"new", text:"„Wczoraj → dziś” — jednym kliknięciem skopiuj wszystkich z wczoraj na dziś (te same stawki i godziny)"},
      {type:"new", text:"Ikona kopiowania przy wierszu — przenieś jednego pracownika na dziś"},
      {type:"new", text:"„Z listy płac” — dodaj na robocie wszystkich zaznaczonych dziś w liście płac (godziny z grafiku lub 9 h)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.5.2", label:"Pulpit — adres tylko z dzisiejszego wpisu",
    items:[
      {type:"fix", text:"„Pracuje dziś” nie pokazuje adresu z innych dni tygodnia — tylko wpis z datą dzisiejszą"},
    ],
  },
  {
    date:"2026-05-25", version:"2.5.1", label:"Ochrona przed utratą robót",
    items:[
      {type:"fix", text:"Chmura nie nadpisze wielu robót jedną — serwer scala dane przy podejrzanym zapisie"},
      {type:"new", text:"Automatyczne kopie: kw-jobs-prev, prev2 i dzienna w Supabase przy każdym zapisie"},
      {type:"new", text:"Lokalne kopie robót (12 ostatnich) przed synchronizacją z chmurą"},
      {type:"new", text:"Przywróć roboty (chmura / lokalnie) — menu Dane w sidebarze"},
      {type:"improve", text:"Start aplikacji scala lokalne i chmurowe roboty zamiast ślepo nadpisywać"},
      {type:"improve", text:"Backup email codziennie przy pierwszym wejściu (nie tylko w poniedziałek)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.5", label:"Pulpit → robota, link klienta, PWA, offline, historia",
    items:[
      {type:"new", text:"Klik z pulpitu otwiera konkretną robotę (zdjęcia, raporty, brak dokumentów, lista aktywnych)"},
      {type:"new", text:"Link podglądu dla klienta — tylko zaakceptowane zdjęcia i raporty (?podglad=TOKEN)"},
      {type:"new", text:"PWA „Dodaj na ekran” — baner instalacji dla pracowników (Android + instrukcja iOS)"},
      {type:"new", text:"Kolejka zdjęć offline — pracownik bez sieci; auto-wysyłka po powrocie internetu"},
      {type:"new", text:"Historia roboty — log zdarzeń (zdjęcia, dokumenty, email, link, status)"},
      {type:"new", text:"Przypomnienie o brakujących dokumentach po 7+ dniach (pulpit i karta roboty)"},
      {type:"new", text:"Notatka głosowa w raporcie pracownika — zakres prac i wiadomość dla admina"},
      {type:"new", text:"Watermark na zdjęciach — adres, data i W&G DOM przed wysłaniem"},
    ],
  },
  {
    date:"2026-05-25", version:"2.4", label:"Email z roboty + lista kontaktów",
    items:[
      {type:"new", text:"Zakładka Kontakty — lista odbiorców email (nazwa, adres, firma)"},
      {type:"new", text:"Przy robocie: przycisk Email — wybór odbiorcy i zaznaczenie zdjęć, zakresu, wymiarów, rysunku"},
      {type:"improve", text:"Można wysłać wszystko lub pojedyncze pozycje; pusty email nie zostanie wysłany"},
    ],
  },
  {
    date:"2026-05-25", version:"2.3", label:"Nowy pulpit — czytelniejszy układ",
    items:[
      {type:"improve", text:"Pulpit przeprojektowany: nagłówek z datą, skróty Grafik / Lista płac / Roboty"},
      {type:"new", text:"Sekcja „Wymaga uwagi”: zdjęcia do akceptacji, raporty pracowników (14 dni), brakujące dokumenty"},
      {type:"improve", text:"„Pracuje dziś” — tylko aktywni (bez długiej listy „wolne”), link do grafiku"},
      {type:"improve", text:"Lista robót z etykietami raportów i oczekujących zdjęć; finanse i archiwum na dole"},
    ],
  },
  {
    date:"2026-05-25", version:"2.2", label:"Edycja raportów i opisy pracownika",
    items:[
      {type:"new", text:"Pracownik może edytować i usuwać swoje raporty (ikona ołówka / kosz)"},
      {type:"new", text:"Opisy: do każdego punktu zakresu, pomieszczenia, rysunku i całego raportu (wiadomość dla admina)"},
      {type:"new", text:"Opisy zdjęć — przy galerii (każde zdjęcie), aparacie i po wgraniu (edycja + usunięcie)"},
      {type:"improve", text:"Admin widzi wszystkie opisy w raportach i pod zdjęciami"},
    ],
  },
  {
    date:"2026-05-25", version:"2.1", label:"Raport admina + uproszczenie robót",
    items:[
      {type:"new", text:"Admin może dodać raport (zakres + wymiary / rysunek) bezpośrednio w Roboty — ten sam formularz co pracownik"},
      {type:"improve", text:"Sekcja raportów: formularz u góry, lista zapisanych poniżej"},
      {type:"improve", text:"Usunięto sekcję Faktura / Rozliczenie z klientem z karty roboty i pulpit"},
    ],
  },
  {
    date:"2026-05-25", version:"2.0", label:"Raporty pracownika — zakres prac i wymiary",
    items:[
      {type:"new", text:"Tryb pracownika: raport z budowy — punkty wykonanych prac + wymiary pomieszczeń (salon, pokoje, kuchnia, korytarz, łazienka, WC)"},
      {type:"new", text:"Alternatywa do wpisywania: zdjęcie rysunku z wymiarami"},
      {type:"new", text:"Panel admina: sekcja „Raporty pracowników” przy robocie — rozwijana lista z datą, zakresem, tabelą wymiarów i rysunkiem"},
      {type:"improve", text:"Lista robót — etykieta z liczbą raportów; pracownik widzi swoje wysłane raporty"},
    ],
  },
  {
    date:"2026-05-25", version:"1.9", label:"Pełne archiwum tygodnia",
    items:[
      {type:"new", text:"Archiwum zapisuje cały tydzień: lista płac (dni, godziny, zaliczki) + grafik + wpisy na robotach"},
      {type:"new", text:"W Archiwum po rozwinięciu tygodnia: zakładki Lista płac | Grafik"},
      {type:"improve", text:"Auto-zapis w sobotę — pełny snapshot bieżącego tygodnia do archiwum"},
      {type:"improve", text:"Przejście na nowy tydzień nadal archiwizuje poprzedni (z pełnymi danymi)"},
      {type:"new", text:"Gotowość pod Vercel + GitHub — konfiguracja przez zmienne VITE_SUPABASE_*"},
    ],
  },
  {
    date:"2026-05-25", version:"1.8", label:"Grafik tygodniowy",
    items:[
      {type:"new", text:"Zakładka Grafik — siatka dni × pracownicy: godziny z listy płac + adres roboty"},
      {type:"new", text:"Przewijanie poziome na telefonie, sticky kolumna z imionami, podświetlenie dzisiejszego dnia"},
      {type:"improve", text:"Ten sam wybór tygodnia co Lista Płac (daty od–do, bieżący tydzień)"},
    ],
  },
  {
    date:"2026-05-25", version:"1.7", label:"Logowanie pracownika & galeria zdjęć",
    items:[
      {type:"new", text:"Pracownik wybiera się z listy kartoteki — hasło to 9 ostatnich cyfr telefonu (bez +48)"},
      {type:"new", text:"Galeria — wybór wielu zdjęć naraz, podgląd przed wysłaniem i pasek postępu"},
      {type:"improve", text:"Bez numeru w kartotece pracownik nie może się zalogować (komunikat dla admina)"},
    ],
  },
  {
    date:"2026-05-25", version:"1.6", label:"Zasady rozwoju & spójna dokumentacja",
    items:[
      {type:"new", text:"Moduł cloud-sync — jeden punkt zapisu do chmury Supabase dla wszystkich danych"},
      {type:"improve", text:"Ustalone zasady: każda trwała zmiana → chmura, wpis w Zmianach, opis w Instrukcji"},
      {type:"new", text:"Instrukcja: sekcje „Historia zmian” i „Co zapisuje się w chmurze”"},
      {type:"fix", text:"Logo aplikacji — poprawiona ścieżka do pliku w projekcie"},
      {type:"fix", text:"Pulpit — lepsze dopasowanie pracownika do roboty (imię, kartoteka, data lokalna, wpisy z tygodnia)"},
      {type:"new", text:"Pulpit — przy „Pracuje dziś” widać ulicę roboty, jeśli pracownik ma wpis czasu na dziś"},
      {type:"fix", text:"Tryb pracownika — naprawione wgrywanie zdjęć (endpoint storage-upload na serwerze Supabase)"},
      {type:"improve", text:"Tryb pracownika — lista robót ładuje się z chmury przy wejściu; czytelniejsze komunikaty błędów"},
    ],
  },
  {
    date:"2026-05-25", version:"1.5", label:"Raport miesięczny & Email backup",
    items:[
      {type:"new", text:"Raport miesięczny PDF — pełny dokument z robotami, listą płac i podsumowaniem finansowym"},
      {type:"new", text:"Auto-backup wysyłany e-mailem co poniedziałek na dawid.thai@int.pl (przez Resend API)"},
      {type:"new", text:"Lista zmian — ta strona"},
    ],
  },
  {
    date:"2026-05-25", version:"1.4", label:"7 usprawnień operacyjnych",
    items:[
      {type:"new", text:"PDF eksport pojedynczej roboty — karta z dokumentami, pracownikami, materiałami i kosztem"},
      {type:"new", text:"Kopiuj pracowników z poprzedniego tygodnia — jeden klik wypełnia listę płac"},
      {type:"new", text:"Filtrowanie robót po pracowniku — dropdown w panelu listy robót"},
      {type:"new", text:"Sobotni reminder — baner przypominający o zamknięciu tygodnia"},
      {type:"new", text:"Potwierdzenie nadpisania archiwum — dialog przed nadpisaniem zapisanego tygodnia"},
      {type:"new", text:"Notatki głosowe (mikrofon) — dyktowanie notatek w robotach (Chrome/Edge)"},
      {type:"new", text:"Auto-backup co poniedziałek — wcześniej pobierał plik lokalnie, teraz wysyła email"},
    ],
  },
  {
    date:"2026-05-24", version:"1.3", label:"Synchronizacja w chmurze (Supabase)",
    items:[
      {type:"new", text:"Synchronizacja danych przez Supabase — dane dostępne na wszystkich urządzeniach"},
      {type:"new", text:"Wskaźnik synchronizacji w topbarze (chmurka zielona/animowana/błąd)"},
      {type:"new", text:"CloudLoader — wczytuje dane z chmury przed startem aplikacji"},
      {type:"new", text:"Zdjęcia jako opcjonalny typ dokumentu w robotach (nie blokuje statusu \"Zdane\")"},
      {type:"improve", text:"Eksport/Import backup JSON z automatycznym push do chmury po imporcie"},
      {type:"fix", text:"Naprawa kalkulacji tygodnia w niedzielę — aplikacja prawidłowo przechodzi na kolejny tydzień"},
    ],
  },
  {
    date:"2026-05-23", version:"1.2", label:"Eksport PDF/Word & Interfejs mobilny",
    items:[
      {type:"new", text:"Eksport listy płac do PDF z polskimi znakami (pdfmake + czcionka Roboto)"},
      {type:"new", text:"Eksport listy płac do Word z polskimi znakami (docx + czcionka Calibri)"},
      {type:"new", text:"Pełna obsługa iPhone i Safari — dynamiczna wysokość (100dvh), safe-area-inset"},
      {type:"new", text:"Dolna nawigacja na urządzeniach mobilnych"},
      {type:"improve", text:"Domyślna godzina rozpoczęcia pracy zmieniona z 08:00 na 07:00"},
      {type:"improve", text:"Automatyczna migracja istniejących pracowników z 08:00 na 07:00"},
    ],
  },
  {
    date:"2026-05-22", version:"1.1", label:"Lista Płac — ulepszenia",
    items:[
      {type:"new", text:"Picker z zaznaczaniem wielu pracowników naraz — \"Zaznacz wszystkich\" i odznaczanie pojedynczo"},
      {type:"new", text:"Automatyczne przejście na bieżący tydzień przy starcie aplikacji"},
      {type:"new", text:"Przycisk \"Bieżący tydzień\" w Lista Płac"},
      {type:"new", text:"Auto-archiwizacja poprzedniego tygodnia przy przejściu do nowego"},
    ],
  },
  {
    date:"2026-05-20", version:"1.0", label:"Pierwsze uruchomienie aplikacji",
    items:[
      {type:"new", text:"Dashboard — przegląd aktywnych robót, wypłat tygodnia, pracujących dziś"},
      {type:"new", text:"Lista Płac — tygodniowe śledzenie godzin, zaliczek i wypłat pracowników"},
      {type:"new", text:"Kartoteka pracowników — dane, stawki, stanowiska, historia zatrudnienia"},
      {type:"new", text:"Archiwum tygodni — historia zapisanych tygodni z podsumowaniami rocznymi/miesięcznymi"},
      {type:"new", text:"Roboty — zarządzanie zleceniami z dokumentami do odbioru, pracownikami i materiałami"},
      {type:"new", text:"Moduł fakturowania — status FV, numer, kwota, wyliczony zysk"},
      {type:"new", text:"Globalne wyszukiwanie pracowników i robót"},
      {type:"new", text:"Dane przechowywane lokalnie w przeglądarce (localStorage)"},
    ],
  },
];

const CHANGELOG_PAGE_SIZES = [10, 20, 50] as const;
type ChangelogPageSize = (typeof CHANGELOG_PAGE_SIZES)[number];

function ChangelogView() {
  const TYPE_STYLE = {
    new:     {bg:"bg-primary/15",    text:"text-primary",       dot:"bg-primary",     label:"Nowość"},
    fix:     {bg:"bg-green-500/15",  text:"text-green-400",     dot:"bg-green-400",   label:"Poprawka"},
    improve: {bg:"bg-blue-500/15",   text:"text-blue-400",      dot:"bg-blue-400",    label:"Ulepszenie"},
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<ChangelogPageSize>(10);

  const total = CHANGELOG.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const rangeFrom = safePage * pageSize + 1;
  const rangeTo = Math.min((safePage + 1) * pageSize, total);

  const visibleReleases = useMemo(
    () => CHANGELOG.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [safePage, pageSize],
  );

  useEffect(() => {
    if (page >= totalPages) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [safePage, pageSize]);

  const goToPage = (next: number) => setPage(Math.max(0, Math.min(totalPages - 1, next)));

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 space-y-2">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <ScrollText size={18} className="text-primary"/>
          </div>
          <div>
            <h1 className="text-lg font-bold">Historia zmian</h1>
            <p className="text-xs text-muted-foreground">
              {total} wersji · wyświetlane {rangeFrom}–{rangeTo}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5">
            <Sparkles size={12} className="text-primary"/>
            <span className="text-xs font-semibold text-primary">v{CHANGELOG[0].version}</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border hidden sm:block"/>

          <div className="space-y-8">
            {visibleReleases.map((release, ri)=>{
              const globalIndex = safePage * pageSize + ri;
              const isLatest = globalIndex === 0;
              return (
              <div key={`${release.version}-${release.date}`} className="relative sm:pl-12">
                {/* Circle on timeline */}
                <div className={`hidden sm:flex absolute left-0 top-3 w-10 h-10 rounded-full items-center justify-center border-2 z-10 shrink-0 ${isLatest?"border-primary bg-primary/15":"border-border bg-card"}`}>
                  <span className="text-[10px] font-bold" style={{color: isLatest?"var(--primary)":"var(--muted-foreground)"}}>{release.version}</span>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  {/* Release header */}
                  <div className={`px-5 py-4 flex items-center justify-between gap-3 ${isLatest?"bg-primary/5 border-b border-primary/20":"border-b border-border"}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="sm:hidden flex items-center justify-center w-8 h-8 rounded-full bg-secondary shrink-0">
                        <span className="text-[10px] font-bold text-muted-foreground">{release.version}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${isLatest?"text-primary":"text-foreground"}`}>{release.label}</span>
                          {isLatest&&<span className="text-[10px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Najnowsza</span>}
                        </div>
                        <span className="text-xs text-muted-foreground">{fmtDate(release.date)}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 font-mono">v{release.version}</span>
                  </div>

                  {/* Items */}
                  <div className="px-5 py-4 space-y-2.5">
                    {release.items.map((item, ii)=>{
                      const s = TYPE_STYLE[item.type];
                      return (
                        <div key={ii} className="flex items-start gap-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${s.bg} ${s.text}`}>{s.label}</span>
                          <p className="text-sm text-foreground/90 leading-relaxed">{item.text}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Stats footer */}
                  <div className="px-5 py-2.5 bg-secondary/30 border-t border-border flex items-center gap-4">
                    {(["new","improve","fix"] as const).map(t=>{
                      const count = release.items.filter(i=>i.type===t).length;
                      if(!count) return null;
                      const s = TYPE_STYLE[t];
                      return <span key={t} className={`text-xs ${s.text}`}>{count}× {s.label.toLowerCase()}</span>;
                    })}
                  </div>
                </div>
              </div>
            );})}
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-8 pt-6 border-t border-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {totalPages > 1 ? (
              <p className="text-xs text-muted-foreground">
                Strona <span className="font-semibold text-foreground">{safePage + 1}</span> z {totalPages}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Wszystkie wpisy na jednej stronie</p>
            )}
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="shrink-0">Wpisy na stronie</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value) as ChangelogPageSize); setPage(0); }}
                className="bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                {CHANGELOG_PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft size={14}/>
                Poprzednia
              </button>
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i).map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToPage(i)}
                    className={`min-w-[2rem] h-8 rounded-lg text-xs font-medium transition-colors ${i === safePage ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage >= totalPages - 1}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Następna
                <ChevronRight size={14}/>
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4 pb-2">W&amp;G DOM — zarządzanie pracą na budowie · Zbudowane przez Dawid T.T. 😊</p>
      </div>
    </div>
  );
}

// ─── Ustawienia admina (Super Administrator) ───────────────────────────────────

function AdminSettingsModal({
  onClose,
  appSettings,
  onAppSettingsChange,
}: {
  onClose: () => void;
  appSettings: AppSettings;
  onAppSettingsChange: (next: AppSettings) => void;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const users = useMemo(() => listAdminUsersForManagement(), [refreshKey]);
  const [drafts, setDrafts] = useState<Record<string, { pw: string; pw2: string; show: boolean }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ userId: string; text: string; ok: boolean } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLogin, setNewLogin] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [newRole, setNewRole] = useState<AdminAssignableRole>("moderator");
  const [newShow, setNewShow] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addMsg, setAddMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [phoneDrafts, setPhoneDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const u of users) {
        if (!next[u.id]) next[u.id] = { pw: "", pw2: "", show: false };
      }
      return next;
    });
    setPhoneDrafts((prev) => {
      const next = { ...prev };
      for (const u of users) {
        if (!(u.id in next)) next[u.id] = u.phone;
      }
      return next;
    });
  }, [users]);

  const reload = () => setRefreshKey((k) => k + 1);

  const updateDraft = (userId: string, patch: Partial<{ pw: string; pw2: string; show: boolean }>) => {
    setDrafts((prev) => ({ ...prev, [userId]: { ...prev[userId], ...patch } }));
    setMsg(null);
  };

  const handlePhoneSave = async (userId: string) => {
    setBusyId(userId);
    setMsg(null);
    try {
      await setAdminUserPhone(userId, phoneDrafts[userId] ?? "");
      reload();
      setMsg({ userId, text: "Numer zapisany", ok: true });
    } catch (err) {
      setMsg({ userId, text: err instanceof Error ? err.message : "Nie udało się zapisać numeru", ok: false });
    } finally {
      setBusyId(null);
    }
  };

  const handleRoleChange = async (userId: string, role: AdminAssignableRole) => {
    setBusyId(userId);
    setMsg(null);
    try {
      await setAdminUserRole(userId, role);
      reload();
      setMsg({ userId, text: `Rola zmieniona na ${adminRoleLabel(role)}`, ok: true });
    } catch (err) {
      setMsg({ userId, text: err instanceof Error ? err.message : "Nie udało się zmienić roli", ok: false });
    } finally {
      setBusyId(null);
    }
  };

  const handleSave = async (userId: string) => {
    const d = drafts[userId];
    if (!d) return;
    if (d.pw.length < 6) {
      setMsg({ userId, text: "Hasło musi mieć co najmniej 6 znaków", ok: false });
      return;
    }
    if (d.pw !== d.pw2) {
      setMsg({ userId, text: "Hasła nie pasują", ok: false });
      return;
    }
    setBusyId(userId);
    setMsg(null);
    try {
      await setAdminUserPassword(userId, d.pw);
      setDrafts((prev) => ({ ...prev, [userId]: { pw: "", pw2: "", show: false } }));
      reload();
      setMsg({ userId, text: "Hasło zmienione — działa na wszystkich urządzeniach po sync", ok: true });
    } catch (err) {
      setMsg({ userId, text: err instanceof Error ? err.message : "Nie udało się zapisać", ok: false });
    } finally {
      setBusyId(null);
    }
  };

  const handleReset = async (userId: string) => {
    if (!window.confirm("Przywrócić hasło fabryczne (startowe) dla tego użytkownika?")) return;
    setBusyId(userId);
    setMsg(null);
    try {
      await resetAdminUserPassword(userId);
      setDrafts((prev) => ({ ...prev, [userId]: { pw: "", pw2: "", show: false } }));
      reload();
      setMsg({ userId, text: "Przywrócono hasło startowe", ok: true });
    } catch (err) {
      setMsg({ userId, text: err instanceof Error ? err.message : "Nie udało się przywrócić", ok: false });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (userId: string, displayName: string) => {
    if (!window.confirm(`Usunąć użytkownika ${displayName}?`)) return;
    setBusyId(userId);
    setMsg(null);
    try {
      await deleteAdminUser(userId);
      reload();
      setMsg(null);
    } catch (err) {
      setMsg({ userId, text: err instanceof Error ? err.message : "Nie udało się usunąć", ok: false });
    } finally {
      setBusyId(null);
    }
  };

  const handleAddUser = async () => {
    setAddMsg(null);
    if (newLogin.trim().length < 2) {
      setAddMsg({ text: "Login musi mieć co najmniej 2 znaki", ok: false });
      return;
    }
    if (newPw.length < 6) {
      setAddMsg({ text: "Hasło musi mieć co najmniej 6 znaków", ok: false });
      return;
    }
    if (newPw !== newPw2) {
      setAddMsg({ text: "Hasła nie pasują", ok: false });
      return;
    }
    setAddBusy(true);
    try {
      await createAdminUser({ login: newLogin.trim(), password: newPw, role: newRole });
      setNewLogin("");
      setNewPw("");
      setNewPw2("");
      setNewRole("moderator");
      setShowAddForm(false);
      reload();
      setAddMsg({ text: "Użytkownik dodany", ok: true });
    } catch (err) {
      setAddMsg({ text: err instanceof Error ? err.message : "Nie udało się dodać użytkownika", ok: false });
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="bg-card rounded-t-2xl sm:rounded-2xl border border-border w-full max-w-lg shadow-2xl max-h-[92dvh] flex flex-col" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-primary"/>
            <span className="text-sm font-semibold">Ustawienia administratorów</span>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X size={16}/>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tylko Super Administrator. Hasła i role synchronizowane w chmurze — obowiązują na telefonie i komputerze.
          </p>

          <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
              Funkcje aplikacji
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={appSettings.athPreviewEnabled}
                onChange={async (e) => {
                  const next = { ...appSettings, athPreviewEnabled: e.target.checked };
                  onAppSettingsChange(next);
                  await saveAppSettings(next);
                }}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">Podgląd kosztorysów ATH/NOR w przeglądarce</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                  Wyłączone domyślnie. Włącz po testach z przykładowym plikiem .ath od inspektora.
                  PDF zawsze można podglądać; pobieranie i email działają niezależnie od tego przełącznika.
                </p>
              </div>
            </label>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Numery kontaktowe użytkowników
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Przy każdym koncie poniżej wpisz numer — inspektor zobaczy go po najechaniu na imię autora treści.
            </p>
          </div>

          {/* Kreator — nowy użytkownik */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
            <button
              type="button"
              onClick={() => { setShowAddForm((v) => !v); setAddMsg(null); }}
              className="w-full flex items-center justify-between gap-2 text-sm font-semibold text-primary"
            >
              <span className="flex items-center gap-2"><UserPlus size={15}/> Dodaj użytkownika</span>
              <ChevronDown size={14} className={`transition-transform ${showAddForm ? "rotate-180" : ""}`}/>
            </button>
            {showAddForm && (
              <div className="space-y-3 pt-1 border-t border-primary/10">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Login (wyświetlany przy logowaniu)</label>
                  <input
                    value={newLogin}
                    onChange={(e) => setNewLogin(e.target.value)}
                    placeholder="np. Jan"
                    className="w-full bg-background rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Poziom dostępu</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as AdminAssignableRole)}
                    className="w-full bg-background rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none"
                  >
                    <option value="admin">Administrator</option>
                    <option value="moderator">Moderator</option>
                    <option value="inspector">Inspektor</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Hasło</label>
                  <div className="relative">
                    <input
                      type={newShow ? "text" : "password"}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="Min. 6 znaków"
                      className="w-full bg-background rounded-lg px-3 py-2.5 pr-10 text-sm border border-border focus:border-primary focus:outline-none"
                    />
                    <button type="button" onClick={() => setNewShow((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <Eye size={14}/>
                    </button>
                  </div>
                  <input
                    type={newShow ? "text" : "password"}
                    value={newPw2}
                    onChange={(e) => setNewPw2(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddUser()}
                    placeholder="Powtórz hasło"
                    className="w-full bg-background rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none"
                  />
                </div>
                {addMsg && <p className={`text-xs ${addMsg.ok ? "text-green-500" : "text-destructive"}`}>{addMsg.text}</p>}
                <button
                  type="button"
                  disabled={addBusy || !newLogin.trim() || !newPw || !newPw2}
                  onClick={handleAddUser}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  {addBusy ? "…" : <><Plus size={12}/> Utwórz konto</>}
                </button>
              </div>
            )}
          </div>

          {users.map((u) => {
            const d = drafts[u.id] ?? { pw: "", pw2: "", show: false };
            const isBusy = busyId === u.id;
            const userMsg = msg?.userId === u.id ? msg : null;
            return (
              <div key={u.id} className="bg-secondary/40 rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{u.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">login: {u.login}{u.isCustom && " · dodany"}</p>
                  </div>
                  {u.role === "super_admin" ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 bg-primary/15 text-primary">
                      Super Admin
                    </span>
                  ) : u.role === "inspector" ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      Inspektor
                    </span>
                  ) : (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${u.passwordCustomized ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {u.passwordCustomized ? "Hasło zmienione" : "Hasło startowe"}
                    </span>
                  )}
                </div>

                {u.canChangeRole && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Poziom dostępu</label>
                    <select
                      value={u.role === "super_admin" ? "admin" : u.role}
                      disabled={isBusy}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as AdminAssignableRole)}
                      className="w-full bg-background rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none disabled:opacity-50"
                    >
                      <option value="admin">Administrator</option>
                      <option value="moderator">Moderator</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      Moderator — bez stawek PLN/h. Administrator — pełny dostęp (na razie).
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Numer telefonu (dla inspektora)</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phoneDrafts[u.id] ?? u.phone}
                      disabled={isBusy}
                      onChange={(e) => setPhoneDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))}
                      onBlur={() => {
                        if ((phoneDrafts[u.id] ?? u.phone) !== u.phone) handlePhoneSave(u.id);
                      }}
                      placeholder="+48 …"
                      className="flex-1 bg-background rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none disabled:opacity-50"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Inspektor zobaczy ten numer po najechaniu na imię {u.displayName} przy treściach w aplikacji.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Nowe hasło</label>
                  <div className="relative">
                    <input
                      type={d.show ? "text" : "password"}
                      value={d.pw}
                      onChange={(e) => updateDraft(u.id, { pw: e.target.value })}
                      placeholder="Min. 6 znaków"
                      className="w-full bg-background rounded-lg px-3 py-2.5 pr-10 text-sm border border-border focus:border-primary focus:outline-none"
                    />
                    <button type="button" onClick={() => updateDraft(u.id, { show: !d.show })} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <Eye size={14}/>
                    </button>
                  </div>
                  <label className="text-xs text-muted-foreground">Potwierdź hasło</label>
                  <input
                    type={d.show ? "text" : "password"}
                    value={d.pw2}
                    onChange={(e) => updateDraft(u.id, { pw2: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && handleSave(u.id)}
                    placeholder="Powtórz hasło"
                    className="w-full bg-background rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none"
                  />
                </div>
                {userMsg && (
                  <p className={`text-xs ${userMsg.ok ? "text-green-500" : "text-destructive"}`}>{userMsg.text}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isBusy || !d.pw || !d.pw2}
                    onClick={() => handleSave(u.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
                  >
                    {isBusy ? "…" : <><Lock size={12}/> Zmień hasło</>}
                  </button>
                  {u.isBuiltin && u.passwordCustomized && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleReset(u.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                    >
                      <RotateCcw size={12}/> Przywróć startowe
                    </button>
                  )}
                  {u.canDelete && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleDelete(u.id, u.displayName)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-xs font-medium text-destructive disabled:opacity-40 transition-colors"
                    >
                      <Trash2 size={12}/> Usuń
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

type View = "dashboard" | "payroll" | "schedule" | "directory" | "contacts" | "archive" | "jobs" | "inspector" | "photos" | "changelog" | "help";

function CloudLoader({children}: {children: React.ReactNode}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const keys = [...DATA_KEYS];
    const fallback = setTimeout(() => setReady(true), 5000);

    fetchKeysFromCloud([...keys, JOBS_DELETED_IDS_KEY, DIRECTORY_DELETED_IDS_KEY, ADMIN_PASSWORDS_KEY, ADMIN_USERS_CONFIG_KEY, APP_SETTINGS_KEY])
      .then(async (allValues) => {
        const values = allValues.slice(0, keys.length);
        const cloudDeleted = normalizeDeletedJobIds(allValues[keys.length]);
        const cloudDirDeleted = normalizeDeletedDirectoryIds(allValues[keys.length + 1]);
        const cloudAdminPw = allValues[keys.length + 2];
        const cloudAdminUsers = allValues[keys.length + 3];
        const mergedDeleted = mergeDeletedJobIds(getDeletedJobIds(), cloudDeleted);
        saveDeletedJobIds(mergedDeleted);
        const mergedDirDeleted = mergeDeletedDirectoryIds(getDeletedDirectoryIds(), cloudDirDeleted);
        saveDeletedDirectoryIds(mergedDirDeleted);

        const localAdminPw = loadAdminPasswordOverrides();
        const mergedAdminPw = mergeAdminPasswordOverrides(localAdminPw, cloudAdminPw);
        if (Object.keys(mergedAdminPw).length > 0) {
          localStorage.setItem(ADMIN_PASSWORDS_KEY, JSON.stringify(mergedAdminPw));
        } else if (cloudAdminPw == null && Object.keys(localAdminPw).length > 0) {
          localStorage.setItem(ADMIN_PASSWORDS_KEY, JSON.stringify(localAdminPw));
        }

        const localAdminUsers = loadAdminUsersConfig();
        const mergedAdminUsers = mergeAdminUsersConfig(localAdminUsers, cloudAdminUsers);
        localStorage.setItem(ADMIN_USERS_CONFIG_KEY, JSON.stringify(mergedAdminUsers));

        const cloudAppSettings = allValues[keys.length + 4];
        if (cloudAppSettings && typeof cloudAppSettings === "object") {
          const localSettings = loadAppSettingsLocal();
          const cloudS = cloudAppSettings as AppSettings;
          const mergedSettings: AppSettings = {
            athPreviewEnabled: cloudS.athPreviewEnabled === true || localSettings.athPreviewEnabled,
          };
          localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(mergedSettings));
        }

        const pushKeys: string[] = [];
        const pushValues: unknown[] = [];

        if (isSupabaseConfigured() && Object.keys(localAdminPw).length > 0 && JSON.stringify(mergedAdminPw) !== JSON.stringify(cloudAdminPw ?? {})) {
          pushKeys.push(ADMIN_PASSWORDS_KEY);
          pushValues.push(mergedAdminPw);
        }
        if (isSupabaseConfigured() && JSON.stringify(mergedAdminUsers) !== JSON.stringify(cloudAdminUsers ?? { roleOverrides: {}, customUsers: [] })) {
          pushKeys.push(ADMIN_USERS_CONFIG_KEY);
          pushValues.push(mergedAdminUsers);
        }

        keys.forEach((key, i) => {
          let cloudVal = values[i];
          let localVal: unknown = null;
          try {
            const raw = localStorage.getItem(key);
            if (raw) localVal = JSON.parse(raw);
          } catch { /* ignore */ }

          const merged = mergeDataKey(key, localVal, cloudVal, mergedDeleted, mergedDirDeleted);
          const hasRealData = merged != null && !(Array.isArray(merged) && merged.length === 0) && merged !== "";
          if (hasRealData || (key === "kw-weekFrom" || key === "kw-weekTo") && merged) {
            localStorage.setItem(key, JSON.stringify(merged));
          }

          if (!isSupabaseConfigured()) return;

          const cloudEmpty = cloudVal == null || (Array.isArray(cloudVal) && cloudVal.length === 0);
          const richnessIncreased =
            key === "kw-week-employees"
              ? weekEmployeesListRichness(merged) > weekEmployeesListRichness(cloudVal) + 1
              : key === "kw-jobs"
                ? normalizeJobsValue(merged).length > normalizeJobsValue(cloudVal).length
                : Array.isArray(merged) && Array.isArray(cloudVal) && merged.length > cloudVal.length;

          const shouldPush =
            (cloudEmpty && hasRealData) ||
            richnessIncreased ||
            (hasRealData && JSON.stringify(merged) !== JSON.stringify(cloudVal));

          if (shouldPush) {
            pushKeys.push(key);
            pushValues.push(merged);
          }
        });

        if (localStorage.getItem(WORKER_PINS_RESET_FLAG) !== "1") {
          try {
            const raw = localStorage.getItem("kw-directory");
            const parsed = raw ? JSON.parse(raw) : [];
            const arr = Array.isArray(parsed) ? parsed : [];
            const { directory: stripped } = stripWorkerPinHashesFromDirectory(arr);
            localStorage.setItem("kw-directory", JSON.stringify(stripped));
            if (isSupabaseConfigured()) {
              await pushKeysToCloud(
                ["kw-directory", DIRECTORY_DELETED_IDS_KEY],
                [stripped, mergedDirDeleted],
                { replaceDirectoryKeys: ["kw-directory"] },
              );
            }
            localStorage.setItem(WORKER_PINS_RESET_FLAG, "1");
          } catch {
            /* ponowi przy następnym wejściu */
          }
        }

        if (pushKeys.length > 0) {
          try {
            await pushKeysToCloud(
              [...pushKeys, JOBS_DELETED_IDS_KEY, DIRECTORY_DELETED_IDS_KEY],
              [...pushValues, mergedDeleted, mergedDirDeleted],
              {
                replaceJobsKeys: pushKeys.includes("kw-jobs") ? ["kw-jobs"] : [],
                replaceDirectoryKeys: pushKeys.includes("kw-directory") ? ["kw-directory"] : [],
              },
            );
          } catch { /* offline */ }
        }
      })
      .catch(() => {})
      .finally(() => { clearTimeout(fallback); setReady(true); });
  }, []);

  if (!ready) return (
    <div style={{fontFamily:"'Inter',sans-serif", height:"100dvh"}} className="flex bg-background text-foreground items-center justify-center flex-col gap-4">
      <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-10 w-auto object-contain"/>
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
        Ładowanie danych...
      </div>
    </div>
  );

  return <>{children}</>;
}

function AppInner({onLogout}: {onLogout?: ()=>void}) {
  const { session: adminSession, canViewRates } = useAdminAccess();
  const week = getWeekRange();
  const [directory, setDirectory] = useLocalStorage<DirectoryEmployee[]>("kw-directory", []);
  const [weekEmployees, setWeekEmployees] = useLocalStorage<WeekEmployee[]>("kw-week-employees", []);
  const [savedWeeks, setSavedWeeks] = useLocalStorage<WeekSnapshot[]>("kw-archive", []);
  const [weekFrom, setWeekFrom] = useLocalStorage("kw-weekFrom", week.from);
  const [weekTo, setWeekTo] = useLocalStorage("kw-weekTo", week.to);
  const [jobs, setJobs] = useLocalStorage<Job[]>("kw-jobs", []);
  const [contacts, setContacts] = useLocalStorage<EmailContact[]>("kw-contacts", []);
  const [view, setView] = useState<View>("dashboard");
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [pendingInspectorJobId, setPendingInspectorJobId] = useState<string | null>(null);
  const [inspectorInitialTab, setInspectorInitialTab] = useState<"activity" | "portfolio">("activity");
  const [alertsSeenTick, setAlertsSeenTick] = useState(0);
  const [pendingPayrollEmpId, setPendingPayrollEmpId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(() => loadAppSettingsLocal());
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle"|"saving"|"saved"|"error"|"offline">("idle");
  const [syncError, setSyncError] = useState("");
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const initialSyncDone = useRef(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [jobsBackupStatus, setJobsBackupStatus] = useState<{ current: number; prev: number; prev2: number; today: number } | null>(null);
  const [payrollBackupStatus, setPayrollBackupStatus] = useState<{ employeesPrev: number; employeesPrev2: number; archivePrev: number } | null>(null);
  const [fullDataBackupStatus, setFullDataBackupStatus] = useState<{ dailyBackupDate: string | null; hasPrev: boolean } | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);

  const productionWeekEmployees = useMemo(
    () => filterProductionWeekEmployees(weekEmployees, directory),
    [weekEmployees, directory],
  );

  useEffect(() => {
    syncAlertsSeenFromCloud().catch(() => {});
  }, []);

  useEffect(() => {
    syncAppSettingsFromCloud().then(setAppSettings).catch(() => {});
  }, []);

  useEffect(() => {
    const normalized = normalizeDirectoryTestFlags(directory);
    if (normalized !== directory) setDirectory(normalized);
  }, [directory, setDirectory]);

  useEffect(() => {
    setWeekEmployees((prev) => {
      const next = filterProductionWeekEmployees(prev, directory);
      return next.length === prev.length ? prev : next;
    });
  }, [directory, setWeekEmployees]);

  useEffect(() => {
    fetchJobsBackupStatus().then(setJobsBackupStatus).catch(() => {});
    fetchPayrollBackupStatus().then((s) => {
      if (s) setPayrollBackupStatus({ employeesPrev: s.employeesPrev, employeesPrev2: s.employeesPrev2, archivePrev: s.archivePrev });
    }).catch(() => {});
    fetchFullDataBackupStatus().then((s) => {
      if (!s?.keys) return;
      const hasPrev = Object.values(s.keys).some((k) => k.prev > 0 || k.prev2 > 0);
      setFullDataBackupStatus({ dailyBackupDate: s.dailyBackupDate, hasPrev });
    }).catch(() => {});
  }, [jobs.length, weekEmployees.length, savedWeeks.length, directory.length, contacts.length]);

  const commitDirectory = useCallback(() => {
    pushDirectoryToCloud(directory).catch(() => {});
  }, [directory]);

  const pushToCloud = pushAllDataToCloud;

  const runCloudSync = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setSyncStatus("offline");
      setSyncError("Brak VITE_SUPABASE_* w Vercel — ustaw zmienne i zrób redeploy");
      return;
    }
    if (jobs.length > 0) saveLocalJobsSnapshot(jobs);
    saveLocalDataSnapshot();
    setSyncStatus("saving");
    setSyncError("");
    try {
      await pushToCloud([directory, weekEmployees, savedWeeks, weekFrom, weekTo, jobs, contacts]);
      setSyncStatus("saved");
      setTimeout(() => setSyncStatus("idle"), 2500);
    } catch (e) {
      setSyncStatus("error");
      setSyncError(e instanceof Error ? e.message : "Błąd połączenia z chmurą");
    }
  }, [directory, weekEmployees, savedWeeks, weekFrom, weekTo, jobs, contacts]);

  // Po CloudLoader (merge chmura↔local) — zapis tylko przy zmianach użytkownika
  useEffect(() => {
    initialSyncDone.current = true;
  }, []);

  // Auto-save to cloud on any data change (debounced 2s, only after initial sync)
  useEffect(() => {
    if (!initialSyncDone.current) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => { runCloudSync(); }, 2000);
  }, [directory, weekEmployees, savedWeeks, weekFrom, weekTo, jobs, contacts, runCloudSync]);

  // Backup
  const exportBackup = () => {
    const data: Record<string,unknown> = {};
    [...DATA_KEYS, ADMIN_PASSWORDS_KEY, ADMIN_USERS_CONFIG_KEY].forEach(k=>{
      const v=localStorage.getItem(k); if(v) data[k]=JSON.parse(v);
    });
    saveAs(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),`backup-${new Date().toISOString().slice(0,10)}.json`);
  };
  const importBackup = (file: File) => {
    const reader=new FileReader();
    reader.onload=async (e)=>{
      try {
        const data=JSON.parse(e.target?.result as string);
        if (data["kw-jobs"] != null) {
          const local = normalizeJobsValue(JSON.parse(localStorage.getItem("kw-jobs") || "[]"));
          data["kw-jobs"] = mergeJobsById(local, normalizeJobsValue(data["kw-jobs"]));
        }
        if (data["kw-week-employees"] != null) {
          const local = JSON.parse(localStorage.getItem("kw-week-employees") || "[]");
          data["kw-week-employees"] = mergeWeekEmployees(local, data["kw-week-employees"]);
        }
        if (data["kw-archive"] != null) {
          const local = JSON.parse(localStorage.getItem("kw-archive") || "[]");
          data["kw-archive"] = mergeArchive(local, data["kw-archive"]);
        }
        if (data["kw-directory"] != null) {
          const local = JSON.parse(localStorage.getItem("kw-directory") || "[]");
          data["kw-directory"] = mergeDirectory(local, data["kw-directory"]);
        }
        if (data["kw-contacts"] != null) {
          const local = JSON.parse(localStorage.getItem("kw-contacts") || "[]");
          data["kw-contacts"] = mergeContacts(local, data["kw-contacts"]);
        }
        Object.entries(data).forEach(([k,v])=>localStorage.setItem(k,JSON.stringify(v)));
        const keys = [...DATA_KEYS, ADMIN_PASSWORDS_KEY, ADMIN_USERS_CONFIG_KEY].filter(k => data[k] != null);
        if (keys.length > 0) {
          await pushKeysToCloud(keys, keys.map((k) => data[k])).catch(() => {});
        }
        window.location.reload();
      } catch { alert("Błąd importu pliku."); }
    };
    reader.readAsText(file);
  };

  const restoreJobsFromCloud = async (source: "prev" | "prev2" | "today") => {
    const labels = { prev: "poprzedni zapis", prev2: "starszą kopię", today: "zapis z dziś" };
    if (!window.confirm(`Przywrócić roboty z chmury (${labels[source]})? Obecna lista zostanie zachowana w kopii.`)) return;
    setRestoreBusy(true);
    try {
      const { count } = await restoreCloudJobsBackup(source);
      const [cloudJobs] = await fetchKeysFromCloud(["kw-jobs"]);
      const merged = mergeJobsById(jobs, normalizeJobsValue(cloudJobs), getDeletedJobIds()) as Job[];
      localStorage.setItem("kw-jobs", JSON.stringify(merged));
      setJobs(merged);
      await pushKeysToCloud(["kw-jobs"], [merged], { replaceJobsKeys: ["kw-jobs"] });
      alert(`Przywrócono ${count} robót z kopii chmurowej. Łącznie w aplikacji: ${merged.length}.`);
      fetchJobsBackupStatus().then(setJobsBackupStatus).catch(() => {});
    } catch (err) {
      alert(err instanceof Error ? err.message : "Nie udało się przywrócić kopii z chmury.");
    } finally {
      setRestoreBusy(false);
    }
  };

  const restoreJobsFromLocal = () => {
    const snaps = listLocalJobsSnapshots();
    if (snaps.length === 0) {
      alert("Brak lokalnych kopii robót na tym urządzeniu.");
      return;
    }
    const latest = snaps[0];
    const when = new Date(latest.at).toLocaleString("pl-PL");
    if (!window.confirm(`Przywrócić ${latest.jobs.length} robót z lokalnej kopii (${when})?`)) return;
    const restored = restoreLocalJobsSnapshot(0);
    if (!restored) { alert("Błąd odczytu lokalnej kopii."); return; }
    const merged = mergeJobsById(jobs, restored, getDeletedJobIds()) as Job[];
    setJobs(merged);
    pushKeysToCloud(["kw-jobs"], [merged], { replaceJobsKeys: ["kw-jobs"] }).catch(() => {});
    alert(`Przywrócono lokalną kopię. Łącznie robot: ${merged.length}.`);
  };

  const restorePayrollFromCloud = async (source: "prev" | "prev2" = "prev") => {
    const label = source === "prev2" ? "starszą kopię" : "poprzedni zapis";
    if (!window.confirm(`Przywrócić listę płac i archiwum z chmury (${label})? Połączy z obecnymi danymi — bogatsze wpisy wygrywają.`)) return;
    setRestoreBusy(true);
    try {
      await restoreCloudPayrollBackup(source);
      const [cloudEmps, cloudArch] = await fetchKeysFromCloud(["kw-week-employees", "kw-archive"]);
      const mergedEmps = mergeWeekEmployees(weekEmployees, cloudEmps ?? []) as WeekEmployee[];
      const mergedArch = mergeArchive(savedWeeks, cloudArch ?? []) as WeekSnapshot[];
      localStorage.setItem("kw-week-employees", JSON.stringify(mergedEmps));
      localStorage.setItem("kw-archive", JSON.stringify(mergedArch));
      setWeekEmployees(mergedEmps);
      setSavedWeeks(mergedArch);
      await pushKeysToCloud(["kw-week-employees", "kw-archive"], [mergedEmps, mergedArch]);
      alert(`Przywrócono listę płac (${mergedEmps.length} prac.) i archiwum (${mergedArch.length} tyg.).`);
      fetchPayrollBackupStatus().then((s) => {
        if (s) setPayrollBackupStatus({ employeesPrev: s.employeesPrev, employeesPrev2: s.employeesPrev2, archivePrev: s.archivePrev });
      }).catch(() => {});
    } catch (err) {
      alert(err instanceof Error ? err.message : "Nie udało się przywrócić listy płac z chmury.");
    } finally {
      setRestoreBusy(false);
    }
  };

  const restoreWeekFromArchive = useCallback(() => {
    const snap = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
    if (!snap?.weekEmployees?.length) {
      alert("Brak pełnego archiwum dla tego tygodnia. Sprawdź zakładkę Archiwum lub import backup JSON (menu Dane).");
      return;
    }
    if (!window.confirm(`Przywrócić godziny, Sob.pr. i dodatkowe wpisy z archiwum (${fmtDate(weekFrom)} – ${fmtDate(weekTo)})?`)) return;
    setWeekEmployees(JSON.parse(JSON.stringify(snap.weekEmployees)) as WeekEmployee[]);
  }, [savedWeeks, weekFrom, weekTo, setWeekEmployees]);

  const restoreAllDataFromCloud = async (source: "prev" | "prev2" | "today" = "prev") => {
    const labels = { prev: "poprzedni zapis", prev2: "starszą kopię", today: "zapis z dziś" };
    if (!window.confirm(`Przywrócić WSZYSTKIE dane firmy z chmury (${labels[source]})? Scalą się z obecnymi — bogatsze wpisy wygrywają.`)) return;
    setRestoreBusy(true);
    try {
      saveLocalDataSnapshot();
      const { restoredKeys } = await restoreAllCloudDataBackup(source);
      const cloudValues = await fetchKeysFromCloud([...DATA_KEYS]);
      const localBundle = readLocalDataBundle();
      const merged = DATA_KEYS.map((key, i) => mergeDataKey(key, localBundle[key], cloudValues[i]));
      for (let i = 0; i < DATA_KEYS.length; i++) {
        localStorage.setItem(DATA_KEYS[i], JSON.stringify(merged[i]));
      }
      await pushAllDataToCloud(merged);
      alert(`Przywrócono z chmury: ${restoredKeys.join(", ")}. Strona się odświeży.`);
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Nie udało się przywrócić danych z chmury.");
    } finally {
      setRestoreBusy(false);
    }
  };

  const restoreAllDataFromLocal = (usePrev = false) => {
    const snaps = listLocalDataSnapshots();
    const pick = snaps.find((s) => s.usePrev === usePrev) ?? snaps[0];
    if (!pick) {
      alert("Brak lokalnej kopii danych na tym urządzeniu.");
      return;
    }
    if (!window.confirm(`Przywrócić dane z kopii lokalnej (${new Date(pick.at).toLocaleString("pl-PL")})?`)) return;
    restoreLocalDataSnapshot(pick.usePrev);
    window.location.reload();
  };

  // Auto-backup email — tylko w sobotę, po zapisie tygodnia do archiwum (patrz triggerWeeklyBackupEmail)

  // Global search results
  const searchResults = useMemo(()=>{
    if(!globalSearch.trim()) return {employees:[],jobs:[]};
    const q=globalSearch.toLowerCase();
    return {
      employees: filterProductionDirectory(directory).filter((d)=>d.name.toLowerCase().includes(q)||d.phone.includes(q)||d.position.toLowerCase().includes(q)),
      jobs: jobs.filter(j=>j.address.toLowerCase().includes(q)||j.client.toLowerCase().includes(q)||j.flatNumber.toLowerCase().includes(q)),
    };
  },[globalSearch,directory,jobs]);

  const addFromDirectory = (ids: string[]) => {
    const toAdd = directory.filter((d) => ids.includes(d.id) && isProductionDirectoryEmployee(d));
    const newEmps = toAdd.map(weekEmployeeFromDir);
    setWeekEmployees((prev)=>[...prev,...newEmps]);
  };

  const removeWeekEmployee = (id:string) => setWeekEmployees((prev)=>prev.filter((e)=>e.id!==id));

  const updateWeekEmployee = useCallback((updated:WeekEmployee)=>{
    setWeekEmployees((prev)=>prev.map((e)=>e.id===updated.id?updated:e));
  },[setWeekEmployees]);

  const syncWeekRatesFromDirectory = useCallback(() => {
    const byId = new Map(directory.map((d) => [d.id, d]));
    setWeekEmployees((prev) =>
      prev.map((emp) => {
        if (!emp.directoryId) return emp;
        const dir = byId.get(emp.directoryId);
        if (!dir?.defaultRate) return emp;
        return { ...emp, rate: dir.defaultRate };
      }),
    );
  }, [directory]);

  const toggleSettled = (id:string) => setWeekEmployees((prev)=>prev.map((e)=>e.id===id?{...e,settled:!e.settled}:e));

  const doSaveWeek = useCallback(() => {
    if (weekEmployees.length === 0) return;
    const existing = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
    const snapshot = buildWeekSnapshot(weekFrom, weekTo, weekEmployees, jobs, existing);
    const nextArchive = existing
      ? savedWeeks.map((w) => (w.id === existing.id ? snapshot : w))
      : [...savedWeeks, snapshot];
    setSavedWeeks(nextArchive);
    setShowSaveConfirm(false);
    triggerWeeklyBackupEmail(weekFrom, weekTo, jobs, nextArchive);
  }, [weekFrom, weekTo, weekEmployees, jobs, savedWeeks, setSavedWeeks]);

  const saveWeek = () => {
    if (weekEmployees.length === 0) return;
    const alreadyExists = savedWeeks.some((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
    if (alreadyExists) { setShowSaveConfirm(true); return; }
    doSaveWeek();
  };

  const autoArchiveAndAdvance = useCallback((targetFrom: string, targetTo: string) => {
    if (weekEmployees.length > 0) {
      const existing = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
      const snapshot = buildWeekSnapshot(weekFrom, weekTo, weekEmployees, jobs, existing);
      if (existing) setSavedWeeks((prev) => prev.map((w) => (w.id === existing.id ? snapshot : w)));
      else setSavedWeeks((prev) => [...prev, snapshot]);
    }
    setWeekFrom(targetFrom);
    setWeekTo(targetTo);
    setWeekEmployees([]);
  }, [weekEmployees, weekFrom, weekTo, savedWeeks, jobs, setSavedWeeks, setWeekFrom, setWeekTo, setWeekEmployees]);

  const goToCurrent = useCallback(() => {
    const c = getWeekRange();
    if(weekFrom === c.from) return;
    autoArchiveAndAdvance(c.from, c.to);
  }, [weekFrom, autoArchiveAndAdvance]);

  // Auto-advance: on mount, if stored week is in the past → archive it, reset to current week
  const autoAdvancedRef = useRef(false);
  useEffect(()=>{
    if(autoAdvancedRef.current) return;
    autoAdvancedRef.current = true;
    const current = getWeekRange();
    if(weekFrom === current.from) return;
    autoArchiveAndAdvance(current.from, current.to);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Auto-archiwum w sobotę — pełny zapis tygodnia (lista płac + grafik) + tygodniowy backup email
  useEffect(() => {
    const today = localIsoDate();
    const isSaturday = new Date().getDay() === 6;
    const lastAuto = localStorage.getItem("kw-last-week-auto-archive");
    const current = getWeekRange();
    if (
      isSaturday &&
      lastAuto !== today &&
      weekFrom === current.from
    ) {
      localStorage.setItem("kw-last-week-auto-archive", today);
      if (weekEmployees.length > 0) {
        const existing = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
        const snapshot = buildWeekSnapshot(weekFrom, weekTo, weekEmployees, jobs, existing);
        const nextArchive = existing
          ? savedWeeks.map((w) => (w.id === existing.id ? snapshot : w))
          : [...savedWeeks, snapshot];
        setSavedWeeks(nextArchive);
        triggerWeeklyBackupEmail(weekFrom, weekTo, jobs, nextArchive);
      } else {
        const archived = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
        if (archived) {
          triggerWeeklyBackupEmail(weekFrom, weekTo, jobs, savedWeeks);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-time migration: fix 08:00 → 07:00 for existing week employees
  useEffect(()=>{
    const needs = weekEmployees.some(e=>DAYS.some(d=>e.days[d].from==="08:00"));
    if(!needs) return;
    setWeekEmployees(prev=>prev.map(e=>({
      ...e,
      days: Object.fromEntries(DAYS.map(d=>[d,{...e.days[d],from:e.days[d].from==="08:00"?"07:00":e.days[d].from}])) as Record<DayKey,DayData>,
    })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const navItems: {key:View;label:string;hint:string;icon:React.ElementType;badge?:number}[] = [
    {key:"dashboard", label:"Pulpit", hint:"Podsumowanie tygodnia, alerty (spójność, dokumenty, zdjęcia) i szybkie skróty.", icon:LayoutDashboard},
    {key:"payroll", label:"Lista Płac", hint:"Godziny, stawki, zaliczki i wypłaty za bieżący tydzień. Eksport PDF i Word.", icon:FileText},
    {key:"schedule", label:"Grafik", hint:"Kto pracuje którego dnia — widok Pn–So na podstawie listy płac.", icon:CalendarDays, badge:productionWeekEmployees.length || undefined},
    {key:"directory", label:"Pracownicy", hint:"Kartoteka: dane, stawki, telefony, kod 4-cyfrowy, konto testowe, archiwum.", icon:Users, badge:filterProductionActiveDirectory(directory).length},
    {key:"contacts", label:"Kontakty", hint:"Adresy e-mail klientów i współpracowników — do wysyłki z robot.", icon:Mail, badge:contacts.filter(c=>c.email.trim()).length||undefined},
    {key:"archive", label:"Archiwum", hint:"Zapisane tygodnie list płac, raporty miesięczne i podsumowania roczne.", icon:Archive, badge:savedWeeks.length||undefined},
    {key:"jobs", label:"Roboty", hint:"Adresy remontów: dokumenty, czas pracy, materiały, zdjęcia i raporty.", icon:MapPin, badge:(()=>{ const pend=jobs.reduce((s,j)=>s+(j.photos||[]).filter(p=>p.status==="pending").length,0); return pend>0?pend:jobs.filter(j=>j.status==="in_progress").length||undefined; })()},
    {key:"inspector", label:"Inspektor", hint:"Zmiany inspektora: dokumenty, zlecenia PDF i kosztorysy — osobno od kart robót.", icon:ClipboardCheck, badge:(()=>{ const notes=jobsWithInspectorNotesNeedingAdmin(jobs,getAdminJobNotesSeenAt(adminSession?.id)); const n=countUnseenInspectorAlerts(jobs,adminSession?.id,notes.length); return n>0?n:undefined; })()},
    {key:"photos", label:"Zdjęcia", hint:"Zaakceptowane zdjęcia z robot — galeria i archiwum po 30 dniach od zdania.", icon:Images, badge:(()=>{ const n=jobs.reduce((s,j)=>{ const b=jobGalleryBucket(j); return b==="active"||b==="grace"?s+jobApprovedPhotos(j).length:s;},0); return n||undefined; })()},
    {key:"changelog", label:"Zmiany", hint:"Co nowego w aplikacji — historia wersji i poprawek.", icon:ScrollText},
    {key:"help", label:"Instrukcja", hint:"Pomoc krok po kroku: lista płac, roboty, grafik i typowe pytania.", icon:BookOpen},
  ];

  const MOBILE_NAV_PRIMARY: View[] = ["dashboard", "payroll", "schedule", "jobs"];
  const mobileNavPrimary = navItems.filter((n) => MOBILE_NAV_PRIMARY.includes(n.key));
  const mobileNavMore = navItems.filter((n) => !MOBILE_NAV_PRIMARY.includes(n.key));
  const mobileMoreActive = mobileNavMore.some((n) => n.key === view);

  const totalNet = productionWeekEmployees.reduce((s,e)=>s+calcWeekEmployee(e).netPay,0);

  const handleNavigate = useCallback((v: View | "payroll" | "directory" | "archive" | "jobs" | "schedule", jobId?: string, payrollEmpId?: string, inspectorTab?: "activity" | "portfolio") => {
    if (jobId) {
      if (v === "inspector") setPendingInspectorJobId(jobId);
      else setPendingJobId(jobId);
    }
    if (payrollEmpId) setPendingPayrollEmpId(payrollEmpId);
    if (inspectorTab) setInspectorInitialTab(inspectorTab);
    else if (v !== "inspector") setInspectorInitialTab("activity");
    setView(v as View);
    setMobileMoreOpen(false);
  }, []);

  return (
    <div className="flex bg-background text-foreground overflow-hidden" style={{fontFamily:"'Inter', sans-serif", height:"100dvh"}}>

      {/* Sidebar — desktop only */}
      <aside className={`hidden sm:flex flex-col border-r border-border bg-card transition-all duration-300 shrink-0 ${sidebarOpen?"w-56":"w-0 overflow-hidden"}`}>
        {/* Logo */}
        <div className="flex flex-col gap-1.5 px-4 py-4 border-b border-border">
          <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-8 w-auto object-contain object-left"/>
          <p className="text-xs text-muted-foreground font-medium tracking-wide">Zarządzanie Pracą</p>
        </div>

        {/* Nav */}
        <nav className="px-3 py-4 space-y-1 border-b border-border">
          {navItems.map(({key,label,hint,icon:Icon,badge})=>(
            <NavItemWithHint key={key} hint={hint}>
              <button onClick={()=>setView(key)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${view===key?"bg-primary/15 text-primary":"text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                <Icon size={15}/>
                <span className="flex-1 text-left">{label}</span>
                {badge!==undefined&&badge>0&&<span className={`text-xs px-1.5 py-0.5 rounded-full ${view===key?"bg-primary/20 text-primary":"bg-secondary text-muted-foreground"}`}>{badge}</span>}
              </button>
            </NavItemWithHint>
          ))}
        </nav>

        {/* Week summary */}
        <div className="px-4 py-4 flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Bieżący tydzień</p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Pracownicy</span><span className="font-medium" style={{fontFamily:"'JetBrains Mono', monospace"}}>{productionWeekEmployees.length}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Okres</span><span className="font-medium" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtDate(weekFrom).slice(0,5)}–{fmtDate(weekTo).slice(0,5)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Rozliczeni</span><span className="font-medium" style={{fontFamily:"'JetBrains Mono', monospace"}}>{productionWeekEmployees.filter(e=>e.settled).length}/{productionWeekEmployees.length}</span></div>
            <div className="pt-2 mt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-0.5">Do wypłaty</p>
              <p className="text-lg font-bold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(totalNet)} PLN</p>
            </div>
          </div>
        </div>

        {/* Backup */}
        <div className="px-3 pb-4 space-y-1.5 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider px-1 mb-2">Dane</p>
          <button onClick={exportBackup} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <Download size={13}/>Eksportuj backup
          </button>
          <label className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer">
            <Upload size={13}/>Importuj backup
            <input type="file" accept=".json" className="hidden" onChange={e=>e.target.files?.[0]&&importBackup(e.target.files[0])}/>
          </label>
          {jobsBackupStatus && (jobsBackupStatus.prev > 0 || jobsBackupStatus.prev2 > 0) && (
            <p className="text-[10px] text-muted-foreground px-1 leading-snug">
              Kopie chmury: {jobsBackupStatus.prev} / {jobsBackupStatus.prev2} rob.
              {fullDataBackupStatus?.dailyBackupDate ? ` · dzienna ${fullDataBackupStatus.dailyBackupDate}` : ""}
            </p>
          )}
          {listLocalDataSnapshots().length > 0 && (
            <p className="text-[10px] text-muted-foreground px-1 leading-snug">
              Lokalna kopia: {new Date(listLocalDataSnapshots()[0].at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}
            </p>
          )}
          <button
            type="button"
            disabled={restoreBusy || !fullDataBackupStatus?.hasPrev}
            onClick={() => restoreAllDataFromCloud("prev")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10 transition-colors disabled:opacity-40"
          >
            <RotateCcw size={13}/>Przywróć wszystkie dane (chmura)
          </button>
          <button
            type="button"
            disabled={restoreBusy || listLocalDataSnapshots().length === 0}
            onClick={() => restoreAllDataFromLocal(false)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
          >
            <RotateCcw size={13}/>Przywróć wszystkie dane (lokalnie)
          </button>
          <button
            type="button"
            disabled={restoreBusy || !payrollBackupStatus?.employeesPrev}
            onClick={() => restorePayrollFromCloud("prev")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10 transition-colors disabled:opacity-40"
          >
            <RotateCcw size={13}/>Przywróć listę płac (chmura)
          </button>
          <button
            type="button"
            disabled={restoreBusy || !jobsBackupStatus?.prev}
            onClick={() => restoreJobsFromCloud("prev")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10 transition-colors disabled:opacity-40"
          >
            <RotateCcw size={13}/>Przywróć roboty (chmura)
          </button>
          <button
            type="button"
            disabled={restoreBusy || listLocalJobsSnapshots().length === 0}
            onClick={restoreJobsFromLocal}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
          >
            <RotateCcw size={13}/>Przywróć roboty (lokalnie)
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <div className="flex items-center gap-2 px-3 sm:px-5 py-3 sm:py-3.5 border-b border-border bg-card shrink-0" style={{paddingTop:"max(0.75rem, env(safe-area-inset-top))"}}>
          {/* Desktop: sidebar toggle */}
          <button onClick={()=>setSidebarOpen(v=>!v)} className="hidden sm:flex p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <Users size={15}/>
          </button>
          {/* Mobile: logo */}
          <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-6 w-auto object-contain sm:hidden"/>
          {/* Desktop: collapsed nav */}
          {!sidebarOpen&&<div className="hidden sm:flex gap-1">
            {navItems.map(({key,label,icon:Icon})=>(
              <button key={key} onClick={()=>setView(key)} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${view===key?"bg-primary/15 text-primary":"text-muted-foreground hover:bg-secondary"}`}><Icon size={12}/>{label}</button>
            ))}
          </div>}
          <ChevronRight size={13} className="text-muted-foreground/40 hidden sm:block"/>
          <h2 className="text-sm font-semibold truncate min-w-0">{navItems.find(n=>n.key===view)?.label}</h2>
          {adminSession && (
            <span className="hidden md:inline text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full truncate max-w-[180px]" title={adminRoleLabel(adminSession.role)}>
              {adminSession.displayName}
            </span>
          )}
          <div className="ml-auto flex items-center gap-0.5 sm:gap-2 shrink-0">
            <div className="hidden sm:block"><CompanyMusicPlayer /></div>
            {view==="payroll"&&canViewRates&&<span className="text-xs text-muted-foreground hidden sm:block" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(totalNet)} PLN · {productionWeekEmployees.length} prac.</span>}
            {view==="schedule"&&<span className="text-xs text-muted-foreground hidden sm:block">{fmtDate(weekFrom)} – {fmtDate(weekTo)} · {productionWeekEmployees.length} prac.</span>}
            {view==="jobs"&&<span className="text-xs text-muted-foreground hidden sm:block">{jobs.filter(j=>j.status==="in_progress").length} aktywne · {jobs.filter(j=>j.status==="completed").length} zdane</span>}
            {/* Backup na mobile (na desktopie jest w sidebarze) */}
            <button type="button" onClick={exportBackup} title="Eksportuj backup" className="sm:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <Download size={16}/>
            </button>
            <label title="Importuj backup" className="sm:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground cursor-pointer">
              <Upload size={16}/>
              <input type="file" accept=".json" className="hidden" onChange={e=>e.target.files?.[0]&&importBackup(e.target.files[0])}/>
            </label>
            {/* Sync indicator — kliknij przy błędzie, aby ponowić */}
            <button
              type="button"
              onClick={() => (syncStatus === "error" || syncStatus === "offline") && runCloudSync()}
              className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg ${syncStatus === "error" || syncStatus === "offline" ? "hover:bg-secondary cursor-pointer" : "cursor-default"}`}
              title={
                syncStatus === "saving" ? "Zapisywanie..."
                : syncStatus === "saved" ? "Zsynchronizowano"
                : syncStatus === "error" ? `Błąd synchronizacji — kliknij, aby ponowić${syncError ? `\n${syncError}` : ""}`
                : syncStatus === "offline" ? syncError || "Chmura niedostępna — brak konfiguracji"
                : "Zsynchronizowano"
              }
            >
              {syncStatus==="saving"&&<CloudUpload size={15} className="text-muted-foreground animate-pulse"/>}
              {syncStatus==="saved"&&<Cloud size={15} className="text-green-500"/>}
              {syncStatus==="error"&&<CloudOff size={15} className="text-destructive"/>}
              {syncStatus==="offline"&&<CloudOff size={15} className="text-yellow-500"/>}
              {syncStatus==="idle"&&<Cloud size={15} className="text-muted-foreground/40"/>}
            </button>
            <button onClick={()=>setShowSearch(v=>!v)} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <Search size={16}/>
            </button>
            {adminSession && adminIsSuperAdmin(adminSession.role) && (
              <button onClick={()=>setShowAdminSettings(true)} title="Ustawienia administratorów" className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                <Settings size={16}/>
              </button>
            )}
            {onLogout && (
              <button onClick={onLogout} title="Wyloguj" className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                <LogOut size={16}/>
              </button>
            )}
          </div>
        </div>

        {/* Global search panel */}
        {showSearch && (
          <div className="border-b border-border bg-card px-4 py-3 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input autoFocus type="text" placeholder="Szukaj pracownika, adresu, klienta..." value={globalSearch}
                onChange={e=>setGlobalSearch(e.target.value)}
                onKeyDown={e=>e.key==="Escape"&&(setShowSearch(false),setGlobalSearch(""))}
                className="w-full bg-secondary rounded-lg pl-8 pr-10 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"/>
              <button onClick={()=>{setShowSearch(false);setGlobalSearch("");}} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={14}/></button>
            </div>
            {globalSearch.trim() && (
              <div className="bg-background rounded-xl border border-border overflow-hidden max-h-64 overflow-y-auto">
                {searchResults.employees.length===0&&searchResults.jobs.length===0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Brak wyników</p>
                ) : (
                  <>
                    {searchResults.employees.length>0&&(<>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider px-4 py-2 border-b border-border bg-card">Pracownicy</p>
                      {searchResults.employees.map(e=>(
                        <button key={e.id} onClick={()=>{setView("directory");setShowSearch(false);setGlobalSearch("");}} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-secondary transition-colors border-b border-border/50">
                          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">{e.name?e.name[0].toUpperCase():"?"}</div>
                          <div><p className="text-sm font-medium">{e.name}</p><p className="text-xs text-muted-foreground">{e.position||"—"} · {e.phone||"—"}</p></div>
                        </button>
                      ))}
                    </>)}
                    {searchResults.jobs.length>0&&(<>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider px-4 py-2 border-b border-border bg-card">Roboty</p>
                      {searchResults.jobs.map(j=>(
                        <button key={j.id} onClick={()=>{setView("jobs");setShowSearch(false);setGlobalSearch("");}} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-secondary transition-colors border-b border-border/50">
                          <MapPin size={14} className="text-muted-foreground shrink-0"/>
                          <div><p className="text-sm font-medium">{j.address||"Bez adresu"}{j.flatNumber&&` m.${j.flatNumber}`}</p><p className="text-xs text-muted-foreground">{j.client||"—"} · {j.status==="completed"?"Zdane":"W trakcie"}</p></div>
                        </button>
                      ))}
                    </>)}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex flex-1 min-h-0 overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0">
          {view==="dashboard"&&<DashboardView jobs={jobs} directory={directory} weekEmployees={productionWeekEmployees} weekFrom={weekFrom} weekTo={weekTo} savedWeeks={savedWeeks} onNavigate={handleNavigate} onFixJobs={setJobs} adminUserId={adminSession?.id} alertsSeenTick={alertsSeenTick} onAlertsSeen={()=>setAlertsSeenTick(t=>t+1)} onOpenSms={()=>setShowSmsModal(true)}/>}
          {view==="payroll"&&<PayrollView weekEmployees={productionWeekEmployees} weekFrom={weekFrom} weekTo={weekTo} directory={directory} contacts={contacts} jobs={jobs} onWeekChange={(f,t)=>{setWeekFrom(f);setWeekTo(t);}} onToggleSettled={toggleSettled} onSaveWeek={saveWeek} savedWeeks={savedWeeks} onAddFromDirectory={addFromDirectory} onRemoveWeekEmployee={removeWeekEmployee} onUpdateWeekEmployee={updateWeekEmployee} onSyncRatesFromDirectory={syncWeekRatesFromDirectory} onGoToCurrent={goToCurrent} onManageContacts={()=>setView("contacts")} onRestoreFromArchive={restoreWeekFromArchive} initialEmpId={pendingPayrollEmpId} onInitialEmpConsumed={()=>setPendingPayrollEmpId(null)}/>}
          {view==="schedule"&&<ScheduleView weekEmployees={productionWeekEmployees} weekFrom={weekFrom} weekTo={weekTo} jobs={jobs} directory={directory} onWeekChange={(f,t)=>{setWeekFrom(f);setWeekTo(t);}} onGoToCurrent={goToCurrent} onOpenPayroll={()=>setView("payroll")}/>}
          {view==="directory"&&<DirectoryView directory={directory} savedWeeks={savedWeeks} onChange={setDirectory} onCommit={commitDirectory} onOpenSms={()=>setShowSmsModal(true)}/>}
          {view==="contacts"&&<ContactsView contacts={contacts} onChange={setContacts}/>}
          {view==="archive"&&<ArchiveView savedWeeks={savedWeeks} onDelete={(id)=>setSavedWeeks(prev=>prev.filter(w=>w.id!==id))} jobs={jobs} directory={directory}/>}
          {view==="jobs"&&<JobsView jobs={jobs} setJobs={setJobs} directory={directory} contacts={contacts} onManageContacts={()=>setView("contacts")} initialJobId={pendingJobId} onInitialJobConsumed={()=>setPendingJobId(null)} weekEmployees={productionWeekEmployees} weekFrom={weekFrom} onGoToInspector={(jobId)=>{ if (jobId) setPendingInspectorJobId(jobId); setView("inspector"); }}/>}
          {view==="inspector"&&<InspectorAdminView jobs={jobs} setJobs={setJobs} directory={directory} adminUserId={adminSession?.id} adminDisplayName={adminSession?.displayName || "Administrator"} adminRole={adminSession?.role} initialTab={inspectorInitialTab} initialJobId={pendingInspectorJobId} onInitialJobConsumed={()=>setPendingInspectorJobId(null)} contacts={contacts} athPreviewEnabled={appSettings.athPreviewEnabled} onAlertsSeen={()=>setAlertsSeenTick(t=>t+1)}/>}
          {view==="photos"&&<JobPhotosGalleryView jobs={jobs} onOpenJob={(id)=>{ setPendingJobId(id); setView("jobs"); }}/>}
          {view==="changelog"&&<ChangelogView/>}
          {view==="help"&&<HelpView/>}
        </div>

        {/* Mobile bottom nav — 4 główne + Menu (iOS/Android) */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex z-40" style={{paddingBottom:"env(safe-area-inset-bottom)"}}>
          {mobileNavPrimary.map(({key,icon:Icon,badge})=>(
            <button key={key} onClick={()=>{setView(key);setMobileMoreOpen(false);}} className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[52px] py-2 relative transition-colors ${view===key?"text-primary":"text-muted-foreground"}`}>
              <div className="relative">
                <Icon size={22}/>
                {badge!==undefined&&badge>0&&<span className="absolute -top-1 -right-1.5 min-w-4 h-4 flex items-center justify-center text-[9px] font-bold rounded-full bg-primary text-primary-foreground px-0.5">{badge>99?"99+":badge}</span>}
              </div>
              <span className="text-[10px] font-medium leading-none">{navItems.find(n=>n.key===key)?.label.split(" ")[0]}</span>
            </button>
          ))}
          <button type="button" onClick={()=>setMobileMoreOpen(true)} className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[52px] py-2 relative transition-colors ${mobileMoreActive?"text-primary":"text-muted-foreground"}`}>
            <Menu size={22}/>
            <span className="text-[10px] font-medium leading-none">Więcej</span>
          </button>
        </nav>

        {mobileMoreOpen && (
          <div className="sm:hidden fixed inset-0 z-50" style={{background:"rgba(0,0,0,0.55)"}} onClick={()=>setMobileMoreOpen(false)}>
            <div
              className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl px-4 pt-4 pb-2 max-h-[70dvh] overflow-y-auto"
              style={{paddingBottom:"max(1rem, env(safe-area-inset-bottom))"}}
              onClick={(e)=>e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Menu</p>
                <button type="button" onClick={()=>setMobileMoreOpen(false)} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground">
                  <X size={18}/>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {mobileNavMore.map(({key,label,icon:Icon,badge})=>(
                  <button
                    key={key}
                    type="button"
                    onClick={()=>{setView(key);setMobileMoreOpen(false);}}
                    className={`flex flex-col items-center justify-center gap-1.5 min-h-[72px] rounded-xl border transition-colors ${view===key?"bg-primary/15 border-primary/40 text-primary":"bg-secondary/40 border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    <div className="relative">
                      <Icon size={20}/>
                      {badge!==undefined&&badge>0&&<span className="absolute -top-1.5 -right-2 min-w-4 h-4 flex items-center justify-center text-[9px] font-bold rounded-full bg-primary text-primary-foreground px-0.5">{badge>99?"99+":badge}</span>}
                    </div>
                    <span className="text-[10px] font-medium text-center leading-tight px-1">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overwrite archive confirm */}
      {showAdminSettings && (
        <AdminSettingsModal
          onClose={() => setShowAdminSettings(false)}
          appSettings={appSettings}
          onAppSettingsChange={setAppSettings}
        />
      )}
      {showSmsModal && (
        <EmployeeSmsModal
          open={showSmsModal}
          onClose={() => setShowSmsModal(false)}
          directory={directory}
        />
      )}
      {showSaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.7)"}}>
          <div className="bg-card rounded-2xl border border-border w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-yellow-400"/>
              </div>
              <div>
                <p className="text-sm font-semibold">Nadpisać zapisany tydzień?</p>
                <p className="text-xs text-muted-foreground mt-1">Ten tydzień ({fmtDate(weekFrom)}–{fmtDate(weekTo)}) jest już zapisany w archiwum. Dane zostaną nadpisane aktualnymi wartościami.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={doSaveWeek} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                Tak, nadpisz
              </button>
              <button onClick={()=>setShowSaveConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-secondary text-muted-foreground text-sm font-medium hover:text-foreground transition-colors">
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Auth: Login Screen ───────────────────────────────────────────────────────

function LoginScreen({onAdmin, onInspector, onWorker}: {onAdmin:(session: AdminSession)=>void; onInspector:(session: AdminSession)=>void; onWorker:(emp:DirectoryEmployee)=>void}) {
  const adminUsers = useMemo(() => listAdminUsersForLogin(), []);
  const inspectorUsers = useMemo(() => listInspectorUsersForLogin(), []);
  const [mode, setMode] = useState<"pick"|"admin"|"worker"|"inspector">("pick");

  const [selectedAdminId, setSelectedAdminId] = useState(adminUsers[0]?.id ?? "");
  const [selectedInspectorId, setSelectedInspectorId] = useState(inspectorUsers[0]?.id ?? "");
  const [password, setPassword] = useState("");
  const [passShow, setPassShow] = useState(false);
  const [passError, setPassError] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);

  const [directory, setDirectory] = useState<DirectoryEmployee[]>([]);
  const [dirLoading, setDirLoading] = useState(false);
  const [workerSearch, setWorkerSearch] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [phonePin, setPhonePin] = useState("");
  const [workerCode, setWorkerCode] = useState("");
  const [workerStep, setWorkerStep] = useState<"login" | "setup-pin">("login");
  const [setupPin1, setSetupPin1] = useState("");
  const [setupPin2, setSetupPin2] = useState("");
  const [setupPinLoading, setSetupPinLoading] = useState(false);
  const [workerError, setWorkerError] = useState("");

  const selectedAdmin = adminUsers.find((u) => u.id === selectedAdminId) ?? adminUsers[0] ?? null;
  const selectedInspector = inspectorUsers.find((u) => u.id === selectedInspectorId) ?? inspectorUsers[0] ?? null;
  const activeLoginUserId = mode === "inspector" ? selectedInspectorId : selectedAdminId;

  useEffect(() => {
    if (mode !== "admin" && mode !== "inspector") return;
    if (!activeLoginUserId) return;
    let cancelled = false;
    (async () => {
      const enabled = adminRememberEnabled();
      if (!cancelled) setRememberPassword(enabled);
      if (enabled) {
        const saved = await loadRememberedAdminPassword(activeLoginUserId);
        if (!cancelled && saved) setPassword(saved);
      }
    })();
    return () => { cancelled = true; };
  }, [mode, activeLoginUserId]);

  const handleAdminLogin = async () => {
    if (!selectedAdmin) { setPassError("Brak kont administratora"); return; }
    if (!password) { setPassError("Wpisz hasło"); return; }
    setPassLoading(true);
    const session = await verifyAdminLogin(selectedAdmin.login, password);
    if (session) {
      if (session.role === "inspector") { setPassLoading(false); setPassError("Użyj logowania Inspektor"); setPassword(""); return; }
      if (rememberPassword) await saveRememberedAdminPassword(selectedAdmin.id, password);
      else clearRememberedAdminPassword();
      setPassLoading(false);
      onAdmin(session);
      return;
    }
    setPassLoading(false);
    setPassError("Błędne hasło");
    setPassword("");
  };

  const handleInspectorLogin = async () => {
    if (!selectedInspector) { setPassError("Brak kont inspektorów"); return; }
    if (!password) { setPassError("Wpisz hasło"); return; }
    setPassLoading(true);
    const session = await verifyAdminLogin(selectedInspector.login, password);
    if (session && session.role === "inspector") {
      if (rememberPassword) await saveRememberedAdminPassword(selectedInspector.id, password);
      else clearRememberedAdminPassword();
      setPassLoading(false);
      onInspector(session);
      return;
    }
    setPassLoading(false);
    setPassError("Błędne hasło");
    setPassword("");
  };

  useEffect(() => {
    if (mode !== "worker") return;
    setDirLoading(true);
    setWorkerError("");
    fetchKeysFromCloud(["kw-directory", DIRECTORY_DELETED_IDS_KEY])
      .then((values) => {
        const [cloudRaw, cloudDeletedRaw] = values;
        const mergedDirDeleted = mergeDeletedDirectoryIds(getDeletedDirectoryIds(), normalizeDeletedDirectoryIds(cloudDeletedRaw));
        saveDeletedDirectoryIds(mergedDirDeleted);
        if (Array.isArray(cloudRaw)) {
          let local: DirectoryEmployee[] = [];
          try {
            local = JSON.parse(localStorage.getItem("kw-directory") || "[]");
          } catch { /* ignore */ }
          const merged = mergeDirectory(local, cloudRaw, mergedDirDeleted) as DirectoryEmployee[];
          setDirectory(merged);
          try { localStorage.setItem("kw-directory", JSON.stringify(merged)); } catch { /* ignore */ }
        } else {
          try {
            const local = localStorage.getItem("kw-directory");
            if (local) setDirectory(JSON.parse(local));
          } catch { /* ignore */ }
        }
      })
      .catch(() => {
        try {
          const local = localStorage.getItem("kw-directory");
          if (local) setDirectory(JSON.parse(local));
        } catch { /* ignore */ }
      })
      .finally(() => setDirLoading(false));
  }, [mode]);

  const activeWorkers = useMemo(() => {
    const q = workerSearch.trim().toLowerCase();
    return directory
      .filter((d) => d.active)
      .filter((d) => !q || d.name.toLowerCase().includes(q) || d.position.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [directory, workerSearch]);

  const selectedWorker = directory.find((d) => d.id === selectedWorkerId) || null;

  const handleWorkerSubmit = async () => {
    setWorkerError("");
    if (!selectedWorker) { setWorkerError("Wybierz siebie z listy"); return; }
    if (!workerHasPhonePin(selectedWorker)) {
      setWorkerError("Brak numeru w kartotece — poproś administratora o wpisanie telefonu (+48…).");
      return;
    }
    const pin = phonePin.replace(/\D/g, "");
    if (pin.length !== 9) { setWorkerError("Wpisz 9 cyfr telefonu (bez +48)"); return; }
    if (!workerPhonePinValid(selectedWorker, pin)) {
      setWorkerError("Błędny numer — wpisz 9 ostatnich cyfr swojego telefonu");
      setPhonePin("");
      return;
    }

    const emp = directory.find((d) => d.id === selectedWorkerId) || selectedWorker;

    if (!workerHasPersonalPin(emp)) {
      setWorkerStep("setup-pin");
      setSetupPin1("");
      setSetupPin2("");
      return;
    }

    const code = workerCode.replace(/\D/g, "");
    if (code.length !== 4) { setWorkerError("Wpisz swój 4-cyfrowy kod"); return; }
    try {
      const ok = await verifyWorkerPin(emp, code);
      if (!ok) {
        setWorkerError("Błędny kod pracownika");
        setWorkerCode("");
        return;
      }
      onWorker(emp);
    } catch {
      setWorkerError("Błąd logowania — odśwież stronę i spróbuj ponownie");
    }
  };

  const handleWorkerSetupPin = async () => {
    setWorkerError("");
    const emp = directory.find((d) => d.id === selectedWorkerId);
    if (!emp) { setWorkerError("Wybierz siebie z listy"); return; }
    const c1 = setupPin1.replace(/\D/g, "").slice(0, 4);
    const c2 = setupPin2.replace(/\D/g, "").slice(0, 4);
    if (c1.length !== 4) { setWorkerError("Kod musi mieć 4 cyfry"); return; }
    if (c1 !== c2) { setWorkerError("Kody nie pasują — wpisz ponownie"); setSetupPin2(""); return; }
    if (workerPinTooWeak(emp, c1)) {
      setWorkerError("Kod nie może być ostatnimi 4 cyframi telefonu — wybierz inny");
      return;
    }
    setSetupPinLoading(true);
    try {
      const hash = await hashWorkerPin(c1);
      const updated = directory.map((d) => (d.id === emp.id ? { ...d, workerPinHash: hash } : d));
      setDirectory(updated);
      try {
        localStorage.setItem("kw-directory", JSON.stringify(updated));
        await pushDirectoryToCloud(updated);
      } catch { /* offline — zapis lokalny */ }
      onWorker(updated.find((d) => d.id === emp.id)!);
    } catch {
      setWorkerError("Nie udało się zapisać kodu — spróbuj ponownie");
    } finally {
      setSetupPinLoading(false);
    }
  };

  const resetWorkerLogin = () => {
    setMode("pick");
    setSelectedWorkerId("");
    setPhonePin("");
    setWorkerCode("");
    setWorkerStep("login");
    setSetupPin1("");
    setSetupPin2("");
    setWorkerSearch("");
    setWorkerError("");
  };

  const PasswordField = ({value, show, onToggle, onChange, onEnter, placeholder, autoFocus}: {
    value:string; show:boolean; onToggle:()=>void; onChange:(v:string)=>void;
    onEnter?:()=>void; placeholder?:string; autoFocus?:boolean;
  }) => (
    <div className="relative">
      <input type={show?"text":"password"} placeholder={placeholder||"Wpisz hasło..."} value={value} autoFocus={autoFocus}
        onChange={e=>onChange(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&onEnter?.()}
        className="w-full bg-secondary rounded-xl px-4 py-3 pr-10 text-base border border-transparent focus:border-primary focus:outline-none transition-colors"/>
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
        <Eye size={15}/>
      </button>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-4 py-8 overflow-y-auto" style={{fontFamily:"'Inter',sans-serif", paddingTop:"max(2rem, env(safe-area-inset-top))", paddingBottom:"max(2rem, env(safe-area-inset-bottom))"}}>
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="text-center space-y-2">
          <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-10 w-auto object-contain mx-auto"/>
          <p className="text-xs text-muted-foreground">System zarządzania robotami</p>
        </div>

        {/* Mode: pick */}
        {mode === "pick" && (
          <div className="space-y-3">
            <button onClick={()=>setMode("admin")}
              className="w-full bg-primary text-primary-foreground rounded-2xl px-6 py-5 flex items-center gap-4 hover:bg-primary/90 active:scale-[0.98] transition-all">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><ShieldCheck size={22}/></div>
              <div className="text-left">
                <p className="font-semibold text-base">Panel administracyjny</p>
                <p className="text-xs opacity-70 mt-0.5">Wybierz użytkownika i wpisz hasło</p>
              </div>
            </button>
            <button onClick={()=>setMode("inspector")}
              className="w-full bg-card border border-border rounded-2xl px-6 py-5 flex items-center gap-4 hover:border-emerald-500/40 hover:bg-emerald-500/5 active:scale-[0.98] transition-all">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0"><ClipboardCheck size={22} className="text-emerald-600 dark:text-emerald-400"/></div>
              <div className="text-left">
                <p className="font-semibold text-base">Inspektor</p>
                <p className="text-xs text-muted-foreground mt-0.5">Roboty, dokumenty, zlecenia — Wrocławskie Mieszkania</p>
              </div>
            </button>
            <button onClick={()=>setMode("worker")}
              className="w-full bg-card border border-border rounded-2xl px-6 py-5 flex items-center gap-4 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all">
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0"><HardHat size={22} className="text-muted-foreground"/></div>
              <div className="text-left">
                <p className="font-semibold text-base">Pracownik</p>
                <p className="text-xs text-muted-foreground mt-0.5">Zdjęcia, raport · telefon + kod 4 cyfry</p>
              </div>
            </button>
          </div>
        )}

        {/* Mode: admin login */}
        {mode === "admin" && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={()=>{setMode("pick");setPassword("");setPassError("");}} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground transition-colors"><ArrowLeft size={16}/></button>
              <div className="flex items-center gap-2"><Lock size={14} className="text-primary"/><span className="text-sm font-semibold">Logowanie administratora</span></div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Użytkownik</label>
              <select
                value={selectedAdminId}
                onChange={(e) => {
                  setSelectedAdminId(e.target.value);
                  setPassword("");
                  setPassError("");
                }}
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"
              >
                {adminUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Hasło</label>
              <PasswordField value={password} show={passShow} onToggle={()=>setPassShow(v=>!v)}
                onChange={v=>{setPassword(v);setPassError("");}} onEnter={handleAdminLogin} autoFocus/>
              {passError && <p className="text-xs text-destructive">{passError}</p>}
              <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={rememberPassword}
                  onChange={(e) => setRememberPassword(e.target.checked)}
                  className="mt-0.5 rounded border-border accent-primary shrink-0"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Zapamiętaj hasło na tym urządzeniu
                  <span className="block text-[10px] text-muted-foreground/60 mt-0.5">Tylko lokalnie w przeglądarce — nie trafia do chmury</span>
                </span>
              </label>
            </div>
            <button onClick={handleAdminLogin} disabled={passLoading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {passLoading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>}
              Zaloguj
            </button>
          </div>
        )}

        {/* Mode: inspector login */}
        {mode === "inspector" && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={()=>{setMode("pick");setPassword("");setPassError("");}} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground transition-colors"><ArrowLeft size={16}/></button>
              <div className="flex items-center gap-2"><ClipboardCheck size={14} className="text-emerald-600 dark:text-emerald-400"/><span className="text-sm font-semibold">Logowanie inspektora</span></div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Użytkownik</label>
              <select
                value={selectedInspectorId}
                onChange={(e) => {
                  setSelectedInspectorId(e.target.value);
                  setPassword("");
                  setPassError("");
                }}
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"
              >
                {inspectorUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Hasło</label>
              <PasswordField value={password} show={passShow} onToggle={()=>setPassShow(v=>!v)}
                onChange={v=>{setPassword(v);setPassError("");}} onEnter={handleInspectorLogin} autoFocus/>
              {passError && <p className="text-xs text-destructive">{passError}</p>}
              <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={rememberPassword}
                  onChange={(e) => setRememberPassword(e.target.checked)}
                  className="mt-0.5 rounded border-border accent-primary shrink-0"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Zapamiętaj hasło na tym urządzeniu
                  <span className="block text-[10px] text-muted-foreground/60 mt-0.5">Tylko lokalnie w przeglądarce — nie trafia do chmury</span>
                </span>
              </label>
            </div>
            <button onClick={handleInspectorLogin} disabled={passLoading}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-600/90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {passLoading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>}
              Wejdź do panelu
            </button>
          </div>
        )}

        {/* Mode: worker */}
        {mode === "worker" && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={resetWorkerLogin} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground transition-colors"><ArrowLeft size={16}/></button>
              <div className="flex items-center gap-2"><HardHat size={14} className="text-muted-foreground"/><span className="text-sm font-semibold">{workerStep === "setup-pin" ? "Ustaw kod pracownika" : "Logowanie pracownika"}</span></div>
            </div>

            {dirLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : workerStep === "setup-pin" && selectedWorker ? (
              <>
                <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 space-y-1">
                  <p className="text-sm font-semibold">{selectedWorker.name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    To pierwsze logowanie — ustaw <strong>osobisty kod 4 cyfry</strong> (jak PIN do karty). Zapamiętaj go — chroni Twoją wypłatę przed podglądem przez innych. Nie podawaj kodu kolegom.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Nowy kod (4 cyfry)</label>
                    <input type="tel" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="••••" value={setupPin1}
                      onChange={e=>{setSetupPin1(e.target.value.replace(/\D/g,"").slice(0,4));setWorkerError("");}}
                      className="w-full bg-secondary rounded-xl px-4 py-3 text-sm tracking-[0.4em] text-center border border-transparent focus:border-primary focus:outline-none transition-colors" autoFocus/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Powtórz kod</label>
                    <input type="tel" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="••••" value={setupPin2}
                      onChange={e=>{setSetupPin2(e.target.value.replace(/\D/g,"").slice(0,4));setWorkerError("");}}
                      onKeyDown={e=>e.key==="Enter"&&handleWorkerSetupPin()}
                      className="w-full bg-secondary rounded-xl px-4 py-3 text-sm tracking-[0.4em] text-center border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                  </div>
                </div>
                {workerError && <p className="text-xs text-destructive">{workerError}</p>}
                <button onClick={handleWorkerSetupPin} disabled={setupPinLoading || setupPin1.length !== 4 || setupPin2.length !== 4}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {setupPinLoading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>}
                  Zapisz kod i wejdź
                </button>
                <button type="button" onClick={()=>{setWorkerStep("login");setSetupPin1("");setSetupPin2("");setWorkerError("");}}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Wróć
                </button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Wybierz siebie z listy</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                    <input type="search" placeholder="Szukaj imienia..." value={workerSearch}
                      onChange={e=>{setWorkerSearch(e.target.value);setWorkerError("");}}
                      className="w-full bg-secondary rounded-xl pl-9 pr-4 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"/>
                  </div>
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                    {activeWorkers.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">Brak aktywnych pracowników w kartotece.</p>
                    ) : activeWorkers.map((emp) => {
                      const hasPin = workerHasPhonePin(emp);
                      const sel = selectedWorkerId === emp.id;
                      return (
                        <button key={emp.id} type="button" disabled={!hasPin}
                          onClick={()=>{setSelectedWorkerId(emp.id);setWorkerError("");setWorkerCode("");}}
                          className={`w-full px-4 py-3 text-left transition-colors ${sel?"bg-primary/10":"hover:bg-secondary/50"} ${!hasPin?"opacity-50 cursor-not-allowed":""}`}>
                          <p className="text-sm font-medium">{emp.name||"Bez nazwy"}</p>
                          {!hasPin && <p className="text-[10px] text-amber-400 mt-0.5">Brak numeru — poproś admina</p>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedWorker && workerHasPhonePin(selectedWorker) && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Telefon — 9 cyfr (bez +48)</label>
                      <input type="tel" inputMode="numeric" autoComplete="off" maxLength={11}
                        placeholder="np. 501234567" value={phonePin}
                        onChange={e=>{setPhonePin(e.target.value.replace(/\D/g,"").slice(0,9));setWorkerError("");}}
                        className="w-full bg-secondary rounded-xl px-4 py-3 text-sm tracking-widest border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                    </div>
                    {workerHasPersonalPin(selectedWorker) && (
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Twój kod pracownika (4 cyfry)</label>
                        <input type="tel" inputMode="numeric" autoComplete="off" maxLength={4}
                          placeholder="••••" value={workerCode}
                          onChange={e=>{setWorkerCode(e.target.value.replace(/\D/g,"").slice(0,4));setWorkerError("");}}
                          onKeyDown={e=>e.key==="Enter"&&handleWorkerSubmit()}
                          className="w-full bg-secondary rounded-xl px-4 py-3 text-sm tracking-[0.4em] text-center border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                        <p className="text-[10px] text-muted-foreground">Osobisty kod — nie taki sam jak u kolegów. Zapomniałeś? Poproś administratora o reset w kartotece.</p>
                      </div>
                    )}
                    {!workerHasPersonalPin(selectedWorker) && phonePin.replace(/\D/g,"").length === 9 && workerPhonePinValid(selectedWorker, phonePin) && (
                      <p className="text-[11px] text-primary/90 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                        Pierwsze logowanie — po potwierdzeniu telefonu ustawisz osobisty kod 4 cyfry.
                      </p>
                    )}
                  </>
                )}

                {workerError && <p className="text-xs text-destructive">{workerError}</p>}

                {selectedWorker && workerHasPhonePin(selectedWorker) && phonePin.replace(/\D/g, "").length !== 9 && (
                  <p className="text-[11px] text-muted-foreground">Wpisz 9 cyfr telefonu, żeby kontynuować.</p>
                )}
                {selectedWorker && workerHasPhonePin(selectedWorker) && workerHasPersonalPin(selectedWorker) && phonePin.replace(/\D/g, "").length === 9 && workerCode.length !== 4 && (
                  <p className="text-[11px] text-muted-foreground">Wpisz swój 4-cyfrowy kod pracownika.</p>
                )}

                <button
                  type="button"
                  onClick={handleWorkerSubmit}
                  disabled={!selectedWorker || !workerHasPhonePin(selectedWorker)}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {selectedWorker && workerHasPersonalPin(selectedWorker) ? "Zaloguj" : "Dalej — ustaw kod"}
                </button>
              </>
            )}
          </div>
        )}

        <PwaInstallBanner/>
      </div>
    </div>
  );
}

// ─── Job report form (worker + admin) ─────────────────────────────────────────

function JobReportForm({
  jobId,
  authorName,
  authorAdminRole = "worker",
  onSaved,
  submitLabel = "Zapisz raport",
  description,
  disabled = false,
  editReport = null,
  onCancelEdit,
}: {
  jobId: string;
  authorName: string;
  authorAdminRole?: import("@/lib/admin-auth").AdminRole | "worker";
  onSaved: (report: WorkerJobReport) => void | Promise<void>;
  submitLabel?: string;
  description?: string;
  disabled?: boolean;
  editReport?: WorkerJobReport | null;
  onCancelEdit?: () => void;
}) {
  const [scopeText, setScopeText] = useState("");
  const [dimMode, setDimMode] = useState<"manual" | "sketch">("manual");
  const [reportRooms, setReportRooms] = useState<RoomDimension[]>([]);
  const [sketchFile, setSketchFile] = useState<File | null>(null);
  const [sketchPreview, setSketchPreview] = useState<string | null>(null);
  const [existingSketch, setExistingSketch] = useState<WorkerJobReport["sketch"]>(null);
  const [generalNote, setGeneralNote] = useState("");
  const [sketchNote, setSketchNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const pokojCountRef = useRef(0);
  const generalNoteRef = useRef<HTMLTextAreaElement>(null);
  const isEdit = Boolean(editReport);

  useEffect(() => {
    return () => { if (sketchPreview && sketchPreview.startsWith("blob:")) URL.revokeObjectURL(sketchPreview); };
  }, [sketchPreview]);

  const loadFromReport = (report: WorkerJobReport | null) => {
    if (sketchPreview && sketchPreview.startsWith("blob:")) URL.revokeObjectURL(sketchPreview);
    if (!report) {
      setScopeText("");
      setDimMode("manual");
      setReportRooms([]);
      setSketchFile(null);
      setSketchPreview(null);
      setExistingSketch(null);
      setGeneralNote("");
      setSketchNote("");
      pokojCountRef.current = 0;
      return;
    }
    const normalized = normalizeWorkerReport(report);
    setScopeText(getReportWorkScopeText(normalized));
    setReportRooms(normalized.rooms);
    setGeneralNote(normalized.generalNote || "");
    setSketchNote(normalized.sketchNote || "");
    setExistingSketch(normalized.sketch || null);
    setSketchFile(null);
    setSketchPreview(normalized.sketch?.publicUrl || null);
    setDimMode(normalized.sketch ? "sketch" : "manual");
    pokojCountRef.current = normalized.rooms.filter((r) => r.roomType === "pokoj").length;
  };

  useEffect(() => {
    loadFromReport(editReport);
    setError("");
    setSuccess(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, editReport?.id]);

  const resetForm = () => {
    loadFromReport(null);
    onCancelEdit?.();
  };

  const addRoom = (roomType: RoomTypeKey) => {
    if (roomType === "pokoj") {
      pokojCountRef.current += 1;
      setReportRooms((prev) => [...prev, defaultRoom("pokoj", `Pokój ${pokojCountRef.current}`)]);
    } else {
      setReportRooms((prev) => [...prev, defaultRoom(roomType)]);
    }
  };

  const updateRoom = (id: string, patch: Partial<RoomDimension>) => {
    setReportRooms((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const onSketchPick = (files: FileList | null) => {
    if (!files?.[0]) {
      setError("Nie wybrano pliku — spróbuj ponownie lub użyj innego zdjęcia (JPG/PNG).");
      return;
    }
    if (sketchPreview && sketchPreview.startsWith("blob:")) URL.revokeObjectURL(sketchPreview);
    setSketchFile(files[0]);
    setSketchPreview(URL.createObjectURL(files[0]));
    setExistingSketch(null);
    setDimMode("sketch");
    setError("");
  };

  const handleSubmit = async () => {
    const scope = scopeText.trim();
    const items = scope ? scopeTextToWorkItems(scope) : [];
    const rooms = reportRooms.filter(roomHasContent);
    const hasSketch = dimMode === "sketch" && (sketchFile || existingSketch);
    const hasGeneral = generalNote.trim().length > 0;
    if (!scopeTextHasContent(scope) && rooms.length === 0 && !hasSketch && !hasGeneral) {
      setError("Dodaj zakres, wymiary, rysunek lub wiadomość dla admina.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess(false);
    let sketch: WorkerJobReport["sketch"] = existingSketch;
    if (dimMode === "sketch" && sketchFile) {
      const { entry, error: upErr } = await uploadPhoto(jobId, sketchFile, "sketch", authorName);
      if (!entry) {
        setError(upErr || "Nie udało się wgrać rysunku.");
        setSaving(false);
        return;
      }
      sketch = { path: entry.path, publicUrl: entry.publicUrl };
    } else if (dimMode !== "sketch") {
      sketch = null;
    }
    const now = new Date().toISOString();
    const report: WorkerJobReport = {
      id: editReport?.id || crypto.randomUUID(),
      workerName: editReport?.workerName || authorName,
      authorAdminRole: editReport?.authorAdminRole || authorAdminRole,
      submittedAt: editReport?.submittedAt || now,
      updatedAt: isEdit ? now : undefined,
      workScopeText: scope,
      workItems: items,
      rooms,
      generalNote: generalNote.trim(),
      sketchNote: sketchNote.trim(),
      sketch,
    };
    await onSaved(report);
    if (!isEdit) loadFromReport(null);
    setSuccess(true);
    setSaving(false);
    setTimeout(() => setSuccess(false), 4000);
  };

  return (
    <div className="space-y-4">
      {isEdit && (
        <div className="flex items-center justify-between gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <p className="text-xs text-amber-400 font-medium">Edycja raportu</p>
          {onCancelEdit && (
            <button type="button" onClick={resetForm} className="text-xs text-muted-foreground hover:text-foreground">Anuluj</button>
          )}
        </div>
      )}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {success && (
        <p className="text-xs text-green-400 bg-green-500/10 rounded-lg px-3 py-2">{isEdit ? "Zmiany zapisane." : "Raport zapisany."}</p>
      )}
      {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Zakres wykonanych prac</p>
        <WorkScopeEditor
          value={scopeText}
          onChange={setScopeText}
          disabled={disabled || saving}
          VoiceNoteButton={VoiceNoteButton}
        />
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Ruler size={12}/>Wymiary mieszkania
        </p>
        <div className="flex gap-2 mb-3">
          <button type="button" onClick={() => setDimMode("manual")}
            className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${dimMode === "manual" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
            Wpisz wymiary
          </button>
          <button type="button" onClick={() => setDimMode("sketch")}
            className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${dimMode === "sketch" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
            Foto rysunku
          </button>
        </div>

        {dimMode === "manual" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {(["salon", "pokoj", "kuchnia", "korytarz", "lazienka", "toaleta"] as RoomTypeKey[]).map((rt) => (
                <button key={rt} type="button" onClick={() => addRoom(rt)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground">
                  + {ROOM_TYPE_LABELS[rt]}
                </button>
              ))}
            </div>
            {reportRooms.length === 0 ? (
              <p className="text-xs text-muted-foreground">Kliknij pomieszczenie powyżej, potem wpisz wymiary w metrach.</p>
            ) : (
              <div className="space-y-2">
                {(() => {
                  let pokojIdx = 0;
                  return reportRooms.map((room) => {
                    const label = room.roomType === "pokoj"
                      ? roomDisplayName(room, pokojIdx++)
                      : roomDisplayName(room, 0);
                    return (
                      <div key={room.id} className="bg-secondary/40 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{label}</p>
                          <button type="button" onClick={() => setReportRooms((p) => p.filter((r) => r.id !== room.id))} className="text-muted-foreground hover:text-destructive">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {(["length", "width", "height"] as const).map((field, fi) => (
                            <div key={field}>
                              <label className="text-[10px] text-muted-foreground block mb-0.5">{fi === 0 ? "Długość" : fi === 1 ? "Szerokość" : "Wysokość"}</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="m"
                                value={room[field]}
                                onChange={(e) => updateRoom(room.id, { [field]: e.target.value })}
                                className="w-full bg-background rounded-lg px-2 py-1.5 text-sm font-mono border border-border focus:border-primary focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={room.note || ""}
                          onChange={(e) => updateRoom(room.id, { note: e.target.value })}
                          placeholder="Opis pomieszczenia / uwagi (opcjonalnie)"
                          className="w-full bg-background rounded-lg px-2.5 py-1.5 text-xs border border-border focus:border-primary focus:outline-none"
                        />
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <HiddenFileInput accept="image/*,.heic,.heif" capture="environment" onPick={onSketchPick}>
                {(open) => (
                  <button
                    type="button"
                    onClick={open}
                    className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors touch-manipulation"
                  >
                    <Camera size={18}/>
                    <span className="text-xs font-medium">Zrób zdjęcie</span>
                  </button>
                )}
              </HiddenFileInput>
              <HiddenFileInput accept="image/*,.heic,.heif" onPick={onSketchPick}>
                {(open) => (
                  <button
                    type="button"
                    onClick={open}
                    className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors touch-manipulation"
                  >
                    <ImagePlus size={18}/>
                    <span className="text-xs font-medium">Z galerii</span>
                  </button>
                )}
              </HiddenFileInput>
            </div>
            {sketchFile && (
              <p className="text-[11px] text-muted-foreground text-center truncate px-2">{sketchFile.name}</p>
            )}
            {sketchPreview && (
              <img src={sketchPreview} alt="Podgląd rysunku" className="rounded-xl border border-border max-h-48 w-full object-contain bg-secondary"/>
            )}
            <input
              type="text"
              value={sketchNote}
              onChange={(e) => setSketchNote(e.target.value)}
              placeholder="Opis rysunku / uwagi (opcjonalnie)"
              className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
            />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-start gap-2 mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 flex-1 pt-1.5">
            <StickyNote size={12}/>Wiadomość dla admina
          </p>
          <VoiceNoteButton focusRef={generalNoteRef} hintClassName="max-w-[min(100vw-2rem,280px)]" onResult={(text) => setGeneralNote((p) => (p ? `${p} ${text}` : text))}/>
        </div>
        <textarea
          ref={generalNoteRef}
          value={generalNote}
          onChange={(e) => setGeneralNote(e.target.value)}
          placeholder="Coś ważnego do przekazania — opcjonalnie"
          rows={2}
          className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none resize-none"
        />
      </div>

      <button type="button" onClick={handleSubmit} disabled={saving || disabled}
        className="w-full py-3.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-600/90 disabled:opacity-50 transition-all">
        {saving ? "Zapisywanie…" : submitLabel}
      </button>
    </div>
  );
}

// ─── Worker reports (admin) ───────────────────────────────────────────────────

function JobWorkerReportsPanel({
  jobId,
  reports,
  authorName,
  authorAdminRole,
  onAddReport,
  onDelete,
}: {
  jobId: string;
  reports: WorkerJobReport[];
  authorName: string;
  authorAdminRole: import("@/lib/admin-auth").AdminRole;
  onAddReport: (report: WorkerJobReport) => void;
  onDelete: (reportId: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true);
  const sorted = useMemo(
    () => [...reports].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [reports],
  );

  useEffect(() => {
    if (sorted.length > 0 && !openId) setOpenId(sorted[0].id);
  }, [sorted, openId]);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={13} className="text-muted-foreground"/>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Raporty — zakres i wymiary</span>
          {reports.length > 0 && (
            <span className="bg-violet-500/15 text-violet-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {reports.length}
            </span>
          )}
        </div>
        <button type="button" onClick={() => setShowForm((v) => !v)}
          className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
          <Plus size={12}/>{showForm ? "Ukryj formularz" : "Dodaj raport"}
        </button>
      </div>

      {showForm && (
        <div className="px-5 py-4 border-b border-border bg-violet-500/5">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2">
            <ClipboardList size={14} className="text-violet-400"/>Nowy raport
          </p>
          <JobReportForm
            jobId={jobId}
            authorName={authorName}
            authorAdminRole={authorAdminRole}
            onSaved={(report) => { onAddReport(report); setOpenId(report.id); }}
            submitLabel="Zapisz raport"
            description="Te same pola co w trybie pracownika — zakres prac, wymiary pomieszczeń lub foto rysunku."
          />
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          Brak zapisanych raportów. Dodaj pierwszy powyżej lub poproś pracownika o wysłanie z telefonu.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {sorted.map((report) => {
            const isOpen = openId === report.id;
            let pokojIdx = 0;
            return (
              <div key={report.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : report.id)}
                  className="w-full px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-secondary/30 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{report.workerName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtDate(report.submittedAt.slice(0, 10))}
                      {reportHasWorkScope(report) && ` · ${scopeTextLineCount(getReportWorkScopeText(report))} linii`}
                      {report.rooms.length > 0 && ` · ${report.rooms.length} pom.`}
                      {report.sketch && " · rysunek"}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp size={14} className="text-muted-foreground shrink-0"/> : <ChevronDown size={14} className="text-muted-foreground shrink-0"/>}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 space-y-4 bg-secondary/10">
                    {reportHasWorkScope(report) && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Zakres wykonanych prac</p>
                        <WorkScopeDisplay text={getReportWorkScopeText(report)} className="bg-secondary/30 rounded-xl px-3 py-2"/>
                      </div>
                    )}
                    {report.generalNote && (
                      <div className="bg-primary/5 border border-primary/15 rounded-lg px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Wiadomość</p>
                        <p className="text-sm">{report.generalNote}</p>
                      </div>
                    )}
                    {report.rooms.length > 0 && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Ruler size={12}/>Wymiary pomieszczeń
                        </p>
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-muted-foreground border-b border-border bg-secondary/40">
                                <th className="px-3 py-2 text-left">Pomieszczenie</th>
                                <th className="px-3 py-2 text-right">Dł. (m)</th>
                                <th className="px-3 py-2 text-right">Szer. (m)</th>
                                <th className="px-3 py-2 text-right">Wys. (m)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {report.rooms.map((room) => {
                                const idx = room.roomType === "pokoj" ? pokojIdx++ : 0;
                                return (
                                  <tr key={room.id}>
                                    <td className="px-3 py-2">
                                      <p className="font-medium">{roomDisplayName(room, idx)}</p>
                                      {room.note && <p className="text-[10px] text-muted-foreground mt-0.5 italic">{room.note}</p>}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-xs">{room.length || "—"}</td>
                                    <td className="px-3 py-2 text-right font-mono text-xs">{room.width || "—"}</td>
                                    <td className="px-3 py-2 text-right font-mono text-xs">{room.height || "—"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {report.sketch && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Rysunek z wymiarami</p>
                        <a href={report.sketch.publicUrl} target="_blank" rel="noopener noreferrer" className="block max-w-xs">
                          <img src={report.sketch.publicUrl} alt="Rysunek" className="rounded-xl border border-border w-full object-contain bg-secondary max-h-64"/>
                        </a>
                        {report.sketchNote && <p className="text-xs text-muted-foreground mt-2 italic">{report.sketchNote}</p>}
                      </div>
                    )}
                    {report.updatedAt && (
                      <p className="text-[10px] text-muted-foreground">Edytowano: {fmtDate(report.updatedAt.slice(0, 10))}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => { if (window.confirm("Usunąć ten raport?")) onDelete(report.id); }}
                      className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 size={12}/>Usuń raport
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Client share view (public) ───────────────────────────────────────────────

interface ClientShareJob {
  address: string;
  flatNumber: string;
  client: string;
  startDate: string;
  endDate: string;
  status: string;
  photos: { publicUrl: string; label: string; caption: string; uploadedAt: string }[];
  workerReports: WorkerJobReport[];
}

function ClientShareView({ token }: { token: string }) {
  const [job, setJob] = useState<ClientShareJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/client-share?token=${encodeURIComponent(token)}`, {
      headers: { Authorization: API_HEADERS.Authorization },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) throw new Error(data.error || "Nie udało się wczytać");
        setJob(data.job);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Błąd połączenia"))
      .finally(() => setLoading(false));
  }, [token]);

  const LABEL_NAMES: Record<string, string> = { before: "Przed remontem", after: "Po remoncie", progress: "W trakcie", sketch: "Rysunek" };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="px-4 py-4 border-b border-border bg-card flex items-center gap-3" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-8 w-auto object-contain"/>
        <div>
          <p className="text-sm font-semibold">Podgląd remontu</p>
          <p className="text-[10px] text-muted-foreground">W&G DOM — tylko do odczytu</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full space-y-6" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>
        {loading && <p className="text-sm text-muted-foreground text-center py-12">Ładowanie…</p>}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {job && (
          <>
            <div>
              <h1 className="text-xl font-bold">{job.address || "Robota"}{job.flatNumber && <span className="text-muted-foreground font-normal"> m.{job.flatNumber}</span>}</h1>
              <p className="text-sm text-muted-foreground mt-1">{job.client || "—"}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {job.startDate && `Od ${fmtDate(job.startDate)}`}
                {job.endDate && ` · do ${fmtDate(job.endDate)}`}
                {" · "}{job.status === "completed" ? "Zakończono" : "W trakcie"}
              </p>
            </div>
            {job.photos.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Zdjęcia</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {job.photos.map((p, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden bg-secondary relative">
                      <img src={p.publicUrl} alt="" className="w-full h-full object-cover"/>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                        <p className="text-[9px] text-white">{LABEL_NAMES[p.label] || p.label}</p>
                        {p.caption && <p className="text-[8px] text-white/80 truncate">{p.caption}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {job.workerReports.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Raporty z budowy</p>
                {job.workerReports.map((r) => {
                  const norm = normalizeWorkerReport(r);
                  return (
                    <div key={r.id || norm.submittedAt} className="bg-card border border-border rounded-xl p-4 space-y-2">
                      <p className="text-xs text-muted-foreground">{fmtDate(norm.submittedAt.slice(0, 10))} · {norm.workerName}</p>
                      {reportHasWorkScope(norm) && (
                        <WorkScopeDisplay text={getReportWorkScopeText(norm)}/>
                      )}
                      {norm.generalNote && <p className="text-xs text-muted-foreground italic border-t border-border pt-2">{norm.generalNote}</p>}
                      {norm.sketch?.publicUrl && (
                        <img src={norm.sketch.publicUrl} alt="Rysunek" className="rounded-lg border border-border max-h-48 object-contain w-full bg-secondary"/>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {job.photos.length === 0 && job.workerReports.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Brak opublikowanych materiałów — administrator jeszcze nie udostępnił zdjęć ani raportów.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Worker Photo View ────────────────────────────────────────────────────────

function useWorkerPrivacyShield(enabled: boolean) {
  const [shield, setShield] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const onVis = () => {
      if (isPrivacyShieldSuppressed()) return;
      setShield(document.hidden);
    };
    const onBlur = () => {
      if (isPrivacyShieldSuppressed()) return;
      setShield(true);
    };
    const onFocus = () => {
      if (isPrivacyShieldSuppressed()) return;
      setShield(false);
    };
    const blockCtx = (e: Event) => e.preventDefault();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("contextmenu", blockCtx);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("contextmenu", blockCtx);
    };
  }, [enabled]);

  return shield;
}

function WorkerPhotoView({ workerName, workerId, onLogout }: { workerName: string; workerId: string; onLogout: () => void }) {
  const [jobs, setJobsLocal] = useLocalStorage<Job[]>("kw-jobs", []);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string|null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [search, setSearch] = useState("");
  const [galleryLabel, setGalleryLabel] = useState<PhotoEntry["label"]>("progress");
  const [galleryPicks, setGalleryPicks] = useState<{ file: File; preview: string; caption: string }[]>([]);
  const [quickPhotoCaption, setQuickPhotoCaption] = useState("");
  const [editingReport, setEditingReport] = useState<WorkerJobReport | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [flushingQueue, setFlushingQueue] = useState(false);
  const [weekEmployees, setWeekEmployees] = useState<WeekEmployee[]>([]);
  const [savedWeeks, setSavedWeeks] = useState<WeekSnapshot[]>([]);
  const [weekFrom, setWeekFrom] = useState("");
  const [weekTo, setWeekTo] = useState("");
  const [payrollLoading, setPayrollLoading] = useState(true);
  const [showPayHistory, setShowPayHistory] = useState(false);
  const [workerTab, setWorkerTab] = useState<"jobs" | "pay" | "schedule">("jobs");
  const [workerHelpOpen, setWorkerHelpOpen] = useState(false);
  const [receiptDesc, setReceiptDesc] = useState("");
  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptError, setReceiptError] = useState("");
  const privacyShield = useWorkerPrivacyShield(true);

  const currentWeekEmp = useMemo(
    () => findWeekEmployeeForWorker(weekEmployees, workerId, workerName),
    [weekEmployees, workerId, workerName],
  );
  const currentPay = useMemo(
    () => (currentWeekEmp ? calcWeekEmployee(currentWeekEmp) : null),
    [currentWeekEmp],
  );
  const payHistory = useMemo(
    () => workerPayoutHistory(savedWeeks, workerId, workerName).filter((row) => row.weekFrom !== weekFrom),
    [savedWeeks, workerId, workerName, weekFrom],
  );
  const fridayPayDate = weekFrom ? fridayIsoOfWeek(weekFrom) : "";
  const todayWork = useMemo(
    () => workerTodayWorkInfo(currentWeekEmp, jobs, weekFrom, weekTo),
    [currentWeekEmp, jobs, weekFrom, weekTo],
  );
  const scheduleColumns = useMemo(() => (weekFrom ? weekDayColumns(weekFrom) : []), [weekFrom]);
  const myExtraCosts = currentWeekEmp?.extraCosts ?? [];
  const pendingExtraCosts = myExtraCosts.filter((c) => extraCostStatus(c) === "pending");
  const approvedExtraCosts = myExtraCosts.filter((c) => extraCostStatus(c) === "approved");
  const rejectedExtraCosts = myExtraCosts.filter((c) => extraCostStatus(c) === "rejected");

  useEffect(() => {
    return () => { galleryPicks.forEach((p) => URL.revokeObjectURL(p.preview)); };
  }, [galleryPicks]);

  const refreshQueueCount = useCallback(() => {
    queuedPhotoCount().then(setQueueCount).catch(() => {});
  }, []);

  useEffect(() => { refreshQueueCount(); }, [refreshQueueCount]);

  const flushQueue = useCallback(async () => {
    if (!navigator.onLine || flushingQueue) return;
    setFlushingQueue(true);
    try {
      const items = await listQueuedPhotos();
      for (const item of items) {
        const job = jobs.find((j) => j.id === item.jobId);
        if (!job) {
          await removeQueuedPhoto(item.id);
          continue;
        }
        const file = new File([item.blob], item.filename, { type: item.blob.type || "image/jpeg" });
        const { entry, error } = await uploadPhoto(item.jobId, file, item.label as PhotoEntry["label"], item.uploadedBy, item.caption);
        if (entry) {
          setJobsLocal((prev) => {
            const updated = prev.map((j) =>
              j.id === item.jobId
                ? appendJobActivity(
                    { ...j, photos: [...(j.photos || []), entry] },
                    "photo_upload",
                    `${item.uploadedBy} wgrał zdjęcie z kolejki (${item.label})`,
                    item.uploadedBy,
                  )
                : j,
            );
            pushKeysToCloud(["kw-jobs"], [updated]).catch(() => {});
            try { localStorage.setItem("kw-jobs", JSON.stringify(updated)); } catch { /* ignore */ }
            return updated;
          });
          await removeQueuedPhoto(item.id);
        } else if (error?.includes("internet")) {
          break;
        }
      }
    } finally {
      setFlushingQueue(false);
      refreshQueueCount();
    }
  }, [jobs, flushingQueue, refreshQueueCount, setJobsLocal]);

  useEffect(() => {
    const onOnline = () => { flushQueue(); };
    window.addEventListener("online", onOnline);
    if (navigator.onLine) flushQueue();
    return () => window.removeEventListener("online", onOnline);
  }, [flushQueue]);

  useEffect(() => {
    const loadLocal = <T,>(key: string, fallback: T): T => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
      } catch {
        return fallback;
      }
    };

    fetchKeysFromCloud(["kw-jobs", JOBS_DELETED_IDS_KEY, "kw-week-employees", "kw-archive", "kw-weekFrom", "kw-weekTo"])
      .then((values) => {
        const [cloudJobs, cloudDeletedRaw, cloudWeekEmps, cloudArchive, cloudFrom, cloudTo] = values;
        const mergedDeleted = mergeDeletedJobIds(getDeletedJobIds(), normalizeDeletedJobIds(cloudDeletedRaw));
        saveDeletedJobIds(mergedDeleted);
        if (cloudJobs != null) {
          let localJobs: Job[] = [];
          try {
            localJobs = normalizeJobsValue(JSON.parse(localStorage.getItem("kw-jobs") || "[]")) as Job[];
          } catch { /* ignore */ }
          const cloudJobsNorm = normalizeJobsValue(cloudJobs) as Job[];
          const merged = mergeJobsById(localJobs, cloudJobsNorm, mergedDeleted) as Job[];
          setJobsLocal(merged);
          try { localStorage.setItem("kw-jobs", JSON.stringify(merged)); } catch { /* ignore */ }
        }
        setWeekEmployees(
          (cloudWeekEmps as WeekEmployee[] | null) ?? loadLocal<WeekEmployee[]>("kw-week-employees", []),
        );
        setSavedWeeks(
          (cloudArchive as WeekSnapshot[] | null) ?? loadLocal<WeekSnapshot[]>("kw-archive", []),
        );
        const week = getWeekRange();
        setWeekFrom(typeof cloudFrom === "string" && cloudFrom ? cloudFrom : loadLocal("kw-weekFrom", week.from));
        setWeekTo(typeof cloudTo === "string" && cloudTo ? cloudTo : loadLocal("kw-weekTo", week.to));
      })
      .catch(() => {
        setWeekEmployees(loadLocal<WeekEmployee[]>("kw-week-employees", []));
        setSavedWeeks(loadLocal<WeekSnapshot[]>("kw-archive", []));
        const week = getWeekRange();
        setWeekFrom(loadLocal("kw-weekFrom", week.from));
        setWeekTo(loadLocal("kw-weekTo", week.to));
      })
      .finally(() => {
        setJobsLoading(false);
        setPayrollLoading(false);
      });
  }, [setJobsLocal]);

  const activeJobs = jobs
    .filter(j => j.status === "in_progress")
    .filter(j => !search.trim() || j.address.toLowerCase().includes(search.toLowerCase()) || (j.client||"").toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => b.startDate.localeCompare(a.startDate));

  const selectedJob = jobs.find(j => j.id === selectedJobId) || null;

  const LABELS: {value: PhotoEntry["label"]; icon: React.ElementType; title: string; desc: string; color: string}[] = [
    {value:"before", icon:Camera,    title:"Przed remontem", desc:"Stan mieszkania przed rozpoczęciem prac",  color:"bg-blue-500/10 border-blue-500/25 text-blue-400"},
    {value:"after",  icon:Eye,       title:"Po remoncie",    desc:"Stan mieszkania po zakończeniu prac",       color:"bg-green-500/10 border-green-500/25 text-green-400"},
    {value:"progress",icon:ImagePlus,title:"W trakcie prac", desc:"Postęp prac — można wgrać wiele zdjęć",    color:"bg-yellow-500/10 border-yellow-500/20 text-yellow-400"},
  ];

  const syncJobs = (updater: (prev: Job[]) => Job[]) => {
    setJobsLocal((prev) => {
      const updated = updater(prev);
      saveLocalJobsSnapshot(updated);
      pushKeysToCloud(["kw-jobs"], [updated]).catch(() => {});
      return updated;
    });
  };

  const syncWeekEmployees = (updater: (prev: WeekEmployee[]) => WeekEmployee[]) => {
    setWeekEmployees((prev) => {
      const updated = updater(prev);
      try { localStorage.setItem("kw-week-employees", JSON.stringify(updated)); } catch { /* ignore */ }
      pushKeysToCloud(["kw-week-employees"], [updated]).catch(() => {});
      return updated;
    });
  };

  const submitReceipt = async (file: File) => {
    if (!currentWeekEmp) {
      setReceiptError("Nie ma Cię na liście płac w tym tygodniu — poproś admina o dodanie.");
      return;
    }
    const desc = receiptDesc.trim();
    const amount = receiptAmount.trim();
    if (!desc || !amount || !(parseFloat(amount) > 0)) {
      setReceiptError("Podaj opis i kwotę większą od zera.");
      return;
    }
    setReceiptUploading(true);
    setReceiptError("");
    const { publicUrl, error } = await uploadReceipt(workerId || workerName, file);
    if (!publicUrl) {
      setReceiptError(error || "Nie udało się wgrać paragonu.");
      setReceiptUploading(false);
      return;
    }
    const newCost: EmployeeExtraCost = {
      id: crypto.randomUUID(),
      description: desc,
      amount,
      receiptUrl: publicUrl,
      status: "pending",
      submittedAt: new Date().toISOString(),
      submittedBy: workerName,
    };
    syncWeekEmployees((prev) =>
      prev.map((e) =>
        e.id === currentWeekEmp.id
          ? { ...e, extraCosts: [...(e.extraCosts ?? []), newCost] }
          : e,
      ),
    );
    setReceiptDesc("");
    setReceiptAmount("");
    setReceiptUploading(false);
  };

  const removeMyExtraCost = (costId: string) => {
    if (!currentWeekEmp || !window.confirm("Usunąć ten koszt?")) return;
    syncWeekEmployees((prev) =>
      prev.map((e) =>
        e.id === currentWeekEmp.id
          ? { ...e, extraCosts: (e.extraCosts ?? []).filter((c) => c.id !== costId) }
          : e,
      ),
    );
  };

  const uploadFilesBatch = async (
    picks: { file: File; caption: string }[],
    label: PhotoEntry["label"],
  ) => {
    if (!selectedJob || picks.length === 0) return;
    setUploading(true);
    setUploadError("");
    setUploadedCount(0);
    setUploadTotal(picks.length);
    const newPhotos: PhotoEntry[] = [];
    let queued = 0;
    let failMsg = "";
    for (const pick of picks) {
      const wm = await prepareWatermarkedPhoto(selectedJob, pick.file);
      const { entry, error } = await uploadPhoto(selectedJob.id, wm, label, workerName, pick.caption);
      if (entry) {
        newPhotos.push(entry);
        setUploadedCount((p) => p + 1);
      } else {
        try {
          await queuePhoto({
            jobId: selectedJob.id,
            label,
            caption: pick.caption,
            uploadedBy: workerName,
            blob: wm,
            filename: wm.name,
          });
          queued += 1;
          refreshQueueCount();
        } catch {
          failMsg = error || "Nie udało się wgrać zdjęcia.";
        }
        if (!failMsg) failMsg = error || "Brak sieci — zdjęcie zapisane w kolejce offline.";
      }
    }
    if (newPhotos.length > 0) {
      syncJobs((prev) =>
        prev.map((j) =>
          j.id === selectedJobId
            ? appendJobActivity(
                { ...j, photos: [...(j.photos || []), ...newPhotos] },
                "photo_upload",
                `${workerName} wgrał ${newPhotos.length} zdjęć (${label})`,
                workerName,
              )
            : j,
        ),
      );
    }
    if (failMsg || queued > 0) {
      setUploadError(
        [
          newPhotos.length > 0 ? `Wgrano ${newPhotos.length} z ${picks.length}.` : "",
          queued > 0 ? `${queued} w kolejce offline — wyśle się po powrocie sieci.` : failMsg,
        ].filter(Boolean).join(" "),
      );
    }
    setUploading(false);
    setUploadTotal(0);
  };

  const uploadFilesBatchLegacy = async (files: File[], label: PhotoEntry["label"], caption = "") => {
    await uploadFilesBatch(files.map((file) => ({ file, caption })), label);
  };

  const handleFiles = async (files: FileList | null, label: PhotoEntry["label"]) => {
    if (!files?.length) return;
    await uploadFilesBatchLegacy(Array.from(files), label, quickPhotoCaption);
    setQuickPhotoCaption("");
  };

  const onGalleryPick = (files: FileList | null) => {
    if (!files?.length) {
      setUploadError("Nie wybrano zdjęć — spróbuj ponownie.");
      return;
    }
    galleryPicks.forEach((p) => URL.revokeObjectURL(p.preview));
    setGalleryPicks(Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      caption: "",
    })));
    setUploadError("");
  };

  const clearGallery = () => {
    galleryPicks.forEach((p) => URL.revokeObjectURL(p.preview));
    setGalleryPicks([]);
  };

  const submitGallery = async () => {
    if (galleryPicks.length === 0) return;
    await uploadFilesBatch(galleryPicks.map((p) => ({ file: p.file, caption: p.caption })), galleryLabel);
    clearGallery();
  };

  const handleReportSaved = async (report: WorkerJobReport) => {
    if (editingReport) {
      syncJobs((prev) =>
        prev.map((j) =>
          j.id === selectedJobId
            ? { ...j, workerReports: jobWorkerReports(j).map((r) => (r.id === report.id ? report : r)) }
            : j,
        ),
      );
      setEditingReport(null);
    } else {
      syncJobs((prev) =>
        prev.map((j) =>
          j.id === selectedJobId ? { ...j, workerReports: [...jobWorkerReports(j), report] } : j,
        ),
      );
    }
  };

  const deleteMyReport = (reportId: string) => {
    if (!window.confirm("Usunąć ten raport?")) return;
    syncJobs((prev) =>
      prev.map((j) =>
        j.id === selectedJobId
          ? { ...j, workerReports: jobWorkerReports(j).filter((r) => r.id !== reportId) }
          : j,
      ),
    );
    if (editingReport?.id === reportId) setEditingReport(null);
  };

  const updateMyPhoto = (photoId: string, patch: Partial<PhotoEntry>) => {
    syncJobs((prev) =>
      prev.map((j) =>
        j.id === selectedJobId
          ? { ...j, photos: (j.photos || []).map((p) => (p.id === photoId ? { ...p, ...patch } : p)) }
          : j,
      ),
    );
  };

  const deleteMyPhoto = (photoId: string) => {
    if (!window.confirm("Usunąć to zdjęcie z listy?")) return;
    syncJobs((prev) =>
      prev.map((j) =>
        j.id === selectedJobId
          ? { ...j, photos: (j.photos || []).filter((p) => p.id !== photoId) }
          : j,
      ),
    );
  };

  const myPhotos = selectedJob ? (selectedJob.photos||[]).filter(p=>p.uploadedBy===workerName) : [];
  const myReports = selectedJob ? jobWorkerReports(selectedJob).filter(r => r.workerName === workerName) : [];

  return (
    <div
      className="flex flex-col bg-background text-foreground select-none [-webkit-touch-callout:none]"
      style={{ fontFamily: "'Inter',sans-serif", height: "100dvh" }}
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-card shrink-0" style={{paddingTop:"max(1rem,env(safe-area-inset-top))"}}>
        <div className="flex items-center gap-3">
          <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-7 w-auto object-contain"/>
          <div className="w-px h-5 bg-border"/>
          <div>
            <p className="text-xs font-semibold">{workerName}</p>
            <p className="text-[10px] text-muted-foreground">Tryb pracownika</p>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-2.5 min-h-[44px] rounded-lg hover:bg-secondary transition-colors">
          <LogOut size={13}/>Wyloguj
        </button>
      </div>

      {!selectedJob && (
        <div className="flex border-b border-border bg-card shrink-0">
          <button
            type="button"
            onClick={() => setWorkerTab("jobs")}
            title="Wybierz robotę, wgrywaj zdjęcia i raporty z budowy"
            className={`flex-1 min-h-[48px] py-3.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${workerTab === "jobs" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            <MapPin size={14}/>Roboty
          </button>
          <button
            type="button"
            onClick={() => setWorkerTab("schedule")}
            title="Twój grafik na ten tydzień — godziny i adresy robót"
            className={`flex-1 min-h-[48px] py-3.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${workerTab === "schedule" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            <CalendarDays size={14}/>Grafik
          </button>
          <button
            type="button"
            onClick={() => setWorkerTab("pay")}
            title="Twoja wypłata w piątek — tylko po logowaniu telefonem i kodem"
            className={`flex-1 min-h-[48px] py-3.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${workerTab === "pay" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            <Wallet size={14}/>Wypłata
          </button>
        </div>
      )}

      {!selectedJob && (
        <div className="mx-4 mt-3 shrink-0">
          <button
            type="button"
            onClick={() => setWorkerHelpOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border bg-secondary/30 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-1.5"><HelpCircle size={13} className="text-primary shrink-0"/>Co mogę tu zrobić?</span>
            {workerHelpOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
          {workerHelpOpen && (
            <div className="mt-1.5 px-3 py-2.5 rounded-xl border border-border bg-card text-[11px] text-muted-foreground leading-relaxed space-y-1.5">
              <p><strong className="text-foreground/90">Roboty</strong> — wybierz aktywną robotę, dodaj zdjęcia (galeria lub aparat), wyślij raport z wymiarami. Status zdjęć i powód odrzucenia widać przy każdym zdjęciu.</p>
              <p><strong className="text-foreground/90">Grafik</strong> — Twój tydzień Pn–So: godziny z listy płac i adresy z wpisów na robotach.</p>
              <p><strong className="text-foreground/90">Wypłata</strong> — kwota na piątek, skan paragonu (chemia, paliwo) trafia do kosztów do zwrotu po akceptacji admina.</p>
              <p><strong className="text-foreground/90">Offline</strong> — zdjęcia bez sieci trafiają do kolejki i wysyłają się po powrocie zasięgu.</p>
            </div>
          )}
        </div>
      )}

      <PwaInstallBanner compact/>

      {(queueCount > 0 || flushingQueue) && (
        <div className="mx-4 mb-2 flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2 text-xs">
          <CloudOff size={13} className="text-amber-400 shrink-0"/>
          <span className="text-amber-400 font-medium">
            {flushingQueue ? "Wysyłanie kolejki…" : `${queueCount} zdjęć w kolejce offline`}
          </span>
          {!flushingQueue && navigator.onLine && (
            <button type="button" onClick={() => flushQueue()} className="ml-auto text-primary hover:underline shrink-0">
              Wyślij teraz
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto overscroll-contain" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        {selectedJob && (
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2.5">
            <button type="button" onClick={() => setSelectedJobId(null)} className="flex items-center gap-2 text-sm font-medium text-primary min-h-[44px] px-1 -ml-1">
              <ArrowLeft size={16}/>Roboty · Grafik · Wypłata
            </button>
          </div>
        )}
        {!selectedJob && workerTab === "schedule" ? (
          <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
            <div>
              <p className="text-lg font-bold mb-0.5">Twój grafik</p>
              <p className="text-xs text-muted-foreground">
                {weekFrom ? `Tydzień ${fmtDate(weekFrom)} – ${fmtDate(weekTo)}` : "Ładowanie…"}
              </p>
            </div>
            {payrollLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : !currentWeekEmp ? (
              <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-2xl px-4">
                <CalendarDays size={36} className="mx-auto opacity-20 mb-2"/>
                <p className="text-sm">Brak wpisu w tym tygodniu</p>
                <p className="text-xs mt-2">Administrator musi dodać Cię do listy płac — wtedy grafik pojawi się tutaj.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {scheduleColumns.map((col) => {
                  const cell = scheduleCellFor(currentWeekEmp, col.key, col.iso, jobs, []);
                  const isToday = col.iso === todayIsoDate();
                  return (
                    <div
                      key={col.key}
                      className={`rounded-2xl border px-4 py-3.5 ${isToday ? "border-primary/40 bg-primary/5" : "border-border bg-card"} ${cell.working ? "" : "opacity-50"}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>
                          {col.shortLabel} · {col.dateLabel}
                          {isToday && <span className="ml-1.5 text-[10px] font-bold text-primary">DZIŚ</span>}
                        </span>
                        {cell.hoursLabel && (
                          <span className="text-xs font-semibold text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {cell.hoursLabel}
                          </span>
                        )}
                      </div>
                      {cell.working ? (
                        <div className="space-y-1">
                          {cell.timeRange && (
                            <p className="text-xs text-green-400/90 font-medium">{cell.timeRange}</p>
                          )}
                          {cell.locations.length > 0 ? (
                            cell.locations.map((loc, i) => (
                              <p key={i} className="text-xs text-primary flex items-start gap-1">
                                <MapPin size={11} className="shrink-0 mt-0.5"/>
                                {loc}
                              </p>
                            ))
                          ) : cell.timeRange ? (
                            <p className="text-[11px] text-muted-foreground italic">Godziny z listy płac — bez przypisanej roboty</p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Wolne</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : !selectedJob && workerTab === "pay" ? (
          <div className="max-w-lg mx-auto px-4 pt-6 space-y-4 worker-pay-sensitive">
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2.5">
              <Lock size={14} className="text-amber-400 shrink-0 mt-0.5"/>
              <p className="text-[11px] text-amber-400/90 leading-relaxed">
                Kwoty wypłat są poufne. Zakaz zrzutów ekranu i udostępniania. Przy przełączeniu aplikacji dane są ukrywane.
              </p>
            </div>

            {payrollLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/25 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet size={16} className="text-primary"/>
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">Ten tydzień</span>
                  </div>
                  {currentPay && weekFrom ? (
                    <>
                      <p className="text-3xl font-bold text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmt(currentPay.netPay)} <span className="text-lg font-normal text-muted-foreground">PLN</span>
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Wypłata w piątek · <span className="font-medium text-foreground">{fmtDate(fridayPayDate)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tydzień {fmtDate(weekFrom)} – {fmtDate(weekTo)} · {fmtH(currentPay.totalHours)}
                        {currentPay.rateNum > 0 && ` · ${fmt(currentPay.rateNum)} PLN/h`}
                      </p>
                      {currentPay.totalZaliczka > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Zaliczki: −{fmt(currentPay.totalZaliczka)} PLN · brutto {fmt(currentPay.grossPay)} PLN
                        </p>
                      )}
                      {currentPay.totalExtraCosts > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Koszty do zwrotu (zaakceptowane): +{fmt(currentPay.totalExtraCosts)} PLN
                        </p>
                      )}
                      {pendingExtraCosts.length > 0 && (
                        <p className="text-xs text-yellow-400/90 mt-1">
                          Oczekuje na akceptację: {pendingExtraCosts.length} paragon(ów)
                        </p>
                      )}
                      {currentWeekEmp?.settled && (
                        <span className="inline-flex items-center gap-1 mt-3 text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/15 text-green-400">
                          <CheckCircle2 size={11}/> Rozliczone
                        </span>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Nie ma Cię jeszcze na liście płac w tym tygodniu. Administrator musi dodać Cię w panelu — wtedy kwota pojawi się tutaj automatycznie.
                    </p>
                  )}
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-border">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Receipt size={15} className="text-primary"/>
                      Paragon / faktura — koszt do zwrotu
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Chemia, paliwo, zakupy na budowę — zdjęcie paragonu trafia do admina. Kwota w wypłacie po akceptacji.
                    </p>
                  </div>
                  <div className="px-4 py-4 space-y-3">
                    {!currentWeekEmp ? (
                      <p className="text-xs text-muted-foreground">Najpierw admin musi dodać Cię do listy płac w tym tygodniu.</p>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={receiptDesc}
                          onChange={(e) => setReceiptDesc(e.target.value)}
                          placeholder="Opis (np. chemia, paliwo)"
                          className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={receiptAmount}
                            onChange={(e) => setReceiptAmount(e.target.value)}
                            placeholder="Kwota PLN"
                            className="flex-1 bg-secondary rounded-xl px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          />
                          <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold cursor-pointer shrink-0 ${receiptUploading ? "opacity-50 pointer-events-none" : "hover:bg-primary/90"}`}>
                            {receiptUploading ? (
                              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"/>
                            ) : (
                              <Camera size={16}/>
                            )}
                            Skan
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              capture="environment"
                              className="sr-only"
                              disabled={receiptUploading}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) submitReceipt(f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                        {receiptError && (
                          <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{receiptError}</p>
                        )}
                      </>
                    )}
                    {myExtraCosts.length > 0 && (
                      <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                        {[...approvedExtraCosts, ...pendingExtraCosts, ...rejectedExtraCosts].map((cost) => {
                          const st = extraCostStatus(cost);
                          return (
                            <div key={cost.id} className="px-3 py-2.5 flex items-start gap-2">
                              {cost.receiptUrl && (
                                <a href={cost.receiptUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-lg overflow-hidden bg-secondary shrink-0 border border-border flex items-center justify-center">
                                  {/\.pdf(\?|$)/i.test(cost.receiptUrl) ? (
                                    <Receipt size={18} className="text-primary"/>
                                  ) : (
                                    <img src={cost.receiptUrl} alt="" className="w-full h-full object-cover"/>
                                  )}
                                </a>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{cost.description || "—"}</p>
                                <p className="text-sm font-bold text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                  {fmt(parseFloat(cost.amount) || 0)} PLN
                                </p>
                                <span className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                  st === "approved" ? "bg-green-500/15 text-green-400"
                                  : st === "pending" ? "bg-yellow-500/15 text-yellow-400"
                                  : "bg-red-500/15 text-red-400"
                                }`}>
                                  {EXTRA_COST_STATUS_LABELS[st]}
                                </span>
                                {st === "rejected" && cost.rejectReason && (
                                  <p className="text-[10px] text-red-400/90 mt-1 italic">Powód: {cost.rejectReason}</p>
                                )}
                              </div>
                              {(st === "pending" || st === "rejected") && (
                                <button type="button" onClick={() => removeMyExtraCost(cost.id)}
                                  className="p-1.5 text-muted-foreground hover:text-destructive shrink-0">
                                  <Trash2 size={13}/>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowPayHistory((v) => !v)}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Archive size={14} className="text-muted-foreground"/>
                      <span className="text-sm font-semibold">Archiwum wypłat</span>
                      {payHistory.length > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{payHistory.length}</span>
                      )}
                    </div>
                    {showPayHistory ? <ChevronUp size={16} className="text-muted-foreground"/> : <ChevronDown size={16} className="text-muted-foreground"/>}
                  </button>
                  {showPayHistory && (
                    <div className="border-t border-border divide-y divide-border">
                      {payHistory.length === 0 ? (
                        <p className="px-4 py-6 text-xs text-muted-foreground text-center">Brak zapisanych tygodni w archiwum.</p>
                      ) : (
                        payHistory.map((row) => (
                          <div key={row.weekFrom} className="px-4 py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-medium">{fmtDate(row.weekFrom)} – {fmtDate(row.weekTo)}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Piątek {fmtDate(fridayIsoOfWeek(row.weekFrom))} · {fmtH(row.totalHours)}
                                {row.settled && " · rozliczone"}
                              </p>
                            </div>
                            <p className="text-sm font-bold text-primary shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              {fmt(row.netPay)} PLN
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : !selectedJob ? (
          <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
            {todayWork.working ? (
              <div className="bg-primary/10 border border-primary/25 rounded-2xl px-4 py-3.5 space-y-1.5">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={13}/> Gdzie dziś pracuję?
                </p>
                {todayWork.timeRange && (
                  <p className="text-sm font-medium text-green-400/90">{todayWork.timeRange}{todayWork.hoursLabel ? ` · ${todayWork.hoursLabel}` : ""}</p>
                )}
                {todayWork.locations.length > 0 ? (
                  todayWork.locations.map((loc, i) => (
                    <p key={i} className="text-sm font-semibold text-foreground">{loc}</p>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Masz wpis w grafiku — adres pojawi się po przypisaniu do roboty</p>
                )}
              </div>
            ) : currentWeekEmp && (
              <div className="bg-secondary/40 border border-border rounded-2xl px-4 py-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">Gdzie dziś pracuję?</span> — brak wpisu na dziś w grafiku i na robotach.
              </div>
            )}
            <div>
              <p className="text-lg font-bold mb-0.5">Wybierz robotę</p>
              <p className="text-xs text-muted-foreground">Zdjęcia, zakres prac i wymiary mieszkania</p>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input type="text" placeholder="Szukaj adresu lub klienta..." value={search} onChange={e=>setSearch(e.target.value)}
                className="w-full bg-secondary rounded-xl pl-9 pr-4 py-3 text-sm border border-transparent focus:border-primary focus:outline-none"/>
            </div>
            {jobsLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : activeJobs.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <MapPin size={40} className="mx-auto opacity-20 mb-3"/>
                <p className="text-sm">Brak aktywnych robót</p>
                <p className="text-xs mt-2 max-w-xs mx-auto">Administrator musi dodać robotę ze statusem „w trakcie” w panelu.</p>
              </div>
            ) : null}
            <div className="space-y-2">
              {activeJobs.map(job => {
                const pending = (job.photos||[]).filter(p=>p.status==="pending").length;
                return (
                  <button key={job.id} onClick={()=>{setSelectedJobId(job.id);setUploadedCount(0);setUploadError("");setEditingReport(null);}}
                    className="w-full bg-card border border-border rounded-2xl px-5 py-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{job.address||"Bez adresu"}{job.flatNumber&&<span className="text-muted-foreground"> m.{job.flatNumber}</span>}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{job.client||"—"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[10px] bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full font-medium">W trakcie</span>
                        {pending > 0 && <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">{pending} oczekuje</span>}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Rozpoczęto: {fmtDate(job.startDate)}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="max-w-lg mx-auto px-4 pt-4 space-y-5">
            <div className="bg-card border border-border rounded-2xl px-5 py-4">
              <p className="text-base font-bold">{selectedJob.address||"Bez adresu"}{selectedJob.flatNumber&&` m.${selectedJob.flatNumber}`}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedJob.client||"—"} · Rozpoczęto {fmtDate(selectedJob.startDate)}</p>
            </div>

            {uploading && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0"/>
                <p className="text-sm text-primary">
                  Wgrywanie… {uploadedCount}{uploadTotal > 0 ? ` / ${uploadTotal}` : ""} zdjęć
                </p>
              </div>
            )}
            {uploadError && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{uploadError}</p>}

            <div className="bg-card border border-primary/25 rounded-2xl p-4 space-y-4">
              <div>
                <p className="text-sm font-semibold flex items-center gap-2"><ImagePlus size={16} className="text-primary"/>Galeria — wiele zdjęć</p>
                <p className="text-xs text-muted-foreground mt-1">Zaznacz wiele zdjęć z telefonu naraz, podejrzyj i wyślij jednym kliknięciem.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {LABELS.map((lbl) => (
                  <button key={lbl.value} type="button" onClick={() => setGalleryLabel(lbl.value)}
                    className={`text-sm px-3 py-2 rounded-full border transition-colors ${galleryLabel === lbl.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                    {lbl.title}
                  </button>
                ))}
              </div>
              <HiddenFileInput multiple onPick={onGalleryPick}>
                {(open) => (
                  <button
                    type="button"
                    onClick={open}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
                  >
                    <ImagePlus size={18}/>
                    Wybierz z galerii ({galleryPicks.length || "wiele"})
                  </button>
                )}
              </HiddenFileInput>
              {galleryPicks.length > 0 && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {galleryPicks.map((pick, i) => (
                      <div key={pick.preview} className="flex gap-2 items-start bg-secondary/40 rounded-xl p-2">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary border border-border shrink-0">
                          <img src={pick.preview} alt="" className="w-full h-full object-cover"/>
                        </div>
                        <input
                          type="text"
                          value={pick.caption}
                          onChange={(e) => setGalleryPicks((prev) => prev.map((p, j) => j === i ? { ...p, caption: e.target.value } : p))}
                          placeholder="Opis zdjęcia (opcjonalnie)"
                          className="flex-1 bg-background rounded-lg px-2.5 py-2 text-xs border border-border focus:border-primary focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={submitGallery} disabled={uploading}
                      className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                      Wyślij {galleryPicks.length} zdjęć
                    </button>
                    <button type="button" onClick={clearGallery} disabled={uploading}
                      className="px-4 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary">
                      Anuluj
                    </button>
                  </div>
                </div>
              )}
            </div>

            {myReports.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-3">Twoje raporty ({myReports.length})</p>
                <div className="space-y-2">
                  {[...myReports].reverse().map((r) => (
                    <div key={r.id} className={`bg-card border rounded-xl px-4 py-3 text-sm ${editingReport?.id === r.id ? "border-violet-500/50" : "border-border"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{fmtDate(r.submittedAt.slice(0, 10))}{r.updatedAt && " · edyt."}</p>
                          {reportHasWorkScope(r) && (
                            <p className="text-xs text-foreground/90 mt-1 line-clamp-3 whitespace-pre-wrap">{getReportWorkScopeText(r)}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button type="button" onClick={() => setEditingReport(normalizeWorkerReport(r))}
                            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10" title="Edytuj">
                            <Edit2 size={16}/>
                          </button>
                          <button type="button" onClick={() => deleteMyReport(r.id)}
                            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Usuń">
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-card border border-violet-500/25 rounded-2xl p-4">
              <p className="text-sm font-semibold flex items-center gap-2 mb-3">
                <ClipboardList size={16} className="text-violet-400"/>
                {editingReport ? "Edytuj raport" : "Raport z budowy"}
              </p>
              <JobReportForm
                key={`${selectedJob.id}-${editingReport?.id || "new"}`}
                jobId={selectedJob.id}
                authorName={workerName}
                editReport={editingReport}
                onCancelEdit={() => setEditingReport(null)}
                onSaved={handleReportSaved}
                submitLabel={editingReport ? "Zapisz zmiany" : "Wyślij raport do admina"}
                description={editingReport ? undefined : "Zakres prac, wymiary i opisy — admin zobaczy przy tej robocie."}
                disabled={uploading}
              />
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Szybki aparat (pojedynczo)</p>
              <input
                type="text"
                value={quickPhotoCaption}
                onChange={(e) => setQuickPhotoCaption(e.target.value)}
                placeholder="Opis do następnych zdjęć z aparatu (opcjonalnie)"
                className="w-full bg-secondary rounded-xl px-3 py-2.5 text-xs border border-transparent focus:border-primary focus:outline-none mb-2"
              />
              <div className="space-y-2">
                {LABELS.map(lbl => (
                  <label key={lbl.value} className={`flex items-center gap-4 px-4 py-3 rounded-xl border cursor-pointer transition-all hover:opacity-90 active:scale-[0.98] ${lbl.color}`}>
                    <lbl.icon size={18} className="shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{lbl.title}</p>
                    </div>
                    <input type="file" accept="image/*" multiple capture="environment" className="sr-only"
                      onChange={e=>{handleFiles(e.target.files, lbl.value); e.target.value = "";}}/>
                    <Camera size={16} className="shrink-0 opacity-60"/>
                  </label>
                ))}
              </div>
            </div>

            {myPhotos.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-3">Twoje wgrane zdjęcia ({myPhotos.length})</p>
                <div className="space-y-3">
                  {myPhotos.map(p=>(
                    <div key={p.id} className="flex gap-3 bg-card border border-border rounded-xl p-3">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-secondary shrink-0">
                        <img src={p.publicUrl} alt={p.label} className="w-full h-full object-cover"/>
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            {p.label==="before"?"Przed":p.label==="after"?"Po":"W trakcie"} · {fmtDate(p.uploadedAt.slice(0,10))}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            p.status==="approved"?"bg-green-500/15 text-green-400"
                            :p.status==="rejected"?"bg-red-500/15 text-red-400"
                            :"bg-yellow-500/15 text-yellow-400"
                          }`}>
                            {PHOTO_STATUS_LABELS[p.status]}
                          </span>
                        </div>
                        {p.status==="rejected" && p.rejectReason && (
                          <p className="text-[10px] text-red-400/90 italic leading-snug">Powód odrzucenia: {p.rejectReason}</p>
                        )}
                        <input
                          type="text"
                          defaultValue={p.caption || ""}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (v !== (p.caption || "")) updateMyPhoto(p.id, { caption: v });
                          }}
                          placeholder="Opis zdjęcia (opcjonalnie)"
                          className="w-full bg-secondary rounded-lg px-2.5 py-1.5 text-xs border border-transparent focus:border-primary focus:outline-none"
                        />
                        <button type="button" onClick={() => deleteMyPhoto(p.id)}
                          className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1.5 min-h-[44px] px-1 -ml-1">
                          <Trash2 size={14}/>Usuń zdjęcie
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {privacyShield && (
        <div className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center px-6" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
          <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-12 w-auto object-contain opacity-40"/>
          <p className="text-sm text-muted-foreground mt-4 text-center">W&G DOM</p>
          <p className="text-xs text-muted-foreground/60 mt-2 text-center">Dane wypłat ukryte</p>
        </div>
      )}
    </div>
  );
}

// ─── Admin Photo Gallery ───────────────────────────────────────────────────────

function PhotoGallery({photos, onUpdate}: {photos: PhotoEntry[]; onUpdate:(photos:PhotoEntry[], activity?: {type: JobActivityType; text: string})=>void}) {
  const [lightbox, setLightbox] = useState<PhotoEntry|null>(null);

  const pending  = photos.filter(p=>p.status==="pending");
  const approved = photos.filter(p=>p.status==="approved");
  const rejected = photos.filter(p=>p.status==="rejected");

  const approve = (id: string) => {
    const p = photos.find(x => x.id === id);
    onUpdate(
      photos.map(x=>x.id===id?{...x,status:"approved"}:x),
      p ? { type: "photo_approved", text: `Zaakceptowano zdjęcie (${p.label})${p.caption ? `: ${p.caption}` : ""}` } : undefined,
    );
  };
  const reject  = (id: string) => {
    const p = photos.find(x => x.id === id);
    const reason = window.prompt("Powód odrzucenia (opcjonalnie):", "") ?? "";
    onUpdate(
      photos.map(x=>x.id===id?{...x,status:"rejected",rejectReason: reason.trim() || undefined}:x),
      p ? { type: "photo_rejected", text: `Odrzucono zdjęcie (${p.label})${reason.trim() ? `: ${reason.trim()}` : ""}` } : undefined,
    );
  };
  const remove  = (id: string) => onUpdate(photos.filter(p=>p.id!==id));

  if (photos.length === 0) return (
    <div className="text-center py-10 text-muted-foreground">
      <Camera size={36} className="mx-auto opacity-20 mb-2"/>
      <p className="text-sm">Brak zdjęć</p>
      <p className="text-xs mt-1">Pracownicy mogą dodawać zdjęcia w trybie pracownika</p>
    </div>
  );

  const PhotoGrid = ({
    items,
    showActions,
    showDelete,
    showLabel,
  }: {
    items: PhotoEntry[];
    showActions?: boolean;
    showDelete?: boolean;
    showLabel?: boolean;
  }) => (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {items.map((p) => (
        <div key={p.id} className="group relative aspect-square rounded-xl overflow-hidden bg-secondary cursor-pointer" onClick={() => setLightbox(p)}>
          <img src={p.publicUrl} alt={p.label} className="w-full h-full object-cover"/>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
            <Eye size={20} className="text-white drop-shadow"/>
          </div>
          {(showDelete || showActions) && (
            <div className="absolute top-1.5 right-1.5 flex gap-1 z-10" onClick={(e) => e.stopPropagation()}>
              {showActions && (
                <>
                  <button onClick={() => approve(p.id)} title="Akceptuj"
                    className="w-6 h-6 rounded-full bg-green-500/90 flex items-center justify-center hover:bg-green-400 transition-colors shadow-sm">
                    <ThumbsUp size={10} className="text-white"/>
                  </button>
                  <button onClick={() => reject(p.id)} title="Odrzuć"
                    className="w-6 h-6 rounded-full bg-red-500/90 flex items-center justify-center hover:bg-red-400 transition-colors shadow-sm">
                    <ThumbsDown size={10} className="text-white"/>
                  </button>
                </>
              )}
              {showDelete && (
                <button
                  onClick={() => remove(p.id)}
                  title="Usuń zdjęcie"
                  className="w-6 h-6 rounded-full bg-black/65 hover:bg-destructive flex items-center justify-center transition-colors shadow-sm"
                >
                  <X size={12} className="text-white"/>
                </button>
              )}
            </div>
          )}
          {(showLabel || p.caption || p.uploadedBy) && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-2 py-1.5 pointer-events-none">
              {showLabel && (
                <p className="text-[9px] text-white font-medium truncate">{PHOTO_LABEL_NAMES[p.label]}</p>
              )}
              {p.caption && <p className="text-[8px] text-white/90 truncate italic">{p.caption}</p>}
              {p.uploadedBy && <p className="text-[8px] text-white/70 truncate">{p.uploadedBy}</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const CategorySections = ({
    items,
    showActions,
    showDelete,
  }: {
    items: PhotoEntry[];
    showActions?: boolean;
    showDelete?: boolean;
  }) => (
    <div className="space-y-4">
      {PHOTO_LABEL_ORDER.map((label) => {
        const group = items.filter((p) => p.label === label);
        if (group.length === 0) return null;
        const meta = PHOTO_LABEL_SECTION[label];
        const Icon = meta.icon;
        return (
          <div key={label}>
            <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${meta.border}`}>
              <Icon size={13} className={meta.accent}/>
              <span className={`text-xs font-semibold uppercase tracking-wider ${meta.accent}`}>
                {PHOTO_LABEL_NAMES[label]}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary ${meta.accent}`}>
                {group.length}
              </span>
            </div>
            <PhotoGrid items={group} showActions={showActions} showDelete={showDelete} showLabel={false}/>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-yellow-500/20 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock3 size={13} className="text-yellow-400"/>
              <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Oczekuje na akceptację</span>
              <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
            </div>
            <button
              onClick={() => onUpdate(
                photos.map((p) => p.status === "pending" ? { ...p, status: "approved" as const } : p),
                pending.length > 0 ? { type: "photo_approved", text: `Zaakceptowano wszystkie (${pending.length})` } : undefined,
              )}
              className="text-xs text-green-400 hover:text-green-300 transition-colors px-2 py-1 rounded-lg hover:bg-green-500/10"
            >
              Akceptuj wszystkie
            </button>
          </div>
          <div className="p-3">
            <CategorySections items={pending} showActions/>
          </div>
        </div>
      )}

      {approved.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <CheckCircle2 size={13} className="text-green-400"/>
            <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Zaakceptowane</span>
            <span className="bg-green-500/15 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{approved.length}</span>
          </div>
          <div className="p-3">
            <CategorySections items={approved} showDelete/>
          </div>
        </div>
      )}

      {rejected.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden opacity-60">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <X size={13} className="text-muted-foreground"/>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Odrzucone</span>
              <span className="bg-secondary text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">{rejected.length}</span>
            </div>
            <button onClick={() => onUpdate(photos.filter((p) => p.status !== "rejected"))} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
              Usuń wszystkie odrzucone
            </button>
          </div>
          <div className="p-3">
            <CategorySections items={rejected} showDelete/>
          </div>
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90" onClick={()=>setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors p-2"><X size={24}/></button>
          <img src={lightbox.publicUrl} alt={lightbox.label} className="max-w-full max-h-[90dvh] rounded-xl object-contain" onClick={e=>e.stopPropagation()}/>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
            <p className="text-white/90 text-sm font-medium">{PHOTO_LABEL_NAMES[lightbox.label]}</p>
            {lightbox.caption && <p className="text-white/80 text-xs mt-1 italic">{lightbox.caption}</p>}
            <p className="text-white/50 text-xs mt-0.5">{lightbox.uploadedBy} · {new Date(lightbox.uploadedAt).toLocaleDateString("pl-PL")}</p>
            {lightbox.status === "rejected" && lightbox.rejectReason && (
              <p className="text-red-300 text-xs mt-1">Powód odrzucenia: {lightbox.rejectReason}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App with auth ─────────────────────────────────────────────────────────────

function AppInnerWithAuth() {
  const shareToken = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("podglad")?.trim() || "";
  }, []);

  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => {
    const mode = sessionStorage.getItem("wg-session-mode");
    if (mode !== "admin") return null;
    const s = loadAdminSessionFromStorage();
    return s && s.role !== "inspector" ? s : null;
  });

  const [inspectorSession, setInspectorSession] = useState<AdminSession | null>(() => {
    const mode = sessionStorage.getItem("wg-session-mode");
    if (mode !== "inspector") return null;
    const s = loadAdminSessionFromStorage();
    return s?.role === "inspector" ? s : null;
  });

  const [appMode, setAppMode] = useState<"login"|"admin"|"worker"|"inspector">(() => {
    const s = sessionStorage.getItem("wg-session-mode");
    const stored = loadAdminSessionFromStorage();
    if (s === "admin" && stored && stored.role !== "inspector") return "admin";
    if (s === "inspector" && stored?.role === "inspector") return "inspector";
    if (s === "worker") return "worker";
    return "login";
  });
  const [workerName, setWorkerName] = useState(() => sessionStorage.getItem("wg-worker-name") || "");
  const [workerId, setWorkerId] = useState(() => sessionStorage.getItem("wg-worker-id") || "");

  const adminAccess = useMemo(
    () => ({
      session: adminSession,
      canViewRates: adminSession ? adminCanViewRates(adminSession.role) : true,
    }),
    [adminSession],
  );

  const enterAdmin = (session: AdminSession) => {
    if (session.role === "inspector") return;
    saveAdminSessionToStorage(session);
    setAdminSession(session);
    setInspectorSession(null);
    sessionStorage.setItem("wg-session-mode", "admin");
    setAppMode("admin");
  };
  const enterInspector = (session: AdminSession) => {
    if (session.role !== "inspector") return;
    saveAdminSessionToStorage(session);
    setInspectorSession(session);
    setAdminSession(null);
    sessionStorage.setItem("wg-session-mode", "inspector");
    sessionStorage.removeItem("wg-inspector-visit-recorded");
    setAppMode("inspector");
    recordInspectorEvent(session.id, session.displayName, "login").catch(() => {});
  };
  const enterWorker = (emp: DirectoryEmployee) => {
    sessionStorage.setItem("wg-session-mode","worker");
    sessionStorage.setItem("wg-worker-name", emp.name);
    sessionStorage.setItem("wg-worker-id", emp.id);
    setWorkerName(emp.name);
    setWorkerId(emp.id);
    setAppMode("worker");
  };
  const logout = () => {
    sessionStorage.removeItem("wg-session-mode");
    sessionStorage.removeItem("wg-worker-name");
    sessionStorage.removeItem("wg-worker-id");
    sessionStorage.removeItem("wg-inspector-visit-recorded");
    saveAdminSessionToStorage(null);
    setAdminSession(null);
    setInspectorSession(null);
    setAppMode("login"); setWorkerName(""); setWorkerId("");
  };

  if (shareToken) return <ClientShareView token={shareToken}/>;
  if (appMode === "login") return <LoginScreen onAdmin={enterAdmin} onInspector={enterInspector} onWorker={enterWorker}/>;
  if (appMode === "worker") return <WorkerPhotoView workerName={workerName} workerId={workerId} onLogout={logout}/>;
  if (appMode === "inspector" && inspectorSession) {
    return <InspectorPanel inspectorId={inspectorSession.id} displayName={inspectorSession.displayName} onLogout={logout}/>;
  }
  if (!adminSession) return <LoginScreen onAdmin={enterAdmin} onInspector={enterInspector} onWorker={enterWorker}/>;
  return (
    <AdminAccessContext.Provider value={adminAccess}>
      <AppInner onLogout={logout}/>
    </AdminAccessContext.Provider>
  );
}

export default function App() {
  return <CloudLoader><AppInnerWithAuth/></CloudLoader>;
}
