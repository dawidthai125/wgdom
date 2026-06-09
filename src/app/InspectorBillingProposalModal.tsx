import { useEffect, useMemo, useState } from "react";
import { Camera, FileText, Loader2, Send, X } from "lucide-react";
import type { Job } from "@/app/app-domain";
import {
  buildRecoverableChargeDraftFromJob,
  fmtRecoverableAmount,
  jobAddressForRecoverableCharge,
  jobLabelForCharge,
  validateRecoverableChargeDraft,
} from "@/lib/recoverable-charges";
import {
  MAX_BILLING_EVIDENCE_IMAGES,
  MAX_BILLING_EVIDENCE_PDFS,
  validateBillingEvidenceFile,
} from "@/lib/billing-evidence-upload";
import { HiddenFileInput } from "@/app/HiddenFileInput";
import type { BillingNotePendingFiles } from "@/app/JobRecoverableChargesPanel";

export function InspectorBillingProposalModal({
  job,
  directory,
  authorName,
  onClose,
  onSubmit,
}: {
  job: Job;
  directory: { id: string; name: string }[];
  authorName: string;
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    description: string;
    amount: number;
    files?: BillingNotePendingFiles;
  }) => void | Promise<void>;
}) {
  const preset = useMemo(
    () => buildRecoverableChargeDraftFromJob(job, authorName, directory),
    [job, authorName, directory],
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [pendingPdf, setPendingPdf] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pickError, setPickError] = useState("");

  const validation = useMemo(
    () => validateRecoverableChargeDraft({
      title,
      description,
      amount,
      sourceType: "job",
      sourceJobId: job.id,
    }),
    [title, description, amount, job.id],
  );

  const imageThumbUrls = useMemo(
    () => pendingImages.map((f) => URL.createObjectURL(f)),
    [pendingImages],
  );

  useEffect(() => () => {
    for (const url of imageThumbUrls) URL.revokeObjectURL(url);
  }, [imageThumbUrls]);

  const addressLabel = jobAddressForRecoverableCharge(job);
  const jobLabel = jobLabelForCharge(job);

  const addImages = (files: FileList | null) => {
    if (!files?.length) return;
    setPickError("");
    const next = [...pendingImages];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_BILLING_EVIDENCE_IMAGES) {
        setPickError(`Maksymalnie ${MAX_BILLING_EVIDENCE_IMAGES} zdjęcia.`);
        break;
      }
      const err = validateBillingEvidenceFile(file);
      if (err) {
        setPickError(err);
        continue;
      }
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        setPickError("PDF dodaj przyciskiem „Dodaj PDF”.");
        continue;
      }
      next.push(file);
    }
    setPendingImages(next);
  };

  const addPdf = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setPickError("");
    if (pendingPdf) {
      setPickError("Możesz dodać tylko 1 plik PDF.");
      return;
    }
    const err = validateBillingEvidenceFile(file);
    if (err) {
      setPickError(err);
      return;
    }
    if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
      setPickError("Dozwolony jest tylko plik PDF.");
      return;
    }
    setPendingPdf(file);
  };

  const handleSubmit = async () => {
    if (!validation.ok || uploading) return;
    setUploading(true);
    setPickError("");
    try {
      const files: BillingNotePendingFiles | undefined =
        pendingImages.length > 0 || pendingPdf
          ? { images: pendingImages, pdf: pendingPdf }
          : undefined;
      await Promise.resolve(onSubmit({
        title: title.trim(),
        description: description.trim(),
        amount,
        files,
      }));
      onClose();
    } catch {
      setPickError("Nie udało się wysłać zgłoszenia. Sprawdź połączenie i spróbuj ponownie.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
      onClick={uploading ? undefined : onClose}
    >
      <div
        className="w-full sm:max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[min(92vh,680px)]"
        role="dialog"
        aria-labelledby="billing-proposal-title"
        onClick={(e) => e.stopPropagation()}
        data-billing-proposal-modal
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <p id="billing-proposal-title" className="text-sm font-semibold">
              Zgłoś pozycję do rozliczenia
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Zgłoszenie trafi do administratora — bez zmiany rejestru do zatwierdzenia
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          <div className="bg-secondary/40 rounded-xl px-3 py-3 space-y-2 text-xs">
            <PresetRow label="Robota" value={jobLabel} />
            {addressLabel && <PresetRow label="Adres" value={addressLabel} />}
            {preset.clientName && <PresetRow label="Klient" value={preset.clientName} />}
            {preset.responsibleInspector && (
              <PresetRow label="Inspektor" value={preset.responsibleInspector} />
            )}
          </div>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Tytuł (opcjonalnie)</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm"
              placeholder="Krótki tytuł pozycji"
              autoFocus
              style={{ fontSize: "16px" }}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Opis *</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              rows={3}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm resize-y min-h-[4.5rem]"
              placeholder="Co do odzyskania, za co, kiedy…"
              style={{ fontSize: "16px" }}
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
              disabled={uploading}
              value={amount > 0 ? amount : ""}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "" || raw === "-") {
                  setAmount(0);
                  return;
                }
                const n = parseFloat(raw);
                if (!Number.isFinite(n) || n < 0) return;
                setAmount(n);
              }}
              className={`w-full bg-secondary border rounded-xl px-3 py-2.5 text-sm ${
                !validation.ok && validation.error === "invalid_amount" ? "border-destructive" : "border-border"
              }`}
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "16px" }}
            />
            {!validation.ok && validation.error === "invalid_amount" && (
              <p className="text-xs text-destructive">{validation.message}</p>
            )}
            {amount > 0 && (
              <p className="text-[10px] text-muted-foreground">{fmtRecoverableAmount(amount)}</p>
            )}
          </label>

          <div className="flex flex-wrap gap-2">
            <HiddenFileInput
              accept="image/jpeg,image/png,image/webp,image/*,.jpg,.jpeg,.png,.webp"
              multiple
              capture="environment"
              onPick={addImages}
            >
              {(open) => (
                <button
                  type="button"
                  onClick={open}
                  disabled={uploading || pendingImages.length >= MAX_BILLING_EVIDENCE_IMAGES}
                  className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg bg-secondary text-xs font-medium touch-manipulation disabled:opacity-40"
                >
                  <Camera size={12} /> Dodaj zdjęcia
                </button>
              )}
            </HiddenFileInput>
            <HiddenFileInput accept="application/pdf,.pdf" onPick={addPdf}>
              {(open) => (
                <button
                  type="button"
                  onClick={open}
                  disabled={uploading || Boolean(pendingPdf)}
                  className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg bg-secondary text-xs font-medium touch-manipulation disabled:opacity-40"
                >
                  <FileText size={12} /> Dodaj PDF
                </button>
              )}
            </HiddenFileInput>
          </div>

          {(pendingImages.length > 0 || pendingPdf) && (
            <div className="flex flex-wrap gap-2">
              {pendingImages.map((file, i) => (
                <div key={`${file.name}-${i}`} className="relative">
                  <img
                    src={imageThumbUrls[i]}
                    alt=""
                    className="h-14 w-14 object-cover rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => setPendingImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-destructive text-destructive-foreground min-w-[22px] min-h-[22px] flex items-center justify-center"
                    aria-label="Usuń zdjęcie"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              {pendingPdf && (
                <div className="relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border bg-secondary/50 text-[10px] max-w-[160px]">
                  <FileText size={12} className="shrink-0 text-primary" />
                  <span className="truncate">{pendingPdf.name}</span>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => setPendingPdf(null)}
                    className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-destructive text-destructive-foreground min-w-[22px] min-h-[22px] flex items-center justify-center"
                    aria-label="Usuń PDF"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
            </div>
          )}

          {pickError && <p className="text-[10px] text-destructive">{pickError}</p>}

          <p className="text-[10px] text-muted-foreground">
            Do {MAX_BILLING_EVIDENCE_IMAGES} zdjęć i 1 PDF (max 8 MB). Administrator zatwierdzi lub odrzuci zgłoszenie.
          </p>
        </div>

        <div
          className="shrink-0 px-5 py-4 border-t border-border flex gap-2"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="flex-1 py-2.5 rounded-xl text-sm border border-border hover:bg-secondary disabled:opacity-40"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!validation.ok || uploading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Wyślij do administratora
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
