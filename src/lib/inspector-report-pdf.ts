import {
  MONTH_NAMES_PL,
  statsForMonth,
  statsForYear,
  monthlyBreakdownForYear,
  type InspectorActivityJob,
  type InspectorActivityStats,
} from "@/lib/inspector-activity-stats";

async function loadPdfMake() {
  const pdfMake = (await import("pdfmake/build/pdfmake")).default;
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  pdfMake.vfs = (pdfFontsModule.default ?? pdfFontsModule) as typeof pdfMake.vfs;
  return pdfMake;
}

type PdfDocDef = Parameters<Awaited<ReturnType<typeof loadPdfMake>>["createPdf"]>[0];

function isMobileSafari(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** iOS Safari często blokuje `.download()` — share sheet lub nowa karta. */
export async function deliverPdfBlob(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: filename });
    return;
  }
  const url = URL.createObjectURL(blob);
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
    if (!isMobileSafari()) URL.revokeObjectURL(url);
  }
}

async function savePdf(docDef: PdfDocDef, filename: string): Promise<void> {
  const pdfMake = await loadPdfMake();
  const blob = await pdfMake.createPdf(docDef).getBlob();
  await deliverPdfBlob(blob, filename);
}

const C = {
  navy: "#344254",
  red: "#C0392B",
  light: "#EDF1F6",
  white: "#FFFFFF",
  muted: "#8A9BB0",
  green: "#1E7E34",
};

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 16);
  }
}

function statCards(stats: InspectorActivityStats) {
  const items = [
    { label: "Roboty", value: String(stats.jobsTouched) },
    { label: "Dokumenty", value: String(stats.documentsMarked) },
    { label: "Pliki", value: String(stats.filesUploaded) },
    { label: "Zdjęcia", value: String(stats.photosUploaded) },
    { label: "Notatki", value: String(stats.notesSent) },
    { label: "Etapy WM", value: String(stats.stageUpdates) },
  ];
  return {
    columns: items.map((it) => ({
      stack: [
        { canvas: [{ type: "rect", x: 0, y: 0, w: 78, h: 48, color: "#1A2332", r: 4 }] },
        { text: it.label.toUpperCase(), fontSize: 6, bold: true, color: C.muted, absolutePosition: { x: 8, y: 6 } },
        { text: it.value, fontSize: 14, bold: true, color: C.white, absolutePosition: { x: 8, y: 20 } },
      ],
      width: 82,
    })),
    margin: [0, 0, 0, 12] as [number, number, number, number],
  };
}

function eventsTable(events: InspectorActivityStats["events"], maxRows = 40) {
  const rows = events.slice(0, maxRows).map((ev, i) => [
    { text: fmtDateTime(ev.at), fontSize: 7, fillColor: i % 2 === 0 ? C.white : C.light },
    { text: ev.jobAddress, fontSize: 7, fillColor: i % 2 === 0 ? C.white : C.light },
    { text: ev.text, fontSize: 7, fillColor: i % 2 === 0 ? C.white : C.light },
  ]);
  return {
    table: {
      headerRows: 1,
      widths: [90, "*", "*"],
      body: [
        [
          { text: "Data", bold: true, fillColor: C.navy, color: C.white, fontSize: 7 },
          { text: "Adres", bold: true, fillColor: C.navy, color: C.white, fontSize: 7 },
          { text: "Działanie", bold: true, fillColor: C.navy, color: C.white, fontSize: 7 },
        ],
        ...rows,
      ],
    },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 8] as [number, number, number, number],
  };
}

function reportHeader(title: string, subtitle: string, inspectorName: string): PdfDocDef["content"] {
  return [
    { canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 52, color: C.navy }] },
    { text: "W&G DOM", fontSize: 20, bold: true, color: C.white, absolutePosition: { x: 40, y: 16 } },
    { text: title, fontSize: 11, color: C.red, absolutePosition: { x: 40, y: 40 } },
    { text: inspectorName, fontSize: 9, color: C.white, absolutePosition: { x: 320, y: 22 } },
    { text: subtitle, fontSize: 8, color: C.muted, absolutePosition: { x: 320, y: 38 } },
    { text: " ", margin: [0, 18, 0, 0] },
  ];
}

export async function downloadInspectorMonthReportPdf(
  jobs: InspectorActivityJob[],
  displayName: string,
  year: number,
  month: number,
): Promise<void> {
  const stats = statsForMonth(jobs, displayName, year, month);
  const label = `${MONTH_NAMES_PL[month]} ${year}`;
  const filename = `inspektor-${displayName.replace(/\s+/g, "-").toLowerCase()}-${year}-${String(month + 1).padStart(2, "0")}.pdf`;

  const dd: PdfDocDef = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: "Roboto", fontSize: 9, lineHeight: 1.25 },
    content: [
      ...reportHeader("Raport inspektora — miesiąc", label, displayName),
      statCards(stats),
      { text: "Ostatnie działania", fontSize: 10, bold: true, color: C.navy, margin: [0, 4, 0, 6] },
      eventsTable(stats.events, 35),
      stats.events.length > 35
        ? { text: `… i ${stats.events.length - 35} wcześniejszych wpisów w tym miesiącu`, fontSize: 7, color: C.muted, italics: true }
        : { text: "" },
      { text: `Wygenerowano: ${new Date().toLocaleString("pl-PL")}`, fontSize: 7, color: C.muted, margin: [0, 12, 0, 0] },
    ],
  };

  await savePdf(dd, filename);
}

export async function downloadInspectorYearReportPdf(
  jobs: InspectorActivityJob[],
  displayName: string,
  year: number,
): Promise<void> {
  const yearly = statsForYear(jobs, displayName, year);
  const months = monthlyBreakdownForYear(jobs, displayName, year);
  const filename = `inspektor-${displayName.replace(/\s+/g, "-").toLowerCase()}-roczny-${year}.pdf`;

  const monthRows = months.map((m, i) => {
    const s = m.stats;
    const total = s.documentsMarked + s.filesUploaded + s.photosUploaded + s.notesSent + s.stageUpdates;
    return [
      { text: m.label, fontSize: 8, fillColor: i % 2 === 0 ? C.white : C.light },
      { text: s.jobsTouched > 0 ? String(s.jobsTouched) : "—", fontSize: 8, alignment: "center" as const, fillColor: i % 2 === 0 ? C.white : C.light },
      { text: s.documentsMarked > 0 ? String(s.documentsMarked) : "—", fontSize: 8, alignment: "center" as const, fillColor: i % 2 === 0 ? C.white : C.light },
      { text: s.photosUploaded > 0 ? String(s.photosUploaded) : "—", fontSize: 8, alignment: "center" as const, fillColor: i % 2 === 0 ? C.white : C.light },
      { text: total > 0 ? String(total) : "—", fontSize: 8, bold: total > 0, alignment: "center" as const, fillColor: i % 2 === 0 ? C.white : C.light },
    ];
  });

  const dd: PdfDocDef = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: "Roboto", fontSize: 9 },
    content: [
      ...reportHeader("Raport inspektora — rok", String(year), displayName),
      statCards(yearly),
      { text: "Podział miesięczny", fontSize: 10, bold: true, color: C.navy, margin: [0, 8, 0, 6] },
      {
        table: {
          headerRows: 1,
          widths: ["*", 55, 70, 60, 55],
          body: [
            [
              { text: "Miesiąc", bold: true, fillColor: C.navy, color: C.white, fontSize: 8 },
              { text: "Roboty", bold: true, fillColor: C.navy, color: C.white, fontSize: 8, alignment: "center" as const },
              { text: "Dokumenty", bold: true, fillColor: C.navy, color: C.white, fontSize: 8, alignment: "center" as const },
              { text: "Zdjęcia", bold: true, fillColor: C.navy, color: C.white, fontSize: 8, alignment: "center" as const },
              { text: "Razem dz.", bold: true, fillColor: C.navy, color: C.white, fontSize: 8, alignment: "center" as const },
            ],
            ...monthRows,
          ],
        },
        layout: "lightHorizontalLines",
      },
      { text: `Wygenerowano: ${new Date().toLocaleString("pl-PL")}`, fontSize: 7, color: C.muted, margin: [0, 12, 0, 0] },
    ],
  };

  await savePdf(dd, filename);
}
