import { useState } from "react";
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
  type JobNoteAuthorRole,
} from "@/lib/job-wm";
import { ChevronRight, MessageSquare, Plus, Send, Wallet, X } from "lucide-react";

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
  /** Sprint 20.5A.4 — zapis uwagi billing (tylko kw-jobs). */
  onAddBillingNote?: (chargeId: string, text: string) => void;
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
  onAddBillingNote?: (chargeId: string, text: string) => void;
  billingNoteActorRole?: JobNoteAuthorRole;
  directory?: DirectoryEmployee[];
}) {
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const amounts = deriveChargeAmounts(charge);
  const history = [...(charge.settlements ?? [])].sort((a, b) => b.settledAt.localeCompare(a.settledAt));
  const thread = jobNotesForCharge(jobNotes, charge.id);
  const clientLabel =
    charge.clientName.trim()
    || (charge.sourceJobId && jobsById?.get(charge.sourceJobId)?.client?.trim())
    || "—";
  const isInspector = variant === "inspector";

  const submitNote = () => {
    const text = draft.trim();
    if (!text || !onAddBillingNote) return;
    onAddBillingNote(charge.id, text);
    setDraft("");
    setNoteModalOpen(false);
    setReplyOpen(false);
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
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-md p-4 space-y-3 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Zgłoś uwagę</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{chargeTitle}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-secondary min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
        <textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="Np. kwota do weryfikacji, brak materiału na fakturze…"
          rows={4}
          autoFocus
          className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none resize-none"
          style={{ fontSize: "16px" }}
        />
        <p className="text-[10px] text-muted-foreground">Uwaga trafia do administratora. Nie zmienia kwot ani statusu pozycji.</p>
        <button
          type="button"
          disabled={!draft.trim()}
          onClick={onSubmit}
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
