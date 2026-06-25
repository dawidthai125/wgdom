/**
 * Smoke — Tender Workspace V2 (progress, timeline, checklist, next action).
 */
import assert from "node:assert/strict";

const {
  computeWorkspaceV2Progress,
  computeWorkspaceV2AutoProgress,
  buildWorkspaceV2Timeline,
  buildWorkspaceV2TimelineAutomation,
  buildWorkspaceV2AutoChecklist,
  buildWorkspaceV2Insights,
  buildWorkspaceV2Checklist,
  resolveWorkspaceV2KeyDocuments,
  buildWorkspaceV2NextActionLabel,
  loadWorkspaceV2ChecklistPersist,
  saveWorkspaceV2ChecklistPersist,
  workspaceV2AutoStatusGlyph,
} = await import("../src/lib/tender-workspace-v2-ux.ts");

const base = {
  id: "t-ws-v2",
  title: "Remont lokali",
  organizationName: "WM",
  organizationCity: "Wrocław",
  bzpNumber: "BZP-WS",
  submittingOffersDate: new Date(Date.now() + 5 * 86400000).toISOString(),
  publicationDate: "2026-06-01",
  status: "new",
  relevanceScore: 20,
  isWroclaw: true,
  bzpDocuments: [
    {
      index: 0,
      filename: "SWZ_remont.pdf",
      contentType: "application/pdf",
      downloadUrl: "https://example.com/swz.pdf",
      isSwzHint: true,
    },
    {
      index: 1,
      filename: "przedmiar.ath",
      contentType: "application/octet-stream",
      downloadUrl: "https://example.com/p.ath",
      isSwzHint: false,
    },
  ],
};

const progress = computeWorkspaceV2Progress(base, null);
assert.equal(progress.pillars.length, 6);
assert.ok(progress.percent >= 0 && progress.percent <= 100);
assert.ok(progress.pillars.some((p) => p.id === "documents" && p.status === "done"));

const autoProgress = computeWorkspaceV2AutoProgress(base, null);
assert.ok(autoProgress.percent >= 0 && autoProgress.percent <= 100);

const autoChecklist = buildWorkspaceV2AutoChecklist(base, null);
assert.equal(autoChecklist.length, 5);
assert.equal(workspaceV2AutoStatusGlyph("ready"), "✔");
assert.equal(workspaceV2AutoStatusGlyph("missing"), "⚠");
assert.equal(workspaceV2AutoStatusGlyph("action"), "⌛");

const timelineAuto = buildWorkspaceV2TimelineAutomation(base, null);
assert.ok(timelineAuto.daysRemainingLabel.includes("dni") || timelineAuto.daysRemainingLabel.includes("dzień"));
assert.ok(timelineAuto.suggestedValuationStart.length > 0);
assert.ok(timelineAuto.lastSafeSubmit.length > 0);

const insights = buildWorkspaceV2Insights(base, null, autoChecklist, timelineAuto);
assert.ok(insights.length <= 3);

const timeline = buildWorkspaceV2Timeline(base, null);
assert.equal(timeline.length, 5);
assert.ok(timeline.some((n) => n.id === "deadline"));
assert.ok(timeline.some((n) => n.id === "today"));

const docs = resolveWorkspaceV2KeyDocuments(base);
assert.equal(docs.length, 5);
assert.ok(docs.find((d) => d.slot === "swz")?.available);
assert.ok(docs.find((d) => d.slot === "ath")?.available);

const persist = loadWorkspaceV2ChecklistPersist(base.id);
assert.equal(persist.signature, false);
const saved = saveWorkspaceV2ChecklistPersist(base.id, { signature: true });
assert.equal(saved.signature, true);

const checklist = buildWorkspaceV2Checklist(base, null, saved);
assert.equal(checklist.length, 6);
assert.ok(checklist.find((c) => c.id === "attachments")?.checked);
assert.ok(checklist.find((c) => c.id === "signature")?.checked);

const nextLabel = buildWorkspaceV2NextActionLabel({
  ruleId: "P6",
  title: "Poleć do wyceny",
  description: "Trzeba policzyć marżę",
  buttonLabel: "Wycena",
  tab: "valuation",
  ownerDecision: null,
  expandDetails: false,
  informationalOnly: false,
});
assert.equal(nextLabel, "Policz kosztorys");

console.log("test-tender-workspace-v2-ux.mjs — PASS (workspace/progress/checklist/timeline/insights)");
