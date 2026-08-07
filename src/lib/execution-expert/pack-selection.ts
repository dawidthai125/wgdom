/**
 * P0.3 — dobór Technology Pack do robót z przedmiaru (OfferBoq).
 * REUSE: listAllPacks / ACTIVE lifecycle / catalogWorkId z Pack steps.
 */

import type { OfferBoqDocument } from "@/lib/tender-offer-boq";
import {
  listAllPacks,
  type TechnologyPack,
} from "@/lib/technology-foundation";
import { isOfferBoqLineEligibleForExecution, type OfferBoqLineLike } from "./offer-boq-adapter";
import type { ExecutionPackSelection } from "./types";

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

/** Słowa kluczowe → packId (heurystyka P0; rozszerzalna bez nowego silnika). */
const PACK_KEYWORD_HINTS: ReadonlyArray<{ packId: string; terms: string[] }> = [
  {
    packId: "pack.etics.external_wall",
    terms: [
      "etics",
      "ocieplen",
      "styropian",
      "eps",
      "xps",
      "elewacj",
      "termoizol",
      "siatka zbroj",
      "tynk elew",
      "klejenie plyt",
    ],
  },
  {
    packId: "pack.paving.concrete_cubes",
    terms: ["kostka", "bruk", "nawierzchn", "podsypk", "korytow", "zageszczar", "brukarsk"],
  },
];

function lineText(line: OfferBoqLineLike): string {
  return foldPl(`${line.normalizedDescription || ""} ${line.description || ""} ${line.catalogWorkId || ""}`);
}

function scoreLineAgainstPack(line: OfferBoqLineLike, pack: TechnologyPack): {
  score: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];
  const text = lineText(line);
  const catalogIds = new Set(pack.steps.map((s) => s.catalogWorkId));

  const cw = line.catalogWorkId?.trim();
  if (cw && catalogIds.has(cw)) {
    score += 100;
    reasons.push(`dopasowanie catalogWorkId=${cw}`);
  } else if (cw) {
    const family = cw.split(".").slice(0, 2).join(".");
    if (family && [...catalogIds].some((id) => id.startsWith(`${family}.`) || id === family)) {
      score += 80;
      reasons.push(`rodzina katalogu ${family}`);
    }
  }

  for (const hint of PACK_KEYWORD_HINTS) {
    if (hint.packId !== pack.packId) continue;
    for (const term of hint.terms) {
      if (text.includes(foldPl(term))) {
        score += 25;
        reasons.push(`słowo kluczowe „${term}”`);
        break;
      }
    }
  }

  // Pack step / name tokens
  const packBlob = foldPl(
    `${pack.namePl} ${pack.steps.map((s) => s.namePl).join(" ")} ${pack.packCapabilities.join(" ")}`,
  );
  if (text.length >= 6) {
    const tokens = text.split(" ").filter((t) => t.length >= 5).slice(0, 8);
    let tokenHits = 0;
    for (const t of tokens) {
      if (packBlob.includes(t)) tokenHits += 1;
    }
    if (tokenHits >= 2) {
      score += 15;
      reasons.push(`zbieżność opisu z recepturą (${tokenHits} tokeny)`);
    }
  }

  return { score, reasons };
}

export function selectTechnologyPackForOfferBoq(
  doc: Pick<OfferBoqDocument, "lines">,
  packs?: TechnologyPack[],
): ExecutionPackSelection | null {
  const active = (packs ?? listAllPacks()).filter((p) => p.lifecycle === "ACTIVE");
  if (active.length === 0) return null;

  const lines = (doc.lines ?? []).filter(isOfferBoqLineEligibleForExecution);
  if (lines.length === 0) return null;

  type Acc = {
    pack: TechnologyPack;
    score: number;
    reasons: string[];
    matchedLineIds: string[];
  };

  const byPack = new Map<string, Acc>();

  for (const pack of active) {
    const key = `${pack.packId}@@${pack.packVersion}`;
    const acc: Acc = { pack, score: 0, reasons: [], matchedLineIds: [] };
    for (const line of lines) {
      const { score, reasons } = scoreLineAgainstPack(line, pack);
      if (score <= 0) continue;
      acc.score += score;
      for (const r of reasons) {
        if (!acc.reasons.includes(r)) acc.reasons.push(r);
      }
      acc.matchedLineIds.push(String(line.lineId));
    }
    if (acc.score > 0) byPack.set(key, acc);
  }

  const ranked = [...byPack.values()].sort((a, b) => b.score - a.score || a.pack.packId.localeCompare(b.pack.packId));
  const best = ranked[0];
  if (!best || best.score < 25) return null;

  return {
    packId: best.pack.packId,
    packVersion: best.pack.packVersion,
    namePl: best.pack.namePl,
    score: best.score,
    matchReasonsPl: best.reasons.slice(0, 8),
    matchedLineIds: [...new Set(best.matchedLineIds)],
  };
}
