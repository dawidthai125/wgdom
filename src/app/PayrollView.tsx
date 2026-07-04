import { useState, useMemo, useEffect, useRef, useCallback, Fragment } from "react";
import {
  Calculator, Clock, Banknote, User, Plus, Trash2, ChevronRight, ChevronLeft, Users,
  FileText, FileDown, CheckCircle2, Circle, Archive, ChevronDown, ChevronUp, Calendar,
  CalendarDays, TrendingUp, Wallet, X, Phone, UserPlus, Edit2, Check, Search, Building2,
  MapPin, AlertTriangle, Download, Upload, HardHat, StickyNote, Cloud, Mail, Send, Eye,
  RotateCcw, BarChart3, Scale, HelpCircle, LayoutGrid, Sparkles, Bell, Copy, CloudUpload,
  UserMinus, RefreshCw,
} from "lucide-react";
import { saveAs } from "file-saver";
import { useWheelScrollForward } from "@/lib/wheel-scroll-forward";
import { registerNativeBackHandler } from "@/lib/native-app-bridge";
import { useModalScrollLock } from "@/lib/modal-scroll-lock";
import {
  buildPayrollEmailHtml,
  generatePayrollPdfBlob,
  generatePayrollWordBlob,
  buildPayrollExtraCostLines,
  blobToBase64,
  type PayrollCalcRow,
  type PayrollExportTotals,
} from "@/lib/payroll-export";
import { leaveTypeDisplayLabel, type EmployeeLeave } from "@/lib/employee-leaves";
import {
  calcWeekEmployeeWithLeave,
  calcBiweeklyWeekNetWithLeave,
  isPayrollWeekSaved,
  type PayrollCalcWithLeave,
} from "@/lib/payroll-leave-overlay";
import {
  calcWeekEmployeeForPayroll,
  canDeferPayroll,
  buildPayrollCarryForwardRecord,
  calcWeeklyNetWithCarry,
  CARRY_FORWARD_LABEL,
  type PayrollCalcWithAdjustments,
} from "@/lib/payroll-carry-forward";
import {
  isBiweeklyPayrollEmployee,
  calcBiweeklyRowDisplay,
  computePayrollCashSplit,
  isPayrollWeekClosedForUi,
  biweeklyMissingPrevWeekArchive,
  biweeklyCashContextLine,
  calcWeekNetNoPrevSat,
  getPayrollWeekRange,
  getPayrollClosingWeekRange,
  PAYROLL_WEEK_ROLLOVER_HOUR,
} from "@/lib/payroll-cycle";
import { hasPayrollRolloverBlockers } from "@/lib/payroll-rollover";
import { resolvePayrollDisplayEmployees } from "@/lib/payroll-display";
import { contactsForPayroll, contactAllowsPayroll, type EmailContact } from "@/lib/email-contacts";
import { API_BASE, API_HEADERS, shouldShowPayrollRestoreBanner } from "@/lib/cloud-sync";
import { useAdminAccess } from "@/app/admin-access";
import { Checkbox, PayrollDayCellDisplay } from "@/app/app-ui";
import { WeekEmployeeDetail } from "@/app/WeekEmployeeDetail";
import {
  type WeekEmployee,
  type WeekSnapshot,
  type DirectoryEmployee,
  type Job,
  type DayKey,
  type DayData,
  DAYS,
  DAY_LABELS,
  fmt,
  fmtH,
  fmtDate,
  defaultDay,
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
  filterProductionActiveDirectory,
  isProductionDirectoryEmployee,
  isTestWeekEmployee,
  dayTotalHours,
  formatPayrollDayCell,
  weekDayColumns,
  PREV_SAT_SHORT,
  getWeekRange,
} from "@/app/app-domain";
import { PayrollJobAssignmentsPanel } from "@/app/PayrollJobAssignmentsPanel";
import {
  employeePayrollAssignmentBadge,
  payrollAssignmentAlertsForWeek,
  type PayrollAssignmentBadgeStatus,
} from "@/lib/payroll-job-assignments";


export function toPayrollCalcRows(
  rows: ({ emp: WeekEmployee } & PayrollCalcWithAdjustments)[],
  directory: DirectoryEmployee[],
  weekFrom: string,
  weekTo: string,
  savedWeeks: WeekSnapshot[],
): PayrollCalcRow[] {
  return rows.map((r) => {
    const leaveStatus = r.leaveStatus;
    const carryOut = r.carryForwardOut != null && r.carryForwardOut > 0;
    const carryIn = r.carryForwardIn != null && r.carryForwardIn > 0;
    const biweekly = !leaveStatus && !carryOut && !carryIn && isBiweeklyPayrollEmployee(r.emp, directory);
    const bw = biweekly ? calcBiweeklyRowDisplay(r.emp, directory, weekFrom, weekTo, savedWeeks) : null;
    let netPay: number;
    if (leaveStatus || carryOut) netPay = 0;
    else if (carryIn) netPay = r.displayNetPay ?? r.netPay ?? 0;
    else if (bw) netPay = bw.isPayoutWeek ? bw.displayNet : bw.thisWeekNet;
    else netPay = r.displayNetPay ?? r.netPay ?? 0;
    const grossPay = leaveStatus ? 0 : (biweekly ? r.weekGross : r.grossPay);
    return {
      emp: { name: r.emp.name, position: r.emp.position, settled: r.emp.settled },
      weekHours: r.weekHours,
      prevSatHours: biweekly ? 0 : r.prevSatHours,
      totalHours: biweekly ? r.weekHours : r.totalHours,
      totalExtraHours: r.totalExtraHours,
      weekZaliczka: r.weekZaliczka,
      prevSatZaliczka: biweekly ? 0 : r.prevSatZaliczka,
      totalZaliczka: biweekly ? r.weekZaliczka : r.totalZaliczka,
      totalExtraCosts: r.totalExtraCosts,
      weekGross: r.weekGross,
      prevSatGross: biweekly ? 0 : r.prevSatGross,
      grossPay,
      weekNet: leaveStatus || carryOut ? 0 : r.weekNet,
      prevSatNet: biweekly ? 0 : r.prevSatNet,
      netPay,
      rateNum: r.rateNum,
      biweekly: biweekly || undefined,
      biweeklyPayoutWeek: bw?.isPayoutWeek,
      biweeklyAccruedOnly: bw?.accruedOnly,
      biweeklyNextPayout: bw?.nextPayoutDate,
      biweeklyThisWeekNet: leaveStatus ? 0 : bw?.thisWeekNet,
      biweeklyPrevWeekNet: bw?.prevWeekNet,
      biweeklyPrevWeekLabel: bw ? `${fmtDate(bw.prevWeekFrom)}–${fmtDate(bw.prevWeekTo)}` : undefined,
      biweeklyDisplayNet: leaveStatus ? 0 : bw?.displayNet,
      leaveStatus,
      carryForwardOut: r.carryForwardOut,
      carryForwardIn: r.carryForwardIn,
      carryForwardInFrom: r.carryForwardInFrom,
    };
  });
}

export function PayrollEmailModal({
  weekFrom,
  weekTo,
  rows,
  totals,
  contacts,
  jobs,
  directory,
  savedWeeks,
  onClose,
  onManageContacts,
}: {
  weekFrom: string;
  weekTo: string;
  rows: ({ emp: WeekEmployee } & ReturnType<typeof calcWeekEmployee>)[];
  totals: PayrollExportTotals;
  contacts: EmailContact[];
  jobs: Job[];
  directory: DirectoryEmployee[];
  savedWeeks: WeekSnapshot[];
  onClose: () => void;
  onManageContacts: () => void;
}) {
  useModalScrollLock(true);
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
  const calcRows = useMemo(() => toPayrollCalcRows(rows, directory, weekFrom, weekTo, savedWeeks), [rows, directory, weekFrom, weekTo, savedWeeks]);
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
      const extraCostLines = buildPayrollExtraCostLines(rows.map((r) => r.emp));
      const prevSatDetails = payrollPrevSatDetailLines(rows.filter((r) => !isBiweeklyPayrollEmployee(r.emp, directory)).map((r) => r.emp), weekFrom);
      const prevSatIso = previousSaturdayIso(weekFrom);
      const jobWorkLines = payrollJobWorkLines(jobs, weekFrom, weekTo);
      const attachments: { filename: string; content: string }[] = [];
      if (attachPdf) {
        setSendStage("Ładuję generator PDF…");
        const pdfBlob = await generatePayrollPdfBlob(weekFrom, weekTo, calcRows, totals, weeklyGrid, extraHourLines, prevSatDetails, prevSatIso, jobWorkLines, extraCostLines);
        setSendStage("Koduję PDF…");
        attachments.push({ filename: `lista-plac-${weekFrom}.pdf`, content: await blobToBase64(pdfBlob) });
      }
      if (attachWord) {
        setSendStage("Generuję Word…");
        const wordBlob = await generatePayrollWordBlob(weekFrom, weekTo, calcRows, totals, weeklyGrid, extraHourLines, prevSatDetails, prevSatIso, extraCostLines);
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
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="bg-card rounded-t-2xl md:rounded-2xl border border-border w-full max-w-lg shadow-2xl max-h-[92dvh] flex flex-col">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <p className="text-sm font-semibold">Wyślij listę płac emailem</p>
            <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(weekFrom)} – {fmtDate(weekTo)}</p>
          </div>
          <button type="button" onClick={onClose} className="touch-target p-1 rounded-lg hover:bg-secondary text-muted-foreground"><X size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
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
                    <input type="email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="odbiorca@firma.pl" className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"/>
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

export function PayrollPdfPreviewModal({
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
  useModalScrollLock(true);
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
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-5"
      style={{ background: "rgba(0,0,0,0.78)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payroll-pdf-preview-title"
    >
      <div
        className="bg-card rounded-t-2xl md:rounded-2xl border border-border shadow-2xl w-full max-w-6xl h-[94dvh] md:h-[90dvh] flex flex-col overflow-hidden"
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

function PayrollAssignmentBadge({ status }: { status: PayrollAssignmentBadgeStatus }) {
  if (status === "skip") return null;
  const cfg =
    status === "ok"
      ? { dot: "🟢", label: "Spójne", cls: "text-green-600 dark:text-green-400" }
      : status === "unassigned"
        ? { dot: "🟡", label: "Nieprzypisane", cls: "text-yellow-600 dark:text-yellow-400" }
        : { dot: "🔴", label: "Niezgodność", cls: "text-red-600 dark:text-red-400" };
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-medium shrink-0 ${cfg.cls}`}
      title={cfg.label}
    >
      {cfg.dot}
    </span>
  );
}

export function PayrollView({
  weekEmployees, weekFrom, weekTo, directory, contacts, jobs, employeeLeaves,
  onWeekChange, onToggleSettled, onSaveWeek, savedWeeks,
  onAddFromDirectory, onRemoveWeekEmployee, onClearAllWeekEmployees, onReplaceWithAllActive,
  onUpdateWeekEmployeeExtraCosts, onUpdateWeekEmployeeDay, onUpdateWeekEmployeeRate,
  onUpdateWeekEmployeePrevSaturday, onUpdateWeekEmployeePayrollCarryForward, onGoToCurrent,
  onManageContacts,
  onRestoreFromArchive,
  onSyncRatesFromDirectory,
  onSaveBacklogWeek,
  initialEmpId,
  onInitialEmpConsumed,
  onDetailOpenChange,
  onSetJobs,
}:{
  weekEmployees: WeekEmployee[]; weekFrom:string; weekTo:string;
  directory: DirectoryEmployee[];
  employeeLeaves: EmployeeLeave[];
  contacts: EmailContact[];
  jobs: Job[];
  onWeekChange:(f:string,t:string)=>void;
  onToggleSettled:(id:string)=>void;
  onSaveWeek:()=>void;
  savedWeeks:WeekSnapshot[];
  onAddFromDirectory:(ids:string[])=>void;
  onRemoveWeekEmployee:(id:string)=>void;
  onClearAllWeekEmployees?:()=>void;
  onReplaceWithAllActive?:()=>void;
  onUpdateWeekEmployeeExtraCosts:(empId:string, nextExtraCosts:WeekEmployee["extraCosts"])=>void;
  onUpdateWeekEmployeeDay:(empId:string, key:DayKey, next:DayData)=>void;
  onUpdateWeekEmployeeRate:(empId:string, rate:string)=>void;
  onUpdateWeekEmployeePrevSaturday:(empId:string, next:DayData)=>void;
  onUpdateWeekEmployeePayrollCarryForward:(empId:string, carry:WeekEmployee["payrollCarryForward"])=>void;
  onGoToCurrent:()=>void;
  onManageContacts:()=>void;
  onRestoreFromArchive?:()=>void;
  onSyncRatesFromDirectory?:()=>void;
  onSaveBacklogWeek?:(weekFrom:string, weekTo:string, employees:WeekEmployee[])=>void;
  initialEmpId?: string | null;
  onInitialEmpConsumed?: () => void;
  onDetailOpenChange?: (open: boolean) => void;
  onSetJobs: (jobs: Job[] | ((prev: Job[]) => Job[])) => void;
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
  const [showBacklogModal, setShowBacklogModal] = useState(false);

  useModalScrollLock(showPicker || showBacklogModal || showPdfPreview || showEmailModal);

  type PayrollListMode = "summary" | "detailed" | "assignments";
  const [payrollListMode, setPayrollListMode] = useState<PayrollListMode>(() => {
    try {
      const stored = localStorage.getItem("wg-payroll-list-mode");
      if (stored === "detailed" || stored === "assignments") return stored;
      return "summary";
    } catch {
      return "summary";
    }
  });

  const switchPayrollListMode = (mode: PayrollListMode) => {
    setPayrollListMode(mode);
    try {
      localStorage.setItem("wg-payroll-list-mode", mode);
    } catch { /* ignore */ }
  };

  const assignmentAlerts = useMemo(
    () => payrollAssignmentAlertsForWeek(weekEmployees, jobs, weekFrom, weekTo, directory),
    [weekEmployees, jobs, weekFrom, weekTo, directory],
  );
  const assignmentBadgeFor = useCallback(
    (emp: WeekEmployee) => employeePayrollAssignmentBadge(emp, assignmentAlerts, directory),
    [assignmentAlerts, directory],
  );

  useEffect(() => {
    onDetailOpenChange?.(selectedEmpId != null);
  }, [selectedEmpId, onDetailOpenChange]);

  useEffect(() => {
    if (!selectedEmpId) return;
    return registerNativeBackHandler(() => {
      setSelectedEmpId(null);
      return true;
    });
  }, [selectedEmpId]);

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

  const archivedForWeek = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
  const isSavedWeek = isPayrollWeekSaved(savedWeeks, weekFrom, weekTo);
  const hasRolloverBlockers = useMemo(
    () =>
      hasPayrollRolloverBlockers(weekEmployees, weekFrom, weekTo, directory, {
        employeeLeaves,
        savedWeeks,
      }),
    [weekEmployees, weekFrom, weekTo, directory, employeeLeaves, savedWeeks],
  );
  const isClosedWeek = isPayrollWeekClosedForUi(weekFrom, weekTo, hasRolloverBlockers);
  const displayEmployees = useMemo(
    () => resolvePayrollDisplayEmployees(isClosedWeek, weekEmployees, archivedForWeek?.weekEmployees, weekFrom, weekTo),
    [isClosedWeek, weekEmployees, archivedForWeek, weekFrom, weekTo],
  );

  useEffect(() => {
    if (initialEmpId && displayEmployees.some((e) => e.id === initialEmpId)) {
      setSelectedEmpId(initialEmpId);
      onInitialEmpConsumed?.();
    }
  }, [initialEmpId, displayEmployees, onInitialEmpConsumed]);

  useEffect(() => {
    if (isClosedWeek && payrollListMode === "assignments") {
      switchPayrollListMode("summary");
    }
  }, [isClosedWeek, payrollListMode]);

  const rows = useMemo(
    () =>
      displayEmployees.map((emp) => ({
        emp,
        ...calcWeekEmployeeForPayroll(emp, {
          weekFrom,
          weekTo,
          employeeLeaves: isClosedWeek ? undefined : employeeLeaves,
          archivedSnapshot: isClosedWeek ? archivedForWeek : undefined,
          livePayroll: !isClosedWeek,
          savedWeeks,
        }),
      })),
    [displayEmployees, weekFrom, weekTo, employeeLeaves, isClosedWeek, archivedForWeek, savedWeeks],
  );

  const cashSplit = useMemo(
    () =>
      computePayrollCashSplit(
        displayEmployees,
        directory,
        weekFrom,
        weekTo,
        savedWeeks,
        (e) =>
          calcWeeklyNetWithCarry(e, weekFrom, weekTo, {
            employeeLeaves: isClosedWeek ? undefined : employeeLeaves,
            savedWeeks,
            archivedSnapshot: isClosedWeek ? archivedForWeek : undefined,
          }),
        (e, from, to) =>
          calcBiweeklyWeekNetWithLeave(e, from, to, {
            employeeLeaves,
            savedWeeks,
            hasRolloverBlockers,
          }),
      ),
    [displayEmployees, directory, weekFrom, weekTo, savedWeeks, employeeLeaves, isClosedWeek, archivedForWeek, hasRolloverBlockers],
  );

  const backlogCheck = useMemo(
    () =>
      isClosedWeek
        ? { missing: false as const, biweeklyCount: 0, prevRange: { from: weekFrom, to: weekTo } }
        : biweeklyMissingPrevWeekArchive(weekEmployees, directory, weekFrom, weekTo, savedWeeks),
    [isClosedWeek, weekEmployees, directory, weekFrom, weekTo, savedWeeks],
  );

  const payrollCashContext = biweeklyCashContextLine(cashSplit, weekTo);

  const biweeklyRowMap = useMemo(() => {
    const m = new Map<string, ReturnType<typeof calcBiweeklyRowDisplay>>();
    for (const r of rows) {
      if (r.leaveStatus || r.carryForwardOut || r.carryForwardIn) continue;
      if (isBiweeklyPayrollEmployee(r.emp, directory)) {
        m.set(r.emp.id, calcBiweeklyRowDisplay(r.emp, directory, weekFrom, weekTo, savedWeeks));
      }
    }
    return m;
  }, [rows, directory, weekFrom, weekTo, savedWeeks]);

  const payrollDayColumns = useMemo(() => weekDayColumns(weekFrom), [weekFrom]);
  const showPrevSatDetailCol = useMemo(
    () => rows.some((r) => !biweeklyRowMap.has(r.emp.id) && formatPayrollDayCell(getPrevSaturday(r.emp)) !== "—"),
    [rows, biweeklyRowMap],
  );
  const dayColumnTotals = useMemo(
    () => payrollDayColumns.map((c) => +rows.reduce((s, r) => s + dayTotalHours(r.emp.days[c.key]), 0).toFixed(2)),
    [rows, payrollDayColumns],
  );
  const prevSatDetailIso = previousSaturdayIso(weekFrom);

  const totalWeekHours = rows.reduce((s,r)=>s+r.weekHours,0);
  const totalPrevSatHours = rows.reduce((s,r)=>s+(biweeklyRowMap.has(r.emp.id)?0:r.prevSatHours),0);
  const totalHoursAll = rows.reduce((s,r)=>s+(biweeklyRowMap.has(r.emp.id)?r.weekHours:r.totalHours),0);
  const totalWeekGross = rows.reduce((s,r)=>s+(r.leaveStatus?0:r.weekGross),0);
  const totalPrevSatGross = rows.reduce((s,r)=>s+(biweeklyRowMap.has(r.emp.id)||r.leaveStatus?0:r.prevSatGross),0);
  const totalGross = rows.reduce((s,r)=>s+(r.leaveStatus?0:(biweeklyRowMap.has(r.emp.id)?r.weekGross:r.grossPay)),0);
  const totalWeekZaliczka = rows.reduce((s,r)=>s+r.weekZaliczka,0);
  const totalPrevSatZaliczka = rows.reduce((s,r)=>s+(biweeklyRowMap.has(r.emp.id)?0:r.prevSatZaliczka),0);
  const totalZaliczkaSum = rows.reduce((s,r)=>s+(biweeklyRowMap.has(r.emp.id)?r.weekZaliczka:r.totalZaliczka),0);
  const totalExtraCostsSum = rows.reduce((s,r)=>s+r.totalExtraCosts,0);
  const totalNet = rows.reduce((s,r)=>{
    if (r.leaveStatus || (r.carryForwardOut != null && r.carryForwardOut > 0)) return s;
    if (r.carryForwardIn != null && r.carryForwardIn > 0) return s + r.displayNetPay;
    const bw = biweeklyRowMap.get(r.emp.id);
    if (bw) return s+(bw.isPayoutWeek?bw.displayNet:bw.thisWeekNet);
    return s+r.displayNetPay;
  },0);

  const alreadySaved = isSavedWeek;
  const showRestoreBanner = Boolean(
    !isClosedWeek &&
    onRestoreFromArchive &&
    shouldShowPayrollRestoreBanner(weekEmployees, archivedForWeek?.weekEmployees, weekFrom, weekTo),
  );

  // Directory employees not yet in this week
  const assignedDirIds = new Set(weekEmployees.map((e)=>e.directoryId).filter(Boolean));
  const availableFromDir = filterProductionActiveDirectory(directory).filter((d) => !assignedDirIds.has(d.id));
  const activeDirectoryCount = filterProductionActiveDirectory(directory).length;

  const confirmClearAll = () => {
    if (weekEmployees.length === 0) return;
    if (!window.confirm(`Usunąć wszystkich pracowników (${weekEmployees.length}) z listy płac tego tygodnia?\nGodziny w tym tygodniu zostaną skasowane z widoku — archiwum zapisane wcześniej nie zmienia się.`)) return;
    onClearAllWeekEmployees?.();
  };

  const confirmReplaceAllActive = () => {
    const n = activeDirectoryCount;
    if (n === 0) {
      window.alert("Brak aktywnych pracowników w kartotece.");
      return;
    }
    const msg = weekEmployees.length > 0
      ? `Usunąć obecnych (${weekEmployees.length}) i dodać ${n} aktywnych z kartoteki?`
      : `Dodać ${n} aktywnych pracowników z kartoteki do tego tygodnia?`;
    if (!window.confirm(msg)) return;
    onReplaceWithAllActive?.();
  };

  const filteredAvailable = availableFromDir.filter((d)=>
    d.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    d.position.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  const selectedEmp = displayEmployees.find((e)=>e.id===selectedEmpId)||null;
  const selectedPayrollRow = selectedEmp ? rows.find((r) => r.emp.id === selectedEmp.id) : undefined;

  const handleDeferPayroll = useCallback(
    (emp: WeekEmployee) => {
      const row = rows.find((r) => r.emp.id === emp.id);
      if (!row) return;
      const check = canDeferPayroll(emp, row, directory, isClosedWeek);
      if (!check.ok || check.frozenAmount == null) return;
      const target = buildPayrollCarryForwardRecord(check.frozenAmount, weekFrom, weekTo);
      if (
        !window.confirm(
          `Przenieść wypłatę ${fmt(check.frozenAmount)} PLN na tydzień ${fmtDate(target.targetWeekFrom)}–${fmtDate(target.targetWeekTo)}?\n\nKwota zostanie zamrożona — późniejsza zmiana godzin lub stawki nie wpłynie na przeniesienie.`,
        )
      ) {
        return;
      }
      onUpdateWeekEmployeePayrollCarryForward(emp.id, target);
    },
    [rows, directory, isClosedWeek, weekFrom, weekTo, onUpdateWeekEmployeePayrollCarryForward],
  );

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
    cashWeeklyNet: cashSplit.weeklyNet,
    cashBiweeklyPayoutNet: cashSplit.biweeklyPayoutNet,
    cashBiweeklyAccruedNet: cashSplit.biweeklyAccruedNet,
    cashTotalSaturday: cashSplit.totalSaturdayCash,
    nextBiweeklyPayoutDate: cashSplit.nextBiweeklyPayoutDate,
    hasBiweeklyEmployees: cashSplit.hasBiweeklyEmployees,
    isBiweeklyPayoutWeek: cashSplit.isAnyBiweeklyPayoutWeek,
  };

  const payrollExportArgs = () => {
    const calcRows = toPayrollCalcRows(rows, directory, weekFrom, weekTo, savedWeeks);
    const weeklyGrid = payrollWeeklyGrid(rows.map((r) => r.emp), weekFrom);
    const extraHourLines = payrollWeekExtraHourLines(rows.map((r) => r.emp));
    const extraCostLines = buildPayrollExtraCostLines(rows.map((r) => r.emp));
    const prevSatDetails = payrollPrevSatDetailLines(rows.filter((r) => !isBiweeklyPayrollEmployee(r.emp, directory)).map((r) => r.emp), weekFrom);
    const prevSatIso = previousSaturdayIso(weekFrom);
    const jobWorkLines = payrollJobWorkLines(jobs, weekFrom, weekTo);
    return { calcRows, weeklyGrid, extraHourLines, extraCostLines, prevSatDetails, prevSatIso, jobWorkLines };
  };

  const buildPayrollPdfBlob = useCallback(async () => {
    const { calcRows, weeklyGrid, extraHourLines, extraCostLines, prevSatDetails, prevSatIso, jobWorkLines } = payrollExportArgs();
    return generatePayrollPdfBlob(weekFrom, weekTo, calcRows, exportTotals, weeklyGrid, extraHourLines, prevSatDetails, prevSatIso, jobWorkLines, extraCostLines);
  }, [weekFrom, weekTo, rows, exportTotals, jobs]);

  const exportPDF = async () => {
    const blob = await buildPayrollPdfBlob();
    saveAs(blob, `lista-plac-${weekFrom}.pdf`);
  };

  const exportWord = async () => {
    const { calcRows, weeklyGrid, extraHourLines, extraCostLines, prevSatDetails, prevSatIso } = payrollExportArgs();
    const blob = await generatePayrollWordBlob(weekFrom, weekTo, calcRows, exportTotals, weeklyGrid, extraHourLines, prevSatDetails, prevSatIso, extraCostLines);
    saveAs(blob, `lista-plac-${weekFrom}.docx`);
  };

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Main list */}
      <div className={`flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300 ${selectedEmp?"sm:flex-[0_0_38%] lg:flex-[0_0_34%]":"w-full"}`}>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 w-full max-w-none`}>

            {/* Saturday reminder */}
            {isSaturday && !satDismissed && !isClosedWeek && (
              <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/25 rounded-xl px-4 py-3">
                <Bell size={15} className="text-yellow-400 shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-yellow-400">Dziś sobota — wypłaty (w tym co 2 tyg.)</p>
                  <p className="text-xs text-muted-foreground">Oznacz „Rozliczony” po wypłacie. Tydzień trafi do archiwum w <strong>niedzielę</strong> (gdy wszyscy rozliczeni) — po <strong>{PAYROLL_WEEK_ROLLOVER_HOUR}:00</strong> startuje nowy tydzień. Możesz też kliknąć „Zapisz tydzień”.</p>
                </div>
                <button onClick={()=>setSatDismissed(true)} className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"><X size={14}/></button>
              </div>
            )}

            {isSavedWeek && !isClosedWeek && (
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3">
                <Archive size={15} className="text-emerald-400 shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-300">Tydzień zapisany jako kopia zapasowa</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Wypłaty i przeniesienia (⏭) nadal możliwe do przejścia na kolejny tydzień płac. Lista płac i eksport pokazują aktualny stan.</p>
                </div>
              </div>
            )}

            {isClosedWeek && (
              <div className="flex items-center gap-3 bg-violet-500/10 border border-violet-500/25 rounded-xl px-4 py-3">
                <Archive size={15} className="text-violet-400 shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-violet-300">Tydzień historyczny — podgląd ze snapshotu</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {archivedForWeek?.weekEmployees?.length
                      ? "Lista płac i eksport PDF/DOCX korzystają wyłącznie z zapisanego archiwum. Przeniesienia wypłat i nowe urlopy nie zmieniają tego tygodnia."
                      : `Brak zapisanego archiwum dla tygodnia ${fmtDate(weekFrom)}–${fmtDate(weekTo)}. Zapisz tydzień przed rolloverem lub otwórz zakładkę Archiwum.`}
                  </p>
                </div>
              </div>
            )}

            {showRestoreBanner && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
                <AlertTriangle size={15} className="text-amber-400 shrink-0 hidden sm:block"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-400">W archiwum jest więcej zapisanych godzin niż na bieżącej liście</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Zapisany tydzień ma więcej dni roboczych lub łącznie więcej godzin (w tym Sob.pr.). Przywróć skład i godziny z archiwum, jeśli coś zniknęło po syncu lub edycji.</p>
                </div>
                <button type="button" onClick={onRestoreFromArchive} className="shrink-0 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors">
                  Przywróć z archiwum
                </button>
              </div>
            )}

            {backlogCheck.missing && onSaveBacklogWeek && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-sky-500/10 border border-sky-500/25 rounded-xl px-4 py-3">
                <AlertTriangle size={15} className="text-sky-400 shrink-0 hidden sm:block"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sky-300">Brakuje poprzedniego tygodnia w archiwum (wypłata co 2 tyg.)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Przed wypłatą {fmtDate(weekTo)} potrzebny jest tydzień {fmtDate(backlogCheck.prevRange.from)}–{fmtDate(backlogCheck.prevRange.to)} dla {backlogCheck.biweeklyCount} prac. — utwórz zaległą listę płac.</p>
                </div>
                <button type="button" onClick={() => setShowBacklogModal(true)} className="shrink-0 px-4 py-2 rounded-lg bg-sky-500/20 text-sky-200 text-sm font-medium hover:bg-sky-500/30 transition-colors">
                  Zaległa lista płac
                </button>
              </div>
            )}

            {cashSplit.hasBiweeklyEmployees && canViewRates && (
              <div className="bg-card border border-border rounded-xl px-5 py-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Wypłata w sobotę · {fmtDate(weekTo).slice(0, 5)}</p>
                {payrollCashContext && (
                  <p className="text-xs text-muted-foreground leading-snug">{payrollCashContext}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                  <div className="bg-secondary/50 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-muted-foreground mb-0.5">Tygodniówki ({cashSplit.weeklyCount} os.)</p>
                    <p className="font-bold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(cashSplit.weeklyNet)} PLN</p>
                  </div>
                  {cashSplit.isAnyBiweeklyPayoutWeek ? (
                    <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-sky-300 mb-0.5">Wypłata co 2 tyg. ({cashSplit.biweeklyCount} os.) — bież. i poprzedni tydzień</p>
                      <p className="font-bold text-sky-300" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(cashSplit.biweeklyPayoutNet)} PLN</p>
                    </div>
                  ) : (
                    <div className="bg-secondary/50 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-muted-foreground mb-0.5">Narastająco · co 2 tyg. ({cashSplit.biweeklyCount} os.) → {fmtDate(cashSplit.nextBiweeklyPayoutDate).slice(0, 5)}</p>
                      <p className="font-bold text-sky-400" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(cashSplit.biweeklyAccruedNet)} PLN</p>
                    </div>
                  )}
                  <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-primary/80 mb-0.5">Suma wypłaty w sobotę</p>
                    <p className="font-bold text-primary text-lg" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(cashSplit.totalSaturdayCash)} PLN</p>
                  </div>
                </div>
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
                {!isClosedWeek && (
                <>
                <button onClick={()=>setShowPicker(true)} className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/70 border border-border rounded-lg text-sm font-medium transition-colors">
                  <UserPlus size={14}/>Dodaj pracownika
                </button>
                {weekEmployees.length > 0 && onClearAllWeekEmployees && (
                  <button
                    type="button"
                    onClick={confirmClearAll}
                    className="flex items-center gap-2 px-4 py-2.5 bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-destructive rounded-lg text-sm font-medium transition-colors"
                    title="Usuń wszystkich pracowników z bieżącego tygodnia (nie zmienia archiwum)"
                  >
                    <UserMinus size={14}/>Usuń wszystkich
                  </button>
                )}
                {onReplaceWithAllActive && activeDirectoryCount > 0 && (
                  <button
                    type="button"
                    onClick={confirmReplaceAllActive}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary rounded-lg text-sm font-medium transition-colors"
                    title="Wyczyść skład tygodnia i dodaj wszystkich aktywnych z kartoteki Pracownicy"
                  >
                    <RefreshCw size={14}/>Odśwież skład ({activeDirectoryCount})
                  </button>
                )}
                {availableFromDir.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onAddFromDirectory(availableFromDir.map((d) => d.id))}
                    className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/70 border border-border rounded-lg text-sm font-medium transition-colors"
                    title="Dodaj wszystkich aktywnych z kartoteki Pracownicy, którzy nie są jeszcze w tym tygodniu"
                  >
                    <Users size={14}/>Wszyscy aktywni ({availableFromDir.length})
                  </button>
                )}
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
                </>
                )}
                <button
                  type="button"
                  onClick={() => setShowPdfPreview(true)}
                  disabled={displayEmployees.length === 0 || !canViewRates}
                  className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/70 border border-border rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  title={!canViewRates ? "Eksport z stawkami — tylko administrator" : displayEmployees.length === 0 ? "Brak danych do eksportu" : "Podgląd PDF w oknie aplikacji"}
                >
                  <Eye size={14}/>Podgląd PDF
                </button>
                {canViewRates && (
                <>
                <button onClick={exportPDF} disabled={displayEmployees.length === 0} className="flex items-center gap-2 px-4 py-2.5 bg-destructive/80 hover:bg-destructive text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"><FileDown size={14}/>PDF</button>
                <button onClick={exportWord} disabled={displayEmployees.length === 0} className="flex items-center gap-2 px-4 py-2.5 bg-primary/90 hover:bg-primary text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"><FileDown size={14}/>Word</button>
                {displayEmployees.length > 0 && (
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
              <div className="px-5 py-4 border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText size={13} className="text-muted-foreground shrink-0"/>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
                    Lista Płac — {fmtDate(weekFrom)} – {fmtDate(weekTo)}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center rounded-lg border border-border bg-secondary/60 p-0.5" role="tablist" aria-label="Widok listy płac">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={payrollListMode === "summary"}
                      onClick={() => switchPayrollListMode("summary")}
                      className={`px-3 py-2.5 min-h-[44px] rounded-md text-[11px] font-medium transition-colors touch-manipulation ${payrollListMode === "summary" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Sumy
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={payrollListMode === "detailed"}
                      onClick={() => switchPayrollListMode("detailed")}
                      className={`inline-flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-md text-[11px] font-medium transition-colors touch-manipulation ${payrollListMode === "detailed" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <LayoutGrid size={12}/>
                      Szczegóły dni
                    </button>
                    {!isClosedWeek && (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={payrollListMode === "assignments"}
                      onClick={() => switchPayrollListMode("assignments")}
                      className={`inline-flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-md text-[11px] font-medium transition-colors touch-manipulation ${payrollListMode === "assignments" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <HardHat size={12}/>
                      Przydziały robót
                    </button>
                    )}
                  </div>
                  {displayEmployees.length > 0 && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{displayEmployees.filter(e=>e.settled).length}/{displayEmployees.length} rozliczonych</span>
                  )}
                </div>
              </div>

              {displayEmployees.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Users size={36} className="mx-auto text-muted-foreground/20"/>
                  {isClosedWeek ? (
                    <>
                      <p className="text-sm text-muted-foreground">Brak zapisanego archiwum dla tygodnia {fmtDate(weekFrom)}–{fmtDate(weekTo)}.</p>
                      <p className="text-xs text-muted-foreground/80">Zapisz tydzień przed rolloverem lub otwórz zakładkę Archiwum, aby edytować historię.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">Brak pracowników w tym tygodniu.</p>
                      <button onClick={()=>setShowPicker(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                        <UserPlus size={14}/>Dodaj pracowników
                      </button>
                    </>
                  )}
                </div>
              ) : payrollListMode === "summary" ? (
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
                        {!isClosedWeek && (
                        <>
                        <th className="sticky right-9 z-20 px-2 py-3 text-center whitespace-nowrap w-[7.75rem] bg-card shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.45)]">Status</th>
                        <th className="sticky right-0 z-20 px-2 py-3 w-9 bg-card"/>
                        </>
                        )}
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
                                  <p className="font-medium leading-tight truncate flex items-center gap-1.5">
                                    {r.emp.name||<span className="italic text-muted-foreground">Bez nazwy</span>}
                                    {payrollListMode === "assignments" && (
                                      <PayrollAssignmentBadge status={assignmentBadgeFor(r.emp)} />
                                    )}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">{r.emp.position||"—"}{canViewRates && <> · {fmt(r.rateNum)} PLN/h</>}
                                    {biweeklyRowMap.has(r.emp.id) && <span className="ml-1 text-[10px] bg-sky-500/15 text-sky-400 px-1 py-0.5 rounded-full">co 2 tyg.</span>}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-3.5 text-right whitespace-nowrap" style={{fontFamily:"'JetBrains Mono', monospace"}}>{r.weekHours>0?fmtH(r.weekHours):<span className="text-muted-foreground/40">—</span>}</td>
                            <td className="px-2 py-3.5 text-right whitespace-nowrap" style={{fontFamily:"'JetBrains Mono', monospace"}}>{r.prevSatHours>0&&!biweeklyRowMap.has(r.emp.id)?<span className="text-amber-500">{fmtH(r.prevSatHours)}</span>:<span className="text-muted-foreground/40">—</span>}</td>
                            <td className="px-2 py-3.5 text-right font-medium whitespace-nowrap" style={{fontFamily:"'JetBrains Mono', monospace"}}>{(biweeklyRowMap.has(r.emp.id) ? r.weekHours : r.totalHours)>0?fmtH(biweeklyRowMap.has(r.emp.id) ? r.weekHours : r.totalHours):<span className="text-muted-foreground/40">—</span>}</td>
                            <td className="px-2 py-3.5 text-right text-muted-foreground whitespace-nowrap" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(biweeklyRowMap.has(r.emp.id)?r.weekGross:r.grossPay)}</td>
                            <td className="px-2 py-3.5 text-right whitespace-nowrap" style={{fontFamily:"'JetBrains Mono', monospace"}}>{(biweeklyRowMap.has(r.emp.id)?r.weekZaliczka:r.totalZaliczka)>0?<span className="text-destructive">−{fmt(biweeklyRowMap.has(r.emp.id)?r.weekZaliczka:r.totalZaliczka)}</span>:<span className="text-muted-foreground/40">—</span>}</td>
                            <td className="px-2 py-3.5 text-right whitespace-nowrap" style={{fontFamily:"'JetBrains Mono', monospace"}}>{r.totalExtraCosts>0?<span className="text-green-500">+{fmt(r.totalExtraCosts)}</span>:<span className="text-muted-foreground/40">—</span>}</td>
                            <td className="px-2 py-3.5 text-right font-bold text-primary whitespace-nowrap" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                              {(() => {
                                if (r.leaveStatus) {
                                  return <span className="text-violet-400">{leaveTypeDisplayLabel(r.leaveStatus)}</span>;
                                }
                                if (r.carryForwardOut != null && r.carryForwardOut > 0) {
                                  return <span className="text-amber-400" title={`Przeniesiono ${fmt(r.carryForwardOut)} PLN na następny tydzień`}>{CARRY_FORWARD_LABEL}</span>;
                                }
                                if (r.carryForwardIn != null && r.carryForwardIn > 0) {
                                  return (
                                    <span title={`Bieżąca ${fmt(r.displayNetPay - r.carryForwardIn)} + przeniesiona ${fmt(r.carryForwardIn)}`}>
                                      {fmt(r.displayNetPay)} <span className="text-[10px] font-normal text-amber-400/80">(+{fmt(r.carryForwardIn)})</span>
                                    </span>
                                  );
                                }
                                const bw = biweeklyRowMap.get(r.emp.id);
                                if (bw && !bw.isPayoutWeek) {
                                  return <span title={`Narasta na ${fmtDate(bw.nextPayoutDate)}`}><span className="text-sky-400">{fmt(bw.thisWeekNet)}</span> <span className="text-[10px] font-normal text-sky-400/70">→ {fmtDate(bw.nextPayoutDate).slice(0,5)}</span></span>;
                                }
                                if (bw && bw.isPayoutWeek) {
                                  return <span title={`2 tyg.: ${fmt(bw.prevWeekNet)} + ${fmt(bw.thisWeekNet)}`}>{fmt(bw.displayNet)} <span className="text-[10px] font-normal text-primary/70">zł</span></span>;
                                }
                                return <>{fmt(r.netPay)} <span className="text-[10px] font-normal text-primary/70">zł</span></>;
                              })()}
                            </td>
                            {!isClosedWeek && (
                            <>
                            <td className={`sticky right-9 z-10 px-2 py-3.5 whitespace-nowrap shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.45)] ${r.emp.id===selectedEmpId?"bg-primary/5":"bg-card group-hover:bg-secondary/30"}`} onClick={(e)=>e.stopPropagation()}>
                              <button onClick={()=>onToggleSettled(r.emp.id)} title={r.emp.settled?"Rozliczony — kliknij aby cofnąć":"Oczekuje — kliknij po wypłacie"} className={`inline-flex items-center gap-1 px-3 py-2 min-h-[44px] rounded-full text-[11px] font-medium whitespace-nowrap transition-all touch-manipulation ${r.emp.settled?"bg-green-500/15 text-green-400 hover:bg-green-500/25":"bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"}`}>
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
                            </>
                            )}
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
                          <td colSpan={2} className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Razem (tydzień)</td>
                          <td className="px-3 py-3 text-right font-bold" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(totalWeekHours)}</td>
                          <td className="px-3 py-3 text-right font-bold text-amber-500" style={{fontFamily:"'JetBrains Mono', monospace"}}>{totalPrevSatHours>0?fmtH(totalPrevSatHours):"—"}</td>
                          <td className="px-3 py-3 text-right font-bold" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(totalHoursAll)}</td>
                          <td className="px-3 py-3 text-right font-bold text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(totalGross)}</td>
                          <td className="px-3 py-3 text-right font-bold text-destructive" style={{fontFamily:"'JetBrains Mono', monospace"}}>{totalZaliczkaSum>0?`−${fmt(totalZaliczkaSum)}`:"—"}</td>
                          <td className="px-3 py-3 text-right font-bold text-green-500" style={{fontFamily:"'JetBrains Mono', monospace"}}>{totalExtraCostsSum>0?`+${fmt(totalExtraCostsSum)}`:"—"}</td>
                          <td className="px-3 py-3 text-right font-bold text-primary text-base whitespace-nowrap" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(totalNet)} <span className="text-[10px] font-normal text-primary/70">zł</span></td>
                          {!isClosedWeek && (
                          <>
                          <td className="sticky right-9 z-10 bg-secondary/30 shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.45)]"/>
                          <td className="sticky right-0 z-10 bg-secondary/30"/>
                          </>
                          )}
                        </tr>
                        {cashSplit.hasBiweeklyEmployees && canViewRates && (
                        <tr className="border-t border-primary/20 bg-primary/5">
                          <td colSpan={8} className="px-4 py-3 text-xs font-bold text-primary uppercase tracking-wider">Wypłata w sobotę · {fmtDate(weekTo).slice(0, 5)}</td>
                          <td className="px-3 py-3 text-right font-bold text-primary text-base whitespace-nowrap" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(cashSplit.totalSaturdayCash)} <span className="text-[10px] font-normal text-primary/70">zł</span></td>
                          {!isClosedWeek && <td colSpan={2} className="sticky right-0 z-10 bg-primary/5"/>}
                        </tr>
                        )}
                      </tfoot>
                    </table>
                  </div>
                  {/* Mobile */}
                  <div className="sm:hidden divide-y divide-border">
                    {rows.map((r)=>(
                      <div key={r.emp.id} className={`p-4 space-y-3 ${r.emp.settled?"opacity-60":""}`} onClick={()=>setSelectedEmpId(r.emp.id===selectedEmpId?null:r.emp.id)}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">{r.emp.name?r.emp.name[0].toUpperCase():"?"}</div>
                            <div className="min-w-0"><p className="text-sm font-medium truncate">{r.emp.name||"—"}</p><p className="text-xs text-muted-foreground truncate">{r.emp.position||"—"}</p></div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {!isClosedWeek && (
                            <>
                            <button onClick={() => onToggleSettled(r.emp.id)} className={`inline-flex items-center gap-1 px-3 py-2 min-h-[44px] rounded-full text-xs font-medium whitespace-nowrap touch-manipulation ${r.emp.settled?"bg-green-500/15 text-green-400":"bg-yellow-500/10 text-yellow-400"}`}>
                              {r.emp.settled?<><CheckCircle2 size={11}/>Rozlicz.</>:<><Circle size={11}/>Oczek.</>}
                            </button>
                            {deleteConfirm === r.emp.id ? (
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => { onRemoveWeekEmployee(r.emp.id); setDeleteConfirm(null); }} className="text-xs bg-destructive text-white px-2 py-1 rounded">Usuń</button>
                                <button type="button" onClick={() => setDeleteConfirm(null)} className="text-xs text-muted-foreground px-1"><X size={11}/></button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => setDeleteConfirm(r.emp.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded" aria-label="Usuń z tygodnia"><Trash2 size={14}/></button>
                            )}
                            </>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                          <div className="bg-secondary rounded-lg px-2 py-2"><p className="text-xs text-muted-foreground">Tydzień</p><p className="text-sm font-semibold" style={{fontFamily:"'JetBrains Mono', monospace"}}>{r.weekHours>0?fmtH(r.weekHours):"—"}</p></div>
                          <div className="bg-secondary rounded-lg px-2 py-2"><p className="text-xs text-muted-foreground">Sob.pr.</p><p className="text-sm font-semibold text-amber-500" style={{fontFamily:"'JetBrains Mono', monospace"}}>{r.prevSatHours>0&&!biweeklyRowMap.has(r.emp.id)?fmtH(r.prevSatHours):"—"}</p></div>
                          <div className="bg-secondary rounded-lg px-2 py-2"><p className="text-xs text-muted-foreground">Zaliczki</p><p className="text-sm font-semibold text-destructive" style={{fontFamily:"'JetBrains Mono', monospace"}}>{r.totalZaliczka>0?`−${fmt(r.totalZaliczka)}`:"—"}</p></div>
                          <div className="bg-secondary rounded-lg px-2 py-2"><p className="text-xs text-muted-foreground">Koszty</p><p className="text-sm font-semibold text-green-500" style={{fontFamily:"'JetBrains Mono', monospace"}}>{r.totalExtraCosts>0?`+${fmt(r.totalExtraCosts)}`:"—"}</p></div>
                          <div className="bg-primary/10 rounded-lg px-2 py-2 col-span-2 sm:col-span-1"><p className="text-xs text-primary/70">Do wypłaty</p><p className="text-sm font-bold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>{(() => {
                                if (r.leaveStatus) return leaveTypeDisplayLabel(r.leaveStatus);
                                if (r.carryForwardOut != null && r.carryForwardOut > 0) return CARRY_FORWARD_LABEL;
                                if (r.carryForwardIn != null && r.carryForwardIn > 0) return `${fmt(r.displayNetPay)} (+${fmt(r.carryForwardIn)})`;
                                const bw = biweeklyRowMap.get(r.emp.id);
                                if (bw && !bw.isPayoutWeek) return fmt(bw.thisWeekNet);
                                if (bw && bw.isPayoutWeek) return fmt(bw.displayNet);
                                return fmt(r.netPay);
                              })()}</p></div>
                        </div>
                      </div>
                    ))}
                    <div className="p-4 bg-secondary/30 flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Łącznie</span>
                      <span className="text-lg font-bold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(totalNet)} PLN</span>
                    </div>
                  </div>
                </>
              ) : payrollListMode === "detailed" ? (
                <>
                  <p className="px-5 py-2 text-[11px] text-muted-foreground border-b border-border/60 hidden sm:block">
                    Godziny pracy wg dni{isClosedWeek ? " — podgląd historyczny (tylko odczyt)" : " — zmiany podstawowe, dodatkowe i zaliczki. Kliknij wiersz, aby edytować."}
                  </p>
                  <div className="hidden sm:block overflow-x-auto overscroll-x-contain">
                    <table className="w-full min-w-[1180px] text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                          <th className="px-3 py-3 text-left w-8">Lp.</th>
                          <th className="px-3 py-3 text-left min-w-[120px]">Pracownik</th>
                          {payrollDayColumns.map((col) => (
                            <th key={col.key} className="px-2 py-3 text-left min-w-[5.5rem]" title={`${DAY_LABELS[col.key]} ${col.dateLabel}`}>
                              <span className="block">{col.shortLabel}</span>
                              <span className="block text-[10px] font-normal opacity-70">{col.dateLabel}</span>
                            </th>
                          ))}
                          {showPrevSatDetailCol && (
                            <th className="px-2 py-3 text-left min-w-[5.5rem] text-amber-600 dark:text-amber-400" title={`${PREV_SAT_SHORT} · ${fmtDate(prevSatDetailIso)}`}>
                              <span className="block">Sob.pr.</span>
                              <span className="block text-[10px] font-normal opacity-70">{fmtDate(prevSatDetailIso).slice(0, 5)}</span>
                            </th>
                          )}
                          <th className="px-2 py-3 text-right w-14">Σ h</th>
                          {!isClosedWeek && (
                          <>
                          <th className="sticky right-9 z-20 px-2 py-3 text-center whitespace-nowrap w-[7.75rem] bg-card shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.45)]">Status</th>
                          <th className="sticky right-0 z-20 px-2 py-3 w-9 bg-card"/>
                          </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rows.map((r, i) => (
                          <tr
                            key={r.emp.id}
                            onClick={() => setSelectedEmpId(r.emp.id === selectedEmpId ? null : r.emp.id)}
                            className={`group cursor-pointer transition-colors hover:bg-secondary/30 ${r.emp.settled ? "opacity-60" : ""} ${r.emp.id === selectedEmpId ? "bg-primary/5 border-l-2 border-primary" : ""}`}
                          >
                            <td className="px-3 py-3 text-muted-foreground text-xs" style={{fontFamily:"'JetBrains Mono', monospace"}}>{i + 1}</td>
                            <td className="px-3 py-3 min-w-[120px]">
                              <p className="font-medium leading-tight truncate">{r.emp.name || <span className="italic text-muted-foreground">Bez nazwy</span>}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {r.emp.position || "—"}
                                {biweeklyRowMap.has(r.emp.id) && <span className="ml-1 text-sky-400">· co 2 tyg.</span>}
                              </p>
                            </td>
                            {payrollDayColumns.map((col) => (
                              <td key={col.key} className="px-2 py-3 align-top">
                                <PayrollDayCellDisplay day={r.emp.days[col.key]}/>
                              </td>
                            ))}
                            {showPrevSatDetailCol && (
                              <td className="px-2 py-3 align-top">
                                {!biweeklyRowMap.has(r.emp.id)
                                  ? <PayrollDayCellDisplay day={getPrevSaturday(r.emp)} accent="amber"/>
                                  : <span className="text-muted-foreground/40">—</span>}
                              </td>
                            )}
                            <td className="px-2 py-3 text-right font-semibold align-top whitespace-nowrap" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                              {r.weekHours > 0 ? fmtH(r.weekHours) : <span className="text-muted-foreground/40">—</span>}
                            </td>
                            {!isClosedWeek && (
                            <>
                            <td className={`sticky right-9 z-10 px-2 py-3 whitespace-nowrap shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.45)] align-top ${r.emp.id === selectedEmpId ? "bg-primary/5" : "bg-card group-hover:bg-secondary/30"}`} onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => onToggleSettled(r.emp.id)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${r.emp.settled ? "bg-green-500/15 text-green-400 hover:bg-green-500/25" : "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"}`}>
                                {r.emp.settled ? <><CheckCircle2 size={11} className="shrink-0"/>Rozliczony</> : <><Circle size={11} className="shrink-0"/>Oczekuje</>}
                              </button>
                            </td>
                            <td className={`sticky right-0 z-10 px-2 py-3 align-top ${r.emp.id === selectedEmpId ? "bg-primary/5" : "bg-card group-hover:bg-secondary/30"}`} onClick={(e) => e.stopPropagation()}>
                              {deleteConfirm === r.emp.id ? (
                                <div className="flex items-center gap-1">
                                  <button onClick={() => { onRemoveWeekEmployee(r.emp.id); setDeleteConfirm(null); }} className="text-xs bg-destructive text-white px-2 py-0.5 rounded">Usuń</button>
                                  <button onClick={() => setDeleteConfirm(null)} className="text-xs text-muted-foreground hover:text-foreground px-1"><X size={11}/></button>
                                </div>
                              ) : (
                                <button onClick={() => setDeleteConfirm(r.emp.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded"><Trash2 size={13}/></button>
                              )}
                            </td>
                            </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border bg-secondary/30">
                          <td colSpan={2} className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Razem godziny</td>
                          {dayColumnTotals.map((h, idx) => (
                            <td key={payrollDayColumns[idx].key} className="px-2 py-3 text-[11px] font-semibold" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                              {h > 0 ? fmtH(h) : <span className="text-muted-foreground/40">—</span>}
                            </td>
                          ))}
                          {showPrevSatDetailCol && (
                            <td className="px-2 py-3 text-[11px] font-semibold text-amber-600 dark:text-amber-400" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                              {totalPrevSatHours > 0 ? fmtH(totalPrevSatHours) : "—"}
                            </td>
                          )}
                          <td className="px-2 py-3 text-right font-bold" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(totalWeekHours)}</td>
                          <td colSpan={2} className="sticky right-0 z-10 bg-secondary/30"/>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="sm:hidden divide-y divide-border">
                    {rows.map((r) => (
                      <div key={r.emp.id} className={`p-4 space-y-3 ${r.emp.settled ? "opacity-60" : ""}`} onClick={() => setSelectedEmpId(r.emp.id === selectedEmpId ? null : r.emp.id)}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{r.emp.name || "—"}</p>
                            <p className="text-xs text-muted-foreground truncate">{r.emp.position || "—"}{biweeklyRowMap.has(r.emp.id) ? " · co 2 tyg." : ""}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-semibold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>{r.weekHours > 0 ? fmtH(r.weekHours) : "—"}</span>
                            {!isClosedWeek && (
                            <button onClick={(e) => { e.stopPropagation(); onToggleSettled(r.emp.id); }} className={`inline-flex items-center justify-center gap-1 px-3 py-2 min-h-[44px] min-w-[44px] rounded-full text-xs font-medium touch-manipulation ${r.emp.settled ? "bg-green-500/15 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                              {r.emp.settled ? "✓" : "○"}
                            </button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {payrollDayColumns.map((col) => (
                            <div key={col.key} className="bg-secondary/50 rounded-lg px-2.5 py-2">
                              <p className="text-[10px] text-muted-foreground mb-1">{col.shortLabel} · {col.dateLabel}</p>
                              <PayrollDayCellDisplay day={r.emp.days[col.key]}/>
                            </div>
                          ))}
                        </div>
                        {showPrevSatDetailCol && !biweeklyRowMap.has(r.emp.id) && formatPayrollDayCell(getPrevSaturday(r.emp)) !== "—" && (
                          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-1">{PREV_SAT_SHORT} · {fmtDate(prevSatDetailIso)}</p>
                            <PayrollDayCellDisplay day={getPrevSaturday(r.emp)} accent="amber"/>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="px-5 py-2 text-[11px] text-muted-foreground border-b border-border/60">
                    Przypisz pracowników do robót — godziny z listy płac (Szczegóły dni). Kliknij wiersz, aby edytować przydziały.
                  </p>
                  <div className="divide-y divide-border">
                    {rows.map((r, i) => (
                      <div
                        key={r.emp.id}
                        onClick={() => setSelectedEmpId(r.emp.id === selectedEmpId ? null : r.emp.id)}
                        className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-secondary/30 ${r.emp.settled ? "opacity-60" : ""} ${r.emp.id === selectedEmpId ? "bg-primary/5 border-l-2 border-primary" : ""}`}
                      >
                        <span className="text-xs text-muted-foreground w-6 shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{i + 1}</span>
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                          {r.emp.name ? r.emp.name[0].toUpperCase() : "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate flex items-center gap-1.5">
                            {r.emp.name || "—"}
                            <PayrollAssignmentBadge status={assignmentBadgeFor(r.emp)} />
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{r.emp.position || "—"}</p>
                        </div>
                        <span className="text-xs font-semibold shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {r.weekHours > 0 ? fmtH(r.weekHours) : "—"}
                        </span>
                        <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selectedEmp && (
        <div className="w-full sm:flex-1 sm:min-w-[400px] lg:min-w-[480px] border-l border-border bg-card shrink-0 flex flex-col min-h-0 h-full overflow-hidden absolute sm:relative inset-0 sm:inset-auto z-50 sm:z-auto">
          {payrollListMode === "assignments" && !isClosedWeek ? (
            <PayrollJobAssignmentsPanel
              emp={selectedEmp}
              jobs={jobs}
              weekFrom={weekFrom}
              weekTo={weekTo}
              directory={directory}
              onSetJobs={onSetJobs}
              onClose={() => setSelectedEmpId(null)}
            />
          ) : (
            <WeekEmployeeDetail
              emp={selectedEmp}
              weekFrom={weekFrom}
              weekTo={weekTo}
              directory={directory}
              savedWeeks={savedWeeks}
              isClosedWeek={isClosedWeek}
              readOnly={isClosedWeek}
              payrollRow={selectedPayrollRow}
              onDeferPayroll={handleDeferPayroll}
              onPatchDay={isClosedWeek ? () => {} : (key, next) => onUpdateWeekEmployeeDay(selectedEmp.id, key, next)}
              onPatchRate={isClosedWeek ? () => {} : (rate) => onUpdateWeekEmployeeRate(selectedEmp.id, rate)}
              onPatchPrevSaturday={isClosedWeek ? () => {} : (next) => onUpdateWeekEmployeePrevSaturday(selectedEmp.id, next)}
              onPatchExtraCosts={isClosedWeek ? () => {} : (next) => onUpdateWeekEmployeeExtraCosts(selectedEmp.id, next)}
              onClose={()=>setSelectedEmpId(null)}
            />
          )}
        </div>
      )}

      {/* Picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4" style={{background:"rgba(0,0,0,0.7)"}} onClick={()=>{setShowPicker(false);setPickerSearch("");setPickerSelected(new Set());}}>
          <div className="bg-card rounded-t-2xl md:rounded-2xl border border-border w-full max-w-md shadow-2xl flex flex-col max-h-[92dvh] modal-sheet" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div><p className="text-sm font-semibold">Dodaj pracowników do tygodnia</p><p className="text-xs text-muted-foreground">{fmtDate(weekFrom)} – {fmtDate(weekTo)}</p></div>
              <button type="button" onClick={()=>{setShowPicker(false);setPickerSearch("");setPickerSelected(new Set());}} className="touch-target p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X size={16}/></button>
            </div>
            <div className="px-4 py-3 border-b border-border space-y-2 shrink-0">
              <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input type="text" placeholder="Szukaj..." value={pickerSearch} onChange={(e)=>setPickerSearch(e.target.value)} className="w-full bg-secondary rounded-lg pl-8 pr-3 py-2.5 text-base border border-transparent focus:border-primary focus:outline-none"/></div>
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
            <div className="px-4 py-3 border-t border-border shrink-0">
              <button
                onClick={()=>{if(pickerSelected.size>0){onAddFromDirectory([...pickerSelected]);}setShowPicker(false);setPickerSearch("");setPickerSelected(new Set());}}
                disabled={pickerSelected.size===0}
                className="w-full min-h-[48px] py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
          directory={directory}
          savedWeeks={savedWeeks}
          onClose={() => setShowEmailModal(false)}
          onManageContacts={() => { setShowEmailModal(false); onManageContacts(); }}
        />
      )}

      {showBacklogModal && onSaveBacklogWeek && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4" style={{background:"rgba(0,0,0,0.7)"}} onClick={() => setShowBacklogModal(false)}>
          <div className="bg-card rounded-t-2xl md:rounded-2xl border border-border w-full max-w-lg shadow-2xl flex flex-col max-h-[92dvh] modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <p className="text-sm font-semibold">Zaległa lista płac (co 2 tyg.)</p>
                <p className="text-xs text-muted-foreground">{fmtDate(backlogCheck.prevRange.from)} – {fmtDate(backlogCheck.prevRange.to)}</p>
              </div>
              <button type="button" onClick={() => setShowBacklogModal(false)} className="touch-target p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X size={16}/></button>
            </div>
            <div className="px-5 py-4 space-y-4 overflow-y-auto">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Utworzy wpis w archiwum tylko dla pracowników z wypłatą co 2 tygodnie — z godzinami skopiowanymi z bieżącego tygodnia (możesz potem edytować w Archiwum).
              </p>
              <ul className="text-sm space-y-1">
                {weekEmployees.filter((e) => isBiweeklyPayrollEmployee(e, directory)).map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 size={14} className="text-sky-400 shrink-0"/>{e.name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-5 py-4 border-t border-border shrink-0 flex gap-2">
              <button type="button" onClick={() => setShowBacklogModal(false)} className="flex-1 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">Anuluj</button>
              <button
                type="button"
                onClick={() => {
                  const biweeklyEmps = weekEmployees
                    .filter((e) => isBiweeklyPayrollEmployee(e, directory))
                    .map((e) => JSON.parse(JSON.stringify({ ...e, id: crypto.randomUUID(), prevSaturday: defaultDay(), settled: false })) as WeekEmployee);
                  onSaveBacklogWeek(backlogCheck.prevRange.from, backlogCheck.prevRange.to, biweeklyEmps);
                  setShowBacklogModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-sky-500/20 text-sky-200 text-sm font-medium hover:bg-sky-500/30 transition-colors"
              >
                Utwórz w archiwum
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

