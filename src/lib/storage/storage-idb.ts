/**
 * LOCALSTORAGE-ARCH-02 — IndexedDB adapter (Tier 2 cold store).
 * Bez zmian merge cloud / Payroll / CloudLoader.
 */

const DB_NAME = "wgdom-storage-v1";
const DB_VERSION = 1;
const STORE = "kv";

export type IdbKvRecord = { key: string; value: unknown; updatedAt: string };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb open failed"));
  });
}

export async function idbSet(key: string, value: unknown): Promise<boolean> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("idb write failed"));
      tx.objectStore(STORE).put({
        key,
        value,
        updatedAt: new Date().toISOString(),
      } satisfies IdbKvRecord);
    });
    db.close();
    return true;
  } catch {
    return false;
  }
}

export async function idbGet<T = unknown>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    const result = await new Promise<IdbKvRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as IdbKvRecord | undefined);
      req.onerror = () => reject(req.error ?? new Error("idb read failed"));
    });
    db.close();
    return (result?.value as T) ?? null;
  } catch {
    return null;
  }
}

export async function idbRemove(key: string): Promise<boolean> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("idb delete failed"));
      tx.objectStore(STORE).delete(key);
    });
    db.close();
    return true;
  } catch {
    return false;
  }
}

export async function idbKeys(): Promise<string[]> {
  try {
    const db = await openDb();
    const keys = await new Promise<string[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAllKeys();
      req.onsuccess = () => resolve((req.result as IDBValidKey[]).map(String));
      req.onerror = () => reject(req.error ?? new Error("idb keys failed"));
    });
    db.close();
    return keys;
  } catch {
    return [];
  }
}
