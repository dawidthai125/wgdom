# PAYROLL — PR-PAY-S7A · Cloud Sync Frequency Audit · AUDIT

> **Status:** `AUDIT ONLY` · **NO IMPLEMENTATION** · sub-audyt P0 (PR-PAY-S7)
> **Data:** 2026-07-03 · **HEAD `caf46a9`** · Production **DEGRADED** · P0 ACTIVE
> **Cel:** Sprawdzić, czy problem nie wynika z **nadmiernej częstotliwości synchronizacji** (batch-get / batch-set), a nie wyłącznie z `kv.mset` (H1).
> **Powiązane:** [`PAYROLL-PR-PAY-S7-CLOUD-BATCH-500-AUDIT.md`](PAYROLL-PR-PAY-S7-CLOUD-BATCH-500-AUDIT.md)

```text
WNIOSEK: brak nieskończonej pętli w pojedynczej karcie (guardy działają),
ALE potwierdzony ruch redundantny: pełny batch-get na KAŻDY focus/visibilitychange
(bez change-detection) + pełny batch-set 38 kluczy (~391 KB) na KAŻDĄ trywialną zmianę.
To AMPLIFIKATOR H1 (nie osobny root cause). Implementacja: NO GO.
```

---

## 1. Call Graph — triggery synchronizacji

### A. PULL (batch-get + merge + applyAdminDataBundle) — `pullFromCloudAndMerge` (`App.tsx:686`)

```
document "visibilitychange" (tab widoczny)  ─┐  App.tsx:960–962
window     "focus"                           ─┼─▶ pullFromCloudAndMerge()  ─▶ batch-get(~40 kluczy) ─▶ applyAdminDataBundle()
onNativeAppResume (powrót aplikacji natyw.)  ─┘  App.tsx:900–901
```

### B. PUSH (runCloudSync = **najpierw batch-get, potem batch-set**) — `runCloudSync` (`App.tsx:711`)

```
auto-save effect [18 zależności stanu] ─▶ scheduleAutoCloudSync() [debounce 2s]  App.tsx:952–955, 861,885
toggleSettled                          ─▶ setTimeout 400ms                       App.tsx:1603–1608
przycisk „Ponów synchronizację"        ─▶ runCloudSync({toastSuccess})           App.tsx:2037
pendingCloudSyncRef (re-entrancy)      ─▶ runCloudSync()                         App.tsx:771–773
fireDeferredAutoSync (po wygaśnięciu suppress/guard) ─▶ runCloudSync()           App.tsx:802–803
        │
        ▼
runCloudSync: pullAndMergeDataBundle (batch-get ~40) ─▶ applyAdminDataBundle ─▶ pushMergedDataBundleToCloud (batch-set 38) ─▶ push op-notes ─▶ refresh audit-hub aux
```

> **Kluczowe:** każdy `runCloudSync` wykonuje **batch-get + batch-set** (a nie sam push). Auto-save effect zależy od **18 zmiennych stanu** (`App.tsx:955`) — dowolna zmiana (godzina, stawka, dzień, notatka…) planuje pełny cykl.

---

## 2. Frequency Diagram

| Zdarzenie | Operacja sieciowa | Debounce / min-interval | Change-detection |
|-----------|-------------------|-------------------------|------------------|
| `focus` | **batch-get ~40 kluczy** | **BRAK** | **BRAK** |
| `visibilitychange` (widoczny) | **batch-get ~40 kluczy** | **BRAK** | **BRAK** |
| powrót aplikacji natywnej | batch-get ~40 kluczy | BRAK | BRAK |
| dowolna zmiana danych (18 stanów) | batch-get + **batch-set 38 (~391 KB)** | 2s | **BRAK — pełny bundle** |
| toggle „Rozliczony" | batch-get + batch-set 38 | 400ms | BRAK — pełny bundle |
| retry / pending / deferred | batch-get + batch-set 38 | — | BRAK |

**Amplifikacja mobilna:** `focus` **i** `visibilitychange` potrafią wystrzelić **oba** przy jednym powrocie do karty → **2× batch-get**. Klawiatura ekranowa / roleta powiadomień na mobile generują dodatkowe focus/visibility → serie batch-get. Jedyne hamulce PULL: `pullInFlightRef`, `cloudSyncMutationGuard`, `suppressAutoSyncUntilRef` (`App.tsx:687–690`) — **brak minimalnego odstępu czasowego**.

---

## 3. Loop Detection

| # | Ścieżka | Werdykt |
|---|---------|---------|
| **L1** | pull → applyAdminDataBundle (zmiana stanu) → auto-save effect → push | **PRZERWANA (single-tab)** — `scheduleAutoCloudSync`/`fireDeferredAutoSync` sprawdzają `remoteMergeInFlightRef.current` (true w trakcie apply) → skip; dodatkowo `suppressAutoSyncUntilRef = now + 4500` (`App.tsx:511, 780, 826`). **Brak nieskończonej pętli.** |
| **L2** | `applyAdminDataBundle` ustawia **wszystkie** klucze lokalne nowymi referencjami przy **każdym** pull (`App.tsx:515–547`) | **REDUNDANCJA** — każdy pull wymusza re-render + zapis całego datasetu do localStorage i przebieg auto-save effect (push wygaszony, ale narzut realny). `useLocalStorage` porównuje tylko `Object.is` (`useLocalStorage.ts:26`) — nowa referencja zawsze „różna". |
| **L3** | cross-tab: `applyAdminDataBundle` → `localStorage.setItem` → **inna karta** `storage` listener (`useLocalStorage.ts:37`) → `setState` → auto-save tej karty (`remoteMergeInFlightRef=false` w tamtej karcie) → push | **PLAUSIBLE (≥2 karty)** — możliwy ping-pong pull↔push między kartami; nie zabezpieczony `remoteMergeInFlightRef` (per-karta). Wymaga potwierdzenia reprodukcją. |

---

## 4. Evidence

| # | Obserwacja | Plik / linia |
|---|------------|--------------|
| **F1** | PULL na `focus` **i** `visibilitychange`, bez debounce/min-interval/change-detection | `App.tsx:959–975` |
| **F2** | `runCloudSync` = batch-get (`pullAndMergeDataBundle`) **+** batch-set (`pushMergedDataBundleToCloud`) | `App.tsx:737–748` |
| **F3** | Auto-save effect zależny od **18 zmiennych** → dowolna zmiana planuje sync | `App.tsx:952–955` |
| **F4** | `pushMergedDataBundleToCloud` zawsze wysyła **38 kluczy / cały bundle** (brak diff po kluczu) | `cloud-sync.ts:2576–2594` |
| **F5** | `computeMergedDataBundle` (pull) pobiera `...keys` + 10× deleted-ids = **~40 kluczy** przy każdym pull | `cloud-sync.ts:2503–2514` |
| **F6** | `fetchKeysFromCloud` (batch-get) **bez ETag / If-None-Match** — zawsze pełny transfer | `cloud-sync.ts:2631–2645` |
| **F7** | Guardy PULL nie mają minimalnego odstępu (tylko in-flight / guard / suppress) | `App.tsx:687–690` |
| **F8** | Loop L1 wygaszony przez `remoteMergeInFlightRef` + `suppressAutoSyncUntilRef` (4.5s) | `App.tsx:511–512, 780, 826, 954` |
| **F9** | Cross-tab storage listener bez wygaszenia merge → L3 | `useLocalStorage.ts:36–43` |

**Odpowiedź na pytanie audytu:** TAK — **batch-get wykonuje się bez zmian danych** (każdy focus/visibility), a **batch-set wysyła cały bundle nawet przy trywialnej zmianie**. To zwiększa częstotliwość i rozmiar zapisów → **podnosi prawdopodobieństwo/tempo batch-set 500 (H1)**, ale samo w sobie nie jest udowodnionym samodzielnym root cause (brak dowodu request-rate z produkcji).

---

## 5. Relacja do H1

- Częstotliwość **nie zastępuje** H1 — **wzmacnia** ją: więcej pełnych batch-set (~391 KB, 38 kluczy) na jednostkę czasu → większa szansa na *statement timeout* `kv.mset`.
- Potwierdzenie wymaga tych samych danych OBSERVATION (B1–B9) **+** liczby żądań `batch-get`/`batch-set` w oknie incydentu (Edge request count).

---

## GO / NO-GO

| Etap | Status |
|------|--------|
| **AUDIT S7A** | **COMPLETE** (analiza statyczna) |
| **Loop (infinite)** | **NIE potwierdzona** — single-tab guardy działają |
| **Ruch redundantny** | **POTWIERDZONY** — pełny batch-get/​batch-set bez change-detection |
| **IMPLEMENT** | **NO GO** — P0 freeze; do Root Cause Confirmation + owner command |

**Rekomendacja (do Design Freeze S7, bez implementacji):**
- **R1** — change-detection/diff przed push: wysyłać **tylko zmienione klucze**, nie cały 38-kluczowy bundle (adresuje F4, wzmacnia mitigację H1). → rozszerza **S7-4**.
- **R2** — debounce + minimalny odstęp na PULL z focus/visibility; scalić `focus`+`visibilitychange` w jeden trigger (adresuje F1, F7). → **S7-4**.
- **R3** — ETag / hash (`kw-admin-hash`?) na batch-get: pull tylko gdy zmiana po stronie chmury (adresuje F6). → nowy pod-slice **S7-4a** (do decyzji).
- **R4** — wygaszenie cross-tab L3 (`remoteMergeInFlightRef` / znacznik źródła storage-event) (adresuje F9). → **S7-4**.

**Decyzja:** **NO GO** na implementację. Ustalenia S7A dołączyć do zakresu **S7-4** w design freeze PR-PAY-S7. Priorytet root-cause pozostaje **H1** (OBSERVATION). Żadnych nowych EPIC-ów / WC-P3.3 S4 do zamknięcia P0. One Bundle = One Goal.

---

*SSOT sub-audytu PR-PAY-S7A: ten plik · bez zmian kodu · commit wyłącznie dokumentacyjny.*
