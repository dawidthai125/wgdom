import type { SchematicCircuit, SingleLineDiagram } from "@/lib/electrical-schematics/types";
import { svgDot, svgLine, svgText } from "@/lib/electrical-schematics/render/svg-utils";
import {
  renderLoadSymbol,
  renderMainBreakerSymbol,
  renderMainSwitch,
  renderMcbSymbol,
  renderMeter,
  renderRcd,
  renderSupplyBus,
  renderVerticalCableLabel,
} from "@/lib/electrical-schematics/symbols/iec-simplified";

export const APARTMENT_1F_VIEWBOX = { width: 1100, height: 820 };

export const APARTMENT_1F_LAYOUT = {
  marginX: 44,
  headerY: 40,
  supplyBusY: 86,
  leftColumnX: 100,
  meterTopY: 112,
  mainBreakerY: 218,
  rcdAnchorY: 286,
  branchBusY: 334,
  circuitDropTop: 352,
  circuitDropBottom: 580,
  circuitNameY: 618,
  minCircuitSpacing: 88,
  maxCircuitSpacing: 140,
};

function sortedCircuits(diagram: SingleLineDiagram): SchematicCircuit[] {
  return [...diagram.circuits].sort((a, b) => a.sortOrder - b.sortOrder);
}

function circuitColumnPositions(count: number, busStartX: number, busEndX: number): number[] {
  const { minCircuitSpacing, maxCircuitSpacing } = APARTMENT_1F_LAYOUT;
  const span = busEndX - busStartX;
  if (count <= 1) return [busStartX + span / 2];
  const ideal = span / (count - 1);
  const spacing = Math.max(minCircuitSpacing, Math.min(maxCircuitSpacing, ideal));
  const used = spacing * (count - 1);
  const offset = (span - used) / 2;
  return Array.from({ length: count }, (_, i) => busStartX + offset + i * spacing);
}

function renderHeader(diagram: SingleLineDiagram): string {
  const { width } = APARTMENT_1F_VIEWBOX;
  const title = diagram.title.trim();
  const address = diagram.address.trim();
  const headerLine = address ? `${title} - ${address}` : title;
  return svgText(width / 2, APARTMENT_1F_LAYOUT.headerY, headerLine, { anchor: "middle", size: 13 });
}

function renderLeftFeed(diagram: SingleLineDiagram, busY: number): string {
  const x = APARTMENT_1F_LAYOUT.leftColumnX;
  const parts: string[] = [svgLine(x, busY, x, APARTMENT_1F_LAYOUT.meterTopY - 16, 1.2)];

  if (diagram.mainSwitch?.label) {
    parts.push(renderMainSwitch(x, APARTMENT_1F_LAYOUT.meterTopY - 36, diagram.mainSwitch.label));
  }

  parts.push(renderMeter(x, APARTMENT_1F_LAYOUT.meterTopY, diagram.meter.phases, diagram.meter.label));

  parts.push(
    renderVerticalCableLabel(
      x - 22,
      APARTMENT_1F_LAYOUT.meterTopY + 52,
      APARTMENT_1F_LAYOUT.mainBreakerY - 8,
      diagram.supply.mainCableLabel,
    ),
  );

  parts.push(
    renderMainBreakerSymbol(
      x,
      APARTMENT_1F_LAYOUT.mainBreakerY,
      diagram.mainBreaker.breakerType,
      diagram.mainBreaker.ratedCurrentA,
      diagram.mainBreaker.poles,
      diagram.mainBreaker.breakingCapacityKa,
    ),
  );

  parts.push(renderRcd(x, APARTMENT_1F_LAYOUT.rcdAnchorY, diagram.mainRcd, busY));

  return parts.join("\n");
}

function renderBranchBus(busStartX: number, busEndX: number, busY: number, xs: number[]): string {
  const parts = [svgLine(busStartX, busY, busEndX, busY, 1.2)];
  for (const x of xs) parts.push(svgDot(x, busY));
  return parts.join("\n");
}

function renderCircuitColumn(circuit: SchematicCircuit, x: number, busY: number): string {
  const { circuitDropTop, circuitDropBottom, circuitNameY } = APARTMENT_1F_LAYOUT;
  const mcbY = circuitDropTop + 22;
  const loadY = circuitDropBottom - 8;

  return [
    svgLine(x, busY, x, circuitDropTop, 1.2),
    renderVerticalCableLabel(x + 14, circuitDropTop, circuitDropBottom, circuit.cableLabel),
    renderMcbSymbol(x, mcbY, circuit),
    renderLoadSymbol(x, loadY, circuit.loadKind, circuit),
    svgText(x, circuitNameY, circuit.name, { anchor: "middle", size: 9 }),
  ].join("\n");
}

/**
 * Layout apartment-1f-v1 — mieszkania 1F (licznik 1F, RCD 2P, bez FR domyślnie).
 * Obsługuje 4–8 obwodów.
 */
export function renderApartment1fV1Svg(diagram: SingleLineDiagram): string {
  const { width, height } = APARTMENT_1F_VIEWBOX;
  const { marginX, supplyBusY, branchBusY } = APARTMENT_1F_LAYOUT;
  const circuits = sortedCircuits(diagram);
  const busStartX = marginX + 36;
  const busEndX = width - marginX;
  const columnXs = circuitColumnPositions(circuits.length, busStartX, busEndX);

  const body = [
    renderHeader(diagram),
    renderSupplyBus(busStartX, supplyBusY, busEndX, diagram.supply.busLabel),
    renderLeftFeed(diagram, branchBusY),
    renderBranchBus(busStartX, busEndX, branchBusY, columnXs),
    ...circuits.map((c, i) => renderCircuitColumn(c, columnXs[i], branchBusY)),
  ].join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    `<rect width="100%" height="100%" fill="#fff" />`,
    `<g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round">`,
    body,
    `</g>`,
    `</svg>`,
  ].join("\n");
}

export function apartment1fLayoutMeta(diagram: SingleLineDiagram): {
  circuitCount: number;
  columnXs: number[];
} {
  const { marginX } = APARTMENT_1F_LAYOUT;
  const { width } = APARTMENT_1F_VIEWBOX;
  const busStartX = marginX + 36;
  const busEndX = width - marginX;
  const circuits = sortedCircuits(diagram);
  return {
    circuitCount: circuits.length,
    columnXs: circuitColumnPositions(circuits.length, busStartX, busEndX),
  };
}

export function assertApartment1fRenderable(diagram: SingleLineDiagram): void {
  if (diagram.layoutProfile !== "apartment-1f-v1") {
    throw new Error(`apartment-1f-v1 layout required, got ${diagram.layoutProfile}`);
  }
  if (diagram.supply.phase !== "1f") {
    throw new Error("apartment-1f-v1 requires supply.phase 1f");
  }
  const count = diagram.circuits.length;
  if (count < 1 || count > 10) {
    throw new Error(`apartment-1f-v1 supports 1–10 circuits, got ${count}`);
  }
  for (const c of diagram.circuits) {
    if (!c.name.trim()) throw new Error(`circuit ${c.id} missing name`);
    if (!c.cableLabel.trim()) throw new Error(`circuit ${c.id} missing cableLabel`);
  }
}
