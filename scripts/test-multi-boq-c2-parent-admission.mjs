/**
 * MULTI-BOQ C2 parent admission — Option E.
 * npx vite-node scripts/test-multi-boq-c2-parent-admission.mjs
 */
import {
  admitC2ComposeArtifacts,
  composeDwellingOfferBoq,
  excludeC2ParentsFromComposeDocumentIds,
  isCompleteC2DerivedSet,
  mergeDwellingArtifactLines,
  resolveDwellingCostSnapshotForPricing,
} from "../src/lib/multi-boq/index.ts";
import {
  computeCompositionLineIntegrity,
  countSourceLinesInArtifacts,
} from "../src/lib/intelligent-estimator/ik-dwelling-mapping.ts";
import {
  clearMultiDwellingPackageStore,
  confirmDwelling,
  enableMultiDwellingMode,
  mapDocumentToDwelling,
  setExpectedDwellingCount,
} from "../src/lib/multi-dwelling/index.ts";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => {
    lsStore[k] = String(v);
  },
  removeItem: (k) => {
    delete lsStore[k];
  },
  clear: () => Object.keys(lsStore).forEach((k) => delete lsStore[k]),
};

let passed = 0;
let failed = 0;
function ok(cond, msg, extra) {
  if (cond) {
    passed += 1;
    console.log(`  PASS ${msg}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${msg}`, extra ?? "");
  }
}

const TID = "tender-c2-parent-admission";
const P = "doc_parent_p";
const D1 = "doc_d1_construction";
const D2 = "doc_d2_sanitary";
const D3 = "doc_d3_electrical";
const DW = "kosciuszki-46-4";

function snapRows(rows) {
  return {
    ok: true,
    rows: rows.map((r) => ({
      lp: r.lp,
      description: r.description,
      unit: r.unit ?? "szt",
      quantity: r.quantity ?? "1",
    })),
    catalogQuantities: rows.map((r) => ({
      lp: r.lp,
      description: r.description,
      unit: r.unit ?? "szt",
      quantity: r.quantity ?? "1",
    })),
    rowCount: rows.length,
    warnings: [],
  };
}

function art(documentId, filename, branchHint, rows) {
  return {
    documentId,
    artifactId: `art:${documentId}`,
    filename,
    branchHint,
    snapshot: snapRows(rows),
  };
}

function lineageComplete() {
  return {
    documents: [
      { documentId: P, source: "owner_upload" },
      {
        documentId: D1,
        source: "derived_cost_segment",
        parentDocumentId: P,
      },
      {
        documentId: D2,
        source: "derived_cost_segment",
        parentDocumentId: P,
      },
      {
        documentId: D3,
        source: "derived_cost_segment",
        parentDocumentId: P,
      },
    ],
    artifacts: [
      { documentId: P, branch: undefined, filename: "Przedmiar.pdf" },
      {
        documentId: D1,
        branch: "construction",
        filename: "Przedmiar.pdf#p0-13:construction",
      },
      {
        documentId: D2,
        branch: "sanitary",
        filename: "Przedmiar.pdf#p14-18:sanitary",
      },
      {
        documentId: D3,
        branch: "electrical",
        filename: "Przedmiar.pdf#p19-22:electrical",
      },
    ],
  };
}

function lineageIncompleteOneDerived() {
  return {
    documents: [
      { documentId: P, source: "owner_upload" },
      {
        documentId: D1,
        source: "derived_cost_segment",
        parentDocumentId: P,
      },
    ],
    artifacts: [
      { documentId: P, filename: "Przedmiar.pdf" },
      {
        documentId: D1,
        branch: "construction",
        filename: "Przedmiar.pdf#p0-13:construction",
      },
    ],
  };
}

function setupMap(ids) {
  clearMultiDwellingPackageStore();
  enableMultiDwellingMode(TID, { expectedDwellingCount: 1 });
  setExpectedDwellingCount(TID, 1);
  confirmDwelling({
    tenderId: TID,
    dwellingId: DW,
    labelPl: "ul. Kościuszki 46 / lokal 4",
  });
  for (const id of ids) {
    const r = mapDocumentToDwelling({
      tenderId: TID,
      documentId: id,
      dwellingId: DW,
    });
    if (!r.ok) throw new Error(`map failed ${id}: ${r.reason}`);
  }
}

console.log("\n=== MULTI-BOQ C2 parent admission ===\n");

// --- Unit: completeness ---
ok(
  isCompleteC2DerivedSet([
    { documentId: D1, branch: "construction" },
    { documentId: D2, branch: "sanitary" },
  ]),
  "U1 complete ≥2 distinct branches",
);
ok(
  !isCompleteC2DerivedSet([{ documentId: D1, branch: "construction" }]),
  "U2 incomplete single derived",
);
ok(
  !isCompleteC2DerivedSet([
    { documentId: D1, branch: "construction" },
    { documentId: "x", branch: "construction" },
  ]),
  "U3 incomplete duplicate branch",
);

// --- T1: P + complete D* → P excluded, compose ready ---
{
  const parentRows = [
    { lp: "41", description: "Gładzie gipsowe A" },
    { lp: "41", description: "Próba gazowa B" },
  ];
  const pool = [
    art(P, "Przedmiar.pdf", "unknown", parentRows),
    art(D1, "Przedmiar.pdf#p0-13:construction", "construction", [
      { lp: "1", description: "Skucie" },
      { lp: "41", description: "Gładzie" },
    ]),
    art(D2, "Przedmiar.pdf#p14-18:sanitary", "sanitary", [
      { lp: "41", description: "Próba gazowa" },
    ]),
    art(D3, "Przedmiar.pdf#p19-22:electrical", "electrical", [
      { lp: "1", description: "Tablica" },
    ]),
  ];
  setupMap([P, D1, D2, D3]);
  const lineage = lineageComplete();
  const excl = excludeC2ParentsFromComposeDocumentIds({
    documentIds: [P, D1, D2, D3],
    lineage,
  });
  ok(excl.excludedParentIds.includes(P), "T1 P excluded from admission", excl);
  ok(
    excl.admittedIds.sort().join() === [D1, D2, D3].sort().join(),
    "T1 admitted = D*",
    excl.admittedIds,
  );

  const snap = resolveDwellingCostSnapshotForPricing({
    tenderId: TID,
    dwellingId: DW,
    artifacts: pool,
    c2Lineage: lineage,
  });
  ok(snap.completeness === "ready", "T1 completeness ready", snap);
  ok(
    !snap.sourceDocumentIds.includes(P),
    "T1 compose sources exclude P",
    snap.sourceDocumentIds,
  );
  ok(
    snap.warnings.some((w) => w.startsWith("EXCLUDE_C2_PARENT_LINEAGE_ONLY:")),
    "T1 warning EXCLUDE_C2_PARENT",
  );
  const composed = composeDwellingOfferBoq({ snapshot: snap });
  ok(composed.ok === true, "T1 compose ok");
  ok(
    composed.ok && composed.document.lines.length > 0,
    "T1 OfferBoq lines > 0",
    composed.ok ? composed.document.lines.length : composed.reason,
  );

  const admitted = admitC2ComposeArtifacts({
    artifacts: pool,
    mappedDocumentIds: [P, D1, D2, D3],
    lineage,
  });
  const sourceN = countSourceLinesInArtifacts(admitted.admitted);
  const composedN = composed.ok ? composed.document.lines.length : 0;
  const integrity = computeCompositionLineIntegrity({
    sourceLineCount: sourceN,
    composedLineCount: composedN,
    keepOneCollapsedRawLines: 0,
  });
  ok(integrity.ok, "T1 integrity ok (same admitted set)", integrity);
  ok(
    !integrity.reasons.some((r) => r.includes("UNEXPLAINED_LINE_LOSS")),
    "T1 no UNEXPLAINED_LINE_LOSS",
    integrity.reasons,
  );
}

// --- T2: incomplete derived → do NOT exclude P ---
{
  clearMultiDwellingPackageStore();
  const pool = [
    art(P, "Przedmiar.pdf", "unknown", [
      { lp: "1", description: "A" },
    ]),
    art(D1, "Przedmiar.pdf#p0-13:construction", "construction", [
      { lp: "1", description: "B" },
    ]),
  ];
  setupMap([P, D1]);
  const excl = excludeC2ParentsFromComposeDocumentIds({
    documentIds: [P, D1],
    lineage: lineageIncompleteOneDerived(),
  });
  ok(excl.excludedParentIds.length === 0, "T2 no parent exclude when incomplete");
  const snap = resolveDwellingCostSnapshotForPricing({
    tenderId: TID,
    dwellingId: DW,
    artifacts: pool,
    c2Lineage: lineageIncompleteOneDerived(),
  });
  ok(
    snap.sourceDocumentIds.includes(P),
    "T2 P still admitted",
    snap.sourceDocumentIds,
  );
  ok(
    snap.completeness !== "ready"
      || snap.sourceDocumentIds.includes(P),
    "T2 does not falsely READY by dropping P",
    snap,
  );
}

// --- T3: P alone with duplicate LP same branch(unknown) → CONFLICT ---
{
  clearMultiDwellingPackageStore();
  const pool = [
    art(P, "Przedmiar.pdf", "unknown", [
      { lp: "41", description: "Gładzie" },
      { lp: "41", description: "Próba gazowa" },
    ]),
  ];
  setupMap([P]);
  const snap = resolveDwellingCostSnapshotForPricing({
    tenderId: TID,
    dwellingId: DW,
    artifacts: pool,
    c2Lineage: {
      documents: [{ documentId: P, source: "owner_upload" }],
      artifacts: [{ documentId: P, filename: "Przedmiar.pdf" }],
    },
  });
  ok(snap.completeness === "conflict", "T3 P alone CONFLICT", snap.warnings);
  const composed = composeDwellingOfferBoq({ snapshot: snap });
  ok(
    !composed.ok && composed.reason === "CONFLICT_HOLD",
    "T3 CONFLICT_HOLD preserved",
    composed,
  );
}

// --- T4: D* distinct branches KEEP BOTH / ready ---
{
  clearMultiDwellingPackageStore();
  const pool = [
    art(D1, "a-construction.pdf", "construction", [
      { lp: "5", description: "Pozycja A", quantity: "1" },
    ]),
    art(D2, "b-sanitary.pdf", "sanitary", [
      { lp: "5", description: "Pozycja B", quantity: "2" },
    ]),
  ];
  setupMap([D1, D2]);
  const merged = mergeDwellingArtifactLines(pool);
  ok(
    merged.completeness === "ready" && merged.lines.length === 2,
    "T4 KEEP BOTH same LP distinct branch",
    merged,
  );
}

// --- T5: complete derived but only partial mapped → no exclude ---
{
  clearMultiDwellingPackageStore();
  const excl = excludeC2ParentsFromComposeDocumentIds({
    documentIds: [P, D1], // D2/D3 missing from map
    lineage: lineageComplete(),
  });
  ok(
    excl.excludedParentIds.length === 0,
    "T5 incomplete map coverage → no exclude",
    excl,
  );
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
