import { useState, useMemo } from "react";
import {
  Camera, ChevronDown, ChevronRight, ChevronUp, Download, Eye, Images, Search, X,
} from "lucide-react";
import { toast } from "sonner";
import type { CrewPhotoLabel } from "@/lib/photo-labels";
import { downloadJobGalleryZip } from "@/lib/photo-download";
import { JobPhotoImg } from "@/app/JobPhotoImg";
import type { Job, PhotoEntry, JobGalleryBucket } from "@/app/app-domain";
import {
  GALLERY_ARCHIVE_DAYS,
  PHOTO_LABEL_NAMES,
  PHOTO_LABEL_ORDER,
  PHOTO_LABEL_SECTION,
  fmtDate,
  jobApprovedPhotos,
  jobDisplayTitle,
  jobGalleryBucket,
  jobHandoverIso,
  galleryDaysUntilArchive,
} from "@/app/app-domain";

interface JobPhotoGalleryEntry {
  job: Job;
  bucket: JobGalleryBucket;
  photos: PhotoEntry[];
}

export function JobPhotosGalleryView({
  jobs,
  onOpenJob,
}: {
  jobs: Job[];
  onOpenJob: (jobId: string) => void;
}) {
  const [tab, setTab] = useState<"gallery" | "archive">("gallery");
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<{ photo: PhotoEntry; job: Job } | null>(null);
  const [zipBusy, setZipBusy] = useState<string | null>(null);

  const entries = useMemo(() => {
    const list: JobPhotoGalleryEntry[] = [];
    for (const job of jobs) {
      const bucket = jobGalleryBucket(job);
      const photos = jobApprovedPhotos(job);
      if (!bucket || photos.length === 0) continue;
      list.push({ job, bucket, photos });
    }
    return list;
  }, [jobs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter(({ job }) => {
      if (!q) return true;
      return (
        job.address.toLowerCase().includes(q) ||
        job.flatNumber.toLowerCase().includes(q) ||
        job.client.toLowerCase().includes(q)
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

  const totalApproved = entries.reduce((s, e) => s + e.photos.length, 0);
  const galleryPhotoCount = galleryJobs.reduce((s, e) => s + e.photos.length, 0);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runGalleryZip = async (job: Job, photos: PhotoEntry[], filter?: CrewPhotoLabel) => {
    const key = filter ? `${job.id}-${filter}` : `${job.id}-all`;
    setZipBusy(key);
    try {
      const title = jobDisplayTitle(job);
      const res = await downloadJobGalleryZip(title, photos, filter);
      if (res.ok) toast.success(`Pobrano ZIP: ${res.count} zdjęć`);
      else toast.error(res.error || "Nie udało się spakować galerii");
    } finally {
      setZipBusy(null);
    }
  };

  const PhotoThumbGrid = ({ photos, job }: { photos: PhotoEntry[]; job: Job }) => (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
      {photos.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setLightbox({ photo: p, job })}
          className="group relative aspect-square rounded-xl overflow-hidden bg-secondary ring-1 ring-border/60 hover:ring-primary/40 transition-all"
        >
          <JobPhotoImg src={p.publicUrl} alt="" className="w-full h-full object-cover"/>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"/>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-1.5 py-1 pointer-events-none">
            <p className="text-[8px] text-white font-medium truncate">{PHOTO_LABEL_NAMES[p.label]}</p>
          </div>
        </button>
      ))}
    </div>
  );

  const JobPhotoCard = ({ entry }: { entry: JobPhotoGalleryEntry }) => {
    const { job, bucket, photos } = entry;
    const expanded = expandedIds.has(job.id);
    const daysLeft = bucket === "grace" ? galleryDaysUntilArchive(job) : null;
    const handoverIso = jobHandoverIso(job);

    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => toggleExpanded(job.id)}
          className="w-full text-left px-4 sm:px-5 py-4 hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-secondary shrink-0 ring-1 ring-border">
              {photos[0]?.publicUrl ? (
                <JobPhotoImg src={photos[0].publicUrl} alt="" className="w-full h-full object-cover"/>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Camera size={20}/></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{jobDisplayTitle(job)}</p>
                  <p className="text-xs text-muted-foreground truncate">{job.client || "—"}</p>
                </div>
                {expanded ? <ChevronDown size={16} className="text-muted-foreground shrink-0 mt-0.5"/> : <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-0.5"/>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {photos.length} zdj.
                </span>
                {bucket === "active" && job.status === "in_progress" && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">W trakcie</span>
                )}
                {bucket === "active" && job.status === "completed" && !job.keysHandedOver && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">Zdane</span>
                )}
                {bucket === "grace" && daysLeft !== null && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    W galerii jeszcze {daysLeft} dni
                  </span>
                )}
                {bucket === "archived" && handoverIso && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    Zdane {fmtDate(handoverIso)}
                  </span>
                )}
              </div>
            </div>
          </div>
          {!expanded && photos.length > 1 && (
            <div className="flex gap-1 mt-3 overflow-hidden">
              {photos.slice(0, 5).map((p) => (
                <div key={p.id} className="w-10 h-10 rounded-lg overflow-hidden bg-secondary shrink-0 ring-1 ring-border/50">
                  <JobPhotoImg src={p.publicUrl} alt="" className="w-full h-full object-cover"/>
                </div>
              ))}
              {photos.length > 5 && (
                <div className="w-10 h-10 rounded-lg bg-secondary shrink-0 flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                  +{photos.length - 5}
                </div>
              )}
            </div>
          )}
        </button>

        {expanded && (
          <div className="px-4 sm:px-5 pb-4 space-y-4 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={zipBusy === `${job.id}-all`}
                onClick={(e) => { e.stopPropagation(); void runGalleryZip(job, photos); }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 disabled:opacity-50"
              >
                <Download size={12}/>
                {zipBusy === `${job.id}-all` ? "Pakowanie…" : `Pobierz galerię ZIP (${photos.length})`}
              </button>
              <span className="text-[10px] text-muted-foreground">
                Foldery: przed · w-realizacji · po-odbior · nazwy: ulica, data
              </span>
            </div>
            {PHOTO_LABEL_ORDER.map((label) => {
              const group = photos.filter((p) => p.label === label);
              if (group.length === 0) return null;
              const meta = PHOTO_LABEL_SECTION[label];
              const Icon = meta.icon;
              const busyKey = `${job.id}-${label}`;
              return (
                <div key={label}>
                  <div className={`flex flex-wrap items-center justify-between gap-2 mb-2 pb-1 border-b ${meta.border}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon size={13} className={meta.accent}/>
                      <span className={`text-xs font-semibold uppercase tracking-wider ${meta.accent}`}>
                        {PHOTO_LABEL_NAMES[label]}
                      </span>
                      <span className="text-[10px] text-muted-foreground">({group.length})</span>
                    </div>
                    <button
                      type="button"
                      disabled={zipBusy === busyKey}
                      onClick={(e) => { e.stopPropagation(); void runGalleryZip(job, photos, label); }}
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline disabled:opacity-50 shrink-0"
                    >
                      <Download size={11}/>
                      {zipBusy === busyKey ? "…" : "ZIP kategorii"}
                    </button>
                  </div>
                  <PhotoThumbGrid photos={group} job={job}/>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => onOpenJob(job.id)}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              <MapPin size={12}/>Otwórz robotę
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain pb-20 sm:pb-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Images size={22} className="text-primary"/>
            Zdjęcia z robot
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tylko zaakceptowane zdjęcia. Po zdaniu mieszkania i kluczy roboty zostają tutaj {GALLERY_ARCHIVE_DAYS} dni, potem trafiają do archiwum.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-card rounded-xl border border-border px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">W galerii</p>
            <p className="text-lg font-bold text-primary mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{galleryPhotoCount}</p>
          </div>
          <div className="bg-card rounded-xl border border-border px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Roboty</p>
            <p className="text-lg font-bold mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{galleryJobs.length}</p>
          </div>
          <div className="bg-card rounded-xl border border-border px-4 py-3 col-span-2 sm:col-span-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Łącznie zaakcept.</p>
            <p className="text-lg font-bold mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{totalApproved}</p>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-secondary rounded-xl">
          <button
            type="button"
            onClick={() => setTab("gallery")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "gallery" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Galeria ({galleryJobs.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("archive")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "archive" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Archiwum ({archiveJobs.length})
          </button>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input
            type="text"
            placeholder="Szukaj adresu, klienta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary rounded-xl pl-9 pr-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
          />
        </div>

        {visible.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Images size={40} className="mx-auto opacity-20 mb-3"/>
            <p className="text-sm">
              {tab === "gallery"
                ? "Brak zaakceptowanych zdjęć w galerii. Akceptuj zdjęcia w zakładce Roboty."
                : "Archiwum zdjęć jest puste — tu trafiają roboty zdane dłużej niż 30 dni temu."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((entry) => (
              <JobPhotoCard key={entry.job.id} entry={entry}/>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90" onClick={() => setLightbox(null)}>
          <button type="button" className="absolute top-4 right-4 text-white/70 hover:text-white p-2" onClick={() => setLightbox(null)}>
            <X size={24}/>
          </button>
          <JobPhotoImg
            src={lightbox.photo.publicUrl}
            alt=""
            className="max-w-full max-h-[85vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-6 left-4 right-4 text-center pointer-events-none">
            <p className="text-white font-medium text-sm">{jobDisplayTitle(lightbox.job)}</p>
            <p className="text-white/90 text-xs mt-0.5">{PHOTO_LABEL_NAMES[lightbox.photo.label]}</p>
            {lightbox.photo.caption && <p className="text-white/75 text-xs mt-1 italic">{lightbox.photo.caption}</p>}
            <p className="text-white/50 text-[11px] mt-1">
              {lightbox.photo.uploadedBy} · {new Date(lightbox.photo.uploadedAt).toLocaleDateString("pl-PL")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}