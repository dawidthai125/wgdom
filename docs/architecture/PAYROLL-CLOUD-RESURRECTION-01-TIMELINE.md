# PAYROLL-CLOUD-RESURRECTION-01 — TIMELINE

> **AUDIT ONLY** · 2026-07-20 · czasy UTC (z artefaktów `.tmp`)

---

## Oś czasu

| Czas (UTC) | Event | Stan Cloud / dowód |
|------------|-------|---------------------|
| 2026-07-19 **16:12:33** | Archive 13–18 zapisane | SSOT prev week · `id=e6352fc5-…` |
| 2026-07-19 **21:39:05** | Archive 20–25 = klon 13–18 | `id=b7acb87d-…` · forensics 100% |
| 2026-07-19 ~**21:40**–**22:01** | Deploy 2.65.34 (ROLL-001) | kod na prod; dane nadal sklonowane |
| 2026-07-19 **22:07:39** | **DATA RECOVERY APPLIED** | live **0** · 20–25 **usunięte** · 13–18 intact · UI=KV=0 |
| 2026-07-19 ~**22:08**–**22:10** | Owner FINAL VERIFICATION (recovery) | PASS 7/7 (puste live) |
| 2026-07-19 **22:15:18** | DATA SOURCE TRACE | Cloud znowu live **14/587** · 20–25 z powrotem (**ten sam** `id`/`savedAt` 21:39) |
| 2026-07-20 (AUDIT) | RESURRECTION RCA | potwierdzenie A+B+C |

---

## Delta krytyczna

```text
T_recovery = 22:07:39Z  →  Cloud CZYSTY
T_resurrect ≤ 22:15:18Z → Cloud ZNOWU KLON
Δ ≈ 8 minut
```

W tym oknie **nie** było Owner GO na „przywróć dane”.  
Jedyny spójny wektor: **inna sesja klienta** ze starym LS wykonała bootstrap → merge → push.

---

## Co się NIE wydarzyło na osi

- Brak dowodu na ręczne „Zapisz tydzień” przez Ownera jako jedyny wektor (nie wyklucza innej sesji).  
- Brak dowodu na autonomiczny Edge cron bez HTTP batch-set z klienta.  
- ROLL-001 nie tworzy rosteru przy `keys_match_current`.
