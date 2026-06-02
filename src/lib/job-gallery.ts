import { filterAvailablePhotos } from "@/lib/media-filter";

export const GALLERY_ARCHIVE_DAYS = 30;

export type GalleryPhoto = {
  id: string;
  publicUrl: string;
  label: "before" | "after" | "progress";
  uploadedBy: string;
  uploadedAt: string;
  status: "pending" | "approved" | "rejected";
  caption?: string;
};

export type GalleryJob = {
  id: string;
  address: string;
  flatNumber: string;
  client: string;
  status: "in_progress" | "completed";
  keysHandedOver: boolean;
  startDate: string;
  endDate: string;
  photos?: GalleryPhoto[];
  activityLog?: { type: string; at: string }[];
};

export type JobGalleryBucket = "active" | "grace" | "archived";

export function jobDisplayTitle(job: { address?: string; flatNumber?: string }): string {
  const addr = job.address?.trim() || "Bez adresu";
  return job.flatNumber ? `${addr} m.${job.flatNumber}` : addr;
}

export function jobApprovedPhotos(job: { photos?: GalleryPhoto[] }): GalleryPhoto[] {
  return filterAvailablePhotos(
    (job.photos || []).filter((p) => p.status === "approved" && p.publicUrl),
  );
}

function jobHandoverIso(job: GalleryJob): string | null {
  if (job.status !== "completed" || !job.keysHandedOver) return null;
  if (job.endDate) return job.endDate;
  const log = job.activityLog || [];
  for (let i = log.length - 1; i >= 0; i--) {
    const a = log[i];
    if (a.type === "status_change") return a.at.slice(0, 10);
  }
  return job.startDate || null;
}

function daysSinceIso(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const then = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((today.getTime() - then.getTime()) / 86400000);
}

export function jobGalleryBucket(job: GalleryJob): JobGalleryBucket | null {
  if (jobApprovedPhotos(job).length === 0) return null;
  if (job.status !== "completed" || !job.keysHandedOver) return "active";
  const handoverIso = jobHandoverIso(job);
  if (!handoverIso) return "grace";
  return daysSinceIso(handoverIso) <= GALLERY_ARCHIVE_DAYS ? "grace" : "archived";
}

export function galleryDaysUntilArchive(job: GalleryJob): number | null {
  const handoverIso = jobHandoverIso(job);
  if (!handoverIso) return null;
  return Math.max(0, GALLERY_ARCHIVE_DAYS - daysSinceIso(handoverIso));
}
