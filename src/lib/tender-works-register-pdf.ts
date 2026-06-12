/**
 * P2-F.5 — generator PDF wykazu robót budowlanych (pdfmake, A4).
 */

import { loadPdfMake, type PdfDocDef } from "@/lib/pdfmake-loader";
import {
  buildWorksRegisterTableRows,
  type WorksRegister,
} from "@/lib/tender-works-register";

const C = {
  navy: "#344254",
  red: "#C0392B",
  light: "#EDF1F6",
  muted: "#8A9BB0",
};

export function buildWorksRegisterPdfDocDef(
  register: WorksRegister,
  companyName = "W&G DOM",
): PdfDocDef {
  const dataRows = buildWorksRegisterTableRows(register);
  const tableBody = [
    [
      { text: "Lp.", style: "th" },
      { text: "Nazwa realizacji", style: "th" },
      { text: "Zakres robót", style: "th" },
      { text: "Wartość", style: "th" },
      { text: "Data wykonania", style: "th" },
      { text: "Referencja", style: "th" },
      { text: "Uwagi", style: "th" },
    ],
    ...dataRows.map((row) => row.map((cell) => ({ text: cell, fontSize: 8 }))),
  ];

  return {
    pageSize: "A4",
    pageMargins: [36, 48, 36, 40],
    content: [
      { text: "WYKAZ ROBÓT BUDOWLANYCH", style: "header", alignment: "center" },
      { text: companyName, style: "sub", alignment: "center", margin: [0, 4, 0, 2] },
      {
        text: `Wygenerowano: ${new Date(register.generatedAt).toLocaleString("pl-PL")}`,
        style: "sub",
        alignment: "center",
        margin: [0, 0, 0, 16],
      },
      { canvas: [{ type: "rect", x: 0, y: 0, w: 523, h: 2, color: C.red }] },
      {
        table: {
          headerRows: 1,
          widths: [18, "*", "18%", 52, 48, 42, "*"],
          body: tableBody,
        },
        layout: "lightHorizontalLines",
        margin: [0, 12, 0, 12],
      },
      {
        text: "Dokument wygenerowany w systemie WGDOM na podstawie profilu wykonawcy. "
          + "Przed złożeniem oferty zweryfikuj dane i uzupełnij brakujące referencje.",
        fontSize: 7,
        color: C.muted,
        margin: [0, 8, 0, 0],
      },
    ],
    styles: {
      header: { fontSize: 14, bold: true, color: C.navy },
      sub: { fontSize: 9, color: C.muted },
      th: { fontSize: 7, bold: true, fillColor: C.light, color: C.navy },
    },
    defaultStyle: { font: "Roboto", color: C.navy },
  };
}

export async function downloadWorksRegisterPdf(
  register: WorksRegister,
  opts?: { companyName?: string; filename?: string },
): Promise<void> {
  const doc = buildWorksRegisterPdfDocDef(register, opts?.companyName);
  const filename = opts?.filename
    ?? `wykaz-robot-${register.tenderId.replace(/[^\w.-]+/g, "-")}.pdf`;
  const pdfMake = await loadPdfMake();
  pdfMake.createPdf(doc).download(filename);
}
