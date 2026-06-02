import { readFileSync } from "fs";

const file = process.argv[2] || "src/app/JobsView.tsx";
const src = readFileSync(file, "utf8");
const m = src.match(/import\s*\{([\s\S]*?)\}\s*from\s*"lucide-react"/);
const imported = new Set(
  (m?.[1] || "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean),
);
const used = new Set([...src.matchAll(/<([A-Z][a-zA-Z0-9]+)\s/g)].map((x) => x[1]));
const skip = new Set([
  "Fragment", "File", "Record", "Checkbox", "InspectorJobFileUpload", "JobFilePreviewModal",
  "JobCostBreakdownPanel", "JobAllFilesView", "JobFileCatalogList", "JobDetailSectionNav",
  "JobsDetailEmptyState", "JobListFilterBar", "JobListLegend", "JobListPrimaryBadge",
  "JobListCard", "JobPhasePicker", "JobMetaPickers", "JobMetaBadges", "JobWmStageBadge",
  "JobWmPlannedBadge", "JobWorkerReportsPanel", "WorkScopeEditor", "WorkScopeDisplay",
  "HiddenFileInput", "LabelWithHint", "VoiceNoteButton", "PayrollDayEditor",
]);
const missing = [...used].filter((u) => !imported.has(u) && !skip.has(u)).sort();
console.log(missing.join("\n") || "(none)");
