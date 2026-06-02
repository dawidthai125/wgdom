import fs from "fs";

const appPath = "src/app/App.tsx";
const lines = fs.readFileSync(appPath, "utf8").split(/\n/);
const start = lines.findIndex((l) => l.startsWith("interface AdminBackupTools"));
const end = lines.findIndex((l, i) => i > start && l.startsWith("function CloudLoader"));
if (start < 0 || end < 0) throw new Error(`markers not found: start=${start} end=${end}`);

const body = lines.slice(start, end).join("\n")
  .replace(/^interface AdminBackupTools/m, "export interface AdminBackupTools")
  .replace(/^function AdminSettingsModal/m, "export function AdminSettingsModal");

const header = `import { useEffect, useMemo, useState } from "react";
import {
  Settings, X, Download, Upload, RotateCcw, UserPlus, ChevronDown, Eye, Lock, Plus, Trash2,
} from "lucide-react";
import {
  listAdminUsersForManagement,
  setAdminUserPhone,
  setAdminUserRole,
  setAdminUserPassword,
  resetAdminUserPassword,
  createAdminUser,
  deleteAdminUser,
  adminRoleLabel,
  type AdminAssignableRole,
} from "@/lib/admin-auth";
import { saveAppSettings, type AppSettings } from "@/lib/app-settings";
import {
  resetTendersPipeline,
  resetTendersKeywords,
  resetTendersCompanyProfile,
  resetAllTendersSection,
} from "@/lib/tenders-admin";
import { listLocalJobsSnapshots } from "@/lib/jobs-safety";

`;

fs.writeFileSync("src/app/AdminSettingsModal.tsx", header + body + "\n");

const newLines = [...lines.slice(0, start - 2), ...lines.slice(end)];
fs.writeFileSync(appPath, newLines.join("\n"));

console.log(JSON.stringify({ extracted: end - start, startLine: start + 1, endLine: end }));
