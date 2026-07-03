# QUALITY GATE — Integration Plan (PLAN ONLY · BACKLOG)

> **Typ:** Plan integracji `PAYROLL-QUALITY-GATE.md` z głównym workflow WGDOM. **NIE** implementacja — aktualizacja procesu.
> **Data:** 2026-07-03 · **HEAD `main`:** `0cdbc54` · **Prod:** v2.63.27
> **Status:** 📋 **PLAN / BACKLOG · REKOMENDACJA** — bez zmian w dokumentach.
> **Bazuje na:** [`PAYROLL-QUALITY-GATE.md`](PAYROLL-QUALITY-GATE.md) (nie tworzymy nowego standardu).
> **Workflow:** AUDIT → PLAN → RAPORT → STOP. Bez implementacji, zmian kodu, BUILD, TEST, COMMIT.

---

## 1. Aktualny workflow

Źródło: [`AI-START-HERE.md`](../AI-START-HERE.md) §4 (obowiązkowy), egzekwowany też przez `AGENTS.md`, `CURSOR-HANDOFF.md`, `.cursor/rules/wgdom-development.mdc`.

```
AUDIT → DESIGN FREEZE → IMPLEMENT → BUILD → TEST → COMMIT → PUSH → VERIFY → CLOSE
```

Zasady naczelne: **One Bundle = One Goal**, **SSOT FIRST / AUDIT FIRST**, raport IMPLEMENT (§7 development rule), komunikacja PL.

**Obserwacja:** między `TEST` a `COMMIT` **nie ma jawnej bramki jakości**. Decyzja „czy wolno commitować” opiera się dziś na raporcie IMPLEMENT (build/test PASS) — bez ustrukturyzowanej weryfikacji regresji Payroll (multi-device, VERIFY CLEAN, known bugs).

---

## 2. Docelowy workflow

```
AUDIT → DESIGN FREEZE → IMPLEMENT → BUILD → TEST → QUALITY GATE → COMMIT → PUSH → VERIFY → CLOSE
                                                        │
                                                        └── PAYROLL-QUALITY-GATE.md (L1–L4 wg typu zmiany)
```

- **QUALITY GATE** wstawiony **między TEST a COMMIT** — logiczne miejsce: testy już wykonane, ich wynik podlega formalnej ocenie bramkowej **przed** utrwaleniem (commit).
- Bramka **warunkowa domenowo:** aktywna tylko gdy bundle dotyka **Payroll lub Cloud Sync** (§2 macierzy Quality Gate). Dla bundli spoza Payroll = `N/A` (workflow bez zmian).
- Werdykt bramki: **MERGE ALLOWED** → przejście do COMMIT · **MERGE BLOCKED** → powrót do IMPLEMENT (bez COMMIT).

**Relacja z VERIFY:** VERIFY (post-push `version.json`) pozostaje bez zmian. Dla zmian **L4** Production Observation z Quality Gate wykonywane jest **po VERIFY** (obserwacja prod) i domyka CLOSE — patrz §3.

---

## 3. Miejsca integracji

| # | Miejsce | Rola po integracji | Charakter zmiany |
|---|---------|--------------------|------------------|
| I1 | `AI-START-HERE.md §4` | dodać `QUALITY GATE` do łańcucha + link do `PAYROLL-QUALITY-GATE.md` | 1 linia + link |
| I2 | `AGENTS.md §2/§2a` | nota: bundle Payroll/Cloud Sync przechodzi Quality Gate przed commit | akapit + link |
| I3 | `.cursor/rules/wgdom-development.mdc §5/§7` | krok „QUALITY GATE" w kolejności prac + w raporcie IMPLEMENT | akapit |
| I4 | `CURRENT-TASK.md` | wskazać Quality Gate jako obowiązkowy dla otwartych pozycji Payroll (S7-5, F1, PR-PERF-S1) | wpis w sekcji Payroll |
| I5 | `docs/WORKFLOW-RELEASE-DEPLOY.md` | dopięcie: L4 Production Observation po VERIFY | akapit |
| I6 | szablon bundle Payroll (raport) | obowiązkowy blok „QUALITY GATE" w raporcie końcowym | §5 tego dok. |

**Punkt wejścia (single source):** wszystkie miejsca **linkują** do `PAYROLL-QUALITY-GATE.md` — brak duplikacji definicji (jeden standard).

---

## 4. Mapowanie: typ zmiany → poziom (wg istniejącej macierzy)

Bez tworzenia nowej macierzy — kopia operacyjna z `PAYROLL-QUALITY-GATE.md §2`:

| Typ zmiany | Poziom |
|------------|--------|
| Kosmetyka UI (label, styl, kolejność) | **L1** |
| UI logika bez danych (filtr, sortowanie) | **L2** |
| Kalkulacja Payroll (brutto/netto, zaliczka, extraCost) | **L2** |
| Model danych `WeekEmployee` (nowe pole, `DayData`) | **L3** |
| Merge / LWW (`mergeWeekEmployees`, `dataUpdatedAt`) | **L4** |
| Tombstones (`*-deleted-ids`, F2/S7-5) | **L4** |
| Cloud Sync transport (bundle split, `runCloudSync`) | **L4** |
| Edge (`index.tsx`, `batch-set`, `kv.mset`, parity) | **L4** |
| Guardy (`CloudSyncMutationGuard`, `applyPayrollGuardBeforePush`) | **L3** |
| Rollover / Archive / Restore (anti-leak) | **L3** |
| Release major Payroll (epic close, X.Y.0) | **L4** |

Reguły (bez zmian): **wiele typów → najwyższy poziom**; wątpliwość → wyżej; L4 ⊃ L3 ⊃ L2 ⊃ L1.

---

## 5. Szablon raportu — obowiązkowy blok w każdym bundle Payroll

Dołączany do raportu końcowego bundle (obok BUILD/TEST/GIT/VERSION z development rule §7).

### 5.1 Wariant ALLOWED
```
--------------------------------
QUALITY GATE
Required Level:   L3
Smoke             PASS
Regression        PASS
Multi Device      PASS
VERIFY CLEAN      PASS
Known Bugs        UNCHANGED
New Bugs          NONE
Decision          MERGE ALLOWED
--------------------------------
```

### 5.2 Wariant BLOCKED
```
--------------------------------
QUALITY GATE
Required Level:   L3
Smoke             PASS
Regression        PASS
Multi Device      FAIL  (C-MD-Settled: settled cofa się po sync)
VERIFY CLEAN      FAIL  (roster ≠ baseline)
Known Bugs        UNCHANGED
New Bugs          BUG-1 (P1) — utrata flagi settled
Decision          MERGE BLOCKED
Akcja             NIE naprawiać w gate; zwrot do IMPLEMENT + wpis BUG-1 (Suite §9)
--------------------------------
```

### 5.3 Wariant N/A (bundle spoza Payroll)
```
--------------------------------
QUALITY GATE
Required Level:   N/A (bundle nie dotyka Payroll/Cloud Sync)
Decision          NOT APPLICABLE
--------------------------------
```

Pola `Smoke/Regression/Multi Device/VERIFY CLEAN` dla poziomów niewymaganych = `N/A` (nie „PASS"). `Production Observation` dodawane w wariancie L4.

---

## 6. Rekomendacja — które dokumenty mają odwoływać się do Quality Gate

Analiza 5 dokumentów wejściowych. Zasada: **jeden punkt prawdy** (`PAYROLL-QUALITY-GATE.md`), pozostałe **tylko linkują** (bez kopiowania definicji).

| Dokument | Rola | Rekomendacja | Zakres odwołania |
|----------|------|--------------|------------------|
| **AI-START-HERE.md** | brama startowa agenta | ✅ **TAK** | 1 linia w §4: `… TEST → QUALITY GATE → COMMIT …` + link |
| **AGENTS.md** | „jak pracować" | ✅ **TAK** | akapit w §2/§2a: bundle Payroll → Quality Gate przed commit |
| **CURRENT-TASK.md** | status/wznowienie | ✅ **TAK** (kluczowe) | wpis: otwarte Payroll (S7-5, F1, PR-PERF-S1) wymagają Quality Gate |
| **PROJECT-STATUS.md** | status prod/P0 | ⚠ **OPCJONALNIE** | tylko wzmianka w sekcji Payroll Certification (nie proces) |
| **AI-HANDOFF.md** | przekazanie sesji | ⚠ **OPCJONALNIE** | jedno zdanie „przy Payroll stosuj Quality Gate" |

**Werdykt rekomendacji:**
- **Obowiązkowo (proces):** `AI-START-HERE.md`, `AGENTS.md`, `CURRENT-TASK.md` — to one definiują/egzekwują workflow i status pracy.
- **Opcjonalnie (informacyjnie):** `PROJECT-STATUS.md`, `AI-HANDOFF.md` — wystarczy wzmianka; nie są nośnikiem procesu, więc pełne odwołanie zbędne.
- **NIE:** nie duplikować macierzy/checklisty poza `PAYROLL-QUALITY-GATE.md`. Wszędzie tylko **link**.

> Odpowiedź na pytanie „wszystkie czy tylko CURRENT-TASK": **nie wszystkie równorzędnie** — proces w 3 (`AI-START-HERE`, `AGENTS`, `CURRENT-TASK`), reszta opcjonalnie informacyjnie.

---

## 7. Ryzyko

| # | Ryzyko | Waga | Mitigacja |
|---|--------|:----:|-----------|
| R1 | Bramka spowalnia drobne zmiany (kosmetyka) | średnie | L1 = 2–3 min; macierz zwalnia nie-Payroll (`N/A`) |
| R2 | Duplikacja standardu (rozjazd definicji) | wysokie | tylko linki do `PAYROLL-QUALITY-GATE.md`; zero kopii macierzy |
| R3 | L3/L4 wymaga multi-device — koszt organizacyjny | wysokie | wymagane tylko dla sync/merge/tombstonów; sandbox + skrypty |
| R4 | Znane F1/F2 blokują niepowiązane merge | średnie | „wyjątek świadomy" (Gate §4.2) — known poza obszarem zmiany |
| R5 | Production Observation (L4) wydłuża CLOSE | średnie | tylko dla zmian architektury sync; okno zdefiniowane |
| R6 | Agent pomija bramkę | wysokie | obowiązkowy blok w raporcie (§5) — brak bloku = raport niekompletny |

---

## 8. Plan wdrożenia (etapowy — do wykonania osobno, po GO)

| Etap | Zakres | Ryzyko | Odwracalność |
|------|--------|--------|--------------|
| **W0** | Dokument bramki gotowy (`PAYROLL-QUALITY-GATE.md`) — **DONE** | brak | — |
| **W1** | Dodać krok `QUALITY GATE` + link w `AI-START-HERE.md §4` | niskie | 1 linia (rewert) |
| **W2** | Nota w `AGENTS.md` + `.cursor/rules/wgdom-development.mdc` | niskie | akapit |
| **W3** | Wpis w `CURRENT-TASK.md` (Payroll otwarte → Quality Gate) | niskie | wpis |
| **W4** | Obowiązkowy blok raportu (§5) w szablonie bundle Payroll | niskie | szablon |
| **W5** | (opcjonalnie) wzmianka w `PROJECT-STATUS.md` / `AI-HANDOFF.md` | niskie | zdanie |
| **W6** | Pierwsze użycie na realnym bundle Payroll (S7-5 ETAP 1) — pilotaż | średnie | procedura, nie kod |

**Gate wdrożenia:** startować **po** zamknięciu aktywnego P0 (S7-5) lub równolegle jako pilotaż na S7-5 (bramka jako pierwszy „klient"). Zgodne z One Bundle = One Goal (integracja procesu = osobny, mały bundle dokumentacyjny).

---

## 9. Rekomendacja końcowa

1. **Przyjąć** docelowy workflow z krokiem `QUALITY GATE` między TEST a COMMIT (warunkowy domenowo).
2. **Nie tworzyć** nowego standardu — `PAYROLL-QUALITY-GATE.md` jest SSOT; wszędzie tylko link.
3. **Proces** odwołać w 3 dokumentach (`AI-START-HERE`, `AGENTS`, `CURRENT-TASK`); `PROJECT-STATUS`/`AI-HANDOFF` — wzmianka opcjonalna.
4. **Obowiązkowy blok raportu** (§5) egzekwuje bramkę bez nowego narzędzia.
5. **Pilotaż** na S7-5 ETAP 1 — pierwsza realna weryfikacja bramki.
6. Wdrożenie **etapowe W1–W6**, każdy krok odwracalny, żaden nie dotyka kodu.

> Integracja jest **czysto procesowa i dokumentacyjna** — zero wpływu na produkcję, kod, sync. Ryzyko techniczne = 0; ryzyko organizacyjne (koszt L3/L4) zaadresowane macierzą i sandboxem.

---

## 10. Rejestr powiązań
| Dokument | Rola |
|----------|------|
| [`PAYROLL-QUALITY-GATE.md`](PAYROLL-QUALITY-GATE.md) | SSOT bramki (L1–L4, macierz, werdykt) |
| [`PAYROLL-CERTIFICATION-SUITE.md`](PAYROLL-CERTIFICATION-SUITE.md) | definicje testów (Smoke/Regression/Multi-device) |
| [`AI-START-HERE.md`](../AI-START-HERE.md) §4 | workflow obowiązkowy (miejsce I1) |
| `AGENTS.md` · `.cursor/rules/wgdom-development.mdc` | egzekwowanie procesu (I2, I3) |
| `docs/WORKFLOW-RELEASE-DEPLOY.md` | VERIFY + L4 Production Observation (I5) |

---

*SSOT integracji: ten plik. PLAN / BACKLOG · REKOMENDACJA — bez zmian dokumentów, kodu, BUILD, TEST, COMMIT. Workflow: AUDIT → PLAN → RAPORT → STOP.*
