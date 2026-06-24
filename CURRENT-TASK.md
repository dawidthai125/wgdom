# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-24 · **prod 2.62.55** · AUDIT-HUB-WM-001 CLOSED

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod** | **2.62.55** — WM Schematy Right Edge Clipping Hotfix |
| **Poprzednie release** | 2.62.53–54 hotfixy RAP crash + header spaces |
| **WM Pomiary UX** | **CLOSED** · 2.62.52 (detached RAP · katalog edit/delete) |
| **WM Schematy** | **CLOSED** · renderer v5 · 2.62.51 |
| **ZI §4/§5** | **STABLE** |
| **Audit Hub** | MVP-0→1B **CLOSED** · **AUDIT-HUB-WM-001 CLOSED** (audyt) · **P1 WM integracja OPEN** |

---

## Zamknięte w tej sesji

### AUDIT-HUB-WM-001 — WM Druk → Audit Hub (AUDIT ONLY)

| Pole | Wartość |
|------|---------|
| **Werdykt** | **WM Druk nie jest zintegrowany z Audit Hub** (Pomiary + Schematy) |
| **Częściowo** | Odbiory: `kw-wm-print-history` → źródło `wm_print` |
| **GAP** | RAP CRUD, DOCX/ZIP katalog, schematy CRUD/PDF — brak eventów |
| **P1** | Nowy KV `kw-wm-druk-audit-log` + adapter (szac. **M**, ryzyko LOW–MEDIUM) |

**Dokumentacja:**
- [`docs/SESSION-HANDOFF-AUDIT-HUB-WM-001.md`](docs/SESSION-HANDOFF-AUDIT-HUB-WM-001.md) ← SSOT dla agentów
- [`audit/AUDIT-HUB-WM-001-REPORT.md`](audit/AUDIT-HUB-WM-001-REPORT.md) ← raport skrócony

### Hotfixy WM (prod 2.62.53–55)

| Wersja | Skrót |
|--------|-------|
| **2.62.53** | Detached RAP crash hotfix (`reportNumber` null) |
| **2.62.54** | Schematy — spacje w Tytule/Adresie PDF |
| **2.62.55** | Schematy — ucinanie ostatniego obwodu PDF (`columnRightInset`) |

---

## Epic zamknięty: WM Pomiary UX Upgrade (2.62.52)

| Sprint | Status |
|--------|--------|
| EM-UX-002 detached RAP | **CLOSED** |
| EM-CATALOG-002 edycja z katalogu | **CLOSED** |
| EM-CATALOG-001 delete + Registry Guard | **CLOSED** |

---

## Następne (tylko na polecenie)

- **P1 Audit Hub Integration for WM Druk** — patrz AUDIT-HUB-WM-001 handoff § 6
- WM-SCHEMATY V1.1 · P1 commercial-3f UI
- TP200B · Audit Hub MVP-1C · Notatki P3 Export

## Szybki start agenta

```text
docs/SESSION-HANDOFF-AUDIT-HUB-WM-001.md           ← AUDIT WM → Hub (P1 plan)
docs/SESSION-HANDOFF-AUDIT-HUB.md                  ← Audit Hub SSOT
docs/SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md      ← EM-P1R baseline
docs/PROJECT-HANDOFF-CURRENT.md                    ← baseline prod
```

**Hasło użytkownika:** „kontynuuj WGDOM”
