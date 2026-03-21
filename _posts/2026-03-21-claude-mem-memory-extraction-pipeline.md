---
layout: post
title: "claude-mem: Xây dựng Pipeline Trích Xuất Bộ Nhớ Chính Xác cho AI Agent"
date: 2026-03-21
tags: [SQLite, AI, Memory, ChromaDB, Claude]
---

# claude-mem: Xây dựng Pipeline Trích Xuất Bộ Nhớ Chính Xác cho AI Agent

> Bài viết phân tích cách **claude-mem** giải quyết bài toán cốt lõi của AI agent: làm thế nào để "nhớ" chính xác những gì quan trọng qua nhiều session, trong khi vẫn giữ context nhỏ gọn và tìm kiếm hiệu quả. Đây là bài học thực tế từ việc reverse-engineer và benchmark toàn bộ pipeline.

---

## Mục lục

1. [Vấn đề cần giải quyết](#1-vấn-đề-cần-giải-quyết)
2. [Kiến trúc tổng quan — 7 phases](#2-kiến-trúc-tổng-quan)
3. [Phase 1: Hook vào tool activity](#3-phase-1-hook)
4. [Phase 2-3: Observer XML generation](#4-phase-2-3-xml)
5. [Phase 4: Atomic SQLite storage + FTS5](#5-phase-4-sqlite)
6. [Phase 5-6: ChromaDB semantic sync](#6-phase-5-6-chroma)
7. [Phase 7: Hybrid search + context injection](#7-phase-7-search)
8. [Schema SQLite — 7 migrations](#8-schema)
9. [Benchmark thực tế](#9-benchmark)
10. [Key design decisions](#10-key-decisions)

---

## 1. Vấn đề cần giải quyết

Claude Code làm việc trong sessions ngắn. Mỗi session restart, toàn bộ context biến mất. Các giải pháp naive:

- **Replay toàn bộ transcript**: 50 tool calls × 300 tokens = 15,000 tokens. Tốn kém, nhiễu.
- **Tóm tắt thủ công**: Phụ thuộc vào user, không đáng tin.
- **Lưu raw logs**: Fast nhưng không searchable, không hierarchical.

**claude-mem** giải quyết bằng cách ép một *observer agent* **chọn lọc và extract** những gì thực sự quan trọng thành schema cố định — và inject context đó vào session tiếp theo với **39x ít tokens hơn**.

---

## 2. Kiến trúc tổng quan

```
Tool Call (raw, noisy)
  ↓ PostToolUse hook
HTTP POST /api/sessions/observations
  ↓ SessionQueueProcessor
buildObservationPrompt()  →  XML prompt
  ↓ @anthropic-ai/claude-agent-sdk
Observer Claude (no tools, read-only)
  ↓ selectivity filter
<observation> XML  |  "no observation needed"
  ↓ parseObservations()
ParsedObservation struct
  ↓ storeObservation() — atomic, dedup
SQLite (observations table)  →  FTS5 auto-trigger
  ↓ async fire-and-forget
ChromaDB (vector embeddings)
  ↓
GET /api/context/inject
  ↓ HybridSearch (FTS5 + Chroma)
Top-N context  →  Next session
```

7 phases, mỗi phase giải quyết 1 vấn đề cụ thể.

---

## 3. Phase 1: Hook vào tool activity

```typescript
// PostToolUse hook trong Claude Code
HTTP POST /api/sessions/observations
{
  contentSessionId: "user-abc123",   // user's session
  tool_name: "Write",
  tool_input: { path: "server/db.js" },
  tool_response: "File written (728 insertions)",
  cwd: "/projects/kanban-mvp"
}
```

**Key insight:** Dùng 2 loại session ID riêng biệt:
- `contentSessionId` → gắn với user's work (stable)
- `memorySessionId` → gắn với observer agent (thay đổi khi restart)

Observer crash và restart không mất data vì tất cả observations đều gắn với `contentSessionId`.

---

## 4. Phase 2-3: Observer XML generation

Observer Claude nhận prompt được format từ tool call:

```xml
<observed_from_primary_session>
  <what_happened>Write</what_happened>
  <parameters>{"path": "server/db.js"}</parameters>
  <outcome>"File written (728 insertions, 10 files changed)"</outcome>
  <working_directory>/projects/kanban-mvp</working_directory>
</observed_from_primary_session>
```

Observer được config **không có tools** (observer-only) và respond bằng XML có schema cố định:

```xml
<observation>
  <type>feature</type>
  <title>Issue Version History Database Schema</title>
  <subtitle>Added SQLite table and snapshot function</subtitle>
  <facts>
    <fact>issue_history table với composite PRIMARY KEY (repo_key, number, version)</fact>
    <fact>snapshotIssue() function capture state trước mỗi edit</fact>
    <fact>Version numbers auto-increment per issue</fact>
    <fact>728 insertions across 10 files</fact>
  </facts>
  <narrative>Implemented foundational infrastructure for version history tracking.</narrative>
  <concepts>
    <concept>architecture</concept>
    <concept>how-it-works</concept>
  </concepts>
  <files_modified>
    <file>server/db.js</file>
  </files_modified>
</observation>
```

**Selectivity quan trọng:** Observer tự quyết định skip noise:
- `git log --oneline -3` → *"routine git status, no observation needed"*
- `Write server/db.js (728 insertions)` → **captured** với 4 facts cụ thể
- `Write tests/e2e/06-history.spec.cjs` → **captured** với 21 tests, full coverage info

---

## 5. Phase 4: Atomic SQLite storage + FTS5

```typescript
// observations/store.ts
function storeObservation(db, memorySessionId, project, observation) {
  // 1. Content-hash deduplication (30s window)
  const hash = sha256(memorySessionId + title + narrative).slice(0, 16)
  const existing = db.query(
    'SELECT id FROM observations WHERE content_hash = ? AND created_at_epoch > ?'
  ).get(hash, Date.now() - 30_000)
  if (existing) return { id: existing.id }  // skip duplicate

  // 2. Atomic INSERT
  db.prepare(`
    INSERT INTO observations
    (memory_session_id, project, type, title, subtitle,
     facts, narrative, concepts, files_modified,
     discovery_tokens, content_hash, created_at_epoch)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    memorySessionId, project, type, title, subtitle,
    JSON.stringify(facts), narrative, JSON.stringify(concepts),
    JSON.stringify(files_modified),
    discoveryTokens, hash, Date.now()
  )
}
```

Ngay sau INSERT, **FTS5 trigger tự động fire**:

```sql
-- Auto-generated trigger từ migration006
CREATE TRIGGER observations_ai AFTER INSERT ON observations BEGIN
  INSERT INTO observations_fts(rowid, title, subtitle, narrative, text, facts, concepts)
  VALUES (new.id, new.title, new.subtitle, new.narrative, new.text, new.facts, new.concepts);
END;
```

Kết quả: SQLite query <1ms ở 10,000 observations, WAL mode, zero config.

---

## 6. Phase 5-6: ChromaDB semantic sync

```typescript
// Async, fire-and-forget — không block storage
ChromaSync.syncObservation(obsId)

// Build document text (concatenate fields for embedding)
const doc = `${title} ${subtitle} ${facts.join(' ')} ${narrative} ${concepts.join(' ')}`

// Gọi chroma-mcp subprocess (Python 3.11)
await chromaMcp.callTool("chroma_add_documents", {
  collection_name: "kanban-mvp_observations",
  documents: [doc],
  ids: [`obs_${obsId}`],
  metadatas: [{ type, project, created_at_epoch }]
})
// → onnxruntime embeds: [0.023, -0.145, ...] (384 dims, all-MiniLM-L6-v2)
// → stored in ~/.claude-mem/chroma/
```

**Python version gotcha:** ChromaDB chỉ tương thích Python 3.11. Python 3.13/3.14 fail do onnxruntime dependency conflict. Fix:

```json
// ~/.claude-mem/settings.json
{ "CLAUDE_MEM_PYTHON_VERSION": "3.11" }
```

---

## 7. Phase 7: Hybrid search + context injection

```typescript
// HybridSearchStrategy
async search(query, project, limit) {
  // 1. SQLite FTS5 — keyword match, <1ms
  const ftsIds = db.query(`
    SELECT rowid FROM observations_fts
    WHERE observations_fts MATCH ?
    ORDER BY rank  -- BM25
  `).all(query).map(r => r.rowid)

  // 2. ChromaDB — semantic similarity, ~100-500ms
  const chromaResults = await chroma.query({
    collection: `${project}_observations`,
    query_texts: [query],
    n_results: limit * 2
  })

  // 3. Intersect + order by Chroma (semantic) rank
  const rankedIds = chromaResults.ids
    .filter(id => ftsIds.includes(parseInt(id.replace('obs_', ''))))

  // 4. Hydrate full rows từ SQLite
  return rankedIds.map(id => db.query('SELECT * FROM observations WHERE id = ?').get(id))
}
```

Context injection output (format compact, token-efficient):

```
# $CMEM kanban-mvp 2026-03-21 10:19am GMT+7

Stats: 2 obs (491t read) | 705t work | 30% savings

1 10:06a 🟣 Issue Version History Database Schema
2 10:19a 🟣 E2E test suite for issue version history

Access 1k tokens of past work via get_observations([IDs]) or mem-search skill.
```

---

## 8. Schema SQLite — 7 migrations

```
migrations/
├── 001 — Core tables: sessions, memories, overviews, diagnostics, transcript_events
├── 002 — Add hierarchical fields to memories (title, subtitle, facts, concepts)
├── 003 — streaming_sessions (v2 arch — deprecated)
├── 004 — SDK agent arch: sdk_sessions, observation_queue, observations, session_summaries
├── 005 — DROP orphaned tables (streaming_sessions, observation_queue)
├── 006 — FTS5 virtual tables + auto-sync triggers
└── 007 — discovery_tokens column (ROI tracking)
```

**Core schema hiện tại (post-migration 007):**

```sql
sdk_sessions (1) ──── (N) observations
sdk_sessions (1) ──── (1) session_summaries
observations   ──── auto-trigger ──── observations_fts (FTS5)
observations   ──── async ──── ChromaDB (vectors)

observations:
  type, title, subtitle, facts JSON, narrative, concepts JSON
  files_read JSON, files_modified JSON
  discovery_tokens, content_hash  ← dedup + ROI
```

---

## 9. Benchmark thực tế

Đo trên macOS 14.6 M1, Bun 1.3.11, 46 test cases:

| Metric | Kết quả | Target |
|---|---|---|
| SQLite read p95 (10k rows) | **1ms** | <50ms |
| Context inject p95 | **15ms** | <500ms |
| Observer recall | **91%** | >80% |
| Context relevance | **90%** | >70% |
| Token savings (50 calls) | **39x** | >5x |
| ChromaDB semantic search | 100–500ms | functional |

**Compression reality check:**

| Session size | Tokens raw | Tokens injected | Ratio |
|---|---|---|---|
| 1 tool call | 41 | 89 | 0.46x (overhead > content) |
| 50 tool calls | ~15,600 | ~400 | **39x** |

Short sessions don't compress — by design. At scale (50+ calls với file reads), savings rất lớn.

---

## 10. Key design decisions

### 1. Facts array thay vì narrative blob

```
❌ "Implemented authentication using express-session with SQLite backend 
    where tokens are stored server-side and never exposed via httpOnly cookies"

✅ facts: [
    "express-session + connect-sqlite3",
    "token không bao giờ gửi xuống browser",
    "httpOnly cookie trong production",
    "7-day session expiry (604800s)"
  ]
```

Mỗi fact độc lập, verifiable, và match được riêng biệt → recall cao hơn nhiều.

### 2. Dual session IDs — tách concerns

Observer crash không mất data vì observations luôn gắn với `contentSessionId` (user's work), không phải `memorySessionId` (observer state).

### 3. Chroma là optional, FTS5 là mandatory

Nếu Chroma down, SQLite FTS5 vẫn serve keyword search. `discovery_tokens` không phụ thuộc vào Chroma.

### 4. `discovery_tokens` — feedback loop

```
487 tokens → 4 facts = efficient
2000 tokens → 2 facts = prompt cần tune
```

Đây là signal để cải thiện observer prompt theo thời gian.

### 5. Observer không có tools

Strict: observer chỉ có thể read và write observations. Không thể Bash, Write, Edit. Loại bỏ hoàn toàn infinite loop risks.

---

## Kết luận

claude-mem không phải là "lưu chat history vào DB". Đây là một **structured knowledge extraction pipeline** với:

- Observer agent thông minh, chọn lọc
- Schema atomic facts (không phải narrative blob)
- Hybrid search (FTS5 keyword + ChromaDB semantic)
- Deduplication, ROI tracking, crash-safe dual IDs

**39x token savings không phải là con số marketing** — đó là kết quả đo được khi pipeline đủ mature để phân biệt signal khỏi noise.

Code: [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem)

---

*Tags: SQLite, AI Memory, ChromaDB, Claude Code, RAG, Bun*
