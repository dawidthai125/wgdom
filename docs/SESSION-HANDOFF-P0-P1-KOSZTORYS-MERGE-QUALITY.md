# SESSION HANDOFF — P0/P1 Kosztorys Merge Quality Protection

> **★★ SSOT** dla agentów AI / Cursor — ochrona snapshotów kosztorysu (ATH / PDF przedmiar) przy synchronizacji pipeline przetargów.  
> **Status:** **CLOSED** (P0 + P1 wdrożone na `main`)  
> **Incydenty zamknięte operacyjnie:** **TP113** (ATH 302 vs formularz 45) · **TP182** (PDF przedmiar vs formularz 55)

---

## 1. Problem biznesowy (root cause)

Stary snapshot `tenderDossier.kosztorys` z **formularza ofertowego XLSX** (45–55 pozycji) mógł wygrać nad poprawnym **ATH** (302 poz.) lub **PDF przedmiarem** zapisanym w cloud KV — **nie** dlatego, że parser był zły, ale dlatego, że merge pipeline wybierał dossier po **`updatedAt` rekordu** lub **sticky `prev`**.

Typowy trigger TP113:

1. Cloud KV ma ATH 302 (po „Przeanalizuj dokumenty”).
2. LocalStorage ma formularz 45 z **nowszym** `updatedAt` (np. po „Odśwież BZP” — `mapBzpToPipelineItem` podbija timestamp).
3. Reload → merge → UI pokazywał formularz 45.

---

## 2. Dwa niezależne merge path (MUSISZ ZNAĆ OBA)

```text
┌─────────────────────────────────────────────────────────────────┐
│  ŚCIEŻKA A — P0 (localStorage ↔ cloud KV)                       │
├─────────────────────────────────────────────────────────────────┤
│  loadTendersPipeline()                                          │
│    → mergeTenderPipelineForCloud(local, cloud)                  │
│    → mergePipelineItem(a, b)          [tenders-sync.ts]         │
│    → mergeTenderDossierByQuality()    [tender-dossier-merge.ts] │
│                                                                 │
│  Także: CloudLoader bootstrap · import backup · mergeTenderDataKey │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ŚCIEŻKA B — P1 (Odśwież BZP, bez odczytu cloud)                │
├─────────────────────────────────────────────────────────────────┤
│  refreshFromBzp() → runBzpMerge()       [useTendersPipeline.ts] │
│    → mapBzpToPipelineItem(n, prev)      [tenders-bzp.ts:491]    │
│    → mergeTenderPipeline(existing, mapped) [tenders-bzp.ts:499] │
│    → mergeTenderDossierByQuality()       [P1 fix]               │
│    → saveTendersPipeline() → LS + KV                            │
└─────────────────────────────────────────────────────────────────┘
```

**P0** naprawia **reload / hydratację z chmury**.  
**P1** naprawia merge gdy **`prev` i `item` mają różne dossier** (quality zamiast `prev ?? item`).

**Ważne:** `mapBzpToPipelineItem` kopiuje `existing?.tenderDossier` → przy standardowym BZP **obie strony mają ten sam dossier**. Po **P0 reload** `baseItems` ma ATH → BZP utrzymuje ATH. Bez reloadu ze starym LS formularz może zostać — **P0 jest wymagany przy pierwszym wejściu**.

---

## 3. Commity prod (main)

| Etap | Commit | Message |
|------|--------|---------|
| **P0** | `4574182` | `fix(sync): protect ATH and PDF kosztorys snapshots during cloud merge` |
| **P1** | `50d7501` | `fix(tenders): quality merge kosztorysu during BZP pipeline refresh` |

**Wersja UI prod:** `2.62.1` (brak osobnego bumpu CHANGELOG dla P0/P1 — fix infra sync).

---

## 4. Kluczowe pliki (tylko te — nie ruszaj parserów)

| Plik | Rola |
|------|------|
| `src/lib/tender-dossier-merge.ts` | **SSOT rankingu** · `pickBetterKosztorys()` · `mergeTenderDossierByQuality()` |
| `src/lib/tenders-sync.ts` | `mergePipelineItem()` — P0 hook |
| `src/lib/tenders-bzp.ts` | `mergeTenderPipeline()` — P1 hook · `mapBzpToPipelineItem()` · `loadTendersPipeline()` |
| `src/app/tenders/strategy/hooks/useTendersPipeline.ts` | `runBzpMerge()` · `refreshFromBzp()` · `updateItem()` (podbija `updatedAt`) |

**Nie zmieniaj bez briefu:** `ath-parser.ts`, `tender-document-resolver.ts`, `tender-cost-discovery.ts`, `tender-dossier-pipeline.ts` (parsery/discovery), Edge, `TenderDetailPanel.tsx`.

---

## 5. Ranking jakości kosztorysu (`tender-dossier-merge.ts`)

Wyższy tier = lepsze źródło:

| Tier | Źródło |
|------|--------|
| 6 | ATH / zip_ath |
| 5 | NOR / zip_nor |
| 4 | PDF przedmiar |
| 3 | ZIP PDF przedmiar |
| 2 | XLSX/XLS/XML kosztorys |
| 1 | Formularz ofertowy (`isFormalOfferCostFilename`) |
| 0 | Brak / `ok: false` |

**Tie-breaker:** `rowCount` → `parsedAt` → stabilny fallback `"a"`.  
**Nie używa** `updatedAt` rekordu pipeline do wyboru kosztorysu.

Klasyfikacja reuse: `classifyCostDocumentType()` + `isFormalOfferCostFilename()` z `tender-cost-discovery.ts`.

---

## 6. Model danych

- `tenderDossier` jest **embed** w `TenderPipelineItem` — klucz KV: `kw-tenders-pipeline`.
- Brak osobnego klucza KV na dossier.
- Snapshot: `tenderDossier.kosztorys` (`TenderKosztorysSnapshot`) — `sourceFilename`, `rowCount`, `parsedAt`, `ok`.

---

## 7. Flow operacyjny (co widzi użytkownik)

### TP113 — poprawny stan po P0+P1

```text
Cloud KV: ATH 302
LS:       Formularz 45 (nowszy updatedAt)

Hard reload
  → loadTendersPipeline()
  → merge jakościowy
  → UI: ATH 302 · LS zapisany z ATH

Odśwież BZP
  → baseItems już ATH
  → mapBzp kopiuje ATH
  → mergeTenderPipeline: ATH zostaje
```

### Ręczna analiza (osobna warstwa — poza P0/P1)

`TenderDetailPanel.runAnalysis()` → `analyzeTenderWithDossier({ existingKosztorys })` — sticky + parser discovery.  
Jeśli parser zwróci gorszy `ok:true` formularz, może nadpisać ATH — to **nie** jest naprawiane przez merge quality (backlog osobny).

---

## 8. Testy (obowiązkowe przed zmianą w tym obszarze)

```bash
npm run build
npx vite-node scripts/test-tender-dossier-merge-quality.mjs   # P0 — 18 testów
npx vite-node scripts/test-tender-bzp-merge-quality.mjs       # P1 — 12 testów
```

| ID | Scenariusz | Oczekiwany wynik |
|----|------------|------------------|
| P0-T1 | LOCAL form 45 (nowszy) vs CLOUD ATH 302 | ATH 302 |
| P0-T1B | LOCAL ATH vs CLOUD form (nowszy) | ATH 302 |
| P1-T1 | prev form vs item ATH | ATH 302 |
| P1-T5 | symulacja runBzpMerge z incoming ATH | ATH 302 |

---

## 9. Pułapki / nie rób tego

| Pułapa | Opis |
|--------|------|
| **Merge po `updatedAt` dla kosztorysu** | Zabronione — regresja TP113 |
| **`prev.tenderDossier ?? item` bez quality** | Zabronione po P1 |
| **Mylenie ścieżek** | P0 = cloud sync · P1 = BZP refresh — oba muszą używać `mergeTenderDossierByQuality` |
| **`mergeTenderPipeline` czyta cloud** | **Nie** — tylko pamięć/LS `baseItems` |
| **Zmiana parserów „przy okazji”** | Out of scope — osobny brief |

---

## 10. Backlog OPEN (poza P0/P1)

| ID | Temat |
|----|-------|
| P2? | Quality guard w `analyzeTenderWithDossier` | **CLOSE** → TP190A (2.62.9) |
| P3? | Auto-invalidacja starych snapshotów (`parserVersion`) | **OPEN** → **TP200A** |

---

## 11. Szybki start dla nowego agenta

```text
1. TEN PLIK
2. docs/ARCHITECTURE.md § 12.1.16
3. src/lib/tender-dossier-merge.ts (cały — ~130 linii)
4. grep mergeTenderDossierByQuality w repo
5. Uruchom oba skrypty testowe (§8)
```

**Hasło:** „kontynuuj WGDOM” + `.cursor/rules/wgdom-stan-projektu.mdc`

---

## 12. Powiązane audyty (read-only, historia)

- `audit/P0-INSPECTOR-AUDIT.md` — nie dotyczy bezpośrednio
- Skrypty diagnostyczne sesji: `scripts/audit-cache-vs-kv-readonly.mjs`, `scripts/audit-write-protection-flow.mjs`

**Werdykt końcowy:** Incydent TP113/TP182 **rozwiązany systemowo** dla ścieżek sync (P0) + BZP merge przy różnych dossier (P1). Wymagany reload po deploy dla naprawy starych LS.
