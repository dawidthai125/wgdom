/** W&G DOM Edge Function — v2.31.8 SMS wybór nadawcy z listy 4 nazw */
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

function contentTypeForUploadedFile(filename: string, fileType: string): string {
  if (fileType && fileType !== "application/octet-stream") return fileType;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    ath: "application/octet-stream",
    nor: "application/octet-stream",
    xml: "application/xml",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
    gif: "image/gif",
  };
  return map[ext] ?? "application/octet-stream";
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
  const map = new Map<string, Record<string, unknown>>();
  const ingest = (list: unknown[]) => {
    for (const raw of list) {
      const id = jobId(raw);
      if (!id) continue;
      const j = raw as Record<string, unknown>;
      const existing = map.get(id);
      if (!existing) {
        map.set(id, j);
        continue;
      }
      const hidden = [
        ...new Set([
          ...((existing.hiddenInspectorFeedIds as string[] | undefined) ?? []),
          ...((j.hiddenInspectorFeedIds as string[] | undefined) ?? []),
        ]),
      ];
      map.set(id, {
        ...existing,
        ...j,
        hiddenInspectorFeedIds: hidden.length > 0 ? hidden : undefined,
      });
    }
  };
  ingest(prev);
  ingest(next);
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
      if (!existing) {
        map.set(id, item);
        continue;
      }
      const er = weekEmployeeRichness(existing);
      const ir = weekEmployeeRichness(item);
      if (ir > er) map.set(id, item);
      else if (ir < er) { /* keep existing */ }
      else map.set(id, mergeWeekEmployeeRecordByTimestamps(existing, item));
    }
  };
  ingest(prev);
  ingest(next);
  return [...map.values()];
}

function parseRecordTs(v: unknown): number {
  if (typeof v !== "string") return 0;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
}

function pickRateByTimestamps(l: Record<string, unknown>, c: Record<string, unknown>): unknown {
  const lAt = parseRecordTs(l.rateUpdatedAt);
  const cAt = parseRecordTs(c.rateUpdatedAt);
  if (lAt && cAt && lAt !== cAt) return lAt > cAt ? l.rate : c.rate;
  if (lAt && !cAt) return l.rate;
  if (cAt && !lAt) return c.rate;
  if (l.rate !== undefined && String(l.rate).trim() !== "") return l.rate;
  return c.rate;
}

function mergeWeekEmployeeRecordByTimestamps(a: unknown, b: unknown): unknown {
  const l = a as Record<string, unknown>;
  const c = b as Record<string, unknown>;
  const lAt = parseRecordTs(l.dataUpdatedAt);
  const cAt = parseRecordTs(c.dataUpdatedAt);
  const lDays = (l.days as Record<string, unknown>) || {};
  const cDays = (c.days as Record<string, unknown>) || {};
  const days = lAt > cAt ? { ...cDays, ...lDays } : cAt > lAt ? { ...lDays, ...cDays } : { ...cDays, ...lDays };
  const rate = pickRateByTimestamps(l, c);
  const lRateAt = parseRecordTs(l.rateUpdatedAt);
  const cRateAt = parseRecordTs(c.rateUpdatedAt);
  const dataWinner = lAt >= cAt ? l : c;
  return {
    ...c,
    ...l,
    ...dataWinner,
    days,
    rate,
    rateUpdatedAt: lRateAt >= cRateAt ? l.rateUpdatedAt ?? c.rateUpdatedAt : c.rateUpdatedAt ?? l.rateUpdatedAt,
    dataUpdatedAt: lAt >= cAt ? l.dataUpdatedAt ?? c.dataUpdatedAt : c.dataUpdatedAt ?? l.dataUpdatedAt,
  };
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
      contentType: contentTypeForUploadedFile(String(filename), file.type || ""),
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

/** Usuń plik ze storage (zlecenie/kosztorys/zdjęcie inspektora). */
app.post("/make-server-0afb8820/storage-delete", async (c) => {
  try {
    const { path } = await c.req.json();
    if (!path || typeof path !== "string") {
      return c.json({ ok: false, error: "Brak path" }, 400);
    }
    if (!path.startsWith("jobs/") && !path.startsWith("tenders/")) {
      return c.json({ ok: false, error: "Niedozwolona ścieżka" }, 403);
    }
    await ensurePhotosBucket();
    const supabase = supabaseAdmin();
    const { error } = await supabase.storage.from(PHOTOS_BUCKET).remove([path]);
    if (error) {
      console.error("storage-delete:", error);
      return c.json({ ok: false, error: error.message }, 500);
    }
    return c.json({ ok: true });
  } catch (e) {
    console.error(e);
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

/** Pobierz kosztorys ze storage (proxy — omija CORS, binarne ATH). */
app.post("/make-server-0afb8820/kosztorys-preview", async (c) => {
  try {
    const { path, filename } = await c.req.json();
    if (!path || typeof path !== "string") {
      return c.json({ ok: false, error: "Brak path" }, 400);
    }
    await ensurePhotosBucket();
    const supabase = supabaseAdmin();
    const { data, error } = await supabase.storage.from(PHOTOS_BUCKET).download(path);
    if (error || !data) {
      console.error("kosztorys-preview:", error?.message);
      return c.json({ ok: false, error: error?.message || "Plik nie istnieje w storage" }, 404);
    }
    const bytes = new Uint8Array(await data.arrayBuffer());
    if (bytes.byteLength > 12 * 1024 * 1024) {
      return c.json({ ok: false, error: "Plik zbyt duży do podglądu (max 12 MB)" }, 413);
    }
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const base64 = btoa(binary);
    return c.json({ ok: true, base64, filename: filename || path.split("/").pop() || "kosztorys.ath" });
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
type SmsApiProfile = {
  points?: number;
  phone_number?: string;
  payment_type?: string;
  name?: string;
  error?: number | string;
  message?: string;
};

async function fetchSmsApiProfile(token: string): Promise<{ ok: true; profile: SmsApiProfile } | { ok: false; error: string }> {
  const res = await fetch("https://api.smsapi.pl/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, error: text || "SMSAPI profile HTTP error" };
  try {
    const json = JSON.parse(text) as SmsApiProfile;
    if (json.error) return { ok: false, error: json.message || String(json.error) };
    return { ok: true, profile: json };
  } catch {
    return { ok: false, error: text || "SMSAPI profile parse error" };
  }
}

/** test=1 — bez wysyłki; błąd 98 = konto ograniczone (tylko numer z rejestracji). */
async function probeSmsApiRestricted(token: string, registrationPhone?: string): Promise<boolean> {
  let probe = "48999000001";
  const reg9 = registrationPhone?.replace(/\D/g, "").slice(-9) || "";
  if (reg9 && probe.endsWith(reg9)) probe = "48999000002";

  const body = new URLSearchParams({
    to: probe,
    message: "WGDOM status probe",
    encoding: "utf-8",
    format: "json",
    test: "1",
  });
  const res = await fetch("https://api.smsapi.pl/sms.do", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  const text = await res.text();
  try {
    const json = JSON.parse(text) as { error?: number };
    return json.error === 98;
  } catch {
    return /(^|\D)98(\D|$)/.test(text) && /ograniczon/i.test(text);
  }
}

async function getSmsProviderStatus(): Promise<{
  ok: boolean;
  configured: boolean;
  provider: "smsapi" | "twilio" | "none";
  restricted?: boolean;
  points?: number;
  registrationPhone?: string;
  paymentType?: string;
  sendernames?: SmsApiSenderEntry[];
  activeKnownSenders?: string[];
  error?: string;
}> {
  const smsapiToken = Deno.env.get("SMSAPI_TOKEN");
  if (smsapiToken) {
    const prof = await fetchSmsApiProfile(smsapiToken);
    if (!prof.ok) {
      return { ok: false, configured: true, provider: "smsapi", error: prof.error };
    }
    const restricted = await probeSmsApiRestricted(smsapiToken, prof.profile.phone_number);
    let sendernames: SmsApiSenderEntry[] = [];
    try {
      sendernames = await listSmsApiSenders(smsapiToken);
    } catch { /* ignore */ }
    return {
      ok: true,
      configured: true,
      provider: "smsapi",
      restricted,
      points: typeof prof.profile.points === "number" ? prof.profile.points : undefined,
      registrationPhone: prof.profile.phone_number,
      paymentType: prof.profile.payment_type,
      sendernames,
      activeKnownSenders: activeKnownSenders(sendernames),
    };
  }
  if (Deno.env.get("TWILIO_ACCOUNT_SID")) {
    return { ok: true, configured: true, provider: "twilio", restricted: false };
  }
  return { ok: true, configured: false, provider: "none" };
}

async function sendViaSmsApi(
  to: string,
  message: string,
  fromCandidates: string[] = [],
): Promise<{ ok: boolean; error?: string; usedFrom?: string }> {
  const token = Deno.env.get("SMSAPI_TOKEN");
  if (!token) return { ok: false, error: "SMSAPI_TOKEN not set" };

  const digits = to.replace(/\D/g, "");
  const toParam = digits.startsWith("48") ? digits : `48${digits.slice(-9)}`;

  const isTestLikeFrom = (from: string) => /^test$/i.test(from.trim());

  const buildBody = (from?: string) => {
    const body = new URLSearchParams({
      to: toParam,
      message,
      encoding: "utf-8",
      format: "json",
    });
    if (from && !isTestLikeFrom(from)) body.set("from", from);
    return body;
  };

  const parseSmsApiResponse = (text: string, resOk: boolean): { ok: boolean; error?: string; invalidFrom?: boolean } => {
    if (!resOk) return { ok: false, error: text || "SMSAPI HTTP error" };
    try {
      const json = JSON.parse(text) as { error?: number; message?: string; list?: { status?: string; error?: string }[] };
      if (json.error === 14) {
        return { ok: false, error: "Nieprawidłowe pole nadawcy — dodaj nazwę w panelu smsapi.pl (Pola nadawcy)", invalidFrom: true };
      }
      if (json.error === 98) {
        return {
          ok: false,
          error: "Konto SMSAPI w trybie testowym — SMS można wysłać tylko na numer podany przy rejestracji w smsapi.pl. Aby wysyłać do pracowników: doładuj konto i zweryfikuj firmę w panelu SMSAPI (Ustawienia → Dane firmy).",
        };
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

  const envFrom = Deno.env.get("SMSAPI_FROM")?.trim();
  const tryFroms = [
    ...fromCandidates.filter((f) => f && !isTestLikeFrom(f)),
    ...(envFrom && !isTestLikeFrom(envFrom) ? [envFrom] : []),
    undefined,
  ];
  const uniqueFroms = [...new Set(tryFroms.map((f) => f ?? ""))].map((f) => f || undefined);

  for (const from of uniqueFroms) {
    const res = await fetch("https://api.smsapi.pl/sms.do", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: buildBody(from).toString(),
    });
    const text = await res.text();
    const parsed = parseSmsApiResponse(text, res.ok);
    if (parsed.ok) return { ok: true, usedFrom: from || "domyślny" };
    if (parsed.invalidFrom && from) continue;
    if (!from) return { ok: false, error: parsed.error };
  }

  return { ok: false, error: "Nie udało się wysłać SMS (SMSAPI)" };
}

/** Skróty imion dla pola nadawcy SMS (max 11 znaków łącznie z prefiksem W&G-). */
const SMS_FROM_NAME_ALIASES: Record<string, string> = {
  stanislaw: "Stan",
};

/** Nazwa nadawcy SMSAPI (max 11 znaków, bez polskich znaków) — np. W&G-Dawid, W&G-Stan. */
function buildSmsFromCandidate(senderDisplayName: string): string {
  const first = senderDisplayName.trim().split(/\s+/)[0] || "Admin";
  const ascii = first
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]/g, "");
  const short = (SMS_FROM_NAME_ALIASES[ascii.toLowerCase()] ?? ascii.slice(0, 6)) || "Admin";
  const candidate = `W&G-${short}`.slice(0, 11);
  return candidate.length >= 3 ? candidate : "W&GDOM";
}

/** Zatwierdzone nazwy nadawców (dodawane ręcznie w panelu SMSAPI — nie przez API). */
const SMS_KNOWN_SENDERS = ["W&GDOM", "W&G-Dawid", "W&G-Pawel", "W&G-Stan"];

function buildFullSmsText(message: string, senderName?: string, smsPrefix?: string): string {
  const chunks: string[] = [];
  if (senderName?.trim()) chunks.push(`W&G - ${senderName.trim()}:`);
  if (smsPrefix?.trim()) chunks.push(smsPrefix.trim());
  chunks.push(message.trim());
  return chunks.join(" ");
}

type SmsApiSenderEntry = {
  sender: string;
  is_default?: boolean;
  status: string;
  created_at?: string;
};

type SmsSenderEnsureResult = {
  sender: string;
  status: string;
  action: "exists" | "added" | "failed";
  error?: string;
};

async function smsApiRequest(
  token: string,
  path: string,
  opts?: { method?: string; body?: URLSearchParams },
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> | null; text: string }> {
  const res = await fetch(`https://api.smsapi.pl${path}`, {
    method: opts?.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(opts?.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: opts?.body?.toString(),
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, json: JSON.parse(text) as Record<string, unknown>, text };
  } catch {
    return { ok: res.ok, status: res.status, json: null, text };
  }
}

async function listSmsApiSenders(token: string): Promise<SmsApiSenderEntry[]> {
  const r = await smsApiRequest(token, "/sms/sendernames");
  const coll = r.json?.collection;
  if (!Array.isArray(coll)) return [];
  return coll as SmsApiSenderEntry[];
}

/** Wszystkie nazwy nadawców zespołu — dodawane ręcznie w panelu SMSAPI. */
const DEFAULT_TEAM_SENDERS = SMS_KNOWN_SENDERS;

function senderNameKey(name: string): string {
  return name.trim().toLowerCase();
}

async function checkSmsApiSendersStatus(
  token: string,
  names: string[],
): Promise<SmsSenderEnsureResult[]> {
  const existing = await listSmsApiSenders(token);
  const byName = new Map(existing.map((s) => [senderNameKey(s.sender), s]));
  const results: SmsSenderEnsureResult[] = [];

  for (const raw of [...new Set(names.map((n) => n.trim()).filter(Boolean))]) {
    if (/^test$/i.test(raw)) continue;
    const found = byName.get(senderNameKey(raw));
    if (found) {
      results.push({ sender: found.sender, status: found.status, action: "exists" });
    } else {
      results.push({
        sender: raw,
        status: "MISSING",
        action: "failed",
        error: "Brak w SMSAPI — dodaj ręcznie w panelu (Pola nadawcy), API nie rejestruje nazw",
      });
    }
  }
  return results;
}

function collectSenderNamesToEnsure(senderDisplayName?: string): string[] {
  const names: string[] = [...DEFAULT_TEAM_SENDERS];
  if (senderDisplayName?.trim()) names.push(buildSmsFromCandidate(senderDisplayName));
  const envFrom = Deno.env.get("SMSAPI_FROM")?.trim();
  if (envFrom && senderNameKey(envFrom) !== senderNameKey("W&GDOM")) names.push(envFrom);
  const auto = (Deno.env.get("SMSAPI_AUTO_SENDERS") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  names.push(...auto);
  const canonical = new Map<string, string>();
  for (const raw of names) {
    const n = raw.trim();
    if (n.length < 3 || n.length > 11 || /^test$/i.test(n)) continue;
    const key = senderNameKey(n);
    const preferred = DEFAULT_TEAM_SENDERS.find((d) => senderNameKey(d) === key);
    if (!canonical.has(key) || preferred) canonical.set(key, preferred || n);
  }
  return [...canonical.values()];
}

function activeSenderNames(entries: SmsApiSenderEntry[]): string[] {
  return entries.filter((s) => s.status === "ACTIVE").map((s) => s.sender);
}

function activeKnownSenders(allSenders: SmsApiSenderEntry[]): string[] {
  const activeKeys = new Set(activeSenderNames(allSenders).map(senderNameKey));
  return SMS_KNOWN_SENDERS.filter((s) => activeKeys.has(senderNameKey(s)));
}

function resolveFromCandidates(
  active: string[],
  opts?: { requestedFrom?: string; senderDisplayName?: string },
): { fromCandidates: string[]; error?: string } {
  const activeKnown = SMS_KNOWN_SENDERS
    .map((name) => active.find((a) => senderNameKey(a) === senderNameKey(name)))
    .filter((s): s is string => Boolean(s));

  const requested = opts?.requestedFrom?.trim();
  if (requested) {
    const match = activeKnown.find((s) => senderNameKey(s) === senderNameKey(requested));
    if (!match) {
      return {
        fromCandidates: [],
        error: activeKnown.length > 0
          ? `Nadawca „${requested}” niedostępny. Aktywne: ${activeKnown.join(", ")}`
          : `Brak aktywnych nadawców. Dodaj w panelu SMSAPI: ${SMS_KNOWN_SENDERS.join(", ")}`,
      };
    }
    return { fromCandidates: [match] };
  }

  const personal = opts?.senderDisplayName ? buildSmsFromCandidate(opts.senderDisplayName) : undefined;
  const ordered = prioritizeFromCandidates([...SMS_KNOWN_SENDERS], active, personal);
  if (ordered.length === 0) {
    return {
      fromCandidates: [],
      error: `Brak aktywnych nadawców (${SMS_KNOWN_SENDERS.join(", ")}).`,
    };
  }
  return { fromCandidates: ordered };
}

function prioritizeFromCandidates(candidates: string[], active: string[], personal?: string): string[] {
  const activeByKey = new Map(active.map((a) => [senderNameKey(a), a]));
  const ordered: string[] = [];
  const pushIfActive = (c?: string) => {
    if (!c) return;
    const hit = activeByKey.get(senderNameKey(c));
    if (hit && !ordered.includes(hit)) ordered.push(hit);
  };
  pushIfActive(personal);
  for (const c of candidates) pushIfActive(c);
  return ordered;
}

const SMS_HISTORY_KEY = "kw-sms-history";
const SMS_HISTORY_MAX = 150;

type SmsHistoryEntry = {
  id: string;
  at: string;
  senderLogin: string;
  senderName: string;
  senderRole?: string;
  message: string;
  fromField?: string;
  recipients: { name: string; phone: string; ok: boolean; error?: string }[];
  sent: number;
  failed: number;
};

async function appendSmsHistory(entry: Omit<SmsHistoryEntry, "id">): Promise<void> {
  const prev = await kv.get(SMS_HISTORY_KEY);
  const list = Array.isArray(prev) ? (prev as SmsHistoryEntry[]) : [];
  const next: SmsHistoryEntry[] = [{ ...entry, id: crypto.randomUUID() }, ...list].slice(0, SMS_HISTORY_MAX);
  await kv.set(SMS_HISTORY_KEY, next);
}

async function sendSingleSms(
  to: string,
  message: string,
  fromCandidates: string[] = [],
): Promise<{ ok: boolean; error?: string; usedFrom?: string }> {
  if (Deno.env.get("SMSAPI_TOKEN")) return sendViaSmsApi(to, message, fromCandidates);
  if (Deno.env.get("TWILIO_ACCOUNT_SID")) {
    const r = await sendViaTwilio(to, message);
    return { ...r, usedFrom: Deno.env.get("TWILIO_FROM_NUMBER") || undefined };
  }
  return { ok: false, error: "Brak konfiguracji SMS — ustaw SMSAPI_TOKEN lub Twilio w Supabase Secrets" };
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

app.get("/make-server-0afb8820/sms-status", async (c) => {
  try {
    const status = await getSmsProviderStatus();
    return c.json(status);
  } catch (e) {
    return c.json({
      ok: false,
      configured: false,
      provider: "none",
      error: e instanceof Error ? e.message : "SMS status error",
    }, 500);
  }
});

/** Status nazw nadawców w SMSAPI (tylko odczyt — nazwy dodajesz ręcznie w panelu klienta). */
app.post("/make-server-0afb8820/sms-sendernames/ensure", async (c) => {
  const token = Deno.env.get("SMSAPI_TOKEN");
  if (!token) {
    return c.json({ ok: false, error: "SMSAPI_TOKEN not set" }, 503);
  }
  let body: { senderName?: string; names?: string[] };
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }
  const extra = Array.isArray(body.names) ? body.names.map(String) : [];
  const names = collectSenderNamesToEnsure(String(body.senderName || ""));
  for (const n of extra) {
    if (n.trim()) names.push(n.trim());
  }
  const unique = [...new Set(names)];
  try {
    const results = await checkSmsApiSendersStatus(token, unique);
    const sendernames = await listSmsApiSenders(token);
    return c.json({
      ok: true,
      results,
      sendernames,
      active: activeKnownSenders(sendernames),
      activeAll: activeSenderNames(sendernames),
      expected: SMS_KNOWN_SENDERS,
      manualOnly: true,
    });
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : "SMS sendernames error" }, 500);
  }
});

// Masowa wysyłka SMS do pracowników (pilne ogłoszenia)
app.post("/make-server-0afb8820/send-sms-bulk", async (c) => {
  let body: {
    message?: string;
    phones?: string[];
    labels?: string[];
    recipients?: { name?: string; phone?: string }[];
    senderLogin?: string;
    senderName?: string;
    senderRole?: string;
    smsFrom?: string;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "Nieprawidłowe dane" }, 400);
  }

  const message = String(body.message || "").trim();
  if (!message) return c.json({ ok: false, error: "Brak treści wiadomości" }, 400);
  if (message.length > 640) return c.json({ ok: false, error: "Wiadomość za długa (max 640 znaków)" }, 400);

  const senderName = String(body.senderName || "").trim();
  const senderLogin = String(body.senderLogin || "").trim();
  const senderRole = String(body.senderRole || "").trim() || undefined;

  type SendTarget = { phone: string; name: string };
  let targets: SendTarget[] = [];

  if (Array.isArray(body.recipients) && body.recipients.length > 0) {
    targets = body.recipients
      .map((r) => {
        const phone = normalizePhoneE164(String(r.phone || ""));
        const name = String(r.name || "").trim() || phone || "—";
        return phone ? { phone, name } : null;
      })
      .filter((t): t is SendTarget => !!t);
  } else {
    const rawPhones = Array.isArray(body.phones) ? body.phones : [];
    const labels = Array.isArray(body.labels) ? body.labels : [];
    targets = rawPhones
      .map((p, i) => {
        const phone = normalizePhoneE164(String(p));
        if (!phone) return null;
        return { phone, name: String(labels[i] || "").trim() || phone };
      })
      .filter((t): t is SendTarget => !!t);
  }

  const unique = new Map<string, SendTarget>();
  for (const t of targets) {
    if (!unique.has(t.phone)) unique.set(t.phone, t);
  }
  targets = [...unique.values()];

  if (targets.length === 0) {
    return c.json({ ok: false, error: "Brak poprawnych numerów telefonu" }, 400);
  }
  if (targets.length > 50) {
    return c.json({ ok: false, error: "Maksymalnie 50 odbiorców na raz" }, 400);
  }

  const smsPrefix = Deno.env.get("SMS_PREFIX")?.trim();
  const fullMessage = buildFullSmsText(message, senderName || undefined, smsPrefix);

  const smsFrom = String(body.smsFrom || "").trim() || undefined;

  const personalFrom = senderName ? buildSmsFromCandidate(senderName) : undefined;
  let fromCandidates = personalFrom ? [personalFrom] : [];
  let ensureResults: SmsSenderEnsureResult[] = [];

  const smsToken = Deno.env.get("SMSAPI_TOKEN");
  if (smsToken) {
    ensureResults = await checkSmsApiSendersStatus(smsToken, [...SMS_KNOWN_SENDERS]);
    const senders = await listSmsApiSenders(smsToken);
    const active = activeSenderNames(senders);
    const resolved = resolveFromCandidates(active, { requestedFrom: smsFrom, senderDisplayName: senderName });
    if (resolved.fromCandidates.length === 0) {
      return c.json({ ok: false, error: resolved.error || "Brak aktywnych nadawców SMS", sent: 0, failed: 0 }, 400);
    }
    fromCandidates = resolved.fromCandidates;
  } else {
    fromCandidates = personalFrom ? [personalFrom] : [];
    const envFrom = Deno.env.get("SMSAPI_FROM")?.trim();
    if (envFrom && !/^test$/i.test(envFrom)) fromCandidates.push(envFrom);
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  const recipientLog: SmsHistoryEntry["recipients"] = [];
  let lastUsedFrom: string | undefined;

  for (const target of targets) {
    const res = await sendSingleSms(target.phone, fullMessage, fromCandidates);
    if (res.usedFrom) lastUsedFrom = res.usedFrom;
    if (res.ok) {
      sent++;
      recipientLog.push({ name: target.name, phone: target.phone, ok: true });
    } else {
      failed++;
      const err = res.error || "błąd";
      errors.push(`${target.name} (${target.phone}): ${err}`);
      recipientLog.push({ name: target.name, phone: target.phone, ok: false, error: err });
    }
  }

  if (sent > 0) {
    await appendSmsHistory({
      at: new Date().toISOString(),
      senderLogin: senderLogin || "—",
      senderName: senderName || "Administrator",
      senderRole,
      message,
      fromField: lastUsedFrom,
      recipients: recipientLog,
      sent,
      failed,
    });
  }

  if (sent === 0) {
    return c.json({ ok: false, error: errors[0] || "Wysyłka nie powiodła się", sent, failed, errors }, 500);
  }

  return c.json({
    ok: true,
    sent,
    failed,
    errors: errors.slice(0, 10),
    fromField: lastUsedFrom,
    ensureResults: ensureResults.length > 0 ? ensureResults : undefined,
    activeFromCandidates: fromCandidates.length > 0 ? fromCandidates : undefined,
  });
});

app.get("/make-server-0afb8820/sms-history", async (c) => {
  try {
    const limitRaw = c.req.query("limit");
    const limit = Math.min(Math.max(parseInt(limitRaw || "50", 10) || 50, 1), 150);
    const prev = await kv.get(SMS_HISTORY_KEY);
    const list = Array.isArray(prev) ? (prev as SmsHistoryEntry[]) : [];
    return c.json({ ok: true, entries: list.slice(0, limit) });
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : "SMS history error" }, 500);
  }
});

const BZP_ACTION_KEYWORDS = [
  "remont", "moderniz", "termomoderniz", "wykończ", "wykończen", "przebudow", "renowac", "adaptacj",
  "rehabilit", "odśwież", "termo", "konserwac", "napraw", "odnow", "wymian", "podłącz", "podlacz",
  "demonta", "monta", "układ", "ukladan", "malow", "tapet", "tapetow", "tynk", "gładź", "gladz",
  "szpachl", "glazur", "płytek", "plytek", "fugow", "posadzk", "podłog", "podlog", "sufit", "parkiet",
  "wykładzin", "wykladzin", "regips", "zabudow", "cyklin", "lakier", "olejow", "okładzin", "okladzin",
  "sztukator", "impregnat", "natrysk", "szlif",
];
const BZP_SCOPE_KEYWORDS = [
  "pomieszcze", "pomieszczen", "wnętrz", "wnetrz", "lokal ", "lokalu", "lokali", "lokale", "mieszkan",
  "apartament", "segment", "pustostan", "korytarz", "hol ", "holu", "przedpok", "garderob", "spiżarn",
  "spizarn", "sala ", "sal ", "aula", "auli", "ścian", "scian", "sufit", "posadzk", "podłog", "podlog",
  "tynk", "malow", "tapeta", "glazura", "płytk", "plytk", "okładzin", "okladzin", "parapet", "cokół",
  "cokol", "balustrad", "barierk", "poręcz", "porecz", "klatk", "schodisk", "schod", "piętr", "pietr",
  "parter", "piwnic", "strych", "toalet", "sanitar", "łazienk", "lazienk", "kuchni", "garaż", "garaz",
  "budynk", "biur", "biurow", "biurowc", "administracyj", "hala ", "hali ", "hale ", "magazyn", "fabryk",
  "hali produkcy", "warsztat", "pracowni", "laboratori", "uniwersytet", "uczelni", "collegium", "wydział",
  "wydzial", "instytut", "akademi", "dydaktyczn", "akademik", "domu studenck", "dom studenck", "internat",
  "szpital", "przychodni", "gabinet", "poradni", "klinik", "szkoł", "przedszk", "żłobek", "zlobek",
  "bibliotek", "muzeum", "centrum kultury", "dom kultury", "dom kultur", "świetlic", "swietlic", "stołówk",
  "stolowk", "jadalni", "basen", "hala sport", "obiekt sport", "siłowni", "silowni", "rekreacji", "hotel",
  "hostel", "pensjonat", "nocleg", "urząd", "urzedu", "sąd", "sad ", "prokurat", "komendy", "remiz",
  "straż poż", "straz poz", "poczta", "poczty", "kościoł", "kosciol", "kaplic", "filia", "oddział",
  "oddzial", "dom opieki", "pieczy zastępc", "pieczy zastepc", "kamienic", "osiedl", "blok ", "wspólnot",
  "wspolnot", "centrum handlow", "galeria handl", "sklep", "kiosk", "pawilon", "lokale usług",
  "lokali uslug", "lokale handl", "lokali handl", "lokale użytk", "lokale uzytk", "usługow", "uslugow",
  "handlow", "nieruchomo", "obiekt budowl", "elewac", "dach", "stolark", "okien", "okno", "drzwi", "wind",
  "dźwig", "dzwig", "izolac", "instalac", "elektrycz", "oświetl", "osietlen", "okablow", "rozdzieln",
  "tablic rozdziel", "przewod", "gniazd", "gniazdk", "opraw oświet", "opraw osiet", "zasilani", "uziemien",
  "niskoprąd", "niskopradow", "teletechnik", "domofon", "videofon", "sap ", "system alarm",
  "pogotowie energet", "grzewcz", "wentylac", "klimatyzac", "wodno-kanal", "wodno kanal", "wod-kan",
  "hydraulic", "sanitarn", "co ", "centralnego ogrzew",
];
const BZP_EXCLUDE_KEYWORDS = [
  "drogi wojewódzk", "nawierzchni jezdni", "chodników drogow", "przebudowa drogi", "remont drogi",
  "remont dróg", "remont nawierzchni", "rozbudowa skrzyżowania", "budowa drogi", "budowa dróg",
  "nawierzchni bitum", "utwardzenie placu drogowego", "kanalizacji deszczowej", "wodociąg", "gazociąg",
  "most ", "wiadukt", "prom ", "linii kolejow", "budowa budynk", "budowa obiektu", "budowa nowego",
  "budowa hali magazyn", "budowa budynku", "wykonanie obiektu budowl",
  "roboty budowlane polegające na budowie", "roboty ziemne", "wycinka drzew", "boisko sportowe",
  "nawierzchni sportowej",
];
const BZP_RENOVATION_SIGNALS = [
  "remont", "moderniz", "przebudow", "termomoderniz", "adaptacj", "rozbudow", "renowac",
  "wykończ", "wykończen", "wymian", "malow", "odnow",
];
const PRIORITY_BUILDING_HINTS = [...BZP_ACTION_KEYWORDS, ...BZP_SCOPE_KEYWORDS];

const WROCLAW_PRIORITY_ORG_SEARCHES: {
  id: string;
  search?: string;
  cityOnly: boolean;
  organizationCity?: string;
  /** Gotowy, zakodowany fragment query (gdy URLSearchParams w Deno psuje polskie znaki). */
  queryString?: string;
}[] = [
  { id: "wm", search: "Wrocławskie Mieszkania", cityOnly: true },
  { id: "zik", search: "Zarząd Zasobu Komunalnego", cityOnly: true },
  { id: "zim", search: "Zarząd Inwestycji Miejskich", cityOnly: true },
  { id: "tbs", search: "Budownictwa Społecznego Wrocław", cityOnly: false },
  { id: "gmina", search: "Gmina Wrocław", cityOnly: true },
  {
    id: "mops",
    cityOnly: true,
    queryString: "organizationName=Miejski%20O%C5%9Brodek%20Pomocy%20Spo%C5%82ecznej&organizationCity=Wroc%C5%82aw",
  },
];

type BzpNoticeRow = Record<string, unknown>;

function isNewConstructionTitle(title: string): boolean {
  const t = title.toLowerCase();
  if (!t.includes("budowa")) return false;
  return !BZP_RENOVATION_SIGNALS.some((s) => t.includes(s));
}

function isExcludedBzpTitle(title: string): boolean {
  const t = title.toLowerCase();
  if (BZP_EXCLUDE_KEYWORDS.some((ex) => t.includes(ex))) return true;
  return isNewConstructionTitle(t);
}

function matchBzpKeywords(title: string): { action: string[]; scope: string[] } {
  const t = title.toLowerCase();
  return {
    action: BZP_ACTION_KEYWORDS.filter((kw) => t.includes(kw)),
    scope: BZP_SCOPE_KEYWORDS.filter((kw) => t.includes(kw)),
  };
}

function bzpHasRenovationSignal(title: string): boolean {
  const { action, scope } = matchBzpKeywords(title);
  return action.length > 0 || scope.length >= 2;
}

function foldPolish(s: string): string {
  return s.toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z");
}

function isWroclawRelatedRow(n: BzpNoticeRow): boolean {
  const city = foldPolish((n.organizationCity || "").toString());
  const title = foldPolish((n.orderObject || "").toString());
  const org = foldPolish((n.organizationName || "").toString());
  if (city.includes("wroclaw") || city.startsWith("wroc")) return true;
  if (title.includes("wroclaw") || org.includes("wroclaw")) return true;
  return false;
}

function isPriorityBuyerOrg(orgName: string, organizationCity?: string): boolean {
  const n = foldPolish(orgName || "");
  const city = foldPolish(organizationCity || "");
  if (/miejski\s+osrodek\s+pomocy\s+spolecznej/.test(n) && city.includes("wroclaw")) return true;
  return /wroclawskie\s+mieszkania|zarzad\s+zasobu\s+komunalnego|zarzad\s+inwestycji\s+miejskich|budownictwa\s+spolecznego\s+wroclaw|gmina\s+wroclaw/.test(n);
}

function normalizeBzpSearchPayload(data: unknown): BzpNoticeRow[] {
  if (Array.isArray(data)) return data as BzpNoticeRow[];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items as BzpNoticeRow[];
    if (Array.isArray(o.data)) return o.data as BzpNoticeRow[];
    if (o.objectId || o.bzpNumber) return [o];
  }
  return [];
}

function scoreBzpNotice(n: BzpNoticeRow, opts?: { priorityOrg?: boolean }): { score: number; excluded: boolean } {
  const title = `${n.orderObject || ""} ${n.cpvCode || ""}`.toString().toLowerCase();
  if (isExcludedBzpTitle(title)) return { score: 0, excluded: true };
  const { action, scope } = matchBzpKeywords(title);
  let score = action.length * 10 + scope.length * 5;
  const city = foldPolish((n.organizationCity || "").toString());
  if (city.includes("wroclaw") || city.startsWith("wroc")) score += 25;
  const titleNorm = foldPolish((n.orderObject || "").toString());
  if (titleNorm.includes("wroclaw")) score += 15;
  if ((n.cpvCode || "").toString().includes("454")) score += 5;
  if ((n.cpvCode || "").toString().includes("452")) score += 3;
  const priority = opts?.priorityOrg || isPriorityBuyerOrg(
    (n.organizationName || "").toString(),
    (n.organizationCity || "").toString(),
  );
  if (priority) score += 20;
  const priorityPass = priority && PRIORITY_BUILDING_HINTS.some((h) => title.includes(h));
  if (priorityPass) score = Math.max(score, 18);
  if (!bzpHasRenovationSignal(title) && !priorityPass) return { score: 0, excluded: true };
  return { score, excluded: false };
}

function noticeId(row: BzpNoticeRow): string {
  return String(row.objectId || row.moIdentifier || row.bzpNumber || "");
}

function isOfferDeadlineOpen(row: BzpNoticeRow): boolean {
  const raw = row.submittingOffersDate;
  if (!raw) return false;
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() > Date.now();
}

async function fetchBzpSearchPages(
  baseParams: Record<string, string>,
  maxPages: number,
  publicationDateFrom: string,
): Promise<BzpNoticeRow[]> {
  const out: BzpNoticeRow[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const params = new URLSearchParams({
      noticeType: "ContractNotice",
      orderType: "Works",
      SortingColumnName: "PublicationDate",
      SortingDirection: "DESC",
      PageNumber: String(page),
      PageSize: "50",
      publicationDateFrom,
      ...baseParams,
    });
    const url = `https://ezamowienia.gov.pl/mo-board/api/v1/Board/Search?${params}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "WGDOM/2.35.21 tenders-pipeline" },
    });
    if (!res.ok) throw new Error(`BZP HTTP ${res.status}`);
    const batch = normalizeBzpSearchPayload(await res.json());
    if (batch.length === 0) break;
    out.push(...batch);
    if (batch.length < 50) break;
  }
  return out;
}

async function fetchBzpPagesByQueryString(
  extraQuery: string,
  maxPages: number,
  publicationDateFrom: string,
): Promise<BzpNoticeRow[]> {
  const out: BzpNoticeRow[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = `https://ezamowienia.gov.pl/mo-board/api/v1/Board/Search?noticeType=ContractNotice&orderType=Works&SortingColumnName=PublicationDate&SortingDirection=DESC&PageNumber=${page}&PageSize=50&publicationDateFrom=${publicationDateFrom}&${extraQuery}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "WGDOM/2.35.21 tenders-pipeline" },
    });
    if (!res.ok) throw new Error(`BZP HTTP ${res.status}`);
    const batch = normalizeBzpSearchPayload(await res.json());
    if (batch.length === 0) break;
    out.push(...batch);
    if (batch.length < 50) break;
  }
  return out;
}

function ingestNotices(
  batch: BzpNoticeRow[],
  seen: Set<string>,
  all: BzpNoticeRow[],
  opts?: { priorityOrg?: boolean; wroclawOnly?: boolean },
): number {
  let added = 0;
  for (const row of batch) {
    if (opts?.wroclawOnly && !isWroclawRelatedRow(row)) continue;
    if (!isOfferDeadlineOpen(row)) continue;
    const id = noticeId(row);
    if (!id || seen.has(id)) continue;
    const { score, excluded } = scoreBzpNotice(row, { priorityOrg: opts?.priorityOrg });
    if (excluded || score <= 0) continue;
    seen.add(id);
    all.push(row);
    added++;
  }
  return added;
}

app.get("/make-server-0afb8820/tenders-bzp-search", async (c) => {
  try {
    const days = Math.min(Math.max(parseInt(c.req.query("days") || "90", 10) || 90, 1), 365);
    const pages = Math.min(Math.max(parseInt(c.req.query("pages") || "4", 10) || 4, 1), 10);
    const orgPages = Math.min(Math.max(parseInt(c.req.query("orgPages") || "3", 10) || 3, 1), 8);
    const province = (c.req.query("province") || "PL02").trim() || "PL02";
    const from = new Date(Date.now() - days * 86400000);
    const publicationDateFrom = from.toISOString().slice(0, 10);

    const all: BzpNoticeRow[] = [];
    const seen = new Set<string>();
    const orgStats: Record<string, number> = {};

    const provinceBatch = await fetchBzpSearchPages(
      { organizationProvince: province },
      pages,
      publicationDateFrom,
    );
    ingestNotices(provinceBatch, seen, all);

    for (const org of WROCLAW_PRIORITY_ORG_SEARCHES) {
      const orgBatch = org.queryString
        ? await fetchBzpPagesByQueryString(org.queryString, orgPages, publicationDateFrom)
        : await fetchBzpSearchPages(
          { organizationName: org.search! },
          orgPages,
          publicationDateFrom,
        );
      const n = ingestNotices(orgBatch, seen, all, {
        priorityOrg: true,
        wroclawOnly: org.cityOnly && !org.queryString,
      });
      orgStats[org.id] = n;
    }

    all.sort((a, b) => {
      const da = String(a.submittingOffersDate || a.publicationDate || "");
      const db = String(b.submittingOffersDate || b.publicationDate || "");
      return da.localeCompare(db);
    });

    return c.json({
      ok: true,
      items: all,
      count: all.length,
      province,
      days,
      pages,
      orgPages,
      priorityOrgs: orgStats,
    });
  } catch (e) {
    console.error("tenders-bzp-search:", e);
    return c.json({ ok: false, error: e instanceof Error ? e.message : "BZP search error" }, 500);
  }
});

const EZAMOWIENIA_UA = "WGDOM/2.36.0 tenders-pipeline";
const EZAMOWIENIA_FETCH = {
  Accept: "application/json",
  "User-Agent": EZAMOWIENIA_UA,
};

function stripHtmlForSwz(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePlnFromText(raw: string | null): { value: number | null; label: string | null } {
  if (!raw) return { value: null, label: null };
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const m = cleaned.match(/([\d\s]+(?:[.,]\d{1,2})?)\s*(?:zł|PLN|pln)/i)
    || cleaned.match(/([\d\s]+(?:[.,]\d{1,2})?)/);
  if (!m) return { value: null, label: cleaned.slice(0, 120) || null };
  const num = parseFloat(m[1].replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(num) ? { value: num, label: cleaned.slice(0, 120) } : { value: null, label: cleaned.slice(0, 120) };
}

function swzFirstMatch(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].replace(/\s+/g, " ").trim().slice(0, 500);
  }
  return null;
}

function parseSwzFromText(
  text: string,
  source: string,
  ourEstimatePln: number | null,
): Record<string, unknown> {
  const folded = text.replace(/\s+/g, " ");
  const wadiumRaw = swzFirstMatch(folded, [
    /wadium[:\s]+([^.;]{5,200})/i,
    /wysokość wadium[:\s]+([^.;]{5,200})/i,
  ]);
  const valueRaw = swzFirstMatch(folded, [
    /wartość zamówienia[:\s]+([^.;]{5,200})/i,
    /szacunkow[aą] wartość[:\s]+([^.;]{5,200})/i,
    /wartość brutto[:\s]+([^.;]{5,200})/i,
  ]);
  const referenceRequirement = swzFirstMatch(folded, [
    /referencj[^.]{10,400}\./i,
    /doświadczen[^.]{10,400}\./i,
    /co najmniej[^.]{10,200}zł[^.]{0,80}\./i,
  ]);
  const { value: wadiumPln, label: wadiumLabel } = parsePlnFromText(wadiumRaw);
  const { value: estimatedValuePln, label: estLabel } = parsePlnFromText(valueRaw);
  let profitabilityHint = "unknown";
  let profitabilityNote = "Brak kwoty/wadium w tekście.";
  if (wadiumPln != null && wadiumPln >= 50000) {
    profitabilityHint = "risky";
    profitabilityNote = `Wysokie wadium (~${wadiumPln} zł).`;
  } else if (estimatedValuePln != null && ourEstimatePln != null && ourEstimatePln > estimatedValuePln * 1.15) {
    profitabilityHint = "caution";
    profitabilityNote = "Szacunek wyższy niż wartość w SWZ.";
  } else if (estimatedValuePln != null && estimatedValuePln >= 30000) {
    profitabilityHint = "good";
    profitabilityNote = `Wartość ~${estimatedValuePln} zł — sprawdź zakres.`;
  } else if (estimatedValuePln != null || wadiumPln != null) {
    profitabilityHint = "caution";
    profitabilityNote = "Dane częściowe — przejrzyj pełną SWZ.";
  }
  return {
    estimatedValuePln,
    estimatedValueRaw: estLabel || valueRaw,
    wadiumPln,
    wadiumRaw: wadiumLabel || wadiumRaw,
    referenceRequirement,
    qualificationHints: [],
    parsedAt: new Date().toISOString(),
    source,
    profitabilityHint,
    profitabilityNote,
  };
}

function parseDispositionFilename(h: string | null): string {
  if (!h) return "dokument";
  const star = h.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) {
    try { return decodeURIComponent(star[1]); } catch { return star[1]; }
  }
  const plain = h.match(/filename="([^"]+)"/i);
  return plain ? plain[1] : "dokument";
}

function isSwzFilename(name: string): boolean {
  const n = name.toLowerCase();
  return /swz|opz|specyfikac|kosztorys|formularz/.test(n);
}

async function probeTenderDocuments(tenderId: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  const base = "https://ezamowienia.gov.pl/mp-readmodels/api/Tender/DownloadDocument";
  for (let i = 1; i <= 25; i++) {
    const documentId = `${tenderId}_${i}`;
    const url = `${base}/${encodeURIComponent(tenderId)}/${encodeURIComponent(documentId)}`;
    const res = await fetch(url, { method: "HEAD", headers: EZAMOWIENIA_FETCH });
    if (!res.ok) break;
    const ct = res.headers.get("content-type") || "application/octet-stream";
    const filename = parseDispositionFilename(res.headers.get("content-disposition"));
    out.push({
      index: i,
      documentId,
      filename,
      contentType: ct.split(";")[0],
      downloadUrl: url,
      isSwzHint: isSwzFilename(filename),
    });
  }
  return out;
}

function extractPdfTextSimple(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  const chunks: string[] = [];
  const streamRe = /stream\r?\n([\s\S]*?)endstream/g;
  let m: RegExpExecArray | null;
  while ((m = streamRe.exec(raw))) {
    const chunk = m[1].replace(/[^\x20-\x7E\n\r\s]/g, " ").replace(/\s+/g, " ");
    if (chunk.length > 30) chunks.push(chunk);
  }
  return chunks.join(" ");
}

app.get("/make-server-0afb8820/tenders-bzp-notice", async (c) => {
  try {
    const noticeNumber = (c.req.query("noticeNumber") || "").trim();
    if (!noticeNumber) return c.json({ ok: false, error: "Brak noticeNumber" }, 400);
    const enc = encodeURIComponent(noticeNumber);
    const [detRes, htmlRes] = await Promise.all([
      fetch(`https://ezamowienia.gov.pl/mo-board/api/v1/Board/GetNoticeDetails?noticeNumber=${enc}`, { headers: EZAMOWIENIA_FETCH }),
      fetch(`https://ezamowienia.gov.pl/mo-board/api/v1/Board/GetNoticeHtmlBody?noticeNumber=${enc}`, { headers: EZAMOWIENIA_FETCH }),
    ]);
    if (!detRes.ok) return c.json({ ok: false, error: `BZP details HTTP ${detRes.status}` }, 502);
    const details = await detRes.json();
    let htmlBody = "";
    if (htmlRes.ok) {
      const raw = await htmlRes.text();
      htmlBody = raw.startsWith('"') ? JSON.parse(raw) : raw;
    }
    return c.json({
      ok: true,
      details: {
        id: details.id,
        tenderId: details.tenderId,
        moIdentifier: details.moIdentifier,
        noticeNumber: details.noticeNumber,
        tenderState: details.tenderState,
        publicationDate: details.publicationDate,
        htmlBody,
      },
    });
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : "notice error" }, 500);
  }
});

app.get("/make-server-0afb8820/tenders-bzp-documents", async (c) => {
  try {
    const tenderId = (c.req.query("tenderId") || "").trim();
    if (!tenderId) return c.json({ ok: false, error: "Brak tenderId" }, 400);
    const documents = await probeTenderDocuments(tenderId);
    return c.json({ ok: true, tenderId, documents, count: documents.length });
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : "documents error" }, 500);
  }
});

app.get("/make-server-0afb8820/tenders-bzp-analyze-swz", async (c) => {
  try {
    const noticeNumber = (c.req.query("noticeNumber") || "").trim();
    const tenderId = (c.req.query("tenderId") || "").trim();
    const docIndex = parseInt(c.req.query("documentIndex") || "0", 10) || 0;
    const ourEstimatePln = parseFloat(c.req.query("ourEstimatePln") || "") || null;
    let text = "";
    let source = "html";

    if (docIndex > 0 && tenderId) {
      const url = `https://ezamowienia.gov.pl/mp-readmodels/api/Tender/DownloadDocument/${encodeURIComponent(tenderId)}/${encodeURIComponent(`${tenderId}_${docIndex}`)}`;
      const res = await fetch(url, { headers: EZAMOWIENIA_FETCH });
      if (!res.ok) return c.json({ ok: false, error: `Dokument HTTP ${res.status}` }, 502);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > 15 * 1024 * 1024) return c.json({ ok: false, error: "Plik zbyt duży (max 15 MB)" }, 413);
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("pdf")) {
        text = extractPdfTextSimple(bytes);
        source = "pdf";
      } else {
        text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
        source = "docx";
      }
    } else if (noticeNumber) {
      const enc = encodeURIComponent(noticeNumber);
      const htmlRes = await fetch(`https://ezamowienia.gov.pl/mo-board/api/v1/Board/GetNoticeHtmlBody?noticeNumber=${enc}`, { headers: EZAMOWIENIA_FETCH });
      if (!htmlRes.ok) return c.json({ ok: false, error: `HTML HTTP ${htmlRes.status}` }, 502);
      const raw = await htmlRes.text();
      const html = raw.startsWith('"') ? JSON.parse(raw) : raw;
      text = stripHtmlForSwz(html);
      source = "html";
    } else {
      return c.json({ ok: false, error: "Podaj noticeNumber lub tenderId+documentIndex" }, 400);
    }

    const analysis = parseSwzFromText(text, source, ourEstimatePln);
    return c.json({ ok: true, analysis });
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : "analyze error" }, 500);
  }
});

app.post("/make-server-0afb8820/tenders-bzp-upload", async (c) => {
  try {
    const form = await c.req.formData();
    const file = form.get("file");
    const tenderId = form.get("tenderId");
    const filename = form.get("filename");
    if (!(file instanceof File) || !tenderId || !filename) {
      return c.json({ ok: false, error: "Brak pliku, tenderId lub filename" }, 400);
    }
    await ensurePhotosBucket();
    const supabase = supabaseAdmin();
    const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `tenders/${tenderId}/${safeName}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength > 15 * 1024 * 1024) {
      return c.json({ ok: false, error: "Plik zbyt duży (max 15 MB)" }, 413);
    }
    const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, bytes, {
      contentType: contentTypeForUploadedFile(String(filename), file.type || ""),
      upsert: true,
    });
    if (error) return c.json({ ok: false, error: error.message }, 500);
    const { data: pub } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
    return c.json({ ok: true, path, publicUrl: pub.publicUrl });
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

Deno.serve(app.fetch);
