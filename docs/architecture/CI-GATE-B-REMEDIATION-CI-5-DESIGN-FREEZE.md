# CI GATE B REMEDIATION — CI-5 DESIGN FREEZE

> **Status:** **CLOSED** (IMPLEMENT + VERIFY PASS) · closeout: [`CI-GATE-B-REMEDIATION-CI-5-CLOSEOUT.md`](./CI-GATE-B-REMEDIATION-CI-5-CLOSEOUT.md)  

> **Data:** 2026-07-25  
> **Wejście:** [`CI-GATE-B-REMEDIATION-CI-5-SMOKE-TENDERS-NG01-04-RCA.md`](./CI-GATE-B-REMEDIATION-CI-5-SMOKE-TENDERS-NG01-04-RCA.md)  
> **Tip bazowy:** `2741f1b` (CI-4 CLOSED)  
> **T12:** Wariant A · **T3:** `patches.some`

```text
══════════════════════════════════════
CI-5 DESIGN FREEZE
T12: WARIANT A (FROZEN)
T3:  patches.some (FROZEN)
OUT: Payroll · Cloud Sync CORE · Theme · UI · WIP accordion
══════════════════════════════════════
```

---

## 0. Decyzje zamrożone (executive)

| ID | Decyzja | Wartość FROZEN |
|----|---------|----------------|
| **D1** | T12 — wariant naprawy | **A** — discovery z `isCancelled: () => false` w bootstrap |
| **D2** | T12 — wariant B | **OUT** tego bundle (nie zmieniać `applyBzpSsotToRun` gate w discovery) |
| **D3** | T3 | Asercja końcowa `patches.some(...)` — **tylko test** |
| **D4** | Persist gate bootstrap | **BEZ ZMIAN** — `applyDiscovery = !isCancelled() \|\| hasAuthoritativeDiscoveryPatch` |
| **D5** | Fork NG11-A3 | Default OFF — bez zmiany semantyki forka w CI-5; A przywraca 02.1C przy wyłączonym forku |
| **D6** | Payroll / Cloud Sync / Theme / UI | **OUT** |
| **D7** | Bundle | Test + **jedna** linia (lub równoważny blok) w `useTenderDocumentsBootstrap.ts` |

---

## 1. Porównanie wariantów T12

### Wspólny cel

Po cancel mid-fetch (cleanup effect / unmount): udany BZP nadal trafia do `discovery.patch` + meta authoritative, bootstrap może `onUpdate` mimo cancel (NG-02.1C).

### Wariant A — `isCancelled: () => false` do discovery

```ts
// attemptTenderDocumentsBootstrap — wywołanie discovery
await runTenderFullDocumentDiscovery(item, {
  mode: "auto",
  prefetchNotice: true,
  includeExternal: true,
  isCancelled: () => false,  // FROZEN — NG-02.1C
  deps,
});
// persist nadal: applyDiscovery = !isCancelled() || hasAuthoritativeDiscoveryPatch(...)
```

| Kryterium | Ocena |
|-----------|--------|
| **Zgodność z NG-02.1C** | **Pełna** — handoff §4.3 + ARCHITECTURE §12.1.26: *orchestrator bez isCancelled z effect* |
| **Architektura** | Separacja: discovery **kończy** fetch; bootstrap **gate’uje** persist/toast/shell | 
| **Wpływ na bootstrap** | Authoritative patch wraca → istniejący `hasAuthoritativeDiscoveryPatch` + `applyDiscovery` działają jak zaprojektowano |
| **Wpływ na retry** | Neutralny / pozytywny — retry nie zależy od cancel z poprzedniego effect |
| **Ryzyko regresji** | **Niskie–średnie** — przy forku OFF (prod default) zgodne z 02.1C; discovery nadal współdzielone z manual (manual zwykle bez cancel) |
| **Rekomendacja** | **WYBRANY (FROZEN)** |

### Wariant B — `applyBzpSsotToRun` mimo cancel w discovery

Zmiana w `tender-full-document-discovery.ts`: po `fetchExecuted` zawsze apply do patch/meta, nawet gdy `isCancelled()`.

| Kryterium | Ocena |
|-----------|--------|
| **Zgodność z NG-02.1C** | Częściowa — naprawia T12, ale **przeciw** handoffowi: *„Nie naprawiaj prod przez zmiany w runTenderFullDocumentDiscovery bez audytu”* |
| **Architektura** | Miesza cancel do wspólnego SSOT discovery (bootstrap + manual + rescan + fork) |
| **Wpływ na bootstrap** | Działa z obecnym przekazaniem prawdziwego `isCancelled` |
| **Wpływ na retry** | OK |
| **Ryzyko regresji** | **Wyższe** — side-effect na fork cancel, external apply, `ok: !isCancelled()`, inne call sites |
| **Rekomendacja** | **ODRZUCONY w CI-5** · opcjonalny backlog jeśli fork ON wymaga finer cancel |

### Werdykt T12

**FROZEN: WARIANT A.**

Uzasadnienie: odtwarza SSOT zamkniętego epiku 02.1C bez ruszania wspólnego discovery; najmniejszy blast radius; T12 przechodzi przy istniejącym gate bootstrap; zgodne z komentarzem w kodzie (*persist gate w bootstrap*).

---

## 2. Projekt poprawki T3 (FROZEN)

**IN:** tylko `scripts/test-tender-documents-bootstrap-retry.mjs` (blok T3).

**OUT:** zachowanie SmartPZP / discoverExternal / bootstrap.

### Docelowy kształt (pseudokod)

```js
const patches = [];
const r2 = await attemptTenderDocumentsBootstrap({
  item: baseItem(),
  onUpdate: (p) => { patches.push(p); },
  deps,
});
ok(
  "T3 retry got smartpzp doc",
  patches.some((p) => p.bzpDocuments?.[0]?.platform === "smartpzp"),
);
ok("T3 retry ok", r2.ok === true);
ok("T3 discover best-effort does not block retry path", discoverCalls >= 0);
```

Usunąć `ok(...)` z wnętrza `onUpdate`. Wzorzec = T2 / T11 / T12.

---

## 3. Ocena ryzyka (bundle CI-5)

| Obszar | Ryzyko | Mitigacja |
|--------|--------|-----------|
| Unmount mid-discovery | **Spadek** (przywrócenie 02.1C) | T12 + regresja bootstrap-retry |
| Fork ON (feature flag) | Niskie w CI-5 (default OFF) | Nie zmieniać forka; osobny AUDIT jeśli włączą |
| False green T3 | Eliminacja | `patches.some` |
| Payroll / sync | **ZERO** | OUT |
| Egress / HARDENING-01A midOpts | **ZERO** | Nie ruszać persist opts |

---

## 4. Zakres implementacji (po Owner GO)

| # | Plik | Zmiana |
|---|------|--------|
| 1 | `src/app/hooks/useTenderDocumentsBootstrap.ts` | W wywołaniu `runTenderFullDocumentDiscovery`: `isCancelled: () => false` (+ krótki komentarz SSOT 02.1C / CI-5) |
| 2 | `scripts/test-tender-documents-bootstrap-retry.mjs` | T3 → `patches.some` |
| 3 | Docs (opcjonalnie w tym samym commit) | Ten DF + aktualizacja statusu RCA CI-5 → IMPLEMENT |

**OUT:** `tender-full-document-discovery.ts` · Theme · UI · Payroll · Cloud Sync · WIP accordion/tokens.

### Plan testów IMPLEMENT

```bash
npx vite-node scripts/test-tender-documents-bootstrap-retry.mjs
npx vite-node scripts/test-tenders-stabilization-smoke.mjs   # lub Gate B --scope tenders
# zalecane regresje NG-02:
npx vite-node scripts/test-tender-full-document-discovery.mjs
npx vite-node scripts/test-tender-pipeline-automation-p0.mjs
```

### DoD IMPLEMENT

- bootstrap-retry **0 FAIL** (T3+T12 PASS)
- `SMOKE-TENDERS-NG01-04` PASS na CI
- Gate B tenders: brak FAIL na tym smoke
- Zero zmian Command Layer / Theme / Payroll

---

## 5. Gotowość do IMPLEMENT

| Check | Status |
|-------|--------|
| AUDIT/RCA complete | TAK |
| T12 wariant zamrożony (A) | TAK |
| T3 projekt zamrożony | TAK |
| Ryzyko ocenione | TAK |
| Plan plików + testów | TAK |
| Kod zmieniony w tym etapie | **NIE** |
| Commit / push | **NIE** |

**→ READY FOR OWNER GO → IMPLEMENT CI-5 (A + T3).**
