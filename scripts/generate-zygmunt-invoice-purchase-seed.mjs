/**
 * Generate compact Zygmunt invoice purchase seed TS from fixture JSON.
 * Run: npx vite-node scripts/generate-zygmunt-invoice-purchase-seed.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeZygmuntInvoiceSeedFixture,
  seedInvoiceLinesToPriceMemory,
} from "../src/lib/price-intelligence/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = normalizeZygmuntInvoiceSeedFixture(
  JSON.parse(
    readFileSync(
      join(root, "src/lib/price-intelligence/fixtures/zygmunt-invoices-seed-2026.json"),
      "utf8",
    ),
  ),
);

const empty = normalizeWorkCatalogStore({
  schemaVersion: 4,
  activeRegion: "wroclaw",
  updatedAt: "2026-01-01T00:00:00.000Z",
  catalogs: {
    wroclaw: { region: "wroclaw", updatedAt: "2026-01-01T00:00:00.000Z", works: [] },
    dolnyslask: { region: "dolnyslask", updatedAt: "2026-01-01T00:00:00.000Z", works: [] },
  },
});

const seeded = seedInvoiceLinesToPriceMemory(empty, fixture.lines);

/** One LAST row per materialKey (latest observation). */
const byKey = new Map();
for (const o of seeded.observations) {
  const prev = byKey.get(o.materialKey);
  if (!prev || o.observedAt >= prev.observedAt) byKey.set(o.materialKey, o);
}

const rows = [...byKey.values()]
  .sort((a, b) => a.materialKey.localeCompare(b.materialKey))
  .map((o) => ({
    materialKey: o.materialKey,
    catalogWorkId: o.catalogWorkId,
    namePl: o.productName,
    unit: o.unit,
    netUnitPricePln: o.netUnitPrice,
    observedAt: o.observedAt,
    productIdentityKey: o.productIdentityKey,
    productCode: o.productCode ?? null,
  }));

const outPath = join(
  root,
  "src/lib/price-intelligence/zygmunt-invoice-purchase-seed-data.ts",
);
const body = `/**
 * AUTO-GENERATED — do not edit by hand.
 * Source: fixtures/zygmunt-invoices-seed-2026.json (Zygmunt Włodarczyk invoices).
 * Semantics: HISTORICAL PURCHASE LAST price per materialKey · origin wgdom.
 * Regenerator: scripts/generate-zygmunt-invoice-purchase-seed.mjs
 */

export const ZYGMUNT_INVOICE_PURCHASE_SEED_GENERATED_AT = ${JSON.stringify(new Date().toISOString())} as const;

export const ZYGMUNT_INVOICE_PURCHASE_SEED_META = {
  supplier: "Zygmunt Włodarczyk",
  sourceFiles: [
    "FS_10077_1164_2026_M.pdf",
    "FS_10077_2044_2026_M.pdf",
    "FS_10077_2923_2026_M.pdf",
  ],
  fixtureLineCount: ${fixture.meta.lineCount},
  uniqueMaterialCount: ${rows.length},
  rejectedParseCount: ${fixture.meta.rejectedParseCount},
  integrityFailCount: ${fixture.meta.integrityFailCount},
} as const;

export type ZygmuntInvoicePurchaseSeedRow = {
  materialKey: string;
  catalogWorkId: string;
  namePl: string;
  unit: "m2" | "mb" | "szt" | "rbh" | "m3" | "kpl" | "kg" | "l";
  netUnitPricePln: number;
  observedAt: string;
  productIdentityKey: string;
  productCode: string | null;
};

export const ZYGMUNT_INVOICE_PURCHASE_SEED: readonly ZygmuntInvoicePurchaseSeedRow[] = ${JSON.stringify(rows, null, 2)} as const;
`;

writeFileSync(outPath, body, "utf8");
console.log("wrote", outPath, "rows", rows.length);
