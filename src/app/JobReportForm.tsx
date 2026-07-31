import { useState, useEffect, useRef } from "react";
import { Ruler, Trash2, Camera, ImagePlus, StickyNote } from "lucide-react";
import { HiddenFileInput } from "@/app/HiddenFileInput";
import { VoiceNoteButton } from "@/app/app-ui";
import { WorkScopeEditor } from "@/app/WorkScopeEditor";
import type { RoomDimension, RoomTypeKey, WorkerJobReport } from "@/app/app-domain";
import { ROOM_TYPE_LABELS, defaultRoom, normalizeWorkerReport, roomDisplayName, roomHasContent, uploadPhoto } from "@/app/app-domain";
import { getReportWorkScopeText, scopeTextHasContent, scopeTextToWorkItems } from "@/lib/work-scope-text";
import { WgButton, WgCard, WgField } from "@/app/ui";
import { cn } from "@/app/components/ui/utils";
import {
  WG_DURATION_HOVER,
  WG_FOCUS_RING,
  WG_RADIUS_LG,
  WG_TOUCH_MIN,
  WG_TYPE_LABEL,
} from "@/lib/wg-ui-tokens";

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
  layout = "default",
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
  layout?: "default" | "worker";
}) {
  const isWorker = layout === "worker";
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
    <div className={isWorker ? "space-y-6" : "space-y-4"}>
      {isEdit && (
        <div className={cn("flex items-center justify-between gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-2", WG_RADIUS_LG)}>
          <p className="text-xs text-amber-400 font-medium">Edycja raportu</p>
          {onCancelEdit && (
            <WgButton type="button" variant="ghost" onClick={resetForm} className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground">
              Anuluj
            </WgButton>
          )}
        </div>
      )}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {success && (
        <p className={cn("text-xs text-green-400 bg-green-500/10 px-3 py-2", WG_RADIUS_LG)}>{isEdit ? "Zmiany zapisane." : "Raport zapisany."}</p>
      )}
      {error && <p className={cn("text-xs text-destructive bg-destructive/10 px-3 py-2", WG_RADIUS_LG)}>{error}</p>}

      <div id={isWorker ? "worker-section-scope" : undefined} className={isWorker ? "scroll-mt-4" : undefined}>
        <p className={cn(WG_TYPE_LABEL, "mb-2")}>Zakres wykonanych prac</p>
        <WorkScopeEditor
          value={scopeText}
          onChange={setScopeText}
          disabled={disabled || saving}
          VoiceNoteButton={VoiceNoteButton}
        />
      </div>

      <div id={isWorker ? "worker-section-dimensions" : undefined} className={isWorker ? "scroll-mt-4" : undefined}>
        <p className={cn(WG_TYPE_LABEL, "mb-2 flex items-center gap-1.5")}>
          <Ruler size={12}/>Wymiary mieszkania
        </p>
        <div className="flex gap-2 mb-3">
          <WgButton
            type="button"
            variant="outline"
            onClick={() => setDimMode("manual")}
            className={cn(
              "flex-1",
              isWorker ? "min-h-[48px] h-12 text-sm" : "h-9 text-xs",
              dimMode === "manual"
                ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15"
                : "text-muted-foreground",
            )}
          >
            Wpisz wymiary
          </WgButton>
          <WgButton
            type="button"
            variant="outline"
            onClick={() => setDimMode("sketch")}
            id={isWorker && dimMode !== "sketch" ? "worker-section-sketch" : undefined}
            className={cn(
              "flex-1",
              isWorker ? "min-h-[48px] h-12 text-sm" : "h-9 text-xs",
              dimMode === "sketch"
                ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15"
                : "text-muted-foreground",
            )}
          >
            Foto rysunku
          </WgButton>
        </div>

        {dimMode === "manual" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {(["salon", "pokoj", "kuchnia", "korytarz", "lazienka", "toaleta"] as RoomTypeKey[]).map((rt) => (
                <WgButton
                  key={rt}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addRoom(rt)}
                  className={cn(
                    "rounded-full text-muted-foreground hover:border-primary/40 hover:text-foreground touch-manipulation",
                    isWorker ? "min-h-[44px] h-11 px-3 text-sm" : "h-8 px-2.5 text-[11px]",
                    WG_FOCUS_RING,
                  )}
                >
                  + {ROOM_TYPE_LABELS[rt]}
                </WgButton>
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
                      <WgCard key={room.id} elevation="flat" padding="sm" radius="md" className="bg-secondary/40 border-border/40 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{label}</p>
                          <WgButton
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setReportRooms((p) => p.filter((r) => r.id !== room.id))}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Usuń pomieszczenie"
                          >
                            <Trash2 size={14}/>
                          </WgButton>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {(["length", "width", "height"] as const).map((field, fi) => (
                            <WgField
                              key={field}
                              label={fi === 0 ? "Długość" : fi === 1 ? "Szerokość" : "Wysokość"}
                              type="text"
                              inputMode="decimal"
                              placeholder="m"
                              value={room[field]}
                              onChange={(e) => updateRoom(room.id, { [field]: e.target.value })}
                              className="!space-y-0.5"
                              controlClassName={cn(
                                "font-mono bg-background",
                                isWorker ? "h-11 min-h-[44px] px-3 text-base rounded-lg" : "h-9 px-2 py-1.5 text-sm rounded-lg",
                              )}
                            />
                          ))}
                        </div>
                        <WgField
                          type="text"
                          value={room.note || ""}
                          onChange={(e) => updateRoom(room.id, { note: e.target.value })}
                          placeholder="Opis pomieszczenia / uwagi (opcjonalnie)"
                          className="!space-y-0"
                          controlClassName="h-9 bg-background px-2.5 py-1.5 text-xs rounded-lg"
                        />
                      </WgCard>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        ) : (
          <div id={isWorker ? "worker-section-sketch" : undefined} className={`space-y-3${isWorker ? " scroll-mt-4" : ""}`}>
            <div className="grid grid-cols-2 gap-2">
              <HiddenFileInput accept="image/*,.heic,.heif" capture="environment" onPick={onSketchPick}>
                {(open) => (
                  <WgButton
                    type="button"
                    variant="outline"
                    onClick={open}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 h-auto py-3.5 border-dashed text-sm text-muted-foreground",
                      "hover:border-primary/40 hover:text-foreground",
                      `transition-colors ${WG_DURATION_HOVER}`,
                      WG_TOUCH_MIN,
                    )}
                  >
                    <Camera size={18}/>
                    <span className="text-xs font-medium">Zrób zdjęcie</span>
                  </WgButton>
                )}
              </HiddenFileInput>
              <HiddenFileInput accept="image/*,.heic,.heif" onPick={onSketchPick}>
                {(open) => (
                  <WgButton
                    type="button"
                    variant="outline"
                    onClick={open}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 h-auto py-3.5 border-dashed text-sm text-muted-foreground",
                      "hover:border-primary/40 hover:text-foreground",
                      `transition-colors ${WG_DURATION_HOVER}`,
                      WG_TOUCH_MIN,
                    )}
                  >
                    <ImagePlus size={18}/>
                    <span className="text-xs font-medium">Z galerii</span>
                  </WgButton>
                )}
              </HiddenFileInput>
            </div>
            {sketchFile && (
              <p className="text-[11px] text-muted-foreground text-center truncate px-2">{sketchFile.name}</p>
            )}
            {sketchPreview && (
              <img src={sketchPreview} alt="Podgląd rysunku" className={cn("border border-border max-h-48 w-full object-contain bg-secondary", WG_RADIUS_LG)}/>
            )}
            <WgField
              type="text"
              value={sketchNote}
              onChange={(e) => setSketchNote(e.target.value)}
              placeholder="Opis rysunku / uwagi (opcjonalnie)"
              className="!space-y-0"
              controlClassName="h-11 bg-secondary/50"
            />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-start gap-2 mb-2">
          <p className={cn(WG_TYPE_LABEL, "flex items-center gap-1.5 flex-1 pt-1.5")}>
            <StickyNote size={12}/>Wiadomość dla admina
          </p>
          <VoiceNoteButton focusRef={generalNoteRef} hintClassName="max-w-[min(100vw-2rem,280px)]" onResult={(text) => setGeneralNote((p) => (p ? `${p} ${text}` : text))}/>
        </div>
        <WgField
          control="textarea"
          ref={generalNoteRef}
          value={generalNote}
          onChange={(e) => setGeneralNote(e.target.value)}
          placeholder="Coś ważnego do przekazania — opcjonalnie"
          rows={2}
          className="!space-y-0"
          controlClassName="min-h-[4.5rem] h-auto py-2.5 bg-secondary/50 resize-none"
        />
      </div>

      <WgButton
        type="button"
        variant="primary"
        size={isWorker ? "lg" : "md"}
        onClick={handleSubmit}
        disabled={saving || disabled}
        className={cn(
          "w-full",
          isWorker ? "min-h-[52px] text-base" : "h-11 text-sm",
        )}
      >
        {saving ? "Zapisywanie…" : submitLabel}
      </WgButton>
    </div>
  );
}
