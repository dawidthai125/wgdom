/** Pozycje do rozliczenia / odzyskania — KV `kw-recoverable-charges`. Sprint 20.3A. */

import type { Job } from "@/app/app-domain";
import { fmtDate } from "@/app/app-domain";

export type RecoverableChargeStatus = "open" | "partial" | "settled";
export type RecoverableChargeSourceType = "job" | "standalone";

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
}

export const RECOVERABLE_CHARGE_STATUSES: RecoverableChargeStatus[] = ["open", "partial", "settled"];

export const RECOVERABLE_CHARGE_STATUS_LABELS: Record<RecoverableChargeStatus, string> = {
  open: "Otwarta",
  partial: "Częściowo",
  settled: "Rozliczona",
};

export const RECOVERABLE_CHARGE_STATUS_EMOJI: Record<RecoverableChargeStatus, string> = {
  open: "🔴",
  partial: "🟡",
  settled: "🟢",
};

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

export function normalizeRecoverableCharges(raw: unknown): RecoverableCharge[] {
  if (!Array.isArray(raw)) return [];
  const out: RecoverableCharge[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Partial<RecoverableCharge>;
    if (!r.id) continue;
    const createdAt = String(r.createdAt ?? new Date().toISOString());
    out.push({
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
    });
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
    const prevTs = prev.updatedAt || prev.createdAt;
    const nextTs = item.updatedAt || item.createdAt;
    byId.set(item.id, nextTs >= prevTs ? item : prev);
  }
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function defaultRecoverableCharge(createdBy = ""): RecoverableCharge {
  const now = new Date().toISOString();
  return {
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
  };
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
  return fmtDate(d);
}

export function tagsToInputValue(tags: string[]): string {
  return tags.join(", ");
}

export function inputValueToTags(value: string): string[] {
  return parseTags(value);
}
