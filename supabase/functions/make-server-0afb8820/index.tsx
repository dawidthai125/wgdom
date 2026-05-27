/** W&G DOM Edge Function — v2.9.16 trwałe usuwanie z kartoteki */
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const PHOTOS_BUCKET = "make-0afb8820-photos";

function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function ensurePhotosBucket() {
  const supabase = supabaseAdmin();
  const { error } = await supabase.storage.createBucket(PHOTOS_BUCKET, {
    public: true,
    fileSizeLimit: 10485760,
  });
  if (error && !error.message.toLowerCase().includes("already exists")) {
    console.log("createBucket:", error.message);
  }
}

const app = new Hono();

app.use('*', logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.get("/make-server-0afb8820/health", (c) => {
  return c.json({ status: "ok" });
});

// Batch get multiple keys at once (preserves key order)
app.post("/make-server-0afb8820/batch-get", async (c) => {
  const { keys } = await c.req.json();
  const values = await Promise.all(keys.map((k: string) => kv.get(k)));
  return c.json({ values });
});

function normalizeJobsKvValue(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && "id" in (raw as object)) return [raw];
  return [];
}

function jobId(j: unknown): string | undefined {
  if (!j || typeof j !== "object" || !("id" in j)) return undefined;
  return String((j as { id: string }).id);
}

function mergeJobsUnion(prev: unknown[], next: unknown[]): unknown[] {
  const map = new Map<string, unknown>();
  for (const j of prev) {
    const id = jobId(j);
    if (id) map.set(id, j);
  }
  for (const j of next) {
    const id = jobId(j);
    if (id) map.set(id, j);
  }
  return [...map.values()].sort((a, b) => {
    const da = (a as { startDate?: string }).startDate || "";
    const db = (b as { startDate?: string }).startDate || "";
    return db.localeCompare(da);
  });
}

/** Podejrzane nadpisanie — np. z wielu robót zostaje jedna bez jawnego usunięcia. */
function isSuspiciousJobsShrink(prev: unknown[], next: unknown[]): boolean {
  if (next.length === 0 && prev.length > 0) return true;
  if (prev.length >= 2 && next.length === 1) return true;
  if (prev.length >= 3 && next.length < Math.ceil(prev.length / 2)) return true;
  return false;
}

function normalizeDeletedIdsKv(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.length > 0);
}

function filterJobsNotDeleted(list: unknown[], deleted: Set<string>): unknown[] {
  return list.filter((j) => {
    const id = jobId(j);
    return id && !deleted.has(id);
  });
}

function dirId(item: unknown): string | undefined {
  if (!item || typeof item !== "object" || !("id" in item)) return undefined;
  return String((item as { id: string }).id);
}

function filterDirectoryNotDeleted(list: unknown[], deleted: Set<string>): unknown[] {
  return list.filter((d) => {
    const id = dirId(d);
    return id && !deleted.has(id);
  });
}

function isIntentionalDirectoryDelete(prev: unknown[], next: unknown[], deleted: Set<string>): boolean {
  const nextIds = new Set(next.map(dirId).filter(Boolean) as string[]);
  for (const d of prev) {
    const id = dirId(d);
    if (id && !nextIds.has(id) && !deleted.has(id)) return false;
  }
  return true;
}

/** Usunięcie dozwolone, gdy każde zniknięte id jest na liście tombstones. */
function isIntentionalJobsDelete(prev: unknown[], next: unknown[], deleted: Set<string>): boolean {
  const nextIds = new Set(next.map(jobId).filter(Boolean) as string[]);
  for (const j of prev) {
    const id = jobId(j);
    if (id && !nextIds.has(id) && !deleted.has(id)) return false;
  }
  return true;
}

function dayRichness(d: unknown): number {
  if (!d || typeof d !== "object") return 0;
  const day = d as Record<string, unknown>;
  let s = 0;
  if (day.active) s += 2;
  if (day.from || day.to) s += 1;
  s += (Array.isArray(day.extraHours) ? day.extraHours.length : 0) * 8;
  s += (Array.isArray(day.notes) ? day.notes.length : 0) * 4;
  if (parseFloat(String(day.zaliczka || "")) > 0) s += 1;
  return s;
}

function weekEmployeeRichness(emp: unknown): number {
  if (!emp || typeof emp !== "object") return 0;
  const e = emp as Record<string, unknown>;
  let s = 0;
  const days = e.days as Record<string, unknown> | undefined;
  if (days) for (const d of Object.values(days)) s += dayRichness(d);
  s += dayRichness(e.prevSaturday);
  s += (Array.isArray(e.extraCosts) ? e.extraCosts.length : 0) * 3;
  return s;
}

function weekEmployeesRichness(list: unknown[]): number {
  return list.reduce((sum, e) => sum + weekEmployeeRichness(e), 0);
}

function mergeWeekEmployeesUnion(prev: unknown[], next: unknown[]): unknown[] {
  const map = new Map<string, unknown>();
  const ingest = (list: unknown[]) => {
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const id = String((item as { id?: string }).id || "");
      if (!id) continue;
      const existing = map.get(id);
      if (!existing || weekEmployeeRichness(item) >= weekEmployeeRichness(existing)) {
        map.set(id, item);
      }
    }
  };
  ingest(prev);
  ingest(next);
  return [...map.values()];
}

function archiveWeekScore(w: unknown): number {
  if (!w || typeof w !== "object") return 0;
  const snap = w as { weekEmployees?: unknown[] };
  const we = Array.isArray(snap.weekEmployees) ? snap.weekEmployees : [];
  return weekEmployeesRichness(we) + we.length * 5;
}

function mergeArchiveUnion(prev: unknown[], next: unknown[]): unknown[] {
  const map = new Map<string, unknown>();
  const keyOf = (w: { id?: string; weekFrom?: string; weekTo?: string }) =>
    w.id || `${w.weekFrom}|${w.weekTo}`;
  const ingest = (list: unknown[]) => {
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const w = item as { id?: string; weekFrom?: string; weekTo?: string; weekEmployees?: unknown[] };
      if (!w.weekFrom) continue;
      const k = keyOf(w);
      const existing = map.get(k);
      if (!existing || archiveWeekScore(item) >= archiveWeekScore(existing)) {
        map.set(k, item);
      }
    }
  };
  ingest(prev);
  ingest(next);
  return [...map.values()];
}

function recordRichness(obj: unknown): number {
  if (!obj || typeof obj !== "object") return 0;
  let s = 0;
  for (const v of Object.values(obj as Record<string, unknown>)) {
    if (v == null || v === "") continue;
    if (typeof v === "string" && v.trim()) s += 1;
    if (typeof v === "number") s += 1;
    if (typeof v === "boolean") s += 0.5;
    if (Array.isArray(v)) s += v.length * 2;
  }
  return s;
}

function mergeRecordsByIdUnion(prev: unknown[], next: unknown[]): unknown[] {
  const map = new Map<string, unknown>();
  const ingest = (list: unknown[]) => {
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const id = String((item as { id?: string }).id || "");
      if (!id) continue;
      const existing = map.get(id);
      if (!existing || recordRichness(item) >= recordRichness(existing)) {
        map.set(id, item);
      }
    }
  };
  ingest(prev);
  ingest(next);
  return [...map.values()];
}

function mergeContactsUnion(prev: unknown[], next: unknown[]): unknown[] {
  const map = new Map<string, Record<string, unknown>>();
  const ingest = (list: unknown[]) => {
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const c = item as Record<string, unknown> & { id?: string; allowJobs?: boolean; allowPayroll?: boolean };
      const id = String(c.id || "");
      if (!id) continue;
      const existing = map.get(id);
      if (!existing) {
        map.set(id, { ...c });
        continue;
      }
      const pick = recordRichness(c) >= recordRichness(existing) ? c : existing;
      map.set(id, {
        ...existing,
        ...pick,
        allowJobs: c.allowJobs !== false || existing.allowJobs !== false,
        allowPayroll: c.allowPayroll === true || existing.allowPayroll === true,
      });
    }
  };
  ingest(prev);
  ingest(next);
  return [...map.values()];
}

function isSuspiciousArrayShrink(prev: unknown[], next: unknown[]): boolean {
  if (next.length === 0 && prev.length > 0) return true;
  if (prev.length >= 2 && next.length < Math.ceil(prev.length / 2)) return true;
  const prevR = prev.reduce((s, e) => s + recordRichness(e), 0);
  const nextR = next.reduce((s, e) => s + recordRichness(e), 0);
  if (prevR >= 6 && nextR < prevR * 0.45) return true;
  return false;
}

function isIntentionalWeekClear(nextEmps: unknown[], archiveInBatch: unknown[]): boolean {
  if (nextEmps.length > 0) return false;
  return archiveInBatch.some((w) => archiveWeekScore(w) >= 8);
}

function isSuspiciousPayrollShrink(prev: unknown[], next: unknown[]): boolean {
  if (next.length === 0 && prev.length > 0) return true;
  const prevR = weekEmployeesRichness(prev);
  const nextR = weekEmployeesRichness(next);
  if (prevR >= 8 && nextR < prevR * 0.45) return true;
  return false;
}

function isSuspiciousArchiveShrink(prev: unknown[], next: unknown[]): boolean {
  if (next.length === 0 && prev.length > 0) return true;
  const prevScore = prev.reduce((s, w) => s + archiveWeekScore(w), 0);
  const nextScore = next.reduce((s, w) => s + archiveWeekScore(w), 0);
  if (prevScore >= 10 && nextScore < prevScore * 0.45) return true;
  return false;
}

function normalizeArrayKv(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : [];
}

async function rotateKvBackups(baseKey: string): Promise<void> {
  const prev = await kv.get(baseKey);
  if (prev == null) return;
  const prev2 = await kv.get(`${baseKey}-prev`);
  if (prev2 != null) await kv.set(`${baseKey}-prev2`, prev2);
  await kv.set(`${baseKey}-prev`, prev);
}

async function rotateJobsBackups(prev: unknown): Promise<void> {
  const prev2 = await kv.get("kw-jobs-prev");
  if (prev2 != null) await kv.set("kw-jobs-prev2", prev2);
  await kv.set("kw-jobs-prev", prev);
  const day = new Date().toISOString().slice(0, 10);
  await kv.set(`kw-jobs-day-${day}`, prev);
}

async function protectArrayKey(
  key: string,
  nextRaw: unknown,
  mergeFn: (prev: unknown[], next: unknown[]) => unknown[],
  isShrink: (prev: unknown[], next: unknown[]) => boolean,
): Promise<unknown> {
  const prev = await kv.get(key);
  let nextNorm = normalizeArrayKv(nextRaw);
  if (prev != null) {
    await rotateKvBackups(key);
    const prevNorm = normalizeArrayKv(prev);
    if (isShrink(prevNorm, nextNorm)) {
      console.log(`${key}: blocked suspicious shrink ${prevNorm.length} → ${nextNorm.length}, merging`);
      nextNorm = mergeFn(prevNorm, nextNorm);
    }
  }
  return nextNorm;
}

async function saveDailyFullBackup(keys: string[], values: unknown[]): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  const bundleKey = `kw-full-day-${day}`;
  const bundle: Record<string, unknown> = {};
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].startsWith("kw-") && !keys[i].includes("-prev")) {
      bundle[keys[i]] = values[i];
    }
  }
  const existing = await kv.get(bundleKey);
  const score = (b: Record<string, unknown> | null) => {
    if (!b) return 0;
    let s = 0;
    for (const v of Object.values(b)) {
      if (Array.isArray(v)) s += v.length * 5 + v.reduce((a, e) => a + recordRichness(e), 0);
    }
    return s;
  };
  const existingBundle = existing && typeof existing === "object" && "keys" in (existing as object)
    ? (existing as { keys: Record<string, unknown> }).keys
    : null;
  if (score(bundle) >= score(existingBundle)) {
    await kv.set(bundleKey, { savedAt: new Date().toISOString(), date: day, keys: bundle });
  }
}

// Batch set multiple keys at once
app.post("/make-server-0afb8820/batch-set", async (c) => {
  const { keys, values, replaceJobsKeys = [], replaceDirectoryKeys = [] } = await c.req.json();
  const safeValues = [...values];
  const archBatchIdx = keys.indexOf("kw-archive");
  const archiveInBatch = archBatchIdx >= 0 ? normalizeArrayKv(values[archBatchIdx]) : [];
  const deletedBatchIdx = keys.indexOf("kw-jobs-deleted-ids");
  const deletedFromBatch = deletedBatchIdx >= 0 ? normalizeDeletedIdsKv(values[deletedBatchIdx]) : [];
  const storedDeleted = normalizeDeletedIdsKv(await kv.get("kw-jobs-deleted-ids"));
  const allDeletedIds = new Set([...storedDeleted, ...deletedFromBatch]);
  const dirDeletedBatchIdx = keys.indexOf("kw-directory-deleted-ids");
  const dirDeletedFromBatch = dirDeletedBatchIdx >= 0 ? normalizeDeletedIdsKv(values[dirDeletedBatchIdx]) : [];
  const storedDirDeleted = normalizeDeletedIdsKv(await kv.get("kw-directory-deleted-ids"));
  const allDirDeletedIds = new Set([...storedDirDeleted, ...dirDeletedFromBatch]);
  const forceReplaceJobs = Array.isArray(replaceJobsKeys) && replaceJobsKeys.includes("kw-jobs");
  const forceReplaceDirectory = Array.isArray(replaceDirectoryKeys) && replaceDirectoryKeys.includes("kw-directory");

  for (let i = 0; i < keys.length; i++) {
    if (keys[i] === "kw-jobs-deleted-ids") {
      safeValues[i] = [...allDeletedIds].slice(-500);
    } else if (keys[i] === "kw-directory-deleted-ids") {
      safeValues[i] = [...allDirDeletedIds].slice(-500);
    } else if (keys[i] === "kw-jobs") {
      const prev = await kv.get("kw-jobs");
      let nextNorm = filterJobsNotDeleted(normalizeJobsKvValue(values[i]), allDeletedIds);
      if (prev != null) {
        await rotateJobsBackups(prev);
        const prevNorm = filterJobsNotDeleted(normalizeJobsKvValue(prev), allDeletedIds);
        const intentionalDelete =
          forceReplaceJobs || isIntentionalJobsDelete(prevNorm, nextNorm, allDeletedIds);
        if (isSuspiciousJobsShrink(prevNorm, nextNorm) && !intentionalDelete) {
          console.log(
            `kw-jobs: blocked suspicious shrink ${prevNorm.length} → ${nextNorm.length}, merging`,
          );
          nextNorm = filterJobsNotDeleted(mergeJobsUnion(prevNorm, nextNorm), allDeletedIds);
        }
      }
      safeValues[i] = nextNorm;
    } else if (keys[i] === "kw-week-employees") {
      const prev = await kv.get("kw-week-employees");
      let nextNorm = normalizeArrayKv(values[i]);
      if (prev != null) {
        await rotateKvBackups("kw-week-employees");
        const prevNorm = normalizeArrayKv(prev);
        const intentionalClear = isIntentionalWeekClear(nextNorm, archiveInBatch);
        if (!intentionalClear && isSuspiciousPayrollShrink(prevNorm, nextNorm)) {
          console.log(
            `kw-week-employees: blocked shrink richness ${weekEmployeesRichness(prevNorm)} → ${weekEmployeesRichness(nextNorm)}, merging`,
          );
          nextNorm = mergeWeekEmployeesUnion(prevNorm, nextNorm);
        }
      }
      safeValues[i] = nextNorm;
    } else if (keys[i] === "kw-archive") {
      const prev = await kv.get("kw-archive");
      let nextNorm = normalizeArrayKv(values[i]);
      if (prev != null) {
        await rotateKvBackups("kw-archive");
        const prevNorm = normalizeArrayKv(prev);
        if (isSuspiciousArchiveShrink(prevNorm, nextNorm)) {
          console.log(`kw-archive: blocked suspicious shrink, merging`);
          nextNorm = mergeArchiveUnion(prevNorm, nextNorm);
        }
      }
      safeValues[i] = nextNorm;
    } else if (keys[i] === "kw-directory") {
      const prev = await kv.get("kw-directory");
      let nextNorm = filterDirectoryNotDeleted(normalizeArrayKv(values[i]), allDirDeletedIds);
      if (prev != null) {
        await rotateKvBackups("kw-directory");
        const prevNorm = filterDirectoryNotDeleted(normalizeArrayKv(prev), allDirDeletedIds);
        const intentionalDelete =
          forceReplaceDirectory || isIntentionalDirectoryDelete(prevNorm, nextNorm, allDirDeletedIds);
        if (isSuspiciousArrayShrink(prevNorm, nextNorm) && !intentionalDelete) {
          console.log(
            `kw-directory: blocked suspicious shrink ${prevNorm.length} → ${nextNorm.length}, merging`,
          );
          nextNorm = filterDirectoryNotDeleted(mergeRecordsByIdUnion(prevNorm, nextNorm), allDirDeletedIds);
        }
      }
      safeValues[i] = nextNorm;
    } else if (keys[i] === "kw-contacts") {
      safeValues[i] = await protectArrayKey(
        "kw-contacts",
        values[i],
        mergeContactsUnion,
        isSuspiciousArrayShrink,
      );
    }
  }
  await kv.mset(keys, safeValues);
  try {
    await saveDailyFullBackup(keys, safeValues);
  } catch (e) {
    console.log("daily full backup:", e);
  }
  return c.json({ ok: true });
});

/** Status kopii zapasowych robót w chmurze. */
app.get("/make-server-0afb8820/jobs-backup-status", async (c) => {
  try {
    const current = normalizeJobsKvValue(await kv.get("kw-jobs"));
    const prev = normalizeJobsKvValue(await kv.get("kw-jobs-prev"));
    const prev2 = normalizeJobsKvValue(await kv.get("kw-jobs-prev2"));
    const day = new Date().toISOString().slice(0, 10);
    const daySnap = normalizeJobsKvValue(await kv.get(`kw-jobs-day-${day}`));
    return c.json({
      ok: true,
      current: current.length,
      prev: prev.length,
      prev2: prev2.length,
      today: daySnap.length,
    });
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

/** Przywróć roboty z kopii chmurowej (prev / prev2 / dziś). */
app.post("/make-server-0afb8820/restore-jobs-backup", async (c) => {
  try {
    let body: { source?: string } = {};
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }
    const source = body.source || "prev";
    let raw: unknown = null;
    if (source === "prev2") raw = await kv.get("kw-jobs-prev2");
    else if (source === "today") {
      const day = new Date().toISOString().slice(0, 10);
      raw = (await kv.get(`kw-jobs-day-${day}`)) ?? (await kv.get("kw-jobs-prev"));
    } else raw = await kv.get("kw-jobs-prev");

    const jobs = normalizeJobsKvValue(raw);
    if (jobs.length === 0) {
      return c.json({ ok: false, error: "Brak zapisanej kopii robót" }, 404);
    }

    const current = await kv.get("kw-jobs");
    if (current != null) await rotateJobsBackups(current);

    await kv.set("kw-jobs", jobs);
    return c.json({ ok: true, count: jobs.length, source });
  } catch (e) {
    console.error("restore-jobs-backup:", e);
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

/** Status kopii listy płac / archiwum w chmurze. */
app.get("/make-server-0afb8820/payroll-backup-status", async (c) => {
  try {
    const employees = normalizeArrayKv(await kv.get("kw-week-employees"));
    const employeesPrev = normalizeArrayKv(await kv.get("kw-week-employees-prev"));
    const employeesPrev2 = normalizeArrayKv(await kv.get("kw-week-employees-prev2"));
    const archiveWeeks = normalizeArrayKv(await kv.get("kw-archive"));
    const archivePrev = normalizeArrayKv(await kv.get("kw-archive-prev"));
    const archivePrev2 = normalizeArrayKv(await kv.get("kw-archive-prev2"));
    return c.json({
      ok: true,
      employees: employees.length,
      employeesPrev: employeesPrev.length,
      employeesPrev2: employeesPrev2.length,
      archiveWeeks: archiveWeeks.length,
      archivePrev: archivePrev.length,
      archivePrev2: archivePrev2.length,
      employeesPrevRichness: weekEmployeesRichness(employeesPrev),
      employeesPrev2Richness: weekEmployeesRichness(employeesPrev2),
    });
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

/** Przywróć listę płac i archiwum z kopii chmurowej. */
app.post("/make-server-0afb8820/restore-payroll-backup", async (c) => {
  try {
    let body: { source?: string } = {};
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }
    const source = body.source || "prev";
    const empKey = source === "prev2" ? "kw-week-employees-prev2" : "kw-week-employees-prev";
    const archKey = source === "prev2" ? "kw-archive-prev2" : "kw-archive-prev";

    const prevEmps = normalizeArrayKv(await kv.get(empKey));
    const prevArch = normalizeArrayKv(await kv.get(archKey));
    if (prevEmps.length === 0 && prevArch.length === 0) {
      return c.json({ ok: false, error: "Brak kopii listy płac w chmurze" }, 404);
    }

    const currentEmps = normalizeArrayKv(await kv.get("kw-week-employees"));
    const currentArch = normalizeArrayKv(await kv.get("kw-archive"));
    if (currentEmps.length > 0) await rotateKvBackups("kw-week-employees");
    if (currentArch.length > 0) await rotateKvBackups("kw-archive");

    const mergedEmps = prevEmps.length > 0
      ? mergeWeekEmployeesUnion(currentEmps, prevEmps)
      : currentEmps;
    const mergedArch = prevArch.length > 0
      ? mergeArchiveUnion(currentArch, prevArch)
      : currentArch;

    if (prevEmps.length > 0) await kv.set("kw-week-employees", mergedEmps);
    if (prevArch.length > 0) await kv.set("kw-archive", mergedArch);

    return c.json({
      ok: true,
      source,
      employees: mergedEmps.length,
      archiveWeeks: mergedArch.length,
    });
  } catch (e) {
    console.error("restore-payroll-backup:", e);
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

const MONITORED_DATA_KEYS = [
  "kw-jobs",
  "kw-week-employees",
  "kw-archive",
  "kw-directory",
  "kw-contacts",
];

function keyRichnessSummary(key: string, raw: unknown): number {
  const arr = key === "kw-jobs" ? normalizeJobsKvValue(raw) : normalizeArrayKv(raw);
  if (key === "kw-week-employees") return weekEmployeesRichness(arr);
  if (key === "kw-archive") return arr.reduce((s, w) => s + archiveWeekScore(w), 0);
  return arr.reduce((s, e) => s + recordRichness(e), 0);
}

/** Status kopii wszystkich danych firmy w chmurze. */
app.get("/make-server-0afb8820/data-backup-status", async (c) => {
  try {
    const keys: Record<string, { current: number; prev: number; prev2: number; richness: number }> = {};
    for (const key of MONITORED_DATA_KEYS) {
      const current = key === "kw-jobs"
        ? normalizeJobsKvValue(await kv.get(key))
        : normalizeArrayKv(await kv.get(key));
      const prev = key === "kw-jobs"
        ? normalizeJobsKvValue(await kv.get(`${key}-prev`))
        : normalizeArrayKv(await kv.get(`${key}-prev`));
      const prev2 = key === "kw-jobs"
        ? normalizeJobsKvValue(await kv.get(`${key}-prev2`))
        : normalizeArrayKv(await kv.get(`${key}-prev2`));
      keys[key] = {
        current: current.length,
        prev: prev.length,
        prev2: prev2.length,
        richness: keyRichnessSummary(key, current),
      };
    }
    const day = new Date().toISOString().slice(0, 10);
    const daily = await kv.get(`kw-full-day-${day}`);
    return c.json({
      ok: true,
      keys,
      dailyBackupDate: daily ? day : null,
    });
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

/** Przywróć wszystkie dane firmy z kopii chmurowej. */
app.post("/make-server-0afb8820/restore-data-backup", async (c) => {
  try {
    let body: { source?: string } = {};
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }
    const source = body.source || "prev";
    const restoredKeys: string[] = [];

    const readBackup = async (baseKey: string): Promise<unknown> => {
      if (source === "today") {
        const day = new Date().toISOString().slice(0, 10);
        const full = await kv.get(`kw-full-day-${day}`) as { keys?: Record<string, unknown> } | null;
        if (full?.keys?.[baseKey] != null) return full.keys[baseKey];
      }
      const suffix = source === "prev2" ? "-prev2" : "-prev";
      if (baseKey === "kw-jobs" && source === "today") {
        return (await kv.get(`kw-jobs-day-${new Date().toISOString().slice(0, 10)}`)) ??
          (await kv.get("kw-jobs-prev"));
      }
      return await kv.get(`${baseKey}${suffix}`);
    };

    for (const key of MONITORED_DATA_KEYS) {
      const backupRaw = await readBackup(key);
      if (backupRaw == null) continue;

      const currentRaw = await kv.get(key);
      if (currentRaw != null) {
        if (key === "kw-jobs") await rotateJobsBackups(currentRaw);
        else await rotateKvBackups(key);
      }

      const current = key === "kw-jobs" ? normalizeJobsKvValue(currentRaw) : normalizeArrayKv(currentRaw);
      const backup = key === "kw-jobs" ? normalizeJobsKvValue(backupRaw) : normalizeArrayKv(backupRaw);
      if (backup.length === 0 && keyRichnessSummary(key, backupRaw) === 0) continue;

      let merged: unknown;
      if (key === "kw-jobs") merged = mergeJobsUnion(current, backup);
      else if (key === "kw-week-employees") merged = mergeWeekEmployeesUnion(current, backup);
      else if (key === "kw-archive") merged = mergeArchiveUnion(current, backup);
      else if (key === "kw-directory") merged = mergeRecordsByIdUnion(current, backup);
      else if (key === "kw-contacts") merged = mergeContactsUnion(current, backup);
      else merged = backup;

      await kv.set(key, merged);
      restoredKeys.push(key);
    }

    if (restoredKeys.length === 0) {
      return c.json({ ok: false, error: "Brak kopii danych w chmurze" }, 404);
    }

    return c.json({ ok: true, source, restoredKeys });
  } catch (e) {
    console.error("restore-data-backup:", e);
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

// Delete keys
app.post("/make-server-0afb8820/batch-del", async (c) => {
  const { keys } = await c.req.json();
  await kv.mdel(keys);
  return c.json({ ok: true });
});

// Signed URL do wgrywania zdjęć (tryb pracownika)
app.post("/make-server-0afb8820/storage-upload-url", async (c) => {
  try {
    const { jobId, filename } = await c.req.json();
    if (!jobId || !filename) {
      return c.json({ ok: false, error: "Brak jobId lub filename" }, 400);
    }

    await ensurePhotosBucket();
    const supabase = supabaseAdmin();
    const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `jobs/${jobId}/${safeName}`;

    const { data, error } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .createSignedUploadUrl(path, { upsert: true });

    if (error) {
      console.error("storage-upload-url:", error);
      return c.json({ ok: false, error: error.message }, 500);
    }

    const { data: pub } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
    return c.json({
      ok: true,
      signedUrl: data.signedUrl,
      path,
      publicUrl: pub.publicUrl,
    });
  } catch (e) {
    console.error(e);
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

// Bezpośredni upload zdjęcia (lepsze na telefonie — bez PUT do signed URL)
app.post("/make-server-0afb8820/storage-upload", async (c) => {
  try {
    const form = await c.req.formData();
    const file = form.get("file");
    const jobId = form.get("jobId");
    const filename = form.get("filename");

    if (!(file instanceof File) || !jobId || !filename) {
      return c.json({ ok: false, error: "Brak pliku, jobId lub filename" }, 400);
    }

    await ensurePhotosBucket();
    const supabase = supabaseAdmin();
    const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `jobs/${jobId}/${safeName}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, bytes, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });

    if (error) {
      console.error("storage-upload:", error);
      return c.json({ ok: false, error: error.message }, 500);
    }

    const { data: pub } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
    return c.json({ ok: true, path, publicUrl: pub.publicUrl });
  } catch (e) {
    console.error(e);
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

/** Konfiguracja emaili Resend (sekrety Supabase opcjonalne). */
function resendFrom(): string {
  return Deno.env.get("RESEND_FROM") || "W&G DOM <biuro@wgdom.fun>";
}

/** Adresy Reply-To — kliknięcie „Odpowiedz” w mailu idzie tutaj, nie na biuro@wgdom.fun. */
function resendReplyTo(): string[] {
  const raw = Deno.env.get("REPLY_TO_EMAILS") || "biuro@wgdom.pl,dawid.thai@int.pl";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function backupEmailTo(): string {
  return Deno.env.get("BACKUP_EMAIL") || "dawid.thai@int.pl";
}

async function sendViaResend(body: Record<string, unknown>): Promise<Response> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) throw new Error("RESEND_API_KEY not set");
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// Send backup email via Resend
app.post("/make-server-0afb8820/send-backup-email", async (c) => {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return c.json({ ok: false, error: "RESEND_API_KEY not set" }, 500);

  const { data, date, weekFrom, weekTo } = await c.req.json();
  const backupTo = backupEmailTo();
  const periodLabel = weekFrom && weekTo ? ` (tydzień ${weekFrom} – ${weekTo})` : "";

  const json = JSON.stringify(data, null, 2);
  // Base64 encode for attachment
  const encoder = new TextEncoder();
  const bytes = encoder.encode(json);
  const base64 = btoa(String.fromCharCode(...bytes));

  const res = await sendViaResend({
    from: resendFrom(),
    reply_to: resendReplyTo(),
    to: [backupTo],
    subject: `Backup tygodniowy W&G DOM — ${date}${periodLabel}`,
    html: `<p>Tygodniowy backup danych W&amp;G DOM z dnia <strong>${date}</strong>${weekFrom && weekTo ? ` — po zamknięciu tygodnia <strong>${weekFrom}</strong> – <strong>${weekTo}</strong>` : ""}.</p><p>Backup jest dołączony jako plik JSON. Możesz go zaimportować w aplikacji w sekcji <em>Eksportuj / Importuj backup</em>.</p>`,
    attachments: [
      {
        filename: `backup-${date}.json`,
        content: base64,
      },
    ],
  });

  if (!res.ok) {
    const err = await res.text();
    return c.json({ ok: false, error: err }, 500);
  }

  return c.json({ ok: true });
});

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PHOTO_LABEL_NAMES: Record<string, string> = {
  before: "Przed remontem",
  after: "Po remoncie",
  progress: "W trakcie",
};

type JobEmailPhoto = { publicUrl: string; label: string; caption?: string; uploadedBy?: string };
type JobEmailRoom = { name: string; length: string; width: string; height: string; note?: string };
type JobEmailWorkItem = { text: string; note?: string };
type JobEmailReportSection = {
  workerName: string;
  date: string;
  workItems?: JobEmailWorkItem[];
  rooms?: JobEmailRoom[];
  sketch?: { publicUrl: string; note?: string };
  generalNote?: string;
};

type JobEmailPayload = {
  to: string;
  toName?: string;
  subject: string;
  introMessage?: string;
  jobHeader: { address: string; flatNumber: string; client: string };
  photos: JobEmailPhoto[];
  reportSections: JobEmailReportSection[];
};

function buildJobEmailHtml(payload: JobEmailPayload): string {
  const { jobHeader, photos, reportSections, introMessage } = payload;
  const title = `${jobHeader.address || "Robota"}${jobHeader.flatNumber ? ` m.${jobHeader.flatNumber}` : ""}`;
  const parts: string[] = [];

  parts.push(`<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a">`);
  parts.push(`<div style="background:#344254;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0">`);
  parts.push(`<p style="margin:0;font-size:22px;font-weight:bold">W&amp;G DOM</p>`);
  parts.push(`<p style="margin:6px 0 0;font-size:13px;color:#C0392B">Materiały z roboty</p></div>`);
  parts.push(`<div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">`);

  parts.push(`<h2 style="margin:0 0 4px;font-size:18px">${escapeHtml(title)}</h2>`);
  if (jobHeader.client) {
    parts.push(`<p style="margin:0 0 16px;color:#666;font-size:14px">${escapeHtml(jobHeader.client)}</p>`);
  }

  if (introMessage?.trim()) {
    parts.push(`<p style="margin:0 0 20px;font-size:14px;line-height:1.5;white-space:pre-wrap">${escapeHtml(introMessage.trim())}</p>`);
  }

  if (photos.length > 0) {
    parts.push(`<h3 style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#666;margin:24px 0 12px">Zdjęcia</h3>`);
    parts.push(`<div style="display:flex;flex-wrap:wrap;gap:12px">`);
    for (const p of photos) {
      const label = PHOTO_LABEL_NAMES[p.label] || p.label;
      parts.push(`<div style="width:280px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">`);
      parts.push(`<img src="${escapeHtml(p.publicUrl)}" alt="" style="width:100%;height:auto;display:block" />`);
      parts.push(`<div style="padding:8px 10px;font-size:12px;color:#444">`);
      parts.push(`<strong>${escapeHtml(label)}</strong>`);
      if (p.caption) parts.push(`<br/><span style="color:#666">${escapeHtml(p.caption)}</span>`);
      if (p.uploadedBy) parts.push(`<br/><span style="color:#999;font-size:11px">${escapeHtml(p.uploadedBy)}</span>`);
      parts.push(`</div></div>`);
    }
    parts.push(`</div>`);
  }

  for (const sec of reportSections) {
    parts.push(`<h3 style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#666;margin:28px 0 8px">Raport — ${escapeHtml(sec.workerName)} (${escapeHtml(sec.date)})</h3>`);

    if (sec.workItems && sec.workItems.length > 0) {
      parts.push(`<p style="font-size:12px;font-weight:bold;color:#444;margin:12px 0 6px">Zakres wykonanych prac</p><ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.5">`);
      for (const item of sec.workItems) {
        parts.push(`<li style="margin-bottom:6px">${escapeHtml(item.text)}`);
        if (item.note) parts.push(`<br/><em style="color:#666;font-size:12px">${escapeHtml(item.note)}</em>`);
        parts.push(`</li>`);
      }
      parts.push(`</ul>`);
    }

    if (sec.generalNote?.trim()) {
      parts.push(`<p style="font-size:12px;font-weight:bold;color:#444;margin:16px 0 6px">Wiadomość</p>`);
      parts.push(`<p style="margin:0;font-size:14px;line-height:1.5">${escapeHtml(sec.generalNote.trim())}</p>`);
    }

    if (sec.rooms && sec.rooms.length > 0) {
      parts.push(`<p style="font-size:12px;font-weight:bold;color:#444;margin:16px 0 6px">Wymiary pomieszczeń</p>`);
      parts.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px">`);
      parts.push(`<thead><tr style="background:#f3f4f6"><th style="padding:8px;text-align:left;border:1px solid #e5e7eb">Pomieszczenie</th><th style="padding:8px;text-align:right;border:1px solid #e5e7eb">Dł.</th><th style="padding:8px;text-align:right;border:1px solid #e5e7eb">Szer.</th><th style="padding:8px;text-align:right;border:1px solid #e5e7eb">Wys.</th></tr></thead><tbody>`);
      for (const room of sec.rooms) {
        parts.push(`<tr><td style="padding:8px;border:1px solid #e5e7eb">${escapeHtml(room.name)}${room.note ? `<br/><em style="font-size:11px;color:#666">${escapeHtml(room.note)}</em>` : ""}</td>`);
        parts.push(`<td style="padding:8px;text-align:right;border:1px solid #e5e7eb;font-family:monospace">${escapeHtml(room.length || "—")}</td>`);
        parts.push(`<td style="padding:8px;text-align:right;border:1px solid #e5e7eb;font-family:monospace">${escapeHtml(room.width || "—")}</td>`);
        parts.push(`<td style="padding:8px;text-align:right;border:1px solid #e5e7eb;font-family:monospace">${escapeHtml(room.height || "—")}</td></tr>`);
      }
      parts.push(`</tbody></table>`);
    }

    if (sec.sketch?.publicUrl) {
      parts.push(`<p style="font-size:12px;font-weight:bold;color:#444;margin:16px 0 6px">Rysunek z wymiarami</p>`);
      parts.push(`<img src="${escapeHtml(sec.sketch.publicUrl)}" alt="Rysunek" style="max-width:100%;border:1px solid #e5e7eb;border-radius:8px" />`);
      if (sec.sketch.note) parts.push(`<p style="font-size:12px;color:#666;margin-top:6px;font-style:italic">${escapeHtml(sec.sketch.note)}</p>`);
    }
  }

  parts.push(`<p style="margin:32px 0 0;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:16px">Wysłano z aplikacji W&amp;G DOM</p>`);
  parts.push(`</div></div>`);
  return parts.join("");
}

function jobEmailHasContent(payload: JobEmailPayload): boolean {
  if (payload.photos.length > 0) return true;
  for (const sec of payload.reportSections) {
    if (sec.workItems && sec.workItems.length > 0) return true;
    if (sec.rooms && sec.rooms.length > 0) return true;
    if (sec.sketch?.publicUrl) return true;
    if (sec.generalNote?.trim()) return true;
  }
  return false;
}

// Wyślij email z wybranymi materiałami roboty (zdjęcia, raporty)
app.post("/make-server-0afb8820/send-job-email", async (c) => {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return c.json({ ok: false, error: "RESEND_API_KEY not set" }, 500);

  let payload: JobEmailPayload;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "Nieprawidłowe dane" }, 400);
  }

  const to = String(payload.to || "").trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return c.json({ ok: false, error: "Podaj prawidłowy adres email odbiorcy" }, 400);
  }

  if (!jobEmailHasContent(payload)) {
    return c.json({ ok: false, error: "Brak treści do wysłania — zaznacz zdjęcia lub elementy raportu" }, 400);
  }

  const subject = String(payload.subject || "W&G DOM — materiały z roboty").trim();
  const html = buildJobEmailHtml(payload);

  const res = await sendViaResend({
    from: resendFrom(),
    reply_to: resendReplyTo(),
    to: [to],
    subject,
    html,
  });

  if (!res.ok) {
    const err = await res.text();
    return c.json({ ok: false, error: err }, 500);
  }

  return c.json({ ok: true });
});

type PayrollEmailAttachment = { filename: string; content: string };

// Wyślij listę płac emailem (HTML + załączniki PDF/Word w base64)
app.post("/make-server-0afb8820/send-payroll-email", async (c) => {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return c.json({ ok: false, error: "RESEND_API_KEY not set" }, 500);

  let body: {
    to?: string;
    toName?: string;
    subject?: string;
    html?: string;
    attachments?: PayrollEmailAttachment[];
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "Nieprawidłowe dane" }, 400);
  }

  const to = String(body.to || "").trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return c.json({ ok: false, error: "Podaj prawidłowy adres email odbiorcy" }, 400);
  }

  const attachments = Array.isArray(body.attachments)
    ? body.attachments.filter((a) => a && typeof a.filename === "string" && typeof a.content === "string" && a.content.length > 0)
    : [];
  if (attachments.length === 0) {
    return c.json({ ok: false, error: "Brak załączników — zaznacz PDF lub Word" }, 400);
  }

  const subject = String(body.subject || "W&G DOM — lista płac").trim();
  const html = String(body.html || "").trim();
  if (!html) {
    return c.json({ ok: false, error: "Brak treści HTML wiadomości" }, 400);
  }

  const res = await sendViaResend({
    from: resendFrom(),
    reply_to: resendReplyTo(),
    to: [to],
    subject,
    html,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });

  if (!res.ok) {
    const err = await res.text();
    return c.json({ ok: false, error: err }, 500);
  }

  return c.json({ ok: true });
});

// Wyślij pliki inspektora (zlecenie, kosztorys, zdjęcia) jako załączniki
app.post("/make-server-0afb8820/send-job-files-email", async (c) => {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return c.json({ ok: false, error: "RESEND_API_KEY not set" }, 500);

  let body: {
    to?: string;
    toName?: string;
    subject?: string;
    html?: string;
    attachments?: { filename: string; content: string }[];
    jobId?: string;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "Nieprawidłowe dane" }, 400);
  }

  const to = String(body.to || "").trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return c.json({ ok: false, error: "Podaj prawidłowy adres email odbiorcy" }, 400);
  }

  const attachments = Array.isArray(body.attachments)
    ? body.attachments.filter((a) => a && typeof a.filename === "string" && typeof a.content === "string" && a.content.length > 0)
    : [];
  if (attachments.length === 0) {
    return c.json({ ok: false, error: "Brak załączników" }, 400);
  }

  const subject = String(body.subject || "W&G DOM — pliki inspektora").trim();
  const html = String(body.html || "<p>Pliki inspektora w załączniku.</p>").trim();

  const res = await sendViaResend({
    from: resendFrom(),
    reply_to: resendReplyTo(),
    to: [to],
    subject,
    html,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });

  if (!res.ok) {
    const err = await res.text();
    return c.json({ ok: false, error: err }, 500);
  }

  return c.json({ ok: true });
});

/** Publiczny podgląd roboty dla klienta (?podglad=TOKEN) — tylko odczyt, bez auth. */
app.get("/make-server-0afb8820/client-share", async (c) => {
  try {
    const token = String(c.req.query("token") || "").trim();
    if (!token) return c.json({ ok: false, error: "Brak tokenu" }, 400);

    const raw = await kv.get("kw-jobs");
    const jobs = (Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : []) as Array<{
      address?: string;
      flatNumber?: string;
      client?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      clientShare?: { token: string; enabled: boolean };
      photos?: Array<{ status: string; publicUrl: string; label: string; caption?: string; uploadedAt: string }>;
      workerReports?: unknown[];
    }> | null;

    if (jobs.length === 0) {
      return c.json({ ok: false, error: "Brak danych" }, 404);
    }

    const job = jobs.find((j) => j.clientShare?.enabled && j.clientShare.token === token);
    if (!job) {
      return c.json({ ok: false, error: "Link nieaktywny lub nieprawidłowy" }, 404);
    }

    const photos = (job.photos || [])
      .filter((p) => p.status === "approved")
      .map((p) => ({
        publicUrl: p.publicUrl,
        label: p.label,
        caption: p.caption || "",
        uploadedAt: p.uploadedAt,
      }));

    const workerReports = (job.workerReports || []).map((raw) => {
      const r = raw as Record<string, unknown>;
      return {
        workerName: String(r.workerName || ""),
        submittedAt: String(r.submittedAt || ""),
        workItems: r.workItems || [],
        rooms: r.rooms || [],
        generalNote: String(r.generalNote || ""),
        sketchNote: String(r.sketchNote || ""),
        sketch: r.sketch || null,
      };
    });

    return c.json({
      ok: true,
      job: {
        address: job.address || "",
        flatNumber: job.flatNumber || "",
        client: job.client || "",
        startDate: job.startDate || "",
        endDate: job.endDate || "",
        status: job.status || "in_progress",
        photos,
        workerReports,
      },
    });
  } catch (e) {
    console.error("client-share:", e);
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

/** Normalizacja numeru PL → E.164 (+48…) lub null. */
function normalizePhoneE164(phone: string): string | null {
  const d = phone.replace(/\D/g, "");
  if (d.length < 9) return null;
  return `+48${d.slice(-9)}`;
}

/** SMSAPI.pl — preferowane w PL (sekret SMSAPI_TOKEN). */
async function sendViaSmsApi(to: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const token = Deno.env.get("SMSAPI_TOKEN");
  if (!token) return { ok: false, error: "SMSAPI_TOKEN not set" };

  const digits = to.replace(/\D/g, "");
  const toParam = digits.startsWith("48") ? digits : `48${digits.slice(-9)}`;

  const buildBody = (includeFrom: boolean) => {
    const body = new URLSearchParams({
      to: toParam,
      message,
      encoding: "utf-8",
      format: "json",
    });
    const from = Deno.env.get("SMSAPI_FROM")?.trim();
    if (includeFrom && from) body.set("from", from);
    return body;
  };

  const parseSmsApiResponse = (text: string, resOk: boolean): { ok: boolean; error?: string; invalidFrom?: boolean } => {
    if (!resOk) return { ok: false, error: text || "SMSAPI HTTP error" };
    try {
      const json = JSON.parse(text) as { error?: number; message?: string; list?: { status?: string; error?: string }[] };
      if (json.error === 14) {
        return { ok: false, error: "Nieprawidłowe pole nadawcy (SMSAPI_FROM) — usuń sekret albo ustaw zatwierdzoną nazwę z panelu SMSAPI", invalidFrom: true };
      }
      if (json.error === 98) {
        return { ok: false, error: "Konto testowe SMSAPI — wyślij tylko na numer podany przy rejestracji" };
      }
      if (json.error && json.error !== 0) {
        return { ok: false, error: json.message || `SMSAPI error ${json.error}` };
      }
      const first = json.list?.[0];
      if (first?.status === "ERROR") {
        return { ok: false, error: first.error || "SMSAPI send error" };
      }
    } catch {
      if (text.includes("ERROR")) return { ok: false, error: text };
    }
    return { ok: true };
  };

  for (const includeFrom of [true, false] as const) {
    const res = await fetch("https://api.smsapi.pl/sms.do", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: buildBody(includeFrom).toString(),
    });
    const text = await res.text();
    const parsed = parseSmsApiResponse(text, res.ok);
    if (parsed.ok) return { ok: true };
    if (parsed.invalidFrom && includeFrom) continue;
    return { ok: false, error: parsed.error };
  }

  return { ok: false, error: "Nie udało się wysłać SMS (SMSAPI)" };
}

/** Twilio — alternatywa (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER). */
async function sendViaTwilio(to: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const auth = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_FROM_NUMBER");
  if (!sid || !auth || !from) return { ok: false, error: "Twilio not configured" };

  const body = new URLSearchParams({ To: to, From: from, Body: message });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${auth}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err || `Twilio HTTP ${res.status}` };
  }
  return { ok: true };
}

async function sendSingleSms(to: string, message: string): Promise<{ ok: boolean; error?: string }> {
  if (Deno.env.get("SMSAPI_TOKEN")) return sendViaSmsApi(to, message);
  if (Deno.env.get("TWILIO_ACCOUNT_SID")) return sendViaTwilio(to, message);
  return { ok: false, error: "Brak konfiguracji SMS — ustaw SMSAPI_TOKEN lub Twilio w Supabase Secrets" };
}

// Masowa wysyłka SMS do pracowników (pilne ogłoszenia)
app.post("/make-server-0afb8820/send-sms-bulk", async (c) => {
  let body: { message?: string; phones?: string[] };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "Nieprawidłowe dane" }, 400);
  }

  const message = String(body.message || "").trim();
  if (!message) return c.json({ ok: false, error: "Brak treści wiadomości" }, 400);
  if (message.length > 640) return c.json({ ok: false, error: "Wiadomość za długa (max 640 znaków)" }, 400);

  const rawPhones = Array.isArray(body.phones) ? body.phones : [];
  const phones = [...new Set(
    rawPhones
      .map((p) => normalizePhoneE164(String(p)))
      .filter((p): p is string => !!p),
  )];

  if (phones.length === 0) {
    return c.json({ ok: false, error: "Brak poprawnych numerów telefonu" }, 400);
  }
  if (phones.length > 50) {
    return c.json({ ok: false, error: "Maksymalnie 50 odbiorców na raz" }, 400);
  }

  const prefix = Deno.env.get("SMS_PREFIX")?.trim();
  const fullMessage = prefix ? `${prefix} ${message}` : message;

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const phone of phones) {
    const res = await sendSingleSms(phone, fullMessage);
    if (res.ok) sent++;
    else {
      failed++;
      errors.push(`${phone}: ${res.error || "błąd"}`);
    }
  }

  if (sent === 0) {
    return c.json({ ok: false, error: errors[0] || "Wysyłka nie powiodła się", sent, failed, errors }, 500);
  }

  return c.json({ ok: true, sent, failed, errors: errors.slice(0, 10) });
});

Deno.serve(app.fetch);
