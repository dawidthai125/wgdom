import { readFileSync, writeFileSync } from "fs";

const appPath = "src/app/App.tsx";
const app = readFileSync(appPath, "utf8");
const lines = app.split(/\r?\n/);

const changelogStart = lines.findIndex((l) => l.startsWith("const CHANGELOG:"));
let clEnd = -1;
for (let i = changelogStart + 1; i < lines.length; i++) {
  if (lines[i].trim() === "];" && lines[i - 1]?.trim().startsWith("}")) {
    clEnd = i;
    break;
  }
}
if (changelogStart < 0 || clEnd < 0) {
  throw new Error(`CHANGELOG bounds not found: ${changelogStart}, ${clEnd}`);
}

const helpStart = lines.findIndex((l) => l.includes("function HelpView"));
const helpEnd = lines.findIndex(
  (l, i) => i > helpStart && l.startsWith("// ─── Changelog")
);
const guideStart = lines.findIndex((l) => l.startsWith("const CHANGELOG_PAGE_SIZES"));
const guideEnd = lines.findIndex(
  (l, i) => i > guideStart && l.startsWith("// ─── Ustawienia admina")
);

console.log("CHANGELOG lines", changelogStart + 1, clEnd + 1);
console.log("HelpView lines", helpStart + 1, helpEnd);
console.log("Guide block lines", guideStart + 1, guideEnd);

const changelogBody = lines.slice(changelogStart + 1, clEnd + 1).join("\n");

writeFileSync(
  "src/app/changelog-data.ts",
  `/** Przy nowych funkcjach uzupełnij: CHANGELOG (ten plik), GuideView helpSections, navItems.hint, LabelWithHint. */

export type ChangelogItemType = "new" | "fix" | "improve";

export interface ChangelogRelease {
  date: string;
  version: string;
  label: string;
  items: { type: ChangelogItemType; text: string }[];
}

export const CHANGELOG: ChangelogRelease[] = ${changelogBody}

export const APP_VERSION = CHANGELOG[0]?.version ?? "0.0.0";
`
);

const helpBlock = lines.slice(helpStart, helpEnd).join("\n");
const viewsBlock = lines.slice(guideStart, guideEnd).join("\n");

// viewsBlock: CHANGELOG_PAGE_SIZES ... through GuideView closing }
// Replace inner GuideView export - viewsBlock ends with GuideView function
const guideViewContent = viewsBlock.replace(
  /^function GuideView\(\)/m,
  "export function GuideView()"
);

writeFileSync(
  "src/app/GuideView.tsx",
  `import { useState, useMemo, useEffect, useRef } from "react";
import {
  BookOpen,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  ChevronDown as ChevDown,
  Smartphone,
  Monitor,
  CalendarDays,
  FileText,
  MapPin,
  Scale,
  Users,
  Archive,
  HardHat,
  ClipboardCheck,
  Cloud,
  Download,
  HelpCircle,
  FileDown,
  AlertTriangle,
  Sparkles,
  Copy,
  Mic,
  Bell,
  BarChart3,
  LayoutDashboard,
  Calendar,
  Wallet,
  Clock,
  Search,
  KeyRound,
  Mail,
} from "lucide-react";
import { useWheelScrollForward } from "@/lib/wheel-scroll-forward";
import { CHANGELOG } from "@/app/changelog-data";

${helpBlock}

${guideViewContent}
`
);

// Remove extracted sections from App.tsx (bottom to top to preserve indices)
const newLines = [...lines];
// Remove guide block (includes CHANGELOG const comment header through GuideView)
const changelogCommentIdx = newLines.findIndex(
  (l, i) => i < guideStart && l.startsWith("// ─── Changelog")
);
newLines.splice(guideStart, guideEnd - guideStart);
newLines.splice(changelogCommentIdx, clEnd - changelogCommentIdx + 1);
newLines.splice(helpStart, helpEnd - helpStart);

writeFileSync(appPath, newLines.join("\n"));
console.log("Removed", lines.length - newLines.length, "lines from App.tsx");
console.log("Done.");
