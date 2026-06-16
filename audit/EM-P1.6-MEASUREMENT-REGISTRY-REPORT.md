# EM-P1.6 — Measurement Registry & RAP Numbering — Raport końcowy

**Data:** 2026-06-16  
**Wersja:** 2.59.34  
**Status:** COMPLETE  

---

## 1. Registry Architecture

Trwały rejestr numerów pomiarowych w `src/lib/electrical-measurements/registry.ts`.

**Klucz KV:** `kw-electrical-measurement-registry`

**Model wpisu:**

```ts
ElectricalMeasurementRegistryEntry {
  jobId: string
  rapNumber: string      // RAP-45-2026
  year: number
  sequence: number
  assignedAt: string     // ISO
  status: ACTIVE | CANCELLED
}
```

**Sync:** `DATA_KEYS` · `BOOTSTRAP_DEFERRED_KEYS` · merge LWW po `assignedAt` · push bundle z pomiarami.

**Przepływ:**

```text
„Nowy raport” → assignRapForJob(registry, jobId)
              → createEmptyElectricalMeasurement(jobId, rapNumber)
              → zapis measurements + registry → chmura

„Usuń raport” → removeElectricalMeasurement + cancelRegistryForJob (CANCELLED)

„Utwórz ponownie” → assignRapForJob (reuse rapNumber, ACTIVE)
```

Numer **nigdy** nie wraca do puli — wpis pozostaje w rejestrze.

---

## 2. RAP Numbering Rules

| Reguła | Implementacja |
|--------|---------------|
| Format | `RAP-{seq}-{YYYY}` |
| 1 numer ↔ 1 jobId | `getRegistryEntryForJob` — reuse przy recreate |
| Przydział | Tylko przy `handleCreateReport` (utworzenie raportu) |
| Nigdy przy | DOCX, preview, edycji pól |
| Numer read-only | UI — pole RAP tylko do odczytu |

---

## 3. Annual Reset

Przy braku wpisu dla jobId:

```text
sequence = max(entries where year === currentYear) + 1
```

Jeśli `currentYear > poprzedni rok w rejestrze` → pierwszy raport w nowym roku = `RAP-1-{YYYY}`.

Test: P16-T04 — PASS.

---

## 4. Job Assignment

Przykład smoke (P16-T06):

| Robota | Akcja | Wynik |
|--------|-------|-------|
| A | utwórz | RAP-N-2026 |
| A | usuń + utwórz ponownie | **ten sam** RAP-N-2026 |
| B | utwórz | RAP-(N+1)-2026 |

---

## 5. Checklist Integration

Checklista dokumentów roboty: `job.documents.pomiary === true`

Gdy **Pomiary zaznaczone** + **brak aktywnego raportu** + **wpis w registry**:

- Komunikat: „Pomiary zostały wykonane. Numer: RAP-XX-YYYY”
- Brak przycisku „Nowy raport” (nowy numer)
- **Administrator** (admin / super_admin): „Utwórz raport ponownie” → reuse RAP

---

## 6. Migration

`migrateRegistryFromMeasurements(registry, measurements)`:

- Skanuje istniejące raporty z poprawnym `reportNumber` (regex RAP)
- Dodaje brakujące wpisy per `jobId` (status ACTIVE)
- Uruchamiane w `App.tsx` przy wykryciu `registryNeedsMigrationFromMeasurements`

Istniejące np. `RAP-44-2026` → automatyczny wpis bez utraty danych.

---

## 7. Build

```text
npm run build
```

**Wynik:** PASS (14.49s)

---

## 8. Smoke

| Skrypt | Wynik |
|--------|-------|
| `test-electrical-measurements-registry-p16.mjs` | **24 PASS, 0 FAIL** |
| `test-electrical-measurements-p15.mjs` | regresja |
| `test-electrical-measurements-p0.mjs` | regresja |

Scenariusze A/B/delete/recreate/year reset — PASS.

---

## 9. Known Limitations

1. **Jeden RAP per job** — wiele raportów na jedną robotę nadal możliwe w danych, ale numer RAP wspólny z registry (backlog: ograniczenie do 1 raportu).
2. **Checklista bez registry** — jeśli Pomiary zaznaczone, ale brak wpisu (edge case) — „Nowy raport” nadal dostępny (pierwszy przydział).
3. **Moderator** — nie może „Utwórz raport ponownie” (tylko admin / super_admin).
4. **Ręczna edycja numeru** — wyłączona (read-only); korekta tylko przez rejestr.

---

## 10. Plan EM-P2

Integracja z **WM Druk ZIP Odbiorowy**:

- Pakiet ZIP zawiera 5 DOCX pomiarowych powiązanych z `rapNumber` z registry
- `generateEmDocxZip(measurement, job)` + slot w paczce odbiorowej
- Bez ponownego losowania wartości (EM-P1.5) ani numeru (EM-P1.6)

---

## Zmienione pliki

| Plik | Rola |
|------|------|
| `src/lib/electrical-measurements/registry.ts` | **NOWY** — SSOT rejestru |
| `src/lib/electrical-measurements/types.ts` | typy + klucz KV |
| `src/lib/electrical-measurements/sync.ts` | push bundle registry |
| `src/lib/electrical-measurements/report.ts` | `reportNumber` param |
| `src/lib/cloud-sync.ts` | DATA_KEYS, merge, bootstrap |
| `src/app/App.tsx` | stan registry, migracja, commit |
| `src/app/JobElectricalMeasurementsPanel.tsx` | UI RAP, delete, checklist |
| `src/app/WmPrintView.tsx` | props registry |
| `src/app/admin/AdminViewRouter.tsx` | props registry |
| `src/app/changelog-data.ts` | v2.59.34 |
| `src/app/GuideView.tsx` | FAQ |
| `scripts/test-electrical-measurements-registry-p16.mjs` | **NOWY** |
