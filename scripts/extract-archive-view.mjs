import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const appPath = path.join(root, "src/app/App.tsx");
const lines = fs.readFileSync(appPath, "utf8").split(/\n/);
const start = lines.findIndex((l) => l.startsWith("function archiveEmployeePayrollDisplay"));
const end = lines.findIndex((l, i) => i > start && l.startsWith("// ─── Dashboard"));
const body = lines.slice(start, end).join("\n");
const exportedBody = body
  .replace(/^function archiveEmployeePayrollDisplay/m, "function archiveEmployeePayrollDisplay")
  .replace(/^function ArchiveView/m, "export function ArchiveView");

const header = `import { useMemo, useState } from "react";
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
import type { DirectoryEmployee, WeekSnapshot, WeekEmployee, Job } from "@/app/app-domain";
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

`;

fs.writeFileSync(path.join(root, "src/app/ArchiveView.tsx"), header + exportedBody + "\n");

const newLines = [...lines.slice(0, start - 1), ...lines.slice(end)];
fs.writeFileSync(appPath, newLines.join("\n"));
console.log(`Extracted ${end - start} lines to ArchiveView.tsx`);
