# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-30 · **prod 2.63.8** · **`f482016`**

---

## P0 — Tender Detail Tab SSOT · **CLOSED**

| Pole | Wartość |
|------|---------|
| **Status** | **CLOSED** |
| **Prod** | **2.63.8** · commit **`f482016`** |
| **Problem** | URL taba się zmieniał, UI zostawał na starym (`tab` prop z modułu) |
| **Fix** | SSOT: `parseTenderDetailPath` + optimistic `pendingTab`; sync `activeTab=list` przy `v4Detail` |
| **SSOT** | [`docs/SESSION-HANDOFF-P0-TENDER-DETAIL-SSOT-TAB.md`](docs/SESSION-HANDOFF-P0-TENDER-DETAIL-SSOT-TAB.md) · ARCHITECTURE § 12.1.27 |
| **Test** | `test-p0-tender-detail-ssot-tab.mjs` (12 PASS) · E2E tab SSOT PASS |

**Backlog (poza P0):** E2E desktop Command Layer 299 px > 280 px — osobny ticket

---

## NG-03 — Tender Workspace UX · **2.63.7 CLOSED** (seria)

| Pole | Wartość |
|------|---------|
| **Ostatni release serii** | **2.63.7** (`00d14d8`) · NG-03.7 polish |
| **Design freeze** | [`docs/NG-03-DESIGN-FREEZE.md`](docs/NG-03-DESIGN-FREEZE.md) |

---

## NG-02 — Tender Automation Pipeline · **EPIC CLOSED**

| Pole | Wartość |
|------|---------|
| **Status** | **COMPLETED · EPIC CLOSED** |
| **Prod baseline serii** | **2.62.98** · commit **`aeecdc0`** |
| **SSOT** | `useTenderPipelineRuntime` · ARCHITECTURE § 12.1.23–12.1.26 |
| **Handoff** | [`docs/SESSION-HANDOFF-NG-02-EPIC-CLOSE.md`](docs/SESSION-HANDOFF-NG-02-EPIC-CLOSE.md) |

**Outstanding production bugs:** **NONE** (tab SSOT naprawiony w 2.63.8)

---

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod** | **2.63.8** (`f482016`) |
| **NG-02 Pipeline** | **EPIC CLOSED** |
| **Mobile Recovery** | **EPIC CLOSED** |
| **P1 Audit Hub WM** | **CLOSED** |
| **P0 Cloud Sync** | **CLOSED** |
| **P0 Payroll Cloud Recovery** | **EPIC OPEN** (Etap 2 not started) |

---

## Backlog (na polecenie)

| Temat | Status |
|-------|--------|
| **P0 Payroll Etap 2** | **NOT STARTED** |
| **Command Layer height** | E2E 299 px > 280 px — OPEN |
| **Work Catalog P2** — UI Biblioteka Robót | **OPEN** |
| **P0 sync refactor** — delta-sync / focus throttle | **OPEN** |
| **NG-02 P3** — bootstrap retryNonce / inflight | **OPEN** — enhancement only |
