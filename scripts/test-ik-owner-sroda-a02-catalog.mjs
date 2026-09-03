/**
 * EPIC A / A0.2 — verify 8 CatalogWork design freeze + OPS seed (no KV).
 *
 * npx vite-node scripts/test-ik-owner-sroda-a02-catalog.mjs
 */
import {
  IK_OWNER_SRODA_A02_WORKS,
  IK_OWNER_SRODA_A02_WORK_IDS,
  applySrodaA02CatalogSeed,
  assertSrodaA02NoConflictOrStop,
  buildAllSrodaA02CatalogWorks,
  buildSrodaA02CatalogWork,
  workMatchesSrodaA02Spec,
} from "../src/lib/work-catalog/ik-owner-create-sroda-a02-ops.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import { getWorkByIdFromStore } from "../src/lib/work-catalog/catalog-work-utils.ts";
import { detectOfferBoqWorkObjectMarkers } from "../src/lib/tender-offer-boq-object-consistency.ts";
import { foldPolishText } from "../src/lib/wgdom-ath-classifier.ts";

const NOW = "2026-09-03T00:00:00.000Z";
let passed = 0;
let failed = 0;
function ok(name, cond, extra) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

function freshStore() {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    updatedAt: NOW,
    catalogs: {
      wroclaw: { works: [], updatedAt: NOW },
      dolnyslask: { works: [], updatedAt: NOW },
    },
  });
}

/** Środa BOQ samples used in A0.2 forbid checks (one per LP). */
const LINE_BY_LP = {
  "2": "Wymiana baterii natryskowej",
  "3": "Wymiana brodzika i kabiny natryskowej",
  "4": "Wymiana syfonu z tworzywa sztucznego o śr. 50 mm - brodziki",
  "5": "Wymiana podejścia z rur z PVC o śr. 50 mm łączonych metodą wciskową - prysznic",
  "6": "Wymiana umywalki porcelanowej bez wsporników z kpl d.1 0220-04 syfonem z tworzywa 1,0 * 5",
  "7": "Wymiana zlewozmywaka blaszanego emaliowanego",
  "8": "Wymiana syfonu z tworzywa sztucznego o śr. 50 mm-szt d.1 0213-01 zlewozmywaki 4",
  "10": "Wymiana ustępu z miską porcelanową 'Kompakt'",
  "11": "Podejście dopływowe do płuczek ustępowych elastyczne z szt d.1 0105-08 tworzywa 1,0 * 4",
  "12": "Wymiana podejścia z rur z PVC o śr. 110 mm łączonych metodą wciskową",
  "13": "BC-02 Wypełnienie spoin masą silikonową o wym. 6x6 mm m d.1 0312-01 25,00 * 2",
  "16": "Demontaż starych i montaż nowych okien rozwieranych i m2 d.2 0928-09 uchylno-rozwieranych dwudzielnych z PCV o pow. do 2.0 m2",
  "17": "Demontaż starych i montaż nowych drzwi balkonowych z m2 d.2 0928-12 PCV 0,9 * 2,05 * 4",
  "18": "Demontaż ościeżnic stalowych lub krat okiennych o m2 d.2 0354-08 powierzchni ponad 2 m2",
  "19": "Drzwi zewnętrzne pełne jednoskrzydłowe bez naświetli o m2 d.2 1027-02 powierzchni ponad 1.5 m2",
  "20": "Demontaż starych i montaż nowych parapetów zewnętrznych",
};

const FORBID = {
  "p2b-wymiana-brodzika-kabiny-kpl": ["2", "4", "5", "6", "7", "8", "10", "11", "12"],
  "p2b-wymiana-syfonu-szt": ["2", "3", "5", "6", "7", "10", "11", "12"],
  "p2b-wymiana-podejscia-pvc-szt": ["2", "3", "4", "6", "7", "8", "10"],
  "p2b-wymiana-ustepu-kompakt-kpl": ["2", "3", "4", "5", "6", "7", "8", "11", "12"],
  "p2b-wymiana-okien-m2": ["17", "18", "19"],
  "p2b-demontaz-oscieznic-krat-okiennych-m2": ["16", "17", "19"],
};

ok("COUNT exactly 8 specs", IK_OWNER_SRODA_A02_WORKS.length === 8);
ok(
  "COUNT unique ids",
  new Set(IK_OWNER_SRODA_A02_WORK_IDS).size === 8 &&
    IK_OWNER_SRODA_A02_WORK_IDS.length === 8,
);

{
  const drafts = buildAllSrodaA02CatalogWorks(NOW);
  ok("drafts length 8", drafts.length === 8);
  const ids = drafts.map((d) => d.id);
  ok("drafts unique ids", new Set(ids).size === 8);

  for (const spec of IK_OWNER_SRODA_A02_WORKS) {
    const d = drafts.find((x) => x.id === spec.id);
    ok(`${spec.id} descriptionPl === ""`, d?.descriptionPl === "");
    ok(
      `${spec.id} matches freeze`,
      workMatchesSrodaA02Spec(d, spec),
      d,
    );
    ok(
      `${spec.id} keywords 1:1`,
      JSON.stringify(d?.keywords) === JSON.stringify([...spec.keywords]),
    );
    ok(`${spec.id} namePl`, d?.namePl === spec.namePl);
    ok(`${spec.id} tradeId`, d?.tradeId === spec.tradeId);
    ok(`${spec.id} unit`, d?.unit === spec.unit);
  }
}

// podejscie must NOT invent ustep fixture from metadata
{
  const spec = IK_OWNER_SRODA_A02_WORKS.find(
    (w) => w.id === "p2b-wymiana-podejscia-pvc-szt",
  );
  const w = buildSrodaA02CatalogWork(spec, NOW);
  const m = detectOfferBoqWorkObjectMarkers(w);
  ok("podejscie podejscie marker", m.podejscie === true);
  ok("podejscie NO ustep fixture", !m.fixtures.has("ustep"), [...m.fixtures]);
  ok("podejscie NO syfon", m.syfon === false);
}

// Metadata-induced keyword/name FP on forbid LPs = 0
{
  let metaFp = 0;
  const hits = [];
  for (const spec of IK_OWNER_SRODA_A02_WORKS) {
    const work = buildSrodaA02CatalogWork(spec, NOW);
    const forbid = FORBID[spec.id] || [];
    for (const lp of forbid) {
      const hay = foldPolishText(LINE_BY_LP[lp] || "");
      if (!hay) continue;
      const kwHits = (work.keywords || []).filter((kw) => {
        const k = foldPolishText(kw);
        return k.length >= 3 && hay.includes(k);
      });
      const nameHits = foldPolishText(work.namePl)
        .split(/\s+/)
        .filter((t) => t.length >= 4 && hay.includes(t));
      const descHits = foldPolishText(work.descriptionPl || "")
        .split(/\s+/)
        .filter((t) => t.length >= 5 && hay.includes(t));
      if (kwHits.length || nameHits.length || descHits.length) {
        metaFp += 1;
        hits.push({ id: spec.id, lp, kwHits, nameHits, descHits });
      }
    }
  }
  ok("metadata-induced FP count === 0", metaFp === 0, hits);
}

// OPS seed
{
  const r1 = applySrodaA02CatalogSeed(freshStore(), NOW);
  ok("OPS changed on empty", r1.changed === true);
  for (const spec of IK_OWNER_SRODA_A02_WORKS) {
    const w = getWorkByIdFromStore(r1.store, spec.id, "wroclaw");
    const d = getWorkByIdFromStore(r1.store, spec.id, "dolnyslask");
    ok(`OPS wroclaw ${spec.id}`, workMatchesSrodaA02Spec(w, spec));
    ok(`OPS dolnyslask ${spec.id}`, workMatchesSrodaA02Spec(d, spec));
    // store normalizes "" → undefined — still empty semantically
    ok(
      `OPS ${spec.id} empty description`,
      w.descriptionPl == null || w.descriptionPl === "",
    );
  }
  const r2 = applySrodaA02CatalogSeed(r1.store, NOW);
  ok("OPS idempotent", r2.changed === false);
}

// conflict
{
  const store = freshStore();
  const bad = buildSrodaA02CatalogWork(IK_OWNER_SRODA_A02_WORKS[0], NOW);
  bad.namePl = "Wrong";
  store.catalogs.wroclaw.works = [bad];
  store.catalogs.dolnyslask.works = [{ ...bad }];
  let threw = false;
  try {
    applySrodaA02CatalogSeed(store, NOW);
  } catch (e) {
    threw = String(e.message || e).includes("CONFLICT");
  }
  ok("OPS conflict stops", threw);
  ok(
    "assert ABSENT",
    assertSrodaA02NoConflictOrStop(null, IK_OWNER_SRODA_A02_WORKS[0]) === "ABSENT",
  );
}

console.log(`\nSRODA-A02 CATALOG TEST: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
