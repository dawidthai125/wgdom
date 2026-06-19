# SESSION HANDOFF — TP200

> **Status:** **TP200A CLOSED (lokalnie 2.62.11)** · **TP200B PLANNED**  
> **Baseline prod:** **v2.62.10** · **`1992340`**  
> **Backup:** tag `wgdom-backup-2026-06-19-v2.62.10` · lokalnie `backups/WGDOM-BACKUP-2026-06-19/`  
> **Audyt źródłowy:** TP199 POST-PDF RECOVERY AUDIT

---

## 1. Problem biznesowy

Parser PDF odzyskuje pozycje (TP182: 123), ale użytkownik nadal traci wartość przez:

1. **Legacy cache dossier** — stare snapshoty KV/LS bez `parserVersion` (widok sprzed TP198 mimo prod 2.62.10)
2. **ATH snapshot fidelity** — `rowCount=302`, ale `rows.slice(0,40)` w `athPreviewToSnapshot`; wycena `ath_priced` liczy z max 40 wierszy
3. **Parse loop vs merge SSOT** — `shouldReplaceBestKosztorys` porównuje `rows.length`, nie `effectiveRowCount` / `pickBetterKosztorys`

---

## 2. Planowany podział

| ID | Cel | Kluczowe pliki | Status |
|----|-----|----------------|--------|
| **TP200A** | `parserVersion` + auto-invalidacja / rescan starych dossier | `tender-dossier-parser-version.ts`, `tender-dossier-pipeline.ts`, `tender-dossier-merge.ts` | **CLOSED 2.62.11** |
| **TP200B** | Kosztorys fidelity: `pickBetterKosztorys` w parse loop; rozszerzenie `rows`/catalog | `tender-document-resolver.ts`, `tenders-bzp-brief.ts` | PLANNED |

---

## 3. Priorytety po TP200 (P1+)

| Priorytet | Temat |
|-----------|--------|
| P1 | `smartpzp.pl` adapter (discover = stub `[]`) |
| P1 | PDF pricing bridge — `estimatePln` z catalog quantities |
| P2 | P2-H.7 Edge 7z magic bytes |
| P3 | PDF OCR dla skanów (`uxCase 3`) |

---

## 4. Zamknięte — nie wracać

- **Command Center** — usunięty v2.51.0, archiwum `docs/archive/command-center/`
- **TP196–TP198C** — CLOSED w 2.62.10, nie re-open bez nowego audytu

---

## 5. Smoke przed/po TP200

```bash
npx vite-node scripts/test-tender-dossier-parser-version.mjs   # TP200A
npx vite-node scripts/test-tender-dossier-merge-quality.mjs   # TP113/TP190A
npx vite-node scripts/test-tp182-pdf-wm-recovery.mjs           # >=120 rows
npx vite-node scripts/test-tender-dossier-pipeline.mjs
npm run build
```

---

## 6. Werdykt planu

**TP200A GO** — wdrożone lokalnie (2.62.11). **TP200B** — następny krok.
