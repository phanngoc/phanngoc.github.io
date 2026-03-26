---
layout: "post"
title: "Mổ xẻ DeerFlow 2.0 — Super Agent Harness #1 GitHub Trending của ByteDance"
date: "2026-03-26 08:00:00 +0700"
tags: ["ai-agent", "langchain", "langgraph", "architecture", "bytedance", "python", "memory", "subagent"]
math: false
---

> **TL;DR:** DeerFlow 2.0 là rewrite hoàn toàn của ByteDance, đạt #1 GitHub Trending ngày 28/2/2026 với 46k ⭐. Kiến trúc xoay quanh **middleware pipeline composable**, **memory có schema rõ ràng**, và **subagent executor với ThreadPool + timeout**. Bài này mổ xẻ từng phần từ source code thực tế, sau đó so sánh với OpenClaw để hiểu khi nào nên dùng cái nào.

---

## Mục lục

1. [Tổng quan](#tổng-quan)
2. [Middleware Pipeline](#phần-1-middleware-pipeline)
3. [Memory System](#phần-2-memory-system)
4. [Subagent Executor](#phần-3-subagent-executor)
5. [ThreadState — Custom LangGraph State](#phần-4-threadstate)
6. [DeerFlow vs OpenClaw](#phần-5-deerflow-vs-openclaw)
7. [Lessons Learned](#lessons-learned)
8. [Nguồn & Stack](#nguồn--stack)

---

## Tổng quan

DeerFlow v1 là một Deep Research framework đơn giản. V2 là rewrite hoàn toàn — không share một dòng code nào — thành một **Super Agent Harness** có thể:

- Orchestrate multiple **sub-agents** chạy song song
- Maintain **long-term memory** với schema structured
- Execute code trong **isolated sandbox**
- Nhận lệnh qua **Telegram, Slack, Feishu**
- Load **extensible skills** (tương tự plugin)

Stack: Python 3.12 + LangChain + LangGraph + FastAPI. Frontend: Next.js.

---

## Phần 1: Middleware Pipeline

Thay vì hardcode mọi logic vào agent, DeerFlow dùng **middleware chain** có thứ tự rõ ràng:

```python
# Từ lead_agent/agent.py — thứ tự này không phải ngẫu nhiên
middlewares = [
    ThreadDataMiddleware(),        # 1. inject workspace paths
    UploadsMiddleware(),           # 2. handle file uploads (cần thread_id từ #1)
    DanglingToolCallMiddleware(),  # 3. patch orphan ToolMessages
    SummarizationMiddleware(),     # 4. compress context SỚM để giảm tokens
    TodoMiddleware(),              # 5. plan mode (track tasks)
    TokenUsageMiddleware(),        # 6. track costs
    TitleMiddleware(),             # 7. auto-generate thread title
    MemoryMiddleware(),            # 8. async memory update (sau TitleMiddleware)
    ViewImageMiddleware(),         # 9. vision (nếu model support)
    DeferredToolFilterMiddleware(),# 10. tool search
    SubagentLimitMiddleware(),     # 11. cap parallel subagents
    LoopDetectionMiddleware(),     # 12. phá loop
    ClarificationMiddleware(),     # 13. CUỐI CÙNG: hỏi user
]
```

Mỗi middleware implement hook `after_model()` hoặc `after_agent()`. Cực kỳ dễ thêm/bỏ feature mà không đụng vào core agent logic.

### LoopDetectionMiddleware — P0 Safety

Đây là middleware ấn tượng nhất. Agent AI hay bị stuck gọi cùng một tool liên tục — middleware này phá vòng lặp:

```python
def _hash_tool_calls(tool_calls: list[dict]) -> str:
    """MD5 của (tool_name + args), order-independent."""
    normalized = [{"name": tc["name"], "args": tc["args"]} for tc in tool_calls]
    normalized.sort(key=lambda tc: (tc["name"], json.dumps(tc["args"], sort_keys=True)))
    blob = json.dumps(normalized, sort_keys=True)
    return hashlib.md5(blob.encode()).hexdigest()[:12]
```

Logic 3 mức:
1. **Bình thường** — pass qua
2. **`>= warn_threshold` (mặc định 3)** → inject cảnh báo vào `HumanMessage`
3. **`>= hard_limit` (mặc định 5)** → strip toàn bộ `tool_calls`, force text answer

> **Tại sao dùng `HumanMessage` thay vì `SystemMessage`?** Anthropic không cho phép SystemMessage ở giữa conversation. Dùng HumanMessage work với mọi provider.

Sliding window 20 calls, LRU evict 100 threads — production-ready.

---

## Phần 2: Memory System

Memory không phải flat string mà có **schema JSON structured**:

```json
{
  "version": "1.0",
  "user": {
    "workContext":     { "summary": "...", "updatedAt": "..." },
    "personalContext": { "summary": "...", "updatedAt": "..." },
    "topOfMind":       { "summary": "...", "updatedAt": "..." }
  },
  "history": {
    "recentMonths":       { "summary": "...", "updatedAt": "..." },
    "earlierContext":     { "summary": "...", "updatedAt": "..." },
    "longTermBackground": { "summary": "...", "updatedAt": "..." }
  },
  "facts": []
}
```

### Flow memory update

```
Agent hoàn thành turn
    ↓
MemoryMiddleware.after_agent()
    ↓
_filter_messages_for_memory()
  ✅ giữ: HumanMessage, AIMessage (không có tool_calls)
  ❌ bỏ: ToolMessage, AIMessage với tool_calls, <uploaded_files> blocks
    ↓
MemoryUpdateQueue.add(thread_id, filtered_messages)
    ↓ debounce timer
    ↓ batch nhiều threads update gần nhau
    ↓
MemoryUpdater.update_memory()  ← LLM summarize async
    ↓
Write JSON file (global hoặc per-agent)
```

Điểm tinh tế: **`<uploaded_files>` blocks bị strip** trước khi vào memory vì file paths là session-scoped. Nhưng user's actual question vẫn được giữ lại.

### Debounce Queue

```python
class MemoryUpdateQueue:
    def add(self, thread_id, messages, agent_name=None):
        # Nếu thread đã có pending update → replace bằng cái mới nhất
        self._queue = [c for c in self._queue if c.thread_id != thread_id]
        self._queue.append(context)
        self._reset_timer()  # reset debounce
```

Elegant — nhiều conversations trong cùng debounce window được batch, và luôn dùng state mới nhất của mỗi thread.

---

## Phần 3: Subagent Executor

### Architecture

```
Lead Agent
  └─ gọi tool "task" → spawn subagent
        ↓
SubagentLimitMiddleware  ← hard cap 2-4 concurrent
        ↓
SubagentExecutor
  ├─ filter tools (allowlist/denylist per config)
  ├─ resolve model ("inherit" từ parent hoặc model riêng)
  └─ create minimal agent (thinking=False để tiết kiệm token)
        ↓
2 execution modes:
  ├─ execute()       → synchronous
  └─ execute_async() → background
       _scheduler_pool (3 workers): lifecycle + timeout
       _execution_pool (3 workers): actual execution
```

### Async execution với real-time streaming

```python
async def _aexecute(self, task: str, result_holder):
    agent = self._create_agent()
    # stream thay vì invoke → capture từng AIMessage real-time
    async for chunk in agent.astream(state, stream_mode="values"):
        last_msg = chunk.get("messages", [])[-1]
        if isinstance(last_msg, AIMessage):
            if not any(m.get("id") == last_msg.id for m in result.ai_messages):
                result.ai_messages.append(last_msg.model_dump())
```

### Timeout handling

```python
execution_future = _execution_pool.submit(self.execute, task, result_holder)
try:
    exec_result = execution_future.result(timeout=self.config.timeout_seconds)
except FuturesTimeoutError:
    result.status = SubagentStatus.TIMED_OUT
    execution_future.cancel()  # best-effort
```

### Tránh đệ quy vô hạn

```python
SubagentConfig(
    name="bash",
    tools=["bash", "ls", "read_file", "write_file", "str_replace"],
    disallowed_tools=["task", "ask_clarification"],  # subagent không spawn subagent
    model="inherit",
    max_turns=30,
)
```

Một dòng `disallowed_tools=["task"]` ngăn infinite recursion. Trace ID được parent truyền xuống subagent, giúp follow log chain mà không cần distributed tracing phức tạp.

---

## Phần 4: ThreadState

Custom LangGraph State với reducers thông minh:

```python
class ThreadState(AgentState):
    sandbox: NotRequired[SandboxState | None]
    thread_data: NotRequired[ThreadDataState | None]
    title: NotRequired[str | None]

    # Custom reducer: deduplicate artifacts
    artifacts: Annotated[list[str], merge_artifacts]

    # Custom reducer: empty dict = CLEAR (không phải merge!)
    viewed_images: Annotated[dict[str, ViewedImageData], merge_viewed_images]

    todos: NotRequired[list | None]
    uploaded_files: NotRequired[list[dict] | None]
```

`viewed_images` dùng convention `{}` để signal "clear all" — ViewImageMiddleware inject ảnh vào state, xử lý xong thì clear bằng `return {"viewed_images": {}}`.

---

## Phần 5: DeerFlow vs OpenClaw

Sau khi mổ xẻ DeerFlow, mình thấy nó có nhiều điểm tương đồng với **OpenClaw** — cả hai đều là agent harness với skills/channels. Nhưng triết lý thiết kế khác nhau rõ ràng.

### Bảng so sánh

| Khía cạnh | DeerFlow 2.0 | OpenClaw |
|-----------|-------------|----------|
| **Memory** | JSON schema 6 fields + LLM summarize async | MEMORY.md markdown free-form |
| **Memory update** | Debounce queue + batch | Manual / heartbeat periodic |
| **Subagent spawn** | Tool `task` → ThreadPool | `sessions_spawn` → ACP runtime |
| **Subagent limit** | Hard cap 2-4 concurrent | Unlimited |
| **Loop detection** | MD5 hash + sliding window ✅ | ❌ không có |
| **Trace ID** | Parent → child propagation | Session ID per run |
| **Channels** | Telegram, Slack, Feishu | Telegram, Discord, Signal, WhatsApp |
| **Scheduling** | ❌ không có | Cron + heartbeat 24/7 |
| **Skills** | Extensible (clawhub-style) | clawhub.com marketplace |
| **Core framework** | LangChain + LangGraph | Custom (Node.js) |
| **Frontend** | Next.js UI ✅ | CLI / Telegram UI |
| **Multi-user** | ✅ designed for teams | ❌ single-user personal |
| **Coding agent** | Sandbox execution | Spawn Codex/Claude Code in thread |

### Triết lý khác nhau

**DeerFlow** là **"task-centric"** — bạn đưa task, nó plan → execute → deliver. Tối ưu cho research, coding, report generation. Think: *"Do this complex thing for me."*

**OpenClaw** là **"ambient-centric"** — agent chạy nền, chủ động monitor, proactive interrupt khi cần. Tối ưu cho personal productivity. Think: *"Be my always-on assistant."*

### Use case thực tế

```
Bạn cần...                          → Dùng
──────────────────────────────────────────────────────
Research report dài (1-2 giờ)       → DeerFlow
Deploy code với CI/CD               → DeerFlow
Multi-user workspace cho team       → DeerFlow
Nhắn Telegram lúc 7am hỏi tin       → OpenClaw
Nhắc meeting sau 30 phút            → OpenClaw
Monitor PR và ping khi merge        → OpenClaw
Chạy cron job kiểm tra server       → OpenClaw
```

### Điều DeerFlow làm tốt hơn

**LoopDetectionMiddleware** là thứ OpenClaw không có nhưng nên có. Khi agent gọi tool lặp đi lặp lại, DeerFlow tự detect và force-stop sau 5 lần — critical cho production.

**Memory schema** granular hơn — phân biệt `workContext` vs `personalContext` vs `topOfMind` giúp LLM recall đúng loại thông tin.

### Điều OpenClaw làm tốt hơn

**Heartbeat system** — OpenClaw tự động check email, calendar, mentions và proactive notify. DeerFlow hoàn toàn reactive.

**Channel diversity** — Signal, WhatsApp, Discord ngoài Telegram.

**clawhub.com** — Skills marketplace cho phép install features không cần code.

### Verdict

> Nếu build **SaaS có AI feature** → DeerFlow SDK.  
> Nếu cần **personal assistant 24/7** → OpenClaw.  
> Nếu có budget → Cả hai: OpenClaw làm "daily driver", DeerFlow làm "heavy worker".

---

## Lessons Learned

**1. Middleware pattern > monolithic agent**  
Dễ add/remove behavior, dễ test từng middleware riêng lẻ, dễ debug. Pattern này giống Express.js middleware — ai đã làm Node.js sẽ thấy quen ngay.

**2. Memory cần schema, không phải free-form**  
`workContext`, `personalContext`, `topOfMind` tách biệt → LLM summarize đúng chỗ → recall chính xác hơn. Free-form markdown linh hoạt hơn nhưng recall kém hơn.

**3. Loop detection là must-have cho production**  
Hash tool calls + sliding window là approach đơn giản mà hiệu quả. Không có cái này, agent có thể bị stuck vô hạn gây chi phí không kiểm soát.

**4. Debounce queue cho memory update**  
Không cần update memory sau mỗi message. Batch + debounce giảm API calls đáng kể, đồng thời luôn giữ state mới nhất.

**5. Subagent không được spawn subagent**  
`disallowed_tools=["task"]` — một dòng config ngăn infinite recursion. Đơn giản nhưng dễ bỏ sót khi tự build.

---

## Nguồn & Stack

**Source code:** `git clone https://github.com/bytedance/deer-flow` (phân tích commit tháng 3/2026)

**Stack DeerFlow:**
- Python 3.12 · LangChain · LangGraph · FastAPI · Next.js
- Tested với: Claude Sonnet 4.6 via [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) OAuth (Max subscription, không cần API key trực tiếp)
