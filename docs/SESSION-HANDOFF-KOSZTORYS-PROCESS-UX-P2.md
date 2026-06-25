# SESSION HANDOFF — Kosztorys Process UX (P2 E12 Timeout / Stale UI)

> **Status:** **CLOSED** · **v2.62.66** · **2026-06-25**  
> **Poprzedni:** P1 · [`SESSION-HANDOFF-KOSZTORYS-PROCESS-UX-P1.md`](SESSION-HANDOFF-KOSZTORYS-PROCESS-UX-P1.md)  
> **Hasło agenta:** „kontynuuj WGDOM”

---

## 1. Zakres P2

**Prezentacja only** — bez zmian parserów, pipeline, Edge, discovery, merge, cloud sync.

| Etap | Zrealizowane |
|------|----------------|
| SSOT health | `deriveKosztorysProcessHealth()` w `tender-kosztorys-process-health.ts` |
| Progi | healthy &lt; 30s · slow 30s · stale 90s · timeout 180s |
| Hook obserwatora | `useKosztorysProcessHealth` (poll 5s) |
| UI Kosztorys V4 | `KosztorysProcessStatusBar` + `TenderKosztorysWorkspace` |
| Retry | przycisk przy stale/timeout → istniejące `retryDossierParse()` |
| `retryNonce` | eksport z `useTenderDossierHeavyLazy` → reset zegara aktywności |

**Backlog OPEN (P3):** pełny progress techniczny z trace w UI · Owner View health (opcjonalnie)

---

## 2. Stany health

| `status` | Próg | Komunikat | Retry |
|----------|------|-----------|-------|
| `healthy` | &lt; 30 s bezczynności | — | nie |
| `slow` | ≥ 30 s | Analiza trwa dłużej niż zwykle… | nie |
| `stale` | ≥ 90 s | Wygląda na zatrzymaną analizę. | tak |
| `timeout` | ≥ 180 s | Analiza przekroczyła oczekiwany czas… | tak |

**Ważne:** timeout to wyłącznie stan prezentacji — parser i pipeline działają dalej.

---

## 3. Architektura

```text
tender-kosztorys-process-health.ts (SSOT)
  ├── isKosztorysProcessHealthMonitored(session)
  ├── buildKosztorysActivityFingerprint()
  ├── tickKosztorysActivityClock()
  ├── snapshotKosztorysActivityFingerprint()
  ├── deriveKosztorysProcessHealth()
  └── applyKosztorysHealthToPhaseView()

useKosztorysProcessHealth.ts
  └── poll 5s → fingerprint/trace/retryNonce → deriveKosztorysProcessHealth

TenderKosztorysWorkspace.tsx
  └── KosztorysProcessStatusBar(phase, health, onRetry)
```

**Fingerprint aktywności** (reset licznika): zmiana trace head · zmiana fazy technicznej · `retryNonce`.

**Źródła danych:** `getDossierTraceLog()` · `retryNonce` · `dossierBuilding` · `dossierSaving` · `autoRunning` · `Date.now()`.

---

## 4. Pliki

| Plik | Rola |
|------|------|
| `src/lib/tender-kosztorys-process-health.ts` | **SSOT P2** — health + zegar aktywności |
| `src/app/hooks/useKosztorysProcessHealth.ts` | Hook obserwatora (bez logiki progów) |
| `src/app/KosztorysProcessStatusBar.tsx` | `data-kosztorys-health` · hint · retry |
| `src/app/TenderKosztorysWorkspace.tsx` | Podłączenie health + phase overlay |
| `src/app/TenderDetailPage.tsx` | `retryNonce` → workspace |
| `src/app/hooks/useTenderDossierHeavyLazy.ts` | Eksport `retryNonce` |
| `scripts/test-tender-kosztorys-process-health.mjs` | 16 asercji P2 |

**Bez zmian:** `tender-kosztorys-process-phase.ts` (P1 SSOT faz) · pipeline · parsery.

---

## 5. Testy

```bash
npx vite-node scripts/test-tender-kosztorys-process-health.mjs   # 16
npx vite-node scripts/test-tender-kosztorys-process-phase.mjs   # 18 regresja
npx vite-node scripts/test-p3-ux-analysis-status.mjs
npm run build
```

Scenariusze P2: healthy · slow · stale · timeout · retry · saving · trace reset · phase change reset.

---

## 6. Zakazy (jak P0/P1)

- **Nie** zmieniać `tender-dossier-pipeline.ts`, parserów, Edge, `buildTenderDossierHeavy`.
- **Nie** umieszczać progów timeoutów w komponentach React.
- **Nie** anulować requestów / przerywać parsera przy timeout.
- **Nie** dodawać endpointów ani zapisu KV.

---

## 7. Release (następny krok)

1. Stage **tylko** pliki P2 (working tree może mieć inne WIP).
2. Bump wersji + `changelog-data.ts`.
3. Commit → push → verify `version.json` na prod.
4. Zamknąć P2 w `CURRENT-TASK.md`.

---

## 8. Szybkie linki

```text
docs/SESSION-HANDOFF-KOSZTORYS-PROCESS-UX-P2.md   ← TEN PLIK
docs/SESSION-HANDOFF-KOSZTORYS-PROCESS-UX-P1.md
docs/ARCHITECTURE.md § 12.1.15b
CURRENT-TASK.md
```
