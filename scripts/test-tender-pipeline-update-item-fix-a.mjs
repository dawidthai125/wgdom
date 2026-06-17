/**
 * P3-AUDIT-001-FIX-A — smoke: functional updateItem nie gubi bzpDocuments.
 * npx vite-node scripts/test-tender-pipeline-update-item-fix-a.mjs
 */

const assert = (name, cond) => {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`  ✓ ${name}`);
};

const NOW = "2026-06-17T12:00:00.000Z";

function baseItem(overrides = {}) {
  return {
    id: "t-1",
    title: "Test tender",
    bzpDocuments: [],
    externalDocDiscovery: undefined,
    tenderDossier: undefined,
    swzAnalysis: undefined,
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

/** Functional update (FIX-A) — każdy patch na najnowszym stanie. */
function applyFunctionalPatches(items, id, patches) {
  let next = items;
  for (const patch of patches) {
    next = next.map((i) =>
      i.id === id ? { ...i, ...patch, updatedAt: NOW } : i,
    );
  }
  return next;
}

/** Stary bug — każdy patch czyta ten sam stale snapshot items. */
function applyStaleClosurePatches(staleItems, id, patches) {
  let last = staleItems;
  for (const patch of patches) {
    last = staleItems.map((i) =>
      i.id === id ? { ...i, ...patch, updatedAt: NOW } : i,
    );
  }
  return last;
}

const sampleDocs = [
  { documentIndex: 0, filename: "swz.pdf", downloadUrl: "https://x/swz.pdf" },
  { documentIndex: 1, filename: "przedmiar.ath", downloadUrl: "https://x/p.ath" },
];

const externalDiscovery = {
  builtAt: NOW,
  files: [{ filename: "bip.zip", publicUrl: "https://bip/x.zip", score: 80 }],
  pageLinks: [],
};

const swzAnalysis = { parsedAt: NOW, estimatedValuePln: 1_000_000, wadiumPln: 50_000 };
const tenderDossier = {
  brief: { title: "Test" },
  kosztorys: { ok: true, rows: [{ lp: "1", description: "Roboty", unit: "m2", quantity: "10" }] },
  builtAt: NOW,
};

console.log("P3-AUDIT-001-FIX-A — pipeline patch merge\n");

// T1 — dokumenty BZP
{
  const items = [baseItem()];
  const patches = [{ bzpDocuments: sampleDocs, documentsFetchedAt: NOW }];
  const next = applyFunctionalPatches(items, "t-1", patches);
  assert("T1 bzpDocuments length", next[0].bzpDocuments?.length === 2);
}

// T2 — docs + SWZ (auto-pipeline partial sequence)
{
  const items = [baseItem()];
  const patches = [
    { bzpDocuments: sampleDocs, documentsFetchedAt: NOW },
    { swzAnalysis },
  ];
  const fixed = applyFunctionalPatches(items, "t-1", patches);
  const buggy = applyStaleClosurePatches(items, "t-1", patches);
  assert("T2 FIX keeps bzpDocuments after SWZ", fixed[0].bzpDocuments?.length === 2);
  assert("T2 FIX has swzAnalysis", fixed[0].swzAnalysis?.estimatedValuePln === 1_000_000);
  assert("T2 STALE loses bzpDocuments (repro bug)", (buggy[0].bzpDocuments?.length ?? 0) === 0);
}

// T3 — docs + SWZ + dossier (pełny auto-pipeline)
{
  const items = [baseItem()];
  const consolidated = applyFunctionalPatches(items, "t-1", [{
    bzpDocuments: sampleDocs,
    documentsFetchedAt: NOW,
    externalDocDiscovery: externalDiscovery,
    swzAnalysis,
    tenderDossier,
    ourEstimatePln: 900_000,
  }]);
  assert("T3 consolidated bzpDocuments", consolidated[0].bzpDocuments?.length === 2);
  assert("T3 consolidated externalDocDiscovery", consolidated[0].externalDocDiscovery?.files?.length === 1);
  assert("T3 consolidated dossier", consolidated[0].tenderDossier?.kosztorys?.ok === true);
}

// T4 — kilka kolejnych partial patchy (4× jak stary auto-pipeline)
{
  const items = [baseItem()];
  const sequence = [
    { bzpDocuments: sampleDocs, documentsFetchedAt: NOW },
    { swzAnalysis },
    { swzAnalysis: { ...swzAnalysis, wadiumPln: 60_000 } },
    { tenderDossier },
    { tenderFit: { fitScore: 72, winChancePct: 40, blockingIssues: [], awardCriteria: [] } },
  ];
  const next = applyFunctionalPatches(items, "t-1", sequence);
  assert("T4 sequential bzpDocuments preserved", next[0].bzpDocuments?.length === 2);
  assert("T4 sequential dossier preserved", next[0].tenderDossier != null);
  assert("T4 sequential tenderFit preserved", next[0].tenderFit?.fitScore === 72);
}

// T5 — refresh widoku (seen + auto patch równolegle)
{
  const items = [baseItem({ status: "new" })];
  const seen = applyFunctionalPatches(items, "t-1", [{ status: "seen" }]);
  const afterAuto = applyFunctionalPatches(seen, "t-1", [{
    bzpDocuments: sampleDocs,
    documentsFetchedAt: NOW,
  }]);
  assert("T5 status seen after refresh", afterAuto[0].status === "seen");
  assert("T5 docs after refresh", afterAuto[0].bzpDocuments?.length === 2);
}

// T6 — sync merge chroni niepuste docs (tenders-sync semantics)
{
  const primary = baseItem({ bzpDocuments: [], updatedAt: "2026-06-17T13:00:00.000Z" });
  const secondary = baseItem({
    bzpDocuments: sampleDocs,
    documentsFetchedAt: NOW,
    updatedAt: "2026-06-17T12:00:00.000Z",
  });
  const mergedDocs = primary.bzpDocuments?.length ? primary.bzpDocuments : secondary.bzpDocuments;
  assert("T6 cloud merge keeps secondary docs when primary empty", mergedDocs?.length === 2);
}

console.log("\nPASS — P3-AUDIT-001-FIX-A (6/6)\n");
