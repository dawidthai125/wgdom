# SESSION HANDOFF — TP200

> **Status:** **TP200 EPIC CLOSED** — TP200A (2.62.11) · TP190B/C (2.62.27) · **TP200B (2.62.82)**  
> **Baseline prod:** **v2.62.82** · **`CURRENT_PARSER_VERSION = 4`**  
> **Powiązane:** [`SESSION-HANDOFF-TP190-PARSER-V3.md`](SESSION-HANDOFF-TP190-PARSER-V3.md) · audyt **TP199**

---

## 1. Problem biznesowy (rozwiązany)

Parser PDF odzyskuje pozycje (TP182: ~142 po TP201C-B). TP200B domknął utratę wartości przez:

1. ~~**Legacy cache dossier**~~ — **TP200A + TP190B/C CLOSED** (`parserVersion`, lazy rescan, batch tooling)
2. ~~**ATH snapshot fidelity**~~ — **TP200B CLOSED** — `SNAPSHOT_PRICED_ROWS_CAP=500`; `rowCount` = pełny parser output
3. ~~**Parse loop vs merge SSOT**~~ — **TP200B CLOSED** — `shouldReplaceBestKosztorys` + `pickBetterKosztorys` + `discoveryWinnerSource`

---

## 2. Podział

| ID | Cel | Kluczowe pliki | Status |
|----|-----|----------------|--------|
| **TP200A** | `parserVersion` + auto-invalidacja / rescan starych dossier | `tender-dossier-parser-version.ts`, `tender-dossier-pipeline.ts` | **CLOSED 2.62.11** |
| **TP190B/C** | Bump v3, anti-downgrade, stale rebuild, batch tooling | `tender-dossier-merge.ts`, `tp190c-batch-rebuild.ts` | **CLOSED 2.62.27** |
| **TP200B** | Kosztorys fidelity + parser v4 + parse loop discovery tie-break | `tenders-bzp-brief.ts`, `tender-document-resolver.ts`, `tender-dossier-parser-version.ts` | **CLOSED 2.62.82** |

---

## 3. Priorytety po TP200 (P1+)

| Priorytet | Temat |
|-----------|--------|
| P1 | smartpzp.pl adapter (discover = stub `[]`) |
| P1 | PDF pricing bridge — `estimatePln` z catalog quantities |
| P1 | **PRICE-BRIDGE** — Tender read via `resolveCatalogForEngine` (osobny epic) |
| P2 | P2-H.7 Edge 7z magic bytes |
| P3 | PDF OCR dla skanów (`uxCase 3`) |

---

## 4. Zamknięte — nie wracać

- **Command Center** — usunięty v2.51.0, archiwum `docs/archive/command-center/`
- **TP196–TP201C** — CLOSED, nie re-open bez nowego audytu

---

## 5. Smoke przed/po TP200B

```bash
npx vite-node scripts/test-tender-dossier-parser-version.mjs   # TP200A
npx vite-node scripts/test-tp190c-batch-rebuild.mjs            # TP190C-3B
npx vite-node scripts/test-tender-dossier-merge-quality.mjs   # TP113/TP190A
npx vite-node scripts/test-tp182-pdf-wm-recovery.mjs           # >=120 rows
npx vite-node scripts/test-tender-dossier-pipeline.mjs
npm run build
```

---

## 6. Werdykt

**TP200 EPIC CLOSED** (TP200A + TP190 stream + **TP200B 2.62.82**). Następny epic Tender: smartpzp / PDF pricing bridge / PRICE-BRIDGE.
