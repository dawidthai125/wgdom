/**
 * Uproszczone symbole IEC — WM-SCHEMATY-V1 · V1A visual fidelity.
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

export const STROKE_THIN = 1.2;
export const STROKE_BUS = 2.2;

/** Pozioma szyna zasilania + etykieta faz + kropka przyłączenia. */
export function renderSupplyBus(x1: number, y: number, x2: number, busLabel: string): string {
  const mid = (x1 + x2) / 2;
  return [
    svgText(mid, y - 14, busLabel, { anchor: "middle", size: 12 }),
    svgLine(x1, y, x2, y, STROKE_THIN),
    svgDot(x1, y, SVG_DOT_RADIUS_BUS),
  ].join("\n");
}

/** Wyłącznik główny FR (opcjonalny) — na pionowym backbone. */
export function renderMainSwitch(x: number, y: number, label: string): string {
  return [
    svgLine(x, y - 20, x, y - 5, STROKE_THIN),
    svgLine(x, y - 5, x + 14, y + 10, STROKE_THIN),
    svgLine(x, y - 5, x - 2, y + 12, STROKE_THIN),
    svgText(x + 22, y + 6, label, { size: 10 }),
  ].join("\n");
}

export const METER_BODY_WIDTH = 44;
export const METER_BODY_HEIGHT = 64;

/** Licznik energii — prostokąt 3F/1F + KWh (V1A: większy). */
export function renderMeter(x: number, y: number, phases: 1 | 3, label: string): string {
  const w = METER_BODY_WIDTH;
  const h = METER_BODY_HEIGHT;
  const phaseText = phases === 3 ? "3F" : "1F";
  return [
    `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#000" stroke-width="${STROKE_THIN}" />`,
    `<line x1="${x - w / 2}" y1="${y + h / 2}" x2="${x + w / 2}" y2="${y + h / 2}" stroke="#000" stroke-width="1.6" />`,
    svgText(x, y + 22, phaseText, { anchor: "middle", size: 12 }),
    svgText(x, y + 48, label, { anchor: "middle", size: 11 }),
  ].join("\n");
}

/** Wyłącznik nadprądowy z wieloliniową etykietą po prawej. */
export function renderBreaker(
  x: number,
  y: number,
  labelLines: [string, string, string],
  height = 28,
): { svg: string; bottomY: number } {
  const symbolBottom = y + height;
  const tailBottom = symbolBottom + 18;
  const svg = [
    svgLine(x, y, x, y + height * 0.32, STROKE_THIN),
    svgLine(x, y + height * 0.32, x + 13, y + height, STROKE_THIN),
    svgLine(x, y + height * 0.32, x - 3, y + height + 3, STROKE_THIN),
    `<rect x="${x + 15}" y="${y + height * 0.18}" width="11" height="15" fill="none" stroke="#000" stroke-width="${STROKE_THIN}" />`,
    svgTextStack(x + 30, y + height * 0.35, labelLines, { size: 10, lineHeight: 12 }),
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
  return renderBreaker(x, y, formatBreakerLabelLines(breakerType, ratedCurrentA, poles, ka), 34);
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
    26,
  );
  return svg;
}

/**
 * RCD na poziomym tee (V1A) — wejście z backbone, symbol na poziomie, zejście na szynę.
 */
export function renderRcdTee(
  backboneX: number,
  teeY: number,
  rcdCenterX: number,
  busY: number,
  rcd: SchematicMainRcd,
): string {
  const labelLines = formatRcdLabelLines(rcd.ratedCurrentA, rcd.sensitivityMa, rcd.poles, rcd.rcdType);
  const symbolRight = rcdCenterX + 28;
  const labelX = symbolRight + 8;
  return [
    svgLine(backboneX, teeY, rcdCenterX - 18, teeY, STROKE_THIN),
    `<circle cx="${rcdCenterX}" cy="${teeY}" r="11" fill="none" stroke="#000" stroke-width="${STROKE_THIN}" />`,
    `<rect x="${rcdCenterX + 10}" y="${teeY - 14}" width="16" height="28" fill="none" stroke="#000" stroke-width="${STROKE_THIN}" />`,
    `<line x1="${rcdCenterX + 26}" y1="${teeY}" x2="${symbolRight}" y2="${teeY}" stroke="#000" stroke-width="${STROKE_THIN}" />`,
    svgTextStack(labelX, teeY - 14, labelLines, { size: 10, lineHeight: 12 }),
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

/** Etykieta przewodu — pionowa, większy font i offset (V1A). */
export function renderVerticalCableLabel(
  lineX: number,
  y1: number,
  y2: number,
  label: string,
  side: "left" | "right" = "left",
): string {
  const offset = side === "left" ? -28 : 28;
  const midY = (y1 + y2) / 2;
  return svgText(lineX + offset, midY, label, { anchor: "middle", size: 10, rotate: -90 });
}

/** Gniazdo 230V — łuk. */
export function renderSocket1f(x: number, y: number): string {
  return [
    svgLine(x, y - 18, x, y - 6, STROKE_THIN),
    `<path d="M ${x - 10} ${y - 6} A 10 10 0 0 1 ${x + 10} ${y - 6}" fill="none" stroke="#000" stroke-width="${STROKE_THIN}" />`,
  ].join("\n");
}

/** Kuchenka 3F — symbol dedykowany (nie socket+3F). */
export function renderStove3f(x: number, y: number): string {
  return [
    svgLine(x, y - 20, x, y - 8, STROKE_THIN),
    `<path d="M ${x - 11} ${y - 8} A 11 11 0 0 1 ${x + 11} ${y - 8}" fill="none" stroke="#000" stroke-width="${STROKE_THIN}" />`,
    svgLine(x - 6, y - 8, x - 6, y + 2, STROKE_THIN),
    svgLine(x + 6, y - 8, x + 6, y + 2, STROKE_THIN),
    svgLine(x - 8, y + 2, x + 8, y + 2, STROKE_THIN),
    svgLine(x, y + 2, x, y + 8, STROKE_THIN),
  ].join("\n");
}

/** Gniazdo 400V — łuk (bez 3F tekstu; stove używa renderStove3f). */
export function renderSocket3f(x: number, y: number): string {
  return [
    renderSocket1f(x, y),
    svgText(x, y + 10, "3F", { anchor: "middle", size: 8 }),
  ].join("\n");
}

/** Oświetlenie — okrąg z krzyżem. */
export function renderLighting(x: number, y: number): string {
  return [
    svgLine(x, y - 18, x, y - 8, STROKE_THIN),
    `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="#000" stroke-width="${STROKE_THIN}" />`,
    svgLine(x - 6, y - 6, x + 6, y + 6, STROKE_THIN),
    svgLine(x - 6, y + 6, x + 6, y - 6, STROKE_THIN),
  ].join("\n");
}

/** Wypust kablowy 3F. */
export function renderCableOutlet3f(x: number, y: number, description?: string): string {
  const label = description?.trim() || "";
  return [
    svgLine(x, y - 18, x, y - 4, STROKE_THIN),
    svgLine(x - 8, y - 4, x + 8, y - 4, STROKE_THIN),
    svgLine(x - 8, y - 4, x - 8, y + 2, STROKE_THIN),
    svgLine(x + 8, y - 4, x + 8, y + 2, STROKE_THIN),
    ...(label ? [svgText(x, y + 14, label, { anchor: "middle", size: 7 })] : []),
  ].join("\n");
}

/** Bojler — gniazdo + etykieta BOJLER. */
export function renderBoiler(x: number, y: number): string {
  return [
    renderSocket1f(x, y),
    svgText(x, y + 12, "BOJLER", { anchor: "middle", size: 7 }),
  ].join("\n");
}

/** Rezerwa — punkt + etykieta. */
export function renderReserve(x: number, y: number): string {
  return [
    svgLine(x, y - 18, x, y - 6, STROKE_THIN),
    svgDot(x, y - 2, 2),
    svgText(x, y + 8, "REZERWA", { anchor: "middle", size: 7 }),
  ].join("\n");
}

/** Wypust generyczny (other). */
export function renderGenericOutlet(x: number, y: number): string {
  return [
    svgLine(x, y - 18, x, y - 4, STROKE_THIN),
    svgDot(x, y, 2),
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
