/**
 * TP192C — parallel document bytes prefetch.
 * npx vite-node scripts/test-tender-parallel-bytes-tp192c.mjs
 */
import {
  DOSSIER_DOCUMENT_BYTES_CONCURRENCY,
  filterBytesPrefetchTodo,
  prefetchDocumentBytesWithConcurrency,
} from "../src/lib/tender-document-bytes-prefetch.ts";
import {
  clearTenderDocumentBytesCache,
  setTenderDocumentBytesCached,
  tenderDocumentBytesCacheKey,
} from "../src/lib/tender-document-bytes-cache.ts";

const assert = (name, cond) => {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`  ✓ ${name}`);
};

const T = "t-bench";
const docs = [{ index: 1, downloadUrl: "https://pz/a.pdf", filename: "a.pdf" }];

console.log("TP192C parallel bytes prefetch\n");

// TP192C-1 — 10 dokumentów → 10 wyników
let fetchCount = 0;
const specs10 = Array.from({ length: 10 }, (_, i) => ({
  documentIndex: i + 1,
  downloadUrl: `https://pz/doc-${i}.pdf`,
}));
const results10 = [];
await prefetchDocumentBytesWithConcurrency(specs10, 4, async (spec, index) => {
  fetchCount += 1;
  results10[index] = { index: spec.documentIndex, ok: true };
});
assert("TP192C-1 fetch count 10", fetchCount === 10);
assert("TP192C-1 all results", results10.length === 10 && results10.every((r) => r?.ok));

// TP192C-2 — jeden fetch rzuca wyjątek
fetchCount = 0;
const specsFail = specs10.map((s) => ({ ...s }));
const resultsFail = [];
await prefetchDocumentBytesWithConcurrency(specsFail, 4, async (spec, index) => {
  if (index === 3) throw new Error("network");
  fetchCount += 1;
  resultsFail[index] = spec.documentIndex;
});
assert("TP192C-2 fail does not block others", fetchCount === 9);
assert("TP192C-2 missing slot 4", resultsFail[3] === undefined && resultsFail[0] === 1);

// TP192C-3 — kolejność stabilna (indeksy rosną zgodnie z wejściem)
const order = [];
await prefetchDocumentBytesWithConcurrency(
  specs10,
  4,
  async (spec, index) => {
    order.push({ index, doc: spec.documentIndex });
  },
);
assert(
  "TP192C-3 stable input order in callback index",
  order.every((o, i) => o.index === i && o.doc === i + 1),
);

// TP192C-4 — cache hit → 0 dodatkowych fetch
clearTenderDocumentBytesCache();
const cacheKey = tenderDocumentBytesCacheKey(T, 5, "https://pz/cached.pdf", "");
setTenderDocumentBytesCached(cacheKey, {
  base64: "YWJj",
  filename: "cached.pdf",
  contentType: "application/pdf",
});
const todo = filterBytesPrefetchTodo(
  T,
  [{ index: 5, downloadUrl: "https://pz/cached.pdf", filename: "cached.pdf" }],
  [{ documentIndex: 5, downloadUrl: "https://pz/cached.pdf" }],
);
assert("TP192C-4 cached spec skipped", todo.length === 0);
fetchCount = 0;
await prefetchDocumentBytesWithConcurrency(todo, 4, async () => {
  fetchCount += 1;
});
assert("TP192C-4 zero fetches when cache warm", fetchCount === 0);

// concurrency cap
let inFlight = 0;
let maxInFlight = 0;
await prefetchDocumentBytesWithConcurrency(
  Array.from({ length: 12 }, (_, i) => ({ documentIndex: i })),
  DOSSIER_DOCUMENT_BYTES_CONCURRENCY,
  async () => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 20));
    inFlight -= 1;
  },
);
assert(
  `TP192C concurrency <= ${DOSSIER_DOCUMENT_BYTES_CONCURRENCY}`,
  maxInFlight <= DOSSIER_DOCUMENT_BYTES_CONCURRENCY,
);
assert("TP192C concurrency > 1", maxInFlight > 1);

console.log("\nTP192C parallel bytes prefetch: ALL PASS");
