# AI-COST-PARSER-01 — P0-RETRY · PRODUCTION VERIFY

> **ID:** AI-COST-PARSER-01-P0-RETRY-PRODUCTION-VERIFY  
> **Data:** 2026-07-29  
> **STATUS:** **PARTIAL** · live Heavy re-run **BLOCKED** (brak tipu z P0-RETRY na prod)  
> **Baseline tip nadal:** **2.65.77** / **`a061bbd`** (feature niepushed)  
> **DF §6.2** · Fixture: `08dee178-1010-dbe7-ebd1-650001a84a9f`

```text
════════════════════════════════════════════════════════
PV FULL wymaga: commit → push → tip → Ponów w UI.
Ten raport = eligibility + unit/regresja + stan KV AS-IS.
════════════════════════════════════════════════════════
```

---

## 1. Unit / regresja (lokalnie)

| ID | Wynik |
|----|--------|
| T1–T3 | **PASS** |
| T4 ZIP-UNPACK | **PASS** |
| T5 Force healthy | **PASS** |

---

## 2. OPS eligibility (READ ONLY KV — 2026-07-29)

Fixture `08dee178…` **nadal historyczny snapshot:**

| Pole | Wartość |
|------|---------|
| `parsedAt` | `2026-07-28T19:02:03.820Z` (**bez zmian** — oczekiwane bez deploy) |
| `zipUnpackOk` | `false` |
| `zipInnerCount` | `0` |
| `kosztorys` | `null` |
| `costDiscovery.found` | `false` |
| `heavyParseDone` | `true` |
| `shouldSoftInvalidateOnF2ZipRetry` | **`true`** |
| Po symulacji `applyForceHeavyRescanAt` | `heavyParseDone → false` |

**Wniosek eligibility:** po wdrożeniu tipu CTA Ponów **aktywuje** soft-invalidate (predykat true).

---

## 3. Checklist DF §6.2 (live Heavy)

| Check | Status |
|-------|--------|
| Ponów → Heavy startuje | **PENDING** (wymaga tip z P0-RETRY) |
| `parsedAt` ≠ `2026-07-28T19:02:03.820Z` | **PENDING** |
| `zipInnerCount > 0` **lub** świeży `zipUnpackOk===false` | **PENDING** |
| `parseDocumentToKosztorys` na ATH | **PENDING** (po unpack) |
| Rozstrzygnięcie unpack OK vs fail | **PENDING** |

---

## 4. Werdykt PV

| | |
|--|--|
| Code ready | **TAK** |
| Production Verified (pełny) | **NIE** — feature nie na `main`/tip |
| Blokada | Brak Owner GO commit/push |

**Po push:** Owner otwiera `08dee178` → Ponów → odśwież KV / UI i uzupełnij §3.

---

## 5. T6

T6 = OPS manual po tipie. **Nie PASS** w tej sesji (świadomie — READ ONLY wobec prod bez nowego tipu).
