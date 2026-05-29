import type { AthPreviewResult } from "@/lib/ath-parser";

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
};

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

function buildKosztorysDocDef(data: AthPreviewResult, sourceFilename: string): PdfDocDef {
  const cur = data.currency || "PLN";
  const content: PdfDocDef["content"] = [
    { canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 48, color: C.navy }] },
    { text: "W&G DOM", fontSize: 16, bold: true, color: C.white, absolutePosition: { x: 40, y: 14 } },
    {
      text: data.documentType || "KOSZTORYS OFERTOWY",
      fontSize: 9,
      color: C.red,
      absolutePosition: { x: 40, y: 34 },
    },
    {
      text: sourceFilename,
      fontSize: 7,
      color: C.muted,
      alignment: "right",
      absolutePosition: { x: 280, y: 20 },
    },
    { text: " ", margin: [0, 16, 0, 0] },
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
    text: `Wygenerowano z pliku ATH w WG DOM · ${new Date().toLocaleString("pl-PL")} · ${data.rows.length} pozycji${data.totalValue ? ` · brutto ${data.totalValue} ${cur}` : ""}`,
    fontSize: 6,
    color: C.muted,
    margin: [0, 12, 0, 0],
  });

  return {
    pageSize: "A4",
    pageMargins: [36, 36, 36, 36],
    defaultStyle: { font: "Roboto", fontSize: 8, lineHeight: 1.2 },
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
  const docDef = buildKosztorysDocDef(data, sourceFilename);
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
