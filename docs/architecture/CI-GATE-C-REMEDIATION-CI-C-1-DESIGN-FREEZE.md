# CI GATE C REMEDIATION — CI-C-1 DESIGN FREEZE (Preview #010)

> **Status:** **CLOSED** (IMPLEMENT + VERIFY — preview `#010` PASS) · closeout: [`CI-GATE-C-REMEDIATION-CI-C-1-CLOSEOUT.md`](./CI-GATE-C-REMEDIATION-CI-C-1-CLOSEOUT.md)  

> **Data:** 2026-07-25  
> **Wejście:** [`CI-GATE-C-REMEDIATION-AUDIT.md`](./CI-GATE-C-REMEDIATION-AUDIT.md)  
> **Evidence tip:** `df5f2ef` · Gate C job [89608676285](https://github.com/dawidthai125/wgdom/actions/runs/30131950449) · legacy preview OK [30131950436](https://github.com/dawidthai125/wgdom/actions/runs/30131950436)  
> **Wariant A FROZEN · IMPLEMENTED**

```text
══════════════════════════════════════
CI-C-1 DESIGN FREEZE
WARIANT: A — align orchestrator → legacy preview (FROZEN)
SCOPE:   scripts/test-infra-orchestrator.mjs (+ docs)
OUT:     src/** · UI · Payroll · Theme · Cloud Sync · Tenders
         · e2e specs · playwright webServer · workflow YAML*
══════════════════════════════════════
* workflow YAML: OUT chyba że Owner GO rozszerzy DF (domyślnie NIE)
```

---

## 0. Decyzje zamrożone (executive)

| ID | Decyzja | Wartość FROZEN |
|----|---------|----------------|
| **D1** | Strategia naprawy | **Wariant A** — naprawa `#010` w orchestratorze (align do legacy) |
| **D2** | Wariant B (Playwright `webServer`) | **OUT** CI-C-1 |
| **D3** | Wariant C (preview w YAML poza orchestratorem) | **OUT** — łamie Principle **#010** (orchestrator zarządza preview) |
| **D4** | Plik kodu | **tylko** `scripts/test-infra-orchestrator.mjs` |
| **D5** | `detached: true` | **USUNĄĆ** |
| **D6** | `stdio: "ignore"` | **ZASTĄPIĆ** `stdio: ["ignore", "pipe", "pipe"]` (lub `inherit` — patrz §4) |
| **D7** | `child.unref()` | **USUNĄĆ** — proces musi żyć z parentem orchestratora |
| **D8** | Health-check | `shell: false` · probe **`GET /`** (parity legacy `curl -sf …/`) · sukces = HTTP **2xx** |
| **D9** | Timeout readiness | **90 s** (bez zmiany limitu; legacy ready ~5 s) |
| **D10** | Explicit CLI host/port | **TAK** — `npm run preview -- --host 127.0.0.1 --port 4173` (parity legacy; zgodne z `vite.config` preview) |
| **D11** | Cleanup po timeout | `child.kill("SIGTERM")` na PID dziecka (nie `process.kill(-pid)` przy non-detached) |
| **D12** | App / E2E specs / Gate B | **OUT** — CI-C-2+ osobno |
| **D13** | Principle #010 | **ZACHOWANE** — Gate C nadal: build + preview z orchestratora przed E2E |

---

## 1. Aktualny model orchestratora (AS-IS)

### 1.1 Wejście Gate C (CI)

`.github/workflows/test-infra-gates.yml` job `gate-c`:

```text
PW_BASE_URL=http://127.0.0.1:4173
npm run test:infra -- --gate C --scope all
```

Workflow **nie** startuje preview samodzielnie — komentarz: *orchestrator manages preview*.

### 1.2 Sekwencja w `test-infra-orchestrator.mjs`

```text
1. validate manifest
2. implicit build  →  npm run build  (stdio: inherit)     [PASS na CI-5]
3. collect tests (gate-b-relevant + gate-c-e2e-preview, scope=all)
4. if any e2e + environment=preview:
      ensurePreviewServer(PW_BASE_URL || http://127.0.0.1:4173)
5. run tests (lib → smoke → e2e)
6. cleanup preview child (jeśli był start)
```

**Na CI-5 FAIL następuje w kroku 4** — kroki 5–6 nie dochodzą; brak `e2e-report/`.

### 1.3 `startPreviewServer` (AS-IS)

| Parametr | Wartość | Skutek |
|----------|---------|--------|
| command | `npm run preview` | Vite preview (port z `vite.config`: `127.0.0.1:4173`) |
| `shell` | `true` | npm przez shell |
| `detached` | **`true`** | nowa session / process group |
| `stdio` | **`"ignore"`** | **brak logów** Vite w CI |
| `unref()` | **wywołane** | parent nie trzyma referencji do child |

### 1.4 Health-check `isPreviewReachable` (AS-IS)

| Element | Wartość |
|---------|---------|
| Mechanizm | `spawnSync("node", ["-e", <http.get…>, url], { shell: **true**, timeout: 5000 })` |
| Path | **`/version.json`** |
| Sukces | `statusCode === 200` |
| Poll | co **1 s** (`sleepSync` busy-wait) |
| Deadline | **90 s** od startu |

**Uwaga (audit):** `shell: true` + złożony `-e` jest kruche (na Windows lokalnie psuje skrypt). Na Linux GHA cytowanie bywa OK, ale **nie** jest SSOT-bezpieczne.

### 1.5 Warunki sukcesu / porażki (AS-IS)

| Wynik | Warunek |
|-------|---------|
| PASS preview | `isPreviewReachable` → true przed deadline |
| FAIL | throw: `Preview server not reachable at … after 90s (#010)` · exit 1 |
| Cleanup FAIL | `process.kill(-child.pid, "SIGTERM")` (process group — sensowne tylko przy `detached`) |

### 1.6 Kontrakt #010 (TEST-INFRA DF)

> Orchestrator respektuje `environment`: preview wymaga `npm run build && npm run preview` przed E2E.

CI-C-1 **nie usuwa** #010 — tylko naprawia realizację.

---

## 2. Legacy preview (działający kontrolny)

`.github/workflows/e2e-happy-path.yml` (ten sam SHA `df5f2ef`):

| Element | Legacy |
|---------|--------|
| Start | `npm run preview -- --host 127.0.0.1 --port 4173 &` |
| Detached Node API | **nie** — job shell background `&` |
| stdio | **widoczne** w logu joba (`> vite preview …`) |
| Wait | `curl -sf http://127.0.0.1:4173/` · loop 60× · sleep 2 (~120 s max) |
| Sukces | HTTP OK na **`/`** · log: `Preview ready` (~**5 s** na CI-5) |
| unref | n/a |

**Wniosek:** Vite + `dist/` + port 4173 na GHA **działają**. Awaria jest w **sposobie spawnu/probe** orchestratora, nie w buildzie aplikacji.

---

## 3. Przyczyna timeoutu (RCA → DF)

| Warstwa | Werdykt FROZEN |
|---------|----------------|
| Aplikacja / Vite config / `version.json` build | **NIE** root cause |
| Gate B / CI-5 bootstrap | **NIE** |
| Brak reachable serwera wg orchestratora przez 90 s | **TAK** — objaw |
| Root cause (confidence HIGH) | **`detached` + `stdio:ignore` + `unref`** uniemożliwia wiarygodne utrzymanie / obserwację preview na GHA względem sprawdzonego legacy |
| Współczynnik (confidence MED) | Health-check `shell:true` + path `/version.json` vs legacy `/` — utrudnia diagnozę; naprawiany w tym samym minimalnym bundlu |

**Klasyfikacja:** **workflow bug** (orchestrator) · wpływ prod: **brak**.

---

## 4. Docelowy model (TO-BE) — Wariant A FROZEN

### 4.1 Porównanie trzech modeli

| | AS-IS orchestrator | Legacy (kontrolny) | TO-BE CI-C-1 (FROZEN) |
|--|--------------------|--------------------|------------------------|
| Kto startuje | orchestrator | workflow YAML | **orchestrator** (#010) |
| Command | `npm run preview` | `npm run preview -- --host 127.0.0.1 --port 4173` | **jak legacy CLI flags** |
| Detached | tak | nie (`&`) | **nie** |
| stdio | ignore | widoczne | **pipe stderr/stdout → log przy FAIL / opcjonalnie inherit** |
| unref | tak | n/a | **nie** |
| Probe | `/version.json` + shell:true | `curl /` | **`GET /` + shell:false** |
| Timeout | 90 s | ~120 s | **90 s** |
| Sukces | 200 version.json | curl -sf `/` | **HTTP 2xx na `/`** |

### 4.2 Minimalna implementacja (spec — nie kod)

Zmiany **wyłącznie** w funkcjach:

1. **`startPreviewServer`**
   - `spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", "4173"], { cwd: ROOT, shell: true, detached: false, stdio: ["ignore", "pipe", "pipe"] })`
   - **bez** `unref()`
   - przy starcie: opcjonalny `child.stderr.on("data", …)` → buffer (drukuj buffer tylko przy timeout — observability)

2. **`isPreviewReachable(url)`**
   - `shell: false`
   - GET `path: "/"` (z `new URL(url)` hostname/port)
   - sukces: `statusCode >= 200 && statusCode < 400` (jak `curl -sf` na `/`)
   - bez zmiany URL bazowego (`PW_BASE_URL`)

3. **`ensurePreviewServer`**
   - deadline 90 s bez zmiany
   - na timeout: wypisz ostatnie N bajtów stdout/stderr child · `child.kill("SIGTERM")` · throw ten sam komunikat `#010` (stabilny dla grepa)

4. **Cleanup po sukcesie Gate C** (istniejący finally / stop)  
   - upewnić się, że zabija non-detached child po E2E (bez regresji wiszącego Vite) — przegląd istniejącego cleanup w `main()`; **bez** refaktoru poza koniecznym dopasowaniem kill.

### 4.3 Co NIE wchodzi w CI-C-1

- `playwright.config.ts` `webServer`
- Zmiana `.github/workflows/test-infra-gates.yml` (start preview w YAML)
- Zmiana `e2e/**` (CI-C-2 / CI-C-3)
- `vite.config.ts` preview host/port (już 127.0.0.1:4173)
- Jakiekolwiek `src/**`

---

## 5. Zakres plików (IN / OUT)

| IN | OUT |
|----|-----|
| `scripts/test-infra-orchestrator.mjs` | `src/**` |
| `docs/architecture/CI-GATE-C-REMEDIATION-CI-C-1-*.md` (DF + późniejszy closeout) | Payroll / Theme / Cloud Sync / Tenders / UI |
| | `e2e/**`, `playwright.config.ts` |
| | Gate B tests / manifest testIds (bez zmiany kontraktu #010) |

---

## 6. Ocena ryzyka

| Ryzyko | Poziom | Mitygacja |
|--------|--------|-----------|
| Preview nadal nie wstaje | Niski–średni | Logi pipe przy FAIL; parity z legacy CLI |
| Wiszący Vite po teście | Niski | jawny `child.kill` w finally |
| Fałszywy PASS health-check | Niski | 2xx na `/` = ten sam sygnał co legacy |
| Regresja lokalnego `test:infra --gate C` | Niski | te same flagi host/port co vite.config |
| Ukrycie latent E2E (C-2/C-3) | **Oczekiwane** | CI-C-1 DoD = preview reachable + E2E **startują**; FAIL E2E ≠ regresja CI-C-1 |
| Zmiana semantyki #010 | Brak | preview nadal z orchestratora |

**Ryzyko produktowe (wgdom.fun):** **ZERO**.

---

## 7. Verify plan (po Owner GO → IMPLEMENT)

| Krok | Kryterium PASS |
|------|----------------|
| 1 | Lokalnie / CI: log zawiera `Preview ready at http://127.0.0.1:4173` **&lt; 90 s** |
| 2 | Gate C dochodzi do wykonania Playwright (widać `E2E-HAPPY-PATH` w raporcie orchestratora) |
| 3 | Przy kolejnym FAIL E2E: istnieją logi preview **lub** `e2e-report/` (nie „cisza” stdio) |
| 4 | Gate B payroll + tenders **bez regresji** (osobne joby; CI-C-1 nie rusza ich kodu) |
| 5 | Brak diff w `src/**` |

**DoD CI-C-1 (wąski):** Preview `#010` PASS · E2E **uruchomione** (mogą FAIL — to CI-C-2+).  
**Nie** wymagać pełnego Gate C green w CI-C-1.

---

## 8. Gotowość

| Etap | Status |
|------|--------|
| AUDIT | COMPLETE |
| DESIGN FREEZE CI-C-1 | **FROZEN** (ten dokument) |
| Owner GO → IMPLEMENT | **PENDING** |
| IMPLEMENT / commit / push | **BLOCKED** |

---

## 9. Raport DF (1:1 na Owner GO)

1. **Aktualny model:** build → `spawn preview` (`detached` + `stdio:ignore` + `unref`) → poll `/version.json` 90 s → throw `#010`.
2. **Przyczyna timeoutu:** workflow bug spawnu/obserwacji preview w orchestratorze; legacy na tym SHA OK.
3. **Strategia:** **Wariant A** — align do legacy (non-detached, logi, probe `/`, explicit host/port), #010 zachowane.
4. **Zakres:** tylko `scripts/test-infra-orchestrator.mjs` (+ docs).
5. **Ryzyko:** niskie · zero wpływu prod · fail-fast ujawni CI-C-2+.
6. **Gotowość do IMPLEMENT:** **TAK** — po Owner GO.
