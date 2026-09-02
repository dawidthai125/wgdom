/**
 * P2 — Object-consistency gate for OfferBoq candidate admission.
 *
 * Rejects a CatalogWork candidate ONLY when both the BOQ line description and
 * the work text contain explicit, deterministic object markers that contradict.
 *
 * Conservative:
 * - unknown / no markers / no clear contradiction → KEEP (true)
 * - never rejects solely because work is legacy-*
 * - never score/rank/auto-pick
 * - independent of F5 / Owner Decision / W2-5
 *
 * Runs after P1 unit-family gate, before top-4 slice.
 */

import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import type { CatalogWork } from "@/lib/work-catalog/types";

/** Explicit sanitary / wet-fixture objects used for mutex. */
export type OfferBoqFixtureObject =
  | "zlew"
  | "umywalka"
  | "wanna"
  | "ustep"
  | "natrysk";

export type OfferBoqObjectMarkers = {
  fixtures: Set<OfferBoqFixtureObject>;
  bateria: boolean;
  kuchenka: boolean;
  silikon: boolean;
  okno: boolean;
  drzwi: boolean;
  oscieznica: boolean;
  parapet: boolean;
  zawor: boolean;
  podejscie: boolean;
  syfon: boolean;
  gruz: boolean;
  /** Work-side / line-side specialty markers */
  oprawa: boolean;
  gniazdo: boolean;
  etics: boolean;
  scianki: boolean;
  impregnacja: boolean;
  stopPtakow: boolean;
  gladzie: boolean;
  /** CatalogWork.id starts with legacy- */
  legacy: boolean;
  /** Work id is cw.etics.* */
  eticsCatalogId: boolean;
  legacyElektryka: boolean;
};

function workCorpus(work: CatalogWork): string {
  // Object identity: id + name + description only.
  // Keywords are scoring aids and often cross-pollute unrelated objects — do not use.
  return foldPolishText(
    [work.id, work.namePl, work.descriptionPl ?? ""].filter(Boolean).join(" "),
  );
}

function detectMarkers(text: string, opts?: { workId?: string }): OfferBoqObjectMarkers {
  const h = foldPolishText(text || "");
  const id = String(opts?.workId ?? "");
  const fixtures = new Set<OfferBoqFixtureObject>();

  if (/zlewozmywak/.test(h)) fixtures.add("zlew");
  if (/umywalk/.test(h)) fixtures.add("umywalka");
  if (/wann/.test(h)) fixtures.add("wanna");
  if (/ustep|misk|kompakt|pluczk/.test(h)) fixtures.add("ustep");
  if (/brodzik|kabin|natrysk|prysznic/.test(h)) fixtures.add("natrysk");

  return {
    fixtures,
    bateria: /bater/.test(h),
    kuchenka: /kuchenk/.test(h),
    silikon: /silikon/.test(h),
    // window stems — avoid matching unrelated tokens
    okno: /\bokien\b|\bokna\b|\bokno\b|okienn|krat okien/.test(h),
    drzwi: /drzw/.test(h),
    oscieznica: /oscieznic|\bkrat\b|krat okien|krat\s/.test(h),
    parapet: /parapet/.test(h),
    zawor: /zawor/.test(h),
    podejscie: /podejsc/.test(h),
    syfon: /syfon/.test(h),
    gruz: /gruz|wywiezien/.test(h),
    oprawa: /opraw|oswietl/.test(h),
    gniazdo: /gniazd|lacznik/.test(h),
    etics: /etics|styropian|ociepl.*elew|ciepl.*elew/.test(h) || /^cw\.etics\./i.test(id),
    scianki: /scianki-dzialow|sciank.*dzial/.test(h) || /scianki-dzialow/i.test(id),
    impregnacja: /impregnac|biobojcz/.test(h) || /impregnac|biobojcz/i.test(id),
    stopPtakow: /stop.?ptak|ptakow/.test(h) || /stop-ptak/i.test(id),
    gladzie: /gladzi/.test(h) || /gladzie/i.test(id),
    legacy: /^legacy-/i.test(id),
    eticsCatalogId: /^cw\.etics\./i.test(id),
    legacyElektryka: /^legacy-elektryka/i.test(id),
  };
}

/** Line markers — description only (no invented work id). */
export function detectOfferBoqLineObjectMarkers(
  lineDescription: string | null | undefined,
): OfferBoqObjectMarkers {
  return detectMarkers(String(lineDescription ?? ""));
}

/** Work markers — id + name + description + keywords. */
export function detectOfferBoqWorkObjectMarkers(work: CatalogWork): OfferBoqObjectMarkers {
  return detectMarkers(workCorpus(work), { workId: work.id });
}

function fixturesOverlap(a: Set<OfferBoqFixtureObject>, b: Set<OfferBoqFixtureObject>): boolean {
  for (const f of a) if (b.has(f)) return true;
  return false;
}

/**
 * True when the candidate may enter OfferBoq `candidateMatches`.
 * False ONLY on clear, deterministic object contradiction.
 */
export function areOfferBoqObjectsCompatible(
  lineDescription: string | null | undefined,
  work: CatalogWork,
): boolean {
  if (!work) return true;

  const line = detectOfferBoqLineObjectMarkers(lineDescription);
  const w = detectOfferBoqWorkObjectMarkers(work);

  // L — debris / demolition: never reject gruz ↔ rozbiórki / transport
  if (line.gruz) return true;

  // C — lighting vs cooker / sink (explicit lighting only — not legacy-elektryka alone)
  if (w.oprawa) {
    if (line.kuchenka && !w.kuchenka) return false;
    if (line.fixtures.has("zlew") && !w.fixtures.has("zlew")) return false;
  }

  // D — gniazda vs kuchenka: KEEP (no reject here)

  // Sink vs outlets (explicit electrical fixture on sink line) — audited LP7
  if (line.fixtures.has("zlew") && w.gniazdo && !w.fixtures.has("zlew")) return false;

  // E — window vs ETICS package ids / etics markers
  if (line.okno && !line.drzwi && (w.eticsCatalogId || w.etics)) return false;

  // F — door vs ETICS / ścianki; impregnacja KEEP
  if (line.drzwi && !line.oscieznica) {
    if (w.etics || w.eticsCatalogId) return false;
    if (w.scianki) return false;
    // impregnacja → keep (fall through)
  }

  // G — frame / grille / ościeżnica
  if (line.oscieznica) {
    // door leaf / skrzydło (not the frame itself)
    if (w.drzwi && !/oscieznic|\bkrat\b/.test(foldPolishText(work.namePl + " " + work.id))) {
      return false;
    }
    if (w.etics || w.eticsCatalogId || w.scianki) return false;
    if (w.impregnacja) return false;
  }

  // H — silicone
  if (line.silikon && (w.stopPtakow || w.gladzie || w.etics || w.eticsCatalogId)) return false;

  // I — parapet
  if (line.parapet && (w.stopPtakow || w.oprawa || w.gniazdo || w.legacyElektryka)) return false;

  // J — valve vs electrical only (NOT sanitary fixtures / LP14)
  if (line.zawor && (w.legacyElektryka || w.oprawa)) return false;

  // A — fixture mutex (both sides explicit fixtures, disjoint)
  if (line.fixtures.size > 0 && w.fixtures.size > 0 && !fixturesOverlap(line.fixtures, w.fixtures)) {
    return false;
  }

  // B — bateria line vs different fixture work (work has no bateria)
  if (line.bateria && w.fixtures.size > 0 && !w.bateria && !fixturesOverlap(line.fixtures, w.fixtures)) {
    // e.g. bateria natryskowa vs montaż zlewozmywaka / wanny
    return false;
  }
  // bateria work on bateria line → keep (compatible)

  // K — pipe / siphon vs unrelated P2B fixtures — NEVER against legacy-*
  if (!w.legacy && (line.podejscie || line.syfon)) {
    const lineHasMatchingFixture =
      fixturesOverlap(line.fixtures, w.fixtures) ||
      (line.bateria && w.bateria) ||
      (line.syfon && w.syfon);
    if (!lineHasMatchingFixture) {
      // reject explicit fixture / bateria installs unrelated to pipe/siphon line
      if (w.fixtures.size > 0 || w.bateria) return false;
    }
  }

  // Default: KEEP
  return true;
}
