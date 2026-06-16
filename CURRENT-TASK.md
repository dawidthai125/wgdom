# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-16 · **EM-P1R-HF001 (2.59.44)**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (`main`)** | **2.59.44** · **PRODUCTION VERIFIED** |
| **Commit prod (EM)** | **`26251ff`** — ADDRESS parity 5× DOCX |
| **Stream WM Druk** | **COMPLETE** — ZIP · DOCX · preservation · sync · P0.5 |
| **ZI Tauron 2026** | **PRODUCTION STABLE** |
| **Pomiary Elektryczne** | **COMPLETE** EM-P0→P1R · szablony Word SSOT · rejestr RAP · katalog · ZIP odbiorowy |

## ★★ START HERE

| Temat | Dokument |
|-------|----------|
| **Baseline prod** | [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md) |
| **Pomiary Elektryczne (EM)** | [`docs/SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md`](docs/SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md) |
| **WM Druk / POST ZI** | [`docs/MASTER-HANDOFF-POST-ZI-2026.md`](docs/MASTER-HANDOFF-POST-ZI-2026.md) |
| **ZI SSOT** | [`docs/ZI-2026-HANDOFF.md`](docs/ZI-2026-HANDOFF.md) |
| **Onboarding agenta** | [`docs/AGENT-ONBOARDING.md`](docs/AGENT-ONBOARDING.md) |
| **Architektura** | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 12.1.8 WM · § 12.1.10 EM |

## Ukończone w sesji EM (2026-06-16)

| Faza | Wersja | Commit | Raport |
|------|--------|--------|--------|
| EM-P1.6C Registry Repair V2 | 2.59.42 | `b79c949` | [`audit/EM-P1.6C-REGISTRY-REPAIR-V2-REPORT.md`](audit/EM-P1.6C-REGISTRY-REPAIR-V2-REPORT.md) |
| EM-P1R Template Rebuild | 2.59.43 | `d6268b1` | [`audit/EM-P1R-TEMPLATE-REBUILD-REPORT.md`](audit/EM-P1R-TEMPLATE-REBUILD-REPORT.md) |
| EM-P1R-HF001 ADDRESS parity | 2.59.44 | `26251ff` | [`audit/EM-P1R-HOTFIX-001-ADDRESS-PARITY-REPORT.md`](audit/EM-P1R-HOTFIX-001-ADDRESS-PARITY-REPORT.md) |

## Smoke regresji EM

```bash
npm run build
npx vite-node scripts/test-electrical-measurements-p1.mjs
npx vite-node scripts/test-em-p1r-visual-smoke.mjs
npx vite-node scripts/test-em-p1r-hotfix-001-address-parity.mjs
npx vite-node scripts/test-electrical-measurements-registry-repair-v2.mjs
```

## Smoke regresji WM Druk (ZI)

```bash
npx vite-node scripts/test-wm-print-zi-2026-smoke.mjs
npx vite-node scripts/test-wm-print-zi-2026-preservation-smoke.mjs
npx vite-node scripts/test-wm-print-zi-zip-post-cleanup.mjs
```

## Następny krok (produkt)

**EM-P1R CLOSED · WM Druk stabilne.**

Przed nową funkcją: **AUDIT → PLAN → IMPLEMENT → BUILD → SMOKE → COMMIT → PUSH → VERIFY → RAPORT**

**Backlog otwarty (ustalić z użytkownikiem):**

- Nowe funkcje Pomiary Elektryczne (poza DOCX SSOT)
- Nowe funkcje Odbiory WM Druk
- Notatki operacyjne P3 Export
- Audit Center / Security Log
- P2-H.7 Edge magic bytes 7z
