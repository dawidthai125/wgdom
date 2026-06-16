# INSPECTOR-P1A — Published Delivery Package — raport IMPLEMENT

**Data:** 2026-06-16  
**Wersja:** **2.59.45**  
**Zakres:** Storage + Publish (admin) · **bez** panelu inspektora · **bez** stale UI

---

## 1. Executive Summary

Zaimplementowano mechanizm **Published Delivery Package**: administrator w WM Druk generuje pakiet ZIP odbiorowy, weryfikuje zawartość i publikuje **immutable ZIP** do Supabase storage + KV `kw-delivery-package-publications`. Poprzednia aktywna publikacja dla roboty przechodzi w status **SUPERSEDED**. Inspektor **nie** otrzymał nowego UI (P1B) — granica WM Druk zachowana.

| Werdykt | **PASS** |
|---------|----------|
| Build | PASS |
| Smoke P1A | **17/17 PASS** |
| Deploy | po push → verify `version.json` |

---

## 2. Architecture

```text
WmPrintView.handlePublishForInspector
  → buildWmPrintDeliveryZipBytes (istniejący pipeline)
  → buildDeliveryPackageGenerationFingerprint
  → uploadDeliveryPackageZip → storage
  → applyDeliveryPackagePublication → KV
  → pushDeliveryPackagePublicationsToCloud
```

Nowa domena: `src/lib/delivery-package-publications/` (types, normalize, merge, publication, storage).

---

## 3. Storage

- Endpoint: `POST /make-server-0afb8820/storage-upload`
- Prefiks pliku: `delivery-package-v{zipVersion}-{safeFileName}`
- `jobId` = ID roboty (bucket `make-0afb8820-photos`)
- Pola publikacji: `storagePath`, `zipPublicUrl`, `fileName`, `fileSizeBytes`

---

## 4. Publication Model

Klucz: **`kw-delivery-package-publications`**

| Pole | Opis |
|------|------|
| `id`, `jobId`, `zipVersion` | Identyfikacja + wersja monotoniczna per robota |
| `publishedAt`, `publishedByUserId`, `publishedByUserName` | Audyt |
| `generationFingerprint`, `fingerprintPayload` | Hash + wejścia (P1C stale) |
| `fileCount`, `odbiorFileCount`, `pomiaryFileCount` | Metadane ZIP |
| `status` | ACTIVE / SUPERSEDED / REVOKED |

**ACTIVE uniqueness:** test P1A-T03 + guard w `publishDeliveryPackageForJob`.

---

## 5. Fingerprint

`buildDeliveryPackageGenerationFingerprint` — SHA-256 kanonicznego JSON:

- wybrane `selectedTemplateIds` + `templateFileDigests`
- `dateMode` / `customDateIso` (ZI)
- `jobVariableDigest` (adres, DATE)
- `wmJobDocDigests` (uploady WM Druk)
- `checklistDigest` (`REQUIRED_DOCS` z `job.documents`)
- aktywny RAP (`measurementId`, `updatedAt`, `reportNumber`)

**P1A:** tylko zapis — bez UI „PAKIET NIEAKTUALNY” (P1C).

---

## 6. WM Druk UI

- Przycisk **„Opublikuj dla inspektora”** obok **„Generuj komplet (ZIP)”**
- Panel **Ostatnia publikacja:** data, autor, vN, liczba plików, rozmiar, status
- Etykieta „Generuj komplet (ZIP)” bez zmiany algorytmu (lokalny download)

Plik: `src/app/WmPrintView.tsx`

---

## 7. Build

```text
npm run build → PASS (2026-06-16)
```

---

## 8. Smoke

```bash
npx vite-node scripts/test-delivery-package-publications-p1a.mjs
```

| Test | Wynik |
|------|-------|
| normalize / parse | PASS |
| fingerprint save | PASS |
| create + supersede + ACTIVE uniqueness | PASS |
| merge (sync simulation) | PASS |
| metadata format | PASS |
| **Łącznie** | **17 PASS / 0 FAIL** |

---

## 9. Limitations (P1A)

- Inspektor **nie** syncuje `kw-delivery-package-publications` (P1B)
- Brak revoke UI (P1C)
- Brak stale banner (P1C)
- Publikacja wymaga sieci (upload storage)
- `REVOKED` w modelu — implementacja UI w P1C

---

## 10. Plan P1B

| ID | Zakres |
|----|--------|
| P1B-1 | Sync publications w `InspectorPanel` |
| P1B-2 | `InspectorDeliveryPackagePanel` — status BRAK/GOTOWY |
| P1B-3 | Pobieranie opublikowanego ZIP |
| P1B-4 | Manifest (lista plików read-only) |
| P1B-5 | Smoke + Help inspektora |

---

*INSPECTOR-P1A · v2.59.45 · 2026-06-16*
