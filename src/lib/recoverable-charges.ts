/** Pozycje do rozliczenia / odzyskania — KV `kw-recoverable-charges`. Sprint 20.3A + 20.4A settlement foundation. */

import type { Job } from "@/app/app-domain";

/** ISO YYYY-MM-DD → DD.MM.YYYY — lokalnie, bez importu z app-domain (unika cyklu z cloud-sync). */
function fmtIsoDatePl(iso: string): string {
  if (!iso) return "";
  const [y, mo, d] = iso.split("-");
  return `${d}.${mo}.${y}`;
}

export type RecoverableChargeStatus = "open" | "partial" | "settled";
export type RecoverableChargeSourceType = "job" | "standalone";
export type RecoverableSettlementRecordedVia = "admin" | "on_behalf_of_inspector";

/** Pojedyncze rozliczenie / odzysk kwoty — append-only w ramach pozycji (Sprint 20.4A). */
export interface RecoverableChargeSettlement {
  id: string;
  amount: number;
  settledAt: string;
  settledBy: string;
  targetJobId?: string;
  targetJobLabel?: string;
  note?: string;
  onBehalfOf?: string;
  recordedVia?: RecoverableSettlementRecordedVia;
}

export interface RecoverableCharge {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  description: string;
  amount: number;
  status: RecoverableChargeStatus;
  sourceType: RecoverableChargeSourceType;
  sourceJobId: string;
  clientName: string;
  createdBy: string;
  responsibleInspector: string;
  tags: string[];
  /** Ledger rozliczeń — Sprint 20.4A. */
  settlements?: RecoverableChargeSettlement[];
  /** Suma settlements (cache, wyliczane przy zapisie / normalize / merge). */
  amountSettled?: number;
  /** amount − amountSettled, min. 0 (cache). */
  amountRemaining?: number;
}

export const RECOVERABLE_CHARGE_STATUSES: RecoverableChargeStatus[] = ["open", "partial", "settled"];

export const RECOVERABLE_CHARGE_STATUS_LABELS: Record<RecoverableChargeStatus, string> = {
  open: "Do rozliczenia",
  partial: "Rozliczone częściowo",
  settled: "Rozliczone",
};

export const RECOVERABLE_CHARGE_STATUS_EMOJI: Record<RecoverableChargeStatus, string> = {
  open: "🔴",
  partial: "🟡",
  settled: "🟢",
};

const LEGACY_MIGRATION_NOTE =
  "Status ustawiony ręcznie przed wprowadzeniem workflow rozliczeń (migracja 20.4A)";

export function recoverableChargeStatusLabel(status: RecoverableChargeStatus, withEmoji = true): string {
  const base = RECOVERABLE_CHARGE_STATUS_LABELS[status];
  return withEmoji ? `${RECOVERABLE_CHARGE_STATUS_EMOJI[status]} ${base}` : base;
}

export const RECOVERABLE_CHARGE_SOURCE_LABELS: Record<RecoverableChargeSourceType, string> = {
  job: "Robota",
  standalone: "Poza systemem",
};

export type RecoverableChargeSortKey = "date" | "amount" | "status" | "client";

export type RecoverableChargeFilters = {
  search: string;
  status: RecoverableChargeStatus | "all";
  sourceType: RecoverableChargeSourceType | "all";
  sort: RecoverableChargeSortKey;
  sortDir: "asc" | "desc";
};

export const DEFAULT_RECOVERABLE_CHARGE_FILTERS: RecoverableChargeFilters = {
  search: "",
  status: "all",
  sourceType: "all",
  sort: "date",
  sortDir: "desc",
};

function parseAmount(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return +raw.toFixed(2);
  if (typeof raw === "string") {
    const n = parseFloat(raw.replace(",", ".").replace(/\s/g, ""));
    return Number.isFinite(n) ? +n.toFixed(2) : 0;
  }
  return 0;
}

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return [...new Set(raw.map((t) => String(t).trim()).filter(Boolean))].slice(0, 20);
  }
  if (typeof raw === "string") {
    return raw
      .split(/[,;]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  return [];
}

function parseStatus(raw: unknown): RecoverableChargeStatus {
  if (raw === "partial" || raw === "settled") return raw;
  return "open";
}

function parseSourceType(raw: unknown): RecoverableChargeSourceType {
  return raw === "standalone" ? "standalone" : "job";
}

function parseRecordedVia(raw: unknown): RecoverableSettlementRecordedVia | undefined {
  if (raw === "on_behalf_of_inspector") return "on_behalf_of_inspector";
  if (raw === "admin") return "admin";
  return undefined;
}

function parseSettlements(raw: unknown): RecoverableChargeSettlement[] {
  if (!Array.isArray(raw)) return [];
  const out: RecoverableChargeSettlement[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Partial<RecoverableChargeSettlement>;
    if (!r.id) continue;
    const amount = parseAmount(r.amount);
    if (amount <= 0) continue;
    const settlement: RecoverableChargeSettlement = {
      id: String(r.id),
      amount,
      settledAt: String(r.settledAt ?? new Date().toISOString()),
      settledBy: String(r.settledBy ?? "").trim(),
    };
    const targetJobId = String(r.targetJobId ?? "").trim();
    if (targetJobId) settlement.targetJobId = targetJobId;
    const targetJobLabel = String(r.targetJobLabel ?? "").trim();
    if (targetJobLabel) settlement.targetJobLabel = targetJobLabel;
    const note = String(r.note ?? "").trim();
    if (note) settlement.note = note;
    const onBehalfOf = String(r.onBehalfOf ?? "").trim();
    if (onBehalfOf) settlement.onBehalfOf = onBehalfOf;
    const recordedVia = parseRecordedVia(r.recordedVia);
    if (recordedVia) settlement.recordedVia = recordedVia;
    out.push(settlement);
  }
  return out;
}

/** Suma kwot rozliczeń (2 miejsca po przecinku). */
export function sumSettlements(settlements: RecoverableChargeSettlement[]): number {
  return +settlements.reduce((s, x) => s + x.amount, 0).toFixed(2);
}

/**
 * Wylicza cache kwot i status z ledgeru settlements.
 * Status: open (brak rozliczeń) → partial (część) → settled (pozostało 0).
 */
export function deriveChargeAmounts(
  charge: Pick<RecoverableCharge, "amount" | "settlements">,
): Pick<RecoverableCharge, "amountSettled" | "amountRemaining" | "status"> {
  const settlements = charge.settlements ?? [];
  const amount = parseAmount(charge.amount);
  const amountSettled = sumSettlements(settlements);
  const amountRemaining = Math.max(0, +(amount - amountSettled).toFixed(2));

  let status: RecoverableChargeStatus;
  if (amountRemaining === 0 && amount > 0) {
    status = "settled";
  } else if (amountSettled > 0 && amountRemaining > 0) {
    status = "partial";
  } else {
    status = "open";
  }

  return { amountSettled, amountRemaining, status };
}

export type SettlementValidationError = "invalid_amount" | "exceeds_remaining";

/** Walidacja kwoty pojedynczego rozliczenia względem pozostałej należności. */
export function validateSettlementDraft(
  charge: Pick<RecoverableCharge, "amount" | "settlements" | "amountRemaining">,
  settlementAmount: number,
): { ok: true } | { ok: false; error: SettlementValidationError; message: string } {
  const amount = parseAmount(settlementAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "invalid_amount", message: "Kwota rozliczenia musi być większa od 0 PLN." };
  }

  const amountRemaining = deriveChargeAmounts({
    amount: charge.amount,
    settlements: charge.settlements ?? [],
  }).amountRemaining;

  if (amount > amountRemaining) {
    return {
      ok: false,
      error: "exceeds_remaining",
      message: `Kwota rozliczenia (${amount} PLN) przekracza pozostałą należność (${amountRemaining} PLN).`,
    };
  }

  return { ok: true };
}

/** Dodaje wpis rozliczenia i przelicza cache + status. */
export function applySettlement(
  charge: RecoverableCharge,
  settlement: Omit<RecoverableChargeSettlement, "id"> & { id?: string },
): RecoverableCharge {
  const current = { ...charge, ...deriveChargeAmounts(charge) };
  const validation = validateSettlementDraft(current, settlement.amount);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const entry: RecoverableChargeSettlement = {
    id: settlement.id ?? crypto.randomUUID(),
    amount: parseAmount(settlement.amount),
    settledAt: settlement.settledAt ?? new Date().toISOString(),
    settledBy: String(settlement.settledBy ?? "").trim(),
  };
  if (settlement.targetJobId?.trim()) entry.targetJobId = settlement.targetJobId.trim();
  if (settlement.targetJobLabel?.trim()) entry.targetJobLabel = settlement.targetJobLabel.trim();
  if (settlement.note?.trim()) entry.note = settlement.note.trim();
  if (settlement.onBehalfOf?.trim()) entry.onBehalfOf = settlement.onBehalfOf.trim();
  if (settlement.recordedVia) entry.recordedVia = settlement.recordedVia;

  const settlements = [...(current.settlements ?? []), entry];
  const derived = deriveChargeAmounts({ amount: current.amount, settlements });

  return {
    ...current,
    settlements,
    ...derived,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Migracja rekordów sprzed 20.4A:
 * - brak settlements → pusta tablica, derive z kwoty pierwotnej
 * - legacy settled bez settlements → syntetyczny wpis (zachowuje zamknięcie)
 * - legacy partial bez settlements → reset do open (brak wiarygodnej kwoty rozliczonej)
 */
function applyLegacySettlementMigration(charge: RecoverableCharge): RecoverableCharge {
  const settlements = charge.settlements ?? [];
  if (settlements.length > 0) {
    return { ...charge, settlements };
  }

  const storedStatus = charge.status;

  // Legacy partial: ręczny status bez ledgeru — nie wiadomo ile rozliczono; traktuj jak open.
  if (storedStatus === "partial") {
    return { ...charge, settlements: [] };
  }

  // Legacy settled: zachowaj zamknięcie przez syntetyczny wpis migracyjny.
  if (storedStatus === "settled" && charge.amount > 0) {
    const synthetic: RecoverableChargeSettlement = {
      id: `legacy-migration-${charge.id}`,
      amount: charge.amount,
      settledAt: charge.updatedAt || charge.createdAt,
      settledBy: charge.createdBy || "Migracja 20.4A",
      note: LEGACY_MIGRATION_NOTE,
      recordedVia: "admin",
    };
    return { ...charge, settlements: [synthetic] };
  }

  return { ...charge, settlements: [] };
}

function finalizeRecoverableCharge(charge: RecoverableCharge): RecoverableCharge {
  const migrated = applyLegacySettlementMigration(charge);
  const derived = deriveChargeAmounts(migrated);
  return {
    ...migrated,
    settlements: migrated.settlements ?? [],
    ...derived,
  };
}

/** Union settlements po id — chroni przed utratą wpisów przy sync wielourządzeniowym. */
export function mergeSettlementsById(
  a: RecoverableChargeSettlement[],
  b: RecoverableChargeSettlement[],
): RecoverableChargeSettlement[] {
  const byId = new Map<string, RecoverableChargeSettlement>();
  for (const s of [...a, ...b]) {
    if (!s?.id) continue;
    const prev = byId.get(s.id);
    if (!prev) {
      byId.set(s.id, s);
      continue;
    }
    const keep = (s.settledAt || "") >= (prev.settledAt || "") ? s : prev;
    byId.set(s.id, keep);
  }
  return [...byId.values()].sort((x, y) => (x.settledAt || "").localeCompare(y.settledAt || ""));
}

function mergeChargePair(prev: RecoverableCharge, next: RecoverableCharge): RecoverableCharge {
  const prevTs = prev.updatedAt || prev.createdAt;
  const nextTs = next.updatedAt || next.createdAt;
  const scalarWinner = nextTs >= prevTs ? next : prev;
  const mergedSettlements = mergeSettlementsById(prev.settlements ?? [], next.settlements ?? []);
  const derived = deriveChargeAmounts({ amount: scalarWinner.amount, settlements: mergedSettlements });
  return {
    ...scalarWinner,
    settlements: mergedSettlements,
    ...derived,
  };
}

export function normalizeRecoverableCharges(raw: unknown): RecoverableCharge[] {
  if (!Array.isArray(raw)) return [];
  const out: RecoverableCharge[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Partial<RecoverableCharge>;
    if (!r.id) continue;
    const createdAt = String(r.createdAt ?? new Date().toISOString());
    const base: RecoverableCharge = {
      id: String(r.id),
      createdAt,
      updatedAt: String(r.updatedAt ?? createdAt),
      title: String(r.title ?? "").trim(),
      description: String(r.description ?? "").trim(),
      amount: parseAmount(r.amount),
      status: parseStatus(r.status),
      sourceType: parseSourceType(r.sourceType),
      sourceJobId: String(r.sourceJobId ?? "").trim(),
      clientName: String(r.clientName ?? "").trim(),
      createdBy: String(r.createdBy ?? "").trim(),
      responsibleInspector: String(r.responsibleInspector ?? "").trim(),
      tags: parseTags(r.tags),
      settlements: parseSettlements(r.settlements),
    };
    out.push(finalizeRecoverableCharge(base));
  }
  return out;
}

export function mergeRecoverableCharges(
  local: unknown,
  cloud: unknown,
  deletedIds: string[] = [],
): RecoverableCharge[] {
  const deleted = new Set(deletedIds);
  const loc = normalizeRecoverableCharges(local).filter((c) => !deleted.has(c.id));
  const clo = normalizeRecoverableCharges(cloud).filter((c) => !deleted.has(c.id));
  const byId = new Map<string, RecoverableCharge>();
  for (const item of loc) byId.set(item.id, item);
  for (const item of clo) {
    const prev = byId.get(item.id);
    if (!prev) {
      byId.set(item.id, item);
      continue;
    }
    byId.set(item.id, mergeChargePair(prev, item));
  }
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function defaultRecoverableCharge(createdBy = ""): RecoverableCharge {
  const now = new Date().toISOString();
  const base: RecoverableCharge = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    title: "",
    description: "",
    amount: 0,
    status: "open",
    sourceType: "standalone",
    sourceJobId: "",
    clientName: "",
    createdBy,
    responsibleInspector: "",
    tags: [],
    settlements: [],
    amountSettled: 0,
    amountRemaining: 0,
  };
  return finalizeRecoverableCharge(base);
}

export function jobLabelForCharge(job: Job): string {
  const addr = [job.address, job.flatNumber].filter(Boolean).join(" ");
  const client = job.client?.trim();
  if (addr && client) return `${addr} — ${client}`;
  return addr || client || job.id;
}

export function recoverableChargeSourceLabel(
  charge: Pick<RecoverableCharge, "sourceType" | "sourceJobId" | "clientName">,
  jobsById?: Map<string, Job>,
): string {
  if (charge.sourceType === "standalone") {
    return charge.clientName || RECOVERABLE_CHARGE_SOURCE_LABELS.standalone;
  }
  const job = charge.sourceJobId && jobsById?.get(charge.sourceJobId);
  if (job) return jobLabelForCharge(job);
  return charge.clientName || RECOVERABLE_CHARGE_SOURCE_LABELS.job;
}

export function fmtRecoverableAmount(amount: number): string {
  return `${amount.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
}

export function recoverableChargeDescriptionLine(charge: Pick<RecoverableCharge, "title" | "description">): string {
  const title = charge.title.trim();
  const desc = charge.description.trim();
  if (title && desc) return `${title} — ${desc}`;
  return title || desc || "—";
}

const STATUS_ORDER: Record<RecoverableChargeStatus, number> = {
  open: 0,
  partial: 1,
  settled: 2,
};

export function filterRecoverableCharges(
  charges: RecoverableCharge[],
  filters: RecoverableChargeFilters,
): RecoverableCharge[] {
  const q = filters.search.trim().toLowerCase();
  let list = charges.filter((c) => {
    if (filters.status !== "all" && c.status !== filters.status) return false;
    if (filters.sourceType !== "all" && c.sourceType !== filters.sourceType) return false;
    if (!q) return true;
    const hay = [
      c.title,
      c.description,
      c.clientName,
      c.responsibleInspector,
      c.createdBy,
      ...c.tags,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });

  const dir = filters.sortDir === "asc" ? 1 : -1;
  list = [...list].sort((a, b) => {
    switch (filters.sort) {
      case "amount":
        return (a.amount - b.amount) * dir;
      case "status":
        return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * dir;
      case "client":
        return a.clientName.localeCompare(b.clientName, "pl") * dir;
      case "date":
      default:
        return a.createdAt.localeCompare(b.createdAt) * dir;
    }
  });
  return list;
}

/** Kwota biznesowa — musi być > 0 PLN. */
export function isRecoverableChargeAmountValid(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0;
}

export type RecoverableChargeValidationError = "missing_description" | "invalid_amount" | "missing_job";

export function validateRecoverableChargeDraft(
  draft: Pick<RecoverableCharge, "title" | "description" | "amount" | "sourceType" | "sourceJobId">,
): { ok: true } | { ok: false; error: RecoverableChargeValidationError; message: string } {
  if (!draft.description.trim() && !draft.title.trim()) {
    return { ok: false, error: "missing_description", message: "Uzupełnij tytuł lub opis pozycji." };
  }
  if (!isRecoverableChargeAmountValid(draft.amount)) {
    return { ok: false, error: "invalid_amount", message: "Kwota musi być większa od 0 PLN." };
  }
  if (draft.sourceType === "job" && !draft.sourceJobId.trim()) {
    return { ok: false, error: "missing_job", message: "Wybierz robotę powiązaną z pozycją." };
  }
  return { ok: true };
}

/** Tylko status `open` — bez partial (badge menu, mini KPI). */
export function countOpenRecoverableCharges(charges: RecoverableCharge[]): number {
  return charges.filter((c) => c.status === "open").length;
}

export function sumOpenRecoverableCharges(charges: RecoverableCharge[]): number {
  return +charges
    .filter((c) => c.status === "open")
    .reduce((s, c) => s + c.amount, 0)
    .toFixed(2);
}

export function openRecoverableChargesKpi(charges: RecoverableCharge[]): { count: number; sum: number } {
  const open = charges.filter((c) => c.status === "open");
  return {
    count: open.length,
    sum: +open.reduce((s, c) => s + c.amount, 0).toFixed(2),
  };
}

/** KPI modułu Do rozliczenia — Sprint 20.4B (sumy z deriveChargeAmounts). */
export function recoverableChargesModuleKpi(charges: RecoverableCharge[]): {
  toSettleSum: number;
  partialRemainingSum: number;
  recoveredSum: number;
} {
  let toSettleSum = 0;
  let partialRemainingSum = 0;
  let recoveredSum = 0;
  for (const c of charges) {
    const { amountSettled, amountRemaining, status } = deriveChargeAmounts(c);
    recoveredSum += amountSettled;
    if (status === "open") toSettleSum += amountRemaining;
    if (status === "partial") partialRemainingSum += amountRemaining;
  }
  return {
    toSettleSum: +toSettleSum.toFixed(2),
    partialRemainingSum: +partialRemainingSum.toFixed(2),
    recoveredSum: +recoveredSum.toFixed(2),
  };
}

/** Badge menu: pozycje open + partial (bez settled). */
export function countUnsettledRecoverableCharges(charges: RecoverableCharge[]): number {
  return charges.filter((c) => {
    const { status } = deriveChargeAmounts(c);
    return status === "open" || status === "partial";
  }).length;
}

export function countPartialRecoverableCharges(charges: RecoverableCharge[]): number {
  return charges.filter((c) => deriveChargeAmounts(c).status === "partial").length;
}

const DASHBOARD_ALARM_MIN_REMAINING_PLN = 2000;
const DASHBOARD_ALARM_OLDEST_DAYS = 90;

export const ALERT_PARTIAL_STALE_DAYS = 60;
export const ALERT_INACTIVITY_DAYS = 60;

export type RecoverableChargeAlertType = "kwota" | "wiek" | "częściowe" | "aktywność";

export const RECOVERABLE_CHARGE_ALERT_TYPE_LABELS: Record<RecoverableChargeAlertType, string> = {
  kwota: "Kwota",
  wiek: "Wiek",
  częściowe: "Częściowe",
  aktywność: "Brak aktywności",
};

export const RECOVERABLE_CHARGE_ALERT_REASONS: Record<RecoverableChargeAlertType, string> = {
  kwota: "Kwota ≥ 2 000 PLN",
  wiek: "Ponad 90 dni",
  częściowe: "Częściowo rozliczone > 60 dni",
  aktywność: "Brak aktywności > 60 dni",
};

export const ALERT_TYPE_SORT_PRIORITY: Record<RecoverableChargeAlertType, number> = {
  wiek: 1,
  kwota: 2,
  częściowe: 3,
  aktywność: 4,
};

export interface RecoverableChargeAlert {
  chargeId: string;
  title: string;
  amountRemaining: number;
  types: RecoverableChargeAlertType[];
  primaryType: RecoverableChargeAlertType;
  reason: string;
  sortPriority: number;
}

export interface RecoverableChargesAlertsResult {
  attentionCount: number;
  alerts: RecoverableChargeAlert[];
  countsByType: Record<RecoverableChargeAlertType, number>;
}

function isLegacyMigrationSettlementId(id: string): boolean {
  return id.startsWith("legacy-migration-");
}

function firstNonLegacySettlementMs(charge: RecoverableCharge): number | null {
  let min: number | null = null;
  for (const s of charge.settlements ?? []) {
    if (isLegacyMigrationSettlementId(s.id)) continue;
    const ms = Date.parse(s.settledAt);
    if (!Number.isFinite(ms)) continue;
    if (min == null || ms < min) min = ms;
  }
  return min;
}

export function recoverableChargeLastActivityMs(charge: RecoverableCharge): number | null {
  let maxMs = Date.parse(charge.updatedAt);
  if (!Number.isFinite(maxMs)) maxMs = 0;
  for (const s of charge.settlements ?? []) {
    const ms = Date.parse(s.settledAt);
    if (Number.isFinite(ms) && ms > maxMs) maxMs = ms;
  }
  return maxMs > 0 ? maxMs : null;
}

function emptyAlertCounts(): Record<RecoverableChargeAlertType, number> {
  return { kwota: 0, wiek: 0, częściowe: 0, aktywność: 0 };
}

function primaryAlertType(types: RecoverableChargeAlertType[]): RecoverableChargeAlertType {
  return types.reduce((best, t) =>
    ALERT_TYPE_SORT_PRIORITY[t] < ALERT_TYPE_SORT_PRIORITY[best] ? t : best,
  );
}

function alertTitle(charge: RecoverableCharge): string {
  return charge.title.trim() || charge.description.trim().slice(0, 80) || "Pozycja do rozliczenia";
}

/** Jedno przejście — alerty A–D dla open + partial (Sprint 20.4C.2B). */
export function computeRecoverableChargesAlerts(
  charges: RecoverableCharge[],
  now: Date = new Date(),
): RecoverableChargesAlertsResult {
  const countsByType = emptyAlertCounts();
  const alerts: RecoverableChargeAlert[] = [];
  const nowMs = now.getTime();

  for (const c of charges) {
    const { amountRemaining, status } = deriveChargeAmounts(c);
    if (status !== "open" && status !== "partial") continue;
    if (amountRemaining <= 0) continue;

    const types: RecoverableChargeAlertType[] = [];
    const ageDays = recoverableChargeAgeDays(c.createdAt, now);

    if (amountRemaining >= DASHBOARD_ALARM_MIN_REMAINING_PLN) types.push("kwota");
    if (ageDays > DASHBOARD_ALARM_OLDEST_DAYS) types.push("wiek");

    if (status === "partial") {
      const firstMs = firstNonLegacySettlementMs(c);
      if (firstMs != null) {
        const daysSinceFirst = Math.max(0, Math.floor((nowMs - firstMs) / 86400000));
        if (daysSinceFirst > ALERT_PARTIAL_STALE_DAYS) types.push("częściowe");
      }
    }

    const lastActivityMs = recoverableChargeLastActivityMs(c);
    if (lastActivityMs != null) {
      const daysSinceActivity = Math.max(0, Math.floor((nowMs - lastActivityMs) / 86400000));
      if (daysSinceActivity > ALERT_INACTIVITY_DAYS) types.push("aktywność");
    }

    if (types.length === 0) continue;

    for (const t of types) countsByType[t] += 1;

    const primaryType = primaryAlertType(types);
    alerts.push({
      chargeId: c.id,
      title: alertTitle(c),
      amountRemaining,
      types,
      primaryType,
      reason: RECOVERABLE_CHARGE_ALERT_REASONS[primaryType],
      sortPriority: ALERT_TYPE_SORT_PRIORITY[primaryType],
    });
  }

  alerts.sort((a, b) => {
    if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
    return b.amountRemaining - a.amountRemaining;
  });

  return {
    attentionCount: alerts.length > 0 ? 1 : 0,
    alerts,
    countsByType,
  };
}

export function topRecoverableChargeAlerts(
  alerts: RecoverableChargeAlert[],
  limit = 3,
): RecoverableChargeAlert[] {
  return alerts.slice(0, limit);
}

export const RECOVERABLE_TOP_LIST_LIMIT = 5;

export interface RecoverableChargesTimeStats {
  monthRecovered: number;
  yearRecovered: number;
  averageRecoveryDays: number | null;
  settledCount: number;
}

export interface RecoverableChargeTopListItem {
  chargeId: string;
  title: string;
  amount: number;
  ageDays: number | null;
  statusLabel: string;
}

export interface RecoverableChargesTopLists {
  largestOutstanding: RecoverableChargeTopListItem[];
  oldestOutstanding: RecoverableChargeTopListItem[];
  largestRecovered: RecoverableChargeTopListItem[];
}

function lastNonLegacySettlementMs(charge: RecoverableCharge): number | null {
  let max: number | null = null;
  for (const s of charge.settlements ?? []) {
    if (isLegacyMigrationSettlementId(s.id)) continue;
    const ms = Date.parse(s.settledAt);
    if (!Number.isFinite(ms)) continue;
    if (max == null || ms > max) max = ms;
  }
  return max;
}

function chargeHasOnlyLegacySettlements(charge: RecoverableCharge): boolean {
  const settlements = charge.settlements ?? [];
  return settlements.length > 0 && settlements.every((s) => isLegacyMigrationSettlementId(s.id));
}

function settlementInCalendarYear(settledAt: string, year: number): boolean {
  const ms = Date.parse(settledAt);
  if (!Number.isFinite(ms)) return false;
  return new Date(ms).getFullYear() === year;
}

function settlementInCalendarMonth(settledAt: string, now: Date): boolean {
  const ms = Date.parse(settledAt);
  if (!Number.isFinite(ms)) return false;
  const d = new Date(ms);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function toOutstandingTopItem(
  charge: RecoverableCharge,
  amount: number,
  status: RecoverableChargeStatus,
  now: Date,
  statusLabel: string,
): RecoverableChargeTopListItem {
  return {
    chargeId: charge.id,
    title: alertTitle(charge),
    amount,
    ageDays: recoverableChargeAgeDays(charge.createdAt, now),
    statusLabel,
  };
}

/** KPI czasowe — miesiąc/rok/średni czas zamknięcia (Sprint 20.4C.2C). */
export function computeRecoverableChargesTimeStats(
  charges: RecoverableCharge[],
  now: Date = new Date(),
): RecoverableChargesTimeStats {
  let monthRecovered = 0;
  let yearRecovered = 0;
  let settledCount = 0;
  const recoveryDurations: number[] = [];
  const year = now.getFullYear();

  for (const c of charges) {
    const { status } = deriveChargeAmounts(c);
    if (status === "settled") settledCount += 1;

    for (const s of c.settlements ?? []) {
      if (isLegacyMigrationSettlementId(s.id)) continue;
      if (!settlementInCalendarYear(s.settledAt, year)) continue;
      yearRecovered += s.amount;
      if (settlementInCalendarMonth(s.settledAt, now)) monthRecovered += s.amount;
    }

    if (status !== "settled" || chargeHasOnlyLegacySettlements(c)) continue;

    const lastMs = lastNonLegacySettlementMs(c);
    const createdMs = Date.parse(c.createdAt);
    if (lastMs == null || !Number.isFinite(createdMs)) continue;
    recoveryDurations.push(Math.max(0, Math.floor((lastMs - createdMs) / 86400000)));
  }

  return {
    monthRecovered: +monthRecovered.toFixed(2),
    yearRecovered: +yearRecovered.toFixed(2),
    averageRecoveryDays:
      recoveryDurations.length > 0
        ? Math.round(recoveryDurations.reduce((s, d) => s + d, 0) / recoveryDurations.length)
        : null,
    settledCount,
  };
}

/** Top listy — największe / najstarsze / odzyskane (Sprint 20.4C.2C). */
export function computeRecoverableChargesTopLists(
  charges: RecoverableCharge[],
  now: Date = new Date(),
  limit = RECOVERABLE_TOP_LIST_LIMIT,
): RecoverableChargesTopLists {
  const outstanding: { charge: RecoverableCharge; remaining: number; status: RecoverableChargeStatus }[] = [];
  const recovered: { charge: RecoverableCharge; settled: number }[] = [];

  for (const c of charges) {
    const amounts = deriveChargeAmounts(c);
    if (amounts.status === "open" || amounts.status === "partial") {
      if (amounts.amountRemaining > 0) {
        outstanding.push({ charge: c, remaining: amounts.amountRemaining, status: amounts.status });
      }
    } else if (amounts.status === "settled" && !chargeHasOnlyLegacySettlements(c)) {
      recovered.push({ charge: c, settled: amounts.amountSettled });
    }
  }

  const largestOutstanding = [...outstanding]
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, limit)
    .map(({ charge, remaining, status }) =>
      toOutstandingTopItem(charge, remaining, status, now, recoverableChargeStatusLabel(status, false)),
    );

  const oldestOutstanding = [...outstanding]
    .sort((a, b) => Date.parse(a.charge.createdAt) - Date.parse(b.charge.createdAt))
    .slice(0, limit)
    .map(({ charge, remaining, status }) => {
      const ageDays = recoverableChargeAgeDays(charge.createdAt, now);
      return toOutstandingTopItem(charge, remaining, status, now, `${ageDays} dni`);
    });

  const largestRecovered = [...recovered]
    .sort((a, b) => b.settled - a.settled)
    .slice(0, limit)
    .map(({ charge, settled }) =>
      toOutstandingTopItem(
        charge,
        settled,
        "settled",
        now,
        recoverableChargeStatusLabel("settled", false),
      ),
    );

  return { largestOutstanding, oldestOutstanding, largestRecovered };
}

export type RecoverableChargeAgingBucketKey = "0_30" | "31_60" | "61_90" | "90_plus";

export interface RecoverableChargeAgingBucket {
  key: RecoverableChargeAgingBucketKey;
  label: string;
  count: number;
  amountRemainingSum: number;
}

export const AGING_BUCKET_LABELS: Record<RecoverableChargeAgingBucketKey, string> = {
  "0_30": "0–30 dni",
  "31_60": "31–60 dni",
  "61_90": "61–90 dni",
  "90_plus": "90+ dni",
};

export const AGING_BUCKET_ORDER: RecoverableChargeAgingBucketKey[] = ["0_30", "31_60", "61_90", "90_plus"];

export function recoverableChargeAgeDays(createdAt: string, now: Date = new Date()): number {
  const createdMs = Date.parse(createdAt);
  if (!Number.isFinite(createdMs)) return 0;
  return Math.max(0, Math.floor((now.getTime() - createdMs) / 86400000));
}

export function agingBucketKeyForAgeDays(ageDays: number): RecoverableChargeAgingBucketKey {
  if (ageDays <= 30) return "0_30";
  if (ageDays <= 60) return "31_60";
  if (ageDays <= 90) return "61_90";
  return "90_plus";
}

function emptyAgingBuckets(): Record<RecoverableChargeAgingBucketKey, RecoverableChargeAgingBucket> {
  return {
    "0_30": { key: "0_30", label: AGING_BUCKET_LABELS["0_30"], count: 0, amountRemainingSum: 0 },
    "31_60": { key: "31_60", label: AGING_BUCKET_LABELS["31_60"], count: 0, amountRemainingSum: 0 },
    "61_90": { key: "61_90", label: AGING_BUCKET_LABELS["61_90"], count: 0, amountRemainingSum: 0 },
    "90_plus": { key: "90_plus", label: AGING_BUCKET_LABELS["90_plus"], count: 0, amountRemainingSum: 0 },
  };
}

export function sumAgingAmountRemaining(aging: RecoverableChargeAgingBucket[]): number {
  return +aging.reduce((s, b) => s + b.amountRemainingSum, 0).toFixed(2);
}

/** Jedno przejście — aging + KPI Pulpitu / modułu (Sprint 20.4C.2A). */
export function computeRecoverableChargesReportingStats(
  charges: RecoverableCharge[],
  now: Date = new Date(),
): {
  aging: RecoverableChargeAgingBucket[];
  toRecoverSum: number;
  unsettledCount: number;
  partialCount: number;
  recoveredSum: number;
  oldestUnsettledDays: number | null;
  isAlarm: boolean;
  isEmpty: boolean;
} {
  const buckets = emptyAgingBuckets();
  const moduleKpi = recoverableChargesModuleKpi(charges);
  const toRecoverSum = +(moduleKpi.toSettleSum + moduleKpi.partialRemainingSum).toFixed(2);
  let unsettledCount = 0;
  let partialCount = 0;
  let oldestUnsettledDays: number | null = null;
  let hasHighRemaining = false;

  for (const c of charges) {
    const { amountRemaining, status } = deriveChargeAmounts(c);
    if (status !== "open" && status !== "partial") continue;

    unsettledCount += 1;
    if (status === "partial") partialCount += 1;
    if (amountRemaining >= DASHBOARD_ALARM_MIN_REMAINING_PLN) hasHighRemaining = true;

    const ageDays = recoverableChargeAgeDays(c.createdAt, now);
    if (oldestUnsettledDays == null || ageDays > oldestUnsettledDays) {
      oldestUnsettledDays = ageDays;
    }

    const bucketKey = agingBucketKeyForAgeDays(ageDays);
    const bucket = buckets[bucketKey];
    bucket.count += 1;
    bucket.amountRemainingSum = +(bucket.amountRemainingSum + amountRemaining).toFixed(2);
  }

  const aging = AGING_BUCKET_ORDER.map((key) => ({
    ...buckets[key],
    amountRemainingSum: +buckets[key].amountRemainingSum.toFixed(2),
  }));

  const isEmpty = unsettledCount === 0;
  const isAlarm =
    !isEmpty &&
    ((oldestUnsettledDays != null && oldestUnsettledDays > DASHBOARD_ALARM_OLDEST_DAYS) || hasHighRemaining);

  return {
    aging,
    toRecoverSum,
    unsettledCount,
    partialCount,
    recoveredSum: moduleKpi.recoveredSum,
    oldestUnsettledDays,
    isAlarm,
    isEmpty,
  };
}

/** KPI karty Pulpitu — deleguje do computeRecoverableChargesReportingStats. */
export function recoverableChargesDashboardCardStats(
  charges: RecoverableCharge[],
  now: Date = new Date(),
): {
  toRecoverSum: number;
  unsettledCount: number;
  partialCount: number;
  recoveredSum: number;
  oldestUnsettledDays: number | null;
  isAlarm: boolean;
  isEmpty: boolean;
} {
  const stats = computeRecoverableChargesReportingStats(charges, now);
  return {
    toRecoverSum: stats.toRecoverSum,
    unsettledCount: stats.unsettledCount,
    partialCount: stats.partialCount,
    recoveredSum: stats.recoveredSum,
    oldestUnsettledDays: stats.oldestUnsettledDays,
    isAlarm: stats.isAlarm,
    isEmpty: stats.isEmpty,
  };
}

/** Etykieta roboty docelowej rozliczenia — z KV, listy lub „Robota archiwalna”. */
export function settlementTargetJobLabel(
  settlement: Pick<RecoverableChargeSettlement, "targetJobId" | "targetJobLabel">,
  jobsById?: Map<string, Job>,
): string {
  if (settlement.targetJobLabel?.trim()) return settlement.targetJobLabel.trim();
  const id = settlement.targetJobId?.trim();
  if (!id) return "—";
  const job = jobsById?.get(id);
  if (job) return jobLabelForCharge(job);
  return "Robota archiwalna";
}

/** Krótsza etykieta źródła na liście — preferuje klienta zamiast pełnego adresu. */
export function recoverableChargeSourceListLabel(
  charge: Pick<RecoverableCharge, "sourceType" | "sourceJobId" | "clientName">,
  jobsById?: Map<string, Job>,
): string {
  if (charge.sourceType === "standalone") {
    return charge.clientName || RECOVERABLE_CHARGE_SOURCE_LABELS.standalone;
  }
  const job = charge.sourceJobId && jobsById?.get(charge.sourceJobId);
  if (job) {
    const client = job.client?.trim();
    if (client) return client;
    const addr = [job.address, job.flatNumber].filter(Boolean).join(" ").trim();
    return addr || job.id;
  }
  return charge.clientName || RECOVERABLE_CHARGE_SOURCE_LABELS.job;
}

export function formatRecoverableChargeDate(iso: string): string {
  if (!iso) return "—";
  const d = iso.slice(0, 10);
  return fmtIsoDatePl(d);
}

export function tagsToInputValue(tags: string[]): string {
  return tags.join(", ");
}

export function inputValueToTags(value: string): string[] {
  return parseTags(value);
}

/** Limit list pozycji na karcie roboty (Sprint 20.5A.1). */
export const JOB_RECOVERABLE_CHARGES_LIST_LIMIT = 5;

export type RecoverableChargeJobStats = {
  chargeCount: number;
  unsettledCount: number;
  recoveredCount: number;
  toRecoverAmount: number;
  recoveredAmount: number;
  alertCount: number;
};

/** Wiersz rozliczenia odzyskanego na robocie docelowej (targetJobId). */
export type RecoverableChargeJobSettlementRow = {
  chargeId: string;
  title: string;
  recoveredAmount: number;
  lastSettledAt: string;
};

/** Pozycje źródłowe powiązane z robotą (sourceJobId). */
export function getRecoverableChargesForJob(
  charges: RecoverableCharge[],
  jobId: string,
): RecoverableCharge[] {
  const id = jobId.trim();
  if (!id) return [];
  return charges
    .filter((c) => c.sourceJobId?.trim() === id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Rozliczenia zaksięgowane na tej robocie jako docelowej (targetJobId w settlements). */
export function getRecoverableChargesRecoveredOnJob(
  charges: RecoverableCharge[],
  jobId: string,
): RecoverableChargeJobSettlementRow[] {
  const id = jobId.trim();
  if (!id) return [];
  const rows: RecoverableChargeJobSettlementRow[] = [];

  for (const c of charges) {
    const matching = (c.settlements ?? []).filter((s) => s.targetJobId?.trim() === id);
    if (matching.length === 0) continue;

    const recoveredAmount = +matching.reduce((sum, s) => sum + s.amount, 0).toFixed(2);
    const lastSettledAt = matching.reduce(
      (best, s) => (s.settledAt > best ? s.settledAt : best),
      matching[0].settledAt,
    );
    const title = c.title.trim() || c.description.trim().slice(0, 80) || "Pozycja do rozliczenia";

    rows.push({ chargeId: c.id, title, recoveredAmount, lastSettledAt });
  }

  return rows.sort((a, b) => b.lastSettledAt.localeCompare(a.lastSettledAt));
}

/** Agregacja KPI pozycji do rozliczenia na robocie (read-only, Sprint 20.5A.1). */
export function getRecoverableChargeJobStats(
  charges: RecoverableCharge[],
  jobId: string,
  now: Date = new Date(),
): RecoverableChargeJobStats {
  const source = getRecoverableChargesForJob(charges, jobId);
  const recoveredRows = getRecoverableChargesRecoveredOnJob(charges, jobId);

  let toRecoverAmount = 0;
  let unsettledCount = 0;
  for (const c of source) {
    const { amountRemaining, status } = deriveChargeAmounts(c);
    if (status === "open" || status === "partial") {
      unsettledCount += 1;
      toRecoverAmount += amountRemaining;
    }
  }

  const recoveredAmount = +recoveredRows.reduce((sum, r) => sum + r.recoveredAmount, 0).toFixed(2);
  const { alerts } = computeRecoverableChargesAlerts(source, now);

  return {
    chargeCount: source.length,
    unsettledCount,
    recoveredCount: recoveredRows.length,
    toRecoverAmount: +toRecoverAmount.toFixed(2),
    recoveredAmount,
    alertCount: alerts.length,
  };
}

/** Adres roboty do presetu tworzenia pozycji (Sprint 20.5A.2). */
export function jobAddressForRecoverableCharge(job: Pick<Job, "address" | "flatNumber">): string {
  const addr = job.address?.trim() || "";
  const flat = job.flatNumber?.trim();
  if (!addr && !flat) return "";
  return flat ? `${addr} m.${flat}`.trim() : addr;
}

/** Inspektor odpowiedzialny — lider ekipy wykonawczej z kartoteki. */
export function resolveJobResponsibleInspector(
  job: Pick<Job, "executionLeadDirectoryId">,
  directory: { id: string; name: string }[],
): string {
  const leadId = job.executionLeadDirectoryId?.trim();
  if (!leadId) return "";
  return directory.find((d) => d.id === leadId)?.name?.trim() || "";
}

/** Draft tworzenia pozycji z roboty — sourceType/job/klient/inspektor (Sprint 20.5A.2). */
export function buildRecoverableChargeDraftFromJob(
  job: Job,
  createdBy: string,
  directory: { id: string; name: string }[] = [],
): RecoverableCharge {
  const base = defaultRecoverableCharge(createdBy);
  return {
    ...base,
    sourceType: "job",
    sourceJobId: job.id,
    clientName: job.client?.trim() || "",
    responsibleInspector: resolveJobResponsibleInspector(job, directory),
  };
}

/** Normalizacja draftu przed zapisem — wspólna dla modułu i roboty. */
export function finalizeRecoverableChargeDraftForSave(draft: RecoverableCharge): RecoverableCharge {
  const title = draft.title.trim() || draft.description.trim().slice(0, 80) || "Pozycja do rozliczenia";
  const now = new Date().toISOString();
  const base: RecoverableCharge = {
    ...draft,
    title,
    description: draft.description.trim(),
    clientName: draft.clientName.trim(),
    responsibleInspector: draft.responsibleInspector.trim(),
    updatedAt: now,
    sourceJobId: draft.sourceType === "job" ? draft.sourceJobId : "",
  };
  return { ...base, ...deriveChargeAmounts(base) };
}

/** Dodaje nową pozycję na początku listy (create). */
export function appendRecoverableChargeCreate(
  charges: RecoverableCharge[],
  draft: RecoverableCharge,
): RecoverableCharge[] {
  const normalized = finalizeRecoverableChargeDraftForSave(draft);
  return [normalized, ...charges];
}
