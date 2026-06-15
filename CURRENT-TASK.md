# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-15 · **SESSION CLOSEOUT — ZI Tauron 2026 RELEASE GO (2.59.22)**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (`main`)** | **2.59.22** (po push tej sesji) |
| **Stream WM Druk P0 pollution** | **CLOSED** (2.59.15–18) |
| **ZI Tauron 2026** | **RELEASE GO** — mapping 99/111/112 + preservation gate |
| **ZI LiveCycle 2021** | **CLOSED** — nie wracać do XFA/ciphertext/AP |
| **Śledztwo ZI (RCA P0.1F→P0.4B)** | **CLOSED** — superseded by ZI 2026 |

## ★★ START HERE — ZI (SSOT prod)

**Implementacja:** [`docs/ZI-2026-HANDOFF.md`](docs/ZI-2026-HANDOFF.md)

**Mapping §4 (Tauron 2026):**

| Zmienna | Pole PDF |
|---------|----------|
| JOB_STREET | Pole tekstowe 99 |
| JOB_BUILDING | Pole tekstowe 111 |
| JOB_APARTMENT | Pole tekstowe 112 |

**Preservation:** aktywny `ZI.pdf` z WM Druk → pdf.js graft + patch §4.

**Smoke:**

```bash
npx vite-node scripts/test-wm-print-zi-2026-smoke.mjs
npx vite-node scripts/test-wm-print-zi-2026-preservation-smoke.mjs
npm run build
```

**Nie wracać bez nowego dowodu do:** XFA · LiveCycle · ciphertext · AP RE · flatten · overlay · TextField2[*] · widgety 429/428/427

**Historyczne RCA:** [`audit/ZI-FINAL-HANDOFF.md`](audit/ZI-FINAL-HANDOFF.md)
