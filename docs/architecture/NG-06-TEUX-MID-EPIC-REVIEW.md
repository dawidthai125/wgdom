# NG-06-TEUX — MID EPIC REVIEW

> **Status:** **READY FOR OWNER SESSION** (po TEUX-3 IMPLEMENT · przed TEUX-4)  
> **Gate:** Obowiązkowy checkpoint **przed** IMPLEMENT TEUX-4  
> **SSOT agenda:** [`NG-06-TEUX-DESIGN-FREEZE.md`](./NG-06-TEUX-DESIGN-FREEZE.md) §4c · [`NG-06-TEUX-OWNER-APPROVAL-GATE.md`](./NG-06-TEUX-OWNER-APPROVAL-GATE.md) §6

---

## 0. Metadane sesji

| Pole | Wartość |
|------|---------|
| **Data review** | _________ (Owner session) |
| **Uczestnicy** | Owner · implementer |
| **Baseline (pre-deploy)** | UI **2.63.55** · commit **`3eb70a0`** |
| **TEUX-3 IMPLEMENT** | UI **2.63.56** · commit **TBD** (lokalny, bez push) |
| **Bundlery zamknięte** | TEUX-1 · TEUX-2 · TEUX-3 |
| **TOKEN FREEZE** | **ACTIVE** — `tender-ux-tokens.ts` bez diff w TEUX-3 |

---

## 1. Werdykt (do wypełnienia przez Ownera)

| Opcja | ☐ |
|-------|---|
| **GO TEUX-4** — pełny zakres Mobile | ☐ |
| **GO TEUX-4 reduced** — subset (opisz) | ☐ |
| **HOLD TEUX-4** — korekta TEUX-3 / tokenów | ☐ |
| **DEFER TEUX-5/6** — tylko P0 maintenance | ☐ |

**Podpis Owner:** _________________ **Data:** _________

---

## 2. Checklist review (evidence pre-filled z IMPLEMENT TEUX-3)

| # | Temat | Evidence | PASS / FAIL / N/A |
|---|-------|----------|-------------------|
| 1 | TEUX-1 regresja nav | `LIB-TENDER-DETAIL-NAV-TEUX1` 7/7 · gate B tenders | **PASS** |
| 2 | Tokeny TEUX-2 wystarczające dla kart | Import `TEUX_FONT_*` · `TEUX_SPACE_MD` · brak edycji tokens | **PASS** |
| 3 | Karty TEUX-3 ≤390px | Mobile card: `overflow-hidden`, badge max 4 + `+N`, KPI 3-col, `min-h-[44px]` | **PASS** (code) |
| 4 | Duplikaty chipów — potrzeba TEUX-7a? | Filtry listy **nie** migrowane (scope strict) | **N/A** → TEUX-7a backlog |
| 5 | Protected Core diff TEUX-1…3 = zero | Boundary grep: cloud-sync, CloudLoader, payroll, nav — **NO DIFF** | **PASS** |
| 6 | Gate B tenders + payroll 15/15 | tenders 5/5 · payroll 15/15 | **PASS** |
| 7 | Z-05 field cert prep | Lista mobile/desktop shipped · Owner screenshots S01 pending | **PARTIAL** |

---

## 3. TEUX-1…3 — podsumowanie epic core

| Bundle | Wersja | Deliverable | Status |
|--------|--------|-------------|--------|
| TEUX-1 | 2.63.54 | `openTenderDetailV4` | **CLOSED** |
| TEUX-2 | 2.63.55 | `tender-ux-tokens` + design-system | **CLOSED** · TOKEN FREEZE |
| TEUX-3 | 2.63.56 | `TenderListMobileCard` / `TenderListDesktopCard` | **IMPLEMENT COMPLETE** |

### TEUX-3 — co shipped

- `tenders/list/TenderListMobileCard.tsx` — `< lg`, severity stripe, TenderUxBadge, KPI row
- `tenders/list/TenderListDesktopCard.tsx` — `≥ lg`, status kolumna, badges
- `tenders/list/tender-list-card-model.ts` — severity priority, badge overflow
- `TendersView.renderTenderItem` — refactor only; bulk / Dzisiaj / hosted / V4 nav zachowane

### TOKEN THAW gate

**TOKEN FREEZE pozostaje ACTIVE** do werdyktu Ownera w tej sesji. Thaw tylko jeśli Owner zaznaczy potrzebę nowych tokenów przed TEUX-4 — inaczej TEUX-4 używa import-only.

---

## 4. Agenda TEUX-4 (jeśli GO)

1. `TenderModuleNavSheet` — nawigacja modułu z detalu mobile
2. Touch/density Command Layer `max-[390px]`
3. Tab bar scroll shadow
4. **Nie** w scope: filtry (TEUX-7a), BOQ cards, Strategia KPI (TEUX-7e)

---

## 5. Artefakty testowe

| testId | Wynik |
|--------|-------|
| `LIB-TENDER-DETAIL-NAV-TEUX1` | **PASS** 7/7 |
| `LIB-TENDER-UX-TOKENS-TEUX2` | **PASS** 10/10 |
| `LIB-TENDER-LIST-CARDS-TEUX3` | **PASS** 27/27 |
| `test-tender-workspace-ux.mjs` | **PASS** 104/104 |
| Gate B `scope:tenders` | **PASS** 5/5 |
| Gate B `scope:payroll` | **PASS** 15/15 |

---

## 6. Decyzje i backlog korekt

*(Wypełnić po sesji Owner)*

---

**NG-06-TEUX MID EPIC REVIEW — READY FOR OWNER SESSION · TEUX-4 BLOCKED do werdyktu §1**
