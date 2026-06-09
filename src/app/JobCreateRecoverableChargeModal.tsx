import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Job } from "@/app/app-domain";
import {
  type RecoverableCharge,
  buildRecoverableChargeDraftFromJob,
  deriveChargeAmounts,
  fmtRecoverableAmount,
  jobAddressForRecoverableCharge,
  jobLabelForCharge,
  validateRecoverableChargeDraft,
} from "@/lib/recoverable-charges";

export function JobCreateRecoverableChargeModal({
  job,
  directory,
  createdByName,
  onClose,
  onSave,
  title = "Dodaj do rozliczenia",
  submitLabel = "Zapisz",
  initialDraft,
}: {
  job: Job;
  directory: { id: string; name: string }[];
  createdByName: string;
  onClose: () => void;
  onSave: (draft: RecoverableCharge) => boolean;
  title?: string;
  submitLabel?: string;
  initialDraft?: RecoverableCharge;
}) {
  const [draft, setDraft] = useState(() =>
    initialDraft ?? buildRecoverableChargeDraftFromJob(job, createdByName, directory),
  );
  const [saving, setSaving] = useState(false);
  const validation = useMemo(() => validateRecoverableChargeDraft(draft), [draft]);
  const addressLabel = jobAddressForRecoverableCharge(job);
  const jobLabel = jobLabelForCharge(job);

  const handleSave = () => {
    if (!validation.ok || saving) return;
    setSaving(true);
    try {
      const ok = onSave({ ...draft, ...deriveChargeAmounts(draft) });
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div
        className="w-full sm:max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[min(92vh,640px)]"
        role="dialog"
        aria-labelledby="job-rc-create-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <p id="job-rc-create-title" className="text-sm font-semibold">
            {title}
          </p>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          <div className="bg-secondary/40 rounded-xl px-3 py-3 space-y-2 text-xs">
            <PresetRow label="Robota" value={jobLabel} />
            {addressLabel && <PresetRow label="Adres" value={addressLabel} />}
            {draft.clientName && <PresetRow label="Klient" value={draft.clientName} />}
            {draft.responsibleInspector && (
              <PresetRow label="Inspektor" value={draft.responsibleInspector} />
            )}
          </div>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Tytuł (opcjonalnie)</span>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm"
              placeholder="Krótki tytuł pozycji"
              autoFocus
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Opis *</span>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={3}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm resize-y min-h-[4.5rem]"
              placeholder="Co do odzyskania, za co, kiedy…"
            />
            {!validation.ok && validation.error === "missing_description" && (
              <p className="text-xs text-destructive">{validation.message}</p>
            )}
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Kwota (PLN) *</span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={draft.amount > 0 ? draft.amount : ""}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "" || raw === "-") {
                  setDraft({ ...draft, amount: 0 });
                  return;
                }
                const n = parseFloat(raw);
                if (!Number.isFinite(n) || n < 0) return;
                setDraft({ ...draft, amount: n });
              }}
              className={`w-full bg-secondary border rounded-xl px-3 py-2.5 text-sm ${
                !validation.ok && validation.error === "invalid_amount" ? "border-destructive" : "border-border"
              }`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            />
            {!validation.ok && validation.error === "invalid_amount" && (
              <p className="text-xs text-destructive">{validation.message}</p>
            )}
            {draft.amount > 0 && (
              <p className="text-[10px] text-muted-foreground">{fmtRecoverableAmount(draft.amount)}</p>
            )}
          </label>
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-border flex gap-2" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm border border-border hover:bg-secondary disabled:opacity-40">
            Anuluj
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!validation.ok || saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PresetRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 min-w-0">
      <span className="text-muted-foreground shrink-0 w-16">{label}</span>
      <span className="text-foreground font-medium truncate">{value}</span>
    </div>
  );
}
