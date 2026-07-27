/**
 * ULID — Crockford Base32, 48-bit time + 80-bit entropy (FOUNDATION-03 / FND-01b).
 * Entropia: Web Crypto getRandomValues. Bez zależności npm.
 *
 * Random: 16 znaków Base32 (80 bitów) — każdy znak z osobnego bajtu (& 31),
 * zgodnie z powszechnymi implementacjami ULID (bez utraty bitów przy packingu).
 */

import { ULID_ALPHABET, ULID_LENGTH, isValidUlidBody } from "./validate";

const ENCODING = ULID_ALPHABET;
const TIME_LEN = 10;
const RANDOM_CHARS = 16;

export type UlidRandomSource = (bytes: Uint8Array) => void;

function defaultRandom(bytes: Uint8Array): void {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== "function") {
    throw new Error("Web Crypto getRandomValues is required for ULID generation");
  }
  cryptoObj.getRandomValues(bytes);
}

function encodeTime(timeMs: number): string {
  if (!Number.isFinite(timeMs) || timeMs < 0 || timeMs > 0xffff_ffff_ffff) {
    throw new Error("ULID time out of 48-bit range");
  }
  let t = Math.floor(timeMs);
  let out = "";
  for (let i = 0; i < TIME_LEN; i++) {
    const mod = t % 32;
    out = ENCODING[mod]! + out;
    t = Math.floor(t / 32);
  }
  return out;
}

/** 16 bajtów → 16 znaków (każdy bajt & 31). */
function encodeRandomChars(charBytes: Uint8Array): string {
  if (charBytes.length !== RANDOM_CHARS) {
    throw new Error(`ULID random requires ${RANDOM_CHARS} bytes (5-bit each)`);
  }
  let out = "";
  for (let i = 0; i < RANDOM_CHARS; i++) {
    out += ENCODING[charBytes[i]! & 31]!;
  }
  return out;
}

/**
 * Internal / test: ULID z jawnego czasu i 16 bajtów entropii (używane & 31).
 */
export function encodeUlid(timeMs: number, randomBytes: Uint8Array): string {
  if (randomBytes.length !== RANDOM_CHARS) {
    throw new Error(`encodeUlid requires ${RANDOM_CHARS} random bytes`);
  }
  const id = encodeTime(timeMs) + encodeRandomChars(randomBytes);
  if (id.length !== ULID_LENGTH || !isValidUlidBody(id)) {
    throw new Error("encodeUlid produced invalid ULID");
  }
  return id;
}

/** Dekoduje składową czasu (ms) z ULID — do testów / diagnostyki. */
export function decodeUlidTime(ulid: string): number {
  if (!isValidUlidBody(ulid)) {
    throw new Error("decodeUlidTime: invalid ULID");
  }
  let time = 0;
  for (let i = 0; i < TIME_LEN; i++) {
    const idx = ENCODING.indexOf(ulid[i]!);
    if (idx < 0) throw new Error("decodeUlidTime: bad char");
    time = time * 32 + idx;
  }
  return time;
}

function incrementCharBytes(chars: Uint8Array): void {
  for (let i = chars.length - 1; i >= 0; i--) {
    const next = ((chars[i]! & 31) + 1) & 31;
    chars[i] = next;
    if (next !== 0) return;
  }
}

let lastTime = -1;
let lastRandom: Uint8Array | null = null;

export type CreateUlidOptions = {
  nowMs?: number;
  random?: UlidRandomSource;
};

/**
 * Generuje surowy ULID (26 znaków).
 * Monotoniczność w tej samej milisekundzie: inkrement 16×5-bit entropii.
 */
export function createUlid(options?: CreateUlidOptions): string {
  const now =
    options?.nowMs !== undefined ? Math.floor(options.nowMs) : Date.now();
  const fill = options?.random ?? defaultRandom;

  let chars: Uint8Array;
  if (now === lastTime && lastRandom) {
    chars = new Uint8Array(lastRandom);
    incrementCharBytes(chars);
  } else {
    const buf = new Uint8Array(RANDOM_CHARS);
    fill(buf);
    chars = new Uint8Array(RANDOM_CHARS);
    for (let i = 0; i < RANDOM_CHARS; i++) {
      chars[i] = buf[i]! & 31;
    }
  }

  lastTime = now;
  lastRandom = new Uint8Array(chars);

  return encodeUlid(now, chars);
}

/** Reset stanu monotonicznego — tylko testy. */
export function resetUlidMonotonicStateForTests(): void {
  lastTime = -1;
  lastRandom = null;
}
