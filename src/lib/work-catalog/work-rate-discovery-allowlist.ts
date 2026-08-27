/**
 * WORK-RATE-RESEARCH-DISCOVERY-01 INFRA — PASS 2 category URL allowlist.
 *
 * Owner-curated · deterministic · same 4 hosts only.
 * Client never sends URL — Edge/client resolve sourceId+categoryKey → URL.
 * Default allowlist is EMPTY (SOURCE GAP / no niche claim).
 */

import type { WorkRateAuthorizedSourceId } from "@/lib/work-catalog/work-rate-legal";
import {
  WORK_RATE_CANONICAL_CENNIK_URL,
  isWorkRateSelectiveUrlAllowed,
} from "@/lib/work-catalog/work-rate-source-html-parse";

/**
 * Slice 3A — research plane for PASS2 category reuse (P5.27).
 *
 * NORMAL_WORK_RATE_RESEARCH:
 *   existing `runSelectiveWorkRateResearch` path — measurement remains blocked.
 * APF_EPHEMERAL_SELECTIVE_RESEARCH:
 *   future APF-only plane — MUST NOT be passed from work-rate-research runners.
 */
export const WORK_RATE_RESEARCH_PLANE_NORMAL =
  "NORMAL_WORK_RATE_RESEARCH" as const;
export const WORK_RATE_RESEARCH_PLANE_APF_EPHEMERAL =
  "APF_EPHEMERAL_SELECTIVE_RESEARCH" as const;

export type WorkRateCategoryReuseResearchPlane =
  | typeof WORK_RATE_RESEARCH_PLANE_NORMAL
  | typeof WORK_RATE_RESEARCH_PLANE_APF_EPHEMERAL;

/** Category keys — discovery routing only · never set PLN. */
export type WorkRateCategoryKey =
  | "default"
  | "painting"
  | "masonry_plaster"
  | "plaster"
  | "flooring"
  | "repairs"
  /** P5.31 — demolition wall (≠ electrical / opening / general). */
  | "repairs_wall"
  /** P5.31 — wykucie otworów / ościeżnic (≠ wykucie bruzd / grooves). */
  | "repairs_opening"
  | "grooves"
  | "sealing_protection"
  | "electrical"
  | "plumbing"
  /** P5.31 — stolarka / okucia (≠ painting, ≠ general repairs). */
  | "joinery_finish"
  | "unknown";

export type WorkRateWorkFamily =
  | "painting"
  | "plaster"
  | "priming"
  | "flooring"
  | "grooves"
  | "sealing_protection"
  | "repairs"
  | "demolition"
  | "masonry"
  | "electrical"
  | "plumbing"
  /** P5.31 — joinery / hardware finish works. */
  | "joinery"
  | "unknown";

export type WorkRatePass2AllowlistEntry = {
  sourceId: WorkRateAuthorizedSourceId;
  categoryKey: Exclude<WorkRateCategoryKey, "default" | "unknown">;
  url: string;
};

/**
 * Production PASS2 allowlist — Owner-curated only.
 * WR-PASS2-ALLOWLIST-WAVE-1 (Option D · MAX=2 per work fetch):
 *   kb_pl: grooves (KEEP, first) → plaster L1 (second)
 *   cennikremontow_pl: painting P1
 * IE-LABOR IR Wave-1 PASS2 / CR DISCOVERY AMENDMENT (Owner A1/A2):
 *   cennikremontow_pl: electrical → instalacje-elektryczne-cennik (Tablica)
 *   cennikremontow_pl: plumbing → instalacje-wodno-kanalizacyjno-gazowe-cennik (Podejście)
 * KB-BRUZDY-POLICY-01: grooves synonym „szpachlowanie bruzd po kablach” unchanged.
 * P5.31 SAFE routes (Owner GO · unambiguous URL only):
 *   kb_pl: flooring · repairs_wall · repairs_opening
 *   cennikremontow_pl: joinery_finish
 * DEFERRED (no unambiguous demontaż URL / OWNER_REVIEW / MED):
 *   repairs (general) · repairs_electrical · repairs_appliance · repairs_finish ·
 *   repairs_floor_trim · repairs_biocide · sealing_protection · KB painting
 */
export const WORK_RATE_PASS2_CATEGORY_ALLOWLIST: readonly WorkRatePass2AllowlistEntry[] =
  Object.freeze([
    {
      sourceId: "kb_pl",
      categoryKey: "grooves",
      url: "https://kb.pl/cenniki/uslugi/cennik-naprawy-ubytkow-w-scianie-i-suficie-aktualne-ceny/",
    },
    {
      sourceId: "kb_pl",
      categoryKey: "plaster",
      url: "https://kb.pl/cenniki/uslugi/cennik-gladzi-gipsowej-i-szpachlowania-scian-w-calej-polsce/",
    },
    {
      sourceId: "kb_pl",
      categoryKey: "flooring",
      url: "https://kb.pl/cenniki/uslugi/cennik-ukladania-paneli-podlogowych-w-calej-polsce/",
    },
    {
      sourceId: "kb_pl",
      categoryKey: "repairs_wall",
      url: "https://kb.pl/cenniki/uslugi/cennik-wyburzania-scian-dzialowych/",
    },
    {
      sourceId: "kb_pl",
      categoryKey: "repairs_opening",
      url: "https://kb.pl/cenniki/uslugi/cennik-wykucia-otworow-w-scianie-i-stropie-sprawdzamy-ceny/",
    },
    {
      sourceId: "cennikremontow_pl",
      categoryKey: "painting",
      url: "https://cennikremontow.pl/malowanie-cennik",
    },
    {
      sourceId: "cennikremontow_pl",
      categoryKey: "electrical",
      url: "https://cennikremontow.pl/instalacje-elektryczne-cennik",
    },
    {
      sourceId: "cennikremontow_pl",
      categoryKey: "plumbing",
      url: "https://cennikremontow.pl/instalacje-wodno-kanalizacyjno-gazowe-cennik",
    },
    {
      sourceId: "cennikremontow_pl",
      categoryKey: "joinery_finish",
      url: "https://cennikremontow.pl/uslugi-stolarskie-cennik/",
    },
  ]);

/** Max extra category pages per source after PASS1 (deterministic budget). Wave-1 KEEP = 2. */
export const WORK_RATE_PASS2_MAX_PAGES_PER_SOURCE = 2 as const;

let allowlistOverride: readonly WorkRatePass2AllowlistEntry[] | null = null;

/** Test-only — restore with null. */
export function setWorkRatePass2AllowlistForTests(
  entries: readonly WorkRatePass2AllowlistEntry[] | null,
): void {
  allowlistOverride = entries;
}

export function getWorkRatePass2Allowlist(): readonly WorkRatePass2AllowlistEntry[] {
  return allowlistOverride ?? WORK_RATE_PASS2_CATEGORY_ALLOWLIST;
}

export function isWorkRatePass2AllowlistEmpty(): boolean {
  return getWorkRatePass2Allowlist().length === 0;
}

export function resolveWorkRatePass2Url(
  sourceId: WorkRateAuthorizedSourceId,
  categoryKey: string,
): string | null {
  const key = String(categoryKey || "").trim();
  if (!key || key === "default" || key === "unknown") return null;
  const row = getWorkRatePass2Allowlist().find(
    (e) => e.sourceId === sourceId && e.categoryKey === key,
  );
  if (!row) return null;
  if (!isWorkRateSelectiveUrlAllowed(row.url)) return null;
  return row.url;
}

/**
 * Inventory of allowlisted category keys for a source (no MAX truncate).
 * MAX applies only when selecting keys for a concrete work fetch
 * (`listWorkRatePass2CategoryKeysForWork`).
 */
export function listWorkRatePass2CategoryKeysForSource(
  sourceId: WorkRateAuthorizedSourceId,
): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const e of getWorkRatePass2Allowlist()) {
    if (e.sourceId !== sourceId) continue;
    if (seen.has(e.categoryKey)) continue;
    seen.add(e.categoryKey);
    keys.push(e.categoryKey);
  }
  return keys;
}

/** Family → preferred category keys (only those present in allowlist are fetched). */
const FAMILY_TO_CATEGORY: Record<WorkRateWorkFamily, readonly string[]> = {
  painting: ["painting"],
  plaster: ["plaster", "masonry_plaster"],
  priming: ["painting", "plaster"],
  flooring: ["flooring"],
  grooves: ["grooves"],
  sealing_protection: ["sealing_protection"],
  repairs: ["repairs"],
  /**
   * Demolition prefs are refined by `preferredCategoryKeysForDemolition`
   * (wall / opening first). Bare `repairs` stays deferred (no URL).
   */
  demolition: ["repairs_wall", "repairs_opening", "repairs"],
  /**
   * Masonry: prefer dedicated key; fall back to allowlisted `plaster` (wall works)
   * when `masonry_plaster` is absent — never invent a new URL.
   */
  masonry: ["masonry_plaster", "plaster"],
  electrical: ["electrical"],
  plumbing: ["plumbing"],
  joinery: ["joinery_finish"],
  unknown: [],
};

/**
 * P5.31 — pick demolition sub-key from description (scope separation).
 * Does NOT map electrical/appliance demontaż (no SAFE URL yet).
 */
export function preferredCategoryKeysForDemolition(namePl: string): readonly string[] {
  const blob = softWorkRateFamilyText(namePl);
  // Wall dismantle before generic
  if (
    /rozebran/.test(blob) &&
    /sciank|scian|element|prefabryk/.test(blob) &&
    !/wykladzin|plytek|okladzin/.test(blob)
  ) {
    return ["repairs_wall", "repairs"];
  }
  // Opening cut / ościeżnice from masonry (≠ bruzdy — already gated earlier in family resolve)
  if (
    /wykucie/.test(blob) &&
    /(otwor|osciez|kratk|drzwiczek|podokien|z muru|z mur)/.test(blob) &&
    !/bruzd/.test(blob)
  ) {
    return ["repairs_opening", "repairs"];
  }
  // Generic demolition — repairs umbrella (URL deferred → CATEGORY_KEY_MISSING)
  return ["repairs"];
}

/**
 * Ordered preferred category keys for a resolved family (+ name scope).
 */
export function preferredCategoryKeysForFamily(
  family: WorkRateWorkFamily,
  namePl: string,
): readonly string[] {
  if (family === "demolition") return preferredCategoryKeysForDemolition(namePl);
  return FAMILY_TO_CATEGORY[family] ?? [];
}

/**
 * Soft-normalize for family routing (NFD + strip diacritics).
 * P5.26-FIX: same contract as runner soft — regex must not require raw „Demontaż”.
 */
export function softWorkRateFamilyText(input: string): string {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveWorkRateWorkFamily(input: {
  workId?: string;
  namePl?: string;
}): WorkRateWorkFamily {
  const blob = softWorkRateFamilyText(`${input.workId || ""} ${input.namePl || ""}`);
  if (/malow|paint|farba/.test(blob)) return "painting";
  if (/grunt/.test(blob)) return "priming";
  // Grooves before plaster — "szpachlowanie bruzd…" must not route as plaster.
  // Also before generic zamurowanie/masonry — bruzdy ≠ przebicia.
  if (
    /zapraw\w*\s*bruz|zamurow\w*\s*bruz|uzupeln\w*\s*bruz|uzupełn\w*\s*bruz|szpachlow\w*\s*bruz|zaprawianie-bruzd/.test(
      blob,
    )
  ) {
    return "grooves";
  }
  if (/kucie\w*\s*bruz|bruzd\w*\s*beton|wykucie\w*\s*bruz/.test(blob)) return "grooves";
  // Plumbing specialty BEFORE generic demontaż (P5.26-FIX G013).
  if (
    /p2b-podejscie|podejsc\w*|wod.?kan|wodociagowo.?kanaliz|wodno.?kanaliz/.test(
      blob,
    )
  ) {
    return "plumbing";
  }
  if (/hydraul|rurociag|demontaz\w*\s*rur|wymiana\w*\s*podejsc|montaz\w*\s*rur/.test(blob)) {
    return "plumbing";
  }
  // Electrical specialty BEFORE plaster — P5.27-FIX: wtynk/podtynk/YDYp must not hit /tynk/.
  if (
    /p2b-tablica|tablica\s*rozdziel|rozdzielcz|skrzynk\w*\s*rozdziel/.test(blob)
  ) {
    return "electrical";
  }
  if (
    /ydyp|przewod\w*\s*plask|wtynkow|podtynkow|demontaz\w*\s*przewod\w*\s*wtynk/.test(
      blob,
    )
  ) {
    return "electrical";
  }
  if (
    /elektr|demontaz\w*\s*(wylacznik|osprzet|puszk|opraw|tablic|lacznik)/.test(blob)
  ) {
    return "electrical";
  }
  // Demolition of light / unplastered walls — before plaster (nieotynkow* contains tynk).
  if (
    /rozebran|nieotynkowan/.test(blob) &&
    /sciank|scian|element|prefabryk/.test(blob)
  ) {
    return "demolition";
  }
  // Plaster: gladź/szpachla, or tynk root excluding wtynk/podtynk/nieotynkow false positives.
  if (/glad|gladz|szpachl/.test(blob)) return "plaster";
  if (/tynk/.test(blob) && !/wtynk|podtynk|nieotynkow/.test(blob)) return "plaster";
  if (/panel|podlog|cyklin|posadzk/.test(blob)) return "flooring";
  if (/wykwit|zaciek/.test(blob)) return "repairs";
  if (/foli|zabezpiecz.*okien|zabezpiecz.*stolark|oslon.*okien/.test(blob))
    return "sealing_protection";
  // Joinery / hardware BEFORE generic demolition (P5.31)
  if (
    /klamek|szyld|odbojnik|okuc|dopasowanie\w*\s*skrzyd|skrzydel\w*\s*(drzwi|okien)/.test(
      blob,
    )
  ) {
    return "joinery";
  }
  // Masonry / zamurowanie otworów·przebić — after bruzdy grooves gate.
  if (/murars|murowan|zamurowan\w*\s*(przebic|otwor)/.test(blob)) return "masonry";
  if (/zamurowan/.test(blob)) return "masonry";
  // Generic demolition last (soft „demontaz” matches diacritic BOQ).
  if (/wykuc|demontaz|kucie|rozebran/.test(blob)) return "demolition";
  return "unknown";
}

/**
 * Category keys to try for PASS2 for this work — intersection(family prefs, allowlist).
 * Empty ⇒ PASS1 only.
 */
export function listWorkRatePass2CategoryKeysForWork(input: {
  workId?: string;
  namePl?: string;
  sourceId: WorkRateAuthorizedSourceId;
}): string[] {
  const family = resolveWorkRateWorkFamily(input);
  const prefs = preferredCategoryKeysForFamily(family, input.namePl || "");
  const available = new Set(listWorkRatePass2CategoryKeysForSource(input.sourceId));
  const out: string[] = [];
  for (const k of prefs) {
    if (available.has(k)) out.push(k);
    if (out.length >= WORK_RATE_PASS2_MAX_PAGES_PER_SOURCE) break;
  }
  // If family unknown but source has allowlisted keys, do NOT auto-fetch all
  // (deterministic: only family-mapped keys).
  return out;
}

export function normalizeWorkRateDiscoveryUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    let path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.protocol}//${u.hostname.toLowerCase()}${path}${u.search}`;
  } catch {
    return String(url || "").trim().toLowerCase();
  }
}

/** PASS1 canonical URL for source (unchanged semantics). */
export function resolveWorkRatePass1CanonicalUrl(
  sourceId: WorkRateAuthorizedSourceId,
): string | null {
  const url = WORK_RATE_CANONICAL_CENNIK_URL[sourceId];
  if (!url || !isWorkRateSelectiveUrlAllowed(url)) return null;
  return url;
}

const VALID_SOURCE_IDS = new Set([
  "kb_pl",
  "sccot",
  "extradom",
  "cennikremontow_pl",
]);

/**
 * Edge/client contract SSOT — resolve lookup URL.
 * Arbitrary `url` in request → REJECT. Client may only send sourceId + categoryKey.
 * Mirrored in Edge `workRateResolveSelectiveLookupUrl` (Deno cannot import src/).
 */
export function resolveWorkRateSelectiveLookupRequest(input: {
  sourceId: unknown;
  query: unknown;
  categoryKey?: unknown;
  /** Forbidden if present (even null). */
  url?: unknown;
  hasOwnUrlProperty?: boolean;
}):
  | {
      ok: true;
      sourceId: WorkRateAuthorizedSourceId;
      url: string;
      discoveryMethod: "PASS1_CANONICAL" | "PASS2_CATEGORY";
      categoryKey: string | null;
    }
  | { ok: false; error: string } {
  if (input.hasOwnUrlProperty === true || input.url !== undefined) {
    return { ok: false, error: "arbitrary_url_forbidden" };
  }
  const sourceId = String(input.sourceId || "").trim();
  if (!VALID_SOURCE_IDS.has(sourceId)) {
    return { ok: false, error: "invalid_sourceId" };
  }
  const sid = sourceId as WorkRateAuthorizedSourceId;
  const query = String(input.query || "").trim();
  if (query.length < 2) {
    return { ok: false, error: "empty_query" };
  }
  const categoryKeyRaw = String(input.categoryKey ?? "").trim();
  const categoryKey =
    categoryKeyRaw && categoryKeyRaw !== "default" ? categoryKeyRaw : null;

  if (categoryKey) {
    const pass2 = resolveWorkRatePass2Url(sid, categoryKey);
    if (!pass2) {
      return { ok: false, error: "unknown_category_key" };
    }
    return {
      ok: true,
      sourceId: sid,
      url: pass2,
      discoveryMethod: "PASS2_CATEGORY",
      categoryKey,
    };
  }

  const pass1 = resolveWorkRatePass1CanonicalUrl(sid);
  if (!pass1) {
    return { ok: false, error: "url_not_allowed" };
  }
  return {
    ok: true,
    sourceId: sid,
    url: pass1,
    discoveryMethod: "PASS1_CANONICAL",
    categoryKey: null,
  };
}

/** P5.26-FIX — empty / gap classes (PARSE_EMPTY ≠ SOURCE_NO_MATCH). */
export type WorkRateResearchEmptyClass =
  | "CATEGORY_KEY_MISSING"
  | "FAMILY_UNKNOWN"
  | "PASS2_UNAVAILABLE"
  | "QUERY_BUILD_FAILURE"
  | "PARSER_EMPTY"
  | "SOURCE_NO_MATCH"
  | "SOURCE_UNAVAILABLE";

export type WorkRateCategoryRoutePlan = {
  family: WorkRateWorkFamily;
  categoryKeys: string[];
  /** First allowlisted key for this source+family, or null. */
  primaryCategoryKey: string | null;
  /**
   * PASS2_READY — at least one categoryKey with allowlist URL.
   * PASS1_ONLY — family known but no allowlisted PASS2 for this source (explicit).
   * CATEGORY_KEY_MISSING — family maps to prefs with empty allowlist intersection.
   * FAMILY_UNKNOWN — cannot infer family from description.
   * REJECTED_REUSE — domain/unit/scope gate blocked existing key (P5.27-FIX).
   */
  routingStatus:
    | "PASS2_READY"
    | "PASS1_ONLY"
    | "CATEGORY_KEY_MISSING"
    | "FAMILY_UNKNOWN"
    | "REJECTED_REUSE";
  emptyClassIfBlocked: WorkRateResearchEmptyClass | null;
  /** P5.27-FIX — explicit reuse verdict when domain/unit provided. */
  reuseStatus?:
    | "SAFE_EXISTING_REUSE"
    | "REJECTED_REUSE"
    | "CATEGORY_KEY_MISSING"
    | "FAMILY_UNKNOWN"
    | "NOT_EVALUATED";
  rejectReason?: string | null;
};

/** Labor/costorys category keys — never for MATERIAL domain reuse (P5.27-FIX). */
const LABOR_COSTORYS_CATEGORY_KEYS = new Set([
  "painting",
  "plaster",
  "plumbing",
  "electrical",
  "grooves",
  "masonry_plaster",
  "repairs",
  "repairs_wall",
  "repairs_opening",
  "flooring",
  "sealing_protection",
  "joinery_finish",
]);

function normalizeReuseDomain(domain: string | null | undefined): string {
  const d = String(domain || "")
    .trim()
    .toUpperCase();
  if (d === "PACKAGE" || d === "LABOR_MATERIAL_PACKAGE") return "LABOR_MATERIAL_PACKAGE";
  if (d === "LABOR" || d === "MATERIAL" || d === "NON_COST" || d === "CORRUPT") return d;
  return d || "";
}

/**
 * P5.27 measurement / pomiary description gate (normal work-rate plane only).
 * Exported for policy tests — runners must keep NORMAL plane default.
 */
export function isP527MeasurementOutOfResearch(input: {
  unit?: string | null;
  namePl?: string | null;
}): boolean {
  const unit = String(input.unit || "")
    .trim()
    .toLowerCase();
  const blob = softWorkRateFamilyText(input.namePl || "");
  if (unit === "pomiar") return true;
  if (/sprawdzenie\w*\s+i\s+pomiar|pomiary\b/.test(blob)) return true;
  return false;
}

/**
 * Domain / scope gate for existing PASS2 categoryKey reuse (P5.27-FIX).
 * Does NOT invent keys or URLs — only allows/rejects already allowlisted routes.
 *
 * `researchPlane` defaults to NORMAL — APF plane is for future APF route planning only.
 * `runSelectiveWorkRateResearch` MUST NOT pass APF_EPHEMERAL_SELECTIVE_RESEARCH.
 */
export function evaluateExistingCategoryReuseGate(input: {
  family: WorkRateWorkFamily;
  categoryKey: string | null;
  namePl: string;
  domain?: string | null;
  unit?: string | null;
  /** Default NORMAL — preserves P5.27 for existing work-rate research. */
  researchPlane?: WorkRateCategoryReuseResearchPlane;
}): {
  ok: boolean;
  reuseStatus: "SAFE_EXISTING_REUSE" | "REJECTED_REUSE" | "NOT_EVALUATED";
  rejectReason: string | null;
} {
  const domain = normalizeReuseDomain(input.domain);
  const key = input.categoryKey;
  const unit = String(input.unit || "")
    .trim()
    .toLowerCase();
  if (!domain) {
    return { ok: true, reuseStatus: "NOT_EVALUATED", rejectReason: null };
  }
  if (!key) {
    return { ok: false, reuseStatus: "REJECTED_REUSE", rejectReason: "NO_CATEGORY_KEY" };
  }

  const plane = input.researchPlane ?? WORK_RATE_RESEARCH_PLANE_NORMAL;

  // P5.27 OUT OF RESEARCH — normal work-rate plane only (Slice 3A boundary).
  if (
    plane === WORK_RATE_RESEARCH_PLANE_NORMAL &&
    isP527MeasurementOutOfResearch({ unit, namePl: input.namePl })
  ) {
    return {
      ok: false,
      reuseStatus: "REJECTED_REUSE",
      rejectReason: "OUT_OF_RESEARCH_MEASUREMENT",
    };
  }

  const blob = softWorkRateFamilyText(input.namePl || "");

  if (/wywiezien|gruzu spryzm|samochodami samow/.test(blob)) {
    return {
      ok: false,
      reuseStatus: "REJECTED_REUSE",
      rejectReason: "OUT_OF_RESEARCH_TRANSPORT",
    };
  }

  // MATERIAL must not use labor costorys category routes.
  if (domain === "MATERIAL" && LABOR_COSTORYS_CATEGORY_KEYS.has(key)) {
    return {
      ok: false,
      reuseStatus: "REJECTED_REUSE",
      rejectReason: "MATERIAL_DOMAIN_LABOR_CATEGORY",
    };
  }

  // PACKAGE ≠ LABOR/MATERIAL price reuse — category route only when family scope matches host.
  if (domain === "LABOR_MATERIAL_PACKAGE") {
    if (key === "plaster" || input.family === "plaster" || input.family === "masonry") {
      // Reject cable-in-plaster / electrical mis-scope on plaster host.
      if (/ydyp|przewod\w*\s*plask|wtynkow|podtynkow|elektr/.test(blob)) {
        return {
          ok: false,
          reuseStatus: "REJECTED_REUSE",
          rejectReason: "PACKAGE_PLASTER_ELECTRICAL_SCOPE",
        };
      }
      // True plaster/masonry package works may use plaster PASS2 (wall works host).
      if (
        input.family === "masonry" ||
        (/tynk|glad|szpachl|zamurowan|przecieran/.test(blob) &&
          !/wtynk|podtynk|nieotynkow/.test(blob))
      ) {
        return { ok: true, reuseStatus: "SAFE_EXISTING_REUSE", rejectReason: null };
      }
      return {
        ok: false,
        reuseStatus: "REJECTED_REUSE",
        rejectReason: "PACKAGE_PLASTER_SCOPE_UNCLEAR",
      };
    }
    if (key === "plumbing" && input.family === "plumbing") {
      return { ok: true, reuseStatus: "SAFE_EXISTING_REUSE", rejectReason: null };
    }
    if (key === "electrical" && input.family === "electrical") {
      return { ok: true, reuseStatus: "SAFE_EXISTING_REUSE", rejectReason: null };
    }
    if (key === "painting" && (input.family === "painting" || input.family === "priming")) {
      return { ok: true, reuseStatus: "SAFE_EXISTING_REUSE", rejectReason: null };
    }
    // P5.31 — PACKAGE flooring = kompletne wykonanie posadzki (labor host, not shop material).
    if (key === "flooring" && input.family === "flooring") {
      if (/leroy|castorama|obi|sklep/.test(blob)) {
        return {
          ok: false,
          reuseStatus: "REJECTED_REUSE",
          rejectReason: "PACKAGE_FLOORING_MATERIAL_SCOPE",
        };
      }
      return { ok: true, reuseStatus: "SAFE_EXISTING_REUSE", rejectReason: null };
    }
    if (key === "joinery_finish" && input.family === "joinery") {
      return { ok: true, reuseStatus: "SAFE_EXISTING_REUSE", rejectReason: null };
    }
    return {
      ok: false,
      reuseStatus: "REJECTED_REUSE",
      rejectReason: "PACKAGE_CATEGORY_SCOPE_MISMATCH",
    };
  }

  if (domain === "LABOR") {
    // podtynk must not reuse plaster (family should be electrical after FIX).
    if (key === "plaster" && /podtynk|wtynk/.test(blob)) {
      return {
        ok: false,
        reuseStatus: "REJECTED_REUSE",
        rejectReason: "PODTYNK_NOT_PLASTER",
      };
    }
    return { ok: true, reuseStatus: "SAFE_EXISTING_REUSE", rejectReason: null };
  }

  return { ok: true, reuseStatus: "NOT_EVALUATED", rejectReason: null };
}

/**
 * SSOT categoryKey / PASS2 plan for one source (P5.26-FIX + P5.27-FIX domain gate).
 * Runners must call this instead of hardcoding categoryKey=null → PASS1 → PARSE_EMPTY → SOURCE_NO_MATCH.
 */
export function planWorkRateCategoryRoute(input: {
  namePl: string;
  workId?: string;
  sourceId: WorkRateAuthorizedSourceId;
  /** Optional BOQ domain — enables SAFE_EXISTING_REUSE / REJECTED_REUSE gate. */
  domain?: string | null;
  unit?: string | null;
}): WorkRateCategoryRoutePlan {
  const family = resolveWorkRateWorkFamily({
    workId: input.workId,
    namePl: input.namePl,
  });
  if (family === "unknown") {
    return {
      family,
      categoryKeys: [],
      primaryCategoryKey: null,
      routingStatus: "FAMILY_UNKNOWN",
      emptyClassIfBlocked: "FAMILY_UNKNOWN",
      reuseStatus: "FAMILY_UNKNOWN",
      rejectReason: null,
    };
  }
  const prefs = preferredCategoryKeysForFamily(family, input.namePl);
  const keys = listWorkRatePass2CategoryKeysForWork({
    workId: input.workId,
    namePl: input.namePl,
    sourceId: input.sourceId,
  });
  if (keys.length > 0) {
    const primary = keys[0]!;
    const gate = evaluateExistingCategoryReuseGate({
      family,
      categoryKey: primary,
      namePl: input.namePl,
      domain: input.domain,
      unit: input.unit,
    });
    if (!gate.ok && gate.reuseStatus === "REJECTED_REUSE") {
      return {
        family,
        categoryKeys: [],
        primaryCategoryKey: null,
        routingStatus: "REJECTED_REUSE",
        emptyClassIfBlocked: "CATEGORY_KEY_MISSING",
        reuseStatus: "REJECTED_REUSE",
        rejectReason: gate.rejectReason,
      };
    }
    return {
      family,
      categoryKeys: keys,
      primaryCategoryKey: primary,
      routingStatus: "PASS2_READY",
      emptyClassIfBlocked: null,
      reuseStatus: gate.reuseStatus,
      rejectReason: null,
    };
  }
  // Family known, prefs non-empty, but no allowlist hit for this source.
  if (prefs.length > 0) {
    return {
      family,
      categoryKeys: [],
      primaryCategoryKey: null,
      routingStatus: "CATEGORY_KEY_MISSING",
      emptyClassIfBlocked: "CATEGORY_KEY_MISSING",
      reuseStatus: "CATEGORY_KEY_MISSING",
      rejectReason: null,
    };
  }
  return {
    family,
    categoryKeys: [],
    primaryCategoryKey: null,
    routingStatus: "PASS1_ONLY",
    emptyClassIfBlocked: "PASS2_UNAVAILABLE",
    reuseStatus: "NOT_EVALUATED",
    rejectReason: null,
  };
}

/**
 * P5.27-FIX — plan existing category reuse with mandatory domain (coverage / audit SSOT).
 * Zero new keys · zero new URLs · repairs never invented.
 */
export function planSafeExistingCategoryReuse(input: {
  namePl: string;
  workId?: string;
  sourceId: WorkRateAuthorizedSourceId;
  domain: string;
  unit?: string | null;
}): WorkRateCategoryRoutePlan {
  return planWorkRateCategoryRoute({
    namePl: input.namePl,
    workId: input.workId,
    sourceId: input.sourceId,
    domain: input.domain,
    unit: input.unit,
  });
}

/**
 * Classify post-lookup empty result — never map PARSER_EMPTY to SOURCE_NO_MATCH blindly.
 */
export function classifyWorkRateLookupEmpty(input: {
  lookupOk: boolean;
  lookupError?: string | null;
  categoryKey: string | null;
  discoveryMethod?: "PASS1_CANONICAL" | "PASS2_CATEGORY" | null;
  routingStatus?: WorkRateCategoryRoutePlan["routingStatus"] | null;
  offerCount: number;
  /** Rows parsed from HTML before identity filter (optional telemetry). */
  rawRowCandidates?: number | null;
}): WorkRateResearchEmptyClass {
  if (!input.lookupOk) {
    return "SOURCE_UNAVAILABLE";
  }
  if (
    input.routingStatus === "CATEGORY_KEY_MISSING" ||
    input.routingStatus === "FAMILY_UNKNOWN" ||
    input.routingStatus === "REJECTED_REUSE"
  ) {
    return input.routingStatus === "FAMILY_UNKNOWN"
      ? "FAMILY_UNKNOWN"
      : "CATEGORY_KEY_MISSING";
  }
  if (input.offerCount > 0) {
    return "SOURCE_NO_MATCH"; // should not call when offers exist
  }
  // Had a proper page (PASS1 or PASS2) but identity/table extract found nothing.
  if (input.rawRowCandidates != null && input.rawRowCandidates === 0) {
    return "PARSER_EMPTY";
  }
  // Identity miss or unknown row count after successful fetch on intended path.
  if (input.discoveryMethod === "PASS2_CATEGORY" && input.categoryKey) {
    return "PARSER_EMPTY";
  }
  if (input.discoveryMethod === "PASS1_CANONICAL") {
    return "PARSER_EMPTY";
  }
  return "PARSER_EMPTY";
}

