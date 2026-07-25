# PAYROLL WEEK MODEL — Operational Week · Resolver · ALIGN/ROLLOVER

> **Cel:** wspólny słownik tygodnia LP dla AI.  
> **SSOT invariants:** [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) (I-ROLL)  
> **Kod (orientacja):** `src/lib/payroll-cycle.ts` · classifier przejść · rollover CTA  
> **RCA:** [`../architecture/PAYROLL-P0-WEEK-ROLLOVER-01-RCA.md`](../architecture/PAYROLL-P0-WEEK-ROLLOVER-01-RCA.md)

```text
ALIGN ≠ wipe. ROLLOVER = archive + nowy tydzień.
Cofnięcie classifera = klasyczna regresja godzin.
```

---

## 1. Pojęcia

| Termin | Znaczenie |
|--------|-----------|
| **Operational week** | Aktualny zakres pracy LP (`kw-weekFrom` / `kw-weekTo`) widoczny w UI jako „ten tydzień” |
| **Week bounds / resolver** | Logika wyznaczania / utrzymania zakresu tygodnia (cycle helpers + stan w App) — **nie** wymyślaj drugiego kalendarza w UI |
| **Live roster** | `kw-week-employees` (+ para `…-deleted-ids`) — godziny **tego** operational week |
| **Archive week** | Zamknięty tydzień w `kw-archive` — **≠** live; semantyka saved/closed historyczna |
| **Prev snapshot** | `kw-week-employees-prev` (D4) — recovery UX; **≠** archive Restore |
| **ALIGN** | To samo okno tygodnia kalendarzowego / brak przejścia do nowego tygodnia — **nie** czyść rosteru jak przy rollover |
| **ROLLOVER** | Przejście na nowy tydzień: archive poprzedniego + clear/seed nowego wg kontraktu |
| **classifyPayrollWeekTransition** | Jedyny klasyfikator ALIGN vs ROLLOVER — **NIGDY nie cofaj** |

---

## 2. Co AI najczęściej psuje

| Błąd | Skutek |
|------|--------|
| „Przy każdej zmianie dat wyczyść godziny” | Wipe ALIGN |
| Nowy resolver dat w komponencie UI | Drift vs `payroll-cycle` / App state |
| Mylenie archive restore z `-prev` Soft Restore | Zły UX + ryzyko danych |
| Seed z directory przy cold start bez fence | Resurrection |

---

## 3. Gate

Jeśli brief dotyka dat tygodnia, rollover, archive, carry-forward, classifier → **G5 = TAK** w [`PAYROLL_SAFETY_GATE.md`](PAYROLL_SAFETY_GATE.md) → DF + Owner GO.

---

## 4. Linki

| | |
|--|--|
| Dependency „week cycle” | [`PAYROLL_DEPENDENCY_MAP.md`](PAYROLL_DEPENDENCY_MAP.md) |
| Never break | [`PAYROLL_NEVER_BREAK_RULES.md`](PAYROLL_NEVER_BREAK_RULES.md) |
| PV rollover | [`../architecture/PAYROLL-P0-WEEK-ROLLOVER-01-PRODUCTION-VERIFICATION.md`](../architecture/PAYROLL-P0-WEEK-ROLLOVER-01-PRODUCTION-VERIFICATION.md) |
