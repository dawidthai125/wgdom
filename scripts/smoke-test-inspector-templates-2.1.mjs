/**
 * Smoke — Roboty 2.1 Inspector Communication Templates
 * Run: npx vite-node scripts/smoke-test-inspector-templates-2.1.mjs
 */
import {
  suggestInspectorTemplate,
  mergeInspectorTemplateBody,
  buildInspectorReadyMissingBlock,
  buildInspectorTemplateEmailPayload,
  inspectorTemplateEmailHasContent,
  inspectorTemplateActivityText,
} from "../src/lib/inspector-message-templates.ts";

const { contactsForInspector } = await import("../src/lib/email-contacts.ts");

const baseJob = {
  id: "j1",
  address: "ul. Testowa 1",
  flatNumber: "12",
  client: "Wrocławskie Mieszkania",
  startDate: "2026-01-01",
  endDate: "",
  status: "in_progress",
  keysHandedOver: false,
  notes: "",
  documents: {
    zlecenie: false,
    zakres: true,
    kosztorys: false,
    kominiarz: false,
    pomiary: false,
    oswiadczenia: false,
    gwarancje: false,
    rysunek: false,
    zdjecia: true,
  },
  workEntries: [],
  materials: [],
  invoiceStatus: "pending",
  invoiceNumber: "",
  invoiceAmount: "",
  photos: [{ id: "p1", status: "approved", publicUrl: "https://example.com/p.jpg", label: "progress", uploadedBy: "A", uploadedAt: "2026-06-01" }],
  workerReports: [{ id: "r1", workerName: "Jan", submittedAt: "2026-06-01", workItems: [], rooms: [], workScopeText: "Malowanie\nGlazura" }],
  jobPhase: "handover",
};

const results = [];
function check(name, pass) {
  results.push({ name, pass });
  if (!pass) console.error(`FAIL: ${name}`);
}

check("suggest D — handover brak zlecenia i kosztorysu", suggestInspectorTemplate(baseJob) === "D");
check("suggest C — handover brak zlecenia", suggestInspectorTemplate({ ...baseJob, documents: { ...baseJob.documents, kosztorys: true } }) === "C");
check("suggest B — handover brak kosztorysu", suggestInspectorTemplate({ ...baseJob, documents: { ...baseJob.documents, zlecenie: true, kosztorys: false } }) === "B");
check("suggest A — in progress brak zlecenia", suggestInspectorTemplate({ ...baseJob, jobPhase: "in_progress", documents: { ...baseJob.documents, zlecenie: false, kosztorys: true } }) === "A");

const block = buildInspectorReadyMissingBlock(baseJob);
check("ready — zdjęcia", block.readyLines.includes("dokumentacja zdjęciowa"));
check("ready — dokumentacja robót", block.readyLines.includes("dokumentacja robót"));
check("missing — zlecenie", block.missingLines.includes("zlecenia"));
check("missing — kosztorys", block.missingLines.includes("kosztorysu"));

const body = mergeInspectorTemplateBody("D", baseJob, { contactName: "Szymon", senderName: "Dawid" });
check("merge zawiera Po naszej stronie", body.includes("Po naszej stronie dostępne:"));
check("merge zawiera ✓ zdjęcia", body.includes("✓ dokumentacja zdjęciowa"));
check("merge zawiera Brakuje zlecenia", body.includes("• zlecenia"));
check("merge zawiera Brakuje kosztorysu", body.includes("• kosztorysu"));

const payload = buildInspectorTemplateEmailPayload(baseJob, "D", "insp@test.pl", "Szymon", "Temat", body);
check("payload mode inspector_template", payload.mode === "inspector_template");
check("payload photos empty", payload.photos.length === 0);
check("inspectorTemplateEmailHasContent", inspectorTemplateEmailHasContent(body));
check("activity text", inspectorTemplateActivityText("D", "insp@test.pl").includes("Szablon D"));

const contacts = [
  { id: "1", name: "A", email: "a@t.pl", company: "", notes: "", isInspector: false },
  { id: "2", name: "Insp", email: "i@t.pl", company: "", notes: "", isInspector: true },
];
check("contactsForInspector count", contactsForInspector(contacts).length === 1);
check("0 inspector block", contactsForInspector([{ id: "x", name: "", email: "", company: "", notes: "" }]).length === 0);

const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({ test: "inspector-templates-2.1", pass: failed.length === 0, failed: failed.length, results }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
