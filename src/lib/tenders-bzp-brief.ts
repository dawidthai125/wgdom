/** Brief przetargu — ustrukturyzowane dane z ogłoszenia HTML i SWZ (bez linków zewnętrznych). */

import { stripHtmlToText, type TenderCostLine } from "@/lib/tenders-bzp-swz";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { TenderBzpDocument } from "@/lib/tenders-bzp";
import type { AthPreviewResult } from "@/lib/ath-parser";
import { extractTotalValueFromAthPreview } from "@/lib/tender-cost-snapshot";

export type { TenderCostLine };

export interface TenderBriefField {
  label: string;
  value: string;
}

export interface TenderPrzedmiarLine {
  description: string;
  quantity: string;
  formula?: string;
}

/** Lekkie wiersze pod wycenę katalogową P2-G — bez cen, do 250 poz. */
export interface TenderCatalogQuantityLine {
  lp: string;
  description: string;
  unit: string;
  quantity: string;
}

export const CATALOG_QUANTITIES_CAP = 250;

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
  przedmiar: TenderPrzedmiarLine[];
  categories: { name: string; total: string }[];
  warnings: string[];
  parsedAt: string;
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

export function buildCatalogQuantitiesFromPreview(
  preview: AthPreviewResult,
): TenderCatalogQuantityLine[] {
  return preview.rows
    .slice(0, CATALOG_QUANTITIES_CAP)
    .filter((r) => r.description?.trim())
    .map((r) => ({
      lp: r.lp,
      description: r.description,
      unit: r.unit,
      quantity: r.quantity,
    }));
}

export function athPreviewToSnapshot(
  preview: AthPreviewResult,
  sourceFilename: string,
): TenderKosztorysSnapshot {
  const catalogQuantities = buildCatalogQuantitiesFromPreview(preview);
  const rows: TenderCostLine[] = preview.rows.slice(0, 40).map((r) => ({
    lp: r.lp,
    description: r.description,
    unit: r.unit,
    quantity: r.quantity,
    unitPrice: r.unitPrice,
    total: r.total,
  }));
  const przedmiar: TenderPrzedmiarLine[] = [];
  for (const r of preview.rows.slice(0, 25)) {
    for (const p of r.przedmiar ?? []) {
      przedmiar.push({
        description: r.description.slice(0, 80),
        quantity: p.quantity,
        formula: p.formula,
      });
    }
  }
  return {
    ok: preview.ok || preview.rows.length > 0 || Boolean(preview.totalValue)
      || (preview.summaryLines?.length ?? 0) > 0,
    sourceFilename,
    title: preview.title,
    totalValue: preview.totalValue || extractTotalValueFromAthPreview(preview),
    currency: preview.currency,
    rowCount: preview.rows.length,
    rows,
    catalogQuantities,
    przedmiar: przedmiar.slice(0, 30),
    categories: (preview.categories ?? []).slice(0, 12).map((c) => ({
      name: c.name,
      total: c.total,
    })),
    warnings: preview.warnings.slice(0, 5),
    parsedAt: new Date().toISOString(),
  };
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
  builtAt: string;
}

export function mergeBriefWithItemTitle(brief: TenderBrief, title: string): TenderBrief {
  if (!brief.scopeDescription && title.length > 10) {
    return { ...brief, scopeDescription: title };
  }
  return brief;
}
