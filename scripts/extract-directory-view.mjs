import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const appPath = path.join(root, "src/app/App.tsx");
const lines = fs.readFileSync(appPath, "utf8").split(/\n/);
const start = lines.findIndex((l) => l.startsWith("function DirectoryView"));
const end = lines.findIndex((l, i) => i > start && l.startsWith("// ─── Archive view"));
const body = lines.slice(start, end).join("\n").replace("function DirectoryView", "export function DirectoryView");
const header = `import { useEffect, useState } from "react";
import {
  Search, MessageSquare, Plus, Users, HardHat, Building2, Check, ShieldCheck, KeyRound,
  Phone, Lock, BarChart3, Edit2, Circle, CheckCircle2, Trash2,
} from "lucide-react";
import { useAdminAccess } from "@/app/admin-access";
import { StatCard, LabelWithHint } from "@/app/app-ui";
import { EmployeeArchiveModal } from "@/app/EmployeeArchiveModal";
import type { DirectoryEmployee, WeekSnapshot } from "@/app/app-domain";
import {
  defaultDirEmployee,
  isTestDirectoryEmployee,
  isProductionDirectoryEmployee,
  fmtDate,
  workerHasPersonalPin,
  workerPinTooWeak,
} from "@/app/app-domain";
import { addDeletedDirectoryId, pushDirectoryToCloud } from "@/lib/cloud-sync";
import { digestSha256Hex } from "@/lib/admin-auth";

async function hashWorkerPin(pin: string): Promise<string> {
  return digestSha256Hex(\`wgdom-worker-pin-v1:\${pin}\`);
}

`;
fs.writeFileSync(path.join(root, "src/app/DirectoryView.tsx"), header + body + "\n");
const newLines = [...lines.slice(0, start), ...lines.slice(end)];
fs.writeFileSync(appPath, newLines.join("\n"));
console.log(`Extracted ${end - start} lines to DirectoryView.tsx`);
