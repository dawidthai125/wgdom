# EM-P3A — Measurement Registry UX — Raport

**Data:** 2026-06-16 · **Wersja:** 2.59.39 · **Status:** RELEASE GO

---

## 1. Catalog UX

- Katalog Pomiarów: sub-zakładki **Katalog** | **Rejestr RAP**
- Nowa kolumna **Robota** (`jobName` — pierwsza linia `job.notes`, fallback `client`, potem `jobId`)
- Filtry: rok · wyszukaj RAP · adres · robota · status
- Szczegóły: adres i robota z linkiem **Otwórz w Robotach** + opcjonalnie **Pomiary WM**

## 2. ZIP Naming

- Pojedynczy ZIP: `RAP-45-2026_<adres_slug>.zip` (np. `RAP-45-2026_ul_Kleczkowska_26_m_3.zip`)
- SSOT: `catalogAddressSlug` + `measurementZipDownloadName(reportNumber, address)` w `measurement-docx-names.ts`
- Archiwum wielokrotne: bez zmian — foldery `RAP-X-YYYY_ADRES/` (już P2)

## 3. RAP Registry

- Panel **Rejestr RAP** — dane z `kw-electrical-measurement-registry` (+ data z raportu gdy istnieje)
- Kolumny: Numer RAP · Adres · Robota · Status · Data
- Raporty TEST-RAP **pominięte** w rejestrze (brak wpisów registry)

## 4. Deep Links

- Klik **Numer RAP** lub **Adres** → `onOpenJobInJobs(jobId, "summary")` → widok **Roboty**
- W `WmPrintView` przekazano `onOpenJobInJobs` z `AdminViewRouter`
- Fallback: `onOpenJob` → WM Druk → Pomiary (gdy brak hooka Roboty)

## 5. Search

- `matchesRapSearchQuery`: `45`, `RAP-45`, `RAP-45-2026`, rok `2026`
- Używane w filtrach katalogu i rejestru

## 6. Filters

| Filtr | Katalog | Rejestr |
|-------|---------|---------|
| Rok | ✓ | ✓ |
| RAP | ✓ | ✓ |
| Adres | ✓ | ✓ |
| Robota | ✓ | ✓ |
| Status | AKTYWNY/ANULOWANY/TESTOWY | AKTYWNY/ANULOWANY |

## 7. Build

```
npm run build → PASS (14.18s)
```

## 8. Smoke

Scenariusz (manual / testy Node):

1. Katalog → wyszukaj `RAP-45` → 1 wynik
2. `jobId` w wierszu → nawigacja do Roboty (UI)
3. Pobierz ZIP → nazwa zawiera slug adresu Kleczkowska

**Testy automatyczne:**

| Skrypt | Wynik |
|--------|-------|
| `test-electrical-measurements-registry-ux-p3a.mjs` | **25/25 PASS** |
| `test-electrical-measurements-catalog-p2.mjs` | **40/40 PASS** (regresja ZIP) |
| `test-electrical-measurements-test-reports-p25.mjs` | **20/20 PASS** |

## 9. Risks

| Ryzyko | Mitigacja |
|--------|-----------|
| Długie nazwy ZIP w Windows | slug adresu max 48 znaków |
| Brak `notes` na robocie | fallback client → jobId |
| Stare bookmarki ZIP bez adresu | tylko nowe pobrania; archiwum wielokrotne bez zmian |

## 10. Plan EM-P3

**WM Druk Measurement Integration** — przy „Pobierz ZIP odbiorowy” dołączyć DOCX/ZIP **aktywnego raportu produkcyjnego** (`filterProductionMeasurements`); raporty `TEST-RAP-*` ignorować.

---

## Pliki

| Plik | Zmiana |
|------|--------|
| `measurement-docx-names.ts` | `catalogAddressSlug`, ZIP z adresem |
| `measurement-catalog.ts` | `jobName`, `matchesRapSearchQuery`, `buildRapRegistryRows` |
| `measurement-catalog-zip.ts` | download z adresem |
| `MeasurementCatalogPanel.tsx` | kolumny, filtry, deep-link, sub-tabs |
| `RapRegistryPanel.tsx` | **NOWY** |
| `WmPrintView.tsx` | `onOpenJobInJobs` |
| `AdminViewRouter.tsx` | wire deep-link |
| `scripts/test-electrical-measurements-registry-ux-p3a.mjs` | **NOWY** |

| Commit hash | `e6b168d` |
| Deploy | **RELEASE GO** (push `main` → Vercel) |
| `version.json` | **2.59.38** at verify — **DEPLOY PROPAGATING** (oczekiwana: **2.59.39**) |
