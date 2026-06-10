/**
 * Pełny eksport binariów Supabase Storage — pre-feature backup 2.50.64
 * node scripts/run-storage-full-backup-2.50.64.mjs [--out <dir>]
 */
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { getSupabaseConfig, projectRoot } from "./backup-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const VERSION = "2.50.64";
const BUCKET = "make-0afb8820-photos";
const BACKUP_ROOT = resolve(projectRoot, "..", `WGDOM-BACKUP-${VERSION}`);
const DEFAULT_OUT = join(BACKUP_ROOT, "storage-full");
const ZIP_OUT = resolve(projectRoot, "..", `WGDOM-BACKUP-${VERSION}-storage-full.zip`);

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const outDir = resolve(arg("--out", DEFAULT_OUT));
const config = getSupabaseConfig();

function fmtBytes(n) {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

async function listStorageRecursive(prefix = "", acc = []) {
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
      await listStorageRecursive(path, acc);
    } else {
      acc.push({
        path,
        id: item.id,
        updated_at: item.updated_at,
        metadata: item.metadata,
        size: item.metadata?.size ?? item.metadata?.contentLength ?? null,
      });
    }
  }
  return acc;
}

async function downloadObject(objectPath) {
  const dest = join(outDir, objectPath.replace(/\//g, "\\"));
  mkdirSync(dirname(dest), { recursive: true });
  const url = `https://${config.projectId}.supabase.co/storage/v1/object/public/${BUCKET}/${objectPath}`;
  const res = await fetch(url);
  if (!res.ok) {
    const authUrl = `https://${config.projectId}.supabase.co/storage/v1/object/${BUCKET}/${objectPath}`;
    const res2 = await fetch(authUrl, {
      headers: {
        Authorization: `Bearer ${config.serviceRole}`,
        apikey: config.serviceRole,
      },
    });
    if (!res2.ok) return { ok: false, path: objectPath, error: `${res.status}/${res2.status}` };
    const buf = Buffer.from(await res2.arrayBuffer());
    writeFileSync(dest, buf);
    return { ok: true, path: objectPath, bytes: buf.length };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return { ok: true, path: objectPath, bytes: buf.length };
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

console.log("=== WGDOM Storage Full Backup ===");
console.log("Bucket:", BUCKET);
console.log("Output:", outDir);

if (!config.serviceRole) {
  console.error("STORAGE BACKUP FAIL — brak SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

console.log("\n1/3 AUDIT — listowanie bucketów…");
const objects = await listStorageRecursive();
const metaTotal = objects.reduce((s, o) => s + (Number(o.size) || 0), 0);

const audit = {
  buckets: [{ name: BUCKET, objectCount: objects.length, metadataBytes: metaTotal }],
  bucketCount: 1,
  objectCount: objects.length,
  metadataTotalBytes: metaTotal,
  exportFeasible: true,
  note: "Jeden bucket w projekcie (PHOTOS_BUCKET); public URL + service_role fallback",
};

console.log("   Buckety:", audit.bucketCount);
console.log("   Obiekty:", audit.objectCount);
console.log("   Rozmiar (metadata):", fmtBytes(metaTotal));

writeFileSync(join(outDir, "..", "storage-audit-2.50.64.json"), JSON.stringify(audit, null, 2), "utf8");

console.log("\n2/3 Pobieranie binariów…");
const manifest = { ok: [], failed: [], startedAt: new Date().toISOString() };
let downloadedBytes = 0;

for (let i = 0; i < objects.length; i++) {
  const obj = objects[i];
  const result = await downloadObject(obj.path);
  if (result.ok) {
    downloadedBytes += result.bytes;
    manifest.ok.push({ path: result.path, bytes: result.bytes });
  } else {
    manifest.failed.push({ path: result.path, error: result.error });
  }
  if ((i + 1) % 10 === 0 || i + 1 === objects.length) {
    process.stdout.write(
      `\r   ${i + 1}/${objects.length} OK=${manifest.ok.length} FAIL=${manifest.failed.length} (${fmtBytes(downloadedBytes)})`
    );
  }
}
console.log("");

manifest.finishedAt = new Date().toISOString();
manifest.downloadedBytes = downloadedBytes;
manifest.failedCount = manifest.failed.length;
writeFileSync(join(outDir, "download-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

const onDiskBytes = dirSizeBytes(outDir);

console.log("\n3/3 Archiwum ZIP…");
let zipBytes = 0;
try {
  if (existsSync(ZIP_OUT)) {
    execSync(`powershell -NoProfile -Command "Remove-Item -LiteralPath '${ZIP_OUT.replace(/'/g, "''")}' -Force"`, {
      stdio: "inherit",
    });
  }
  const psZip = `Compress-Archive -Path '${outDir.replace(/'/g, "''")}\\*' -DestinationPath '${ZIP_OUT.replace(/'/g, "''")}' -Force`;
  execSync(`powershell -NoProfile -Command "${psZip}"`, { stdio: "inherit" });
  zipBytes = statSync(ZIP_OUT).size;
} catch (e) {
  console.error("ZIP FAIL:", e.message);
}

const verdict =
  manifest.failed.length === 0 && zipBytes > 0 ? "STORAGE BACKUP PASS" : "STORAGE BACKUP FAIL";

const report = {
  verdict,
  bucketCount: audit.bucketCount,
  objectCount: audit.objectCount,
  metadataBytes: metaTotal,
  downloadedBytes,
  onDiskBytes,
  failed: manifest.failed.length,
  paths: {
    storageFull: outDir,
    zip: ZIP_OUT,
    audit: join(BACKUP_ROOT, "storage-audit-2.50.64.json"),
    manifest: join(outDir, "download-manifest.json"),
  },
  zipBytes,
};

console.log("\n--- RAPORT ---");
console.log(JSON.stringify(report, null, 2));
console.log(`\n${verdict}`);

process.exit(verdict === "STORAGE BACKUP PASS" ? 0 : 1);
