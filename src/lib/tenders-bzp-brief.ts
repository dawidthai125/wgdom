/** Brief przetargu — ustrukturyzowane dane z ogłoszenia HTML i SWZ (bez linków zewnętrznych). */

import {
  stripHtmlToText,
  type CatalogBasis,
  type CatalogBasisFamily,
  type TenderCostLine,
} from "@/lib/tenders-bzp-swz";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { TenderBzpDocument } from "@/lib/tenders-bzp";
import type { AthPreviewResult } from "@/lib/ath-parser";
import {
  buildQuantityExpressionsByLpFromAthRows,
  resolveQuantityExpressionFromPrzedmiar,
} from "@/lib/intelligent-estimator/boq-expression-source-seam";
import { extractTotalValueFromAthPreview } from "@/lib/tender-cost-snapshot";
import { isLikelyCatalogQuantityRow } from "@/lib/tender-catalog-quantity-filter";

export type { CatalogBasis, CatalogBasisFamily, TenderCostLine };

export interface TenderBriefField {
  label: string;
  value: string;
}

export interface TenderPrzedmiarLine {
  description: string;
  quantity: string;
  formula?: string;
}

/** Lekkie wiersze pod wycenę katalogową P2-G — bez cen, do 500 poz. (zgodnie z limitem parsera ATH). */
export interface TenderCatalogQuantityLine {
  lp: string;
  description: string;
  unit: string;
  quantity: string;
  /** IK S4-A — formula/calc z ATH przedmiar (metadata; nie zmienia quantity). */
  quantityExpressionRaw?: string | null;
  /** IK-KNR-EXPERT Slice A — PRIMARY evidence path for merge. Not knrHint. */
  catalogBasis?: CatalogBasis | null;
}

export const CATALOG_QUANTITIES_CAP = 500;

/** TP200B — priced rows w snapshot = parser ATH/PDF cap (nie 40). */
export const SNAPSHOT_PRICED_ROWS_CAP = 500;

export interface TenderKosztorysSnapshot {
  ok: boolean;
  sourceFilename: string;
  /** Indeks załącznika BZP (e-Zamówienia). */
  sourceDocumentIndex?: number;
  /** Ścieżka wewnątrz archiwum ZIP, jeśli dotyczy. */
  zipInnerPath?: string;
  title?: string;
  totalValue?: string;
  currency?: string;
  rowCount: number;
  rows: TenderCostLine[];
  /** Ilości z ATH pod aggregateCatalogDirectCost (P2-G.1B). */
  catalogQuantities?: TenderCatalogQuantityLine[];
  /** IK S4-A — formula/calc per lp z ATH preview (fallback gdy catalog bez expression). */
  quantityExpressionsByLp?: Record<string, string>;
  przedmiar: TenderPrzedmiarLine[];
  categories: { name: string; total: string }[];
  warnings: string[];
  parsedAt: string;
  /** P2-H.5B — komunikat jakości PDF przedmiaru. */
  pdfPrzedmiarCase?: 1 | 2 | 3;
  /** P2-H.5C — CASE 3: brak warstwy tekstowej (CAD). */
  pdfPrzedmiarNoTextLayer?: boolean;
  /** TP190C-2E-B — CASE 3: błąd ekstrakcji pdf.js. */
  pdfPrzedmiarExtractError?: boolean;
}

export interface TenderBrief {
  fields: TenderBriefField[];
  scopeDescription: string | null;
  location: string | null;
  procedureType: string | null;
  offerDeadline: string | null;
  offerOpening: string | null;
  contractPeriod: string | null;
  paymentTerms: string | null;
  contactInfo: string | null;
  additionalNotes: string[];
  builtAt: string;
}

const LABEL_ALIASES: Record<string, keyof Pick<TenderBrief,
  "scopeDescription" | "location" | "procedureType" | "offerDeadline" |
  "offerOpening" | "contractPeriod" | "paymentTerms" | "contactInfo"
>> = {
  "przedmiot zamówienia": "scopeDescription",
  "opis przedmiotu zamówienia": "scopeDescription",
  "przedmiot zamowienia": "scopeDescription",
  "opis przedmiotu zamowienia": "scopeDescription",
  "krótki opis przedmiotu zamówienia": "scopeDescription",
  "miejsce wykonania": "location",
  "miejsce realizacji": "location",
  "tryb udzielenia zamówienia": "procedureType",
  "tryb udzielenia": "procedureType",
  "termin składania ofert": "offerDeadline",
  "termin skladania ofert": "offerDeadline",
  "termin składania i otwarcia ofert": "offerDeadline",
  "termin otwarcia ofert": "offerOpening",
  "termin wykonania zamówienia": "contractPeriod",
  "termin realizacji zamówienia": "contractPeriod",
  "okres realizacji": "contractPeriod",
  "termin zakończenia": "contractPeriod",
  "warunki płatności": "paymentTerms",
  "warunki platnosci": "paymentTerms",
  "osoba do kontaktu": "contactInfo",
  "osoba upoważniona": "contactInfo",
};

function foldLabel(s: string): string {
  return s.toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanCell(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTableFields(html: string): TenderBriefField[] {
  const fields: TenderBriefField[] = [];
  const seen = new Set<string>();
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(html))) {
    const cells = [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => cleanCell(m[1]));
    if (cells.length < 2) continue;
    const label = cells[0].replace(/:$/, "").trim();
    const value = cells.slice(1).join(" · ").trim();
    if (!label || !value || label.length > 120 || value.length < 2) continue;
    const key = foldLabel(label);
    if (seen.has(key)) continue;
    seen.add(key);
    fields.push({ label, value: value.slice(0, 2000) });
  }
  return fields;
}

function extractDlFields(html: string): TenderBriefField[] {
  const fields: TenderBriefField[] = [];
  const dtRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
  let m: RegExpExecArray | null;
  while ((m = dtRe.exec(html))) {
    const label = cleanCell(m[1]).replace(/:$/, "");
    const value = cleanCell(m[2]);
    if (label && value) fields.push({ label, value: value.slice(0, 2000) });
  }
  return fields;
}

function applyFieldAliases(fields: TenderBriefField[]): Partial<TenderBrief> {
  const out: Partial<TenderBrief> = { additionalNotes: [] };
  for (const f of fields) {
    const k = foldLabel(f.label);
    const alias = LABEL_ALIASES[k];
    if (alias) {
      const prev = out[alias];
      out[alias] = prev ? `${prev}\n${f.value}` : f.value;
    } else if (
      /informacj|uwag|wyjaśnien|kryter|warunek|wymagan|zabezpieczen|gwarancj|kaucj/i.test(f.label)
      && f.value.length > 20
    ) {
      out.additionalNotes!.push(`${f.label}: ${f.value.slice(0, 400)}`);
    }
  }
  return out;
}

export function parseNoticeHtmlBrief(html: string): TenderBrief {
  const fromTables = extractTableFields(html);
  const fromDl = extractDlFields(html);
  const merged: TenderBriefField[] = [];
  const seen = new Set<string>();
  for (const f of [...fromTables, ...fromDl]) {
    const k = foldLabel(f.label);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(f);
  }
  const aliases = applyFieldAliases(merged);
  const plain = stripHtmlToText(html);
  let scope = aliases.scopeDescription ?? null;
  if (!scope) {
    const m = plain.match(/przedmiot zamówienia[:\s]+(.{20,800}?)(?:\.\s|$)/i)
      || plain.match(/opis przedmiotu[:\s]+(.{20,800}?)(?:\.\s|$)/i);
    if (m) scope = m[1].trim();
  }
  return {
    fields: merged.slice(0, 40),
    scopeDescription: scope,
    location: aliases.location ?? null,
    procedureType: aliases.procedureType ?? null,
    offerDeadline: aliases.offerDeadline ?? null,
    offerOpening: aliases.offerOpening ?? null,
    contractPeriod: aliases.contractPeriod ?? null,
    paymentTerms: aliases.paymentTerms ?? null,
    contactInfo: aliases.contactInfo ?? null,
    additionalNotes: (aliases.additionalNotes ?? []).slice(0, 8),
    builtAt: new Date().toISOString(),
  };
}

/** CATALOG-BID-01 — dodatnia ilość (ten sam kontrakt co Bid parseQty, lokalnie bez importu kalkulatora). */
function parsePositiveCatalogQty(s: string | undefined): number {
  if (!s?.trim()) return 0;
  const n = parseFloat(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

type CatalogQtySourceRow = {
  lp?: string;
  description?: string;
  unit?: string;
  quantity?: string;
  code?: string;
  catalogBasis?: CatalogBasis | null;
  przedmiar?: { quantity: string; formula?: string }[];
};

const CATALOG_BASIS_FAMILY_RE = /^(KNR-W|KNNR|NNRNKB|ZKNR|KSNR|KNR)\b/i;
/** SSOT table token — FT-10 / Slice A. */
export const CATALOG_BASIS_TABLE_CODE_RE = /^\d{3,4}-\d{2}$/;
const CATALOG_BASIS_DSEC_RE = /\bd\.\d+(?:\.\d+)?\b/gi;
const CATALOG_BASIS_AFTER_DSEC_TABLE_RE =
  /^\s+(?:\d{1,4}\s+)?(\d{3,4}-\d{2})\b/;

const CATALOG_BASIS_RECOGNIZED_FAMILIES = new Set<CatalogBasisFamily>([
  "KNR",
  "KNR-W",
  "KNNR",
  "NNRNKB",
]);

function catalogBasisFamilyFromPrefix(raw: string): CatalogBasisFamily {
  const u = raw.toUpperCase();
  if (u === "KNR-W") return "KNR-W";
  if (u === "KNNR") return "KNNR";
  if (u === "NNRNKB") return "NNRNKB";
  if (u === "KNR") return "KNR";
  return "OTHER";
}

function foldCatalogBasisNormalizedKey(
  family: CatalogBasisFamily,
  catalogId: string | null,
  tableCode: string | null,
): string {
  return [family ?? "OTHER", catalogId ?? "", tableCode ?? ""]
    .join("|")
    .toUpperCase();
}

function isValidCatalogTableCode(token: string | null | undefined): boolean {
  return CATALOG_BASIS_TABLE_CODE_RE.test(String(token ?? "").trim());
}

/**
 * IK-KNR-EXPERT Slice A — evidence from existing AthPreviewRow.code only.
 * Does not parse PDF. Does not read description. Does not write knrHint.
 * FT-10 secondary hint lives in resolveCatalogBasisFromSourceRow only.
 */
export function buildCatalogBasisFromRawCode(
  raw: string | null | undefined,
): CatalogBasis | null {
  const rawCode = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!rawCode) return null;

  const familyMatch = rawCode.match(CATALOG_BASIS_FAMILY_RE);
  const family: CatalogBasisFamily = familyMatch
    ? catalogBasisFamilyFromPrefix(familyMatch[1])
    : "OTHER";
  const rest = familyMatch ? rawCode.slice(familyMatch[0].length).trim() : rawCode;
  const tokens = rest.split(/[\s/]+/).filter(Boolean);

  let catalogId: string | null = null;
  let tableCode: string | null = null;
  for (const token of tokens) {
    if (!tableCode && CATALOG_BASIS_TABLE_CODE_RE.test(token)) {
      tableCode = token;
      continue;
    }
    if (!catalogId) catalogId = token;
  }

  const basis: CatalogBasis = {
    family,
    catalogId,
    tableCode,
    rawCode,
    display: rawCode,
    normalizedKey: foldCatalogBasisNormalizedKey(family, catalogId, tableCode),
  };
  if (isValidCatalogTableCode(tableCode)) {
    basis.tableCodeSource = "PRIMARY_CODE";
  }
  return basis;
}

type SecondaryTableExtract =
  | { kind: "none" }
  | { kind: "ambiguous" }
  | { kind: "token"; token: string };

/**
 * FT-10 Variant B — constrained secondary tableCode from description.
 * NOT a free scan of NNNN-NN. NOT identity / classification / pricing.
 */
export function extractSecondaryDsecTableCodeHint(
  description: string | null | undefined,
): SecondaryTableExtract {
  const desc = String(description ?? "");
  if (!desc.trim()) return { kind: "none" };

  const allTokens = [
    ...desc.matchAll(/\b(\d{3,4}-\d{2})\b/g),
  ].map((m) => m[1]);
  const distinct = [...new Set(allTokens)];
  if (distinct.length === 0) return { kind: "none" };
  if (distinct.length > 1) return { kind: "ambiguous" };

  const only = distinct[0];
  const dsecMatches = [...desc.matchAll(CATALOG_BASIS_DSEC_RE)];
  if (dsecMatches.length === 0) return { kind: "none" };

  const lastDsec = dsecMatches[dsecMatches.length - 1];
  const after = desc.slice((lastDsec.index ?? 0) + lastDsec[0].length);
  const windowMatch = after.match(CATALOG_BASIS_AFTER_DSEC_TABLE_RE);
  if (!windowMatch || windowMatch[1] !== only) return { kind: "none" };
  if (!CATALOG_BASIS_TABLE_CODE_RE.test(windowMatch[1])) return { kind: "none" };
  return { kind: "token", token: windowMatch[1] };
}

/**
 * FT-10 — apply secondary DSEC hint onto PRIMARY basis (ingest seam only).
 * Expert stays description-blind; reads resulting catalogBasis only.
 */
export function applySecondaryDsecTableCodeHint(
  primary: CatalogBasis,
  description: string | null | undefined,
): CatalogBasis {
  const family = primary.family;
  if (!family || !CATALOG_BASIS_RECOGNIZED_FAMILIES.has(family)) {
    return { ...primary };
  }

  const secondary = extractSecondaryDsecTableCodeHint(description);
  const primaryTable = isValidCatalogTableCode(primary.tableCode)
    ? String(primary.tableCode).trim()
    : null;

  if (primaryTable) {
    if (secondary.kind === "token" && secondary.token !== primaryTable) {
      return {
        ...primary,
        tableCode: primaryTable,
        tableCodeSource: "PRIMARY_CODE",
        tableCodeConfidence: null,
        tableCodeResolutionHold: "TABLECODE_CONFLICT",
        normalizedKey: foldCatalogBasisNormalizedKey(
          primary.family,
          primary.catalogId,
          primaryTable,
        ),
      };
    }
    return {
      ...primary,
      tableCode: primaryTable,
      tableCodeSource: "PRIMARY_CODE",
      tableCodeConfidence: null,
      tableCodeResolutionHold: null,
      normalizedKey: foldCatalogBasisNormalizedKey(
        primary.family,
        primary.catalogId,
        primaryTable,
      ),
    };
  }

  if (secondary.kind === "ambiguous") {
    return {
      ...primary,
      tableCode: null,
      tableCodeSource: null,
      tableCodeConfidence: null,
      tableCodeResolutionHold: "AMBIGUOUS_TABLECODE",
      normalizedKey: foldCatalogBasisNormalizedKey(
        primary.family,
        primary.catalogId,
        null,
      ),
    };
  }

  if (secondary.kind === "token") {
    return {
      ...primary,
      tableCode: secondary.token,
      // family / catalogId / rawCode / display unchanged
      tableCodeSource: "SECONDARY_DSEC_HINT",
      tableCodeConfidence: "constrained_hint",
      tableCodeResolutionHold: null,
      normalizedKey: foldCatalogBasisNormalizedKey(
        primary.family,
        primary.catalogId,
        secondary.token,
      ),
    };
  }

  return {
    ...primary,
    tableCodeResolutionHold: null,
  };
}

/**
 * CQ / snapshot ingest seam — PRIMARY from code/rawCode, then FT-10 secondary.
 * Does not write knrHint / catalogWorkId / classification.
 */
export function resolveCatalogBasisFromSourceRow(
  row: CatalogQtySourceRow,
): CatalogBasis | null {
  const raw = String(row.code ?? row.catalogBasis?.rawCode ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const primary = buildCatalogBasisFromRawCode(raw);
  if (!primary) return null;
  return applySecondaryDsecTableCodeHint(primary, row.description);
}

/** Czy catalogQuantities ma ≥1 linię roboczą z qty > 0 (po filtrze noise). */
export function hasUsableCatalogQuantities(
  lines: TenderCatalogQuantityLine[] | null | undefined,
): boolean {
  if (!lines?.length) return false;
  return lines.some(
    (r) =>
      isLikelyCatalogQuantityRow(r.description ?? "")
      && parsePositiveCatalogQty(r.quantity) > 0,
  );
}

/**
 * CATALOG-BID-01 — budowa SSOT ilości z wierszy przedmiaru.
 * Wymaga: opis „roboczy” (noise filter) + quantity > 0.
 * Puste qty nie trafiają do catalogQuantities (unikamy blokady fallbacku rows w Bid).
 */
export function buildCatalogQuantitiesFromRows(
  rows: CatalogQtySourceRow[],
): TenderCatalogQuantityLine[] {
  return rows
    .filter(
      (r) =>
        isLikelyCatalogQuantityRow(r.description ?? "")
        && parsePositiveCatalogQty(r.quantity) > 0,
    )
    .slice(0, CATALOG_QUANTITIES_CAP)
    .map((r) => {
      const catalogBasis = resolveCatalogBasisFromSourceRow(r);
      const quantityExpressionRaw = resolveQuantityExpressionFromPrzedmiar(r.przedmiar);
      return {
        lp: r.lp ?? "",
        description: r.description ?? "",
        unit: r.unit ?? "",
        quantity: r.quantity ?? "",
        ...(quantityExpressionRaw ? { quantityExpressionRaw } : {}),
        ...(catalogBasis ? { catalogBasis } : {}),
      };
    });
}

export function buildCatalogQuantitiesFromPreview(
  preview: AthPreviewResult,
): TenderCatalogQuantityLine[] {
  return buildCatalogQuantitiesFromRows(preview.rows);
}

/**
 * CATALOG-BID-01 — jedyny normalizer qty PRZED kalkulatorem.
 * Gdy brak użytecznych qty w catalogQuantities → odbudowa z rows (ten sam tor SSOT).
 * Nie zmienia ok / ATH totals / merge / parsera. Nie rusza kontraktu Bid (F1–F4).
 */
export function ensureKosztorysCatalogQuantities(
  snapshot: TenderKosztorysSnapshot,
): TenderKosztorysSnapshot {
  if (hasUsableCatalogQuantities(snapshot.catalogQuantities)) {
    return snapshot;
  }
  const rebuilt = buildCatalogQuantitiesFromRows(snapshot.rows ?? []);
  /** [] gdy brak qty — pozwala resolveCatalogQuantities spaść na rows (bez zmiany helpera Bid). */
  if (
    rebuilt.length === 0
    && (snapshot.catalogQuantities?.length ?? 0) === 0
  ) {
    return snapshot;
  }
  return { ...snapshot, catalogQuantities: rebuilt };
}

export function athPreviewToSnapshot(
  preview: AthPreviewResult,
  sourceFilename: string,
): TenderKosztorysSnapshot {
  const catalogQuantities = buildCatalogQuantitiesFromPreview(preview);
  const quantityExpressionsByLp = buildQuantityExpressionsByLpFromAthRows(preview.rows);
  const pricedCap = SNAPSHOT_PRICED_ROWS_CAP;
  const rows: TenderCostLine[] = preview.rows.slice(0, pricedCap).map((r) => {
    const catalogBasis = resolveCatalogBasisFromSourceRow(r);
    return {
      lp: r.lp,
      description: r.description,
      unit: r.unit,
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      total: r.total,
      ...(r.code ? { code: r.code } : {}),
      ...(catalogBasis ? { catalogBasis } : {}),
    };
  });
  const przedmiar: TenderPrzedmiarLine[] = [];
  for (const r of preview.rows.slice(0, pricedCap)) {
    for (const p of r.przedmiar ?? []) {
      przedmiar.push({
        description: r.description.slice(0, 80),
        quantity: p.quantity,
        formula: p.formula,
      });
    }
  }
  const snapshot: TenderKosztorysSnapshot = {
    ok: preview.ok || preview.rows.length > 0 || Boolean(preview.totalValue)
      || (preview.summaryLines?.length ?? 0) > 0,
    sourceFilename,
    title: preview.title,
    totalValue: preview.totalValue || extractTotalValueFromAthPreview(preview),
    currency: preview.currency,
    rowCount: preview.rows.length,
    rows,
    catalogQuantities,
    quantityExpressionsByLp,
    przedmiar: przedmiar.slice(0, 30),
    categories: (preview.categories ?? []).slice(0, 12).map((c) => ({
      name: c.name,
      total: c.total,
    })),
    warnings: preview.warnings.slice(0, 5),
    parsedAt: new Date().toISOString(),
    pdfPrzedmiarCase: preview.pdfPrzedmiarCase,
    pdfPrzedmiarNoTextLayer: preview.pdfPrzedmiarNoTextLayer,
    pdfPrzedmiarExtractError: preview.pdfPrzedmiarExtractError,
  };
  return ensureKosztorysCatalogQuantities(snapshot);
}

export function pickBestKosztorysDocument(docs: TenderBzpDocument[]): TenderBzpDocument | null {
  if (!docs.length) return null;
  const scored = docs.map((doc) => {
    let s = 0;
    const n = doc.filename.toLowerCase();
    if (/kosztorys|przedmiar|obmiar/.test(n)) s += 35;
    if (/swz|opz|specyfikac|formularz/.test(n)) s += 22;
    if (/\.(ath|nor|xml)$/i.test(n)) s += 28;
    if (/\.xlsx?$/i.test(n)) s += 12;
    if (/\.pdf$/i.test(n)) s += 8;
    if (doc.isSwzHint) s += 18;
    return { doc, s };
  }).sort((a, b) => b.s - a.s);
  return scored[0]?.s >= 8 ? scored[0].doc : null;
}

export interface TenderDossier {
  brief: TenderBrief;
  kosztorys: TenderKosztorysSnapshot | null;
  /** Wyliczona propozycja ceny ofertowej. */
  bidProposal?: TenderBidProposal | null;
  /** Podsumowanie skanowania załączników (P2-E.0). */
  scanSummary?: import("@/lib/tender-dossier-pipeline").TenderDossierScanSummary | null;
  /** Wartość z analizy kosztorysu (gdy brak w SWZ). P2-E.3 SSOT priorytet #3. */
  estimatePln?: number | null;
  /** TP200A — wersja parsera dossier; brak = legacy snapshot sprzed PDF recovery. */
  parserVersion?: number;
  /**
   * COST-MULTI-02 Force Rescan — soft invalidate Heavy (DF).
   * Gdy ustawione: tenderDossierHeavyParseDone === false; Heavy REUSE; po sukcesie czyszczone.
   */
  forceHeavyRescanAt?: string;
  builtAt: string;
}

export function mergeBriefWithItemTitle(brief: TenderBrief, title: string): TenderBrief {
  if (!brief.scopeDescription && title.length > 10) {
    return { ...brief, scopeDescription: title };
  }
  return brief;
}
