# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-22 · **TP190C-3B RELEASED** · prod **2.62.27** (`df2524f`)

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (`main`)** | **2.62.27** · commit **`df2524f`** |
| **TP190 Parser v3** | **CLOSED** (TP190A→TP190C-3B) |
| **CURRENT_PARSER_VERSION** | **3** |
| **PDF WM Recovery (TP196–TP201C)** | **CLOSED** — TP182: **~142 poz.** (TP201C-B) |
| **TP190C-3C batch write prod** | **OPEN** — tooling gotowy, `--write` nie wykonany |
| **TP200B** | **PLANNED** — kosztorys snapshot fidelity (`rows` cap) |
| **TP190C-2C tie-break** | lokalnie — poza ostatnim commitem |

## Co zrobiono (sesja 2026-06-22)

| Release | Skrót |
|---------|-------|
| **2.62.27** | TP190C-3B batch rebuild tooling (`tp190c-batch-rebuild.ts`) |
| **2.62.26** | TP190C-2E PDF extract parity + observability |
| **2.62.25** | TP190C-1 stale rebuild protection |
| **2.62.24** | TP201C-B PDF WM M4 fidelity |
| **2.62.23** | TP190B dossier stability parser v3 |
| **2.62.20–22** | Payroll cloud merge fidelity |

**Handoff SSOT:** [`docs/SESSION-HANDOFF-TP190-PARSER-V3.md`](docs/SESSION-HANDOFF-TP190-PARSER-V3.md)

## Architektura (skrót)

```text
App.tsx (shell) → AdminViewRouter → *View.tsx
Przetargi: TendersModule → TenderDetailPanel → analyzeTenderWithDossier
Dane: LocalStorage ↔ cloud-sync.ts ↔ Supabase KV (kw-tenders-pipeline)
```

Pełna mapa: [`docs/AGENT-ONBOARDING.md`](docs/AGENT-ONBOARDING.md) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 15.1

## Testy smoke

```bash
npx vite-node scripts/test-tp190c-batch-rebuild.mjs
npx vite-node scripts/test-tp190c-stale-rebuild-protection.mjs
npx vite-node scripts/test-tp190b-dossier-stability.mjs
npx vite-node scripts/test-tender-dossier-parser-version.mjs
npx vite-node scripts/test-tender-dossier-pipeline.mjs
npm run build
```

## Następny krok

1. **TP190C-3C** — `npx vite-node scripts/tp190c-batch-rebuild.mjs --write` (9 stale dossier prod KV) — **tylko na polecenie**
2. **TP200B** — `pickBetterKosztorys` w parse loop + ATH `rows` fidelity
3. **TP190C-2C** — commit discovery tie-break jeśli zaakceptowany
