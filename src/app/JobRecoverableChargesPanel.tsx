import { useEffect, useMemo, useState } from "react";
import type { RecoverableCharge } from "@/lib/recoverable-charges";
import {
  JOB_RECOVERABLE_CHARGES_LIST_LIMIT,
  deriveChargeAmounts,
  fmtRecoverableAmount,
  formatRecoverableChargeDate,
  getRecoverableChargeJobStats,
  getRecoverableChargesForJob,
  getRecoverableChargesRecoveredOnJob,
  recoverableChargeDescriptionLine,
  recoverableChargeStatusLabel,
  settlementTargetJobLabel,
  type RecoverableChargeJobStats,
} from "@/lib/recoverable-charges";
import { parseSettlementNote } from "@/app/SettleChargeModal";
import { AuthorAttribution } from "@/app/AuthorAttribution";
import type { DirectoryEmployee } from "@/app/app-domain";
import {
  jobNotesForCharge,
  type JobNote,
  type JobNoteAttachment,
  type JobNoteAuthorRole,
} from "@/lib/job-wm";
import {
  MAX_BILLING_EVIDENCE_IMAGES,
  MAX_BILLING_EVIDENCE_PDFS,
  validateBillingEvidenceFile,
} from "@/lib/billing-evidence-upload";
import { HiddenFileInput } from "@/app/HiddenFileInput";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { ChevronRight, Camera, FileText, Loader2, MessageSquare, Plus, Send, Wallet, X } from "lucide-react";

/** Pliki oczekujące na upload przy wysyłce uwagi billing (Sprint 20.5A.5). */
export type BillingNotePendingFiles = {
  images: File[];
  pdf: File | null;
};

type JobLookup = Pick<import("@/app/app-domain").Job, "id" | "address" | "flatNumber" | "client">;

export type JobRecoverableChargesVariant = "admin" | "inspector";

/** Inspektor: badge 💰 gdy są nierozliczone pozycje (Sprint 20.5A.3A). */
export function inspectorRecoverableBadgeVisible(stats: RecoverableChargeJobStats): boolean {
  return stats.unsettledCount > 0;
}

export function JobRecoverableChargesPanel({
  jobId,
  charges,
  jobNotes,
  onOpenCharge,
  onCreateCharge,
  onAddBillingNote,
  billingNoteActorName,
  billingNoteActorRole,
  directory,
  variant = "admin",
  jobsById,
}: {
  jobId: string;
  charges: RecoverableCharge[];
  jobNotes?: JobNote[];
  onOpenCharge?: (chargeId: string) => void;
  onCreateCharge?: () => void;
  /** Sprint 20.5A.4/5 — zapis uwagi billing (tylko kw-jobs). */
  onAddBillingNote?: (chargeId: string, text: string, files?: BillingNotePendingFiles) => void | Promise<void>;
  billingNoteActorName?: string;
  billingNoteActorRole?: JobNoteAuthorRole;
  directory?: DirectoryEmployee[];
  variant?: JobRecoverableChargesVariant;
  jobsById?: Map<string, JobLookup>;
}) {
  const isInspector = variant === "inspector";
  const canAddBillingNote = Boolean(onAddBillingNote && billingNoteActorName && billingNoteActorRole);
  const stats = getRecoverableChargeJobStats(charges, jobId);
  const sourceCharges = getRecoverableChargesForJob(charges, jobId);
  const recoveredRows = getRecoverableChargesRecoveredOnJob(charges, jobId);
  const sourcePreview = sourceCharges.slice(0, JOB_RECOVERABLE_CHARGES_LIST_LIMIT);
  const sourceOverflow = Math.max(0, sourceCharges.length - JOB_RECOVERABLE_CHARGES_LIST_LIMIT);
  const recoveredPreview = recoveredRows.slice(0, JOB_RECOVERABLE_CHARGES_LIST_LIMIT);
  const recoveredOverflow = Math.max(0, recoveredRows.length - JOB_RECOVERABLE_CHARGES_LIST_LIMIT);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Wallet size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
            💰 Do rozliczenia
          </span>
        </div>
        {!isInspector && onCreateCharge && (
          <button
            type="button"
            onClick={onCreateCharge}
            className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
          >
            <Plus size={12} />
            Dodaj do rozliczenia
          </button>
        )}
      </div>

      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-border/60">
        {isInspector ? (
          <>
            <Kpi label="Pozycji" value={String(stats.chargeCount)} />
            <Kpi label="Nierozliczone" value={String(stats.unsettledCount)} warn={stats.unsettledCount > 0} />
            <Kpi label="Do odzyskania" value={fmtRecoverableAmount(stats.toRecoverAmount)} accent />
            <Kpi label="Odzyskano" value={fmtRecoverableAmount(stats.recoveredAmount)} />
          </>
        ) : (
          <>
            <Kpi label="Do odzyskania" value={fmtRecoverableAmount(stats.toRecoverAmount)} accent />
            <Kpi label="Pozycji" value={String(stats.chargeCount)} />
            <Kpi label="Odzyskano" value={fmtRecoverableAmount(stats.recoveredAmount)} />
            <Kpi label="Alerty" value={String(stats.alertCount)} warn={stats.alertCount > 0} />
          </>
        )}
      </div>

      {sourcePreview.length > 0 && (
        <div className="px-5 py-3 border-b border-border/60 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pozycje źródłowe
          </p>
          {sourcePreview.map((charge) => (
            <ChargeReviewCard
              key={charge.id}
              charge={charge}
              jobsById={jobsById}
              jobNotes={jobNotes}
              variant={variant}
              onOpenCharge={onOpenCharge}
              canAddBillingNote={canAddBillingNote}
              onAddBillingNote={onAddBillingNote}
              billingNoteActorRole={billingNoteActorRole}
              directory={directory}
            />
          ))}
          {sourceOverflow > 0 && (
            <p className="text-[10px] text-muted-foreground">+ {sourceOverflow} kolejnych</p>
          )}
        </div>
      )}

      {recoveredPreview.length > 0 && (
        <div className="px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Rozliczenia na tej robocie
          </p>
          {isInspector ? (
            <ul className="space-y-2">
              {recoveredPreview.map((row) => (
                <li
                  key={row.chargeId}
                  className="bg-secondary/30 rounded-xl px-3 py-2.5 text-xs"
                >
                  <p className="font-medium truncate">{row.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Odzyskano {fmtRecoverableAmount(row.recoveredAmount)} · {formatRecoverableChargeDate(row.lastSettledAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="divide-y divide-border/60">
              {recoveredPreview.map((row) => (
                <li key={row.chargeId}>
                  <button
                    type="button"
                    onClick={() => onOpenCharge?.(row.chargeId)}
                    disabled={!onOpenCharge}
                    className="w-full text-left py-2.5 flex items-center gap-2 hover:bg-secondary/30 rounded-lg px-1 -mx-1 transition-colors disabled:cursor-default disabled:hover:bg-transparent group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{row.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Odzyskano {fmtRecoverableAmount(row.recoveredAmount)} ·{" "}
                        {formatRecoverableChargeDate(row.lastSettledAt)}
                      </p>
                    </div>
                    {onOpenCharge && (
                      <ChevronRight
                        size={12}
                        className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {recoveredOverflow > 0 && (
            <p className="text-[10px] text-muted-foreground mt-2">+ {recoveredOverflow} kolejnych</p>
          )}
        </div>
      )}

      {stats.chargeCount === 0 && stats.recoveredCount === 0 && (
        <p className="px-5 py-4 text-xs text-muted-foreground">
          {isInspector
            ? "Brak pozycji powiązanych z tą robotą."
            : "Brak pozycji powiązanych z tą robotą — dodaj pierwszą pozycję do odzyskania."}
        </p>
      )}
    </div>
  );
}

function chargeDisplayTitle(charge: RecoverableCharge): string {
  return charge.title.trim() || recoverableChargeDescriptionLine(charge) || "Pozycja";
}

function ChargeReviewCard({
  charge,
  jobsById,
  jobNotes,
  variant,
  onOpenCharge,
  canAddBillingNote,
  onAddBillingNote,
  billingNoteActorRole,
  directory,
}: {
  charge: RecoverableCharge;
  jobsById?: Map<string, JobLookup>;
  jobNotes?: JobNote[];
  variant: JobRecoverableChargesVariant;
  onOpenCharge?: (chargeId: string) => void;
  canAddBillingNote: boolean;
  onAddBillingNote?: (chargeId: string, text: string, files?: BillingNotePendingFiles) => void | Promise<void>;
  billingNoteActorRole?: JobNoteAuthorRole;
  directory?: DirectoryEmployee[];
}) {
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [previewItem, setPreviewItem] = useState<InspectorFileItem | null>(null);
  const amounts = deriveChargeAmounts(charge);
  const history = [...(charge.settlements ?? [])].sort((a, b) => b.settledAt.localeCompare(a.settledAt));
  const thread = jobNotesForCharge(jobNotes, charge.id);
  const clientLabel =
    charge.clientName.trim()
    || (charge.sourceJobId && jobsById?.get(charge.sourceJobId)?.client?.trim())
    || "—";
  const isInspector = variant === "inspector";

  const submitNote = async (files?: BillingNotePendingFiles) => {
    const text = draft.trim();
    if (!text || !onAddBillingNote) return;
    await Promise.resolve(onAddBillingNote(charge.id, text, files));
    setDraft("");
    setNoteModalOpen(false);
    setReplyOpen(false);
  };

  const openAttachmentPreview = (attachment: JobNoteAttachment) => {
    setPreviewItem({
      kind: "imageUrl",
      url: attachment.publicUrl,
      filename: attachment.filename,
    });
  };

  return (
    <div className="bg-secondary/25 border border-border/60 rounded-xl p-3 space-y-2.5 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">
            {chargeDisplayTitle(charge)}
          </p>
          {charge.description.trim() && charge.title.trim() && (
            <p className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap break-words">{charge.description.trim()}</p>
          )}
        </div>
        {!isInspector && onOpenCharge && (
          <button
            type="button"
            onClick={() => onOpenCharge(charge.id)}
            className="shrink-0 text-[10px] text-primary hover:underline flex items-center gap-0.5"
          >
            Moduł <ChevronRight size={10} />
          </button>
        )}
      </div>
      <p className="text-[10px]">{recoverableChargeStatusLabel(amounts.status, true)}</p>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <span><span className="text-muted-foreground">Klient: </span>{clientLabel}</span>
        <span><span className="text-muted-foreground">Utworzono: </span>{formatRecoverableChargeDate(charge.createdAt)}</span>
        <span><span className="text-muted-foreground">Zmiana: </span>{formatRecoverableChargeDate(charge.updatedAt)}</span>
        {charge.responsibleInspector.trim() && (
          <span><span className="text-muted-foreground">Inspektor: </span>{charge.responsibleInspector}</span>
        )}
      </div>
      <div className="bg-card/80 rounded-lg p-2.5 space-y-1.5 border border-border/40">
        <AmountLine label="Kwota pierwotna" value={fmtRecoverableAmount(charge.amount)} />
        <AmountLine label="Rozliczono" value={fmtRecoverableAmount(amounts.amountSettled)} />
        <AmountLine label="Pozostało" value={fmtRecoverableAmount(amounts.amountRemaining)} emphasis />
      </div>

      {history.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-border/50">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Historia rozliczeń</p>
          {history.map((s) => {
            const { typeLabel, userNote } = parseSettlementNote(s.note);
            const targetLabel = settlementTargetJobLabel(s, jobsById);
            return (
              <div key={s.id} className="bg-card/60 rounded-lg p-2.5 space-y-1 border border-border/30">
                <p className="font-semibold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatRecoverableChargeDate(s.settledAt)} · {fmtRecoverableAmount(s.amount)}
                </p>
                {s.targetJobId && (
                  <p><span className="text-muted-foreground">Robota docelowa: </span>{targetLabel}</p>
                )}
                <p><span className="text-muted-foreground">Rozliczył: </span>{s.settledBy || "—"}</p>
                {s.onBehalfOf && (
                  <p><span className="text-muted-foreground">Na podstawie: </span>{s.onBehalfOf}</p>
                )}
                {typeLabel && (
                  <p><span className="text-muted-foreground">Typ: </span>{typeLabel}</p>
                )}
                {userNote && (
                  <p className="text-muted-foreground whitespace-pre-wrap break-words">{userNote}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2 pt-1 border-t border-border/50">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <MessageSquare size={11} />
            Uwagi do pozycji
            {thread.length > 0 && (
              <span className="bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-bold">
                {thread.length}
              </span>
            )}
          </p>
          {canAddBillingNote && isInspector && (
            <button
              type="button"
              onClick={() => { setDraft(""); setNoteModalOpen(true); }}
              className="text-[10px] font-medium text-primary hover:underline touch-manipulation min-h-[32px] px-1"
            >
              Zgłoś uwagę
            </button>
          )}
        </div>
        {thread.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">Brak uwag — inspektor może zgłosić doprecyzowanie bez zmiany kwot.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto overscroll-contain">
            {[...thread].reverse().map((n) => (
              <div key={n.id} className="bg-card/60 rounded-lg px-2.5 py-2 border border-border/30">
                <p className="text-[10px]">
                  <AuthorAttribution
                    name={n.author}
                    noteRole={n.authorRole}
                    directory={directory}
                    accentClass={n.authorRole === "inspector" ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-primary font-medium"}
                  />
                  <span className="text-muted-foreground">
                    {" · "}
                    {new Date(n.at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </p>
                <p className="text-xs mt-1 whitespace-pre-wrap break-words">{n.text}</p>
                {n.attachments && n.attachments.length > 0 && (
                  <BillingNoteAttachmentStrip
                    attachments={n.attachments}
                    onPreview={openAttachmentPreview}
                  />
                )}
              </div>
            ))}
          </div>
        )}
        {canAddBillingNote && !isInspector && (
          <div className="space-y-2">
            {!replyOpen ? (
              <button
                type="button"
                onClick={() => { setDraft(""); setReplyOpen(true); }}
                className="text-[10px] font-medium text-primary hover:underline touch-manipulation"
              >
                Odpowiedz inspektorowi
              </button>
            ) : (
              <BillingNoteComposer
                draft={draft}
                onDraftChange={setDraft}
                onSubmit={submitNote}
                onCancel={() => { setReplyOpen(false); setDraft(""); }}
                placeholder="Odpowiedź dla inspektora (bez zmiany kwot)…"
                submitLabel="Wyślij odpowiedź"
              />
            )}
          </div>
        )}
      </div>

      {noteModalOpen && (
        <BillingNoteModal
          chargeTitle={chargeDisplayTitle(charge)}
          draft={draft}
          onDraftChange={setDraft}
          onSubmit={submitNote}
          onClose={() => { setNoteModalOpen(false); setDraft(""); }}
        />
      )}

      {previewItem && (
        <JobFilePreviewModal
          item={previewItem}
          athPreviewEnabled={false}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
}

function BillingNoteAttachmentStrip({
  attachments,
  onPreview,
}: {
  attachments: JobNoteAttachment[];
  onPreview: (attachment: JobNoteAttachment) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-2" data-billing-evidence-preview>
      {attachments.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onPreview(a)}
          className="shrink-0 rounded-lg border border-border/60 overflow-hidden hover:ring-2 hover:ring-primary/40 touch-manipulation min-h-[44px]"
          title={a.filename}
        >
          {a.kind === "image" ? (
            <span className="flex items-center gap-1.5 px-2 py-1.5 text-[10px]">
              <Camera size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <img
                src={a.publicUrl}
                alt=""
                className="h-10 w-10 object-cover rounded"
              />
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-2 text-[10px] font-medium max-w-[140px]">
              <FileText size={12} className="text-primary shrink-0" />
              <span className="truncate">{a.filename}</span>
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function BillingNoteComposer({
  draft,
  onDraftChange,
  onSubmit,
  onCancel,
  placeholder,
  submitLabel,
}: {
  draft: string;
  onDraftChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  placeholder: string;
  submitLabel: string;
}) {
  return (
    <div className="space-y-2 border-t border-border/40 pt-2">
      <textarea
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none resize-none"
        style={{ fontSize: "16px" }}
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!draft.trim()}
          onClick={onSubmit}
          className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 touch-manipulation"
        >
          <Send size={12} /> {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 min-h-[44px] rounded-lg bg-secondary text-xs text-muted-foreground touch-manipulation"
        >
          Anuluj
        </button>
      </div>
    </div>
  );
}

function BillingNoteModal({
  chargeTitle,
  draft,
  onDraftChange,
  onSubmit,
  onClose,
}: {
  chargeTitle: string;
  draft: string;
  onDraftChange: (v: string) => void;
  onSubmit: (files?: BillingNotePendingFiles) => void | Promise<void>;
  onClose: () => void;
}) {
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [pendingPdf, setPendingPdf] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pickError, setPickError] = useState("");

  const imageThumbUrls = useMemo(
    () => pendingImages.map((f) => URL.createObjectURL(f)),
    [pendingImages],
  );

  useEffect(() => () => {
    for (const url of imageThumbUrls) URL.revokeObjectURL(url);
  }, [imageThumbUrls]);

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
    if (!draft.trim() || uploading) return;
    setUploading(true);
    setPickError("");
    try {
      const files: BillingNotePendingFiles | undefined =
        pendingImages.length > 0 || pendingPdf
          ? { images: pendingImages, pdf: pendingPdf }
          : undefined;
      await Promise.resolve(onSubmit(files));
      setPendingImages([]);
      setPendingPdf(null);
    } catch {
      setPickError("Nie udało się wysłać uwagi. Sprawdź połączenie i spróbuj ponownie.");
    } finally {
      setUploading(false);
    }
  };

  const canSubmit = Boolean(draft.trim()) && !uploading;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50" onClick={uploading ? undefined : onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-md p-4 space-y-3 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        data-billing-evidence-modal
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Zgłoś uwagę</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{chargeTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="p-2 rounded-lg hover:bg-secondary min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>
        <textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="Np. kwota do weryfikacji, brak materiału na fakturze…"
          rows={4}
          autoFocus
          disabled={uploading}
          className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none resize-none disabled:opacity-60"
          style={{ fontSize: "16px" }}
        />
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
                data-billing-add-photos
              >
                <Camera size={12} /> Dodaj zdjęcia
              </button>
            )}
          </HiddenFileInput>
          <HiddenFileInput
            accept="application/pdf,.pdf"
            onPick={addPdf}
          >
            {(open) => (
              <button
                type="button"
                onClick={open}
                disabled={uploading || Boolean(pendingPdf) || MAX_BILLING_EVIDENCE_PDFS < 1}
                className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg bg-secondary text-xs font-medium touch-manipulation disabled:opacity-40"
                data-billing-add-pdf
              >
                <FileText size={12} /> Dodaj PDF
              </button>
            )}
          </HiddenFileInput>
        </div>
        {(pendingImages.length > 0 || pendingPdf) && (
          <div className="flex flex-wrap gap-2" data-billing-evidence-thumbs>
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
        {pickError && (
          <p className="text-[10px] text-destructive">{pickError}</p>
        )}
        <p className="text-[10px] text-muted-foreground">
          Do {MAX_BILLING_EVIDENCE_IMAGES} zdjęć i 1 PDF (max 8 MB każdy). Uwaga trafia do administratora — bez zmiany kwot.
        </p>
        {uploading && (
          <p className="text-xs text-primary flex items-center gap-2" data-billing-uploading>
            <Loader2 size={14} className="animate-spin shrink-0" />
            Wgrywanie dowodów…
          </p>
        )}
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 touch-manipulation"
        >
          <Send size={14} /> Wyślij uwagę
        </button>
      </div>
    </div>
  );
}

function AmountLine({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`tabular-nums ${emphasis ? "font-bold text-primary" : "font-semibold"}`}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {value}
      </span>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p
        className={`text-sm font-semibold tabular-nums ${
          warn ? "text-amber-600 dark:text-amber-400" : accent ? "text-primary" : "text-foreground"
        }`}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {value}
      </p>
    </div>
  );
}
