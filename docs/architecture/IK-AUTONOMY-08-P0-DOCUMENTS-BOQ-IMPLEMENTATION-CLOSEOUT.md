# IK AUTONOMY-08 P0 — Documents → BOQ Autonomous Activation  
## IMPLEMENTATION CLOSEOUT

> **Release status SSOT:** [`IK-AUTONOMY-08-P0-IMPLEMENTATION-CLOSEOUT.md`](./IK-AUTONOMY-08-P0-IMPLEMENTATION-CLOSEOUT.md) (post-PV).  
> Ten plik zostaje **pre-commit implementation record** (nie nadpisuj go jako live tip).

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-IMPLEMENTATION-CLOSEOUT` |
| **Status** | **IMPLEMENTATION = PASS** · superseded as release status by post-PV closeout |
| **Date** | 2026-08-17 |
| **OD-08-1** | APPROVED |
| **Arch Review** | PASS WITH CONDITIONS (C1–C8 honoured) |
| **UI** | **2.66.93** (changelog; not deployed) |
| **Production tip** | still **2.66.92** / **`0f994437`** until Owner commit+push |

```text
IMPLEMENTATION     = PASS
C1–C8              = PASS
P0 TESTS           = PASS (61 / 0)
BUILD              = PASS
SAFETY             = PASS
WRITE AUDIT        = 0
COMMIT             = NOT DONE
PUSH               = NOT DONE
DEPLOY             = NOT DONE
PRODUCTION VERIFY  = NOT DONE
EPIC               = AUTONOMY-08 — P0
NEXT               = OWNER VERIFY
```

---

## 1. Implementation summary

IK ON aktywuje Documents→BOQ przez istniejący `IkEntryHost` `useEffect`.

- `isIkP2DocumentsBoqActive()` := `isIkEntryEnabled() === true`
- Host gating: `p2DocumentsBoqOn` / helper — **nie** `isIkAutoIngestEnabled()`
- `needsIkNg02Ingest` / `runIkNg02IngestBridge` / `runIkDocumentExpert` / persist local+cloud **bez zmian**
- `ikAutoIngestEnabled` zostaje w `AppSettings` (leftover, bez migracji KV)
- Admin: usunięty checkbox AUTO_INGEST; copy Documents/BOQ

NEW ENGINE = NO · NEW FLAG = NO · NEW ORCHESTRATOR = NO.

---

## 2. Exact files changed (P0)

| File | Role |
|------|------|
| `src/lib/intelligent-estimator/ik-entry-flag.ts` | helper semantics |
| `src/lib/app-settings.ts` | leftover comment only (load/merge/default **unchanged**) |
| `src/app/intelligent-estimator/IkEntryHost.tsx` | ingest gate → helper |
| `src/app/AdminSettingsModal.tsx` | remove AUTO_INGEST · IK copy |
| `src/app/changelog-data.ts` | **2.66.93** |
| `CHANGELOG.md` | **2.66.93** |
| `scripts/test-ik-migration-01-p1-entry.mjs` | C1 |
| `scripts/test-ik-migration-01-p25-ingest.mjs` | C2 (+ P10 default ON assert) |
| `scripts/test-ik-migration-01-p2-implementation.mjs` | Arch leftover AND |
| `scripts/test-ik-migration-01-p3-implementation.mjs` | Arch leftover AND |
| `scripts/test-ik-autonomy-08-p0-documents-boq.mjs` | **new** harness T01–T26 + regressions |

Session docs (wcześniejsze tury, nie kod runtime):

- `docs/architecture/IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-AUDIT.md`
- `docs/architecture/IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-PLAN.md`
- `docs/architecture/IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-DESIGN-FREEZE.md`
- `docs/architecture/IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-ARCH-REVIEW.md`
- ten closeout

**Nie** edytowano: `ik-ng02-ingest-bridge.ts`, `ik-document-expert.ts`, P5–P8 engines, Composite, D.

---

## 3. Runtime binding change

**Przed:** `autoIngestOn = isIkAutoIngestEnabled() === true`

**Po:** `p2DocumentsBoqOn = isIkP2DocumentsBoqActive() === true`

Ten sam `useEffect`: pipeline wait · `needsIkNg02Ingest` · `attemptedRef` · `onUpdate` required · `runIkNg02IngestBridge` · persist.

Mount nadal: `TenderDetailPage` `ikEntryOn && tab === "przetarg"`.

IK OFF → host nie montuje → ingest nie startuje.

---

## 4. Legacy settings behavior

| leftover `ikAutoIngestEnabled` | IK ON | P2 activation |
|-------------------------------|-------|----------------|
| `false` | ON | **true** |
| `true` | ON | **true** |
| missing | ON | **true** |
| malformed (`"nope"`) | ON | **true** |
| any | OFF | **false** |

KV **nie** przepisane. Default leftover nadal `false`. `mergeIkAutoIngestEnabled` **bez zmian**.

---

## 5. Admin UI change

- Usunięty `data-ik-auto-ingest-toggle`
- Tytuł: `Inteligentny Kosztorysant`
- Copy (C6): *Po włączeniu Inteligentny Kosztorysant automatycznie rozpoczyna analizę przetargu od dokumentów i przygotowania BOQ.*
- Przetargi ON/OFF i IK ON/OFF zostają
- P3–P8 / Research selecty **zostają** (08-P1, Arch C7) — nie są nowym P2 checkboxem

---

## 6. C1–C8 status

| ID (Owner GO) | Status | Evidence |
|---------------|--------|----------|
| **C1** P1-entry | **PASS** | helper gate; AUTO_INGEST toggle absent |
| **C2** P25-ingest | **PASS** | host helper; leftover unused; default ON assert |
| **C3** no new flags | **PASS** | no new `AppSettings` key |
| **C4** T19 no live D | **PASS** | default `false`; no D write in 08-P0 files |
| **C5** T21 existing tender persist | **PASS** | local/cloud `onUpdate` unchanged; no Accept/PM |
| **C6** Admin copy Documents/BOQ | **PASS** | no Owner-Gate overclaim |
| **C7** no compile sentinel AND | **PASS** | `IK_ENTRY_SHELL_AUTO_INGEST = false` unused in gate |
| **C8** T02 = activation | **PASS** | helper true + host uses helper; not extraction success |

---

## 7. Test results

```text
npx vite-node scripts/test-ik-autonomy-08-p0-documents-boq.mjs
→ AUTONOMY-08 P0: 61 PASS / 0 FAIL
```

Includes spawned: A05, A06, A07, P1 invoice, P59 identity, Composite, P1-entry, P25, P2, P3.

P2 standalone: 68 PASS / 0 FAIL. P3: 88 PASS / 0 FAIL. P1-entry: 63 PASS / 0 FAIL.

---

## 8. Build result

```text
npm run build  →  ✓ built in 51.58s  (exit 0)
```

Pre-existing Vite warnings (externalize / chunk size) — nie z 08-P0.

---

## 9. Safety verification

| Lock | Status |
|------|--------|
| D default false / no flip | **PASS** |
| P1 CLOSED | **PASS** (T14) |
| P2 identity KEEP GAP | **PASS** (T15 / A05–A07 GAP) |
| Composite CLOSED | **PASS** (T16) |
| P7 / P8 UNCHANGED | **PASS** (T12 / T13) |
| A05/A06/A07 | **PASS** |
| CatalogWork 471 write | **0** |
| Research HTTP from 08-P0 | **0** (`executeResearch` still checkbox `=== true`) |
| `\|\| true` | **absent** in helper/host |
| `mat.inv.*` | **not restored** |

---

## 10. Write audit

| Surface | This phase |
|---------|------------|
| Settings / KV `kw-app-settings` | **0** |
| Research HTTP (implementation) | **0** |
| Accept / Price Commit / PM / CatalogWork | **0** |
| Final Bid / Decision persist | **0** |
| New tender mutation path | **0** |
| Existing ingest `onUpdate` local/cloud | **unchanged** (allowed persist, C5) |

P25 harness wykonał **istniejący** live NG-02 download (engine test, nie nowy research 08-P0).

---

## 11. Regression status

A05 / A06 / A07 / P1 / identity / Composite / P1-entry / P2 / P3 / P25 = **PASS**.

---

## 12. Diff scope

P0 runtime+test+changelog (explicit list §2). Diff host/helper/admin/settings = **tylko** 08-P0.

---

## 13. Unrelated WIP statement

Working tree zawiera **dużo** niezwiązanego WIP (Ceny Materiałów, LoginScreen, Payroll, `.cursor/rules`, inne docs). **Nie** użyto `git add -A`. Przyszły commit: **jawna lista** plików §2 + closeout/docs AUTONOMY-08.

---

## 14. Known findings

1. P3–P8 Admin selecty nadal widoczne — **08-P1**, nie defect 08-P0.
2. Live prod `ikEntryEnabled=false` (A07 PV) → po samym deploy **ingest nie startuje**, dopóki Super Admin nie włączy IK.
3. Atrybut DOM `data-ik-entry-auto-ingest` zostaje (nazwa leftover), wartość = helper.
4. P25 miał pre-existing asercję `isIkEntryEnabled false` vs P10 default ON — poprawione w C2.
5. Kaskada: po udanym ingest BOQ READY → P5–P8 MODE A mogą biec (kody UNCHANGED, zamierzone OD-08-1). Research nadal OFF.

---

## 15. Rollback

1. AND z powrotem w `isIkP2DocumentsBoqActive`
2. Host z powrotem `isIkAutoIngestEnabled`
3. Przywrócić checkbox Admin
4. Przywrócić asercje MIGRATION-01

Bez rollbacku KV.

---

## 16. Next gate

**OWNER VERIFY** → potem (osobna tura, tylko na GO): jawny commit → push → PV.

Nie implementować Research-on-miss / Owner Gates / 08-P1 UI hide P3–P8 w tej turze.

---

## FINAL STATUS

```text
IMPLEMENTATION     = PASS
C1–C8              = PASS
P0 TESTS           = PASS
BUILD              = PASS
SAFETY             = PASS
WRITE AUDIT        = 0
CODE               = CHANGED ONLY WITHIN P0
SETTINGS WRITE     = 0
RESEARCH           = 0
COMMIT             = NOT DONE
PUSH               = NOT DONE
DEPLOY             = NOT DONE
PRODUCTION VERIFY  = NOT DONE
EPIC               = AUTONOMY-08 — P0
STOP               = BEFORE COMMIT · czekaj na OWNER VERIFY
```
