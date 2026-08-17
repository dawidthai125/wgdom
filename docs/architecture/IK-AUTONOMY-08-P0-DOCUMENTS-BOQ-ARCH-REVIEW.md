# IK AUTONOMY-08 P0 — Documents → BOQ Autonomous Activation  
## ARCHITECTURE REVIEW

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-ARCH-REVIEW` |
| **Status** | **ARCH REVIEW = PASS WITH CONDITIONS** |
| **Date** | 2026-08-17 |
| **Mode** | ARCH REVIEW ONLY · **ZERO CODE** · **ZERO PATCH** · **ZERO IMPLEMENT** · **ZERO SETTINGS WRITE** · **ZERO RESEARCH HTTP** · **ZERO BUSINESS WRITE** · **ZERO TEST RUNTIME** · **ZERO COMMIT** · **ZERO PUSH** · **ZERO DEPLOY** |
| **Production** | **2.66.92** / **`0f994437`** · A07 docs **`6165029f`** |
| **PLAN** | [`IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-PLAN.md`](./IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-PLAN.md) |
| **Design Freeze** | [`IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-DESIGN-FREEZE.md`](./IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-DESIGN-FREEZE.md) |
| **OD-08-1** | **APPROVED** |

```text
ARCH REVIEW                = PASS WITH CONDITIONS
ARCHITECTURE BLOCKERS      = 0
DESIGN FREEZE              = CONSISTENT WITH SOURCE
REUSE FIRST                = YES
NEW ENGINE / FLAG / ORCH   = NO
Implementation             = NOT AUTHORIZED
Code / Settings / Tests    = ZERO / NOT RUN
Commit / Push / Deploy     = NOT DONE
Production Verify          = NOT DONE
EPIC                       = AUTONOMY-08 — P0
```

Nie implementowano. Nie poprawiano DF. Nie ruszano Research / Accept / Final Bid / D poza potwierdzeniem izolacji 08-P0.

---

## 1. Executive Summary

Design Freeze 08-P0 **jest zgodny** z aktualnym kodem. First break to **configuration/activation**, nie brak silnika.

| Pytanie | Werdykt |
|---------|---------|
| A First boundary | **TAK** — Documents→BOQ extra gate; P5–P8 już AUTO gdy host żyje |
| B Helper = Entry only | **TAK, bezpieczne** (`=== true`, bez `\|\| true`) |
| C Host omija helper | **TAK** — `isIkAutoIngestEnabled()` |
| D Drugi orchestrator | **NIE** — ten sam `useEffect` |
| E Leftover bez migracji KV | **TAK** |
| F Legacy true/false/missing/malformed blokuje IK ON? | **NIE**, jeśli host **nie** czyta leftover |
| G Persist identyczny | **TAK**, jeśli ciało efektu bez zmian |
| H `needsIkNg02Ingest` | **TAK** — plik poza boundary |
| I Usunięcie AUTO_INGEST psuje Super Admin? | **NIE** — kill = IK OFF; Przetargi zostają |
| J A05/A06/A07 | **TAK** — poza diffem 08-P0 |
| K P1 / identity / Composite / P7 / P8 / D | **kod nienaruszony**; kaskada BOQ→MODE A **zamierzona** |
| L nowy engine/flaga/orch / bypass / `\|\| true` / enum `=== true` | **NIE w DF** |
| M Rollback | **TAK** — AND + host + checkbox |
| N T01–T26 vs kod | **TAK z warunkami C1–C8** |

**08-P0 ≠ pełne AUTONOMY-08.** Research-on-miss i Owner Gates pozostają w PLANIE.

---

## 2. Production Baseline

| Item | Evidence |
|------|----------|
| UI | **2.66.92** / **`0f994437`** |
| A05/A06/A07 | CLOSED — nie reinterpretowane |
| Live Entry (A07 PV) | `ikEntryEnabled=false` → `IkEntryHost` nie montuje |
| Code default Entry | `true`; LS load `=== true` → absent → **false** |
| Leftover ingest default | `false` |
| CatalogWork | **471** · most ingest **nie** pisze katalogu |
| D | default `false` · 08-P0 **nie** flipuje · live KV może być PRE-EXISTING true (A07 F4) |

---

## 3. Reviewed Documents

- PLAN AUTONOMY-08
- DF 08-P0
- SOURCE: `IkEntryHost.tsx`, `ik-entry-flag.ts`, `app-settings.ts`, `AdminSettingsModal.tsx`, `ik-ng02-ingest-bridge.ts`, `TenderDetailPage.tsx`, `admin-auth.ts` (`adminCanViewTendersTab`)
- Harness: `test-ik-migration-01-p1-entry.mjs`, `p2`, `p3`, `p25-ingest.mjs`, A05/A06/A07, `test-ik-p1-invoice-host-collision.mjs`, `test-ik-composite-position-orchestration.mjs`, `test-ik-migration-01-p59-material-identity.mjs`

---

## 4. Current Runtime Evidence

```text
TenderDetailPage
  ikEntryOn = isIkEntryEnabled()
  IF ikEntryOn AND tab === "przetarg"
    → <IkEntryHost onUpdate={onUpdateItem} … />

IkEntryHost
  autoIngestOn = isIkAutoIngestEnabled() === true   // NIE helper
  useEffect:
    if (!autoIngestOn) return
    wait pipeline · needsIkNg02Ingest · attemptedRef · onUpdate required
    runIkNg02IngestBridge
    onUpdate(patch, local) ; if extractedLineCount>0 → cloud

isIkP2DocumentsBoqActive()
  = isIkEntryEnabled() === true && isIkAutoIngestEnabled() === true
  consumers: TYLKO testy MIGRATION-01 p2/p3
```

Jedyny produkcyjny reader leftover ingest: **`IkEntryHost`**. `app-settings` load/merge/save nadal trzyma klucz. Admin: `data-ik-auto-ingest-toggle`.

Compile `IK_ENTRY_SHELL_AUTO_INGEST = false` **nie** jest AND w efekcie.

---

## 5. First Autonomy Break

**Potwierdzony.** Na ścieżce OD-08-1 od dokumentu, przy założeniu IK ON (host zamontowany):

P5/P6/P7/P8 MODE A już mają binding AUTO. Ingest **nie**. Research-on-miss jest **późniejszym** breakiem (checkbox MODE B) — poza 08-P0.

Live `ikEntryEnabled=false` to **super-gate konfiguracji**, nie luka silnika. 08-P0 go nie flipuje.

---

## 6. Binding Verification

| Claim DF | SOURCE | OK? |
|----------|--------|-----|
| Host nie woła `isIkP2DocumentsBoqActive` | grep: tylko `ik-entry-flag.ts` + testy p2/p3 | **TAK** |
| Host używa `isIkAutoIngestEnabled()` | `IkEntryHost` L58, L102, L123, deps L197 | **TAK** |
| Zmiana hosta na helper ≠ nowy orchestrator | ten sam `useEffect`, te same guardy | **TAK** |
| Oba kroki wymagane (helper + host) | sam helper dziś **nie** steruje runtime | **TAK** |

Po zmianie, wewnątrz zamontowanego hosta helper Entry-only jest **zawsze true**. To jest **cel** OD-08-1, nie podwójna orkiestracja. Kill = odmontowanie hosta (`ikEntryEnabled` false na `TenderDetailPage`).

---

## 7. Helper Verification

`isIkEntryEnabled()` już: test override **lub** `loadAppSettingsLocal().ikEntryEnabled === true`.

Target `isIkP2DocumentsBoqActive() := isIkEntryEnabled() === true`:

- **nie** `|| true`
- **nie** raw enum A05–A07
- leftover ingest **wypada z AND** → T03 spełnialne
- `forceIkAutoIngestForTests(false)` **nie** może już gasić P2 przy Entry ON (stary test p2 L141 **musi** paść / zostać zaktualizowany)

Bezpieczne: helper oznacza **uprawnienie do próby ingest**, nie „BOQ zawsze powstanie”. Nadal `needsIkNg02Ingest` / `onUpdate` / pipeline.

---

## 8. ikAutoIngestEnabled Legacy Analysis

| Wartość leftover | Load dziś | Po 08-P0 (host nie czyta) |
|------------------|-----------|---------------------------|
| `true` | ingest ON jeśli Entry | **nie blokuje, nie jest wymagane** |
| `false` | ingest OFF | **nie blokuje** IK ON |
| missing | `=== true` → false | **nie blokuje** |
| malformed | false | **nie blokuje** |

Klucz może zostać w typie / default `false` / `mergeIkAutoIngestEnabled` / blob chmury. **Brak migracji KV = poprawne.** Rewrite istniejących wartości **zakazany** (DF).

`isIkAutoIngestEnabled()` może zostać wyeksportowane; **nie** wolno go użyć jako gate hosta po 08-P0.

---

## 9. Persistence Analysis

Ciało mostu (SOURCE, bez zmian w DF):

```text
if (result.itemPatch) {
  onUpdate(result.itemPatch, { persist: "local" });
  if (result.extractedLineCount > 0) {
    onUpdate(result.itemPatch, { persist: "cloud" });
  }
}
```

`runIkNg02IngestBridge` **nie** woła CatalogWork / Quotes / `persistKey` settings.

**G = TAK**, jeśli 08-P0 nie rusza tych linii.

**T21:** zapis **tender item** to **istniejący** persist Documents→BOQ, nie nowy business write (Accept/PM/OUR RATE). DF §12 to rozróżnia — harness musi też.

---

## 10. Admin UI Analysis

| Control | 08-P0 |
|---------|-------|
| Przetargi `tendersTabForStaffEnabled` | zostaje |
| IK `data-ik-entry-toggle` | zostaje · copy Documents/BOQ |
| AUTO_INGEST `data-ik-auto-ingest-toggle` | **usunąć** |
| P3–P8 / Research selecty | **zostają** (08-P1) |

Usunięcie AUTO_INGEST **nie** odbiera Super Adminowi:

- wejścia do Przetargów (`adminCanViewTendersTab(super_admin) === true` zawsze)
- kill ingestu (IK OFF → host nie montuje)
- zapisu `ikEntryEnabled` przez istniejący `saveAppSettings`

Nie ma drugiej wymaganej funkcji na tym checkboxie poza extra AND, które OD-08-1 usuwa.

---

## 11. A05 Compatibility

08-P0 **nie** dotyka `IkE2eMode`, merge, Research `=== true`, `executeResearch: p5ResearchOn === true`.  
T11 = `scripts/test-ik-autonomy-05-explicit-auto-off-on.mjs`.

---

## 12. A06 Compatibility

P7 host `useMemo` / `runIkP7PositionCostBid` poza listą plików IN.  
T12 = `scripts/test-ik-autonomy-06-p7-autonomous-bid-calculation.mjs`.

**Kaskada:** po udanym ingest BOQ READY → P7 AUTO **może** policzyć bid in-memory. To **nie** zmiana kontraktu P7; to skutek OD-08-1. Research/Accept nadal 0.

---

## 13. A07 Compatibility

P8 `runIkP8RiskDecision` poza IN. T13 = `scripts/test-ik-autonomy-07-p8-autonomous-risk-decision.mjs`.  
P8 nie startuje Chief / nie flipuje D.

---

## 14. Safety Review

| Invariant | Po 08-P0 (gdy DF dotrzymany) |
|-----------|------------------------------|
| D | **nie flipowane** · default kodu `false` · **nie** claim live KV (C2) |
| P1 CLOSED | pliki invoice-host **OUT** |
| P2 identity KEEP GAP | `ik-material-identity-p59` **OUT** |
| Composite CLOSED | `ik-composite-both-hold` **OUT** |
| P7 / P8 | **UNCHANGED** source |
| CatalogWork 471 | most **0** zapisów katalogu |
| Research HTTP | 0 dopóki Research checkbox `=== true` (default false) |
| Business writes (Accept/PM/OUR/Final Bid/settings) | **0** w diffie 08-P0 |
| `mat.inv.*` | nie przywracane |
| `\|\| true` | zakazany w DF |
| bypass D / nowy engine | nie |

---

## 15. Test Matrix Review

T01–T05, T07–T10, T22–T26 **mapują się na SOURCE**.

| ID | Uwaga ARCH |
|----|------------|
| T02 | **aktywacja** helper/host, nie gwarancja extractu (nadal `needsIkNg02Ingest`) — **C8** |
| T06 | asercja **braku edycji** `needsIkNg02Ingest` + istniejący P2.5 |
| T11–T18 | konkretne skrypty istnieją (A05/A06/A07 zawierają też GAP zaworu → T15 częściowo pokryte) |
| T14 | `test-ik-p1-invoice-host-collision.mjs` |
| T15 | `test-ik-migration-01-p59-material-identity.mjs` **oraz** T17 w A05 |
| T16 | `test-ik-composite-position-orchestration.mjs` |
| T19 | default + brak zapisu D w diffie — **nie** live KV |
| T20 | source: brak `executeResearch: true` literal |
| T21 | patrz §9 |
| T24 | `data-ik-auto-ingest-toggle` nieobecny |

**Luka DF (nie blocker):** DF każe zaktualizować testy P2/P3, ale **stary kontrakt jest też w:**

- `scripts/test-ik-migration-01-p1-entry.mjs` (host `isIkAutoIngestEnabled` + `autoIngestOn` + Admin toggle)
- `scripts/test-ik-migration-01-p25-ingest.mjs` (host `isIkAutoIngestEnabled`)
- `scripts/test-ik-migration-01-p2-implementation.mjs` (`forceIkAutoIngestForTests(false)` **wyłącza** P2)

Bez aktualizacji tych plików CI **FAIL**. **C1.**

---

## 16. Rollback Review

**TAK**, bez KV:

1. AND z powrotem w helperze  
2. host z powrotem `isIkAutoIngestEnabled()`  
3. przywrócić checkbox  
4. przywrócić asercje MIGRATION-01  

Live nie wymaga rollbacku ustawień leftover (08-P0 ich nie przepisuje).

---

## 17. Reuse First

| Element | Reuse |
|---------|-------|
| `IkEntryHost` | **YES** — ten sam effect |
| helper | **YES** — zmiana semantyki, nie nowy API name wymagany |
| `runIkNg02IngestBridge` | **YES** · OUT |
| `runIkDocumentExpert` | **YES** · OUT |
| persist `onUpdate` | **YES** |
| `AppSettings` / `kw-app-settings` | **YES** · leftover key retained |

---

## 18. New Engine = NO

Brak nowego parsera / BOQ engine. Most NG-02 **OUT**.

---

## 19. New Flag = NO

Brak nowego klucza `AppSettings`. Leftover ingest **zostaje**. Master = istniejący `ikEntryEnabled`.

---

## 20. New Orchestrator = NO

Brak now warstwy. Brak nowego hosta. `TenderDetailPage` mount **bez zmian**.

---

## 21. Architecture Blockers

**ARCHITECTURE BLOCKERS = 0**

Żaden punkt DF nie jest sprzeczny z SOURCE w sposób, który wymagałby korekty DF **przed** Arch PASS. Luki test-list / copy / T19/T21/T02 to **Conditions**, nie blockers.

(Gdyby implementacja zmieniła tylko helper, **nie** host — to byłby defect implementacji, nie DF; DF już wymaga obu.)

---

## 22. Conditions C1–C8

Implementacja (gdy Owner da GO) **musi**:

| ID | Condition |
|----|-----------|
| **C1** | Zaktualizować **wszystkie** harnessy starego P2: `p1-entry`, `p2`, `p3`, `p25-ingest` — nie tylko p2/p3 z DF. |
| **C2** | T19 = `defaultAppSettings().expertAiDecydentEnabled === false` + diff 08-P0 nie zapisuje D. **Nie** asertować live KV D. |
| **C3** | T21 pozwala na **istniejący** persist tender item z mostu. **Zakazuje** CatalogWork / PM / Accept / settings / Final Bid. |
| **C4** | Copy Admin: **obowiązkowe** zdanie Documents/BOQ. Drugie zdanie o Owner Gate jest **overclaim** względem 08-P0 — użyć tylko zdania obowiązkowego **albo** jasno oznaczyć jako semantyka docelowa, nie obietnica UI w tym slice. |
| **C5** | Nie AND-ować `IK_ENTRY_SHELL_AUTO_INGEST` (zostaje `false`) do runtime gate — zablokowałoby ingest. |
| **C6** | Host: usunąć import/użycie `isIkAutoIngestEnabled` z efektu ingest. Helper: **nie** AND `isIkAutoIngestEnabled`. |
| **C7** | P3–P8 Admin selecty **zostają** w 08-P0 (08-P1). To nie jest blocker ani rozszerzenie 08-P0. |
| **C8** | T02 = gate aktywny (helper true + host używa helpera), **nie** „każdy przetarg zawsze wyekstrahuje BOQ”. `needsIkNg02Ingest === false` → skip **zachowany**. |

---

## 23. Final Verdict

**ARCH REVIEW = PASS WITH CONDITIONS**

```text
ARCHITECTURE BLOCKERS = 0
NEW ENGINE            = NO
NEW FLAG              = NO
NEW ORCHESTRATOR      = NO
REUSE                 = YES
08-P0                 = IK ON → Documents → BOQ activation only
```

Odpowiedzi A–N: wszystkie **zgodne** z DF + SOURCE, z C1–C8 na testy/copy/T02/T19/T21.

---

## 24. Implementation Authorization

| Gate | Status |
|------|--------|
| OD-08-1 | APPROVED |
| Design Freeze | CONSISTENT |
| **This Arch Review** | **PASS WITH CONDITIONS** |
| Owner GO IMPLEMENT | **NOT GIVEN** |
| **Implementation** | **NOT AUTHORIZED** |
| Code / Settings | **ZERO** |
| Research / business writes | **ZERO** |
| Commit / Push / Deploy | **NOT DONE** |
| Production Verify | **NOT DONE** |

---

## Checklist A–N (źródło)

| # | Wynik |
|---|--------|
| A First binding | **YES** |
| B Helper = Entry | **YES / SAFE** |
| C Host omija helper | **YES (bug kontraktu, DF naprawia)** |
| D Drugi orch | **NO** |
| E Leftover bez migracji | **YES** |
| F Legacy nie blokuje | **YES if C6** |
| G Persist identical | **YES** |
| H needsIkNg02Ingest | **YES** |
| I Super Admin OK | **YES** |
| J A05/A06/A07 | **YES** |
| K P1/identity/Composite/P7/P8/D | **YES (code); cascade BOQ intended** |
| L new engine/flag/orch/bypass/`\|\| true`/enum `=== true` | **NO in DF** |
| M Rollback | **YES** |
| N T01–T26 | **YES with C1–C8** |

---

## FINAL STATUS

```text
ARCH REVIEW              = PASS WITH CONDITIONS
Architecture blockers    = 0
Conditions               = C1–C8
Implementation           = NOT AUTHORIZED
Code                     = ZERO
Settings                 = ZERO
Research                 = ZERO
Business writes          = ZERO
Commit                   = NOT DONE
Push                     = NOT DONE
Deploy                   = NOT DONE
Production Verify        = NOT DONE
EPIC                     = AUTONOMY-08 — P0
STOP                     = czekaj na OWNER REVIEW / GO IMPLEMENT
```
