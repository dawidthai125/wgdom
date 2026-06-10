/**
 * Pre-feature-stream backup — WGDOM v2.50.64
 * node scripts/run-pre-feature-backup-2.50.64.mjs
 */
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import {
  fullBackupKvKeys,
  getSupabaseConfig,
  fetchKvBackup,
  kvSummary,
  projectRoot,
} from "./backup-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERSION = "2.50.64";
const COMMIT = "c7bc58f";
const DEPLOY = "BxMBS2SFGiDxZmkHmwndVpr5RLin";
const TAG = `pre-next-feature-${VERSION}`;
const BUCKET = "make-0afb8820-photos";
const BACKUP_ROOT = resolve(projectRoot, "..", `WGDOM-BACKUP-${VERSION}`);

const EXTRA_KV_KEYS = [
  "kw-recoverable-charges",
  "kw-recoverable-charges-deleted-ids",
  "kw-employee-leaves",
  "kw-employee-leaves-deleted-ids",
];

const status = {};
function pass(id, detail = "") {
  status[id] = { result: "PASS", detail };
  console.log(`✓ ${id}${detail ? ` — ${detail}` : ""}`);
}
function fail(id, detail = "") {
  status[id] = { result: "FAIL", detail };
  console.error(`✗ ${id}${detail ? ` — ${detail}` : ""}`);
}

function dirSizeBytes(dir) {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) total += dirSizeBytes(p);
    else total += st.size;
  }
  return total;
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function allKvKeys() {
  const today = new Date().toISOString().slice(0, 10);
  const keys = [...new Set([...fullBackupKvKeys(today), ...EXTRA_KV_KEYS])];
  return keys;
}

async function listStorageRecursive(config, prefix = "", acc = []) {
  if (!config.serviceRole) throw new Error("Brak SUPABASE_SERVICE_ROLE_KEY");
  const url = `https://${config.projectId}.supabase.co/storage/v1/object/list/${BUCKET}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.serviceRole}`,
      apikey: config.serviceRole,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } }),
  });
  if (!res.ok) throw new Error(`storage list ${res.status}: ${await res.text()}`);
  const items = await res.json();
  for (const item of items) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id == null) {
      await listStorageRecursive(config, path, acc);
    } else {
      acc.push({
        path,
        id: item.id,
        updated_at: item.updated_at,
        metadata: item.metadata,
      });
    }
  }
  return acc;
}

async function dumpKvTable(config) {
  if (!config.serviceRole) throw new Error("Brak SUPABASE_SERVICE_ROLE_KEY");
  const url = `https://${config.projectId}.supabase.co/rest/v1/kv_store_0afb8820?select=key,value`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.serviceRole}`,
      apikey: config.serviceRole,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`kv_store REST ${res.status}: ${await res.text()}`);
  return res.json();
}

function copyDocs() {
  const docsDir = join(BACKUP_ROOT, "docs");
  mkdirSync(docsDir, { recursive: true });
  const files = [
    "CURRENT-TASK.md",
    "CHANGELOG.md",
    join("docs", "PROJECT-HANDOFF-FINAL-20.5Z.md"),
    join("docs", "ARCHITECTURE.md"),
  ];
  for (const rel of files) {
    const src = join(projectRoot, rel);
    const base = rel.split(/[/\\]/).pop() || rel;
    copyFileSync(src, join(docsDir, base));
  }
}

console.log(`=== WGDOM PRE-FEATURE BACKUP ${VERSION} ===\n`);
console.log("Target:", BACKUP_ROOT);

mkdirSync(join(BACKUP_ROOT, "repo"), { recursive: true });
mkdirSync(join(BACKUP_ROOT, "database"), { recursive: true });
mkdirSync(join(BACKUP_ROOT, "storage"), { recursive: true });
mkdirSync(join(BACKUP_ROOT, "docs"), { recursive: true });

const config = getSupabaseConfig();
const manifest = {
  version: VERSION,
  commit: COMMIT,
  deploy: DEPLOY,
  tag: TAG,
  exportedAt: new Date().toISOString(),
  backupRoot: BACKUP_ROOT,
  projectId: config.projectId,
  components: {},
  artifactSizes: {},
};

// 1. KV application data
try {
  const keys = allKvKeys();
  const kv = await fetchKvBackup(keys, config);
  const kvPath = join(BACKUP_ROOT, "database", "kv-data.json");
  writeFileSync(kvPath, JSON.stringify(kv, null, 2), "utf8");
  const summary = kvSummary(kv);
  writeFileSync(
    join(BACKUP_ROOT, "database", "kv-summary.json"),
    JSON.stringify({ keys: keys.length, ...summary }, null, 2),
    "utf8",
  );
  pass("kv_batch_get", `keys=${keys.length} jobs=${summary.jobs}`);
  manifest.components.kv_batch_get = "PASS";
} catch (e) {
  fail("kv_batch_get", e.message);
  manifest.components.kv_batch_get = `FAIL: ${e.message}`;
}

// 2. Database — kv_store table via REST
try {
  const rows = await dumpKvTable(config);
  writeFileSync(
    join(BACKUP_ROOT, "database", "kv_store_table_dump.json"),
    JSON.stringify(rows, null, 2),
    "utf8",
  );
  pass("database_kv_store", `rows=${rows.length}`);
  manifest.components.database_kv_store = "PASS";
} catch (e) {
  fail("database_kv_store", e.message);
  manifest.components.database_kv_store = `FAIL: ${e.message}`;
}

// 3. Database schema snapshot
try {
  cpSync(join(projectRoot, "supabase", "migrations"), join(BACKUP_ROOT, "database", "migrations"), {
    recursive: true,
  });
  copyFileSync(
    join(projectRoot, "supabase", "config.toml"),
    join(BACKUP_ROOT, "database", "config.toml"),
  );
  pass("database_schema", "migrations + config.toml");
  manifest.components.database_schema = "PASS";
} catch (e) {
  fail("database_schema", e.message);
  manifest.components.database_schema = `FAIL: ${e.message}`;
}

// 4. Edge functions snapshot
try {
  cpSync(
    join(projectRoot, "supabase", "functions"),
    join(BACKUP_ROOT, "database", "edge-functions"),
    { recursive: true },
  );
  writeFileSync(
    join(BACKUP_ROOT, "database", "edge-functions-manifest.json"),
    JSON.stringify(
      {
        slug: config.slug,
        entrypoint: "make-server-0afb8820/index.tsx",
        commit: COMMIT,
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );
  pass("edge_functions", config.slug);
  manifest.components.edge_functions = "PASS";
} catch (e) {
  fail("edge_functions", e.message);
  manifest.components.edge_functions = `FAIL: ${e.message}`;
}

// 5. Storage manifest
try {
  const objects = await listStorageRecursive(config, "");
  writeFileSync(
    join(BACKUP_ROOT, "storage", "storage-manifest.json"),
    JSON.stringify(
      {
        bucket: BUCKET,
        objectCount: objects.length,
        exportedAt: new Date().toISOString(),
        objects,
      },
      null,
      2,
    ),
    "utf8",
  );
  pass("storage_manifest", `objects=${objects.length}`);
  manifest.components.storage_manifest = "PASS";
  manifest.components.storage_binary_export = "SKIP — manifest only (no full binary download)";
} catch (e) {
  fail("storage_manifest", e.message);
  manifest.components.storage_manifest = `FAIL: ${e.message}`;
}

// 6. Docs
try {
  copyDocs();
  pass("docs_snapshot");
  manifest.components.docs_snapshot = "PASS";
} catch (e) {
  fail("docs_snapshot", e.message);
  manifest.components.docs_snapshot = `FAIL: ${e.message}`;
}

// 7. Git bundle + archive
try {
  const bundlePath = join(BACKUP_ROOT, "repo", `wgdom-${COMMIT}.bundle`);
  execSync(`git bundle create "${bundlePath}" main`, { cwd: projectRoot, stdio: "pipe" });
  const archivePath = join(BACKUP_ROOT, "repo", `wgdom-${COMMIT}-archive.zip`);
  execSync(`git archive --format=zip --output "${archivePath}" ${COMMIT}`, {
    cwd: projectRoot,
    stdio: "pipe",
  });
  writeFileSync(
    join(BACKUP_ROOT, "repo", "git-meta.json"),
    JSON.stringify(
      {
        commit: COMMIT,
        tag: TAG,
        branch: "main",
        bundle: `wgdom-${COMMIT}.bundle`,
        archive: `wgdom-${COMMIT}-archive.zip`,
      },
      null,
      2,
    ),
    "utf8",
  );
  pass("git_bundle", bundlePath);
  pass("git_archive", archivePath);
  manifest.components.git_bundle = "PASS";
  manifest.components.git_archive = "PASS";
} catch (e) {
  fail("git_artifacts", e.message);
  manifest.components.git_bundle = `FAIL: ${e.message}`;
}

// Artifact sizes
for (const sub of ["repo", "database", "storage", "docs"]) {
  const p = join(BACKUP_ROOT, sub);
  if (existsSync(p)) manifest.artifactSizes[sub] = fmtBytes(dirSizeBytes(p));
}
manifest.artifactSizes.total = fmtBytes(dirSizeBytes(BACKUP_ROOT));

writeFileSync(join(BACKUP_ROOT, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

const fails = Object.values(status).filter((s) => s.result === "FAIL").length;
console.log(`\n=== Backup folder ready — ${fails === 0 ? "ALL PASS" : `${fails} FAIL`} ===`);
console.log("Total size:", manifest.artifactSizes.total);
