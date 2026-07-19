# TEST-HARNESS-01 — RCA

> **Program:** TEST-HARNESS-01 · Production Sandbox Harness  
> **Status:** AUDIT ONLY · **NIE implementować** bez Owner GO  
> **Data:** 2026-07-19  
> **Prod baseline (referencyjny):** 2.65.33 (`a2d1caf`)  
> **Powiązane:** [`TEST-HARNESS-01-PLAN.md`](TEST-HARNESS-01-PLAN.md) · [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md) · [`TEST-HARNESS-01-ARCHITECTURE-REVIEW.md`](TEST-HARNESS-01-ARCHITECTURE-REVIEW.md)

---

## 1. Objaw

Po release’ach (m.in. 2.65.32–2.65.33) **nie da się automatycznie i bezpiecznie** zweryfikować na produkcji pełnych ścieżek regresji:

| Scenariusz | Stan dziś |
|------------|-----------|
| Tender: PDF → analysis → classification → proposal → save | Brak formalnego harnessa write na prod |
| Jobs: create → upload/delete photos → sync | Ad-hoc `.tmp/*prod-smoke*` na **żywych** jobach |
| Payroll: open → week → save → KPI | Oficjalny harness = **Preview First**; prod save nieoficjalny |
| Cloud: batch-set / batch-get / retry / metrics | Smoke read + ad-hoc set; brak zunifikowanego harnessa |
| Biblioteka Robót: CRUD + keyword | Stability sweep = **WARNING** (skip write) |

Skutek: **Health Score / stability sweep** przechodzi na „shell PASS”, a luki write path zostają niewidoczne aż do incydentu produkcyjnego.

---

## 2. Root cause (warstwy)

### RC-1 — Coverage gap (P0 produktowo)

POST-RELEASE STABILITY SWEEP (2.65.33) celowo **nie wykonywał** głębokich mutacji na prod (safety). Formalne gate’y (`test:infra`, desktop-smoke) **nie zastępują** pełnego pipeline’u UI+KV.

### RC-2 — Dwa światy testów (P0 procesowo)

| Świat | Gdzie | Mutacje prod | Cleanup | Manifest |
|-------|-------|--------------|---------|----------|
| A. Formalny test-infra | `e2e/helpers/test-harness/*`, `npm run test:infra` | **Zakaz** (TI-B2.1 Preview First) | Seed preview | TAK |
| B. Ad-hoc ops smoke | `.tmp/*prod-smoke*.mjs` | **Tak** (często na realnych jobach) | Ręczny / cleanup-01 | NIE |

Świat B udowodnił potrzebę live regresji, ale **bez allowlisty / markera / obowiązkowego cleanup** → zanieczyszczenie prod (zob. PROD-TEST-DATA-CLEANUP-01).

### RC-3 — Świadoma decyzja TI-B2.1 vs potrzeba Ownera (P0 architektonicznie)

W [`docs/TEST-INFRA-001-DESIGN-FREEZE.md`](../TEST-INFRA-001-DESIGN-FREEZE.md) v2.2:

- **#018 SUPERSEDED** — strategia sandbox job **ODRZUCONA** dla **Payroll harness seed**
- Seed: wyłącznie `target=preview` → inaczej `UNSAFE_TARGET`
- `HARNESS_SANDBOX_JOB_IDS` = historyczny/compat, **nierozwijany w Payroll harness**

Jednocześnie Owner + closeout cleanup proszą o **dedykowany sandbox job** zamiast mutacji realnych adresów.

**RC:** brak osobnej klasy harnessa „Production Sandbox” poza Payroll Preview — decyzja TI-B2.1 została **uogólniona mentalnie** na wszelkie prod write, mimo że dotyczyła **konkretnie** payroll seed path.

### RC-4 — Brak kontraktu izolacji danych (P1)

Bez:

- prefixów / markerów / allowlist ID,
- hard-stop przed mutacją encji spoza listy,
- obowiązkowego cleanup + raport tombstone,

każdy „bezpieczny” smoke degeneruje do zapisu na żywych danych (Obornicka / realne LP / aktywny katalog).

### RC-5 — Brak jednego orchestratora scenariuszy (P1)

5 domen = 5+ ad-hoc skryptów, różne auth, różne reporty, brak wspólnego:

`preflight → scenario → assert → cleanup → score`

---

## 3. Dowody

| Źródło | Dowód |
|--------|--------|
| `.tmp-stability-sweep/out/report.json` | Biblioteka WARNING; shell PASS; brak PDF/photos write |
| `docs/TEST-INFRA-001-DESIGN-FREEZE.md` §A.5 / #018 | Sandbox ODRZUCONA dla Payroll harness |
| `docs/architecture/PROD-TEST-DATA-CLEANUP-01-OWNER-CLOSEOUT.md` | Potrzeba sandbox job zamiast realnego joba |
| `.tmp/jobs-photos-*-prod-smoke.mjs` | Wzorzec live mutacji bez formalnego gate |
| Stability Health Score 86/100 | −8 punktów za coverage gap write paths |

---

## 4. Czego RCA **nie** mówi

- Nie twierdzi, że Preview First jest błędne dla **Payroll Guard S1**.
- Nie wymaga zmian Protected Core w MVP harnessa (tylko tooling + markery danych).
- Nie otwiera ponownie `O-PROD-HARNESS-L5` payroll bez osobnego Owner GO.

---

## 5. Werdykt RCA

| ID | Werdykt |
|----|---------|
| Problem | Brak bezpiecznej, formalnej warstwy **Production Sandbox Harness** |
| Klasa | Proces + architektura testów (nie bug UI 2.65.33) |
| Priorytet programu | **P1** (P0 jeśli Owner wymaga write regresji przed każdym release) |
| Rozwiązanie kierunkowe | Nowa klasa harnessa: **marked entities** + allowlist + cleanup; **nie** cofanie TI-B2.1 dla Payroll Preview seed |
| Status | **AUDIT COMPLETE** → PLAN / DESIGN FREEZE |

---

## 6. Decyzja Ownera (wejście do DF)

| Pytanie | Odpowiedź Ownera (2026-07-19) |
|---------|--------------------------------|
| Model izolacji | **Marked entities** (prefix / allowlist ID) |
| Lokalizacja docs | `docs/architecture/TEST-HARNESS-01-*.md` |
| IMPLEMENT | **NIE** — czekać na Owner GO |
