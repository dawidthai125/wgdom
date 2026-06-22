# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-22 · **PRODUCTION UNBLOCK CLOSED** · prod **2.62.31** (`d79f7c1`)

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (`main`)** | **2.62.31** · commit **`d79f7c1`** |
| **Vercel build** | **PASS** (odblokowano 2026-06-22) |
| **TP202A Analyze/Dossier** | **CLOSED** · na prod |
| **TP190 Parser v3** | **CLOSED** (TP190A→TP190C-3B) |
| **CURRENT_PARSER_VERSION** | **3** |
| **PDF WM Recovery (TP196–TP201C)** | **CLOSED** — TP182: **~150 poz.** (TP201E-B) |
| **TP190C-3C batch write prod** | **OPEN** — tooling gotowy, `--write` nie wykonany |
| **TP200B** | **PLANNED** — kosztorys snapshot fidelity (`rows` cap) |

## Co zrobiono (sesja 2026-06-22)

| Temat | Skrót |
|-------|-------|
| **Production unblock** | Blocker #1 mkdir `dist/` (`8a2f6d8`) + blocker #2 `tender-cost-content-detection.ts` (`d79f7c1`) |
| **2.62.31** | TP202A Analyze/Dossier Consistency (`94d2e72`) — dotarł na prod po unblock |
| **2.62.30** | TP201E-B PDF layout corruption recovery |
| **2.62.27** | TP190C-3B batch rebuild tooling |

**Handoff unblock:** [`docs/SESSION-HANDOFF-PRODUCTION-UNBLOCK-2026-06-22.md`](docs/SESSION-HANDOFF-PRODUCTION-UNBLOCK-2026-06-22.md)  
**Handoff TP190:** [`docs/SESSION-HANDOFF-TP190-PARSER-V3.md`](docs/SESSION-HANDOFF-TP190-PARSER-V3.md)

## Architektura (skrót)

```text
App.tsx (shell) → AdminViewRouter → *View.tsx
Przetargi: TendersModule → TenderDetailPanel → analyzeTenderWithDossier
         tender-cost-discovery → tender-cost-content-detection (P1 scoring XLSX)
Dane: LocalStorage ↔ cloud-sync.ts ↔ Supabase KV (kw-tenders-pipeline)
Build: vite → dist/version.json + dist/sw.js → Vercel (push main)
```

Pełna mapa: [`docs/AGENT-ONBOARDING.md`](docs/AGENT-ONBOARDING.md) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 15.1

## Testy smoke

```bash
npm run build
npx vite-node scripts/test-tender-cost-content-detection.mjs
npx vite-node scripts/test-tp202a-analyze-dossier-consistency.mjs
npx vite-node scripts/test-tp190c-batch-rebuild.mjs
npx vite-node scripts/test-tp190b-dossier-stability.mjs
```

## Następny krok

1. **TP190C-3C** — `npx vite-node scripts/tp190c-batch-rebuild.mjs --write` — **tylko na polecenie**
2. **TP200B** — `pickBetterKosztorys` w parse loop + ATH `rows` fidelity
3. Lokalne WIP (dossier merge, document summary) — **nie commitować** bez osobnego release
