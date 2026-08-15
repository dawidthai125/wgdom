/**
 * INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE — Owner FINAL map (code-frozen).
 * Source: INTELLIGENT-ESTIMATOR-LABOR-MATERIAL-FLOW-OWNER-DECISION-CLOSEOUT
 * Counts: LABOR 30 · MATERIAL 24 · COMPOUND 5 · UNKNOWN 30 · total 89
 * A1: ZERO heuristics · ZERO remap · ZERO expand · miss → UNKNOWN
 * P5.11 Owner GO: cc-p0c-w1-zaprawianie-bruzd COMPOUND → LABOR (no explicit material component).
 */

import type { EstimatorPricingPlane } from "./classification-types";

export const ESTIMATOR_OWNER_CLASSIFICATION_COUNTS = Object.freeze({
  LABOR: 30,
  MATERIAL: 24,
  COMPOUND: 5,
  UNKNOWN: 30,
  TOTAL: 89,
});

export const ESTIMATOR_OWNER_CLASSIFICATION_MAP: Readonly<
  Record<string, EstimatorPricingPlane>
> = Object.freeze({
  "cc-p0c-w1-multiswitch-antenowy": "MATERIAL",
  "cc-p0c-w1-stop-ptakow": "MATERIAL",
  "cc-p0c-w1-zabezpieczenie-folia": "COMPOUND",
  "cc-p0c-w1-zaprawianie-bruzd": "LABOR",
  "cc-p0c-w1-zawor-odpowietrzajacy": "MATERIAL",
  "cc-w2-mocowanie-aparatow": "LABOR",
  "cc-w2-oczyszczenie-podloza": "LABOR",
  "cc-w2-plyta-gk-zabudowa": "LABOR",
  "cc-w2-przebijanie-otworow": "LABOR",
  "cc-w2-przygotowanie-osprzet": "LABOR",
  "cc-w2-wykucie-wnek": "LABOR",
  "cc-w2-wykwity-zacieki": "LABOR",
  "cc-w2-zawor-odcinajacy": "MATERIAL",
  "cw.etics.boards": "MATERIAL",
  "cw.etics.mesh": "MATERIAL",
  "cw.etics.render": "MATERIAL",
  "cw.etics.substrate": "MATERIAL",
  "legacy-elektryka-mb": "UNKNOWN",
  "legacy-elektryka-rbh": "UNKNOWN",
  "legacy-elektryka-szt": "UNKNOWN",
  "legacy-gk-m2": "LABOR",
  "legacy-gladzie_tynki-m2": "COMPOUND",
  "legacy-gladzie_tynki-mb": "COMPOUND",
  "legacy-glazura-m2": "UNKNOWN",
  "legacy-hydraulika-mb": "UNKNOWN",
  "legacy-hydraulika-rbh": "UNKNOWN",
  "legacy-hydraulika-szt": "UNKNOWN",
  "legacy-instalacje_co-mb": "UNKNOWN",
  "legacy-instalacje_co-rbh": "UNKNOWN",
  "legacy-instalacje_co-szt": "UNKNOWN",
  "legacy-instalacje_gaz-mb": "UNKNOWN",
  "legacy-instalacje_gaz-rbh": "UNKNOWN",
  "legacy-instalacje_gaz-szt": "UNKNOWN",
  "legacy-malowanie-m2": "LABOR",
  "legacy-podlogi-m2": "UNKNOWN",
  "legacy-podlogi-mb": "UNKNOWN",
  "legacy-roboty_ogolnobudowlane-m2": "UNKNOWN",
  "legacy-roboty_ogolnobudowlane-mb": "UNKNOWN",
  "legacy-roboty_ogolnobudowlane-szt": "UNKNOWN",
  "legacy-rozbiorki-m2": "UNKNOWN",
  "legacy-rozbiorki-m3": "UNKNOWN",
  "legacy-rozbiorki-mb": "UNKNOWN",
  "legacy-stolarka-mb": "UNKNOWN",
  "legacy-stolarka-szt": "UNKNOWN",
  "legacy-transport_utylizacja-kpl": "LABOR",
  "legacy-transport_utylizacja-m3": "LABOR",
  "legacy-unknown-m2": "UNKNOWN",
  "legacy-wentylacja-mb": "UNKNOWN",
  "legacy-wentylacja-szt": "UNKNOWN",
  "legacy-wyposazenie-kpl": "MATERIAL",
  "legacy-wyposazenie-szt": "MATERIAL",
  "p1a-koryto-jezdni-chodnik-m2": "LABOR",
  "p1a-kostka-brukowa-m2": "COMPOUND",
  "p1a-nawierzchnia-betonowa-m2": "COMPOUND",
  "p1a-nawierzchnia-plyty-m2": "MATERIAL",
  "p1a-obrzeza-betonowe-mb": "MATERIAL",
  "p1a-podbudowa-kruszywa-m2": "LABOR",
  "p1a-rozebranie-chodnikow-m2": "LABOR",
  "p1a-rozebranie-kostki-m2": "LABOR",
  "p1a-rozebranie-obrzezy-mb": "LABOR",
  "p1a-rozebranie-podbudowy-m2": "LABOR",
  "p1b-brama-ogrodzeniowa-szt": "MATERIAL",
  "p1b-furtka-ogrodzeniowa-szt": "MATERIAL",
  "p1b-ogrodzenie-siatka-mb": "MATERIAL",
  "p1b-ogrodzenie-systemowe-mb": "MATERIAL",
  "p1b-panel-ogrodzeniowy-mb": "MATERIAL",
  "p1b-slupek-ogrodzeniowy-szt": "MATERIAL",
  "p1b-zdjecie-ogrodzenia-mb": "LABOR",
  "p1c-farba-elewacyjna-m2": "MATERIAL",
  "p1c-listwa-startowa-cokol-mb": "MATERIAL",
  "p1c-ocieplenie-etics-eps-m2": "MATERIAL",
  "p1c-tynk-elewacyjny-m2": "MATERIAL",
  "p1c-warstwa-zbrojona-etics-m2": "LABOR",
  "p1c-welna-mw-etics-m2": "MATERIAL",
  "p1c-zbrojenie-tynku-elewacyjnego-m2": "LABOR",
  "p2a-demontaz-drzwi-wewn-szt": "LABOR",
  "p2a-rozebranie-obrobek-blacharskich-m2": "UNKNOWN",
  "p2a-rozebranie-okladzin-sciennych-m2": "UNKNOWN",
  "p2a-rozebranie-posadzek-wewn-m2": "UNKNOWN",
  "p2a-rozebranie-rynien-rur-spustowych-mb": "UNKNOWN",
  "p2a-rozebranie-scianek-dzialowych-m2": "LABOR",
  "p2a-rozebranie-stropow-drewnianych-m2": "LABOR",
  "p2a-zerwanie-podloza-m2": "LABOR",
  "p2a-zerwanie-tynkow-wewn-m2": "LABOR",
  "p2b-podejscie-wod-kan-mb": "LABOR",
  "p2b-punkt-elektryczny-oswietleniowy-szt": "MATERIAL",
  "p2b-scianka-gk-na-stelazu-m2": "LABOR",
  "p2b-sufit-podwieszany-gk-m2": "LABOR",
  "p2b-tablica-rozdzielcza-mieszkaniowa-szt": "LABOR",
});

export function getOwnerClassificationPlane(
  workId: string,
): EstimatorPricingPlane | null {
  const id = String(workId ?? "").trim();
  if (!id) return null;
  return ESTIMATOR_OWNER_CLASSIFICATION_MAP[id] ?? null;
}
