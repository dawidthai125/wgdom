/**
 * FND-02a — Canonical JSON serializer WGDOM Dig v1 (FOUNDATION-09).
 * Bez hash / Web Crypto.
 */

import {
  FND_DIGEST_CYCLE,
  FND_DIGEST_DEPTH,
  FND_DIGEST_TOO_LARGE,
  FND_DIGEST_UNSUPPORTED_TYPE,
  throwDigestError,
} from "./errors";
import { assertPlainObject, normalizeFiniteNumber } from "./normalize";
import { DIGEST_MAX_DEPTH, DIGEST_MAX_NODES } from "./types";

/**
 * Deterministyczna serializacja JSON-kompatybilnej wartości.
 * Object keys: sort UTF-16. Arrays: order preserved.
 */
export function canonicalize(value: unknown): string {
  if (value === undefined) {
    throwDigestError(
      FND_DIGEST_UNSUPPORTED_TYPE,
      "Canonical digest rejects undefined as root",
    );
  }

  const ancestors = new Set<object>();
  let nodes = 0;

  function walk(v: unknown, depth: number): string {
    if (depth > DIGEST_MAX_DEPTH) {
      throwDigestError(FND_DIGEST_DEPTH, `Canonical digest depth exceeds ${DIGEST_MAX_DEPTH}`);
    }

    nodes += 1;
    if (nodes > DIGEST_MAX_NODES) {
      throwDigestError(
        FND_DIGEST_TOO_LARGE,
        `Canonical digest node count exceeds ${DIGEST_MAX_NODES}`,
      );
    }

    if (v === null) return "null";

    if (v === undefined) {
      throwDigestError(
        FND_DIGEST_UNSUPPORTED_TYPE,
        "Canonical digest rejects undefined in arrays (omit only in objects)",
      );
    }

    const t = typeof v;

    if (t === "boolean") return v ? "true" : "false";

    if (t === "string") return JSON.stringify(v);

    if (t === "number") {
      return JSON.stringify(normalizeFiniteNumber(v));
    }

    if (t === "bigint" || t === "symbol" || t === "function") {
      throwDigestError(
        FND_DIGEST_UNSUPPORTED_TYPE,
        `Canonical digest unsupported type: ${t}`,
      );
    }

    if (t !== "object") {
      throwDigestError(FND_DIGEST_UNSUPPORTED_TYPE, "Canonical digest unsupported value");
    }

    const obj = v as object;

    if (Array.isArray(obj)) {
      if (ancestors.has(obj)) {
        throwDigestError(FND_DIGEST_CYCLE, "Canonical digest rejects cyclic structures");
      }
      ancestors.add(obj);
      const parts: string[] = [];
      for (let i = 0; i < obj.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(obj, i)) {
          throwDigestError(
            FND_DIGEST_UNSUPPORTED_TYPE,
            "Canonical digest rejects sparse arrays",
          );
        }
        parts.push(walk(obj[i], depth + 1));
      }
      ancestors.delete(obj);
      return `[${parts.join(",")}]`;
    }

    assertPlainObject(obj);

    if (ancestors.has(obj)) {
      throwDigestError(FND_DIGEST_CYCLE, "Canonical digest rejects cyclic structures");
    }
    ancestors.add(obj);

    const keys = Object.keys(obj as Record<string, unknown>).sort();
    const parts: string[] = [];
    for (const key of keys) {
      const child = (obj as Record<string, unknown>)[key];
      if (child === undefined) continue;
      parts.push(`${JSON.stringify(key)}:${walk(child, depth + 1)}`);
    }

    ancestors.delete(obj);
    return `{${parts.join(",")}}`;
  }

  return walk(value, 0);
}
