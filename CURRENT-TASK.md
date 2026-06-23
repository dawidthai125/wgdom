# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-23 · **Audit Hub MVP-0 + P0 hotfix RELEASED** · prod **2.62.37**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (`main`)** | **2.62.37** · commit **`a0d7093`** |
| **Poprzedni prod** | **2.62.36** (`b2eed93`) · Audit Hub MVP-0B |
| **Audit Hub MVP-0** | **CLOSED** (0A lib · 0B UI · P0 hotfix 2.62.37) |
| **TP190 Parser v3** | **CLOSED** |
| **PDF WM Recovery** | **CLOSED** |
| **TP200B** | **PLANNED** |

## Co zrobiono (sesja 2026-06-23 — Audit Hub)

| Temat | Skrót |
|-------|-------|
| **2.62.36** | Audit Hub MVP-0B — widok `audit`, 5 źródeł, filtry, KPI, deep linki |
| **2.62.37** | P0 hotfix — crash `localeCompare` (legacy `actor`/`at` undefined) |
| **lib** | `src/lib/audit-hub/*` — adapters, filters, acl, deeplink, view-model |
| **Fix źródła** | `JobsView` — `photo_upload` zapisuje `createdByName` w activityLog |
| **Dokumentacja** | [`docs/SESSION-HANDOFF-AUDIT-HUB.md`](docs/SESSION-HANDOFF-AUDIT-HUB.md) · ARCHITECTURE § 15.2 |
| **Test** | adapters 47 + view-model 32 PASS |

## Następne (tylko na polecenie)

- Audit Hub **MVP-1** — globalny security log (`kw-security-audit-log`)
- Audit Hub MVP-0C — eksport feedu
- TP200B kosztorys fidelity
- Backlog P3 notatki export

## Szybki start agenta (Audit Hub)

```text
docs/SESSION-HANDOFF-AUDIT-HUB.md  ← SSOT modułu
docs/ARCHITECTURE.md § 15.2
src/lib/audit-hub/adapters.ts    ← 5 źródeł + buildAuditFeed
src/app/AuditHubView.tsx         ← UI
```
