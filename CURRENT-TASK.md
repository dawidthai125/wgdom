# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-19 · **prod 2.62.1** · **P0/P1 Kosztorys Merge Quality CLOSED**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (`main`)** | **2.62.1** · commity **`50d7501`** (P1 BZP) · **`4574182`** (P0 cloud) |
| **P0/P1 Merge Quality** | **CLOSED** — TP113 / TP182 |
| **V4.2 Kosztorys PRO** | **COMPLETE** (2.62.0) |
| **P0 ZIP ATH Recovery** | **CLOSED** (2.61.4) |

## ★★ START HERE (nowy agent)

| Temat | Dokument |
|-------|----------|
| **Mapa systemu** | [`docs/AGENT-ONBOARDING.md`](docs/AGENT-ONBOARDING.md) |
| **Baseline prod** | [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md) |
| **★ P0/P1 merge kosztorysu** | [`docs/SESSION-HANDOFF-P0-P1-KOSZTORYS-MERGE-QUALITY.md`](docs/SESSION-HANDOFF-P0-P1-KOSZTORYS-MERGE-QUALITY.md) |
| **Architektura** | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 12.1.16 |
| **Workflow release** | [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md) |

## Ukończone — P0/P1 Kosztorys Merge Quality

| Etap | Commit | Skrót |
|------|--------|-------|
| **P0** | `4574182` | `mergePipelineItem` → `mergeTenderDossierByQuality` (LS ↔ cloud) |
| **P1** | `50d7501` | `mergeTenderPipeline` → quality merge (Odśwież BZP) |

**Kluczowe pliki:** `tender-dossier-merge.ts` · `tenders-sync.ts` · `tenders-bzp.ts`

**Testy:**
```bash
npx vite-node scripts/test-tender-dossier-merge-quality.mjs   # 18 PASS
npx vite-node scripts/test-tender-bzp-merge-quality.mjs       # 12 PASS
```

## Następny krok (backlog — tylko na polecenie)

- Quality guard w `analyzeTenderWithDossier` (downgrade ATH→formularz przy analizie)
- CHANGELOG UI bump dla P0/P1 (opcjonalny patch release)
