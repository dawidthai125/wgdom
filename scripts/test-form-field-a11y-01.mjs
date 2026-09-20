/**
 * FORM-FIELD-A11Y-01 — source contract asserts (frozen Design Freeze).
 * Run: npx vite-node scripts/test-form-field-a11y-01.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass += 1;
    console.log("PASS", msg);
  } else {
    fail += 1;
    console.error("FAIL", msg);
  }
}

const offerBoq = read("src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx");
const company = read("src/app/TenderCompanyProfilePanel.tsx");
const qual = read("src/app/CompanyQualificationProfilePanel.tsx");
const priceBase = read("src/app/TenderPriceBasePanel.tsx");
const ingest = read("src/app/tenders/TenderIngestImportPanel.tsx");
const tendersView = read("src/app/TendersView.tsx");
const workRow = read("src/app/work-catalog/WorkCatalogWorkRow.tsx");
const topbar = read("src/app/admin/AdminTopbar.tsx");

// OfferBoq — frozen id templates + FieldLabel htmlFor + review KEEP
assert(offerBoq.includes("htmlFor?: string"), "OfferBoq FieldLabel accepts htmlFor");
for (const field of ["name", "category", "origin", "qty", "unit", "unitPrice"]) {
  assert(
    offerBoq.includes("`${idPrefix}-" + field + "`") || offerBoq.includes(`\${idPrefix}-${field}`),
    `OfferBoq id suffix -${field}`,
  );
}
assert(offerBoq.includes("offer-boq-${lineId}-${component.componentId}") || offerBoq.includes("`offer-boq-${lineId}-${component.componentId}`"), "OfferBoq idPrefix uses lineId+componentId");
assert(offerBoq.includes('id={`review-${component.componentId}`}'), "OfferBoq review KEEP");
assert(!/\bname=/.test(offerBoq.match(/function EditableComponentFields[\s\S]*?data-offer-boq-company-knowledge/)?.[0] ?? ""), "OfferBoq EditableComponentFields no name=");

// Duplicate-id contract: two synthetic component id sets must differ by lineId
const lineA = "line-a";
const lineB = "line-b";
const comp = "c1";
const idsA = ["name", "category", "origin", "qty", "unit", "unitPrice"].map(
  (f) => `offer-boq-${lineA}-${comp}-${f}`,
);
const idsB = ["name", "category", "origin", "qty", "unit", "unitPrice"].map(
  (f) => `offer-boq-${lineB}-${comp}-${f}`,
);
assert(new Set([...idsA, ...idsB]).size === 12, "OfferBoq ≥2 components → zero duplicate ids");

// Profile / Qualification helpers use useId
assert(company.includes("useId"), "Company profile imports/uses useId");
assert(/function NumInput[\s\S]*?const inputId = useId\(\)/.test(company), "Company NumInput useId");
assert(company.includes('autoComplete="off"'), "Company NumInput autoComplete=off");
assert(qual.includes("useId"), "Qualification uses useId");
assert(/function NumInput[\s\S]*?const inputId = useId\(\)/.test(qual), "Qualification NumInput useId");
assert(/function CheckRow[\s\S]*?const inputId = useId\(\)/.test(qual), "Qualification CheckRow useId");

// PriceBase — no offending read-only native inputs; spans present
assert(priceBase.includes('data-price-base-readonly="labor"'), "PriceBase labor span");
assert(priceBase.includes('data-price-base-readonly="material"'), "PriceBase material span");
assert(!/readOnly[\s\S]{0,80}READ_ONLY/.test(priceBase), "PriceBase no READ_ONLY input class path");
assert(!/<input[\s\S]*?readOnly[\s\S]*?laborRbhPerUnit/.test(priceBase), "PriceBase no labor readOnly input");
assert(!/<input[\s\S]*?readOnly[\s\S]*?materialPlnPerUnit/.test(priceBase), "PriceBase no material readOnly input");
assert(priceBase.includes('id="tender-price-base-region"'), "PriceBase region id");
assert(/function NumInput[\s\S]*?const inputId = useId\(\)/.test(priceBase), "PriceBase NumInput useId");

// Secondary frozen ids
assert(ingest.includes('id="tender-ingest-upload-file"'), "Ingest upload file id");
assert(ingest.includes('id="tender-ingest-title"'), "Ingest title id");
assert(ingest.includes('id="tender-ingest-mode"'), "Ingest mode id");
assert(tendersView.includes('id="tenders-list-search"'), "TendersView search id");
assert(tendersView.includes('id="tenders-list-status-filter"'), "TendersView status id");
assert(tendersView.includes('id="tenders-list-bulk-status"'), "TendersView bulk id");
assert(workRow.includes("`work-catalog-bulk-${work.id}`") || workRow.includes("work-catalog-bulk-${work.id}"), "WorkCatalog bulk id");
assert(topbar.includes('id="admin-backup-import-file"'), "AdminTopbar file id");
assert(topbar.includes('htmlFor="admin-backup-import-file"'), "AdminTopbar htmlFor");

// Qualification workspace still has no form fields requirement from WAVE4 path — smoke source
const qualWs = read("src/app/TenderQualificationWorkspace.tsx");
assert(!/<(input|select|textarea)\b/.test(qualWs), "Qualification workspace still no native form fields");

// --- Design Freeze Delta: profile RefEditor / Lines / advanced / classification ---
const workCatalog = read("src/app/work-catalog/WorkCatalogView.tsx");
for (const field of ["client", "year", "valuePln", "source", "scope"]) {
  assert(
    company.includes("`company-ref-${listKey}-${i}-" + field + "`") ||
      company.includes("company-ref-${listKey}-${i}-" + field),
    `RefEditor id suffix -${field}`,
  );
}
assert(company.includes('listKey="references"'), "RefEditor listKey references");
assert(company.includes('listKey="tender-wins"'), "RefEditor listKey tender-wins");
assert(company.includes('listKey="tender-participations"'), "RefEditor listKey tender-participations");
assert(company.includes('autoComplete="off"') && /company-ref-\$\{listKey\}-\$\{i\}-valuePln[\s\S]{0,120}autoComplete="off"/.test(company), "RefEditor valuePln autoComplete=off");

for (const key of ["licenses", "strengths", "regions", "preferredCpvPrefixes"]) {
  assert(company.includes(`company-profile-lines-${key}`) || company.includes('fieldKey="' + key + '"'), `LinesInput fieldKey ${key}`);
  assert(
    company.includes("`company-profile-lines-${fieldKey}`") || company.includes("company-profile-lines-${fieldKey}"),
    "LinesInput id template company-profile-lines-${fieldKey}",
  );
}
assert(company.includes('id="company-profile-nip"'), "company-profile-nip");
assert(company.includes('htmlFor="company-profile-nip"'), "htmlFor company-profile-nip");
assert(company.includes('id="company-profile-regon"'), "company-profile-regon");
assert(company.includes('htmlFor="company-profile-regon"'), "htmlFor company-profile-regon");
assert(company.includes('id="company-profile-owner-name"'), "company-profile-owner-name");
assert(company.includes('htmlFor="company-profile-owner-name"'), "htmlFor company-profile-owner-name");
assert(company.includes('id="company-profile-notes"'), "company-profile-notes");
assert(company.includes('htmlFor="company-profile-notes"'), "htmlFor company-profile-notes");
assert(
  company.includes("`company-class-${entry.id}-phrase`") || company.includes("company-class-${entry.id}-phrase"),
  "classification phrase id",
);
assert(
  company.includes("`company-class-${entry.id}-category`") || company.includes("company-class-${entry.id}-category"),
  "classification category id",
);

assert(offerBoq.includes('id="offer-boq-search"'), "offer-boq-search id");
assert(offerBoq.includes('data-offer-boq-search'), "offer-boq-search data attr KEEP");
assert(workCatalog.includes('id="work-catalog-search"'), "work-catalog-search id");

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
