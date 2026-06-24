/**
 * Uproszczone symbole IEC — WM-SCHEMATY V2 layout scale (+25–30% vs V1B).
 */
import type { SchematicCircuit, SchematicLoadKind, SchematicMainRcd } from "@/lib/electrical-schematics/types";
import {
  formatBreakerLabelLines,
  formatRcdLabelLines,
  SVG_DOT_RADIUS_BUS,
  svgColumnGuide,
  svgDot,
  svgLine,
  svgText,
  svgTextStack,
} from "@/lib/electrical-schematics/render/svg-utils";

export const STROKE_THIN = 1.35;
export const STROKE_BUS = 2.5;

export const TEXT_SIZE_HEADER = 14;
export const TEXT_SIZE_SUPPLY_BUS = 13;
export const TEXT_SIZE_BREAKER_STACK = 11.5;
export const TEXT_SIZE_BREAKER_LINE_HEIGHT = 14;
export const TEXT_SIZE_CABLE_LABEL = 11;
export const TEXT_SIZE_CIRCUIT_NAME = 10.5;
export const TEXT_SIZE_MAIN_SWITCH = 11.5;
export const TEXT_SIZE_METER_PHASE = 14;
export const TEXT_SIZE_METER_LABEL = 13;

export const METER_BODY_WIDTH = 58;
export const METER_BODY_HEIGHT = 88;
export const MCB_BREAKER_HEIGHT = 32;
export const MAIN_BREAKER_HEIGHT = 42;
export const RCD_CIRCLE_R = 14;

const LOAD_SCALE = 1.25;

/** Pozioma szyna zasilania + etykieta faz + kropka przyłączenia. */
export function renderSupplyBus(x1: number, y: number, x2: number, busLabel: string): string {
  const mid = (x1 + x2) / 2;
  return [
    svgText(mid, y - 16, busLabel, { anchor: "middle", size: TEXT_SIZE_SUPPLY_BUS }),
    svgLine(x1, y, x2, y, STROKE_THIN),
    svgDot(x1, y, SVG_DOT_RADIUS_BUS),
  ].join("\n");
}

/** Wyłącznik główny FR (opcjonalny) — na pionowym backbone. */
export function renderMainSwitch(x: number, y: number, label: string): string {
  return [
    svgLine(x, y - 24, x, y - 6, STROKE_THIN),
    svgLine(x, y - 6, x + 16, y + 12, STROKE_THIN),
    svgLine(x, y - 6, x - 2, y + 14, STROKE_THIN),
    svgText(x + 26, y + 8, label, { size: TEXT_SIZE_MAIN_SWITCH }),
  ].join("\n");
}

/** Licznik energii — prostokąt 3F/1F + KWh (V2: większy). */
export function renderMeter(x: number, y: number, phases: 1 | 3, label: string): string {
  const w = METER_BODY_WIDTH;
  const h = METER_BODY_HEIGHT;
  const phaseText = phases === 3 ? "3F" : "1F";
  return [
    `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#000" stroke-width="${STROKE_THIN}" />`,
    `<line x1="${x - w / 2}" y1="${y + h / 2}" x2="${x + w / 2}" y2="${y + h / 2}" stroke="#000" stroke-width="1.8" />`,
    svgText(x, y + 30, phaseText, { anchor: "middle", size: TEXT_SIZE_METER_PHASE }),
    svgText(x, y + 66, label, { anchor: "middle", size: TEXT_SIZE_METER_LABEL }),
  ].join("\n");
}

/** Wyłącznik nadprądowy z wieloliniową etykietą po prawej. */
export function renderBreaker(
  x: number,
  y: number,
  labelLines: [string, string, string],
  height = MCB_BREAKER_HEIGHT,
): { svg: string; bottomY: number } {
  const symbolBottom = y + height;
  const tailBottom = symbolBottom + 22;
  const svg = [
    svgLine(x, y, x, y + height * 0.32, STROKE_THIN),
    svgLine(x, y + height * 0.32, x + 15, y + height, STROKE_THIN),
    svgLine(x, y + height * 0.32, x - 4, y + height + 4, STROKE_THIN),
    `<rect x="${x + 17}" y="${y + height * 0.18}" width="13" height="18" fill="none" stroke="#000" stroke-width="${STROKE_THIN}" />`,
    svgTextStack(x + 34, y + height * 0.35, labelLines, {
      size: TEXT_SIZE_BREAKER_STACK,
      lineHeight: TEXT_SIZE_BREAKER_LINE_HEIGHT,
    }),
    svgLine(x, symbolBottom + 4, x, tailBottom, STROKE_THIN),
  ].join("\n");
  return { svg, bottomY: tailBottom };
}

export function renderMainBreakerSymbol(
  x: number,
  y: number,
  breakerType: string,
  ratedCurrentA: number,
  poles: number,
  ka: number,
): { svg: string; bottomY: number } {
  return renderBreaker(x, y, formatBreakerLabelLines(breakerType, ratedCurrentA, poles, ka), MAIN_BREAKER_HEIGHT);
}

export function renderMcbSymbol(x: number, y: number, circuit: SchematicCircuit): string {
  const { svg } = renderBreaker(
    x,
    y,
    formatBreakerLabelLines(
      circuit.breakerType,
      circuit.ratedCurrentA,
      circuit.poles,
      circuit.breakingCapacityKa,
    ),
    MCB_BREAKER_HEIGHT,
  );
  return svg;
}

/** RCD na poziomym tee — wejście z backbone, symbol na poziomie, zejście na szynę. */
export function renderRcdTee(
  backboneX: number,
  teeY: number,
  rcdCenterX: number,
  busY: number,
  rcd: SchematicMainRcd,
): string {
  const labelLines = formatRcdLabelLines(rcd.ratedCurrentA, rcd.sensitivityMa, rcd.poles, rcd.rcdType);
  const symbolRight = rcdCenterX + 34;
  const labelX = symbolRight + 10;
  const r = RCD_CIRCLE_R;
  return [
    svgLine(backboneX, teeY, rcdCenterX - r - 6, teeY, STROKE_THIN),
    `<circle cx="${rcdCenterX}" cy="${teeY}" r="${r}" fill="none" stroke="#000" stroke-width="${STROKE_THIN}" />`,
    `<rect x="${rcdCenterX + 12}" y="${teeY - 17}" width="18" height="34" fill="none" stroke="#000" stroke-width="${STROKE_THIN}" />`,
    `<line x1="${rcdCenterX + 30}" y1="${teeY}" x2="${symbolRight}" y2="${teeY}" stroke="#000" stroke-width="${STROKE_THIN}" />`,
    svgTextStack(labelX, teeY - 17, labelLines, {
      size: TEXT_SIZE_BREAKER_STACK,
      lineHeight: TEXT_SIZE_BREAKER_LINE_HEIGHT,
    }),
    svgLine(backboneX, teeY, backboneX, busY, STROKE_THIN),
    svgDot(backboneX, busY, SVG_DOT_RADIUS_BUS),
  ].join("\n");
}

/** Szyna rozdzielcza — grubsza linia + kropki obwodów. */
export function renderDistributionBus(x1: number, y: number, x2: number, branchXs: number[]): string {
  const parts = [svgLine(x1, y, x2, y, STROKE_BUS)];
  for (const x of branchXs) {
    parts.push(svgDot(x, y, SVG_DOT_RADIUS_BUS));
  }
  return parts.join("\n");
}

/** V1B — opcjonalne pionowe linie pomocnicze pod kolumnami obwodów. */
export function renderCircuitColumnGuides(
  columnXs: number[],
  yTop: number,
  yBottom: number,
  enabled = true,
): string {
  if (!enabled) return "";
  return columnXs.map((x) => svgColumnGuide(x, yTop, yBottom)).join("\n");
}

/** Etykieta przewodu — pionowa (V2: większy font i offset). */
export function renderVerticalCableLabel(
  lineX: number,
  y1: number,
  y2: number,
  label: string,
  side: "left" | "right" = "left",
): string {
  const offset = side === "left" ? -32 : 32;
  const midY = (y1 + y2) / 2;
  return svgText(lineX + offset, midY, label, {
    anchor: "middle",
    size: TEXT_SIZE_CABLE_LABEL,
    rotate: -90,
  });
}

/** Gniazdo 230V — łuk. */
export function renderSocket1f(x: number, y: number): string {
  const s = LOAD_SCALE;
  return [
    svgLine(x, y - 22 * s, x, y - 7 * s, STROKE_THIN),
    `<path d="M ${x - 12 * s} ${y - 7 * s} A ${12 * s} ${12 * s} 0 0 1 ${x + 12 * s} ${y - 7 * s}" fill="none" stroke="#000" stroke-width="${STROKE_THIN}" />`,
  ].join("\n");
}

/** Kuchenka 3F — symbol dedykowany. */
export function renderStove3f(x: number, y: number): string {
  const s = LOAD_SCALE;
  return [
    svgLine(x, y - 24 * s, x, y - 10 * s, STROKE_THIN),
    `<path d="M ${x - 13 * s} ${y - 10 * s} A ${13 * s} ${13 * s} 0 0 1 ${x + 13 * s} ${y - 10 * s}" fill="none" stroke="#000" stroke-width="${STROKE_THIN}" />`,
    svgLine(x - 7 * s, y - 10 * s, x - 7 * s, y + 2 * s, STROKE_THIN),
    svgLine(x + 7 * s, y - 10 * s, x + 7 * s, y + 2 * s, STROKE_THIN),
    svgLine(x - 10 * s, y + 2 * s, x + 10 * s, y + 2 * s, STROKE_THIN),
    svgLine(x, y + 2 * s, x, y + 10 * s, STROKE_THIN),
  ].join("\n");
}

/** Gniazdo 400V — łuk (bez 3F tekstu; stove używa renderStove3f). */
export function renderSocket3f(x: number, y: number): string {
  return [
    renderSocket1f(x, y),
    svgText(x, y + 12, "3F", { anchor: "middle", size: 9 }),
  ].join("\n");
}

/** Oświetlenie — okrąg z krzyżem. */
export function renderLighting(x: number, y: number): string {
  const s = LOAD_SCALE;
  const r = 10 * s;
  return [
    svgLine(x, y - 22 * s, x, y - 10 * s, STROKE_THIN),
    `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#000" stroke-width="${STROKE_THIN}" />`,
    svgLine(x - 7 * s, y - 7 * s, x + 7 * s, y + 7 * s, STROKE_THIN),
    svgLine(x - 7 * s, y + 7 * s, x + 7 * s, y - 7 * s, STROKE_THIN),
  ].join("\n");
}

/** Wypust kablowy 3F. */
export function renderCableOutlet3f(x: number, y: number, description?: string): string {
  const s = LOAD_SCALE;
  const label = description?.trim() || "";
  return [
    svgLine(x, y - 22 * s, x, y - 5 * s, STROKE_THIN),
    svgLine(x - 10 * s, y - 5 * s, x + 10 * s, y - 5 * s, STROKE_THIN),
    svgLine(x - 10 * s, y - 5 * s, x - 10 * s, y + 2 * s, STROKE_THIN),
    svgLine(x + 10 * s, y - 5 * s, x + 10 * s, y + 2 * s, STROKE_THIN),
    ...(label ? [svgText(x, y + 16, label, { anchor: "middle", size: 8 })] : []),
  ].join("\n");
}

/** Bojler — gniazdo + etykieta BOJLER. */
export function renderBoiler(x: number, y: number): string {
  return [
    renderSocket1f(x, y),
    svgText(x, y + 14, "BOJLER", { anchor: "middle", size: 8 }),
  ].join("\n");
}

/** Rezerwa — punkt + etykieta. */
export function renderReserve(x: number, y: number): string {
  const s = LOAD_SCALE;
  return [
    svgLine(x, y - 22 * s, x, y - 7 * s, STROKE_THIN),
    svgDot(x, y - 2, 2.5),
    svgText(x, y + 10, "REZERWA", { anchor: "middle", size: 8 }),
  ].join("\n");
}

/** Wypust generyczny (other). */
export function renderGenericOutlet(x: number, y: number): string {
  const s = LOAD_SCALE;
  return [
    svgLine(x, y - 22 * s, x, y - 5 * s, STROKE_THIN),
    svgDot(x, y, 2.5),
  ].join("\n");
}

export function renderLoadSymbol(
  x: number,
  y: number,
  loadKind: SchematicLoadKind,
  circuit: Pick<SchematicCircuit, "name" | "description">,
): string {
  const lowerName = circuit.name.toLowerCase();
  if (loadKind === "lighting-1f") return renderLighting(x, y);
  if (loadKind === "socket-3f") return renderStove3f(x, y);
  if (loadKind === "cable-outlet-3f") {
    if (lowerName.includes("kuchenka")) return renderStove3f(x, y);
    return renderCableOutlet3f(x, y, circuit.description);
  }
  if (loadKind === "reserve") return renderReserve(x, y);
  if (loadKind === "other") return renderGenericOutlet(x, y);
  if (loadKind === "socket-1f" && lowerName.includes("bojler")) return renderBoiler(x, y);
  return renderSocket1f(x, y);
}
