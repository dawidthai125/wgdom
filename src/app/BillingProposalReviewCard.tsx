import { useState } from "react";
import { Camera, Check, FileText, X } from "lucide-react";
import type { AdminRole } from "@/lib/admin-auth";
import { AuthorAttribution } from "@/app/AuthorAttribution";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import type { DirectoryEmployee } from "@/app/app-domain";
import { fmtRecoverableAmount, formatRecoverableChargeDate } from "@/lib/recoverable-charges";
import {
  BILLING_PROPOSAL_STATUS_LABELS,
  billingProposalDisplayTitle,
  type JobNote,
  type JobNoteAttachment,
  normalizeBillingProposalNote,
} from "@/lib/job-wm";

function proposalStatusEmoji(status: JobNote["proposalStatus"]): string {
  if (status === "approved") return "🟢";
  if (status === "rejected") return "🔴";
  return "🟡";
}

function ProposalAttachmentStrip({
  attachments,
  onPreview,
}: {
  attachments: JobNoteAttachment[];
  onPreview: (attachment: JobNoteAttachment) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
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
              <img src={a.publicUrl} alt="" className="h-10 w-10 object-cover rounded" />
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

export function BillingProposalReviewCard({
  proposal,
  directory,
  variant,
  viewerRole,
  onApprove,
  onReject,
  onOpenCharge,
}: {
  proposal: JobNote;
  directory?: DirectoryEmployee[];
  variant: "inspector" | "admin";
  viewerRole: AdminRole;
  onApprove?: (proposalId: string) => void;
  onReject?: (proposalId: string, reason: string) => void;
  onOpenCharge?: (chargeId: string) => void;
}) {
  const [previewItem, setPreviewItem] = useState<InspectorFileItem | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectDraft, setRejectDraft] = useState("");
  const note = normalizeBillingProposalNote(proposal);
  const isAdmin = variant === "admin";
  const isPending = note.proposalStatus === "pending";

  const openAttachmentPreview = (attachment: JobNoteAttachment) => {
    setPreviewItem({
      kind: "imageUrl",
      url: attachment.publicUrl,
      filename: attachment.filename,
    });
  };

  const submitReject = () => {
    const reason = rejectDraft.trim();
    if (!reason || !onReject) return;
    onReject(note.id, reason);
    setRejectOpen(false);
    setRejectDraft("");
  };

  return (
    <div className="bg-secondary/25 border border-border/60 rounded-xl p-3 space-y-2.5 text-xs" data-billing-proposal-card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{billingProposalDisplayTitle(note)}</p>
          {note.text.trim() && note.proposalTitle?.trim() && (
            <p className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap break-words">{note.text.trim()}</p>
          )}
        </div>
        <span className="text-[10px] shrink-0">
          {proposalStatusEmoji(note.proposalStatus)}{" "}
          {BILLING_PROPOSAL_STATUS_LABELS[note.proposalStatus ?? "pending"]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <span>
          <span className="text-muted-foreground">Kwota: </span>
          <span className="font-semibold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {fmtRecoverableAmount(note.proposalAmount ?? 0)}
          </span>
        </span>
        <span>
          <span className="text-muted-foreground">Zgłoszono: </span>
          {formatRecoverableChargeDate(note.at)}
        </span>
        <span className="col-span-2">
          <AuthorAttribution
            name={note.author}
            noteRole={note.authorRole}
            directory={directory}
            viewerRole={viewerRole}
            accentClass="text-emerald-600 dark:text-emerald-400 font-medium"
          />
        </span>
        {note.reviewedBy && note.reviewedAt && (
          <span className="col-span-2 text-muted-foreground">
            Decyzja: {note.reviewedBy} · {new Date(note.reviewedAt).toLocaleString("pl-PL", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {note.proposalStatus === "rejected" && note.rejectedReason && (
        <p className="text-[11px] text-destructive/90 bg-destructive/5 rounded-lg px-2.5 py-2">
          Powód odrzucenia: {note.rejectedReason}
        </p>
      )}

      {note.proposalStatus === "approved" && note.approvedChargeId && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground">Utworzono pozycję w rejestrze.</span>
          {onOpenCharge && (
            <button
              type="button"
              onClick={() => onOpenCharge(note.approvedChargeId!)}
              className="text-[10px] text-primary hover:underline"
            >
              Otwórz pozycję →
            </button>
          )}
        </div>
      )}

      {note.attachments && note.attachments.length > 0 && (
        <ProposalAttachmentStrip attachments={note.attachments} onPreview={openAttachmentPreview} />
      )}

      {isAdmin && isPending && onApprove && onReject && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
          {!rejectOpen ? (
            <>
              <button
                type="button"
                onClick={() => onApprove(note.id)}
                className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-xs font-medium touch-manipulation"
              >
                <Check size={12} /> Zatwierdź i utwórz pozycję
              </button>
              <button
                type="button"
                onClick={() => { setRejectDraft(""); setRejectOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg bg-secondary text-xs font-medium touch-manipulation"
              >
                <X size={12} /> Odrzuć
              </button>
            </>
          ) : (
            <div className="w-full space-y-2">
              <textarea
                value={rejectDraft}
                onChange={(e) => setRejectDraft(e.target.value)}
                placeholder="Powód odrzucenia dla inspektora…"
                rows={2}
                className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none resize-none"
                style={{ fontSize: "16px" }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!rejectDraft.trim()}
                  onClick={submitReject}
                  className="px-3 py-2 min-h-[44px] rounded-lg bg-destructive text-destructive-foreground text-xs font-medium disabled:opacity-40"
                >
                  Potwierdź odrzucenie
                </button>
                <button
                  type="button"
                  onClick={() => setRejectOpen(false)}
                  className="px-3 py-2 min-h-[44px] rounded-lg bg-secondary text-xs text-muted-foreground"
                >
                  Anuluj
                </button>
              </div>
            </div>
          )}
        </div>
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
