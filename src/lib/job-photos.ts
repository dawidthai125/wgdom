/** Minimal shape for union merge — avoids import cycle app-domain ↔ cloud-sync. */
export type CrewPhotoMergeEntry = {
  id: string;
  uploadedAt: string;
};

export interface PhotoTombstone {
  photoId: string;
  deletedAt: string;
  deletedBy?: string;
  path?: string;
  label?: string;
}

type PhotoTombstoneSource = {
  id: string;
  path?: string;
  label?: string;
};

export function buildPhotoTombstone(
  photo: PhotoTombstoneSource,
  opts: { deletedBy?: string; deletedAt?: string } = {},
): PhotoTombstone {
  return {
    photoId: photo.id,
    deletedAt: opts.deletedAt ?? new Date().toISOString(),
    deletedBy: opts.deletedBy,
    path: photo.path,
    label: photo.label,
  };
}

export function appendPhotoTombstone<T extends { deletedPhotoTombstones?: PhotoTombstone[] }>(
  job: T,
  tombstone: PhotoTombstone,
): T {
  const prev = job.deletedPhotoTombstones ?? [];
  const next = [...prev.filter((t) => t.photoId !== tombstone.photoId), tombstone];
  return { ...job, deletedPhotoTombstones: next };
}

export function mergePhotoTombstones(
  a: PhotoTombstone[] | undefined,
  b: PhotoTombstone[] | undefined,
): PhotoTombstone[] {
  const map = new Map<string, PhotoTombstone>();
  for (const t of [...(a || []), ...(b || [])]) {
    if (!t?.photoId) continue;
    const prev = map.get(t.photoId);
    if (!prev || t.deletedAt >= prev.deletedAt) map.set(t.photoId, t);
  }
  return [...map.values()];
}

export function filterPhotosByTombstones<T extends { id: string }>(
  photos: T[] | undefined,
  tombstones: PhotoTombstone[] | undefined,
): T[] {
  const dead = new Set((tombstones || []).map((t) => t.photoId));
  return (photos || []).filter((p) => !dead.has(p.id));
}

export function removePhotoWithTombstone<
  T extends { photos?: PhotoTombstoneSource[]; deletedPhotoTombstones?: PhotoTombstone[] },
>(job: T, photoId: string, opts: { deletedBy?: string } = {}): T {
  const photo = (job.photos || []).find((p) => p.id === photoId);
  if (!photo) return job;
  const withTombstone = appendPhotoTombstone(job, buildPhotoTombstone(photo, { deletedBy: opts.deletedBy }));
  return {
    ...withTombstone,
    photos: (withTombstone.photos || []).filter((p) => p.id !== photoId),
  };
}

/** Union merge crew photos by stable `id` — tombstones exclude deleted ids (JOBS-PHOTOS-DELETE-SYNC-01). */
export function mergePhotos<T extends CrewPhotoMergeEntry>(
  a: T[] | undefined,
  b: T[] | undefined,
  tombstones?: PhotoTombstone[],
): T[] {
  const map = new Map<string, T>();
  for (const p of filterPhotosByTombstones([...(a || []), ...(b || [])], tombstones)) {
    if (p?.id) map.set(p.id, p);
  }
  return [...map.values()].sort((x, y) => y.uploadedAt.localeCompare(x.uploadedAt));
}
