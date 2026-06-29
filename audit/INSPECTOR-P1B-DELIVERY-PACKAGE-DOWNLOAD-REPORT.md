# INSPECTOR-P1B — Delivery Package Download — raport IMPLEMENT

**Data:** 2026-06-16  
**Wersja:** **2.59.46**  
**Zakres:** Inspektor download + manifest read-only · **bez** stale detection · **bez** revoke UI

---

## 1. Executive Summary

Zamknięto workflow **Published Delivery Package** po stronie inspektora: w sekcji **Odbiór WM** robota pojawił się panel **Pakiet odbiorowy** ze statusem BRAK PAKIETU / PAKIET GOTOWY, metadanymi publikacji, pobieraniem dokładnie opublikowanego ZIP oraz read-only manifestem zawartości. Inspektor synchronizuje `kw-delivery-package-publications` **read-only** (merge bez push). Przy publikacji admin zapisuje manifest plików z bajtów ZIP.

| Werdykt | **PASS** |
|---------|----------|
| Build | **PASS** |
| Smoke P1B | **26/26 PASS** |
| Smoke P1A regresja | **17/17 PASS** |
| Commit | **`e6d7e8e`** |
| Deploy | verify `version.json` → **2.59.46** |

---

## 2. Inspector UI

**Lokalizacja:** `InspectorPanel` → sekcja `wm` → `InspectorDeliveryPackagePanel`

| Element | Opis |
|---------|------|
| Status | **BRAK PAKIETU** / **PAKIET GOTOWY** |
| Metadane | data, autor, liczba plików, rozmiar, nazwa ZIP, status, wersja |
| CTA | **Pobierz pakiet odbiorowy** → `downloadUrlAsFile(zipPublicUrl)` |
| Manifest | **Pokaż zawartość** — foldery Odbiory/Pomiary, lista plików, INDEX |

---

## 3. Permissions

`INSPECTOR_DELIVERY_PACKAGE_PERMISSIONS` w `inspector-access.ts`:

| Dozwolone | Zabronione |
|-----------|------------|
| odczyt publikacji | publikacja |
| pobranie ZIP | revoke / delete |
| manifest read-only | generowanie ZIP |
| | WM Druk / szablony / pomiary |

Inspektor **nie** wywołuje `pushDeliveryPackagePublicationsToCloud`.

---

## 4. Download Flow

```text
InspectorDeliveryPackagePanel.handleDownload
  → inspectorDeliveryPackageForJob (ACTIVE only)
  → downloadPublishedDeliveryPackageZip
  → downloadUrlAsFile(publication.zipPublicUrl, publication.fileName)
```

Bez `buildWmPrintDeliveryZipBytes`. Bez dostępu do szablonów WM.

---

## 5. Manifest

- **Zapis (admin):** `buildDeliveryPackageManifestFromZipBytes` po zbudowaniu ZIP w `handlePublishForInspector`
- **Model:** `DeliveryPackageManifestEntry[]` w publikacji KV
- **UI:** `groupDeliveryPackageManifestByFolder` — Odbiory · Pomiary (INDEX-POMIARY)
- **Backward compat:** publikacje P1A bez manifestu → komunikat + nadal możliwe pobranie ZIP

---

## 6. Build

```bash
npm run build
```

---

## 7. Smoke

```bash
npx vite-node scripts/test-inspector-delivery-package-p1b.mjs
npx vite-node scripts/test-delivery-package-publications-p1a.mjs  # regresja
```

Scenariusze: brak publikacji · ACTIVE lookup · metadata · manifest · permissions · REVOKED · merge sync.

---

## 8. Limitations

- Brak **PAKIET NIEAKTUALNY** (P1C)
- Brak revoke w UI
- Brak KPI / dashboard inspektora
- Manifest tylko dla publikacji po P1B (nowe publikacje admina)

---

## 9. Plan P1C

- Porównanie `generationFingerprint` vs bieżący stan
- Status **PAKIET NIEAKTUALNY** dla inspektora i admina
- Revoke publikacji
- KPI pulpitu inspektora

---

## Pliki zmienione

| Plik | Rola |
|------|------|
| `src/lib/delivery-package-publications/types.ts` | `DeliveryPackageManifestEntry`, pole `manifest` |
| `src/lib/delivery-package-publications/manifest.ts` | build + group manifest |
| `src/lib/delivery-package-publications/inspector-access.ts` | permissions + download |
| `src/lib/delivery-package-publications/normalize.ts` | parse manifest |
| `src/lib/delivery-package-publications/publication.ts` | manifest w publish |
| `src/app/InspectorDeliveryPackagePanel.tsx` | UI inspektor |
| `src/app/InspectorPanel.tsx` | sync read-only + panel |
| `src/app/WmPrintView.tsx` | manifest przy publikacji |
| `scripts/test-inspector-delivery-package-p1b.mjs` | smoke P1B |
| `docs/ARCHITECTURE.md` § 12.1.11 | P1B COMPLETE |
