# SESSION HANDOFF — Dashboard V3 (P1-A)

> **Status:** **COMPLETE** · **Wersja:** **2.50.74** · **Commit:** `5a54399`  
> **Post-P1 (v2.51.0+):** skrót = `TendersShortcutPanel`; strategia = **Przetargi → Strategia**. Command Center **usunięty**.
> **Data:** 2026-06-11 · **Workflow:** B (build → smoke → commit → push → verify FAST)  
> **Zastępuje:** serię Hero / Dashboard V2 (`SESSION-HANDOFF-20.7-DASHBOARD-V2.md` — **historyczny**, nie przywracać rankera)

**Hasło agenta:** „kontynuuj WGDOM”

---

## 1. Cel produktowy

**Pulpit = ekran operacyjny.** Odpowiada wyłącznie na pytanie:

> **„Co muszę dzisiaj zrobić?”**

| Warstwa | Gdzie |
|---------|--------|
| **Operacje** | Pulpit (`DashboardView`) |
| **Strategia** | **Przetargi → Strategia** (`TendersModule` / `TendersStrategyContent`) |

Dashboard **nie** pokazuje pełnej strategii (health, forecast, action center). Skrót: `TendersShortcutPanel` + CTA → Strategia.

---

## 2. Układ Pulpicu (V3)

```text
KPI (5)
  → Wypłata · Ekipa dziś · Aktywne WM · Braki dokumentów · Pilne uwagi

Roboty → Braki dokumentów     (#dashboard-braki-dokumentow)
  → pełna lista robót bez kompletu dokumentów

Pilne uwagi na dziś            (#dashboard-pilne-uwagi)
  → kategorie (accordion 2-poziomowy):
     Płace · Dokumentacja ekipy · Zdjęcia · Inspektor · WM · Odbiory · Do odzyskania

Przetargi — skrót              (TendersShortcutPanel)

Dolna siatka operacyjna        (Pracuje dziś · Roboty w trakcie · … — bez zmian)
```

---

## 3. Liczniki (zasada wiążąca)

Użytkownik musi móc **ręcznie policzyć** wynik. Zakazane na Pulpicie:

- `attentionCount` (usunięte)
- ukryte agregaty 0/1 (recoverable)
- `slice` + „+ N więcej” w sekcjach V3
- dedupe Hero ↔ Uwaga

| Licznik | Źródło |
|---------|--------|
| **KPI Braki dokumentów** | `jobsMissingDocs.length` |
| **KPI Pilne uwagi** | `urgentToday.urgentTodayTotal` |
| **Badge sekcji Braki** | = liczba robót na liście |
| **Badge sekcji Pilne** | = suma `count` kategorii |
| **Badge kategorii** | = liczba wierszy po rozwinięciu |

**`jobsMissingDocs` NIE wchodzi** do `urgentTodayTotal`.

### SSOT liczników Pilnych uwag

**Plik:** `src/lib/dashboard-urgent-today.ts`  
**Funkcja:** `buildUrgentTodayCategories(input)`

| Kategoria (`id`) | Label UI | `count` |
|------------------|----------|---------|
| `place` | Płace | unsaved (+1) + blockers + consistency + receipts |
| `dokumentacja-ekipy` | Dokumentacja ekipy | `pendingReports.length` |
| `zdjecia` | Zdjęcia | `pendingPhotos.length` |
| `inspektor` | Inspektor | feed + notes |
| `wm` | WM | overdue + this week |
| `odbior` | Odbiory | `handoverJobCount` |
| `do-odzyskania` | Do odzyskania | `recoverableAlertStats.alerts.length` (nie 0/1) |

**Smoke:** `npx vite-node scripts/test-dashboard-v3-counts.mjs`

---

## 4. Mapa plików

| Plik | Rola |
|------|------|
| `src/app/DashboardView.tsx` | Layout V3, KPI, sekcja Braki, orchestracja |
| `src/app/DashboardPilneUwagiSection.tsx` | UI kategorii Pilnych uwag (pełne listy) |
| `src/lib/dashboard-urgent-today.ts` | **SSOT** liczników kategorii + `urgentTodayTotal` |
| `src/app/tenders/strategy/components/CommandCenterExecutivePanel.tsx` | Przetargi — skrót (CC, bez zmian V3) |
| `src/lib/recoverable-charges.ts` | `computeRecoverableChargesAlerts()` — moduł; na Pulpicie tylko `alerts.length` |

### Usunięte w V3 (nie przywracać)

| Plik |
|------|
| `src/app/HeroDzisPanel.tsx` |
| `src/lib/dashboard-hero-today.ts` |
| `src/lib/dashboard-hero-consolidation.ts` |
| `src/app/RecoverableChargesDashboardCard.tsx` |
| `e2e/dashboard-hero.spec.ts` |
| `scripts/test-dashboard-hero-today.mjs` |
| `scripts/test-dashboard-hero-consolidation.mjs` |
| `scripts/test-hero-dzis-panel.mjs` |

---

## 5. Moduły aplikacji (skrót dla agentów)

Pełna architektura: [`ARCHITECTURE.md`](ARCHITECTURE.md) · platforma: [`PROJECT-HANDOFF-FINAL-20.5Z.md`](PROJECT-HANDOFF-FINAL-20.5Z.md)

| Moduł (`view`) | Plik główny | Funkcja |
|----------------|-------------|---------|
| **Pulpit** | `DashboardView.tsx` | Operacje dnia — V3 |
| **Lista płac** | `PayrollView.tsx` | Tygodnie, wypłaty, paragony, spójność z robotami |
| **Grafik** | `ScheduleView.tsx` | Plan tygodnia |
| **Roboty** | `JobsView.tsx` | CRUD robot, dokumenty, fazy, kolejki |
| **Inspektor (admin)** | `InspectorAdminView.tsx` | Feed aktywności inspektora |
| **Do rozliczenia** | `RecoverableChargesView.tsx` | Pozycje billing, aging, alerty A–D |
| **Przetargi / CC** | `TenderCenterProView.tsx` | Command Center AI — strategia |
| **Pliki** | `JobAllFilesView.tsx` | Files Hub |
| **Kontakty** | `ContactsView.tsx` | Email, inspektor, domyślny odbiorca |
| **Archiwum** | `ArchiveView.tsx` | Zapisane tygodnie płac |
| **Pomoc** | `GuideView.tsx` | Instrukcja + changelog UI |

**Worker (pracownik):** `WorkerPhotoView` — Roboty, Grafik, Wypłata (bez Pulpitu).

---

## 6. Proces pracy (workflow agenta)

```text
AUDIT → RCA → PLAN → IMPLEMENT
```

**Brak implementacji bez audytu.** Release: [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md) — warianty A/B/C.

**VERIFY DEPLOY FAST:** po push jedno `curl -s https://www.wgdom.fun/version.json` — bez retry/polling.

---

## 7. Backlog produktowy (2026-06)

| Priorytet | Temat | Status | Uwagi |
|-----------|-------|--------|-------|
| **P1-A** | Dashboard V3 Rework | **COMPLETE** (2.50.74) | Ten dokument |
| **P1-B** | Command Center Reassessment / Redesign | **OTWARTY** | Nie blokuje V3; strategia zostaje w Przetargach |
| **P2** | Audit Center / Security Log (Super Admin) | **OTWARTY** | Brak globalnego audit trail; wymaga nowego modułu LARGE |

**Inspector Communication Templates 2.1:** CLOSED (2.1.0 + 2.1.1) · **2.1.2 CANCELLED**

---

## 8. Testy V3

| Komenda | Zakres |
|---------|--------|
| `npx vite-node scripts/test-dashboard-v3-counts.mjs` | Liczniki kategorii, suma, recoverable, handover |
| `npx vite-node scripts/smoke-test-dashboard-handover-alert-20.5z5b.mjs` | Odbiory w Pilnych uwagach |
| `npx vite-node scripts/smoke-test-recoverable-charges-alerts-20.4c2b.mjs` | Alerty lib + V3 count |
| `npm run build` | Build gate |

---

## 9. Czego NIE robić bez polecenia

- Przywracać Hero / `buildHeroToday` / `attentionCount` / KPI „Do ogarnięcia”
- Podłączać CC (forecast, health, briefing) z powrotem do `DashboardView`
- Osobna karta `RecoverableChargesDashboardCard` na Pulpicie
- Ukrywać pozycje list (`slice`, „+ N więcej”) przy licznikach V3
- Zmieniać sync/merge (`cloud-sync.ts`) bez audytu
- Implementować 2.1.2 (odrzucony)

---

## 10. Chronologia releasów Dashboard (kontekst)

| Wersja | Opis |
|--------|------|
| 2.50.66–68 | Dashboard V2 — Hero DZIŚ, dedupe Uwaga |
| 2.50.72–73 | Filtry Hero operacyjne, odłączenie CC z rankera |
| **2.50.74** | **Dashboard V3** — usunięcie Hero, operacje w 2 sekcjach |

**Historyczny handoff V2:** [`SESSION-HANDOFF-20.7-DASHBOARD-V2.md`](SESSION-HANDOFF-20.7-DASHBOARD-V2.md) — tylko referencja, **nie** SSOT Pulpicu.

---

## 11. Wejście dla nowego agenta

```text
1. docs/PROJECT-HANDOFF-CURRENT.md     ← baseline prod (2.50.74)
2. docs/SESSION-HANDOFF-DASHBOARD-V3.md ← TEN PLIK (Pulpit V3)
3. CURRENT-TASK.md
4. AGENTS.md → docs/ARCHITECTURE.md
5. curl -s https://www.wgdom.fun/version.json
```

**Werdykt:** Dashboard V3 **RELEASED** · **PRODUCTION VERIFIED** · **STABLE**
