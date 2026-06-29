/**
 * NG-02.1A — Unified Attachment Gate unit tests.
 * npx vite-node scripts/test-unified-attachment-gate.mjs
 */

import {
  AttachmentOrigin,
  UnifiedGateReason,
  UnifiedGateStatus,
  attachmentOriginPlatform,
  buildHeavyParseDocumentFingerprint,
  buildHeavyParseDocumentSet,
  canStartHeavyParse,
  deriveUnifiedAttachmentGate,
} from "../src/lib/tender-pipeline/unified-attachment-gate.ts";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";

const TENDER_ID = "bzp-gate-test";

function baseItem(overrides = {}) {
  return {
    id: "gate-item-1",
    tenderId: TENDER_ID,
    noticeNumber: "2026/BZP 00088888",
    title: "Gate test",
    status: "seen",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const bzpDoc = {
  index: 1,
  documentId: "bzp-1",
  filename: "swz.pdf",
  contentType: "application/pdf",
  downloadUrl: "https://bzp.example/swz.pdf",
};

const extFile = (id, url, score = 50) => ({
  id,
  filename: `${id}.pdf`,
  contentType: "application/pdf",
  publicUrl: url,
  storagePath: `ext/${id}`,
  score,
  isSwzHint: false,
  sourcePageUrl: "https://smartpzp.example/doc",
});

let pass = 0;
let fail = 0;

function ok(label, cond) {
  if (cond) {
    pass += 1;
    console.log(`  ✓ ${label}`);
  } else {
    fail += 1;
    console.error(`  ✗ ${label}`);
  }
}

console.log("NG-02.1A Unified Attachment Gate\n");

// T1 — tylko BZP
{
  const item = baseItem({ bzpDocuments: [bzpDoc] });
  const gate = deriveUnifiedAttachmentGate(item);
  ok("T1 gate open BZP", gate.canStartHeavyParse && gate.gateStatus === UnifiedGateStatus.Open);
  ok("T1 reason OpenBzp", gate.gateReason === UnifiedGateReason.OpenBzp);
  ok("T1 docs count 1", gate.heavyParseDocuments.length === 1);
  ok("T1 buildHeavyParseDocumentSet", buildHeavyParseDocumentSet(item).length === 1);
}

// T2 — external only
{
  const item = baseItem({
    bzpDocuments: [],
    externalDocDiscovery: {
      builtAt: new Date().toISOString(),
      files: [
        extFile("e1", "https://ext.example/a.pdf", 80),
        extFile("e2", "https://ext.example/b.pdf", 60),
      ],
      pageLinks: [],
    },
  });
  const gate = deriveUnifiedAttachmentGate(item);
  ok("T2 gate open external-only", gate.canStartHeavyParse);
  ok("T2 reason OpenExternal", gate.gateReason === UnifiedGateReason.OpenExternal);
  ok("T2 mapped docs 2", gate.heavyParseDocuments.length === 2);
  ok("T2 platform enum", gate.heavyParseDocuments[0].platform === attachmentOriginPlatform(AttachmentOrigin.External));
  ok("T2 index >= 10000", gate.heavyParseDocuments[0].index >= 10_000);
}

// T3 — mixed + dedup URL
{
  const sharedUrl = "https://shared.example/doc.pdf";
  const itemDedup = baseItem({
    bzpDocuments: [{ ...bzpDoc, downloadUrl: sharedUrl }],
    externalDocDiscovery: {
      builtAt: new Date().toISOString(),
      files: [extFile("dup", sharedUrl, 99)],
      pageLinks: [],
    },
  });
  const gateDedup = deriveUnifiedAttachmentGate(itemDedup);
  ok("T3 dedup URL", gateDedup.heavyParseDocuments.length === 1);

  const itemMixed = baseItem({
    bzpDocuments: [bzpDoc],
    externalDocDiscovery: {
      builtAt: new Date().toISOString(),
      files: [extFile("e2", "https://ext.example/unique.pdf", 99)],
      pageLinks: [],
    },
  });
  const gateMixed = deriveUnifiedAttachmentGate(itemMixed);
  ok("T3 mixed open", gateMixed.canStartHeavyParse && gateMixed.gateReason === UnifiedGateReason.OpenMixed);
  ok("T3 mixed docs 2", gateMixed.heavyParseDocuments.length === 2);
}

// T4 — upload kosztorys only
{
  const item = baseItem({
    uploadedFile: {
      id: "up-1",
      filename: "kosztorys.ath",
      url: "https://upload.example/k.ath",
    },
  });
  const gate = deriveUnifiedAttachmentGate(item);
  ok("T4 upload canStart", gate.canStartHeavyParse);
  ok("T4 OpenUploadOnly", gate.gateReason === UnifiedGateReason.OpenUploadOnly);
  ok("T4 heavyParseDocuments empty", gate.heavyParseDocuments.length === 0);
}

// T5 — brak załączników
{
  const gate = deriveUnifiedAttachmentGate(baseItem());
  ok("T5 closed", !gate.canStartHeavyParse && gate.gateStatus === UnifiedGateStatus.Closed);
  ok("T5 NoAttachments", gate.gateReason === UnifiedGateReason.NoAttachments);
}

// T6 — heavy done
{
  const item = baseItem({
    bzpDocuments: [bzpDoc],
    tenderDossier: {
      brief: { title: "T" },
      kosztorys: { ok: true, rowCount: 1, parsedAt: new Date().toISOString() },
      parserVersion: CURRENT_PARSER_VERSION,
      scanSummary: { parsedAt: new Date().toISOString(), kosztorysFound: true },
      builtAt: new Date().toISOString(),
    },
  });
  const gate = deriveUnifiedAttachmentGate(item);
  ok("T6 heavy done closed", !gate.canStartHeavyParse);
  ok("T6 HeavyDone reason", gate.gateReason === UnifiedGateReason.HeavyDone);
}

// T7 — external max 6 (score desc)
{
  const files = Array.from({ length: 8 }, (_, i) =>
    extFile(`f${i}`, `https://ext.example/${i}.pdf`, i * 10),
  );
  const item = baseItem({
    externalDocDiscovery: { builtAt: new Date().toISOString(), files, pageLinks: [] },
  });
  const docs = buildHeavyParseDocumentSet(item);
  ok("T7 max 6 external", docs.length === 6);
  ok("T7 highest score first", docs[0].documentId === "ext-f7");
}

// Skrót canStartHeavyParse
ok("canStartHeavyParse shortcut", canStartHeavyParse(baseItem({ bzpDocuments: [bzpDoc] })));

// Fingerprint stabilny
{
  const item = baseItem({ bzpDocuments: [bzpDoc] });
  const a = buildHeavyParseDocumentFingerprint(item);
  const b = buildHeavyParseDocumentFingerprint(item);
  ok("fingerprint stable", a === b && a.length > 0);
}

// No tender id
{
  const gate = deriveUnifiedAttachmentGate(baseItem({ tenderId: "" }));
  ok("no tenderId", !gate.canStartHeavyParse && gate.gateReason === UnifiedGateReason.NoTenderId);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
