# IK AUTONOMY-08 P1 — Settings Unification · PLAN

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-PLAN` |
| **Status** | **PLAN READY FOR OWNER REVIEW** · **NO DESIGN FREEZE** · **NO ARCH REVIEW** · **NO IMPLEMENT** |
| **Date** | 2026-08-17 |
| **Mode** | PLAN ONLY · REUSE FIRST · **ZERO CODE** · **ZERO UI** · **ZERO SETTINGS WRITE** |
| **Audit** | [`IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-AUDIT.md`](./IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-AUDIT.md) |
| **Owner Review** | **PASS** (kierunek audytu zatwierdzony) |
| **Prior** | **08-P0 COMPLETE / CLOSED** · 2.66.93 / `b98e68e5` · docs `43ef9f64` |
| **EPIC** | AUTONOMY-08 — P1 PLAN (epic not closed) |

```text
OWNER REVIEW           = PASS
PLAN                   = READY
Design Freeze          = NOT CREATED
Architecture Review    = NOT DONE
Implementation         = NOT AUTHORIZED
CODE / UI / SETTINGS   = ZERO
COMMIT / PUSH / DEPLOY = NOT DONE
```

---

## ★ Locked Owner decisions (this review)

| # | Decision |
|---|----------|
| **OD-P1-1** | `ikEntryEnabled` = **jedyny** biznesowy przełącznik IK. **No new flag.** |
| **OD-P1-2** | IK ON = autonomiczny workflow (Documents→BOQ · P5 · P6 · P7 · P8 jako **etapy**, nie produkty). |
| **OD-P1-3** | P3–P8 **zostają** w runtime + AppSettings (rollback). **Nie** jako zwykłe ustawienia biznesowe. |
| **OD-P1-4** | Super Admin: technical/advanced/emergency — **nie** „włącz P5/P6/P7/P8”. |
| **OD-P1-5** | Zwykły Admin: **brak** nowego panelu (już nie ma ⚙). |
| **OD-P1-6** | P1 **nie** implementuje: Research-on-miss · Accept · Reject · Recalculate · Price Commit · Final Bid · Identity Gap UX · D/Chief · P4 fold-into-IK. |
| **OD-P1-7** | Research semantics **UNCHANGED** (no auto-on-miss). |
| **OD-P1-8** | Owner Gates **UNCHANGED**. |
| **OD-P1-9** | Safety: D HARD STOP · P1 invoice CLOSED · P2 KEEP GAP · Composite CLOSED · no `\|\| true` / new engine / flag / orchestrator. |

---

## 0. Scope of this PLAN (vs later slices)

**08-P1 (ten plan):** wyłącznie **prezentacja Super Admin ⚙ Moduły** — jeden biznesowy IK switch + schowanie etapów do Advanced.

**Nie ten plan:** Research-on-miss, Owner Gate UX, zmiana helperów, KV migration, nowy panel dla roli `admin`.

---

## 1. Które P3–P8 ukryć z widoku podstawowego

Z sekcji **Moduły** (pierwszy ekran ⚙) **wynieść**:

| Control | Key | Why |
|---------|-----|-----|
| IDENTITY_COVERAGE | `ikIdentityCoverageEnabled` | diagnostyka P3, nie produkt |
| CHIEF WIRING | `ikChiefWiringEnabled` | P4 scoped Chief ≠ D · nie foldować w IK |
| LABOR E2E select | `ikLaborE2eEnabled` | etap + emergency OFF |
| LABOR RESEARCH | `ikLaborResearchEnabled` | MODE B · P1 nie zmienia semantyki |
| MATERIAL E2E select | `ikMaterialE2eEnabled` | etap + emergency OFF |
| MATERIAL RESEARCH | `ikMaterialResearchEnabled` | MODE B |
| F5 E2E select | `ikF5E2eEnabled` | etap P7 |
| RISK/DECISION select | `ikRiskDecisionE2eEnabled` | etap P8 |

Copy typu „IK · LABOR E2E (P5 · MODE A)” **nie** wraca na pierwszy ekran.

---

## 2. Które zostawić jako Super Admin technical

**Wszystkie z §1** — w **jednej** sekcji:

```text
TECHNICAL / ADVANCED / EMERGENCY
```

Tylko `adminIsSuperAdmin` (już jedyny użytkownik ⚙).

Wymagania copy:

- nagłówek **nie** brzmi „włącz ekspertów”,
- opis: kill-switch / diagnostyka / rollback,
- P5–P8: AUTO = część IK gdy Entry ON; OFF = awaryjne wstrzymanie etapu,
- confirm na OFF **zostaje** (istniejący `window.confirm`).

Dostęp emergency = ten accordion, **nie** nowy ekran / nowa flaga.

---

## 3. Legacy

| Item | Plan |
|------|------|
| `ikAutoIngestEnabled` | **legacy leftover** · UI już usunięte (08-P0) · **nie przywracać** |
| `isIkAutoIngestEnabled()` | nie jest P2 gate · nie re-wire |
| Compile `IK_ENTRY_SHELL_*` | zostają · nie AND-ować z helperami |

---

## 4. Co można całkowicie usunąć z UI

| Item | Remove from UI? |
|------|-----------------|
| AUTO_INGEST checkbox | **już usunięty** · nie wraca |
| P3–P8 z **pierwszego** ekranu Moduły | **TAK** (przeniesienie, nie delete DOM) |
| P3–P8 z całego modalu | **NIE** — rollback/emergency |
| D checkbox | **NIE usuwać** · nie jest etapem IK |
| Przetargi staff | **NIE** · osobny biznesowy switch modułu |
| WM Rysunki / Szkice | **NIE** · poza P1 |

---

## 5. AppSettings

**BEZ ZMIAN** kluczy, typów, defaultów, load, merge, B-POLICY, OFF wins.

**No new flag.** `ikEntryEnabled` pozostaje jedynym masterem IK.

Komentarze w `app-settings.ts` — opcjonalnie w DF (nie w tej turze).

---

## 6. KV

**Zero migracji.** Nie `batch-set`. Nie kasować leftover `ikAutoIngestEnabled`.  
Live P3 `true` / D `true` / Entry `false` — **nie ruszać** w P1.

---

## 7. Rollback

| Poziom | Jak |
|--------|-----|
| IK cały | Super Admin: IK OFF (`ikEntryEnabled`) |
| Jeden etap P5–P8 | Advanced: enum `"OFF"` (OFF wins) |
| Research HTTP | Advanced: checkbox unchecked (`!== true`) |
| P3 / P4 | Advanced: checkbox |
| Docs-only revert UI | revert commita P1 (klucze nienaruszone) |
| KV | nie wymaga migracji wstecz |

---

## 8. Runtime IK — nie zmieniać

| Helper / host | P1 |
|---------------|-----|
| `isIkP2DocumentsBoqActive()` := Entry | **KEEP** (08-P0) |
| `IkEntryHost` ingest `useEffect` | **KEEP** |
| P5/P6/P7/P8 `isIkP*Active()` | **KEEP** |
| Research `=== true` | **KEEP** |
| P4 `isIkP4Chief*` | **KEEP** (nie fold) |
| D / Chief Dual Outcome | **KEEP** |

Ukrycie UI **nie** zmienia tego, co biegnie przy IK ON + enum AUTO.

---

## 9. A05–A08 — nie naruszyć

| Slice | Contract to keep |
|-------|------------------|
| A05 | `"AUTO"\|"OFF"\|"ON"` · B-POLICY · Research CONDITIONAL |
| A06 | P7 READ-ONLY · no new BOQ gate |
| A07 | P8 READ-ONLY prepare · D not flipped |
| 08-P0 | IK ON ⇒ Documents→BOQ · leftover ingest not a gate |

Harnessy A05–A07 muszą **PASS**. `data-ik-*-mode` / `data-ik-*-toggle` **zostają w DOM** (ukryta sekcja).

---

## 10. Exact UI target (Super Admin ⚙ · Moduły)

**Pierwszy ekran (biznes):**

```text
Moduły
  Przetargi                          [checkbox]   tendersTabForStaffEnabled
  Rysunki WM / Szkice                [istniejące, poza P1]
  Expert AI · Przebieg i Decydent    [checkbox]   D · HARD STOP · nie etap IK
  Inteligentny Kosztorysant          [checkbox]   ikEntryEnabled
      copy: IK ON = autonomiczna analiza przetargu
            (dokumenty → BOQ oraz kolejne etapy IK).
            OFF = automatyzacja IK wyłączona.
```

**Poniżej, zwinięte domyślnie:**

```text
▶ TECHNICAL / ADVANCED / EMERGENCY
  (nie są codziennym workflow)
  P3 Identity Coverage
  P4 Chief Wiring
  P5 Labor AUTO|ON|OFF + Research MODE B
  P6 Material AUTO|ON|OFF + Research MODE B
  P7 F5/Bid AUTO|ON|OFF
  P8 Risk/Decision AUTO|ON|OFF
```

Zwykły Administrator: **zero zmian** (brak ⚙).

**Nie implementować UI w tej turze.**

---

## 11. Exact file scope (gdy Owner GO → DF → IMPLEMENT)

| File | P1 implement (later) |
|------|----------------------|
| `src/app/AdminSettingsModal.tsx` | **TAK** — layout/copy/accordion only |
| `src/app/changelog-data.ts` + `CHANGELOG.md` | **TAK** — bump gdy UI |
| `src/lib/app-settings.ts` | **NIE** (chyba że komentarz DF) |
| `src/lib/intelligent-estimator/ik-entry-flag.ts` | **NIE** |
| `src/app/intelligent-estimator/IkEntryHost.tsx` | **NIE** |
| `src/app/TenderDetailPage.tsx` | **NIE** |
| `src/lib/admin-auth.ts` | **NIE** |
| silniki P5–P8 / ingest | **NIE** |
| `scripts/test-ik-autonomy-05/06/07*.mjs` | tylko jeśli `data-*` znikną — **unikać** |

Unrelated WIP: **nie stage'ować**.

---

## 12. Test scope (later implement)

| Suite | Expect |
|-------|--------|
| `test-ik-autonomy-08-p0-documents-boq.mjs` | **61/0** · T24/T25 Entry toggle + copy |
| A05 / A06 / A07 | **PASS** · `data-ik-*-mode` nadal w DOM |
| P1-entry / P2 / P3 implementation | **PASS** |
| Nowy smoke P1 | assert: P3–P8 **nie** w primary Moduły · są w Advanced · `data-ik-entry-toggle` primary · **brak** `data-ik-auto-ingest-toggle` |
| E2E Playwright | **nie wymagany** jeśli smoke DOM wystarczy |

Write audit implement: **0** settings/KV.

---

## 13. Mixed-client / hydration

| Client | Behavior |
|--------|----------|
| Stary bundle (przed P1 UI) | nadal pokazuje P3–P8 na pierwszym ekranie · **te same klucze** |
| Nowy bundle | primary = IK + Przetargi + D · Advanced = P3–P8 |
| Merge | **UNCHANGED** · OFF wins · leftover ingest ignored by P2 |
| Staff bez ⚙ | bez zmian |

Brak konfliktu schematu. Brak dual-write.

---

## 14. Rollback plan

1. **UI:** revert commita P1 → stary layout Moduły; KV nienaruszone.  
2. **Runtime:** IK OFF albo stage OFF w Advanced (jeśli commit P1 już na prod).  
3. **Nie** rollback-ować 08-P0 / A05–A07 razem z P1.  
4. **Nie** `git add -A`.

---

## MUST NOT (implement later still bound)

- new flag / engine / orchestrator / `\|\| true`  
- Research-on-miss  
- Accept / Price Commit / Final Bid UX  
- Identity Gap Owner Gate UI  
- P4 fold-into-IK  
- D flip / D hide-as-IK-stage  
- KV migration  
- panel dla roli `admin`  
- restore AUTO_INGEST checkbox  

---

## Recommended next

```text
NEXT = DESIGN FREEZE 08-P1
     = UI-only: primary IK switch + Advanced accordion
     ONLY AFTER Owner GO on this PLAN

ARCH REVIEW    = after DF
IMPLEMENT      = after Arch Review PASS
```

---

## Status

```text
OWNER REVIEW = PASS
PLAN         = READY FOR OWNER GO → DF
CODE         = ZERO
SETTINGS     = ZERO
UI CODE      = ZERO
COMMIT       = NOT DONE
PUSH         = NOT DONE
DEPLOY       = NOT DONE
DESIGN FREEZE= NOT CREATED
ARCH REVIEW  = NOT DONE
IMPLEMENT    = NOT AUTHORIZED
P0           = COMPLETE / CLOSED
P1           = PLAN ONLY
```
