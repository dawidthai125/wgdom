/**
 * P2-F.5 — generator DOCX wykazu robót budowlanych (edycja przed wysłaniem oferty).
 */

import {
  buildWorksRegisterTableRows,
  type WorksRegister,
} from "@/lib/tender-works-register";

export async function downloadWorksRegisterDocx(
  register: WorksRegister,
  opts?: { companyName?: string; filename?: string },
): Promise<void> {
  const {
    Document,
    Packer,
    Paragraph,
    Table,
    TableRow,
    TableCell,
    TextRun,
    WidthType,
    AlignmentType,
    BorderStyle,
  } = await import("docx");

  const companyName = opts?.companyName ?? "W&G DOM";
  const rows = buildWorksRegisterTableRows(register);
  const bThin = { style: BorderStyle.SINGLE, size: 1, color: "DDE3EA" };

  const mkCell = (txt: string, bold = false) =>
    new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ text: txt, bold, size: 18, font: "Calibri" })],
        }),
      ],
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      borders: { top: bThin, bottom: bThin, left: bThin, right: bThin },
    });

  const header = ["Lp.", "Nazwa realizacji", "Zakres robót", "Wartość", "Data wykonania", "Referencja", "Uwagi"];
  const tableRows = [
    new TableRow({
      children: header.map((h) => mkCell(h, true)),
    }),
    ...rows.map((row) =>
      new TableRow({ children: row.map((cell) => mkCell(cell)) }),
    ),
  ];

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri" } } } },
    sections: [{
      properties: {
        page: { margin: { top: 900, bottom: 900, left: 900, right: 900 } },
      },
      children: [
        new Paragraph({
          children: [new TextRun({ text: "WYKAZ ROBÓT BUDOWLANYCH", bold: true, size: 32 })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: companyName, size: 22, color: "6B7A8D" })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Wygenerowano: ${new Date(register.generatedAt).toLocaleString("pl-PL")}`,
              size: 18,
              color: "8A9BB0",
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ text: "" }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        }),
        new Paragraph({ text: "" }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Dokument wygenerowany w WGDOM — można edytować przed złożeniem oferty.",
              size: 16,
              color: "8A9BB0",
              italics: true,
            }),
          ],
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const filename = opts?.filename
    ?? `wykaz-robot-${register.tenderId.replace(/[^\w.-]+/g, "-")}.docx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Test helper — liczba wierszy danych (bez nagłówka). */
export function worksRegisterDocxRowCount(register: WorksRegister): number {
  return register.entries.length;
}
