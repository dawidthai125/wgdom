/**
 * P5.25-FIX — text / unit / action-context helpers for INTERNAL-FIRST.
 * Soft-normalize WITHOUT stripping action verbs (montaż ≠ gniazdo).
 * Pure · ZERO HTTP.
 */

const STOP = new Set([
  "a",
  "i",
  "o",
  "w",
  "z",
  "na",
  "do",
  "od",
  "po",
  "za",
  "ze",
  "dla",
  "oraz",
  "lub",
  "the",
  "of",
  "mm",
  "sr",
  "nr",
]);

/** Action / process stems that decide MATERIAL vs PACKAGE vs LABOR. */
export const INTERNAL_FIRST_ACTION_STEMS = [
  "montaz",
  "wymiana",
  "demontaz",
  "wykonanie",
  "przygotowanie",
  "naprawa",
  "szpachlowanie",
  "malowanie",
  "malowan",
  "gruntowanie",
  "gruntowan",
  "wykucie",
  "zamurowanie",
  "zamurowan",
  "izolacja",
  "izolac",
  "podejscie",
  "podejsc",
] as const;

export function softInternalFirstText(s: unknown): string {
  return String(s || "")
    .toLowerCase()
    // Polish Ł/ł does not NFD-decompose to ASCII — map before strip
    .replace(/ł/g, "l")
    .replace(/Ł/g, "l")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokensInternalFirst(s: unknown): string[] {
  return softInternalFirstText(s)
    .split(" ")
    .filter((t) => t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t));
}

/**
 * Unit normalization — m↔mb, m2↔m², m3↔m³, szt↔szt.
 * Unit alone NEVER implies a price match.
 */
export function mapInternalFirstUnit(u: unknown): string {
  let raw = String(u || "")
    .toLowerCase()
    .trim();
  // Preserve superscripts before NFD strip
  raw = raw.replace(/m²/g, "m2").replace(/m³/g, "m3").replace(/m\^2/g, "m2").replace(/m\^3/g, "m3");
  raw = raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\./g, "")
    .replace(/\s+/g, "");
  if (raw === "m" || raw === "mb" || raw === "metr" || raw === "m.b") return "mb";
  if (raw === "m2" || raw.includes("m2")) return "m2";
  if (raw === "m3" || raw.includes("m3")) return "m3";
  if (raw === "szt" || raw === "sztuka" || raw === "sztuki") return "szt";
  if (raw === "kpl" || raw === "komplet") return "kpl";
  if (raw === "h" || raw === "godz" || raw === "rbh") return "h";
  if (raw.includes("pomiar")) return "pomiar";
  /**
   * ATH source unit `msc.` / `msc` = miesiąc (month). P5.26-FIX:
   * preserve as known token — do NOT invent alias to szt without Owner GO.
   * Research routing must not crash; qualify may still unit-mismatch vs szt offers.
   */
  if (raw === "msc" || raw === "miesiac" || raw === "miesiac.") return "msc";
  return raw || "unknown";
}

export function unitsCompatibleInternalFirst(a: unknown, b: unknown): boolean {
  const x = mapInternalFirstUnit(a);
  const y = mapInternalFirstUnit(b);
  if (x === "unknown" || y === "unknown") return true;
  if (x === y) return true;
  if ((x === "mb" || x === "m") && (y === "mb" || y === "m")) return true;
  /**
   * ATH `msc.` (miesiąc) often coexists with piece-priced service offers (szt)
   * on plumbing approaches — allow research identity compare only; never invent BASE.
   * P5.26-FIX G090: unit mapping must not abort categoryKey/PASS2 path.
   */
  if ((x === "msc" && y === "szt") || (x === "szt" && y === "msc")) return true;
  return false;
}

export function extractActionStems(text: unknown): string[] {
  const soft = softInternalFirstText(text);
  const out: string[] = [];
  for (const stem of INTERNAL_FIRST_ACTION_STEMS) {
    if (soft.includes(stem) && !out.includes(stem)) out.push(stem);
  }
  return out;
}

export type ActionContextCompat = {
  ok: boolean;
  reasonCode: string;
};

/**
 * Preserve domain meaning of action verbs.
 * PACKAGE/LABOR with montaż/wymiana/… must not match product-only labels.
 */
export function actionContextCompatible(
  sourceDesc: unknown,
  candidateName: unknown,
  sourceDomain: string,
): ActionContextCompat {
  const q = softInternalFirstText(sourceDesc);
  const w = softInternalFirstText(candidateName);
  const qActions = extractActionStems(q);
  const wActions = extractActionStems(w);
  const domain = String(sourceDomain || "").toUpperCase();

  if (/wykucie/.test(q) && /zaprawian/.test(w)) {
    return { ok: false, reasonCode: "wykucie≠zaprawianie" };
  }
  if (/zaprawian/.test(q) && /wykucie/.test(w)) {
    return { ok: false, reasonCode: "zaprawianie≠wykucie" };
  }
  if (/zamurowan/.test(q) && /wykucie|wnek/.test(w)) {
    return { ok: false, reasonCode: "zamurowanie≠wykucie" };
  }
  if (/wykucie/.test(q) && /zamurowan/.test(w)) {
    return { ok: false, reasonCode: "wykucie≠zamurowanie" };
  }
  if (/demontaz/.test(q) && /montaz/.test(w) && !/demontaz/.test(w)) {
    return { ok: false, reasonCode: "demontaż≠montaż" };
  }
  if (/montaz/.test(q) && /demontaz/.test(w) && !/montaz/.test(w)) {
    return { ok: false, reasonCode: "montaż≠demontaż" };
  }
  if (/gruntowan/.test(q) && /malowan|tynk/.test(w) && !/gruntowan/.test(w)) {
    return { ok: false, reasonCode: "gruntowanie≠other" };
  }

  // PACKAGE with install/replace verbs cannot reuse product-only names
  if (
    domain === "LABOR_MATERIAL_PACKAGE" &&
    qActions.length > 0 &&
    wActions.length === 0 &&
    (/montaz|wymiana|wykonanie|izolac|malowan|podejsc/.test(q))
  ) {
    return { ok: false, reasonCode: "PACKAGE_ACTION_VS_PRODUCT_ONLY" };
  }

  // Same stem family conflict (simplified)
  const stems = [
    "zamurowan",
    "wykucie",
    "bruzd",
    "demontaz",
    "montaz",
    "przebic",
    "gniazd",
    "kuchni",
    "gruntowan",
    "malowan",
    "odbicie",
    "rozebranie",
    "obsadzenie",
    "mycie",
    "izolac",
    "bateri",
    "podejsc",
  ];
  const qStem = stems.find((s) => q.includes(s));
  const wStem = stems.find((s) => w.includes(s));
  if (
    qStem &&
    wStem &&
    qStem !== wStem &&
    !(qStem === "bruzd" && wStem === "wykucie") &&
    !(qStem === "wykucie" && wStem === "bruzd") &&
    // allow gniazd overlap only when actions also align (PACKAGE both have montaż)
    !(qStem === "gniazd" && wStem === "gniazd")
  ) {
    // product stem mismatch with different action already handled; keep stem reject for process words
    if (
      ["zamurowan", "wykucie", "demontaz", "montaz", "gruntowan", "malowan", "izolac"].includes(
        qStem,
      ) ||
      ["zamurowan", "wykucie", "demontaz", "montaz", "gruntowan", "malowan", "izolac"].includes(
        wStem,
      )
    ) {
      if (qStem !== wStem) {
        return { ok: false, reasonCode: `stem_${qStem}≠${wStem}` };
      }
    }
  }

  return { ok: true, reasonCode: "ACTION_OK" };
}
