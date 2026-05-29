import type { AthPreviewResult } from "@/lib/ath-parser";
import { getCompanyLogoDataUrl } from "@/lib/payroll-export";

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
  white: "#FFFFFF",
  muted: "#6B7A8D",
  green: "#1A5C38",
  disclaimerBg: "#F4F6F9",
  disclaimerBorder: "#CCD3DC",
};

export const KOSZTORYS_DISCLAIMER_TITLE =
  "Przeglądarka kosztorysów W&G DOM — wyłącznie do użytku wewnętrznego";

export const KOSZTORYS_DISCLAIMER_BODY =
  "Niniejszy dokument został wygenerowany przez wewnętrzną przeglądarkę kosztorysów firmy W&G DOM "
  + "na podstawie pliku eksportu (.ath) z programu NORMA (Athenasoft). Służy wyłącznie do prywatnego "
  + "wglądu i użytku wewnętrznego W&G DOM — nie stanowi oferty handlowej, wiążącego kosztorysu ani "
  + "substytutu dokumentów wystawionych w programie NORMA. W&G DOM nie jest producentem oprogramowania "
  + "NORMA; wszelkie prawa do NORMA należą do Athenasoft Sp. z o.o.";

export const KOSZTORYS_DISCLAIMER_SHORT =
  "Podgląd wewnętrzny W&G DOM · plik źródłowy NORMA (.ath) · nie jest dokumentem wiążącym ani ofertą.";

export const KOSZTORYS_DTT_CREDIT =
  "Przeglądarka plików NORMA (.ath) oraz generator PDF kosztorysu — stworzone w mękach i pocie przez DTT.";

function isMobileSafari(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

async function deliverPdfBlob(blob: Blob, filename: string, previewOnly = false): Promise<string | void> {
  const url = URL.createObjectURL(blob);
  if (previewOnly) return url;

  const file = new File([blob], filename, { type: "application/pdf" });
  if (typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: filename });
    URL.revokeObjectURL(url);
    return;
  }

  try {
    if (isMobileSafari()) {
      const opened = window.open(url, "_blank");
      if (!opened) throw new Error("Safari zablokował otwarcie PDF — odblokuj wyskakujące okna");
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function cell(text: string, opts: { bold?: boolean; fill?: string; align?: "left" | "right" | "center"; fontSize?: number } = {}) {
  return {
    text,
    fontSize: opts.fontSize ?? 7,
    bold: opts.bold,
    alignment: opts.align ?? "left",
    fillColor: opts.fill ?? C.white,
  };
}

function hdrCell(text: string, align: "left" | "right" | "center" = "left") {
  return { text, fontSize: 7, bold: true, alignment: align, fillColor: C.navy, color: C.white };
}

function pdfDisclaimerBlock(): PdfDocDef["content"] {
  return {
    table: {
      widths: ["*"],
      body: [[{
        stack: [
          { text: KOSZTORYS_DISCLAIMER_TITLE, fontSize: 7, bold: true, color: C.navy, margin: [0, 0, 0, 3] },
          { text: KOSZTORYS_DISCLAIMER_BODY, fontSize: 6.5, color: C.muted, lineHeight: 1.25 },
        ],
        margin: [6, 6, 6, 6],
      }]],
    },
    layout: {
      fillColor: () => C.disclaimerBg,
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => C.disclaimerBorder,
      vLineColor: () => C.disclaimerBorder,
    },
    margin: [0, 0, 0, 10],
  };
}

function buildKosztorysDocDef(data: AthPreviewResult, sourceFilename: string, logoDataUrl: string): PdfDocDef {
  const cur = data.currency || "PLN";
  const generatedAt = new Date().toLocaleString("pl-PL");
  const content: PdfDocDef["content"] = [
    {
      columns: [
        {
          width: 86,
          table: {
            body: [[{
              image: logoDataUrl,
              width: 78,
              margin: [4, 4, 4, 4] as [number, number, number, number],
              fillColor: C.white,
            }]],
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
        },
        {
          width: "*",
          stack: [
            { text: "W&G DOM", fontSize: 15, bold: true, color: C.navy },
            { text: "Przeglądarka kosztorysów — użytek wewnętrzny", fontSize: 7, color: C.muted, margin: [0, 1, 0, 0] },
            { text: data.documentType || "KOSZTORYS OFERTOWY", fontSize: 9, bold: true, color: C.red, margin: [0, 3, 0, 0] },
            { text: sourceFilename, fontSize: 6.5, color: C.muted, margin: [0, 2, 0, 0] },
          ],
          margin: [4, 6, 0, 0],
        },
      ],
      columnGap: 6,
      margin: [0, 0, 0, 8],
    },
    pdfDisclaimerBlock(),
  ];

  if (data.title) {
    content.push({ text: data.title, fontSize: 11, bold: true, margin: [0, 0, 0, 2] });
  }
  if (data.subtitle) {
    content.push({ text: data.subtitle, fontSize: 8, color: C.muted, margin: [0, 0, 0, 8] });
  }
  if (data.summary) {
    content.push({ text: data.summary, fontSize: 8, bold: true, margin: [0, 0, 0, 10] });
  }

  if (data.summaryLines && data.summaryLines.length > 0) {
    content.push({ text: "Podsumowanie", fontSize: 9, bold: true, color: C.navy, margin: [0, 0, 0, 4] });
    content.push({
      table: {
        widths: ["*", 90],
        body: data.summaryLines
          .filter((l) => l.label || l.value)
          .map((l) => [
            cell(l.label, { bold: l.bold, fill: l.bold ? C.light : C.white, fontSize: l.indent ? 6.5 : 7 }),
            cell(l.value, { bold: l.bold, align: "right", fill: l.bold ? C.light : C.white, fontSize: 7 }),
          ]),
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 12],
    });
  }

  if (data.rows.length > 0) {
    content.push({ text: "Pozycje kosztorysu", fontSize: 9, bold: true, color: C.navy, margin: [0, 0, 0, 4] });
    const body: unknown[][] = [[
      hdrCell("Lp"),
      hdrCell("Podstawa"),
      hdrCell("Opis pozycji"),
      hdrCell("j.m."),
      hdrCell("Ilość", "right"),
      hdrCell("Cena j.", "right"),
      hdrCell("Wartość", "right"),
    ]];

    let lastCat = "";
    for (const row of data.rows) {
      const catKey = row.categoryLp ? `${row.categoryLp}|${row.category}` : row.category || "";
      if (catKey && catKey !== lastCat) {
        lastCat = catKey;
        body.push([
          { text: `${row.categoryLp ? `${row.categoryLp} · ` : ""}${row.category}`, colSpan: 7, bold: true, fillColor: "#E8F5EE", fontSize: 7, color: C.green },
          {}, {}, {}, {}, {}, {},
        ]);
      }
      body.push([
        cell(row.lp, { fontSize: 7 }),
        cell(row.code, { fontSize: 6 }),
        cell(row.description, { fontSize: 7 }),
        cell(row.unit, { fontSize: 7 }),
        cell(row.quantity, { align: "right", fontSize: 7 }),
        cell(row.unitPrice, { align: "right", fontSize: 7 }),
        cell(row.total, { align: "right", bold: true, fontSize: 7 }),
      ]);
    }

    content.push({
      table: { headerRows: 1, widths: [22, 52, "*", 24, 32, 42, 46], body },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 10],
    });
  }

  const przedRows = data.rows.filter((r) => r.przedmiar && r.przedmiar.length > 0);
  if (przedRows.length > 0) {
    content.push({ text: "Przedmiar / obmiar", fontSize: 9, bold: true, color: C.navy, margin: [0, 4, 0, 4], pageBreak: "before" });
    const pBody: unknown[][] = [[
      hdrCell("Lp"),
      hdrCell("Opis pozycji"),
      hdrCell("Ilość", "right"),
      hdrCell("Obmiar / wzór"),
    ]];

    for (const row of przedRows) {
      for (const pm of row.przedmiar!) {
        pBody.push([
          cell(row.lp, { fontSize: 7 }),
          cell(row.description.slice(0, 80), { fontSize: 7 }),
          cell(pm.quantity, { align: "right", fontSize: 7 }),
          cell(pm.formula || "—", { fontSize: 6.5 }),
        ]);
      }
    }

    content.push({
      table: { headerRows: 1, widths: [22, "*", 40, 120], body: pBody },
      layout: "lightHorizontalLines",
    });
  }

  content.push({
    text: `${KOSZTORYS_DTT_CREDIT} · Wygenerowano ${generatedAt} · ${data.rows.length} pozycji${data.totalValue ? ` · brutto ${data.totalValue} ${cur}` : ""}`,
    fontSize: 6,
    italics: true,
    color: C.muted,
    margin: [0, 12, 0, 0],
  });

  return {
    pageSize: "A4",
    pageMargins: [36, 36, 36, 52],
    defaultStyle: { font: "Roboto", fontSize: 8, lineHeight: 1.2 },
    footer: (currentPage, pageCount) => ({
      margin: [36, 0, 36, 16],
      stack: [
        { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: C.disclaimerBorder }] },
        { text: KOSZTORYS_DISCLAIMER_SHORT, fontSize: 5.5, color: C.muted, margin: [0, 4, 0, 1] },
        { text: KOSZTORYS_DTT_CREDIT, fontSize: 5.5, italics: true, color: C.muted, margin: [0, 0, 0, 1] },
        {
          text: `Strona ${currentPage} / ${pageCount} · W&G DOM · ${sourceFilename}`,
          fontSize: 5,
          color: C.muted,
          alignment: "right",
        },
      ],
    }),
    content,
  };
}

export function kosztorysPdfFilename(sourceFilename: string): string {
  const base = sourceFilename.replace(/\.(ath|nor|xml)$/i, "");
  return `${base}-podglad.pdf`.replace(/[^\w.\-ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+/gi, "-");
}

export async function buildKosztorysPreviewPdfBlob(
  data: AthPreviewResult,
  sourceFilename: string,
): Promise<Blob> {
  const pdfMake = await loadPdfMake();
  const logoDataUrl = await getCompanyLogoDataUrl();
  const docDef = buildKosztorysDocDef(data, sourceFilename, logoDataUrl);
  return pdfMake.createPdf(docDef).getBlob();
}

/** Otwiera PDF w nowej karcie / iframe (zwraca blob URL — caller powinien revoke). */
export async function previewKosztorysPdf(
  data: AthPreviewResult,
  sourceFilename: string,
): Promise<string> {
  const blob = await buildKosztorysPreviewPdfBlob(data, sourceFilename);
  const url = await deliverPdfBlob(blob, kosztorysPdfFilename(sourceFilename), true);
  return url as string;
}

export async function downloadKosztorysPdf(
  data: AthPreviewResult,
  sourceFilename: string,
): Promise<void> {
  const blob = await buildKosztorysPreviewPdfBlob(data, sourceFilename);
  await deliverPdfBlob(blob, kosztorysPdfFilename(sourceFilename), false);
}
