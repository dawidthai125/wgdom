/** Typy i helpery domenowe — wydzielone z App.tsx. */
import type { JobActivityType } from "@/lib/job-activity";
import {
  isBiweeklyPayrollEmployee,
  calcBiweeklyRowDisplay,
  calcWeekNetNoPrevSat,
  getPayrollWeekRange,
  getPayrollClosingWeekRange,
} from "@/lib/payroll-cycle";
import { snapshotCarryFieldsForEmployee } from "@/lib/payroll-carry-snapshot";
import { isDataKey, isValidJobRecord, API_BASE, API_HEADERS, type DataKey } from "@/lib/cloud-sync";
import { appendJobActivity } from "@/lib/job-activity";
import { digestSha256Hex } from "@/lib/admin-auth";
import { Camera, Eye, ImagePlus } from "lucide-react";
import { scopeTextToWorkItems, workItemsToScopeText } from "@/lib/work-scope-text";
import { watermarkedFile, jobWatermarkLines } from "@/lib/photo-watermark";
import { normalizeJobMetaFields } from "@/lib/job-meta";
import { normalizeJobWmFields, inferHandoverStage, HANDOVER_STAGE_LABELS } from "@/lib/job-wm";
import { resolveJobListStatus, JOB_LIST_STATUS_CONFIG, type JobListStatusJob } from "@/lib/job-list-status";
import { syncJobDocuments } from "@/lib/job-documents";
import { filterAvailablePhotos } from "@/lib/media-filter";

export type DayKey = "Pn" | "Wt" | "Sr" | "Cz" | "Pt" | "So";
export const DAY_LABELS: Record<DayKey, string> = { Pn: "Poniedziałek", Wt: "Wtorek", Sr: "Środa", Cz: "Czwartek", Pt: "Piątek", So: "Sobota" };
export const DAYS: DayKey[] = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
/** Etykieta w Grafiku dla logistyki (wiele robót/dzień, bez wpisu na robocie). */
export const MULTI_SITE_SCHEDULE_LABEL = "Dowóz mat. / wywóz śm.";
export const MONTH_NAMES = ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"];

/** Trwała kartoteka pracownika */
export interface DirectoryEmployee {
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
  /** Wypłata co 2 tygodnie w sobotę (np. umowa ukraińska) */
  biweeklyPayroll?: boolean;
  /** Pierwsza sobota wypłaty w cyklu (ISO), np. 2026-05-30 */
  biweeklyAnchorDate?: string;
  /** SHA-256 hash osobistego kodu 4-cyfrowego (logowanie pracownika) */
  workerPinHash?: string;
  /** Konto testowe — tylko logowanie pracownika, bez listy płac, grafiku i raportów */
  testAccount?: boolean;
  updatedAt?: string;
}

export interface DayData {
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
export interface DayExtraHour {
  id: string;
  description: string;
  from: string;
  to: string;
}

/** Krótki opis (Sob. poprz. — co robiono, wynajęci pracownicy, kwoty do rozliczenia) */
export interface DayNote {
  id: string;
  text: string;
}

export type ExtraCostStatus = "pending" | "approved" | "rejected";

/** Koszt pracownika do zwrotu w wypłacie (chemia, paliwo, zakupy na budowę) */
export interface EmployeeExtraCost {
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
export interface WeekEmployee {
  id: string;             // lokalny ID w ramach tygodnia
  directoryId: string;    // powiązanie z kartoteką (może być "" dla spoza kartoteki)
  name: string;
  phone: string;
  position: string;
  rate: string;           // stawka na ten tydzień (może różnić się od domyślnej)
  /** Kiedy ostatnio zmieniono stawkę (sync z kartoteki / ręcznie) */
  rateUpdatedAt?: string;
  /** Kiedy ostatnio zmieniono godziny / koszty / Sob.pr. */
  dataUpdatedAt?: string;
  /** Kiedy ostatnio zmieniono status rozliczenia */
  settledUpdatedAt?: string;
  days: Record<DayKey, DayData>;
  /** Sobota poprzedniego tygodnia — wypłacana w bieżącym tygodniu */
  prevSaturday?: DayData;
  extraCosts?: EmployeeExtraCost[];
  settled: boolean;
  /** Sprint 20.1A — jednorazowe przeniesienie wypłaty (zamrożona kwota) na następny tydzień. */
  payrollCarryForward?: import("@/lib/payroll-carry-forward").PayrollCarryForward;
}

/** Status nieobecności zamrożony w archiwum tygodnia (Sprint 20.0A). */
export type PayrollLeaveStatus = "vacation" | "sick" | "unpaid";

export interface EmployeeSnapshot {
  name: string; position: string; rate: number;
  weekHours?: number; prevSatHours?: number;
  totalHours: number; grossPay: number; totalZaliczka: number; totalExtraCosts: number;
  netPay: number;
  settled: boolean;
  /** Zamrożony przy zapisie tygodnia — nie zmienia się po dodaniu urlopów wstecz. */
  leaveStatus?: PayrollLeaveStatus;
  /** Sprint 20.1A — kwota przeniesiona na następny tydzień (zamrożona). */
  carryForwardOut?: number;
  carryForwardTargetFrom?: string;
  carryForwardTargetTo?: string;
  /** Sprint 20.1A — kwota otrzymana z poprzedniego tygodnia. */
  carryForwardIn?: number;
  carryForwardFromWeek?: { from: string; to: string };
}

/** Wpis czasu na robocie zapisany w archiwum tygodnia */
export interface ArchivedWorkEntry {
  jobId: string;
  address: string;
  flatNumber: string;
  directoryId: string;
  employeeName: string;
  date: string;
  hours: number;
  rate: number;
}

export interface WeekSnapshot {
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
  /** Zaległa lista płac (np. poprzedni tydzień przed startem aplikacji) */
  backlog?: boolean;
  backlogNote?: string;
}

// ─── Jobs Types ───────────────────────────────────────────────────────────────

export const DOCUMENT_TYPES = ["zlecenie","zakres","kosztorys","kominiarz","pomiary","oswiadczenia","gwarancje","rysunek","zdjecia"] as const;
export const REQUIRED_DOCS = ["zlecenie","zakres","kosztorys","kominiarz","pomiary","oswiadczenia","gwarancje","rysunek"] as const;
export type DocType = typeof DOCUMENT_TYPES[number];
export const DOC_LABELS: Record<DocType,string> = {
  zlecenie:"Zlecenie", zakres:"Zakres robót", kosztorys:"Kosztorys",
  kominiarz:"Kominiarz", pomiary:"Pomiary", oswiadczenia:"Oświadczenia",
  gwarancje:"Gwarancje", rysunek:"Rysunek/Plan", zdjecia:"Zdjęcia",
};

export interface WorkEntry {
  id: string;
  directoryId: string;
  employeeName: string;
  date: string;
  hours: number;
  rate: number;
  notes: string;
}

export interface MaterialEntry {
  id: string;
  description: string;
  cost: number;
  date: string;
}

export interface PhotoEntry {
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

export type RoomTypeKey = "salon" | "pokoj" | "kuchnia" | "korytarz" | "lazienka" | "toaleta" | "inne";

export const ROOM_TYPE_LABELS: Record<RoomTypeKey, string> = {
  salon: "Salon",
  pokoj: "Pokój",
  kuchnia: "Kuchnia",
  korytarz: "Korytarz",
  lazienka: "Łazienka",
  toaleta: "Toaleta (WC)",
  inne: "Inne",
};

export interface RoomDimension {
  id: string;
  roomType: RoomTypeKey;
  customLabel: string;
  length: string;
  width: string;
  height: string;
  note?: string;
}

export interface WorkReportItem {
  id: string;
  text: string;
  note: string;
}

/** Raport pracownika: zakres prac + wymiary / rysunek — przypisany do roboty */
export interface WorkerJobReport {
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

export interface ClientShareLink {
  token: string;
  createdAt: string;
  enabled: boolean;
}


export interface Job {
  id: string;
  address: string;
  flatNumber: string;
  client: string;
  startDate: string;
  endDate: string;
  status: "in_progress" | "completed";
  keysHandedOver: boolean;
  /** Ręczny status: w trakcie / gotowe do odbioru / zdane */
  jobPhase?: import("@/lib/job-list-status").JobPhase;
  notes: string;
  documents: Record<DocType, boolean>;
  workEntries: WorkEntry[];
  materials: MaterialEntry[];
  invoiceStatus: "pending" | "invoiced" | "paid";
  invoiceNumber: string;
  invoiceAmount: string;
  photos: PhotoEntry[];
  workerReports?: WorkerJobReport[];
  /** Super Admin odznaczył zakres/rysunek mimo raportu — bez auto-nadpisywania */
  reportDocSaOverride?: import("@/lib/job-documents").ReportDocSaOverride;
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
  /** Ostatnia zmiana wpisu — do scalania między kartami / chmurą */
  updatedAt?: string;
  /** Powiązany przetarg BZP (pipeline). */
  linkedTenderId?: string;
  linkedTenderBzpNumber?: string;
  /** ETAP 8.5 FULL — planowany lider ekipy (id z kw-directory). */
  executionLeadDirectoryId?: string;
  /** ETAP 8.5 FULL — planowana ekipa (ids z kw-directory, bez auto workEntries). */
  executionAssigneeDirectoryIds?: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function defaultDay(): DayData { return { active: false, from: "07:00", to: "16:00", zaliczka: "" }; }
export function defaultDays(): Record<DayKey, DayData> { return Object.fromEntries(DAYS.map((d) => [d, defaultDay()])) as Record<DayKey, DayData>; }

export function defaultDirEmployee(): DirectoryEmployee {
  return { id: crypto.randomUUID(), name: "", phone: "", position: "", defaultRate: "25.00", startDate: new Date().toISOString().slice(0,10), active: true, notes: "" };
}

/** Heurystyka: znane konto testowe (np. test + 000000000). */
export function inferTestAccountHeuristic(emp: DirectoryEmployee): boolean {
  const name = (emp.name ?? "").trim().toLowerCase();
  const phone9 = normalizePhone9(emp.phone);
  return name === "test" || phone9 === "000000000";
}

export function isTestDirectoryEmployee(emp: DirectoryEmployee | undefined | null): boolean {
  if (!emp) return false;
  if (emp.testAccount === false) return false;
  if (emp.testAccount === true) return true;
  return inferTestAccountHeuristic(emp);
}

export function isProductionDirectoryEmployee(emp: DirectoryEmployee): boolean {
  return !isTestDirectoryEmployee(emp);
}

export function isProductionActiveDirectoryEmployee(emp: DirectoryEmployee): boolean {
  return emp.active && isProductionDirectoryEmployee(emp);
}

export function filterProductionDirectory(directory: DirectoryEmployee[]): DirectoryEmployee[] {
  return directory.filter(isProductionDirectoryEmployee);
}

export function filterProductionActiveDirectory(directory: DirectoryEmployee[]): DirectoryEmployee[] {
  return directory.filter(isProductionActiveDirectoryEmployee);
}

export function isTestWeekEmployee(emp: WeekEmployee, directory: DirectoryEmployee[]): boolean {
  if (!emp.directoryId) return false;
  const dir = directory.find((d) => d.id === emp.directoryId);
  return isTestDirectoryEmployee(dir);
}

export function filterProductionWeekEmployees(weekEmployees: WeekEmployee[], directory: DirectoryEmployee[]): WeekEmployee[] {
  return weekEmployees.filter((e) => !isTestWeekEmployee(e, directory));
}

export function normalizeDirectoryTestFlags(list: DirectoryEmployee[]): DirectoryEmployee[] {
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

export const PHOTO_LABEL_NAMES: Record<PhotoEntry["label"], string> = {
  before: "Przed remontem",
  after: "Po remoncie",
  progress: "W trakcie",
};

export const PHOTO_LABEL_ORDER: PhotoEntry["label"][] = ["before", "after", "progress"];

type AppPhotoLabelSectionMeta = { icon: typeof Camera; accent: string; border: string };

let appPhotoLabelSectionCache: Record<PhotoEntry["label"], AppPhotoLabelSectionMeta> | undefined;

/** Lazy init — unika TDZ przy circular chunk (lucide ↔ panel-jobs). */
export function getAppPhotoLabelSection(): Record<PhotoEntry["label"], AppPhotoLabelSectionMeta> {
  if (!appPhotoLabelSectionCache) {
    appPhotoLabelSectionCache = {
      before: { icon: Camera, accent: "text-blue-400", border: "border-blue-500/20" },
      after: { icon: Eye, accent: "text-green-400", border: "border-green-500/20" },
      progress: { icon: ImagePlus, accent: "text-yellow-400", border: "border-yellow-500/20" },
    };
  }
  return appPhotoLabelSectionCache;
}

export const PREV_SAT_SHORT = "Sob. poprz.";

export function getPrevSaturday(emp: WeekEmployee): DayData {
  return emp.prevSaturday ?? defaultDay();
}

export function previousSaturdayIso(weekFrom: string): string {
  const [y, m, d] = weekFrom.split("-").map(Number);
  const mon = new Date(y, m - 1, d);
  mon.setDate(mon.getDate() - 2);
  return localIsoDate(mon);
}

export function weekEmployeeFromDir(dir: DirectoryEmployee): WeekEmployee {
  return { id: crypto.randomUUID(), directoryId: dir.id, name: dir.name, phone: dir.phone, position: dir.position, rate: dir.defaultRate, days: defaultDays(), prevSaturday: defaultDay(), extraCosts: [], settled: false };
}

export function parseTime(t: string) { const [h, m] = t.split(":").map(Number); return isNaN(h)||isNaN(m) ? 0 : h+m/60; }
export function hoursWorked(from: string, to: string) { const d = parseTime(to)-parseTime(from); return d>0 ? +d.toFixed(2) : 0; }
export function dayTotalHours(day: DayData): number {
  const base = day.active ? hoursWorked(day.from, day.to) : 0;
  const extra = (day.extraHours ?? []).reduce((s, e) => s + hoursWorked(e.from, e.to), 0);
  return +(base + extra).toFixed(2);
}
/** Godziny podstawowej zmiany (Pn–So) — bez dodatkowych; do spójności z robotami. */
export function dayBaseHoursOnly(day: DayData): number {
  return day.active ? hoursWorked(day.from, day.to) : 0;
}
export function dayExtraHoursOnly(day: DayData): number {
  return +(day.extraHours ?? []).reduce((s, e) => s + hoursWorked(e.from, e.to), 0).toFixed(2);
}
export function prevSatBaseHours(day: DayData): number {
  return dayBaseHoursOnly(day);
}

export function payrollWeekExtraHourLines(employees: WeekEmployee[]) {
  const lines: {
    name: string;
    position: string;
    day: string;
    baseShift: string;
    extraRange: string;
    hours: number;
    rate: number;
    amount: number;
    reason: string;
  }[] = [];
  for (const emp of employees) {
    const rate = parseFloat(emp.rate) || 0;
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
          rate,
          amount: h > 0 ? +(h * rate).toFixed(2) : 0,
          reason: reason || "—",
        });
      }
    }
  }
  return lines;
}

export function payrollJobWorkLines(jobs: Job[], weekFrom: string, weekTo: string): PayrollJobWorkLine[] {
  const lines: PayrollJobWorkLine[] = [];
  for (const job of jobs) {
    const jobAddress = formatJobStreet(job);
    const entries = Array.isArray(job.workEntries) ? job.workEntries : [];
    for (const we of entries) {
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

export function normalizeEmpName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function jobHoursForEmployeeOnDate(
  emp: Pick<WeekEmployee, "directoryId" | "name">,
  jobs: Job[],
  dateIso: string,
  directory: DirectoryEmployee[],
): number {
  let total = 0;
  for (const job of jobs) {
    const entries = Array.isArray(job.workEntries) ? job.workEntries : [];
    for (const we of entries) {
      if (we.date !== dateIso || we.hours <= 0) continue;
      if (workEntryMatchesEmployee(emp, we, directory)) total += we.hours;
    }
  }
  return +total.toFixed(2);
}

/** Godziny na robotach do porównania z podstawową zmianą — nadmiar równy dodatkowym z listy płac nie liczy się jako rozbieżność. */
export function jobHoursComparableToPayrollBase(
  emp: WeekEmployee,
  jobs: Job[],
  dateIso: string,
  directory: DirectoryEmployee[],
  weekFrom: string,
): number {
  const raw = jobHoursForEmployeeOnDate(emp, jobs, dateIso, directory);
  const dayKey = dayKeyForIsoInWeek(dateIso, weekFrom);
  if (!dayKey) return raw;
  const base = dayBaseHoursOnly(emp.days[dayKey]);
  const extra = dayExtraHoursOnly(emp.days[dayKey]);
  if (raw > base + 0.01 && extra > 0.01 && Math.abs(raw - base - extra) <= 0.01) return base;
  return raw;
}

export interface PayrollJobConsistencyAlert {
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

export function directoryEmployeeForRef(
  empRef: Pick<WeekEmployee, "directoryId" | "name">,
  directory: DirectoryEmployee[],
): DirectoryEmployee | undefined {
  if (empRef.directoryId) return directory.find((d) => d.id === empRef.directoryId);
  return directory.find((d) => normalizeEmpName(d.name) === normalizeEmpName(empRef.name));
}

export function isMultiSiteEmployee(
  empRef: Pick<WeekEmployee, "directoryId" | "name">,
  directory: DirectoryEmployee[],
): boolean {
  return directoryEmployeeForRef(empRef, directory)?.multiSiteDaily === true;
}

export function jobSitesForEmployeeOnDate(
  empRef: Pick<WeekEmployee, "directoryId" | "name">,
  jobs: Job[],
  dateIso: string,
  directory: DirectoryEmployee[],
): { jobId: string; entryId: string; label: string; hours: number }[] {
  const sites: { jobId: string; entryId: string; label: string; hours: number }[] = [];
  for (const job of jobs) {
    const entries = Array.isArray(job.workEntries) ? job.workEntries : [];
    for (const we of entries) {
      if (we.date !== dateIso || we.hours <= 0) continue;
      if (!workEntryMatchesEmployee(empRef, we, directory)) continue;
      const addr = job.address?.trim() || "Bez adresu";
      const label = addr.length > 22 ? `${addr.slice(0, 20)}…` : addr;
      sites.push({ jobId: job.id, entryId: we.id, label, hours: we.hours });
    }
  }
  return sites;
}

export function summarizeJobSites(sites: { label: string }[]): string {
  if (sites.length === 0) return "";
  const uniq = [...new Set(sites.map((s) => s.label))];
  const shown = uniq.slice(0, 3).join(", ");
  return uniq.length > 3 ? `${shown}…` : shown;
}

export function payrollJobConsistencyAlerts(
  weekEmployees: WeekEmployee[],
  jobs: Job[],
  weekFrom: string,
  weekTo: string,
  directory: DirectoryEmployee[],
): PayrollJobConsistencyAlert[] {
  if (weekEmployees.length === 0) return [];
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
        dayBaseHoursOnly(emp.days[col.key]),
        jobHoursComparableToPayrollBase(emp, jobs, col.iso, directory, weekFrom),
        emp,
      );
    }
  }

  const externalByKeyDate = new Map<string, { name: string; col: (typeof cols)[0]; hours: number; directoryId: string }>();
  for (const job of jobs) {
    const entries = Array.isArray(job.workEntries) ? job.workEntries : [];
    for (const we of entries) {
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

export function findEmployeeWeekStats(snap: WeekSnapshot, dirId: string, name: string): { hours: number; netPay: number } | null {
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

export interface EmployeeArchiveStats {
  year: number;
  totalHours: number;
  totalNet: number;
  weekCount: number;
  monthlyHours: number[];
  monthlyNet: number[];
  weeks: { weekFrom: string; weekTo: string; hours: number; netPay: number }[];
}

export function buildEmployeeArchiveStats(dirId: string, name: string, savedWeeks: WeekSnapshot[], year: number): EmployeeArchiveStats {
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

export function consistencyAlertMessage(a: PayrollJobConsistencyAlert): string {
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

export function payrollPrevSatDetailLines(employees: WeekEmployee[], weekFrom: string) {
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

export function formatPayrollDayCell(day: DayData): string {
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

export function payrollWeeklyGrid(employees: WeekEmployee[], weekFrom: string): PayrollWeeklyGrid {
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

export function fmt(n: number) { return n.toLocaleString("pl-PL",{minimumFractionDigits:2,maximumFractionDigits:2}); }
export function fmtH(n: number) { const h=Math.floor(n),m=Math.round((n-h)*60); return m===0?`${h}h`:`${h}h ${m}m`; }
export function fmtDate(iso: string) { if(!iso) return ""; const [y,mo,d]=iso.split("-"); return `${d}.${mo}.${y}`; }
export function getWeekRange() {
  return getPayrollWeekRange();
}
export function calcWeekEmployee(emp: WeekEmployee) {
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

export function extraCostStatus(c: EmployeeExtraCost): ExtraCostStatus {
  return c.status ?? "approved";
}

export function approvedExtraCostAmount(c: EmployeeExtraCost): number {
  if (extraCostStatus(c) !== "approved") return 0;
  return parseFloat(c.amount) || 0;
}

export const PHOTO_STATUS_LABELS: Record<PhotoEntry["status"], string> = {
  pending: "Oczekuje na akceptację",
  approved: "Zaakceptowane",
  rejected: "Odrzucone",
};

export const EXTRA_COST_STATUS_LABELS: Record<ExtraCostStatus, string> = {
  pending: "Oczekuje na akceptację",
  approved: "Zaakceptowane",
  rejected: "Odrzucone",
};

export function workerTodayWorkInfo(
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

export const DEFAULT_JOB_ENTRY_HOURS = 9;
/** Krótki wpis na jednej robocie (logistyka — Jarosław itd.) */
export const DEFAULT_MULTI_SITE_VISIT_HOURS = 2;

export function previousIsoDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return localIsoDate(dt);
}

export function dayKeyForIsoInWeek(iso: string, weekFrom: string): DayKey | null {
  return weekDayColumns(weekFrom).find((c) => c.iso === iso)?.key ?? null;
}

export function hoursFromPayrollDay(day: DayData): number {
  const total = dayTotalHours(day);
  if (total > 0) return total;
  if (!day.active) return DEFAULT_JOB_ENTRY_HOURS;
  return 0;
}

export function duplicateWorkEntry(entry: WorkEntry, date: string): WorkEntry {
  return { ...entry, id: crypto.randomUUID(), date };
}

/** Godziny wpisu na robocie — z listy płac na dany dzień, inaczej 9 h standard. */
export function duplicateWorkEntryWithPayrollHours(
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
    const payHours = dayBaseHoursOnly(emp.days[dayKey]);
    if (payHours > 0) return { ...base, hours: payHours };
  }
  return { ...base, hours: DEFAULT_JOB_ENTRY_HOURS };
}

export function employeeRefForAlert(
  alert: PayrollJobConsistencyAlert,
  weekEmployees: WeekEmployee[],
  directory: DirectoryEmployee[],
): Pick<WeekEmployee, "directoryId" | "name"> {
  const weekEmp = weekEmployees.find((e) => normalizeEmpName(e.name) === normalizeEmpName(alert.name));
  if (weekEmp) return weekEmp;
  const dir = directory.find((d) => normalizeEmpName(d.name) === normalizeEmpName(alert.name));
  return { directoryId: dir?.id || "", name: alert.name };
}

export function pickJobForConsistencyFix(
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

export function jobsForMultiSiteSplit(
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

export function distributeHoursAcrossEntries(
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
export function fixJobsForConsistencyAlert(
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

export function payrollHoursForDirectoryOnDate(
  dirId: string,
  dateIso: string,
  weekEmployees: WeekEmployee[],
  weekFrom: string,
): number {
  const emp = weekEmployees.find((e) => e.directoryId === dirId);
  const dayKey = dayKeyForIsoInWeek(dateIso, weekFrom);
  if (!emp || !dayKey) return 0;
  return dayBaseHoursOnly(emp.days[dayKey]);
}

export function workEntryGroupKey(entry: WorkEntry): string {
  return entry.directoryId || `name:${entry.employeeName}`;
}

export interface WorkEntryGroup {
  key: string;
  directoryId: string;
  employeeName: string;
  entries: WorkEntry[];
  totalHours: number;
  totalCost: number;
  dayCount: number;
}

export function groupWorkEntriesByEmployee(entries: WorkEntry[]): WorkEntryGroup[] {
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

export function collectEntriesFromYesterday(
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

export function workEntriesFromPayrollForDate(
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
    const hours = dayBaseHoursOnly(day);
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

export function defaultJob(): Job {
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

export function normalizeJob(job: Job): Job {
  return normalizeJobMetaFields(normalizeJobWmFields(syncJobDocuments({
    ...job,
    address: job.address ?? "",
    flatNumber: job.flatNumber ?? "",
    client: job.client ?? "",
    status: job.status === "completed" ? "completed" : "in_progress",
    workEntries: Array.isArray(job.workEntries) ? job.workEntries : [],
    photos: job.photos || [],
    workerReports: job.workerReports || [],
    activityLog: job.activityLog || [],
    materials: job.materials || [],
    jobFiles: job.jobFiles || [],
    executionLeadDirectoryId: job.executionLeadDirectoryId?.trim() || undefined,
    executionAssigneeDirectoryIds: sanitizeExecutionAssigneeIds(job.executionAssigneeDirectoryIds),
  })));
}

function sanitizeExecutionAssigneeIds(raw: string[] | undefined): string[] {
  return [...new Set((raw || []).map((id) => String(id).trim()).filter(Boolean))];
}

/** FAZA 9.0 — czy pracownik (directoryId) jest na planowej ekipie realizacji kontraktu. */
export function isWorkerOnExecutionTeam(job: Job, workerDirectoryId: string): boolean {
  const id = workerDirectoryId?.trim();
  if (!id) return false;
  if (job.executionLeadDirectoryId === id) return true;
  return (job.executionAssigneeDirectoryIds ?? []).includes(id);
}

/** FAZA 9.0.1 — status kontraktu/roboty na karcie „Twoje kontrakty” (tylko odczyt). */
export function resolveWorkerContractStatusLabel(job: Job): string {
  const statusJob = job as JobListStatusJob;
  if (job.linkedTenderId) {
    return HANDOVER_STAGE_LABELS[inferHandoverStage(statusJob)];
  }
  return JOB_LIST_STATUS_CONFIG[resolveJobListStatus(statusJob)].label;
}

/** FAZA 9.0.1 — termin kontraktu na karcie pracownika (fmtDate, bez plannedHandoverDate). */
export function resolveWorkerContractDateLabel(job: Job): string | null {
  const start = job.startDate?.trim();
  const end = job.endDate?.trim();
  if (start && end) return `${fmtDate(start)} – ${fmtDate(end)}`;
  if (start) return `Start: ${fmtDate(start)}`;
  return null;
}

export function normalizeJobsList(raw: unknown[]): Job[] {
  return raw.filter(isValidJobRecord).map((j) => normalizeJob(j as Job));
}

export function clientShareToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

export function clientShareUrl(token: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/?podglad=${token}`;
}

export async function prepareWatermarkedPhoto(job: Job, file: File): Promise<File> {
  return watermarkedFile(file, jobWatermarkLines(job.address, job.flatNumber));
}

export const ACTIVITY_LABELS: Record<JobActivityType, string> = {
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
  inspector_billing_note: "Inspektor · uwaga Do rozliczenia",
  inspector_photo: "Inspektor · zdjęcie",
};

export function jobDaysSinceStart(job: Job): number {
  const start = new Date(job.startDate);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, Math.round((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

export function jobWorkerReports(job: Job): WorkerJobReport[] {
  return (job.workerReports || []).map(normalizeWorkerReport);
}

export function reportNeedsAdminAttention(r: WorkerJobReport): boolean {
  if (!r.adminReviewedAt) return true;
  if (r.updatedAt && r.updatedAt > r.adminReviewedAt) return true;
  return false;
}

export function normalizeWorkItem(raw: unknown): WorkReportItem {
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

export function normalizeWorkerReport(r: WorkerJobReport): WorkerJobReport {
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

export function workItemHasContent(item: WorkReportItem): boolean {
  return Boolean(item.text.trim() || item.note.trim());
}

export function roomHasContent(room: RoomDimension): boolean {
  return Boolean(room.length.trim() || room.width.trim() || room.height.trim() || (room.note || "").trim());
}

export function roomDisplayName(room: RoomDimension, pokojIndex: number): string {
  if (room.roomType === "pokoj") return room.customLabel.trim() || `Pokój ${pokojIndex + 1}`;
  if (room.roomType === "inne") return room.customLabel.trim() || "Inne";
  return ROOM_TYPE_LABELS[room.roomType];
}

export function defaultRoom(roomType: RoomTypeKey, customLabel = ""): RoomDimension {
  return { id: crypto.randomUUID(), roomType, customLabel, length: "", width: "", height: "", note: "" };
}

export function jobDuration(job: Job): number {
  const end = job.endDate ? new Date(job.endDate) : new Date();
  const start = new Date(job.startDate);
  return Math.max(0, Math.round((end.getTime()-start.getTime())/(1000*60*60*24)));
}
export function jobCost(job: Job): number {
  return job.workEntries.reduce((s,e)=>s+e.hours*e.rate,0);
}
export function jobTotalHours(job: Job): number {
  return job.workEntries.reduce((s,e)=>s+e.hours,0);
}
export function jobMaterialsCost(job: Job): number {
  return (job.materials||[]).reduce((s,m)=>s+m.cost,0);
}
export function jobTotalCost(job: Job): number {
  return jobCost(job)+jobMaterialsCost(job);
}

export const GALLERY_ARCHIVE_DAYS = 30;

export function jobDisplayTitle(job: Job): string {
  const addr = job.address?.trim() || "Bez adresu";
  return job.flatNumber ? `${addr} m.${job.flatNumber}` : addr;
}

export function jobApprovedPhotos(job: Job): PhotoEntry[] {
  return filterAvailablePhotos(
    (job.photos || []).filter((p) => p.status === "approved" && p.publicUrl),
  );
}

export function jobHandoverIso(job: Job): string | null {
  if (job.status !== "completed" || !job.keysHandedOver) return null;
  if (job.endDate) return job.endDate;
  const log = job.activityLog || [];
  for (let i = log.length - 1; i >= 0; i--) {
    const a = log[i];
    if (a.type === "status_change") return a.at.slice(0, 10);
  }
  return job.startDate || null;
}

export function daysSinceIso(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const then = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((today.getTime() - then.getTime()) / 86400000);
}

export type JobGalleryBucket = "active" | "grace" | "archived";

export function jobGalleryBucket(job: Job): JobGalleryBucket | null {
  if (jobApprovedPhotos(job).length === 0) return null;
  if (job.status !== "completed" || !job.keysHandedOver) return "active";
  const handoverIso = jobHandoverIso(job);
  if (!handoverIso) return "grace";
  return daysSinceIso(handoverIso) <= GALLERY_ARCHIVE_DAYS ? "grace" : "archived";
}

export function galleryDaysUntilArchive(job: Job): number | null {
  const handoverIso = jobHandoverIso(job);
  if (!handoverIso) return null;
  return Math.max(0, GALLERY_ARCHIVE_DAYS - daysSinceIso(handoverIso));
}

export function todayDayKey(): DayKey|null {
  const d=new Date().getDay(); return d===0?null:DAYS[d-1];
}

export function localIsoDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayIsoDate(): string {
  return localIsoDate();
}

export function personNamesMatch(a: string, b: string): boolean {
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
export function workEntryNamesMatch(a: string, b: string): boolean {
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

export function workEntryMatchesEmployee(
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

export function fridayIsoOfWeek(weekFrom: string): string {
  const [y, m, d] = weekFrom.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 4);
  return localIsoDate(dt);
}

export function findWeekEmployeeForWorker(
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

export interface WorkerPayoutRow {
  weekFrom: string;
  weekTo: string;
  savedAt: string;
  netPay: number;
  totalHours: number;
  settled: boolean;
}

export function workerPayoutHistory(
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

export function employeeMatchesWorkEntry(
  emp: WeekEmployee,
  we: WorkEntry,
  directory: DirectoryEmployee[],
): boolean {
  return workEntryMatchesEmployee(emp, we, directory);
}

export function sortJobsActiveFirst(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    if (a.status === "in_progress" && b.status !== "in_progress") return -1;
    if (b.status === "in_progress" && a.status !== "in_progress") return 1;
    return 0;
  });
}

/** Sidebar / podgląd: ilu pracowników dziś na ilu aktywnych robotach (wpisy czasu pracy). */
export function weekEmployeeWorkerKey(emp: Pick<WeekEmployee, "directoryId" | "name">): string | null {
  if (emp.directoryId) return `d:${emp.directoryId}`;
  const n = emp.name?.trim();
  return n ? `n:${normalizeEmpName(n)}` : null;
}

/** Sidebar / podgląd: ilu pracowników dziś na ilu aktywnych robotach (wpisy czasu pracy). */
export function todayFieldWorkStats(
  jobs: Job[],
  dateIso: string,
  directory: DirectoryEmployee[],
  weekEmployees: WeekEmployee[],
  weekFrom: string,
): { people: number; jobs: number } {
  const workerKeys = new Set<string>();
  const jobIds = new Set<string>();
  for (const job of jobs) {
    if (job.status !== "in_progress") continue;
    const entries = Array.isArray(job.workEntries) ? job.workEntries : [];
    for (const we of entries) {
      if (we.date !== dateIso) continue;
      if (we.directoryId) {
        const dir = directory.find((d) => d.id === we.directoryId);
        if (dir && isTestDirectoryEmployee(dir)) continue;
        workerKeys.add(`d:${we.directoryId}`);
      } else if (we.workerName?.trim()) {
        workerKeys.add(`n:${normalizeEmpName(we.workerName)}`);
      } else {
        continue;
      }
      jobIds.add(job.id);
    }
  }

  const dayKey = dayKeyForIsoInWeek(dateIso, weekFrom);
  if (dayKey) {
    for (const emp of weekEmployees) {
      if (isTestWeekEmployee(emp, directory)) continue;
      if (!isMultiSiteEmployee(emp, directory)) continue;
      if (dayTotalHours(emp.days[dayKey]) <= 0) continue;
      const key = weekEmployeeWorkerKey(emp);
      if (key) workerKeys.add(key);
    }
  }

  return { people: workerKeys.size, jobs: jobIds.size };
}

/** Pulpit: adres roboty — tylko wpis czasu pracy z dzisiejszą datą (Roboty → Dodaj wpis). */
export function jobsForEmployeeOnDashboard(
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

export function weekDayColumns(weekFrom: string): { key: DayKey; iso: string; shortLabel: string; dateLabel: string }[] {
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

export function shortJobAddress(job: Job): string {
  const a = job.address?.trim() || "—";
  const base = a.length > 24 ? `${a.slice(0, 22)}…` : a;
  return job.flatNumber ? `${base} m.${job.flatNumber}` : base;
}

export function jobsForEmployeeOnIsoDate(
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

export function scheduleCellFor(
  emp: WeekEmployee,
  dayKey: DayKey,
  dateIso: string,
  jobs: Job[],
  directory: DirectoryEmployee[],
): { working: boolean; timeRange: string; hoursLabel: string; locations: string[]; logisticsOnly: boolean } {
  const day = emp.days[dayKey];
  const activeJobs = jobs.filter((j) => j.status === "in_progress");
  const jobList = jobsForEmployeeOnIsoDate(emp, activeJobs, dateIso, directory);
  const locations = jobList.map(shortJobAddress);
  const extraList = day.extraHours ?? [];
  const totalH = dayTotalHours(day);
  const working = day.active || extraList.length > 0 || locations.length > 0;
  const multiSite = isMultiSiteEmployee(emp, directory);
  const logisticsOnly = multiSite && (day.active || extraList.length > 0) && locations.length === 0;
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
    logisticsOnly,
  };
}

export function collectWorkEntriesForWeek(jobs: Job[], weekFrom: string, weekTo: string): ArchivedWorkEntry[] {
  const out: ArchivedWorkEntry[] = [];
  for (const job of jobs) {
    const entries = Array.isArray(job.workEntries) ? job.workEntries : [];
    for (const we of entries) {
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

export function buildWeekSnapshot(
  weekFrom: string,
  weekTo: string,
  weekEmployees: WeekEmployee[],
  jobs: Job[],
  existing?: WeekSnapshot,
  employeeLeaves?: import("@/lib/employee-leaves").EmployeeLeave[],
  savedWeeksForCarry?: WeekSnapshot[],
): WeekSnapshot {
  const employees = weekEmployees.map((emp) => {
    const c = calcWeekEmployee(emp);
    let leaveStatus: PayrollLeaveStatus | undefined;
    if (employeeLeaves?.length && emp.directoryId) {
      const leave = employeeLeaves.find(
        (l) =>
          l.employeeId === emp.directoryId &&
          l.weekStart <= weekTo &&
          l.weekEnd >= weekFrom,
      );
      leaveStatus = leave?.leaveType;
    }
    const grossPay = leaveStatus ? 0 : c.grossPay;
    const carryFields = leaveStatus
      ? { netPay: 0 as number }
      : snapshotCarryFieldsForEmployee(emp, weekFrom, weekTo, c.netPay, false, savedWeeksForCarry);
    return {
      name: emp.name,
      position: emp.position,
      rate: c.rateNum,
      weekHours: c.weekHours,
      prevSatHours: c.prevSatHours,
      totalHours: c.totalHours,
      grossPay,
      totalZaliczka: c.totalZaliczka,
      totalExtraCosts: c.totalExtraCosts,
      netPay: leaveStatus ? 0 : carryFields.netPay,
      settled: emp.settled,
      ...(leaveStatus ? { leaveStatus } : {}),
      ...(carryFields.carryForwardOut != null ? { carryForwardOut: carryFields.carryForwardOut } : {}),
      ...(carryFields.carryForwardTargetFrom ? { carryForwardTargetFrom: carryFields.carryForwardTargetFrom } : {}),
      ...(carryFields.carryForwardTargetTo ? { carryForwardTargetTo: carryFields.carryForwardTargetTo } : {}),
      ...(carryFields.carryForwardIn != null ? { carryForwardIn: carryFields.carryForwardIn } : {}),
      ...(carryFields.carryForwardFromWeek ? { carryForwardFromWeek: carryFields.carryForwardFromWeek } : {}),
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
    totalGross: employees.reduce((s, e) => s + e.grossPay, 0),
    totalZaliczka: weekEmployees.reduce((s, e) => s + calcWeekEmployee(e).totalZaliczka, 0),
    totalNet: employees.reduce((s, e) => s + e.netPay, 0),
    weekEmployees: JSON.parse(JSON.stringify(weekEmployees)) as WeekEmployee[],
    workEntries: existing?.workEntries ?? collectWorkEntriesForWeek(jobs, weekFrom, weekTo),
    backlog: existing?.backlog,
    backlogNote: existing?.backlogNote,
  };
}

export function archivedWorkEntryMatches(
  emp: WeekEmployee,
  we: ArchivedWorkEntry,
  directory: DirectoryEmployee[],
): boolean {
  return workEntryMatchesEmployee(emp, we, directory);
}

export function scheduleCellFromArchive(
  emp: WeekEmployee,
  dayKey: DayKey,
  dateIso: string,
  workEntries: ArchivedWorkEntry[],
  directory: DirectoryEmployee[],
): { working: boolean; timeRange: string; hoursLabel: string; locations: string[]; logisticsOnly: boolean } {
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
  const multiSite = isMultiSiteEmployee(emp, directory);
  const logisticsOnly = multiSite && (day.active || extraList.length > 0) && locations.length === 0;
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
    logisticsOnly,
  };
}

export function formatJobStreet(job: Job): string {
  const street = job.address?.trim() || "Bez adresu";
  return job.flatNumber ? `${street} m.${job.flatNumber}` : street;
}

export function jobAddressKey(job: Job): string {
  const addr = (job.address ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const flat = (job.flatNumber ?? "").trim().toLowerCase();
  if (!addr) return "";
  return flat ? `${addr}|${flat}` : addr;
}

/** 9 cyfr numeru PL (bez +48) — do logowania pracownika. */
export function normalizePhone9(phone: string | null | undefined): string | null {
  const d = String(phone ?? "").replace(/\D/g, "");
  if (d.length < 9) return null;
  return d.slice(-9);
}

export function workerHasPhonePin(emp: DirectoryEmployee): boolean {
  return normalizePhone9(emp.phone) !== null;
}

export function workerPhonePinValid(emp: DirectoryEmployee, pinInput: string): boolean {
  const stored = normalizePhone9(emp.phone);
  const entered = normalizePhone9(pinInput);
  if (!stored || !entered) return false;
  return stored === entered;
}

export function workerHasPersonalPin(emp: DirectoryEmployee): boolean {
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

export function workerPinTooWeak(emp: DirectoryEmployee, pin: string): boolean {
  const digits = pin.replace(/\D/g, "").slice(0, 4);
  if (digits.length !== 4) return true;
  const phone9 = normalizePhone9(emp.phone);
  if (phone9 && digits === phone9.slice(-4)) return true;
  return false;
}

export const ADMIN_PIN_KEY = "kw-admin-pin";

export async function uploadPhoto(
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

export async function uploadReceipt(
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

export function applyWriteTimestamps(key: string, prev: unknown, next: unknown): unknown {
  const now = new Date().toISOString();
  if (!Array.isArray(prev) || !Array.isArray(next)) return next;
  const prevMap = new Map(
    (prev as { id?: string }[]).filter((r) => r?.id).map((r) => [String(r.id), r]),
  );
  if (key === "kw-jobs" || key === "kw-directory" || key === "kw-contacts") {
    return (next as { id?: string }[]).map((item) => {
      if (!item?.id) return item;
      const old = prevMap.get(String(item.id));
      if (!old || JSON.stringify(old) !== JSON.stringify(item)) {
        return { ...item, updatedAt: now };
      }
      return item;
    });
  }
  if (key === "kw-week-employees") {
    return (next as WeekEmployee[]).map((item) => {
      if (!item?.id) return item;
      const old = prevMap.get(String(item.id)) as WeekEmployee | undefined;
      if (!old) return item;
      const rateChanged = item.rate !== old.rate;
      const settledChanged = item.settled !== old.settled;
      const dataChanged =
        JSON.stringify({ days: item.days, prevSaturday: item.prevSaturday, extraCosts: item.extraCosts })
        !== JSON.stringify({ days: old.days, prevSaturday: old.prevSaturday, extraCosts: old.extraCosts });
      if (!rateChanged && !dataChanged && !settledChanged) return item;
      return {
        ...item,
        rateUpdatedAt: rateChanged ? now : item.rateUpdatedAt ?? old.rateUpdatedAt,
        dataUpdatedAt: (dataChanged || settledChanged) ? now : item.dataUpdatedAt ?? old.dataUpdatedAt,
        settledUpdatedAt: settledChanged ? now : item.settledUpdatedAt ?? old.settledUpdatedAt,
      };
    });
  }
  if (key === "kw-archive") {
    return (next as { id?: string; savedAt?: string }[]).map((item) => {
      if (!item?.id) return item;
      const old = prevMap.get(String(item.id));
      if (!old || JSON.stringify(old) !== JSON.stringify(item)) {
        return { ...item, savedAt: now };
      }
      return item;
    });
  }
  return next;
}

