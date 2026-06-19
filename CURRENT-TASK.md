# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-19 · **TP200A IMPLEMENTED (lokalnie 2.62.11)** · prod nadal **2.62.10**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja lokalna** | **2.62.11** · TP200A parserVersion + stale rescan |
| **Wersja prod (`main`)** | **2.62.10** · commit **`1992340`** |
| **PDF WM Recovery (TP196–198C)** | **CLOSED** — TP182: **123 pozycji** |
| **TP200A** | **IMPLEMENTED** (nie wdrożone na prod) |
| **TP200B** | **OPEN** — kosztorys snapshot fidelity |
| **Backup pre-TP200** | tag `wgdom-backup-2026-06-19-v2.62.10` |

## TP200A — co zrobiono

| Element | Plik |
|---------|------|
| `DOSSIER_PARSER_VERSION` + stale detection | `src/lib/tender-dossier-parser-version.ts` |
| Lazy rescan + stamp on build/analyze | `src/lib/tender-dossier-pipeline.ts` |
| Merge preferuje fresh parserVersion | `src/lib/tender-dossier-merge.ts` |
| Schema `tenderDossier.parserVersion` | `src/lib/tenders-bzp-brief.ts` |
| Lazy dossier deps | `src/app/TenderDetailPanel.tsx` |
| Testy TP200A-1…8 | `scripts/test-tender-dossier-parser-version.mjs` |

## Testy smoke

```bash
npx vite-node scripts/test-tender-dossier-parser-version.mjs
npx vite-node scripts/test-tender-dossier-merge-quality.mjs
npx vite-node scripts/test-tp182-pdf-wm-recovery.mjs
npm run build
```

## Następny krok

- **Deploy TP200A** — commit + push → verify `version.json` 2.62.11
- **TP200B** — `pickBetterKosztorys` w parse loop + ATH `rows` fidelity (`athPreviewToSnapshot`)
