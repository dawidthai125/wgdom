# W&G DOM — rejestr incydentów (SSOT)

> **Produkcja:** https://www.wgdom.fun · **Supabase KV:** `bdpygdvfgbggermvqtys`  
> **Archiwum miesięczne:** [`INCIDENTS-2026-06.md`](INCIDENTS-2026-06.md)

---

## P0 — Payroll Cross-Device Sync (2026-07-10) · **CLOSED**

| Pole | Wartość |
|------|---------|
| **Status** | **CLOSED** · **Production Verified** (2026-07-10) |
| **Objaw** | Edycja godzin/stawek/premii na telefonie nie widoczna na drugim komputerze (to samo konto); ponowny wpis na drugim urządzeniu nie synchronizował się z powrotem |
| **Root cause** | **SYNC-ARCH-01 S1-1** (`7ad4e06`, v2.63.28) usunął Payroll z RS Push; **S2 Domain Push** dla mutacji pól `kw-week-employees` nie został ukończony — edycje zapisywały się tylko do `localStorage` |
| **Resolution** | **SYNC-ARCH-01 S2** — `schedulePayrollDomainPush` → `persistPayrollRoster` → `pwrPush(skipPayrollGuard)` → `pushWeekEmployeesToCloud(replaceWeekEmployeesKeys)` dla wszystkich live mutacji rosteru |
| **Fix commit** | **`e819124`** |
| **Prod UI** | **v2.63.84** @ `e819124` |
| **Production verification** | **2026-07-10** |
| **Smoke** | **PASS** (S1 godziny · S2 stawka · S3 premia/potrącenie) |
| **Cross-device** | **PASS** (fresh context pull = cloud) |
| **Integrity** | **PASS** (brak duplikacji · brak utraty rosteru · tombstones stabilne) |
| **Observation window** | **24h** (do 2026-07-11) |
| **S4 dodanie pracownika** | **BLOCKED** w smoke prod — wszyscy aktywni pracownicy już w rosterze; ścieżka `addFromDirectory` nie była regresją S2 |
| **SSOT design** | [`architecture/SYNC-ARCH-01-DOMAIN-SYNC-DESIGN-FREEZE.md`](architecture/SYNC-ARCH-01-DOMAIN-SYNC-DESIGN-FREEZE.md) |
| **Test regresji** | `scripts/test-sync-arch-01-s2-domain-push-cross-device.mjs` (18/18) |

### Lessons learned

- Każda mutacja Payroll musi kończyć się **Domain Push** (`kw-week-employees`).
- **Contract Test cross-device** jest obowiązkowy przed zamknięciem incydentu sync.
- **Nie przywracać** Payroll do RS Push — domain push jest ścieżką docelową (SYNC-ARCH-01).

### Timeline

```text
2026-07-04  S1-1 (7ad4e06) — Payroll wyłączony z RS push
2026-07-10  S2 (e819124)   — Domain push dla mutacji pól · deploy prod
2026-07-10  Production smoke PASS · INCIDENT CLOSED
```

---

## P0 — Supabase `exceed_egress_quota` (2026-06-29) · **CLOSED**

Szczegóły: [`INCIDENTS-2026-06.md`](INCIDENTS-2026-06.md) §0.
