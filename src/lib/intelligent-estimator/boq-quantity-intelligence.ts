/**
 * IK S2 — BOQ Quantity Intelligence (Document Expert semantic seam).
 * Pure parser / evaluator / POSITION_REF dependency resolver — no pricing, no KNR discovery.
 */

import type { OfferBoqConfidence, OfferBoqLine } from "@/lib/tender-offer-boq";

export type QuantityExpressionKind =
  | "LITERAL"
  | "SUM"
  | "PRODUCT"
  | "BRACKET_EXPR"
  | "POSITION_REF"
  | "MULTIPLIER"
  | "ROOM_SCOPED"
  | "UNRESOLVED";

export type BoqQuantityBasisType = "ANALOGY" | "CUSTOM_CALC" | "ANALYSIS" | "CATALOG";

export type BoqQuantityPricingHold = "REQUIRES_EXPERT" | "REQUIRES_OWNER";

export interface QuantityExpressionNode {
  kind: QuantityExpressionKind;
  raw?: string;
  value?: number;
  positionNo?: number;
  children?: QuantityExpressionNode[];
  roomNames?: string[];
  multiplier?: number;
  unresolvedReason?: string;
}

export interface BoqQuantityEvidence {
  source: "PDF_RAW" | "QUANTITY_RAW" | "EXPRESSION_RAW";
  computationType: QuantityExpressionKind;
  confidence: OfferBoqConfidence;
  unresolvedReason?: string | null;
  dependencyPositions: number[];
}

export interface BoqQuantityIntelligence {
  rawExpression: string;
  expression: QuantityExpressionNode;
  resolvedTotal: number | null;
  unresolvedRefs: number[];
  dependencyPositions: number[];
  evidence: BoqQuantityEvidence;
  basisType: BoqQuantityBasisType | null;
  pricingHold: BoqQuantityPricingHold | null;
  multiplierNote?: BoqQuantityMultiplierNote | null;
}

export interface BoqQuantityMultiplierNote {
  value: number;
  status: "REQUIRES_CONTEXT";
  raw: string;
}

export interface BoqQuantityGraphInput {
  positionNo: number;
  rawExpression: string;
  pdfQuantity?: number | null;
  description?: string;
  basisNotes?: string[];
  podstawa?: string;
}

const QTY_TOLERANCE = 0.02;

type Tok =
  | { t: "num"; v: number; raw: string }
  | { t: "plus" }
  | { t: "star" }
  | { t: "lparen" }
  | { t: "rparen" }
  | { t: "lbracket" }
  | { t: "rbracket" }
  | { t: "poz"; n: number }
  | { t: "ellipsis" };

function parsePolishNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function tokenize(input: string): Tok[] {
  const tokens: Tok[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i]!;
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === "+") {
      tokens.push({ t: "plus" });
      i += 1;
      continue;
    }
    if (ch === "*") {
      tokens.push({ t: "star" });
      i += 1;
      continue;
    }
    if (ch === "(") {
      tokens.push({ t: "lparen" });
      i += 1;
      continue;
    }
    if (ch === ")") {
      tokens.push({ t: "rparen" });
      i += 1;
      continue;
    }
    if (ch === "[") {
      tokens.push({ t: "lbracket" });
      i += 1;
      continue;
    }
    if (ch === "]") {
      tokens.push({ t: "rbracket" });
      i += 1;
      continue;
    }
    if (input.slice(i, i + 3) === "...") {
      tokens.push({ t: "ellipsis" });
      i += 3;
      continue;
    }
    const poz = input.slice(i).match(/^poz\.?\s*(\d+)/i);
    if (poz) {
      const n = Number.parseInt(poz[1] ?? "", 10);
      if (Number.isFinite(n) && n > 0) tokens.push({ t: "poz", n });
      i += poz[0].length;
      continue;
    }
    const num = input.slice(i).match(/^[\d]+(?:[,.][\d]+)?/);
    if (num) {
      const v = parsePolishNumber(num[0]);
      if (v != null) tokens.push({ t: "num", v, raw: num[0] });
      i += num[0].length;
      continue;
    }
    i += 1;
  }
  return tokens;
}

class Parser {
  private idx = 0;

  constructor(private readonly tokens: Tok[], private readonly raw: string) {}

  private peek(): Tok | null {
    return this.tokens[this.idx] ?? null;
  }

  private consume(): Tok | null {
    const tok = this.tokens[this.idx] ?? null;
    if (tok) this.idx += 1;
    return tok;
  }

  parse(): QuantityExpressionNode {
    if (this.tokens.length === 0) {
      return { kind: "UNRESOLVED", raw: this.raw, unresolvedReason: "empty" };
    }
    const node = this.parseExpr();
    if (this.idx < this.tokens.length) {
      return {
        kind: "UNRESOLVED",
        raw: this.raw,
        unresolvedReason: "trailing_tokens",
        children: [node],
      };
    }
    return node;
  }

  private parseExpr(): QuantityExpressionNode {
    let left = this.parseTerm();
    while (this.peek()?.t === "plus") {
      this.consume();
      const right = this.parseTerm();
      left = mergeAssociative("SUM", left, right, this.raw);
    }
    return left;
  }

  private parseTerm(): QuantityExpressionNode {
    let left = this.parseFactor();
    while (this.peek()?.t === "star") {
      this.consume();
      const right = this.parseFactor();
      left = mergeAssociative("PRODUCT", left, right, this.raw);
    }
    return left;
  }

  private parseFactor(): QuantityExpressionNode {
    const tok = this.peek();
    if (!tok) {
      return { kind: "UNRESOLVED", raw: this.raw, unresolvedReason: "unexpected_end" };
    }
    if (tok.t === "num") {
      this.consume();
      return { kind: "LITERAL", value: tok.v, raw: tok.raw };
    }
    if (tok.t === "poz") {
      this.consume();
      return { kind: "POSITION_REF", positionNo: tok.n, raw: `poz.${tok.n}` };
    }
    if (tok.t === "lparen") {
      this.consume();
      const inner = this.parseExpr();
      if (this.peek()?.t !== "rparen") {
        return {
          kind: "UNRESOLVED",
          raw: this.raw,
          unresolvedReason: "unclosed_paren",
          children: [inner],
        };
      }
      this.consume();
      return inner;
    }
    if (tok.t === "lbracket") {
      this.consume();
      const inner = this.parseExpr();
      const bracket: QuantityExpressionNode = {
        kind: "BRACKET_EXPR",
        raw: this.raw,
        children: [inner],
      };
      if (this.peek()?.t === "rbracket") {
        this.consume();
      } else {
        return {
          kind: "UNRESOLVED",
          raw: this.raw,
          unresolvedReason: "unclosed_bracket",
          children: [bracket],
        };
      }
      if (this.peek()?.t === "star") {
        this.consume();
        const factor = this.parseFactor();
        return mergeAssociative("PRODUCT", bracket, factor, this.raw);
      }
      return bracket;
    }
    if (tok.t === "ellipsis") {
      this.consume();
      return { kind: "UNRESOLVED", raw: "...", unresolvedReason: "ellipsis" };
    }
    return { kind: "UNRESOLVED", raw: this.raw, unresolvedReason: "unknown_token" };
  }
}

function mergeAssociative(
  kind: "SUM" | "PRODUCT",
  left: QuantityExpressionNode,
  right: QuantityExpressionNode,
  raw: string,
): QuantityExpressionNode {
  const children: QuantityExpressionNode[] = [];
  if (left.kind === kind && left.children?.length) {
    children.push(...left.children);
  } else {
    children.push(left);
  }
  if (right.kind === kind && right.children?.length) {
    children.push(...right.children);
  } else {
    children.push(right);
  }
  return { kind, raw, children };
}

function extractRoomScoped(raw: string): { roomNames: string[]; inner: string } | null {
  const m = raw.match(/^<([^>]+)>\s*(.+)$/);
  if (!m) return null;
  const roomNames = m[1]!
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return { roomNames, inner: m[2]!.trim() };
}

function detectMultiplierNote(text: string): number | null {
  const m = text.match(/Krotność\s*=\s*(\d+(?:[,.]\d+)?)/i);
  if (!m) return null;
  return parsePolishNumber(m[1] ?? "");
}

export function classifyQuantityBasisType(
  podstawa: string,
  notes: string[] | undefined,
  description: string,
): BoqQuantityBasisType {
  const p = String(podstawa ?? "").toLowerCase();
  const noteText = (notes ?? []).join(" ").toLowerCase();
  const o = String(description ?? "").toLowerCase();
  if (/kalk\.?\s*własna|\/\s*kalk\./i.test(podstawa) || /kalk\.?\s*własna/i.test(noteText)) {
    return "CUSTOM_CALC";
  }
  if (/\/\s*analiza\b/i.test(podstawa) || /\banaliza\b/i.test(p)) return "ANALYSIS";
  if (/\banalogia\b/i.test(noteText) || /\banalogia\b/i.test(o) || /\banalogia\b/i.test(podstawa)) {
    return "ANALOGY";
  }
  return "CATALOG";
}

function pricingHoldForBasis(basis: BoqQuantityBasisType | null): BoqQuantityPricingHold | null {
  if (basis === "ANALOGY" || basis === "ANALYSIS") return "REQUIRES_EXPERT";
  if (basis === "CUSTOM_CALC") return "REQUIRES_OWNER";
  return null;
}

export function parseQuantityExpression(raw: string): QuantityExpressionNode {
  const trimmed = normalizeWhitespace(raw);
  if (!trimmed) {
    return { kind: "UNRESOLVED", raw: "", unresolvedReason: "empty" };
  }

  const multiplierOnly = trimmed.match(/^Krotność\s*=\s*(\d+(?:[,.]\d+)?)\s*$/i);
  if (multiplierOnly) {
    const mult = parsePolishNumber(multiplierOnly[1] ?? "");
    return {
      kind: "MULTIPLIER",
      raw: trimmed,
      multiplier: mult ?? undefined,
      unresolvedReason: mult == null ? "multiplier_unparsed" : "REQUIRES_CONTEXT",
    };
  }

  const room = extractRoomScoped(trimmed);
  if (room) {
    const inner = parseQuantityExpression(room.inner);
    return {
      kind: "ROOM_SCOPED",
      raw: trimmed,
      roomNames: room.roomNames,
      children: [inner],
    };
  }

  if (/^poz\.?\s*\d+$/i.test(trimmed)) {
    const n = Number.parseInt(trimmed.replace(/\D/g, ""), 10);
    return { kind: "POSITION_REF", positionNo: n, raw: trimmed };
  }

  if (/^[\d,.]+$/.test(trimmed)) {
    const v = parsePolishNumber(trimmed);
    if (v != null) return { kind: "LITERAL", value: v, raw: trimmed };
  }

  const parser = new Parser(tokenize(trimmed), trimmed);
  return parser.parse();
}

function collectPositionRefs(node: QuantityExpressionNode, out = new Set<number>()): number[] {
  if (node.kind === "POSITION_REF" && node.positionNo) out.add(node.positionNo);
  for (const child of node.children ?? []) collectPositionRefs(child, out);
  return [...out].sort((a, b) => a - b);
}

function collectExpressionKinds(node: QuantityExpressionNode, out = new Set<QuantityExpressionKind>()) {
  out.add(node.kind);
  for (const child of node.children ?? []) collectExpressionKinds(child, out);
  return out;
}

function evaluateNode(
  node: QuantityExpressionNode,
  resolvePos: (n: number) => number | null,
): number | null {
  switch (node.kind) {
    case "LITERAL":
      return node.value ?? null;
    case "SUM": {
      if (!node.children?.length) return null;
      let sum = 0;
      for (const child of node.children) {
        if (child.kind === "UNRESOLVED" && child.unresolvedReason === "ellipsis") continue;
        const v = evaluateNode(child, resolvePos);
        if (v == null) return null;
        sum += v;
      }
      return sum;
    }
    case "PRODUCT": {
      if (!node.children?.length) return null;
      let prod = 1;
      for (const child of node.children) {
        const v = evaluateNode(child, resolvePos);
        if (v == null) return null;
        prod *= v;
      }
      return prod;
    }
    case "BRACKET_EXPR": {
      if (!node.children?.length) return null;
      return evaluateNode(node.children[0]!, resolvePos);
    }
    case "POSITION_REF":
      return node.positionNo ? resolvePos(node.positionNo) : null;
    case "ROOM_SCOPED": {
      if (!node.children?.length) return null;
      return evaluateNode(node.children[0]!, resolvePos);
    }
    case "MULTIPLIER":
      return null;
    case "UNRESOLVED":
      return null;
    default:
      return null;
  }
}

function primaryComputationType(node: QuantityExpressionNode): QuantityExpressionKind {
  const kinds = collectExpressionKinds(node);
  if (kinds.has("POSITION_REF")) return "POSITION_REF";
  if (kinds.has("ROOM_SCOPED")) return "ROOM_SCOPED";
  if (kinds.has("BRACKET_EXPR")) return "BRACKET_EXPR";
  if (kinds.has("PRODUCT")) return "PRODUCT";
  if (kinds.has("SUM")) return "SUM";
  if (kinds.has("MULTIPLIER")) return "MULTIPLIER";
  if (kinds.has("LITERAL")) return "LITERAL";
  return "UNRESOLVED";
}

function confidenceFor(
  node: QuantityExpressionNode,
  resolved: number | null,
  pdfQuantity: number | null | undefined,
  unresolvedRefs: number[],
): OfferBoqConfidence {
  if (unresolvedRefs.length || node.kind === "UNRESOLVED") return "low";
  if (resolved == null) return "low";
  if (pdfQuantity != null && pdfQuantity > 0) {
    if (Math.abs(resolved - pdfQuantity) <= QTY_TOLERANCE) return "high";
    return "medium";
  }
  if (node.kind === "LITERAL" || node.kind === "POSITION_REF") return "high";
  return "medium";
}

export function resolveBoqQuantityGraph(
  inputs: BoqQuantityGraphInput[],
): Map<number, BoqQuantityIntelligence> {
  const byPos = new Map<number, BoqQuantityGraphInput>();
  for (const input of inputs) byPos.set(input.positionNo, input);

  const parsed = new Map<number, QuantityExpressionNode>();
  const multiplierNotes = new Map<number, BoqQuantityMultiplierNote | null>();

  for (const input of inputs) {
    const raw = normalizeWhitespace(input.rawExpression);
    const descMult = detectMultiplierNote(input.description ?? "");
    const expr = parseQuantityExpression(raw);
    if (descMult != null) {
      multiplierNotes.set(input.positionNo, {
        value: descMult,
        status: "REQUIRES_CONTEXT",
        raw: `Krotność = ${descMult}`,
      });
    }
    parsed.set(input.positionNo, expr);
  }

  const memo = new Map<number, number | null>();
  const visiting = new Set<number>();
  const unresolvedRefsByPos = new Map<number, number[]>();
  const cyclePositions = new Set<number>();

  function resolveValue(pos: number): number | null {
    if (memo.has(pos)) return memo.get(pos)!;
    if (visiting.has(pos)) {
      cyclePositions.add(pos);
      return null;
    }
    visiting.add(pos);
    const expr = parsed.get(pos);
    if (!expr) {
      visiting.delete(pos);
      memo.set(pos, null);
      return null;
    }
    const refs = collectPositionRefs(expr);
    const badRefs: number[] = [];
    const val = evaluateNode(expr, (target) => {
      if (!byPos.has(target)) {
        badRefs.push(target);
        return null;
      }
      if (visiting.has(target)) {
        cyclePositions.add(target);
        cyclePositions.add(pos);
        return null;
      }
      return resolveValue(target);
    });
    unresolvedRefsByPos.set(pos, [...new Set([...badRefs, ...refs.filter((r) => cyclePositions.has(r))])].sort((a, b) => a - b));
    visiting.delete(pos);
    memo.set(pos, val);
    return val;
  }

  const out = new Map<number, BoqQuantityIntelligence>();
  for (const input of inputs) {
    const expression = parsed.get(input.positionNo)!;
    const multNote = multiplierNotes.get(input.positionNo) ?? null;
    const resolvedTotal = resolveValue(input.positionNo);
    const dependencyPositions = collectPositionRefs(expression);
    let unresolvedRefs = unresolvedRefsByPos.get(input.positionNo) ?? [];
    if (cyclePositions.has(input.positionNo)) {
      unresolvedRefs = [...new Set([...unresolvedRefs, ...dependencyPositions])].sort((a, b) => a - b);
    }
    const basisType = classifyQuantityBasisType(
      input.podstawa ?? "",
      input.basisNotes,
      input.description ?? "",
    );
    const computationType = multNote
      ? "MULTIPLIER"
      : primaryComputationType(expression);
    let unresolvedReason: string | null = null;
    if (cyclePositions.has(input.positionNo)) unresolvedReason = "CYCLE";
    else if (unresolvedRefs.length) unresolvedReason = "UNRESOLVED_REF";
    else if (resolvedTotal == null) unresolvedReason = expression.unresolvedReason ?? "EVAL_FAILED";
    else if (multNote) unresolvedReason = "MULTIPLIER_REQUIRES_CONTEXT";

    out.set(input.positionNo, {
      rawExpression: input.rawExpression,
      expression,
      resolvedTotal,
      unresolvedRefs,
      dependencyPositions,
      evidence: {
        source: "EXPRESSION_RAW",
        computationType,
        confidence: confidenceFor(expression, resolvedTotal, input.pdfQuantity, unresolvedRefs),
        unresolvedReason,
        dependencyPositions,
      },
      basisType,
      pricingHold: pricingHoldForBasis(basisType),
      multiplierNote: multNote,
    });
  }

  return out;
}

export function parseOfferBoqPositionNo(lp: string, index: number): number {
  const n = Number.parseInt(String(lp ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : index + 1;
}

export function enrichOfferBoqLinesWithQuantityIntelligence(lines: OfferBoqLine[]): OfferBoqLine[] {
  if (!lines.length) return lines;
  const inputs: BoqQuantityGraphInput[] = lines.map((line, index) => {
    const raw =
      line.quantityExpressionRaw?.trim()
      || line.quantityRaw?.trim()
      || "";
    return {
      positionNo: parseOfferBoqPositionNo(line.lp, index),
      rawExpression: raw,
      pdfQuantity: line.quantity > 0 ? line.quantity : null,
      description: line.description,
    };
  });
  const resolved = resolveBoqQuantityGraph(inputs);
  return lines.map((line, index) => {
    const pos = parseOfferBoqPositionNo(line.lp, index);
    const intel = resolved.get(pos);
    if (!intel) return line;
    return {
      ...line,
      quantityExpressionRaw: line.quantityExpressionRaw ?? intel.rawExpression,
      quantityIntelligence: intel,
    };
  });
}

export function quantitiesRoughlyEqual(a: number, b: number, tolerance = QTY_TOLERANCE): boolean {
  return Math.abs(a - b) <= tolerance;
}
