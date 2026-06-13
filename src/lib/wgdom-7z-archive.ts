/** P2-H.3 — rozpakowywanie 7Z w przeglądarce (7z-wasm, LGPL). */

import { scoreTenderFilename, type ZipListedFile } from "@/lib/tenders-bzp-filename";

const extractCache = new Map<string, Map<string, Uint8Array>>();
let extractSeq = 0;

function bytesFingerprint(bytes: Uint8Array): string {
  const n = Math.min(24, bytes.length);
  let h = bytes.byteLength;
  for (let i = 0; i < n; i += 1) h = (Math.imul(h, 31) + bytes[i]) | 0;
  return `7z-${h}-${bytes.byteLength}`;
}

function parseSltFilePaths(lines: string[]): string[] {
  const paths: string[] = [];
  for (const line of lines) {
    const m = line.match(/^Path = (.+)$/);
    if (!m) continue;
    const p = m[1].trim();
    if (!p || /\.7z$/i.test(p)) continue;
    if (p.endsWith("/")) continue;
    paths.push(p.replace(/^\//, ""));
  }
  return paths;
}

function shouldSkip7zPath(relativePath: string): boolean {
  if (/^__MACOSX|\/.DS_Store$/i.test(relativePath)) return true;
  return false;
}

async function loadSevenZip(print?: (line: string) => void) {
  return import("7z-wasm").then((m) =>
    m.default({
      noInitialRun: true,
      ...(print
        ? {
            print: (s) => {
              const t = s.trim();
              if (t && !/^\d+M Scan/.test(t)) print(t);
            },
          }
        : {}),
    }),
  );
}

export async function list7zFiles(bytes: Uint8Array): Promise<ZipListedFile[]> {
  const lines: string[] = [];
  const sz = await loadSevenZip((t) => lines.push(t));
  const archivePath = `/wg7z-list-${extractSeq}.7z`;
  extractSeq += 1;
  sz.FS.writeFile(archivePath, bytes);
  sz.callMain(["l", "-slt", archivePath]);

  const out: ZipListedFile[] = [];
  for (const path of parseSltFilePaths(lines)) {
    if (shouldSkip7zPath(path)) continue;
    const filename = path.split("/").pop() || path;
    const score = scoreTenderFilename(filename);
    if (score >= 6) {
      out.push({ path, filename, score });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

async function extractAll7zFiles(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const fp = bytesFingerprint(bytes);
  const cached = extractCache.get(fp);
  if (cached) return cached;

  const sz = await loadSevenZip();
  const work = `/ex7z_${extractSeq}`;
  extractSeq += 1;
  sz.FS.mkdir(work);
  sz.FS.writeFile(`${work}/archive.7z`, bytes);
  sz.FS.chdir(work);
  sz.callMain(["x", "archive.7z", "-y"]);

  const map = new Map<string, Uint8Array>();

  function walk(dir: string, prefix: string): void {
    for (const name of sz.FS.readdir(dir)) {
      if (name === "." || name === ".." || name === "archive.7z") continue;
      const abs = `${dir}/${name}`;
      const rel = prefix ? `${prefix}/${name}` : name;
      let stat;
      try {
        stat = sz.FS.stat(abs);
      } catch {
        continue;
      }
      if (sz.FS.isDir(stat.mode)) {
        walk(abs, rel);
        continue;
      }
      if (shouldSkip7zPath(rel)) continue;
      map.set(rel, new Uint8Array(sz.FS.readFile(abs)));
    }
  }

  walk(work, "");
  extractCache.set(fp, map);
  return map;
}

export async function read7zEntry(bytes: Uint8Array, innerPath: string): Promise<Uint8Array | null> {
  const map = await extractAll7zFiles(bytes);
  const norm = innerPath.replace(/\\/g, "/").replace(/^\//, "");
  if (map.has(norm)) return map.get(norm)!;
  for (const [k, v] of map) {
    if (k === norm || k.endsWith(`/${norm}`) || k.split("/").pop() === norm.split("/").pop()) {
      return v;
    }
  }
  return null;
}

export async function pickBestFrom7zBytes(
  archiveBytes: Uint8Array,
  outerName: string,
): Promise<{ bytes: Uint8Array; filename: string; innerPath: string } | null> {
  const entries = await list7zFiles(archiveBytes);
  if (!entries.length) return null;
  const best = entries[0];
  const inner = await read7zEntry(archiveBytes, best.path);
  if (!inner) return null;
  return {
    bytes: inner,
    filename: `${outerName} → ${best.filename}`,
    innerPath: best.path,
  };
}
