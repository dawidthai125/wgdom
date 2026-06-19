/**
 * TP192B — parallel metadata probe (mapWithConcurrency + PZ discover assembly).
 * npx vite-node scripts/test-tender-parallel-probe-tp192b.mjs
 */
import {
  mapWithConcurrency,
  PZ_DOCUMENT_PROBE_CONCURRENCY,
} from "../src/lib/tender-platform-adapters.ts";

const assert = (name, cond) => {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`  ✓ ${name}`);
};

/** Lustrzuje discoverPlatformaZakupowaDocuments — probe równolegle, składanie sekwencyjnie. */
async function assemblePzDocsFromProbes(
  refs,
  probeFn,
  concurrency = PZ_DOCUMENT_PROBE_CONCURRENCY,
) {
  const probed = await mapWithConcurrency(refs, concurrency, async (ref, i) => {
    try {
      const meta = await probeFn(ref, i);
      return { ref, meta };
    } catch {
      return { ref, meta: null };
    }
  });

  const docs = [];
  const seen = new Set();
  let idx = 0;
  for (const { ref, meta } of probed) {
    if (!meta) continue;
    const key = `${meta.filename}|${ref.downloadUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    idx += 1;
    docs.push({
      index: idx,
      downloadUrl: ref.downloadUrl,
      filename: meta.filename,
      sourceOrder: ref.order,
    });
  }
  return docs;
}

console.log("TP192B parallel probe\n");

// TP192B-1 — 17 dokumentów → 17 wyników
const refs17 = Array.from({ length: 17 }, (_, i) => ({
  order: i,
  downloadUrl: `https://platformazakupowa.pl/file/get_new/doc${i}.pdf`,
  filename: `doc-${i}.pdf`,
}));
const docs17 = await assemblePzDocsFromProbes(refs17, async (ref) => ({
  filename: ref.filename,
  contentType: "application/pdf",
}));
assert("TP192B-1 count 17", docs17.length === 17);
assert("TP192B-1 indices 1..17", docs17.every((d, i) => d.index === i + 1));

// TP192B-2 — jedno probe rzuca wyjątek
const refsFail = refs17.map((r) => ({ ...r }));
let failCalls = 0;
const docsFail = await assemblePzDocsFromProbes(refsFail, async (ref, i) => {
  if (i === 7) {
    failCalls += 1;
    throw new Error("probe network error");
  }
  return { filename: ref.filename, contentType: "application/pdf" };
});
assert("TP192B-2 fail invoked", failCalls === 1);
assert("TP192B-2 remaining 16 docs", docsFail.length === 16);
assert("TP192B-2 missing index 8 slot", !docsFail.some((d) => d.sourceOrder === 7));

// TP192B-3 — kolejność stabilna (sourceOrder rosnąco jak attachments)
const orderKeys = docs17.map((d) => d.sourceOrder);
assert(
  "TP192B-3 stable attachment order",
  orderKeys.every((v, i) => i === 0 || v > orderKeys[i - 1]),
);

// concurrency cap — max równoległych probe
let inFlight = 0;
let maxInFlight = 0;
await assemblePzDocsFromProbes(
  Array.from({ length: 12 }, (_, i) => ({ order: i, downloadUrl: `u${i}`, filename: `f${i}` })),
  async () => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 15));
    inFlight -= 1;
    return { filename: "x.pdf", contentType: "application/pdf" };
  },
);
assert(
  `TP192B concurrency <= ${PZ_DOCUMENT_PROBE_CONCURRENCY}`,
  maxInFlight <= PZ_DOCUMENT_PROBE_CONCURRENCY,
);
assert("TP192B concurrency > 1", maxInFlight > 1);

console.log("\nTP192B parallel probe: ALL PASS");
