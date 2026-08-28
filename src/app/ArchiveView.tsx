import { useMemo, useState } from "react";
import {
  Archive, TrendingUp, Clock, Calendar, Wallet, Users, FileDown, Trash2, X,
  ChevronUp, ChevronDown, CalendarDays, Edit2, CheckCircle2, Circle,
} from "lucide-react";
import { useAdminAccess } from "@/app/admin-access";
import { StatCard } from "@/app/app-ui";
import { ArchiveScheduleGrid } from "@/app/ArchiveScheduleGrid";
import { WeekEmployeeDetail } from "@/app/WeekEmployeeDetail";
import { loadPdfMake, type PdfDocDef } from "@/lib/pdfmake-loader";
import { isBiweeklyPayrollEmployee, calcBiweeklyRowDisplay } from "@/lib/payroll-cycle";
import type { DirectoryEmployee, WeekSnapshot, WeekEmployee, Job, DayKey, DayData } from "@/app/app-domain";
import {
  MONTH_NAMES,
  fmt,
  fmtH,
  fmtDate,
  calcWeekEmployee,
  jobCost,
  jobMaterialsCost,
  jobTotalCost,
} from "@/app/app-domain";

function archiveEmployeePayrollDisplay(
  full: WeekEmployee | undefined,
  emp: WeekSnapshot["employees"][number],
  directory: DirectoryEmployee[],
  week: WeekSnapshot,
  savedWeeks: WeekSnapshot[],
): {
  c: ReturnType<typeof calcWeekEmployee>;
  displayNetPay: number;
  biweeklyHint: string | null;
} {
  const fallback = {
    weekHours: emp.weekHours ?? emp.totalHours,
    prevSatHours: emp.prevSatHours ?? 0,
    totalHours: emp.totalHours,
    grossPay: emp.grossPay,
    totalZaliczka: emp.totalZaliczka,
    totalExtraCosts: emp.totalExtraCosts ?? 0,
    netPay: emp.netPay,
    rateNum: emp.rate,
  } as ReturnType<typeof calcWeekEmployee>;

  if (!full) {
    return { c: fallback, displayNetPay: emp.netPay, biweeklyHint: null };
  }

  const base = calcWeekEmployee(full);
  const biweekly = isBiweeklyPayrollEmployee(full, directory);
  const bw = biweekly ? calcBiweeklyRowDisplay(full, directory, week.weekFrom, week.weekTo, savedWeeks) : null;
  let displayNetPay = bw
    ? (bw.isPayoutWeek ? bw.displayNet : bw.thisWeekNet)
    : base.netPay;
  if (emp.carryForwardOut != null && emp.carryForwardOut > 0) {
    displayNetPay = 0;
  } else if (emp.carryForwardIn != null && emp.carryForwardIn > 0) {
    displayNetPay = emp.netPay;
  } else if (emp.leaveStatus) {
    displayNetPay = 0;
  }
  const c = biweekly
    ? {
        ...base,
        prevSatHours: 0,
        totalHours: base.weekHours,
        grossPay: base.weekGross,
        totalZaliczka: base.weekZaliczka,
      }
    : base;
  const biweeklyHint =
    bw?.isPayoutWeek && bw.prevWeekFrom
      ? `co 2 tyg. + ${fmtDate(bw.prevWeekFrom)}–${fmtDate(bw.prevWeekTo)}`
      : biweekly
        ? "co 2 tyg."
        : null;

  return { c, displayNetPay, biweeklyHint };
}

export function ArchiveView({
  savedWeeks,
  onDelete,
  onUpdateWeekEmployeeExtraCosts,
  onUpdateWeekEmployeeManualAdjustment,
  onUpdateWeekEmployeeDay,
  onUpdateWeekEmployeeRate,
  onUpdateWeekEmployeePrevSaturday,
  onUpdateWeekEmployeePayrollCarryForward,
  onToggleArchiveSettled,
  jobs,
  directory,
}: {
  savedWeeks: WeekSnapshot[];
  onDelete: (id: string) => void;
  onUpdateWeekEmployeeExtraCosts: (weekId: string, empId: string, nextExtraCosts: WeekEmployee["extraCosts"]) => void;
  onUpdateWeekEmployeeManualAdjustment: (weekId: string, empId: string, next: WeekEmployee["payrollManualAdjustment"]) => void;
  onUpdateWeekEmployeeDay: (weekId: string, empId: string, key: DayKey, next: DayData) => void;
  onUpdateWeekEmployeeRate: (weekId: string, empId: string, rate: string) => void;
  onUpdateWeekEmployeePrevSaturday: (weekId: string, empId: string, next: DayData) => void;
  onUpdateWeekEmployeePayrollCarryForward: (weekId: string, empId: string, carry: WeekEmployee["payrollCarryForward"]) => void;
  onToggleArchiveSettled: (weekId: string, empId: string) => void;
  jobs: Job[];
  directory: DirectoryEmployee[];
}) {
  const { canViewRates } = useAdminAccess();
  const [selectedYear, setSelectedYear] = useState<number|null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number|null>(null);
  const [expandedWeek, setExpandedWeek] = useState<string|null>(null);
  const [expandedTab, setExpandedTab] = useState<"payroll"|"schedule">("payroll");
  const [deleteConfirm, setDeleteConfirm] = useState<string|null>(null);
  const [editContext, setEditContext] = useState<{ weekId: string; empId: string } | null>(null);

  const years = useMemo(()=>Array.from(new Set(savedWeeks.map((w)=>new Date(w.weekFrom).getFullYear()))).sort((a,b)=>b-a),[savedWeeks]);
  const activeYear = selectedYear??years[0]??new Date().getFullYear();
  const months = useMemo(()=>Array.from(new Set(savedWeeks.filter((w)=>new Date(w.weekFrom).getFullYear()===activeYear).map((w)=>new Date(w.weekFrom).getMonth()))).sort((a,b)=>b-a),[savedWeeks,activeYear]);
  const activeMonth = selectedMonth!==null?selectedMonth:(months[0]??new Date().getMonth());

  const filteredWeeks = useMemo(()=>savedWeeks.filter((w)=>{const d=new Date(w.weekFrom);return d.getFullYear()===activeYear&&d.getMonth()===activeMonth;}).sort((a,b)=>b.weekFrom.localeCompare(a.weekFrom)),[savedWeeks,activeYear,activeMonth]);

  const yearlyWeeks = savedWeeks.filter((w)=>new Date(w.weekFrom).getFullYear()===activeYear);
  const yearlyNet = yearlyWeeks.reduce((s,w)=>s+w.totalNet,0);
  const yearlyHours = yearlyWeeks.reduce((s,w)=>s+w.totalHours,0);

  const monthlyNet = filteredWeeks.reduce((s,w)=>s+w.totalNet,0);
  const monthlyHours = filteredWeeks.reduce((s,w)=>s+w.totalHours,0);
  const monthlyGross = filteredWeeks.reduce((s,w)=>s+w.totalGross,0);
  const monthlyZaliczka = filteredWeeks.reduce((s,w)=>s+w.totalZaliczka,0);

  // Jobs that started in this month
  const monthJobs = jobs.filter(j=>{
    const d = new Date(j.startDate);
    return d.getFullYear()===activeYear && d.getMonth()===activeMonth;
  });
  const monthJobsCost = monthJobs.reduce((s,j)=>s+jobCost(j),0);
  const monthMatCost = monthJobs.reduce((s,j)=>s+jobMaterialsCost(j),0);
  const monthInvoiced = monthJobs.reduce((s,j)=>s+(parseFloat(j.invoiceAmount)||0),0);

  const exportMonthlyReport = async () => {
    const pdfMake = await loadPdfMake();
    const C = { navy:"#344254", red:"#C0392B", light:"#EDF1F6", white:"#FFFFFF", muted:"#8A9BB0", green:"#1E7E34" };
    const monthLabel = `${MONTH_NAMES[activeMonth]} ${activeYear}`;
    const filename = `raport-${activeYear}-${String(activeMonth+1).padStart(2,"0")}.pdf`;

    // Build jobs table rows
    const jobRows = monthJobs.map(j=>[
      {text:(j.address||"—")+(j.flatNumber?` m.${j.flatNumber}`:""), fontSize:8},
      {text:j.client||"—", fontSize:8, color:C.muted},
      {text:j.status==="completed"?"Zdane":"W trakcie", fontSize:8, color:j.status==="completed"?C.green:C.red},
      {text:jobCost(j)>0?`${fmt(jobCost(j))} PLN`:"—", fontSize:8, alignment:"right"},
      {text:jobMaterialsCost(j)>0?`${fmt(jobMaterialsCost(j))} PLN`:"—", fontSize:8, alignment:"right", color:C.muted},
      {text:jobTotalCost(j)>0?`${fmt(jobTotalCost(j))} PLN`:"—", fontSize:8, bold:true, alignment:"right", color:C.red},
      {text:parseFloat(j.invoiceAmount||"0")>0?`${fmt(parseFloat(j.invoiceAmount))} PLN`:"—", fontSize:8, alignment:"right"},
    ]);

    // Build payroll sections for each week
    const payrollSections: unknown[] = [];
    filteredWeeks.forEach((w, wi) => {
      payrollSections.push(
        {text:`Tydzień ${wi+1}: ${fmtDate(w.weekFrom)} – ${fmtDate(w.weekTo)}`, fontSize:9, bold:true, color:C.navy, margin:[0, wi===0?0:10, 0, 4]},
        {
          table:{
            headerRows:1,
            widths:["*","auto","auto","auto","auto","auto"],
            body:[
              [
                {text:"Pracownik", bold:true, fillColor:C.navy, color:C.white, fontSize:7},
                {text:"Stanowisko", bold:true, fillColor:C.navy, color:C.white, fontSize:7},
                {text:"Godz.", bold:true, fillColor:C.navy, color:C.white, fontSize:7, alignment:"right"},
                {text:"Brutto", bold:true, fillColor:C.navy, color:C.white, fontSize:7, alignment:"right"},
                {text:"Zaliczki", bold:true, fillColor:C.navy, color:C.white, fontSize:7, alignment:"right"},
                {text:"Do wypłaty", bold:true, fillColor:C.navy, color:C.white, fontSize:7, alignment:"right"},
              ],
              ...w.employees.map((e,i)=>[
                {text:e.name||"—", fontSize:7, fillColor:i%2===0?C.white:C.light},
                {text:e.position||"—", fontSize:7, color:C.muted, fillColor:i%2===0?C.white:C.light},
                {text:fmtH(e.totalHours), fontSize:7, alignment:"right", fillColor:i%2===0?C.white:C.light},
                {text:`${fmt(e.grossPay)} PLN`, fontSize:7, alignment:"right", color:C.muted, fillColor:i%2===0?C.white:C.light},
                {text:e.totalZaliczka>0?`${fmt(e.totalZaliczka)} PLN`:"—", fontSize:7, alignment:"right", color:e.totalZaliczka>0?C.red:C.muted, fillColor:i%2===0?C.white:C.light},
                {text:`${fmt(e.netPay)} PLN`, fontSize:7, bold:true, alignment:"right", color:C.red, fillColor:i%2===0?C.white:C.light},
              ]),
              [
                {text:"SUMA", bold:true, fillColor:C.light, fontSize:8},
                {text:`${w.totalEmployees} prac.`, fontSize:7, fillColor:C.light, color:C.muted},
                {text:fmtH(w.totalHours), bold:true, fontSize:8, alignment:"right", fillColor:C.light},
                {text:`${fmt(w.totalGross)} PLN`, bold:true, fontSize:8, alignment:"right", color:C.muted, fillColor:C.light},
                {text:w.totalZaliczka>0?`${fmt(w.totalZaliczka)} PLN`:"—", bold:true, fontSize:8, alignment:"right", color:C.red, fillColor:C.light},
                {text:`${fmt(w.totalNet)} PLN`, bold:true, fontSize:8, alignment:"right", color:C.red, fillColor:C.light},
              ],
            ],
          },
          layout:{hLineColor:()=>"#E5E7EB", vLineColor:()=>"#E5E7EB"},
        }
      );
    });

    const dd: PdfDocDef = {
      pageSize:"A4", pageOrientation:"landscape",
      pageMargins:[40,60,40,60],
      defaultStyle:{font:"Roboto", fontSize:10, lineHeight:1.3},
      content:[
        // Header bar
        {canvas:[{type:"rect",x:0,y:0,w:762,h:55,color:C.navy}]},
        {text:"W&G DOM", fontSize:26, bold:true, color:C.white, absolutePosition:{x:40,y:18}},
        {text:"Raport Miesięczny", fontSize:12, color:C.red, absolutePosition:{x:40,y:46}},
        {text:monthLabel, fontSize:20, bold:true, color:C.white, absolutePosition:{x:500,y:22}},
        {text:`Wygenerowano: ${new Date().toLocaleDateString("pl-PL")}`, fontSize:8, color:C.muted, absolutePosition:{x:500,y:50}},
        {text:" ", fontSize:6, margin:[0,20,0,0]},

        // Summary boxes
        {
          columns:[
            {stack:[
              {canvas:[{type:"rect",x:0,y:0,w:170,h:55,color:"#1A2332",r:6}]},
              {text:"WYPŁATY NETTO", fontSize:7, bold:true, color:C.muted, absolutePosition:{x:10,y:8}},
              {text:`${fmt(monthlyNet)} PLN`, fontSize:16, bold:true, color:C.red, absolutePosition:{x:10,y:22}},
              {text:`${fmtH(monthlyHours)} · ${filteredWeeks.length} tyg.`, fontSize:7, color:C.muted, absolutePosition:{x:10,y:46}},
            ], width:180, margin:[0,0,0,0]},
            {stack:[
              {canvas:[{type:"rect",x:0,y:0,w:170,h:55,color:"#1A2332",r:6}]},
              {text:"KOSZT ROBÓT", fontSize:7, bold:true, color:C.muted, absolutePosition:{x:10,y:8}},
              {text:`${fmt(monthJobsCost)} PLN`, fontSize:16, bold:true, color:C.white, absolutePosition:{x:10,y:22}},
              {text:`${monthJobs.filter(j=>j.status==="in_progress").length} w trakcie · ${monthJobs.filter(j=>j.status==="completed").length} zdanych`, fontSize:7, color:C.muted, absolutePosition:{x:10,y:46}},
            ], width:180, margin:[0,0,0,0]},
            {stack:[
              {canvas:[{type:"rect",x:0,y:0,w:170,h:55,color:"#1A2332",r:6}]},
              {text:"MATERIAŁY", fontSize:7, bold:true, color:C.muted, absolutePosition:{x:10,y:8}},
              {text:`${fmt(monthMatCost)} PLN`, fontSize:16, bold:true, color:C.white, absolutePosition:{x:10,y:22}},
              {text:`${monthJobs.length} robót`, fontSize:7, color:C.muted, absolutePosition:{x:10,y:46}},
            ], width:180, margin:[0,0,0,0]},
            {stack:[
              {canvas:[{type:"rect",x:0,y:0,w:170,h:55,color:"#1A2332",r:6}]},
              {text:"FAKTUROWANIE", fontSize:7, bold:true, color:C.muted, absolutePosition:{x:10,y:8}},
              {text:`${fmt(monthInvoiced)} PLN`, fontSize:16, bold:true, color:monthInvoiced>0?C.green:C.muted, absolutePosition:{x:10,y:22}},
              {text:`zysk: ${fmt(monthInvoiced-monthJobsCost-monthMatCost)} PLN`, fontSize:7, color:C.muted, absolutePosition:{x:10,y:46}},
            ], width:180, margin:[0,0,0,0]},
          ],
          columnGap:10,
          margin:[0,10,0,20],
        },

        // Jobs section
        ...(monthJobs.length>0 ? [
          {text:"ROBOTY W MIESIĄCU", fontSize:9, bold:true, color:C.muted, margin:[0,0,0,6]},
          {
            table:{
              headerRows:1,
              widths:["*","*","auto","auto","auto","auto","auto"],
              body:[
                [
                  {text:"Adres", bold:true, fillColor:C.navy, color:C.white, fontSize:8},
                  {text:"Klient", bold:true, fillColor:C.navy, color:C.white, fontSize:8},
                  {text:"Status", bold:true, fillColor:C.navy, color:C.white, fontSize:8},
                  {text:"Koszt prac", bold:true, fillColor:C.navy, color:C.white, fontSize:8, alignment:"right"},
                  {text:"Materiały", bold:true, fillColor:C.navy, color:C.white, fontSize:8, alignment:"right"},
                  {text:"Łącznie", bold:true, fillColor:C.navy, color:C.white, fontSize:8, alignment:"right"},
                  {text:"Faktura", bold:true, fillColor:C.navy, color:C.white, fontSize:8, alignment:"right"},
                ],
                ...jobRows,
                [
                  {text:"SUMA", bold:true, fillColor:C.light, colSpan:3, fontSize:9}, {}, {},
                  {text:`${fmt(monthJobsCost)} PLN`, bold:true, fillColor:C.light, alignment:"right", fontSize:9, color:C.muted},
                  {text:`${fmt(monthMatCost)} PLN`, bold:true, fillColor:C.light, alignment:"right", fontSize:9, color:C.muted},
                  {text:`${fmt(monthJobsCost+monthMatCost)} PLN`, bold:true, fillColor:C.light, alignment:"right", fontSize:9, color:C.red},
                  {text:monthInvoiced>0?`${fmt(monthInvoiced)} PLN`:"—", bold:true, fillColor:C.light, alignment:"right", fontSize:9},
                ],
              ],
            },
            layout:{hLineColor:()=>"#E5E7EB", vLineColor:()=>"#E5E7EB"},
            margin:[0,0,0,20],
          },
        ] as unknown[] : []),

        // Payroll section
        ...(filteredWeeks.length>0 ? [
          {text:"LISTA PŁAC — TYGODNIE", fontSize:9, bold:true, color:C.muted, margin:[0,0,0,8]},
          ...payrollSections,
          // Monthly payroll total
          {
            canvas:[{type:"rect",x:0,y:0,w:762,h:42,color:C.navy}],
            margin:[0,14,0,0],
          },
          {
            columns:[
              {text:"PODSUMOWANIE WYPŁAT — "+monthLabel, fontSize:10, bold:true, color:C.white},
              {stack:[
                {columns:[
                  {text:"Brutto:", fontSize:9, color:C.muted, width:"auto"},
                  {text:`${fmt(monthlyGross)} PLN`, fontSize:9, color:C.white, width:"auto", margin:[6,0,0,0]},
                  {text:"Zaliczki:", fontSize:9, color:C.muted, width:"auto", margin:[12,0,0,0]},
                  {text:`${fmt(monthlyZaliczka)} PLN`, fontSize:9, color:monthlyZaliczka>0?C.red:C.muted, width:"auto", margin:[6,0,0,0]},
                  {text:"DO WYPŁATY:", fontSize:10, bold:true, color:C.white, width:"auto", margin:[14,0,0,0]},
                  {text:`${fmt(monthlyNet)} PLN`, fontSize:14, bold:true, color:C.red, width:"auto", margin:[6,-2,0,0]},
                ]},
              ], alignment:"right"},
            ],
            absolutePosition:{x:40, y:-42+12},
          },
          {text:" ", fontSize:6, margin:[0,26,0,0]},
        ] as unknown[] : []),
      ],
    };
    pdfMake.createPdf(dd).download(filename);
  };

  const exportYearlyReport = async () => {
    const pdfMake = await loadPdfMake();
    const C = { navy:"#344254", red:"#C0392B", light:"#EDF1F6", white:"#FFFFFF", muted:"#8A9BB0", green:"#1E7E34" };
    const filename = `raport-roczny-${activeYear}.pdf`;
    const yearlyGross = yearlyWeeks.reduce((s, w) => s + w.totalGross, 0);
    const avgLaborHour = yearlyHours > 0 ? yearlyGross / yearlyHours : 0;

    const monthlyPayouts = Array.from({ length: 12 }, () => 0);
    const monthlyHoursArr = Array.from({ length: 12 }, () => 0);
    const monthlyWeekCounts = Array.from({ length: 12 }, () => 0);
    for (const w of yearlyWeeks) {
      const m = new Date(w.weekFrom).getMonth();
      monthlyPayouts[m] += w.totalNet;
      monthlyHoursArr[m] += w.totalHours;
      monthlyWeekCounts[m] += 1;
    }

    const yearJobsList = jobs.filter((j) => new Date(j.startDate).getFullYear() === activeYear);
    const completedInYear = jobs.filter(
      (j) =>
        j.status === "completed" &&
        (j.endDate ? new Date(j.endDate).getFullYear() === activeYear : new Date(j.startDate).getFullYear() === activeYear),
    );
    const yearLaborCost = yearJobsList.reduce((s, j) => s + jobCost(j), 0);
    const yearMatCost = yearJobsList.reduce((s, j) => s + jobMaterialsCost(j), 0);
    const yearInvoiced = yearJobsList.reduce((s, j) => s + (parseFloat(j.invoiceAmount) || 0), 0);

    const monthRows = MONTH_NAMES.map((name, i) => [
      { text: name, fontSize: 8, fillColor: i % 2 === 0 ? C.white : C.light },
      { text: monthlyWeekCounts[i] > 0 ? String(monthlyWeekCounts[i]) : "—", fontSize: 8, alignment: "center" as const, fillColor: i % 2 === 0 ? C.white : C.light, color: C.muted },
      { text: monthlyHoursArr[i] > 0 ? fmtH(monthlyHoursArr[i]) : "—", fontSize: 8, alignment: "right" as const, fillColor: i % 2 === 0 ? C.white : C.light },
      { text: monthlyPayouts[i] > 0 ? `${fmt(monthlyPayouts[i])} PLN` : "—", fontSize: 8, bold: monthlyPayouts[i] > 0, alignment: "right" as const, color: monthlyPayouts[i] > 0 ? C.red : C.muted, fillColor: i % 2 === 0 ? C.white : C.light },
    ]);

    const cardW = canViewRates ? 180 : 240;
    const summaryCards = [
      { stack: [
        { canvas: [{ type: "rect", x: 0, y: 0, w: 170, h: 55, color: "#1A2332", r: 6 }] },
        { text: "WYPŁATY NETTO", fontSize: 7, bold: true, color: C.muted, absolutePosition: { x: 10, y: 8 } },
        { text: `${fmt(yearlyNet)} PLN`, fontSize: 16, bold: true, color: C.red, absolutePosition: { x: 10, y: 22 } },
        { text: `${fmtH(yearlyHours)} · ${yearlyWeeks.length} tyg.`, fontSize: 7, color: C.muted, absolutePosition: { x: 10, y: 46 } },
      ], width: cardW },
      ...(canViewRates ? [{
        stack: [
          { canvas: [{ type: "rect", x: 0, y: 0, w: 170, h: 55, color: "#1A2332", r: 6 }] },
          { text: "ŚR. KOSZT GODZ.", fontSize: 7, bold: true, color: C.muted, absolutePosition: { x: 10, y: 8 } },
          { text: avgLaborHour > 0 ? `${fmt(avgLaborHour)} PLN/h` : "—", fontSize: 16, bold: true, color: C.white, absolutePosition: { x: 10, y: 22 } },
          { text: `brutto ${fmt(yearlyGross)} PLN`, fontSize: 7, color: C.muted, absolutePosition: { x: 10, y: 46 } },
        ], width: cardW,
      }] : []),
      { stack: [
        { canvas: [{ type: "rect", x: 0, y: 0, w: 170, h: 55, color: "#1A2332", r: 6 }] },
        { text: "ROBOTY ZDANE", fontSize: 7, bold: true, color: C.muted, absolutePosition: { x: 10, y: 8 } },
        { text: String(completedInYear.length), fontSize: 16, bold: true, color: C.green, absolutePosition: { x: 10, y: 22 } },
        { text: `${yearJobsList.length} rozpoczętych w ${activeYear}`, fontSize: 7, color: C.muted, absolutePosition: { x: 10, y: 46 } },
      ], width: cardW },
      { stack: [
        { canvas: [{ type: "rect", x: 0, y: 0, w: 170, h: 55, color: "#1A2332", r: 6 }] },
        { text: "FAKTUROWANIE", fontSize: 7, bold: true, color: C.muted, absolutePosition: { x: 10, y: 8 } },
        { text: `${fmt(yearInvoiced)} PLN`, fontSize: 16, bold: true, color: yearInvoiced > 0 ? C.green : C.muted, absolutePosition: { x: 10, y: 22 } },
        { text: `koszt robót: ${fmt(yearLaborCost + yearMatCost)} PLN`, fontSize: 7, color: C.muted, absolutePosition: { x: 10, y: 46 } },
      ], width: cardW },
    ];

    const dd: PdfDocDef = {
      pageSize: "A4",
      pageOrientation: "landscape",
      pageMargins: [40, 60, 40, 60],
      defaultStyle: { font: "Roboto", fontSize: 10, lineHeight: 1.3 },
      content: [
        { canvas: [{ type: "rect", x: 0, y: 0, w: 762, h: 55, color: C.navy }] },
        { text: "W&G DOM", fontSize: 26, bold: true, color: C.white, absolutePosition: { x: 40, y: 18 } },
        { text: "Raport Roczny", fontSize: 12, color: C.red, absolutePosition: { x: 40, y: 46 } },
        { text: String(activeYear), fontSize: 20, bold: true, color: C.white, absolutePosition: { x: 500, y: 22 } },
        { text: `Wygenerowano: ${new Date().toLocaleDateString("pl-PL")}`, fontSize: 8, color: C.muted, absolutePosition: { x: 500, y: 50 } },
        { text: " ", fontSize: 6, margin: [0, 20, 0, 0] },
        {
          columns: summaryCards,
          margin: [0, 0, 0, 16],
        },
        { text: "Wypłaty i godziny — podział miesięczny", fontSize: 10, bold: true, color: C.navy, margin: [0, 0, 0, 6] },
        {
          table: {
            headerRows: 1,
            widths: ["*", 50, 70, 90],
            body: [
              [
                { text: "Miesiąc", bold: true, fillColor: C.navy, color: C.white, fontSize: 8 },
                { text: "Tyg.", bold: true, fillColor: C.navy, color: C.white, fontSize: 8, alignment: "center" as const },
                { text: "Godziny", bold: true, fillColor: C.navy, color: C.white, fontSize: 8, alignment: "right" as const },
                { text: "Wypłaty netto", bold: true, fillColor: C.navy, color: C.white, fontSize: 8, alignment: "right" as const },
              ],
              ...monthRows,
              [
                { text: "RAZEM", bold: true, fillColor: C.light, fontSize: 8 },
                { text: String(yearlyWeeks.length), bold: true, fillColor: C.light, fontSize: 8, alignment: "center" as const },
                { text: fmtH(yearlyHours), bold: true, fillColor: C.light, fontSize: 8, alignment: "right" as const },
                { text: `${fmt(yearlyNet)} PLN`, bold: true, fillColor: C.light, fontSize: 8, color: C.red, alignment: "right" as const },
              ],
            ],
          },
          layout: { hLineColor: () => "#E5E7EB", vLineColor: () => "#E5E7EB" },
        },
        { text: "Roboty zakończone w roku", fontSize: 10, bold: true, color: C.navy, margin: [0, 14, 0, 6] },
        completedInYear.length === 0
          ? { text: "Brak zdanych robót w tym roku.", fontSize: 8, color: C.muted }
          : {
              table: {
                headerRows: 1,
                widths: ["*", 80, 60, 70, 70],
                body: [
                  [
                    { text: "Adres", bold: true, fillColor: C.navy, color: C.white, fontSize: 7 },
                    { text: "Klient", bold: true, fillColor: C.navy, color: C.white, fontSize: 7 },
                    { text: "Zdane", bold: true, fillColor: C.navy, color: C.white, fontSize: 7, alignment: "center" as const },
                    { text: "Koszt", bold: true, fillColor: C.navy, color: C.white, fontSize: 7, alignment: "right" as const },
                    { text: "FV", bold: true, fillColor: C.navy, color: C.white, fontSize: 7, alignment: "right" as const },
                  ],
                  ...completedInYear.slice(0, 40).map((j, i) => [
                    { text: (j.address || "—") + (j.flatNumber ? ` m.${j.flatNumber}` : ""), fontSize: 7, fillColor: i % 2 === 0 ? C.white : C.light },
                    { text: j.client || "—", fontSize: 7, color: C.muted, fillColor: i % 2 === 0 ? C.white : C.light },
                    { text: j.endDate ? fmtDate(j.endDate) : fmtDate(j.startDate), fontSize: 7, alignment: "center" as const, fillColor: i % 2 === 0 ? C.white : C.light },
                    { text: jobTotalCost(j) > 0 ? `${fmt(jobTotalCost(j))}` : "—", fontSize: 7, alignment: "right" as const, fillColor: i % 2 === 0 ? C.white : C.light },
                    { text: parseFloat(j.invoiceAmount || "0") > 0 ? `${fmt(parseFloat(j.invoiceAmount))}` : "—", fontSize: 7, alignment: "right" as const, fillColor: i % 2 === 0 ? C.white : C.light },
                  ]),
                ],
              },
              layout: { hLineColor: () => "#E5E7EB", vLineColor: () => "#E5E7EB" },
            },
      ],
    };
    pdfMake.createPdf(dd).download(filename);
  };

  if(savedWeeks.length===0) return <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground"><Archive size={48} className="opacity-15"/><p className="text-sm font-medium">Brak zapisanych tygodni</p><p className="text-xs text-center max-w-xs">Przejdź do Listy Płac i kliknij "Zapisz tydzień".</p></div>;

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="flex items-center gap-2 flex-wrap">
          {years.map((y)=><button key={y} onClick={()=>{setSelectedYear(y);setSelectedMonth(null);}} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeYear===y?"bg-primary text-primary-foreground":"bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>{y}</button>)}
          <button onClick={exportYearlyReport} className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary/90 hover:bg-primary text-primary-foreground rounded-xl text-sm font-medium transition-colors shrink-0">
            <FileDown size={14}/>Raport roczny PDF
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Wypłaty rok" value={`${fmt(yearlyNet)} PLN`} sub={`${yearlyWeeks.length} tygodni`} icon={TrendingUp} accent/>
          <StatCard label="Godziny rok" value={fmtH(yearlyHours)} sub={`śr. ${fmtH(yearlyHours/Math.max(yearlyWeeks.length,1))}/tydz.`} icon={Clock}/>
          <StatCard label="Tygodni" value={String(yearlyWeeks.length)} sub="zapisanych" icon={Calendar}/>
          <StatCard label="Miesięcy" value={String(new Set(yearlyWeeks.map(w=>new Date(w.weekFrom).getMonth())).size)} sub={`z ${activeYear}`} icon={Archive}/>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {months.map((m)=><button key={m} onClick={()=>setSelectedMonth(m)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeMonth===m?"bg-secondary text-foreground border border-primary/30":"text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}>{MONTH_NAMES[m]}</button>)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label={`Wypłaty — ${MONTH_NAMES[activeMonth]}`} value={`${fmt(monthlyNet)} PLN`} sub={`${filteredWeeks.length} tygodni`} icon={Wallet} accent/>
          <StatCard label="Godziny w miesiącu" value={fmtH(monthlyHours)} sub={`brutto: ${fmt(monthlyGross)} PLN`} icon={Clock}/>
          <StatCard label="Maks. pracownicy" value={String(Math.max(...filteredWeeks.map(w=>w.totalEmployees),0))} sub="w tygodniu" icon={Users}/>
        </div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground px-1">Tygodnie — {MONTH_NAMES[activeMonth]} {activeYear}</h3>
          <button onClick={exportMonthlyReport} className="flex items-center gap-2 px-4 py-2 bg-destructive/80 hover:bg-destructive text-white rounded-xl text-sm font-medium transition-colors shrink-0">
            <FileDown size={14}/>Raport miesięczny PDF
          </button>
        </div>
        {filteredWeeks.length===0&&<div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">Brak zapisanych tygodni w tym miesiącu.</div>}
        {filteredWeeks.map((week)=>{
          const isOpen=expandedWeek===week.id;
          return <div key={week.id} className="bg-card rounded-xl border border-border overflow-hidden">
            <button onClick={()=>{setExpandedWeek(isOpen?null:week.id);setExpandedTab("payroll");if(isOpen)setEditContext(null);}} className="w-full px-5 py-4 flex items-center gap-4 hover:bg-secondary/20 transition-colors text-left">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-semibold">{fmtDate(week.weekFrom)} – {fmtDate(week.weekTo)}</span>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{week.totalEmployees} prac.</span>
                  {week.weekEmployees && week.weekEmployees.length > 0 && (
                    <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">+ grafik</span>
                  )}
                  {week.backlog && (
                    <span className="text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">zaległość</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-0.5">
                  <span className="text-xs text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(week.totalHours)}</span>
                  <span className="text-xs text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>brutto: {fmt(week.totalGross)} PLN</span>
                  <span className="text-xs font-semibold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>netto: {fmt(week.totalNet)} PLN</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {deleteConfirm===week.id?<div className="flex items-center gap-1" onClick={(e)=>e.stopPropagation()}><button onClick={()=>onDelete(week.id)} className="text-xs bg-destructive text-white px-2 py-1 rounded font-medium">Usuń</button><button onClick={()=>setDeleteConfirm(null)} className="text-xs text-muted-foreground px-1"><X size={12}/></button></div>:<button onClick={(e)=>{e.stopPropagation();setDeleteConfirm(week.id);}} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"><Trash2 size={13}/></button>}
                {isOpen?<ChevronUp size={16} className="text-muted-foreground"/>:<ChevronDown size={16} className="text-muted-foreground"/>}
              </div>
            </button>
            {isOpen&&<div className="border-t border-border">
              <div className="flex border-b border-border px-2 pt-2 gap-1">
                <button onClick={()=>setExpandedTab("payroll")} className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors ${expandedTab==="payroll"?"bg-background text-primary border border-b-0 border-border":"text-muted-foreground hover:text-foreground"}`}>
                  Lista płac
                </button>
                <button onClick={()=>setExpandedTab("schedule")} className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${expandedTab==="schedule"?"bg-background text-primary border border-b-0 border-border":"text-muted-foreground hover:text-foreground"}`}>
                  <CalendarDays size={12}/>Grafik
                </button>
              </div>
              {expandedTab==="payroll" ? (
              <div className={`flex flex-col lg:flex-row min-h-0 ${editContext?.weekId === week.id ? "lg:min-h-[420px]" : ""}`}>
              <div className={`flex-1 min-w-0 overflow-x-auto ${editContext?.weekId === week.id ? "lg:max-w-[50%]" : ""}`}>
              {!week.weekEmployees?.length ? (
                <div className="px-5 py-6 text-sm text-muted-foreground">
                  Brak zapisanych szczegółów godzin — widać tylko podsumowanie. Pełna edycja wymaga tygodnia zapisanego z Listy Płac (od wersji z pełnym archiwum).
                </div>
              ) : (
              <>
              <div className="px-5 py-2.5 border-b border-border bg-secondary/20 flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">Kliknij pracownika, aby edytować godziny, zaliczki i koszty.</p>
                {editContext?.weekId === week.id && (
                  <button type="button" onClick={() => setEditContext(null)} className="text-xs text-primary hover:underline shrink-0">Zamknij edycję</button>
                )}
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-muted-foreground border-b border-border" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                  <th className="px-5 py-2.5 text-left">Pracownik</th><th className="px-3 py-2.5 text-left hidden sm:table-cell">Stanowisko</th>
                  <th className="px-3 py-2.5 text-right">Tydzień</th><th className="px-3 py-2.5 text-right">Sob.pr.</th><th className="px-3 py-2.5 text-right">Razem h</th><th className="px-3 py-2.5 text-right">Brutto</th>
                  <th className="px-3 py-2.5 text-right">Zaliczki</th><th className="px-3 py-2.5 text-right">Koszty</th><th className="px-3 py-2.5 text-right">Wypłata</th>
                  <th className="px-5 py-2.5 text-center">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {week.employees.map((emp,i)=>{
                    const full = week.weekEmployees?.find((we) => we.name === emp.name && we.position === emp.position);
                    const { c, displayNetPay, biweeklyHint } = archiveEmployeePayrollDisplay(
                      full,
                      emp,
                      directory,
                      week,
                      savedWeeks,
                    );
                    const isEditing = editContext?.weekId === week.id && full && editContext.empId === full.id;
                    return (
                    <tr
                      key={i}
                      onClick={() => full && setEditContext({ weekId: week.id, empId: full.id })}
                      className={`transition-colors ${full ? "cursor-pointer hover:bg-secondary/30" : ""} ${emp.settled?"opacity-60":""} ${isEditing ? "bg-primary/5 border-l-2 border-primary" : ""}`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">{emp.name?emp.name[0].toUpperCase():"?"}</div>
                          <div className="min-w-0">
                            <span className="font-medium block">{emp.name||"—"}</span>
                            {biweeklyHint && (
                              <span className="text-[10px] text-sky-400/90 block truncate" title={biweeklyHint}>{biweeklyHint}</span>
                            )}
                          </div>
                          {full && <Edit2 size={11} className="text-muted-foreground/50 shrink-0"/>}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground text-xs hidden sm:table-cell">{emp.position||"—"}</td>
                      <td className="px-3 py-3 text-right text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{c.weekHours>0?fmtH(c.weekHours):"—"}</td>
                      <td className="px-3 py-3 text-right" style={{fontFamily:"'JetBrains Mono', monospace"}}>{c.prevSatHours>0?<span className="text-amber-500">{fmtH(c.prevSatHours)}</span>:"—"}</td>
                      <td className="px-3 py-3 text-right font-medium" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(c.totalHours)}</td>
                      <td className="px-3 py-3 text-right text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{canViewRates ? fmt(c.grossPay) : "—"}</td>
                      <td className="px-3 py-3 text-right" style={{fontFamily:"'JetBrains Mono', monospace"}}>{emp.totalZaliczka>0?<span className="text-destructive">−{fmt(emp.totalZaliczka)}</span>:<span className="text-muted-foreground/40">—</span>}</td>
                      <td className="px-3 py-3 text-right" style={{fontFamily:"'JetBrains Mono', monospace"}}>{c.totalExtraCosts>0?<span className="text-green-500">+{fmt(c.totalExtraCosts)}</span>:<span className="text-muted-foreground/40">—</span>}</td>
                      <td className="px-3 py-3 text-right font-bold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}} title={biweeklyHint ? "Wypłata co 2 tygodnie (ten + poprzedni tydzień)" : undefined}>{fmt(displayNetPay)} PLN</td>
                      <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {full ? (
                          <button
                            type="button"
                            onClick={() => onToggleArchiveSettled(week.id, full.id)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${emp.settled?"bg-green-500/15 text-green-400 hover:bg-green-500/25":"bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"}`}
                          >
                            {emp.settled?<><CheckCircle2 size={10}/>Rozliczony</>:<><Circle size={10}/>Oczekuje</>}
                          </button>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${emp.settled?"bg-green-500/15 text-green-400":"bg-yellow-500/10 text-yellow-400"}`}>{emp.settled?<><CheckCircle2 size={10}/>Rozliczony</>:<><Circle size={10}/>Oczekuje</>}</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr className="border-t border-border bg-secondary/20">
                  <td className="px-5 py-2.5 text-xs font-bold text-muted-foreground uppercase" colSpan={2}>Suma</td>
                  <td colSpan={2}/>
                  <td className="px-3 py-2.5 text-right text-xs font-bold" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmtH(week.totalHours)}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-muted-foreground" style={{fontFamily:"'JetBrains Mono', monospace"}}>{canViewRates ? fmt(week.totalGross) : "—"}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-destructive" style={{fontFamily:"'JetBrains Mono', monospace"}}>{week.totalZaliczka>0?`−${fmt(week.totalZaliczka)}`:"—"}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-green-500" style={{fontFamily:"'JetBrains Mono', monospace"}}>{week.employees.some((e) => (e.totalExtraCosts ?? 0) > 0)?`+${fmt(week.employees.reduce((s, e) => s + (e.totalExtraCosts ?? 0), 0))}`:"—"}</td>
                  <td className="px-3 py-2.5 text-right text-sm font-bold text-primary" style={{fontFamily:"'JetBrains Mono', monospace"}}>{fmt(week.totalNet)} PLN</td>
                  <td/>
                </tr></tfoot>
              </table>
              </>
              )}
              </div>
              {editContext?.weekId === week.id && (() => {
                const editEmp = week.weekEmployees?.find((e) => e.id === editContext.empId);
                if (!editEmp) return null;
                return (
                  <div className="w-full lg:w-1/2 lg:min-w-[360px] border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col min-h-[320px] lg:min-h-0 shrink-0">
                    <WeekEmployeeDetail
                      emp={editEmp}
                      weekFrom={week.weekFrom}
                      weekTo={week.weekTo}
                      directory={directory}
                      savedWeeks={savedWeeks}
                      onPatchDay={(key, next) => onUpdateWeekEmployeeDay(week.id, editEmp.id, key, next)}
                      onPatchRate={(rate) => onUpdateWeekEmployeeRate(week.id, editEmp.id, rate)}
                      onPatchPrevSaturday={(next) => onUpdateWeekEmployeePrevSaturday(week.id, editEmp.id, next)}
                      onPatchExtraCosts={(next) => onUpdateWeekEmployeeExtraCosts(week.id, editEmp.id, next)}
                      onPatchManualAdjustment={(next) => onUpdateWeekEmployeeManualAdjustment(week.id, editEmp.id, next)}
                      onClose={() => setEditContext(null)}
                    />
                  </div>
                );
              })()}
              </div>
              ) : (
                <ArchiveScheduleGrid week={week} directory={directory}/>
              )}
            </div>}
          </div>;
        })}
      </div>
    </div>
  );
}

