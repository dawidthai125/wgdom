/**
 * PAYROLL GO4 — settlement-only recovery DRY-RUN.
 *
 * ABSOLUTE: ZERO production mutations.
 * - READ: GET / batch-get only
 * - FORBIDDEN: batch-set, forceReplace, settle/unsettle, localStorage.setItem, push, deploy, APPLY
 *
 * Run: npx vite-node scripts/payroll-settlement-recovery-dry-run.mjs
 *
 * Canonical source (priority):
 * 1) PAYROLL_CANONICAL_ROSTER_JSON env (full WeekEmployee[])
 * 2) .tmp-payroll-multidevice-381a3b3/canonical-roster-full.json
 * 3) Owner Chrome LS LevelDB copy (same path as prior RO audits)
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

// Mock LS before cloud-sync import side effects (dry-run must never write LS)
const __dryRunLs = Object.create(null);
globalThis.localStorage = {
  getItem: (k) => (k in __dryRunLs ? __dryRunLs[k] : null),
  setItem: (k, _v) => {
    throw new Error(`[DRY-RUN FENCE] BLOCKED localStorage.setItem(${k})`);
  },
  removeItem: (k) => {
    delete __dryRunLs[k];
  },
  clear: () => {
    for (const k of Object.keys(__dryRunLs)) delete __dryRunLs[k];
  },
};

const { rebuildPayrollOutgoingAfterFreshness } = await import("../src/lib/cloud-sync.ts");
const { normalizePayrollSettlement } = await import("../src/lib/payroll-settlement.ts");

const WEEK_FROM = "2026-08-24";
const WEEK_TO = "2026-08-29";
const TMP_DIR = path.join(process.cwd(), ".tmp-payroll-multidevice-381a3b3");
const OUT_JSON = path.join(TMP_DIR, "recovery-dry-run-result.json");
const CANON_CACHE = path.join(TMP_DIR, "canonical-roster-full.json");

/** Soft expectation from prior audit — NOT hardcoded decision; mismatch → BLOCK. */
const EXPECTED = {
  RESTORE_SETTLEMENT: [
    "Kamil Elektryk",
    "Marcin",
    "Grzesiek",
    "Łukasz",
    "Greg",
    "Bogusław",
    "Stepan",
    "Mołdawia 1",
    "Rafał",
    "Jaroslaw",
    "Adam",
  ],
  NO_CHANGE: ["Piotrek Ukraina", "Michal Ukraina", "Kola Ukraina", "Krzysztof"],
  MANUAL_REVIEW: [],
};

let productionMutationCount = 0;
const mutationAttempts = [];

function loadDotEnv() {
  if (!fs.existsSync(".env")) return;
  const t = fs.readFileSync(".env", "utf8");
  for (const line of t.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

function decodeLevelDbValue(v) {
  const buf = Buffer.from(v);
  if (buf[0] === 1) return buf.slice(1).toString("utf8");
  if (buf[0] === 0 && buf[1] === 0x5b) return buf.slice(1).toString("utf16le");
  if (buf[0] === 0x5b && buf[1] === 0) return buf.toString("utf16le");
  return buf.toString("utf8");
}

function installMutationFence() {
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : String(input?.url ?? input);
    const method = String(init.method || "GET").toUpperCase();
    const isBatchGet = /\/batch-get(?:\?|$)/i.test(url);
    const isBatchSet = /\/batch-set(?:\?|$)/i.test(url);
    const isMutationPath =
      isBatchSet
      || /\/(set|put|delete|upsert|force-replace|forceReplace)(?:\?|$)/i.test(url)
      || (method !== "GET" && method !== "HEAD" && !isBatchGet);

    if (isMutationPath || isBatchSet) {
      productionMutationCount += 1;
      mutationAttempts.push({ url, method, blocked: true });
      throw new Error(
        `[DRY-RUN FENCE] BLOCKED production mutation attempt: ${method} ${url}`,
      );
    }
    return originalFetch(input, init);
  };

  // Forbid accidental LS writes in this process
  const ls = globalThis.localStorage;
  if (ls && typeof ls.setItem === "function") {
    const origSet = ls.setItem.bind(ls);
    ls.setItem = (k, v) => {
      productionMutationCount += 1;
      mutationAttempts.push({ type: "localStorage.setItem", key: String(k), blocked: true });
      throw new Error(`[DRY-RUN FENCE] BLOCKED localStorage.setItem(${k})`);
    };
    return () => {
      ls.setItem = origSet;
      globalThis.fetch = originalFetch;
    };
  }
  return () => {
    globalThis.fetch = originalFetch;
  };
}

function recoveryAction(canon, cloud) {
  const ks = !!canon?.settled;
  const cs = !!cloud?.settled;
  const kAt = Date.parse(canon?.settledUpdatedAt || "") || 0;
  const cAt = Date.parse(cloud?.settledUpdatedAt || "") || 0;
  const kMeta = normalizePayrollSettlement(canon?.payrollSettlement) || null;
  const cMeta = normalizePayrollSettlement(cloud?.payrollSettlement) || null;

  if (ks && !cs) {
    return {
      action: "RESTORE_SETTLEMENT",
      note: "canonical true, cloud false — restore atomic settlement triple",
    };
  }
  if (ks && cs && kMeta && !cMeta) {
    return {
      action: "RESTORE_SETTLEMENT",
      note: "cloud settled but missing payrollSettlement — restore meta+sAt from canonical",
    };
  }
  if (ks && cs && kMeta && cMeta && kAt > cAt) {
    return {
      action: "RESTORE_SETTLEMENT",
      note: "canonical newer sAt + meta — restore settlement clock/meta",
    };
  }
  if (ks && cs && kMeta && cMeta && kAt === cAt) {
    const same =
      kMeta.paymentMethod === cMeta.paymentMethod
      && Number(kMeta.amount) === Number(cMeta.amount)
      && String(kMeta.settledByUserId) === String(cMeta.settledByUserId);
    if (same) return { action: "NO_CHANGE", note: "settlement already matches" };
    return { action: "MANUAL_REVIEW", note: "same sAt, different meta content" };
  }
  if (!ks && cs) {
    return {
      action: "MANUAL_REVIEW",
      note: "canonical unsettled but cloud settled — unexpected for this incident",
    };
  }
  if (!ks && !cs) return { action: "NO_CHANGE", note: "both unsettled" };
  if (ks && cs && !kMeta && !cMeta) {
    return { action: "NO_CHANGE", note: "both settled without meta" };
  }
  return { action: "MANUAL_REVIEW", note: "unclassified settlement delta" };
}

function stableJson(v) {
  return JSON.stringify(v ?? null);
}

function daysEqual(a, b) {
  return stableJson(a ?? {}) === stableJson(b ?? {});
}

async function loadCanonicalRoster() {
  const envPath = process.env.PAYROLL_CANONICAL_ROSTER_JSON;
  if (envPath && fs.existsSync(envPath)) {
    const raw = JSON.parse(fs.readFileSync(envPath, "utf8"));
    const emps = Array.isArray(raw) ? raw : raw.employees;
    if (!Array.isArray(emps) || emps.length === 0) {
      throw new Error(`Canonical JSON empty: ${envPath}`);
    }
    return { employees: emps, source: `env:${envPath}` };
  }
  if (fs.existsSync(CANON_CACHE)) {
    const raw = JSON.parse(fs.readFileSync(CANON_CACHE, "utf8"));
    const emps = Array.isArray(raw) ? raw : raw.employees;
    if (Array.isArray(emps) && emps.length > 0) {
      return { employees: emps, source: `cache:${CANON_CACHE}` };
    }
  }

  const require = createRequire(import.meta.url);
  const classicLevelPath = path.join(
    process.cwd(),
    ".tmp-payroll-rca-iphone17",
    "node_modules",
    "classic-level",
  );
  if (!fs.existsSync(classicLevelPath)) {
    throw new Error(
      "Missing classic-level helper and no canonical-roster-full.json — cannot load Owner Chrome LS",
    );
  }
  const { ClassicLevel } = require(classicLevelPath);
  const dst = path.join(process.env.TEMP || "/tmp", "wgdom-payroll-canonical-rca-ls");
  if (!fs.existsSync(dst)) {
    throw new Error(
      `LevelDB copy missing at ${dst}. Provide PAYROLL_CANONICAL_ROSTER_JSON or ${CANON_CACHE}`,
    );
  }
  const db = new ClassicLevel(dst, { createIfMissing: false });
  await db.open();
  let laptop = null;
  for await (const [key, value] of db.iterator()) {
    const k = Buffer.isBuffer(key) ? key.toString("utf8") : String(key);
    if (!k.includes("https://www.wgdom.fun")) continue;
    if (!k.includes("kw-week-employees") || k.includes("deleted")) continue;
    try {
      laptop = JSON.parse(decodeLevelDbValue(value));
    } catch {
      /* ignore */
    }
  }
  await db.close();
  if (!Array.isArray(laptop) || laptop.length === 0) {
    throw new Error("Owner Chrome LS kw-week-employees empty / not found");
  }
  fs.mkdirSync(TMP_DIR, { recursive: true });
  fs.writeFileSync(
    CANON_CACHE,
    JSON.stringify(
      {
        producedAt: new Date().toISOString(),
        weekFrom: WEEK_FROM,
        weekTo: WEEK_TO,
        source: "Owner Chrome LS LevelDB copy",
        employees: laptop,
      },
      null,
      2,
    ),
  );
  return { employees: laptop, source: `leveldb:${dst}` };
}

async function fetchCloudRosterReadOnly() {
  const project = process.env.VITE_SUPABASE_PROJECT_ID;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  const slug = process.env.VITE_SUPABASE_FUNCTION_SLUG || "make-server-0afb8820";
  if (!project || !anon) throw new Error("Missing VITE_SUPABASE_PROJECT_ID / ANON_KEY");
  const edge = `https://${project}.supabase.co/functions/v1/${slug}`;
  const res = await fetch(`${edge}/batch-get`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anon}`,
      apikey: anon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      keys: ["kw-week-employees", "kw-weekFrom", "kw-weekTo"],
    }),
  });
  if (!res.ok) throw new Error(`batch-get HTTP ${res.status}`);
  const json = await res.json();
  const values = Array.isArray(json.values) ? json.values : null;
  let employees;
  let weekFrom;
  let weekTo;
  if (values) {
    employees = values[0];
    weekFrom = values[1];
    weekTo = values[2];
  } else {
    employees = json["kw-week-employees"];
    weekFrom = json["kw-weekFrom"];
    weekTo = json["kw-weekTo"];
  }
  if (!Array.isArray(employees)) throw new Error("cloud kw-week-employees not an array");
  return {
    employees,
    weekFrom: String(weekFrom ?? "").trim(),
    weekTo: String(weekTo ?? "").trim(),
  };
}

function nameSet(names) {
  return [...names].sort((a, b) => a.localeCompare(b, "pl"));
}

function setsEqual(a, b) {
  const aa = nameSet(a);
  const bb = nameSet(b);
  return aa.length === bb.length && aa.every((v, i) => v === bb[i]);
}

// Normalize Rafał / Rafal for soft expectation compare
function canonName(n) {
  return String(n || "")
    .normalize("NFC")
    .trim()
    .replace(/Rafal$/i, "Rafał")
    .replace(/\s+/g, " ");
}

loadDotEnv();
const uninstallFence = installMutationFence();

let blocked = false;
let blockReason = null;
const result = {
  mode: "DRY_RUN_ONLY",
  producedAt: new Date().toISOString(),
  weekExpected: { from: WEEK_FROM, to: WEEK_TO },
  productionMutationCount: 0,
  mutationAttempts: [],
  applyPrepared: false,
  verdict: null,
};

try {
  const canonical = await loadCanonicalRoster();
  const cloud = await fetchCloudRosterReadOnly();

  result.canonicalSource = canonical.source;
  result.weekActual = {
    cloudFrom: cloud.weekFrom,
    cloudTo: cloud.weekTo,
  };

  if (cloud.weekFrom !== WEEK_FROM || cloud.weekTo !== WEEK_TO) {
    blocked = true;
    blockReason = `week mismatch cloud=${cloud.weekFrom}→${cloud.weekTo} expected=${WEEK_FROM}→${WEEK_TO}`;
  }

  const canonById = new Map(canonical.employees.map((e) => [String(e.id), e]));
  const cloudById = new Map(cloud.employees.map((e) => [String(e.id), e]));
  const canonIds = new Set(canonById.keys());
  const cloudIds = new Set(cloudById.keys());
  const idAlign =
    canonIds.size === cloudIds.size && [...canonIds].every((id) => cloudIds.has(id));
  result.rosterIdAlignment = {
    ok: idAlign,
    canonCount: canonIds.size,
    cloudCount: cloudIds.size,
    onlyCanon: [...canonIds].filter((id) => !cloudIds.has(id)),
    onlyCloud: [...cloudIds].filter((id) => !canonIds.has(id)),
  };
  if (!idAlign) {
    blocked = true;
    blockReason = blockReason || "roster id sets differ (canonical vs cloud)";
  }

  const rows = [];
  for (const c of canonical.employees) {
    const k = cloudById.get(String(c.id));
    const rec = recoveryAction(c, k);
    rows.push({
      name: c.name,
      id: c.id,
      recoveryAction: rec.action,
      note: rec.note,
      cloudSettled: !!k?.settled,
      canonSettled: !!c.settled,
      cloudSAt: k?.settledUpdatedAt || null,
      canonSAt: c.settledUpdatedAt || null,
    });
  }

  const matrix = {
    RESTORE_SETTLEMENT: rows.filter((r) => r.recoveryAction === "RESTORE_SETTLEMENT"),
    NO_CHANGE: rows.filter((r) => r.recoveryAction === "NO_CHANGE"),
    MANUAL_REVIEW: rows.filter((r) => r.recoveryAction === "MANUAL_REVIEW"),
  };
  result.counts = {
    total: rows.length,
    RESTORE_SETTLEMENT: matrix.RESTORE_SETTLEMENT.length,
    NO_CHANGE: matrix.NO_CHANGE.length,
    MANUAL_REVIEW: matrix.MANUAL_REVIEW.length,
  };
  result.rows = rows;

  const actualNames = {
    RESTORE_SETTLEMENT: matrix.RESTORE_SETTLEMENT.map((r) => canonName(r.name)),
    NO_CHANGE: matrix.NO_CHANGE.map((r) => canonName(r.name)),
    MANUAL_REVIEW: matrix.MANUAL_REVIEW.map((r) => canonName(r.name)),
  };
  const expectedNames = {
    RESTORE_SETTLEMENT: EXPECTED.RESTORE_SETTLEMENT.map(canonName),
    NO_CHANGE: EXPECTED.NO_CHANGE.map(canonName),
    MANUAL_REVIEW: EXPECTED.MANUAL_REVIEW.map(canonName),
  };
  const matrixMatchesExpectation =
    setsEqual(actualNames.RESTORE_SETTLEMENT, expectedNames.RESTORE_SETTLEMENT)
    && setsEqual(actualNames.NO_CHANGE, expectedNames.NO_CHANGE)
    && setsEqual(actualNames.MANUAL_REVIEW, expectedNames.MANUAL_REVIEW);
  result.matrixMatchesSoftExpectation = matrixMatchesExpectation;
  if (!matrixMatchesExpectation) {
    blocked = true;
    blockReason = blockReason || "computed matrix differs from soft audit expectation — stop, do not guess";
    result.matrixDiff = {
      expected: expectedNames,
      actual: actualNames,
    };
  }

  // Preflight rebuild — LOCAL ONLY, never sent
  const beforeRoster = cloud.employees.map((e) => ({ ...e }));
  const afterRoster = cloud.employees.map((e) => {
    const canon = canonById.get(String(e.id));
    if (!canon) return { ...e };
    const action = recoveryAction(canon, e).action;
    if (action !== "RESTORE_SETTLEMENT") return { ...e };
    return {
      ...e,
      settled: Boolean(canon.settled),
      settledUpdatedAt: canon.settledUpdatedAt,
      payrollSettlement: normalizePayrollSettlement(canon.payrollSettlement),
    };
  });

  const rebuilt = rebuildPayrollOutgoingAfterFreshness({
    cloudEmps: cloud.employees,
    intentBefore: beforeRoster,
    intentAfter: afterRoster,
    hoursIntents: [],
    weekFrom: WEEK_FROM,
    weekTo: WEEK_TO,
  });

  result.rebuildMode = rebuilt.mode;
  const outById = new Map(rebuilt.roster.map((e) => [String(e.id), e]));
  const settlementAssertions = [];
  let assertionsFailed = 0;

  for (const row of matrix.RESTORE_SETTLEMENT) {
    const canon = canonById.get(String(row.id));
    const cloud0 = cloudById.get(String(row.id));
    const outgoing = outById.get(String(row.id));
    const expectedMeta = normalizePayrollSettlement(canon?.payrollSettlement) ?? null;
    const outMeta = normalizePayrollSettlement(outgoing?.payrollSettlement) ?? null;
    const checks = {
      settled: Boolean(outgoing?.settled) === Boolean(canon?.settled),
      settledUpdatedAt:
        String(outgoing?.settledUpdatedAt ?? "") === String(canon?.settledUpdatedAt ?? ""),
      payrollSettlement: stableJson(outMeta) === stableJson(expectedMeta),
      daysPreserved: daysEqual(outgoing?.days, cloud0?.days),
      ratePreserved: String(outgoing?.rate ?? "") === String(cloud0?.rate ?? ""),
      extraCostsPreserved: stableJson(outgoing?.extraCosts) === stableJson(cloud0?.extraCosts),
      prevSaturdayPreserved: stableJson(outgoing?.prevSaturday) === stableJson(cloud0?.prevSaturday),
    };
    const ok = Object.values(checks).every(Boolean);
    if (!ok) assertionsFailed += 1;
    settlementAssertions.push({
      name: row.name,
      id: row.id,
      ok,
      checks,
      before: {
        settled: cloud0?.settled,
        settledUpdatedAt: cloud0?.settledUpdatedAt ?? null,
        payrollSettlement: cloud0?.payrollSettlement ?? null,
      },
      afterSettlementOnly: {
        settled: canon?.settled,
        settledUpdatedAt: canon?.settledUpdatedAt ?? null,
        payrollSettlement: expectedMeta,
      },
    });
  }

  result.settlementOnlyAssertions = {
    restoreCount: matrix.RESTORE_SETTLEMENT.length,
    failed: assertionsFailed,
    rows: settlementAssertions,
  };

  if (assertionsFailed > 0) {
    blocked = true;
    blockReason = blockReason || `settlement-only preflight assertions FAIL (${assertionsFailed})`;
  }

  if (productionMutationCount > 0) {
    blocked = true;
    blockReason = blockReason || "production mutation fence tripped";
  }

  result.productionMutationCount = productionMutationCount;
  result.mutationAttempts = mutationAttempts;
  result.blocked = blocked;
  result.blockReason = blockReason;
  result.applyPrepared = false;
  result.verdict = blocked
    ? "GO4 READY + RECOVERY BLOCKED / RECOVERY DRY-RUN FAILED"
    : "RECOVERY DRY-RUN PASS (no APPLY — live write forbidden)";

  fs.mkdirSync(TMP_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2));

  console.log(JSON.stringify({
    verdict: result.verdict,
    counts: result.counts,
    matrixMatchesSoftExpectation: result.matrixMatchesSoftExpectation,
    weekActual: result.weekActual,
    rosterIdAlignment: result.rosterIdAlignment,
    settlementOnlyFailed: assertionsFailed,
    productionMutationCount,
    applyPrepared: false,
    out: OUT_JSON,
    restoreNames: actualNames.RESTORE_SETTLEMENT,
    noChangeNames: actualNames.NO_CHANGE,
    blockReason,
  }, null, 2));

  if (blocked) process.exitCode = 2;
} catch (e) {
  result.blocked = true;
  result.blockReason = e instanceof Error ? e.message : String(e);
  result.productionMutationCount = productionMutationCount;
  result.mutationAttempts = mutationAttempts;
  result.verdict = "RECOVERY DRY-RUN FAILED";
  try {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2));
  } catch {
    /* ignore */
  }
  console.error("DRY-RUN FAILED:", result.blockReason);
  process.exitCode = 1;
} finally {
  uninstallFence();
}
