/**
 * MARKET-MATERIAL-RESEARCH-02 — config / D1 source status (thin).
 *
 * D1 PRIMARY SOURCE = UNKNOWN until Owner verification.
 * connected:true is FORBIDDEN while Legal OPEN or D1 UNKNOWN (AR C1).
 */

export const MMR_02_PRIMARY_SOURCE_STATUS = "UNKNOWN" as const;

export type Mmr02PrimarySourceStatus = "UNKNOWN" | "VERIFIED";

/** C4 load limits — binding. */
export const MMR_02_RATE_LIMIT_PER_MIN = 6;
export const MMR_02_TIMEOUT_MS = 12_000;
export const MMR_02_MAX_RETRY = 1;
export const MMR_02_CIRCUIT_FAILURES = 3;
export const MMR_02_CIRCUIT_WINDOW_MS = 5 * 60_000;

export const MMR_02_DISCONNECTED_PROVIDER_ID = "mmr02_disconnected";

/** Package / retail pack units — never invent conversion (AR / DF). */
export const MMR_02_PACKAGE_UNITS = new Set([
  "op",
  "op.",
  "opak",
  "opakowanie",
  "szt",
  "szt.",
  "kpl",
  "karton",
  "paczk",
  "paczka",
]);
