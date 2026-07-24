# CI GATE B REMEDIATION — CI-5 (SMOKE-TENDERS-NG01-04)

> **Status:** **CLOSED** · IMPLEMENT + VERIFY → [`CI-GATE-B-REMEDIATION-CI-5-CLOSEOUT.md`](./CI-GATE-B-REMEDIATION-CI-5-CLOSEOUT.md) · DF: [`CI-GATE-B-REMEDIATION-CI-5-DESIGN-FREEZE.md`](./CI-GATE-B-REMEDIATION-CI-5-DESIGN-FREEZE.md)  
> **Data:** 2026-07-25  
> **Tip:** `2741f1b` (CI-4 CLOSED) · CI run [#30130045088](https://github.com/dawidthai125/wgdom/actions/runs/30130045088)  
> **Child FAIL:** `scripts/test-tender-documents-bootstrap-retry.mjs` · asercje **T3** + **T12**  
> **Zakaz IMPLEMENT bez Owner GO:** Tenders UI · Payroll · Cloud Sync · Theme · prod bez DF

---

## 1. AUDIT (summary)

| Fakt | Dowód |
|------|--------|
| Suite | `SMOKE-TENDERS-NG01-04` → thin wrapper TI-B4 `test-tenders-stabilization-smoke.mjs` |
| Abort | Child **[3/12]** `test-tender-documents-bootstrap-retry.mjs` → `57 PASS / 4 FAIL` → smoke ABORT |
| CI log | `PASS`+`FAIL`×2 `T3 retry got smartpzp doc` · `FAIL T12 patch persisted despite cancel` · `FAIL T12 discovery marked…` |
| Lokalnie (clean tip) | **Identyczny** 57/4 — nie env CI |
| Odsłonięcie | Po CI-4 TEUX4 PASS fail-fast dochodzi do smoke (wcześniej ukryte) |
| Bootstrap retry | **Oczekiwany** mechanizm NG-02 (P1 Pack A + 02.1C) — nie „losowy” harness |

---

## 2. Ścieżka wykonania

```text
Gate B --scope tenders
  → SMOKE-TENDERS-NG01-04
    → [1] trust-layer PASS
    → [2] pipeline-automation-p0 PASS
    → [3] test-tender-documents-bootstrap-retry.mjs  ← FAIL (T3, T12)
    → ABORT (pozostałe 9 child nie startują)
```

Bootstrap retry jest **świadomym** testem kontraktu discovery/bootstrap (SSOT `attemptTenderDocumentsBootstrap` + `runTenderFullDocumentDiscovery`), nie smoke UI.

---

## 3. RCA — T3 (`retry got smartpzp doc`)

### Miejsce

```208:211:scripts/test-tender-documents-bootstrap-retry.mjs
    onUpdate: (p) => {
      ok("T3 retry got smartpzp doc", p.bzpDocuments?.[0]?.platform === "smartpzp");
    },
```

### Oczekiwane

Po udanym retry: wśród patchy jest doc z `platform: "smartpzp"`.

### Faktyczne

`onUpdate` wołany **wiele razy** (discovery patch + shell patches).  
Pierwszy call z `bzpDocuments[0].platform === "smartpzp"` → **PASS**.  
Kolejne (shell / bez docs) → **FAIL** ×2.  
Sam retry działa: `PASS T3 retry ok`.

### Klasyfikacja T3

| | |
|--|--|
| **test bug** | **TAK** — asercja w callbacku na *każdy* patch zamiast `patches.some(...)` jak T2/T11 |
| production | **NIE** (SmartPZP path przechodzi) |
| false positive | **TAK** względem intencji T3 |

---

## 4. RCA — T12 (`patch persisted despite cancel` / discovery marked)

### Intencja NG-02.1C (kontrakt)

```text
Orchestrator kończy fetch mimo cancel.
Persist / apply gate = bootstrap:
  applyDiscovery = !isCancelled() || hasAuthoritativeDiscoveryPatch(discovery)
  hasAuthoritative = meta.bzpRan && meta.bzpDocCount > 0
```

Test T12: w `fetchTenderDocuments` ustawia `cancelled=true`, potem oczekuje patch z docs + `isTenderDiscoveryCompleted`.

### Miejsce awarii (produkcja)

`src/lib/tender-pipeline/tender-full-document-discovery.ts` ~L305–308 (ścieżka non-fork):

```ts
if (!isCancelled() && ssot.meta.fetchExecuted) {
  applyBzpSsotToRun(...);  // ustawia meta.bzpRan = true + patch.bzpDocuments
}
```

Gdy cancel flipnie **w trakcie** fetch (scenariusz T12):

1. Fetch BZP **kończy się sukcesem** (mock zwraca doc).  
2. Wynik **nie** trafia do `patch` / `meta.bzpRan` (bramka `!isCancelled()`).  
3. `meta.bzpDocCount === 0`, `bzpRan === false`.  
4. Bootstrap: `hasAuthoritativeDiscoveryPatch === false` → `applyDiscovery === false` → **brak** `onUpdate` z docs.  
5. `canMarkComplete === false` → discovery **nie** oznaczone.

Warstwa bootstrap ma poprawny gate 02.1C; **discovery zjada wynik przed bootstrapem** — kontrakt „persist w bootstrap” jest złamany.

**SSOT historyczne:** [`SESSION-HANDOFF-NG-02-EPIC-CLOSE.md`](../SESSION-HANDOFF-NG-02-EPIC-CLOSE.md) §4.3 mówi wprost: *orchestrator dostaje `isCancelled: () => false`*. Obecny kod przekazuje **prawdziwy** `isCancelled` do `runTenderFullDocumentDiscovery` (m.in. pod fork NG11) — to rozjazd z handoffem i z T12.

### Oczekiwane vs faktyczne

| | Oczekiwane (T12 / 02.1C) | Faktyczne |
|--|--------------------------|-----------|
| Fetch po cancel | Dokończony | Tak |
| `discovery.patch.bzpDocuments` | Obecne (authoritative) | **Puste** |
| `onUpdate` z docs mimo cancel | Tak | **Nie** |
| `isTenderDiscoveryCompleted` | Tak | **Nie** |
| `r.ok` | true | true (bootstrap nie mapuje `discovery.ok`) |

### Klasyfikacja T12

| | |
|--|--|
| **production bug** | **TAK** — regresja / niedomknięcie NG-02.1C między discovery a bootstrap (apply BZP gated w discovery zamiast tylko w bootstrap) |
| test bug | NIE — test zgodny z 02.1C / komentarzem w `useTenderDocumentsBootstrap.ts` |
| env / workflow | NIE |
| false positive | NIE |

**Czy bootstrap-retry jest „błędnie testowany”?** Tylko **T3** (kształt asercji). **T12** poprawnie wykrywa lukę kontraktu.

**Czy to świeża regresja CI-4?** NIE — latent FAIL od dawna, ukryty fail-fastem TEUX4. HARDENING-01A (`23d7723`) nie jest root cause T12 (bramka cancel w discovery starsza / niezależna od midOpts).

---

## 5. Wpływ na produkcję

| Scenariusz | Ryzyko |
|------------|--------|
| User unmount / cancel mid-discovery po udanym BZP fetch | **Średnie** — udane docs mogą **nie** zostać zapisane (dokładnie to, co 02.1C miał chronić) |
| Normalny happy path bez cancel | Niski — poza T12 |
| Payroll / Cloud Sync CORE | **Brak** |
| Gate B / Gate C | **Blokada CI** (smoke abort) |

---

## 6. PLAN — najmniejsza poprawka + priorytet

| Priorytet | ID | Akcja | Zakres | Klasa |
|-----------|-----|--------|--------|-------|
| **P0** | **CI-5A T12** | Przywrócić kontrakt NG-02.1C (jedna z opcji, Owner wybiera w DF): **(A — preferowana per handoff)** w `attemptTenderDocumentsBootstrap` wołać discovery z `isCancelled: () => false` (orchestrator kończy fetch; persist gate zostaje w bootstrap) — [`SESSION-HANDOFF-NG-02-EPIC-CLOSE.md`](../SESSION-HANDOFF-NG-02-EPIC-CLOSE.md) §4.3; **(B)** discovery: po udanym `fetchExecuted` zawsze `applyBzpSsotToRun` mimo cancel (fork musi zachować własne semantyki). | bootstrap i/lub `tender-full-document-discovery.ts` · T12 bez zmiany semantyki | **production** (kontrakt 02.1C) |
| **P1** | **CI-5B T3** | Test-only: zbierz `patches[]`, jedna asercja `patches.some(p => p.bzpDocuments?.[0]?.platform === "smartpzp")` (wzorzec T2). | `test-tender-documents-bootstrap-retry.mjs` | **test bug** |
| **P2** | Re-run | Pełny `SMOKE-TENDERS-NG01-04` + Gate B tenders po P0+P1 | CI | verify |
| **P3** | Docs | Doprecyzować w ARCHITECTURE / NG-02: „discovery returns patch; bootstrap gates persist” | docs | hygiene |

**OUT (bez Owner GO na prod):** zmiana semantyki 02.1C na „cancel drop results”; Theme; Payroll; Cloud Sync CORE; WIP accordion.

### DESIGN FREEZE — szkic (PROPOSED)

| Reguła | Treść |
|--------|--------|
| **IN P0** | `tender-full-document-discovery.ts` — apply BZP SSOT do wyniku mimo cancel po udanym fetch |
| **IN P1** | T3 assert → `patches.some` |
| **OUT** | Cofanie bootstrap `hasAuthoritativeDiscoveryPatch`; zmiana kill-switch HARDENING-01A; UI |
| **DoD** | `test-tender-documents-bootstrap-retry.mjs` 0 FAIL · `SMOKE-TENDERS-NG01-04` PASS na CI |

---

## 7. Next

Czekaj **Owner GO → DESIGN FREEZE + IMPLEMENT** (zalecane: **P0+P1 w jednym bundle CI-5**).  
Nie traktować T12 jako samego „test fix” bez decyzji o warstwie discovery.
