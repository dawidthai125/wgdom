# IK AUTONOMY-05 — Explicit AUTO / OFF / ON · IMPLEMENTATION CLOSEOUT

| Field | Value |
|-------|-------|
| **Status** | **COMPLETE / PRODUCTION VERIFIED** · **EPIC NOT CLOSED** |
| **Date** | 2026-08-17 |
| **UI version** | **2.66.90** |
| **Production** | **2.66.90** / live **`44e81d2`** · impl **`44e81d20`** (`44e81d202af2c512717fe7be9ddec43468aca760`) |
| **Deploy** | Vercel Git Integration · ID **`F9t4hD4kKmXNeV6zVL49ywJmiHwP`** · origin/main |
| **OD-2** | **APPROVED** — Option B (same keys, string union, no new flag) |
| **OD-2b** | **ACCEPTED** — B-POLICY `true→ON` · `missing→AUTO` · `false→AUTO` |
| **DF** | [`IK-AUTONOMY-05-EXPLICIT-AUTO-OFF-ON-DESIGN-FREEZE.md`](./IK-AUTONOMY-05-EXPLICIT-AUTO-OFF-ON-DESIGN-FREEZE.md) |
| **ARCH REVIEW** | PASS WITH CONDITIONS · C1–C6 **implemented** |
| **PV** | [`IK-AUTONOMY-05-PRODUCTION-VERIFY.md`](./IK-AUTONOMY-05-PRODUCTION-VERIFY.md) |
| **Owner Verify** | **PASS WITH FINDINGS** (non-blocking) |
| **D** | **HARD STOP / false** (diff 0) |
| **CatalogWork** | **471** UNCHANGED |
| **P1** | **CLOSED** (unchanged · `mat.inv.*` blocked) |
| **P2** | **KEEP GAP** (unchanged) |
| **Composite** | **CLOSED** (unchanged consumer) |
| **EPIC CLOSE** | **NOT CLOSED** (docs commit / EPIC close = osobna tura) |

> **★★ CURRENT RUNTIME AMENDMENT (2026-09-05):** Expert Chain gate = **`expertChainMayProceed`** · Document readiness = **`readyForExperts`** · Master §2A.9 · line-tolerant **CLOSED/PV** @ **`a5d19047`**. Historical closeout eligibility text citing sole `readyForExperts` = era HISTORY.

```text
IMPLEMENTATION         = PASS
OWNER VERIFY           = PASS WITH FINDINGS
COMMIT                 = 44e81d20
PUSH                   = PASS
DEPLOY                 = PASS
PRODUCTION VERIFY      = PASS
DOCUMENTATION CLOSEOUT = READY
PRODUCTION             = 2.66.90 / 44e81d20
EPIC                   = NOT CLOSED
```

---

## 1. Owner decisions (frozen)

| Decision | Result |
|----------|--------|
| **OD-2** | **APPROVED** — Option B |
| **OD-2b** | **ACCEPTED** — B-POLICY |
| Option | **B** — te same klucze, bez nowej flagi |

Klucze (bez nowej flagi):

| Key | Typ |
|-----|-----|
| `ikLaborE2eEnabled` | `"AUTO" \| "OFF" \| "ON"` |
| `ikMaterialE2eEnabled` | `"AUTO" \| "OFF" \| "ON"` |

### B-POLICY (legacy boolean)

| Stored | Normalized |
|--------|------------|
| `true` | **ON** |
| missing / unknown | **AUTO** |
| `false` | **AUTO** (never OFF) |

Jawny HOLD po migracji = wyłącznie zapisane **`"OFF"`**. Legacy `false` **nie** jest explicit kill-switch.

---

## 2. Runtime contract

```text
AUTO → MODE A   (read-only · executeResearch=false)
ON   → MODE A   (read-only · executeResearch=false)
OFF  → HOLD     (explicit Owner kill-switch)

MODE A RUN = ikEntryEnabled
             ∧ masterBoq.readyForExperts
             ∧ mode ∈ {AUTO, ON}
             ∧ executeResearch = false
```

| Mode | P5 Labor | P6 Material |
|------|----------|-------------|
| AUTO | MODE A | MODE A |
| ON | MODE A | MODE A |
| OFF | HOLD | HOLD |

**C1 — OFF wins in merge:** `remote === "OFF"` OR `local === "OFF"` → `"OFF"`. Nigdy `|| true`. Nigdy `false→OFF`.

**C6 — defaults:** `defaultAppSettings()` → P5 **AUTO** · P6 **AUTO**. Research levers pozostają `false`.

Research = **osobny boolean** · **CONDITIONAL** · `executeResearch === true` tylko gdy:

```text
ikEntryEnabled === true
∧ isIkE2eModeActive(mode)   // AUTO|ON → boolean true
∧ ikLaborResearchEnabled === true   // analogicznie P6
```

**AUTO nie wynika w Research.** Raw enum `"AUTO"` **nie** jest `=== true` (C3). MODE B wymaga osobnego checkboxa.

---

## 3. Owner boundaries (unchanged)

| Boundary | Status |
|----------|--------|
| Research Accept | **OWNER** |
| OUR RATE / Price Commit | **OWNER** |
| Material Accept | **OWNER** |
| Final Bid | **OWNER** |
| D (`expertAiDecydentEnabled`) | **HARD STOP / false** |

AUTONOMY-05 **nie** automatyzuje Accept / Price Commit / Final Bid / D.

---

## 4. Safety (locked)

| Invariant | Status |
|-----------|--------|
| no new engine | **PASS** — reuse `IkEntryHost` `useEffect` |
| no new flag | **PASS** — same keys |
| no default bypass / `\|\| true` | **PASS** |
| no new orchestrator | **PASS** — comment-only on host |
| P1 CLOSED | **PASS** — `mat.inv.*` blocked |
| P2 KEEP GAP | **PASS** — `cc-w2-zawor-odcinajacy` · `cc-p0c-w1-zawor-odpowietrzajacy` |
| Composite CLOSED | **PASS** — existing BOTH_HOLD consumer |
| F5 XOR | **PASS** — `feedsP7Bid=false` |
| CatalogWork | **471** |
| `computePositionCost()` | **UNCHANGED** (not in `44e81d20`) |

---

## 5. Migration safety · mixed-client fail-safe

| Path | Behaviour |
|------|-----------|
| Load | `normalizeIkE2eMode` — B-POLICY, idempotent AUTO/OFF/ON |
| Merge | **OFF wins** (C1) |
| Save | full `AppSettings` JSON — enum survives KV |
| Coordinated release (C2) | load + merge + defaults + helpers + Admin UI + harness **in one deploy** |
| Rollback / mixed-client (C4) | stary bundle `value === true` na stringach `"AUTO"|"OFF"|"ON"` → **HOLD** · Research OFF · **fail-safe** (nie auto-write) |
| Fresh install (C6) | P5/P6 **AUTO** · Research **false** · D **false** |

Okno mixed-client: stary PWA może zapisać boolean `false` nad remote `"OFF"` → nowy kod B-POLICY mapuje `false→AUTO`. Mitygacja = jeden Vercel Git deploy + Version Awareness. **Nie** mapować `false→OFF`.

---

## 6. Files in feature commit `44e81d20`

| File | Role |
|------|------|
| `src/lib/app-settings.ts` | `IkE2eMode` · `parse`/`normalize`/`mergeIkE2eMode` · load/defaults AUTO |
| `src/lib/intelligent-estimator/ik-entry-flag.ts` | AUTO/ON active · OFF HOLD · research 3× `=== true` |
| `src/lib/intelligent-estimator/index.ts` | export helpers |
| `src/app/AdminSettingsModal.tsx` | `<select>` AUTO/OFF/ON + confirm → OFF |
| `src/app/intelligent-estimator/IkEntryHost.tsx` | comment-only — existing binding |
| `src/app/changelog-data.ts` / `CHANGELOG.md` | **2.66.90** |
| `scripts/test-ik-autonomy-05-explicit-auto-off-on.mjs` | T01–T25 |
| `scripts/test-ik-migration-01-p5…p8-implementation.mjs` | default/merge asserts |
| DF / PLAN / OD-2 / ARCH-REVIEW | prior docs in same commit |

**Not changed:** Labor/Material engines · Composite adapter · P1 G1/G2 · P2 identity · F5 · `engine.ts` / `computePositionCost` · CatalogWork · Accept UI · D.

---

## 7. Test results (implementation / Owner Verify)

| Suite | Result |
|-------|--------|
| AUTONOMY-05 T01–T25 | **76 PASS / 0 FAIL** |
| P5 | **44 PASS / 0 FAIL** |
| P6 | **46 PASS / 0 FAIL** |
| P7 | **43 PASS / 0 FAIL** |
| P8 | **67 PASS / 0 FAIL** |
| Build | **PASS** |
| P1 | **PASS** |
| P2 / P5.9 | **PASS** |
| Composite | **PASS** |
| P0 `computePositionCost` | **46 / 0** |
| P10 | **26 / 0** |

---

## 8. Owner Verify findings (non-blocking)

1. Admin MODE B copy nadal mówi „tylko gdy E2E ON” — stale copy · **OUT OF SCOPE**.
2. Working tree miał unrelated WIP — commit użył jawnego `git add` (nigdy `-A`).
3. CatalogWork 471 potwierdzone na PV (live Edge read).

---

## 9. Real-tender qualifier

Paczka VII `08decd1d-542e-312b-5fad-9500015f7011` · BOQ READY / 159 · **COMPOUND/BOTH_HOLD = 0**.

**Composite consumer = IDLE / CORRECT.**

**T04 HIT+HIT jest fixture evidence.**

Nie claimować live tender composition. AUTONOMY-05 weryfikuje kontrakt P5/P6 AUTO\|OFF\|ON, nie ponowne złożenie Material+Labor na tej paczce.

---

## 10. Status

```text
PRODUCTION VERIFY      = PASS
DOCUMENTATION CLOSEOUT = READY
09                     = UPDATED (this closeout set)
Commit (docs)          = NOT DONE
Push                   = NOT DONE
EPIC                   = NOT CLOSED
```

Prior: [`PLAN`](./IK-AUTONOMY-05-EXPLICIT-AUTO-OFF-ON-PLAN.md) · [`OD-2`](./IK-AUTONOMY-05-OD2-OWNER-DECISION.md) · [`DF`](./IK-AUTONOMY-05-EXPLICIT-AUTO-OFF-ON-DESIGN-FREEZE.md) · [`ARCH REVIEW`](./IK-AUTONOMY-05-EXPLICIT-AUTO-OFF-ON-ARCH-REVIEW.md)
