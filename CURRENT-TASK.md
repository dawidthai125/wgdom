# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-24 · **release 2.62.52** · WM Pomiary UX Upgrade

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja release** | **2.62.52** — WM Druk Pomiary UX Upgrade |
| **Poprzedni prod** | **2.62.51** (`78f11cd`) · WM Schematy V2 |
| **EM-UX-002** | **CLOSED** — samodzielne pomiary (detached RAP) |
| **EM-CATALOG-002** | **CLOSED** — edycja RAP z Katalogu Pomiarów |
| **EM-CATALOG-001** | **CLOSED** — usuwanie RAP + Registry Guard + tombstone sync |
| **WM-SCHEMATY** | **CLOSED** · renderer v5 · 2.62.51 |
| **ZI §4/§5** | **STABLE** |
| **Audit Hub** | MVP-0→1B **CLOSED** · MVP-1C OPEN |

---

## Epic zamknięty: WM Pomiary UX Upgrade (2.62.52)

| Sprint | Status | Skrót |
|--------|--------|-------|
| **EM-UX-002** | **CLOSED** | detached RAP · `linkStatus` · `manualAddress` |
| **EM-CATALOG-002** | **CLOSED** | edycja z katalogu · `catalog-edit` variant |
| **EM-CATALOG-001** | **CLOSED** | delete single/bulk · Registry Guard · `kw-electrical-measurements-deleted-ids` |

### Smoke (wymagane PASS przed release)

```bash
npx vite-node scripts/test-electrical-measurements-independent-rap.mjs
npx vite-node scripts/test-electrical-measurements-catalog-edit.mjs
npx vite-node scripts/test-electrical-measurements-delete-registry-guard.mjs
npm run build
```

### Registry Guard (SSOT)

Usunięcie RAP → wpis `CANCELLED` w registry · numer zużyty na zawsze · tombstone chroni merge chmury.

Przykład: RAP-45, RAP-46, RAP-47 → usuń RAP-46 → następny nowy = **RAP-48**.

---

## Następne (tylko na polecenie)

- WM-SCHEMATY V1.1 · P1 commercial-3f UI
- TP200B · Audit Hub MVP-1C · Notatki P3 Export

## Szybki start agenta

```text
docs/SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md     ← EM-P1R baseline
docs/ARCHITECTURE.md § 12.1.10a                     ← UX Upgrade 2.62.52
docs/PROJECT-HANDOFF-CURRENT.md                     ← baseline prod (po deploy)
```

**Hasło użytkownika:** „kontynuuj WGDOM”
