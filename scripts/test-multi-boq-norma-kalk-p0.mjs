/**
 * MULTI-BOQ-NORMA-KALK P0 — parser fold + live WM fixtures.
 * npx vite-node scripts/test-multi-boq-norma-kalk-p0.mjs
 *
 * DF-01…DF-16 · D02 LP22 OUT OF P0 (guard only).
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  extractPdfPrzedmiarRows,
  foldKalkBasisSegments,
  parsePdfPrzedmiarLine,
  splitPdfBoqText,
} from "../src/lib/pdf-przedmiar-heuristic.ts";
import { extractPdfText } from "../src/lib/tenders-bzp-doc-parse.ts";
import { mergeDwellingArtifactLines } from "../src/lib/multi-boq/merge.ts";
import { foldContentHash } from "../src/lib/multi-boq/line-id.ts";

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

// --- Synthetic unit tests (no PDF) ---

// T10 — real conflict still HOLD (Multi-BOQ unchanged)
{
  const art = {
    documentId: "d",
    artifactId: "a",
    filename: "x.pdf",
    branchHint: "unknown",
    snapshot: {
      ok: true,
      rows: [
        {
          lp: "10",
          code: "KNR 1",
          description: "Robot A",
          unit: "szt",
          quantity: "1",
          unitPrice: "",
          total: "",
        },
        {
          lp: "10",
          code: "KNR 2",
          description: "Robot B different",
          unit: "szt",
          quantity: "2",
          unitPrice: "",
          total: "",
        },
      ],
      catalogQuantities: [],
    },
  };
  const m = mergeDwellingArtifactLines([art]);
  assert("T10 real conflict CONFLICT", m.completeness === "conflict");
}

// T11 KEEP ONE
{
  const row = {
    lp: "1",
    code: "KNR",
    description: "Same",
    unit: "m2",
    quantity: "3",
    unitPrice: "",
    total: "",
  };
  const art = {
    documentId: "d1",
    artifactId: "a1",
    filename: "a.pdf",
    branchHint: "unknown",
    snapshot: { ok: true, rows: [row, { ...row }], catalogQuantities: [] },
  };
  const m = mergeDwellingArtifactLines([art]);
  assert("T11 KEEP ONE ready", m.completeness === "ready" && m.lines.length === 1);
}

// T12 different branch KEEP BOTH
{
  const mk = (branchHint, documentId, description) => ({
    documentId,
    artifactId: documentId,
    filename: `${documentId}.pdf`,
    branchHint,
    snapshot: {
      ok: true,
      rows: [
        {
          lp: "1",
          code: "KNR",
          description,
          unit: "szt",
          quantity: "1",
          unitPrice: "",
          total: "",
        },
      ],
      catalogQuantities: [],
    },
  });
  const m = mergeDwellingArtifactLines([
    mk("sanitary", "d1", "Sanitary work A"),
    mk("electrical", "d2", "Electrical work B"),
  ]);
  assert("T12 KEEP BOTH", m.completeness === "ready" && m.lines.length === 2);
}

// DF-16 LP32 — table-code suffix rejected, parent survives with quantity ""
{
  const row = parsePdfPrzedmiarLine(
    "32 KNR AT-26 Zabezpieczenie okien folią m 2 d.1.6 0103-02",
  );
  assert("R1 LP32 survives", Boolean(row && row.lp === "32"));
  assert("R2 LP32 qty !== 02", row?.quantity === "" || (row?.quantity !== "02" && row?.quantity !== "2"));
  assert("R2b LP32 qty empty unresolved", row?.quantity === "");
  assert("R3 LP32 unit m2", row?.unit === "m2");
  assert("R4 LP32 description", /Zabezpieczenie okien/i.test(row?.description || ""));
  assert("R3b LP32 code KNR AT-26", /KNR AT-26/i.test(row?.code || ""));
}

// Fold: incomplete KNR + kalk qty
{
  const segs = foldKalkBasisSegments([
    "56 KNR 2-15 Rurociągi w instalacjach wodociągowych o śr. nom. 20-25 mm PP",
    "kalk. własna 20 m 20.00",
  ]);
  assert("fold merges 2→1", segs.segments.length === 1);
  const row = parsePdfPrzedmiarLine(segs.segments[0]);
  assert(
    "fold LP56 Rurociągi mb 20",
    row?.lp === "56" &&
      /Ruroci/i.test(row.description) &&
      row.unit === "mb" &&
      (row.quantity === "20.00" || row.quantity === "20") &&
      row.pricingBasis === "kalk_wlasna" &&
      !/kalk/i.test(row.code),
  );
}

// DF-16 LP92 style
{
  const line =
    "92 KNR 2-15 Grzejniki stalowe dwupłytowe CV22-600 1000 mm kpl. d.2.4 0419-04 kalk. własna 2 kpl. 2.00";
  const row = parsePdfPrzedmiarLine(line);
  assert(
    "T7 LP92 qty 2.00 not 04",
    row?.lp === "92" &&
      row.unit === "kpl" &&
      (row.quantity === "2.00" || row.quantity === "2") &&
      row.quantity !== "04" &&
      row.pricingBasis === "kalk_wlasna",
  );
}

// Solo parent description
{
  const rows = extractPdfPrzedmiarRows(
    [
      "PRZEDMIAR ROBÓT Lp. Podstawa Ilość J.m. KNR",
      "5 Koszt kontenera na gruz wraz z wywozem i kosztem utylizacji kpl.",
      "d.1.1 kalk. własna",
      "1 kpl. 1.00",
      "RAZEM 1.00",
      "10 KNR 4-01 Tynk wewnętrzny m2 1.00",
    ].join("\n"),
  );
  const r5 = rows.find((r) => r.lp === "5");
  assert(
    "T5 LP5 kontener desc",
    Boolean(r5 && /kontenera/i.test(r5.description) && r5.description !== "Kalkulacja własna"),
  );
}

// Orphan kalk — no synthetic LP (isolated segment, no parent fold)
{
  const folded = foldKalkBasisSegments(["kalk. własna 5 mb 5.00"]);
  assert(
    "DF-15 orphan segment dropped",
    folded.segments.length === 0,
  );
  assert(
    "DF-15 orphan warning",
    folded.warnings.some((x) => /ORPHAN_KALK_BASIS/i.test(x)),
  );
}

// --- Live WM PDFs if present ---
const EXTRACT = ".tmp-live-wroclaw-wm-x/opis-extracted";
const liveOk = existsSync(EXTRACT);

function findDupConflicts(rows) {
  const byLp = new Map();
  for (const r of rows) {
    const lp = String(r.lp || "").trim();
    if (!lp) continue;
    if (!byLp.has(lp)) byLp.set(lp, []);
    byLp.get(lp).push(r);
  }
  let n = 0;
  for (const [, g] of byLp) {
    if (g.length < 2) continue;
    const hashes = new Set(
      g.map((x) =>
        foldContentHash([
          String(x.lp).trim(),
          String(x.description || "").trim().slice(0, 200),
          String(x.unit || "").trim(),
          String(x.quantity || "").trim(),
        ]),
      ),
    );
    if (hashes.size > 1) n += 1;
  }
  return n;
}

function kalkConflictCount(rows) {
  const byLp = new Map();
  for (const r of rows) {
    const lp = String(r.lp || "").trim();
    if (!lp) continue;
    if (!byLp.has(lp)) byLp.set(lp, []);
    byLp.get(lp).push(r);
  }
  let n = 0;
  for (const [, g] of byLp) {
    if (g.length < 2) continue;
    const hasKalk = g.some(
      (x) => x.pricingBasis === "kalk_wlasna" || x.description === "Kalkulacja własna",
    );
    const hasReal = g.some(
      (x) => x.pricingBasis !== "kalk_wlasna" && x.description !== "Kalkulacja własna",
    );
    // false kalk conflict = real + standalone kalk-desc under same LP
    if (hasKalk && hasReal && g.some((x) => x.description === "Kalkulacja własna")) n += 1;
  }
  return n;
}

if (liveOk) {
  const dwellings = [
    { id: "D01", re: /Reja 8_27.*przedmiar/i },
    { id: "D02", re: /Szarzy.*przedmiar/i },
    { id: "D03", re: /Siemie.*przedmiar/i },
    { id: "D04", re: /Wyszy.*przedmiar/i },
  ];

  for (const d of dwellings) {
    const file = readdirSync(EXTRACT).find((n) => d.re.test(n));
    assert(`${d.id} file present`, Boolean(file));
    if (!file) continue;
    const bytes = new Uint8Array(readFileSync(join(EXTRACT, file)));
    const { text } = await extractPdfText(bytes);
    const rows = extractPdfPrzedmiarRows(text);
    const merged = mergeDwellingArtifactLines([
      {
        documentId: d.id,
        artifactId: d.id,
        filename: file.split("__").pop() || file,
        branchHint: "unknown",
        snapshot: { ok: true, rows, catalogQuantities: [] },
      },
    ]);
    const kConflict = kalkConflictCount(rows);
    const dup = findDupConflicts(rows);
    console.log(
      `${d.id}: rows=${rows.length} dupLp=${dup} kalkFalseConflicts=${kConflict} merge=${merged.completeness}`,
    );
    assert(`${d.id} T9 no false kalk conflict rows`, kConflict === 0);
    assert(
      `${d.id} merge ready or only non-kalk conflict`,
      merged.completeness === "ready" ||
        (merged.completeness === "conflict" && kConflict === 0),
    );

    if (d.id === "D01") {
      const lp53 = rows.filter((r) => r.lp === "53");
      const lp56 = rows.find((r) => r.lp === "56");
      const lp92 = rows.find((r) => r.lp === "92");
      assert("T1 LP53 one row", lp53.length === 1);
      assert("T1 LP53 Dodatki", /Dodatki|podej/i.test(lp53[0]?.description || ""));
      assert(
        "T2 LP56 Rurociągi mb 20",
        Boolean(
          lp56 &&
            /Ruroci/i.test(lp56.description) &&
            lp56.unit === "mb" &&
            (lp56.quantity === "20.00" || lp56.quantity === "20"),
        ),
      );
      assert("T3 no synthetic LP53 dup", lp53.length === 1);
      assert(
        "T4 no standalone Kalkulacja under parent KNR LPs",
        !rows.some(
          (r) =>
            r.description === "Kalkulacja własna" &&
            ["53", "56", "63", "80", "84", "92"].includes(r.lp),
        ),
      );
      assert(
        "T7 live LP92 qty≠04",
        Boolean(lp92 && lp92.quantity !== "04" && Number(String(lp92.quantity).replace(",", ".")) === 2),
      );
      const lp32 = rows.find((r) => r.lp === "32");
      assert(
        "R1 live LP32 survives",
        Boolean(lp32 && /Zabezpieczenie okien/i.test(lp32.description || "")),
      );
      assert("R2 live LP32 qty !== 02", lp32?.quantity !== "02" && lp32?.quantity !== "2");
      for (const lp of ["5", "27", "28", "38", "42", "150"]) {
        const r = rows.find((x) => x.lp === lp);
        assert(
          `T6 LP${lp} parent desc`,
          Boolean(r && r.description !== "Kalkulacja własna" && r.description.length >= 8),
        );
      }
    }

    if (d.id === "D02") {
      // T8 — LP22 still may duplicate (OUT OF P0); guard: do not claim fixed
      const lp22 = rows.filter((r) => r.lp === "22");
      console.log("T8 D02 LP22 count (separate follow-up):", lp22.length);
      assert("T8 D02 LP22 observed (no P0 claim)", lp22.length >= 1);
    }
  }
} else {
  console.log("SKIP live WM PDFs — .tmp-live-wroclaw-wm-x/opis-extracted missing");
}

console.log(`\nNORMA-KALK P0: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
