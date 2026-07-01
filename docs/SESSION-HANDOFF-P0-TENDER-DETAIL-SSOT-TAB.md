# SESSION HANDOFF — P0 Tender Detail Tab SSOT (URL)

> **Status:** **CLOSED** · **prod `f482016`** · **v2.63.8** · **2026-06-30**  
> **Hasło sesji:** „kontynuuj WGDOM”  
> **Kontekst:** NG-03 seria UX (prod 2.63.7 przed hotfixem) · **nie dotyczy** NG-02 Runtime / Pipeline / Pricing / Trust / parserów / Cloud Sync

---

## 1. Problem (RCA)

Po klienckim `navigate()` na zakładkę detalu przetargu (np. Przetarg → Dokumenty):

- **URL** w przeglądarce zmieniał się poprawnie (`/przetargi/:id/dokumenty`),
- **UI** pozostawał na poprzedniej zakładce (`data-tender-tab` nie aktualizował się),
- workspace (np. `TenderDocumentsWorkspace`) nie renderował się.

**Przyczyna:** `TenderDetailPage` brał aktywną zakładkę z prop `tab={v4Detail.tab}` przekazywanego przez `TendersModule`, zamiast z SSOT URL. Prop był „zamrożony” przy pierwszym mount — URL i React state rozjechały się.

**Dodatkowy niuans:** aplikacja używa React Router 7 **bez** pełnego `<Routes>` dla detalu V4 — `useLocation().pathname` może aktualizować się z opóźnieniem względem `window.location` po `navigate()`. Sam parse URL **nie wystarczył** — potrzebny jest krótkotrwały **optimistic `pendingTab`**.

---

## 2. Rozwiązanie (P0 hotfix)

### 2.1 SSOT aktywnej zakładki

```text
useLocation().pathname
  → parseTenderDetailPath()     ← src/lib/tender-detail-routes-v4.ts
  → urlTab
  → activeTab = pendingTab ?? urlTab ?? tabFallback ?? DEFAULT
```

| Warstwa | Źródło | Uwagi |
|---------|--------|-------|
| **SSOT** | URL path | `buildTenderDetailPath` / `parseTenderDetailPath` |
| **Optimistic** | `pendingTab` state | ustawiany w `handleTabChange` / `handleDecyzjaWorkspaceChange` |
| **Fallback** | prop `tab?` | tylko gdy parse zwróci `null` (testy, edge mount) |
| **Decyzja sub-tab** | `location.search` | `parseDecyzjaWorkspaceQuery` — **już było OK** |
| **Legacy embed** | `resolveV4EmbedLegacyWorkspace(activeTab)` | wewnętrzna derivacja, nie prop z modułu |

### 2.2 Sync modułu Przetargi

Gdy użytkownik jest w detalu V4 (`v4Detail` z pathname):

```text
TendersModule useEffect:
  setActiveTab("list")
  saveTendersActiveTab("list")
```

Modułowa zakładka (Lista / Strategia / …) musi być **list**, żeby Provider i URL były spójne — detal to osobna warstwa routingu V4.

**Usunięto:** `tab={v4Detail.tab}` z `<TenderDetailPage>`.

---

## 3. Pliki (SSOT)

| Plik | Rola |
|------|------|
| `src/lib/tender-detail-routes-v4.ts` | **SSOT** slugów URL · parse/build path |
| `src/app/TenderDetailPage.tsx` | `urlTab` + `pendingTab` → `activeTab` · `data-tender-tab` |
| `src/app/tenders/TendersModule.tsx` | `v4Detail` → sync `activeTab=list` |
| `src/lib/tenders-module-nav.ts` | `saveTendersActiveTab` |
| `e2e/audit-p0-tender-freeze.spec.ts` | E2E: URL + `data-tender-tab` + workspace po kliknięciu |
| `scripts/test-p0-tender-detail-ssot-tab.mjs` | Statyczny smoke (12 asercji) |

---

## 4. Pułapki dla przyszłych agentów

1. **Nie przywracać prop `tab` jako wymaganego** — to regresja P0.
2. **Nie usuwać `pendingTab`** bez migracji na pełny `<Routes>` dla V4 — E2E „tab SSOT po klienckim navigate” padnie.
3. **`decyzjaWorkspace`** — query `?ws=qualification|offer`; nie przenosić do props modułu.
4. **`embedV4Workspace`** — pochodzi z `activeTab`, nie z zewnętrznego stanu.
5. **NG-02** — mount hooków pipeline pozostaje wyłącznie w `TenderDetailPage`; ten hotfix **nie zmienia** runtime.

---

## 5. Testy

```bash
npx vite-node scripts/test-p0-tender-detail-ssot-tab.mjs
# E2E (preview :4173 po npm run build):
# PW_BASE_URL=http://127.0.0.1:4173 npx playwright test e2e/audit-p0-tender-freeze.spec.ts
```

| Test | Zakres |
|------|--------|
| `test-p0-tender-detail-ssot-tab.mjs` | 12 PASS — importy, pendingTab, brak `tab=` w module |
| E2E mobile/desktop tab SSOT | URL + atrybut + workspace |
| E2E desktop command ≤280px | **pre-existing FAIL** (299 px) — **poza zakresem** tego hotfixu |

---

## 6. AUDIT propsów (2026-06-30)

| Stan | Źródło | Werdykt |
|------|--------|---------|
| Tab V4 | URL + `pendingTab` | **NAPRAWIONE** |
| `tenderId` | URL parse + fallback prop | OK |
| `decyzjaWorkspace` | `location.search` | OK — bez zmian |
| `embedV4Workspace` | derivacja z `activeTab` | OK — wewnętrznie |
| Moduł `activeTab` | Provider + LS, sync przy `v4Detail` | **NAPRAWIONE** |

Brak innych propsów wymagających migracji URL w tym release.

---

## 7. Release

| Wersja | Commit | Skrót |
|--------|--------|-------|
| **2.63.7** | `00d14d8` | NG-03.7 polish (regresja tabów) |
| **2.63.8** | **`f482016`** | **Ten handoff** — tab SSOT z URL |

**ARCHITECTURE:** § 12.1.27 · **WORKFLOW-ARCHITECTURE-v2.63.md** § 3.2

**Nie zmieniaj bez polecenia:** NG-02 Runtime · Unified Attachment Gate · parsery · merge · Cloud Sync · logika Pricing/Trust.
