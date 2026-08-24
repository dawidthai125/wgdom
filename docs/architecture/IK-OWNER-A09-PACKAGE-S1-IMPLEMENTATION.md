# IK-OWNER-A09-PACKAGE-S1 — IMPLEMENTATION

| Field | Value |
|-------|-------|
| **Slice** | `IK-OWNER-A09-PACKAGE-S1` |
| **Owner GO** | `CREATE_APPROVED_FOR_NEXT_SLICE` |
| **Date** | 2026-08-23 |
| **Baseline** | HEAD **`f012d39a`** · origin/main **`f012d39a`** |
| **Decision SSOT** | [`IK-OWNER-CREATE-A09-PACKAGE-DECISION.md`](./IK-OWNER-CREATE-A09-PACKAGE-DECISION.md) |
| **COMMIT** | **NO** (awaiting Owner GO) |
| **PUSH / DEPLOY** | **NO** |

```text
VERDICT = A09-PACKAGE-S1 IMPLEMENTED — PASS (local + dry-run)
KV_EXECUTE = PENDING_OWNER_GO
IDENTITY_MAPPING_DELTA = 0
```

---

## 1. Baseline

| Check | Value |
|-------|-------|
| **HEAD / origin/main** | `f012d39a` |
| **Identity registry rows** | **4** (unchanged) |
| **A01-S1 / A01-LP5** | **FROZEN** — not modified |
| **Rejected LABOR host** | `p2b-scianka-gk-na-stelazu-m2` — not used |

---

## 2. Owner decision reference

- **Policy:** `CREATE_APPROVED_FOR_NEXT_SLICE` per [`IK-OWNER-CREATE-A09-PACKAGE-DECISION.md`](./IK-OWNER-CREATE-A09-PACKAGE-DECISION.md)
- **Proposed workId:** `cc-w2-scianki-dzialowe-gr-pakiet-m2`
- **Plane:** PACKAGE (via `costSplit` 0.5 / 0.5)
- **No** `WORK_RATE_IDENTITY_MAPPINGS` append
- **No** G177 alias
- **No** reuse of LABOR host `p2b-scianka-gk-na-stelazu-m2` or rate **118**

---

## 3. Exact G177 evidence

**Verbatim BOQ (provenance constant only):**

```text
Ścianki działowe GR z płyt gipsowo-kartonowych na rusztach metalowych pojedynczych z pokryciem obustronnym jednowarstwowo 55-01
```

| Field | Value |
|-------|-------|
| **Source** | `.tmp/p525-batch-38-pilot.json` group `177` |
| **Unit** | m2 |
| **Domain** | PACKAGE / `LABOR_MATERIAL_PACKAGE` |
| **KNR ref** | 55-01 (description provenance only) |

---

## 4. Created workId

```text
cc-w2-scianki-dzialowe-gr-pakiet-m2
```

---

## 5. PACKAGE fields

| Field | Value |
|-------|-------|
| **id** | `cc-w2-scianki-dzialowe-gr-pakiet-m2` |
| **namePl** | `Ścianki działowe GR — pakiet GK (ruszt, obustronnie)` |
| **unit** | `m2` |
| **tradeId** | `SCIANY_GK` |
| **source** | `custom` |
| **costSplit** | `materialRatio: 0.5` · `laborRatio: 0.5` |
| **active** | `true` |
| **companyPricePln** | `0` |
| **freshnessStatus** | `missing` |
| **ourWorkRate** | **absent** |
| **descriptionPl** | G177 P525 · KNR 55-01 provenance |

**Domain classification:** `costSplit` ≥ 0.25 / 0.25 → `LABOR_MATERIAL_PACKAGE` (mirrors `ik-p5-internal-first-index` private classifier).

---

## 6. Rate decision

| Item | Decision |
|------|----------|
| **RATE_STATUS** | **`PENDING_OWNER_INPUT`** |
| **companyPricePln** | `0` (explicit placeholder — not 118) |
| **ourWorkRate** | **not set** |
| **LABOR host copy** | **FORBIDDEN** |
| **Heuristic rate** | **not invented** |

Owner must supply approved PACKAGE rate in a follow-up slice before pricing-dependent flows can treat this row as priced.

---

## 7. OPS mechanism

**Pattern:** Reuse A01-LP5 OPS (`applyA01Lp5CatalogSeed` / `catalog-ik-owner-a01-lp5-ops.mjs`).

| Artifact | Role |
|----------|------|
| `src/lib/work-catalog/ik-owner-create-a09-package-catalog.ts` | CatalogWork draft builder |
| `src/lib/work-catalog/ik-owner-create-a09-package-ops.ts` | Idempotent merge · conflict guard · LABOR host guard |
| `scripts/catalog-ik-owner-a09-package-ops.mjs` | KV dry-run / `--execute` |
| `src/lib/work-catalog/index.ts` | Minimal re-exports |

**Regions:** `wroclaw` · `dolnyslask`

**Statuses:** `ABSENT` → insert · `PRESENT_OK` → no-op · mismatch → `CONFLICT` stop

---

## 8. KV pre-check (dry-run)

**Command:** `npx vite-node scripts/catalog-ik-owner-a09-package-ops.mjs`

| Check | Result |
|-------|--------|
| **KV fetch** | PASS |
| **Backup** | `.tmp/catalog-ik-owner-a09-package-backup.json` |
| **Before state** | workId **ABSENT** in both regions |
| **Duplicate** | none |
| **Field compatibility** | draft matches `IK_OWNER_A09_PACKAGE_OPS_EXPECTED` |
| **LABOR host** | untouched |
| **Report** | `.tmp/catalog-ik-owner-a09-package-ops-report.json` |

---

## 9. KV execution

| Item | Status |
|------|--------|
| **`--execute`** | **NOT RUN** (awaiting Owner GO for cloud write) |
| **Expected on execute** | `batch-set` `kw-wgdom-work-catalog` both regions seeded |
| **Post-execute verify** | script cloud re-read + `PRESENT_OK` per region |

---

## 10. Idempotency verification

| Layer | Result |
|-------|--------|
| **Unit (OPS-2 / T8)** | second `applyA09PackageCatalogSeed` → `changed=false` · `PRESENT_OK` |
| **Conflict (OPS-3)** | mismatched existing row → `CONFLICT` throw |
| **KV dry-run** | first run would insert (`changed=true`); re-execute after seed → `IDEMPOTENT NO-OP` |

---

## 11. Test results

| Suite | Result |
|-------|--------|
| `scripts/test-ik-owner-a09-package-s1.mjs` (T1–T10) | **15/15 PASS** |
| `scripts/test-catalog-ik-owner-a09-package-ops.mjs` | **12/12 PASS** |
| `scripts/test-labor-identity-mapping-a01-s1.mjs` | **8/8 PASS** |
| `scripts/test-labor-identity-mapping-a01-lp5.mjs` | **14/14 PASS** |
| `scripts/test-catalog-ik-owner-a01-lp5-ops.mjs` | **9/9 PASS** |
| `scripts/test-catalog-wave-2.mjs` | **PASS** (regression) |
| `npm run build` | **PASS** |

### T1–T10 contract

| Test | Assertion |
|------|-----------|
| T1 | workId exact |
| T2 | PACKAGE via costSplit |
| T3 | unit m2 |
| T4 | namePl / G177 description |
| T5 | workId ≠ LABOR host |
| T6 | wroclaw seeded |
| T7 | dolnyslask seeded |
| T8 | idempotent re-run |
| T9 | no rate 118 · no LABOR host id |
| T10 | identity registry still 4 rows · no G177 alias |

---

## 12. A01 invariants

| Case | Expected | Verified |
|------|----------|----------|
| LP4 → oczyszczenie | HIT | PASS (A01-S1) |
| LP5 → impregnacja | HIT | PASS (A01-LP5) |
| LP10 → impregnacja | HIT | PASS (A01-LP5) |
| LP5 → oczyszczenie | MISS | PASS |
| zmywanie | MISS | PASS |
| gruntowanie | MISS | PASS |

**Frozen rows untouched:** `lim-ik-a01-lp4-oczyszczenie-wm` · `lim-ik-a01-lp5-impregnacja-wm` · `cc-w2-oczyszczenie-podloza` · `cc-w2-impregnacja-biobojcza-m2`

---

## 13. Architecture safety

| Guard | Status |
|-------|--------|
| **No identity mapping delta** | PASS (Δ = 0) |
| **No G177 alias** | PASS |
| **No LABOR host reuse** | PASS |
| **No rate 118** | PASS |
| **No packageGate / classification / KNR / Orchestra / F5 / P7 / W6 changes** | PASS |
| **No alias-pack-wave2 changes** | PASS |
| **REUSE insertWorkBothRegions OPS pattern** | PASS (A01-LP5 mirror) |

---

## 14. Git scope

**Files changed (uncommitted):**

| File | Change |
|------|--------|
| `src/lib/work-catalog/ik-owner-create-a09-package-catalog.ts` | **new** |
| `src/lib/work-catalog/ik-owner-create-a09-package-ops.ts` | **new** |
| `src/lib/work-catalog/index.ts` | exports only |
| `scripts/catalog-ik-owner-a09-package-ops.mjs` | **new** |
| `scripts/test-catalog-ik-owner-a09-package-ops.mjs` | **new** |
| `scripts/test-ik-owner-a09-package-s1.mjs` | **new** |
| `docs/architecture/IK-OWNER-A09-PACKAGE-S1-IMPLEMENTATION.md` | **new** |

```text
COMMIT = NO
PUSH = NO
DEPLOY = NO
KV_EXECUTE = PENDING_OWNER_GO
```

---

## Next slice (out of S1 scope)

1. Owner GO → `catalog-ik-owner-a09-package-ops.mjs --execute`
2. Owner GO → commit + push + production verify
3. Separate slice → Owner-priced rate (`ourWorkRate` / `companyPricePln`) when value approved
4. **No** identity mapping in catalog-only slice
