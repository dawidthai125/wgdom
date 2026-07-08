# NG-06-TEUX — Hosted legacy deprecation (SSOT)

> **Status:** **ACTIVE** · TEUX-7f · prod default **V4**  
> **Data:** 2026-07-08  
> **Slice:** [`NG-06-TEUX-TEUX7F-AUDIT-REPORT.md`](./NG-06-TEUX-TEUX7F-AUDIT-REPORT.md) · [`NG-06-TEUX-DESIGN-FREEZE.md`](./NG-06-TEUX-DESIGN-FREEZE.md) § TEUX-7f

---

## 1. Cel

Udokumentować **dual runtime** modułu Przetargów i oznaczyć ścieżkę **hosted accordion** jako **deprecated** — **bez usuwania** kodu rollback.

**Prod SSOT:** routing URL V4 (`TENDERS_V4_ROUTING = true`).

---

## 2. Dwa runtime (mapa)

```text
TENDERS_V4_ROUTING (src/lib/tenders-v4-config.ts)
│
├─ true  [PROD DEFAULT]
│   TendersListPage → onItemNavigate → openTenderDetailV4
│   TenderDetailPage → TenderDetailPanel (embedV4ChromeHidden)
│   Zakładki V4: Przetarg · Dokumenty · Kosztorys · Ceny · Decyzja (PL)
│
└─ false [ROLLBACK ONLY — nie prod]
    TendersListTab → TendersView accordion expand
    TenderDetailPanelHosted → TenderDetailPanel (pełny chrome)
    TenderWorkspaceTabBar → etykieta overview „Intelligence” (legacy id overview)
```

---

## 3. Deprecated API (kod pozostaje)

| Symbol | Plik | Rola |
|--------|------|------|
| `TenderDetailPanelHosted` | `src/app/TenderDetailPanel.tsx` | Mount pipeline + panel w accordionie listy |
| `TendersListTab` | `src/app/tenders/tabs/TendersListTab.tsx` | Lista bez V4 navigate (gdy flag `false`) |

**Dev guard:** `console.warn` przy pierwszym mount `TenderDetailPanelHosted` (`import.meta.env.DEV`).

---

## 4. Rollback (awaryjny)

1. Ustaw `TENDERS_V4_ROUTING = false` w `src/lib/tenders-v4-config.ts`.
2. Deploy frontend.
3. Lista wraca do accordion; detal bez osobnego URL V4.

**Nie** usuwać `TenderDetailPanelHosted` bez osobnego epicu Owner + testów regresji (`test-tender-list-cards-teux3`, `test-tender-workspace-ux`).

---

## 5. Etykieta „Intelligence”

- Dotyczy **tylko** legacy `TenderWorkspaceTabBar` (`overview` tab id).
- **Nie zmieniana** w TEUX-7f (Owner GO conditional).
- V4 używa zakładki **„Decyzja”** (`tender-detail-routes-v4.ts`) — bez „Intelligence”.

---

## 6. Anti-goals (TEUX-7f)

| Zakaz | Powód |
|-------|--------|
| Usunięcie accordion / hosted | Rollback + testy TEUX-3 |
| Zmiana `useTenderPipelineRuntime` | NG-02 frozen |
| Cloud Sync / Payroll / Edge / PWRB | #CORE-014 |
| Edycja `tender-ux-tokens.ts` | TOKEN FREEZE |

---

## 7. Usunięcie hosted (przyszłość)

Wymaga **osobnego bundle** Owner GO: migracja testów, potwierdzenie braku użycia rollback, TEUX-7z epic review.

**TEUX-7f nie usuwa hosted.**
