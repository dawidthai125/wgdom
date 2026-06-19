/**
 * TP192A — host detection shortcut (skip readmodels probe).
 * npx vite-node scripts/test-tender-host-detection-tp192a.mjs
 */
import {
  shouldSkipReadmodelsProbe,
  detectOffPlatformHosts,
  extractPlatformazakupowaTransakcjaId,
  extractLogintradePageUrls,
} from "../src/lib/tender-platform-adapters.ts";

const assert = (name, cond) => {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`  ✓ ${name}`);
};

const PZ_HTML = `
Ogłoszenie o zamówieniu. Dokumentacja dostępna pod adresem:
https://platformazakupowa.pl/transakcja/1319989
`;

const LT_HTML = `
Zapytanie ofertowe — dokumentacja:
https://firmax.logintrade.net/zapytania_email/abc123/DocumentService
`;

const EZ_HTML = `
Szczegóły postępowania:
https://zamawiajacy.ezamawiajacy.pl/pn/ABC123/demand/99/notice/public/details
`;

const BZP_HTML = `
Ogłoszenie BZP o zamówieniu publicznym na remont budynku.
Dokumentacja w załącznikach do ogłoszenia w e-Zamówieniach.
https://ezamowienia.gov.pl/mo-board/api/v1/Board/GetNoticeDetails?noticeNumber=2026/BZP%2000123456
`;

console.log("TP192A host detection\n");

// TP192A-1
assert("TP192A-1 platformazakupowa → probe skipped", shouldSkipReadmodelsProbe(PZ_HTML));
assert("TP192A-1 detects PZ host", detectOffPlatformHosts(PZ_HTML).includes("platformazakupowa"));
assert("TP192A-1 transakcja id", extractPlatformazakupowaTransakcjaId(PZ_HTML) === "1319989");

// TP192A-2
assert("TP192A-2 logintrade → probe skipped", shouldSkipReadmodelsProbe(LT_HTML));
assert("TP192A-2 detects logintrade host", detectOffPlatformHosts(LT_HTML).includes("logintrade"));
assert("TP192A-2 logintrade page urls", extractLogintradePageUrls(LT_HTML).length >= 1);

// TP192A-3
assert("TP192A-3 ezamawiajacy → probe skipped", shouldSkipReadmodelsProbe(EZ_HTML));
assert("TP192A-3 detects ezamawiajacy host", detectOffPlatformHosts(EZ_HTML).includes("ezamawiajacy"));

// TP192A-4
assert("TP192A-4 BZP/e-Zamówienia → probe executes", !shouldSkipReadmodelsProbe(BZP_HTML));
assert("TP192A-4 empty html → probe executes", !shouldSkipReadmodelsProbe(""));
assert("TP192A-4 smartpzp alone does not skip readmodels", !shouldSkipReadmodelsProbe("https://smartpzp.pl/tender/1"));

console.log("\nTP192A host detection: ALL PASS");
