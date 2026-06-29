# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-29 · **prod 2.62.82** (deploy po push) · **TP200B CLOSED**

---

## TP200B — Kosztorys fidelity · **CLOSED**

| Pole | Wartość |
|------|---------|
| **Status** | **CLOSED** · parser **v4** · `SNAPSHOT_PRICED_ROWS_CAP=500` |
| **Wersja** | **2.62.82** |
| **Zakres** | parse loop discovery tie-break · lazy rescan v3 truncated snapshots |
| **SSOT** | [`docs/SESSION-HANDOFF-TP200-PLANNED.md`](docs/SESSION-HANDOFF-TP200-PLANNED.md) · ARCHITECTURE §12.1.18 |
| **Testy** | `test-tp200b-snapshot-fidelity.mjs` · `test-tender-dossier-parser-version.mjs` |

**Następny epic Tender:** smartpzp / PDF pricing bridge / **PRICE-BRIDGE** (osobno).

---

## P0 — Cloud Sync Incident · **CLOSED**

| Pole | Wartość |
|------|---------|
| **Status** | **CLOSED** · **RESOLVED** |
| **Objaw (historyczny)** | `Failed to fetch` przy sync / „Zapisz tydzień” |
| **RCA** | `exceed_egress_quota` — projekt Supabase restricted (HTTP 402) |
| **Rozwiązanie** | **Supabase Pro** włączony — ops only, bez zmian kodu |
| **Weryfikacja prod** | **PASS** 2026-06-29 — health/batch-get/batch-set 200 · Zapisz tydzień sync OK |
| **SSOT** | [`docs/SESSION-HANDOFF-P0-CLOUD-SYNC-EGRESS-AUDIT-2026-06-29.md`](docs/SESSION-HANDOFF-P0-CLOUD-SYNC-EGRESS-AUDIT-2026-06-29.md) · [`docs/INCIDENTS-2026-06.md`](docs/INCIDENTS-2026-06.md) §0 |
| **Backlog (nie blokujący)** | Delta-sync / focus throttle — **OPEN** · tylko na polecenie |

---

## Biblioteka Robót v3.0 — P1 FOUNDATION **CLOSED**

| Pole | Wartość |
|------|---------|
| **Status** | **P1 COMPLETE** · **FOUNDATION READY** · **P2 nie rozpoczęte** |
| **Wersja** | **2.62.80** · commit **`fe540b0`** · **PRODUCTION VERIFIED** |
| **Zakres** | `src/lib/work-catalog/` P1.1–P1.12 · cloud KV · golden · **bez UI** |
| **FREEZE** | [`docs/work-catalog/FOUNDATION-FREEZE-v1.0.md`](docs/work-catalog/FOUNDATION-FREEZE-v1.0.md) |
| **Raport** | [`audit/P1-FOUNDATION-RELEASE-REPORT.md`](audit/P1-FOUNDATION-RELEASE-REPORT.md) |
| **Testy** | 2452+ PASS · golden 1419 |

**Następny krok:** decyzja właściciela → **P2** (UI + CloudLoader wire + cutover).

---

## Mobile Recovery EPIC — **CLOSED** (v2.62.78–2.62.79)

| Pole | Wartość |
|------|---------|
| **Status** | **COMPLETED** · **EPIC CLOSED** |
| **Prod** | **2.62.79** · commit **`4397eac`** |
| **Outstanding production bugs** | **NONE** |

---

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod** | **2.62.81** (`6364937`) |
| **Poprzedni prod** | 2.62.80 (`fe540b0`) |
| **Work Catalog P1** | **CLOSED** |
| **Mobile Recovery EPIC** | **CLOSED** |
| **P1 Audit Hub WM** | **CLOSED** |
| **P0 Cloud Sync Incident** | **CLOSED** |
| **P0 Payroll Cloud Recovery** | **EPIC OPEN** (Etap 2 not started) |

---

## Backlog (na polecenie)

| Temat | Status |
|-------|--------|
| **P0 sync refactor** — delta-sync / focus throttle | **OPEN** — architektura długoterminowa, nie blokada prod |
| **Work Catalog P2** — UI Biblioteka Robót | **OPEN** — czeka na decyzję |
| Mobile Certification PASS 1 | **nie rozpoczęty** |
| P0 Payroll Etap 2 | **NOT STARTED** |
