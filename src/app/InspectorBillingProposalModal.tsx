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
  validateBillingEvidenceFile,
} from "@/lib/billing-evidence-upload";
import { HiddenFileInput } from "@/app/HiddenFileInput";
import type { BillingNotePendingFiles } from "@/app/JobRecoverableChargesPanel";
import { cn } from "@/app/components/ui/utils";
import { WgButton, WgField, WgModalFrame } from "@/app/ui";
import { WG_TOUCH_MIN } from "@/lib/wg-ui-tokens";

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

  const handleClose = () => {
    if (uploading) return;
    onClose();
  };

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
    <WgModalFrame
      open
      onClose={handleClose}
      showHeader={false}
      variant="sheet"
      surface="solid"
      size="md"
      zIndex={50}
      aria-labelledby="billing-proposal-title"
      className="max-h-[min(92vh,680px)] sm:rounded-2xl"
    >
      <div
        className="flex flex-col max-h-[min(92vh,680px)] min-h-0"
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
          <WgButton
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={uploading}
            aria-label="Zamknij"
            className={cn(WG_TOUCH_MIN, "h-11 w-11 rounded-lg hover:bg-secondary")}
          >
            <X size={14} />
          </WgButton>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4 min-h-0">
          <div className="bg-secondary/40 rounded-xl px-3 py-3 space-y-2 text-xs">
            <PresetRow label="Robota" value={jobLabel} />
            {addressLabel && <PresetRow label="Adres" value={addressLabel} />}
            {preset.clientName && <PresetRow label="Klient" value={preset.clientName} />}
            {preset.responsibleInspector && (
              <PresetRow label="Inspektor" value={preset.responsibleInspector} />
            )}
          </div>

          <WgField
            label="Tytuł (opcjonalnie)"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploading}
            placeholder="Krótki tytuł pozycji"
            autoFocus
            controlClassName="rounded-xl h-auto py-2.5 text-sm"
            style={{ fontSize: "16px" }}
          />

          <WgField
            control="textarea"
            label="Opis *"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={uploading}
            rows={3}
            placeholder="Co do odzyskania, za co, kiedy…"
            error={!validation.ok && validation.error === "missing_description" ? validation.message : undefined}
            controlClassName="rounded-xl text-sm resize-y min-h-[4.5rem]"
            style={{ fontSize: "16px" }}
          />

          <WgField
            label="Kwota (PLN) *"
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
            error={!validation.ok && validation.error === "invalid_amount" ? validation.message : undefined}
            hint={amount > 0 ? fmtRecoverableAmount(amount) : undefined}
            controlClassName={cn(
              "rounded-xl h-auto py-2.5 text-sm",
              !validation.ok && validation.error === "invalid_amount" && "border-destructive",
            )}
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "16px" }}
          />

          <div className="flex flex-wrap gap-2">
            <HiddenFileInput
              accept="image/jpeg,image/png,image/webp,image/*,.jpg,.jpeg,.png,.webp"
              multiple
              capture="environment"
              onPick={addImages}
            >
              {(openPicker) => (
                <WgButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={openPicker}
                  disabled={uploading || pendingImages.length >= MAX_BILLING_EVIDENCE_IMAGES}
                  className={cn(WG_TOUCH_MIN, "h-11 gap-1.5 px-3 text-xs font-medium touch-manipulation")}
                >
                  <Camera size={12} /> Dodaj zdjęcia
                </WgButton>
              )}
            </HiddenFileInput>
            <HiddenFileInput accept="application/pdf,.pdf" onPick={addPdf}>
              {(openPicker) => (
                <WgButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={openPicker}
                  disabled={uploading || Boolean(pendingPdf)}
                  className={cn(WG_TOUCH_MIN, "h-11 gap-1.5 px-3 text-xs font-medium touch-manipulation")}
                >
                  <FileText size={12} /> Dodaj PDF
                </WgButton>
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
                  <WgButton
                    type="button"
                    variant="destructive"
                    size="icon"
                    disabled={uploading}
                    onClick={() => setPendingImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1.5 -right-1.5 h-[22px] w-[22px] min-h-0 min-w-0 p-0 rounded-full"
                    aria-label="Usuń zdjęcie"
                  >
                    <X size={10} />
                  </WgButton>
                </div>
              ))}
              {pendingPdf && (
                <div className="relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border bg-secondary/50 text-[10px] max-w-[160px]">
                  <FileText size={12} className="shrink-0 text-primary" />
                  <span className="truncate">{pendingPdf.name}</span>
                  <WgButton
                    type="button"
                    variant="destructive"
                    size="icon"
                    disabled={uploading}
                    onClick={() => setPendingPdf(null)}
                    className="absolute -top-1.5 -right-1.5 h-[22px] w-[22px] min-h-0 min-w-0 p-0 rounded-full"
                    aria-label="Usuń PDF"
                  >
                    <X size={10} />
                  </WgButton>
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
          <WgButton
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
            className="flex-1 h-11 rounded-xl text-sm"
          >
            Anuluj
          </WgButton>
          <WgButton
            type="button"
            variant="primary"
            onClick={() => void handleSubmit()}
            disabled={!validation.ok || uploading}
            className="flex-1 h-11 rounded-xl text-sm font-medium gap-1.5"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Wyślij do administratora
          </WgButton>
        </div>
      </div>
    </WgModalFrame>
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
