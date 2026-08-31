/**
 * WM OPZ large-ZIP heavy discovery regression (Wyszyński-class).
 * Pure + source contract — no cloud mutation.
 *
 * Run: npx vite-node scripts/test-wm-opz-zip-size-limit-heavy.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isPriorityCostArchiveOuter } from "../src/lib/tenders-bzp-filename.ts";

const WYSZ_OPZ_BYTES = 168_671_325; // measured Edge diag 2026-08-31
const LEGACY_LIMIT = 128 * 1024 * 1024;
const NEW_LIMIT = 192 * 1024 * 1024;

function computeZipUnpackOk(docs, zipWithInnerIndices) {
  const zipDocs = docs.filter((d) => /\.zip$/i.test(d.filename));
  const zipDocIndices = zipDocs.map((d) => d.index);
  const zipWithInner = new Set(zipWithInnerIndices);
  const priorityZipIndices = zipDocIndices.filter((idx) => {
    const doc = docs.find((d) => d.index === idx);
    return Boolean(doc && isPriorityCostArchiveOuter(doc.filename));
  });
  if (zipDocIndices.length === 0) return true;
  if (priorityZipIndices.length > 0) {
    return priorityZipIndices.every((idx) => zipWithInner.has(idx));
  }
  return zipWithInner.size > 0;
}

console.log("=== WM OPZ ZIP size-limit / priority unpack ===\n");

{
  assert.equal(
    isPriorityCostArchiveOuter("TP167_Zal. nr 3 do SWZ - Opis przedmiotu zamówienia.zip"),
    true,
    "OPZ outer is priority",
  );
  assert.equal(
    isPriorityCostArchiveOuter("TP167_Zał. nr 4 do SWZ_Projektowane postanowienia umowy z załącznikami.zip"),
    false,
    "umowa ZIP is not priority",
  );
  assert.equal(
    isPriorityCostArchiveOuter("DOKUMENTACJA PROJEKTOWA.zip"),
    true,
    "dokumentacja projektowa is priority",
  );
  console.log("PASS priority outer classification");
}

{
  const docs = [
    { index: 4, filename: "TP167_Zał. nr 4 do SWZ_Projektowane postanowienia umowy z załącznikami.zip" },
    { index: 7, filename: "TP167_Zal. nr 3 do SWZ - Opis przedmiotu zamówienia.zip" },
    { index: 8, filename: "24.08.2026_PW IE_REWIZJA_DODANIE DZWONKOW.zip" },
  ];
  // Legacy bug: umowa+rewizja inners → zipUnpackOk true even when OPZ missing
  const legacyOk = docs.some((d) => d.index === 4) && true; // any inner
  assert.equal(
    computeZipUnpackOk(docs, [4, 8]),
    false,
    "priority OPZ missing inners → zipUnpackOk false",
  );
  assert.equal(
    computeZipUnpackOk(docs, [4, 7, 8]),
    true,
    "OPZ + others unpacked → zipUnpackOk true",
  );
  assert.equal(
    computeZipUnpackOk(
      [{ index: 4, filename: "umowa-only.zip" }],
      [4],
    ),
    true,
    "no priority ZIP → any inner still OK",
  );
  void legacyOk;
  console.log("PASS zipUnpackOk priority gate");
}

{
  assert.ok(WYSZ_OPZ_BYTES > LEGACY_LIMIT, "Wyszyński OPZ exceeds legacy 128 MiB");
  assert.ok(WYSZ_OPZ_BYTES < NEW_LIMIT, "Wyszyński OPZ fits raised 192 MiB");
  const edgeSrc = readFileSync(
    "supabase/functions/make-server-0afb8820/index.tsx",
    "utf8",
  );
  assert.match(
    edgeSrc,
    /MAX_ARCHIVE_OUTER_BYTES\s*=\s*192\s*\*\s*1024\s*\*\s*1024/,
    "Edge MAX_ARCHIVE_OUTER_BYTES must be 192 MiB",
  );
  assert.doesNotMatch(
    edgeSrc,
    /MAX_ARCHIVE_OUTER_BYTES\s*=\s*128\s*\*\s*1024\s*\*\s*1024/,
    "legacy 128 MiB constant must be gone",
  );
  console.log("PASS Edge archive limit contract (192 MiB)");
}

console.log("\nAll WM OPZ size-limit heavy checks PASS");
