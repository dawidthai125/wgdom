import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Archive,
  ArchiveRestore,
  Trash2,
  MessageSquare,
  Link2,
  ScrollText,
  X,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  History,
} from "lucide-react";
import { toast } from "sonner";
import type { Job } from "@/app/app-domain";
import type { AdminSession } from "@/lib/admin-auth";
import { getAllAdminAccounts } from "@/lib/admin-auth";
import { OperationalNotesAuditPanel } from "@/app/OperationalNotesAuditPanel";
import { canAccessOperationalNotesAudit } from "@/lib/operational-notes-audit-filters";
import type { OperationalNoteAuditEntry } from "@/lib/operational-notes-audit";
import type { OperationalNoteReadReceipt } from "@/lib/operational-notes-read-state";
import {
  ackOperationalNoteWithAudit,
  isOperationalNoteAcked,
  resolveOperationalNoteReadStatus,
} from "@/lib/operational-notes-read-state";
import {
  type OperationalNote,
  filterOperationalNotesForViewer,
  resolveOperationalNoteJobLabel,
  canEditOperationalNote,
  canCommentOperationalNote,
  canArchiveOperationalNote,
  canDeleteOperationalNote,
  canToggleShareOperationalNote,
  canCreateOperationalNote,
  createOperationalNote,
  updateOperationalNoteContent,
  addOperationalNoteComment,
  archiveOperationalNote,
  restoreOperationalNote,
  setOperationalNoteShare,
  setOperationalNoteJobLink,
  deleteOperationalNoteLogical,
  applyOperationalNoteMutation,
  jobLabelForOperationalNote,
} from "@/lib/operational-notes";

type Tab = "active" | "archived";

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" });
}

export function OperationalNotesView({
  notes,
  jobs,
  session,
  auditLog,
  readState,
  onChangeReadState,
  onChangeNotes,
  onChangeAuditLog,
  onCommit,
  initialNoteId,
  onInitialNoteConsumed,
  initialCreatePreset,
  onInitialCreatePresetConsumed,
  returnNav,
}: {
  notes: OperationalNote[];
  jobs: Job[];
  session: AdminSession | null | undefined;
  auditLog: OperationalNoteAuditEntry[];
  readState: OperationalNoteReadReceipt[];
  onChangeReadState: (next: OperationalNoteReadReceipt[]) => void;
  onChangeNotes: (next: OperationalNote[]) => void;
  onChangeAuditLog: (next: OperationalNoteAuditEntry[]) => void;
  onCommit: (
    nextNotes?: OperationalNote[],
    nextAudit?: OperationalNoteAuditEntry[],
    deletedId?: string,
    nextReadState?: OperationalNoteReadReceipt[],
  ) => void;
  initialNoteId?: string | null;
  onInitialNoteConsumed?: () => void;
  initialCreatePreset?: { linkedJobId?: string; linkedJobNameSnapshot?: string; title?: string } | null;
  onInitialCreatePresetConsumed?: () => void;
  returnNav?: { label: string; onBack: () => void };
}) {
  const [tab, setTab] = useState<Tab>("active");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftShare, setDraftShare] = useState(false);
  const [draftJobId, setDraftJobId] = useState("");
  const [commentText, setCommentText] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);

  const showAuditUi = canAccessOperationalNotesAudit(session);

  const visible = useMemo(
    () => filterOperationalNotesForViewer(notes, session),
    [notes, session],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visible
      .filter((n) => (tab === "active" ? n.status === "active" : n.status === "archived"))
      .filter((n) => {
        if (!q) return true;
        const jobLabel = resolveOperationalNoteJobLabel(n, jobs).toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.authorDisplayName.toLowerCase().includes(q) ||
          jobLabel.includes(q)
        );
      });
  }, [visible, tab, search, jobs]);

  const selected = selectedId ? notes.find((n) => n.id === selectedId) ?? null : null;

  const adminAccounts = useMemo(() => getAllAdminAccounts(), []);

  const selectedReadStatus = useMemo(() => {
    if (!selected) return null;
    return resolveOperationalNoteReadStatus(selected, readState, adminAccounts);
  }, [selected, readState, adminAccounts]);

  const selectedAcked = selected && session ? isOperationalNoteAcked(selected, session.id, readState) : false;

  useEffect(() => {
    if (!initialNoteId) return;
    const note = notes.find((n) => n.id === initialNoteId);
    if (note) {
      setTab(note.status === "archived" ? "archived" : "active");
      setSelectedId(note.id);
      onInitialNoteConsumed?.();
    }
  }, [initialNoteId, notes, onInitialNoteConsumed]);

  useEffect(() => {
    if (!initialCreatePreset || !session || !canCreateOperationalNote(session)) return;
    setFormMode("create");
    setDraftTitle(initialCreatePreset.title ?? "");
    setDraftContent("");
    setDraftShare(false);
    setDraftJobId(initialCreatePreset.linkedJobId ?? "");
    onInitialCreatePresetConsumed?.();
  }, [initialCreatePreset, session, onInitialCreatePresetConsumed]);

  const applyMutation = (
    result: ReturnType<typeof createOperationalNote>,
    deletedId?: string,
    nextReadState?: OperationalNoteReadReceipt[],
  ) => {
    const applied = applyOperationalNoteMutation(notes, auditLog, result);
    onChangeNotes(applied.notes);
    onChangeAuditLog(applied.auditLog);
    if (nextReadState) onChangeReadState(nextReadState);
    onCommit(applied.notes, applied.auditLog, deletedId, nextReadState);
  };

  const handleAck = () => {
    if (!session || !selected) return;
    const { readState: nextReadState, auditLog: nextAudit } = ackOperationalNoteWithAudit(
      readState,
      auditLog,
      selected,
      session,
    );
    onChangeReadState(nextReadState);
    onChangeAuditLog(nextAudit);
    onCommit(undefined, nextAudit, undefined, nextReadState);
    toast.success("Potwierdzono przeczytanie");
  };

  const openCreate = (preset?: { linkedJobId?: string; linkedJobNameSnapshot?: string }) => {
    setFormMode("create");
    setDraftTitle("");
    setDraftContent("");
    setDraftShare(false);
    setDraftJobId(preset?.linkedJobId ?? "");
    setSelectedId(null);
  };

  const openEdit = (note: OperationalNote) => {
    setFormMode("edit");
    setDraftTitle(note.title);
    setDraftContent(note.content);
    setDraftShare(note.shareWithInspector);
    setDraftJobId(note.linkedJobId ?? "");
    setSelectedId(note.id);
  };

  const saveForm = () => {
    if (!session) return;
    const title = draftTitle.trim();
    if (!title) return;
    const job = jobs.find((j) => j.id === draftJobId);
    const jobSnapshot = job ? jobLabelForOperationalNote(job) : undefined;

    if (formMode === "create") {
      const result = createOperationalNote({
        notes,
        session,
        title,
        content: draftContent,
        linkedJobId: draftJobId || undefined,
        linkedJobNameSnapshot: jobSnapshot,
        shareWithInspector: draftShare,
      });
      const created = result.notes[0];
      const applied = applyOperationalNoteMutation(notes, auditLog, result);
      let nextAudit = applied.auditLog;
      let nextReadState = readState;
      if (created) {
        const acked = ackOperationalNoteWithAudit(readState, applied.auditLog, created, session);
        nextAudit = acked.auditLog;
        nextReadState = acked.readState;
      }
      onChangeNotes(applied.notes);
      onChangeAuditLog(nextAudit);
      onChangeReadState(nextReadState);
      onCommit(applied.notes, nextAudit, undefined, nextReadState);
      setSelectedId(created?.id ?? null);
      setFormMode(null);
      toast.success("Utworzono notatkę operacyjną");
      return;
    }

    if (formMode === "edit" && selectedId) {
      let nextNotes = notes;
      let nextAudit = auditLog;
      const contentResult = updateOperationalNoteContent({
        notes: nextNotes,
        session,
        noteId: selectedId,
        title,
        content: draftContent,
      });
      const applied1 = applyOperationalNoteMutation(nextNotes, nextAudit, contentResult);
      nextNotes = applied1.notes;
      nextAudit = applied1.auditLog;

      const existing = nextNotes.find((n) => n.id === selectedId);
      if (existing && canToggleShareOperationalNote(session) && existing.shareWithInspector !== draftShare) {
        const shareResult = setOperationalNoteShare({
          notes: nextNotes,
          session,
          noteId: selectedId,
          shareWithInspector: draftShare,
        });
        const applied2 = applyOperationalNoteMutation(nextNotes, nextAudit, shareResult);
        nextNotes = applied2.notes;
        nextAudit = applied2.auditLog;
      }

      const existing2 = nextNotes.find((n) => n.id === selectedId);
      const nextJobId = draftJobId || undefined;
      const nextSnapshot = job ? jobLabelForOperationalNote(job) : undefined;
      if (
        existing2 &&
        canEditOperationalNote(session) &&
        (existing2.linkedJobId !== nextJobId || existing2.linkedJobNameSnapshot !== nextSnapshot)
      ) {
        const linkResult = setOperationalNoteJobLink({
          notes: nextNotes,
          session,
          noteId: selectedId,
          linkedJobId: nextJobId,
          linkedJobNameSnapshot: nextSnapshot,
        });
        const applied3 = applyOperationalNoteMutation(nextNotes, nextAudit, linkResult);
        nextNotes = applied3.notes;
        nextAudit = applied3.auditLog;
      }

      onChangeNotes(nextNotes);
      onChangeAuditLog(nextAudit);
      onCommit(nextNotes, nextAudit);
      setFormMode(null);
      toast.success("Zapisano zmiany w notatce");
    }
  };

  const postComment = () => {
    if (!session || !selected) return;
    const result = addOperationalNoteComment({
      notes,
      session,
      noteId: selected.id,
      text: commentText,
    });
    if (result.auditEntries.length === 0) return;
    applyMutation(result);
    setCommentText("");
    toast.success("Dodano komentarz");
  };

  const handleArchive = (note: OperationalNote) => {
    if (!session) return;
    applyMutation(archiveOperationalNote({ notes, session, noteId: note.id }));
    if (selectedId === note.id) setTab("archived");
    toast.success("Notatka zarchiwizowana");
  };

  const handleRestore = (note: OperationalNote) => {
    if (!session) return;
    applyMutation(restoreOperationalNote({ notes, session, noteId: note.id }));
    if (selectedId === note.id) setTab("active");
    toast.success("Przywrócono notatkę");
  };

  const handleDelete = (note: OperationalNote) => {
    if (!session) return;
    if (!window.confirm(`Usunąć notatkę „${note.title}”?`)) return;
    const result = deleteOperationalNoteLogical({ notes, session, noteId: note.id });
    onChangeNotes(result.notes);
    onChangeAuditLog([...result.auditEntries, ...auditLog].slice(0, 3000));
    onCommit(result.notes, [...result.auditEntries, ...auditLog].slice(0, 3000), result.deletedId);
    if (selectedId === note.id) setSelectedId(null);
  };

  if (!session) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Zaloguj się, aby przeglądać notatki operacyjne.</div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {returnNav && (
        <div className="shrink-0 px-3 sm:px-4 md:px-5 pt-3 sm:pt-4">
          <button
            type="button"
            onClick={returnNav.onBack}
            className="flex items-center gap-2 text-sm font-medium text-primary min-h-[44px] -ml-1"
          >
            <ArrowLeft size={16} />
            Wróć do {returnNav.label}
          </button>
        </div>
      )}
    <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-0 md:gap-4 p-3 sm:p-4 md:p-5">
      <div className="md:w-80 lg:w-96 shrink-0 flex flex-col min-h-0 border border-border rounded-xl bg-card overflow-hidden">
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5 min-w-0">
              <ScrollText size={15} className="text-primary shrink-0" />
              Notatki operacyjne
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              {canCreateOperationalNote(session) && (
                <button
                  type="button"
                  onClick={() => openCreate()}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium"
                >
                  <Plus size={13} />
                  Nowa
                </button>
              )}
              {showAuditUi && (
                <button
                  type="button"
                  onClick={() => setAuditOpen(true)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 font-medium"
                >
                  <History size={13} />
                  Audyt
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            {(["active", "archived"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 text-xs py-1.5 rounded-lg font-medium ${
                  tab === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {t === "active" ? "Aktywne" : "Archiwum"}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj…"
              className="w-full pl-8 pr-3 py-2 text-sm bg-secondary rounded-lg border border-transparent focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-border">
          {filtered.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground text-center">Brak notatek w tej sekcji.</p>
          ) : (
            filtered.map((note) => {
              const acked = session ? isOperationalNoteAcked(note, session.id, readState) : true;
              return (
              <button
                key={note.id}
                type="button"
                onClick={() => {
                  setSelectedId(note.id);
                  setFormMode(null);
                }}
                className={`w-full text-left p-3 hover:bg-secondary/60 transition-colors ${
                  selectedId === note.id ? "bg-primary/10" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium truncate flex-1">{note.title || "Bez tytułu"}</p>
                  <span
                    className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      acked ? "text-muted-foreground bg-secondary/80" : "text-amber-400 bg-amber-500/15"
                    }`}
                  >
                    {acked ? "Przeczytana" : "Nieprzeczytana"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {note.authorDisplayName} · {fmtDate(note.lastActivityAt)}
                </p>
                {note.linkedJobId && (
                  <p className="text-[10px] text-primary/80 mt-1 truncate flex items-center gap-1">
                    <Link2 size={10} />
                    {resolveOperationalNoteJobLabel(note, jobs)}
                  </p>
                )}
              </button>
            );
            })
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 min-w-0 border border-border rounded-xl bg-card overflow-hidden flex flex-col mt-3 md:mt-0">
        {formMode ? (
          <div className="p-4 space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{formMode === "create" ? "Nowa notatka" : "Edycja notatki"}</h3>
              <button type="button" onClick={() => setFormMode(null)} className="p-1 rounded hover:bg-secondary">
                <X size={16} />
              </button>
            </div>
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Tytuł"
              className="w-full px-3 py-2 text-sm bg-secondary rounded-lg border border-transparent focus:border-primary focus:outline-none"
            />
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="Treść notatki operacyjnej…"
              rows={8}
              className="w-full px-3 py-2 text-sm bg-secondary rounded-lg border border-transparent focus:border-primary focus:outline-none resize-y min-h-[120px]"
            />
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Powiązana robota (opcjonalnie)</label>
              <select
                value={draftJobId}
                onChange={(e) => setDraftJobId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-secondary rounded-lg border border-transparent focus:border-primary focus:outline-none"
              >
                <option value="">— Globalna (bez roboty) —</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {jobLabelForOperationalNote(j)}
                  </option>
                ))}
              </select>
            </div>
            {canToggleShareOperationalNote(session) && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={draftShare}
                  onChange={(e) => setDraftShare(e.target.checked)}
                  className="rounded"
                />
                Udostępnij inspektorowi
              </label>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={saveForm}
                disabled={!draftTitle.trim()}
                className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
              >
                Zapisz
              </button>
              <button type="button" onClick={() => setFormMode(null)} className="text-sm px-4 py-2 rounded-lg bg-secondary">
                Anuluj
              </button>
            </div>
          </div>
        ) : selected ? (
          <div className="flex flex-col min-h-0 flex-1">
            <div className="p-4 border-b border-border space-y-2 shrink-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold">{selected.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selected.authorDisplayName} · Wersja {selected.contentRev} · {fmtDate(selected.lastActivityAt)}
                  </p>
                  {selected.linkedJobId && (
                    <p className="text-xs text-primary mt-1 flex items-center gap-1">
                      <Link2 size={12} />
                      {resolveOperationalNoteJobLabel(selected, jobs)}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {canEditOperationalNote(session) && (
                    <button
                      type="button"
                      onClick={() => openEdit(selected)}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80"
                    >
                      Edytuj
                    </button>
                  )}
                  {selected.status === "active" && canArchiveOperationalNote(session) && (
                    <button
                      type="button"
                      onClick={() => handleArchive(selected)}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center gap-1"
                    >
                      <Archive size={12} /> Archiwizuj
                    </button>
                  )}
                  {selected.status === "archived" && canArchiveOperationalNote(session) && (
                    <button
                      type="button"
                      onClick={() => handleRestore(selected)}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center gap-1"
                    >
                      <ArchiveRestore size={12} /> Przywróć
                    </button>
                  )}
                  {canDeleteOperationalNote(session) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(selected)}
                      className="text-xs px-2.5 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Usuń
                    </button>
                  )}
                </div>
              </div>
              {canToggleShareOperationalNote(session) && (
                <button
                  type="button"
                  onClick={() => {
                    applyMutation(
                      setOperationalNoteShare({
                        notes,
                        session,
                        noteId: selected.id,
                        shareWithInspector: !selected.shareWithInspector,
                      }),
                    );
                  }}
                  className="text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  {selected.shareWithInspector ? <Eye size={12} /> : <EyeOff size={12} />}
                  {selected.shareWithInspector ? "Widoczna dla inspektora" : "Ukryta przed inspektorem"}
                </button>
              )}
              {!selectedAcked && (
                <button
                  type="button"
                  onClick={handleAck}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-primary text-primary-foreground min-h-[44px] w-full sm:w-auto justify-center"
                >
                  <CheckCircle2 size={14} />
                  Potwierdzam przeczytanie
                </button>
              )}
              {selectedAcked && (
                <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  Przeczytano (wersja {selected.contentRev})
                </p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{selected.content || "—"}</div>

              {selectedReadStatus && (
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Status przeczytania
                  </p>
                  {selectedReadStatus.read.length > 0 && (
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">Przeczytali:</p>
                      <ul className="text-sm space-y-0.5">
                        {selectedReadStatus.read.map((entry) => (
                          <li key={entry.userId} className="flex items-center gap-1.5 text-emerald-400/90">
                            <CheckCircle2 size={12} className="shrink-0" />
                            {entry.displayName}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedReadStatus.unread.length > 0 && (
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">Nie przeczytali:</p>
                      <ul className="text-sm space-y-0.5">
                        {selectedReadStatus.unread.map((entry) => (
                          <li key={entry.userId} className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="text-amber-400">•</span>
                            {entry.displayName}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedReadStatus.read.length === 0 && selectedReadStatus.unread.length === 0 && (
                    <p className="text-xs text-muted-foreground">Brak odbiorców w audience tej notatki.</p>
                  )}
                </div>
              )}

              {selected.revisions.length > 0 && (
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Historia treści</p>
                  {[...selected.revisions].reverse().slice(0, 5).map((rev) => (
                    <div key={rev.id} className="text-xs border-t border-border pt-2 first:border-0 first:pt-0">
                      <p className="text-muted-foreground">
                        Wersja {rev.contentRev} · {rev.changedByDisplayName} · {fmtDate(rev.changedAt)}
                      </p>
                      <p className="mt-1 text-muted-foreground line-clamp-3 whitespace-pre-wrap">{rev.previousContent}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="border border-border rounded-lg p-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <MessageSquare size={12} /> Komentarze ({selected.comments.length})
                </p>
                {selected.comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Brak komentarzy.</p>
                ) : (
                  selected.comments.map((c) => (
                    <div key={c.id} className="text-sm border-t border-border pt-2 first:border-0 first:pt-0">
                      <p className="text-[11px] text-muted-foreground mb-0.5">
                        {c.authorDisplayName} · {fmtDate(c.createdAt)}
                      </p>
                      <p className="whitespace-pre-wrap">{c.text}</p>
                    </div>
                  ))
                )}
                {canCommentOperationalNote(selected, session) && (
                  <div className="flex gap-2 pt-1">
                    <input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Dodaj komentarz…"
                      className="flex-1 px-3 py-2 text-sm bg-secondary rounded-lg border border-transparent focus:border-primary focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          postComment();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={postComment}
                      disabled={!commentText.trim()}
                      className="text-xs px-3 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                    >
                      Wyślij
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-sm text-muted-foreground text-center">
            Wybierz notatkę z listy lub utwórz nową.
          </div>
        )}
      </div>
    </div>
      {showAuditUi && (
        <OperationalNotesAuditPanel
          auditLog={auditLog}
          session={session}
          open={auditOpen}
          onOpenChange={setAuditOpen}
          initialNoteId={selectedId}
        />
      )}
    </div>
  );
}
