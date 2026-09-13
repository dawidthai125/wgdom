/**
 * ChatGPT external research verified KNR pack for TPI/729 — data only.
 * GPT = EXTERNAL EXPERT DISCOVERY · not runtime authority · not OUR RATE.
 */

export type ChatgptKnrSourceType =
  | "OFFICIAL_PUBLIC_TENDER_DOCUMENT"
  | "GOVERNMENT"
  | "BIP"
  | "PUBLIC_INSTITUTION"
  | "PUBLIC_PDF"
  | "SECONDARY_WEB_INDEX";

export type ChatgptKnrVerifiedSource = {
  sourceUrl: string;
  sourceType: ChatgptKnrSourceType;
};

export type ChatgptKnrVerifiedRecord = {
  tableCode: string;
  canonicalDisplay: string;
  catalogFamilyPrefix: string;
  description: string;
  unit: string;
  semanticTokens: readonly string[];
  aliases: readonly string[];
  alternateFamilies?: readonly string[];
  sources: readonly ChatgptKnrVerifiedSource[];
  notes?: string;
};

export const CHATGPT_KNR_RESEARCH_TPI729_VERIFIED: readonly ChatgptKnrVerifiedRecord[] =
  Object.freeze([
    {
      tableCode: "0815-04",
      canonicalDisplay: "KNR 2-02 0815-04",
      catalogFamilyPrefix: "KNR 2-02",
      description: "Wewnętrzne gładzie gipsowe dwuwarstwowe na ścianach",
      unit: "m2",
      semanticTokens: Object.freeze([
        "gładzie",
        "gładzie gipsowe",
        "dwuwarstwowe",
        "ściany",
        "wewnętrzne",
      ]),
      aliases: Object.freeze(["0815/04"]),
      sources: Object.freeze([
        {
          sourceUrl:
            "https://www.poznan.uw.gov.pl/system/files/przetargi/zalacznik_nr_4.2_przedmiar_14.pdf",
          sourceType: "OFFICIAL_PUBLIC_TENDER_DOCUMENT",
        },
      ]),
      notes:
        "TPI729-48-RESIDUALS-V1: labor norm 0.5093 r-g/m2 · BIP Obornicki Evidence 13.15013 PLN/m2 → AUT-R1 CURRENT 13.15 AUTO_R1 (2.66.200) · historical estimate PLN = Evidence only via contract · ≠ 0815-05 · no r-g×national rate",
    },
    {
      tableCode: "0815-05",
      canonicalDisplay: "KNR 2-02 0815-05",
      catalogFamilyPrefix: "KNR 2-02",
      description:
        "Wewnętrzne gładzie gipsowe jednowarstwowe na sufitach z elementów prefabrykowanych i betonów wylewanych",
      unit: "m2",
      semanticTokens: Object.freeze([
        "gładzie",
        "gładzie gipsowe",
        "jednowarstwowe",
        "sufitach",
        "wewnętrzne",
        "prefabrykowanych",
      ]),
      aliases: Object.freeze(["0815/05", "0815-05"]),
      sources: Object.freeze([
        {
          sourceUrl:
            "https://bazakonkurencyjnosci.funduszeeuropejskie.gov.pl/api/files/727895",
          sourceType: "GOVERNMENT",
        },
        {
          sourceUrl:
            "https://docplayer.pl/29520447-Przedmiar-lp-podstawa-opis-i-wyliczenia-j-m-poszcz-razem-1-magazyn-nr-1-wykucie-z-muru-oscieznic-drewnianych-o-powierzchni-do-2-m2-szt.html",
          sourceType: "OFFICIAL_PUBLIC_TENDER_DOCUMENT",
        },
        {
          sourceUrl: "https://www.bip.krakow.pl/plik.php?mode=shw&new=t&wer=0&zid=134490",
          sourceType: "BIP",
        },
      ]),
      notes:
        "CEILING_SINGLE_LAYER_GYPSUM_SKIM — MUST NOT collapse to 0815-04 (ściany) or 0815-06 (sufity dwuwarstwowe); MATERIAL mat.gladz_gipsowa ≠ this labor identity; TECHNOLOGY LABOUR (BIP Kraków kosztorys nakładowy 0815/05): Tynkarze III 0.3902 + Cieśle II 0.0361 + Robotnicy I 0.0112 = 0.4375 r-g/m2 — hours are technology norms NOT OUR RATE PLN",
    },
    {
      tableCode: "1205-09",
      canonicalDisplay: "KNNR 2 1205-09",
      catalogFamilyPrefix: "KNNR 2",
      description: "Posadzki z paneli podłogowych",
      unit: "m2",
      semanticTokens: Object.freeze(["posadzki", "panele", "podłogowych", "prospanel"]),
      aliases: Object.freeze(["1205/09"]),
      sources: Object.freeze([
        {
          sourceUrl: "https://www.gov.pl/attachment/bfce9db3-9dba-46d1-b28f-f9782eb51260",
          sourceType: "GOVERNMENT",
        },
        {
          sourceUrl:
            "https://bip.karlino.pl/fileadmin/bip_files/umkarlino/Koszalinska_2.2_Przedmiar.pdf",
          sourceType: "BIP",
        },
      ]),
      notes:
        "TPI729-48-RESIDUALS-V1: labor norm 0.96 r-g/m2 · NO labor-only PLN/m2 · live ACLC id cw.knr.knnr-2.1205-09.m2 (KNNR 2) · REJECT GO proposal cw.knr.knr-2-02.1205-09.m2 · no 0.96×hourly",
    },
    {
      tableCode: "0411-08",
      canonicalDisplay: "KNNR 5 0411-08",
      catalogFamilyPrefix: "KNNR 5",
      description: "Demontaż / montaż fundamentu prefabrykowanego pod słup (konteksty)",
      unit: "szt",
      semanticTokens: Object.freeze([
        "fundament",
        "prefabrykowanego",
        "słup",
        "demontaż",
        "montaż",
        "progu",
      ]),
      aliases: Object.freeze(["0411/08"]),
      sources: Object.freeze([
        {
          sourceUrl: "https://www.mzzl.pl/newsfile/TZmfmuzcthXMuBGz.pdf",
          sourceType: "PUBLIC_PDF",
        },
      ]),
      notes:
        "Same code, multiple contextual descriptions — matching must not require exact description equality",
    },
    {
      tableCode: "0158-03",
      canonicalDisplay: "KNR 9-10 0158-03",
      catalogFamilyPrefix: "KNR 9-10",
      description:
        "Ścianki działowe — cegły wapienno-piaskowe / SILIKAT 12 cm — zaprawa klejowa",
      unit: "m2",
      semanticTokens: Object.freeze([
        "ścianki",
        "działowe",
        "silikat",
        "cegieł",
        "klejowej",
      ]),
      aliases: Object.freeze(["0158/03"]),
      sources: Object.freeze([
        {
          sourceUrl:
            "https://nowybip.plock.eu/zp/5454/P%C5%82ock-przedmiar%20br.%20budowlana%20%20pdf.pdf",
          sourceType: "BIP",
        },
        {
          sourceUrl: "https://slaski-ozpzd.pl/wp-content/uploads/2025/03/Przedmiar-K.pdf",
          sourceType: "PUBLIC_PDF",
        },
      ]),
      notes: "Family is KNR 9-10 — do not infer family from chapter number alone",
    },
    {
      tableCode: "1215-04",
      canonicalDisplay: "KNR 4-01 1215-04",
      catalogFamilyPrefix: "KNR 4-01",
      description: "Mycie po robotach malarskich okien zespolonych",
      unit: "m2",
      semanticTokens: Object.freeze(["mycie", "okien", "malarskich", "zespolonych"]),
      aliases: Object.freeze(["1215/04"]),
      sources: Object.freeze([
        {
          sourceUrl:
            "https://www.nfz-katowice.pl/dokumenty/16/przedmiar_robot_zweryfik-4pn2015.PDF",
          sourceType: "PUBLIC_INSTITUTION",
        },
        {
          sourceUrl:
            "https://zmsp.warszawa.pl/wp-content/uploads/2025/08/jelonek_03_przedmiar.pdf_1100178.pdf",
          sourceType: "PUBLIC_INSTITUTION",
        },
      ]),
    },
    {
      tableCode: "0829-01",
      canonicalDisplay: "KNR 2-02 0829-01",
      catalogFamilyPrefix: "KNR 2-02",
      description: "Licowanie ścian płytkami na klej - przygotowanie podłoża",
      unit: "m2",
      semanticTokens: Object.freeze([
        "licowanie",
        "płytkami",
        "klej",
        "przygotowanie",
        "podłoża",
      ]),
      aliases: Object.freeze(["0829/01"]),
      sources: Object.freeze([
        {
          sourceUrl: "https://ins.lukasiewicz.gov.pl/BIP/doc/2015-NO33-SIWZ.pdf",
          sourceType: "PUBLIC_INSTITUTION",
        },
        {
          sourceUrl: "https://www.spwsz.szczecin.pl/files/3511_zalacznik-nr-1a-do-siwz-p.pdf",
          sourceType: "PUBLIC_INSTITUTION",
        },
      ]),
    },
    {
      tableCode: "0829-03",
      canonicalDisplay: "KNR 2-02 0829-03",
      catalogFamilyPrefix: "KNR 2-02",
      description: "Licowanie ścian płytkami na klej (warianty wymiarów / metoda)",
      unit: "m2",
      semanticTokens: Object.freeze([
        "licowanie",
        "płytkami",
        "klej",
        "kombinowaną",
        "10x10",
        "20x20",
      ]),
      aliases: Object.freeze(["0829/03"]),
      alternateFamilies: Object.freeze(["KNR 0-12"]),
      sources: Object.freeze([
        {
          sourceUrl: "https://zos.koszalin.ibip.pl/public/get_file.php?id=248042",
          sourceType: "BIP",
        },
        {
          sourceUrl: "https://www.spwsz.szczecin.pl/files/3511_zalacznik-nr-1a-do-siwz-p.pdf",
          sourceType: "PUBLIC_INSTITUTION",
        },
        {
          sourceUrl: "https://ugblizyn.bip.doc.pl/upload/doc/31357_20070727_122112.pdf",
          sourceType: "BIP",
        },
      ]),
      notes: "0829-03 alone ≠ complete identity — family/catalog prefix is part of identity",
    },
    {
      tableCode: "2006-04",
      canonicalDisplay: "KNR 2-02 2006-04",
      catalogFamilyPrefix: "KNR 2-02",
      description:
        "Okładziny z płyt gipsowo-kartonowych (suche tynki gipsowe) pojedyncze na stropach na rusztach",
      unit: "m2",
      semanticTokens: Object.freeze([
        "okładziny",
        "gipsowo-kartonowych",
        "suche tynki",
        "stropach",
        "rusztach",
        "pojedyncze",
      ]),
      aliases: Object.freeze(["2006/04", "2006-04"]),
      sources: Object.freeze([
        {
          sourceUrl:
            "https://bip.lubrza.opole.pl/download/attachment/17412/zal-nr-11-przedmiar-robot.pdf",
          sourceType: "BIP",
        },
        {
          sourceUrl: "https://bazakonkurencyjnosci.funduszeeuropejskie.gov.pl/api/files/1543369",
          sourceType: "GOVERNMENT",
        },
        {
          sourceUrl: "https://bazakonkurencyjnosci.funduszeeuropejskie.gov.pl/api/files/1544684",
          sourceType: "GOVERNMENT",
        },
        {
          sourceUrl: "https://old.zwikprudnik.pl/zalacznik_11a_201702200000.pdf",
          sourceType: "PUBLIC_PDF",
        },
        {
          sourceUrl:
            "https://www.archiwum.bip.inowroclaw.ug.gov.pl/at/1776/2860/przedmiar_robot_budowlany_jaksice_18_04_09.pdf",
          sourceType: "BIP",
        },
        {
          sourceUrl:
            "https://ugkobylagora.bip.e-zeto.eu/bip/250_ugkobylagora/fckeditor/old/indexaff0.pdf?action=save&bar_id=2441&id=2233&p=document",
          sourceType: "BIP",
        },
        {
          sourceUrl: "https://www.bip.krakow.pl/plik.php?mode=shw&new=t&wer=0&zid=164570",
          sourceType: "BIP",
        },
        {
          sourceUrl:
            "https://bip.walce.pl/download/attachment/23830/przedmiar-rozkochow-czesc-uzytecznosci-publicznej.pdf",
          sourceType: "BIP",
        },
        {
          sourceUrl:
            "https://josephine.proebiz.com/pl/tender/63698/summary/download/516586",
          sourceType: "OFFICIAL_PUBLIC_TENDER_DOCUMENT",
        },
      ]),
      notes:
        "MASTER_EVIDENCE_SPRINT — external HARD corroborates corpus hash 77025d79 (na rusztach); competing 673a4ce5 NOT deleted; corpus CONFLICT_DENYLIST has no auto-promote resolver → FAIL_CLOSED until Owner resolves frozen conflict · TPI729-48-RESIDUALS-V1: labor norm 0.7039 r-g/m2 · winbud Szczegolowy.pdf Evidence 9.62 PLN/m2 → AUT-R1 CURRENT 9.62 AUTO_R1 (2.66.200) · historical estimate PLN = Evidence only via contract · no 0.7039×52.30",
    },
    {
      tableCode: "1118-09",
      canonicalDisplay: "KNR 2-02 1118-09",
      catalogFamilyPrefix: "KNR 2-02",
      description: "Posadzki płytkowe z kamieni sztucznych",
      unit: "m2",
      semanticTokens: Object.freeze([
        "posadzki",
        "płytkowe",
        "kamieni sztucznych",
        "gres",
        "klej",
      ]),
      aliases: Object.freeze(["1118/09", "1118-09"]),
      sources: Object.freeze([
        {
          sourceUrl:
            "https://www.kuratorium.bialystok.pl/wp-content/uploads/2019/05/zalacznik-nr-7-specyfikacja-techniczna-wykonania-i-odbioru-robot.pdf",
          sourceType: "PUBLIC_INSTITUTION",
        },
        {
          sourceUrl: "https://www.biuletyn.net/nt-bin/_private/klodawa/820.pdf",
          sourceType: "PUBLIC_PDF",
        },
        {
          sourceUrl: "https://archiwum.gniewoszow.pl/bip.gniewoszow.pl/upload/przedmiarrobot.pdf",
          sourceType: "BIP",
        },
      ]),
      notes:
        "MASTER_EVIDENCE_SPRINT — exact TPI: posadzki z płytek z kamieni sztucznych na klej; ACLC CREATE authorized when gates PASS",
    },
    {
      tableCode: "0504-07",
      canonicalDisplay: "KNR 4-04 0504-07",
      catalogFamilyPrefix: "KNR 4-04",
      description: "Rozebranie posadzek z paneli podłogowych",
      unit: "m2",
      semanticTokens: Object.freeze([
        "rozebranie",
        "posadzek",
        "paneli",
        "podłogowych",
      ]),
      aliases: Object.freeze(["0504/07", "0504-07"]),
      sources: Object.freeze([
        {
          sourceUrl:
            "https://zkzl.poznan.pl/wp-content/uploads/2019/11/Matejki-59-panele-i-p_biurowe-%C5%9Blepy-2019-10-21.pdf",
          sourceType: "PUBLIC_INSTITUTION",
        },
        {
          sourceUrl:
            "https://zamowienia.krus.gov.pl/wp-content/uploads/2023/04/Za%C5%82%C4%85cznik_nr_3_kosztorys_inwestorski_architektoniczno_budowlany_0900-OP.263.7.2023.pdf",
          sourceType: "GOVERNMENT",
        },
        {
          sourceUrl: "https://bip.leszno.pl/attachments/download/6642",
          sourceType: "BIP",
        },
      ]),
      notes:
        "MASTER_EVIDENCE_SPRINT — laborNorm 0.18 r-g/m2 (technology norm ≠ OUR RATE PLN); ACLC CREATE when gates PASS; ≠ pianka install",
    },
    {
      tableCode: "0616-01",
      canonicalDisplay: "KNR 2-02 0616-01",
      catalogFamilyPrefix: "KNR 2-02",
      description: "Ułożenie warstwy pianki pod panele",
      unit: "m2",
      semanticTokens: Object.freeze([
        "ułożenie",
        "warstwy",
        "pianki",
        "pod panele",
      ]),
      aliases: Object.freeze(["0616/01", "0616-01"]),
      sources: Object.freeze([
        {
          sourceUrl:
            "https://zachodniopomorska.bip.policja.gov.pl/download.php?id=30008&s=37",
          sourceType: "GOVERNMENT",
        },
        {
          sourceUrl: "https://www.scribd.com/document/705048374/kosztorys-dom-nad-strumykiem",
          sourceType: "SECONDARY_WEB_INDEX",
        },
      ]),
      notes:
        "MASTER_EVIDENCE_SPRINT — primary exact identity for pianka-under-panels labor; laborNorm 0.0832 r-g/m2; do NOT use 0611-03 unless scope independently requires",
    },
    {
      tableCode: "0604-01",
      canonicalDisplay: "KNNR 2 0604-01",
      catalogFamilyPrefix: "KNNR 2",
      description: "Ułożenie podkładu pod panele grubości 3-5 mm",
      unit: "m2",
      semanticTokens: Object.freeze([
        "ułożenie",
        "podkładu",
        "pod panele",
        "3-5",
        "mm",
      ]),
      aliases: Object.freeze(["0604/01", "0604-01", "604-010"]),
      sources: Object.freeze([
        {
          sourceUrl:
            "https://www.gov.pl/attachment/d03f1745-7c4b-4d0a-bc91-9489f207bff1",
          sourceType: "GOVERNMENT",
        },
      ]),
      notes:
        "MASTER_EVIDENCE_SPRINT — identity for TPI token 604-010 when scope=podkład 3-5 mm under panels; no token-only shortcut",
    },
    {
      tableCode: "0411-08",
      canonicalDisplay: "KNR 4-01 0411-08",
      catalogFamilyPrefix: "KNR 4-01",
      description: "Wymiana elementów podłóg z desek - progi",
      unit: "szt",
      semanticTokens: Object.freeze([
        "wymiana",
        "elementów",
        "podłóg",
        "desek",
        "progi",
      ]),
      aliases: Object.freeze(["0411/08"]),
      sources: Object.freeze([
        {
          sourceUrl:
            "https://wydawnictwo.up.lublin.pl/szp/2014/AZP-PN-19-2014/zal._1c_-_przedmiar_-_roboty_remontowo-_malarskie_w_pokojach_oraz_pomieszczeniach_kuchennych_i_sanitarnych.htm",
          sourceType: "PUBLIC_INSTITUTION",
        },
        {
          sourceUrl: "https://up.lublin.pl/szp/2014/AZP-PN-24-2014/przedmiar_roboty_remontowo-budowlane.htm",
          sourceType: "PUBLIC_INSTITUTION",
        },
        {
          sourceUrl: "https://www.mzb.tarnow.pl/old_2013/pliki/2018_03_03_1/zadanie11.pdf",
          sourceType: "PUBLIC_PDF",
        },
      ]),
      notes:
        "MASTER_EVIDENCE_SPRINT — CORROBORATION ONLY; NOT auto-map to TPI rozebranie progu (wymiana ≠ rozebranie); distinct from KNNR 5 0411-08",
    },
    {
      tableCode: "0353-02",
      canonicalDisplay: "KNR-W 4-01 0353-02",
      catalogFamilyPrefix: "KNR-W 4-01",
      description: "Wykucie progu drzwiowego",
      unit: "szt",
      semanticTokens: Object.freeze(["wykucie", "progu", "drzwiowego"]),
      aliases: Object.freeze(["0353/02", "0353-02"]),
      sources: Object.freeze([
        {
          sourceUrl:
            "https://www.gov.pl/attachment/abab4a92-4292-4579-9162-c780af88dbbe",
          sourceType: "GOVERNMENT",
        },
      ]),
      notes:
        "MASTER_EVIDENCE_SPRINT — candidate near TPI rozebranie progu; KEEP FAIL_CLOSED unless identity resolver proves exact scope compatibility; NO invent leaf bind",
    },
  ]);
