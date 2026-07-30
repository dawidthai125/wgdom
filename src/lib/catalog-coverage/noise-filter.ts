/**
 * CATALOG-COVERAGE-01 P0a — Noise Filter (pure / ephemeral).
 * DF §2.1 · AR-B1 · AR-B4: idempotentny · zero zapisu · nie mapuje.
 *
 * Zakaz: Normalizer · Alias · Coverage Score · drugi Mapper · write Library/Quotes.
 */

import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import type { OfferBoqLine } from "@/lib/tender-offer-boq";
import type {
  CatalogCoverageNoiseFilterStats,
  CatalogCoverageNoiseKind,
  CatalogCoverageNoiseResult,
} from "@/lib/catalog-coverage/types";

const EMPTY_BY_KIND = (): Record<CatalogCoverageNoiseKind, number> => ({
  kalkulacja_wlasna: 0,
  transport: 0,
  lp_artifact: 0,
  smieci_krotkie: 0,
});

const RE_KALKULACJA = /\bkalkulacja\s+w[lł]asna\b/i;
/** Artefakt LP / sama liczba (np. „.4 2”, „12”, „3.1”). */
const RE_LP_ARTIFACT = /^[\s.]*\d+(\.\d+)?([\s.]+\d+(\.\d+)?)?[\s.]*$/;
/**
 * Transport niemateriałowy — bez „Dostawa i montaż …” (false positive z AUDIT classify).
 * Wymaga słowa transport/przewóz LUB samej „dostawa” bez montażu/instalacji.
 */
const RE_TRANSPORT_WORD = /\btransport\b|\bprzew[oó]z\b/i;
const RE_DOSTAWA_STANDALONE =
  /^(?:\[[^\]]*\])?\s*dostawa(\s+(materiał[oó]w|materia[lł]u|na\s+budow[eę]))?\s*$/i;
/** Sygnał roboty materiałowej / montażowej → nie filtruj jako transport. */
const RE_MATERIAL_WORK =
  /\bmonta[zż]|\binstalac|\buk[lł]ad|\bwymiana|\bdemonta[zż]|\bukladan|\bprzy[lł][aą]cz/i;
/** Realny KNR w opisie → nie drop (DF: idzie do Normalizer), poza kalkulacją własną. */
const RE_KNR_SIGNAL = /\b\d{3,4}-\d{2}\b|\bKNR\b|\bKNNR\b/i;

const REASON_PL: Record<CatalogCoverageNoiseKind, string> = {
  kalkulacja_wlasna: "Noise Filter: kalkulacja własna (pozycja niemateriałowa).",
  transport: "Noise Filter: transport / przewóz (pozycja niemateriałowa).",
  lp_artifact: "Noise Filter: artefakt LP / numer bez opisu robót.",
  smieci_krotkie: "Noise Filter: pusty / zbyt krótki opis.",
};

export function hasCatalogCoverageKnrSignal(
  description: string,
  knrHint?: string | null,
): boolean {
  if (knrHint && String(knrHint).trim()) return true;
  return RE_KNR_SIGNAL.test(description || "");
}

/**
 * Klasyfikuje opis linii ATH jako noise lub eligible.
 * Pure · deterministyczny · bez I/O.
 */
export function classifyOfferBoqLineNoise(
  description: string,
  knrHint?: string | null,
): CatalogCoverageNoiseResult {
  const raw = description ?? "";
  const trimmed = raw.trim();
  const folded = foldPolishText(trimmed);

  // LP / numer przed smieci (np. „12” ma ≤3 znaki, ale to artefakt LP).
  if (RE_LP_ARTIFACT.test(trimmed)) {
    return {
      isNoise: true,
      noiseKind: "lp_artifact",
      reasonPl: REASON_PL.lp_artifact,
    };
  }

  if (trimmed.length <= 3) {
    return {
      isNoise: true,
      noiseKind: "smieci_krotkie",
      reasonPl: REASON_PL.smieci_krotkie,
    };
  }

  if (RE_KALKULACJA.test(trimmed) || RE_KALKULACJA.test(folded)) {
    return {
      isNoise: true,
      noiseKind: "kalkulacja_wlasna",
      reasonPl: REASON_PL.kalkulacja_wlasna,
    };
  }

  const knrGuard = hasCatalogCoverageKnrSignal(trimmed, knrHint);
  const materialWork = RE_MATERIAL_WORK.test(trimmed) || RE_MATERIAL_WORK.test(folded);
  const transportWord = RE_TRANSPORT_WORD.test(trimmed) || RE_TRANSPORT_WORD.test(folded);
  const dostawaStandalone = RE_DOSTAWA_STANDALONE.test(trimmed);

  if (!knrGuard && !materialWork && (transportWord || dostawaStandalone)) {
    return {
      isNoise: true,
      noiseKind: "transport",
      reasonPl: REASON_PL.transport,
    };
  }

  return { isNoise: false, noiseKind: null, reasonPl: null };
}

/**
 * Oznacza linię jako noise i pomija Mapper (brak catalogWorkId).
 * Nie mutuje input — zwraca nową linię. Zero zapisu Library/Quotes.
 */
export function applyOfferBoqNoiseSkip(line: OfferBoqLine): OfferBoqLine {
  const noise = classifyOfferBoqLineNoise(line.description, line.knrHint);
  if (!noise.isNoise || !noise.noiseKind) {
    return {
      ...line,
      isNoise: false,
      noiseKind: null,
    };
  }
  return {
    ...line,
    catalogWorkId: null,
    workCategory: null,
    categoryId: null,
    matchMethod: "unmatched",
    matchedBy: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
    aiConfidence: "low",
    aiRationale: noise.reasonPl,
    isNoise: true,
    noiseKind: noise.noiseKind,
  };
}

/**
 * Pre-map: noise → skip Mapper; else → caller woła mapOfferBoqLine (REUSE).
 */
export function prepareOfferBoqLineForMapping(line: OfferBoqLine): {
  noise: CatalogCoverageNoiseResult;
  skipMapper: boolean;
  line: OfferBoqLine;
} {
  const noise = classifyOfferBoqLineNoise(line.description, line.knrHint);
  if (noise.isNoise) {
    return {
      noise,
      skipMapper: true,
      line: applyOfferBoqNoiseSkip(line),
    };
  }
  return {
    noise,
    skipMapper: false,
    line: {
      ...line,
      isNoise: false,
      noiseKind: null,
    },
  };
}

export function summarizeNoiseFilter(
  results: ReadonlyArray<CatalogCoverageNoiseResult>,
): CatalogCoverageNoiseFilterStats {
  const byKind = EMPTY_BY_KIND();
  let noiseCount = 0;
  for (const r of results) {
    if (r.isNoise && r.noiseKind) {
      noiseCount += 1;
      byKind[r.noiseKind] += 1;
    }
  }
  const lineCount = results.length;
  const eligibleCount = lineCount - noiseCount;
  const noisePct = lineCount === 0 ? 0 : Math.round((noiseCount / lineCount) * 1000) / 10;
  return { lineCount, noiseCount, eligibleCount, noisePct, byKind };
}

/** Agregat logów / harness — przykłady odrzuconych. */
export function collectNoiseFilterSamples(
  lines: ReadonlyArray<{ description: string; knrHint?: string | null; lp?: string }>,
  limit = 8,
): Array<{ lp: string; description: string; noiseKind: CatalogCoverageNoiseKind }> {
  const out: Array<{ lp: string; description: string; noiseKind: CatalogCoverageNoiseKind }> = [];
  for (const l of lines) {
    const n = classifyOfferBoqLineNoise(l.description, l.knrHint);
    if (n.isNoise && n.noiseKind) {
      out.push({
        lp: l.lp ?? "",
        description: (l.description || "").slice(0, 160),
        noiseKind: n.noiseKind,
      });
      if (out.length >= limit) break;
    }
  }
  return out;
}
