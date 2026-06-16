# EM-P3.5 — Measurement Index Export — Raport

**Data:** 2026-06-16 · **Wersja:** 2.59.41 · **Status:** RELEASE GO

---

## 1. Architecture

```
buildMeasurementCatalogRows (SSOT)
  → buildMeasurementIndexTxt / buildMeasurementIndexCsv
  → appendMeasurementIndexFiles(zip, rows, prefix?)
```

- Brak nowego KV — generowanie **na żywo** przy ZIP
- Moduł: `measurement-index-export.ts`

## 2. TXT Index

```
WGDOM - REJESTR POMIARÓW

RAP-45-2026
Adres: ul. Kleczkowska 26 m.3
Data: 2026-06-16
Status: AKTYWNY
```

## 3. CSV Index

```csv
RAP;Data;Adres;Status
RAP-45-2026;2026-06-16;ul. Kleczkowska 26 m.3;AKTYWNY
```

## 4. Measurement ZIP

| Typ | Lokalizacja INDEX |
|-----|-------------------|
| Pojedynczy RAP | katalog główny ZIP |
| Wielokrotny | katalog główny + legacy `INDEX.txt` |

## 5. WM ZIP

Przy ☑ Dołącz pomiary:

```
Pomiary/
├── INDEX-POMIARY.txt
├── INDEX-POMIARY.csv
└── RAP-45-2026-*.docx
```

## 6. Build

```
npm run build → PASS
```

## 7. Smoke

| Test | Wynik |
|------|-------|
| P35 (INDEX) | **27/27 PASS** |
| P3 regresja | **23/23 PASS** |
| P2 regresja | **40/40 PASS** (po aktualizacji T05) |

## 8. Risks

| Ryzyko | Mitigacja |
|--------|-----------|
| Więcej plików w ZIP | +2 małe pliki tekstowe |
| Adres z `;` w CSV | csvEscape z cudzysłowami |

## 9. Compatibility

- `INDEX.txt` (P2) zachowany w archiwum wielokrotnym
- P3 odbiorowy bez zmian logiki TEST-RAP

## 10. Future

- Eksport INDEX z filtrem zakresu dat (backlog)

---

| Commit hash | _(po push)_ |
| Deploy | push `main` → Vercel |
| `version.json` | _(VERIFY FAST)_ |
