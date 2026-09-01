/**
 * READ-ONLY real public KNR research — no cloud write · no commit · no invent.
 * Run: npx vite-node scripts/real-public-knr-readonly.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PUBLIC_KNR_SOURCE_REGISTRY,
  selectPublicKnrRegistrySources,
  buildPublicKnrEffectiveAllowlist,
} from "../src/lib/intelligent-estimator/ik-public-knr-source-registry.ts";
import { buildPublicKnrQueryPlan } from "../src/lib/intelligent-estimator/ik-public-knr-query.ts";
import { extractKnrDiscoveryFactFromDocumentText } from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-fact-extract.ts";
import { evaluateKnrDiscoveryHttpLegalGate } from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-http-legal.ts";
import { buildCatalogBasisFromRawCode } from "../src/lib/tenders-bzp-brief.ts";
import {
  foldIdentityKeyV2,
  parseIdentityPartialFromCatalogBasis,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-identity-v2.ts";
import { validateMultiSourcePublicKnr } from "../src/lib/intelligent-estimator/ik-public-knr-validation.ts";
import { extractKnrDiscoveryPdfTextFromBytes } from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-pdf-text.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", ".tmp-public-knr-readonly");
mkdirSync(OUT, { recursive: true });

const TARGETS = [
  {
    label: "1124-01 KNR-W",
    rawCode: "KNR-W 4-03 1124-01",
    description: "Demontaż łączników instalacyjnych podtynkowych",
  },
  {
    label: "1124-01 KNR alias",
    rawCode: "KNR 4-03 1124-01",
    description: "Demontaż łączników instalacyjnych",
  },
  {
    label: "0402-03 RCD",
    rawCode: "KNR 13-21 0402-03",
    description: "Badanie wyłącznika przeciwporażeniowego różnicowo-prądowego",
  },
];

const MAX_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 25_000;

async function fetchPublicText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "text/html,application/pdf,*/*" },
      redirect: "follow",
    });
    const ct = res.headers.get("content-type") ?? "";
    if (res.status === 402) {
      return { ok: false, reason: "PAYWALL", httpStatus: res.status, url };
    }
    if (res.status === 401) {
      return { ok: false, reason: "PAYWALL", httpStatus: res.status, url };
    }
    if (!res.ok) {
      return { ok: false, reason: "HTTP_ERROR", httpStatus: res.status, url };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return { ok: false, reason: "CONTENT_TOO_LARGE", httpStatus: res.status, url };
    }
    let bodyText = "";
    if (/pdf/i.test(ct) || url.toLowerCase().endsWith(".pdf")) {
      const pdf = await extractKnrDiscoveryPdfTextFromBytes(new Uint8Array(buf));
      bodyText = pdf.ok ? pdf.text : "";
    } else {
      bodyText = buf.toString("utf8");
    }
    return {
      ok: true,
      url: res.url || url,
      httpStatus: res.status,
      contentType: ct,
      bodyText,
      bytes: buf.length,
    };
  } catch (e) {
    return {
      ok: false,
      reason: "FETCH_ERROR",
      message: String(e?.message ?? e),
      url,
    };
  } finally {
    clearTimeout(t);
  }
}

function missFromRaw(rawCode, description) {
  const basis = buildCatalogBasisFromRawCode(rawCode);
  if (!basis) return null;
  const partial = parseIdentityPartialFromCatalogBasis(basis);
  return {
    evidenceKeyV1: String(basis.normalizedKey ?? ""),
    identityKeyV2: foldIdentityKeyV2(partial),
    family: String(partial.family ?? "KNR"),
    displayCode: rawCode,
    normalizedKey: String(basis.normalizedKey ?? ""),
    identity: {
      family: partial.family,
      catalog: partial.catalog,
      table: partial.table,
      item: partial.item,
    },
    description,
  };
}

const report = {
  generatedAt: new Date().toISOString(),
  invent: false,
  allowlistCount: buildPublicKnrEffectiveAllowlist(null).length,
  registryCount: PUBLIC_KNR_SOURCE_REGISTRY.filter((e) => e.active).length,
  targets: [],
};

for (const target of TARGETS) {
  const queryPlan = buildPublicKnrQueryPlan({
    rawCode: target.rawCode,
    description: target.description,
  });
  const miss = missFromRaw(target.rawCode, target.description);
  const reg = selectPublicKnrRegistrySources({
    miss,
    queries: queryPlan.queries,
    maxSources: 5,
  });

  const entry = {
    label: target.label,
    requestedCode: target.rawCode,
    normalizedCode: miss?.evidenceKeyV1 ?? queryPlan.evidenceKeyV1,
    queries: queryPlan.queries.slice(0, 10),
    registrySourceIds: reg.sourceIds,
    registryReason: reg.reason,
    sources: [],
    extractedRecords: [],
    validation: null,
    verificationStatus: "PENDING_VERIFY",
    confidence: "NONE",
    bomStatus: "BOM_NOT_COMPLETE",
  };

  const extracted = [];
  for (const src of [...reg.matchedEntries]
    .sort((a, b) => {
      const aHtml = a.url.includes(".html") ? 1 : 0;
      const bHtml = b.url.includes(".html") ? 1 : 0;
      return bHtml - aHtml;
    })
    .slice(0, 5)) {
    const allow = buildPublicKnrEffectiveAllowlist(null).find(
      (a) => a.sourceId === src.sourceId,
    );
    const legal = evaluateKnrDiscoveryHttpLegalGate(allow?.originId ?? src.originId);
    const sourceRow = {
      sourceId: src.sourceId,
      sourceUrl: src.url,
      sourceKind: src.sourceKind,
      title: src.title,
      legalOk: legal.ok,
      legalCodes: legal.codes,
      fetched: null,
    };

    if (!legal.ok) {
      sourceRow.fetched = { ok: false, reason: "LEGAL_GATE", codes: legal.codes };
      entry.sources.push(sourceRow);
      continue;
    }

    const fetched = await fetchPublicText(src.url);
    sourceRow.fetched = fetched;
    entry.sources.push(sourceRow);

    if (fetched.ok && fetched.bodyText) {
      const fact = extractKnrDiscoveryFactFromDocumentText(fetched.bodyText, {
        expectedCode: target.rawCode,
        evidenceKeyV1: miss?.evidenceKeyV1 ?? queryPlan.evidenceKeyV1,
        sourceId: src.sourceId,
        sourceUrlHash: `ro-${src.sourceId}`,
      });
      if (fact?.description && fact?.unit) {
        extracted.push({
          family: miss?.family ?? "KNR",
          catalogId: miss?.identity?.catalog ?? null,
          positionCode: miss?.identity?.table && miss?.identity?.item
            ? `${miss.identity.table}-${miss.identity.item}`
            : "",
          description: fact.description,
          unit: fact.unit,
          sourceUrl: fetched.url,
          sourceId: src.sourceId,
          sourceKind: src.sourceKind,
          extractionStatus: fact.extractionStatus,
        });
      }
    }
  }

  if (miss && extracted.length) {
    const records = extracted.map((e) => ({
      family: e.family,
      chapter: null,
      catalogId: e.catalogId,
      positionCode: e.positionCode,
      description: e.description,
      unit: e.unit,
      materials: null,
      sourceUrl: e.sourceUrl,
      sourceHash: `ro-${e.sourceId}`,
      sourceKind: e.sourceKind,
      sourceTier: "PUBLIC_TENDER_OFFICIAL",
      sourceId: e.sourceId,
      retrievedAt: report.generatedAt,
      bomComplete: false,
    }));
    const v = validateMultiSourcePublicKnr({
      records,
      miss,
      descriptionHint: target.description,
    });
    entry.validation = {
      discoveryStatus: v.discoveryStatus,
      confidence: v.confidence,
      rejectedCrossFamily: v.rejectedCrossFamily,
    };
    entry.extractedRecords = v.validated.map((x) => ({
      description: x.record.description,
      unit: x.record.unit,
      sourceUrl: x.record.sourceUrl,
      score: x.score,
      bomStatus: x.bomStatus,
    }));
    entry.confidence = v.confidence;
    entry.bomStatus = v.validated[0]?.bomStatus ?? "BOM_NOT_COMPLETE";
  }

  report.targets.push(entry);
  console.log("\n===", target.label, "===");
  console.log("normalized:", entry.normalizedCode);
  console.log("registry sources:", entry.registrySourceIds.join(", ") || "(none)");
  for (const s of entry.sources) {
    console.log(
      " -",
      s.sourceKind,
      s.sourceUrl,
      s.fetched?.ok ? `OK ${s.fetched.httpStatus}` : `SKIP ${s.fetched?.reason}`,
    );
  }
  for (const r of entry.extractedRecords) {
    console.log(" EXTRACT:", r.description?.slice(0, 80), "|", r.unit, "| conf=", entry.confidence);
  }
  console.log(" verificationStatus: PENDING_VERIFY (never auto VERIFIED)");
}

const outPath = join(OUT, "real-public-knr-report.json");
writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
console.log("\nReport:", outPath);
console.log("READ-ONLY complete · invent=false · no catalog write");
