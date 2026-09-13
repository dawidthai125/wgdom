/**
 * Owner-authorized Labor Evidence routes — exact URL + sourceId only.
 *
 * Separate from KEEP-5 NORMAL research hosts and APF measurement sources.
 * Used when Owner GO verifies a public labor-only PLN/unit observation
 * that is not on KEEP-5 cenniki. ZERO wildcards · ZERO host-wide open.
 *
 * TPI/729 AUT-R1 durable PLN Evidence:
 *   · BIP Staro Olecko — 1118-09 · 48.201 PLN/m2
 *   · Public cost estimate — 0829-03 · 61.12 PLN/m2
 *   · BIP Powiat Obornicki — 0815-04 · 13.15013 PLN/m2
 *   · winbud.pl Szczegolowy.pdf — 2006-04 · 9.62 PLN/m2
 */

export const OWNER_LABOR_EVIDENCE_STATUS_AUTHORIZED =
  "OWNER_AUTHORIZED_LABOR_EVIDENCE_ROUTE" as const;

export type OwnerAuthorizedLaborEvidenceSourceId =
  | "bip_staro_olecko_1118_09"
  | "public_cost_estimate_0829_03"
  | "bip_powiat_obornicki_0815_04"
  | "winbud_szczegolowy_2006_04";

export type OwnerAuthorizedLaborEvidenceRoute = {
  sourceId: OwnerAuthorizedLaborEvidenceSourceId;
  url: string;
  host: string;
  workId: string;
  role: "REFERENCE";
  ownerStatus: typeof OWNER_LABOR_EVIDENCE_STATUS_AUTHORIZED;
  /** Document date when known (ISO date); else null → callers use retrievedAt. */
  documentObservedAt: string | null;
  notePl: string;
};

/** Exact authorized Evidence ingestion routes — no wildcards · no subpaths. */
export const OWNER_AUTHORIZED_LABOR_EVIDENCE_ROUTES = Object.freeze([
  Object.freeze({
    sourceId: "bip_staro_olecko_1118_09",
    url: "https://www.spolecko.bip.doc.pl/upload/doc/19103_20180403_120927.pdf",
    host: "spolecko.bip.doc.pl",
    workId: "cw.knr.knr-2-02.1118-09.m2",
    role: "REFERENCE",
    ownerStatus: OWNER_LABOR_EVIDENCE_STATUS_AUTHORIZED,
    documentObservedAt: "2018-04-03T00:00:00.000Z",
    notePl:
      "BIP Staro Olecko — KNR 202 1118/09 Robocizna razem 48.201 PLN/m2 (labor-only; materiały/sprzęt osobno).",
  }),
  Object.freeze({
    sourceId: "public_cost_estimate_0829_03",
    url: "https://fliphtml5.com/wnzvl/ndtc/RB-_ca%C5%82o%C5%9B%C4%87-_po_inwent/",
    host: "fliphtml5.com",
    workId: "cw.knr.knr-2-02.0829-03.m2",
    role: "REFERENCE",
    ownerStatus: OWNER_LABOR_EVIDENCE_STATUS_AUTHORIZED,
    documentObservedAt: null,
    notePl:
      "Publiczny kosztorys — KNR 0-12 0829-03 robocizna 61.12 PLN/m2 (1.91 r-g × 32 PLN/r-g; ingest PLN/m2, nie r-g).",
  }),
  Object.freeze({
    sourceId: "bip_powiat_obornicki_0815_04",
    url: "https://bip.powiatobornicki.pl/pliki/powiatobornicki/zalaczniki/3924/kosztorys-inwestorski-branza-budowlana.pdf",
    host: "bip.powiatobornicki.pl",
    workId: "cw.knr.knr-2-02.0815-04.m2",
    role: "REFERENCE",
    ownerStatus: OWNER_LABOR_EVIDENCE_STATUS_AUTHORIZED,
    documentObservedAt: "2022-07-01T00:00:00.000Z",
    notePl:
      "BIP Powiat Obornicki — KNR 2-02 0815-04 Robocizna 0.5093 r-g × 25.82 = 13.15013 PLN/m2 (labor-only Evidence ≠ OUR RATE).",
  }),
  Object.freeze({
    sourceId: "winbud_szczegolowy_2006_04",
    url: "https://www.winbud.pl/images/Szczegolowy.pdf",
    host: "winbud.pl",
    workId: "cw.knr.knr-2-02.2006-04.m2",
    role: "REFERENCE",
    ownerStatus: OWNER_LABOR_EVIDENCE_STATUS_AUTHORIZED,
    documentObservedAt: null,
    notePl:
      "winbud.pl Szczegolowy.pdf — KNR 2-02 2006-04-050 Robocizna 0.7039 r-g × 13.67 = 9.62 PLN/m2 (labor-only Evidence ≠ OUR RATE).",
  }),
] satisfies readonly OwnerAuthorizedLaborEvidenceRoute[]);

export function normalizeOwnerLaborEvidenceUrl(urlStr: string): string {
  try {
    const u = new URL(String(urlStr || "").trim());
    u.hash = "";
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    let path = "";
    try {
      path = decodeURIComponent(u.pathname);
    } catch {
      path = u.pathname;
    }
    path = path.replace(/\/+$/, "") || "/";
    return `${u.protocol}//${host}${path}${u.search}`;
  } catch {
    return String(urlStr || "").trim();
  }
}

export function ownerLaborEvidenceUrlsMatch(a: string, b: string): boolean {
  return normalizeOwnerLaborEvidenceUrl(a) === normalizeOwnerLaborEvidenceUrl(b);
}

export function isOwnerAuthorizedLaborEvidenceSourceId(
  sourceId: string,
): sourceId is OwnerAuthorizedLaborEvidenceSourceId {
  return OWNER_AUTHORIZED_LABOR_EVIDENCE_ROUTES.some(
    (r) => r.sourceId === String(sourceId || "").trim(),
  );
}

export function resolveOwnerAuthorizedLaborEvidenceRoute(
  sourceId: string,
): OwnerAuthorizedLaborEvidenceRoute | null {
  return (
    OWNER_AUTHORIZED_LABOR_EVIDENCE_ROUTES.find(
      (r) => r.sourceId === String(sourceId || "").trim(),
    ) ?? null
  );
}

export function resolveOwnerAuthorizedLaborEvidenceRouteByUrl(
  urlStr: string,
): OwnerAuthorizedLaborEvidenceRoute | null {
  return (
    OWNER_AUTHORIZED_LABOR_EVIDENCE_ROUTES.find((r) =>
      ownerLaborEvidenceUrlsMatch(r.url, urlStr),
    ) ?? null
  );
}

export function listOwnerAuthorizedLaborEvidenceSourceIds(): readonly OwnerAuthorizedLaborEvidenceSourceId[] {
  return OWNER_AUTHORIZED_LABOR_EVIDENCE_ROUTES.map((r) => r.sourceId);
}
