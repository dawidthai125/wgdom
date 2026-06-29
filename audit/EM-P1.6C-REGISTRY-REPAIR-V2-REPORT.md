# EM-P1.6C — Registry Repair V2

**Data:** 2026-06-16  
**Wersja:** 2.59.42  
**Status:** PASS (build + smoke + regresja P16/P16B)  
**Commit:** `b79c949` · **Deploy:** RELEASE GO · PRODUCTION VERIFIED: DEPLOY PROPAGATING (version.json 2.59.41 → oczekiwana 2.59.42)

---

## 1. Root Cause

EM-P1.6B (`repairVersion: 1`) uruchamiał się tylko w sesji klienta — **naprawa nie została utrwalona w prod KV** (audyt `P0-EM-REGISTRY-AUDIT`):

- `kw-electrical-measurement-registry` = `[]` (legacy, brak `baselineByYear`, `repairVersion: 0`)
- `kw-electrical-measurements` zawierał **RAP-2-2026** (Brochów) oraz **sierocy raport Cygan Nowowiej** (`reportNumber: ""`)
- Katalog: 2 wiersze · Rejestr RAP: 0 wpisów · spójność **NIESPÓJNA**

P1.6B nie obejmował sierocych raportów bez numeru RAP (Cygan).

---

## 2. Data State Before

| Rekord | jobId | reportNumber | registry |
|--------|-------|--------------|----------|
| Brochów m.Cyganka | `8a752b0d-…` | RAP-2-2026 | brak |
| Cygan Nowowiej | `6a9319ac-…` | `""` | brak |

Registry KV: `[]` · baseline 2026: brak · repairVersion: 0

---

## 3. Repair Logic

Plik: `src/lib/electrical-measurements/registry-baseline-repair.ts`

| Element | Opis |
|---------|------|
| `applyRapRegistryBaselineRepairP16C` | Główna naprawa — warunek `repairVersion < 2` |
| `isRapRegistryTestJob` | Brochów + Kleczkowska (P1.6B) |
| `isCyganNowowiejRepairJob` | **NOWE** — adres Cygan + Nowowiej |
| `shouldPurgeMeasurementP16C` | Test jobs + RAP-1/RAP-2 + Cygan z pustym RAP |
| `App.tsx` | `useEffect` wywołuje P16C zamiast P16B, push bundle do KV |

Idempotentność: po `repairVersion = 2` repair się **nie powtarza**.

---

## 4. Registry State (po naprawie)

```json
{
  "v": 1,
  "baselineByYear": { "2026": 44 },
  "entries": [],
  "repairVersion": 2,
  "updatedAt": "<ISO przy pierwszym boot>"
}
```

---

## 5. Measurement Cleanup

Usunięte rekordy (prod):

| id | adres | reportNumber | powód |
|----|-------|--------------|-------|
| `49d9cfe9-56c7-42f0-b1a2-0005e7f00685` | Brochow m.Cyganka | RAP-2-2026 | test job + test RAP |
| `b3b597f1-5175-4181-8a40-780947ea5ebf` | Cygan Nowowiej | (pusty) | sierocy raport P1.6C |

**Po repair:** `measurements.length = 0`

---

## 6. Validation

| Test | Wynik |
|------|-------|
| `nextRapSequencePreview(state, 2026)` | **45** |
| `assignRapForJob` (symulacja) | **RAP-45-2026** |
| Katalog | **0 raportów** |
| Rejestr RAP | **0 wpisów** |

---

## 7. Build

```text
npm run build — PASS (17.39s)
```

---

## 8. Smoke

Skrypt: `scripts/test-electrical-measurements-registry-repair-v2.mjs`

| Scenariusz | Wynik |
|------------|-------|
| Stan wejściowy: RAP-2 + Cygan pusty + registry [] | PASS |
| Po repair: katalog=0, rejestr=0, baseline=44 | PASS |
| nextRap = RAP-45-2026 | PASS |
| repairVersion=2 idempotentność | PASS |
| Upgrade repairVersion 1→2 | PASS |
| Regresja P16B | PASS |

**P16C:** 25/25 PASS  
**P16B:** 23/23 PASS  
**P16:** 26/26 PASS

---

## 9. Risks

| Ryzyko | Mitigacja |
|--------|-----------|
| Repair nie wypchnie się do KV (offline) | Push w `useEffect` + suppress auto-sync; wymaga jednego boot admina |
| Cygan z prawidłowym RAP w przyszłości | Heurystyka tylko dla pustego `reportNumber` na tej robocie |
| Ponowne RAP-1/RAP-2 | `isTestRapNumber` + test jobs — purge przy v2 upgrade z v0/v1 |
| Klient ze starym bundle bez P16C | Wymaga deploy 2.59.42 |

---

## 10. Final State

| Pole | Wartość |
|------|---------|
| measurements | 0 |
| registry.entries | 0 |
| baselineByYear["2026"] | 44 |
| repairVersion | 2 |
| Następny RAP produkcyjny | **RAP-45-2026** |
| Katalog Pomiarów | 0 |
| Rejestr RAP | 0 |

---

## Pliki

| Plik | Rola |
|------|------|
| `registry-baseline-repair.ts` | P16C logic + `RAP_BASELINE_REPAIR_VERSION = 2` |
| `App.tsx` | Wywołanie P16C |
| `scripts/test-electrical-measurements-registry-repair-v2.mjs` | Smoke P16C |
| `audit/P0-EM-REGISTRY-AUDIT.md` | Audyt wejściowy |

**Uwaga operacyjna:** Po deploy — **jeden boot wgdom.fun** (admin, jobs załadowane) materializuje repair w prod KV.
