# PAYROLL-CLOUD-RESURRECTION-01 — PLAN

> **Status:** PLAN · AUDIT ONLY · **NIE implementować** bez Owner GO  
> **Wejście:** [`PAYROLL-CLOUD-RESURRECTION-01-RCA.md`](./PAYROLL-CLOUD-RESURRECTION-01-RCA.md)

---

## 1. Cel

Uniemożliwić **ponowne zasianie Cloud KV** bogatym live rosterem / klonem archive 20–25 po **intencjonalnym** clear (recovery / admin empty week), bez niszczenia ochrony REGRESSION-03/04 (anti wipe przy mount-race).

---

## 2. Strategia (propozycja — do zamrożenia w DF)

### Opcja R1 (preferowana) — Intentional empty cloud wins

Gdy cloud `kw-week-employees=[]` **oraz** cloud week keys = current **oraz** (brak bogatego archive current **lub** jawny recovery marker / tombstone week):

- **nie** wybieraj local rich w `mergeWeekEmployeesForWeekRange` pick_side  
- **nie** `bootstrapMergedShouldPush` local→cloud dla rosteru  
- opcjonalnie: cloud empty + local rich → **nadpisz LS cloudem** (persist empty), nie odwrotnie

### Opcja R2 — Archive deleted tombstone dla week key

Przy recovery: dodaj `weekFrom|weekTo` lub snapshot `id` do `kw-archive-deleted-ids` i egzekwuj w `mergeArchive` **oraz** Edge `mergeArchiveUnion` (dziś Edge nie zna tombstone archive).

### Opcja R3 — Recovery epoch / fence

KV `kw-payroll-recovery-epoch` (timestamp). Bootstrap push zabroniony jeśli `local.rosterRichness` pochodzi sprzed epoch (wymaga metadanych LS).

**PLAN rekomenduje R1 + R2** (minimalny blast radius).

---

## 3. Kroki IMPLEMENT (po Owner GO + DF)

| # | Etap |
|---|------|
| 1 | DF ACK · unit: empty-cloud vs rich-local (nie push 14) |
| 2 | `mergeWeekEmployeesForWeekRange` — nie pick local gdy cloud intentional empty |
| 3 | `bootstrapMergedShouldPush` — gate anty-resurrection |
| 4 | Recovery playbook: tombstone archive week id + clear live + **wszystkie sesje hard refresh** |
| 5 | Test: `test-payroll-cloud-resurrection-01.mjs` |
| 6 | Regresja 03/04 + ROLL-001 |

**Zakaz domyślny:** zmiana PWRB API shape, Edge merge SSOT B4 poza tombstone archive.

---

## 4. Operacyjny workaround (bez kodu) — do Ownera

1. Ponów DATA RECOVERY (clear live + drop 20–25).  
2. **Natychmiast:** zamknij wszystkie inne karty/urządzenia zalogowane do wgdom.fun **albo** hard refresh + wyczyść LS payroll keys na każdej sesji.  
3. Dopiero potem otwieraj Liste Płac.  
4. Nie polegaj na samym clear KV przy żywych sesjach ze starym LS.

---

## 5. Acceptance (po IMPLEMENT)

| # | PASS |
|---|------|
| A1 | Po clear cloud: bootstrap stale-local **nie** pushuje 14 |
| A2 | Archive tombstoned 20–25 **nie** wraca z local merge |
| A3 | REGRESSION-03/04 nadal PASS |
| A4 | ROLL-001 align vs rollover bez regresji |

---

## 6. Status

```text
PLAN READY
IMPLEMENT: BLOCKED — czekaj Owner GO + DF
```
