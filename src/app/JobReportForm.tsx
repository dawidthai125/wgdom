import { useState, useEffect, useRef } from "react";
import { Ruler, Trash2, Camera, ImagePlus, StickyNote } from "lucide-react";
import { HiddenFileInput } from "@/app/HiddenFileInput";
import { VoiceNoteButton } from "@/app/app-ui";
import { WorkScopeEditor } from "@/app/WorkScopeEditor";
import type { RoomDimension, RoomTypeKey, WorkerJobReport } from "@/app/app-domain";
import { ROOM_TYPE_LABELS, defaultRoom, normalizeWorkerReport, roomDisplayName, roomHasContent, uploadPhoto } from "@/app/app-domain";
import { getReportWorkScopeText, scopeTextHasContent, scopeTextToWorkItems } from "@/lib/work-scope-text";

export function JobReportForm({
  jobId,
  authorName,
  authorAdminRole = "worker",
  onSaved,
  submitLabel = "Zapisz raport",
  description,
  disabled = false,
  editReport = null,
  onCancelEdit,
}: {
  jobId: string;
  authorName: string;
  authorAdminRole?: import("@/lib/admin-auth").AdminRole | "worker";
  onSaved: (report: WorkerJobReport) => void | Promise<void>;
  submitLabel?: string;
  description?: string;
  disabled?: boolean;
  editReport?: WorkerJobReport | null;
  onCancelEdit?: () => void;
}) {
  const [scopeText, setScopeText] = useState("");
  const [dimMode, setDimMode] = useState<"manual" | "sketch">("manual");
  const [reportRooms, setReportRooms] = useState<RoomDimension[]>([]);
  const [sketchFile, setSketchFile] = useState<File | null>(null);
  const [sketchPreview, setSketchPreview] = useState<string | null>(null);
  const [existingSketch, setExistingSketch] = useState<WorkerJobReport["sketch"]>(null);
  const [generalNote, setGeneralNote] = useState("");
  const [sketchNote, setSketchNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const pokojCountRef = useRef(0);
  const generalNoteRef = useRef<HTMLTextAreaElement>(null);
  const isEdit = Boolean(editReport);

  useEffect(() => {
    return () => { if (sketchPreview && sketchPreview.startsWith("blob:")) URL.revokeObjectURL(sketchPreview); };
  }, [sketchPreview]);

  const loadFromReport = (report: WorkerJobReport | null) => {
    if (sketchPreview && sketchPreview.startsWith("blob:")) URL.revokeObjectURL(sketchPreview);
    if (!report) {
      setScopeText("");
      setDimMode("manual");
      setReportRooms([]);
      setSketchFile(null);
      setSketchPreview(null);
      setExistingSketch(null);
      setGeneralNote("");
      setSketchNote("");
      pokojCountRef.current = 0;
      return;
    }
    const normalized = normalizeWorkerReport(report);
    setScopeText(getReportWorkScopeText(normalized));
    setReportRooms(normalized.rooms);
    setGeneralNote(normalized.generalNote || "");
    setSketchNote(normalized.sketchNote || "");
    setExistingSketch(normalized.sketch || null);
    setSketchFile(null);
    setSketchPreview(normalized.sketch?.publicUrl || null);
    setDimMode(normalized.sketch ? "sketch" : "manual");
    pokojCountRef.current = normalized.rooms.filter((r) => r.roomType === "pokoj").length;
  };

  useEffect(() => {
    loadFromReport(editReport);
    setError("");
    setSuccess(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, editReport?.id]);

  const resetForm = () => {
    loadFromReport(null);
    onCancelEdit?.();
  };

  const addRoom = (roomType: RoomTypeKey) => {
    if (roomType === "pokoj") {
      pokojCountRef.current += 1;
      setReportRooms((prev) => [...prev, defaultRoom("pokoj", `Pokój ${pokojCountRef.current}`)]);
    } else {
      setReportRooms((prev) => [...prev, defaultRoom(roomType)]);
    }
  };

  const updateRoom = (id: string, patch: Partial<RoomDimension>) => {
    setReportRooms((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const onSketchPick = (files: FileList | null) => {
    if (!files?.[0]) {
      setError("Nie wybrano pliku — spróbuj ponownie lub użyj innego zdjęcia (JPG/PNG).");
      return;
    }
    if (sketchPreview && sketchPreview.startsWith("blob:")) URL.revokeObjectURL(sketchPreview);
    setSketchFile(files[0]);
    setSketchPreview(URL.createObjectURL(files[0]));
    setExistingSketch(null);
    setDimMode("sketch");
    setError("");
  };

  const handleSubmit = async () => {
    const scope = scopeText.trim();
    const items = scope ? scopeTextToWorkItems(scope) : [];
    const rooms = reportRooms.filter(roomHasContent);
    const hasSketch = dimMode === "sketch" && (sketchFile || existingSketch);
    const hasGeneral = generalNote.trim().length > 0;
    if (!scopeTextHasContent(scope) && rooms.length === 0 && !hasSketch && !hasGeneral) {
      setError("Dodaj zakres, wymiary, rysunek lub wiadomość dla admina.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess(false);
    let sketch: WorkerJobReport["sketch"] = existingSketch;
    if (dimMode === "sketch" && sketchFile) {
      const { entry, error: upErr } = await uploadPhoto(jobId, sketchFile, "sketch", authorName);
      if (!entry) {
        setError(upErr || "Nie udało się wgrać rysunku.");
        setSaving(false);
        return;
      }
      sketch = { path: entry.path, publicUrl: entry.publicUrl };
    } else if (dimMode !== "sketch") {
      sketch = null;
    }
    const now = new Date().toISOString();
    const report: WorkerJobReport = {
      id: editReport?.id || crypto.randomUUID(),
      workerName: editReport?.workerName || authorName,
      authorAdminRole: editReport?.authorAdminRole || authorAdminRole,
      submittedAt: editReport?.submittedAt || now,
      updatedAt: isEdit ? now : undefined,
      workScopeText: scope,
      workItems: items,
      rooms,
      generalNote: generalNote.trim(),
      sketchNote: sketchNote.trim(),
      sketch,
    };
    await onSaved(report);
    if (!isEdit) loadFromReport(null);
    setSuccess(true);
    setSaving(false);
    setTimeout(() => setSuccess(false), 4000);
  };

  return (
    <div className="space-y-4">
      {isEdit && (
        <div className="flex items-center justify-between gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <p className="text-xs text-amber-400 font-medium">Edycja raportu</p>
          {onCancelEdit && (
            <button type="button" onClick={resetForm} className="text-xs text-muted-foreground hover:text-foreground">Anuluj</button>
          )}
        </div>
      )}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {success && (
        <p className="text-xs text-green-400 bg-green-500/10 rounded-lg px-3 py-2">{isEdit ? "Zmiany zapisane." : "Raport zapisany."}</p>
      )}
      {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Zakres wykonanych prac</p>
        <WorkScopeEditor
          value={scopeText}
          onChange={setScopeText}
          disabled={disabled || saving}
          VoiceNoteButton={VoiceNoteButton}
        />
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Ruler size={12}/>Wymiary mieszkania
        </p>
        <div className="flex gap-2 mb-3">
          <button type="button" onClick={() => setDimMode("manual")}
            className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${dimMode === "manual" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
            Wpisz wymiary
          </button>
          <button type="button" onClick={() => setDimMode("sketch")}
            className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${dimMode === "sketch" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
            Foto rysunku
          </button>
        </div>

        {dimMode === "manual" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {(["salon", "pokoj", "kuchnia", "korytarz", "lazienka", "toaleta"] as RoomTypeKey[]).map((rt) => (
                <button key={rt} type="button" onClick={() => addRoom(rt)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground">
                  + {ROOM_TYPE_LABELS[rt]}
                </button>
              ))}
            </div>
            {reportRooms.length === 0 ? (
              <p className="text-xs text-muted-foreground">Kliknij pomieszczenie powyżej, potem wpisz wymiary w metrach.</p>
            ) : (
              <div className="space-y-2">
                {(() => {
                  let pokojIdx = 0;
                  return reportRooms.map((room) => {
                    const label = room.roomType === "pokoj"
                      ? roomDisplayName(room, pokojIdx++)
                      : roomDisplayName(room, 0);
                    return (
                      <div key={room.id} className="bg-secondary/40 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{label}</p>
                          <button type="button" onClick={() => setReportRooms((p) => p.filter((r) => r.id !== room.id))} className="text-muted-foreground hover:text-destructive">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {(["length", "width", "height"] as const).map((field, fi) => (
                            <div key={field}>
                              <label className="text-[10px] text-muted-foreground block mb-0.5">{fi === 0 ? "Długość" : fi === 1 ? "Szerokość" : "Wysokość"}</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="m"
                                value={room[field]}
                                onChange={(e) => updateRoom(room.id, { [field]: e.target.value })}
                                className="w-full bg-background rounded-lg px-2 py-1.5 text-sm font-mono border border-border focus:border-primary focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={room.note || ""}
                          onChange={(e) => updateRoom(room.id, { note: e.target.value })}
                          placeholder="Opis pomieszczenia / uwagi (opcjonalnie)"
                          className="w-full bg-background rounded-lg px-2.5 py-1.5 text-xs border border-border focus:border-primary focus:outline-none"
                        />
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <HiddenFileInput accept="image/*,.heic,.heif" capture="environment" onPick={onSketchPick}>
                {(open) => (
                  <button
                    type="button"
                    onClick={open}
                    className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors touch-manipulation"
                  >
                    <Camera size={18}/>
                    <span className="text-xs font-medium">Zrób zdjęcie</span>
                  </button>
                )}
              </HiddenFileInput>
              <HiddenFileInput accept="image/*,.heic,.heif" onPick={onSketchPick}>
                {(open) => (
                  <button
                    type="button"
                    onClick={open}
                    className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors touch-manipulation"
                  >
                    <ImagePlus size={18}/>
                    <span className="text-xs font-medium">Z galerii</span>
                  </button>
                )}
              </HiddenFileInput>
            </div>
            {sketchFile && (
              <p className="text-[11px] text-muted-foreground text-center truncate px-2">{sketchFile.name}</p>
            )}
            {sketchPreview && (
              <img src={sketchPreview} alt="Podgląd rysunku" className="rounded-xl border border-border max-h-48 w-full object-contain bg-secondary"/>
            )}
            <input
              type="text"
              value={sketchNote}
              onChange={(e) => setSketchNote(e.target.value)}
              placeholder="Opis rysunku / uwagi (opcjonalnie)"
              className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
            />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-start gap-2 mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 flex-1 pt-1.5">
            <StickyNote size={12}/>Wiadomość dla admina
          </p>
          <VoiceNoteButton focusRef={generalNoteRef} hintClassName="max-w-[min(100vw-2rem,280px)]" onResult={(text) => setGeneralNote((p) => (p ? `${p} ${text}` : text))}/>
        </div>
        <textarea
          ref={generalNoteRef}
          value={generalNote}
          onChange={(e) => setGeneralNote(e.target.value)}
          placeholder="Coś ważnego do przekazania — opcjonalnie"
          rows={2}
          className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none resize-none"
        />
      </div>

      <button type="button" onClick={handleSubmit} disabled={saving || disabled}
        className="w-full py-3.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-600/90 disabled:opacity-50 transition-all">
        {saving ? "Zapisywanie…" : submitLabel}
      </button>
    </div>
  );
}