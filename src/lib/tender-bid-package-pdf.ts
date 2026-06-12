import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { TenderCompanyProfile } from "@/lib/tenders-bzp-company";
import { fmtPln } from "@/lib/tenders-bzp-swz";
import { computeBidPrepChecks } from "@/lib/tenders-bid-prep";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import { resolveTenderValue, resolvedAwardCriteria } from "@/lib/tender-data-ssot";

async function loadPdfMake() {
  const pdfMake = (await import("pdfmake/build/pdfmake")).default;
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  pdfMake.vfs = (pdfFontsModule.default ?? pdfFontsModule) as typeof pdfMake.vfs;
  return pdfMake;
}

type PdfDocDef = Parameters<Awaited<ReturnType<typeof loadPdfMake>>["createPdf"]>[0];

const C = {
  navy: "#344254",
  red: "#C0392B",
  light: "#EDF1F6",
  muted: "#8A9BB0",
  green: "#1E7E34",
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pl-PL", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export async function exportTenderBidPackagePdf(opts: {
  item: TenderPipelineItem;
  profile: TenderCompanyProfile;
  bidProposal: TenderBidProposal | null | undefined;
}): Promise<void> {
  const { item, profile, bidProposal } = opts;
  const swz = item.swzAnalysis;
  const checks = computeBidPrepChecks(item, swz, item.tenderFit, bidProposal ?? null);
  const wadium = computeWadiumInfo(item, swz, profile.maxWadiumPln);
  const ready = checks.filter((c) => c.status === "ok").length;

  const criteriaRows = resolvedAwardCriteria(swz).map((c) => [
    { text: c.name, fontSize: 9 },
    { text: c.weightPct != null ? `${c.weightPct}%` : "—", fontSize: 9, alignment: "right" },
    { text: c.maxPoints != null ? String(c.maxPoints) : "—", fontSize: 9, alignment: "right" },
  ]);

  const checkRows = checks.map((c) => [
    { text: c.label, fontSize: 9 },
    { text: c.display, fontSize: 9 },
    { text: c.status === "ok" ? "OK" : c.status === "partial" ? "~" : "!", fontSize: 9, alignment: "center" },
  ]);

  const costRows = (bidProposal?.costStack ?? []).map((line) => [
    { text: line.label, fontSize: 9 },
    { text: fmtPln(line.pln), fontSize: 9, alignment: "right", font: "Roboto" },
  ]);

  const estimateHistory = [...(item.estimateHistory ?? [])].reverse().slice(0, 8).map((h) => [
    { text: fmtPln(h.pln), fontSize: 8 },
    { text: new Date(h.at).toLocaleString("pl-PL"), fontSize: 8 },
    { text: h.note ?? "", fontSize: 8, color: C.muted },
  ]);

  const filename = `pakiet-wyceny-${(item.bzpNumber || item.id).replace(/[^\w.-]+/g, "-")}.pdf`;

  const doc: PdfDocDef = {
    pageMargins: [40, 48, 40, 40],
    content: [
      { text: "W&G DOM — Pakiet wyceny przetargowej", style: "header" },
      { text: new Date().toLocaleString("pl-PL"), style: "sub", margin: [0, 0, 0, 12] },
      { canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 3, color: C.red }] },
      { text: item.title, style: "title", margin: [0, 12, 0, 4] },
      {
        columns: [
          { width: "*", stack: [
            { text: item.organizationName, fontSize: 10 },
            { text: `${item.organizationCity || "—"} · ${item.bzpNumber}`, fontSize: 9, color: C.muted },
          ] },
          { width: "auto", stack: [
            { text: "Gotowość", fontSize: 8, color: C.muted, alignment: "right" },
            { text: `${ready}/${checks.length}`, fontSize: 14, bold: true, alignment: "right", color: C.navy },
          ] },
        ],
        margin: [0, 0, 0, 12],
      },
      { text: "Kluczowe dane", style: "section" },
      {
        table: {
          widths: ["*", "*"],
          body: [
            [{ text: "Termin ofert", style: "cellLabel" }, { text: fmtDate(item.submittingOffersDate), style: "cellVal" }],
            [{ text: "Wartość (SWZ/kosztorys)", style: "cellLabel" }, { text: resolveTenderValue(item, swz).display, style: "cellVal" }],
            [{ text: "Wadium", style: "cellLabel" }, { text: wadium.summary, style: "cellVal", color: wadium.blocked ? C.red : C.navy }],
            [{ text: "Nasz szacunek", style: "cellLabel" }, { text: item.ourEstimatePln != null ? fmtPln(item.ourEstimatePln) : "—", style: "cellVal" }],
            [{ text: "Propozycja kalkulatora", style: "cellLabel" }, { text: bidProposal?.recommendedBidPln != null ? fmtPln(bidProposal.recommendedBidPln) : "—", style: "cellVal" }],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 12],
      },
      { text: "Checklist ofertowy", style: "section" },
      {
        table: {
          headerRows: 1,
          widths: ["28%", "*", "8%"],
          body: [
            [{ text: "Pole", style: "th" }, { text: "Wartość", style: "th" }, { text: "✓", style: "th" }],
            ...checkRows,
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 12],
      },
      ...(criteriaRows.length > 0 ? [
        { text: "Kryteria oceny ofert", style: "section" },
        {
          table: {
            headerRows: 1,
            widths: ["*", "15%", "15%"],
            body: [
              [{ text: "Kryterium", style: "th" }, { text: "Waga", style: "th" }, { text: "Pkt max", style: "th" }],
              ...criteriaRows,
            ],
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 12],
        },
      ] : []),
      ...(costRows.length > 0 ? [
        { text: "Kalkulacja kosztów", style: "section" },
        {
          table: {
            widths: ["*", "25%"],
            body: costRows,
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 12],
        },
      ] : []),
      ...(estimateHistory.length > 0 ? [
        { text: "Historia „Nasz szacunek”", style: "section" },
        {
          table: {
            widths: ["22%", "28%", "*"],
            body: [
              [{ text: "Kwota", style: "th" }, { text: "Data", style: "th" }, { text: "Notatka", style: "th" }],
              ...estimateHistory,
            ],
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 12],
        },
      ] : []),
      ...(item.notes?.trim() ? [
        { text: "Notatki", style: "section" },
        { text: item.notes, fontSize: 9, margin: [0, 0, 0, 8] },
      ] : []),
      { text: `Wygenerowano w WGDOM · ${profile.companyName} · NIP ${profile.nip}`, fontSize: 7, color: C.muted, margin: [0, 16, 0, 0] },
    ],
    styles: {
      header: { fontSize: 16, bold: true, color: C.navy },
      sub: { fontSize: 9, color: C.muted },
      title: { fontSize: 12, bold: true, color: C.navy },
      section: { fontSize: 10, bold: true, color: C.red, margin: [0, 8, 0, 4] },
      cellLabel: { fontSize: 9, color: C.muted },
      cellVal: { fontSize: 9, bold: true },
      th: { fontSize: 8, bold: true, fillColor: C.light, color: C.navy },
    },
    defaultStyle: { font: "Roboto", color: C.navy },
  };

  const pdfMake = await loadPdfMake();
  pdfMake.createPdf(doc).download(filename);
}
