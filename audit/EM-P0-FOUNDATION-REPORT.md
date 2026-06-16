# EM-P0 — Pomiary Elektryczne — Foundation Report (FINAL)

**Data:** 2026-06-16  
**Wersja:** 2.59.28 (korekty 4–6 na bazie 2.59.27)  
**Werdykt:** **PASS** — EM-P0 COMPLETE

---

## 1. Executive Summary

Fundament domeny **Pomiary Elektryczne** — model, storage, sync, UI, preview SSOT.

Korekty finalne:

| # | Zakres |
|---|--------|
| 1–3 | Wiele raportów per job · pola miernika · statystyki preview |
| **4** | Circuit: `displayName` + `sortOrder` — gotowe pod EM-P1 |
| **5** | Preview SSOT: `buildAdscPreview` / `buildResistancePreview` / `buildRcdPreview` |
| **6** | Job summary: Raporty/Obwody/RCD zawsze widoczne + zwijanie szczegółów |

**Bez:** DOCX, ZIP, WM Druk.

---

## 2. Architektura

```text
src/lib/electrical-measurements/
  types.ts          — model + defaultCircuitDisplayName()
  normalize.ts      — parse + backfill displayName/sortOrder
  merge.ts
  report.ts         — CRUD + renumber sortOrder
  preview.ts        — SSOT (UI + przyszły DOCX)
  sync.ts
  generate-em-docx.ts  STUB
```

---

## 3. Storage

Klucz `kw-electrical-measurements` w `DATA_KEYS`, `BOOTSTRAP_DEFERRED_KEYS`, merge LWW w `cloud-sync.ts`.

---

## 4. Model danych

**Circuit (EM-P1-ready):**

```ts
{ id, type, breakerType, displayName, sortOrder }
```

**ElectricalMeasurement:** wiele na `jobId`, pełne pola pomiarowca/miernika, `circuits[]`, `rcds[]`.

Normalize uzupełnia brakujące `displayName`/`sortOrder` — brak migracji KV.

---

## 5. UI

Panel **Pomiary Elektryczne** w Robotach:

- **Job summary** (zawsze): Raporty · Obwody · RCD
- Select raportu + Nowy raport
- Zwiń/Rozwiń szczegóły edycji
- 4 sekcje edycji + preview read-only

---

## 6. Preview (SSOT)

```ts
buildAdscPreview(measurement)       → string[]
buildResistancePreview(measurement) → string[]
buildRcdPreview(measurement)         → string[]
buildJobElectricalMeasurementsSummary(reports)
buildElectricalMeasurementPreview(measurement)  // bundle dla UI
```

UI **nie** buduje własnej logiki wierszy — tylko renderuje wynik preview.

Przepływ EM-P1: `model → preview.ts → DOCX + UI`.

---

## 7. Build

```bash
npm run build → PASS
```

---

## 8. Smoke

```bash
npx vite-node scripts/test-electrical-measurements-p0.mjs
```

**Wynik:** 30+/30 PASS (normalize, CRUD, multi-report, circuit fields, preview SSOT, job summary, persistence).

---

## 9. Ograniczenia P0

- Brak generatora DOCX (stub)
- Brak ZIP / WM Druk
- Brak globalnych domyślnych ustawień miernika
- `displayName` edytowalne w modelu — UI edycji displayName = EM-P1 (typ zmienia domyślną etykietę)

---

## 10. Plan EM-P1

Generator DOCX (5 dokumentów) korzysta z `preview.ts` + `generate-em-docx.ts`.

Interfejsy `EmDocxGeneratorInput` / `EmDocxGeneratorOptions` gotowe.

---

*EM-P0 FINAL · 2026-06-16*
