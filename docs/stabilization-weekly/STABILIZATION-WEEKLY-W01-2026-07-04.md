# STABILIZATION WEEKLY METRICS

> **⚠ SUPERSEDED** — zastąpiony raportem finalnym [`STABILIZATION-WEEKLY-W02-2026-07-06.md`](STABILIZATION-WEEKLY-W02-2026-07-06.md) (werdykt `STABLE`, prod 2.63.50).

> **⚠ RAPORT CZĘŚCIOWY / INTERIM** — tydzień niezamknięty (snapshot 2026-07-04). Wypełnione wyłącznie pola obiektywnie udokumentowane (bez telemetrii). Pola wymagające telemetrii / danych właściciela pozostają `PENDING`.

**Tydzień stabilizacji:** W01 / okno od 2026-07-01
**Zakres dat:** 2026-06-30 (pon) → 2026-07-06 (nd)
**Data raportu:** 2026-07-04 (snapshot interim)
**Autor:** —

---

## Metryki produkcyjne

| Metryka | Wartość |
|---------|---------|
| **Wersja produkcyjna** | 2.63.27 |
| **Commit** | 6c94223 |

_Uwaga prod:_ `docs-only` — od baseline **2.63.27** (`6c94223`) na `main` trafiły wyłącznie commity docs / Recovery Program bez bumpu numeru UI; `version.json` pozostaje **2.63.27**. (Źródło: `PROJECT-STATUS.md` §1 · `PROJECT-HANDOFF-CURRENT.md` §2 — bez świeżego `curl version.json` w bieżącym trybie.)

---

## Zmiany od poprzedniego raportu

| Metryka | Liczba | Uwagi (opcjonalnie, 1 linia) |
|---------|--------|------------------------------|
| **Hotfixy** | PENDING | brak poprzedniego raportu w repo (W01 = baseline); wymaga przeglądu deployów prod |
| **Regresje** | 0 | udokumentowany automated regression PASS (S7-5 24/24 · Edge-Opt-A 12/12); brak wykrytych regresji funkcjonalnych |
| **Incydenty P0** | PENDING | **P0 Payroll Cloud Sync Incident ACTIVE** (w toku, nie nowy w tym tygodniu) — Recovery Program faza PRODUCTION OBSERVATION; klasyfikacja liczbowa do potwierdzenia właściciela |

---

## Zgłoszenia użytkowników

| Obszar | Liczba | Uwagi (opcjonalnie, 1 linia) |
|--------|--------|------------------------------|
| **Przetargi** | PENDING | brak danych zgłoszeń w repo |
| **Payroll (Lista Płac)** | PENDING | brak danych zgłoszeń w repo |
| **Cloud Sync** | PENDING | brak danych zgłoszeń w repo |
| **Mobile** | PENDING | brak danych zgłoszeń w repo |

---

## Werdykt tygodnia (jedna linia)

`PENDING` — tydzień niezamknięty (snapshot interim 2026-07-04); werdykt wymaga domknięcia tygodnia + danych obserwacyjnych. **Uwaga:** aktywny P0 (Payroll Cloud Sync Incident) — per kryteria szablonu przy `P0 > 0` werdykt dąży do `ACTION`, do potwierdzenia przy zamknięciu tygodnia.
