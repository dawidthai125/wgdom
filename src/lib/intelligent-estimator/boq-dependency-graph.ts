/**
 * IK S3 — BOQ Dependency Graph / Semantic Relation Layer.
 * Document Expert seam — after Quantity Intelligence, before KNR/classification/costing.
 * Pure semantic graph — no pricing, no KNR discovery, no Owner verification.
 */

import type { BoqQuantityIntelligence, QuantityExpressionNode } from "./boq-quantity-intelligence";
import { parseOfferBoqPositionNo } from "./boq-quantity-intelligence";
import type { OfferBoqLine } from "@/lib/tender-offer-boq";

export type BoqSemanticRelationType =
  | "SAME_QUANTITY_AS"
  | "SAME_AREA_AS"
  | "REPLACES"
  | "DERIVED_FROM"
  | "DEPENDS_ON";

export type BoqSemanticRelationState =
  | "FACT"
  | "PROPOSED"
  | "REQUIRES_EXPERT"
  | "REQUIRES_OWNER";

export type BoqSemanticEvidenceConfidence = "HIGH" | "MEDIUM" | "LOW";

export type BoqSemanticEvidenceSource =
  | "PDF_RAW"
  | "QUANTITY_AST"
  | "DESCRIPTION"
  | "HEURISTIC";

export interface BoqSemanticRelationEvidence {
  source: BoqSemanticEvidenceSource;
  rawText: string;
  confidence: BoqSemanticEvidenceConfidence;
}

export interface BoqSemanticRelation {
  relationId: string;
  relation: BoqSemanticRelationType;
  fromPositionNo: number;
  toPositionNo: number;
  evidence: BoqSemanticRelationEvidence;
  state: BoqSemanticRelationState;
  reason?: string;
}

export interface BoqDependencyPositionIndex {
  positionNo: number;
  lineId: string | null;
  description: string;
  unit: string;
  quantityResolved: number | null;
  formulaAvailable: boolean;
}

export interface BoqDependencyGraph {
  relations: BoqSemanticRelation[];
  unresolvedPositions: number[];
  cycles: number[][];
  positionIndex: BoqDependencyPositionIndex[];
}

export interface BoqDependencyGraphLineInput {
  positionNo: number;
  lineId?: string | null;
  description?: string;
  unit?: string;
  subsection?: string | null;
  department?: string | null;
  /** Future ATH / TenderPrzedmiarLine.formula seam — not required in S3 runtime. */
  formula?: string | null;
  quantityIntelligence?: BoqQuantityIntelligence | null;
}

const STOPWORDS = new Set([
  "demontaż",
  "demontazu",
  "montaż",
  "montazu",
  "wymiana",
  "roboty",
  "wykonanie",
  "istniejących",
  "podłoży",
  "powierzchni",
  "wewnętrznych",
]);

export function buildBoqSemanticRelationId(
  fromPositionNo: number,
  toPositionNo: number,
  relation: BoqSemanticRelationType,
): string {
  return `bqr_${fromPositionNo}_${toPositionNo}_${relation}`;
}

function pushRelation(
  relations: BoqSemanticRelation[],
  seen: Set<string>,
  rel: Omit<BoqSemanticRelation, "relationId">,
): void {
  const relationId = buildBoqSemanticRelationId(rel.fromPositionNo, rel.toPositionNo, rel.relation);
  if (seen.has(relationId)) return;
  seen.add(relationId);
  relations.push({ ...rel, relationId });
}

function isPurePositionRefExpression(node: QuantityExpressionNode | undefined): boolean {
  if (!node) return false;
  if (node.kind === "POSITION_REF") return true;
  if (node.kind === "ROOM_SCOPED" && node.children?.length === 1) {
    return isPurePositionRefExpression(node.children[0]);
  }
  return false;
}

function primaryPositionRef(node: QuantityExpressionNode | undefined): number | null {
  if (!node) return null;
  if (node.kind === "POSITION_REF" && node.positionNo) return node.positionNo;
  for (const child of node.children ?? []) {
    const ref = primaryPositionRef(child);
    if (ref != null) return ref;
  }
  return null;
}

function significantTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));
}

function tokenOverlap(a: string, b: string): string[] {
  const ta = significantTokens(a);
  const tb = significantTokens(b);
  const matches: string[] = [];
  for (const x of ta) {
    for (const y of tb) {
      if (x === y) {
        matches.push(x);
        continue;
      }
      const stem = Math.min(x.length, y.length, 5);
      if (stem >= 5 && x.slice(0, stem) === y.slice(0, stem)) {
        matches.push(x);
      }
    }
  }
  return [...new Set(matches)];
}

function detectSameAreaAsTarget(description: string, rawExpression: string): number | null {
  const text = `${description} ${rawExpression}`;
  const patterns = [
    /\bjak\s+w\s+poz\.?\s*(\d+)\b/i,
    /\bta\s+sam[aą]\s+powierzchni[aę]\s+(?:co\s+)?poz\.?\s*(\d+)\b/i,
    /\bpowierzchni[aę]\s+poz\.?\s*(\d+)\b/i,
    /\bobmiar\s+poz\.?\s*(\d+)\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = Number.parseInt(m[1] ?? "", 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

function detectCycles(adjacency: Map<number, number[]>): number[][] {
  const cycles: number[][] = [];
  const visited = new Set<number>();
  const stack = new Set<number>();
  const path: number[] = [];

  function dfs(node: number): void {
    visited.add(node);
    stack.add(node);
    path.push(node);
    for (const next of adjacency.get(node) ?? []) {
      if (!visited.has(next)) {
        dfs(next);
      } else if (stack.has(next)) {
        const start = path.indexOf(next);
        if (start >= 0) cycles.push(path.slice(start).concat(next));
      }
    }
    path.pop();
    stack.delete(node);
  }

  for (const node of adjacency.keys()) {
    if (!visited.has(node)) dfs(node);
  }
  return cycles;
}

function inferReplacesRelations(
  inputs: readonly BoqDependencyGraphLineInput[],
): BoqSemanticRelation[] {
  const relations: BoqSemanticRelation[] = [];
  const seen = new Set<string>();
  const sorted = [...inputs].sort((a, b) => a.positionNo - b.positionNo);

  for (const row of sorted) {
    const desc = String(row.description ?? "");
    const isWymiana = /wymiana/i.test(desc);
    if (!isWymiana && !/montaż/i.test(desc)) continue;

    let bestTarget: BoqDependencyGraphLineInput | null = null;
    let bestOverlap: string[] = [];

    for (const prior of sorted) {
      if (prior.positionNo >= row.positionNo) break;
      if (row.positionNo - prior.positionNo > 25) continue;
      const priorDesc = String(prior.description ?? "");
      if (!/demontaż/i.test(priorDesc)) continue;
      if (row.department && prior.department && row.department !== prior.department) continue;
      const overlap = tokenOverlap(priorDesc, desc);
      if (overlap.length === 0) continue;
      if (!bestTarget || overlap.length > bestOverlap.length) {
        bestTarget = prior;
        bestOverlap = overlap;
      }
    }

    if (!bestTarget) continue;

    const state: BoqSemanticRelationState = isWymiana ? "FACT" : "REQUIRES_EXPERT";
    const confidence: BoqSemanticEvidenceConfidence = isWymiana ? "HIGH" : "MEDIUM";

    if (!isWymiana) continue;

    pushRelation(relations, seen, {
      relation: "REPLACES",
      fromPositionNo: row.positionNo,
      toPositionNo: bestTarget.positionNo,
      evidence: {
        source: isWymiana ? "DESCRIPTION" : "HEURISTIC",
        rawText: desc.slice(0, 200),
        confidence,
      },
      state,
      reason: "explicit_wymiana_with_prior_demontaz",
    });
  }

  return relations;
}

export function buildBoqDependencyGraph(
  inputs: readonly BoqDependencyGraphLineInput[],
): BoqDependencyGraph {
  const relations: BoqSemanticRelation[] = [];
  const seen = new Set<string>();
  const byPos = new Map(inputs.map((i) => [i.positionNo, i]));
  const dependsAdj = new Map<number, number[]>();
  const unresolvedPositions = new Set<number>();

  for (const row of inputs) {
    const intel = row.quantityIntelligence;
    const rawExpression = intel?.rawExpression ?? row.formula ?? "";
    const expr = intel?.expression;

    for (const ref of intel?.unresolvedRefs ?? []) {
      if (!byPos.has(ref)) unresolvedPositions.add(row.positionNo);
    }
    if (intel?.evidence.unresolvedReason === "CYCLE") {
      unresolvedPositions.add(row.positionNo);
    }

    for (const targetNo of intel?.dependencyPositions ?? []) {
      if (!byPos.has(targetNo)) {
        unresolvedPositions.add(row.positionNo);
        continue;
      }

      const depEvidence: BoqSemanticRelationEvidence = {
        source: "QUANTITY_AST",
        rawText: rawExpression || `poz.${targetNo}`,
        confidence: "HIGH",
      };

      pushRelation(relations, seen, {
        relation: "DEPENDS_ON",
        fromPositionNo: row.positionNo,
        toPositionNo: targetNo,
        evidence: depEvidence,
        state: "FACT",
        reason: "explicit_position_ref_in_quantity_expression",
      });

      const deps = dependsAdj.get(row.positionNo) ?? [];
      deps.push(targetNo);
      dependsAdj.set(row.positionNo, deps);

      if (isPurePositionRefExpression(expr)) {
        pushRelation(relations, seen, {
          relation: "SAME_QUANTITY_AS",
          fromPositionNo: row.positionNo,
          toPositionNo: targetNo,
          evidence: depEvidence,
          state: "FACT",
          reason: "pure_poz_ref",
        });
        pushRelation(relations, seen, {
          relation: "DERIVED_FROM",
          fromPositionNo: row.positionNo,
          toPositionNo: targetNo,
          evidence: depEvidence,
          state: "FACT",
          reason: "quantity_derived_from_position_ref",
        });
      } else {
        pushRelation(relations, seen, {
          relation: "DERIVED_FROM",
          fromPositionNo: row.positionNo,
          toPositionNo: targetNo,
          evidence: {
            source: "QUANTITY_AST",
            rawText: rawExpression,
            confidence: "MEDIUM",
          },
          state: "FACT",
          reason: "expression_contains_position_ref",
        });
      }
    }

    const sameAreaTarget = detectSameAreaAsTarget(String(row.description ?? ""), rawExpression);
    if (sameAreaTarget != null && byPos.has(sameAreaTarget)) {
      const pureRef = primaryPositionRef(expr);
      if (pureRef !== sameAreaTarget) {
        pushRelation(relations, seen, {
          relation: "SAME_AREA_AS",
          fromPositionNo: row.positionNo,
          toPositionNo: sameAreaTarget,
          evidence: {
            source: "DESCRIPTION",
            rawText: String(row.description ?? "").slice(0, 200),
            confidence: "MEDIUM",
          },
          state: "PROPOSED",
          reason: "explicit_same_area_context",
        });
      }
    }
  }

  for (const rel of inferReplacesRelations(inputs)) {
    pushRelation(relations, seen, rel);
  }

  const cycles = detectCycles(dependsAdj);
  for (const cycle of cycles) {
    for (const pos of cycle) unresolvedPositions.add(pos);
  }

  const positionIndex: BoqDependencyPositionIndex[] = inputs
    .map((row) => ({
      positionNo: row.positionNo,
      lineId: row.lineId ?? null,
      description: String(row.description ?? ""),
      unit: String(row.unit ?? ""),
      quantityResolved: row.quantityIntelligence?.resolvedTotal ?? null,
      formulaAvailable: Boolean(row.formula?.trim()),
    }))
    .sort((a, b) => a.positionNo - b.positionNo);

  return {
    relations,
    unresolvedPositions: [...unresolvedPositions].sort((a, b) => a - b),
    cycles,
    positionIndex,
  };
}

export function getBoqOutgoingRelations(
  graph: BoqDependencyGraph,
  positionNo: number,
): BoqSemanticRelation[] {
  return graph.relations.filter((r) => r.fromPositionNo === positionNo);
}

export function getBoqIncomingRelations(
  graph: BoqDependencyGraph,
  positionNo: number,
): BoqSemanticRelation[] {
  return graph.relations.filter((r) => r.toPositionNo === positionNo);
}

export function relationsForOfferBoqLine(
  graph: BoqDependencyGraph,
  positionNo: number,
): BoqSemanticRelation[] {
  return graph.relations.filter(
    (r) => r.fromPositionNo === positionNo || r.toPositionNo === positionNo,
  );
}

export function enrichOfferBoqLinesWithDependencyGraph(lines: OfferBoqLine[]): {
  lines: OfferBoqLine[];
  graph: BoqDependencyGraph;
} {
  const inputs: BoqDependencyGraphLineInput[] = lines.map((line, index) => ({
    positionNo: parseOfferBoqPositionNo(line.lp, index),
    lineId: line.lineId,
    description: line.description,
    unit: line.unit,
    formula: line.quantityExpressionRaw ?? null,
    quantityIntelligence: line.quantityIntelligence ?? null,
  }));

  const graph = buildBoqDependencyGraph(inputs);
  const enriched = lines.map((line, index) => {
    const pos = parseOfferBoqPositionNo(line.lp, index);
    const boqSemanticRelations = getBoqOutgoingRelations(graph, pos);
    return {
      ...line,
      boqSemanticRelations: boqSemanticRelations.length ? boqSemanticRelations : undefined,
    };
  });

  return { lines: enriched, graph };
}
