/**
 * STORAGE-TIER1-PIPELINE-CONTRACT-01 — NEW-05: test-only in-memory `indexedDB` stub.
 *
 * Covers exactly the surface used by `src/lib/storage/storage-idb.ts`:
 * open(name, version) → onupgradeneeded/onsuccess/onerror · objectStoreNames.contains ·
 * createObjectStore · transaction(store, mode).oncomplete/onerror · objectStore().put/get/delete/getAllKeys · close().
 *
 * NEVER import from production runtime. Node ≥ 17 (structuredClone).
 *
 * Modes: "ok" (default) · "missing" (indexedDB undefined) · "write_fail" (put → tx.onerror) ·
 * "read_fail" (get → req.onerror). `tamper(key, fn)` mutates the stored value in place
 * (simulates corrupt / foreign write between set and read-back).
 */

const STORE_KEY = "__WG_IDB_STUB_STORE__";

function store() {
  if (!globalThis[STORE_KEY]) globalThis[STORE_KEY] = new Map();
  return globalThis[STORE_KEY];
}

function defer(fn) {
  setTimeout(fn, 0);
}

function makeRequest() {
  return { result: undefined, error: null, onsuccess: null, onerror: null };
}

class FakeObjectStore {
  constructor(tx, dbStore) {
    this.tx = tx;
    this.dbStore = dbStore;
  }
  put(record) {
    const req = makeRequest();
    defer(() => {
      if (this.tx.db.mode === "write_fail") {
        this.tx.error = new Error("stub: write_fail");
        this.tx.onerror?.({ target: this.tx });
        return;
      }
      this.dbStore.set(String(record.key), structuredClone(record));
      const hook = this.tx.db.stub.afterPutOnce;
      if (hook) {
        this.tx.db.stub.afterPutOnce = null;
        hook(String(record.key));
      }
      req.result = record.key;
      req.onsuccess?.({ target: req });
      this.tx._settle();
    });
    return req;
  }
  get(key) {
    const req = makeRequest();
    defer(() => {
      if (this.tx.db.mode === "read_fail") {
        req.error = new Error("stub: read_fail");
        req.onerror?.({ target: req });
        this.tx._settle();
        return;
      }
      const rec = this.dbStore.get(String(key));
      req.result = rec === undefined ? undefined : structuredClone(rec);
      req.onsuccess?.({ target: req });
      this.tx._settle();
    });
    return req;
  }
  delete(key) {
    const req = makeRequest();
    defer(() => {
      this.dbStore.delete(String(key));
      req.onsuccess?.({ target: req });
      this.tx._settle();
    });
    return req;
  }
  getAllKeys() {
    const req = makeRequest();
    defer(() => {
      req.result = [...this.dbStore.keys()];
      req.onsuccess?.({ target: req });
      this.tx._settle();
    });
    return req;
  }
}

class FakeTransaction {
  constructor(db, storeName) {
    this.db = db;
    this.storeName = storeName;
    this.error = null;
    this.oncomplete = null;
    this.onerror = null;
    this._settled = false;
  }
  objectStore() {
    return new FakeObjectStore(this, this.db.stores.get(this.storeName));
  }
  _settle() {
    if (this._settled) return;
    this._settled = true;
    defer(() => this.oncomplete?.({ target: this }));
  }
}

class FakeDatabase {
  constructor(name, stub) {
    this.name = name;
    this.stub = stub;
    this.stores = stub.databases.get(name);
    this.objectStoreNames = { contains: (n) => this.stores.has(n) };
  }
  get mode() {
    return this.stub.mode;
  }
  createObjectStore(name) {
    if (!this.stores.has(name)) this.stores.set(name, new Map());
    return { name };
  }
  transaction(storeName) {
    if (!this.stores.has(storeName)) throw new Error(`stub: store ${storeName} missing`);
    return new FakeTransaction(this, storeName);
  }
  close() {}
}

class FakeIndexedDB {
  constructor() {
    this.mode = "ok";
    this.databases = store();
    this.openCount = 0;
    /** One-shot hook fired synchronously right after a put lands (before its request/tx completes). */
    this.afterPutOnce = null;
  }
  open(name) {
    this.openCount += 1;
    const req = makeRequest();
    defer(() => {
      const fresh = !this.databases.has(name);
      if (fresh) this.databases.set(name, new Map());
      const db = new FakeDatabase(name, this);
      req.result = db;
      if (fresh) req.onupgradeneeded?.({ target: req });
      req.onsuccess?.({ target: req });
    });
    return req;
  }
}

/**
 * Install stub on globalThis. Returns handle with `setMode`, `tamper`, `getRaw`, `reset`, `uninstall`.
 * @param {{ mode?: "ok" | "missing" | "write_fail" | "read_fail" }} [opts]
 */
export function installIdbStub(opts = {}) {
  const mode = opts.mode ?? "ok";
  const stub = new FakeIndexedDB();
  stub.mode = mode;
  if (mode === "missing") {
    globalThis.indexedDB = undefined;
  } else {
    globalThis.indexedDB = stub;
  }

  const raw = (dbName, storeName, key) => {
    const db = stub.databases.get(dbName);
    const st = db?.get(storeName);
    return st?.get(String(key));
  };

  return {
    stub,
    setMode(next) {
      stub.mode = next;
      globalThis.indexedDB = next === "missing" ? undefined : stub;
    },
    /** Register one-shot callback fired synchronously after the next put lands (deterministic tamper between set and read-back). */
    onAfterPut(fn) {
      stub.afterPutOnce = fn;
    },
    /** Read stored record `{key, value, updatedAt}` (clone). */
    getRaw(key, dbName = "wgdom-storage-v1", storeName = "kv") {
      const rec = raw(dbName, storeName, key);
      return rec === undefined ? undefined : structuredClone(rec);
    },
    /** Mutate stored record value in place: fn(value) → newValue (or mutate & return undefined). */
    tamper(key, fn, dbName = "wgdom-storage-v1", storeName = "kv") {
      const db = stub.databases.get(dbName);
      const st = db?.get(storeName);
      const rec = st?.get(String(key));
      if (!rec) return false;
      const next = fn(rec.value);
      if (next !== undefined) rec.value = next;
      return true;
    },
    /** Overwrite stored value directly (e.g. seed legacy array). */
    seed(key, value, dbName = "wgdom-storage-v1", storeName = "kv") {
      if (!stub.databases.has(dbName)) stub.databases.set(dbName, new Map());
      const db = stub.databases.get(dbName);
      if (!db.has(storeName)) db.set(storeName, new Map());
      db.get(storeName).set(String(key), { key, value: structuredClone(value), updatedAt: new Date().toISOString() });
    },
    reset() {
      stub.databases.clear();
    },
    uninstall() {
      delete globalThis.indexedDB;
    },
  };
}
