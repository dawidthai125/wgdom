/**
 * ECONOMY-ELECTRICAL-CABLE-V1 — normalize BOQ circuitSpec → exact materialKey.
 * SOURCE = BOQ wording · ZERO fuzzy / LLM / typical-cable guess.
 */

export const ECONOMY_ELECTRICAL_CABLE_V1_KEYS = [
  "mat.przewod_ydy_3x1_5",
  "mat.przewod_ydyzo_3x1_5",
  "mat.przewod_ydyzo_3x2_5",
  "mat.przewod_ydyzo_5x6",
] as const;

export type EconomyElectricalCableV1Key = (typeof ECONOMY_ELECTRICAL_CABLE_V1_KEYS)[number];

/** Normalized circuitSpec → materialKey (MUST HAVE only). */
export const ECONOMY_ELECTRICAL_CIRCUIT_TO_KEY: Readonly<
  Record<string, EconomyElectricalCableV1Key>
> = {
  "YDY 3x1.5": "mat.przewod_ydy_3x1_5",
  "YDYzo 3x1.5": "mat.przewod_ydyzo_3x1_5",
  "YDYzo 3x2.5": "mat.przewod_ydyzo_3x2_5",
  "YDYzo 5x6": "mat.przewod_ydyzo_5x6",
};

export type EconomyElectricalCableResolveKind =
  | "mapped_v1"
  | "parameter_required"
  | "out_of_scope"
  | "deferred"
  | "not_electrical";

export interface EconomyElectricalCableResolve {
  kind: EconomyElectricalCableResolveKind;
  normalizedCircuitSpec: string | null;
  materialKey: EconomyElectricalCableV1Key | null;
  reasonPl: string;
}

function foldPl(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ź/g, "z")
    .replace(/ż/g, "z")
    .replace(/\s+/g, " ")
    .trim();
}

/** OUT-OF-SCOPE families for V1 (never map to MUST keys). */
function detectOutOfScopeFamily(t: string): string | null {
  if (/\butp\b|u\/utp/.test(t)) return "UTP";
  if (/koncentryczn|75\s*om|\brg-?6\b/.test(t)) return "COAX";
  if (/\bytksy\b/.test(t)) return "YTKSY";
  if (/\bhtksh\b/.test(t)) return "HtKSH";
  if (/xztkmxpw/.test(t)) return "XzTKMXpw";
  if (/\bnhxh\b/.test(t)) return "NHXH";
  return null;
}

/** DEFER families — recognized but not V1 MUST. */
function detectDeferredFamily(t: string): string | null {
  if (/\bhdgs\b/.test(t)) return "HDGs";
  if (/\blgyzo\b|\blgy[z]?o\b/.test(t) || /\blgy\b/.test(t)) return "LgY";
  return null;
}

/**
 * Normalize BOQ / circuit wording to canonical circuitSpec.
 * Returns null when type+cores+section cannot be determined safely.
 */
export function normalizeElectricalCircuitSpec(raw: string): string | null {
  const t = foldPl(raw);
  if (!t) return null;

  // OUT / special checked by caller; still avoid false YDY from nested noise

  // YDYzo before YDY (longer token)
  const ydyzo = t.match(
    /\bydyzo\b\s*(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)(?:\s*mm2?)?/i,
  );
  if (ydyzo) {
    const cores = ydyzo[1]!;
    const sec = ydyzo[2]!.replace(",", ".");
    return `YDYzo ${cores}x${sec}`;
  }

  const ydy = t.match(/\bydy\b\s*(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)(?:\s*mm2?)?/i);
  if (ydy) {
    const cores = ydy[1]!;
    const sec = ydy[2]!.replace(",", ".");
    return `YDY ${cores}x${sec}`;
  }

  // Already-normalized forms / runtime fragment with family prefix in raw
  const pre = String(raw || "")
    .replace(/ż/gi, "z")
    .replace(/ź/gi, "z")
    .replace(/×/g, "x")
    .replace(/,/g, ".")
    .replace(/\s*mm²|\s*mm2/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const asNorm = pre.match(/^(YDY|YDYzo)\s+(\d+)x(\d+(?:\.\d+)?)$/i);
  if (asNorm) {
    const fam = asNorm[1]!.toUpperCase() === "YDYZO" ? "YDYzo" : "YDY";
    return `${fam} ${asNorm[2]}x${asNorm[3]}`;
  }

  return null;
}

export function materialKeyForNormalizedCircuitSpec(
  normalized: string | null | undefined,
): EconomyElectricalCableV1Key | null {
  if (!normalized) return null;
  return ECONOMY_ELECTRICAL_CIRCUIT_TO_KEY[normalized] ?? null;
}

/**
 * Resolve V1 cable identity from BOQ wording (preferred) and optional runtime circuitSpec hint.
 * Never invents cable from gniazdo/oświetlenie context.
 */
export function resolveEconomyElectricalCableV1(input: {
  description?: string | null;
  normalizedDescription?: string | null;
  catalogWorkId?: string | null;
  runtimeCircuitSpec?: string | null;
}): EconomyElectricalCableResolve {
  const blob = [
    input.normalizedDescription || "",
    input.description || "",
    input.catalogWorkId || "",
    input.runtimeCircuitSpec || "",
  ].join(" ");
  const t = foldPl(blob);

  // No electrical cable cue → not our concern
  const hasCableCue =
    /ulozenie\s+przewod|ułożenie\s+przewod|wciaganie\s+przewod|przewod(y)?\s+kabelkowe|\bydy\b|\bydyzo\b|\bhdgs\b|\bnhxh\b|\butp\b|\bytksy\b|\bhtksh\b|\blgy/.test(
      t,
    ) || /przewod/.test(t);

  // Explicit no-guess: gniazdo/oświetlenie alone
  if (!hasCableCue) {
    return {
      kind: "not_electrical",
      normalizedCircuitSpec: null,
      materialKey: null,
      reasonPl: "Brak jawnnego przewodu/kabla w BOQ — nie zgadujemy",
    };
  }

  const outFam = detectOutOfScopeFamily(t);
  if (outFam) {
    return {
      kind: "out_of_scope",
      normalizedCircuitSpec: null,
      materialKey: null,
      reasonPl: `${outFam} — OUT OF SCOPE ECONOMY_ELECTRICAL_CABLE_V1`,
    };
  }

  const deferred = detectDeferredFamily(t);
  // Prefer YDY/YDYzo normalize even if LgY also mentioned; deferred only if no YDY family
  const normalized = normalizeElectricalCircuitSpec(blob);
  const key = materialKeyForNormalizedCircuitSpec(normalized);

  if (key && normalized) {
    return {
      kind: "mapped_v1",
      normalizedCircuitSpec: normalized,
      materialKey: key,
      reasonPl: `circuitSpec=${normalized} → ${key}`,
    };
  }

  if (deferred && !normalized?.startsWith("YDY")) {
    return {
      kind: "deferred",
      normalizedCircuitSpec: normalized,
      materialKey: null,
      reasonPl: `${deferred} — DEFER (poza MUST HAVE V1)`,
    };
  }

  // Incomplete / ambiguous power cable
  if (/\bydy\b|\bydyzo\b|przewod|kabelkowe|ulozenie|wciaganie/.test(t)) {
    return {
      kind: "parameter_required",
      normalizedCircuitSpec: normalized,
      materialKey: null,
      reasonPl: "Przewód bez kompletnego circuitSpec (typ+żyły+przekrój) — PARAMETER_REQUIRED",
    };
  }

  return {
    kind: "not_electrical",
    normalizedCircuitSpec: null,
    materialKey: null,
    reasonPl: "Brak mapowalnego circuitSpec V1",
  };
}
