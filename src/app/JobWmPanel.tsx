import { useState } from "react";
import {
  Calendar, MessageSquare, Camera, Upload, Send, ChevronRight,
} from "lucide-react";
import { uploadInspectorPhoto } from "@/lib/job-photo-upload";
import { appendJobActivity } from "@/lib/job-activity";
import { InspectorHint } from "@/app/InspectorHelp";
import {
  HANDOVER_STAGES,
  HANDOVER_STAGE_LABELS,
  HANDOVER_STAGE_HINTS,
  stageBadgeClass,
  fmtPlannedHandover,
  plannedHandoverStatus,
  applyHandoverStageToJob,
  inferHandoverStage,
  type JobHandoverStage,
  type JobNoteAuthorRole,
  type JobWmJob,
  type InspectorPhotoEntry,
} from "@/lib/job-wm";
import type { RoleContactPhones } from "@/lib/app-settings";
import { AuthorAttribution } from "@/app/AuthorAttribution";

export type JobWmJobMutable = JobWmJob & {
  activityLog?: import("@/lib/job-activity").JobActivity[];
};

type JobWmPanelProps = {
  job: JobWmJobMutable;
  onUpdate: (job: JobWmJobMutable) => void;
  actorName: string;
  actorRole: JobNoteAuthorRole;
  canEditStage?: boolean;
  canSetPlannedDate?: boolean;
  canAddNotes?: boolean;
  canUploadPhotos?: boolean;
  directory?: { name: string; phone: string }[];
  roleContactPhones?: RoleContactPhones;
};

export function JobWmPanel({
  job,
  onUpdate,
  actorName,
  actorRole,
  canEditStage = true,
  canSetPlannedDate = true,
  canAddNotes = true,
  canUploadPhotos = true,
  directory = [],
  roleContactPhones,
}: JobWmPanelProps) {
  const [noteText, setNoteText] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const stage = inferHandoverStage(job);
  const planStatus = plannedHandoverStatus(job.plannedHandoverDate || "", stage);

  const setStage = (next: JobHandoverStage) => {
    let updated = applyHandoverStageToJob(job, next);
    updated = appendJobActivity(
      updated,
      "inspector_stage",
      `Etap: ${HANDOVER_STAGE_LABELS[next]}`,
      actorName,
    );
    onUpdate(updated);
  };

  const setPlannedDate = (date: string) => {
    onUpdate({ ...job, plannedHandoverDate: date });
  };

  const addNote = () => {
    const text = noteText.trim();
    if (!text) return;
    const note = {
      id: crypto.randomUUID(),
      author: actorName,
      authorRole: actorRole,
      text,
      at: new Date().toISOString(),
    };
    const updated = appendJobActivity(
      { ...job, jobNotes: [note, ...(job.jobNotes || [])] },
      "inspector_note",
      `Notatka: ${text.slice(0, 80)}${text.length > 80 ? "…" : ""}`,
      actorName,
    );
    onUpdate(updated);
    setNoteText("");
  };

  const handlePhotoUpload = async (file: File) => {
    setPhotoBusy(true);
    setMsg("");
    const { entry, error } = await uploadInspectorPhoto(job.id, file, actorName, photoCaption);
    if (!entry) {
      setMsg(error || "Nie udało się wgrać zdjęcia");
      setPhotoBusy(false);
      return;
    }
    const updated = appendJobActivity(
      {
        ...job,
        inspectorPhotos: [entry, ...(job.inspectorPhotos || [])],
      },
      "inspector_photo",
      `Zdjęcie inspektora${entry.caption ? `: ${entry.caption}` : ""}`,
      actorName,
    );
    onUpdate(updated);
    setPhotoCaption("");
    setPhotoBusy(false);
  };

  return (
    <div className="space-y-4">
      {/* Etap odbioru */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-1">
          Etap odbioru WM
          <InspectorHint text="Wspólny status dla inspektora i firmy. „Odebrana” oznacza zdane klucze i zamknięcie roboty."/>
        </p>
        {canEditStage ? (
          <div className="flex flex-wrap gap-2">
            {HANDOVER_STAGES.map((s) => (
              <button
                key={s}
                type="button"
                title={HANDOVER_STAGE_HINTS[s]}
                onClick={() => setStage(s)}
                className={`text-[11px] px-2.5 py-1.5 rounded-full font-medium transition-colors border ${
                  stage === s
                    ? `${stageBadgeClass(s)} border-current`
                    : "bg-secondary text-muted-foreground border-border hover:border-primary/30"
                }`}
              >
                {HANDOVER_STAGE_LABELS[s]}
              </button>
            ))}
          </div>
        ) : (
          <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium ${stageBadgeClass(stage)}`}>
            {HANDOVER_STAGE_LABELS[stage]}
          </span>
        )}
      </div>

      {/* Termin odbioru */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Calendar size={14}/>
          Planowany odbiór WM
          <InspectorHint text="Data planowanego odbioru przez Wrocławskie Mieszkania. Przeterminowane terminy widać na Portfolio i Pulpicie admina."/>
        </p>
        {canSetPlannedDate ? (
          <input
            type="date"
            value={job.plannedHandoverDate || ""}
            onChange={(e) => setPlannedDate(e.target.value)}
            className="w-full sm:w-auto bg-secondary rounded-xl px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
          />
        ) : (
          <p className="text-sm">{fmtPlannedHandover(job.plannedHandoverDate || "")}</p>
        )}
        {planStatus === "overdue" && (
          <p className="text-xs text-red-400">Termin minął — zaktualizuj status lub datę</p>
        )}
        {planStatus === "soon" && (
          <p className="text-xs text-amber-400">Odbiór w ciągu 7 dni</p>
        )}
      </div>

      {/* Notatki */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare size={14}/>
            Notatki Inspektor ↔ Admin
            <InspectorHint text="Krótkie wiadomości przy robocie. Druga strona widzi je od razu w Robotach i dostaje alert na Pulpicie (admin)."/>
          </p>
        </div>
        <div className="max-h-56 overflow-y-auto divide-y divide-border">
          {(job.jobNotes || []).length === 0 ? (
            <p className="px-4 py-6 text-xs text-muted-foreground text-center">Brak notatek — napisz pierwszą poniżej</p>
          ) : (
            (job.jobNotes || []).map((n) => (
              <div key={n.id} className="px-4 py-3">
                <p className="text-xs">
                  <AuthorAttribution
                    name={n.author}
                    noteRole={n.authorRole}
                    directory={directory}
                    roleContactPhones={roleContactPhones || { super_admin: "", admin: "", moderator: "" }}
                    accentClass={n.authorRole === "inspector" ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-primary font-medium"}
                  />
                  <span className="text-muted-foreground">
                    {" · "}
                    {new Date(n.at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{n.text}</p>
              </div>
            ))
          )}
        </div>
        {canAddNotes && (
          <div className="p-4 border-t border-border space-y-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={actorRole === "inspector" ? "Np. brak dostępu, prośba o kominiarza…" : "Odpowiedź dla inspektora…"}
              rows={2}
              className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none resize-none"
            />
            <button
              type="button"
              disabled={!noteText.trim()}
              onClick={addNote}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40"
            >
              <Send size={12}/> Wyślij
            </button>
          </div>
        )}
      </div>

      {/* Zdjęcia inspektora */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Camera size={14}/>
          Zdjęcia inspektora
          <InspectorHint text="Osobno od zdjęć ekipy — usterki, stan przed odbiorem, protokół. Bez akceptacji admina — od razu widoczne."/>
        </p>
        {(job.inspectorPhotos || []).length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {(job.inspectorPhotos || []).map((p: InspectorPhotoEntry) => (
              <div key={p.id} className="space-y-1">
                <a
                  href={p.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square rounded-lg overflow-hidden bg-secondary border border-border relative group"
                >
                  <img src={p.publicUrl} alt="" className="w-full h-full object-cover"/>
                  {p.caption && (
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate">{p.caption}</span>
                  )}
                </a>
                {roleContactPhones && (
                  <p className="text-[9px] text-muted-foreground truncate px-0.5">
                    <AuthorAttribution
                      name={p.uploadedBy}
                      noteRole="inspector"
                      directory={directory}
                      roleContactPhones={roleContactPhones}
                      accentClass="text-muted-foreground font-medium"
                    />
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        {canUploadPhotos && (
          <>
            <input
              type="text"
              value={photoCaption}
              onChange={(e) => setPhotoCaption(e.target.value)}
              placeholder="Opis zdjęcia (opcjonalnie)"
              className="w-full bg-secondary rounded-xl px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none"
            />
            <label className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-medium cursor-pointer ${photoBusy ? "opacity-50 pointer-events-none bg-secondary" : "bg-emerald-600 text-white hover:bg-emerald-600/90"}`}>
              <Upload size={14}/>
              {photoBusy ? "Wgrywanie…" : "Dodaj zdjęcie z telefonu"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhotoUpload(f);
                  e.target.value = "";
                }}
              />
            </label>
          </>
        )}
        {msg && <p className="text-xs text-destructive">{msg}</p>}
      </div>
    </div>
  );
}

export function JobWmStageBadge({ job }: { job: JobWmJob }) {
  const stage = inferHandoverStage(job);
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${stageBadgeClass(stage)}`}>
      {HANDOVER_STAGE_LABELS[stage]}
    </span>
  );
}

export function JobWmPlannedBadge({ job }: { job: JobWmJob }) {
  if (!job.plannedHandoverDate) return null;
  const st = plannedHandoverStatus(job.plannedHandoverDate, inferHandoverStage(job));
  if (st === "none") return null;
  const cls = st === "overdue" ? "text-red-400 bg-red-500/15" : st === "soon" ? "text-amber-400 bg-amber-500/15" : "text-muted-foreground bg-secondary";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 ${cls}`}>
      <Calendar size={9}/>
      {fmtPlannedHandover(job.plannedHandoverDate)}
    </span>
  );
}
