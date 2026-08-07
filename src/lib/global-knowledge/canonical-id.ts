/**
 * GLOBAL-KNOWLEDGE-E1A — Canonical Global ID + contentHash (pure).
 */

import type { GlobalKnowledgeEntryKind } from "./types";

/** Fold do kanonu (PL-ish) — bez zależności od ath-classifier. */
export function foldGlobalText(input: string): string {
  return String(input || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/gi, "l")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Kanon kodu normy: KNR|KNNR|KSNR + numer. */
export function canonicalizeNormCode(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = String(raw).trim().toUpperCase().replace(/\s+/g, " ");
  if (!t) return null;
  const m = t.match(/^(KNR|KNNR|KSNR)\s*(.*)$/i);
  if (m) {
    const rest = (m[2] || "").replace(/\s+/g, " ").trim();
    return rest ? `${m[1]!.toUpperCase()} ${rest}` : m[1]!.toUpperCase();
  }
  return t;
}

/** Prosty FNV-1a 32-bit → hex (deterministyczny, pure). */
export function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function buildGlobalContentHash(parts: {
  kind: GlobalKnowledgeEntryKind;
  namePl: string;
  unit?: string | null;
  normCode?: string | null;
  revision: string;
}): string {
  const norm = canonicalizeNormCode(parts.normCode) ?? "";
  const payload = [
    parts.kind,
    foldGlobalText(parts.namePl),
    foldGlobalText(parts.unit ?? ""),
    norm,
    foldGlobalText(parts.revision),
  ].join("|");
  return fnv1aHex(payload) + fnv1aHex(payload.split("").reverse().join(""));
}

/**
 * Canonical Global ID.
 * Prefer: gk_{kind}_{normCanon}_{revisionHash} gdy normCode;
 * else: gk_{kind}_{contentHash12}
 */
export function buildCanonicalGlobalId(parts: {
  kind: GlobalKnowledgeEntryKind;
  namePl: string;
  unit?: string | null;
  normCode?: string | null;
  revision: string;
}): string {
  const hash = buildGlobalContentHash(parts);
  const short = hash.slice(0, 12);
  const norm = canonicalizeNormCode(parts.normCode);
  if (norm) {
    const slug = norm
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 48);
    return `gk_${parts.kind}_${slug}_${short.slice(0, 8)}`;
  }
  return `gk_${parts.kind}_${short}`;
}

export function isCanonicalGlobalIdFormat(id: string): boolean {
  return /^gk_[a-z0-9_]+$/i.test(String(id || "").trim());
}
