import fs from "fs";

const appPath = "src/app/App.tsx";
const lines = fs.readFileSync(appPath, "utf8").split(/\n/);
const start = lines.findIndex((l) => l.startsWith("function LoginScreen("));
const end = lines.findIndex((l, i) => i > start && l.startsWith("// ─── Worker Photo View"));
if (start < 0 || end < 0) throw new Error(`markers not found: start=${start} end=${end}`);

const body = lines.slice(start, end).join("\n").replace(/^function LoginScreen/m, "export function LoginScreen");

const header = `import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ShieldCheck, ClipboardCheck, HardHat, Lock, Eye, Search,
} from "lucide-react";
import { ImageWithFallback } from "@/app/components/ui/ImageWithFallback";
import logoSrc from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import { PwaInstallBanner } from "@/app/PwaInstallBanner";
import {
  type AdminSession,
  listAdminUsersForLogin,
  listInspectorUsersForLogin,
  verifyAdminLogin,
  adminRememberEnabled,
  saveRememberedAdminPassword,
  loadRememberedAdminPassword,
  clearRememberedAdminPassword,
  digestSha256Hex,
} from "@/lib/admin-auth";
import {
  fetchKeysFromCloud,
  mergeDirectory,
  getDeletedDirectoryIds,
  saveDeletedDirectoryIds,
  mergeDeletedDirectoryIds,
  normalizeDeletedDirectoryIds,
  DIRECTORY_DELETED_IDS_KEY,
  pushDirectoryToCloud,
} from "@/lib/cloud-sync";
import type { DirectoryEmployee } from "@/app/app-domain";
import {
  workerHasPhonePin,
  workerPhonePinValid,
  workerHasPersonalPin,
  workerPinTooWeak,
} from "@/app/app-domain";

async function hashWorkerPin(pin: string): Promise<string> {
  return digestSha256Hex(\`wgdom-worker-pin-v1:\${pin}\`);
}

async function verifyWorkerPin(emp: DirectoryEmployee, pin: string): Promise<boolean> {
  if (!workerHasPersonalPin(emp)) return false;
  const hash = await hashWorkerPin(pin.replace(/\\D/g, "").slice(0, 4));
  return hash === emp.workerPinHash;
}

`;

fs.writeFileSync("src/app/LoginScreen.tsx", header + body + "\n");

const newLines = [...lines.slice(0, start), ...lines.slice(end)];
fs.writeFileSync(appPath, newLines.join("\n"));

console.log(JSON.stringify({ extracted: end - start, startLine: start + 1, endLine: end }));
