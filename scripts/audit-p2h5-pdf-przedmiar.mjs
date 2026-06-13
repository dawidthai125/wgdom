/**
 * READ ONLY — P2-H.5 audit: PDF przedmiar vs ATH/XLS w pipeline
 * npx vite-node scripts/audit-p2h5-pdf-przedmiar.mjs
 */
import { loadEnv } from "vite";
import { classifyCostDocumentType } from "../src/lib/tender-cost-discovery.ts";
import { classifyDocumentRole } from "../src/lib/tender-document-role.ts";
import { scoreTenderFilename } from "../src/lib/tenders-bzp-filename.ts";
import {
  STRATEGIC_CLIENT_FILTERS,
  matchesStrategicClientFilter,
} from "../src/lib/tenders-strategic-client-filters.ts";

const env = loadEnv("", process.cwd(), "");
const BASE = `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-0afb8820`;
const ANON = env.VITE_SUPABASE_ANON_KEY;

const EXTRA_CLIENT_PATTERNS = [
  { id: "KATY", re: /kąty\s+wrocławskie|umig\s+kąty/i },
];

const PR_PDF_RE = /_pr\.pdf$/i;
const PRZEDMIAR_PDF_RE = /przedmiar|obmiar|kosztorys|roboty/i;

function classifyDoc(filename) {
  const n = filename.toLowerCase();
  const base = n.split(" → ").pop() ?? n;
  const ext = base.match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  return {
    isAth: /\.(ath|nor|xml)$/i.test(base),
    isXls: /\.xlsx?$/i.test(base),
    isPdf: ext === "pdf",
    isPrPdf: PR_PDF_RE.test(base),
    isPrzedmiarPdf: ext === "pdf" && PRZEDMIAR_PDF_RE.test(base),
    isGenericPdf: ext === "pdf" && !PRZEDMIAR_PDF_RE.test(base),
    role: classifyDocumentRole(filename),
    score: scoreTenderFilename(filename),
    costType: classifyCostDocumentType(filename).type,
  };
}

function bucketItem(item) {
  for (const f of STRATEGIC_CLIENT_FILTERS) {
    if (matchesStrategicClientFilter(item, f.id)) return f.shortLabel;
  }
  const hay = `${item.client ?? ""} ${item.organizationName ?? ""} ${item.title ?? ""}`;
  for (const c of EXTRA_CLIENT_PATTERNS) {
    if (c.re.test(hay)) return c.id;
  }
  return "OTHER";
}

const res = await fetch(`${BASE}/batch-get`, {
  method: "POST",
  headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, "Content-Type": "application/json" },
  body: JSON.stringify({ keys: ["kw-tenders-pipeline"] }),
});
const j = await res.json();
if (!res.ok) {
  console.error("batch-get failed:", res.status, j);
  process.exit(1);
}
const { values } = j;
const raw = values?.[0];
const items = Array.isArray(raw) ? raw : (typeof raw === "string" ? JSON.parse(raw || "[]") : []);
console.log("=== P2-H.5 AUDIT READ ONLY — PDF przedmiar intelligence ===\n");
console.log("Pipeline items total:", items.length);

const BUCKET_IDS = [
  ...STRATEGIC_CLIENT_FILTERS.map((f) => f.shortLabel),
  ...EXTRA_CLIENT_PATTERNS.map((x) => x.id),
  "OTHER",
  "ALL",
];

const stats = {};
for (const c of BUCKET_IDS) {
  stats[c] = {
    tenders: 0,
    withDocs: 0,
    hasAth: 0,
    hasXls: 0,
    hasPrPdf: 0,
    hasPrzedmiarPdf: 0,
    pdfOnlyCost: 0,
    noCost: 0,
    kosztorysOk: 0,
    filenameHits: new Map(),
  };
}

const examples = { pdfOnly: [], prPdf: [], katy: null };

for (const item of items) {
  const bucket = bucketItem(item);
  for (const key of [bucket, "ALL"]) {
    const s = stats[key];
    s.tenders += 1;
    const docs = item.bzpDocuments ?? [];
    if (!docs.length) continue;
    s.withDocs += 1;

    let hasAth = false;
    let hasXls = false;
    let hasPrPdf = false;
    let hasPrzedmiarPdf = false;
    let hasCostFile = false;

    for (const d of docs) {
      const fn = d.filename ?? "";
      const c = classifyDoc(fn);
      if (c.isAth) { hasAth = true; hasCostFile = true; }
      if (c.isXls) { hasXls = true; hasCostFile = true; }
      if (c.isPrPdf) hasPrPdf = true;
      if (c.isPrzedmiarPdf) hasPrzedmiarPdf = true;

      const norm = fn.toLowerCase().replace(/[^a-z0-9._-]+/g, "_").slice(0, 80);
      if (c.isPrPdf || c.isPrzedmiarPdf) {
        s.filenameHits.set(norm, (s.filenameHits.get(norm) ?? 0) + 1);
      }
    }

    if (hasAth) s.hasAth += 1;
    if (hasXls) s.hasXls += 1;
    if (hasPrPdf) s.hasPrPdf += 1;
    if (hasPrzedmiarPdf) s.hasPrzedmiarPdf += 1;
    if (!hasCostFile && hasPrzedmiarPdf) s.pdfOnlyCost += 1;
    if (!hasCostFile && !hasPrzedmiarPdf) s.noCost += 1;
    if (item.tenderDossier?.kosztorys?.ok || item.tenderDossier?.scanSummary?.kosztorysFound) {
      s.kosztorysOk += 1;
    }

    if (key === bucket && !hasCostFile && hasPrzedmiarPdf && examples.pdfOnly.length < 8) {
      examples.pdfOnly.push({
        id: item.id,
        title: (item.title ?? "").slice(0, 70),
        files: docs.map((d) => d.filename).filter((f) => /\.pdf$/i.test(f) && PRZEDMIAR_PDF_RE.test(f)),
      });
    }
    if (key === bucket && hasPrPdf && examples.prPdf.length < 8) {
      examples.prPdf.push({ id: item.id, title: item.title, files: docs.map((d) => d.filename).filter((f) => PR_PDF_RE.test(f)) });
    }
    if (bucket === "KATY" && !examples.katy) {
      examples.katy = {
        id: item.id,
        title: item.title,
        docs: docs.map((d) => ({ filename: d.filename, ...classifyDoc(d.filename) })),
        scan: item.tenderDossier?.scanSummary ?? null,
      };
    }
  }
}

function pct(n, d) {
  return d ? `${Math.round((n / d) * 100)}%` : "—";
}

console.log("\n--- Per client (tenders with bzpDocuments) ---\n");
for (const id of BUCKET_IDS.filter((x) => x !== "OTHER")) {
  const s = stats[id];
  if (id !== "ALL" && s.withDocs === 0) continue;
  console.log(`[${id}] tenders=${s.tenders} withDocs=${s.withDocs}`);
  console.log(`  ATH/NOR/XML: ${s.hasAth} (${pct(s.hasAth, s.withDocs)})`);
  console.log(`  XLS/XLSX:    ${s.hasXls} (${pct(s.hasXls, s.withDocs)})`);
  console.log(`  *_PR.pdf:    ${s.hasPrPdf} (${pct(s.hasPrPdf, s.withDocs)})`);
  console.log(`  przedmiar PDF (name): ${s.hasPrzedmiarPdf} (${pct(s.hasPrzedmiarPdf, s.withDocs)})`);
  console.log(`  PDF-only cost (no ATH/XLS, has przedmiar PDF): ${s.pdfOnlyCost} (${pct(s.pdfOnlyCost, s.withDocs)})`);
  console.log(`  no cost signal: ${s.noCost} (${pct(s.noCost, s.withDocs)})`);
  console.log(`  kosztorysOk in dossier: ${s.kosztorysOk} (${pct(s.kosztorysOk, s.withDocs)})`);
  const topNames = [...s.filenameHits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (topNames.length) {
    console.log("  top przedmiar-like filenames:");
    for (const [name, cnt] of topNames) console.log(`    ${cnt}x ${name}`);
  }
  console.log("");
}

console.log("--- Examples: PDF-only cost gap ---");
for (const ex of examples.pdfOnly) {
  console.log(`  ${ex.id?.slice(0, 40)} | ${ex.title}`);
  for (const f of ex.files) console.log(`    - ${f}`);
}

console.log("\n--- Examples: *_PR.pdf ---");
for (const ex of examples.prPdf) {
  console.log(`  ${ex.title}`);
  for (const f of ex.files) console.log(`    - ${f}`);
}

if (examples.katy) {
  console.log("\n--- Kąty reference ---");
  console.log(JSON.stringify(examples.katy, null, 2));
}
