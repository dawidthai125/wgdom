# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-18 · **repo 2.62.0** · **V4.2 + V4.2A UX polish COMPLETE**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja repo (lokalnie)** | **2.62.0** — Kosztorys PRO Dashboard (V4.2) |
| **Wersja prod (`main`)** | **2.61.5** · commit **`c41d79b`** (ATH visibility hotfix) |
| **PRODUCTION VERIFIED** | prod = 2.61.5 · **2.62.0 NIE wdrożone** (brak push) |
| **P0 ZIP ATH Recovery** | **CLOSED** |
| **V4.2 + V4.2A Kosztorys PRO** | **IMPLEMENT COMPLETE** — UX gate TP113 PASS lokalnie |

## ★★ START HERE (nowy agent)

| Temat | Dokument |
|-------|----------|
| **V4.2 Kosztorys PRO** | `TenderKosztorysWorkspace.tsx` · `tender-kosztorys-pro-dashboard.ts` · ARCHITECTURE § 12.1.15 |
| **P0 ZIP ATH (CLOSED)** | [`docs/SESSION-HANDOFF-P0-ZIP-ATH-RECOVERY.md`](docs/SESSION-HANDOFF-P0-ZIP-ATH-RECOVERY.md) |
| **Baseline prod** | [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md) |
| **Architektura** | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 12.1.15 · § 12.1.14 |

## Ukończone — V4.2 Kosztorys PRO (2.62.0)

| Faza | Skrót |
|------|-------|
| **A** | KOSZTORYS PRO — 8 KPI nad tabelą |
| **B** | TOP 20 największych pozycji kosztowych |
| **C** | Filtry: Wszystkie · Wykończeniowe · Sanitarne · Elektryczne · Dachowe · Drogowe |
| **D** | Karta „Ocena kosztorysu” + rekomendacja |
| **E** | „Pobierz ATH” obok „Pełny podgląd ATH” |

## Smoke / regresja (2.62.0 — PASS lokalnie)

```bash
npm run build                                          # PASS
npx vite-node scripts/test-v41-kosztorys-workspace.mjs # 42 PASS
npx vite-node scripts/test-construction-scope-analysis.mjs  # 20 PASS
npx vite-node scripts/test-construction-business-fit.mjs    # 17 PASS
npx vite-node scripts/test-tender-cost-discovery.mjs        # 17 PASS
npx vite-node scripts/verify-tp113-zip-ath-recovery.mjs       # PASS · catalogQuantities=302
```

## Pliki V4.2 (commit selektywny)

| Plik | Rola |
|------|------|
| `src/lib/tender-kosztorys-pro-dashboard.ts` | **NOWY** — KPI, TOP 20, filtry, ocena |
| `src/app/TenderKosztorysWorkspace.tsx` | UI PRO dashboard |
| `src/lib/tender-ath-quick-access.ts` | `downloadAthSourceFile()` |
| `src/app/changelog-data.ts` | 2.62.0 |
| `CHANGELOG.md` | skrót |
| `scripts/test-v41-kosztorys-workspace.mjs` | T12–T13 |
| `src/app/GuideView.tsx` | FAQ Kosztorys PRO |
| `docs/ARCHITECTURE.md` | § 12.1.15 |

**Nie commitować** w release 2.62.0: `tender-cost-discovery.ts`, `tender-document-resolver.ts`, `tenders-bzp-doc-parse.ts` (zmiany spoza zakresu).

## Następny krok

1. Commit selektywny V4.2 → `git push origin main`
2. VERIFY FAST: `curl -s https://www.wgdom.fun/version.json` → oczekiwane **2.62.0**
3. Manual smoke TP113 na prod (KPI, TOP 20, filtry, Pełny podgląd ATH)
