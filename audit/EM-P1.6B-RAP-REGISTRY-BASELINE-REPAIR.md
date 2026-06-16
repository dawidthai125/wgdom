# EM-P1.6B — RAP Registry Baseline Repair

**Data:** 2026-06-16  
**Wersja:** 2.59.36  
**Status:** PASS (build + smoke)

---

## Problem

Po wdrożeniu EM-P1.6 powstały raporty testowe z błędną numeracją:

| Robota | Numer RAP (błędny) |
|--------|-------------------|
| Kleczkowska 26 m.3 | RAP-1-2026 |
| Brochów m. Cyganka | RAP-2-2026 |

Ostatni raport wykonany poza WGDOM: **RAP-44-2026**.

---

## Usunięte wpisy (naprawa P1.6B)

| Typ | Identyfikator |
|-----|---------------|
| Raport pomiarowy | Kleczkowska 26 m.3 (heurystyka adres + m.3) |
| Raport pomiarowy | Brochów m. Cyganka |
| Registry entry | RAP-1-2026 |
| Registry entry | RAP-2-2026 |

Numery **RAP-45-2026** i **RAP-46-2026** pozostają wolne — nie przypisane do robot testowych.

---

## Nowy baseline registry

```json
{
  "v": 1,
  "baselineByYear": { "2026": 44 },
  "entries": [],
  "repairVersion": 1
}
```

| Pole | Wartość |
|------|---------|
| `currentYear` | 2026 |
| `lastNumber` (baseline) | 44 |
| `repairVersion` | 1 |

---

## Implementacja

| Plik | Rola |
|------|------|
| `registry-baseline-repair.ts` | Jednorazowa naprawa idempotentna (`repairVersion`) |
| `registry.ts` | `ElectricalMeasurementRegistryState` + `baselineByYear` w `getMaxSequenceForYear` |
| `types.ts` | Typ stanu rejestru |
| `App.tsx` | `useEffect` — naprawa po załadowaniu `jobs`, push do KV |
| `cloud-sync.ts` | Merge/sanitize obiektu state (kompat wstecz z tablicą) |

---

## Wyniki testów

### P16B smoke (`test-electrical-measurements-registry-p16b.mjs`)

| Test | Wynik |
|------|-------|
| brak RAP-1-2026 | PASS |
| brak RAP-2-2026 | PASS |
| registry startuje od 44 | PASS |
| nowy raport = RAP-45-2026 | PASS |
| kolejny raport = RAP-46-2026 | PASS |

**Podsumowanie:** 23 PASS, 0 FAIL

### Regresja P16 (`test-electrical-measurements-registry-p16.mjs`)

**26 PASS, 0 FAIL** (w tym P16-T11 baseline roczny)

### Build

`npm run build` — **PASS**

---

## Commit & deploy

| Pole | Wartość |
|------|---------|
| Commit hash | _(uzupełnione po push)_ |
| Deploy | push `main` → Vercel Git Integration |
| `version.json` | _(VERIFY FAST po push)_ |

---

## Werdykt

**RELEASE GO** — baseline RAP przywrócony; kolejny raport w prod = **RAP-45-2026**.
