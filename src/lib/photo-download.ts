import { saveAs } from "file-saver";
import type { CrewPhotoLabel } from "@/lib/photo-labels";
import { PHOTO_LABEL_SECTION } from "@/lib/photo-labels";
import type { InspectorPhotoEntry } from "@/lib/job-wm";
import { INSPECTOR_PHOTO_LABEL_SECTION, normalizeInspectorPhotoLabel } from "@/lib/photo-labels";

export function safeDownloadName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/\s+/g, " ").trim() || "plik";
}

export function extFromPhotoUrl(url: string, fallback = ".jpg"): string {
  try {
    const path = new URL(url).pathname;
    const dot = path.lastIndexOf(".");
    if (dot >= 0 && path.length - dot <= 6) return path.slice(dot);
  } catch {
    /* ignore */
  }
  return fallback;
}

export function fmtPhotoDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function jobSlug(address: string): string {
  return safeDownloadName(address || "robota").slice(0, 40);
}

export async function downloadUrlAsFile(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  saveAs(blob, safeDownloadName(filename));
}

export type DownloadablePhoto = {
  id: string;
  publicUrl: string;
  uploadedAt: string;
  caption?: string;
  uploadedBy?: string;
  label?: CrewPhotoLabel;
};

export function buildCrewPhotoFilename(
  jobAddress: string,
  photo: DownloadablePhoto,
  index: number,
): string {
  const ext = extFromPhotoUrl(photo.publicUrl);
  const folder = photo.label ? PHOTO_LABEL_SECTION[photo.label].zipFolder : "zdjecie";
  const date = photo.uploadedAt.slice(0, 10);
  const desc = photo.caption ? `-${safeDownloadName(photo.caption).slice(0, 40)}` : "";
  return `${jobSlug(jobAddress)}-${folder}-${date}${desc}-${index + 1}${ext}`;
}

export function buildInspectorPhotoFilename(
  jobAddress: string,
  photo: InspectorPhotoEntry,
  index: number,
): string {
  const ext = extFromPhotoUrl(photo.publicUrl);
  const date = photo.uploadedAt.slice(0, 10);
  const folder = INSPECTOR_PHOTO_LABEL_SECTION[normalizeInspectorPhotoLabel(photo.label)].zipFolder;
  const desc = photo.caption ? safeDownloadName(photo.caption).slice(0, 40) : `zdjecie-${index + 1}`;
  return `${jobSlug(jobAddress)}-${folder}-${date}-${desc}${ext}`;
}

export function buildInspectorPhotoZipPath(photo: InspectorPhotoEntry, index: number): string {
  const folder = INSPECTOR_PHOTO_LABEL_SECTION[normalizeInspectorPhotoLabel(photo.label)].zipFolder;
  const ext = extFromPhotoUrl(photo.publicUrl);
  const date = photo.uploadedAt.slice(0, 10);
  const desc = photo.caption ? safeDownloadName(photo.caption).slice(0, 40) : `zdjecie-${index + 1}`;
  return `inspektor/${folder}/${date}-${desc}${ext}`;
}

export async function downloadPhotosBatch(
  photos: DownloadablePhoto[],
  buildFilename: (photo: DownloadablePhoto, index: number) => string,
): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    if (!p.publicUrl) continue;
    try {
      await downloadUrlAsFile(p.publicUrl, buildFilename(p, i));
      ok++;
    } catch {
      failed++;
    }
  }
  return { ok, failed };
}

export async function downloadInspectorPhotosBatch(
  jobAddress: string,
  photos: InspectorPhotoEntry[],
): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    if (!p.publicUrl) continue;
    try {
      await downloadUrlAsFile(p.publicUrl, buildInspectorPhotoFilename(jobAddress, p, i));
      ok++;
    } catch {
      failed++;
    }
  }
  return { ok, failed };
}
