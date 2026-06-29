# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-29 · **prod 2.62.80** · **P0 Cloud Sync egress AUDIT CLOSED**

---

## P0 — Cloud Sync / Supabase egress · **AUDIT CLOSED** · **FIX OPEN**

| Pole | Wartość |
|------|---------|
| **Objaw** | `Failed to fetch` przy sync / „Zapisz tydzień” |
| **RCA** | `exceed_egress_quota` — projekt Supabase restricted (402) |
| **SSOT** | [`docs/SESSION-HANDOFF-P0-CLOUD-SYNC-EGRESS-AUDIT-2026-06-29.md`](docs/SESSION-HANDOFF-P0-CLOUD-SYNC-EGRESS-AUDIT-2026-06-29.md) |
| **Ops** | Billing Supabase — **wymagane przed jakimkolwiek fixem kodu** |
| **Kod** | Delta-sync / throttle — **tylko na polecenie** |

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
| **Wersja prod** | **2.62.80** (po release housekeeping) |
| **Poprzedni prod** | 2.62.79 (`4397eac`) |
| **Work Catalog P1** | **CLOSED** |
| **Mobile Recovery EPIC** | **CLOSED** |
| **P1 Audit Hub WM** | **CLOSED** |
| **P0 Payroll Cloud Recovery** | **EPIC OPEN** (Etap 2 not started) |
| **P0 Cloud Sync egress** | **AUDIT CLOSED** · billing Supabase **OPEN** · refactor sync **OPEN** |

---

## Backlog (na polecenie)

| Temat | Status |
|-------|--------|
| **P0 Supabase billing** — odblokować `exceed_egress_quota` | **OPEN** — właściciel |
| **P0 sync refactor** — delta-sync / focus throttle | **OPEN** — po billing + brief |
| **Work Catalog P2** — UI Biblioteka Robót | **OPEN** — czeka na decyzję |
| Mobile Certification PASS 1 | **nie rozpoczęty** |
| P0 Payroll Etap 2 | **NOT STARTED** |
