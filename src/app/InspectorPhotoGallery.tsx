import { useCallback, useMemo, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Download, ImagePlus, Share2, Upload, X } from "lucide-react";
import { HiddenFileInput } from "@/app/HiddenFileInput";
import { AuthorAttribution } from "@/app/AuthorAttribution";
import { InspectorHint } from "@/app/InspectorHelp";
import {
  PHOTO_LABEL_NAMES,
  PHOTO_LABEL_ORDER,
  PHOTO_LABEL_SECTION,
  INSPECTOR_PHOTO_LABEL_NAMES,
  INSPECTOR_PHOTO_LABEL_ORDER,
  INSPECTOR_PHOTO_LABEL_SECTION,
  normalizeInspectorPhotoLabel,
  type InspectorPhotoLabel,
} from "@/lib/photo-labels";
import {
  buildCrewPhotoFilename,
  buildInspectorPhotoFilename,
  buildInspectorPhotoZipPath,
  downloadUrlAsFile,
  fmtPhotoDate,
  safeDownloadName,
  type DownloadablePhoto,
} from "@/lib/photo-download";
import { downloadPhotosAsZip } from "@/lib/photo-zip";
import type { InspectorPhotoEntry } from "@/lib/job-wm";

type CrewPhoto = DownloadablePhoto & {
  label: "before" | "after" | "progress";
  status: "pending" | "approved" | "rejected";
};

type GallerySlide = {
  id: string;
  url: string;
  title: string;
  caption?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  downloadName: string;
};

export type InspectorPhotoGalleryProps = {
  jobAddress: string;
  crewPhotos: CrewPhoto[];
  inspectorPhotos: InspectorPhotoEntry[];
  directory?: { name: string; phone: string }[];
  onStatusMessage?: (msg: string) => void;
  canUpload?: boolean;
  onUploadInspectorPhoto?: (file: File, label: InspectorPhotoLabel, caption: string) => Promise<boolean>;
};

function jobZipSlug(address: string): string {
  return safeDownloadName(address || "robota").slice(0, 36).toLowerCase();
}

export function InspectorPhotoGallery({
  jobAddress,
  crewPhotos,
  inspectorPhotos,
  directory = [],
  onStatusMessage,
  canUpload = false,
  onUploadInspectorPhoto,
}: InspectorPhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [uploadLabel, setUploadLabel] = useState<InspectorPhotoLabel>("before_handover");
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const approvedCrew = crewPhotos.filter((p) => p.status === "approved" && p.publicUrl);
  const inspPhotos = inspectorPhotos.filter((p) => p.publicUrl);

  const notify = (msg: string) => onStatusMessage?.(msg);

  const slides = useMemo((): GallerySlide[] => {
    const out: GallerySlide[] = [];
    for (const label of PHOTO_LABEL_ORDER) {
      const group = approvedCrew.filter((p) => p.label === label);
      group.forEach((p, i) => {
        out.push({
          id: p.id,
          url: p.publicUrl,
          title: PHOTO_LABEL_NAMES[label],
          caption: p.caption,
          uploadedBy: p.uploadedBy,
          uploadedAt: p.uploadedAt,
          downloadName: buildCrewPhotoFilename(jobAddress, p, i),
        });
      });
    }
    for (const label of INSPECTOR_PHOTO_LABEL_ORDER) {
      const group = inspPhotos.filter((p) => normalizeInspectorPhotoLabel(p.label) === label);
      group.forEach((p, i) => {
        out.push({
          id: p.id,
          url: p.publicUrl,
          title: INSPECTOR_PHOTO_LABEL_NAMES[label],
          caption: p.caption,
          uploadedBy: p.uploadedBy,
          uploadedAt: p.uploadedAt,
          downloadName: buildInspectorPhotoFilename(jobAddress, p, i),
        });
      });
    }
    return out;
  }, [approvedCrew, inspPhotos, jobAddress]);

  const lightbox = lightboxIndex != null ? slides[lightboxIndex] ?? null : null;

  const openSlide = (slide: GallerySlide) => {
    const idx = slides.findIndex((s) => s.id === slide.id && s.url === slide.url);
    setLightboxIndex(idx >= 0 ? idx : 0);
  };

  const goPrev = useCallback(() => {
    setLightboxIndex((i) => (i == null || slides.length === 0 ? i : (i - 1 + slides.length) % slides.length));
  }, [slides.length]);

  const goNext = useCallback(() => {
    setLightboxIndex((i) => (i == null || slides.length === 0 ? i : (i + 1) % slides.length));
  }, [slides.length]);

  const downloadCrewZip = async (label: CrewPhoto["label"]) => {
    const group = approvedCrew.filter((p) => p.label === label);
    if (group.length === 0) return;
    setBusy(`zip-crew-${label}`);
    const folder = PHOTO_LABEL_SECTION[label].zipFolder;
    const entries = group.map((p, i) => ({
      zipPath: `ekipa/${folder}/${buildCrewPhotoFilename(jobAddress, p, i)}`,
      url: p.publicUrl,
    }));
    const res = await downloadPhotosAsZip(`${jobZipSlug(jobAddress)}-ekipa-${folder}`, entries);
    notify(res.ok ? `ZIP: ${res.count} zdjęć (${PHOTO_LABEL_NAMES[label]})` : res.error || "Błąd ZIP");
    setBusy(null);
  };

  const downloadInspectorZip = async (label: InspectorPhotoLabel) => {
    const group = inspPhotos.filter((p) => normalizeInspectorPhotoLabel(p.label) === label);
    if (group.length === 0) return;
    setBusy(`zip-insp-${label}`);
    const folder = INSPECTOR_PHOTO_LABEL_SECTION[label].zipFolder;
    const entries = group.map((p, i) => ({
      zipPath: `inspektor/${folder}/${buildInspectorPhotoZipPath(p, i).split("/").pop() || `zdj-${i}.jpg`}`,
      url: p.publicUrl,
    }));
    const res = await downloadPhotosAsZip(`${jobZipSlug(jobAddress)}-inspektor-${folder}`, entries);
    notify(res.ok ? `ZIP: ${res.count} zdjęć (${INSPECTOR_PHOTO_LABEL_NAMES[label]})` : res.error || "Błąd ZIP");
    setBusy(null);
  };

  const downloadAllZip = async () => {
    const entries: { zipPath: string; url: string }[] = [];
    PHOTO_LABEL_ORDER.forEach((label) => {
      const group = approvedCrew.filter((p) => p.label === label);
      const folder = PHOTO_LABEL_SECTION[label].zipFolder;
      group.forEach((p, i) => {
        entries.push({ zipPath: `ekipa/${folder}/${buildCrewPhotoFilename(jobAddress, p, i)}`, url: p.publicUrl });
      });
    });
    INSPECTOR_PHOTO_LABEL_ORDER.forEach((label) => {
      const group = inspPhotos.filter((p) => normalizeInspectorPhotoLabel(p.label) === label);
      group.forEach((p, i) => {
        entries.push({ zipPath: buildInspectorPhotoZipPath(p, i), url: p.publicUrl });
      });
    });
    if (entries.length === 0) return;
    setBusy("zip-all");
    const res = await downloadPhotosAsZip(`${jobZipSlug(jobAddress)}-wszystkie-zdjecia`, entries);
    notify(res.ok ? `ZIP: ${res.count} zdjęć` : res.error || "Błąd ZIP");
    setBusy(null);
  };

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !onUploadInspectorPhoto) return;
    setUploadBusy(true);
    const ok = await onUploadInspectorPhoto(file, uploadLabel, uploadCaption);
    if (ok) {
      setUploadCaption("");
      notify("Zdjęcie wgrane");
    }
    setUploadBusy(false);
  };

  const shareSlide = async (slide: GallerySlide) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: slide.title, text: slide.caption || slide.title, url: slide.url });
        return;
      } catch { /* fallback */ }
    }
    await downloadUrlAsFile(slide.url, slide.downloadName);
    notify("Pobrano plik (udostępnianie niedostępne w tej przeglądarce)");
  };

  const hasAny = approvedCrew.length > 0 || inspPhotos.length > 0;

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-4 space-y-5">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="text-sm font-semibold flex items-center gap-2">
            <ImagePlus size={15}/>
            Galeria zdjęć
            <InspectorHint text="Zdjęcia ekipy (po akceptacji) i Twoje — kategorie, opisy, daty. Pobieraj ZIP całej kategorii lub wszystkich zdjęć roboty."/>
          </p>
          {hasAny && (
            <button type="button" disabled={!!busy} onClick={downloadAllZip} className="text-xs text-primary flex items-center gap-1 hover:underline disabled:opacity-50">
              <Download size={12}/>{busy === "zip-all" ? "Pakowanie…" : "ZIP — wszystkie"}
            </button>
          )}
        </div>

        {canUpload && onUploadInspectorPhoto && (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 space-y-2">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Dodaj zdjęcie inspektora</p>
            <div className="flex flex-wrap gap-1.5">
              {INSPECTOR_PHOTO_LABEL_ORDER.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setUploadLabel(l)}
                  className={`text-[10px] px-2.5 py-1.5 rounded-full font-medium border transition-colors ${
                    uploadLabel === l ? "bg-emerald-600 text-white border-emerald-600" : "bg-secondary text-muted-foreground border-border"
                  }`}
                >
                  {INSPECTOR_PHOTO_LABEL_NAMES[l]}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={uploadCaption}
              onChange={(e) => setUploadCaption(e.target.value)}
              placeholder="Opis zdjęcia (np. usterka kaloryfera, salon)"
              className="w-full bg-background rounded-xl px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none"
            />
            <HiddenFileInput accept="image/*" capture="environment" onPick={handleUpload}>
              {(open) => (
                <button
                  type="button"
                  disabled={uploadBusy}
                  onClick={open}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-600/90 disabled:opacity-50"
                >
                  <Upload size={14}/>
                  {uploadBusy ? "Wgrywanie…" : "Wgraj z telefonu"}
                </button>
              )}
            </HiddenFileInput>
          </div>
        )}

        {!hasAny && !canUpload && (
          <p className="text-xs text-muted-foreground text-center py-6">Brak zdjęć do wyświetlenia</p>
        )}

        {PHOTO_LABEL_ORDER.map((label) => {
          const group = approvedCrew.filter((p) => p.label === label);
          if (group.length === 0) return null;
          const meta = PHOTO_LABEL_SECTION[label];
          const Icon = meta.icon;
          return (
            <PhotoCategoryBlock
              key={label}
              title={PHOTO_LABEL_NAMES[label]}
              count={group.length}
              icon={Icon}
              accent={meta.accent}
              border={meta.border}
              busy={busy === `zip-crew-${label}`}
              onZip={() => downloadCrewZip(label)}
            >
              <PhotoThumbGrid
                items={group.map((p, i) => ({
                  id: p.id,
                  url: p.publicUrl,
                  caption: p.caption,
                  subtitle: `${fmtPhotoDate(p.uploadedAt)} · ${p.uploadedBy}`,
                  onOpen: () => openSlide({
                    id: p.id, url: p.publicUrl, title: PHOTO_LABEL_NAMES[label],
                    caption: p.caption, uploadedBy: p.uploadedBy, uploadedAt: p.uploadedAt,
                    downloadName: buildCrewPhotoFilename(jobAddress, p, i),
                  }),
                  onDownload: () => downloadUrlAsFile(p.publicUrl, buildCrewPhotoFilename(jobAddress, p, i)).catch(() => notify("Nie udało się pobrać")),
                }))}
              />
            </PhotoCategoryBlock>
          );
        })}

        {(inspPhotos.length > 0 || canUpload) && (
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Camera size={13}/> Twoje zdjęcia (inspektor)
            </p>
            {INSPECTOR_PHOTO_LABEL_ORDER.map((label) => {
              const group = inspPhotos.filter((p) => normalizeInspectorPhotoLabel(p.label) === label);
              if (group.length === 0) return null;
              const meta = INSPECTOR_PHOTO_LABEL_SECTION[label];
              const Icon = meta.icon;
              return (
                <PhotoCategoryBlock
                  key={label}
                  title={INSPECTOR_PHOTO_LABEL_NAMES[label]}
                  count={group.length}
                  icon={Icon}
                  accent={meta.accent}
                  border={meta.border}
                  busy={busy === `zip-insp-${label}`}
                  onZip={() => downloadInspectorZip(label)}
                >
                  <PhotoThumbGrid
                    items={group.map((p, i) => ({
                      id: p.id,
                      url: p.publicUrl,
                      caption: p.caption,
                      subtitle: fmtPhotoDate(p.uploadedAt),
                      onOpen: () => openSlide({
                        id: p.id, url: p.publicUrl, title: INSPECTOR_PHOTO_LABEL_NAMES[label],
                        caption: p.caption, uploadedBy: p.uploadedBy, uploadedAt: p.uploadedAt,
                        downloadName: buildInspectorPhotoFilename(jobAddress, p, i),
                      }),
                      onDownload: () => downloadUrlAsFile(p.publicUrl, buildInspectorPhotoFilename(jobAddress, p, i)).catch(() => notify("Nie udało się pobrać")),
                    }))}
                    showAuthor={(id) => {
                      const p = group.find((x) => x.id === id);
                      return p ? (
                        <AuthorAttribution name={p.uploadedBy} noteRole="inspector" directory={directory} accentClass="text-muted-foreground font-medium"/>
                      ) : null;
                    }}
                  />
                </PhotoCategoryBlock>
              );
            })}
          </div>
        )}
      </div>

      {lightbox && lightboxIndex != null && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
          onTouchStart={(e) => { touchStartX.current = e.touches[0]?.clientX ?? null; }}
          onTouchEnd={(e) => {
            const start = touchStartX.current;
            touchStartX.current = null;
            if (start == null) return;
            const end = e.changedTouches[0]?.clientX ?? start;
            const dx = end - start;
            if (Math.abs(dx) > 50) {
              if (dx > 0) goPrev();
              else goNext();
            }
          }}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-3 text-white shrink-0" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
            <button type="button" onClick={goPrev} className="p-2.5 rounded-lg bg-white/10" aria-label="Poprzednie">
              <ChevronLeft size={20}/>
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="text-sm font-semibold truncate">{lightbox.title}</p>
              {lightbox.caption && <p className="text-xs text-white/80 italic truncate">{lightbox.caption}</p>}
              <p className="text-[10px] text-white/55 mt-0.5">
                {lightboxIndex + 1} / {slides.length}
                {lightbox.uploadedAt ? ` · ${fmtPhotoDate(lightbox.uploadedAt)}` : ""}
              </p>
            </div>
            <button type="button" onClick={goNext} className="p-2.5 rounded-lg bg-white/10" aria-label="Następne">
              <ChevronRight size={20}/>
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-2 min-h-0">
            <img src={lightbox.url} alt={lightbox.caption || lightbox.title} className="max-w-full max-h-full object-contain rounded-lg select-none"/>
          </div>
          <div className="flex items-center justify-center gap-3 px-4 py-4 shrink-0" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            <button type="button" onClick={() => downloadUrlAsFile(lightbox.url, lightbox.downloadName).catch(() => notify("Błąd pobierania"))} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 text-sm font-medium">
              <Download size={16}/> Pobierz
            </button>
            <button type="button" onClick={() => shareSlide(lightbox)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 text-sm font-medium">
              <Share2 size={16}/> Udostępnij
            </button>
            <button type="button" onClick={() => setLightboxIndex(null)} className="p-2.5 rounded-xl bg-white/15">
              <X size={18}/>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function PhotoCategoryBlock({
  title, count, icon: Icon, accent, border, busy, onZip, children,
}: {
  title: string;
  count: number;
  icon: typeof Camera;
  accent: string;
  border: string;
  busy: boolean;
  onZip: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className={`flex items-center justify-between gap-2 pb-2 border-b ${border}`}>
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={13} className={accent}/>
          <span className={`text-xs font-semibold uppercase tracking-wider ${accent}`}>{title}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{count}</span>
        </div>
        <button type="button" disabled={busy} onClick={onZip} className="shrink-0 text-[10px] font-medium px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-primary flex items-center gap-1 disabled:opacity-50">
          <Download size={11}/>{busy ? "…" : "ZIP kategorii"}
        </button>
      </div>
      {children}
    </section>
  );
}

function PhotoThumbGrid({
  items,
  showAuthor,
}: {
  items: { id: string; url: string; caption?: string; subtitle?: string; onOpen: () => void; onDownload: () => void }[];
  showAuthor?: (id: string) => React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {items.map((item) => (
        <div key={item.id} className="space-y-1">
          <div className="group relative aspect-square rounded-xl overflow-hidden bg-secondary border border-border">
            <button type="button" onClick={item.onOpen} className="block w-full h-full">
              <img src={item.url} alt={item.caption || ""} className="w-full h-full object-cover"/>
            </button>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 py-2 pointer-events-none">
              {item.caption && <p className="text-[10px] text-white font-medium leading-snug line-clamp-2">{item.caption}</p>}
              {item.subtitle && <p className="text-[9px] text-white/75 truncate mt-0.5">{item.subtitle}</p>}
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); item.onDownload(); }} className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-black/60 text-white hover:bg-black/80" title="Pobierz">
              <Download size={12}/>
            </button>
          </div>
          {showAuthor?.(item.id) && <p className="text-[9px] text-muted-foreground truncate px-0.5">{showAuthor(item.id)}</p>}
        </div>
      ))}
    </div>
  );
}
