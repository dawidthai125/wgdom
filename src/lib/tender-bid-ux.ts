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
  advanced: "profile-section-advanced",
} as const;

export const PROFILE_SECTION_TITLES = {
  costIntelligence: "Tender Cost Intelligence",
  qualification: "Profil kwalifikacyjny",
  regions: "Regiony działania",
  advanced: "Zaawansowane",
} as const;

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
