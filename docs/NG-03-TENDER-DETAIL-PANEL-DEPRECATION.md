# NG-03 — Deprecation map: `TenderDetailPanelHosted`

> **Status:** **DEPRECATED** · **NOT REMOVED**  
> **Data:** 2026-07-05 · Bundle #2 NG-03 Maintenance (M-06)  
> **Klasa:** docs / architecture SSOT  
> **Powiązane:** A-02-1 · [`SESSION-HANDOFF-NG-02-EPIC-CLOSE.md`](SESSION-HANDOFF-NG-02-EPIC-CLOSE.md) · ARCHITECTURE § 12.1.23

---

## 1. Werdykt

| Pole | Wartość |
|------|---------|
| **Symbol** | `TenderDetailPanelHosted` |
| **Plik** | `src/app/TenderDetailPanel.tsx` (export ~L840) |
| **Status** | **DEPRECATED** |
| **Usunięcie kodu** | **BLOCKED** — patrz §5 Removal Checklist |
| **Prod path** | `TenderDetailPage` (V4) — **ACTIVE** |

> **DEPRECATED ≠ REMOVED**  
> Komponent pozostaje w repo jako **rollback safety** dopóki flaga `TENDERS_V4_ROUTING` i ścieżka accordion mogą być aktywowane.

---

## 2. Mount matrix

```text
TENDERS_V4_ROUTING = true     [src/lib/tenders-v4-config.ts — prod default]
        │
        ├─ Lista → onItemNavigate(id) → TenderDetailPage
        │           └─ useTenderPipelineRuntime() × 1  ✅ SSOT
        │
        └─ TENDERS_V4_ROUTING = false  (rollback)
              └─ TendersView accordion expanded
                    └─ TenderDetailPanelHosted
                          └─ useTenderPipelineRuntime() × 2  ⚠ A-02-1
                                └─ TenderDetailPanel (render-only props)
```

| Warstwa | V4 (prod) | Legacy accordion |
|---------|-----------|------------------|
| Shell | `TenderDetailPage.tsx` | `TenderDetailPanel.tsx` |
| Runtime mount | 1× w Page | 1× w Hosted wrapper |
| Routing | URL SSOT (`tender-detail-routes-v4.ts`) | inline expand |
| Aktywny na prod | **TAK** | **NIE** (flag + navigate) |

---

## 3. Callsite (jedyny UI)

`src/app/TendersView.tsx`:

```tsx
{expanded && !onItemNavigate && (
  <TenderDetailPanelHosted … />
)}
```

Hosted mountuje się **wyłącznie** gdy:

1. `TENDERS_V4_ROUTING === false` **lub** brak `onItemNavigate`, **oraz**
2. wiersz listy jest `expanded`.

Na prod (`V4_ROUTING=true` + `onItemNavigate` z modułu): **Hosted nie renderuje się**.

---

## 4. Ryzyko A-02-1 (drugi runtime)

| Scenariusz | Severity | Uwagi |
|------------|----------|-------|
| Prod V4 | 🟢 NONE | Hosted nieaktywny |
| Rollback `V4_ROUTING=false` | 🟡 MEDIUM | Drugi `useTenderPipelineRuntime` na accordion |
| Usunięcie Hosted bez AUDIT | 🔴 HIGH | Utrata rollback bez revertu git |

**Nie naprawiać** A-02-1 w bundle FEATURE — osobny CORE/PLATFORM bundle tylko po zamknięciu rollback requirement (§5).

---

## 5. Removal Checklist

`TenderDetailPanelHosted` **może zostać usunięty wyłącznie gdy** spełnione są **wszystkie** punkty:

- [ ] Rollback path (`TENDERS_V4_ROUTING=false` + accordion) **nie jest już wymagany** — decyzja Owner na piśmie
- [ ] `TENDERS_V4_ROUTING` uznany za **permanentny** (flaga usunięta lub hardcoded true bez rollback docs)
- [ ] **TI-B4 CLOSED** — smoke agregat Przetargi PASS na prod
- [ ] **Owner GO** — explicit polecenie usunięcia
- [ ] **Osobny AUDIT** — wpływ na NG-02 mount, session cache, bootstrap guards
- [ ] **Osobny FEATURE bundle** — #CORE-013 · #CORE-014 Boundary Check PASS
- [ ] **Boundary Check PASS** — zero dotknięcia PWRB · cloud-sync · CloudLoader payroll · Edge batch payroll bez osobnego CORE bundle

**Do spełnienia checklisty:** minimum **7/7** · brak skrótów · brak „quick delete”.

---

## 6. Dozwolone vs zakazane (dla agentów)

| Dozwolone | Zakazane |
|-----------|----------|
| Czytanie / dokumentacja | Usunięcie Hosted w bundle docs lub mobile |
| Render-only fix w `TenderDetailPanel` gdy props-only | Refactor łączący Panel + Page |
| V4 feature w `TenderDetailPage` | Nowy mount `useTenderPipelineRuntime` poza Page/Hosted |
| Aktualizacja tego dokumentu | Zmiana `TENDERS_V4_ROUTING` bez Owner GO |

---

## 7. Powiązane SSOT

| Dokument | Rola |
|----------|------|
| [`audit/NG-03-EPIC-CLOSE-REPORT.md`](../audit/NG-03-EPIC-CLOSE-REPORT.md) | Epic close |
| [`docs/A-03-1-STATUS-OVERLAP-AUDIT.md`](A-03-1-STATUS-OVERLAP-AUDIT.md) | Status layers · HubPanel legacy path |
| [`docs/ARCHITECTURE-REVIEW-2026-TENDERS.md`](ARCHITECTURE-REVIEW-2026-TENDERS.md) §4.2 | A-02-1 |
