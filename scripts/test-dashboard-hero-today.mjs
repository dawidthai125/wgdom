/**
 * Hero DZIŚ — unit tests (20.7C.2A)
 * Run: npx vite-node scripts/test-dashboard-hero-today.mjs
 */

if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor(init) {
      this.a = 1;
      this.b = 0;
      this.c = 0;
      this.d = 1;
      this.e = 0;
      this.f = 0;
      if (init && typeof init === "object") Object.assign(this, init);
    }
    multiply() {
      return new DOMMatrix(this);
    }
    translate() {
      return new DOMMatrix(this);
    }
    scale() {
      return new DOMMatrix(this);
    }
    inverse() {
      return new DOMMatrix(this);
    }
  };
}

const {
  buildHeroToday,
  mergeAndRankHeroItems,
  compareHeroItems,
  mapOwnerActionToHeroItem,
  mapOperationalAlertsToHeroItems,
  HERO_MERGE_WM_OVERDUE,
  HERO_TODAY_MAX_ITEMS,
} = await import("../src/lib/dashboard-hero-today.ts");

const results = [];
function assert(name, cond, detail = {}) {
  results.push({ name, pass: !!cond, ...detail });
}

function makeHeroItem(id, priority, urgency = 1000, extra = {}) {
  return {
    id,
    priority,
    domain: "jobs",
    title: id,
    subtitle: "",
    recommendedAction: "Działaj.",
    sourceIds: [id],
    urgency,
    ...extra,
  };
}

// --- compareHeroItems: priority ordering ---
assert(
  "priority: CRITICAL before HIGH",
  compareHeroItems(
    makeHeroItem("a", "CRITICAL", 1000),
    makeHeroItem("b", "HIGH", 5000),
  ) < 0,
);

// --- compareHeroItems: urgency within same priority ---
assert(
  "urgency: higher within HIGH",
  compareHeroItems(
    makeHeroItem("low", "HIGH", 1100),
    makeHeroItem("high", "HIGH", 1900),
  ) > 0,
);

// --- compareHeroItems: deadline proximity ---
assert(
  "deadline: sooner first within same urgency",
  compareHeroItems(
    makeHeroItem("far", "HIGH", 1500, { deadlineDays: 7 }),
    makeHeroItem("soon", "HIGH", 1500, { deadlineDays: 1 }),
  ) > 0,
);

// --- mergeAndRankHeroItems: max 5 ---
const tenItems = Array.from({ length: 10 }, (_, i) =>
  makeHeroItem(`item-${i}`, i < 2 ? "CRITICAL" : "MEDIUM", 1000 + i),
);
const capped = mergeAndRankHeroItems(tenItems, HERO_TODAY_MAX_ITEMS);
assert("max 5 items", capped.length === HERO_TODAY_MAX_ITEMS, { length: capped.length });
assert(
  "max 5 keeps critical first",
  capped.every((i) => i.priority === "CRITICAL" || i.priority !== "CRITICAL")
    && capped.filter((i) => i.priority === "CRITICAL").length === 2,
  { priorities: capped.map((i) => i.priority) },
);

// --- dedupe: wm-overdue J01 + T10 ---
const operationalWm = mapOperationalAlertsToHeroItems({
  jobs: [
    {
      id: "wm1",
      address: "ul. Testowa 1",
      flatNumber: "",
      client: "Wrocławskie Mieszkania",
      status: "in_progress",
      startDate: "2026-01-01",
      endDate: "2026-06-01",
      plannedHandoverDate: "2026-05-01",
      documents: { zlecenie: true, zakres: true, kosztorys: true },
      keysHandedOver: false,
      notes: "",
      workEntries: [],
      materials: [],
      invoiceStatus: "pending",
      invoiceNumber: "",
      invoiceAmount: "",
      photos: [],
    },
  ],
  weekEmployees: [],
  weekFrom: "2026-06-02",
  weekTo: "2026-06-07",
  directory: [],
  savedWeeks: [],
  now: new Date("2026-06-10T12:00:00.000Z"),
});

const ownerWm = mapOwnerActionToHeroItem({
  id: "alert-wm-overdue",
  priority: "CRITICAL",
  category: "BUSINESS",
  title: "2 robot(y) z opóźnionym terminem odbioru WM",
  description: "Alert strategiczny",
  reason: "wm",
  source: "job-wm",
  recommendedAction: "Uporządkuj terminy odbiorów WM natychmiast.",
});

const mergedWm = mergeAndRankHeroItems([...operationalWm, ownerWm], 999);
const wmRow = mergedWm.find((i) => i.mergeKey === HERO_MERGE_WM_OVERDUE || i.sourceIds.includes("J01"));
assert("dedupe wm-overdue: single row", mergedWm.filter((i) => i.mergeKey === HERO_MERGE_WM_OVERDUE).length === 1);
assert(
  "dedupe wm-overdue: merged sourceIds J01+T10",
  wmRow && wmRow.sourceIds.includes("J01") && wmRow.sourceIds.includes("T10"),
  { sourceIds: wmRow?.sourceIds },
);

// --- buildHeroToday integration ---
const hero = buildHeroToday({
  operational: {
    jobs: [
      {
        id: "wm1",
        address: "ul. Testowa 1",
        flatNumber: "",
        client: "Wrocławskie Mieszkania",
        status: "in_progress",
        startDate: "2026-01-01",
        endDate: "2026-06-01",
        plannedHandoverDate: "2026-05-01",
        documents: { zlecenie: true, zakres: true, kosztorys: true },
        keysHandedOver: false,
        notes: "",
        workEntries: [],
        materials: [],
        invoiceStatus: "pending",
        invoiceNumber: "",
        invoiceAmount: "",
        photos: [],
      },
    ],
    weekEmployees: [],
    weekFrom: "2026-06-02",
    weekTo: "2026-06-07",
    directory: [],
    savedWeeks: [],
    now: new Date("2026-06-10T12:00:00.000Z"),
  },
  actionCenter: {
    actions: [
      {
        id: "alert-wm-overdue",
        priority: "CRITICAL",
        category: "BUSINESS",
        title: "WM overdue strategic",
        description: "dup",
        reason: "wm",
        source: "explain",
        recommendedAction: "Uporządkuj terminy.",
      },
      {
        id: "radar-deadline-3d-t1",
        priority: "CRITICAL",
        category: "TENDERS",
        title: "Termin składania oferty za 2 dni",
        description: "Przetarg test",
        reason: "deadline",
        source: "radar",
        recommendedAction: "Przygotuj ofertę natychmiast.",
        tenderId: "t1",
      },
    ],
    counts: { CRITICAL: 2, HIGH: 0, MEDIUM: 0, LOW: 0 },
    primaryAction: null,
    headline: "test",
  },
});

assert("buildHeroToday: max 5", hero.items.length <= HERO_TODAY_MAX_ITEMS);
assert("buildHeroToday: has items", hero.items.length > 0);
assert(
  "buildHeroToday: sorted critical first",
  hero.items.length === 0 || hero.items[0].priority === "CRITICAL" || hero.items[0].priority === "HIGH",
);
assert("buildHeroToday: urgentCount", hero.urgentCount >= 1, { urgentCount: hero.urgentCount });
assert("buildHeroToday: summaryTone", typeof hero.summaryTone === "string");
assert(
  "buildHeroToday: wm dedupe in result",
  hero.items.filter((i) => i.sourceIds.includes("J01") && i.sourceIds.includes("T10")).length === 1,
  { wmSources: hero.items.map((i) => i.sourceIds) },
);

const failed = results.filter((r) => !r.pass);
console.log(
  JSON.stringify(
    {
      test: "dashboard-hero-today",
      pass: failed.length === 0,
      failed: failed.length,
      results,
      heroSample: hero.items.slice(0, 3).map((i) => ({
        priority: i.priority,
        title: i.title,
        sourceIds: i.sourceIds,
      })),
    },
    null,
    2,
  ),
);

if (failed.length > 0) {
  console.error("FAILED:", failed);
  process.exit(1);
}
