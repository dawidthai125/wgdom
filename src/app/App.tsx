import { useState, useCallback, useMemo, useEffect, useRef, Fragment, type RefObject } from "react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import {
  Calculator, Clock, Banknote, User, Plus, Trash2,
  ChevronRight, Users, FileText, FileDown, CheckCircle2,
  Circle, Archive, ChevronDown, ChevronUp,
  Calendar, CalendarDays, TrendingUp, Wallet, X, Phone,
  UserPlus, Edit2, Check, Search, Building2, MapPin, KeyRound,
  LayoutDashboard, Package, Receipt, AlertTriangle, Download, Upload,
  HardHat, StickyNote, Cloud, CloudUpload, CloudOff,
  Mic, MicOff, Bell, Copy, ScrollText, Sparkles,
  BookOpen, ChevronDown as ChevDown, HelpCircle, Smartphone, Monitor,
  Camera, ImagePlus, Lock, LogOut, Eye, ArrowLeft, ShieldCheck, ThumbsUp, ThumbsDown, Clock3,
  ClipboardList, Ruler, Mail, Send, RotateCcw,
} from "lucide-react";
import {
  API_BASE,
  API_HEADERS,
  DATA_KEYS,
  ADMIN_HASH_KEY,
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
} from "@/lib/cloud-sync";
import { saveLocalDataSnapshot, restoreLocalDataSnapshot, listLocalDataSnapshots, readLocalDataBundle } from "@/lib/local-data-backup";
import { saveLocalJobsSnapshot, restoreLocalJobsSnapshot, listLocalJobsSnapshots } from "@/lib/jobs-safety";
import { isSupabaseConfigured } from "@/config/supabase";
import { saveAs } from "file-saver";
import { watermarkedFile, jobWatermarkLines } from "@/lib/photo-watermark";
import { queuePhoto, listQueuedPhotos, removeQueuedPhoto, queuedPhotoCount } from "@/lib/photo-queue";
import { usePwaInstall } from "@/lib/pwa-install";
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

/** Koszt pracownika do zwrotu w wypłacie (chemia, paliwo, zakupy na budowę) */
interface EmployeeExtraCost {
  id: string;
  description: string;
  amount: string;
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
  submittedAt: string;
  updatedAt?: string;
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

type JobActivityType =
  | "photo_upload"
  | "photo_approved"
  | "photo_rejected"
  | "report_add"
  | "report_edit"
  | "report_delete"
  | "status_change"
  | "document"
  | "note"
  | "share_link"
  | "email_sent"
  | "material"
  | "work_entry";

interface JobActivity {
  id: string;
  at: string;
  actor: string;
  type: JobActivityType;
  text: string;
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultDay(): DayData { return { active: false, from: "07:00", to: "16:00", zaliczka: "" }; }
function defaultDays(): Record<DayKey, DayData> { return Object.fromEntries(DAYS.map((d) => [d, defaultDay()])) as Record<DayKey, DayData>; }

function defaultDirEmployee(): DirectoryEmployee {
  return { id: crypto.randomUUID(), name: "", phone: "", position: "", defaultRate: "25.00", startDate: new Date().toISOString().slice(0,10), active: true, notes: "" };
}

const PHOTO_LABEL_NAMES: Record<PhotoEntry["label"], string> = {
  before: "Przed remontem",
  after: "Po remoncie",
  progress: "W trakcie",
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
  const totalExtraCosts = (emp.extraCosts ?? []).reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
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

// ─── Jobs Helpers ─────────────────────────────────────────────────────────────

const DEFAULT_JOB_ENTRY_HOURS = 9;

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

function collectEntriesFromYesterday(job: Job, targetDate: string): WorkEntry[] {
  const yesterday = previousIsoDate(targetDate);
  const existingToday = new Set(
    job.workEntries
      .filter((e) => e.date === targetDate)
      .map((e) => e.directoryId || e.employeeName),
  );
  return job.workEntries
    .filter((e) => e.date === yesterday)
    .filter((e) => !existingToday.has(e.directoryId || e.employeeName))
    .map((e) => duplicateWorkEntry(e, targetDate));
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
  return {
    ...job,
    photos: job.photos || [],
    workerReports: job.workerReports || [],
    activityLog: job.activityLog || [],
    materials: job.materials || [],
  };
}

function appendJobActivity(job: Job, type: JobActivityType, text: string, actor: string): Job {
  const entry: JobActivity = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actor,
    type,
    text,
  };
  return { ...job, activityLog: [entry, ...(job.activityLog || [])].slice(0, 200) };
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
  return {
    ...r,
    workItems: items,
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

function WeekEmployeeDetail({emp, weekFrom, onChange, onClose}:{emp:WeekEmployee; weekFrom:string; onChange:(u:WeekEmployee)=>void; onClose:()=>void}) {
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
        {/* Rate override */}
        <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3">
          <Banknote size={14} className="text-muted-foreground shrink-0"/>
          <span className="text-sm text-muted-foreground flex-1">Stawka w tym tygodniu</span>
          <input type="number" min="0" step="0.50" value={emp.rate}
            onChange={(e)=>onChange({...emp,rate:e.target.value})}
            className="w-24 bg-background rounded-lg px-2 py-1.5 text-sm text-right border border-transparent focus:border-primary focus:outline-none"
            style={{fontFamily:"'JetBrains Mono', monospace"}}/>
          <span className="text-xs text-muted-foreground">PLN/h</span>
        </div>

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
              {extraCosts.map((cost) => (
                <div key={cost.id} className="px-4 py-3 flex items-start gap-2">
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
              ))}
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
  onClose,
  onManageContacts,
}: {
  weekFrom: string;
  weekTo: string;
  rows: ({ emp: WeekEmployee } & ReturnType<typeof calcWeekEmployee>)[];
  totals: PayrollExportTotals;
  contacts: EmailContact[];
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
      const attachments: { filename: string; content: string }[] = [];
      if (attachPdf) {
        setSendStage("Ładuję generator PDF…");
        const pdfBlob = await generatePayrollPdfBlob(weekFrom, weekTo, calcRows, totals, weeklyGrid, extraHourLines, prevSatDetails, prevSatIso);
        setSendStage("Koduję PDF…");
        attachments.push({ filename: `lista-plac-${weekFrom}.pdf`, content: await blobToBase64(pdfBlob) });
      }
      if (attachWord) {
        setSendStage("Generuję Word…");
        const wordBlob = await generatePayrollWordBlob(weekFrom, weekTo, calcRows, totals, weeklyGrid, extraHourLines, prevSatDetails, prevSatIso);
        setSendStage("Koduję Word…");
        attachments.push({ filename: `lista-plac-${weekFrom}.docx`, content: await blobToBase64(wordBlob) });
      }
      const html = buildPayrollEmailHtml(weekFrom, weekTo, calcRows, totals, introMessage);
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

// ─── Lista Płac (current week) ────────────────────────────────────────────────

function PayrollView({
  weekEmployees, weekFrom, weekTo, directory, contacts,
  onWeekChange, onToggleSettled, onSaveWeek, savedWeeks,
  onAddFromDirectory, onRemoveWeekEmployee, onUpdateWeekEmployee,   onGoToCurrent,
  onManageContacts,
  onRestoreFromArchive,
}:{
  weekEmployees: WeekEmployee[]; weekFrom:string; weekTo:string;
  directory: DirectoryEmployee[];
  contacts: EmailContact[];
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
}) {
  const [selectedEmpId, setSelectedEmpId] = useState<string|null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string|null>(null);
  const [satDismissed, setSatDismissed] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const isSaturday = new Date().getDay() === 6;

  const lastSavedWeek = savedWeeks.length > 0
    ? [...savedWeeks].sort((a,b) => b.weekFrom.localeCompare(a.weekFrom))[0]
    : null;

  const copyFromLastWeek = () => {
    if (!lastSavedWeek) return;
    const lastNames = new Set(lastSavedWeek.employees.map(e => e.name));
    const alreadyAssigned = new Set(weekEmployees.map(e => e.directoryId).filter(Boolean));
    const toAdd = directory.filter(d => d.active && lastNames.has(d.name) && !alreadyAssigned.has(d.id));
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
  const availableFromDir = directory.filter((d)=>d.active&&!assignedDirIds.has(d.id));
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
    return { calcRows, weeklyGrid, extraHourLines, prevSatDetails, prevSatIso };
  };

  const exportPDF = async () => {
    const { calcRows, weeklyGrid, extraHourLines, prevSatDetails, prevSatIso } = payrollExportArgs();
    const blob = await generatePayrollPdfBlob(weekFrom, weekTo, calcRows, exportTotals, weeklyGrid, extraHourLines, prevSatDetails, prevSatIso);
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
                {lastSavedWeek && weekEmployees.length === 0 && (
                  <button onClick={copyFromLastWeek} className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/70 border border-border rounded-lg text-sm font-medium transition-colors" title={`Skopiuj pracowników z ${fmtDate(lastSavedWeek.weekFrom)}–${fmtDate(lastSavedWeek.weekTo)}`}>
                    <Copy size={14}/>Kopiuj z poprzedniego tygodnia
                  </button>
                )}
                <button onClick={onSaveWeek} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${alreadySaved?"bg-green-500/15 text-green-400 border border-green-500/20":"bg-secondary hover:bg-secondary/70 border border-border"}`}>
                  <Archive size={14}/>{alreadySaved?"Zapisany ✓":"Zapisz tydzień"}
                </button>
                <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2.5 bg-destructive/80 hover:bg-destructive text-white rounded-lg text-sm font-medium transition-colors"><FileDown size={14}/>PDF</button>
                <button onClick={exportWord} className="flex items-center gap-2 px-4 py-2.5 bg-primary/90 hover:bg-primary text-primary-foreground rounded-lg text-sm font-medium transition-colors"><FileDown size={14}/>Word</button>
                {weekEmployees.length > 0 && (
                  <button onClick={() => setShowEmailModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/70 border border-border rounded-lg text-sm font-medium transition-colors">
                    <Send size={14}/>Email
                  </button>
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
                                  <p className="text-xs text-muted-foreground truncate">{r.emp.position||"—"} · {fmt(r.rateNum)} PLN/h</p>
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
                      <p className="text-xs text-muted-foreground">{d.position||"—"} · {d.defaultRate} PLN/h</p>
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

      {showEmailModal && (
        <PayrollEmailModal
          weekFrom={weekFrom}
          weekTo={weekTo}
          rows={rows}
          totals={exportTotals}
          contacts={contacts}
          onClose={() => setShowEmailModal(false)}
          onManageContacts={() => { setShowEmailModal(false); onManageContacts(); }}
        />
      )}
    </div>
  );
}

function DirectoryView({directory, onChange}:{directory:DirectoryEmployee[]; onChange:(d:DirectoryEmployee[])=>void}) {
  const [editId, setEditId] = useState<string|null>(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

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
  const remove = (id:string) => onChange(directory.filter((d)=>d.id!==id));
  const toggleActive = (id:string) => update({...directory.find((d)=>d.id===id)!, active:!directory.find((d)=>d.id===id)!.active});

  const editEmp = directory.find((d)=>d.id===editId)||null;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input type="text" placeholder="Szukaj po nazwisku, stanowisku, telefonie..." value={search} onChange={(e)=>setSearch(e.target.value)} className="w-full bg-card border border-border rounded-xl pl-8 pr-3 py-2.5 text-sm focus:border-primary focus:outline-none transition-colors"/>
            </div>
            <div className="flex items-center gap-3 ml-auto">
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
            <StatCard label="Aktywni" value={String(directory.filter(d=>d.active).length)} icon={Users} accent/>
            <StatCard label="Nieaktywni" value={String(directory.filter(d=>!d.active).length)} icon={User}/>
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
                      <div><label className="text-xs text-muted-foreground block mb-1">Imię i nazwisko *</label><input type="text" value={editEmp.name} onChange={(e)=>update({...editEmp,name:e.target.value})} placeholder="Jan Kowalski" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/></div>
                      <div><label className="text-xs text-muted-foreground block mb-1">Stanowisko</label><input type="text" value={editEmp.position} onChange={(e)=>update({...editEmp,position:e.target.value})} placeholder="np. Murarz, Kierowca..." className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/></div>
                      <div><label className="text-xs text-muted-foreground block mb-1">Telefon</label><input type="tel" value={editEmp.phone} onChange={(e)=>update({...editEmp,phone:e.target.value})} placeholder="+48 000 000 000" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/></div>
                      <div><label className="text-xs text-muted-foreground block mb-1">Domyślna stawka (PLN/h)</label><input type="number" min="0" step="0.5" value={editEmp.defaultRate} onChange={(e)=>update({...editEmp,defaultRate:e.target.value})} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors" style={{fontFamily:"'JetBrains Mono', monospace"}}/></div>
                      <div><label className="text-xs text-muted-foreground block mb-1">Data zatrudnienia</label><input type="date" value={editEmp.startDate} onChange={(e)=>update({...editEmp,startDate:e.target.value})} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors" style={{fontFamily:"'JetBrains Mono', monospace"}}/></div>
                      <div><label className="text-xs text-muted-foreground block mb-1">Uwagi</label><input type="text" value={editEmp.notes} onChange={(e)=>update({...editEmp,notes:e.target.value})} placeholder="Dodatkowe informacje..." className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/></div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <button onClick={()=>setEditId(null)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"><Check size={13}/>Zapisz</button>
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
                        <p className="text-xs text-muted-foreground">{emp.position||<span className="italic">brak stanowiska</span>}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone size={11} className="shrink-0"/>{emp.phone||"—"}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span style={{fontFamily:"'JetBrains Mono', monospace"}}>{emp.defaultRate} PLN/h</span>
                        {emp.startDate&&<span>od {fmtDate(emp.startDate)}</span>}
                        {!emp.active&&<span className="bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">Nieaktywny</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
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

  if(savedWeeks.length===0) return <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground"><Archive size={48} className="opacity-15"/><p className="text-sm font-medium">Brak zapisanych tygodni</p><p className="text-xs text-center max-w-xs">Przejdź do Listy Płac i kliknij "Zapisz tydzień".</p></div>;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="flex items-center gap-2 flex-wrap">
          {years.map((y)=><button key={y} onClick={()=>{setSelectedYear(y);setSelectedMonth(null);}} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeYear===y?"bg-primary text-primary-foreground":"bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>{y}</button>)}
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
    const workItems = report.workItems
      .filter((item) => workItemHasContent(item) && selected.has(`wi:${report.id}:${item.id}`))
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
                        {report.workItems.filter(workItemHasContent).map((item) => {
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
}) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "in_progress" | "completed">("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [workerFilter, setWorkerFilter] = useState<string>("");
  const [showEmailModal, setShowEmailModal] = useState(false);

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
    () => (selectedJob ? collectEntriesFromYesterday(selectedJob, todayIso) : []),
    [selectedJob, todayIso],
  );

  const payrollEntriesForToday = useMemo(
    () => (selectedJob ? workEntriesFromPayrollForDate(selectedJob, weekEmployees, weekFrom, todayIso) : []),
    [selectedJob, weekEmployees, weekFrom, todayIso],
  );

  const workerGroups = useMemo(
    () => groupWorkEntriesByEmployee(selectedJob?.workEntries ?? []),
    [selectedJob?.workEntries],
  );

  useEffect(() => {
    setExpandedWorkerKeys(new Set());
  }, [selectedJobId]);

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
    const wasAllDone = allDocsDone(next);
    const withStatus = wasAllDone && next.status === "in_progress"
      ? appendJobActivity({ ...next, status: "completed" as const }, "status_change", "Automatycznie oznaczono jako zdane (komplet dokumentów)", "System")
      : next;
    setJobs(prev=>prev.map(j=>j.id===withStatus.id?withStatus:j));
  };

  const tryToggleStatus = (job: Job) => {
    if (job.status === "in_progress" && !allDocsDone(job)) {
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
    setJobs(prev=>prev.filter(j=>j.id!==id));
    if(selectedJobId===id) setSelectedJobId(null);
    setDeleteConfirmId(null);
  };

  const exportJobPDF = async (job: Job) => {
    const pdfMake = await loadPdfMake();
    const C2 = { navy:"#344254", red:"#C0392B", light:"#EDF1F6", white:"#FFFFFF", muted:"#8A9BB0" };
    const title = `${job.address||"Bez adresu"}${job.flatNumber?` m.${job.flatNumber}`:""}`;
    const docsChecked = DOCUMENT_TYPES.filter(d=>job.documents[d]);
    const workerRows = job.workEntries.map(e=>[
      {text:fmtDate(e.date),fontSize:9,color:C2.muted},{text:e.employeeName||"—",fontSize:9},
      {text:fmtH(e.hours),fontSize:9,alignment:"right"},{text:`${fmt(e.rate)} PLN/h`,fontSize:9,color:C2.muted,alignment:"right"},
      {text:`${fmt(e.hours*e.rate)} PLN`,fontSize:9,bold:true,alignment:"right",color:C2.red},
    ]);
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
              widths:["auto","*","auto","auto","auto"],
              body:[
                [{text:"Data",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8},{text:"Pracownik",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8},{text:"Godz.",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8,alignment:"right"},{text:"Stawka",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8,alignment:"right"},{text:"Koszt",bold:true,fillColor:C2.navy,color:C2.white,fontSize:8,alignment:"right"}],
                ...workerRows,
                [{text:"Suma",bold:true,fillColor:C2.light,colSpan:2,fontSize:9},{},
                 {text:fmtH(jobTotalHours(job)),bold:true,fillColor:C2.light,alignment:"right",fontSize:9},
                 {text:"",fillColor:C2.light},
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
    const entry: WorkEntry = {
      id: crypto.randomUUID(),
      directoryId: entryDirId,
      employeeName: emp?.name||"—",
      date: entryDate,
      hours: parseFloat(entryHours)||0,
      rate: parseFloat(entryRate)||parseFloat(emp?.defaultRate||"0")||0,
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

  const copyEntryToToday = (entry: WorkEntry) => {
    if (!selectedJob) return;
    if (selectedJob.workEntries.some(
      (e) => e.date === todayIso && (e.directoryId === entry.directoryId || e.employeeName === entry.employeeName),
    )) return;
    appendWorkEntries(
      [duplicateWorkEntry(entry, todayIso)],
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
          {directory.filter(d=>d.active).length>0&&(
            <select value={workerFilter} onChange={e=>setWorkerFilter(e.target.value)}
              className="w-full bg-secondary rounded-lg px-3 py-2 text-xs border border-transparent focus:border-primary focus:outline-none text-muted-foreground">
              <option value="">Wszyscy pracownicy</option>
              {directory.filter(d=>d.active).map(d=>(
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
                return (
                  <button key={job.id} onClick={()=>setSelectedJobId(job.id)} className={`w-full text-left px-4 py-3.5 border-b border-border transition-colors hover:bg-secondary/40 ${isSelected?"bg-primary/8 border-l-2 border-l-primary":""}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate leading-tight">{job.address||<span className="italic text-muted-foreground">Bez adresu</span>}{job.flatNumber&&<span className="text-muted-foreground"> m.{job.flatNumber}</span>}</p>
                        <p className="text-xs text-muted-foreground truncate">{job.client||"—"}</p>
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
                  </button>
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
                  </div>
                </div>
              </div>

              {/* Status row */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 flex-wrap">
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
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock size={13}/>
                    <span>Czas remontu: <span className="font-semibold text-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{jobDuration(selectedJob)} dni</span></span>
                  </div>
                  {!allDocsDone(selectedJob) && selectedJob.status === "in_progress" && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      Brakuje <span className="font-semibold text-yellow-400">{REQUIRED_DOCS.filter(d=>!selectedJob.documents[d]).length}</span> z {REQUIRED_DOCS.length} wymaganych dokumentów
                    </span>
                  )}
                  {allDocsDone(selectedJob) && selectedJob.status === "in_progress" && (
                    <span className="text-xs text-green-400 ml-auto flex items-center gap-1">
                      <CheckCircle2 size={11}/>Wszystkie dokumenty skompletowane — można zdać
                    </span>
                  )}
                </div>
                {statusWarning && (
                  <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5 text-sm text-destructive">
                    <X size={14} className="shrink-0"/>
                    <span>
                      Nie można oznaczyć jako zdane — brakuje <strong>{REQUIRED_DOCS.filter(d=>!selectedJob.documents[d]).length}</strong> dokumentów:{" "}
                      {REQUIRED_DOCS.filter(d=>!selectedJob.documents[d]).map(d=>DOC_LABELS[d]).join(", ")}.
                    </span>
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
                  <button onClick={()=>exportJobPDF(selectedJob)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-destructive/80 hover:bg-destructive text-white rounded-lg font-medium transition-colors">
                    <FileDown size={12}/>PDF
                  </button>
                  {deleteConfirmId===selectedJob.id?(
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Na pewno usunąć?</span>
                      <button onClick={()=>deleteJob(selectedJob.id)} className="text-xs bg-destructive text-white px-3 py-1 rounded-lg font-medium">Usuń</button>
                      <button onClick={()=>setDeleteConfirmId(null)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg"><X size={12}/></button>
                    </div>
                  ):(
                    <button onClick={()=>setDeleteConfirmId(selectedJob.id)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-lg hover:bg-secondary">
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
                <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                  <ScrollText size={13} className="text-muted-foreground"/>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Historia roboty</span>
                  <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
                    {(selectedJob.activityLog || []).length}
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-border">
                  {(selectedJob.activityLog || []).length === 0 ? (
                    <p className="px-5 py-8 text-sm text-muted-foreground text-center">Brak wpisów — aktywność pojawi się po zmianach na robocie.</p>
                  ) : (
                    (selectedJob.activityLog || []).map((ev) => (
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
                        setEntryDirId(e.target.value);
                        const emp=directory.find(d=>d.id===e.target.value);
                        if(emp) setEntryRate(emp.defaultRate);
                      }} className="w-full bg-background rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none transition-colors">
                        <option value="">Wybierz pracownika...</option>
                        {directory.filter(d=>d.active).map(d=>(
                          <option key={d.id} value={d.id}>{d.name} — {d.position}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Data</label>
                      <input type="date" value={entryDate} onChange={e=>setEntryDate(e.target.value)} className="w-full bg-background rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none transition-colors" style={{fontFamily:"'JetBrains Mono', monospace"}}/>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Godziny</label>
                      <input type="number" min="0.5" step="0.5" value={entryHours} onChange={e=>setEntryHours(e.target.value)} className="w-full bg-background rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none transition-colors" style={{fontFamily:"'JetBrains Mono', monospace"}}/>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Stawka (PLN/h)</label>
                      <input type="number" min="0" step="0.5" value={entryRate} onChange={e=>setEntryRate(e.target.value)} placeholder={selectedDirEmp?.defaultRate||"0"} className="w-full bg-background rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none transition-colors" style={{fontFamily:"'JetBrains Mono', monospace"}}/>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleAddEntry} disabled={!entryDirId||!entryHours} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      <Check size={13}/>Dodaj
                    </button>
                    <button onClick={()=>setShowAddEntry(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Anuluj</button>
                    {entryDirId&&entryHours&&entryRate&&(
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
                                <span className="text-xs text-muted-foreground block" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(entry.rate)} PLN/h</span>
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
                                  <span className="text-xs text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(entry.rate)} PLN/h · </span>
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
              authorName="Administrator"
              reports={jobWorkerReports(selectedJob)}
              onAddReport={(report) => updateJob({
                ...selectedJob,
                workerReports: [...jobWorkerReports(selectedJob), report],
              }, { type: "report_add", text: `Dodano raport (${report.workItems.length} punktów)` })}
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
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <ImagePlus size={13}/>Dodaj
                  <input type="file" accept="image/*" multiple className="sr-only"
                    onChange={async e=>{
                      const files = e.target.files;
                      if (!files) return;
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
                      e.target.value = "";
                    }}/>
                </label>
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
  onNavigate,
}: {
  jobs: Job[];
  directory: DirectoryEmployee[];
  weekEmployees: WeekEmployee[];
  weekFrom: string; weekTo: string;
  savedWeeks: WeekSnapshot[];
  onNavigate: (v: "payroll" | "directory" | "archive" | "jobs" | "schedule", jobId?: string) => void;
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
      jobs.flatMap((j) =>
        (j.photos || [])
          .filter((p) => p.status === "pending")
          .map((p) => ({ photo: p, job: j })),
      ),
    [jobs],
  );

  const recentReports = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const cutoffIso = cutoff.toISOString();
    return jobs
      .filter((j) => j.status === "in_progress")
      .flatMap((j) => jobWorkerReports(j).map((r) => ({ report: r, job: j })))
      .filter(({ report: r }) => r.submittedAt >= cutoffIso || (r.updatedAt && r.updatedAt >= cutoffIso))
      .sort((a, b) =>
        (b.report.updatedAt || b.report.submittedAt).localeCompare(
          a.report.updatedAt || a.report.submittedAt,
        ),
      )
      .slice(0, 5);
  }, [jobs]);

  const totalReportsActive = useMemo(
    () => activeJobs.reduce((s, j) => s + jobWorkerReports(j).length, 0),
    [activeJobs],
  );

  const attentionCount =
    jobsMissingDocs.length + pendingPhotos.length + recentReports.length;

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

        {/* Skróty liczbowe */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              {weekEmployees.length > 0 ? `${offToday.length} wolne · ${directory.filter((d) => d.active).length} w kartotece` : "brak w liście płac"}
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

        {/* Wymaga uwagi */}
        {attentionCount > 0 && (
          <div className="bg-card border border-amber-500/20 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-amber-500/15 flex items-center gap-2 bg-amber-500/5">
              <AlertTriangle size={14} className="text-amber-400 shrink-0"/>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Wymaga uwagi</span>
            </div>
            <div className="divide-y divide-border">
              {pendingPhotos.length > 0 && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Camera size={14} className="text-yellow-400"/>
                      Zdjęcia do akceptacji
                      <span className="text-[10px] bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">
                        {pendingPhotos.length}
                      </span>
                    </p>
                    <button type="button" onClick={() => onNavigate("jobs")} className="text-xs text-primary hover:underline">
                      Roboty →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {pendingPhotos.slice(0, 3).map(({ photo, job }) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => onNavigate("jobs", job.id)}
                        className="w-full text-left text-xs text-muted-foreground truncate hover:text-foreground transition-colors"
                      >
                        <span className="text-foreground">{job.address || "Bez adresu"}</span>
                        {photo.caption ? ` — ${photo.caption}` : ` · ${photo.uploadedBy}`}
                      </button>
                    ))}
                    {pendingPhotos.length > 3 && (
                      <p className="text-[10px] text-muted-foreground">+ {pendingPhotos.length - 3} więcej</p>
                    )}
                  </div>
                </div>
              )}
              {recentReports.length > 0 && (
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <ClipboardList size={14} className="text-violet-400"/>
                      Raporty z budowy (14 dni)
                      <span className="text-[10px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full font-bold">
                        {recentReports.length}
                      </span>
                    </p>
                    <button type="button" onClick={() => onNavigate("jobs")} className="text-xs text-primary hover:underline">
                      Roboty →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {recentReports.map(({ report, job }) => (
                      <button
                        key={report.id}
                        type="button"
                        onClick={() => onNavigate("jobs", job.id)}
                        className="w-full text-left text-xs text-muted-foreground truncate hover:text-foreground transition-colors"
                      >
                        <span className="text-foreground">{report.workerName}</span>
                        {" · "}
                        {job.address || "Bez adresu"}
                        {report.workItems[0]?.text && ` — ${report.workItems[0].text}`}
                      </button>
                    ))}
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
                    {jobsReadyToClose.length > 0 && (
                      <span className="text-[10px] text-green-400">{jobsReadyToClose.length} got. do zdania</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {jobsMissingDocs.slice(0, 4).map((job) => {
                      const missing = jobMissingRequiredDocs(job);
                      const days = jobDaysSinceStart(job);
                      return (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() => onNavigate("jobs", job.id)}
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
              <p className="text-xs text-muted-foreground leading-relaxed">Przyciski „PDF” i „Word” generują listę płac z kolumnami: godziny, brutto, zaliczki, koszty do zwrotu, do wypłaty. Jeśli ktoś ma dodatkowe godziny — pod tabelą pojawi się osobna sekcja ze szczegółami (dzień, opis, godziny).</p>
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
              {q:"Jak założyć nową robotę?", a:'Kliknij "Nowa robota" w lewym górnym rogu. Wpisz adres, numer mieszkania i klienta (domyślnie Wrocławskie Mieszkania). Możesz też wpisać daty rozpoczęcia i zakończenia.'},
              {q:"Dokumenty do odbioru — co to jest?", a:"To lista dokumentów które trzeba zebrać żeby zdać robotę. Zaznaczaj je gdy je masz: Zlecenie, Zakres robót, Kosztorys, Kominiarz, Pomiary, Oświadczenia, Gwarancje, Rysunek/Plan. Zdjęcia są opcjonalne. Pasek postępu na liście robót pokazuje ile dokumentów masz już skompletowanych."},
              {q:"Kiedy robota zmienia status na Zdana?", a:"Automatycznie gdy zaznaczysz wszystkie wymagane dokumenty (bez zdjęć). Możesz też kliknąć przycisk statusu ręcznie — ale jeśli brakuje dokumentów, aplikacja ostrzeże i powie czego brakuje."},
              {q:"Jak dodać czas pracy na robocie?", a:'Roboty → wybierz robotę → „Pracownicy na robocie”. Najszybciej: „Wczoraj → dziś” (ta sama ekipa co wczoraj) lub „Z listy płac” (osoby zaznaczone dziś w liście płac). Ręcznie: „Dodaj wpis” — pracownik, data (domyślnie dziś), 9 h, stawka. Wpis pokazuje adres na Pulpicie i w Grafiku.'},
              {q:"Jak dodać koszty materiałów?", a:'Przewiń do sekcji "Materiały" → kliknij "Dodaj". Wpisz opis i koszt. Materiały sumują się z kosztem pracy i tworzą łączny koszt remontu.'},
              {q:"Jak dodać raport (zakres + wymiary)?", a:'Sekcja „Raporty — zakres i wymiary” na karcie roboty: u góry formularz (taki sam jak u pracownika), na dole lista wysłanych raportów. Możesz też poprosić pracownika o wysłanie z telefonu.'},
              {q:"Jak wyeksportować kartę roboty do PDF?", a:'Kliknij czerwony przycisk "PDF" w nagłówku roboty. Wygeneruje się dokument z dokumentami, pracownikami, materiałami i podsumowaniem kosztów.'},
              {q:"Raporty pracowników — gdzie?", a:"Roboty → wybierz robotę → „Raporty — zakres i wymiary”. Rozwiń wpis — widać punkty, tabelę pomieszczeń i rysunek."},
              {q:"Link podglądu dla klienta", a:"W karcie roboty: sekcja „Podgląd dla klienta” → Utwórz link → Kopiuj. Klient otwiera link bez logowania — widzi tylko zaakceptowane zdjęcia i raporty (bez kosztów). Wyłącz link gdy nie jest już potrzebny."},
              {q:"Historia roboty", a:"Przycisk „Historia” na karcie roboty — log zdarzeń: zdjęcia, dokumenty, emaile, link klienta, zmiany statusu."},
              {q:"Pulpit — szybki dostęp do roboty", a:"W sekcji „Wymaga uwagi” i „Roboty w trakcie” kliknij wiersz — aplikacja otworzy od razu tę robotę w zakładce Roboty."},
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
              {q:"Telefon a logowanie pracownika", a:"Numer w kartotece (np. +48 501 234 567) to hasło pracownika — wpisuje 9 ostatnich cyfr: 501234567. Bez telefonu nie zaloguje się do wgrywania zdjęć."},
              {q:"Aplikacja na ekranie telefonu (PWA)", a:"Po wejściu jako pracownik pojawi się baner „Dodaj na ekran”. Na Androidzie — Zainstaluj. Na iPhone (Safari) — Udostępnij → Dodaj do ekranu początkowego. Działa szybciej i trzyma zdjęcia w kolejce offline gdy brak sieci."},
              {q:"Zdjęcia offline i znak wodny", a:"Bez internetu zdjęcia trafiają do kolejki i wysyłają się same po powrocie sieci. Każde zdjęcie ma znak wodny: adres, data i W&G DOM."},
              {q:"Notatka głosowa w raporcie", a:"Przy dodawaniu raportu (zakres prac, wiadomość dla admina) — ikona mikrofonu. Działa w Chrome/Edge na telefonie i komputerze."},
              {q:"Co to jest domyślna stawka?", a:"To stawka PLN za godzinę, którą ten pracownik zwykle zarabia. Będzie się automatycznie podpowiadać w Liście Płac i w Robotach. Możesz ją zmienić dla konkretnego tygodnia lub roboty — bez zmiany tej domyślnej."},
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
          <p className="text-sm text-foreground/90 leading-relaxed">Na ekranie startowym wybierz <strong>Pracownik</strong> → znajdź się na liście → wpisz <strong>9 ostatnich cyfr telefonu</strong> (bez +48). Potem wybierz robotę i dodaj zdjęcia lub raport.</p>
          <div className="space-y-3">
            {[
              {q:"Zakładka Wypłata u pracownika", a:"Po zalogowaniu pracownik widzi zakładkę „Wypłata”: kwotę do wypłaty w najbliższy piątek, godziny bieżącego tygodnia, zaliczki i koszty do zwrotu (jeśli wpisane). Niżej — archiwum wypłat z zapisanych tygodni. Administrator musi najpierw dodać pracownika do listy płac w danym tygodniu."},
              {q:"Ochrona danych wypłat", a:"Kwota wypłaty ukrywa się gdy pracownik przełączy aplikację (Alt+Tab). Kopiowanie tekstu jest zablokowane — to świadomy kompromis między wygodą a prywatnością na współdzielonym telefonie."},
              {q:"Jak się zalogować?", a:"Administrator musi wpisać Twój numer w kartotece Pracownicy (np. +48 501 234 567). Logujesz się 9 cyframi: 501234567. Wybierz swoje imię z listy, nie wpisuj ręcznie."},
              {q:"Jak dodać wiele zdjęć?", a:"W robocie użyj sekcji „Galeria — wiele zdjęć”: wybierz typ (przed/w trakcie/po), kliknij „Wybierz z galerii”, zaznacz wiele zdjęć, podejrzyj miniaturki i „Wyślij”."},
              {q:"Jak wysłać raport z budowy?", a:"Sekcja „Raport z budowy”: punkty zakresu (z opisem do każdego), wymiary z opisem pomieszczenia lub foto rysunku z opisem, na dole „Wiadomość dla admina”. Po wysłaniu możesz edytować lub usunąć raport w „Twoje raporty”."},
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
      id:"changelog",
      icon:ScrollText,
      title:"Historia zmian",
      subtitle:"Co nowego w aplikacji",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">W menu po lewej (lub na dole na telefonie) jest zakładka <strong>Zmiany</strong>. Tam znajdziesz chronologiczną listę wszystkich aktualizacji — od pierwszej wersji po najnowszą.</p>
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
            <li><strong>Pracownicy</strong> — kartoteka, stawki, telefony</li>
            <li><strong>Kontakty</strong> — odbiorcy email z uprawnieniami: Roboty (materiały z budowy) lub Lista płac</li>
            <li><strong>Lista płac</strong> — godziny (w tym dodatkowe), zaliczki, koszty do zwrotu, rozliczenia; eksport PDF/Word i wysyłka emailem</li>
            <li><strong>Archiwum</strong> — zapisane tygodnie</li>
            <li><strong>Roboty</strong> — adresy, dokumenty, materiały, raporty, wpisy czasu pracy</li>
            <li><strong>Zdjęcia</strong> — pliki w chmurze Supabase Storage; informacja o zdjęciu (kto, kiedy, status) w danych roboty</li>
            <li><strong>Hasło admina</strong> — po zmianie hasła działa na każdym urządzeniu (opcja „Zapamiętaj hasło” jest tylko lokalnie w tej przeglądarce — nie trafia do chmury)</li>
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
              {q:"Logowanie administratora — zapamiętaj hasło", a:"Przy logowaniu jako Administrator możesz zaznaczyć „Zapamiętaj hasło na tym urządzeniu”. Hasło jest szyfrowane lokalnie w przeglądarce — nie wysyła się do chmury. Przy następnym wejściu na tym samym telefonie/komputerze pole hasła wypełni się samo. Wyloguj się ręcznie jeśli korzystasz ze wspólnego urządzenia."},
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
            {icon:Bell, title:"Reminder w sobotę", desc:"Co sobotę w Liście Płac pojawia się żółty baner o zamknięciu tygodnia. Po „Zapisz tydzień” wysyłany jest też jeden backup emailem (raz na tydzień, nie codziennie)."},
            {icon:CalendarDays, title:"Grafik tygodniowy", desc:"Menu Grafik — cały tydzień na jednym ekranie. Godziny z listy płac (łącznie z dodatkowymi blokami), adres z wpisu na robocie."},
            {icon:Wallet, title:"Koszty do zwrotu vs zaliczka", desc:"Zaliczka = pieniądze wzięte z góry (odejmowane). Koszty do zwrotu = pracownik zapłacił z własnej kieszeni (doliczane). Oba wpisujesz w panelu pracownika w Liście Płac."},
            {icon:Clock, title:"Dodatkowe godziny w dniu", desc:"Pod każdym dniem w panelu pracownika: „Dodatkowe godziny w …” → opis + od–do. Wliczają się do wypłaty, grafiku i PDF."},
            {icon:LayoutDashboard, title:"Pulpit — centrum dowodzenia", desc:"„Pracuje dziś” pokazuje łączne godziny z Listy Płac (w tym dodatkowe). Adres pod imieniem pojawia się dopiero gdy w Robotach dodasz wpis pracy na dzisiejszą datę."},
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

const CHANGELOG: {date:string; version:string; label:string; items:{type:"new"|"fix"|"improve"; text:string}[]}[] = [
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

function ChangelogView() {
  const TYPE_STYLE = {
    new:     {bg:"bg-primary/15",    text:"text-primary",       dot:"bg-primary",     label:"Nowość"},
    fix:     {bg:"bg-green-500/15",  text:"text-green-400",     dot:"bg-green-400",   label:"Poprawka"},
    improve: {bg:"bg-blue-500/15",   text:"text-blue-400",      dot:"bg-blue-400",    label:"Ulepszenie"},
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 space-y-2">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <ScrollText size={18} className="text-primary"/>
          </div>
          <div>
            <h1 className="text-lg font-bold">Historia zmian</h1>
            <p className="text-xs text-muted-foreground">Wszystkie aktualizacje od początku tworzenia W&amp;G DOM</p>
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
            {CHANGELOG.map((release, ri)=>(
              <div key={ri} className="relative sm:pl-12">
                {/* Circle on timeline */}
                <div className={`hidden sm:flex absolute left-0 top-3 w-10 h-10 rounded-full items-center justify-center border-2 z-10 shrink-0 ${ri===0?"border-primary bg-primary/15":"border-border bg-card"}`}>
                  <span className="text-[10px] font-bold" style={{color: ri===0?"var(--primary)":"var(--muted-foreground)"}}>{release.version}</span>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  {/* Release header */}
                  <div className={`px-5 py-4 flex items-center justify-between gap-3 ${ri===0?"bg-primary/5 border-b border-primary/20":"border-b border-border"}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="sm:hidden flex items-center justify-center w-8 h-8 rounded-full bg-secondary shrink-0">
                        <span className="text-[10px] font-bold text-muted-foreground">{release.version}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${ri===0?"text-primary":"text-foreground"}`}>{release.label}</span>
                          {ri===0&&<span className="text-[10px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Najnowsza</span>}
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
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4 pb-2">W&G DOM — zarządzanie pracą na budowie · Zbudowane z Claude AI</p>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

type View = "dashboard" | "payroll" | "schedule" | "directory" | "contacts" | "archive" | "jobs" | "changelog" | "help";

function CloudLoader({children}: {children: React.ReactNode}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const keys = [...DATA_KEYS];
    const fallback = setTimeout(() => setReady(true), 5000);

    fetchKeysFromCloud(keys)
      .then((values) => {
        const pushKeys: string[] = [];
        const pushValues: unknown[] = [];

        keys.forEach((key, i) => {
          let cloudVal = values[i];
          let localVal: unknown = null;
          try {
            const raw = localStorage.getItem(key);
            if (raw) localVal = JSON.parse(raw);
          } catch { /* ignore */ }

          const merged = mergeDataKey(key, localVal, cloudVal);
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

        if (pushKeys.length > 0) pushKeysToCloud(pushKeys, pushValues).catch(() => {});
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

function AppInner({onLogout, onChangePassword}: {onLogout?: ()=>void; onChangePassword?: ()=>void}) {
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle"|"saving"|"saved"|"error"|"offline">("idle");
  const [syncError, setSyncError] = useState("");
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const initialSyncDone = useRef(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [jobsBackupStatus, setJobsBackupStatus] = useState<{ current: number; prev: number; prev2: number; today: number } | null>(null);
  const [payrollBackupStatus, setPayrollBackupStatus] = useState<{ employeesPrev: number; employeesPrev2: number; archivePrev: number } | null>(null);
  const [fullDataBackupStatus, setFullDataBackupStatus] = useState<{ dailyBackupDate: string | null; hasPrev: boolean } | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);

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
    [...DATA_KEYS].forEach(k=>{
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
        const keys = [...DATA_KEYS].filter(k => data[k] != null);
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
      const merged = mergeJobsById(jobs, normalizeJobsValue(cloudJobs)) as Job[];
      localStorage.setItem("kw-jobs", JSON.stringify(merged));
      setJobs(merged);
      await pushKeysToCloud(["kw-jobs"], [merged]);
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
    const merged = mergeJobsById(jobs, restored) as Job[];
    setJobs(merged);
    pushKeysToCloud(["kw-jobs"], [merged]).catch(() => {});
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
      employees: directory.filter(d=>d.name.toLowerCase().includes(q)||d.phone.includes(q)||d.position.toLowerCase().includes(q)),
      jobs: jobs.filter(j=>j.address.toLowerCase().includes(q)||j.client.toLowerCase().includes(q)||j.flatNumber.toLowerCase().includes(q)),
    };
  },[globalSearch,directory,jobs]);

  const addFromDirectory = (ids: string[]) => {
    const toAdd = directory.filter((d)=>ids.includes(d.id));
    const newEmps = toAdd.map(weekEmployeeFromDir);
    setWeekEmployees((prev)=>[...prev,...newEmps]);
  };

  const removeWeekEmployee = (id:string) => setWeekEmployees((prev)=>prev.filter((e)=>e.id!==id));

  const updateWeekEmployee = useCallback((updated:WeekEmployee)=>{
    setWeekEmployees((prev)=>prev.map((e)=>e.id===updated.id?updated:e));
  },[setWeekEmployees]);

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

  const navItems: {key:View;label:string;icon:React.ElementType;badge?:number}[] = [
    {key:"dashboard", label:"Pulpit", icon:LayoutDashboard},
    {key:"payroll", label:"Lista Płac", icon:FileText},
    {key:"schedule", label:"Grafik", icon:CalendarDays, badge:weekEmployees.length || undefined},
    {key:"directory", label:"Pracownicy", icon:Users, badge:directory.filter(d=>d.active).length},
    {key:"contacts", label:"Kontakty", icon:Mail, badge:contacts.filter(c=>c.email.trim()).length||undefined},
    {key:"archive", label:"Archiwum", icon:Archive, badge:savedWeeks.length||undefined},
    {key:"jobs", label:"Roboty", icon:MapPin, badge:(()=>{ const pend=jobs.reduce((s,j)=>s+(j.photos||[]).filter(p=>p.status==="pending").length,0); return pend>0?pend:jobs.filter(j=>j.status==="in_progress").length||undefined; })()},
    {key:"changelog", label:"Zmiany", icon:ScrollText},
    {key:"help", label:"Instrukcja", icon:BookOpen},
  ];

  const totalNet = weekEmployees.reduce((s,e)=>s+calcWeekEmployee(e).netPay,0);

  const handleNavigate = useCallback((v: View | "payroll" | "directory" | "archive" | "jobs" | "schedule", jobId?: string) => {
    if (jobId) setPendingJobId(jobId);
    setView(v as View);
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
          {navItems.map(({key,label,icon:Icon,badge})=>(
            <button key={key} onClick={()=>setView(key)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${view===key?"bg-primary/15 text-primary":"text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              <Icon size={15}/>
              <span className="flex-1 text-left">{label}</span>
              {badge!==undefined&&badge>0&&<span className={`text-xs px-1.5 py-0.5 rounded-full ${view===key?"bg-primary/20 text-primary":"bg-secondary text-muted-foreground"}`}>{badge}</span>}
            </button>
          ))}
        </nav>

        {/* Week summary */}
        <div className="px-4 py-4 flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Bieżący tydzień</p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Pracownicy</span><span className="font-medium" style={{fontFamily:"'JetBrains Mono', monospace"}}>{weekEmployees.length}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Okres</span><span className="font-medium" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtDate(weekFrom).slice(0,5)}–{fmtDate(weekTo).slice(0,5)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Rozliczeni</span><span className="font-medium" style={{fontFamily:"'JetBrains Mono', monospace"}}>{weekEmployees.filter(e=>e.settled).length}/{weekEmployees.length}</span></div>
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
          <h2 className="text-sm font-semibold">{navItems.find(n=>n.key===view)?.label}</h2>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {view==="payroll"&&<span className="text-xs text-muted-foreground hidden sm:block" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(totalNet)} PLN · {weekEmployees.length} prac.</span>}
            {view==="schedule"&&<span className="text-xs text-muted-foreground hidden sm:block">{fmtDate(weekFrom)} – {fmtDate(weekTo)} · {weekEmployees.length} prac.</span>}
            {view==="jobs"&&<span className="text-xs text-muted-foreground hidden sm:block">{jobs.filter(j=>j.status==="in_progress").length} aktywne · {jobs.filter(j=>j.status==="completed").length} zdane</span>}
            {/* Backup na mobile (na desktopie jest w sidebarze) */}
            <button type="button" onClick={exportBackup} title="Eksportuj backup" className="sm:hidden p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <Download size={16}/>
            </button>
            <label title="Importuj backup" className="sm:hidden p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground cursor-pointer">
              <Upload size={16}/>
              <input type="file" accept=".json" className="hidden" onChange={e=>e.target.files?.[0]&&importBackup(e.target.files[0])}/>
            </label>
            {/* Sync indicator — kliknij przy błędzie, aby ponowić */}
            <button
              type="button"
              onClick={() => (syncStatus === "error" || syncStatus === "offline") && runCloudSync()}
              className={`p-1.5 rounded-lg ${syncStatus === "error" || syncStatus === "offline" ? "hover:bg-secondary cursor-pointer" : "cursor-default"}`}
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
            <button onClick={()=>setShowSearch(v=>!v)} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <Search size={16}/>
            </button>
            {onChangePassword && (
              <button onClick={onChangePassword} title="Zmień hasło" className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                <KeyRound size={16}/>
              </button>
            )}
            {onLogout && (
              <button onClick={onLogout} title="Wyloguj" className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
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
        <div className="flex flex-1 min-h-0 overflow-hidden pb-16 sm:pb-0">
          {view==="dashboard"&&<DashboardView jobs={jobs} directory={directory} weekEmployees={weekEmployees} weekFrom={weekFrom} weekTo={weekTo} savedWeeks={savedWeeks} onNavigate={handleNavigate}/>}
          {view==="payroll"&&<PayrollView weekEmployees={weekEmployees} weekFrom={weekFrom} weekTo={weekTo} directory={directory} contacts={contacts} onWeekChange={(f,t)=>{setWeekFrom(f);setWeekTo(t);}} onToggleSettled={toggleSettled} onSaveWeek={saveWeek} savedWeeks={savedWeeks} onAddFromDirectory={addFromDirectory} onRemoveWeekEmployee={removeWeekEmployee} onUpdateWeekEmployee={updateWeekEmployee} onGoToCurrent={goToCurrent} onManageContacts={()=>setView("contacts")} onRestoreFromArchive={restoreWeekFromArchive}/>}
          {view==="schedule"&&<ScheduleView weekEmployees={weekEmployees} weekFrom={weekFrom} weekTo={weekTo} jobs={jobs} directory={directory} onWeekChange={(f,t)=>{setWeekFrom(f);setWeekTo(t);}} onGoToCurrent={goToCurrent} onOpenPayroll={()=>setView("payroll")}/>}
          {view==="directory"&&<DirectoryView directory={directory} onChange={setDirectory}/>}
          {view==="contacts"&&<ContactsView contacts={contacts} onChange={setContacts}/>}
          {view==="archive"&&<ArchiveView savedWeeks={savedWeeks} onDelete={(id)=>setSavedWeeks(prev=>prev.filter(w=>w.id!==id))} jobs={jobs} directory={directory}/>}
          {view==="jobs"&&<JobsView jobs={jobs} setJobs={setJobs} directory={directory} contacts={contacts} onManageContacts={()=>setView("contacts")} initialJobId={pendingJobId} onInitialJobConsumed={()=>setPendingJobId(null)} weekEmployees={weekEmployees} weekFrom={weekFrom}/>}
          {view==="changelog"&&<ChangelogView/>}
          {view==="help"&&<HelpView/>}
        </div>

        {/* Mobile bottom nav */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex z-40" style={{paddingBottom:"env(safe-area-inset-bottom)"}}>
          {navItems.map(({key,icon:Icon,badge})=>(
            <button key={key} onClick={()=>setView(key)} className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[48px] py-2 relative transition-colors ${view===key?"text-primary":"text-muted-foreground"}`}>
              <div className="relative">
                <Icon size={20}/>
                {badge!==undefined&&badge>0&&<span className="absolute -top-1 -right-1.5 min-w-4 h-4 flex items-center justify-center text-[9px] font-bold rounded-full bg-primary text-primary-foreground px-0.5">{badge}</span>}
              </div>
              {view===key&&<span className="w-1 h-1 rounded-full bg-primary absolute top-1.5"/>}
            </button>
          ))}
        </nav>
      </div>

      {/* Overwrite archive confirm */}
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

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

async function saveAdminHash(password: string): Promise<void> {
  const hash = await sha256(password);
  await pushKeysToCloud([ADMIN_HASH_KEY], [hash]).catch(() => {});
  // Cache locally as fallback
  localStorage.setItem(ADMIN_HASH_KEY, hash);
}

async function verifyAdminPassword(password: string): Promise<boolean> {
  const hash = await sha256(password);
  try {
    const values = await fetchKeysFromCloud([ADMIN_HASH_KEY]);
    if (values[0]) {
      const stored = String(values[0]);
      localStorage.setItem(ADMIN_HASH_KEY, stored);
      return hash === stored;
    }
  } catch { /* offline — local cache */ }
  const local = localStorage.getItem(ADMIN_HASH_KEY);
  return !!local && hash === local;
}

async function adminPasswordExists(): Promise<boolean> {
  if (localStorage.getItem(ADMIN_HASH_KEY)) return true;
  try {
    const values = await fetchKeysFromCloud([ADMIN_HASH_KEY]);
    if (values[0]) {
      localStorage.setItem(ADMIN_HASH_KEY, String(values[0]));
      return true;
    }
  } catch {}
  return false;
}

const ADMIN_REMEMBER_FLAG_KEY = "kw-admin-remember-on";
const ADMIN_REMEMBER_DATA_KEY = "kw-admin-remember-pw";
const ADMIN_REMEMBER_SALT_KEY = "kw-admin-remember-salt";

function adminRememberEnabled(): boolean {
  return localStorage.getItem(ADMIN_REMEMBER_FLAG_KEY) === "1";
}

async function deriveRememberKey(salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("wgdom-admin-local-v1"),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function getOrCreateRememberSalt(): Uint8Array {
  let saltStr = localStorage.getItem(ADMIN_REMEMBER_SALT_KEY);
  if (!saltStr) {
    saltStr = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    localStorage.setItem(ADMIN_REMEMBER_SALT_KEY, saltStr);
  }
  return new TextEncoder().encode(saltStr);
}

async function saveRememberedAdminPassword(password: string): Promise<void> {
  const salt = getOrCreateRememberSalt();
  const key = await deriveRememberKey(salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(password),
  );
  localStorage.setItem(
    ADMIN_REMEMBER_DATA_KEY,
    JSON.stringify({ iv: [...iv], data: [...new Uint8Array(encrypted)] }),
  );
  localStorage.setItem(ADMIN_REMEMBER_FLAG_KEY, "1");
}

async function loadRememberedAdminPassword(): Promise<string | null> {
  if (!adminRememberEnabled()) return null;
  const raw = localStorage.getItem(ADMIN_REMEMBER_DATA_KEY);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as { iv: number[]; data: number[] };
    const saltStr = localStorage.getItem(ADMIN_REMEMBER_SALT_KEY);
    if (!saltStr) return null;
    const key = await deriveRememberKey(new TextEncoder().encode(saltStr));
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(payload.iv) },
      key,
      new Uint8Array(payload.data),
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    clearRememberedAdminPassword();
    return null;
  }
}

function clearRememberedAdminPassword(): void {
  localStorage.removeItem(ADMIN_REMEMBER_DATA_KEY);
  localStorage.removeItem(ADMIN_REMEMBER_FLAG_KEY);
}

// ─── Auth: Login Screen ───────────────────────────────────────────────────────

function LoginScreen({onAdmin, onWorker}: {onAdmin:()=>void; onWorker:(emp:DirectoryEmployee)=>void}) {
  const [mode, setMode] = useState<"pick"|"admin"|"worker"|"setup">("pick");
  const [checking, setChecking] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);

  const [password, setPassword] = useState("");
  const [passShow, setPassShow] = useState(false);
  const [passError, setPassError] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);

  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");
  const [pass1Show, setPass1Show] = useState(false);
  const [pass2Show, setPass2Show] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);

  const [directory, setDirectory] = useState<DirectoryEmployee[]>([]);
  const [dirLoading, setDirLoading] = useState(false);
  const [workerSearch, setWorkerSearch] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [phonePin, setPhonePin] = useState("");
  const [workerError, setWorkerError] = useState("");

  useEffect(() => {
    adminPasswordExists().then(exists => {
      setHasPassword(exists);
      setChecking(false);
    });
  }, []);

  useEffect(() => {
    if (mode !== "worker") return;
    setDirLoading(true);
    setWorkerError("");
    fetchKeysFromCloud(["kw-directory"])
      .then((values) => {
        const cloud = values[0];
        if (Array.isArray(cloud)) {
          setDirectory(cloud);
          try { localStorage.setItem("kw-directory", JSON.stringify(cloud)); } catch { /* ignore */ }
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

  useEffect(() => {
    if (mode !== "admin") return;
    let cancelled = false;
    (async () => {
      const enabled = adminRememberEnabled();
      if (!cancelled) setRememberPassword(enabled);
      if (enabled) {
        const saved = await loadRememberedAdminPassword();
        if (!cancelled && saved) setPassword(saved);
      }
    })();
    return () => { cancelled = true; };
  }, [mode]);

  const handleAdminLogin = async () => {
    if (!password) { setPassError("Wpisz hasło"); return; }
    setPassLoading(true);
    const ok = await verifyAdminPassword(password);
    if (ok) {
      if (rememberPassword) await saveRememberedAdminPassword(password);
      else clearRememberedAdminPassword();
    }
    setPassLoading(false);
    if (ok) { onAdmin(); }
    else { setPassError("Błędne hasło"); setPassword(""); }
  };

  const handleSetupSubmit = async () => {
    if (pass1.length < 4) { setSetupError("Hasło musi mieć co najmniej 4 znaki"); return; }
    if (pass1 !== pass2) { setSetupError("Hasła nie pasują do siebie"); setPass2(""); return; }
    setSetupLoading(true);
    await saveAdminHash(pass1);
    setSetupLoading(false);
    onAdmin();
  };

  const activeWorkers = useMemo(() => {
    const q = workerSearch.trim().toLowerCase();
    return directory
      .filter((d) => d.active)
      .filter((d) => !q || d.name.toLowerCase().includes(q) || d.position.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [directory, workerSearch]);

  const selectedWorker = directory.find((d) => d.id === selectedWorkerId) || null;

  const handleWorkerSubmit = () => {
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
    onWorker(selectedWorker);
  };

  const PasswordField = ({value, show, onToggle, onChange, onEnter, placeholder, autoFocus}: {
    value:string; show:boolean; onToggle:()=>void; onChange:(v:string)=>void;
    onEnter?:()=>void; placeholder?:string; autoFocus?:boolean;
  }) => (
    <div className="relative">
      <input type={show?"text":"password"} placeholder={placeholder||"Wpisz hasło..."} value={value} autoFocus={autoFocus}
        onChange={e=>onChange(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&onEnter?.()}
        className="w-full bg-secondary rounded-xl px-4 py-3 pr-10 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/>
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
        <Eye size={15}/>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8" style={{fontFamily:"'Inter',sans-serif"}}>
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="text-center space-y-2">
          <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-10 w-auto object-contain mx-auto"/>
          <p className="text-xs text-muted-foreground">System zarządzania robotami</p>
        </div>

        {/* Mode: pick */}
        {mode === "pick" && (
          <div className="space-y-3">
            {checking ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : (
              <>
                <button onClick={()=>setMode(hasPassword ? "admin" : "setup")}
                  className="w-full bg-primary text-primary-foreground rounded-2xl px-6 py-5 flex items-center gap-4 hover:bg-primary/90 active:scale-[0.98] transition-all">
                  <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><ShieldCheck size={22}/></div>
                  <div className="text-left">
                    <p className="font-semibold text-base">Administrator</p>
                    <p className="text-xs opacity-70 mt-0.5">Pełny dostęp — wymagane hasło</p>
                  </div>
                </button>
                <button onClick={()=>setMode("worker")}
                  className="w-full bg-card border border-border rounded-2xl px-6 py-5 flex items-center gap-4 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all">
                  <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0"><HardHat size={22} className="text-muted-foreground"/></div>
                  <div className="text-left">
                    <p className="font-semibold text-base">Pracownik</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Zdjęcia, raport, wymiary · PIN (9 cyfr)</p>
                  </div>
                </button>
              </>
            )}
          </div>
        )}

        {/* Mode: admin login */}
        {mode === "admin" && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={()=>{setMode("pick");setPassword("");setPassError("");}} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"><ArrowLeft size={16}/></button>
              <div className="flex items-center gap-2"><Lock size={14} className="text-primary"/><span className="text-sm font-semibold">Logowanie administratora</span></div>
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

        {/* Mode: first-time setup */}
        {mode === "setup" && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={()=>{setMode("pick");setPass1("");setPass2("");setSetupError("");}} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"><ArrowLeft size={16}/></button>
              <div>
                <p className="text-sm font-semibold">Ustaw hasło administratora</p>
                <p className="text-xs text-muted-foreground mt-0.5">Hasło będzie zaszyfrowane w chmurze (SHA-256)</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Nowe hasło (min. 4 znaki)</label>
                <PasswordField value={pass1} show={pass1Show} onToggle={()=>setPass1Show(v=>!v)}
                  onChange={v=>{setPass1(v);setSetupError("");}} autoFocus/>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Powtórz hasło</label>
                <PasswordField value={pass2} show={pass2Show} onToggle={()=>setPass2Show(v=>!v)}
                  onChange={v=>{setPass2(v);setSetupError("");}} onEnter={handleSetupSubmit}/>
              </div>
              {setupError && <p className="text-xs text-destructive">{setupError}</p>}
            </div>
            <button onClick={handleSetupSubmit} disabled={setupLoading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {setupLoading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>}
              Zapisz hasło i wejdź
            </button>
          </div>
        )}

        {/* Mode: worker */}
        {mode === "worker" && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={()=>{setMode("pick");setSelectedWorkerId("");setPhonePin("");setWorkerSearch("");setWorkerError("");}} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"><ArrowLeft size={16}/></button>
              <div className="flex items-center gap-2"><HardHat size={14} className="text-muted-foreground"/><span className="text-sm font-semibold">Logowanie pracownika</span></div>
            </div>

            {dirLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
              </div>
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
                          onClick={()=>{setSelectedWorkerId(emp.id);setWorkerError("");}}
                          className={`w-full px-4 py-3 text-left transition-colors ${sel?"bg-primary/10":"hover:bg-secondary/50"} ${!hasPin?"opacity-50 cursor-not-allowed":""}`}>
                          <p className="text-sm font-medium">{emp.name||"Bez nazwy"}</p>
                          {!hasPin && <p className="text-[10px] text-amber-400 mt-0.5">Brak numeru — poproś admina</p>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedWorker && workerHasPhonePin(selectedWorker) && (
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Hasło — 9 cyfr telefonu (bez +48)</label>
                    <input type="tel" inputMode="numeric" autoComplete="off" maxLength={11}
                      placeholder="np. 501234567" value={phonePin}
                      onChange={e=>{setPhonePin(e.target.value.replace(/\D/g,"").slice(0,9));setWorkerError("");}}
                      onKeyDown={e=>e.key==="Enter"&&handleWorkerSubmit()}
                      className="w-full bg-secondary rounded-xl px-4 py-3 text-sm tracking-widest border border-transparent focus:border-primary focus:outline-none transition-colors"/>
                    <p className="text-[10px] text-muted-foreground">Ostatnie 9 cyfr numeru z kartoteki pracowników.</p>
                  </div>
                )}

                {workerError && <p className="text-xs text-destructive">{workerError}</p>}

                <button onClick={handleWorkerSubmit} disabled={!selectedWorker || !workerHasPhonePin(selectedWorker!) || phonePin.replace(/\D/g,"").length !== 9}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50">
                  Zaloguj i dodaj zdjęcia
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
  onSaved,
  submitLabel = "Zapisz raport",
  description,
  disabled = false,
  editReport = null,
  onCancelEdit,
}: {
  jobId: string;
  authorName: string;
  onSaved: (report: WorkerJobReport) => void | Promise<void>;
  submitLabel?: string;
  description?: string;
  disabled?: boolean;
  editReport?: WorkerJobReport | null;
  onCancelEdit?: () => void;
}) {
  const [reportItems, setReportItems] = useState<WorkReportItem[]>([]);
  const [newItemText, setNewItemText] = useState("");
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
  const newItemInputRef = useRef<HTMLInputElement>(null);
  const generalNoteRef = useRef<HTMLTextAreaElement>(null);
  const isEdit = Boolean(editReport);

  useEffect(() => {
    return () => { if (sketchPreview && sketchPreview.startsWith("blob:")) URL.revokeObjectURL(sketchPreview); };
  }, [sketchPreview]);

  const loadFromReport = (report: WorkerJobReport | null) => {
    if (sketchPreview && sketchPreview.startsWith("blob:")) URL.revokeObjectURL(sketchPreview);
    if (!report) {
      setReportItems([]);
      setNewItemText("");
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
    setReportItems(normalized.workItems);
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

  const addReportItem = () => {
    const t = newItemText.trim();
    if (!t) return;
    setReportItems((prev) => [...prev, { id: crypto.randomUUID(), text: t, note: "" }]);
    setNewItemText("");
  };

  const updateReportItem = (id: string, patch: Partial<WorkReportItem>) => {
    setReportItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
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
    if (!files?.[0]) return;
    if (sketchPreview && sketchPreview.startsWith("blob:")) URL.revokeObjectURL(sketchPreview);
    setSketchFile(files[0]);
    setSketchPreview(URL.createObjectURL(files[0]));
    setExistingSketch(null);
    setDimMode("sketch");
    setError("");
  };

  const handleSubmit = async () => {
    const items = reportItems.filter(workItemHasContent);
    const rooms = reportRooms.filter(roomHasContent);
    const hasSketch = dimMode === "sketch" && (sketchFile || existingSketch);
    const hasGeneral = generalNote.trim().length > 0;
    if (items.length === 0 && rooms.length === 0 && !hasSketch && !hasGeneral) {
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
      submittedAt: editReport?.submittedAt || now,
      updatedAt: isEdit ? now : undefined,
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
        {reportItems.length > 0 && (
          <ul className="space-y-2 mb-3">
            {reportItems.map((item) => (
              <li key={item.id} className="bg-secondary/50 rounded-xl px-3 py-2 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-primary shrink-0 mt-2">•</span>
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => updateReportItem(item.id, { text: e.target.value })}
                    placeholder="Co zostało zrobione..."
                    className="flex-1 bg-background rounded-lg px-2.5 py-1.5 text-sm border border-border focus:border-primary focus:outline-none"
                  />
                  <button type="button" onClick={() => setReportItems((p) => p.filter((x) => x.id !== item.id))} className="text-muted-foreground hover:text-destructive shrink-0 mt-1.5">
                    <X size={14}/>
                  </button>
                </div>
                <input
                  type="text"
                  value={item.note}
                  onChange={(e) => updateReportItem(item.id, { note: e.target.value })}
                  placeholder="Opis / uwagi do tego punktu (opcjonalnie)"
                  className="w-full bg-background rounded-lg px-2.5 py-1.5 text-xs border border-border focus:border-primary focus:outline-none ml-5"
                />
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2 items-start">
          <input
            ref={newItemInputRef}
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addReportItem(); } }}
            placeholder="np. Położono płytki w łazience..."
            className="flex-1 bg-secondary rounded-xl px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
          />
          <VoiceNoteButton focusRef={newItemInputRef} hintClassName="sm:max-w-[280px]" onResult={(text) => setNewItemText((p) => (p ? `${p} ${text}` : text))}/>
          <button type="button" onClick={addReportItem} className="px-4 py-2.5 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80 shrink-0">
            <Plus size={16}/>
          </button>
        </div>
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
              <label className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground cursor-pointer hover:border-primary/40 hover:text-foreground transition-colors touch-manipulation">
                <Camera size={18}/>
                <span className="text-xs font-medium">Zrób zdjęcie</span>
                <input type="file" accept="image/*" capture="environment" className="sr-only"
                  onChange={(e) => { onSketchPick(e.target.files); e.target.value = ""; }}/>
              </label>
              <label className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground cursor-pointer hover:border-primary/40 hover:text-foreground transition-colors touch-manipulation">
                <ImagePlus size={18}/>
                <span className="text-xs font-medium">Z galerii</span>
                <input type="file" accept="image/*" className="sr-only"
                  onChange={(e) => { onSketchPick(e.target.files); e.target.value = ""; }}/>
              </label>
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
  onAddReport,
  onDelete,
}: {
  jobId: string;
  reports: WorkerJobReport[];
  authorName: string;
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
                      {fmtDate(report.submittedAt.slice(0, 10))} · {report.workItems.length} punktów
                      {report.rooms.length > 0 && ` · ${report.rooms.length} pom.`}
                      {report.sketch && " · rysunek"}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp size={14} className="text-muted-foreground shrink-0"/> : <ChevronDown size={14} className="text-muted-foreground shrink-0"/>}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 space-y-4 bg-secondary/10">
                    {report.workItems.length > 0 && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Zakres wykonanych prac</p>
                        <ul className="space-y-2">
                          {report.workItems.map((item) => (
                            <li key={item.id} className="text-sm">
                              <div className="flex gap-2">
                                <span className="text-primary shrink-0">•</span>
                                <span>{item.text}</span>
                              </div>
                              {item.note && <p className="text-xs text-muted-foreground ml-4 mt-0.5 italic">{item.note}</p>}
                            </li>
                          ))}
                        </ul>
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

// ─── PWA install banner ───────────────────────────────────────────────────────

function PwaInstallBanner({ compact = false }: { compact?: boolean }) {
  const { canInstall, installed, promptInstall, isIos } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("wg-pwa-dismiss") === "1");

  if (installed || dismissed) return null;
  if (!canInstall && !isIos) return null;

  const dismiss = () => {
    sessionStorage.setItem("wg-pwa-dismiss", "1");
    setDismissed(true);
  };

  return (
    <div className={`${compact ? "mx-4 mb-3" : "mx-4 mt-3"} bg-primary/10 border border-primary/25 rounded-xl px-4 py-3 flex items-start gap-3`}>
      <Smartphone size={16} className="text-primary shrink-0 mt-0.5"/>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-primary">Dodaj na ekran główny</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
          {isIos && !canInstall
            ? "Safari → Udostępnij → „Dodaj do ekranu początkowego” — szybszy dostęp na budowie."
            : "Zainstaluj aplikację jak skrót — działa offline i szybciej się uruchamia."}
        </p>
        {canInstall && (
          <button type="button" onClick={() => promptInstall()} className="mt-2 text-xs font-medium text-primary hover:underline">
            Zainstaluj teraz
          </button>
        )}
      </div>
      <button type="button" onClick={dismiss} className="text-muted-foreground hover:text-foreground shrink-0 p-1">
        <X size={14}/>
      </button>
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
                      {norm.workItems.filter(workItemHasContent).map((item) => (
                        <p key={item.id} className="text-sm">• {item.text}{item.note && <span className="text-muted-foreground text-xs block ml-3">{item.note}</span>}</p>
                      ))}
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
    const onVis = () => setShield(document.hidden);
    const onBlur = () => setShield(true);
    const onFocus = () => setShield(false);
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
  const [workerTab, setWorkerTab] = useState<"jobs" | "pay">("jobs");
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
        const wm = await prepareWatermarkedPhoto(job, file);
        const { entry, error } = await uploadPhoto(item.jobId, wm, item.label as PhotoEntry["label"], item.uploadedBy, item.caption);
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

    fetchKeysFromCloud(["kw-jobs", "kw-week-employees", "kw-archive", "kw-weekFrom", "kw-weekTo"])
      .then((values) => {
        const [cloudJobs, cloudWeekEmps, cloudArchive, cloudFrom, cloudTo] = values;
        if (cloudJobs != null) {
          let localJobs: Job[] = [];
          try {
            localJobs = normalizeJobsValue(JSON.parse(localStorage.getItem("kw-jobs") || "[]")) as Job[];
          } catch { /* ignore */ }
          const cloudJobsNorm = normalizeJobsValue(cloudJobs) as Job[];
          const merged = mergeJobsById(localJobs, cloudJobsNorm) as Job[];
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
    if (!files?.length) return;
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
        <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
          <LogOut size={13}/>Wyloguj
        </button>
      </div>

      {!selectedJob && (
        <div className="flex border-b border-border bg-card shrink-0">
          <button
            type="button"
            onClick={() => setWorkerTab("jobs")}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${workerTab === "jobs" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            <MapPin size={14}/>Roboty
          </button>
          <button
            type="button"
            onClick={() => setWorkerTab("pay")}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${workerTab === "pay" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            <Wallet size={14}/>Wypłata
          </button>
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

      <div className="flex-1 overflow-y-auto pb-8" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>
        {!selectedJob && workerTab === "pay" ? (
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
                          Koszty do zwrotu: +{fmt(currentPay.totalExtraCosts)} PLN
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
          <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">
            <button onClick={()=>setSelectedJobId(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={15}/>Zmień robotę
            </button>

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
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${galleryLabel === lbl.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                    {lbl.title}
                  </button>
                ))}
              </div>
              <label className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold cursor-pointer hover:bg-primary/90 active:scale-[0.98] transition-all">
                <ImagePlus size={18}/>
                Wybierz z galerii ({galleryPicks.length || "wiele"})
                <input type="file" accept="image/*" multiple className="sr-only"
                  onChange={(e) => { onGalleryPick(e.target.files); e.target.value = ""; }}/>
              </label>
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
                          {r.workItems.length > 0 && (
                            <ul className="text-xs space-y-0.5 text-foreground/90 mt-1">
                              {r.workItems.slice(0, 2).map((item) => (
                                <li key={item.id}>• {item.text}</li>
                              ))}
                              {r.workItems.length > 2 && <li className="text-muted-foreground">… +{r.workItems.length - 2} punktów</li>}
                            </ul>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button type="button" onClick={() => setEditingReport(normalizeWorkerReport(r))}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10" title="Edytuj">
                            <Edit2 size={14}/>
                          </button>
                          <button type="button" onClick={() => deleteMyReport(r.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Usuń">
                            <Trash2 size={14}/>
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
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${p.status==="approved"?"bg-green-500 text-white":p.status==="rejected"?"bg-red-500 text-white":"bg-yellow-500 text-black"}`}>
                            {p.status==="approved"?"✓":p.status==="rejected"?"✗":"?"}
                          </span>
                        </div>
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
                          className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1">
                          <Trash2 size={11}/>Usuń zdjęcie
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
        <div className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center px-6" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <ImageWithFallback src={logoSrc} alt="W&G DOM" className="h-12 w-auto object-contain opacity-40"/>
          <p className="text-sm text-muted-foreground mt-4 text-center">W&G DOM</p>
          <p className="text-xs text-muted-foreground/60 mt-2 text-center">Dane wypłat ukryte</p>
        </div>
      )}
    </div>
  );
}

// ─── Admin Photo Gallery ───────────────────────────────────────────────────────

const PHOTO_LABEL_ORDER: PhotoEntry["label"][] = ["before", "after", "progress"];

const PHOTO_LABEL_SECTION: Record<PhotoEntry["label"], { icon: typeof Camera; accent: string; border: string }> = {
  before: { icon: Camera, accent: "text-blue-400", border: "border-blue-500/20" },
  after: { icon: Eye, accent: "text-green-400", border: "border-green-500/20" },
  progress: { icon: ImagePlus, accent: "text-yellow-400", border: "border-yellow-500/20" },
};

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
    onUpdate(
      photos.map(x=>x.id===id?{...x,status:"rejected"}:x),
      p ? { type: "photo_rejected", text: `Odrzucono zdjęcie (${p.label})` } : undefined,
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
          <img src={lightbox.publicUrl} alt={lightbox.label} className="max-w-full max-h-[90vh] rounded-xl object-contain" onClick={e=>e.stopPropagation()}/>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
            <p className="text-white/90 text-sm font-medium">{PHOTO_LABEL_NAMES[lightbox.label]}</p>
            {lightbox.caption && <p className="text-white/80 text-xs mt-1 italic">{lightbox.caption}</p>}
            <p className="text-white/50 text-xs mt-0.5">{lightbox.uploadedBy} · {new Date(lightbox.uploadedAt).toLocaleDateString("pl-PL")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────

function ChangePasswordModal({onClose}: {onClose:()=>void}) {
  const [current, setCurrent] = useState("");
  const [currentShow, setCurrentShow] = useState(false);
  const [pass1, setPass1] = useState("");
  const [pass1Show, setPass1Show] = useState(false);
  const [pass2, setPass2] = useState("");
  const [pass2Show, setPass2Show] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!current) { setError("Wpisz aktualne hasło"); return; }
    if (pass1.length < 4) { setError("Nowe hasło musi mieć co najmniej 4 znaki"); return; }
    if (pass1 !== pass2) { setError("Nowe hasła nie pasują do siebie"); setPass2(""); return; }
    setLoading(true); setError("");
    const ok = await verifyAdminPassword(current);
    if (!ok) { setError("Aktualne hasło jest błędne"); setLoading(false); setCurrent(""); return; }
    await saveAdminHash(pass1);
    if (adminRememberEnabled()) await saveRememberedAdminPassword(pass1);
    else clearRememberedAdminPassword();
    setLoading(false);
    setSuccess(true);
    setTimeout(onClose, 1500);
  };

  const Field = ({label, value, show, onToggle, onChange, placeholder}: {
    label:string; value:string; show:boolean; onToggle:()=>void;
    onChange:(v:string)=>void; placeholder?:string;
  }) => (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="relative">
        <input type={show?"text":"password"} placeholder={placeholder||"Wpisz hasło..."} value={value}
          onChange={e=>{onChange(e.target.value);setError("");}}
          onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
          className="w-full bg-secondary rounded-xl px-4 py-3 pr-10 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/>
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"><Eye size={15}/></button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.7)"}}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-sm shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><KeyRound size={15} className="text-primary"/><span className="text-sm font-semibold">Zmiana hasła administratora</span></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"><X size={15}/></button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center"><CheckCircle2 size={24} className="text-green-400"/></div>
            <p className="text-sm font-medium">Hasło zostało zmienione</p>
            <p className="text-xs text-muted-foreground">Nowe hasło zapisane w chmurze</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <Field label="Aktualne hasło" value={current} show={currentShow}
                onToggle={()=>setCurrentShow(v=>!v)} onChange={setCurrent}/>
              <div className="border-t border-border/50 pt-3 space-y-3">
                <Field label="Nowe hasło (min. 4 znaki)" value={pass1} show={pass1Show}
                  onToggle={()=>setPass1Show(v=>!v)} onChange={setPass1}/>
                <Field label="Powtórz nowe hasło" value={pass2} show={pass2Show}
                  onToggle={()=>setPass2Show(v=>!v)} onChange={setPass2}/>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>}
              Zmień hasło
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── App with auth ─────────────────────────────────────────────────────────────

const DEFAULT_ADMIN_PASSWORD = "wgdom1990@";

function AppInnerWithAuth() {
  const shareToken = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("podglad")?.trim() || "";
  }, []);

  const [appMode, setAppMode] = useState<"login"|"admin"|"worker">(() => {
    const s = sessionStorage.getItem("wg-session-mode");
    return (s as "admin"|"worker"|null) || "login";
  });
  const [workerName, setWorkerName] = useState(() => sessionStorage.getItem("wg-worker-name") || "");
  const [workerId, setWorkerId] = useState(() => sessionStorage.getItem("wg-worker-id") || "");
  const [showChangePass, setShowChangePass] = useState(false);

  // Set default password on first ever launch
  useEffect(() => {
    adminPasswordExists().then(exists => {
      if (!exists) saveAdminHash(DEFAULT_ADMIN_PASSWORD);
    });
  }, []);

  const enterAdmin = () => { sessionStorage.setItem("wg-session-mode","admin"); setAppMode("admin"); };
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
    setAppMode("login"); setWorkerName(""); setWorkerId("");
  };

  if (shareToken) return <ClientShareView token={shareToken}/>;
  if (appMode === "login") return <LoginScreen onAdmin={enterAdmin} onWorker={enterWorker}/>;
  if (appMode === "worker") return <WorkerPhotoView workerName={workerName} workerId={workerId} onLogout={logout}/>;
  return (
    <>
      <AppInner onLogout={logout} onChangePassword={()=>setShowChangePass(true)}/>
      {showChangePass && <ChangePasswordModal onClose={()=>setShowChangePass(false)}/>}
    </>
  );
}

export default function App() {
  return <CloudLoader><AppInnerWithAuth/></CloudLoader>;
}
