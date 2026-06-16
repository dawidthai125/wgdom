# EM-UX-001 — Move Electrical Measurements to WM Druk

**Data:** 2026-06-16  
**Wersja:** **2.59.31**  
**Zakres:** UX-only — bez zmian `src/lib/electrical-measurements/*`

---

## 1. Executive Summary

Przeniesiono pełny interfejs **Pomiary Elektryczne** z **Roboty** do **WM Druk** (zakładka **Pomiary**). Model danych, sync (`kw-electrical-measurements`), preview i generator DOCX bez zmian.

| Obszar | Przed | Po |
|--------|-------|-----|
| Edycja raportów | Roboty → panel pełny | WM Druk → Pomiary |
| Roboty | Formularz + DOCX | Skrót + link |
| WM Druk | 4 zakładki | **5 zakładek** (+ Pomiary) |

---

## 2. UX Decision

### Werdykt audytu: UX NO GO (Roboty)

Pomiary należą do procesu **odbiorów WM** — logicznie obok ZIP/szablonów.

### Wariant wybrany: **A — Wybierz robotę → Pomiary**

| | Wariant A | Wariant B |
|---|-----------|-----------|
| Flow | Lista robót (lewa) → panel Pomiary (prawa) | Najpierw zakładka → potem robota |
| Spójność z Odbiory | ✅ ten sam wzorzec | ❌ inny flow |
| Deep link z Roboty | ✅ `jobId` + tab | możliwy, ale mniej naturalny |

**Kolejność zakładek:** `Odbiory · Pomiary · Szablony · Historia · Ustawienia`  
(Pomiary zaraz po Odbiorach — ten sam kontekst procesu odbiorowego.)

---

## 3. WM Druk Integration

| Plik | Zmiana |
|------|--------|
| `src/lib/wm-print/wm-print-tabs.ts` | Typ `WmPrintTab` + `WM_PRINT_TABS` |
| `src/app/WmPrintView.tsx` | Zakładka Pomiary, `JobElectricalMeasurementsPanel`, wspólna lista robót |
| `src/app/JobElectricalMeasurementsPanel.tsx` | **Bez zmian** — reuse w WM Druk |

Props WM Druk: `electricalMeasurements`, `onChange`, `onCommit`, `initialTab`, `initialJobId`.

---

## 4. Roboty Summary

| Plik | Zmiana |
|------|--------|
| `src/app/JobElectricalMeasurementsSummaryPanel.tsx` | **NOWY** — Raporty/Obwody/RCD + link |
| `src/app/JobsView.tsx` | Usunięto pełny panel; tylko summary |

Brak w Robotach: formularz, obwody, RCD, preview, generowanie DOCX.

---

## 5. Deep Linking

Wzorzec jak `pendingTenderId` / `pendingOperationalNoteId`:

```text
Roboty → „Otwórz w WM Druk”
  → pendingWmPrintNav { tab: "pomiary", jobId }
  → setView("wmprint")
  → WmPrintView: initialTab + initialJobId
  → consume → setPendingWmPrintNav(null)
```

Pliki: `App.tsx`, `AdminViewRouter.tsx`, `WmPrintView.tsx`.

---

## 6. Build

```text
npm run build → PASS (17.6s)
```

---

## 7. Smoke

| Test | Wynik |
|------|-------|
| `test-electrical-measurements-ux-001.mjs` | PASS |
| `test-electrical-measurements-p0.mjs` | 33/33 |
| `test-electrical-measurements-p1.mjs` | 32/32 |

Scenariusze UX-001: zakładka Pomiary, brak pełnego panelu w JobsView, deep link wiring, lib nietknięte.

---

## 8. Known Limitations

| # | Ograniczenie |
|---|--------------|
| L1 | Brak URL `/open/wmprint/pomiary/{jobId}` — tylko nawigacja in-app |
| L2 | `viewReturn` z Roboty — brak automatycznego powrotu po WM Druk (jak inne moduły) |
| L3 | Ta sama lista robót w Odbiory i Pomiary — duplikat UI (celowe, Wariant A) |

---

## 9. Next Phase

**EM-P1.5 — Real Measurement Values** — edycja Zs, Za, macierzy MΩ w UI (bez zmian w tym zadaniu).

---

*EM-UX-001 COMPLETE · v2.59.31*
