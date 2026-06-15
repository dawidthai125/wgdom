# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-15 · **P0.3A IMPLEMENT — WM Druk ZI §3 mapping**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja (repo lokalnie)** | **2.59.20** · P0.3A commit pending push |
| **Wersja prod (`main`)** | **2.59.19** · commit **`1a8c892`** (do podbicia po push) |
| **Stream WM Druk P0** | **COMPLETE** (P0.3A = właściwy fix §3) |
| **ZI-PDF-001** | **FIX P0.3A** — §3 TextField2[10/9/8] |
| **RELEASE GO** | po push + verify |

## P0.3A — ZI §3 adres obiektu

| Mapowanie | Pole §3 | pdflib index |
|-----------|---------|--------------|
| JOB_STREET | TextField2[10] | 24 |
| JOB_BUILDING | TextField2[9] | 23 |
| JOB_APARTMENT | TextField2[8] | 22 |

**Smoke:** Sępa Szarzyńskiego / 83 / 7 w §3 „OKREŚLENIE OBIEKTU…”, brak ULICA/BUD/LOK/{{JOB_*}}.

```bash
npx vite-node scripts/test-wm-print-p0-3a-zi-section3-mapping.mjs
npx vite-node scripts/test-wm-print-p0-2a-zi-demo-strip.mjs
npm run build
```

**★ Handoff:** [`docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`](docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md)

## WZNOWIENIE

```text
1. curl -s https://www.wgdom.fun/version.json  → 2.59.20 po deploy
2. Edge: ZIP odbior WM Sępa 83/7 — wizualna weryfikacja §3
```
