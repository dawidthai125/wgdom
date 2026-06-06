import { useMemo, useState } from "react";
import { X, ChevronDown, Banknote } from "lucide-react";
import type { Job } from "@/app/app-domain";
import {
  type RecoverableCharge,
  fmtRecoverableAmount,
  jobLabelForCharge,
  validateSettlementDraft,
  deriveChargeAmounts,
} from "@/lib/recoverable-charges";

export const SETTLEMENT_TYPE_OPTIONS = [
  { value: "next_job", label: "Doliczone do kolejnej roboty" },
  { value: "estimate", label: "Doliczone do kosztorysu" },
  { value: "invoice", label: "Doliczone do faktury" },
  { value: "manual", label: "Rozliczenie ręczne" },
  { value: "other", label: "Inne" },
] as const;

export type SettlementTypeValue = (typeof SETTLEMENT_TYPE_OPTIONS)[number]["value"];

export function settlementTypeLabel(value: string): string {
  return SETTLEMENT_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function buildSettlementNote(typeLabel: string, userNote: string): string {
  const lines = [`Typ: ${typeLabel}`];
  if (userNote.trim()) lines.push(userNote.trim());
  return lines.join("\n");
}

export function parseSettlementNote(note?: string): { typeLabel: string | null; userNote: string } {
  if (!note?.trim()) return { typeLabel: null, userNote: "" };
  const lines = note.split("\n");
  const first = lines[0]?.trim() ?? "";
  if (first.startsWith("Typ: ")) {
    return {
      typeLabel: first.slice(5).trim() || null,
      userNote: lines.slice(1).join("\n").trim(),
    };
  }
  return { typeLabel: null, userNote: note.trim() };
}

export type SettleChargeSubmit = {
  amount: number;
  targetJobId: string;
  targetJobLabel: string;
  onBehalfOf: string;
  note: string;
  settlementType: SettlementTypeValue;
};

export function SettleChargeModal({
  charge,
  jobs,
  settledByName,
  onClose,
  onSubmit,
}: {
  charge: RecoverableCharge;
  jobs: Job[];
  settledByName: string;
  onClose: () => void;
  onSubmit: (payload: SettleChargeSubmit) => void;
}) {
  const derived = useMemo(() => deriveChargeAmounts(charge), [charge]);
  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => jobLabelForCharge(a).localeCompare(jobLabelForCharge(b), "pl")),
    [jobs],
  );
  const jobsById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);

  const [amountRaw, setAmountRaw] = useState(
    derived.amountRemaining > 0 ? String(derived.amountRemaining) : "",
  );
  const [targetJobId, setTargetJobId] = useState("");
  const [onBehalfEnabled, setOnBehalfEnabled] = useState(!!charge.responsibleInspector.trim());
  const [onBehalfOf, setOnBehalfOf] = useState(charge.responsibleInspector.trim());
  const [userNote, setUserNote] = useState("");
  const [settlementType, setSettlementType] = useState<SettlementTypeValue>("next_job");

  const amount = parseFloat(amountRaw.replace(",", "."));
  const amountValid = Number.isFinite(amount) && amount > 0;
  const validation = amountValid
    ? validateSettlementDraft(charge, amount)
    : { ok: false as const, error: "invalid_amount" as const, message: "Kwota rozliczenia musi być większa od 0 PLN." };

  const canSubmit = amountValid && validation.ok && !!settlementType;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const job = targetJobId ? jobsById.get(targetJobId) : undefined;
    onSubmit({
      amount,
      targetJobId,
      targetJobLabel: job ? jobLabelForCharge(job) : "",
      onBehalfOf: onBehalfEnabled ? onBehalfOf.trim() : "",
      note: userNote,
      settlementType,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Banknote size={16} className="text-primary shrink-0" />
            <p className="text-sm font-semibold truncate">Rozlicz kwotę</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Pozostało do rozliczenia:{" "}
            <span className="font-semibold text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {fmtRecoverableAmount(derived.amountRemaining)}
            </span>
          </p>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Kwota rozliczenia *</span>
            <input
              type="number"
              min={0.01}
              max={derived.amountRemaining}
              step={0.01}
              value={amountRaw}
              onChange={(e) => setAmountRaw(e.target.value)}
              className={`w-full bg-secondary border rounded-xl px-3 py-2.5 text-sm ${!validation.ok && amountValid ? "border-destructive" : "border-border"}`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            />
            {!validation.ok && amountRaw !== "" && (
              <p className="text-xs text-destructive">{validation.message}</p>
            )}
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Robota docelowa</span>
            <div className="relative">
              <select
                value={targetJobId}
                onChange={(e) => setTargetJobId(e.target.value)}
                className="w-full appearance-none bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm pr-8"
              >
                <option value="">— brak / poza systemem —</option>
                {sortedJobs.map((j) => (
                  <option key={j.id} value={j.id}>{jobLabelForCharge(j)}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Typ rozliczenia *</span>
            <div className="relative">
              <select
                value={settlementType}
                onChange={(e) => setSettlementType(e.target.value as SettlementTypeValue)}
                className="w-full appearance-none bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm pr-8"
              >
                {SETTLEMENT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </label>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={onBehalfEnabled}
                onChange={(e) => setOnBehalfEnabled(e.target.checked)}
                className="rounded border-border"
              />
              Na podstawie informacji od inspektora
            </label>
            {onBehalfEnabled && (
              <input
                type="text"
                value={onBehalfOf}
                onChange={(e) => setOnBehalfOf(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm"
                placeholder="Imię inspektora"
              />
            )}
          </div>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Notatka</span>
            <textarea
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              rows={2}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm resize-y min-h-[3rem]"
              placeholder="np. Potwierdzone telefonicznie"
            />
          </label>

          <p className="text-[10px] text-muted-foreground">Rozliczy: {settledByName || "Administrator"}</p>
        </div>

        <div className="shrink-0 px-4 py-3 border-t border-border flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm border border-border hover:bg-secondary">
            Anuluj
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            Zapisz rozliczenie
          </button>
        </div>
      </div>
    </div>
  );
}
