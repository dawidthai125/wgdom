# audit/ — katalog śledztw i walidacji WGDOM

> **Ostatnia aktualizacja:** 2026-06-16 · **POST ZI-2026** · prod **2.59.25** · **PRODUCTION VERIFIED**

---

## START HERE — agent AI

| Kolejność | Dokument |
|-----------|----------|
| 1 | [`../docs/AGENT-ONBOARDING.md`](../docs/AGENT-ONBOARDING.md) — mapa systemu |
| 2 | [`../docs/MASTER-HANDOFF-POST-ZI-2026.md`](../docs/MASTER-HANDOFF-POST-ZI-2026.md) — skrót POST ZI |
| 3 | [`../docs/ZI-2026-HANDOFF.md`](../docs/ZI-2026-HANDOFF.md) — SSOT generatora ZI |

---

## ZI Tauron 2026 (prod)

| Dokument | Rola |
|----------|------|
| [`../docs/ZI-2026-HANDOFF.md`](../docs/ZI-2026-HANDOFF.md) | **★★★ SSOT implementacji** |
| [`tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md`](tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md) | Werdykt prod — ZIP Sępa 83/7 |
| [`P0.5B-HOUSEKEEPING-REPORT.md`](P0.5B-HOUSEKEEPING-REPORT.md) | Housekeeping kodu WM Druk (2.59.25) |
| [`POST-ZI-DOCS-CLEANUP-REPORT.md`](POST-ZI-DOCS-CLEANUP-REPORT.md) | Ujednolicenie dokumentacji (P0.5A) |
| [`POST-ZI-CLEANUP-AUDIT.md`](POST-ZI-CLEANUP-AUDIT.md) | Backlog Medium/High (legacy split) |

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

## Reguły

- Większość plików `*.pdf` / `*.zip` w `audit/` to **artefakty lokalne** — nie commitować bez potrzeby.
- Skrypty regresji prod: `scripts/test-wm-print-zi-2026-*.mjs` (patrz `AGENT-ONBOARDING.md` § 6).
- **Nie wracać** do śledztwa LiveCycle bez nowego dowodu biznesowego.
