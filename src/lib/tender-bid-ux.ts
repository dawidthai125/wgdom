/**
 * P2-G.1D — UX wyceny: discoverability, explainability (bez logiki kalkulatora).
 */

import type { TenderBidPricingMode } from "@/lib/tenders-bid-calculator";

export const OUR_ESTIMATE_TILE_NAV_HINT = "Kliknij, aby zobaczyć szczegóły";

export const TENDER_BID_PROPOSAL_PANEL_ID = "tender-bid-proposal-panel";

/** Kroki opisu „Jak powstała wycena?” — zależne od źródła. */
export function buildBidFlowExplanation(
  pricingMode: TenderBidPricingMode | null | undefined,
): string[] {
  if (pricingMode === "catalog") {
    return [
      "Przedmiar ATH (ilości bez cen inwestora)",
      "Klasyfikacja robót WGDOM",
      "Katalog stawek WGDOM (materiał + rbh)",
      "Robocizna (lista płac + ZUS)",
      "Materiały (indeks cen)",
      "Koszty pośrednie firmy (Kp, poboczne, stałe)",
      "Marża i rezerwa ryzyka",
      "Rekomendowana oferta",
    ];
  }
  if (pricingMode === "ath_priced") {
    return [
      "Kosztorys ATH inwestora (ceny pozycji)",
      "Podział robocizna / materiały",
      "Robocizna (lista płac + ZUS)",
      "Materiały (indeks cen rynkowych)",
      "Koszty pośrednie firmy (Kp, poboczne, stałe)",
      "Marża i rezerwa ryzyka",
      "Rekomendowana oferta",
    ];
  }
  return [
    "Wczytaj kosztorys ATH",
    "Uruchom kalkulator oferty",
    "Rekomendowana oferta",
  ];
}

export function canNavigateToBidDetails(
  bidProposalOk: boolean | undefined,
  ourEstimatePln: number | null | undefined,
): boolean {
  return Boolean(bidProposalOk) || ourEstimatePln != null;
}

/** Id sekcji profilu firmy (test + a11y). */
export const PROFILE_SECTION_IDS = {
  costIntelligence: "profile-section-cost-intelligence",
  qualification: "profile-section-qualification",
  regions: "profile-section-regions",
  classificationDictionary: "profile-section-classification-dictionary",
  advanced: "profile-section-advanced",
} as const;

export const PROFILE_SECTION_TITLES = {
  costIntelligence: "Tender Cost Intelligence",
  qualification: "Profil kwalifikacyjny",
  regions: "Regiony działania",
  classificationDictionary: "WGDOM Classification Dictionary",
  advanced: "Zaawansowane",
} as const;

export type ClassificationCoverageTone = "good" | "warn" | "bad";

/** Cel WGDOM: 97%+ pokrycia — zielony >97, żółty 90–97, czerwony <90. */
export function classificationCoverageTone(percent: number): ClassificationCoverageTone {
  if (percent > 97) return "good";
  if (percent >= 90) return "warn";
  return "bad";
}

export function classificationCoverageToneClass(tone: ClassificationCoverageTone): string {
  if (tone === "good") return "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/25";
  if (tone === "warn") return "text-amber-800 dark:text-amber-200 bg-amber-500/10 border-amber-500/25";
  return "text-red-700 dark:text-red-300 bg-red-500/10 border-red-500/25";
}

/** Pola modelu kosztów — krótkie opisy wpływu na wycenę. */
export const COST_FIELD_HINTS: Record<string, string> = {
  avgGrossHourlyPln: "Wpływa bezpośrednio na koszt robocizny w wycenie realizacji.",
  employerBurdenPct: "Składki pracodawcy — podwyższa koszt rbh w ofercie.",
  kpPct: "Koszty pośrednie budowy — dodawane do kosztu wykonania.",
  profitPct: "Wpływa na rekomendowaną cenę oferty (zysk firmy).",
  riskReservePct: "Dodawane do kosztu wykonania jako rezerwa na ryzyko.",
  minMarginPct: "Minimalna marża — próg opłacalności (oferta minimalna).",
  fixedOverheadMonthlyPln: "Stałe firmy (KZP) — rozliczane na czas trwania roboty.",
  materialPriceIndexPct: "Korekta cen materiałów względem normy ATH / katalogu.",
  laborNormIndexPct: "Korekta norm rbh — wpływa na koszt robocizny.",
  targetPriceDiscountPct: "Przy dominacji kryterium ceny — cel konkurencyjny oferty.",
  catalogMaterial: "Stawka materiałowa kategorii — wpływa na wycenę z przedmiaru bez cen.",
  catalogLabor: "Norma rbh kategorii — wpływa na koszt robocizny z katalogu.",
};
