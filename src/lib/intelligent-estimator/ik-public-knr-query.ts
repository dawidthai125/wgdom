/**
 * Multi-variant public KNR search query planner.
 * Queries are for telemetry / future discovery ports — HTTP still allowlist-bound.
 * ZERO invent of codes.
 */

import type { IkPublicKnrQueryPlan } from "./ik-public-knr-types";
import {
  extractIkBomPodstawaEvidence,
  normativeLookupKey,
} from "./ik-bom-podstawa-extract";
import { buildCatalogBasisFromRawCode } from "@/lib/tenders-bzp-brief";

function uniq(xs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    const t = String(x ?? "").trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/**
 * Build query variants for a basis code + optional description.
 */
export function buildPublicKnrQueryPlan(opts: {
  rawCode?: string | null;
  description?: string | null;
  evidenceKeyV1?: string | null;
}): IkPublicKnrQueryPlan {
  const description = String(opts.description ?? "").trim();
  const pod = extractIkBomPodstawaEvidence({
    description,
    catalogBasisRaw: opts.rawCode,
  });
  const basis =
    pod.catalogBasis
    ?? (opts.rawCode ? buildCatalogBasisFromRawCode(opts.rawCode) : null);
  const evidenceKeyV1 =
    String(opts.evidenceKeyV1 ?? "").trim()
    || normativeLookupKey(basis)
    || String(basis?.normalizedKey ?? "").trim()
    || "UNKNOWN";

  const family = String(basis?.family ?? "KNR").toUpperCase();
  const catalogId = String(basis?.catalogId ?? "").trim();
  const table = String(basis?.tableCode ?? "").trim();
  const displayCode =
    String(basis?.rawCode ?? "").trim()
    || [family, catalogId, table].filter(Boolean).join(" ")
    || evidenceKeyV1;

  const tableItem = table; // e.g. 1124-01
  const tableSlash = table.includes("-")
    ? table.replace("-", "/")
    : table;
  const catalogSlash = catalogId.includes("-")
    ? catalogId.replace("-", "/")
    : catalogId;

  const descShort = description
    .replace(/\s+/g, " ")
    .slice(0, 80)
    .trim();

  const queries = uniq([
    displayCode,
    `"${displayCode}"`,
    family && catalogId && table ? `${family} ${catalogId} ${table}` : "",
    family === "KNR-W" && catalogId && table ? `KNR ${catalogId} ${table}` : "",
    family === "KNR" && catalogId && table ? `KNR-W ${catalogId} ${table}` : "",
    catalogId && table ? `${catalogId} ${table}` : "",
    catalogId && table ? `${catalogId}/${table}` : "",
    catalogSlash && table ? `${catalogSlash} ${table}` : "",
    catalogId && tableSlash ? `${catalogId} ${tableSlash}` : "",
    tableItem ? `"${tableItem}"` : "",
    tableItem && descShort ? `"${tableItem}" "${descShort}"` : "",
    tableItem && /demonta/i.test(description)
      ? `"${tableItem}" "demontaż łączników"`
      : "",
    tableItem && /łącznik/i.test(description)
      ? `"${tableItem}" "łączników instalacyjnych"`
      : "",
    tableItem && /rcd|różnicowo/i.test(description)
      ? `"${tableItem}" "RCD" badanie`
      : "",
    family && catalogId ? `${family} ${catalogId}` : "",
    family && catalogId && tableItem ? `"${family} ${catalogId}" "${tableItem}"` : "",
  ]);

  return { evidenceKeyV1, displayCode, queries };
}
