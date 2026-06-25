/**
 * Smoke — Przetargi Lista UX V2/V3 (sort, kolejka, presety, filtry, AI insight).
 */
import assert from "node:assert/strict";

const {
  isTenderNeedsReactionToday,
  isTenderMine,
  isTenderNeedsDecision,
  isDeadlineToday,
  isDeadlineTomorrow,
  sortTendersForListDisplay,
  applyListQuickBarPreset,
  applyQueuePreset,
  detectListQuickBarId,
  buildTendersListFilterPrefs,
  computeMyQueueCounts,
  matchesQueueFilter,
  buildTendersListAiInsight,
  createFavoriteFromState,
  applyFavoritePreset,
  TENDERS_LIST_CLIENT_BAR,
  TENDERS_LIST_PRIMARY_QUEUE,
  TENDERS_LIST_SECONDARY_QUEUE,
  TENDERS_LIST_QUEUE,
  applyListClientBarPreset,
  detectActiveClientBarId,
  resolveTendersListBannerQueueAction,
} = await import("../src/lib/tenders-list-ux.ts");

const base = {
  id: "t1",
  title: "Remont",
  organizationName: "WM",
  organizationCity: "Wrocław",
  bzpNumber: "BZP-1",
  submittingOffersDate: new Date(Date.now() + 2 * 86400000).toISOString(),
  publicationDate: "2026-06-01",
  status: "new",
  relevanceScore: 25,
  isWroclaw: true,
  priorityBuyerId: "wm",
  priorityBuyerLabel: "WM",
};

const emptyStore = { version: 1, byId: {} };

assert.equal(isTenderNeedsReactionToday({ ...base, status: "new" }), true);

const mineStore = {
  version: 1,
  byId: { t2: { id: "t2", decision: "GO", createdAt: "", updatedAt: "", systemDecision: "GO", opportunityScore: 1, strategicScore: 1 } },
};
assert.equal(isTenderMine({ ...base, id: "t2", status: "seen" }, mineStore), true);
assert.equal(isTenderMine({ ...base, id: "t3", status: "interested" }, emptyStore), true);

const urgent = { ...base, id: "u", status: "seen", submittingOffersDate: new Date(Date.now() + 1 * 86400000).toISOString() };
const calm = { ...base, id: "c", status: "seen", priorityBuyerId: null, relevanceScore: 5, submittingOffersDate: new Date(Date.now() + 20 * 86400000).toISOString() };
const sorted = sortTendersForListDisplay([calm, urgent]);
assert.equal(sorted[0].id, "u");

const wmPreset = applyListQuickBarPreset("wm");
assert.equal(wmPreset.strategicClientFilter, "wm");
assert.equal(detectListQuickBarId({ ...wmPreset, statusFilter: "all" }), "wm");

const prefs = buildTendersListFilterPrefs({
  search: "test",
  localFilter: "actionable",
  statusFilter: "all",
  quickFilter: null,
  strategicClientFilter: null,
  mineOnly: false,
  queueFilter: null,
});
assert.equal(prefs.version, 3);
assert.equal(prefs.search, "test");

const needsDecision = { ...base, id: "nd", status: "new" };
assert.equal(isTenderNeedsDecision(needsDecision, emptyStore), true);

const todayDeadline = {
  ...base,
  id: "td",
  submittingOffersDate: new Date(new Date().setHours(23, 0, 0, 0)).toISOString(),
};
assert.equal(isDeadlineToday(todayDeadline), true);

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(23, 0, 0, 0);
const tomorrowDeadline = {
  ...base,
  id: "tm",
  submittingOffersDate: tomorrow.toISOString(),
};
assert.equal(isDeadlineTomorrow(tomorrowDeadline), true);

const counts = computeMyQueueCounts([needsDecision, todayDeadline], emptyStore);
assert.ok(counts.needs_decision >= 1);
assert.ok(counts.deadline_today >= 1);

const queuePreset = applyQueuePreset("needs_decision");
assert.equal(queuePreset.queueFilter, "needs_decision");
assert.equal(queuePreset.localFilter, "actionable");

assert.equal(matchesQueueFilter(needsDecision, "needs_decision", emptyStore), true);
assert.equal(TENDERS_LIST_QUEUE.length, 5);
assert.equal(TENDERS_LIST_PRIMARY_QUEUE.length, 2);
assert.equal(TENDERS_LIST_PRIMARY_QUEUE[0].id, "needs_decision");
assert.equal(TENDERS_LIST_SECONDARY_QUEUE.length, 3);

const aiAction = buildTendersListAiInsight([needsDecision], emptyStore, counts);
assert.equal(aiAction.tone, "action");
assert.ok(aiAction.text.includes("decyzji"));

const fav = createFavoriteFromState("Moje WM", {
  search: "",
  localFilter: "active",
  statusFilter: "all",
  quickFilter: null,
  strategicClientFilter: "wm",
  mineOnly: false,
  queueFilter: null,
});
const applied = applyFavoritePreset(fav);
assert.equal(applied.strategicClientFilter, "wm");
assert.equal(applied.version, 3);

assert.equal(TENDERS_LIST_CLIENT_BAR.length, 6);
assert.equal(detectActiveClientBarId("mops"), "mops");
assert.equal(detectActiveClientBarId(null), "all");
assert.equal(applyListClientBarPreset("gminy").strategicClientFilter, "gminy");
assert.equal(resolveTendersListBannerQueueAction(counts), "needs_decision");
assert.equal(resolveTendersListBannerQueueAction({ ...counts, needs_decision: 0 }), null);

console.log("test-tenders-list-ux.mjs — PASS (V2/V3/V4 lista UX)");
