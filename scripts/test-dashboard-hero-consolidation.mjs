/**
 * Dashboard Hero consolidation + Action Center display (20.7C.2C)
 * Run: npx vite-node scripts/test-dashboard-hero-consolidation.mjs
 */

const { getHeroCoveredUwagaSections } = await import("../src/lib/dashboard-hero-consolidation.ts");
const { buildHeroToday, HERO_MERGE_WM_OVERDUE } = await import("../src/lib/dashboard-hero-today.ts");
const {
  formatActionCenterItemTitle,
} = await import("../src/lib/tender-center-action-center-display.ts");
const { computeForecast90Days } = await import("../src/lib/tender-center-forecast-90d.ts");
const { defaultCompanyProfile } = await import("../src/lib/tenders-bzp-company.ts");

const results = [];
function assert(name, cond, detail = {}) {
  results.push({ name, pass: !!cond, ...detail });
}

const wmJob = {
  id: "wm1",
  address: "ul. Test",
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
};

const hero = buildHeroToday({
  operational: {
    jobs: [wmJob],
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
        title: "WM strategic",
        description: "",
        reason: "",
        source: "",
        recommendedAction: "Go",
      },
    ],
    counts: { CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0 },
    primaryAction: null,
    headline: "",
  },
});

const covered = getHeroCoveredUwagaSections(hero);
assert("uwaga covers wm-overdue", covered.has("wm-overdue"));
assert("hero has wm item", hero.items.some((i) => i.mergeKey === HERO_MERGE_WM_OVERDUE));

const profile = defaultCompanyProfile();
const forecast = computeForecast90Days({
  jobs: [],
  savedWeeks: [],
  weekEmployees: [],
  directory: [],
  weekFrom: "2026-06-02",
  weekTo: "2026-06-07",
  profile,
  goBundles: [],
  now: new Date("2026-06-10T12:00:00.000Z"),
});

const title = formatActionCenterItemTitle(
  {
    id: "forecast-30-critical",
    priority: "CRITICAL",
    category: "STAFF",
    title: "Krytyczne obciążenie za 30 dni (325%)",
    description: "test",
    reason: "test",
    source: "forecast",
    recommendedAction: "Go",
  },
  forecast,
);
assert("action center title uses slotów", title.includes("slotów"));
assert("action center title no percent", !title.includes("%"));

const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({ test: "dashboard-hero-consolidation", pass: failed.length === 0, results }, null, 2));
if (failed.length > 0) process.exit(1);
