import type { KosztorysBoqRowViewModel } from "@/lib/tender-kosztorys-boq-explorer";
import {
  formatBoqAthPrice,
  formatBoqWgdomLine,
  formatBoqWgdomUnit,
} from "@/lib/tender-kosztorys-boq-explorer";

/** Many Views — wspólne pola mobile card / desktop table (Principle #001). */
export function boqRowMobileFields(row: KosztorysBoqRowViewModel) {
  return [
    { label: "j.m.", value: row.unit || "—" },
    { label: "Ilość", value: row.quantity || "—" },
    { label: "KNR", value: row.knrHint || "—" },
    { label: "Cena ATH", value: formatBoqAthPrice(row.athUnitPrice) },
    { label: "Wartość ATH", value: formatBoqAthPrice(row.athTotal) },
    { label: "Cena WGDOM", value: formatBoqWgdomUnit(row.wgdomUnitPln) },
    { label: "Wartość WGDOM", value: formatBoqWgdomLine(row.wgdomLinePln, row.isUnknown) },
  ];
}

export function BoqRowDesktopCells({ row }: { row: KosztorysBoqRowViewModel }) {
  return (
    <>
      <td className="px-2 py-1.5 font-mono">{row.lp}</td>
      <td className="px-2 py-1.5">{row.description}</td>
      <td className="px-2 py-1.5">{row.unit || "—"}</td>
      <td className="px-2 py-1.5 text-right font-mono">{row.quantity || "—"}</td>
      <td className="px-2 py-1.5 font-mono text-[10px]">{row.knrHint || "—"}</td>
      <td className="px-2 py-1.5 text-right font-mono">{formatBoqAthPrice(row.athUnitPrice)}</td>
      <td className="px-2 py-1.5 text-right font-mono">{formatBoqAthPrice(row.athTotal)}</td>
      <td className="px-2 py-1.5 text-right font-mono">{formatBoqWgdomUnit(row.wgdomUnitPln)}</td>
      <td className="px-2 py-1.5 text-right font-mono">{formatBoqWgdomLine(row.wgdomLinePln, row.isUnknown)}</td>
    </>
  );
}
