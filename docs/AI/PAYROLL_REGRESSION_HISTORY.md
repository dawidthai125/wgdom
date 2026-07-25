# PAYROLL — Regression History (AI)

> **Cel:** skrócona pamięć regresji Listy Płac — **objaw → RC → naprawa → jak nie powtórzyć**.  
> **Nie zastępuje** pełnych RCA w `docs/architecture/` / `docs/recovery/`.  
> **Globalnie:** [`04_INCIDENTS_HISTORY.md`](04_INCIDENTS_HISTORY.md) · **SSOT Hours-wipe:** [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) §5

---

## 0. Lekcja nadrzędna

```text
Najczęstszy wzorzec:
  1) AI zmienia „inny” moduł (Tenders / Jobs / Hardening / UI)
  2) Shared cloud-sync / bootstrap / mixed commit
  3) Po 1–N dniach: wipe godzin / pusty roster / resurrection
  4) 1–2 dni naprawy

Obrona: Dependency Map + Guard Rails + #CORE-013 + Gate B payroll
       + nigdy hotfix merge bez RCA.
```

---

## 1. Hours Wipe ~24.07 (INCIDENT-01) · CLOSED @ 2.65.43

| | |
|--|--|
| **Objaw** | Bieżący tydzień — godziny 0 / partial wipe |
| **RC (klasa)** | Hours collapse na Domain Push bez świadomego ACK; brak `-prev` UX; Soft Restore bez czystego overlay |
| **Nie było** | Jednego „złego” commit write-path w oknie FEATURE (REGRESSION-01: write-path blobs IDENTICAL) |
| **Naprawa** | D1 telemetry · D2 Domain Gate · D3 `intentionalHoursClear` ⇔ skip · D4 `-prev` · D5 Soft Restore · D6 Domain Push SSOT |
| **Zapobieganie** | Guard Rails P2–P4 · nie omijać Gate · nie ruszać PURE factory |
| **Docs** | EPIC CLOSE · DF-01 · `AI/04` §1b · REGRESSION-01 |

---

## 2. Resurrection / bootstrap · CLOSED @ 2.65.35

| | |
|--|--|
| **Objaw** | Pusta chmura + stary LS → „wskrzeszenie” pracowników |
| **RC** | Bootstrap traktował bogaty LS jako SSOT wobec pustego cloud |
| **Naprawa** | `payroll-bootstrap-resurrection-fence` |
| **Zapobieganie** | **Nigdy** nie usuwać fence „dla seeda / E2E” |

---

## 3. Rollover ALIGN vs wipe · CLOSED @ 2.65.34

| | |
|--|--|
| **Objaw** | Zmiana dat / przejście tygodnia czyści lub klonuje godziny źle |
| **RC** | ALIGN mylony z ROLLOVER |
| **Naprawa** | `classifyPayrollWeekTransition` |
| **Zapobieganie** | Nie cofać classifera; czytać Dependency Map „week cycle” |

---

## 4. Cross-device Domain Push · CLOSED @ ~2.63.85 (S2)

| | |
|--|--|
| **Objaw** | Godziny nie dochodzą na drugie urządzenie / konflikt z RS |
| **RC** | LP w RS push + brak osobnego Domain Push |
| **Naprawa** | Domain Push; RS **bez** `kw-week-employees` (#CORE-015) |
| **Zapobieganie** | **Nigdy** nie wrzucać LP z powrotem do RS |

---

## 5. Shrink Guard / Bootstrap P11 · CLOSED (seria 2.63.x)

| | |
|--|--|
| **Objaw** | UI 0h mimo bogatej chmury; ryzyko wipe cloud |
| **RC** | Replace / shrink bez guard; bootstrap merge niespójny |
| **Naprawa** | Payroll Guard shrink; `finalizePayrollBundleMerge` / P11 bootstrap |
| **Zapobieganie** | Nie wyłączaj guardów; nie „uprość” merge do replace |

---

## 6. PWRB / mutacje poza facade · CLOSED (RC-B-1)

| | |
|--|--|
| **Objaw** | Drift roster vs deleted-ids; znikający pracownik |
| **RC** | Mutacje składu poza jedną facade |
| **Naprawa** | PWRB `payroll-week-roster-bundle` (I-1…I-4) |
| **Zapobieganie** | Add/remove **tylko** PWRB |

---

## 7. Anti-leak / bootstrap race / quota · CLOSED (2.65.x)

| Temat | Lekcja |
|-------|--------|
| Anti-leak | Same-week cloud SSOT guard — nie leakuj starego LS |
| Bootstrap race | Gate fazy CloudLoader — nie apply w połowie |
| QuotaExceeded | ≠ bootstrap FAILED — nie maskuj jako „brak danych” |

---

## 8. FEATURE window ≠ write-path regression (REGRESSION-01)

| | |
|--|--|
| **Fakt** | W oknie Sync Storm / HARDENING tipy FEATURE **nie** zmieniły blobów write-path LP |
| **Lekcja AI** | „Piątkowy FEATURE” może **współwystępować** z wipe bez bycia RC kodu ścieżki — nadal: **nie mieszaj** Shared; rób forensics zanim oskarżysz commit |
| **Docs** | `architecture/PAYROLL-REGRESSION-01-REGRESSION-WINDOW-AUDIT.md` |

---

## 9. Jak nie dopuścić do powtórki (operacyjnie)

| # | Zasada |
|---|--------|
| 1 | Przed zmianą Shared → Dependency Map + Gate B payroll |
| 2 | #CORE-013 — osobne commity FEATURE / CORE |
| 3 | Wipe → AUDIT ONLY (D1), nie hotfix merge |
| 4 | Nowy write path → DF + Architecture Review + Owner GO |
| 5 | E2E/CI — nie obchodzić fence/guard w `src/` |
| 6 | Czytaj ten plik + Guard Rails przed „drobnym” sync refaktorem |

---

## 10. Mapa do pełnych RCA (gdy potrzeba)

| Temat | Wejście |
|-------|---------|
| Hours-wipe closeout | `architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md` |
| Incident-01 audit | `architecture/PAYROLL-INCIDENT-01-AUDIT.md` |
| Forensics write path | `architecture/PAYROLL-FORENSICS-01-DOMAIN-WRITE-PATH-AUDIT.md` |
| Resurrection | `architecture/PAYROLL-CLOUD-RESURRECTION-01-*` |
| RC-B / PWRB | `recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md` |
| Sync forensics głęboko | `docs/recovery/PAYROLL-*` (HISTORICAL) |
