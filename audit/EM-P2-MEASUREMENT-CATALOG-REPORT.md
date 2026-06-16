# EM-P2 — Katalog Pomiarów

**Data:** 2026-06-16  
**Wersja:** 2.59.37  
**Status:** PASS (build + smoke 40/40)

---

## 1. Architecture

Repozytorium raportów RAP zbudowane na istniejących kluczach KV (bez nowych):

| Klucz | Rola w katalogu |
|-------|-----------------|
| `kw-electrical-measurements` | treść raportów (pomiarowiec, miernik, obwody, valueSet) |
| `kw-electrical-measurement-registry` | status ACTIVE/CANCELLED, numer RAP per jobId |

Nowe moduły:

| Plik | Rola |
|------|------|
| `measurement-catalog.ts` | SSOT listy, filtry, status, INDEX, nazwy folderów |
| `measurement-catalog-zip.ts` | ZIP pojedynczy / wielokrotny (5× DOCX + INDEX.txt) |
| `MeasurementCatalogPanel.tsx` | UI zakładki WM Druk |

Status katalogu (`ElectricalMeasurementCatalogStatus`):

- **AKTYWNY** — raport istnieje, registry ACTIVE
- **ANULOWANY** — registry CANCELLED (z/bez raportu)
- **TESTOWY** — prep EM-P1.8 (`measurement.flags.test`)

---

## 2. Catalog UI

WM Druk → zakładka **Katalog Pomiarów** (między Pomiary a Szablony).

Tabela: checkbox, Numer RAP, Data, Adres, Pomiarowiec, Status.  
Panel szczegółów: RAP, data, robota, pomiarowiec, miernik, pobieranie dokumentów.

---

## 3. Filters

- Rok (dropdown z dostępnych lat RAP)
- Numer RAP (substring)
- Adres (substring)
- Status: ALL / AKTYWNY / ANULOWANY / TESTOWY

---

## 4. Single ZIP

`RAP-45-2026.zip` — 5 plików w korzeniu:

```
RAP-45-2026-PROTOKOL.docx
RAP-45-2026-DANE-INFORMACYJNE.docx
RAP-45-2026-ADSC.docx
RAP-45-2026-REZYSTANCJA.docx
RAP-45-2026-RCD.docx
```

---

## 5. Multi ZIP

Przycisk **Pobierz wybrane ZIP** — archiwum `Pomiary-WGDOM-YYYY-MM-DD.zip`.

---

## 6. Folder Structure

```
RAP-45-2026_Kleczkowska_26_m3/
  RAP-45-2026-PROTOKOL.docx
  …
RAP-46-2026_Brochow_m_Cyganka/
  …
```

---

## 7. INDEX

`INDEX.txt` w archiwum wielokrotnym:

```
RAP-45-2026 | Kleczkowska 26 m.3 | 2026-06-16
RAP-46-2026 | Brochów m. Cyganka | 2026-06-17
```

---

## 8. Build

```
npm run build → PASS
```

---

## 9. Smoke

`npx vite-node scripts/test-electrical-measurements-catalog-p2.mjs`

| Obszar | Wynik |
|--------|-------|
| lista raportów | PASS |
| filtry | PASS |
| szczegóły + ANULOWANY | PASS |
| ZIP pojedynczy | PASS |
| ZIP wielokrotny + INDEX | PASS |
| struktura folderów | PASS |
| kompatybilność registry | PASS |
| status ACTIVE / TEST prep | PASS |

**40 PASS, 0 FAIL**

Scenariusz manualny (prod): utwórz 3 raporty → Katalog → zaznacz 2 → Pobierz wybrane ZIP.

---

## 10. Plan EM-P3

**WM Druk Measurement Integration** — przy „Pobierz ZIP odbiorowy” automatycznie dołączyć folder aktywnego RAP przypisanego do roboty (5× DOCX z katalogu). Wymaga hook w `generate-zip.ts` + lookup `buildMeasurementCatalogRows` / `catalogRowsWithDocuments` per jobId.

---

## Release

| Pole | Wartość |
|------|---------|
| Commit hash | `2634aa5` |
| Deploy | **RELEASE GO** (push `main` → Vercel) |
| `version.json` | **2.59.36** at verify — **DEPLOY PROPAGATING** (oczekiwana: **2.59.37**) |
