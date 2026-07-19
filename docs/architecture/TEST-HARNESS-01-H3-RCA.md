# TEST-HARNESS-01 H3 — RCA

> **Program:** TEST-HARNESS-01 · Slice **H3** · Payroll Production Sandbox  
> **Status:** AUDIT ONLY · **NIE implementować** bez Owner GO  
> **Data:** 2026-07-19  
> **Fundament:** H0 **RELEASED** · H1 **RELEASED** · H2 **RELEASED** · [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md)  
> **PLAN / DF / Review:** [`TEST-HARNESS-01-H3-PLAN.md`](TEST-HARNESS-01-H3-PLAN.md) · [`TEST-HARNESS-01-H3-DESIGN-FREEZE.md`](TEST-HARNESS-01-H3-DESIGN-FREEZE.md) · [`TEST-HARNESS-01-H3-ARCHITECTURE-REVIEW.md`](TEST-HARNESS-01-H3-ARCHITECTURE-REVIEW.md)  
> **Parent AC:** **H3-A (MVP default)** — Open + week + KPI verify · **bez** „Zapisz tydzień” na prod

---

## 1. Objaw

Brak formalnego, bezpiecznego scenariusza produkcyjnego dla ścieżki Lista Płac (Payroll):

```text
open payroll week
  → verify roster
  → verify KPI
  → verify totals
  → read-only validation
  → cleanup
```

| Stan | Fakt |
|------|------|
| H0 | Foundation (`psb-*`, allowlist, mutate-guard, **PSB-001**) — **RELEASED** |
| H1 / H2 | Tender + Jobs photos sandbox — **RELEASED** (wzorce anti-wipe, hybrid KV+Playwright) |
| H3 | `h3-payroll` = **NOT IMPLEMENTED** (runner nie rejestruje) |
| Parent DF | **H3-A** zamrożone jako MVP · H3-B/C tylko po osobnym Owner GO |
| Ad-hoc | `.tmp/payroll-*-prod-smoke.mjs`, `_smoke-payroll-post-restore.mjs` — bez H0 guardrailów / Cleanup Guarantee |
| Lib smoke | `scripts/test-payroll-*.mjs` / PAYROLL-GUARD — **unit / preview**, nie PSB prod E2E H3-A |

Stability sweep otwierał Lista Płac (shell), ale **nie** gwarantował deterministycznych asercji roster/KPI/totals z zero zapisu tygodnia.

---

## 2. Root cause

| ID | Przyczyna |
|----|-----------|
| **RC-1** | H0–H2 pokrywają fundament + tender + jobs; brak scenariusza Payroll w harness |
| **RC-2** | Lista Płac = Protected Core (PWRB · merge · `cloud-sync` · Edge) — każdy **zapis** tygodnia na prod bez allowlist = ryzyko operacyjne (historyczne incydenty payroll) |
| **RC-3** | Always-create „sandbox week” jak H1/H2 **nie** mapuje się naturalnie na model tygodnia (`kw-weekFrom`/`kw-weekTo`/`kw-week-employees`) bez mutacji Core |
| **RC-4** | „Zapisz tydzień” / settled / dodaj pracownika na prod = write path — **poza** H3-A (Parent **#PSB-012**) |
| **RC-5** | Ad-hoc smoke mieszają RO observe z write (toggle Rozliczony, archive restore) — brak jednego scenariusza **read-only only** |
| **RC-6** | Asercje godzin/suм bez SSOT (`payrollMetrics` vs UI) łatwo dryfują → potrzeba **H3-001 Stable Assertions** (jak H1-001) |

---

## 3. Decyzja Ownera (wejście DF)

| Pytanie | Odpowiedź |
|---------|-----------|
| Zakres pipeline | open week → roster → KPI → totals → RO validation → cleanup |
| Tryb MVP | **H3-A** — **wyłącznie odczyt** · **brak** zapisu tygodnia · **brak** modyfikacji Payroll |
| Reuse | **Wyłącznie** H0 + wzorce H1/H2 (`psb-*`, allowlist, mutate-guard, **PSB-001**) |
| Seed / always-create week | **NIE** w MVP — pure read current (lub jawnie wskazany) operational week |
| Lokalizacja docs | `docs/architecture/TEST-HARNESS-01-H3-*.md` |
| Produkt Core | **Zero** zmian — `cloud-sync` / PWRB / Edge / `PayrollView` logika poza zakresem |

---

## 4. Impact

| Obszar | Impact bez H3 |
|--------|---------------|
| Regresja Lista Płac (shell + KPI) | ad-hoc, niespójne exit codes |
| Ryzyko zapisu tygodnia na prod | wysokie przy mylącym „prod smoke write” |
| PSB-001 cleanup payroll entities | nie dotyczy H3-A (zero mutate) — ale harness musi nadal mieć `finally` no-op PASS |
| Protected Core | bez DF H3-A agent może proponować H3-B save / seed L5 |

---

## 5. Wnioski → PLAN / DF

1. Scenariusz `h3-payroll` = **Playwright open Lista Płac** + **KV `batch-get` read-only** + stable assert roster/KPI/totals.  
2. **Zero** `batch-set` na kluczach payroll · **zero** UI: Zapisz tydzień / Rozliczony / Dodaj / Usuń / defer / rollover.  
3. Cleanup = **PSB-001** `finally` z `mutatedIds: []` (no-op PASS) — nie tworzyć encji do sprzątania.  
4. H3-B/C (**save**) = **OUT OF SCOPE** tego AUDIT — osobny Owner GO + DF delta.  
5. **BLOCK IMPLEMENT** do Owner GO · ten dokument = RCA only.

---

**Koniec RCA H3**
