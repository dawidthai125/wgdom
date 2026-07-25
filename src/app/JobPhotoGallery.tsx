import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Camera, Eye, X, ThumbsUp, ThumbsDown, CheckCircle2, Clock3 } from "lucide-react";
import type { PhotoEntry } from "@/app/app-domain";
import { PHOTO_LABEL_NAMES, PHOTO_LABEL_ORDER, getAppPhotoLabelSection } from "@/app/app-domain";
import { JobPhotoImg } from "@/app/JobPhotoImg";
import { useMediaFailureRevision } from "@/app/useMediaFailureRevision";
import { filterAvailablePhotos } from "@/lib/media-filter";
import type { JobActivityType } from "@/lib/job-activity";
import { useModalScrollLock } from "@/lib/modal-scroll-lock";

export function JobPhotoGallery({
  photos,
  onUpdate,
  onRemovePhoto,
  onClearRejected,
}: {
  photos: PhotoEntry[];
  onUpdate: (photos: PhotoEntry[], activity?: { type: JobActivityType; text: string }) => void;
  onRemovePhoto?: (id: string) => void;
  onClearRejected?: () => void;
}) {
  const [lightbox, setLightbox] = useState<PhotoEntry|null>(null);
  const failRev = useMediaFailureRevision();
  useModalScrollLock(lightbox != null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const visiblePhotos = useMemo(() => filterAvailablePhotos(photos), [photos, failRev]);
  const pending  = visiblePhotos.filter(p=>p.status==="pending");
  const approved = visiblePhotos.filter(p=>p.status==="approved");
  const rejected = visiblePhotos.filter(p=>p.status==="rejected");

  const approve = (id: string) => {
    const p = photos.find(x => x.id === id);
    onUpdate(
      photos.map(x=>x.id===id?{...x,status:"approved"}:x),
      p ? { type: "photo_approved", text: `Zaakceptowano zdjęcie (${p.label})${p.caption ? `: ${p.caption}` : ""}` } : undefined,
    );
  };
  const reject  = (id: string) => {
    const p = photos.find(x => x.id === id);
    const reason = window.prompt("Powód odrzucenia (opcjonalnie):", "") ?? "";
    onUpdate(
      photos.map(x=>x.id===id?{...x,status:"rejected",rejectReason: reason.trim() || undefined}:x),
      p ? { type: "photo_rejected", text: `Odrzucono zdjęcie (${p.label})${reason.trim() ? `: ${reason.trim()}` : ""}` } : undefined,
    );
  };
  const remove = (id: string) => {
    if (onRemovePhoto) onRemovePhoto(id);
    else onUpdate(photos.filter((p) => p.id !== id));
  };

  if (visiblePhotos.length === 0) return (
    <div className="text-center py-10 text-muted-foreground">
      <Camera size={36} className="mx-auto opacity-20 mb-2"/>
      <p className="text-sm">Brak zdjęć</p>
      <p className="text-xs mt-1">Pracownicy mogą dodawać zdjęcia w trybie pracownika</p>
    </div>
  );

  const PhotoGrid = ({
    items,
    showActions,
    showDelete,
    showLabel,
  }: {
    items: PhotoEntry[];
    showActions?: boolean;
    showDelete?: boolean;
    showLabel?: boolean;
  }) => {
    const visible = filterAvailablePhotos(items);
    if (visible.length === 0) return null;
    return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {visible.map((p) => (
        <div key={p.id} className="group relative aspect-square rounded-xl overflow-hidden bg-secondary cursor-pointer" onClick={() => setLightbox(p)}>
          <JobPhotoImg src={p.publicUrl} alt={p.label} className="w-full h-full object-cover"/>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
            <Eye size={20} className="text-white drop-shadow"/>
          </div>
          {(showDelete || showActions) && (
            <div className="absolute top-1.5 right-1.5 flex gap-1 z-10" onClick={(e) => e.stopPropagation()}>
              {showActions && (
                <>
                  <button onClick={() => approve(p.id)} title="Akceptuj"
                    className="w-6 h-6 rounded-full bg-green-500/90 flex items-center justify-center hover:bg-green-400 transition-colors shadow-sm">
                    <ThumbsUp size={10} className="text-white"/>
                  </button>
                  <button onClick={() => reject(p.id)} title="Odrzuć"
                    className="w-6 h-6 rounded-full bg-red-500/90 flex items-center justify-center hover:bg-red-400 transition-colors shadow-sm">
                    <ThumbsDown size={10} className="text-white"/>
                  </button>
                </>
              )}
              {showDelete && (
                <button
                  onClick={() => remove(p.id)}
                  title="Usuń zdjęcie"
                  className="w-6 h-6 rounded-full bg-black/65 hover:bg-destructive flex items-center justify-center transition-colors shadow-sm"
                >
                  <X size={12} className="text-white"/>
                </button>
              )}
            </div>
          )}
          {(showLabel || p.caption || p.uploadedBy) && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-2 py-1.5 pointer-events-none">
              {showLabel && (
                <p className="text-[9px] text-white font-medium truncate">{PHOTO_LABEL_NAMES[p.label]}</p>
              )}
              {p.caption && <p className="text-[8px] text-white/90 truncate italic">{p.caption}</p>}
              {p.uploadedBy && <p className="text-[8px] text-white/70 truncate">{p.uploadedBy}</p>}
            </div>
          )}
        </div>
      ))}
    </div>
    );
  };

  const CategorySections = ({
    items,
    showActions,
    showDelete,
  }: {
    items: PhotoEntry[];
    showActions?: boolean;
    showDelete?: boolean;
  }) => (
    <div className="space-y-4">
      {PHOTO_LABEL_ORDER.map((label) => {
        const group = items.filter((p) => p.label === label);
        if (group.length === 0) return null;
        const meta = getAppPhotoLabelSection()[label];
        const Icon = meta.icon;
        return (
          <div key={label}>
            <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${meta.border}`}>
              <Icon size={13} className={meta.accent}/>
              <span className={`text-xs font-semibold uppercase tracking-wider ${meta.accent}`}>
                {PHOTO_LABEL_NAMES[label]}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary ${meta.accent}`}>
                {group.length}
              </span>
            </div>
            <PhotoGrid items={group} showActions={showActions} showDelete={showDelete} showLabel={false}/>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-yellow-500/20 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock3 size={13} className="text-yellow-400"/>
              <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Oczekuje na akceptację</span>
              <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
            </div>
            <button
              onClick={() => onUpdate(
                photos.map((p) => p.status === "pending" ? { ...p, status: "approved" as const } : p),
                pending.length > 0 ? { type: "photo_approved", text: `Zaakceptowano wszystkie (${pending.length})` } : undefined,
              )}
              className="text-xs text-green-400 hover:text-green-300 transition-colors px-2 py-1 rounded-lg hover:bg-green-500/10"
            >
              Akceptuj wszystkie
            </button>
          </div>
          <div className="p-3">
            <CategorySections items={pending} showActions/>
          </div>
        </div>
      )}

      {approved.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <CheckCircle2 size={13} className="text-green-400"/>
            <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Zaakceptowane</span>
            <span className="bg-green-500/15 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{approved.length}</span>
          </div>
          <div className="p-3">
            <CategorySections items={approved} showDelete/>
          </div>
        </div>
      )}

      {rejected.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden opacity-60">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <X size={13} className="text-muted-foreground"/>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Odrzucone</span>
              <span className="bg-secondary text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">{rejected.length}</span>
            </div>
            <button
              onClick={() => {
                if (onClearRejected) onClearRejected();
                else onUpdate(photos.filter((p) => p.status !== "rejected"));
              }}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Usuń wszystkie odrzucone
            </button>
          </div>
          <div className="p-3">
            <CategorySections items={rejected} showDelete/>
          </div>
        </div>
      )}

      {lightbox &&
        createPortal(
          <div
            className="fixed inset-0 z-50 modal-overlay modal-lightbox flex items-center justify-center p-4 bg-black/90 touch-manipulation"
            onClick={() => setLightbox(null)}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="absolute right-4 z-10 text-white/70 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
              style={{ top: "max(1rem, env(safe-area-inset-top))" }}
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(null);
              }}
              aria-label="Zamknij"
            >
              <X size={24}/>
            </button>
            <JobPhotoImg
              src={lightbox.publicUrl}
              alt={lightbox.label}
              className="max-w-full max-h-[90dvh] rounded-xl object-contain touch-manipulation"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center pointer-events-none">
              <p className="text-white/90 text-sm font-medium">{PHOTO_LABEL_NAMES[lightbox.label]}</p>
              {lightbox.caption && <p className="text-white/80 text-xs mt-1 italic">{lightbox.caption}</p>}
              <p className="text-white/50 text-xs mt-0.5">{lightbox.uploadedBy} · {new Date(lightbox.uploadedAt).toLocaleDateString("pl-PL")}</p>
              {lightbox.status === "rejected" && lightbox.rejectReason && (
                <p className="text-red-300 text-xs mt-1">Powód odrzucenia: {lightbox.rejectReason}</p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}