# SESSION HANDOFF — TP200

> **Status:** **TP200A CLOSED** (2.62.11) · **TP190B/C v3 CLOSED** (2.62.23–2.62.27) · **TP200B PLANNED**  
> **Baseline prod:** **v2.62.27** · **`df2524f`**  
> **Powiązane:** [`SESSION-HANDOFF-TP190-PARSER-V3.md`](SESSION-HANDOFF-TP190-PARSER-V3.md) · audyt **TP199**

---

## 1. Problem biznesowy

Parser PDF odzyskuje pozycje (TP182: ~142 po TP201C-B), ale użytkownik nadal traci wartość przez:

1. ~~**Legacy cache dossier**~~ — **TP200A + TP190B/C CLOSED** (`CURRENT_PARSER_VERSION=3`, lazy rescan, batch tooling)
2. **ATH snapshot fidelity** — `rowCount=302`, ale `rows.slice(0,40)` w `athPreviewToSnapshot`; wycena `ath_priced` liczy z max 40 wierszy
3. **Parse loop vs merge SSOT** — `shouldReplaceBestKosztorys` porównuje `rows.length`, nie `effectiveRowCount` / `pickBetterKosztorys`

---

## 2. Podział

| ID | Cel | Kluczowe pliki | Status |
|----|-----|----------------|--------|
| **TP200A** | `parserVersion` + auto-invalidacja / rescan starych dossier | `tender-dossier-parser-version.ts`, `tender-dossier-pipeline.ts` | **CLOSED 2.62.11** |
| **TP190B/C** | Bump v3, anti-downgrade, stale rebuild, batch tooling | `tender-dossier-merge.ts`, `tp190c-batch-rebuild.ts` | **CLOSED 2.62.27** |
| **TP200B** | Kosztorys fidelity: `pickBetterKosztorys` w parse loop; rozszerzenie `rows`/catalog | `tender-document-resolver.ts`, `tenders-bzp-brief.ts` | **PLANNED** |

---

## 3. Priorytety po TP200 (P1+)

| Priorytet | Temat |
|-----------|--------|
| **P0** | **TP190C-3C** — batch `--write` 9 stale dossier prod KV |
| P1 | **TP200B** — ATH rows fidelity + parse loop pickBetter |
| P1 | smartpzp.pl adapter (discover = stub `[]`) |
| P1 | PDF pricing bridge — `estimatePln` z catalog quantities |
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

**TP200A + TP190: CLOSED.** **Następny epic techniczny: TP200B.** **Następny krok operacyjny: TP190C-3C batch write prod.**
