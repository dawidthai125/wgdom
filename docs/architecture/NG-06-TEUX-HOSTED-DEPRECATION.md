# NG-06-TEUX — Hosted legacy deprecation (SSOT)

> **Status:** **ACTIVE (V4 SSOT)** · Hosted rollback = **ABANDONED / HISTORICAL** · kod Hosted = **NOT REMOVED**  
> **Data:** 2026-09-19 · PRZETARGI_CLEANUP-01 V4 lock formalization  
> **Owner GO:** `OWNER GO — V4 LOCK CONFIRMED: TENDERS_V4_ROUTING irreversible; Hosted rollback abandoned`  
> **Slice historyczny:** TEUX-7f · [`NG-06-TEUX-TEUX7F-AUDIT-REPORT.md`](./NG-06-TEUX-TEUX7F-AUDIT-REPORT.md) · [`NG-06-TEUX-DESIGN-FREEZE.md`](./NG-06-TEUX-DESIGN-FREEZE.md) § TEUX-7f  
> **Removal map SSOT:** [`../NG-03-TENDER-DETAIL-PANEL-DEPRECATION.md`](../NG-03-TENDER-DETAIL-PANEL-DEPRECATION.md)

---

## 1. Cel (aktualny)

Utrzymać **SSOT routingu V4** oraz jawnie oznaczyć ścieżkę **hosted accordion / rollback** jako **porzuconą**.

**Prod + tip SSOT:** routing URL V4 (`TENDERS_V4_ROUTING = true`) — **IRREVERSIBLE**.

**Nie** jest celem tego dokumentu usuwanie kodu Hosted (wymaga WAVE 2 IMPLEMENT + checklisty NG-03 §5 punktów 4–7).

---

## 2. Runtime mapa (aktualna)

```text
TENDERS_V4_ROUTING = true  [IRREVERSIBLE]
│
└─ TendersListPage → onItemNavigate → openTenderDetailV4 / TenderDetailPage
   TenderDetailPanel (embedV4ChromeHidden)
   Zakładki V4: Przetarg · Dokumenty · Kosztorys · Ceny · Decyzja (PL)
```

### 2b. Historyczny dual runtime (STALE — nie wspierać)

```text
[HISTORICAL / ABANDONED — TEUX-7f era]
TENDERS_V4_ROUTING = false
  → docs wskazywały: TendersListTab + accordion + TenderDetailPanelHosted
  → po WAVE 1A: TendersListTab ABSENT; Module queue → null gdy false
  → Hosted gate w TendersView nieosiągalny na happy path ListPage
```

---

## 3. Deprecated API (kod może pozostać do IMPLEMENT)

| Symbol | Plik | Status |
|--------|------|--------|
| `TenderDetailPanelHosted` | `src/app/TenderDetailPanel.tsx` | DEPRECATED · **KEEP_FOR_NOW** · rollback abandoned |
| `TendersListTab` | — | **REMOVED** (WAVE 1A) — nie przywracać |

**Dev guard:** `console.warn` przy mount Hosted (`import.meta.env.DEV`) — bez zmian w tej formalizacji.

---

## 4. Rollback — HISTORICAL (nieaktywny)

> **Klasyfikacja:** **HISTORICAL / STALE** · **HOSTED_ROLLBACK = ABANDONED**

Dawna procedura TEUX-7f („ustaw `TENDERS_V4_ROUTING = false` → accordion”) **nie jest** wspieraną ścieżką operacyjną ani architektoniczną.

| Było (TEUX-7f) | Jest (2026-09-19) |
|----------------|-------------------|
| Rollback awaryjny opisany jako aktywny | **Abandoned** — Owner GO V4 LOCK |
| `TendersListTab` w mapie | Usunięty WAVE 1A |
| Hosted = safety net | Hosted = martwy stub do osobnego delete GO |

**Nie** usuwać `TenderDetailPanelHosted` w tym dokumencie / tej sesji. Usunięcie: NG-03 §5 + Owner GO IMPLEMENT + migracja TEUX7F/TEUX3.

---

## 5. Etykieta „Intelligence”

- Dotyczy **tylko** legacy `TenderWorkspaceTabBar` (`overview` tab id).
- V4 używa zakładki **„Decyzja”** — bez „Intelligence”.
- Bez zmian w tej formalizacji.

---

## 6. Anti-goals (nadal ważne)

| Zakaz | Powód |
|-------|--------|
| Przywracanie Hosted / `V4=false` jako rollback | V4 LOCK CONFIRMED |
| Usunięcie Hosted bez Owner GO IMPLEMENT | NG-03 §5 punkty 4–7 OPEN; TEUX7F/TEUX3 KEEP |
| Zmiana `useTenderPipelineRuntime` | NG-02 frozen |
| Cloud Sync / Payroll / Edge / PWRB | #CORE-014 |
| Edycja `tender-ux-tokens.ts` | TOKEN FREEZE |

---

## 7. Usunięcie hosted (przyszłość — poza tą formalizacją)

Wymaga: Owner GO WAVE 2 IMPLEMENT (PLAN A) · migracja TEUX7F/TEUX3 · NG-03 checklist 7/7 · boundary checks.

**Ta formalizacja nie usuwa hosted i nie migruje testów.**
