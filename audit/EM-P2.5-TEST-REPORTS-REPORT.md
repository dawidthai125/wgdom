# EM-P2.5 — Test Reports

**Data:** 2026-06-16  
**Wersja:** 2.59.38  
**Status:** PASS (build + smoke 20/20)

---

## 1. Architecture

Raporty testowe to osobna ścieżka tworzenia pomiarów:

| Aspekt | Produkcja (RAP) | Test (TEST-RAP) |
|--------|-----------------|-----------------|
| Numer | `RAP-X-YYYY` | `TEST-RAP-NNN` |
| Registry KV | tak | **nie** |
| Checklista odbiorowa | wpływa (blok „Pomiary wykonane”) | **nie** |
| Katalog status | AKTYWNY | **TESTOWY** |
| Usunięcie | cancel registry | tylko measurement |

Moduły:

| Plik | Rola |
|------|------|
| `test-report.ts` | numeracja TEST-RAP, create/filter, izolacja |
| `measurement-docx-names.ts` | nazwy DOCX/ZIP (DANE vs DANE-INFORMACYJNE) |
| `JobElectricalMeasurementsPanel.tsx` | dwa przyciski create, delete bez registry |

Bez nowych kluczy KV.

---

## 2. Test Report Model

```ts
flags: { test: true }
reportNumber: "TEST-RAP-001" // globalna sekwencja NNN
```

Numeracja: max istniejący NNN + 1 w całym `kw-electrical-measurements`.

---

## 3. Registry Isolation

- `createTestElectricalMeasurement` — **nie** wywołuje `assignRapForJob`
- `migrateRegistryFromMeasurements` / `registryNeedsMigrationFromMeasurements` — pomijają `isTestMeasurement`
- Delete test — **nie** wywołuje `cancelRegistryForJob`

---

## 4. Catalog Integration

- `resolveMeasurementCatalogStatus` → TEST gdy `flags.test`
- Filtr statusu **TESTOWY** działa
- ZIP/DOCX testów w katalogu — pełna obsługa

Checklista WM: `showPomiaryCompletedBlock` liczy tylko raporty produkcyjne (`productionReports`).

---

## 5. DOCX

Test:

```
TEST-RAP-001-PROTOKOL.docx
TEST-RAP-001-DANE.docx
TEST-RAP-001-ADSC.docx
TEST-RAP-001-REZYSTANCJA.docx
TEST-RAP-001-RCD.docx
```

Produkcja bez zmian (`DANE-INFORMACYJNE`).

---

## 6. ZIP

- Pojedynczy: `TEST-RAP-001.zip`
- Wielokrotny: identyczna struktura jak RAP + INDEX.txt

---

## 7. Build

```
npm run build → PASS
```

---

## 8. Smoke

`npx vite-node scripts/test-electrical-measurements-test-reports-p25.mjs`

| Test | Wynik |
|------|-------|
| create / delete test | PASS |
| brak registry | PASS |
| DOCX + ZIP | PASS |
| katalog + filtr TESTOWY | PASS |
| RAP-45 po teście | PASS |

**20 PASS, 0 FAIL** · regresja P2: **40/40 PASS**

---

## 9. Risks

- Wiele raportów testowych na jednej robocie — dozwolone (celowo)
- TEST-RAP numeracja globalna (nie per rok) — prostsza, zgodnie ze spec
- EM-P3 musi ignorować testy przy dołączaniu do ZIP odbiorowego

---

## 10. Plan EM-P3

Przy „Pobierz ZIP odbiorowy” dołączyć tylko **produkcyjny** RAP roboty (`filterProductionMeasurements` / `jobHasProductionMeasurement`). Raporty TESTOWE — **ignore**.

---

## Release

| Pole | Wartość |
|------|---------|
| Commit hash | `872d817` |
| Deploy | **RELEASE GO** (push `main` → Vercel) |
| `version.json` | **2.59.37** at verify — **DEPLOY PROPAGATING** (oczekiwana: **2.59.38**) |
