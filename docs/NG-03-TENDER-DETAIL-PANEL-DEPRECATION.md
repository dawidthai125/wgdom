# NG-03 — Deprecation map: `TenderDetailPanelHosted`

> **Status:** **DEPRECATED** · **NOT REMOVED** · **V4 LOCK CONFIRMED** · **HOSTED_ROLLBACK = ABANDONED**  
> **Data:** 2026-09-19 · PRZETARGI_CLEANUP-01 V4 lock formalization (docs)  
> **Owner GO:** `OWNER GO — V4 LOCK CONFIRMED: TENDERS_V4_ROUTING irreversible; Hosted rollback abandoned`  
> **Klasa:** docs / architecture SSOT  
> **Powiązane:** A-02-1 · [`SESSION-HANDOFF-NG-02-EPIC-CLOSE.md`](SESSION-HANDOFF-NG-02-EPIC-CLOSE.md) · ARCHITECTURE § 12.1.23 · [`architecture/NG-06-TEUX-HOSTED-DEPRECATION.md`](architecture/NG-06-TEUX-HOSTED-DEPRECATION.md)

---

## 1. Werdykt

| Pole | Wartość |
|------|---------|
| **Symbol** | `TenderDetailPanelHosted` |
| **Plik** | `src/app/TenderDetailPanel.tsx` |
| **Status** | **REMOVED** from runtime (WAVE 2) · NG-03 removal checklist **not fully closed** (§5 pkt 6–7 OPEN) |
| **V4 routing** | **IRREVERSIBLE** — kontrakt docelowy Przetargów |
| **Hosted rollback** | **ABANDONED** — nie jest wspieraną ścieżką |
| **Usunięcie kodu Hosted** | **BLOCKED** do domknięcia pozostałych punktów §5 (osobne Owner GO IMPLEMENT) |
| **Prod path** | `TenderDetailPage` (V4) — **ACTIVE SSOT** |

> **DEPRECATED ≠ REMOVED**  
> Komponent może pozostać w repo jako **martwy stub** (TEUX7F/TEUX3 presence contracts) do WAVE 2 IMPLEMENT.  
> **Nie** przywracać Hosted / accordion rollback bez **nowego** Owner GO + ARCH REVIEW.

---

## 1b. V4 LOCK CONTRACT (2026-09-19)

| Zasada | Treść |
|--------|--------|
| V4 | Routing URL `/przetargi` + `/przetargi/:id/:tab` jest **obecnym i docelowym** kontraktem |
| Flag | `TENDERS_V4_ROUTING = true` traktować jako **trwały** kontrakt (nie planujemy `false` jako rollback) |
| Hosted | Rollback do `TenderDetailPanelHosted` / accordion = **ABANDONED** (historyczny / stale) |
| Nowe prace | **Zakaz** przywracania Hosted bez nowego Owner GO + ARCH REVIEW |
| Redirects | `/strategia` · `/materialy` pozostają **KEEP_REDIRECT** (kompatybilność bookmarków) — niezależnie od locku |
| Runtime | Ta formalizacja = **docs only** — **nie** zmienia kodu produkcyjnego |

**Rationale:** Prod od dawna V4-only; ścieżka rollback opisana w starych docs jest **broken/stale** (`TendersListTab` usunięty WAVE 1A; `V4=false` → `queue:null`). Owner potwierdził irreversible V4 i abandon Hosted rollback.

---

## 2. Mount matrix (aktualny stan)

```text
TENDERS_V4_ROUTING = true     [IRREVERSIBLE contract — prod + tip]
        │
        └─ Lista → onItemNavigate(id) → TenderDetailPage
                    └─ useTenderPipelineRuntime() × 1  ✅ SSOT

[ABANDONED — nie wspierać]
  TENDERS_V4_ROUTING = false / accordion / TenderDetailPanelHosted
  → historycznie: TendersView expand → Hosted → 2× runtime (A-02-1)
  → dziś: nieosiągalne na happy path; rollback docs = HISTORICAL/STALE
```

| Warstwa | V4 (SSOT) | Hosted (abandoned) |
|---------|-----------|---------------------|
| Shell | `TenderDetailPage.tsx` | `TenderDetailPanelHosted` (stub w drzewie) |
| Runtime mount | 1× w Page | 0 na prod |
| Routing | URL SSOT (`tender-detail-routes-v4.ts`) | martwy gate `!onItemNavigate` |
| Aktywny na prod | **TAK** | **NIE** |

---

## 3. Callsite (jedyny UI — obecnie nieosiągalny na prod)

`src/app/TendersView.tsx`:

```tsx
{expanded && !onItemNavigate && (
  <TenderDetailPanelHosted … />
)}
```

Na tip: jedyny consumer `TendersView` to `TendersListPage` z **zawsze** ustawionym `onItemNavigate` → Hosted **nie montuje się**.

---

## 4. Ryzyko A-02-1 (drugi runtime)

| Scenariusz | Severity | Uwagi |
|------------|----------|-------|
| Prod V4 | 🟢 NONE | Hosted nieaktywny |
| Próba „rollback” `V4_ROUTING=false` | 🔴 **NIEWSPERANY** | Abandoned; `queue:null`; ListTab absent |
| Usunięcie Hosted bez GO IMPLEMENT | 🔴 HIGH | TEUX7F/TEUX3 + NG-02 boundary — osobny zakres |

---

## 5. Removal Checklist

`TenderDetailPanelHosted` **może zostać usunięty wyłącznie gdy** spełnione są **wszystkie** punkty:

- [x] Rollback path **nie jest już wymagany** — Owner GO 2026-09-19 (`HOSTED_ROLLBACK = ABANDONED`)
- [x] `TENDERS_V4_ROUTING` uznany za **permanentny / irreversible** — Owner GO 2026-09-19 (`V4 LOCK CONFIRMED`); rollback docs → HISTORICAL (ten closeout)
- [x] **TI-B4 CLOSED** — smoke agregat Przetargi (projekt: 2.63.27+)
- [x] **Owner GO** — explicit polecenie **usunięcia** Hosted — `OWNER GO — WAVE 2 IMPLEMENT` (2026-09-19)
- [x] **Osobny AUDIT** — WAVE 2 AUDIT + RCA (Hosted runtime callers = 0; IK path = TenderDetailPage, nie Hosted)
- [ ] **Osobny FEATURE bundle** — #CORE-013 · #CORE-014 Boundary Check PASS — **OPEN** (poza zakresem WAVE 2)
- [ ] **Boundary Check PASS** — formalny CORE bundle PWRB/payroll — **OPEN** (WAVE 2 nie dotknął Payroll/sync; formalny CORE check nie wykonany)

**Lock formalization (ten dokument):** punkty 1–3 = **CLOSED**.  
**Hosted code removal:** punkty 4–7 = **OPEN** → `NG03_STATUS = OPEN` (removal incomplete).

**Do usunięcia kodu:** minimum **7/7** · brak skrótów.

---

## 6. Dozwolone vs zakazane (dla agentów)

| Dozwolone | Zakazane |
|-----------|----------|
| Czytanie / dokumentacja | Usunięcie Hosted bez Owner GO IMPLEMENT |
| V4 feature w `TenderDetailPage` | Przywracanie Hosted / `TENDERS_V4_ROUTING=false` jako wspierany rollback |
| Render-only fix w `TenderDetailPanel` gdy props-only | Refactor łączący Panel + Page bez briefu |
| Aktualizacja tego dokumentu | Zmiana flagi V4 / runtime „dla formalizacji locku” |

---

## 7. Powiązane SSOT

| Dokument | Rola |
|----------|------|
| [`architecture/NG-06-TEUX-HOSTED-DEPRECATION.md`](architecture/NG-06-TEUX-HOSTED-DEPRECATION.md) | TEUX-7f dual-runtime → zaktualizowany: rollback HISTORICAL |
| [`audit/NG-03-EPIC-CLOSE-REPORT.md`](../audit/NG-03-EPIC-CLOSE-REPORT.md) | Epic close (historyczny) |
| [`docs/ARCHITECTURE-REVIEW-2026-TENDERS.md`](ARCHITECTURE-REVIEW-2026-TENDERS.md) §4.2 | A-02-1 (historyczny kontekst) |
| `.tmp/PRZETARGI-CLEANUP-01-V4-LOCK-FORMALIZATION.md` | Sesja formalizacji (artefakt lokalny) |
