/**
 * IK-KNR KL-5 — ATH export parser for KNR normative R/M/S (not PLN preview).
 *
 * REUSE pattern: ath-parser INI sections · NEW: [RMS n] + [RMS ZEST n] norm extraction.
 * ZERO HTTP · MVP family: KNR only.
 */

import type { KnrCatalogFamily } from "./types";
import type { KnrNormBundle, KnrNormLine } from "./knr-catalog-entry-types";
import type { KnrIdentityV2Partial } from "./knr-identity-v2";
import { foldIdentityKeyV2 } from "./knr-identity-v2";
import {
  cleanAthText,
  decodeAthCp1250,
  firstNumericToken,
  firstTabToken,
  parseIniField,
  splitAthIniSections,
} from "./knr-ath-ini-utils";

export const KNR_EXPORT_PARSER_VERSION = "KL-5-ath-rms-v1" as const;

export type KnrAthParseErrorCode =
  | "UNSUPPORTED_FORMAT"
  | "PARSER_ERROR"
  | "POSITION_NOT_FOUND"
  | "FAMILY_NOT_KNR"
  | "RMS_INCOMPLETE";

export type KnrParsedAthHeader = {
  program: string | null;
  programVersion: string | null;
  formatVersion: string | null;
};

export type KnrParsedAthPosition = {
  displayCode: string;
  originalSourceCode: string;
  identity: KnrIdentityV2Partial;
  identityKeyV2: string;
  description: string;
  unit: string;
  positionQuantity: number;
  chapter: string | null;
  publisher: string;
  edition: string;
  norms: KnrNormBundle;
  pozycjaId: string | null;
  /** Position-level ob for nz×ob≈il harness checks. */
  positionOb: number;
  rmsIlByKind: Partial<Record<"R" | "M" | "S", number>>;
};

export type KnrParseAthExportResult =
  | { ok: true; header: KnrParsedAthHeader; positions: KnrParsedAthPosition[] }
  | { ok: false; code: KnrAthParseErrorCode; messagePl: string };

type RmsZestMeta = {
  rmsId: string;
  ty: "R" | "M" | "S" | "OTHER";
  name: string;
  unit: string;
  isAuxiliaryPercent: boolean;
};

type RmsBlock = {
  rmsId: string;
  nz: number;
  opMarker: string | null;
  il: number | null;
};

function parsePdIdentity(pd: string): {
  family: KnrCatalogFamily;
  catalog: string;
  table: string;
  column: string;
  displayCode: string;
  publisher: string;
  edition: string;
} | null {
  const parts = pd.split("\t").map((p) => p.trim());
  const knrIdx = parts.findIndex((p) => p === "KNR");
  if (knrIdx < 0) return null;

  const publisherField = parts[0] ?? "";
  const displaySegment = parts[knrIdx + 1] ?? "";
  const catalog = parts[knrIdx + 2] ?? "";
  const tableColumn = parts[knrIdx + 3] ?? "";

  const publisher = cleanAthText(publisherField);
  const yearMatch = publisher.match(/\b(19|20)\d{2}\b/);
  const edition = yearMatch ? yearMatch[0] : publisher;

  const tcMatch = tableColumn.match(/^(\d+)-(\d+)$/);
  const table = tcMatch ? tcMatch[1] : tableColumn;
  const column = tcMatch ? tcMatch[2] : "";

  const displayCode = displaySegment.includes(" ")
    ? `KNR ${displaySegment}`.replace(/\s+/g, " ").trim()
    : catalog && tableColumn
      ? `KNR ${catalog} ${tableColumn}`.trim()
      : "";

  if (!displayCode) return null;

  return {
    family: "KNR",
    catalog: cleanAthText(catalog),
    table: cleanAthText(table),
    column: cleanAthText(column),
    displayCode,
    publisher,
    edition,
  };
}

function cleanChapterName(s: string): string {
  return cleanAthText(s).replace(/\d+$/g, "").trim();
}

function cleanComponentName(s: string): string {
  const t = cleanAthText(s).split("\t")[0]?.trim() ?? "";
  return t.replace(/\t+\d+$/, "").trim();
}

function parseRmsZestSections(sections: ReturnType<typeof splitAthIniSections>): Map<string, RmsZestMeta> {
  const map = new Map<string, RmsZestMeta>();
  for (const sec of sections) {
    if (!sec.title.startsWith("RMS ZEST ")) continue;
    const rmsId = sec.title.replace("RMS ZEST ", "").trim();
    const tyRaw = (parseIniField(sec.body, "ty") ?? "").trim().toUpperCase();
    const ty: RmsZestMeta["ty"] =
      tyRaw === "R" ? "R" : tyRaw === "M" ? "M" : tyRaw === "S" ? "S" : "OTHER";
    const name = cleanComponentName(parseIniField(sec.body, "na") ?? "");
    const unit = firstTabToken(parseIniField(sec.body, "jm") ?? "");
    const isAuxiliaryPercent = unit === "%";
    map.set(rmsId, { rmsId, ty, name, unit, isAuxiliaryPercent });
  }
  return map;
}

function normalizeDisplayCode(code: string): string {
  return code.trim().replace(/\s+/g, " ").toUpperCase();
}

function buildNormLines(
  rmsBlocks: RmsBlock[],
  zestMap: Map<string, RmsZestMeta>,
): { norms: KnrNormBundle; ilByKind: Partial<Record<"R" | "M" | "S", number>>; incomplete: boolean } {
  const laborNorms: KnrNormLine[] = [];
  const materialNorms: KnrNormLine[] = [];
  const equipmentNorms: KnrNormLine[] = [];
  const ilByKind: Partial<Record<"R" | "M" | "S", number>> = {};
  let hasR = false;
  let hasPrimaryM = false;
  let hasS = false;

  for (const block of rmsBlocks) {
    const zest = zestMap.get(block.rmsId);
    if (!zest) continue;

    if (zest.isAuxiliaryPercent || block.opMarker === "M") {
      continue;
    }

    const kind = zest.ty;
    if (kind !== "R" && kind !== "M" && kind !== "S") continue;

    const line: KnrNormLine = {
      kind,
      code: `RMS-${block.rmsId}`,
      description: zest.name || `RMS ${block.rmsId}`,
      unit: zest.unit,
      quantity: block.nz,
      sourceRef: block.rmsId,
    };

    if (kind === "R") {
      laborNorms.push(line);
      hasR = true;
      if (block.il != null) ilByKind.R = block.il;
    } else if (kind === "M") {
      materialNorms.push(line);
      hasPrimaryM = true;
      if (block.il != null) ilByKind.M = block.il;
    } else {
      equipmentNorms.push(line);
      hasS = true;
      if (block.il != null) ilByKind.S = block.il;
    }
  }

  const incomplete = !hasR || !hasPrimaryM || !hasS;
  return {
    norms: { laborNorms, materialNorms, equipmentNorms },
    ilByKind,
    incomplete,
  };
}

function parseHeader(sections: ReturnType<typeof splitAthIniSections>): KnrParsedAthHeader {
  const headerSec = sections.find((s) => s.title === "KOSZTORYS ATHENASOFT")?.body ?? "";
  const pr = parseIniField(headerSec, "pr") ?? "";
  const prParts = pr.split("\t").map(cleanAthText).filter(Boolean);
  return {
    program: prParts[0] ?? null,
    programVersion: prParts[1] ?? null,
    formatVersion: parseIniField(headerSec, "wf") ?? null,
  };
}

/**
 * Parse ATH bytes for KNR normative positions (family=KNR only in MVP).
 */
export function parseAthKnrNormExport(
  bytes: Uint8Array,
  options?: {
    targetDisplayCode?: string | null;
    knrFamilyOnly?: boolean;
    /**
     * Historical Executed index — include PARTIAL RMS rows (read-only evidence).
     * Default false preserves KL-5 FULL-only behavior.
     */
    includeIncompleteRms?: boolean;
  },
): KnrParseAthExportResult {
  if (!bytes?.length) {
    return { ok: false, code: "PARSER_ERROR", messagePl: "Pusty plik ATH." };
  }

  const text = decodeAthCp1250(bytes);
  if (!text.includes("[KOSZTORYS ATHENASOFT]") && !text.includes("[POZYCJA]")) {
    return { ok: false, code: "UNSUPPORTED_FORMAT", messagePl: "Nierozpoznany format ATH." };
  }

  const sections = splitAthIniSections(text);
  const header = parseHeader(sections);
  const zestMap = parseRmsZestSections(sections);
  const knrFamilyOnly = options?.knrFamilyOnly !== false;
  const targetNorm = options?.targetDisplayCode
    ? normalizeDisplayCode(options.targetDisplayCode)
    : null;

  const positions: KnrParsedAthPosition[] = [];
  let currentChapter: string | null = null;

  for (let i = 0; i < sections.length; i += 1) {
    const sec = sections[i];
    if (sec.title.startsWith("ELEMENT ")) {
      currentChapter = cleanChapterName(parseIniField(sec.body, "na") ?? "") || null;
      continue;
    }
    if (sec.title !== "POZYCJA") continue;

    const pd = parseIniField(sec.body, "pd") ?? "";
    const pdIdentity = parsePdIdentity(pd);
    if (!pdIdentity) continue;
    if (knrFamilyOnly && pdIdentity.family !== "KNR") continue;

    const description = cleanAthText(parseIniField(sec.body, "na") ?? "");
    const jm = firstTabToken(parseIniField(sec.body, "jm") ?? "");
    const obRaw = parseIniField(sec.body, "ob") ?? "";
    const ob = parseFloat(firstNumericToken(obRaw));
    const pozycjaId = (parseIniField(sec.body, "id") ?? "").trim() || null;

    const rmsBlocks: RmsBlock[] = [];
    for (let j = i + 1; j < sections.length; j += 1) {
      const next = sections[j];
      if (next.title === "POZYCJA" || next.title.startsWith("ELEMENT ")) break;
      if (next.title.startsWith("RMS ") && !next.title.startsWith("RMS ZEST")) {
        const rmsId = next.title.replace("RMS ", "").trim();
        const nzRaw = parseIniField(next.body, "nz") ?? "";
        const nz = parseFloat(firstNumericToken(nzRaw));
        const opMarker = (parseIniField(next.body, "op") ?? "").trim() || null;
        const ilRaw = parseIniField(next.body, "il") ?? "";
        const ilNum = parseFloat(firstNumericToken(ilRaw));
        if (Number.isFinite(nz)) {
          rmsBlocks.push({
            rmsId,
            nz,
            opMarker,
            il: Number.isFinite(ilNum) ? ilNum : null,
          });
        }
      }
    }

    const { norms, ilByKind, incomplete } = buildNormLines(rmsBlocks, zestMap);

    const identity: KnrIdentityV2Partial = {
      family: pdIdentity.family,
      catalog: pdIdentity.catalog,
      publisher: pdIdentity.publisher,
      edition: pdIdentity.edition,
      chapter: currentChapter,
      table: pdIdentity.table,
      column: pdIdentity.column,
    };

    const position: KnrParsedAthPosition = {
      displayCode: pdIdentity.displayCode,
      originalSourceCode: pdIdentity.displayCode,
      identity,
      identityKeyV2: foldIdentityKeyV2(identity),
      description,
      unit: jm,
      positionQuantity: Number.isFinite(ob) ? ob : 0,
      chapter: currentChapter,
      publisher: pdIdentity.publisher,
      edition: pdIdentity.edition,
      norms,
      pozycjaId,
      positionOb: Number.isFinite(ob) ? ob : 0,
      rmsIlByKind: ilByKind,
    };

    if (incomplete) {
      if (options?.includeIncompleteRms === true) {
        if (!description || !jm) continue;
        positions.push(position);
        continue;
      }
      if (targetNorm && normalizeDisplayCode(position.displayCode) === targetNorm) {
        return {
          ok: false,
          code: "RMS_INCOMPLETE",
          messagePl: `Pozycja ${position.displayCode} — brak pełnych R/M/S.`,
        };
      }
      continue;
    }

    if (!description || !jm) continue;

    positions.push(position);
  }

  if (targetNorm) {
    const hit = positions.find((p) => normalizeDisplayCode(p.displayCode) === targetNorm);
    if (!hit) {
      return {
        ok: false,
        code: "POSITION_NOT_FOUND",
        messagePl: `Nie znaleziono pozycji ${options?.targetDisplayCode}.`,
      };
    }
    return { ok: true, header, positions: [hit] };
  }

  if (positions.length === 0) {
    return {
      ok: false,
      code: knrFamilyOnly ? "FAMILY_NOT_KNR" : "POSITION_NOT_FOUND",
      messagePl: "Brak pozycji KNR z pełnymi normami R/M/S.",
    };
  }

  return { ok: true, header, positions };
}

/** Synthetic minimal ATH for negative tests only — NOT canonical sample. */
export function buildSyntheticAthFixture(options: {
  displayCode: string;
  withR?: boolean;
  withM?: boolean;
  withS?: boolean;
  includePln?: boolean;
}): Uint8Array {
  const pdParts = options.displayCode.replace(/^KNR\s+/i, "").split(" ");
  const catalog = pdParts[0] ?? "2-02";
  const tableCol = pdParts[1] ?? "0101-01";
  const [table, column] = tableCol.includes("-") ? tableCol.split("-") : [tableCol, "01"];
  const lines = [
    "[KOSZTORYS ATHENASOFT]",
    "pr=NORMA\t4.32",
    "wf=4",
    "[ELEMENT 1]",
    "na=Synthetic",
    "[POZYCJA]",
    `pd=ORGBUD wyd. spec. 1998\tKNR\t${catalog} ${tableCol}\t${catalog}\t${tableCol}\t\t1`,
    "na=Synthetic KNR position",
    "ob=10",
    "jm=m2\t050",
  ];
  if (options.includePln) {
    lines.push("kj=6.073\t3.896\t0.201", "cj=15.53", "wn=74.71\t20.49");
  }
  if (options.withR !== false) {
    lines.push("[RMS 47]", "nz=0.2251\t0\t0.2251", "il=2.25", "[RMS ZEST 47]", "ty=R", "na=robocizna", "jm=r-g");
  }
  if (options.withM !== false) {
    lines.push("[RMS 517]", "nz=0.0131\t0\t0.0131", "il=0.13", "[RMS ZEST 517]", "ty=M", "na=Zaprawa", "jm=m3");
  }
  if (options.withS !== false) {
    lines.push("[RMS 486]", "nz=0.0195\t0\t0.0191", "il=0.19", "[RMS ZEST 486]", "ty=S", "na=wyciag", "jm=m-g");
  }
  const text = lines.join("\n");
  return new TextEncoder().encode(text);
}
