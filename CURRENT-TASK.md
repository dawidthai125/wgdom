# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-18 · **prod 2.61.4** · **P0 ZIP ATH Recovery CLOSED**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (`main`)** | **2.61.4** · commit **`653abe0`** |
| **PRODUCTION VERIFIED** | `version.json` = 2.61.4 · **TAK** (2026-06-18) |
| **Edge deploy** | **PASS** — `tenders-bzp-zip-catalog` · `zip-entry-bytes` |
| **P0 ZIP ATH Recovery** | **CLOSED** — TP113 validated |
| **Poprzedni epic** | 2.61.3 V4.1.2 Kosztorys Source Recovery (`8b05afb`) |

## ★★ START HERE (nowy agent)

| Temat | Dokument |
|-------|----------|
| **★ P0 ZIP ATH (CLOSED)** | [`docs/SESSION-HANDOFF-P0-ZIP-ATH-RECOVERY.md`](docs/SESSION-HANDOFF-P0-ZIP-ATH-RECOVERY.md) |
| **Baseline prod** | [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md) |
| **P2-H dokumenty / ZIP** | [`docs/SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md`](docs/SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md) |
| **V4 Kosztorys** | CHANGELOG 2.61.2–2.61.3 · `test-v41-kosztorys-workspace.mjs` |
| **Architektura** | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 12.1.7 · § 12.1.14 |

## Ukończone — P0 ZIP ATH Recovery (2.61.4)

| Element | Skrót |
|---------|-------|
| **FIX A** | `isFormalOfferCostFilename()` — formularz oferty nie wygrywa kosztorysu |
| **FIX B** | Off-platform (ezamawiajacy) przed BZP readmodels w `loadDocBytes` |
| **FIX C** | Edge zip-catalog + zip-entry-bytes · ZIP do **128 MB** |
| **Walidacja** | TP113 · ATH `SĘPA-SZARZYŃSKIEGO 65a_P_Scalony…` · 40 rows · 250 catalogQuantities |

## Smoke / regresja

```bash
npm run build
npx vite-node scripts/test-tender-cost-discovery.mjs
npx vite-node scripts/test-tender-dossier-pipeline.mjs
npx vite-node scripts/test-tender-zip-catalog-tp113.mjs
npx vite-node scripts/verify-tp113-zip-ath-recovery.mjs
npx vite-node scripts/test-v41-kosztorys-workspace.mjs
```

## Manual smoke (prod)

1. Przetargi → TP113 (Sępa Szarzyńskiego 65A) → **Analizuj** (ponowny skan jeśli stary dossier)
2. Zakładka **Kosztorys** — źródło **ATH** z `DOKUMENTACJA PROJEKTOWA.zip`, **nie** Formularz oferty
3. Pozycje robót budowlanych, nie KRS/Wykonawca/CEIDG

## Następny krok (backlog — tylko na polecenie)

| Priorytet | Temat |
|-----------|-------|
| OPEN | **P2-H.7** — Edge magic bytes 7Z |
| OPEN | **V3.1 Sprint 2** — landing DECYZJE · Zasoby · Quick Estimate |
| OPEN | **P3 Export** — Notatki operacyjne |
| OPS | Masowy rescan dossier WM ze starym snapshotem formularza |

## Kluczowe pliki P0

| Co | Plik |
|----|------|
| Discovery | `src/lib/tender-cost-discovery.ts` |
| Resolver / ZIP | `src/lib/tender-document-resolver.ts` |
| API klient | `src/lib/tenders-bzp.ts` |
| Edge | `supabase/functions/make-server-0afb8820/index.tsx` |
