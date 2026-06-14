import { Plus, ScrollText, ExternalLink } from "lucide-react";
import type { Job } from "@/app/app-domain";
import type { AdminSession } from "@/lib/admin-auth";
import {
  type OperationalNote,
  filterOperationalNotesForJob,
  jobLabelForOperationalNote,
} from "@/lib/operational-notes";
import type { OperationalNoteReadReceipt } from "@/lib/operational-notes-read-state";
import { isOperationalNoteAcked } from "@/lib/operational-notes-read-state";

function fmtDateShort(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pl-PL");
}

export function JobOperationalNotesPanel({
  job,
  notes,
  session,
  readState = [],
  onOpenNote,
  onCreateNote,
  onOpenModule,
}: {
  job: Job;
  notes: OperationalNote[];
  session: AdminSession | null | undefined;
  readState?: OperationalNoteReadReceipt[];
  onOpenNote: (noteId: string) => void;
  onCreateNote: () => void;
  onOpenModule: () => void;
}) {
  const linked = filterOperationalNotesForJob(notes, job.id, session).filter((n) => n.status === "active");

  return (
    <div className="bg-card rounded-xl border border-border p-4 md:p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <ScrollText size={14} className="text-primary shrink-0" />
            Notatki operacyjne
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Baza wiedzy operacyjnej — osobno od notatek WM i uwag wewnętrznych roboty.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateNote}
          className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-primary/90 hover:bg-primary text-primary-foreground font-medium"
        >
          <Plus size={12} />
          Nowa notatka
        </button>
      </div>

      {linked.length === 0 ? (
        <p className="text-xs text-muted-foreground">Brak aktywnych notatek przypisanych do tej roboty.</p>
      ) : (
        <ul className="space-y-2">
          {linked.slice(0, 8).map((note) => {
            const unread = session ? !isOperationalNoteAcked(note, session.id, readState) : false;
            return (
            <li key={note.id}>
              <button
                type="button"
                onClick={() => onOpenNote(note.id)}
                className="w-full text-left rounded-lg border border-border px-3 py-2 hover:bg-secondary/60 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {unread && <span className="shrink-0 w-2 h-2 rounded-full bg-amber-400" title="Nieprzeczytana" />}
                  <p className="text-sm font-medium truncate flex-1">{note.title}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {note.authorDisplayName} · {fmtDateShort(note.lastActivityAt)}
                  {note.comments.length > 0 ? ` · ${note.comments.length} kom.` : ""}
                </p>
              </button>
            </li>
          );
          })}
          {linked.length > 8 && (
            <p className="text-[10px] text-muted-foreground">+ {linked.length - 8} więcej w module Notatki operacyjne</p>
          )}
        </ul>
      )}

      <button
        type="button"
        onClick={onOpenModule}
        className="text-xs text-primary flex items-center gap-1 hover:underline"
      >
        <ExternalLink size={11} />
        Otwórz moduł Notatki operacyjne
      </button>
    </div>
  );
}

export function operationalNoteCreatePresetForJob(job: Job) {
  return {
    linkedJobId: job.id,
    linkedJobNameSnapshot: jobLabelForOperationalNote(job),
  };
}
