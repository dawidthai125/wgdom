# PAYROLL-INCIDENT-01 — AUDIT / RCA

> **ID:** PAYROLL-INCIDENT-01  
> **STATUS:** AUDIT COMPLETE · **P0**  
> **Owner GO:** AUDIT ONLY  
> **Data audytu:** 2026-07-24  
> **Incydent:** ~2026-07-24 · Piotrek Ukraina · bieżący tydzień 0h  
> **Poza zakresem:** implementacja · commit · push · migracje · zmiany kodu / Cloud Sync / Payroll  
> **Production tip:** UI **2.65.40** · commit tip **`fcf66b0`** · feature baseline **`23d7723`**

```text
══════════════════════════════════════
PAYROLL-INCIDENT-01 AUDIT

Dane:     FIZYCZNIE w Cloud (nie tylko UI)
Zakres:   ≥2 osoby w live (nie cały tydzień)
Week:     2026-07-20…2026-07-25 (poprawny)
Piotrek:  active=false · 0h · times 07:00–16:00 (defaultDay)
Stamp:    dataUpdatedAt 2026-07-24T09:29:17.795Z (≈11:29 CEST)
Prev week archive: Piotrek 45h / 5 dni — NIENARUSZONE
══════════════════════════════════════
```

---

## 0. Evidence (read-only Cloud KV probe)

Probe: `.tmp/payroll-incident-01-kv-probe.mjs` · artifact `.tmp/payroll-incident-01-kv-probe.json`  
Deep: `.tmp/payroll-incident-01-kv-probe-deep.mjs` · **batch-get only** (zero writes).

| Pole | Wartość (2026-07-24T12:04Z probe) |
|------|-----------------------------------|
| Live `kw-weekFrom` / `To` | **2026-07-20** / **2026-07-25** (bieżący Pn–So) |
| Live roster count | **14** |
| Z godzinami | **12** · sumarycznie **~541.5 h** |
| **Bez godzin** | **2:** `Piotrek Ukraina`, `Tomek Od Lukasza` |
| Piotrek `directoryId` | `dir-1` |
| Piotrek `id` | `ddb67d99-ece6-45d1-a624-42bf7caa6447` |
| Piotrek hours | **0** · `activeDays` **0** |
| Piotrek `dataUpdatedAt` | **`2026-07-24T09:29:17.795Z`** |
| Piotrek `days.*` | wszystkie Pn–So: **`active: false`**, `from: "07:00"`, `to: "16:00"` (= `defaultDay()`) |
| Archive `2026-07-13…18` | Piotrek **45h / 5 activeDays** — **OK** |
| `kw-week-employees-prev` | ten sam Piotrek 0h + ten sam `dataUpdatedAt` |

**TimeEntries:** w modelu LP **nie istnieją** — SSOT godzin = `kw-week-employees[].days`.

**IndexedDB:** payroll **nie** jest SSOT (IDB = inne domeny).

---

## 1. Findings

### F1 — Dane nie są „tylko ukryte w widoku”
Cloud KV live zawiera Piotra z **wyzerowanymi / nieaktywnymi dniami**. UI pokazujący 0h jest **zgodny** ze stanem Cloud (`resolvePayrollDisplayEmployees` → live roster).

### F2 — Nie jest to wipe całego tygodnia / całego rosteru
12/14 osób nadal ma godziny. Archiwum poprzedniego tygodnia (**2026-07-13…18**) ma Piotra z **45h**.

### F3 — Dotknięci: co najmniej 2 pracownicy live
`Piotrek Ukraina` + `Tomek Od Lukasza` (0h). Incydent **nie** jest wyłącznie jednoosobowy.

### F4 — Wzorzec dni = `defaultDay()`, nie „puste usunięcie rekordu”
Zachowane `07:00–16:00` przy `active:false` na wszystkich dniach = typowe dla:
- `defaultDay()` / `stripWeekEmployeeHours` / re-seed kartoteki, **albo**
- UI odznaczenia `active` przy domyślnych godzinach.

### F5 — Cloud jest SSOT stanu 0h; synchronizacja telefonu jest konsekwencją
`dataUpdatedAt` wspólny w live + `-prev` ⇒ był **domain push** (lub inny `batch-set` z `replaceWeekEmployeesKeys`) wypychający ten stan. Telefon najpierw lokalnie „częściowy”, potem pull → ten sam Cloud.

### F6 — Week keys **nie** przesunęły się błędnie
Live = bieżący tydzień kalendarzowy. Nie wygląda na „patrzymy na zły tydzień”.

### F7 — Wykluczone jako primary (przy obecnym stanie Cloud)
| Hipoteza | Dlaczego słaba |
|----------|----------------|
| Pełny rollover `setWeekEmployees([])` | Roster nadal 14; inni mają godziny |
| Resurrection fence (empty Cloud → wipe all) | Cloud live **niepusty**; fence wymaga `cloudEmps.length === 0` |
| Display-only bug | Cloud fizycznie 0h / inactive |
| Brak TimeEntries / IDB | Nie są SSOT LP |

---

## 2. Chronologia (odtworzona)

```text
~07:30 CEST  User report: Piotrek bieżący tydzień 5×9h = 45h (local/UI)
     │
     │  (okno kilku godzin — brak logów Edge body w tym AUDIT)
     │
~11:29 CEST  dataUpdatedAt = 2026-07-24T09:29:17.795Z
             Live Cloud: Piotrek days all active=false (default times)
             (+ Tomek Od Lukasza też 0h w probe)
             Domain push / batch-set → KV SSOT + rotacja *-prev
     │
     │  Desktop: pokazuje 0h (live state)
     │  Telefon: lokalnie jeszcze częściowo stare dni (~1h)
     │
     ▼
Pull / focus / auto-sync telefonu → merge przyjmuje Cloud
             → oba urządzenia 0h current week
     │
     ▼
Poprzedni tydzień (archive 13–18): Piotrek 45h — bez zmian
```

**Uwaga:** tip `version.json` ma timestamp `07:36:58Z` (~09:37 CEST) — deploy docs tip `fcf66b0`; **to tooling/docs**, nie zmiana semantyki Payroll feature `23d7723`. Nie dowodzi przyczyny wipe, ale wpisuje się w okno poranka.

---

## 3. Root Cause (stan na AUDIT)

### Najbardziej prawdopodobna klasa przyczyny (bez pełnych logów Edge)

**RC-WORKING:** W live `kw-week-employees` dla Piotra (i Tomka) zapisano rekord z **`days` w stanie defaultDay / inactive**, z nowym `dataUpdatedAt`, a następnie **Cloud domain push** rozpropagował to na wszystkie urządzenia.

**Dokładny trigger UI vs automat (strip / merge LWW / ręczny clear) — NIE POTWIERDZONY logiem**, bo brak capture Network/Edge body z chwili 09:29Z.

### Potwierdzone fakty vs domysły

| Potwierdzone (KV) | Domysł (kod możliwy) |
|-------------------|----------------------|
| Dane w Cloud = 0h / inactive | Ścieżka: edycja LP → `commitLivePayrollRosterEdit` → domain push |
| Stamp 09:29Z | Lub `stripWeekEmployeeHours` w merge przy mismatch week (mniej pasuje — week keys OK) |
| Prev week archive OK | Lub LWW: nowszy rekord z inactive days |
| ≥2 osoby | Świadomy clear / błąd operatora / bug batch |

---

## 4. Hipotezy (prawdopodobieństwo)

| ID | Hipoteza | P | Uzasadnienie |
|----|----------|---|--------------|
| **H-A** | Domain push po lokalnym wyzerowaniu/odznaczeniu dni (UI lub skrypt) dla 1–2 osób | **HIGH** | Wzorzec `defaultDay`; stamp; sync multi-device; reszta rosteru OK |
| **H-B** | LWW: Cloud/local rekord z nowszym `dataUpdatedAt` i `active:false` nadpisał 45h | **MEDIUM** | `pickDaysByTimestamps` — nowszy wygrywa nawet przy clear |
| **H-C** | `stripWeekEmployeeHours` w merge week-range | **LOW–MED** | Week keys live wyglądają poprawnie; strip zwykle przy mismatch |
| **H-D** | Resurrection fence / full empty Cloud | **VERY LOW** | Cloud niepusty; 12 osób z godzinami |
| **H-E** | Fałszywy rollover clear całego tygodnia | **VERY LOW** | Roster nie `[]` |
| **H-F** | Tylko UI / zły tydzień wyświetlania | **VERY LOW** | KV zgodne z UI; week keys OK |
| **H-G** | Deploy tip `fcf66b0` zmienił Payroll | **VERY LOW** | Commit docs/tooling; feature nadal 01A |

---

## 5. Dotknięte moduły

| Moduł | Rola w incydencie |
|-------|-------------------|
| **Lista Płac** (`kw-week-employees`) | SSOT godzin; stan 0h |
| **Cloud Sync domain push** | Propagacja stanu na urządzenia |
| **batch-get / batch-set** | Odczyt/zapis KV (probe potwierdza get) |
| **Archive** (`kw-archive`) | Poprzedni tydzień OK — nie dotknięty wipe’em live |
| **CloudLoader / runCloudSync RS** | RS **nie** pushuje payroll (S1-1); pull mógł tylko **ściągnąć** już zły Cloud |
| Roboty / TimeEntries / IDB | Nie SSOT tego przypadku |

Kluczowe miejsca kodu (dowód mechaniki, nie dowód że dziś strzeliły):

- `src/app/app-domain.ts` — `defaultDay()` `{ active:false, from:"07:00", to:"16:00" }`
- `src/lib/cloud-sync.ts` — `pickDaysByTimestamps`, `stripWeekEmployeeHours`, `mergeWeekEmployeesForWeekRange`
- `src/lib/payroll-domain-sync.ts` — domain push rosteru
- `src/lib/payroll-bootstrap-resurrection-fence.ts` — fence (wykluczony jako primary)
- `src/lib/payroll-display.ts` — live vs archive display

---

## 6. Ocena ryzyka

| Ryzyko | Ocena |
|--------|-------|
| Utrata godzin **Piotra** w live current week | **MATERIALIZOWANE** (Cloud) |
| Utrata **Tomka** (live) | **MATERIALIZOWANE** (0h w probe) |
| Wipe całego tygodnia / wszystkich | **NIE** (stan obecny) |
| Archiwum poprzednich tygodni | **NISKIE** (13–18: 45h OK) |
| Powtórka przy kolejnym domain push / pull | **ŚREDNIE** — dopóki nie znamy triggera |
| Odtwarzalność | **CZĘŚCIOWA** — stan Cloud odtwarzalny; trigger UI/auto **nie** |

**Recovery note (informacyjnie, BEZ EXECUTE w AUDIT):** archiwum **nie** zawiera current week 45h Piotra — tylko poprzedni tydzień 45h. Odzyskanie **porannych** 45h current week wymaga backupu Edge `*-prev*` sprzed 09:29Z lub lokalnego snapshotu urządzenia z ~07:30 — **obecne `-prev` już mają 0h**.

---

## 7. Rekomendacja (AUDIT — bez implementacji)

1. **Owner forensics (read-only):**  
   - potwierdzić kto/co edytowało LP ~11:29 CEST · czy Tomek też zgłoszony  
   - przeszukać logi Edge `batch-set` window 09:20–09:40Z (payload size / replaceWeekEmployees)  
   - sprawdzić drugą kartę / telefon / Worker panel

2. **Nie wznawiać** „naprawy fence/rollover” na ślepo — obecne evidence **nie** wskazuje full wipe.

3. **Opcjonalny epic recovery** (osobne Owner GO):  
   - restore Piotra (i Tomka) z lokalnego backupu / starszego KV snapshot jeśli istnieje poza `-prev`  
   - **nie** kopiować 45h z tygodnia 13–18 jako „current” bez weryfikacji (to inny tydzień)

4. **Follow-up RCA-2 (GO):** włączyć/odzyskać write-trace / Edge access log dla domain push — zamknięcie H-A vs H-B.

5. **Stabilization:** traktować jako **P0 data integrity** Lista Płac — osobno od HARDENING-DASHBOARD.

---

## 8. Odpowiedzi na pytania Ownera

| # | Pytanie | Odpowiedź |
|---|---------|-----------|
| 1 | Czy dane zniknęły z bazy? | **Live Cloud:** godziny Piotra **nieaktywne / 0h** (rekord osoby **jest**). Archiwum prev week **ma** 45h. |
| 2 | Czy tylko z widoku? | **NIE** — KV zgodne z UI. |
| 3 | Czy Cloud pobrał błędny stan? | Urządzenia **tak** (pull po fakcie). Pierwotnie ktoś **wypchnął** stan 0h. |
| 4 | Czy Cloud wysłał błędny stan? | **TAK** — live KV jest SSOT 0h; domain push najpewniej. |
| 5 | Najbardziej prawdopodobna przyczyna? | **H-A/H-B:** lokalne wyzerowanie/inactive days + **domain push** @ ~09:29Z (nie full week wipe). |
| 6 | Logi / kod? | Probe KV · `defaultDay` · LWW `pickDaysByTimestamps` · domain push; **brak** body logu Edge w tym AUDIT. |
| 7 | Ryzyko innych pracowników? | **TAK materialne dla Tomka**; reszta live OK; pełny wipe — nie teraz. |
| 8 | Odtwarzalny? | Stan **tak**; trigger **nie** bez dodatkowych logów. |

---

## 9. Owner Readiness

```text
OWNER READINESS: AUDIT COMPLETE — READY FOR OWNER DECISION

Next allowed (Owner GO only):
  A) Forensics RCA-2 (Edge logs / device traces) — still AUDIT
  B) Recovery plan (read-only design) — then GO IMPLEMENT recovery
  C) Close as operator-clear / accept data loss for current week hours

Forbidden without GO: code fix · commit · push · KV write / restore execute
```

---

## 10. Raport końcowy (Owner card)

### 1. Findings
Cloud live **fizycznie** ma Piotra (i Tomka) na **0h / inactive days**; tydzień keys OK; prev archive **45h OK**; nie display-only; nie wipe całego rosteru.

### 2. Chronologia
07:30 45h → ~11:29 CEST stamp zero → desktop 0h → telefon dogonił Cloud.

### 3. Root Cause
**Working:** inactive/`defaultDay` days + domain push do Cloud. **Trigger UI vs auto — niezamknięty.**

### 4. Hipotezy
H-A HIGH · H-B MED · fence/rollover/display VERY LOW.

### 5. Dotknięte moduły
Lista Płac + Cloud domain push/pull · archive nietknięte.

### 6. Ocena ryzyka
P0 lokalne (1–2 osoby) · archiwum safe · full-roster wipe nie potwierdzony.

### 7. Rekomendacja
Forensics @09:29Z · nie „fix fence” na ślepo · recovery tylko po GO + źródło sprzed wipe.

### 8. Owner Readiness
**AUDIT COMPLETE** — czekaj na decyzję A/B/C powyżej.
