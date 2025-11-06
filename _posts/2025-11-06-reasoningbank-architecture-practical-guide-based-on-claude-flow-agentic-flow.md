---
layout: "post"
title: "ReasoningBank — Architecture & Practical Guide (based on `claude-flow` × `agentic-flow`)"
date: "2025-11-06 09:23:35 +0700"
categories: ["reasoningbank", "llm", "agentic"]
math: true
---

Awesome brief. I dug through both repos and the specific adapter file you pointed to. Here’s a tight architecture for a **ReasoningBank** you can drop into your own stack, plus a mini-blog/guide to get teammates inspired.

---

## What ReasoningBank is (in practice)

**ReasoningBank** is a persistent “pattern memory” for agents. It stores patterns (what worked, what failed, strategies, anti-patterns), embeds them, and returns semantically relevant playbooks in a few milliseconds during future tasks. In the current codebases:

* **Claude-Flow** wires a **hybrid memory layer**: Vector (AgentDB) + Pattern memory (ReasoningBank). The v2.7 notes call out a **Node.js backend**, SQLite storage (`.swarm/memory.db`), and **MMR ranking with 4-factor scoring**; schema tables include `patterns`, `embeddings`, `trajectories`, `links`. ([GitHub][1])
* **Agentic-Flow** exposes ReasoningBank as a programmatic module (`agentic-flow/reasoningbank`) and describes it as a **persistent learning system** that improves success rate and execution speed across runs. It’s listed with the other core components (AgentDB, Router, QUIC, Federation). ([GitHub][2])
* Recent release notes highlight **2–3ms semantic queries**, **hash-based embeddings that don’t require API keys**, and durable storage across restarts. ([GitHub][3])
* The file you referenced (`src/reasoningbank/reasoningbank-adapter.js`) is the bridge inside Claude-Flow: it adapts the ReasoningBank API into CF’s memory/skills layer so skills and MCP tools can read/write learned patterns seamlessly. ([GitHub][4])

---

## High-level architecture

```mermaid
flowchart LR
  subgraph Agent Runtime
    A1[LLM Agent(s)] --> A2[Skill Layer / MCP Tools]
    A2 -->|store/query| A3[Memory Facade]
  end

  subgraph Memory Facade (Claude-Flow)
    A3 -->|vector ops| M1[AgentDB\n(HNSW, quantization)]
    A3 -->|pattern ops| M2[ReasoningBank Adapter]
  end

  subgraph ReasoningBank (Agentic-Flow)
    M2 <-->|API| RBAPI[reasoningbank module]
    RBAPI --> DB[(SQLite: .swarm/memory.db)]
    RBAPI --> IDX[Embedder + MMR ranker]
  end

  subgraph Data Model
    DB --> T1[patterns]
    DB --> T2[embeddings]
    DB --> T3[trajectories]
    DB --> T4[links]
  end

  subgraph IO
    IN[(Events: tasks, runs, outcomes)]
    OUT[(Top-k patterns: steps, diffs, configs)]
  end

  IN --> A2
  IDX --> OUT
  OUT --> A1
```

* **Memory Facade**: Claude-Flow chooses **AgentDB** (semantic vector search) or **ReasoningBank** (pattern recall) depending on intent/signal. ([GitHub][1])
* **ReasoningBank**: Node backend + SQLite; embeddings + **MMR 4-factor scoring**; p95 ~2–3ms for K-small queries. ([GitHub][1])
* **Adapter**: `reasoningbank-adapter.js` aligns naming/params and exposes `store/query/stats` for CF skills/MCP tools. ([GitHub][4])

---

## Data model (minimal pragmatic schema)

* **patterns**: id, namespace/domain, title, summary, steps, tags, quality, source (repo/PR/task), timestamps.
* **embeddings**: pattern_id, vector (1024-d hash embedding), dim, method, created_at.
* **trajectories**: pattern_id, run_id, inputs, decisions, outcome (success/fail), metrics.
* **links**: typed edges (pattern↔pattern, pattern↔file, pattern↔issue) for graph traversal.
  These names/ideas are consistent with the CF v2.7 memory notes. ([GitHub][1])

---

## Scoring & retrieval (that “4-factor MMR”)

At query time ReasoningBank computes a relevance score using **MMR** (Maximal Marginal Relevance) and blends roughly:

1. **Semantic similarity** (query ↔ embedding)
2. **Recency/decay** (newer trajectories get a boost)
3. **Quality** (success-weighted, e.g., pass rate)
4. **Diversity** (MMR penalizes near-duplicates to give varied strategies)
   The README explicitly mentions “MMR ranking with 4-factor scoring”; precise weights are configurable per product needs. ([GitHub][1])

---

## How the adapter fits (Claude-Flow)

`reasoningbank-adapter.js` is the **glue** in CF’s `memory` commands & skills:

* Normalizes namespaces/domains, maps CF CLI flags (e.g. `--reasoningbank`, `--namespace`) to RB calls.
* Provides `store`, `query`, and sometimes **stats** endpoints so CF **skills** like `memory_search` or `neural_patterns` can hit ReasoningBank seamlessly. ([GitHub][4])

---

## Implementing your own ReasoningBank (step-by-step)

### 1) Stand up storage & API

* Use **SQLite** (zero-ops) first; later swap to Postgres if needed.
* Implement modules: `storePattern`, `embedPattern`, `queryPatterns`, `recordTrajectory`.
* If you want the same feel as CF: save DB at `.swarm/memory.db`. ([GitHub][1])

### 2) Embeddings

* Start with **hash-based embeddings** (deterministic, no API keys) to keep local/offline flow. Switch to model-based embeddings later if needed. ([GitHub][1])

### 3) Ranker

* Implement **MMR** with tunable weights: `score = α*sim + β*quality + γ*recency – δ*redundancy`.
* Add **namespace/domain filters** so teams can partition by repo/project.

### 4) Adapter into your agent layer

* Mirror CF’s pattern: a **MemoryFacade** that tries **AgentDB (vector)**; if confidence < τ, fallback to **ReasoningBank**; merge results. ([GitHub][1])

### 5) Hooks (learning loop)

* On every finished task, log a **trajectory** and (if success or useful failure) upsert a **pattern**.
* Promote patterns with high **reuse** & **success rate**. Demote noisy ones.

---

## Minimal code sketch (Node.js, inspired by `agentic-flow/reasoningbank`)

```js
// pseudo-implementation – mirrors the module split you’ll find in agentic-flow
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

// very small, deterministic hash-embedding
function hashEmbed(text) {
  const dim = 1024, v = new Float32Array(dim);
  for (let i = 0; i < text.length; i++) v[(i * 31) % dim] += (text.charCodeAt(i) % 13) / 13;
  // L2 normalize
  let norm = Math.sqrt(v.reduce((s,x)=>s + x*x, 0));
  return Array.from(v, x => x / (norm || 1));
}

export async function createRB(dbPath = '.swarm/memory.db') {
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS patterns (
      id INTEGER PRIMARY KEY, namespace TEXT, title TEXT, summary TEXT, steps TEXT,
      tags TEXT, quality REAL DEFAULT 0.5, source TEXT, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS embeddings (
      pattern_id INTEGER, dim INTEGER, vec BLOB, method TEXT, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS trajectories (
      id INTEGER PRIMARY KEY, pattern_id INTEGER, run_id TEXT, inputs TEXT,
      decisions TEXT, outcome TEXT, metrics TEXT, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS links (
      from_id INTEGER, to_id INTEGER, type TEXT
    );
  `);

  async function storePattern(p) {
    const now = Date.now();
    const { namespace, title, summary, steps = '', tags = '', quality = 0.7, source = '' } = p;
    const { lastID } = await db.run(
      `INSERT INTO patterns(namespace,title,summary,steps,tags,quality,source,created_at,updated_at)
       VALUES(?,?,?,?,?,?,?, ?, ?)`,
      namespace, title, summary, steps, tags, quality, source, now, now
    );
    const vec = hashEmbed([title, summary, steps, tags].join('\n'));
    await db.run(
      `INSERT INTO embeddings(pattern_id, dim, vec, method, created_at)
       VALUES(?,?,?,?,?)`,
      lastID, vec.length, Buffer.from(new Float32Array(vec).buffer), 'hash-1024', now
    );
    return lastID;
  }

  function cosine(a, b) {
    let s = 0, n1 = 0, n2 = 0;
    for (let i = 0; i < a.length; i++) { s += a[i]*b[i]; n1 += a[i]*a[i]; n2 += b[i]*b[i]; }
    return s / (Math.sqrt(n1) * Math.sqrt(n2) || 1);
  }

  async function query({ text, namespace, k = 5 }) {
    const q = hashEmbed(text);
    const rows = await db.all(
      `SELECT p.*, e.vec FROM patterns p JOIN embeddings e ON p.id = e.pattern_id
       WHERE (? IS NULL OR p.namespace = ?)`,
      namespace ?? null, namespace ?? null
    );
    // naive in-memory MMR (replace with proper ANN + MMR)
    const items = rows.map(r => {
      const vec = new Float32Array(Buffer.from(r.vec));
      const sim = cosine(q, vec);
      const recency = Math.max(0, 1 - (Date.now() - r.updated_at) / (30*24*3600e3));
      const score = 0.6*sim + 0.2*r.quality + 0.2*recency;
      return { ...r, score };
    }).sort((a,b)=>b.score-a.score);
    return items.slice(0, k).map(({ vec, ...rest }) => rest);
  }

  return { storePattern, query };
}
```

> Why this matches the repos: **SQLite** + **hash embeddings** + **fast semantic search** + **pattern tables** + **MMR flavor scoring** are exactly what the latest CF/AF docs & release notes describe. ([GitHub][1])

---

## How to use it inside your agent loop

1. **On task start**: `query({ text: goal, namespace: repo })` → inject top-k patterns into the system prompt/tool memory.
2. **During execution**: when a tactic succeeds or a class of error is resolved, **persist a pattern** (`storePattern`).
3. **After task**: record a **trajectory** (inputs, decisions, outcome). Promote/demote `quality`.
4. **Periodic grooming**: deduplicate with MMR, merge near-dupes, create **links** (pattern → file / PR / test).

---

## Rollout playbook for your team

* **Week 1**: Ship the SQLite RB service + a tiny adapter in your agent gateway. Log 10–20 patterns from real tickets (auth flows, build fixes, common linters).
* **Week 2**: Add the **fallback/merge** logic with AgentDB (vector) and A/B test against “no RB”.
* **Week 3**: Wire to PR review & migration tasks; start auto-promoting patterns with >70% win-rate.
* **Week 4**: Add **namespace governance** (per repo/product), dashboards for hit-rate, median query time, pattern reuse.

---

## Why teams get excited

* **Speed**: 2–3ms semantic lookups keep agents snappy. ([GitHub][1])
* **Learning**: Converges toward “first-try correct” flows (repos claim 90%+ on learned paths). ([GitHub][2])
* **Cost**: Local hashing + selective model routing = big savings vs “vector-only + cloud-only” memory. ([GitHub][2])

---

## References (fresh)

* Claude-Flow README (v2.7, hybrid memory + ReasoningBank details, schema hints, MMR 4-factor, SQLite path). ([GitHub][1])
* Claude-Flow release notes/issue threads (Agentic-Flow integration, persistent memory, no-API-key embeddings). ([GitHub][3])
* Agentic-Flow README (ReasoningBank component, API/programmatic usage). ([GitHub][2])
* Adapter file you shared (`reasoningbank-adapter.js`) showing CF’s integration point. ([GitHub][4])

---


[1]: https://github.com/ruvnet/claude-flow "GitHub - ruvnet/claude-flow:  The leading agent orchestration platform for Claude. Deploy intelligent multi-agent swarms, coordinate autonomous workflows, and build conversational AI systems. Features    enterprise-grade architecture, distributed swarm intelligence, RAG integration, and native Claude Code support via MCP protocol. Ranked #1 in agent-based frameworks."
[2]: https://github.com/ruvnet/agentic-flow "GitHub - ruvnet/agentic-flow: Easily switch between alternative low-cost AI models in Claude Code/Agent SDK. For those comfortable using Claude agents and commands, it lets you take what you've created and deploy fully hosted agents for real business purposes. Use Claude Code to get the agent working, then deploy it in your favorite cloud."
[3]: https://github.com/ruvnet/claude-flow/releases?utm_source=chatgpt.com "Releases · ruvnet/claude-flow"
[4]: https://github.com/ruvnet/claude-flow/blob/main/src/reasoningbank/reasoningbank-adapter.js "claude-flow/src/reasoningbank/reasoningbank-adapter.js at main · ruvnet/claude-flow · GitHub"