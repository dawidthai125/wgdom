# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-19 · **prod 2.62.10** · **PDF WM Recovery CLOSED** · **TP200 PLANNED**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (`main`)** | **2.62.10** · commit **`1992340`** |
| **PDF WM Recovery (TP196–198C)** | **CLOSED** — TP182: **123 pozycji** (baseline 86) |
| **P0/P1 Merge Quality + TP190A** | **CLOSED** |
| **Backup pre-TP200** | tag `wgdom-backup-2026-06-19-v2.62.10` |
| **Następny epic** | **TP200A/B** — parserVersion + kosztorys fidelity |

## ★★ START HERE (nowy agent)

| Temat | Dokument |
|-------|----------|
| **Mapa systemu** | [`docs/AGENT-ONBOARDING.md`](docs/AGENT-ONBOARDING.md) |
| **Baseline prod** | [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md) |
| **★ PDF Recovery (CLOSED)** | [`docs/SESSION-HANDOFF-PDF-WM-RECOVERY.md`](docs/SESSION-HANDOFF-PDF-WM-RECOVERY.md) |
| **★ TP200 (PLANNED)** | [`docs/SESSION-HANDOFF-TP200-PLANNED.md`](docs/SESSION-HANDOFF-TP200-PLANNED.md) |
| **P0/P1 merge kosztorysu** | [`docs/SESSION-HANDOFF-P0-P1-KOSZTORYS-MERGE-QUALITY.md`](docs/SESSION-HANDOFF-P0-P1-KOSZTORYS-MERGE-QUALITY.md) |
| **Architektura** | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 12.1.16 |
| **Workflow release** | [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md) |

## Ukończone — seria 2.62.x (Przetargi)

| Wersja | Commit | Skrót |
|--------|--------|-------|
| **2.62.10** | `1992340` | TP196–TP198C PDF WM recovery |
| **2.62.9** | `73093e4` | TP190A quality guard re-analyze |
| **2.62.8** | — | TP192C parallel dossier bytes |
| **2.62.7** | — | TP192B parallel PZ probe |
| **2.62.6** | — | TP192A host detection shortcut |
| **2.62.5** | — | TP194A filename encoding PZ |
| **2.62.4** | — | TP193B loading + metadata safety |
| **2.62.3** | — | TP193A lazy dossier loop |
| **2.62.2** | — | TP191 Open Nexus / platformazakupowa |
| **2.62.1** | `50d7501`+`4574182` | P0/P1 merge quality · TP182 parser infra |

## Testy smoke (Przetargi)

```bash
npx vite-node scripts/test-pdf-przedmiar-heuristic.mjs
npx vite-node scripts/test-tp182-pdf-wm-recovery.mjs
npx vite-node scripts/test-tender-dossier-merge-quality.mjs
npm run build
```

## Następny krok (na polecenie)

- **TP200A** — `parserVersion` + invalidacja/rescan legacy dossier
- **TP200B** — `pickBetterKosztorys` w parse loop + ATH rows fidelity
