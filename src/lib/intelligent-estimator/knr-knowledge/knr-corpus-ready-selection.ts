/**
 * IK-KNR CORPUS INGEST — frozen READY / CONFLICT selection (CORPUS-2 + Owner Q1–Q15).
 *
 * Selection only — not VERIFIED authority. CONFLICT / PARTIAL stay OUT.
 */

/** CORPUS-2 READY FOR PENDING (16) — sole corpus ingest selection. */
export const KNR_CORPUS_READY_DISPLAY_CODES = [
  "KNR 2-02 1505-01",
  "KNR 2-02 1503-03",
  "KNR 2-15 0221-02",
  "KNR 2-05 1003-06",
  "KNR 2-02 1018-02",
  "KNR 2-15 0205-02",
  "KNR 2-15 0205-04",
  "KNR 2-15 0208-05",
  "KNR 2-15 0223-02",
  "KNR 4-01 0711-01",
  "KNR 2-02 1017-04",
  "KNR 0-19 0929-09",
  "KNR 2-15 0121-01",
  "KNR 2-02 1218-04",
  "KNR 2-15 0118-01",
  "KNR 2-15 0305-01",
] as const;

export type KnrCorpusReadyDisplayCode = (typeof KNR_CORPUS_READY_DISPLAY_CODES)[number];

/**
 * Preferred ATH filename per READY code (CORPUS-2 uniqueTable.files[0]).
 * Deterministic source preference among consistent FULL hashes — NOT conflict first-match.
 */
export const KNR_CORPUS_READY_PREFERRED_FILENAME: Readonly<
  Record<KnrCorpusReadyDisplayCode, string>
> = {
  "KNR 2-02 1505-01": "Koreańska 1 m132 - ofertowy.ath",
  "KNR 2-02 1503-03": "Koreańska 1 m132 - ofertowy.ath",
  "KNR 2-15 0221-02": "Koreańska 1 m132 - ofertowy.ath",
  "KNR 2-05 1003-06": "Chińska 3b m 2 - ofertowy.ath",
  "KNR 2-02 1018-02": "Chińska 3b m 2 - ofertowy.ath",
  "KNR 2-15 0205-02": "Chińska 3b m 2 - ofertowy.ath",
  "KNR 2-15 0205-04": "Chińska 3b m 2 - ofertowy.ath",
  "KNR 2-15 0208-05": "Chińska 3b m 2 - ofertowy.ath",
  "KNR 2-15 0223-02": "Chińska 3b m 2 - ofertowy.ath",
  "KNR 4-01 0711-01": "Parkowa 25B m 5 - ofertowy.ATH",
  "KNR 2-02 1017-04": "Obornicka 61 m 8 - ofertowy.ath",
  "KNR 0-19 0929-09": "Gorlicka 26 m 6 - ofertowy.ath",
  "KNR 2-15 0121-01": "Gorlicka 26 m 6 - ofertowy.ath",
  "KNR 2-02 1218-04": "Gorlicka 26 m 9 - ofertowy.ath",
  "KNR 2-15 0118-01": "Krzywoustego 268 m 2 - ofertowy.ath",
  "KNR 2-15 0305-01": "Krzywoustego 268 m 2 - ofertowy.ath",
};

/** Display codes appearing in CORPUS-2 CONFLICT OWNER REVIEW (18 identities → 14 codes). */
export const KNR_CORPUS_CONFLICT_DISPLAY_CODES = [
  "KNR 2-02 0803-01",
  "KNR 2-02 1112-01",
  "KNR 2-15 0115-02",
  "KNR 4-01 0716-02",
  "KNR 2-02 2006-01",
  "KNR 2-02 2006-04",
  "KNR 2-02 1016-01",
  "KNR 2-02 1019-08",
  "KNR 2-15 0311-03",
  "KNR 2-15 0220-05",
  "KNR 2-02 1021-07",
  "KNR 2-15 0115-04",
  "KNR 4-01 0304-01",
  "KNR 0-35 0123-01",
] as const;

export const KNR_CORPUS_READY_COUNT = KNR_CORPUS_READY_DISPLAY_CODES.length;
export const KNR_CORPUS_CONFLICT_IDENTITY_COUNT = 18 as const;

const READY_SET = new Set<string>(KNR_CORPUS_READY_DISPLAY_CODES);
const CONFLICT_SET = new Set<string>(KNR_CORPUS_CONFLICT_DISPLAY_CODES);

export function isKnrCorpusReadyDisplayCode(code: string): boolean {
  return READY_SET.has(code.trim());
}

export function isKnrCorpusConflictDisplayCode(code: string): boolean {
  return CONFLICT_SET.has(code.trim());
}

export function foldAthFilenameKey(name: string): string {
  return name.trim().replace(/\\/g, "/").split("/").pop()!.toLocaleLowerCase("pl");
}

export function preferredFilenameForReadyCode(code: string): string | null {
  const trimmed = code.trim();
  if (!isKnrCorpusReadyDisplayCode(trimmed)) return null;
  return KNR_CORPUS_READY_PREFERRED_FILENAME[trimmed as KnrCorpusReadyDisplayCode] ?? null;
}
