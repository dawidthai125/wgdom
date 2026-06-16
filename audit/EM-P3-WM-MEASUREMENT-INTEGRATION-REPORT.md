# EM-P3 — WM Druk Measurement Integration — Raport

**Data:** 2026-06-16 · **Wersja:** 2.59.40 · **Status:** RELEASE GO

---

## 1. Architecture

```
WM Druk → Odbiory → Generuj komplet (ZIP)
  → buildWmPrintDeliveryZipBytes()
      ├── Odbiory/  ← buildWmPrintFilesForJob (szablony WM)
      └── Pomiary/  ← appendMeasurementDocxToZip (generate-em-docx, świeże)
```

- SSOT lookup: `getProductionMeasurementForJob()` w `measurement-catalog.ts`
- Brak nowych kluczy KV — `kw-electrical-measurements` + `kw-electrical-measurement-registry`

## 2. Lookup Strategy

`getProductionMeasurementForJob(measurements, registry, jobId)`:

| Warunek | Wynik |
|---------|--------|
| `registry.status === CANCELLED` | `null` |
| `flags.test === true` / TEST-RAP | pomijany |
| brak `parseRapNumber` | pomijany |
| pierwszy produkcyjny RAP (najnowszy) | zwrócony |

## 3. ZIP Structure

```
ADRES_ODBIOR_WM.zip
├── Odbiory/
│   └── 01-*.pdf / *.docx …
└── Pomiary/          (tylko gdy checkbox ON + aktywny RAP)
    ├── RAP-45-2026-PROTOKOL.docx
    ├── RAP-45-2026-DANE-INFORMACYJNE.docx
    ├── RAP-45-2026-ADSC.docx
    ├── RAP-45-2026-REZYSTANCJA.docx
    └── RAP-45-2026-RCD.docx
```

## 4. Production Reports

- Checkbox **Dołącz dokumenty pomiarowe** — domyślnie **ON** gdy aktywny RAP
- DOCX generowane on-the-fly (`generateEmDocxBytes`) — bez cache

## 5. Test Reports

- `TEST-RAP-*` **nigdy** w lookup → brak folderu `Pomiary/`
- Nie wpływa na checklistę (bez zmian P2.5)

## 6. UI Changes

- `WmPrintView` — checkbox przed „Generuj komplet (ZIP)”
- Toast: „Odbiory + 5 pomiarów” gdy dołączono
- `GuideView` — zaktualizowany opis generowania ZIP

## 7. Build

```
npm run build → PASS (13.93s)
```

## 8. Smoke

| Scenariusz | Wynik |
|------------|-------|
| A: RAP-45-2026 + ZIP | Odbiory + Pomiary (5 DOCX) |
| B: TEST-RAP-001 | tylko Odbiory |
| C: brak pomiarów | tylko Odbiory |
| Checkbox OFF | brak Pomiary mimo RAP |

**Testy:** `test-electrical-measurements-integration-p3.mjs` — **23/23 PASS**

## 9. Risks

| Ryzyko | Mitigacja |
|--------|-----------|
| Zmiana struktury ZIP (Odbiory/) | jawna spec EM-P3; testy P3 |
| Wolniejsze generowanie (+5 DOCX) | tylko gdy checkbox ON |
| Stare skrypty oczekujące płaskiego ZIP | `buildWmPrintFilesForJob` bez zmian |

## 10. Future Enhancements

- **EM-P3.5:** `INDEX-POMIARY.txt` w folderze Pomiary (backlog)

---

## Pliki

| Plik | Rola |
|------|------|
| `measurement-catalog.ts` | `getProductionMeasurementForJob` |
| `generate-zip.ts` | `buildWmPrintDeliveryZipBytes`, foldery |
| `WmPrintView.tsx` | checkbox + integracja |
| `GuideView.tsx` | instrukcja |
| `scripts/test-electrical-measurements-integration-p3.mjs` | testy |

| Commit hash | _(po push)_ |
| Deploy | push `main` → Vercel |
| `version.json` | _(VERIFY FAST)_ |
