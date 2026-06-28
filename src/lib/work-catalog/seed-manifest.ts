/**
 * Biblioteka Robót i Cennik v3.0 — seed manifest (struktura produktu, bez cen).
 */

import { normalizeWgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import { isTradeId, TRADE_IDS, type TradeId } from "@/lib/work-catalog/trades";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";

export const SEED_MANIFEST_VERSION = "1.0";
export const SEED_MANIFEST_RELATIVE_PATH = "docs/work-catalog/SEED-MANIFEST-v1.0.yaml";

export interface SeedManifestWorkEntry {
  id: string;
  tradeId: TradeId;
  name: string;
  unit: WgdomCostUnit;
  keywords: string[];
  active: boolean;
}

export interface SeedManifestDocument {
  manifestVersion: string;
  locale: string;
  works: SeedManifestWorkEntry[];
}

export type SeedManifestIssueCode =
  | "invalid_root"
  | "missing_field"
  | "invalid_trade_id"
  | "invalid_unit"
  | "duplicate_id"
  | "duplicate_name_in_trade"
  | "empty_keywords"
  | "empty_trade"
  | "invalid_work_entry";

export interface SeedManifestValidationIssue {
  code: SeedManifestIssueCode;
  message: string;
  workId?: string;
  tradeId?: string;
}

export interface SeedManifestValidationResult {
  valid: boolean;
  issues: SeedManifestValidationIssue[];
  workCount: number;
  tradeCounts: Partial<Record<TradeId, number>>;
}

function parseScalar(raw: string): unknown {
  const s = raw.trim();
  if (!s) return "";
  if (s.startsWith("[") && s.endsWith("]")) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((part) => String(parseScalar(part.trim())).trim()).filter(Boolean);
  }
  if (s === "true") return true;
  if (s === "false") return false;
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

/**
 * Parser YAML ograniczony do formatu SEED-MANIFEST-v1.0 (bez zewnętrznych zależności).
 * Obsługuje: root scalars, lista `works` z polami wciętymi, keywords w formie flow `[a, b]`.
 */
export function parseSeedManifestYaml(yamlText: string): unknown {
  const lines = yamlText.split(/\r?\n/).filter((line) => {
    const t = line.trim();
    return t.length > 0 && !t.startsWith("#");
  });

  const doc: Record<string, unknown> = {};
  let i = 0;

  while (i < lines.length && !lines[i].startsWith("works:")) {
    const match = lines[i].match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (match) {
      doc[match[1]] = parseScalar(match[2]);
    }
    i += 1;
  }

  if (i < lines.length && lines[i].startsWith("works:")) {
    i += 1;
  }

  const works: Record<string, unknown>[] = [];

  while (i < lines.length) {
    if (!/^\s+-\s+id:/.test(lines[i])) {
      i += 1;
      continue;
    }

    const work: Record<string, unknown> = {};
    const idMatch = lines[i].match(/id:\s*(.*)$/);
    work.id = parseScalar(idMatch?.[1] ?? "");
    i += 1;

    while (i < lines.length && /^\s{4}\S/.test(lines[i]) && !/^\s+-\s+id:/.test(lines[i])) {
      const kv = lines[i].match(/^\s{4}([A-Za-z0-9_]+):\s*(.*)$/);
      if (kv) {
        work[kv[1]] = parseScalar(kv[2]);
      }
      i += 1;
    }

    works.push(work);
  }

  doc.works = works;
  return doc;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeNameKey(name: string): string {
  return name.trim().toLocaleLowerCase("pl-PL");
}

function isValidUnit(value: unknown): value is WgdomCostUnit {
  return typeof value === "string" && normalizeWgdomCostUnit(value) != null;
}

function parseWorkEntry(raw: unknown, index: number): { work?: SeedManifestWorkEntry; issues: SeedManifestValidationIssue[] } {
  const issues: SeedManifestValidationIssue[] = [];
  if (!raw || typeof raw !== "object") {
    issues.push({
      code: "invalid_work_entry",
      message: `works[${index}] nie jest obiektem`,
    });
    return { issues };
  }

  const entry = raw as Record<string, unknown>;
  const workId = typeof entry.id === "string" ? entry.id : "";

  if (!isNonEmptyString(entry.id)) {
    issues.push({ code: "missing_field", message: `works[${index}]: brak id`, workId });
  }
  if (!isTradeId(entry.tradeId)) {
    issues.push({
      code: "invalid_trade_id",
      message: `works[${index}]: niepoprawny tradeId`,
      workId: workId || undefined,
      tradeId: typeof entry.tradeId === "string" ? entry.tradeId : undefined,
    });
  }
  if (!isNonEmptyString(entry.name)) {
    issues.push({
      code: "missing_field",
      message: `works[${index}]: brak name`,
      workId: workId || undefined,
    });
  }
  if (!isValidUnit(entry.unit)) {
    issues.push({
      code: "invalid_unit",
      message: `works[${index}]: niepoprawny unit`,
      workId: workId || undefined,
    });
  }
  if (!Array.isArray(entry.keywords) || entry.keywords.length === 0) {
    issues.push({
      code: "empty_keywords",
      message: `works[${index}]: brak keywords`,
      workId: workId || undefined,
    });
  } else {
    for (const kw of entry.keywords) {
      if (!isNonEmptyString(kw)) {
        issues.push({
          code: "empty_keywords",
          message: `works[${index}]: puste słowo kluczowe`,
          workId: workId || undefined,
        });
        break;
      }
    }
  }
  if (typeof entry.active !== "boolean") {
    issues.push({
      code: "missing_field",
      message: `works[${index}]: brak active (boolean)`,
      workId: workId || undefined,
    });
  }

  if (issues.length > 0) {
    return { issues };
  }

  const keywords = (entry.keywords as unknown[])
    .map((kw) => String(kw).trim())
    .filter(Boolean);

  return {
    work: {
      id: entry.id as string,
      tradeId: entry.tradeId as TradeId,
      name: (entry.name as string).trim(),
      unit: normalizeWgdomCostUnit(entry.unit as string)!,
      keywords,
      active: entry.active as boolean,
    },
    issues,
  };
}

export function validateSeedManifestStructure(raw: unknown): SeedManifestValidationResult {
  const issues: SeedManifestValidationIssue[] = [];
  const tradeCounts = Object.fromEntries(TRADE_IDS.map((id) => [id, 0])) as Partial<Record<TradeId, number>>;

  if (!raw || typeof raw !== "object") {
    return {
      valid: false,
      issues: [{ code: "invalid_root", message: "Manifest musi być obiektem" }],
      workCount: 0,
      tradeCounts,
    };
  }

  const doc = raw as Record<string, unknown>;

  if (!isNonEmptyString(doc.manifestVersion)) {
    issues.push({ code: "missing_field", message: "Brak manifestVersion" });
  }
  if (!isNonEmptyString(doc.locale)) {
    issues.push({ code: "missing_field", message: "Brak locale" });
  }
  if (!Array.isArray(doc.works)) {
    issues.push({ code: "missing_field", message: "Brak tablicy works" });
    return { valid: false, issues, workCount: 0, tradeCounts };
  }

  const seenIds = new Set<string>();
  const seenNamesByTrade = new Map<TradeId, Set<string>>();
  const parsedWorks: SeedManifestWorkEntry[] = [];

  for (let index = 0; index < doc.works.length; index += 1) {
    const { work, issues: entryIssues } = parseWorkEntry(doc.works[index], index);
    issues.push(...entryIssues);
    if (!work) continue;

    if (seenIds.has(work.id)) {
      issues.push({
        code: "duplicate_id",
        message: `Zduplikowany id: ${work.id}`,
        workId: work.id,
      });
    } else {
      seenIds.add(work.id);
    }

    const nameKey = normalizeNameKey(work.name);
    const tradeNames = seenNamesByTrade.get(work.tradeId) ?? new Set<string>();
    if (tradeNames.has(nameKey)) {
      issues.push({
        code: "duplicate_name_in_trade",
        message: `Zduplikowana nazwa w branży ${work.tradeId}: ${work.name}`,
        workId: work.id,
        tradeId: work.tradeId,
      });
    } else {
      tradeNames.add(nameKey);
      seenNamesByTrade.set(work.tradeId, tradeNames);
    }

    tradeCounts[work.tradeId] = (tradeCounts[work.tradeId] ?? 0) + 1;
    parsedWorks.push(work);
  }

  for (const tradeId of TRADE_IDS) {
    if ((tradeCounts[tradeId] ?? 0) === 0) {
      issues.push({
        code: "empty_trade",
        message: `Branża bez robót: ${tradeId}`,
        tradeId,
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    workCount: parsedWorks.length,
    tradeCounts,
  };
}

export function validateSeedManifestYaml(yamlText: string): SeedManifestValidationResult {
  return validateSeedManifestStructure(parseSeedManifestYaml(yamlText));
}
