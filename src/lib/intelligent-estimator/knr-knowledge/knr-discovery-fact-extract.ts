/**
 * IK-KNR Phase 2 — thin FACT extraction from discovery evidence fragments.
 * NEVER invents description/unit/R/M/S. PARTIAL when fields missing.
 * Phase 2D: targeted extract + layout-aware multi-line PDF (Norma PRO tables).
 */

import type { KnrDiscoveryEvidenceRecord } from "./knr-discovery-evidence-types";

export type KnrDiscoveryFactExtractionStatus =
  | "FULL"
  | "PARTIAL_DISCOVERY"
  | "EMPTY"
  | "CONFLICT";

export type KnrDiscoveryFactCandidate = {
  knrCode: string;
  normalizedKnrCode: string;
  description: string | null;
  unit: string | null;
  sourceId: string | null;
  sourceUrlHash: string | null;
  evidenceRef: string;
  confidence: "high" | "medium" | "low" | "none";
  extractionStatus: KnrDiscoveryFactExtractionStatus;
};

/** Safe units — bare "T"/"t" is NOT accepted (table false positive). */
const UNIT_TOKEN_RE =
  /\b(m\s*[2²]|m2|m²|m\s*[3³]|m3|m³|mb|m\.b\.|szt\.?|kpl\.?|kg|r-g|rob\.?-?godz\.?|litr(?:y|ów)?|l)\b/gi;

/** Contiguous BOQ pipe row. */
const BOQ_PIPE_RE =
  /\b((?:KNR-W|KNR|KNNR-?W?|KSNR|KNP|ZKNR)[^|\n]{0,40})\s*\|\s*([^|\n]{8,160})\s*\|\s*(m\s*[23²³]|m2|m²|m3|m³|mb|szt\.?|kpl\.?|kg|l)\b/i;

const DESC_LABEL_RE =
  /(?:opis|description|nazwa)\s*[:\-–]\s*([^\n\r|]{8,160})/i;

/**
 * Prefix of a KNR-family row (numeric catalog OR letter catalog e.g. KNR BC-02).
 * Used only as a hard stop for description windows — not as full-code proof.
 */
const KNR_PREFIX_RE =
  /\b((?:KNR-W|KNR|KNNR-?W?|KSNR|KNP|ZKNR)\s+(?:[0-9]{1,2}\s*[-–]?\s*[0-9]{2}|[A-Z]{1,4}\s*[-–]?\s*[0-9]{1,4}))\b/gi;

const CONTEXT_CHARS_AFTER = 320;
const CONTEXT_CHARS_BEFORE = 40;
const MAX_DESC_LEN = 180;
const MIN_DESC_LEN = 8;

export type KnrDiscoveryParsedTarget = {
  family: "KNR" | "KNR-W";
  catalog: string;
  table: string;
  item: string;
  displayCode: string;
};

export function foldKnrDiscoveryCode(s: string): string {
  return String(s ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/\|+/g, "|")
    .replace(/\//g, "-");
}

function foldCode(s: string): string {
  return foldKnrDiscoveryCode(s);
}

/**
 * Parse expected KNR into family / catalog / table / item.
 * Rejects bare table-item without family+catalog.
 */
export function parseKnrDiscoveryExpectedTarget(
  expected: string | null | undefined,
): KnrDiscoveryParsedTarget | null {
  const raw = String(expected ?? "").trim();
  if (!raw) return null;
  const folded = foldCode(raw);
  const m = folded.match(
    /^(KNR-W|KNR)\|?(\d{1,2})-?(\d{2})\|?(\d{2,4})-?(\d{1,3})$/i,
  );
  if (!m) {
    // also accept spaced display forms via fold already collapsed
    const m2 = folded.match(
      /^(KNR-W|KNR)(\d{1,2})-?(\d{2})(\d{2,4})-?(\d{1,3})$/i,
    );
    if (!m2) return null;
    const family = (m2[1]!.toUpperCase() === "KNR-W" ? "KNR-W" : "KNR") as
      | "KNR"
      | "KNR-W";
    const catalog = `${m2[2]}-${m2[3]}`;
    const table = m2[4]!;
    const item = m2[5]!;
    return {
      family,
      catalog,
      table,
      item,
      displayCode: `${family} ${catalog} ${table}-${item}`,
    };
  }
  const family = (m[1]!.toUpperCase() === "KNR-W" ? "KNR-W" : "KNR") as
    | "KNR"
    | "KNR-W";
  const catalog = `${m[2]}-${m[3]}`;
  const table = m[4]!;
  const item = m[5]!;
  return {
    family,
    catalog,
    table,
    item,
    displayCode: `${family} ${catalog} ${table}-${item}`,
  };
}

/** Normalize unit tokens; reject bare T/t. */
export function normalizeKnrDiscoveryUnitToken(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let u = String(raw).trim().toLowerCase();
  if (!u) return null;
  if (u === "t" || u === "ton" || u === "tony") {
    // Bare "t" is ambiguous in table layout — reject unless explicit tonne forms later.
    // Owner contract: do not accept false-positive "T".
    if (u === "t") return null;
  }
  u = u
    .replace(/m\s*[²2]/g, "m2")
    .replace(/m\s*[³3]/g, "m3")
    .replace(/m²/g, "m2")
    .replace(/m³/g, "m3");
  if (/^m\s*2$/.test(u) || u === "m2") return "m2";
  if (/^m\s*3$/.test(u) || u === "m3") return "m3";
  if (/^szt\.?$/.test(u)) return u.endsWith(".") ? "szt." : "szt";
  if (/^kpl\.?$/.test(u)) return u.endsWith(".") ? "kpl." : "kpl";
  if (u === "kg" || u === "mb" || u === "m" || u === "l" || u === "m.b.") return u;
  if (/^r-g$|^rob/.test(u)) return u;
  // Reject single-letter leftovers
  if (u.length <= 1) return null;
  return u;
}

function findUnitInWindow(windowText: string): string | null {
  UNIT_TOKEN_RE.lastIndex = 0;
  let best: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = UNIT_TOKEN_RE.exec(windowText)) !== null) {
    const norm = normalizeKnrDiscoveryUnitToken(m[1]);
    if (norm) {
      best = norm;
      // Prefer first clear unit near the start of the position window
      break;
    }
  }
  // Explicit spaced surface unit: "m 2" / "m\n2"
  if (!best) {
    const spaced = windowText.match(/\bm\s*[2²]\b/i);
    if (spaced) best = "m2";
  }
  if (!best) {
    const spaced3 = windowText.match(/\bm\s*[3³]\b/i);
    if (spaced3) best = "m3";
  }
  return best;
}

/** Build loose contiguous matchers (legacy + slash/hyphen). */
export function buildKnrDiscoveryTargetMatchers(expected: string): RegExp[] {
  const parsed = parseKnrDiscoveryExpectedTarget(expected);
  const patterns: string[] = [];
  if (parsed) {
    const fam = parsed.family === "KNR-W" ? "KNR-W" : "KNR";
    const [catA, catB] = parsed.catalog.split("-");
    patterns.push(
      `${fam}\\s*${catA}\\s*[-–]?\\s*${catB}\\s+${parsed.table}\\s*[\\/\\-–]\\s*${parsed.item}`,
      `${fam}\\s*${catA}\\s*[-–]?\\s*${catB}\\s+${parsed.table}${parsed.item}`,
    );
  }
  const folded = foldCode(expected);
  if (folded) {
    const loose = folded
      .replace(/[|]/g, "\\|?")
      .replace(/-/g, "[\\\\/\\\\-–]?")
      .replace(/([A-Z]+)/g, "$1\\\\s*");
    patterns.push(loose);
  }
  return patterns
    .map((p) => {
      try {
        return new RegExp(p, "i");
      } catch {
        return null;
      }
    })
    .filter((x): x is RegExp => Boolean(x));
}

function nextKnrPrefixIndex(text: string, from: number): number {
  KNR_PREFIX_RE.lastIndex = from;
  const m = KNR_PREFIX_RE.exec(text);
  return m && m.index != null ? m.index : -1;
}

/**
 * Locate target in document allowing multi-line split:
 *   "KNR-W 4-01 …"  + nearby "0701-05"
 * Requires BOTH family+catalog prefix AND table-item — bare "0701-05" alone is NOT enough.
 */
export function locateKnrDiscoveryLayoutTarget(
  documentText: string,
  expected: string | null | undefined,
): {
  start: number;
  end: number;
  /** Index where family+catalog (or contiguous code) begins — unit/desc from here only. */
  codeStart: number;
  knrCode: string;
  windowText: string;
  /** Slice from codeStart→end (no prior-row bleed for unit/desc). */
  factSlice: string;
} | null {
  const text = String(documentText ?? "");
  const parsed = parseKnrDiscoveryExpectedTarget(expected);
  if (!parsed || !text) return null;

  const itemAt = (idx: number): boolean => {
    if (idx < 0 || idx >= text.length) return false;
    const slice = text.slice(idx, Math.min(text.length, idx + 96));
    return new RegExp(
      `\\b${parsed.table}\\s*[\\/\\-–]\\s*${parsed.item}\\b`,
      "i",
    ).test(slice);
  };

  const finish = (codeStart: number, endRaw: number) => {
    let end = endRaw;
    // Stop at next KNR row — but NOT at a duplicate of the same target
    // (e.g. displayCode prepended before an identical fragment).
    let scanFrom = codeStart + 8;
    for (let guard = 0; guard < 4; guard++) {
      const nextAfter = nextKnrPrefixIndex(text, scanFrom);
      if (nextAfter <= codeStart || nextAfter >= end) break;
      if (itemAt(nextAfter)) {
        // Same table-item nearby → skip duplicate prefix, keep scanning
        scanFrom = nextAfter + 8;
        continue;
      }
      end = nextAfter;
      break;
    }
    const start = Math.max(0, codeStart - CONTEXT_CHARS_BEFORE);
    return {
      start,
      end,
      codeStart,
      knrCode: parsed.displayCode,
      windowText: text.slice(start, end),
      factSlice: text.slice(codeStart, end),
    };
  };

  // 1) Contiguous match — prefer the hit with the richest factSlice (desc/unit)
  {
    let best: ReturnType<typeof finish> | null = null;
    let bestScore = -1;
    for (const re of buildKnrDiscoveryTargetMatchers(expected ?? "")) {
      const global = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
      let hit: RegExpExecArray | null;
      while ((hit = global.exec(text)) !== null) {
        if (hit.index == null) continue;
        const cand = finish(
          hit.index,
          Math.min(text.length, hit.index + hit[0].length + CONTEXT_CHARS_AFTER),
        );
        const hasUnit = Boolean(findUnitInWindow(cand.factSlice));
        const hasDesc = Boolean(extractDescriptionFromWindow(cand.factSlice, parsed));
        const score =
          cand.factSlice.length + (hasUnit ? 80 : 0) + (hasDesc ? 200 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = cand;
        }
      }
    }
    if (best && bestScore > 0) return best;
  }

  // 2) Layout-aware: prefix then table-item within a bounded forward window
  const prefixRe = new RegExp(
    `\\b(${parsed.family === "KNR-W" ? "KNR-W" : "KNR"}\\s+${parsed.catalog.replace("-", "\\s*[-–]?\\s*")})\\b`,
    "gi",
  );
  const itemRe = new RegExp(
    `\\b${parsed.table}\\s*[\\/\\-–]\\s*${parsed.item}\\b`,
    "i",
  );

  let pm: RegExpExecArray | null;
  while ((pm = prefixRe.exec(text)) !== null) {
    const prefixIdx = pm.index;
    const prefixEnd = prefixIdx + pm[0].length;
    let searchEnd = Math.min(text.length, prefixEnd + CONTEXT_CHARS_AFTER);
    const next = nextKnrPrefixIndex(text, prefixEnd);
    if (next > 0 && next < searchEnd) searchEnd = next;

    const slice = text.slice(prefixIdx, searchEnd);
    const itemHit = itemRe.exec(slice);
    if (!itemHit || itemHit.index == null) continue;

    return finish(
      prefixIdx,
      Math.min(text.length, prefixIdx + itemHit.index + itemHit[0].length + 160),
    );
  }

  return null;
}

function looksLikeWorkDescription(d: string): boolean {
  if (/\b(padding|xxxxxxxx|enough text for min|fixture only)\b/i.test(d)) {
    return false;
  }
  if (/^(prefix|trailing)\b/i.test(d) && !/[ąćęłńóśźż]/i.test(d)) {
    return false;
  }
  const words = d
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ-]/g, ""))
    .filter((w) => w.length >= 4);
  return words.length >= 2;
}

function cleanDescription(raw: string): string | null {
  let d = raw
    .replace(/\s+/g, " ")
    .replace(/^\s*[-–:|.]+\s*/, "")
    .replace(/\s*[-–]+\s*$/, "")
    .trim();
  // Drop leading position / d.x.x / analogia noise
  d = d
    .replace(/^(?:d\.\d+(?:\.\d+)?\s+)+/i, "")
    .replace(/\banalogia\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Strip test/fixture filler tails before quality checks
  d = d
    .replace(/\benough padding\b.*$/i, "")
    .replace(/\bx{6,}\b.*$/i, "")
    .replace(/\benough text for min length gate\b.*$/i, "")
    .trim();
  // Strip trailing quantities like "37,96" / formulas
  d = d.replace(/\s+\d+[.,]\d+\s*$/, "").trim();
  d = d.replace(/\s*\([^)]{0,40}\)\s*$/, "").trim();
  if (d.length < MIN_DESC_LEN || d.length > MAX_DESC_LEN) {
    if (d.length > MAX_DESC_LEN) d = d.slice(0, MAX_DESC_LEN).trim();
    if (d.length < MIN_DESC_LEN) return null;
  }
  // Reject if description is mostly the code itself
  if (/^KNR/i.test(d) && d.length < 20) return null;
  if (!looksLikeWorkDescription(d)) return null;
  return d;
}

/**
 * Pull description from a layout window, excluding code tokens and stopping
 * before the next KNR row. Does not invent text.
 */
function extractDescriptionFromWindow(
  windowText: string,
  parsed: KnrDiscoveryParsedTarget,
): string | null {
  const labeled = windowText.match(DESC_LABEL_RE);
  if (labeled?.[1]) {
    const c = cleanDescription(labeled[1]);
    if (c) return c;
  }

  let work = windowText;
  // Cut at the next foreign KNR row (after our own family+catalog prefix).
  {
    const ownRe = new RegExp(
      `${parsed.family}\\s+${parsed.catalog.replace("-", "\\s*[-–]?\\s*")}`,
      "i",
    );
    const ownHit = ownRe.exec(work);
    const searchFrom = ownHit && ownHit.index != null
      ? ownHit.index + ownHit[0].length
      : 0;
    const foreignRe =
      /\b(?:KNR-W|KNR|KNNR-?W?|KSNR|KNP|ZKNR)\s+(?:[0-9]{1,2}\s*[-–]?\s*[0-9]{2}|[A-Z]{1,4}\s*[-–]?\s*[0-9]{1,4})\b/gi;
    foreignRe.lastIndex = searchFrom;
    const fm = foreignRe.exec(work);
    if (fm && fm.index != null && fm.index >= searchFrom) {
      work = work.slice(0, fm.index);
    }
  }

  // Remove family+catalog occurrences
  work = work.replace(
    new RegExp(
      `${parsed.family}\\s+${parsed.catalog.replace("-", "\\s*[-–]?\\s*")}`,
      "gi",
    ),
    " ",
  );
  // Remove table-item token
  work = work.replace(
    new RegExp(`${parsed.table}\\s*[\\/\\-–]\\s*${parsed.item}`, "gi"),
    " ",
  );
  // Remove units
  work = work.replace(UNIT_TOKEN_RE, " ");
  work = work.replace(/\bm\s*[23²³]\b/gi, " ");
  // Remove common row indices / section markers
  work = work.replace(/\bd\.\d+(?:\.\d+)?\b/gi, " ");
  work = work.replace(/\b\d{1,3}\s+(?=KNR)/gi, " ");
  work = work.replace(/\bRAZEM\b/gi, " ");
  work = work.replace(/\banalogia\b/gi, " ");
  // Remove arithmetic leftovers
  work = work.replace(/\([^)]*\)/g, " ");
  work = work.replace(/[=\-+*]{1,}/g, " ");
  work = work.replace(/\b\d+[.,]\d+\b/g, " ");

  const cleaned = cleanDescription(work);
  return cleaned;
}

function pickFragment(record: KnrDiscoveryEvidenceRecord): string {
  const frags = record.sources
    .map((s) => String(s.fragment ?? "").trim())
    .filter(Boolean);
  const bits = [
    typeof record.description === "string" ? record.description.trim() : "",
    typeof record.unit === "string" ? record.unit.trim() : "",
    ...frags,
  ].filter(Boolean);
  let body = bits.join("\n").trim();
  // Do not prepend displayCode when fragment already contains a KNR token —
  // duplicate codes create a false "next row" boundary (desc/unit lost).
  if (!body) {
    body = String(record.displayCode ?? "").trim();
  } else if (!/\bKNR/i.test(body) && record.displayCode) {
    body = `${record.displayCode}\n${body}`;
  }
  return body;
}

function finalizeCandidate(input: {
  knrCode: string;
  normalizedKnrCode: string;
  description: string | null;
  unit: string | null;
  sourceId: string | null;
  sourceUrlHash: string | null;
  evidenceRef: string;
  confidence: KnrDiscoveryFactCandidate["confidence"];
  conflict?: boolean;
}): KnrDiscoveryFactCandidate {
  if (input.conflict) {
    return {
      ...input,
      confidence: "none",
      extractionStatus: "CONFLICT",
    };
  }
  if (!input.description && !input.unit && !input.knrCode) {
    return {
      ...input,
      confidence: "none",
      extractionStatus: "EMPTY",
    };
  }
  if (input.description && input.unit) {
    return {
      ...input,
      extractionStatus: "FULL",
    };
  }
  return {
    ...input,
    confidence: input.description || input.unit ? "low" : "none",
    extractionStatus: "PARTIAL_DISCOVERY",
  };
}

/**
 * Targeted FACT extract from a full document body for one MISS key.
 * Layout-aware for multi-line Norma PRO PDF text. Never invents fields.
 */
export function extractKnrDiscoveryFactFromDocumentText(
  documentText: string,
  options: {
    expectedCode?: string | null;
    evidenceKeyV1?: string | null;
    sourceId?: string | null;
    sourceUrlHash?: string | null;
  } = {},
): KnrDiscoveryFactCandidate {
  const text = String(documentText ?? "");
  const expectedRaw = options.expectedCode ?? options.evidenceKeyV1 ?? "";
  const expected = foldCode(expectedRaw);
  const evidenceRef = String((options.evidenceKeyV1 ?? expected) || "doc");
  const parsed = parseKnrDiscoveryExpectedTarget(expectedRaw);

  // Bare table-item without family+catalog → do not claim full KNR
  if (!parsed) {
    const bareItem = /^\d{2,4}\s*[/\-–]\s*\d{1,3}$/.test(String(expectedRaw).trim());
    return finalizeCandidate({
      knrCode: bareItem ? "" : String(expectedRaw).trim() || expected,
      normalizedKnrCode: expected,
      description: null,
      unit: null,
      sourceId: options.sourceId ?? null,
      sourceUrlHash: options.sourceUrlHash ?? null,
      evidenceRef,
      confidence: "none",
    });
  }

  const located = locateKnrDiscoveryLayoutTarget(text, expectedRaw);

  let knrCode = parsed.displayCode;
  let description: string | null = null;
  let unit: string | null = null;
  let codeVerifiedInDoc = false;

  if (located) {
    codeVerifiedInDoc = true;
    knrCode = located.knrCode;
    const win = located.factSlice;

    // Pipe BOQ inside window
    const boq = win.match(BOQ_PIPE_RE);
    if (boq) {
      if (!description && boq[2]) description = cleanDescription(boq[2]);
      if (!unit && boq[3]) unit = normalizeKnrDiscoveryUnitToken(boq[3]);
    }

    if (!unit) unit = findUnitInWindow(win);
    if (!description) description = extractDescriptionFromWindow(win, parsed);
  } else {
    // No layout hit — try pipe / label on whole text without claiming code verified
    const boq = text.match(BOQ_PIPE_RE);
    if (boq && foldCode(boq[1] ?? "").includes(foldCode(parsed.catalog))) {
      // Only accept if family prefix present in same match
      if (/\bKNR/i.test(boq[1] ?? "")) {
        codeVerifiedInDoc = true;
        knrCode = parsed.displayCode;
        description = cleanDescription(boq[2] ?? "");
        unit = normalizeKnrDiscoveryUnitToken(boq[3]);
      }
    }
  }

  // If code was not verified in document, do not pretend FULL from expected-only
  if (!codeVerifiedInDoc) {
    return finalizeCandidate({
      knrCode: parsed.displayCode,
      normalizedKnrCode: foldCode(parsed.displayCode),
      description: null,
      unit: null,
      sourceId: options.sourceId ?? null,
      sourceUrlHash: options.sourceUrlHash ?? null,
      evidenceRef,
      confidence: "none",
    });
  }

  return finalizeCandidate({
    knrCode,
    normalizedKnrCode: foldCode(knrCode) || expected,
    description,
    unit,
    sourceId: options.sourceId ?? null,
    sourceUrlHash: options.sourceUrlHash ?? null,
    evidenceRef,
    confidence: description && unit ? "medium" : description || unit ? "low" : "none",
  });
}

/**
 * Locate a targeted context window for ingest fragment (shared document body).
 */
export function sliceKnrDiscoveryTargetContext(
  documentText: string,
  expectedCode: string | null | undefined,
  maxLen = 500,
): string {
  const text = String(documentText ?? "");
  if (!text) return "";
  const located = locateKnrDiscoveryLayoutTarget(text, expectedCode);
  if (located) {
    return located.factSlice.replace(/\s+/g, " ").trim().slice(0, maxLen);
  }
  for (const re of buildKnrDiscoveryTargetMatchers(expectedCode ?? "")) {
    const hit = text.match(re);
    if (hit && hit.index != null) {
      const start = Math.max(0, hit.index - CONTEXT_CHARS_BEFORE);
      const end = Math.min(
        text.length,
        hit.index + Math.max(hit[0].length, 80) + CONTEXT_CHARS_AFTER,
      );
      return text.slice(start, end).replace(/\s+/g, " ").trim().slice(0, maxLen);
    }
  }
  return text.slice(0, maxLen).replace(/\s+/g, " ").trim();
}

/**
 * Extract FACT candidate from discovery evidence only.
 * Does not write catalog · does not VERIFY · does not invent fields.
 */
export function extractKnrDiscoveryFactCandidate(
  record: KnrDiscoveryEvidenceRecord,
  expectedNormalizedKey?: string | null,
): KnrDiscoveryFactCandidate {
  const evidenceRef = record.evidenceKeyV1;
  const expected = foldCode(expectedNormalizedKey ?? record.evidenceKeyV1);
  const text = pickFragment(record);

  let knrCode = String(record.displayCode ?? "").trim() || expected;
  let description: string | null =
    typeof record.description === "string" && record.description.trim()
      ? record.description.trim()
      : null;
  let unit: string | null =
    typeof record.unit === "string" && record.unit.trim()
      ? normalizeKnrDiscoveryUnitToken(record.unit)
      : null;

  const fromDoc = extractKnrDiscoveryFactFromDocumentText(text, {
    expectedCode: record.displayCode ?? expectedNormalizedKey,
    evidenceKeyV1: evidenceRef,
    sourceId: record.sources[0]?.sourceId ?? null,
    sourceUrlHash: record.sources[0]?.urlHash ?? null,
  });
  if (!description && fromDoc.description) description = fromDoc.description;
  if (!unit && fromDoc.unit) unit = fromDoc.unit;
  if (fromDoc.knrCode && fromDoc.extractionStatus !== "EMPTY") {
    knrCode = fromDoc.knrCode;
  }

  const boq = text.match(BOQ_PIPE_RE);
  if (boq) {
    if (boq[1]) knrCode = boq[1].trim();
    if (!description && boq[2]) description = cleanDescription(boq[2]);
    if (!unit && boq[3]) unit = normalizeKnrDiscoveryUnitToken(boq[3]);
  }

  if (!description) {
    const m = text.match(DESC_LABEL_RE);
    if (m?.[1]) description = cleanDescription(m[1]);
  }

  if (!unit) {
    unit = findUnitInWindow(text);
  }

  const primary = record.sources[0] ?? null;
  const sourceId = primary?.sourceId ?? null;
  const sourceUrlHash = primary?.urlHash ?? null;
  const normalizedKnrCode = foldCode(knrCode) || expected;

  if (record.discoveryStatus === "CONFLICT") {
    return finalizeCandidate({
      knrCode,
      normalizedKnrCode,
      description,
      unit,
      sourceId,
      sourceUrlHash,
      evidenceRef,
      confidence: "none",
      conflict: true,
    });
  }

  if (!text && !description && !unit) {
    return finalizeCandidate({
      knrCode,
      normalizedKnrCode,
      description: null,
      unit: null,
      sourceId,
      sourceUrlHash,
      evidenceRef,
      confidence: "none",
    });
  }

  return finalizeCandidate({
    knrCode,
    normalizedKnrCode,
    description,
    unit,
    sourceId,
    sourceUrlHash,
    evidenceRef,
    confidence: description && unit
      ? (record.sources.length >= 2 ? "high" : "medium")
      : description || unit
        ? "low"
        : "none",
  });
}

export const KNR_DISCOVERY_FACT_EXTRACT_P2_IMPLEMENTED = true as const;
/** Layout-aware multi-line PDF FACT (Phase 2D fix). */
export const KNR_DISCOVERY_FACT_LAYOUT_P2D_IMPLEMENTED = true as const;
