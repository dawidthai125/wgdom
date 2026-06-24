import type { SchematicCircuit, SingleLineDiagram } from "@/lib/electrical-schematics/types";
import { resolveBusLayoutV2 } from "@/lib/electrical-schematics/layout/bus-layout-v2";
import { svgLine, svgText } from "@/lib/electrical-schematics/render/svg-utils";
import {
  METER_BODY_HEIGHT,
  renderCircuitColumnGuides,
  renderDistributionBus,
  renderLoadSymbol,
  renderMainBreakerSymbol,
  renderMainSwitch,
  renderMcbSymbol,
  renderMeter,
  renderRcdTee,
  renderSupplyBus,
  renderVerticalCableLabel,
  STROKE_THIN,
  TEXT_SIZE_CIRCUIT_NAME,
  TEXT_SIZE_HEADER,
} from "@/lib/electrical-schematics/symbols/iec-simplified";

export const APARTMENT_1F_VIEWBOX = { width: 1248, height: 748 };

/** MCB + etykieta po prawej od osi kolumny (renderBreaker: x+34 + stack). */
export const APARTMENT_1F_CIRCUIT_SYMBOL_RIGHT_WIDTH = 96;

/** V2 layout scale — proporcje jak 3F, węższa kanwa. */
export const APARTMENT_1F_LAYOUT = {
  marginX: 24,
  columnRightInset: APARTMENT_1F_CIRCUIT_SYMBOL_RIGHT_WIDTH,
  busColumnTail: 24,
  headerY: 34,
  supplyBusY: 64,
  feedBackboneX: 68,
  rcdCenterX: 162,
  meterTopY: 112,
  mainBreakerY: 232,
  rcdTeeY: 298,
  branchBusY: 346,
  circuitDropTop: 366,
  circuitDropBottom: 572,
  circuitNameY: 622,
  showColumnGuides: true,
  minCircuitSpacing: 72,
};

function sortedCircuits(diagram: SingleLineDiagram): SchematicCircuit[] {
  return [...diagram.circuits].sort((a, b) => a.sortOrder - b.sortOrder);
}

function resolveLayout(diagram: SingleLineDiagram) {
  const circuits = sortedCircuits(diagram);
  const bus = resolveBusLayoutV2(circuits.length, {
    viewBoxWidth: APARTMENT_1F_VIEWBOX.width,
    feedBackboneX: APARTMENT_1F_LAYOUT.feedBackboneX,
    marginX: APARTMENT_1F_LAYOUT.marginX,
    minCircuitSpacing: APARTMENT_1F_LAYOUT.minCircuitSpacing,
    busColumnTail: APARTMENT_1F_LAYOUT.busColumnTail,
    columnRightInset: APARTMENT_1F_LAYOUT.columnRightInset,
  });
  return { circuits, ...bus };
}

function renderHeader(diagram: SingleLineDiagram): string {
  const { width } = APARTMENT_1F_VIEWBOX;
  const title = diagram.title.trim();
  const address = diagram.address.trim();
  const headerLine = address ? `${title} - ${address}` : title;
  return svgText(width / 2, APARTMENT_1F_LAYOUT.headerY, headerLine, {
    anchor: "middle",
    size: TEXT_SIZE_HEADER,
  });
}

function renderFeedChain(diagram: SingleLineDiagram): string {
  const {
    feedBackboneX,
    supplyBusY,
    meterTopY,
    mainBreakerY,
    rcdTeeY,
    rcdCenterX,
    branchBusY,
  } = APARTMENT_1F_LAYOUT;
  const parts: string[] = [];

  const meterBottomY = meterTopY + METER_BODY_HEIGHT;
  const frY = meterTopY - 48;

  parts.push(svgLine(feedBackboneX, supplyBusY, feedBackboneX, meterTopY - 8, STROKE_THIN));

  if (diagram.mainSwitch?.label) {
    parts.push(renderMainSwitch(feedBackboneX, frY, diagram.mainSwitch.label));
  }

  parts.push(renderMeter(feedBackboneX, meterTopY, diagram.meter.phases, diagram.meter.label));

  parts.push(
    renderVerticalCableLabel(
      feedBackboneX,
      meterBottomY + 4,
      mainBreakerY - 6,
      diagram.supply.mainCableLabel,
      "left",
    ),
  );

  parts.push(svgLine(feedBackboneX, meterBottomY, feedBackboneX, mainBreakerY, STROKE_THIN));

  const { svg: breakerSvg, bottomY: breakerBottomY } = renderMainBreakerSymbol(
    feedBackboneX,
    mainBreakerY,
    diagram.mainBreaker.breakerType,
    diagram.mainBreaker.ratedCurrentA,
    diagram.mainBreaker.poles,
    diagram.mainBreaker.breakingCapacityKa,
  );
  parts.push(breakerSvg);

  const teeStartY = Math.max(breakerBottomY, rcdTeeY - 8);
  if (teeStartY < rcdTeeY) {
    parts.push(svgLine(feedBackboneX, teeStartY, feedBackboneX, rcdTeeY, STROKE_THIN));
  }

  parts.push(renderRcdTee(feedBackboneX, rcdTeeY, rcdCenterX, branchBusY, diagram.mainRcd));

  return parts.join("\n");
}

function renderCircuitColumn(circuit: SchematicCircuit, x: number, busY: number): string {
  const { circuitDropTop, circuitDropBottom, circuitNameY } = APARTMENT_1F_LAYOUT;
  const mcbY = circuitDropTop + 32;
  const loadY = circuitDropBottom - 12;

  return [
    svgLine(x, busY, x, circuitDropTop, STROKE_THIN),
    renderVerticalCableLabel(x, circuitDropTop, circuitDropBottom, circuit.cableLabel, "left"),
    renderMcbSymbol(x, mcbY, circuit),
    renderLoadSymbol(x, loadY, circuit.loadKind, circuit),
    svgText(x, circuitNameY, circuit.name, { anchor: "middle", size: TEXT_SIZE_CIRCUIT_NAME }),
  ].join("\n");
}

/**
 * Layout apartment-1f-v1 — mieszkania 1F (licznik 1F, RCD 2P).
 * Obsługuje 1–10 obwodów.
 */
export function renderApartment1fV1Svg(diagram: SingleLineDiagram): string {
  const { width, height } = APARTMENT_1F_VIEWBOX;
  const { supplyBusY, branchBusY, circuitNameY, showColumnGuides } = APARTMENT_1F_LAYOUT;
  const { circuits, columnXs, busStartX, busEndX } = resolveLayout(diagram);

  const guides = renderCircuitColumnGuides(columnXs, branchBusY, circuitNameY + 14, showColumnGuides);

  const body = [
    renderHeader(diagram),
    renderSupplyBus(busStartX, supplyBusY, busEndX, diagram.supply.busLabel),
    renderFeedChain(diagram),
    renderDistributionBus(busStartX, branchBusY, busEndX, columnXs),
    ...circuits.map((c, i) => renderCircuitColumn(c, columnXs[i], branchBusY)),
  ].join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    `<rect width="100%" height="100%" fill="#fff" />`,
    ...(guides ? [`<g stroke-linecap="round">${guides}</g>`] : []),
    `<g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round">`,
    body,
    `</g>`,
    `</svg>`,
  ].join("\n");
}

export function apartment1fLayoutMeta(diagram: SingleLineDiagram): {
  circuitCount: number;
  columnXs: number[];
  busStartX: number;
  busEndX: number;
} {
  const { circuits, columnXs, busStartX, busEndX } = resolveLayout(diagram);
  return {
    circuitCount: circuits.length,
    columnXs,
    busStartX,
    busEndX,
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
