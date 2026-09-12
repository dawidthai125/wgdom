/**
 * CCR-v1 unit tests — KNR 2-02 2006-04 fixture + fail-closed cases.
 * npx vite-node scripts/test-knr-corpus-conflict-resolution-v1.mjs
 */
import assert from "node:assert/strict";

const {
  evaluateKnrCorpusConflictResolutionV1,
  KNR_CORPUS_CONFLICT_RESOLUTION_VERSION,
} = await import(
  "../src/lib/intelligent-estimator/knr-knowledge/knr-corpus-conflict-resolution-v1.ts"
);

const NOW = "2026-09-12T20:00:00.000Z";
const DISPLAY = "KNR 2-02 2006-04";

const candidates = [
  {
    contentHash: "77025d79",
    displayCode: DISPLAY,
    description:
      "Okładziny z płyt gipsowo-kartonowych (suche tynki gipsowe) pojedyncze na stropach na rusztach",
    unit: "m2",
  },
  {
    contentHash: "673a4ce5",
    displayCode: DISPLAY,
    description:
      "Okładziny z płyt gipsowo-kartonowych (suche tynki gipsowe) pojedyncze na stropach",
    unit: "m2",
  },
];

const corroborations = [
  {
    sourceUrl: "https://bazakonkurencyjnosci.funduszeeuropejskie.gov.pl/api/files/1544684",
    description:
      "Okładziny z płyt gipsowo-kartonowych na stropach na rusztach",
    unit: "m2",
    qualityScore: 95,
  },
  {
    sourceUrl: "https://old.zwikprudnik.pl/zalacznik_11a_201702200000.pdf",
    description:
      "Okładziny z płyt gipsowo-kartonowych suche tynki gipsowe pojedyncze na stropach na rusztach",
    unit: "m2",
    qualityScore: 70,
  },
  {
    sourceUrl:
      "https://www.archiwum.bip.inowroclaw.ug.gov.pl/at/1776/2860/przedmiar_robot_budowlany_jaksice_18_04_09.pdf",
    description: "okładziny GKB pojedyncze na stropach na rusztach KNR 2-02 2006-04",
    unit: "m2",
    qualityScore: 90,
  },
];

const targets = [
  {
    id: "obl_300e0d2b",
    description:
      "Okładziny z płyt gipsowo-kartonowych (suche tynki gipsowe) m2 RAZE mb 2006-04 pojedyncze na stropach na rusztach-Płyty GKF",
    unit: "m2",
  },
  {
    id: "obl_1a018f7e",
    description:
      "Okładziny z płyt gipsowo-kartonowych (suche tynki gipsowe) m2 d.2 2006-04 pojedyncze na stropach na rusztach Płyty GKF",
    unit: "m2",
  },
];

const pass = evaluateKnrCorpusConflictResolutionV1({
  displayCode: DISPLAY,
  unit: "m2",
  candidates,
  corroborations,
  targetActivities: targets,
  nowIso: NOW,
});

assert.equal(pass.version, KNR_CORPUS_CONFLICT_RESOLUTION_VERSION);
assert.equal(pass.decision, "CORPUS_CONFLICT_RESOLVED");
assert.equal(pass.winnerContentHash, "77025d79");
assert.deepEqual(pass.loserContentHashes, ["673a4ce5"]);
assert.equal(pass.losersPreserved, true);
assert.equal(pass.mayProceedCanonicalIdentity, true);
assert.equal(pass.athCorpusIngestStillDenied, true);
assert.equal(pass.ownerRuntimeDependency, 0);
assert.ok(pass.corroborationCount >= 2);
assert.ok(pass.distinctiveTokensUsed.includes("rusztach"));

const noCorr = evaluateKnrCorpusConflictResolutionV1({
  displayCode: DISPLAY,
  unit: "m2",
  candidates,
  corroborations: [],
  nowIso: NOW,
});
assert.equal(noCorr.decision, "CORPUS_CONFLICT_FAIL_CLOSED");

const wallTarget = evaluateKnrCorpusConflictResolutionV1({
  displayCode: DISPLAY,
  unit: "m2",
  candidates,
  corroborations,
  targetActivities: [
    {
      id: "bad",
      description: "Okładziny na ścianach bez rusztów",
      unit: "m2",
    },
  ],
  nowIso: NOW,
});
assert.equal(wallTarget.decision, "CORPUS_CONFLICT_FAIL_CLOSED");
assert.ok(wallTarget.targetScopeIncompatibleIds.includes("bad"));

console.log(
  JSON.stringify(
    {
      ok: true,
      pass: {
        decision: pass.decision,
        winner: pass.winnerContentHash,
        losers: pass.loserContentHashes,
        tokens: pass.distinctiveTokensUsed,
        corr: pass.corroborationCount,
      },
    },
    null,
    2,
  ),
);
