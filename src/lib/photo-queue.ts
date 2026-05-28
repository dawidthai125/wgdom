const DB_NAME = "wgdom-photo-queue-v1";
const STORE = "queue";
const DB_VERSION = 2;

export type QueuedPhotoKind = "worker" | "inspector";

export interface QueuedPhoto {
  id: string;
  jobId: string;
  /** worker: before|after|progress; inspector: etykieta inspektora */
  label: string;
  caption: string;
  uploadedBy: string;
  queuedAt: string;
  blob: Blob;
  filename: string;
  kind?: QueuedPhotoKind;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
  });
}

export async function queuePhoto(item: Omit<QueuedPhoto, "id" | "queuedAt">): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add({
      ...item,
      kind: item.kind ?? "worker",
      id: crypto.randomUUID(),
      queuedAt: new Date().toISOString(),
    } satisfies QueuedPhoto);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listQueuedPhotos(kind?: QueuedPhotoKind): Promise<QueuedPhoto[]> {
  const db = await openDb();
  const items = await new Promise<QueuedPhoto[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedPhoto[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  const filtered = kind
    ? items.filter((i) => (i.kind ?? "worker") === kind)
    : items;
  return filtered.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
}

export async function removeQueuedPhoto(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function queuedPhotoCount(kind?: QueuedPhotoKind): Promise<number> {
  const items = await listQueuedPhotos(kind);
  return items.length;
}
