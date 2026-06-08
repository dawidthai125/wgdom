import { useMemo, useState, type RefObject } from "react";
import {
  Images, Search, ChevronRight, ChevronDown, Camera, MapPin, X,
} from "lucide-react";
import {
  GALLERY_ARCHIVE_DAYS,
  galleryDaysUntilArchive,
  jobApprovedPhotos,
  jobDisplayTitle,
  jobGalleryBucket,
  type GalleryJob,
  type GalleryPhoto,
} from "@/lib/job-gallery";
import {
  PHOTO_LABEL_NAMES,
  PHOTO_LABEL_ORDER,
  getPhotoLabelSection,
} from "@/lib/photo-labels";
import { JobPhotoImg } from "@/app/JobPhotoImg";
import { useMediaFailureRevision } from "@/app/useMediaFailureRevision";

interface GalleryEntry {
  job: GalleryJob;
  bucket: NonNullable<ReturnType<typeof jobGalleryBucket>>;
  photos: GalleryPhoto[];
}

export function InspectorJobPhotosGalleryView({
  jobs,
  onOpenJob,
  scrollRef,
}: {
  jobs: GalleryJob[];
  onOpenJob: (jobId: string) => void;
  scrollRef?: RefObject<HTMLDivElement | null>;
}) {
  const [tab, setTab] = useState<"gallery" | "archive">("gallery");
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<{ photo: GalleryPhoto; job: GalleryJob } | null>(null);
  const failRev = useMediaFailureRevision();

  const entries = useMemo(() => {
    const list: GalleryEntry[] = [];
    for (const job of jobs) {
      const bucket = jobGalleryBucket(job);
      const photos = jobApprovedPhotos(job);
      if (!bucket || photos.length === 0) continue;
      list.push({ job, bucket, photos });
    }
    return list;
  }, [jobs, failRev]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter(({ job }) => {
      if (!q) return true;
      return (
        (job.address || "").toLowerCase().includes(q) ||
        (job.flatNumber || "").toLowerCase().includes(q) ||
        (job.client || "").toLowerCase().includes(q)
      );
    });
  }, [entries, search]);

  const galleryJobs = useMemo(
    () => filtered.filter((e) => e.bucket === "active" || e.bucket === "grace"),
    [filtered],
  );
  const archiveJobs = useMemo(
    () => filtered.filter((e) => e.bucket === "archived"),
    [filtered],
  );
  const visible = tab === "gallery" ? galleryJobs : archiveJobs;
  const galleryPhotoCount = galleryJobs.reduce((s, e) => s + e.photos.length, 0);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const PhotoThumbGrid = ({ photos, job }: { photos: GalleryPhoto[]; job: GalleryJob }) => (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {photos.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setLightbox({ photo: p, job })}
          className="group relative aspect-square rounded-xl overflow-hidden bg-secondary ring-1 ring-border/60"
        >
          <JobPhotoImg src={p.publicUrl} alt="" className="w-full h-full object-cover"/>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-1.5 py-1">
            <p className="text-[8px] text-white font-medium truncate">{PHOTO_LABEL_NAMES[p.label]}</p>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-1 flex-col min-h-0 w-full overflow-hidden">
      <div ref={scrollRef} className="flex-1 w-full overflow-y-auto overscroll-contain">
        <div className="max-w-2xl mx-auto w-full px-4 py-4 space-y-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Images size={18} className="text-primary"/>
              Galeria zdjęć
            </h2>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Zaakceptowane zdjęcia ekipy. Po zdaniu kluczy roboty zostają tu {GALLERY_ARCHIVE_DAYS} dni, potem trafiają do archiwum.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-card rounded-xl border border-border px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">W galerii</p>
              <p className="text-lg font-bold text-primary mt-0.5">{galleryPhotoCount}</p>
            </div>
            <div className="bg-card rounded-xl border border-border px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Roboty</p>
              <p className="text-lg font-bold mt-0.5">{galleryJobs.length}</p>
            </div>
          </div>

          <div className="flex gap-1 p-1 bg-secondary rounded-xl">
            <button
              type="button"
              onClick={() => setTab("gallery")}
              className={`flex-1 py-2 rounded-lg text-xs font-medium ${tab === "gallery" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Galeria ({galleryJobs.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("archive")}
              className={`flex-1 py-2 rounded-lg text-xs font-medium ${tab === "archive" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Archiwum ({archiveJobs.length})
            </button>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
            <input
              type="text"
              placeholder="Szukaj adresu, klienta…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-secondary rounded-xl pl-9 pr-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
            />
          </div>

          {visible.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Images size={36} className="mx-auto opacity-20 mb-2"/>
              <p className="text-xs">
                {tab === "gallery" ? "Brak zaakceptowanych zdjęć w galerii." : "Archiwum jest puste."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map(({ job, bucket, photos }) => {
                const expanded = expandedIds.has(job.id);
                const daysLeft = bucket === "grace" ? galleryDaysUntilArchive(job) : null;
                return (
                  <div key={job.id} className="bg-card rounded-xl border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(job.id)}
                      className="w-full text-left px-4 py-3 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-secondary shrink-0 ring-1 ring-border">
                          {photos[0]?.publicUrl ? (
                            <JobPhotoImg src={photos[0].publicUrl} alt="" className="w-full h-full object-cover"/>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Camera size={18}/></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{jobDisplayTitle(job)}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{job.client || "—"}</p>
                            </div>
                            {expanded ? <ChevronDown size={16} className="shrink-0"/> : <ChevronRight size={16} className="shrink-0"/>}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{photos.length} zdj.</span>
                            {daysLeft !== null && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                Jeszcze {daysLeft} dni
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                    {expanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                        {PHOTO_LABEL_ORDER.map((label) => {
                          const group = photos.filter((p) => p.label === label);
                          if (group.length === 0) return null;
                          const meta = getPhotoLabelSection()[label];
                          const Icon = meta.icon;
                          return (
                            <div key={label}>
                              <div className={`flex items-center gap-2 mb-2 pb-1 border-b ${meta.border}`}>
                                <Icon size={12} className={meta.accent}/>
                                <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta.accent}`}>
                                  {PHOTO_LABEL_NAMES[label]} ({group.length})
                                </span>
                              </div>
                              <PhotoThumbGrid photos={group} job={job}/>
                            </div>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => onOpenJob(job.id)}
                          className="inline-flex items-center gap-1.5 text-xs text-primary font-medium min-h-[44px] touch-manipulation"
                        >
                          <MapPin size={12}/>Otwórz robotę
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90" onClick={() => setLightbox(null)}>
          <button type="button" className="absolute top-4 right-4 text-white p-2" onClick={() => setLightbox(null)}>
            <X size={24}/>
          </button>
          <JobPhotoImg src={lightbox.photo.publicUrl} alt="" className="max-w-full max-h-[85vh] rounded-xl object-contain" onClick={(e) => e.stopPropagation()}/>
          <div className="absolute bottom-6 left-4 right-4 text-center pointer-events-none">
            <p className="text-white font-medium text-sm">{jobDisplayTitle(lightbox.job)}</p>
            <p className="text-white/90 text-xs mt-0.5">{PHOTO_LABEL_NAMES[lightbox.photo.label]}</p>
          </div>
        </div>
      )}
    </div>
  );
}
