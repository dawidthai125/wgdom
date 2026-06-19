/**
 * TP194A live verify — symulacja discovery z prod Content-Disposition.
 * npx vite-node scripts/test-tender-filename-encoding-tp194a-live.mjs
 */
import {
  repairUtf8Mojibake,
  resolvePlatformazakupowaFilename,
  hasUtf8Mojibake,
  hasPolishChars,
} from "../src/lib/tender-filename-encoding.ts";

const TENDER_ID = "ocds-148610-17174c71-c6f1-45d6-b6b2-dab044dfb419";
const NOTICE = "2026/BZP 00268513/01";
const TX = "1319989";

async function getAnonKey() {
  const html = await fetch("https://www.wgdom.fun").then((r) => r.text());
  for (const m of html.matchAll(/assets\/[^"']+\.js/g)) {
    const js = await fetch(`https://www.wgdom.fun/${m[0]}`).then((r) => r.text());
    const jwt = js.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    if (jwt) return jwt[0];
  }
  throw new Error("no anon");
}

async function fetchPzHtml() {
  let cookie = "";
  let pageUrl = `https://platformazakupowa.pl/transakcja/${TX}`;
  for (let i = 0; i < 8; i++) {
    const res = await fetch(pageUrl, {
      headers: {
        Accept: "text/html",
        "User-Agent": "WGDOM/2.63.0 platformazakupowa",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      redirect: "manual",
    });
    const raw = res.headers.get("set-cookie");
    if (raw) {
      cookie = raw
        .split(/,(?=[^;]+?=)/)
        .map((c) => c.split(";")[0].trim())
        .join("; ");
    }
    if (res.status >= 200 && res.status < 300) {
      const html = await res.text();
      if (/\/file\/get_new\//i.test(html)) return { html, pageUrl };
    }
    const loc = res.headers.get("location");
    if (!loc) break;
    pageUrl = loc.startsWith("http") ? loc : `https://platformazakupowa.pl${loc}`;
  }
  return null;
}

function parseHtmlAttachments(html, pageUrl) {
  const out = new Map();
  const add = (href, label) => {
    let downloadUrl;
    try {
      downloadUrl = href.startsWith("//") ? `https:${href}` : new URL(href, pageUrl).href;
    } catch {
      return;
    }
    const cleanLabel = label.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const hashName = decodeURIComponent(downloadUrl.split("/").pop()?.split("?")[0] || "dokument");
    const filename =
      cleanLabel && /\.(pdf|docx?|xlsx?|zip|7z|ath|nor)$/i.test(cleanLabel)
        ? cleanLabel.slice(0, 200)
        : hashName;
    out.set(downloadUrl, { downloadUrl, filename, label: cleanLabel });
  };
  for (const m of html.matchAll(/<a[^>]+href=["']([^"']*\/file\/get_new\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    add(m[1], m[2]);
  }
  return [...out.values()];
}

const ANON = await getAnonKey();
const BASE = "https://bdpygdvfgbggermvqtys.supabase.co/functions/v1/make-server-0afb8820";
const apiRes = await fetch(
  `${BASE}/tenders-bzp-documents?${new URLSearchParams({ tenderId: TENDER_ID, noticeNumber: NOTICE })}`,
  { headers: { Authorization: `Bearer ${ANON}`, apikey: ANON } },
);
const apiDocs = (await apiRes.json()).documents || [];

const pz = await fetchPzHtml();
const htmlByUrl = new Map();
if (pz) {
  for (const ref of parseHtmlAttachments(pz.html, pz.pageUrl)) {
    htmlByUrl.set(ref.downloadUrl, ref);
  }
}

let repaired = 0;
let stillBroken = 0;
const samples = [];

for (const doc of apiDocs) {
  const ref = htmlByUrl.get(doc.downloadUrl);
  const head = await fetch(doc.downloadUrl, {
    headers: { "User-Agent": "WGDOM/2.63.0 platformazakupowa" },
  });
  const cd = head.headers.get("content-disposition");
  await head.body?.cancel?.();

  const fixed = resolvePlatformazakupowaFilename({
    contentDisposition: cd,
    htmlFilename: ref?.filename,
    htmlLabel: ref?.label,
    fallback: ref?.filename,
  });

  const wasBroken = hasUtf8Mojibake(doc.filename);
  const nowOk = hasPolishChars(fixed) && !hasUtf8Mojibake(fixed);
  if (wasBroken && nowOk) repaired += 1;
  if (hasUtf8Mojibake(fixed)) stillBroken += 1;

  if (samples.length < 6) {
    samples.push({
      index: doc.index,
      apiStored: doc.filename,
      tp194aFixed: fixed,
      hasZalacznik: fixed.includes("Załącznik"),
      hasOgłoszenie: fixed.includes("Ogłoszenie"),
      hasPozarowym: fixed.includes("pożarowym"),
      hasRobot: fixed.includes("robót"),
    });
  }
}

console.log(
  JSON.stringify(
    {
      documentCount: apiDocs.length,
      apiStillMojibake: apiDocs.filter((d) => hasUtf8Mojibake(d.filename)).length,
      tp194aWouldRepair: repaired,
      tp194aStillBroken: stillBroken,
      samples,
      pass:
        stillBroken === 0
        && repaired >= 14
        && samples.some((s) => s.hasZalacznik)
        && samples.some((s) => s.hasOgłoszenie || s.hasPozarowym),
    },
    null,
    2,
  ),
);
