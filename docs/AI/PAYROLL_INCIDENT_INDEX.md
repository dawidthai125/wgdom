# PAYROLL INCIDENT INDEX

> **Rola:** indeks linków — **bez** kopiowania RCA.  
> **Narracja skrócona:** [`PAYROLL_REGRESSION_HISTORY.md`](PAYROLL_REGRESSION_HISTORY.md) · [`04_INCIDENTS_HISTORY.md`](04_INCIDENTS_HISTORY.md)

| ID / temat | Objaw (1 linia) | Status | Wejście |
|------------|-----------------|--------|---------|
| Hours Wipe ~24.07 (INCIDENT-01) | Godziny 0 / partial wipe bieżący tydzień | **CLOSED** @ 2.65.43 | [`../architecture/PAYROLL-INCIDENT-01-AUDIT.md`](../architecture/PAYROLL-INCIDENT-01-AUDIT.md) · EPIC [`../architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md`](../architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md) |
| INCIDENT-02 CORS / Edge | Błędy sync / CORS przy LP | **CLOSED** (audit) | [`../architecture/PAYROLL-INCIDENT-02-CORS-EDGE-AUDIT.md`](../architecture/PAYROLL-INCIDENT-02-CORS-EDGE-AUDIT.md) |
| Resurrection / bootstrap | Pusta chmura + bogaty LS → wskrzeszenie | **CLOSED** @ 2.65.35 | [`../architecture/PAYROLL-CLOUD-RESURRECTION-01-RCA.md`](../architecture/PAYROLL-CLOUD-RESURRECTION-01-RCA.md) |
| Week rollover ALIGN vs wipe | Złe czyszczenie / klon godzin przy zmianie tygodnia | **CLOSED** @ 2.65.34 | [`../architecture/PAYROLL-P0-WEEK-ROLLOVER-01-RCA.md`](../architecture/PAYROLL-P0-WEEK-ROLLOVER-01-RCA.md) |
| Cross-device / Domain Push | Godziny nie na 2. urządzeniu; konflikt z RS | **CLOSED** ~2.63.85 | Agent Guide · Regression History §4 |
| Shrink / Bootstrap P11 | UI 0h mimo bogatej chmury | **CLOSED** 2.63.x | B4 closeout · Guard Phase |
| PWRB / znikający pracownik | Drift roster vs deleted-ids | **CLOSED** RC-B-1 | [`../recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md`](../recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md) · [`../recovery/INCIDENT-NEW-EMPLOYEE-DISAPPEARED-AUDIT.md`](../recovery/INCIDENT-NEW-EMPLOYEE-DISAPPEARED-AUDIT.md) |
| Sync 502 / CORS | Incydent sync LP | **CLOSED** | [`../recovery/INCIDENT-PAYROLL-SYNC-502-CORS-AUDIT.md`](../recovery/INCIDENT-PAYROLL-SYNC-502-CORS-AUDIT.md) |
| Anti-leak / bootstrap race / quota | Race, QuotaExceeded ≠ FAILED bootstrap | **CLOSED** 2.65.x | Regression History §7 · Bootstrap DF |
| FEATURE window ≠ write-path RC | Wipe współwystępował z FEATURE bez blob change | Lekcja | [`../architecture/PAYROLL-REGRESSION-01-REGRESSION-WINDOW-AUDIT.md`](../architecture/PAYROLL-REGRESSION-01-REGRESSION-WINDOW-AUDIT.md) |
| Sync Storm 23.07 (pipeline) | Egress / storm — kontekst Shared | **CLOSED** | [`04_INCIDENTS_HISTORY.md`](04_INCIDENTS_HISTORY.md) · INCIDENT-23-07 docs |

**Dodawanie nowego incydentu:** nowy wiersz tutaj + skrót w Regression History — **nie** rozrzucaj tylko po architecture/.
