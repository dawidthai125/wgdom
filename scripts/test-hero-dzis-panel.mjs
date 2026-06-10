/**
 * Hero DZIŚ Panel — unit / smoke tests (20.7C.2B)
 * Run: npx vite-node scripts/test-hero-dzis-panel.mjs
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
  formatHeroCriticalBadge,
  formatHeroHighBadge,
  resolveHeroItemNavigation,
} = await import("../src/app/HeroDzisPanel.tsx");

const { buildHeroToday } = await import("../src/lib/dashboard-hero-today.ts");

const results = [];
function assert(name, cond, detail = {}) {
  results.push({ name, pass: !!cond, ...detail });
}

assert("critical badge: null when 0", formatHeroCriticalBadge(0) === null);
assert("critical badge: 1", formatHeroCriticalBadge(1) === "1 krytyczne");
assert("critical badge: 3", formatHeroCriticalBadge(3) === "3 krytyczne");
assert("high badge: 2", formatHeroHighBadge(2) === "2 wysokie");
assert("high badge: null when 0", formatHeroHighBadge(0) === null);

const navCalls = [];
const handlers = {
  onNavigate: (v, jobId, payrollEmpId, section) => {
    navCalls.push({ v, jobId, payrollEmpId, section });
  },
  onOpenTenders: () => navCalls.push({ openTenders: true }),
  onOpenTender: (id) => navCalls.push({ openTender: id }),
};

navCalls.length = 0;
resolveHeroItemNavigation(
  {
    id: "t1",
    priority: "CRITICAL",
    domain: "tenders",
    title: "T",
    subtitle: "",
    recommendedAction: "Go",
    sourceIds: [],
    navTarget: "tenders",
    tenderId: "tender-abc",
  },
  handlers,
);
assert("nav: tenderId opens tender", navCalls[0]?.openTender === "tender-abc");

navCalls.length = 0;
resolveHeroItemNavigation(
  {
    id: "j1",
    priority: "HIGH",
    domain: "jobs",
    title: "J",
    subtitle: "",
    recommendedAction: "Go",
    sourceIds: [],
    navTarget: "jobs",
    jobId: "job-1",
  },
  handlers,
);
assert("nav: jobs with jobId", navCalls[0]?.v === "jobs" && navCalls[0]?.jobId === "job-1");

navCalls.length = 0;
resolveHeroItemNavigation(
  {
    id: "p1",
    priority: "HIGH",
    domain: "payroll",
    title: "P",
    subtitle: "",
    recommendedAction: "Go",
    sourceIds: [],
    navTarget: "payroll",
    payrollEmpId: "emp-1",
  },
  handlers,
);
assert("nav: payroll emp", navCalls[0]?.v === "payroll" && navCalls[0]?.payrollEmpId === "emp-1");

const emptyHero = buildHeroToday({
  operational: {
    jobs: [],
    weekEmployees: [],
    weekFrom: "2026-06-02",
    weekTo: "2026-06-07",
    directory: [],
    savedWeeks: [],
    now: new Date("2026-06-10T12:00:00.000Z"),
  },
});
assert("empty hero: items length 0", emptyHero.items.length === 0);
assert("empty hero: headline string", typeof emptyHero.headline === "string" && emptyHero.headline.length > 0);

const failed = results.filter((r) => !r.pass);
console.log(
  JSON.stringify(
    {
      test: "hero-dzis-panel",
      pass: failed.length === 0,
      failed: failed.length,
      results,
      emptyHeadline: emptyHero.headline,
    },
    null,
    2,
  ),
);

if (failed.length > 0) {
  console.error("FAILED:", failed);
  process.exit(1);
}
