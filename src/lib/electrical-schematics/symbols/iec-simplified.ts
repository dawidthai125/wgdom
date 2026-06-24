/**
 * Uproszczone symbole IEC — monochromatyczne, minimalne (WM-SCHEMATY-V1 Faza 2A).
 */
import type { SchematicCircuit, SchematicLoadKind, SchematicMainRcd } from "@/lib/electrical-schematics/types";
import {
  formatMainBreakerLabel,
  formatMcbLabel,
  formatRcdLabel,
  svgDot,
  svgLine,
  svgText,
} from "@/lib/electrical-schematics/render/svg-utils";

const STROKE = 1.2;

/** Pozioma szyna zasilania + etykieta faz. */
export function renderSupplyBus(x1: number, y: number, x2: number, busLabel: string): string {
  const mid = (x1 + x2) / 2;
  return [
    svgText(mid, y - 12, busLabel, { anchor: "middle", size: 12 }),
    svgLine(x1, y, x2, y, STROKE),
    svgDot(x1, y),
  ].join("\n");
}

/** Wyłącznik główny FR (opcjonalny). */
export function renderMainSwitch(x: number, y: number, label: string): string {
  return [
    svgLine(x, y - 18, x, y - 4, STROKE),
    svgLine(x, y - 4, x + 14, y + 10, STROKE),
    svgLine(x, y - 4, x - 2, y + 12, STROKE),
    svgText(x + 22, y + 6, label, { size: 10 }),
  ].join("\n");
}

/** Licznik energii — prostokąt 3F + KWh. */
export function renderMeter(x: number, y: number, phases: 1 | 3, label: string): string {
  const w = 36;
  const h = 52;
  const phaseText = phases === 3 ? "3F" : "1F";
  return [
    `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#000" stroke-width="${STROKE}" />`,
    `<line x1="${x - w / 2}" y1="${y + h / 2}" x2="${x + w / 2}" y2="${y + h / 2}" stroke="#000" stroke-width="${STROKE}" />`,
    svgText(x, y + 18, phaseText, { anchor: "middle", size: 11 }),
    svgText(x, y + 40, label, { anchor: "middle", size: 10 }),
    svgLine(x, y, x, y - 16, STROKE),
    svgLine(x, y + h, x, y + h + 16, STROKE),
  ].join("\n");
}

/** Wyłącznik nadprądowy (MCB / główny). */
export function renderBreaker(
  x: number,
  y: number,
  label: string,
  height = 28,
): string {
  return [
    svgLine(x, y, x, y + height * 0.35, STROKE),
    svgLine(x, y + height * 0.35, x + 12, y + height, STROKE),
    svgLine(x, y + height * 0.35, x - 3, y + height + 4, STROKE),
    `<rect x="${x + 14}" y="${y + height * 0.2}" width="10" height="14" fill="none" stroke="#000" stroke-width="${STROKE}" />`,
    svgText(x + 28, y + height + 2, label, { size: 9 }),
    svgLine(x, y + height + 8, x, y + height + 22, STROKE),
  ].join("\n");
}

export function renderMainBreakerSymbol(
  x: number,
  y: number,
  breakerType: string,
  ratedCurrentA: number,
  poles: number,
  ka: number,
): string {
  const label = formatMainBreakerLabel(breakerType, ratedCurrentA, poles, ka);
  return renderBreaker(x, y, label, 32);
}

export function renderMcbSymbol(x: number, y: number, circuit: SchematicCircuit): string {
  const label = formatMcbLabel(
    circuit.breakerType,
    circuit.ratedCurrentA,
    circuit.poles,
    circuit.breakingCapacityKa,
  );
  return renderBreaker(x, y, label, 24);
}

/** RCD — transformator różnicowy + etykieta. */
export function renderRcd(x: number, y: number, rcd: SchematicMainRcd, busY: number): string {
  const label = formatRcdLabel(rcd.ratedCurrentA, rcd.sensitivityMa, rcd.poles, rcd.rcdType);
  return [
    svgLine(x, y - 20, x, busY, STROKE),
    svgLine(x, y - 20, x + 40, y - 20, STROKE),
    `<circle cx="${x + 20}" cy="${y - 20}" r="10" fill="none" stroke="#000" stroke-width="${STROKE}" />`,
    `<rect x="${x + 36}" y="${y - 32}" width="18" height="24" fill="none" stroke="#000" stroke-width="${STROKE}" />`,
    svgLine(x + 40, y - 20, x + 54, y - 20, STROKE),
    svgText(x + 58, y - 16, label, { size: 9 }),
    svgDot(x, busY),
  ].join("\n");
}

/** Etykieta przewodu — pionowa. */
export function renderVerticalCableLabel(x: number, y1: number, y2: number, label: string): string {
  const midY = (y1 + y2) / 2;
  return svgText(x - 10, midY, label, { anchor: "middle", size: 8, rotate: -90 });
}

/** Gniazdo 230V — łuk. */
export function renderSocket1f(x: number, y: number): string {
  return [
    svgLine(x, y - 18, x, y - 6, STROKE),
    `<path d="M ${x - 10} ${y - 6} A 10 10 0 0 1 ${x + 10} ${y - 6}" fill="none" stroke="#000" stroke-width="${STROKE}" />`,
  ].join("\n");
}

/** Gniazdo 400V — łuk + 3F. */
export function renderSocket3f(x: number, y: number): string {
  return [
    renderSocket1f(x, y),
    svgText(x, y + 10, "3F", { anchor: "middle", size: 8 }),
  ].join("\n");
}

/** Oświetlenie — okrąg z krzyżem. */
export function renderLighting(x: number, y: number): string {
  return [
    svgLine(x, y - 18, x, y - 8, STROKE),
    `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="#000" stroke-width="${STROKE}" />`,
    svgLine(x - 6, y - 6, x + 6, y + 6, STROKE),
    svgLine(x - 6, y + 6, x + 6, y - 6, STROKE),
  ].join("\n");
}

/** Wypust kablowy 3F. */
export function renderCableOutlet3f(x: number, y: number, description?: string): string {
  const label = description?.trim() || "";
  return [
    svgLine(x, y - 18, x, y - 4, STROKE),
    svgLine(x - 8, y - 4, x + 8, y - 4, STROKE),
    svgLine(x - 8, y - 4, x - 8, y + 2, STROKE),
    svgLine(x + 8, y - 4, x + 8, y + 2, STROKE),
    ...(label ? [svgText(x, y + 14, label, { anchor: "middle", size: 7 })] : []),
  ].join("\n");
}

/** Bojler — gniazdo + etykieta BOJLER (preset boiler). */
export function renderBoiler(x: number, y: number): string {
  return [
    renderSocket1f(x, y),
    svgText(x, y + 12, "BOJLER", { anchor: "middle", size: 7 }),
  ].join("\n");
}

/** Rezerwa — punkt + etykieta. */
export function renderReserve(x: number, y: number): string {
  return [
    svgLine(x, y - 18, x, y - 6, STROKE),
    svgDot(x, y - 2, 2),
    svgText(x, y + 8, "REZERWA", { anchor: "middle", size: 7 }),
  ].join("\n");
}

/** Wypust generyczny (other). */
export function renderGenericOutlet(x: number, y: number): string {
  return [
    svgLine(x, y - 18, x, y - 4, STROKE),
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
  if (loadKind === "socket-3f") return renderSocket3f(x, y);
  if (loadKind === "cable-outlet-3f") return renderCableOutlet3f(x, y, circuit.description || circuit.name);
  if (loadKind === "reserve") return renderReserve(x, y);
  if (loadKind === "other") return renderGenericOutlet(x, y);
  if (loadKind === "socket-1f" && lowerName.includes("bojler")) return renderBoiler(x, y);
  return renderSocket1f(x, y);
}
