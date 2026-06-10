import { useMemo, useState } from "react";
import { FolderOpen, Images } from "lucide-react";
import { JobPhotosGalleryView } from "@/app/JobPhotosGalleryView";
import { JobFilesBrowser } from "@/app/JobFilesBrowser";
import type { Job } from "@/app/app-domain";
import { countAllFilesHubItems } from "@/lib/files-hub-index";
import { countAllJobsImages } from "@/lib/media-separation";

type MediaTab = "photos" | "files";

export function MediaView({
  jobs,
  athPreviewEnabled,
  onOpenJobFromGallery,
  onOpenJobFromFiles,
}: {
  jobs: Job[];
  athPreviewEnabled: boolean;
  onOpenJobFromGallery: (id: string) => void;
  onOpenJobFromFiles: (id: string) => void;
}) {
  const [tab, setTab] = useState<MediaTab>("photos");

  const photoTotal = useMemo(() => countAllJobsImages(jobs), [jobs]);
  const docTotal = useMemo(() => countAllFilesHubItems(jobs), [jobs]);

  return (
    <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
      <div className="shrink-0 px-4 sm:px-8 pt-6 pb-3 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <FolderOpen size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Zdjęcia i pliki</h1>
            <p className="text-xs text-muted-foreground">Zdjęcia (galeria) · Pliki: kontrakt, dokumentacja ekipy, załączniki — osobne ZIP</p>
          </div>
        </div>
        <div className="flex gap-1 p-1 bg-secondary rounded-xl">
          <button
            type="button"
            onClick={() => setTab("photos")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${tab === "photos" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Images size={14} />
            Zdjęcia{photoTotal > 0 ? ` (${photoTotal})` : ""}
          </button>
          <button
            type="button"
            onClick={() => setTab("files")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${tab === "files" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <FolderOpen size={14} />
            Pliki{docTotal > 0 ? ` (${docTotal})` : ""}
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {tab === "photos" ? (
          <JobPhotosGalleryView jobs={jobs} onOpenJob={onOpenJobFromGallery} embedded />
        ) : (
          <JobFilesBrowser
            jobs={jobs}
            athPreviewEnabled={athPreviewEnabled}
            layout="admin"
            embedded
            onOpenJob={onOpenJobFromFiles}
          />
        )}
      </div>
    </div>
  );
}
