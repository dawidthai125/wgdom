/**
 * P1D — Work Scope Inference: główne roboty z opisów pozycji (frontend, bez parsera).
 */

import type { AthPreviewResult } from "@/lib/ath-parser";

export const WORK_SCOPE_MAX_GROUPS = 5;

const SKIP_CATEGORY_NAMES =
  /^(razem|suma|ogółem|ogolem|netto|brutto|całkowit|calkowit|wartość|wartosc|kosztorys|narzut|podatek|vat)\b/i;

const KNR_CODE_ONLY =
  /^(?:knr\s*)?[\d]+(?:[-\s./][\d]+)+(?:\s*[\d.]*)*$/i;

const POSITION_CODE =
  /^[\d]{2,}(?:[.\-/][\d]+)+$/;

/** Normalizacja klucza do deduplikacji (bez diakrytyków, lowercase). */
export function normalizeCategoryKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z")
    .replace(/\s+/g, " ")
    .trim();
}

/** Czyści nazwę działu — bez kodów KNR i numerów pozycji. */
export function sanitizeWorkCategoryName(raw: string): string | null {
  let name = raw.replace(/\s+/g, " ").trim();
  if (!name || name.length < 3) return null;
  if (SKIP_CATEGORY_NAMES.test(name)) return null;

  if (/^knr\s/i.test(name)) {
    const human = name.replace(/^knr\s*[\d\-.\s/]+(?:\s*[-–—]\s*)?/i, "").trim();
    if (human.length >= 3 && !KNR_CODE_ONLY.test(human)) name = human;
    else return null;
  }

  if (KNR_CODE_ONLY.test(name) || POSITION_CODE.test(name)) return null;

  name = name.replace(/^[\d.]+\s*[-–—.]?\s*/, "").trim();
  name = name.replace(/\s*\([\d.\-/]+\)\s*$/, "").trim();

  if (!name || name.length < 3) return null;
  if (KNR_CODE_ONLY.test(name) || POSITION_CODE.test(name)) return null;
  if (/^\d+$/.test(name)) return null;

  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Usuwa duplikaty (case-insensitive), zachowuje kolejność pierwszego wystąpienia. */
export function dedupeWorkCategories(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const clean = sanitizeWorkCategoryName(raw);
    if (!clean) continue;
    const key = normalizeCategoryKey(clean);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= WORK_SCOPE_MAX_GROUPS) break;
  }
  return out;
}

export type WorkScopeConfidence = "high" | "medium" | "low";

export type WorkScopeSource =
  | "categories"
  | "parse_categories"
  | "row_categories"
  | "descriptions"
  | "catalog"
  | "scope";

export interface WorkScopeGroupDef {
  id: string;
  label: string;
  keywords: string[];
}

/** Słownik branżowy — frazy po foldPolish (bez ogonków). */
export const WORK_SCOPE_GROUPS: WorkScopeGroupDef[] = [
  {
    id: "kanalizacja",
    label: "Kanalizacja sanitarna",
    keywords: [
      "kanal", "kanalizac", "studz", "studnia", "pvc", "sanitarn",
      "deszczow", "sciek", "separator", "przepompown", "kolanko",
      "wpust", "odplyw", "drenaz", "dren",
    ],
  },
  {
    id: "wodociag",
    label: "Instalacje wodociągowe",
    keywords: [
      "wodociag", "wod-kan", "hydrant", "rura pe", "siec wodociag",
      "przylacz wod", "wodociagowa", "zawor wod", "uzdatnian",
    ],
  },
  {
    id: "drogi",
    label: "Odtworzenie nawierzchni",
    keywords: [
      "jezdn", "nawierzchn", "asfalt", "kostk", "chodnik", "kraweznik",
      "krawednik", "bruk", "beton podloz", "warstwa scieraln", "utwardzen",
      "nawierzchni drogow", "pobocz",
    ],
  },
  {
    id: "elektryka",
    label: "Instalacje elektryczne",
    keywords: [
      "kabel", "oswietlen", "opraw", "slup oswiet", "rozdzieln",
      "gniazd", "instalacj elektr", "elektryczn", "oświetl", "latarn",
      "przewod elektr", "tablic rozdziel",
    ],
  },
  {
    id: "kubatura",
    label: "Roboty kubaturowe",
    keywords: [
      "scian", "strop", "tynk", "posadzk", "dach", "fundament",
      "murow", "zbrojen", "szalunk", "belk", "scianka dzial",
      "sufit podwiesz", "gladz gips",
    ],
  },
  {
    id: "termomodernizacja",
    label: "Termomodernizacja",
    keywords: [
      "ocieplen", "styropian", "welna", "elewacj", "docieplen",
      "izolacj ciepln", "termomoderniz", "fasad", "wełna mineral",
    ],
  },
  {
    id: "ziemne",
    label: "Roboty ziemne",
    keywords: [
      "wykop", "zasypk", "humus", "grunt", "nasyp", "niwelacj teren",
      "zagospodarowan teren", "odszkodowan teren", "roboty ziemn",
      "korytow", "podloze pod nawierzchn",
    ],
  },
  {
    id: "rozbiórki",
    label: "Rozbiórki",
    keywords: [
      "rozbior", "demontaz", "wyburzen", "rozkuc", "usunieci nawierzchn",
      "sciecie", "wykuc",
    ],
  },
];

const GROUP_LABEL_OVERRIDES: { pattern: string; label: string }[] = [
  { pattern: "studz", label: "Studnie rewizyjne" },
  { pattern: "deszczow", label: "Kanalizacja deszczowa" },
  { pattern: "asfalt", label: "Warstwy asfaltowe" },
  { pattern: "kostk", label: "Nawierzchnie z kostki" },
];

function foldPolish(s: string): string {
  return s
    .toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z");
}

function pickGroupLabel(group: WorkScopeGroupDef, matchedKeywords: string[]): string {
  for (const override of GROUP_LABEL_OVERRIDES) {
    if (matchedKeywords.some((k) => k.includes(override.pattern))) {
      return override.label;
    }
  }
  return group.label;
}

export interface WorkScopeHit {
  groupId: string;
  label: string;
  hits: number;
}

/** Zlicza trafienia słów kluczowych w tekście (1 trafienie na grupę na linię). */
export function scoreWorkScopeTexts(texts: string[]): WorkScopeHit[] {
  const counts = new Map<string, { group: WorkScopeGroupDef; hits: number; keywords: Set<string> }>();

  for (const raw of texts) {
    const hay = foldPolish(raw);
    if (!hay || hay.length < 4) continue;

    for (const group of WORK_SCOPE_GROUPS) {
      let lineHit = false;
      const matchedKw: string[] = [];
      for (const kw of group.keywords) {
        if (hay.includes(kw)) {
          lineHit = true;
          matchedKw.push(kw);
        }
      }
      if (!lineHit) continue;

      const prev = counts.get(group.id);
      if (prev) {
        prev.hits += 1;
        for (const k of matchedKw) prev.keywords.add(k);
      } else {
        counts.set(group.id, { group, hits: 1, keywords: new Set(matchedKw) });
      }
    }
  }

  return [...counts.values()]
    .map(({ group, hits, keywords }) => ({
      groupId: group.id,
      label: pickGroupLabel(group, [...keywords]),
      hits,
    }))
    .sort((a, b) => b.hits - a.hits);
}

export function workScopeHitsToLabels(hits: WorkScopeHit[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const hit of hits) {
    const key = normalizeCategoryKey(hit.label);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit.label);
    if (out.length >= WORK_SCOPE_MAX_GROUPS) break;
  }
  return out;
}

export function inferWorkScopeFromTexts(texts: string[]): {
  mainWorks: string[];
  hits: WorkScopeHit[];
  totalHits: number;
  maxGroupHits: number;
} {
  const hits = scoreWorkScopeTexts(texts);
  const totalHits = hits.reduce((s, h) => s + h.hits, 0);
  const maxGroupHits = hits[0]?.hits ?? 0;
  return {
    mainWorks: workScopeHitsToLabels(hits),
    hits,
    totalHits,
    maxGroupHits,
  };
}

export function mapWorkScopeConfidence(
  totalHits: number,
  maxGroupHits: number,
  source: WorkScopeSource,
): WorkScopeConfidence | null {
  if (totalHits <= 0) return null;

  if (source === "categories" || source === "parse_categories") {
    return "high";
  }

  if (maxGroupHits >= 10 || totalHits >= 25) return "high";
  if (maxGroupHits >= 3 || totalHits >= 8) return "medium";
  return "low";
}

export const WORK_SCOPE_CONFIDENCE_LABELS: Record<WorkScopeConfidence, string> = {
  high: "Wysoka",
  medium: "Średnia",
  low: "Niska",
};

export function collectDescriptionTexts(opts: {
  rowDescriptions?: string[] | null;
  catalogDescriptions?: string[] | null;
  scopeDescription?: string | null;
}): string[] {
  const texts: string[] = [];
  for (const d of opts.rowDescriptions ?? []) {
    if (d?.trim()) texts.push(d.trim());
  }
  for (const d of opts.catalogDescriptions ?? []) {
    if (d?.trim()) texts.push(d.trim());
  }
  if (opts.scopeDescription?.trim()) {
    texts.push(opts.scopeDescription.trim());
  }
  return texts;
}

export interface WorkScopeInferenceInput {
  snapshotCategoryNames?: string[] | null;
  catalogDescriptions?: string[] | null;
  scopeDescription?: string | null;
  parseResult?: AthPreviewResult | null;
  rowDescriptions?: string[] | null;
}

export interface WorkScopeInferenceResult {
  mainWorks: string[];
  confidence: WorkScopeConfidence | null;
  confidenceLabel: string | null;
  source: WorkScopeSource | null;
}

function dedupeLabels(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const key = normalizeCategoryKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= WORK_SCOPE_MAX_GROUPS) break;
  }
  return out;
}

function namesFromParseCategories(parseResult?: AthPreviewResult | null): string[] {
  const cats = parseResult?.categories?.filter((c) => c.name?.trim()) ?? [];
  if (!cats.length) return [];
  const topLevel = cats.filter((c) => (c.level ?? 1) <= 1);
  return (topLevel.length > 0 ? topLevel : cats).map((c) => c.name.trim());
}

function namesFromRowCategories(parseResult?: AthPreviewResult | null): string[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const row of parseResult?.rows ?? []) {
    const raw = row.category?.trim();
    if (!raw) continue;
    const key = normalizeCategoryKey(raw);
    const prev = counts.get(key);
    if (prev) prev.count += 1;
    else counts.set(key, { label: raw, count: 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .map((e) => e.label);
}

function rowDescriptionTexts(parseResult?: AthPreviewResult | null): string[] {
  return (parseResult?.rows ?? [])
    .map((r) => r.description?.trim())
    .filter((d): d is string => Boolean(d));
}

/** Pełna kolejność źródeł P1D. */
export function inferWorkScope(input: WorkScopeInferenceInput): WorkScopeInferenceResult {
  const empty: WorkScopeInferenceResult = {
    mainWorks: [],
    confidence: null,
    confidenceLabel: null,
    source: null,
  };

  const fromSnapshot = dedupeLabels(input.snapshotCategoryNames ?? []);
  if (fromSnapshot.length > 0) {
    return {
      mainWorks: fromSnapshot,
      confidence: "high",
      confidenceLabel: WORK_SCOPE_CONFIDENCE_LABELS.high,
      source: "categories",
    };
  }

  const fromParseCats = dedupeLabels(namesFromParseCategories(input.parseResult));
  if (fromParseCats.length > 0) {
    return {
      mainWorks: fromParseCats,
      confidence: "high",
      confidenceLabel: WORK_SCOPE_CONFIDENCE_LABELS.high,
      source: "parse_categories",
    };
  }

  const fromRowCats = dedupeLabels(namesFromRowCategories(input.parseResult));
  if (fromRowCats.length > 0) {
    const conf = mapWorkScopeConfidence(fromRowCats.length, fromRowCats.length, "row_categories");
    return {
      mainWorks: fromRowCats,
      confidence: conf,
      confidenceLabel: conf ? WORK_SCOPE_CONFIDENCE_LABELS[conf] : null,
      source: "row_categories",
    };
  }

  const rowDescs = [
    ...(input.rowDescriptions ?? []),
    ...rowDescriptionTexts(input.parseResult),
  ];
  if (rowDescs.length > 0) {
    const inferred = inferWorkScopeFromTexts(rowDescs);
    if (inferred.mainWorks.length > 0) {
      const conf = mapWorkScopeConfidence(inferred.totalHits, inferred.maxGroupHits, "descriptions");
      return {
        mainWorks: inferred.mainWorks,
        confidence: conf,
        confidenceLabel: conf ? WORK_SCOPE_CONFIDENCE_LABELS[conf] : null,
        source: "descriptions",
      };
    }
  }

  const catalogDescs = input.catalogDescriptions ?? [];
  if (catalogDescs.length > 0) {
    const inferred = inferWorkScopeFromTexts(catalogDescs);
    if (inferred.mainWorks.length > 0) {
      const conf = mapWorkScopeConfidence(inferred.totalHits, inferred.maxGroupHits, "catalog");
      return {
        mainWorks: inferred.mainWorks,
        confidence: conf,
        confidenceLabel: conf ? WORK_SCOPE_CONFIDENCE_LABELS[conf] : null,
        source: "catalog",
      };
    }
  }

  if (input.scopeDescription?.trim()) {
    const inferred = inferWorkScopeFromTexts([input.scopeDescription]);
    if (inferred.mainWorks.length > 0) {
      const conf = mapWorkScopeConfidence(inferred.totalHits, inferred.maxGroupHits, "scope");
      return {
        mainWorks: inferred.mainWorks,
        confidence: conf ?? "low",
        confidenceLabel: WORK_SCOPE_CONFIDENCE_LABELS[conf ?? "low"],
        source: "scope",
      };
    }
  }

  return empty;
}
