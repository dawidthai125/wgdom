/** Minimal shape for union merge — avoids import cycle app-domain ↔ cloud-sync. */
export type CrewPhotoMergeEntry = {
  id: string;
  uploadedAt: string;
};

/** Union merge crew photos by stable `id` — wzorzec mergeInspectorPhotos. */
export function mergePhotos<T extends CrewPhotoMergeEntry>(
  a: T[] | undefined,
  b: T[] | undefined,
): T[] {
  const map = new Map<string, T>();
  for (const p of [...(a || []), ...(b || [])]) {
    if (p?.id) map.set(p.id, p);
  }
  return [...map.values()].sort((x, y) => y.uploadedAt.localeCompare(x.uploadedAt));
}
