# IK AUTONOMY-08 P0 — Documents → BOQ Autonomous Activation  
## DESIGN FREEZE

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-DESIGN-FREEZE` |
| **Status** | **DESIGN FREEZE = READY FOR ARCH REVIEW** |
| **Date** | 2026-08-17 |
| **Mode** | DESIGN FREEZE ONLY · **ZERO CODE** · **ZERO PATCH** · **ZERO IMPLEMENT** · **ZERO SETTINGS WRITE** · **ZERO RESEARCH HTTP** · **ZERO BUSINESS WRITE** · **ZERO COMMIT** · **ZERO PUSH** · **ZERO DEPLOY** |
| **Production** | **2.66.92** / **`0f994437`** · A07 docs **`6165029f`** |
| **PLAN** | [`IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-PLAN.md`](./IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-PLAN.md) |
| **AUDIT** | [`IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-AUDIT.md`](./IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-AUDIT.md) |
| **Owner Decision** | **OD-08-1 = APPROVED** |
| **Slice** | **08-P0 only** — not full AUTONOMY-08 |

```text
DESIGN FREEZE              = READY FOR ARCH REVIEW
Architecture Review        = NOT DONE
Implementation             = NOT AUTHORIZED
Code / Settings / Tests    = ZERO / NOT RUN
Commit / Push / Deploy     = NOT DONE
Production Verify          = NOT DONE
EPIC                       = AUTONOMY-08 — PLAN / P0
```

If PLAN narrative and SOURCE disagree, **SOURCE wins**. This freeze records SOURCE.

**08-P0 ≠ full AUTONOMY-08.** Remaining slices (Research-on-miss, Owner Gates G1–G3, UI hide P3–P8, Final Bid) stay in PLAN — **not this DF**.

---

## 1. Purpose

Uczynić **IK ON** wystarczającym warunkiem autonomicznego **Documents → BOQ** (istniejący NG-02 ingest bridge), bez osobnego biznesowego przełącznika `ikAutoIngestEnabled`.

REUSE: `IkEntryHost`, `isIkP2DocumentsBoqActive`, `needsIkNg02Ingest`, `runIkNg02IngestBridge`, `runIkDocumentExpert`, istniejący persist local/cloud.

**Nie** nowy engine, orchestrator, flaga, model persistencji, KV migration.

---

## 2. Owner Decision OD-08-1

| Decision | Status |
|----------|--------|
| IK ON **implikuje** automatyczny Documents → BOQ | **APPROVED** |
| Osobny biznesowy switch `ikAutoIngestEnabled` **nie** jest wymagany | **APPROVED** |
| 08-P0 = tylko ten first break | **APPROVED** |
| Research / Owner Gates / Price Commit / Final Bid / D | **OUT OF SCOPE** |

```text
ikEntryEnabled === true
  → IkEntryHost mounted
  → isIkP2DocumentsBoqActive() === true
  → (jeśli needsIkNg02Ingest) runIkNg02IngestBridge
  → runIkDocumentExpert
  → existing local/cloud item persist
```

---

## 3. Production Baseline

| Item | Value |
|------|-------|
| UI / tip | **2.66.92** / **`0f994437`** |
| Docs (A07 close) | **`6165029f`** |
| Closed | **A05** P5/P6 `AUTO\|OFF\|ON` · **A06** P7 · **A07** P8 |
| P1 | CLOSED · `mat.inv.*` blocked |
| P2 identity | KEEP GAP |
| Composite | CLOSED · `feedsP7Bid=false` |
| CatalogWork | **471** · 08-P0 **nie pisze** katalogu |
| D | **HARD STOP** — nie flipować `expertAiDecydentEnabled` |
| Live (A07 PV, nie odświeżane) | `ikEntryEnabled=false` → host nie montuje |
| Code default `ikEntryEnabled` | `true` (LS absent key → parse `=== true` → **false**) |
| Code default `ikAutoIngestEnabled` | `false` |

08-P0 **nie** zapisuje KV. Po deploy ingest na prod **nie** startuje, dopóki Super Admin nie włączy IK.

---

## 4. Current State

| Element | SOURCE |
|---------|--------|
| Mount | `TenderDetailPage`: `ikEntryOn && activeTab === "przetarg"` → `IkEntryHost` |
| Helper | `isIkP2DocumentsBoqActive()` = `isIkEntryEnabled() === true && isIkAutoIngestEnabled() === true` |
| Helper consumers | **tylko testy** (`test-ik-migration-01-p2/p3-implementation.mjs`) |
| Host gate | `const autoIngestOn = isIkAutoIngestEnabled() === true` — **nie** woła helpera |
| Engine | `runIkNg02IngestBridge` · skip `needsIkNg02Ingest` |
| Expert | `runIkDocumentExpert` zawsze gdy host żyje |
| Persist | `onUpdate(itemPatch, { persist: "local" })`; cloud gdy `extractedLineCount > 0` |
| Admin | checkbox `data-ik-auto-ingest-toggle` |
| Compile sentinel | `IK_ENTRY_SHELL_AUTO_INGEST = false` — **nie** jest runtime gate efektu |

---

## 5. First Autonomy Break

| Pole | Wartość |
|------|---------|
| STEP | 2 · Document ingestion |
| ENGINE | `runIkNg02IngestBridge` + `runIkDocumentExpert` |
| BINDING | `IkEntryHost` `useEffect` |
| CURRENT GATE | Entry **AND** `ikAutoIngestEnabled === true` (default OFF) |
| WHY BLOCKED | IK ON nie uruchamia Documents→BOQ |

---

## 6. Root Cause

Dwa błędy kontraktu, nie brak silnika:

1. **Extra AND** w `isIkP2DocumentsBoqActive()` wymaga leftover checkboxa.
2. **Host omija helper** i czyta `isIkAutoIngestEnabled()` bezpośrednio.

Dlatego zmiana samego helpera **bez** hosta **nie** naprawia breaku.

---

## 7. Target State

```text
IK OFF  → IkEntryHost not mounted → ingest effect never runs
IK ON   → isIkP2DocumentsBoqActive() === true
        → existing effect guards
        → needsIkNg02Ingest ? bridge + persist : skip (BOQ already present)
```

`ikAutoIngestEnabled` **nie** steruje runtime P2 (dowolna wartość: true / false / missing / malformed).

Admin: brak checkboxa AUTO_INGEST. IK Entry copy = semantyka OD-08-1.

P3–P8 Admin selecty: **UNCHANGED** w 08-P0 (slice 08-P1 w PLANIE). Copy przełącznika IK **nie** wymienia P2–P8 / E2E / MODE A/B / AUTO/OFF/ON.

---

## 8. Exact Code Boundary

**IN (allowed files after Arch Review + Owner GO IMPLEMENT):**

| File | Change |
|------|--------|
| `src/lib/intelligent-estimator/ik-entry-flag.ts` | `isIkP2DocumentsBoqActive()` := `isIkEntryEnabled() === true` · komentarz: leftover ingest key ignored |
| `src/app/intelligent-estimator/IkEntryHost.tsx` | import + gate efektu: `isIkP2DocumentsBoqActive()` zamiast `isIkAutoIngestEnabled()` · komentarz P2 |
| `src/app/AdminSettingsModal.tsx` | usunąć label/checkbox AUTO_INGEST · zaktualizować copy IK Entry |
| Testy P2/P3 migration + nowy harness T01–T26 (lub rozszerzenie istniejącego) | nowy kontrakt helpera / host source / UI |
| `src/app/changelog-data.ts` + `CHANGELOG.md` + krótka nota ARCHITECTURE | obowiązkowy changelog |

**OUT (must not modify):**

- `ik-ng02-ingest-bridge.ts` (`needsIkNg02Ingest`, `runIkNg02IngestBridge`)
- `ik-document-expert.ts`
- tender persist helpers (sygnatura `onUpdate` / `{ persist: "local"|"cloud" }`)
- `app-settings.ts` **klucz** `ikAutoIngestEnabled` (typ, default, load, merge, save) — **zostaje**; **nie** migracja wartości
- P5/P6/P7/P8 engines, flags, merge, Research booleans
- Composite, identity P2, P1 invoice host, Chief, D
- `IK_ENTRY_SHELL_AUTO_INGEST` — zostaje `false`; **nie** dodawać do runtime AND (zablokowałoby ingest)

**Zakaz:** nowa flaga · `|| true` · `executeResearch: true` literal · settings/cloud write w implementacji deweloperskiej · `git add -A`

---

## 9. IkEntryHost Binding

**Dziś:**

```text
autoIngestOn = isIkAutoIngestEnabled() === true
useEffect:
  if (!autoIngestOn) { clear ingest; return }
  … existing: pipeline wait, needsIkNg02Ingest, attemptedRef, onUpdate required
  runIkNg02IngestBridge → onUpdate local → maybe cloud
```

**Target:**

```text
p2DocumentsBoqOn = isIkP2DocumentsBoqActive() === true
useEffect:
  if (!p2DocumentsBoqOn) { clear ingest; return }
  … IDENTYCZNE dalsze guardy i persist
```

Host **musi** wołać `isIkP2DocumentsBoqActive`. **Nie** wolno gatingować ingestu przez `isIkAutoIngestEnabled`.

Pozostałe efekty hosta (P3/P5/P6/P7/P8/Composite) — **bez zmian**.

Gdy host zamontowany, Entry jest już true; helper Entry-only jest wtedy tożsamy z „zawsze próbuj ingest jeśli needs*”. Mount nadal zależy od `isIkEntryEnabled()` na `TenderDetailPage`.

---

## 10. Helper Semantics

**Przed:**

```ts
isIkP2DocumentsBoqActive()
  := isIkEntryEnabled() === true && isIkAutoIngestEnabled() === true
```

**Po (08-P0 freeze):**

```ts
isIkP2DocumentsBoqActive()
  := isIkEntryEnabled() === true
```

| Entry | leftover `ikAutoIngestEnabled` | `isIkP2DocumentsBoqActive` |
|-------|-------------------------------|----------------------------|
| false | false / true / missing | **false** |
| true | false | **true** |
| true | true | **true** |
| true | malformed (load → false) | **true** |

`isIkAutoIngestEnabled()` **zostaje** (test/compat). `forceIkAutoIngestForTests` **nie** może już wyłączać P2, jeśli Entry ON.

`isIkEntryEnabled()` bez zmian: `=== true` only.

---

## 11. ikAutoIngestEnabled Legacy Contract

| Powierzchnia | 08-P0 |
|--------------|-------|
| Pole w `AppSettings` | **RETAIN** |
| `defaultAppSettings()` | **false** (bez flipu) |
| `loadAppSettingsLocal` | `parsed.ikAutoIngestEnabled === true` — **bez zmian** |
| `mergeIkAutoIngestEnabled` | remote explicit — **bez zmian** |
| `saveAppSettings` | nadal serializuje klucz jeśli pełny obiekt — **bez celowego rewrite KV** |
| Cloud blob / LS legacy | może zawierać true/false/absent |
| **Runtime P2 gate** | **MUST NOT read this key** |
| KV migration | **FORBIDDEN** |
| Usunięcie klucza z typu | **FORBIDDEN** w 08-P0 |

Malformed / missing leftover **nie** może złamać IK ON: helper nie czyta leftover.

---

## 12. Persistence Invariants

| Path | 08-P0 |
|------|-------|
| `needsIkNg02Ingest` | **UNCHANGED** — 0 attachments / already rows / heavy-done-empty → no bridge |
| `itemPatch` + `persist: "local"` | **UNCHANGED** |
| cloud gdy `extractedLineCount > 0` | **UNCHANGED** |
| `onUpdate` absent | effect **nie** startuje (**UNCHANGED**) |
| CatalogWork / OUR RATE / PM / Quotes | **0 writes** |
| Accept / Price Commit / Final Bid / Decision persist | **0** |
| `kw-app-settings` | **0 writes** z tej implementacji |

**T21 „No business writes”** = brak **nowych** zapisów CatalogWork / Price Memory / Accept / Final Bid / settings.  
**Dozwolony** pozostaje **istniejący** zapis **tender item** z mostu ingest (to jest Documents→BOQ, nie Owner Gate). Nie zmieniać warunków local vs cloud.

---

## 13. Admin UI Contract

**Usunąć** z normalnego Super Admin ⚙ Moduły:

- cały `label` checkboxa „IK · AUTO_INGEST (Documents → BOQ)”
- `data-ik-auto-ingest-toggle`

**Nie** zastępować innym P2 checkboxem.

**Zostawić:**

- Przetargi (`tendersTabForStaffEnabled`) — bez zmiany semantyki
- Inteligentny Kosztorysant (`data-ik-entry-toggle`) — funkcjonalny ON/OFF

**Copy IK Entry (freeze tekst):**

Tytuł: `Inteligentny Kosztorysant`

Opis:

> Po włączeniu Inteligentny Kosztorysant automatycznie rozpoczyna analizę przetargu od dokumentów i przygotowania BOQ. W miejscach wymagających decyzji biznesowej zatrzyma się i poprosi o akceptację.

(Druga zdanie = docelowa semantyka produktu; 08-P0 **nie** implementuje jeszcze Owner Gates — copy nie obiecuje Research/Accept jako już działających przycisków. Arch Review może skrócić do samego Documents/BOQ, jeśli uzna drugie zdanie za overclaim. **Minimum obowiązkowe:** zdanie o dokumentach i BOQ.)

**Minimum obowiązkowe (Owner):**

> Po włączeniu Inteligentny Kosztorysant automatycznie rozpoczyna analizę przetargu od dokumentów i przygotowania BOQ.

W **tym** miejscu (przy przełączniku IK) **nie** pokazywać: P2, P3, P4, P5, P6, P7, P8, E2E, MODE A, MODE B, AUTO/OFF/ON.

P3–P8 / Research selecty niżej w tym samym panelu: **zostają w 08-P0** (ukrycie = 08-P1). Nie są „zastępstwem” P2.

**T26:** Super Admin `adminCanViewTendersTab(super_admin) === true` niezależnie od IK OFF i od `tendersTabForStaffEnabled`. IK OFF = brak `IkEntryHost`, moduł Przetargi nadal dostępny dla Super Admin. **Bez zmian kodu auth.**

---

## 14. A05 Compatibility

P5/P6 `IkE2eMode` · B-POLICY · OFF wins · Research `=== true` **UNCHANGED**.  
08-P0 **nie** ustawia `executeResearch`. T11 = istniejący `test-ik-autonomy-05-explicit-auto-off-on.mjs` PASS.

---

## 15. A06 Compatibility

P7 `ikF5E2eEnabled` AUTO/ON/OFF · `runIkP7PositionCostBid` · `feedsP7Bid=false` **UNCHANGED**.  
T12 / T17 = istniejący harness P7 PASS.

---

## 16. A07 Compatibility

P8 `ikRiskDecisionE2eEnabled` · `runIkP8RiskDecision` · no D flip · no extra BOQ gate **UNCHANGED**.  
T13 / T18 = istniejący harness P8 PASS.

---

## 17. Safety Invariants

| Lock | 08-P0 |
|------|-------|
| D | **HARD STOP** — nie czytać/pisać `expertAiDecydentEnabled` w celu włączenia; nie bypass; nie uzależniać ingestu od D |
| P1 CLOSED | **UNCHANGED** |
| P2 identity KEEP GAP | **UNCHANGED** (08-P0 = ingest activation, nie identity) |
| Composite CLOSED | **UNCHANGED** |
| P7 / P8 | **UNCHANGED** |
| CatalogWork 471 | **no catalog write** |
| Research HTTP | **0** (host nadal `p5ResearchOn === true` z checkboxa; checkbox default false) |
| `mat.inv.*` | **no restore** |
| `\|\| true` | **FORBIDDEN** |
| New flag / engine / orchestrator | **FORBIDDEN** |
| KV migration | **FORBIDDEN** |

Live D może być `true` (A07 F4 PRE-EXISTING). 08-P0 **nie** ustawia D na false i **nie** na true.

---

## 18. Test Matrix T01–T26

Nowy (lub rozszerzony) harness, np. `scripts/test-ik-autonomy-08-p0-documents-boq.mjs`, plus regresje child.

| ID | Contract | Evidence |
|----|----------|----------|
| **T01** | IK OFF → Documents→BOQ automation **not** triggered | `isIkEntryEnabled()===false` → `isIkP2DocumentsBoqActive()===false`; host effect gated by helper |
| **T02** | IK ON → automation **triggered** (helper true) | Entry true → helper true; host uses helper |
| **T03** | leftover ingest **false** + IK ON → **still** triggers | helper true gdy `ikAutoIngestEnabled===false` |
| **T04** | leftover ingest **true** + IK ON → triggers | helper true |
| **T05** | leftover false + IK OFF → no ingest | helper false |
| **T06** | `needsIkNg02Ingest` behavior unchanged | source hash/regex: function body; existing P2.5 tests still PASS |
| **T07** | local persist unchanged | host still `persist: "local"` on `itemPatch` |
| **T08** | cloud persist unchanged | host still cloud gdy `extractedLineCount > 0` |
| **T09** | `runIkNg02IngestBridge` unchanged | no edit to `ik-ng02-ingest-bridge.ts` (git/source assert) |
| **T10** | `runIkDocumentExpert` unchanged | no edit to `ik-document-expert.ts` |
| **T11** | A05 regression PASS | `test-ik-autonomy-05-explicit-auto-off-on.mjs` |
| **T12** | A06 regression PASS | `test-ik-autonomy-06-p7-autonomous-bid-calculation.mjs` |
| **T13** | A07 regression PASS | `test-ik-autonomy-07-p8-autonomous-risk-decision.mjs` |
| **T14** | P1 regression PASS | existing P1 invoice-host test |
| **T15** | P2 identity KEEP GAP PASS | existing identity GAP harness (zawór) |
| **T16** | Composite regression PASS | existing composite orchestration test |
| **T17** | P7 regression PASS | covered by T12 + host still `runIkP7PositionCostBid` without ingest coupling |
| **T18** | P8 regression PASS | covered by T13 + host still `runIkP8RiskDecision` |
| **T19** | D remains false **as code default / no flip** | `defaultAppSettings().expertAiDecydentEnabled === false`; 08-P0 source nie zapisuje D; **nie** claim live KV |
| **T20** | No Research HTTP | host nadal `executeResearch: p5ResearchOn === true` / p6; no literal `true`; leftover research flags default false |
| **T21** | No business writes | no Accept/commitMarketQuotes/saveWorkCatalog/recordDecision in 08-P0 diff |
| **T22** | No new flag | no new `AppSettings` key |
| **T23** | No new engine | no new ingest/parser file |
| **T24** | Admin UI no longer exposes `ikAutoIngestEnabled` | no `data-ik-auto-ingest-toggle`; no visible AUTO_INGEST label |
| **T25** | Super Admin IK ON/OFF remains functional | `data-ik-entry-toggle` still bound to `ikEntryEnabled` + `saveAppSettings` |
| **T26** | Super Admin retains access when IK OFF | `adminCanViewTendersTab('super_admin', { tendersTabForStaffEnabled: false }) === true`; host mount still `ikEntryOn` (IK OFF ≠ hide Przetargi) |

Aktualizacja **starych** asercji MIGRATION-01 P2/P3 („Entry ON ∧ Auto OFF → P2 inactive”) jest **wymagana** — stary kontrakt jest **superseded** przez OD-08-1.

---

## 19. Acceptance Criteria

08-P0 PASS gdy:

1. Helper = Entry only (`=== true`).
2. Host ingest effect używa helpera, nie leftover ingest key.
3. T01–T26 PASS.
4. Bridge / Document Expert / `needsIkNg02Ingest` / persist conditions **nie** zmienione.
5. Admin bez checkboxa AUTO_INGEST; IK ON/OFF działa; copy Documents/BOQ.
6. A05/A06/A07 / P1 / identity GAP / Composite nienaruszone.
7. Zero nowej flagi, engine, orchestratora, KV migration, Research HTTP, Catalog/PM/Accept write.
8. D nie flipowane.

**Nie** wymaga: live `ikEntryEnabled=true`, live ingest na Paczka VII, Production Verify walk z BOQ extract (PV = code+bundle+defaults; live Entry może pozostać false).

---

## 20. Rollback

1. Przywrócić AND w `isIkP2DocumentsBoqActive`.
2. Host z powrotem `isIkAutoIngestEnabled()`.
3. Przywrócić checkbox Admin.
4. Przywrócić testy P2 MIGRATION-01.

Nie wymaga rollbacku KV (08-P0 nie migruje). IK OFF nadal wyłącza host.

---

## 21. Out of Scope

NIE IMPLEMENTOWAĆ w 08-P0:

Research automation · Research-on-miss · Owner Accept/Reject/Recalculate · Price Commit · Price Memory · Identity Gap workflow · Final Bid approval · P7/P8/Chief/D/Composite/P1/P2-identity changes · new state machine · new orchestrator · new engine · new flag · new persistence model · KV migration · ukrycie P3–P8 Admin selectów (08-P1) · flip live `ikEntryEnabled` · flip D.

PLAN slices po 08-P0 (nie ten DF): Research-on-miss · G1 Identity Owner · G2 Price Owner · G3/G4 persist · G5 Final Bid Owner Gate · Admin hide P3–P8.

---

## 22. Implementation Sequence

**Teraz: STOP.** Czekaj na ARCH REVIEW. Poniższe **tylko po** Arch Review PASS + Owner GO IMPLEMENT.

1. Helper semantics.
2. Host binding.
3. Admin UI remove AUTO_INGEST + IK copy.
4. Harness T01–T26 + update MIGRATION-01 P2/P3 asserts.
5. Changelog.
6. `npm run build` + listed tests.
7. Commit **jawny** (nie `-A`) · push tylko na Owner GO deploy.

Nie commituj w fazie DF.

---

## 23. Owner Approval Gate

| Gate | Status |
|------|--------|
| OD-08-1 | **APPROVED** |
| PLAN | Owner REVIEW PASS (this DF follows PLAN 08-P0) |
| **This Design Freeze** | **READY FOR ARCH REVIEW** |
| Architecture Review | **NOT DONE** — **blocker implementacji** |
| Owner GO IMPLEMENT | **NOT GIVEN** |
| Implementation | **NOT AUTHORIZED** |
| Production Verify | **NOT DONE** |

Po ARCH REVIEW: nie implementować, dopóki Owner nie da **GO IMPLEMENT**.

---

## FINAL STATUS

```text
DESIGN FREEZE            = READY FOR ARCH REVIEW
Document                 = docs/architecture/IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-DESIGN-FREEZE.md
Implementation           = NOT AUTHORIZED
Code                     = ZERO
Settings                 = ZERO
Research                 = ZERO
Business writes          = ZERO
Commit                   = NOT DONE
Push                     = NOT DONE
Deploy                   = NOT DONE
Production Verify        = NOT DONE
EPIC                     = AUTONOMY-08 — PLAN / P0
STOP                     = czekaj na ARCH REVIEW
```
