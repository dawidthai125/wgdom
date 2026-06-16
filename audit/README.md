# audit/ — katalog śledztw i walidacji WGDOM

> **Ostatnia aktualizacja:** 2026-06-15 · **ZI Tauron 2026 PRODUCTION STABLE** (prod **2.59.24**)

---

## START HERE — ZI (prod)

| Dokument | Rola |
|----------|------|
| [`../docs/ZI-2026-HANDOFF.md`](../docs/ZI-2026-HANDOFF.md) | **★★★ SSOT implementacji** — generator, mapping, preservation |
| [`tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md`](tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md) | **★★ Werdykt prod** — ZIP Sępa 83/7, PASS |
| [`POST-ZI-DOCS-CLEANUP-REPORT.md`](POST-ZI-DOCS-CLEANUP-REPORT.md) | Raport ujednolicenia dokumentacji (P0.5A) |
| [`POST-ZI-CLEANUP-AUDIT.md`](POST-ZI-CLEANUP-AUDIT.md) | Plan housekeeping kodu/audit (P0.5 backlog) |

### Canonical vs legacy

| UUID | Status |
|------|--------|
| `2b22da48-46dc-42a0-8236-d42b5b5562dc` | **Canonical** — `ZI.pdf` Tauron 2026 |
| `26f02c78-871c-4d65-aeac-d0ca06bf060c` | **TOMBSTONE** — LiveCycle 2021 |

**Mapping §4 prod:** 99 → JOB_STREET · 111 → JOB_BUILDING · 112 → JOB_APARTMENT

---

## Historyczne RCA LiveCycle (nie SSOT prod)

| Dokument | Rola |
|----------|------|
| [`ZI-FINAL-HANDOFF.md`](ZI-FINAL-HANDOFF.md) | RCA P0.1F→P0.4B — **superseded by ZI 2026** |
| [`archive/legacy-zi-livecycle-2021/`](archive/legacy-zi-livecycle-2021/) | Archiwum szablonu LiveCycle + forensic |

---

## Sesja Tauron 2026 (2026-06-15)

Katalog [`tauron-audit-2026-06-15/`](tauron-audit-2026-06-15/) — library audit, mapping correction, preservation gate, prod hotfix, final validation.

---

## Seria P0 WM Druk (pollution / demo strip)

Pliki `p0-*`, `zi-p0-*`, `zi-smoke-*` — eksperymenty i RCA **LiveCycle** (P0.1F→P0.4B). Traktować jako **archiwum** — nie jako SSOT prod po 2.59.22.

---

## Zasady

1. **Nowy agent ZI** → czytaj `docs/ZI-2026-HANDOFF.md`, nie `ZI-FINAL-HANDOFF.md` jako pierwsze źródło.
2. **Nie kasować** `ZI-FINAL-HANDOFF.md` — most historyczny do Tauron 2026.
3. **Cleanup plików binarnych** — plan w `POST-ZI-CLEANUP-AUDIT.md` § reorganizacja; tylko na polecenie.
4. Skrypty tymczasowe: `scripts/_tmp-p03*.mjs` — diagnostyka sesji; nie prod.

---

## Powiązane docs

- [`../docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`](../docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md)
- [`../docs/RELEASE-REPORT-ZI-2026.md`](../docs/RELEASE-REPORT-ZI-2026.md)
- [`../docs/PROJECT-HANDOFF-CURRENT.md`](../docs/PROJECT-HANDOFF-CURRENT.md)
