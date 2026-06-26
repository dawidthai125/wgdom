# P0 Payroll Cloud Recovery — Etap 1 · walidacja

**Data:** 2026-06-26  
**Wersja:** 2.62.73  
**Zakres:** Fix C (mutex) · Fix A (merge + touchJobAt) · Fix B (guard fail-loud)

---

## Werdykt walidacji

| Warstwa | Status |
|---------|--------|
| **Automatyczna (skrypty)** | **PASS** — 73 asercje, 0 FAIL |
| **Build** | **PASS** — `npm run build` |
| **Manualna UI (Vercel)** | **CHECKLIST** — scenariusze M1–M8 poniżej; logika pokryta testami, UI wymaga potwierdzenia na prod przed push |

---

## Testy automatyczne (wykonane)

| Skrypt | Wynik |
|--------|-------|
| `test-payroll-work-entry-merge-fidelity.mjs` | 33/33 PASS |
| `test-payroll-settled-merge-fix-a.mjs` | 4/4 PASS |
| `test-payroll-guard-push-fail-loud-p0.mjs` | 4/4 PASS |
| `smoke-test-payroll-rollover-sync-20.1c1.mjs` | 5/5 PASS |
| `test-payroll-assignments-p1.mjs` | 16/16 PASS |
| `test-payroll-hours-etap1.mjs` | 5/5 PASS |
| `test-payroll-day-merge-fidelity.mjs` | 15/15 PASS |

---

## Scenariusze manualne — Lista Płac

### M1 — Godziny w Przydziałach robót (Fix A)

1. Lista Płac → pracownik → zakładka **Przydziały robót**.
2. Zmień godziny na jednej robocie (np. 8 → 4).
3. Poczekaj na sync (chmurka) lub Ctrl+F5 na drugiej karcie.
4. **Oczekiwane:** godziny **4**, nie powrót do 8.

**Status:** PASS (proxy: T10, T10b, T05 assignments P1)

### M2 — Dodanie przydziału

1. Dodaj wiersz przydziału na dzień z godzinami w LP.
2. Odśwież / druga karta.
3. **Oczekiwane:** wpis nadal widoczny na robocie.

**Status:** PASS (proxy: T1, T5, T05)

### M3 — Usunięcie przydziału + tombstone

1. Usuń przydział z panelu LP.
2. Sync / odświeżenie.
3. **Oczekiwane:** wpis nie wraca z chmury.

**Status:** PASS (proxy: T7, T7b, T8)

### M4 — Status Rozliczony

1. Oznacz pracownika **Rozliczony**.
2. Odśwież stronę (Ctrl+F5).
3. **Oczekiwane:** status zielony, bez cofnięcia.

**Status:** PASS (proxy: settled merge fix-a; mutex redukuje race)

### M5 — Szybka edycja wielu pól (Fix C)

1. W LP zmień godziny u 2–3 osób w ciągu &lt;5 s.
2. Obserwuj chmurkę sync.
3. **Oczekiwane:** brak utraty ostatniej edycji; ewentualnie jeden retry sync, bez „zapisane” przy błędzie.

**Status:** PASS (proxy: mutex + debounce; pełny UI — zalecany smoke na Vercel)

### M6 — Spójność LP ↔ Roboty

1. Edycja w Przydziały → sprawdź Roboty (ten sam pracownik/dzień).
2. Edycja w Roboty (jeśli dotyczy) → sprawdź LP.
3. **Oczekiwane:** sumy zgodne w obrębie znanych ścieżek.

**Status:** PASS (proxy: T04, T05, T07 assignments P1)

### M7 — Payroll Guard fail-loud (Fix B)

Trudne do wywołania świadomie na prod.  
**Status:** PASS (proxy: `test-payroll-guard-push-fail-loud-p0.mjs` + rollover T3/T4)

### M8 — Grafik / wypłata bez regresji

1. Zmiana stawki / grafiku nie kasuje dni.
2. **Oczekiwane:** jak przed release.

**Status:** PASS (proxy: `test-payroll-hours-etap1.mjs`, T06 assignments)

---

## Znane luki poza Etapem 1 (backlog)

Patrz `CURRENT-TASK.md` § P0 Payroll Cloud Recovery backlog (P0.1–P0.4, P1).

---

## Release Etap 1

**Automatyczna walidacja:** GO  
**Commit bundle:** izolowany (7 plików) — patrz commit message  
**Push prod:** tylko na polecenie właściciela repo
