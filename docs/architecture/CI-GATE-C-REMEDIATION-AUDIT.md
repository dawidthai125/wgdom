# CI GATE C REMEDIATION — AUDIT · RCA · PLAN

> **Status:** **AUDIT + RCA + PLAN COMPLETE** · **CI-C-1 DF FROZEN** → [`CI-GATE-C-REMEDIATION-CI-C-1-DESIGN-FREEZE.md`](./CI-GATE-C-REMEDIATION-CI-C-1-DESIGN-FREEZE.md) · czekaj Owner GO → IMPLEMENT  
> **Data:** 2026-07-25  
> **Wejście:** Gate B Remediation **CLOSED** (CI-1…CI-5) · tip Gate C evidence `df5f2ef`  
> **CI evidence:** [TEST-INFRA Gates #30131950449](https://github.com/dawidthai125/wgdom/actions/runs/30131950449) · Gate C job `89608676285`  
> **Cross-check (ten sam SHA):** legacy [E2E happy path #30131950436](https://github.com/dawidthai125/wgdom/actions/runs/30131950436)  
> **Zakaz:** IMPLEMENT / commit / push / zmiany prod (Tenders · Payroll · Cloud Sync · Theme · UI) bez Owner GO → DF

```text
══════════════════════════════════════
GATE C — STAN
Manifest · Gate B payroll · Gate B tenders = PASS
Gate C (E2E preview) = FAIL
Pierwszy Gate C uruchomiony po miesiącach skipów (Gate B red)
Gate C success w historii TI-B3 (sample ~40 runów) = 0
══════════════════════════════════════
```

---

## 0. Executive summary

| Warstwa | Werdykt |
|---------|---------|
| **Bezpośrednia przyczyna red Gate C** | Orchestrator **nie wystawia** reachable preview `:4173` (#010) — **żaden** z 3 testów E2E Gate C **nie startuje** |
| **Klasyfikacja P0** | **workflow bug** (+ diagnostyka **env**) w `scripts/test-infra-orchestrator.mjs` |
| **Wpływ na produkcję (P0)** | **Brak** — awaria CI harness, nie runtime wgdom.fun |
| **Ukryte (latent) po naprawie preview** | `E2E-HAPPY-PATH` (project obejmuje też `jobs-mobile-layout`) **FAIL** na tym samym SHA w legacy workflow — głównie **test bug** (stale copy MV-2) |
| **E2E-VERSION / E2E-PAYROLL-GUARD-S1** | **NOT RUN** na Gate C · status **UNKNOWN** do momentu odblokowania preview |

---

## 1. Zakres Gate C (manifest SSOT)

Suite `gate-c-e2e-preview` (`test-infra/test-manifest.json`):

| Test ID | Path | Playwright project | Mandatory |
|---------|------|--------------------|-----------|
| **E2E-HAPPY-PATH** | `e2e/worker-admin-inspector-happy-path.spec.ts` | `e2e-happy-path` | always |
| **E2E-VERSION-AWARENESS** | `e2e/version-awareness.spec.ts` | `e2e-version-awareness` | always |
| **E2E-PAYROLL-GUARD-S1** | `e2e/payroll-guard-s1.spec.ts` | `e2e-payroll-guard` | always |

**Uwaga bundlingu:** project `e2e-happy-path` ma `testMatch` na **oba**:
- `worker-admin-inspector-happy-path.spec.ts`
- `jobs-mobile-layout.spec.ts` (20.5Z.5C)

Czyli awaria `jobs-mobile-layout` **blokuje** ten sam entry `E2E-HAPPY-PATH` w Gate C, mimo że nie ma osobnego `testId` w manifescie.

CI job: `.github/workflows/test-infra-gates.yml` → `npm run test:infra -- --gate C --scope all` · `PW_BASE_URL=http://127.0.0.1:4173`.

---

## 2. Lista czerwonych / zablokowanych (Gate C + latent)

### 2.1 Bezpośrednio czerwone na Gate C (observed)

| # | Identyfikator | Status na Gate C | Etap |
|---|---------------|------------------|------|
| **C-0** | Orchestrator preview bootstrap `#010` | **FAIL** (blocking) | **przed** Playwright — `ensurePreviewServer` |

Komunikat:

```text
Preview server not reachable at http://127.0.0.1:4173 after 90s (#010)
```

Timeline (job `89608676285`):

| Czas (UTC) | Etap |
|------------|------|
| 22:51:40 | `=== BUILD (gate implicit) ===` → PASS |
| 22:52:07 | `E2E preview target: http://127.0.0.1:4173` |
| 22:52:07 | `=== PREVIEW (#010) — starting npm run preview ===` |
| 22:53:37 | throw po 90s — exit 1 |
| — | Brak logów Vite (stdio ignore) · brak artefaktów `e2e-report/` |

**Następstwo:** `E2E-HAPPY-PATH` · `E2E-VERSION-AWARENESS` · `E2E-PAYROLL-GUARD-S1` = **NOT EXECUTED** (nie „zielone”).

### 2.2 Latent FAIL (ten sam SHA, legacy E2E — preview **działa**)

Źródło: workflow `e2e-happy-path.yml` run `#30131950436` (push CI-5).

Preview: `npm run preview -- --host 127.0.0.1 --port 4173 &` → **„Preview ready”** (~5 s) · curl `/`.

| # | Spec / scenariusz | Miejsce awarii | Komunikat | Etap |
|---|-------------------|----------------|-----------|------|
| **C-1a** | `jobs-mobile-layout` · scenariusz B | `e2e/jobs-mobile-layout.spec.ts:56` | `expect(getByRole('button', { name: /Powrót do listy/i })).toBeVisible` — element(s) not found (20s) | po kliknięciu karty roboty (mobile drill-in) |
| **C-1b** | `worker-admin-inspector-happy-path` | `e2e/helpers/jobs.ts:82` (`openInspectorJob`) | `TimeoutError: locator.click` — waiting for `getByRole('button', { name: /E2E Testowa 20\.5Z\.1/i })` | faza INSPECTOR po seed reinject |
| *(pass)* | `jobs-mobile-layout` · scenariusz A | — | PASS | lista mobile OK → seed admin działa |
| *(skipped)* | scenariusz C | zależny od B | skipped po FAIL B | — |

Legacy summary: **2 failed / 1 passed** · step `test:e2e:version` **nie wystartował** (job abort na happy).

### 2.3 UNKNOWN do fail-fast po CI-C-1

| # | Test ID | Status |
|---|---------|--------|
| **C-2** | `E2E-VERSION-AWARENESS` | NOT RUN (Gate C + legacy abort) |
| **C-3** | `E2E-PAYROLL-GUARD-S1` | NOT RUN (Gate C; nie w legacy workflow) |

---

## 3. RCA

### 3.1 C-0 — Preview not reachable (#010) — **P0**

**Miejsce:** `scripts/test-infra-orchestrator.mjs` → `startPreviewServer` / `ensurePreviewServer` / `isPreviewReachable`.

**Fakty:**

1. Build PASS; `dist/` kompletny (w tym tor `version.json` via `closeBundle` w `vite.config.ts`).
2. Orchestrator: `spawn("npm", ["run", "preview"], { shell: true, detached: true, stdio: "ignore" })` + `child.unref()`.
3. Health-check: HTTP GET `/version.json` === 200, poll 90s, busy-wait `sleepSync(1000)`.
4. **Zero** stdout/stderr Vite w logu CI → niemożliwa lokalna diagnoza crash/EADDRINUSE z samego Gate C.
5. **Ten sam SHA / ten sam runner image:** legacy start preview **bez** `detached`/`stdio:ignore` → **ready w ~5 s**.
6. Historia TI-B3: Gate C niemal zawsze **skipped** (Gate B red). Po CI-5 Gate B green → **pierwszy realny Gate C FAIL**; w sample ~40 runów **0× success** Gate C.
7. Lokalny probe (Windows): `isPreviewReachable` z `shell: true` **psuje** skrypt `-e` (SyntaxError) — dodatkowy dług techniczny health-checku (na Linux cytowanie może być OK, ale wzorzec jest kruchy).

**Root cause (hipoteza wiodąca, confidence HIGH):**  
**workflow bug** — sposób uruchamiania preview w orchestratorze (#010) nie utrzymuje reachable serwera na GHA, w przeciwieństwie do sprawdzonego wzorca legacy (`preview &` + curl `/`).

**Hipotezy wspierające (do DF):**

| H | Opis | Jak zweryfikować w IMPLEMENT |
|---|------|------------------------------|
| H1 | `detached` + `stdio:ignore` + `unref` → proces Vite ginie / nie binduje | pipe logs; PID/lsof; align do legacy |
| H2 | Health-check `/version.json` + `shell:true` fałszywie negatywny mimo żywego preview | probe `/` jak legacy; `shell:false` |
| H3 | `strictPort` / race | log Vite |

**Nie jest:** regresja CI-5 bootstrap Tenders (Gate B tenders PASS; awaria przed E2E).

**Klasyfikacja:** **workflow bug** (primary) · **env bug** (secondary — brak obserwowalności).  
**Nie:** production bug · nie false positive „testu asercji” (to fail harnessu przed testami).

**Wpływ prod:** **żaden** (CI only).

---

### 3.2 C-1a — `Powrót do listy` vs `Lista` — **P1**

**Fakty:**

- Test: `getByRole('button', { name: /Powrót do listy/i })`.
- Prod UI (`JobsView.tsx` ~1644–1650, Mobile Recovery MV-2): przycisk mobile back = **„Lista”** (+ `ArrowLeft`), **nie** „Powrót do listy”.
- Scenariusz A PASS → lista/seed OK; B FAIL na stale label.

**Root cause:** **test bug** — selektor nie zsynchronizowany z copy MV-2 (2.62.79).

**Wpływ prod:** **żaden** (regresja testu). UX „Lista” jest zamierzony.

---

### 3.3 C-1b — Inspector nie widzi seeded job — **P1**

**Fakty:**

- Worker + Admin ścieżka w tym samym teście dochodzi do assertów dokumentacji/Files Hub.
- FAIL w `openInspectorJob`: brak buttona adresu `E2E Testowa 20.5Z.1` (20s × retries).

**Hipotezy (confidence MED):**

| H | Klasa | Opis |
|---|-------|------|
| H1 | test / harness | `reinjectKwJobs` / seed po `loginInspector` nadpisany bootstrapem / LS |
| H2 | test | selektor listy inspektora zmienił się (nie `button` z name=adres) |
| H3 | production | Inspector nie pokazuje lokalnie seedowanych robót (ACL / filtr) — **wymaga proof** po C-0+C-1a |

**Klasyfikacja robocza:** **test bug** (primary pending) · **production bug** dopiero po dowodzie z trace/screenshot po naprawie preview + mobile selectors.  
**Wpływ prod:** niepotwierdzony; jeśli H3 → P0 produktowy Inspector/seed path (osobny DF).

---

### 3.4 C-2 / C-3 — UNKNOWN

Brak wykonania. Po CI-C-1 fail-fast ujawni status. Nie klasyfikować na ślepo.

---

## 4. Wpływ na produkcję (zbiorczo)

| ID | Prod impact |
|----|-------------|
| C-0 | **Brak** — CI Gate C czerwony; release signal fałszywie negatywny |
| C-1a | **Brak** — stale E2E |
| C-1b | **Niepotwierdzony** — najpewniej harness; weryfikacja po C-0 |
| C-2/C-3 | **n/a** do run |

**Biznesowo:** Gate B (payroll+tenders) jest zielony; ryzyko produktowe Gate C = utrata sygnału regresji E2E, nie outage prod.

---

## 5. Klasyfikacja + priorytet

| ID | Nazwa | Klasyfikacja | Priorytet |
|----|-------|-------------|-----------|
| **CI-C-1** | Preview `#010` unreachable | **workflow bug** (+ env observability) | **P0** |
| **CI-C-2** | `jobs-mobile` B — „Powrót do listy” → „Lista” | **test bug** | **P1** |
| **CI-C-3** | Happy-path inspector job click | **test bug** (roboczo) / prod TBD | **P1** |
| **CI-C-4** | `E2E-VERSION-AWARENESS` | UNKNOWN | **P2** (po C-1) |
| **CI-C-5** | `E2E-PAYROLL-GUARD-S1` | UNKNOWN | **P2** (po C-1) |

---

## 6. PLAN — kolejność EPIC (propozycja)

```text
CI-C-1 (P0)  →  DESIGN FREEZE (Owner GO)  →  IMPLEMENT preview harness
     ↓ fail-fast Gate C
CI-C-2 (P1)  →  DF → update selektorów mobile Jobs (Lista / helper SSOT)
CI-C-3 (P1)  →  DF → seed/inspector open (test vs prod dowód)
CI-C-4 (P2)  →  version-awareness (jeśli red)
CI-C-5 (P2)  →  payroll-guard-s1 (jeśli red)
CLOSE EPIC gdy Gate C job PASS + 3× mandatory E2E PASS
```

### 6.1 CI-C-1 — kierunek naprawy (do DF, **nie** IMPLEMENT teraz)

Zakres IN (oczekiwany):

- `scripts/test-infra-orchestrator.mjs` (#010 start + health-check + logi)
- ewentualnie `.github/workflows/test-infra-gates.yml` (tylko jeśli DF wymaga mirror legacy)
- docs closeout

Zakres OUT:

- `src/**` app / Tenders / Payroll / Cloud Sync / Theme / UI
- zmiana semantyki testów E2E (to CI-C-2+)
- `tender-full-document-discovery` / Gate B

Kierunki DF (do wyboru Owner GO):

| Wariant | Opis |
|---------|------|
| **A (rekomendowany)** | Align do legacy: foreground/background bez `stdio:ignore`; wait na `/` lub `/version.json` z `shell:false`; logi preview do CI |
| **B** | Playwright `webServer` w config tylko dla Gate C projects |
| **C** | Workflow step start preview **poza** orchestratorem (łamie #010 — niepreferowane) |

### 6.2 Definition of Done EPIC (docelowe)

- Gate C job PASS na `main`
- `E2E-HAPPY-PATH` + `E2E-VERSION-AWARENESS` + `E2E-PAYROLL-GUARD-S1` PASS
- Brak regresji Gate B
- Brak zmian poza zatwierdzonymi DF bundle’ami
- Docs closeout

### 6.3 Gotowość

| Etap | Status |
|------|--------|
| AUDIT | **COMPLETE** |
| RCA | **COMPLETE** (C-0 HIGH · C-1a HIGH · C-1b MED · C-2/3 OPEN) |
| PLAN | **COMPLETE** |
| DESIGN FREEZE | **PENDING Owner GO** (najpierw CI-C-1) |
| IMPLEMENT | **BLOCKED** |

---

## 7. Dowody / artefakty sesji

| Artefakt | Rola |
|----------|------|
| `.tmp/gate-c-89608676285.log` | Gate C job log |
| `.tmp/legacy-e2e-ci5.log` | latent E2E FAIL przy działającym preview |
| `.tmp/audit-gate-c-preview-probe.mjs` | lokalny probe `shell:true` vs `false` (nie commitować) |
| `JobsView.tsx` L1644–1650 | copy „Lista” vs test „Powrót do listy” |

---

## 8. Raport dla Ownera (skrót 1:1)

1. **Czerwone Gate C:** faktycznie **1 blocking** — preview `#010`; trzy E2E **nie uruchomione**.
2. **RCA:** workflow bug orchestratora; legacy preview na tym SHA działa.
3. **Prod:** brak wpływu z C-0; C-1a = stale test po MV-2; C-1b TBD.
4. **Klasyfikacja:** C-0 workflow · C-1a test · C-1b test (roboczo).
5. **Priorytet:** P0 preview → P1 happy/mobile → P2 version/payroll-guard.
6. **Kolejność:** CI-C-1 → … → CI-C-5; **następny krok = Owner GO → DESIGN FREEZE CI-C-1**.
