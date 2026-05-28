# AXIOM v0.3-v0.6 Roadmap

## Summary

AXIOM'un urun yonu `Personal Thought Judge -> Company Brain -> Agent OS + Discovery Engine -> Scale` olarak kilitlenir. `Discovery Engine` ayri v0.6 isi degil, v0.5 Agent OS icinde gelir. `evidence-ranker.js` v0.3 altyapisina cekilir cunku `devil-advocate` ve `contradiction-alert` kanit kalitesi bilmeden guvenilir cikti uretemez.

## v0.3 - Personal Thought Judge

- `P0 Graph Reliability`
  - P0 zaten implement edildi.
  - Sadece su regresyon testleri eklenir: duplicate hypothesis engeli, reverse edge senaryosu, relation-specific edge ayrimi.
  - Testler gectikten sonra `P0.5`'e gecilir.
- `P0.5 Kernel Capability System`
  - `kernel.capabilities` eklenir.
  - `hasCapability(name)`, `enableCapability(name)`, `requireCapability(name)` eklenir.
  - Default: `graph=true`, `llm=true`, `contradictionDetection=true`, diger yeni capability'ler `false`.
- `P1A Product Plugins Without Temporal`
  - `plugins/idea-mri.js` ve `plugins/devil-advocate.js` eklenir.
  - `idea-mri` temporal beklemedigi icin `P1B` ile eszamanli baslayabilir.
  - `devil-advocate` graph-backed calisir; graph zayifsa ve LLM varsa fallback acikca etiketlenir; LLM yoksa soru listesi doner.
- `P1B Temporal v1`
  - Graph node/edge metadata kalici hale getirilir.
  - Node: `created_at`, `last_seen`.
  - Edge: `created_at`, `updated_at`, `source_ref`, `session_id`, `confidence_history`.
  - Mevcut `KernelV2` temporal metadata davranisi korunur, graph persistence ile uyumlu hale getirilir.
  - Tamamlaninca `kernel.enableCapability("temporal")`.
- `P2 Plugin Contract v1`
  - Mevcut hook sistemi korunur.
  - `listCapabilities()`, `getCapability(name)`, `runCapability(name,input,opts)` eklenir.
  - Dependency check `kernel.hasCapability()` ustunden yapilir.
  - Tamamlaninca `kernel.enableCapability("pluginCapabilities")`.
- `P2.5 Evidence Ranker`
  - Root seviyede `evidence-ranker.js` eklenir.
  - Evidence enum ve weight hiyerarsisi uygulanir.
  - Kernel `_rankEvidence()` bu helper'a baglanir.
  - `devil-advocate` ve `contradiction-alert` ciktilarinda evidence quality ve adjusted confidence gosterilir.
  - Tamamlaninca `kernel.enableCapability("evidenceRanking")`.
- `P3 Contradiction Alert`
  - `plugins/contradiction-alert.js` eklenir.
  - `requires=["graph","temporal"]`, `optional=["llm","evidenceRanking"]`.
  - Yeni fikirleri eski fikirlerle karsilastirir, stratejik yon degisimi ve kanit kalitesi dondurur.
- `P4 Minimal Personal App`
  - Ilk ekran: `Fikrini Yargilat`.
  - Sekmeler: `Fikrinin MR'i`, `Seytan'in Avukati`, `Gecmis Celiskiler`, `Hafiza / Graph`.
  - Slogan: `AXIOM cevap vermez. Dusunceni yargilar.`

## v0.4-v0.6 Roadmap

- `v0.4 Company Brain`
  - `plugins/repo-memory.js` ve `plugins/company-brain.js`.
  - Ilk kaynaklar: GitHub, Markdown docs, manual notes.
  - Repo amaci, dosya-strateji iliskisi, karar dayanagi, PR/karar celiskisi, teknik borc kokeni sorulari cevaplanir.
- `v0.5 Agent OS + Discovery Engine`
  - MCP, CLI, API ve `workflow-agent.js` ayni agent tool contract ustunden calisir.
  - Discovery pluginleri: `discovery-engine`, `experiment-planner`, `result-analyzer`, `replication-checker`.
  - Kapali dongu: hipotez uret, deney tasarla, sonucu al, kaniti skorla, graph confidence guncelle, yeni hipotez uret.
  - `evidence-ranker.js` yeniden yazilmaz; v0.3 helper genisletilir.
- `v0.6 Scale`
  - Obsidian plugin, multi-source connectors, Slack/Gmail/Jira/Linear/Notion, multi-user workspace, permissions, audit log, YC pitch.
  - Discovery Engine burada baslamaz; burada olceklenir.

## Test Plan

- Graph reliability: duplicate hypothesis, reverse edge, relation-specific lookup.
- Capability system: default capabilities, enable/require behavior, missing capability failure.
- Plugin contract: capability listing, dependency block, optional dependency fallback, `runCapability()` happy/error paths.
- Product plugins: graph-backed output, LLM fallback labeling, no-data question list, structured `idea-mri` output.
- Evidence ranker: enum weight mapping, adjusted confidence, dedupe/sort preservation, Kernel result compatibility.
- Temporal v1: timestamp persistence, source/session metadata, confidence history append, v2 contract unchanged.
- Contradiction alert: temporal dependency required, old/new thought comparison, evidence quality included.
- Regression: existing Kernel, KernelV2, Agent, MCP, server, CLI, plugin, benchmark tests stay green.

## Assumptions

- Eski v3 backlog kapandi; yeni urun yol haritasi `v0.3-v0.6`.
- `AXIOM_AGENT_VERSION=v3` mevcut runtime tercihi olarak kalir; otomatik default yapilmaz.
- Core kucuk kalir; urun modlari plugin olur.
- `evidence-ranker.js` root seviyede tutulur; ayri `core/` klasoru acilmaz.
- Dikey nisler v0.6 sonrasina birakilir.
