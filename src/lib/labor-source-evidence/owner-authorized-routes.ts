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
 *
 * MOPS paint/prime P1 (2.66.207):
 *   · ZSCKR Bozków — 1204-02 · R=3.721 PLN/m2
 *   · HBStudio Cypisek — 1505-01 · R=1.182 PLN/m2
 *   · LOK Łuków — 1134-01 · R=1.044 PLN/m2 · 1134-02 · R=1.392 PLN/m2
 *     (shared PDF URL · distinct sourceIds per leaf)
 */

export const OWNER_LABOR_EVIDENCE_STATUS_AUTHORIZED =
  "OWNER_AUTHORIZED_LABOR_EVIDENCE_ROUTE" as const;

export type OwnerAuthorizedLaborEvidenceSourceId =
  | "bip_staro_olecko_1118_09"
  | "public_cost_estimate_0829_03"
  | "bip_powiat_obornicki_0815_04"
  | "winbud_szczegolowy_2006_04"
  | "zsckr_bozkow_1204_02"
  | "hbstudio_cypisek_1505_01"
  | "lok_lukow_1134_01"
  | "lok_lukow_1134_02";

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
  Object.freeze({
    sourceId: "zsckr_bozkow_1204_02",
    url: "https://zsckrbozkow.pl/wp-content/uploads/2025/05/Szkola-Bozkow-rem-Ip-kosztorys-inwest-pdf.pdf",
    host: "zsckrbozkow.pl",
    workId: "cw.knr.knr-4-01.1204-02.m2",
    role: "REFERENCE",
    ownerStatus: OWNER_LABOR_EVIDENCE_STATUS_AUTHORIZED,
    documentObservedAt: "2025-05-01T00:00:00.000Z",
    notePl:
      "ZSCKR Bozków — KNR 4-01 1204-02 źródłowe R = 3.721 PLN/m2 (labor-only; nie przeliczać z r-g).",
  }),
  Object.freeze({
    sourceId: "hbstudio_cypisek_1505_01",
    url: "https://hbstudio.pl/wp-content/uploads/2017/10/cypisek-ceny-minimalne.pdf",
    host: "hbstudio.pl",
    workId: "cw.knr.knr-2-02.1505-01.m2",
    role: "REFERENCE",
    ownerStatus: OWNER_LABOR_EVIDENCE_STATUS_AUTHORIZED,
    documentObservedAt: "2017-10-01T00:00:00.000Z",
    notePl:
      "HBStudio Cypisek — KNR 2-02 1505-01 jednostkowe koszty bezpośrednie R = 1.182 PLN/m2 (labor-only).",
  }),
  Object.freeze({
    sourceId: "lok_lukow_1134_01",
    url: "https://www.lok.lukow.pl/pobierz/article-d235da9c67851a0efa42a4993de09cb7",
    host: "lok.lukow.pl",
    workId: "cw.knr.nnrnkb.1134-01.m2",
    role: "REFERENCE",
    ownerStatus: OWNER_LABOR_EVIDENCE_STATUS_AUTHORIZED,
    documentObservedAt: null,
    notePl:
      "LOK Łuków — NNRNKB 202 1134-01 R = 1.044 PLN/m2 (poziome/sufity; shared PDF z 1134-02).",
  }),
  Object.freeze({
    sourceId: "lok_lukow_1134_02",
    url: "https://www.lok.lukow.pl/pobierz/article-d235da9c67851a0efa42a4993de09cb7",
    host: "lok.lukow.pl",
    workId: "cw.knr.nnrnkb.1134-02.m2",
    role: "REFERENCE",
    ownerStatus: OWNER_LABOR_EVIDENCE_STATUS_AUTHORIZED,
    documentObservedAt: null,
    notePl:
      "LOK Łuków — NNRNKB 202 1134-02 R = 1.392 PLN/m2 (pionowe; shared PDF z 1134-01).",
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

/** All Owner routes whose exact URL matches (shared-PDF safe). */
export function listOwnerAuthorizedLaborEvidenceRoutesByUrl(
  urlStr: string,
): readonly OwnerAuthorizedLaborEvidenceRoute[] {
  return OWNER_AUTHORIZED_LABOR_EVIDENCE_ROUTES.filter((r) =>
    ownerLaborEvidenceUrlsMatch(r.url, urlStr),
  );
}

export function listOwnerAuthorizedLaborEvidenceSourceIds(): readonly OwnerAuthorizedLaborEvidenceSourceId[] {
  return OWNER_AUTHORIZED_LABOR_EVIDENCE_ROUTES.map((r) => r.sourceId);
}
