# IK AUTONOMY-08 P0 — Documents → BOQ Autonomous Activation  
## OWNER VERIFY

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-OWNER-VERIFY` |
| **Status** | **OWNER VERIFY = PASS WITH FINDINGS** (0 BLOCKING) |
| **Date** | 2026-08-17 |
| **Mode** | OWNER VERIFY ONLY · **ZERO CODE CHANGE** · **ZERO COMMIT** · **ZERO PUSH** · **ZERO DEPLOY** · **ZERO SETTINGS WRITE** |
| **Implementation closeout** | [`IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-IMPLEMENTATION-CLOSEOUT.md`](./IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-IMPLEMENTATION-CLOSEOUT.md) |
| **OD-08-1** | APPROVED |

```text
OWNER VERIFY           = PASS WITH FINDINGS
BLOCKING FINDINGS      = 0
READY FOR COMMIT       = YES
COMMIT                 = NOT DONE
PUSH                   = NOT DONE
DEPLOY                 = NOT DONE
PV                     = NOT DONE
```

Nie implementowano poprawek. Findings **nie** naprawiane.

---

## 1. Production Baseline

| Item | Evidence |
|------|----------|
| Locked baseline (brief) | **2.66.92** / **`0f994437`** (A07 feature) |
| `origin/main` HEAD (this workspace) | **`6165029f`** `docs(ik): close autonomy-07 production verification` |
| Live `https://www.wgdom.fun/version.json` | **2.66.92** / commit **`6165029`** |
| 08-P0 on prod | **NO** (local uncommitted) |
| Live IK Entry | **not flipped** this verify (A07 PV: false) |

**F1 (NON-BLOCKING):** Live SHA to **`6165029`**, nie `0f994437`. UI version nadal **2.66.92** (docs commit A07). 08-P0 **nie** jest production verified.

---

## 2. Implementation Verification

SOURCE zgadza się z closeout i OD-08-1.

| Claim closeout | SOURCE |
|----------------|--------|
| Helper = Entry only | `isIkP2DocumentsBoqActive()` → `return isIkEntryEnabled() === true` |
| Host uses helper | `p2DocumentsBoqOn = isIkP2DocumentsBoqActive() === true` |
| Host nie czyta leftover | **zero** `isIkAutoIngestEnabled` w `IkEntryHost.tsx` |
| Same useEffect | ingest effect + `needsIkNg02Ingest` + bridge + persist |
| Leftover field retained | `AppSettings.ikAutoIngestEnabled` · default `false` |
| AUTO_INGEST UI gone | no `data-ik-auto-ingest-toggle` |
| Changelog | **2.66.93** w `changelog-data.ts` (lokalnie) |

---

## 3. Runtime Binding

**A. Helper** (`ik-entry-flag.ts`):

```ts
export function isIkP2DocumentsBoqActive(): boolean {
  return isIkEntryEnabled() === true;
}
```

Brak AND z `isIkAutoIngestEnabled`. Brak `|| true`.

**B–C. Host** (`IkEntryHost.tsx`):

- import `isIkP2DocumentsBoqActive`
- `if (!p2DocumentsBoqOn) { … return; }` na **istniejącym** `useEffect`
- dalej: pipeline wait · `needsIkNg02Ingest` · `attemptedRef` · `onUpdate` · `runIkNg02IngestBridge`

**MUST NOT leftover jako gate:** **PASS** — `isIkAutoIngestEnabled` nie występuje w hoście.

**NEW ORCHESTRATOR = NO.**

Mount nadal `TenderDetailPage`: `ikEntryOn && activeTab === "przetarg"`. IK OFF → brak hosta → brak auto ingest.

---

## 4. Legacy Settings

| Check | Result |
|-------|--------|
| Pole w `AppSettings` | **TAK** |
| Load `=== true` / merge / default `false` | **UNCHANGED** (tylko komentarz) |
| KV migration | **nie wykonana** (brak `saveAppSettings` w 08-P0 runtime) |
| Runtime gate | **NIE** — helper ignoruje leftover |

Kontrakt (pokryty harnessem):

| Condition | Expected | Test |
|-----------|----------|------|
| IK ON + leftover false | P2 active | T03 |
| IK ON + leftover true | P2 active | T04 |
| IK ON + missing | P2 active | T missing leftover |
| IK ON + malformed `"nope"` | P2 active | T malformed |
| IK OFF | P2 inactive | T01 / T05 |

---

## 5. Ingest Engine

`git diff --name-only` na:

- `ik-ng02-ingest-bridge.ts` (`needsIkNg02Ingest`, `runIkNg02IngestBridge`)
- `ik-document-expert.ts`

→ **puste** (brak zmian).

Persist w hoście **identyczny**:

```ts
onUpdate(result.itemPatch, { persist: "local" });
if (result.extractedLineCount > 0) {
  onUpdate(result.itemPatch, { persist: "cloud" });
}
```

08-P0 zmienia **aktywację**, nie silnik.

---

## 6. Admin UI

| Check | Result |
|-------|--------|
| `data-ik-auto-ingest-toggle` | **absent** |
| Nowy P2 checkbox | **brak** |
| `data-ik-entry-toggle` | **present** · `ikEntryEnabled` |
| Przetargi staff toggle | **present** (nie ruszany) |
| Copy Documents/BOQ | **PASS** — „od dokumentów i przygotowania BOQ” |
| P3–P8 / Research selecty | **nadal widoczne** |

**F2 (NON-BLOCKING):** P3–P8 E2E/Research nadal w ⚙ Moduły. Zgodne z Arch Review C7 / 08-P1. Nie jest nowym P2 switch.

**F3 (NON-BLOCKING):** atrybut `data-ik-entry-auto-ingest` zostaje (nazwa leftover), wartość = helper.

---

## 7. A05 Regression

`IkE2eMode` `"AUTO"|"OFF"|"ON"` · `parseIkE2eMode` / `mergeIkE2eMode` OFF wins · B-POLICY · Research `=== true`.

`git diff` **nie** zmienia logiki P5/P6 (tylko komentarz leftover ingest).

Harness spawn **T11** `test-ik-autonomy-05-explicit-auto-off-on.mjs` — reported **PASS** w closeout.

---

## 8. A06 Regression

`ikF5E2eEnabled` AUTO/OFF/ON · `runIkP7PositionCostBid` **nie** w diffie. T12 spawn **PASS** (closeout).

---

## 9. A07 Regression

`ikRiskDecisionE2eEnabled` AUTO/OFF/ON · `runIkP8RiskDecision` **nie** w diffie. T13 spawn **PASS** (closeout).

---

## 10. Safety

| Lock | Verify |
|------|--------|
| D default `false` | `defaultAppSettings().expertAiDecydentEnabled === false` · 08-P0 nie zapisuje D |
| P1 CLOSED | invoice-host / T14 spawn — nie w diffie 08-P0 |
| P2 identity KEEP GAP | identity files **OUT** · T15 spawn |
| Composite CLOSED | composite file **OUT** · T16 spawn |
| P7 / P8 UNCHANGED | engine files **OUT** |
| CatalogWork 471 write | **0** w 08-P0 |
| `mat.inv.*` restore | **nie** |
| `\|\| true` | **brak** w helperze |
| new engine / flag / orch / bypass | **NIE** |

Live D może być PRE-EXISTING true (A07 F4) — 08-P0 tego **nie** rusza. T19 nie asertuje live KV (**C4**).

---

## 11. Out of Scope

08-P0 **nie** zawiera:

Research-on-miss · Research automation (`executeResearch` nadal `p5ResearchOn === true`) · Accept / Reject / Recalculate · Price Commit · Identity Gap Owner Gate · Final Bid · D/Chief start · zmiany P7/P8 engines.

Host: brak `acceptWorkRate` / `acceptMaterial` / `commitMarketQuotes` / `recordDecision` / `executeResearch: true` literal.

---

## 12. Test Verification

Harness: `scripts/test-ik-autonomy-08-p0-documents-boq.mjs`

**Implementation run (ta sesja):** `61 PASS / 0 FAIL`.

**Owner Verify nie re-executował** pełnego spawn (~6 min, w tym live P25 HTTP). Pokrycie locked contract sprawdzone **w SOURCE** asercji:

| Contract | Harness |
|----------|---------|
| IK OFF → no P2 activation | T01, T05 |
| IK ON → P2 activation | T02 (`isIkP2DocumentsBoqActive` + host source) |
| IK ON + leftover false | T03 |
| IK ON + leftover true | T04 |
| IK ON + missing | T missing leftover + `loadAppSettingsLocal` |
| IK ON + malformed | T malformed `"nope"` |
| persistence unchanged | T07 `persist:"local"` · T08 cloud + `extractedLineCount` |
| engine unchanged | T09/T10 source present; git: bridge/expert **no diff** |
| Admin UI | T24 no toggle · copy BOQ · T25 IK toggle |
| A05/A06/A07 | T11–T13 `spawnSync` child suites |
| Super Admin tenders | T26 `adminCanViewTendersTab(super_admin)` |

**F4 (NON-BLOCKING):** T02 ma trzecią asercję `assert("T02 host does not claim extraction success", true)` — tautologia. Kontrakt C8 i tak pokryty dwiema pierwszymi asercjami T02 (activation, nie extract).

**F5 (NON-BLOCKING):** Owner Verify nie powtórzył `61 PASS` live; opiera się na closeout + re-read SOURCE.

---

## 13. Build Verification

Implementation: `npm run build` → **✓ built in 51.58s**, exit **0**.

Owner Verify **nie** re-buildował. Pre-existing Vite warnings (externalize / chunk size) nie z 08-P0.

**BUILD = PASS** (implementation evidence).

---

## 14. Write Audit

| Surface | 08-P0 |
|---------|-------|
| Settings / KV | **0** |
| Research HTTP (impl) | **0** |
| Accept / Price Commit / PM / CatalogWork | **0** |
| Final Bid | **0** |
| New tender mutation path | **0** |
| Existing ingest `onUpdate` | **unchanged** (C5 allowed) |

---

## 15. Diff Scope

**A08 P0 (explicit):**

```text
src/lib/intelligent-estimator/ik-entry-flag.ts
src/lib/app-settings.ts          (comment only)
src/app/intelligent-estimator/IkEntryHost.tsx
src/app/AdminSettingsModal.tsx
src/app/changelog-data.ts        (+2.66.93)
CHANGELOG.md
scripts/test-ik-migration-01-p1-entry.mjs
scripts/test-ik-migration-01-p2-implementation.mjs
scripts/test-ik-migration-01-p3-implementation.mjs
scripts/test-ik-migration-01-p25-ingest.mjs
scripts/test-ik-autonomy-08-p0-documents-boq.mjs   (untracked)
docs/architecture/IK-AUTONOMY-08-*                 (session docs)
```

Stat P0 tracked: **10 files, +66 / −55** (bez nowego harnessu i docs).

**Unrelated WIP:** pozostaje **LOCAL / UNCOMMITTED** (Ceny Materiałów, Login, Payroll, inne docs, `.cursor/rules`, …).

**Nie** wykonano `git add -A` / `git clean` / reset WIP.

---

## 16. Findings

| ID | Severity | Finding |
|----|----------|---------|
| **F1** | NON-BLOCKING | Live SHA `6165029` vs brief `0f994437`; UI nadal 2.66.92 |
| **F2** | NON-BLOCKING | P3–P8 Admin selecty nadal widoczne (08-P1) |
| **F3** | NON-BLOCKING | DOM `data-ik-entry-auto-ingest` leftover name |
| **F4** | NON-BLOCKING | T02 trzecia asercja tautologiczna |
| **F5** | NON-BLOCKING | Owner Verify nie re-run harness/build |

**BLOCKING = 0.**

---

## 17. Owner Verdict

**OWNER VERIFY = PASS WITH FINDINGS**

Implementation **PASS**. Locked contract (IK ON → Documents→BOQ activation; leftover nie jest gate; ten sam useEffect; silnik nienaruszony; Admin bez AUTO_INGEST) **spełniony w SOURCE**.

---

## 18. Commit Authorization

| Gate | Status |
|------|--------|
| Implementation | PASS |
| Owner Verify | **PASS WITH FINDINGS** · 0 blockers |
| **READY FOR COMMIT** | **YES** |
| **COMMIT** | **NOT DONE** |
| PUSH / DEPLOY / PV | **NOT DONE** |

Przyszły commit: **jawna lista** §15 (P0 + docs AUTONOMY-08). **Nigdy** `git add -A`.

---

## FINAL STATUS

```text
OWNER VERIFY           = PASS WITH FINDINGS
BLOCKING               = 0
READY FOR COMMIT       = YES
COMMIT                 = NOT DONE
PUSH                   = NOT DONE
DEPLOY                 = NOT DONE
PRODUCTION VERIFY      = NOT DONE
EPIC                   = AUTONOMY-08 — P0
STOP                   = czekaj na OWNER → COMMIT GO
```
