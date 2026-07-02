# TEST-INFRA-001 — AUDIT REPORT

**Typ:** AUDIT ONLY · READ ONLY · **STOP**  
**Data:** 2026-07-01  
**Baseline prod:** v2.63.25 (`d9ba13f`)  
**Powiązany design (nie implementowany):** [`TEST-INFRA-001-DESIGN-FREEZE.md`](TEST-INFRA-001-DESIGN-FREEZE.md)  
**Zakaz tego audytu:** implementacja · kod · testy · projekt rozwiązania · backlog programistyczny

---

## 0. Werdykt audytu (skrót)

| Obszar | Ocena |
|--------|-------|
| **Pokrycie lib / domena (vite-node)** | **Silne** w Przetargach · Payroll · BOQ · WM Druk · EM |
| **E2E (Playwright)** | **Średnie** — Roboty/worker/inspektor + mobile; **słabe** Lista Płac · Przetargi workspace |
| **CI / release gate** | **Częściowe** — build Vercel + 2 workflow E2E; **brak** gate na pakiet regresji lib |
| **Orkiestracja** | **Słaba** — brak `npm test` · brak smoke agregatu NG-01–04 (M-02) |
| **Harness TEST-INFRA-001** | **Design APPROVED** · **kod NOT STARTED** |

---

## 1. Obecny stan — architektura testów

### 1.1 Warstwy (faktyczna architektura repo)

```text
┌─────────────────────────────────────────────────────────────────┐
│  Warstwa A — vite-node scripts (scripts/test-*.mjs)             │
│  Import SSOT z src/lib · asercje w Node · bez przeglądarki      │
│  ~241 plików test-*                                              │
├─────────────────────────────────────────────────────────────────┤
│  Warstwa B — smoke / release (scripts/smoke*.mjs)               │
│  Bundle prod · dist · regresja release · część prod probe       │
│  ~126 plików smoke*                                              │
├─────────────────────────────────────────────────────────────────┤
│  Warstwa C — Playwright E2E (e2e/*.spec.ts)                      │
│  9 speców · prod default lub preview :4173 w CI                 │
├─────────────────────────────────────────────────────────────────┤
│  Warstwa D — audyt statyczny                                    │
│  audit:mobile · audit:import-cycles · scripts/audit-*.mjs       │
│  ~128 audit-* (forensics/RCA — NIE suite regresji)              │
└─────────────────────────────────────────────────────────────────┘
```

**Brak:** Vitest · Jest · Mocha · unified `npm test` · coverage · test matrix w CI dla lib.

**Runner lib:** `npx vite-node scripts/<nazwa>.mjs` (ręcznie, ad hoc).

**Runner E2E:** `@playwright/test` via `playwright.config.ts` (+ osobny `playwright.audit.config.ts` dla audytów P0 Przetargów).

### 1.2 Uruchamianie (SSOT komend)

| Komenda | Zakres | Domyślne środowisko |
|---------|--------|---------------------|
| `npm run build` | Gate Vercel / release A/B/C | lokalnie |
| `npx vite-node scripts/test-*.mjs` | Lib / regresja domenowa | Node, bez UI |
| `npm run test:mobile` | Wszystkie projekty Playwright | **`https://www.wgdom.fun`** |
| `npm run test:e2e:happy` | Happy path worker/admin/inspector + jobs mobile | CI: **`http://127.0.0.1:4173`** |
| `npm run test:e2e:version` | Version awareness | CI: preview :4173 |
| `npm run test:e2e:mobile-auth` | Mobile auth smoke (4 urządzenia) | prod |
| `npm run audit:mobile` | Statyczny audyt mobile CSS/DOM | Node |
| `npm run audit:import-cycles` | ARCH-001 import cycles | Node |

**CI GitHub Actions:**

| Workflow | Trigger | Gate |
|----------|---------|------|
| `.github/workflows/e2e-happy-path.yml` | push `main` (paths) | build + preview + happy + version |
| `.github/workflows/mobile-smoke.yml` | push `main` (paths) | audit:mobile + build + **test:mobile vs prod** |
| `deploy-supabase.yml` | Edge deploy | backend |
| `scheduled-backup.yml` | cron | backup |

**Release workflow (docs):** [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md) — A: build · B: build + relevant smoke · C: build + smoke + E2E. **Smoke lib nie jest automatyczny na każdy push.**

### 1.3 Klasyfikacja typów testów

| Typ | Definicja w WGDOM | Przykłady |
|-----|-------------------|-----------|
| **Unit / lib regression** | `test-*.mjs` — logika czysta, import `src/lib` | `test-payroll-bootstrap-runtime-parity-b4.mjs`, `test-tender-dossier-merge-quality.mjs` |
| **Smoke** | Szybka weryfikacja release/bundle/UI path | `smoke-prod-bundle-*.mjs`, `smoke-test-generic-attachments-20.5a10.mjs`, E2E mobile-smoke |
| **Integration** | Wiele modułów / sync / bootstrap / rollover chain | `smoke-test-payroll-rollover-sync-integration-20.1c1.mjs`, `smoke-etap3a-cloud-loader.mjs`, E2E happy path |
| **E2E UI** | Playwright — pełna przeglądarka | `worker-admin-inspector-happy-path.spec.ts`, `desktop-layout.spec.ts` |
| **Forensic audit** | RCA jednorazowy — **nie** utrzymywana regresja | `scripts/audit-p0-3*.mjs`, `audit-p0-zi-*` |

**Uwaga:** Konwencja nazw `test-*` vs `smoke-*` jest **niespójna historycznie** — część „smoke” testuje lib, część „test” jest release gate.

---

## 2. Pokrycie modułów

### 2.1 Payroll — **SILNE (lib)** · **SŁABE (E2E)**

| Obszar | Pliki / zakres | Ocena |
|--------|----------------|-------|
| Roster UNION P0 | `test-payroll-add-from-directory-merge-p0.mjs` | ✓ |
| CloudSyncMutationGuard | `test-cloud-sync-mutation-guard.mjs` | ✓ |
| Guard Phase B3 | `test-payroll-roster-guard-phase2.mjs`, `test-payroll-guard-push-fail-loud-p0.mjs` | ✓ |
| Bootstrap merge B4 | `test-payroll-bootstrap-runtime-parity-b4.mjs`, `test-p11-bootstrap-payroll.mjs` | ✓ |
| Closed week B5 | `test-payroll-closed-week-ui-rca2.mjs` | ✓ lib-only |
| Edge parity B6 | `test-payroll-edge-parity-b6.mjs` | ✓ |
| Restore banner RB | `test-payroll-restore-banner-false-positive.mjs` | ✓ |
| Przydziały P1 | `test-payroll-assignments-p1.mjs` | ✓ lib |
| Carry / rollover / week closed | `smoke-test-payroll-carry-forward-20.1*.mjs`, `smoke-test-payroll-week-closed-20.1d.mjs`, rollover sync | ✓ smoke |
| **Lista Płac UI E2E** | — | **✗** (TEST-INFRA-001 design — NOT STARTED) |
| **Przydziały + sync live** | — | **✗** brak Playwright z guardem |

### 2.2 Przetargi — **SILNE (lib)** · **ŚREDNIE (E2E)**

| Obszar | Pliki | Ocena |
|--------|-------|-------|
| NG-02 Pipeline P0 | `test-tender-pipeline-automation-p0.mjs`, bootstrap, gate, discovery, heavy lifecycle | ✓ |
| Merge / dossier / parser | `test-tender-dossier-pipeline.mjs` (mega), merge-quality, TP190/200, BZP | ✓ |
| NG-03 UX | `test-ng-03-*.mjs` (7 plików) | ✓ lib/UX static |
| Trust / workflow | `test-tender-trust-layer.mjs`, workflow hub/strip | ✓ |
| Tab SSOT P0 | `test-p0-tender-detail-ssot-tab.mjs` | ✓ lib |
| Kosztorys process | `test-tender-kosztorys-process-health.mjs`, phase | ✓ |
| **E2E workspace V4** | `audit-p0-tender-freeze.spec.ts` (osobny config) | **poza CI default** |
| **E2E prod tender seed** | Mobile Recovery SMOKE-03 | **BLOCKED** (brak seed prod) |

### 2.3 BOQ (NG-04) — **DOBRE (lib)** · **BRAK E2E**

| Obszar | Pliki | Ocena |
|--------|-------|-------|
| BOQ Explorer | `test-ng04-kosztorys-boq-explorer.mjs` | ✓ |
| Benchmark per line | `test-ng04-2-benchmark-per-line.mjs` | ✓ |
| ATH fidelity | `test-ng04-3-ath-fidelity.mjs` | ✓ |
| Unified workspace | `test-v41-kosztorys-workspace.mjs` | ✓ |
| Performance 500 rows | `test-ng04-m8-large-boq-performance.mjs` | ✓ |
| Snapshot fidelity | `test-tp200b-snapshot-fidelity.mjs` | ✓ |
| **BOQ UI E2E** | — | **✗** |
| **Smoke agregat NG-01–04** | planowany `test-tenders-stabilization-smoke.mjs` | **✗ NOT EXISTS** |

### 2.4 Audit Hub — **DOBRE (lib)** · **BRAK E2E**

| Obszar | Pliki | Ocena |
|--------|-------|-------|
| Adapters / view-model | `test-audit-hub-adapters.mjs`, `test-audit-hub-view-model.mjs` | ✓ |
| WM Druk audit | `test-wm-druk-audit.mjs`, smoke etap 2/3 | ✓ |
| AH-REG-1 freshness | `test-audit-hub-freshness-ah-reg-1.mjs` | ✓ |
| Security log | `test-security-audit-log.mjs` | ✓ |
| **Audit Hub UI E2E** | — | **✗** |

### 2.5 Cloud Sync — **ŚREDNIE**

| Obszar | Pliki | Ocena |
|--------|-------|-------|
| Mutation guard | `test-cloud-sync-mutation-guard.mjs` | ✓ |
| Payroll bootstrap P11 | `test-p11-bootstrap-payroll.mjs` | ✓ |
| Admin passwords P15 | `test-p15-admin-password-merge.mjs` | ✓ |
| Work catalog sync | `test-work-catalog-cloud-sync.mjs` | ✓ |
| CloudLoader etap 3 | `smoke-etap3a-cloud-loader.mjs`, 3b | ✓ smoke |
| **Pełny runCloudSync / egress** | — | **✗** (incydent 402 — ops, nie test) |
| **Edge batch-set parity poza payroll** | częściowo B6 | częściowe |

### 2.6 Auth — **ŚREDNIE**

| Obszar | Pliki | Ocena |
|--------|-------|-------|
| Admin login regresja | `test-admin-login-*.mjs` (4) | ✓ |
| ACL guide/changelog | `test-admin-guide-acl.mjs` | ✓ |
| Password merge | `test-p15-admin-password-merge.mjs` | ✓ |
| E2E login 3 role | `e2e/helpers/auth.ts`, happy path | ✓ |
| Mobile auth | `mobile-auth-smoke.spec.ts` | ✓ (prod) |
| **Inspektor/worker role matrix CI** | — | **✗** |
| **Edge auth / session** | — | **✗** |

### 2.7 Inne moduły z testami

| Moduł | Stan |
|-------|------|
| WM Druk / ZI | **Silne** — ~20+ `test-wm-print-*`, preservation smoke |
| Pomiary EM | **Silne** — seria P0–P3, registry, DOCX |
| Schematy | **Dobre** — render, PDF, merge, cloud sync |
| Notatki operacyjne | **Dobre** — P0–P2C + sync race P0 |
| Billing / recoverable | **Dobre** — smoke 20.3A–20.4C |
| Dashboard V3 | **Minimalne** — `test-dashboard-v3-counts.mjs` |
| Roboty/JobsView | **Częściowe** — E2E happy path, smoke MID-B, brak pełnej regresji UI |
| Work Catalog | **Silne** — golden, engine, migration, nav |
| P3 wycena/BZP | **Dobre** — filtry, benchmark, materiały |

---

## 3. Obszary bez testów (lub praktycznie bez)

| Obszar | Uwaga |
|--------|-------|
| **Lista Płac — Przydziały E2E** | Główna luka produkcyjna; design TEST-INFRA-001 zamrożony |
| **Przetargi — E2E kosztorys/BOQ w CI** | Brak w default pipeline |
| **Supabase Edge Functions** | Brak automated suite poza parity payroll-week merge |
| **Capacitor / native shell** | Brak |
| **Pełny sync egress / quota** | Incydent P0 2026-06-29 — monitoring ops |
| **Smoke agregat stabilizacji** | R-02 planowany — **nie istnieje** |
| **Unified npm test / manifest** | Brak — sety ad hoc w handoffach |
| **Coverage / mutation testing** | Brak |
| **Visual regression** | Brak (poza schematic PDF smoke) |
| **Performance CI gate** | Tylko skrypty ad hoc (NG-04 M8) |

---

## 4. Release gate — obecny stan

| Gate | Automatyczny? | Uwagi |
|------|---------------|-------|
| `npm run build` | **TAK** (Vercel) | Każdy push main |
| E2E happy + version | **TAK** (CI, path filter) | preview :4173 |
| Mobile smoke E2E | **TAK** (CI, path filter) | **prod live** — ryzyko flaky/data |
| Pakiet regresji Payroll B1–B6 | **NIE** | Ręcznie przed release |
| Pakiet NG-02/NG-04 smoke | **NIE** | Ręcznie / w handoffach |
| `audit:import-cycles` | **NIE w CI** | ARCH-001 manual |
| VERIFY `version.json` | **Manual** post-deploy | WORKFLOW FAST |

**Wniosek:** Release gate **≠** pełna regresja domenowa. Gate produkcyjny to **build + wybrane E2E**, nie lib suite.

---

## 5. Regresje ostatnich miesięcy — wykrywalność automatyczna

| Incydent / fix | Czy test istnieje dziś? | Typ |
|----------------|-------------------------|-----|
| Payroll roster znika po sync (P0 2.63.15) | **TAK** — merge P0, P11 | lib |
| Przydziały cofają się (Guard 2.63.16) | **TAK** — mutation guard | lib |
| Fail-loud roster B1 | **TAK** | lib |
| JobsView workEntries guard B2 | **TAK** — częściowo via guard tests | lib |
| Bootstrap/runtime merge drift B4 | **TAK** — 13-case parity | lib |
| Closed week UI live leak B5 | **TAK** — RCA2 lib; **brak E2E** | lib |
| Edge merge UUID vs directoryId B6 | **TAK** | lib |
| Restore banner false positive RB | **TAK** | lib |
| Audit Hub stale feed AH-REG-1 | **TAK** | lib |
| Admin password override leak P15 | **TAK** | lib |
| Supabase egress 402 | **NIE** | ops/billing |
| Vercel ENOENT untracked import | **NIE** (git hygiene) | process |
| Tender tab SSOT bug (2.63.8) | **TAK** — lib + audit spec | lib/E2E off-CI |
| NG-04 BOQ regressions | **TAK** — seria ng04 | lib |
| POST RELEASE smoke payroll false negative | **Częściowo** — motywacja TEST-INFRA-001 | harness gap |

---

## 6. Luki (agregat)

| ID | Luka | Wpływ |
|----|------|-------|
| **L-01** | Brak E2E Lista Płac / Przydziały | Wysoki — incydenty payroll UX/sync |
| **L-02** | Brak smoke orchestrator NG-01–04 | Wysoki — stabilizacja Z-04 |
| **L-03** | Brak CI gate dla pakietu lib regresji | Wysoki — release polega na manual smoke |
| **L-04** | E2E mobile vs **prod live** | Średni — flaky, brak seed tender |
| **L-05** | ~500 skryptów bez manifestu / ownership | Średni — trudno wiedzieć co uruchomić |
| **L-06** | audit-* mylone z regresją | Średni — szum, brak dyscypliny suite |
| **L-07** | Brak testów Edge/backend poza payroll merge | Średni |
| **L-08** | Brak npm test / coverage | Niski–średni — DX |
| **L-09** | Dokumentacja onboarding (AGENT-ONBOARDING) częściowo stale vs prod | Niski — SSOT drift (M-01) |

---

## 7. Ryzyka

| ID | Ryzyko | P | W |
|----|--------|---|---|
| **R-01** | Release bez uruchomienia pakietu payroll lib | M | H |
| **R-02** | Flaky E2E prod (dane live) | M | M |
| **R-03** | Fałszywe poczucie bezpieczeństwa z liczby skryptów (~370 test+smoke) | M | M |
| **R-04** | Regresja Przetargów bez Z-04 smoke | M | H |
| **R-05** | TEST-INFRA-001 delay → powtórka POST RELEASE false negative | H | M |
| **R-06** | Brak gate sync/egress → powtórka 402 bez wczesnego sygnału | L | M |

---

## 8. Rekomendacje (audytowe — bez projektu rozwiązania)

1. **Utrzymać rozdział:** lib (`test-*`) vs smoke release vs E2E vs forensic (`audit-*`) — jasna etykieta w docs.
2. **Zdefiniować minimalny release bundle** per obszar (Payroll · Przetargi · Platform) — już częściowo w handoffach; brakuje **jednego manifestu**.
3. **Domknąć L-02** (smoke agregat stabilizacji) zanim STABILIZATION CLOSE — zgodnie z planem M-02.
4. **TEST-INFRA-001** pozostaje właściwą odpowiedzią na L-01 — design zamrożony; implementacja tylko na polecenie.
5. **CI:** rozważyć rozdzielenie E2E prod vs preview — audyt, nie decyzja implementacyjna w tym dokumencie.
6. **Nie uruchamiać** `audit-p0-*` jako regresji — archiwum RCA.

---

## 9. Priorytety (audytowe)

| Priorytet | Temat | Uzasadnienie |
|-----------|-------|--------------|
| **P0** | Manifest / orchestrator regresji Przetargi NG-01–04 | STABILIZATION Z-04 · brak pliku |
| **P0** | Harness Payroll E2E (TEST-INFRA-001) | Historyczne incydenty · design ready |
| **P1** | CI gate — pakiet lib payroll + NG-02 core | Ostatnie 2.63.15–25 fixes |
| **P1** | SSOT docs — które skrypty = release gate | M-01 onboarding |
| **P2** | E2E Przetargi workspace w preview (nie prod) | SMOKE-03 class |
| **P2** | Edge function smoke poza payroll | B6 pattern reuse |
| **P3** | npm test entrypoint · coverage | DX |

---

## 10. Relacja do TEST-INFRA-001 DESIGN FREEZE

| Element design freeze | Stan audytu |
|----------------------|-------------|
| Problem POST RELEASE false negative | **Potwierdzony** — brak E2E LP |
| Wzorzec `e2e-seed.ts` + `blockCloudSync` | **Istnieje** — reuse dla Jobs, nie Payroll |
| Principles #014–#026 | **N/A** — kod NOT STARTED |
| TI-B1/TI-B2 backlog | **Nadal OPEN** |

Audyt **nie zmienia** design freeze. Potwierdza, że luka L-01 jest **największą** dziurą w infrastrukturze względem ostatnich incydentów payroll.

---

## 11. Werdykt końcowy

**Infrastruktura testowa WGDOM jest dojrzała w warstwie lib (vite-node)** — szczególnie Przetargi, Payroll recovery, WM Druk, EM.

**Słabość systemowa:** brak spójnej orkiestracji, brak pełnego release gate lib w CI, brak E2E dla krytycznych ścieżiek payroll i przetargów BOQ.

**TEST-INFRA-001 AUDIT — COMPLETE**  
**Status:** AUDIT ONLY · **STOP**
